/**
 * Mengisi data Koperasi untuk PENGEMBANGAN dari sheet pengurus "buku koperasi v3":
 * - daftar barang, pembelian, dan penjualan diambil dari sheet (izin pemilik proyek, 11 Nov 2026);
 *   kolom nama anggota/pembeli di sheet TIDAK dibawa (semua penjualan menjadi UMUM);
 * - anggota & simpanan FIKTIF: anggota pegawai diambil dari pegawai_ringkas pura-pura di tujuan
 *   (data contoh), ditambah anggota luar bernama "Anggota Luar Contoh NNN" sampai ±95 anggota.
 * Semua transaksi lewat mesin jurnal yang sama dengan Function (src/koperasiBuku.js), jadi saldo,
 * stok, Flow, dan laporan cocok. Baris sheet yang ambigu (tanggal/barang/angka tidak sah) dilewati
 * dan dihitung di ringkasan.
 *
 * Tujuan dikunci di sini (tidak pernah produksi):
 *   node functions/scripts/isiKoperasi.js --csv=<folder>          Emulator (demo-imigrasi)
 *   node functions/scripts/isiKoperasi.js --dev --sheets          proyek dev imigrasi-database
 * Sumber: --sheets (Google Sheets API; ADC perlu cakupan spreadsheets.readonly) atau --csv=<folder>
 * berisi barang.csv, pembelian.csv, penjualan.csv (File › Download › CSV untuk tiap tab).
 * Menolak jalan bila data Koperasi (kategori/barang/anggota/jurnal) sudah ada; tidak menghapus apa pun
 * di dev. Di Emulator, --ulang mengosongkan koleksi Koperasi lebih dulu.
 */

const DEV = process.argv.includes('--dev');
const PROYEK = DEV ? 'imigrasi-database' : 'demo-imigrasi';
if (DEV) {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT = PROYEK;
} else {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}
process.env.GCLOUD_PROJECT = PROYEK;
process.env.GOOGLE_CLOUD_PROJECT = PROYEK;

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { FieldValue, db, KOLEKSI } = require('../src/umum');
const buku = require('../src/koperasiBuku');

const ID_SHEET = '1rQmDC2kstlQdKTXjiq9R_3rGi_MQ93kwQ-4EeKAraLc';
const PELAKU = 'impor-koperasi';
const MAKS_ITEM = 100;
const MAKS_RUPIAH = 1000000000000;
const argv = (nama) => process.argv.find((a) => a.startsWith(`--${nama}=`))?.split('=')[1];
const kol = (nama) => db.collection(KOLEKSI[nama]);
const waktu = () => FieldValue.serverTimestamp();
const jejak = () => ({
  dibuatPada: waktu(),
  dibuatOleh: PELAKU,
  diubahPada: waktu(),
  diubahOleh: PELAKU,
});

// ─── Membaca sumber ─────────────────────────────────────────────────────────

function bacaCsv(teks) {
  const baris = [];
  let kolom = [];
  let sel = '';
  let kutip = false;
  for (let i = 0; i < teks.length; i += 1) {
    const c = teks[i];
    if (kutip) {
      if (c === '"' && teks[i + 1] === '"') {
        sel += '"';
        i += 1;
      } else if (c === '"') kutip = false;
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === ',') {
      kolom.push(sel);
      sel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && teks[i + 1] === '\n') i += 1;
      kolom.push(sel);
      baris.push(kolom);
      kolom = [];
      sel = '';
    } else sel += c;
  }
  if (sel || kolom.length) {
    kolom.push(sel);
    baris.push(kolom);
  }
  return baris;
}

async function dariSheets() {
  const { GoogleAuth } = require('google-auth-library');
  const klien = await new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }).getClient();
  const ambil = async (rentang) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${ID_SHEET}/values/${encodeURIComponent(rentang)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
    const r = await klien.request({ url, headers: { 'x-goog-user-project': PROYEK } });
    return r.data.values || [];
  };
  return {
    barang: await ambil("'daftar barang'!A5:I"),
    pembelian: await ambil("'daftar pembelian '!A4:P"),
    penjualan: await ambil("'daftar penjualan '!A4:N"),
  };
}

function dariCsv(folder) {
  // Terima nama singkat (barang.csv) atau nama unduhan Google ("daftar barang.csv", "… - daftar barang.csv")
  const isi = fs.readdirSync(folder);
  const baca = (nama) => {
    const berkas =
      isi.find((f) => f.toLowerCase() === `${nama}.csv`) ||
      isi.find((f) => f.toLowerCase().endsWith('.csv') && f.toLowerCase().includes(`daftar ${nama}`));
    if (!berkas) throw new Error(`Berkas CSV ${nama} tidak ditemukan di ${folder}.`);
    return bacaCsv(fs.readFileSync(path.join(folder, berkas), 'utf8'));
  };
  return { barang: baca('barang'), pembelian: baca('pembelian'), penjualan: baca('penjualan') };
}

const BULAN_ID = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8,
  september: 9, oktober: 10, november: 11, desember: 12, january: 1, february: 2, march: 3,
  may: 5, june: 6, july: 7, august: 8, october: 10, december: 12,
};
const dua = (n) => String(n).padStart(2, '0');

/** Angka sheet ("1.700", "  40.800 ", "-", 1700) → bilangan; null bila tidak sah. */
function angka(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').trim().replace(/\s/g, '');
  if (!s || /^-+$/.test(s)) return 0;
  if (!/^-?[\d.]+(,\d+)?$/.test(s)) return null;
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

/** Tanggal sheet (serial, "9 April 2026", "09/04/2026") → 'YYYY-MM-DD'; null bila tidak sah. */
function tanggal(v) {
  if (typeof v === 'number' && v > 30000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return `${d.getUTCFullYear()}-${dua(d.getUTCMonth() + 1)}-${dua(d.getUTCDate())}`;
  }
  const s = String(v ?? '').trim().toLowerCase();
  let y;
  let mo;
  let d;
  let m = s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (m && BULAN_ID[m[2]]) [d, mo, y] = [Number(m[1]), BULAN_ID[m[2]], Number(m[3])];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!y) return null;
  // Tanggal harus benar-benar ada (mis. 31 Juni ditolak)
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return `${y}-${dua(mo)}-${dua(d)}`;
}

const teks = (v) => String(v ?? '').trim();
const adalahBarisData = (b) => /^\d+$/.test(teks(b[0]));

// ─── Menyusun data ──────────────────────────────────────────────────────────

const lewati = {};
const catatLewati = (alasan) => {
  lewati[alasan] = (lewati[alasan] || 0) + 1;
};

const REKENING = {
  kas: 's-kas',
  'kas kecil': 's-kas-kecil',
  'bank 1': 's-bank-1',
  'bank 2': 's-bank-2',
  'bank 3': 's-bank-3',
};
const rekeningKas = (r) => REKENING[teks(r).toLowerCase()];

function susun(mentah, hariIni) {
  // Barang
  const barang = [];
  const idSheet = new Set();
  mentah.barang.filter(adalahBarisData).forEach((b) => {
    const sid = teks(b[1]);
    const nama = teks(b[2]).slice(0, 200);
    const hargaJual = angka(b[8]);
    if (!sid || !nama || idSheet.has(sid)) return catatLewati('barang tanpa ID/nama atau ID kembar');
    if (hargaJual === null || hargaJual < 0) return catatLewati('barang: harga jual tidak sah');
    idSheet.add(sid);
    barang.push({
      sid,
      nama,
      kategori: teks(b[3]).slice(0, 80) || 'Lain-lain',
      satuan: teks(b[4]).slice(0, 30) || 'pcs',
      stokAwal: Math.max(0, Math.round(angka(b[5]) || 0)),
      hargaPokokAwal: Math.max(0, Math.round(angka(b[6]) || 0)),
      hargaJual: Math.round(hargaJual),
    });
  });

  const sah = (t) => t && t >= '2026-01-01' && t <= hariIni;
  const baris = (rows, jenis, kolom) =>
    rows.filter(adalahBarisData).flatMap((r) => {
      const t = tanggal(r[1]);
      const sid = teks(r[kolom.id]);
      const jumlahMentah = teks(r[kolom.jumlah]) === '' ? 1 : angka(r[kolom.jumlah]);
      const harga = angka(r[kolom.harga]);
      if (!sah(t)) return catatLewati(`${jenis}: tanggal kosong/di luar 2026 s.d. hari ini`), [];
      if (!idSheet.has(sid)) return catatLewati(`${jenis}: barang belum terdaftar`), [];
      if (!Number.isInteger(jumlahMentah) || jumlahMentah < 1 || jumlahMentah > 999) {
        return catatLewati(`${jenis}: jumlah tidak sah`), [];
      }
      if (harga === null || harga < 0 || harga > MAKS_RUPIAH) {
        return catatLewati(`${jenis}: harga tidak sah`), [];
      }
      return [{ tanggal: t, sid, jumlah: jumlahMentah, harga: Math.round(harga), r }];
    });

  // Pembelian: dikelompokkan per tanggal + rekening + pemasok + no PO
  const grupBeli = new Map();
  baris(mentah.pembelian, 'pembelian', { id: 6, jumlah: 10, harga: 11 }).forEach((x) => {
    const rek = teks(x.r[13]);
    const utang = /utang/i.test(rek);
    const kas = utang ? '' : rekeningKas(rek) || 's-kas';
    const pemasok = teks(x.r[14]).slice(0, 100);
    const kunci = [x.tanggal, utang ? 'utang' : kas, pemasok, teks(x.r[2])].join('|');
    const g = grupBeli.get(kunci) || { jenis: 'beli', tanggal: x.tanggal, utang, kas, pemasok, items: [] };
    g.items.push(x);
    grupBeli.set(kunci, g);
  });

  // Penjualan: dikelompokkan per tanggal + rekening (rekap harian); nama pembeli tidak dibawa
  const grupJual = new Map();
  baris(mentah.penjualan, 'penjualan', { id: 7, jumlah: 9, harga: 11 }).forEach((x) => {
    const rek = teks(x.r[13]);
    const piutang = /piutang/i.test(rek);
    const kas = piutang ? '' : rekeningKas(rek) || 's-kas';
    const kunci = [x.tanggal, piutang ? 'piutang' : kas].join('|');
    const g = grupJual.get(kunci) || { jenis: 'jual', tanggal: x.tanggal, piutang, kas, items: [] };
    g.items.push(x);
    grupJual.set(kunci, g);
  });

  // Satu barang hanya sekali per transaksi (gabungkan), dan paling banyak 100 barang per transaksi
  const pecah = (grup) =>
    [...grup.values()].flatMap((g) => {
      const gabung = new Map();
      g.items.forEach((x) => {
        const k = `${x.sid}|${x.harga}`;
        const ada = gabung.get(k);
        if (ada && ada.jumlah + x.jumlah <= 999) ada.jumlah += x.jumlah;
        else gabung.set(ada ? `${k}|${gabung.size}` : k, { ...x });
      });
      const isi = [...gabung.values()];
      const potong = [];
      // Barang sama dengan harga berbeda tidak boleh satu transaksi: sebar ke transaksi terpisah
      while (isi.length) {
        const ambil = [];
        const terpakai = new Set();
        for (let i = 0; i < isi.length && ambil.length < MAKS_ITEM; ) {
          if (terpakai.has(isi[i].sid)) i += 1;
          else {
            terpakai.add(isi[i].sid);
            ambil.push(isi.splice(i, 1)[0]);
          }
        }
        potong.push({ ...g, items: ambil });
      }
      return potong;
    });

  return { barang, beli: pecah(grupBeli), jual: pecah(grupJual) };
}

// ─── Menulis lewat mesin jurnal ─────────────────────────────────────────────

async function pastikanAkun() {
  const { AKUN_STANDAR } = await import(
    pathToFileURL(path.join(__dirname, '../../src/modules/koperasi/data/baganAkun.js')).href
  );
  const ada = new Set((await kol('koperasiAkun').select().limit(300).get()).docs.map((d) => d.id));
  const batch = db.batch();
  AKUN_STANDAR.filter((a) => !ada.has(a.id)).forEach(({ id, ...a }) =>
    batch.set(kol('koperasiAkun').doc(id), { ...a, sistem: true, aktif: true, ...jejak() }),
  );
  await batch.commit();
}

async function buatKategori(nama, n) {
  const ref = kol('koperasiKantinKategori').doc();
  const akunJualId = `k-jual-${ref.id}`;
  const akunHppId = `k-hpp-${ref.id}`;
  const akun = (kode, namaAkun, kelompok) => ({
    kode: String(kode),
    nama: namaAkun,
    kelompok,
    kas: false,
    sistem: true,
    urutan: n,
    aktif: true,
    ...jejak(),
  });
  const batch = db.batch();
  batch.set(ref, { nama, urutan: n, akunJualId, akunHppId, aktif: true, ...jejak() });
  batch.set(kol('koperasiAkun').doc(akunJualId), akun(3100 + n, `Pendapatan Penjualan ${nama}`, 'pendapatan'));
  batch.set(kol('koperasiAkun').doc(akunHppId), akun(3500 + n, `HPP ${nama}`, 'hpp'));
  await batch.commit();
  return { id: ref.id, akunJualId, akunHppId };
}

/** Pembelian (D Persediaan / K Kas atau Utang Usaha), harga pokok rata-rata bergerak. */
async function beli(g, petaBarang) {
  await db.runTransaction(async (tx) => {
    const refs = g.items.map((x) => kol('koperasiKantinBarang').doc(petaBarang.get(x.sid).docId));
    const snap = await tx.getAll(...refs);
    const b = await buku.bukaBuku(tx, [g.utang ? buku.AKUN.utangUsaha : g.kas, buku.AKUN.persediaan]);
    buku.cekTanggal(b, g.tanggal);
    const rinci = g.items.map((x, i) => {
      const s = snap[i];
      const subtotal = x.harga * x.jumlah;
      const stokLama = s.get('stok');
      const stok = stokLama + x.jumlah;
      const pokokLama = s.get('hargaPokok') || 0;
      const hargaPokok = stokLama > 0 ? Math.round((stokLama * pokokLama + subtotal) / stok) : x.harga;
      return { ref: s.ref, stok, hargaPokok, item: { barangId: s.id, nama: s.get('nama'), satuan: s.get('satuan'), jumlah: x.jumlah, harga: x.harga, subtotal } };
    });
    const total = rinci.reduce((n, r) => n + r.item.subtotal, 0);
    if (total <= 0) return;
    const ref = kol('koperasiKantinPembelian').doc();
    const jurnalId = buku.posting(tx, b, {
      tanggal: g.tanggal,
      jenis: 'pembelian',
      keterangan: `Pembelian Kantin (impor sheet)${g.pemasok ? ` · ${g.pemasok}` : ''}${g.utang ? ' (utang)' : ''}`,
      baris: [
        { akunId: buku.AKUN.persediaan, debit: total },
        { akunId: g.utang ? buku.AKUN.utangUsaha : g.kas, kredit: total },
      ],
      sumberId: ref.id,
      uid: PELAKU,
    });
    rinci.forEach((r) => tx.update(r.ref, { stok: r.stok, hargaPokok: r.hargaPokok, adaTransaksi: true }));
    tx.create(ref, {
      tanggal: g.tanggal,
      pemasok: g.pemasok,
      items: rinci.map((r) => r.item),
      total,
      caraBayar: g.utang ? 'utang' : 'tunai',
      kasId: g.kas,
      kasNama: g.utang ? '' : b.akun.get(g.kas).nama,
      jatuhTempo: '',
      sisaUtang: g.utang ? total : 0,
      keterangan: 'Impor dari sheet',
      status: 'selesai',
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: PELAKU,
    });
  });
}

/** Penjualan (D Kas/Bank atau Piutang Usaha Non-Anggota / K Penjualan kategori; HPP / Persediaan). */
async function jual(g, petaBarang) {
  const piutang = 's-piutang-usaha-lain';
  await db.runTransaction(async (tx) => {
    const refs = g.items.map((x) => kol('koperasiKantinBarang').doc(petaBarang.get(x.sid).docId));
    const snap = await tx.getAll(...refs);
    const kat = g.items.map((x) => petaBarang.get(x.sid).kategori);
    const debitId = g.piutang ? piutang : g.kas;
    const b = await buku.bukaBuku(tx, [
      debitId,
      buku.AKUN.persediaan,
      ...kat.flatMap((k) => [k.akunJualId, k.akunHppId]),
    ]);
    buku.cekTanggal(b, g.tanggal);
    const per = new Map();
    const tambah = (akunId, sisi, n) => {
      const x = per.get(akunId) || { akunId, debit: 0, kredit: 0 };
      x[sisi] += n;
      per.set(akunId, x);
    };
    const arus = new Map();
    const items = g.items.map((x, i) => {
      const s = snap[i];
      const subtotal = x.harga * x.jumlah;
      const hpp = (s.get('hargaPokok') || 0) * x.jumlah;
      tambah(kat[i].akunJualId, 'kredit', subtotal);
      tambah(kat[i].akunHppId, 'debit', hpp);
      arus.set(kat[i].akunJualId, (arus.get(kat[i].akunJualId) || 0) + subtotal);
      return { barangId: s.id, nama: s.get('nama'), jenis: 'barang', kemasanId: '', satuan: s.get('satuan'), isi: 1, harga: x.harga, jumlah: x.jumlah, subtotal, hpp };
    });
    const total = items.reduce((n, x) => n + x.subtotal, 0);
    const hpp = items.reduce((n, x) => n + x.hpp, 0);
    if (total <= 0) return;
    tambah(debitId, 'debit', total);
    tambah(buku.AKUN.persediaan, 'kredit', hpp);
    const ref = kol('koperasiKantinTransaksi').doc();
    const jurnalId = buku.posting(tx, b, {
      tanggal: g.tanggal,
      jenis: 'penjualan',
      keterangan: `Penjualan Kantin (impor sheet, rekap harian) · UMUM`,
      baris: [...per.values()],
      sumberId: ref.id,
      uid: PELAKU,
      arus: g.piutang ? [] : [...arus].map(([akunId, masuk]) => ({ akunId, masuk })),
    });
    g.items.forEach((x, i) =>
      tx.update(snap[i].ref, { stok: FieldValue.increment(-x.jumlah), adaTransaksi: true }),
    );
    tx.create(ref, {
      tanggal: g.tanggal,
      items,
      stokKeluar: items.map((x) => ({ barangId: x.barangId, nama: x.nama, jumlah: x.jumlah })),
      total,
      hpp,
      caraBayar: g.piutang ? 'bon' : g.kas.startsWith('s-bank') ? 'transfer' : 'tunai',
      kasId: g.kas,
      kasNama: g.piutang ? '' : b.akun.get(g.kas).nama,
      pembeli: { anggotaId: '', nama: 'UMUM' },
      status: 'selesai',
      alasanBatal: '',
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: PELAKU,
    });
  });
}

/** Satu jurnal simpanan untuk banyak anggota (D kas / K Simpanan Pokok|Wajib) + catatan per anggota. */
async function setorSimpanan({ tanggal, jenis, kasId, anggota, nominal, keterangan, bulan = '' }) {
  if (!anggota.length) return;
  const pokok = jenis === 'pokok';
  const akunSimpanan = pokok ? buku.AKUN.simpananPokok : buku.AKUN.simpananWajib;
  await db.runTransaction(async (tx) => {
    const b = await buku.bukaBuku(tx, [kasId, akunSimpanan]);
    buku.cekTanggal(b, tanggal);
    const total = nominal * anggota.length;
    const jurnalId = buku.posting(tx, b, {
      tanggal,
      jenis: pokok ? 'simpananPokok' : 'simpananWajib',
      keterangan: `${keterangan} · ${anggota.length} anggota`,
      baris: [
        { akunId: kasId, debit: total },
        { akunId: akunSimpanan, kredit: total },
      ],
      uid: PELAKU,
    });
    const tahun = tanggal.slice(0, 4);
    anggota.forEach((a) => {
      const isi = pokok
        ? { saldoPokok: FieldValue.increment(nominal), status: 'aktif', tanggalMasuk: tanggal }
        : { saldoWajib: FieldValue.increment(nominal), ...(bulan ? { potongGajiTerakhir: bulan } : {}) };
      tx.update(kol('koperasiAnggota').doc(a.id), isi);
      tx.set(
        kol('koperasiRekapAnggota').doc(tahun),
        { anggota: { [a.id]: { [pokok ? 'setorPokok' : 'setorWajib']: FieldValue.increment(nominal) } } },
        { merge: true },
      );
      tx.create(kol('koperasiSimpanan').doc(), {
        anggotaId: a.id,
        anggotaNama: a.nama,
        nomor: a.nomor,
        jenis,
        tanggal,
        jumlah: nominal,
        pokok: pokok ? nominal : 0,
        wajib: pokok ? 0 : nominal,
        kasId,
        keterangan,
        bulan,
        jurnalId,
        dibuatPada: waktu(),
        dibuatOleh: PELAKU,
      });
    });
  });
}

// ─── Utama ──────────────────────────────────────────────────────────────────

/** Bilangan acak berbenih (hasil sama setiap dijalankan). */
function acak(benih) {
  let s = benih;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

async function kosongkanEmulator() {
  const nama = [
    'koperasiJurnal', 'koperasiRekap', 'koperasiRekapAnggota', 'koperasiKasMutasi', 'koperasiSaldoAwal',
    'koperasiPengaturan', 'koperasiAnggota', 'koperasiSimpanan', 'koperasiTransaksiUmum',
    'koperasiKantinKategori', 'koperasiKantinBarang', 'koperasiKantinTransaksi', 'koperasiKantinPembelian', 'koperasiAkun',
  ];
  for (const n of nama) await db.recursiveDelete(kol(n));
}

async function utama() {
  const csv = argv('csv');
  if (!csv && !process.argv.includes('--sheets')) {
    throw new Error('Pilih sumber: --sheets atau --csv=<folder>.');
  }
  if (DEV && process.argv.includes('--ulang')) throw new Error('--ulang hanya untuk Emulator.');
  console.log(`Tujuan: ${DEV ? 'proyek dev imigrasi-database' : 'Emulator demo-imigrasi'}`);

  if (!DEV && process.argv.includes('--ulang')) await kosongkanEmulator();
  for (const n of ['koperasiKantinKategori', 'koperasiKantinBarang', 'koperasiAnggota', 'koperasiJurnal']) {
    const c = (await kol(n).count().get()).data().count;
    if (c) throw new Error(`${KOLEKSI[n]} sudah berisi ${c} dokumen. Data Koperasi harus kosong (skrip ini tidak menghapus).`);
  }

  const hariIni = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
  const mentah = csv ? dariCsv(csv) : await dariSheets();
  const data = susun(mentah, hariIni);
  console.log(`Sheet: ${data.barang.length} barang, ${data.beli.length} transaksi pembelian, ${data.jual.length} transaksi penjualan (rekap harian).`);

  await pastikanAkun();

  // Saldo awal: mulai awal Februari 2026 (atau bulan data pertama); stok awal barang masuk Persediaan
  const pertama = [...data.beli, ...data.jual].map((g) => g.tanggal).sort()[0] || hariIni;
  const tanggalMulai = `${[pertama.slice(0, 7), '2026-02'].sort()[0]}-01`;
  const nilaiStokAwal = data.barang.reduce((n, b) => n + b.stokAwal * b.hargaPokokAwal, 0);
  const saldo = nilaiStokAwal ? { 's-persediaan': nilaiStokAwal, 's-shu-ditahan': nilaiStokAwal } : {};
  await buku.refSaldoAwal().set({
    tanggalMulai,
    saldo,
    totalAset: nilaiStokAwal,
    totalPasiva: nilaiStokAwal,
    terkunciSampai: '',
    ...jejak(),
  });
  await kol('koperasiPengaturan').doc('utama').set({
    nominalPokok: 300000,
    nominalWajib: 100000,
    alokasiShu: { jasaModal: 20, jasaUsaha: 30, pengembangan: 20, pengurus: 5, karyawan: 5, pendidikan: 5, sosial: 5, cadangan: 10 },
    nomorAnggotaTerakhir: 0,
    ...jejak(),
  });

  // Kategori & barang
  const kategori = new Map();
  for (const nama of [...new Set(data.barang.map((b) => b.kategori))]) {
    kategori.set(nama, await buatKategori(nama, kategori.size + 1));
  }
  const petaBarang = new Map();
  for (let i = 0; i < data.barang.length; i += 400) {
    const batch = db.batch();
    data.barang.slice(i, i + 400).forEach((b) => {
      const ref = kol('koperasiKantinBarang').doc();
      const kat = kategori.get(b.kategori);
      petaBarang.set(b.sid, { docId: ref.id, kategori: kat });
      batch.set(ref, {
        kategoriId: kat.id,
        barkode: /^[0-9A-Za-z-]{1,64}$/.test(b.sid) ? b.sid : '',
        nama: b.nama,
        satuan: b.satuan,
        hargaJual: b.hargaJual,
        jenis: 'barang',
        kemasan: [],
        komponen: [],
        stok: b.stokAwal,
        hargaPokok: b.hargaPokokAwal,
        adaTransaksi: false,
        aktif: true,
        ...jejak(),
      });
    });
    await batch.commit();
  }

  // Anggota fiktif: pegawai pura-pura di tujuan + anggota luar contoh
  const pegawai = (await db.collection(KOLEKSI.pegawaiRingkas).limit(30).get()).docs.filter((d) => d.get('nama'));
  const anggota = [];
  const batchAng = db.batch();
  const tambahAnggota = (isi) => {
    const ref = kol('koperasiAnggota').doc();
    const nomor = `A${String(anggota.length + 1).padStart(4, '0')}`;
    anggota.push({ id: ref.id, nomor, nama: isi.nama, jenis: isi.jenis });
    batchAng.set(ref, {
      nomor,
      nama: isi.nama,
      jenis: isi.jenis,
      pegawaiId: isi.pegawaiId || '',
      status: 'calon',
      tanggalMasuk: '',
      tanggalKeluar: '',
      saldoPokok: 0,
      saldoWajib: 0,
      awalPokok: 0,
      awalWajib: 0,
      piutang: 0,
      potongGajiTerakhir: '',
      catatan: 'Data contoh (fiktif)',
      ...jejak(),
    });
  };
  pegawai.forEach((p) => tambahAnggota({ nama: p.get('nama'), jenis: 'pegawai', pegawaiId: p.id }));
  // Jumlah anggota mendekati koperasi asli (±95) supaya simpanan cukup membiayai pembelian di sheet
  const jumlahLuar = Math.max(10, 95 - pegawai.length);
  for (let i = 1; i <= jumlahLuar; i += 1) tambahAnggota({ nama: `Anggota Luar Contoh ${String(i).padStart(3, '0')}`, jenis: 'luar' });
  await batchAng.commit();
  await kol('koperasiPengaturan').doc('utama').update({ nomorAnggotaTerakhir: anggota.length });

  // Peristiwa urut tanggal: simpanan pokok (hari mulai), wajib tiap bulan, pembelian, penjualan
  const rnd = acak(20261111);
  const peristiwa = [
    {
      tanggal: tanggalMulai,
      urut: 0,
      jalan: () =>
        setorSimpanan({ tanggal: tanggalMulai, jenis: 'pokok', kasId: 's-bank-1', anggota, nominal: 300000, keterangan: 'Simpanan pokok (data contoh)' }),
    },
  ];
  // Bulan wajib: dari bulan mulai sampai bulan lalu
  const daftarBulan = [];
  for (let [y, m] = tanggalMulai.split('-').map(Number); `${y}-${dua(m)}` < hariIni.slice(0, 7); ) {
    daftarBulan.push(`${y}-${dua(m)}`);
    if (m === 12) [y, m] = [y + 1, 1];
    else m += 1;
  }
  // Sekitar 15% anggota menunggak dua bulan terakhir (contoh status tunggakan)
  const menunggak = new Set(anggota.filter(() => rnd() < 0.15).map((a) => a.id));
  daftarBulan.forEach((bulan, idx) => {
    const tgl = `${bulan}-25`;
    const ikut = anggota.filter((a) => !(idx >= daftarBulan.length - 2 && menunggak.has(a.id)));
    peristiwa.push({ tanggal: tgl, urut: 1, jalan: () => setorSimpanan({ tanggal: tgl, jenis: 'wajib', kasId: 's-bank-1', anggota: ikut.filter((a) => a.jenis === 'pegawai'), nominal: 100000, keterangan: `Potong gaji ${bulan}`, bulan }) });
    peristiwa.push({ tanggal: tgl, urut: 1, jalan: () => setorSimpanan({ tanggal: tgl, jenis: 'wajib', kasId: 's-bank-1', anggota: ikut.filter((a) => a.jenis === 'luar'), nominal: 100000, keterangan: `Setoran langsung ${bulan}` }) });
  });
  data.beli.forEach((g) => peristiwa.push({ tanggal: g.tanggal, urut: 2, jalan: () => beli(g, petaBarang) }));
  data.jual.forEach((g) => peristiwa.push({ tanggal: g.tanggal, urut: 3, jalan: () => jual(g, petaBarang) }));
  peristiwa.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.urut - b.urut);

  let i = 0;
  for (const p of peristiwa) {
    await p.jalan();
    i += 1;
    if (i % 50 === 0 || i === peristiwa.length) console.log(`  ${i}/${peristiwa.length} transaksi`);
  }

  // Pemeriksaan: aset = kewajiban + ekuitas + (pendapatan − HPP − beban)
  const total = (await buku.refRekap('total').get()).get('akun') || {};
  const akun = Object.fromEntries((await kol('koperasiAkun').limit(300).get()).docs.map((d) => [d.id, d.data()]));
  const debit = new Set(['asetLancar', 'asetTetap', 'hpp', 'beban']);
  let kiri = 0;
  let kanan = 0;
  for (const id of new Set([...Object.keys(total), ...Object.keys(saldo)])) {
    const kel = akun[id]?.kelompok;
    const g = total[id] || {};
    const awal = (saldo[id] || 0) * (debit.has(kel) && !id.startsWith('s-akumulasi-') ? 1 : -1);
    const net = awal + (g.d || 0) - (g.k || 0);
    if (debit.has(kel)) kiri += net;
    else kanan -= net;
  }
  const saldoAkun = (id) => (saldo[id] || 0) + ((total[id]?.d || 0) - (total[id]?.k || 0));
  console.log('\nSelesai.');
  console.log(`  Mulai pembukuan: ${tanggalMulai}; anggota fiktif: ${anggota.length}`);
  ['s-kas', 's-bank-1', 's-persediaan', 's-utang-usaha-lain', 's-piutang-usaha-lain'].forEach((id) =>
    console.log(`  ${akun[id]?.nama ?? id}: ${saldoAkun(id).toLocaleString('id-ID')}${id === 's-utang-usaha-lain' ? ' (saldo kredit ditulis minus)' : ''}`),
  );
  console.log(`  Neraca: ${kiri === kanan ? 'SEIMBANG' : `TIDAK SEIMBANG (${kiri} vs ${kanan})`}`);
  if (Object.keys(lewati).length) {
    console.log('  Baris sheet yang dilewati:');
    Object.entries(lewati).forEach(([k, v]) => console.log(`    ${v} × ${k}`));
  }
}

utama().catch((err) => {
  console.error(`GAGAL: ${err.message}`);
  process.exit(1);
});
