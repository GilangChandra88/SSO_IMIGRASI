/**
 * Mesin jurnal Koperasi (docs/skema-database.md §5.7, docs/rencana-koperasi.md). Dipakai Function di
 * koperasiPembukuan.js, koperasiAnggota.js, koperasiKantin.js, dan skrip functions/scripts/isiKoperasi.js.
 *
 * Setiap kejadian keuangan ditulis sebagai satu jurnal berpasangan (`koperasi_jurnal`) di transaksi
 * Firestore yang SAMA dengan catatan sumbernya, rekap per bulan (`koperasi_rekap/{tahun}`), total
 * sepanjang masa (`koperasi_rekap/total`), dan Flow kas (`koperasi_kas_mutasi`). Saldo akun = saldo awal
 * (`koperasi_saldo_awal/utama`) + total debit/kredit, jadi tidak ada saldo yang disimpan terpisah dan
 * bisa melenceng. Jurnal tidak diubah/dihapus; koreksi = jurnal pembalik.
 *
 * Urutan wajib di setiap Function: semua BACA dulu (`bukaBuku` & dokumen lain), baru TULIS (`posting`).
 */

const { HttpsError, FieldValue, db, KOLEKSI, tanggalSah, waktuWita } = require('./umum');

const MAKS_RUPIAH = 1000000000000;
const MAKS_BARIS_JURNAL = 120;

/** Akun bawaan yang dipakai mesin jurnal (ID sama dengan src/modules/koperasi/data/baganAkun.js). */
const AKUN = Object.freeze({
  persediaan: 's-persediaan',
  piutangAnggota: 's-piutang-usaha-anggota',
  utangUsaha: 's-utang-usaha-lain',
  simpananPokok: 's-simpanan-pokok',
  simpananWajib: 's-simpanan-wajib',
  pendapatanLain: 's-pendapatan-lain',
  hppLain: 's-hpp-lain',
  hppBahan: 's-hpp-bahan',
});
const KELOMPOK_DEBIT = new Set(['asetLancar', 'asetTetap', 'hpp', 'beban']);
const SISI_NERACA = {
  asetLancar: 'aset',
  asetTetap: 'aset',
  kewajibanLancar: 'pasiva',
  kewajibanPanjang: 'pasiva',
  ekuitas: 'pasiva',
};
// Akumulasi penyusutan mengurangi aset (sama dengan adalahKontra di koperasi/data/baganAkun.js)
const adalahKontra = (akunId) => akunId.startsWith('s-akumulasi-');

const kol = (nama) => db.collection(KOLEKSI[nama]);
const refSaldoAwal = () => kol('koperasiSaldoAwal').doc('utama');
const refRekap = (id) => kol('koperasiRekap').doc(id);
const waktu = () => FieldValue.serverTimestamp();
const galat = (pesan) => new HttpsError('invalid-argument', pesan);
const tolak = (pesan) => new HttpsError('failed-precondition', pesan);

function rupiahSah(v, label, min) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > MAKS_RUPIAH) {
    throw galat(`${label} harus bilangan bulat rupiah${min > 0 ? ' lebih dari 0' : ''}.`);
  }
  return n;
}

// ─── Buku besar ─────────────────────────────────────────────────────────────

/**
 * Baca keadaan buku (saldo awal, total per akun, dan dokumen akun yang akan dipakai).
 * Harus dipanggil sebelum ada tulisan apa pun di transaksi.
 */
async function bukaBuku(tx, akunIds) {
  const unik = [...new Set(akunIds.filter(Boolean))];
  const [sa, total, ...akun] = await tx.getAll(
    refSaldoAwal(),
    refRekap('total'),
    ...unik.map((id) => kol('koperasiAkun').doc(id)),
  );
  const peta = new Map();
  akun.forEach((a) => {
    if (!a.exists)
      throw tolak('Ada akun yang tidak ditemukan. Buka Bagan Akun sekali lalu coba lagi.');
    peta.set(a.id, a.data());
  });
  return {
    saldoAwal: sa.exists ? sa.data() : null,
    total: total.exists ? total.get('akun') || {} : {},
    akun: peta,
  };
}

const akunDari = (buku, id) => {
  const a = buku.akun.get(id);
  if (!a) throw new HttpsError('internal', `Akun ${id} belum dibaca.`);
  return a;
};

/** Saldo akun menurut saldo normalnya (positif = normal). */
function saldoAkun(buku, id) {
  const a = akunDari(buku, id);
  const t = buku.total[id] || {};
  const d = t.d || 0;
  const k = t.k || 0;
  const debitNormal = KELOMPOK_DEBIT.has(a.kelompok) && !adalahKontra(id);
  return (buku.saldoAwal?.saldo?.[id] || 0) + (debitNormal ? d - k : k - d);
}

function wajibKas(buku, id, label = 'Kas') {
  const a = akunDari(buku, id);
  if (!a.kas || a.aktif === false) throw tolak(`${label} harus rekening kas/bank yang aktif.`);
  return a;
}

/** Tanggal transaksi: sah, tidak di masa depan, tidak sebelum mulai pembukuan, periode belum ditutup. */
function cekTanggal(buku, tanggal) {
  if (!tanggalSah(tanggal)) throw galat('Tanggal tidak sah.');
  if (tanggal > waktuWita().tanggal) throw galat('Tanggal tidak boleh di masa depan.');
  const mulai = buku.saldoAwal?.tanggalMulai;
  if (mulai && tanggal < mulai) throw tolak(`Tanggal sebelum mulai pembukuan (${mulai}).`);
  const kunci = buku.saldoAwal?.terkunciSampai;
  if (kunci && tanggal.slice(0, 7) <= kunci) throw tolak(`Periode ${kunci} sudah ditutup.`);
  return tanggal;
}

/**
 * Tulis satu jurnal + rekap + Flow kas. `baris`: [{ akunId, debit, kredit }] (nol dibuang).
 * Mengembalikan ID jurnal. Memperbarui `buku.total` di memori agar posting berikutnya di
 * transaksi yang sama melihat saldo terbaru.
 */
function posting(
  tx,
  buku,
  { tanggal, jenis, keterangan, baris, sumberId = '', batalDari = '', uid, arus = null },
) {
  const bersih = baris
    .map((b) => ({ akunId: b.akunId, debit: b.debit || 0, kredit: b.kredit || 0 }))
    .filter((b) => b.debit > 0 || b.kredit > 0);
  const debit = bersih.reduce((n, b) => n + b.debit, 0);
  const kredit = bersih.reduce((n, b) => n + b.kredit, 0);
  if (!bersih.length || debit !== kredit || bersih.length > MAKS_BARIS_JURNAL) {
    throw new HttpsError('internal', 'Jurnal tidak seimbang.');
  }
  bersih.forEach((b) => {
    akunDari(buku, b.akunId);
    if (![b.debit, b.kredit].every(Number.isInteger)) {
      throw new HttpsError('internal', 'Nilai jurnal harus bilangan bulat.');
    }
  });

  const ref = kol('koperasiJurnal').doc();
  tx.create(ref, {
    tanggal,
    jenis,
    keterangan: keterangan.slice(0, 200),
    baris: bersih,
    total: debit,
    sumberId,
    batalDari,
    dibatalkan: false,
    dibuatPada: waktu(),
    dibuatOleh: uid,
  });

  const [tahun, bulan] = tanggal.split('-');
  const perBulan = {};
  const perAkun = {};
  bersih.forEach(({ akunId, debit: d, kredit: k }) => {
    const isi = {};
    if (d) isi.d = FieldValue.increment(d);
    if (k) isi.k = FieldValue.increment(k);
    perBulan[akunId] = isi;
    perAkun[akunId] = isi;
    const t = buku.total[akunId] || { d: 0, k: 0 };
    buku.total[akunId] = { d: (t.d || 0) + d, k: (t.k || 0) + k };
  });
  // Arus kas per akun lawan (laporan Arus Kas): uang masuk (m) / keluar (k) menurut akun lawannya.
  // Bawaan: baris non-kas langsung menjadi lawan bila jurnal tidak punya pasangan non-kas di
  // dalamnya (mis. HPP/Persediaan); jurnal seperti itu memberi `arus` sendiri.
  const masuk = bersih.filter((b) => buku.akun.get(b.akunId).kas && b.debit);
  const keluar = bersih.filter((b) => buku.akun.get(b.akunId).kas && b.kredit);
  const nonKas = bersih.filter((b) => !buku.akun.get(b.akunId).kas);
  const kasMasuk = masuk.reduce((n, b) => n + b.debit, 0);
  const kasKeluar = keluar.reduce((n, b) => n + b.kredit, 0);
  let lawan = arus;
  if (!lawan && (kasMasuk || kasKeluar)) {
    const kreditNonKas = nonKas.reduce((n, b) => n + b.kredit, 0);
    const debitNonKas = nonKas.reduce((n, b) => n + b.debit, 0);
    if (kreditNonKas === kasMasuk && debitNonKas === kasKeluar) {
      lawan = nonKas.map((b) => ({ akunId: b.akunId, masuk: b.kredit, keluar: b.debit }));
    } else if (kasMasuk !== kasKeluar) {
      throw new HttpsError('internal', 'Arus kas jurnal ini harus dirinci.');
    }
  }
  const perArus = {};
  (lawan || []).forEach(({ akunId, masuk: m = 0, keluar: k = 0 }) => {
    const isi = {};
    if (m) isi.m = FieldValue.increment(m);
    if (k) isi.k = FieldValue.increment(k);
    if (m || k) perArus[akunId] = isi;
  });

  tx.set(
    refRekap(tahun),
    {
      bulan: { [bulan]: perBulan },
      ...(Object.keys(perArus).length ? { arus: { [bulan]: perArus } } : {}),
    },
    { merge: true },
  );
  tx.set(refRekap('total'), { akun: perAkun }, { merge: true });

  // Flow kas: satu catatan untuk jurnal yang menyentuh rekening kas/bank
  if (masuk.length || keluar.length) {
    const sisi = (b) =>
      b && {
        kasId: b.akunId,
        nama: buku.akun.get(b.akunId).nama,
        saldoSesudah: saldoAkun(buku, b.akunId),
      };
    tx.create(kol('koperasiKasMutasi').doc(), {
      jenis,
      jumlah: Math.max(kasMasuk, kasKeluar),
      tanggal,
      keterangan: keterangan.slice(0, 200),
      dari: sisi(keluar[0]) || null,
      ke: sisi(masuk[0]) || null,
      kasIds: [...new Set([...masuk, ...keluar].map((b) => b.akunId))],
      jurnalId: ref.id,
      dibuatPada: waktu(),
      dibuatOleh: uid,
    });
  }
  return ref.id;
}

// ─── Pembantu bersama: pengaturan & anggota ────────────────────────────────

const refPengaturan = () => kol('koperasiPengaturan').doc('utama');
const ALOKASI_BAWAAN = {
  jasaModal: 20,
  jasaUsaha: 30,
  pengembangan: 20,
  pengurus: 5,
  karyawan: 5,
  pendidikan: 5,
  sosial: 5,
  cadangan: 10,
};
const PENGATURAN_BAWAAN = {
  nominalPokok: 300000,
  nominalWajib: 100000,
  alokasiShu: ALOKASI_BAWAAN,
  nomorAnggotaTerakhir: 0,
};
const bacaPengaturan = async (tx) => {
  const s = await tx.get(refPengaturan());
  return { ...PENGATURAN_BAWAAN, ...(s.exists ? s.data() : {}), ada: s.exists };
};

const refAnggota = (id) => kol('koperasiAnggota').doc(id);

function rekapAnggota(tx, tahun, anggotaId, isi) {
  const inc = {};
  Object.entries(isi).forEach(([k, v]) => {
    if (v) inc[k] = FieldValue.increment(v);
  });
  tx.set(
    kol('koperasiRekapAnggota').doc(tahun),
    { anggota: { [anggotaId]: inc } },
    { merge: true },
  );
}

module.exports = {
  refPengaturan,
  ALOKASI_BAWAAN,
  bacaPengaturan,
  refAnggota,
  rekapAnggota,
  MAKS_RUPIAH,
  AKUN,
  SISI_NERACA,
  adalahKontra,
  kol,
  refSaldoAwal,
  refRekap,
  waktu,
  galat,
  tolak,
  rupiahSah,
  bukaBuku,
  akunDari,
  saldoAkun,
  wajibKas,
  cekTanggal,
  posting,
};
