/**
 * Koperasi › Pembukuan (docs/skema-database.md §5.7): transfer antar kas, saldo awal, pengaturan
 * simpanan & SHU, pengeluaran/penerimaan lain, pelunasan bon & utang, dan tutup buku. Semua transaksi
 * uang lewat mesin jurnal di koperasiBuku.js (baca dulu, baru tulis, dalam satu transaksi).
 */

const {
  FieldValue,
  db,
  pemanggil,
  wajibPeran,
  idSah,
  teksSah,
  tanggalSah,
  waktuWita,
  jejakUbah,
  catatLog,
} = require('./umum');
const { callable } = require('./jejak');
const {
  AKUN,
  SISI_NERACA,
  adalahKontra,
  kol,
  refSaldoAwal,
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
  refPengaturan,
  ALOKASI_BAWAAN,
  bacaPengaturan,
  refAnggota,
} = require('./koperasiBuku');

// ─── Kas ────────────────────────────────────────────────────────────────────

/**
 * Pindahkan dana antar rekening kas/bank; ditolak bila saldo asal kurang.
 * Masukan: { dariKasId, keKasId, jumlah, tanggal, keterangan }. Hasil: { jurnalId }.
 */
exports.transferKas = callable('transferKas', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const dariId = idSah(d.dariKasId, 'Kas asal');
  const keId = idSah(d.keKasId, 'Kas tujuan');
  if (dariId === keId) throw galat('Kas asal dan tujuan tidak boleh sama.');
  const jumlah = rupiahSah(d.jumlah, 'Jumlah', 1);
  const keterangan = teksSah(d.keterangan, 200, 'Keterangan', { wajib: false });

  return db.runTransaction(async (tx) => {
    const buku = await bukaBuku(tx, [dariId, keId]);
    const tanggal = cekTanggal(buku, d.tanggal);
    const dari = wajibKas(buku, dariId, 'Kas asal');
    const ke = wajibKas(buku, keId, 'Kas tujuan');
    if (saldoAkun(buku, dariId) < jumlah) throw tolak(`Saldo ${dari.nama} tidak cukup.`);
    const jurnalId = posting(tx, buku, {
      tanggal,
      jenis: 'transfer',
      keterangan: keterangan || `Transfer ${dari.nama} ke ${ke.nama}`,
      baris: [
        { akunId: keId, debit: jumlah },
        { akunId: dariId, kredit: jumlah },
      ],
      uid: p.uid,
    });
    return { jurnalId };
  });
});

// ─── Saldo awal pembukuan ───────────────────────────────────────────────────

const MAKS_AKUN_SALDO = 300;

/**
 * Simpan saldo awal akun neraca (boleh belum seimbang; ditampilkan selisihnya). Ditolak setelah
 * ada periode yang ditutup. Setiap perubahan dicatat di sistem_log.
 * Masukan: { tanggalMulai, saldo: { [akunId]: rupiah } }. Hasil: { totalAset, totalPasiva }.
 */
exports.simpanSaldoAwal = callable('simpanSaldoAwal', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  if (!tanggalSah(d.tanggalMulai)) throw galat('Tanggal mulai tidak sah.');
  if (!d.saldo || typeof d.saldo !== 'object' || Array.isArray(d.saldo)) {
    throw galat('Saldo tidak sah.');
  }
  const entri = Object.entries(d.saldo);
  if (entri.length > MAKS_AKUN_SALDO) throw galat('Terlalu banyak akun.');
  const saldo = {};
  entri.forEach(([id, v]) => {
    idSah(id, 'Akun');
    const n = rupiahSah(v, 'Saldo', 0);
    if (n > 0) saldo[id] = n;
  });
  const ids = Object.keys(saldo);

  return db.runTransaction(async (tx) => {
    const ref = refSaldoAwal();
    const [lama, ...akun] = await tx.getAll(ref, ...ids.map((id) => kol('koperasiAkun').doc(id)));
    if (lama.exists && lama.get('terkunciSampai')) {
      throw tolak('Saldo awal sudah dikunci karena ada periode yang ditutup.');
    }
    let totalAset = 0;
    let totalPasiva = 0;
    akun.forEach((a, i) => {
      if (!a.exists) throw tolak('Ada akun yang tidak ditemukan.');
      const sisi = SISI_NERACA[a.get('kelompok')];
      if (!sisi) throw tolak(`${a.get('nama')} bukan akun neraca.`);
      const n = saldo[ids[i]];
      if (sisi === 'pasiva') totalPasiva += n;
      else totalAset += adalahKontra(a.id) ? -n : n;
    });

    const isi = {
      tanggalMulai: d.tanggalMulai,
      saldo,
      totalAset,
      totalPasiva,
      terkunciSampai: '',
      ...jejakUbah(p.uid),
    };
    if (lama.exists) {
      tx.set(ref, {
        ...isi,
        dibuatPada: lama.get('dibuatPada'),
        dibuatOleh: lama.get('dibuatOleh'),
      });
    } else {
      tx.create(ref, { ...isi, dibuatPada: waktu(), dibuatOleh: p.uid });
    }
    catatLog(tx, {
      modul: 'koperasi',
      aksi: 'simpanSaldoAwal',
      target: ref.path,
      nilaiLama: lama.exists
        ? {
            tanggalMulai: lama.get('tanggalMulai'),
            totalAset: lama.get('totalAset'),
            totalPasiva: lama.get('totalPasiva'),
          }
        : null,
      nilaiBaru: { tanggalMulai: d.tanggalMulai, totalAset, totalPasiva },
      oleh: p.uid,
    });
    return { totalAset, totalPasiva };
  });
});

// ─── Pengaturan ─────────────────────────────────────────────────────────────

/**
 * Nominal simpanan & persentase alokasi SHU (total harus 100).
 * Masukan: { nominalPokok, nominalWajib, alokasiShu: { [bagian]: persen } }.
 */
exports.simpanPengaturanKoperasi = callable('simpanPengaturanKoperasi', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const nominalPokok = rupiahSah(d.nominalPokok, 'Simpanan pokok', 1);
  const nominalWajib = rupiahSah(d.nominalWajib, 'Simpanan wajib', 1);
  const alokasiShu = {};
  Object.keys(ALOKASI_BAWAAN).forEach((k) => {
    const n = Number(d.alokasiShu?.[k]);
    if (!Number.isInteger(n) || n < 0 || n > 100) throw galat('Persentase SHU harus 0–100.');
    alokasiShu[k] = n;
  });
  if (Object.values(alokasiShu).reduce((a, b) => a + b, 0) !== 100) {
    throw galat('Total persentase SHU harus 100%.');
  }
  return db.runTransaction(async (tx) => {
    const lama = await bacaPengaturan(tx);
    const isi = { nominalPokok, nominalWajib, alokasiShu, ...jejakUbah(p.uid) };
    if (lama.ada) tx.update(refPengaturan(), isi);
    else {
      tx.create(refPengaturan(), {
        ...isi,
        nomorAnggotaTerakhir: 0,
        dibuatPada: waktu(),
        dibuatOleh: p.uid,
      });
    }
    catatLog(tx, {
      modul: 'koperasi',
      aksi: 'simpanPengaturan',
      target: refPengaturan().path,
      nilaiLama: lama.ada
        ? {
            nominalPokok: lama.nominalPokok,
            nominalWajib: lama.nominalWajib,
            alokasiShu: lama.alokasiShu,
          }
        : null,
      nilaiBaru: { nominalPokok, nominalWajib, alokasiShu },
      oleh: p.uid,
    });
    return { ok: true };
  });
});

// ─── Transaksi umum ─────────────────────────────────────────────────────────

// Akun yang hanya boleh berubah lewat fiturnya sendiri (bukan lewat pengeluaran/penerimaan lain).
// Cermin klien: akunKontrol di src/modules/koperasi/data/aturan.js.
const AKUN_KONTROL = new Set([
  AKUN.persediaan,
  AKUN.piutangAnggota,
  AKUN.simpananPokok,
  AKUN.simpananWajib,
  's-shu-berjalan',
]);
const akunKontrol = (id) => AKUN_KONTROL.has(id) || id.startsWith('k-');

/**
 * Pengeluaran lain (D akun pilihan / K Kas atau Utang Usaha) dan penerimaan lain (D Kas / K akun pilihan).
 * Masukan: { jenis: 'pengeluaran'|'penerimaan', tanggal, akunId, kasId, utang, jumlah, keterangan }.
 */
exports.catatTransaksiUmum = callable('catatTransaksiUmum', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  if (!['pengeluaran', 'penerimaan'].includes(d.jenis)) throw galat('Jenis transaksi tidak sah.');
  const keluar = d.jenis === 'pengeluaran';
  const utang = keluar && d.utang === true;
  const akunId = idSah(d.akunId, 'Akun');
  const kasId = utang ? '' : idSah(d.kasId, 'Kas');
  const jumlah = rupiahSah(d.jumlah, 'Jumlah', 1);
  const keterangan = teksSah(d.keterangan, 200, 'Keterangan');
  if (akunKontrol(akunId)) throw tolak('Akun ini hanya berubah lewat menunya sendiri.');

  return db.runTransaction(async (tx) => {
    const buku = await bukaBuku(tx, [akunId, utang ? AKUN.utangUsaha : kasId]);
    const tanggal = cekTanggal(buku, d.tanggal);
    const akun = akunDari(buku, akunId);
    if (akun.kas) throw tolak('Untuk memindahkan uang antar kas, pakai Transfer Kas.');
    if (akun.aktif === false) throw tolak('Akun ini sudah nonaktif.');
    if (!utang) {
      const kas = wajibKas(buku, kasId);
      if (keluar && saldoAkun(buku, kasId) < jumlah) throw tolak(`Saldo ${kas.nama} tidak cukup.`);
    }
    const lawan = utang ? AKUN.utangUsaha : kasId;
    const jurnalId = posting(tx, buku, {
      tanggal,
      jenis: d.jenis,
      keterangan: `${keterangan}${utang ? ' (utang)' : ''}`,
      baris: keluar
        ? [
            { akunId, debit: jumlah },
            { akunId: lawan, kredit: jumlah },
          ]
        : [
            { akunId: kasId, debit: jumlah },
            { akunId, kredit: jumlah },
          ],
      uid: p.uid,
    });
    const ref = kol('koperasiTransaksiUmum').doc();
    tx.create(ref, {
      jenis: d.jenis,
      tanggal,
      akunId,
      akunNama: akun.nama,
      kasId,
      kasNama: utang ? '' : buku.akun.get(kasId).nama,
      utang,
      jumlah,
      keterangan,
      anggotaId: '',
      pembelianId: '',
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
    });
    return { id: ref.id, jurnalId };
  });
});

/**
 * Pelunasan bon anggota (D Kas / K Piutang Usaha Anggota). Masukan: { anggotaId, jumlah, kasId,
 * tanggal, keterangan }.
 */
exports.lunasiBon = callable('lunasiBon', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const ref = refAnggota(idSah(d.anggotaId, 'Anggota'));
  const kasId = idSah(d.kasId, 'Kas');
  const jumlah = rupiahSah(d.jumlah, 'Jumlah', 1);
  const keterangan = teksSah(d.keterangan, 200, 'Keterangan', { wajib: false });

  return db.runTransaction(async (tx) => {
    const a = await tx.get(ref);
    const buku = await bukaBuku(tx, [kasId, AKUN.piutangAnggota]);
    const tanggal = cekTanggal(buku, d.tanggal);
    wajibKas(buku, kasId);
    if (!a.exists) throw tolak('Anggota tidak ditemukan.');
    if (jumlah > a.get('piutang')) throw tolak('Jumlah melebihi bon anggota ini.');
    const jurnalId = posting(tx, buku, {
      tanggal,
      jenis: 'pelunasanBon',
      keterangan: `Pelunasan bon · ${a.get('nomor')} ${a.get('nama')}${keterangan ? ` (${keterangan})` : ''}`,
      baris: [
        { akunId: kasId, debit: jumlah },
        { akunId: AKUN.piutangAnggota, kredit: jumlah },
      ],
      uid: p.uid,
    });
    tx.update(ref, { piutang: FieldValue.increment(-jumlah), ...jejakUbah(p.uid) });
    const tRef = kol('koperasiTransaksiUmum').doc();
    tx.create(tRef, {
      jenis: 'pelunasanBon',
      tanggal,
      akunId: AKUN.piutangAnggota,
      akunNama: buku.akun.get(AKUN.piutangAnggota).nama,
      kasId,
      kasNama: buku.akun.get(kasId).nama,
      utang: false,
      jumlah,
      keterangan,
      anggotaId: ref.id,
      pembelianId: '',
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
    });
    return { id: tRef.id, jurnalId };
  });
});

/**
 * Pelunasan utang pembelian (D Utang Usaha Lain-lain / K Kas). Masukan: { pembelianId, jumlah,
 * kasId, tanggal, keterangan }.
 */
exports.lunasiUtang = callable('lunasiUtang', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const ref = kol('koperasiKantinPembelian').doc(idSah(d.pembelianId, 'Pembelian'));
  const kasId = idSah(d.kasId, 'Kas');
  const jumlah = rupiahSah(d.jumlah, 'Jumlah', 1);
  const keterangan = teksSah(d.keterangan, 200, 'Keterangan', { wajib: false });

  return db.runTransaction(async (tx) => {
    const b = await tx.get(ref);
    const buku = await bukaBuku(tx, [kasId, AKUN.utangUsaha]);
    const tanggal = cekTanggal(buku, d.tanggal);
    const kas = wajibKas(buku, kasId);
    if (!b.exists) throw tolak('Pembelian tidak ditemukan.');
    if (jumlah > b.get('sisaUtang')) throw tolak('Jumlah melebihi sisa utang pembelian ini.');
    if (saldoAkun(buku, kasId) < jumlah) throw tolak(`Saldo ${kas.nama} tidak cukup.`);
    const jurnalId = posting(tx, buku, {
      tanggal,
      jenis: 'pelunasanUtang',
      keterangan: `Pelunasan utang pembelian ${b.get('tanggal')}${b.get('pemasok') ? ` · ${b.get('pemasok')}` : ''}`,
      baris: [
        { akunId: AKUN.utangUsaha, debit: jumlah },
        { akunId: kasId, kredit: jumlah },
      ],
      uid: p.uid,
    });
    tx.update(ref, { sisaUtang: FieldValue.increment(-jumlah) });
    const tRef = kol('koperasiTransaksiUmum').doc();
    tx.create(tRef, {
      jenis: 'pelunasanUtang',
      tanggal,
      akunId: AKUN.utangUsaha,
      akunNama: buku.akun.get(AKUN.utangUsaha).nama,
      kasId,
      kasNama: kas.nama,
      utang: false,
      jumlah,
      keterangan,
      anggotaId: '',
      pembelianId: ref.id,
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
    });
    return { id: tRef.id, jurnalId };
  });
});

// ─── Tutup buku ─────────────────────────────────────────────────────────────

/**
 * Kunci periode sampai bulan tertentu (inklusif): jurnal bertanggal di periode itu ditolak dan saldo
 * awal tidak bisa diubah lagi. Hanya bulan yang sudah lewat. Masukan: { sampai: 'YYYY-MM' }.
 */
exports.tutupBuku = callable('tutupBuku', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const sampai = req.data?.sampai;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(sampai || '')) throw galat('Bulan tidak sah.');
  if (sampai >= waktuWita().tanggal.slice(0, 7))
    throw tolak('Hanya bulan yang sudah lewat yang bisa ditutup.');
  return db.runTransaction(async (tx) => {
    const sa = await tx.get(refSaldoAwal());
    if (!sa.exists) throw tolak('Isi Saldo Awal lebih dulu.');
    const lama = sa.get('terkunciSampai') || '';
    if (sampai <= lama) throw tolak(`Periode sampai ${lama} sudah ditutup.`);
    if (sampai < sa.get('tanggalMulai').slice(0, 7)) throw tolak('Bulan sebelum mulai pembukuan.');
    tx.update(refSaldoAwal(), { terkunciSampai: sampai, ...jejakUbah(p.uid) });
    catatLog(tx, {
      modul: 'koperasi',
      aksi: 'tutupBuku',
      target: refSaldoAwal().path,
      nilaiLama: { terkunciSampai: lama },
      nilaiBaru: { terkunciSampai: sampai },
      oleh: p.uid,
    });
    return { terkunciSampai: sampai };
  });
});
