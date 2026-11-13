/**
 * Koperasi › Anggota & Simpanan (docs/skema-database.md §5.7): data anggota, saldo awal simpanan,
 * setoran pokok/wajib (termasuk potong gaji sekaligus), dan pengambilan saat anggota keluar.
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
  kol,
  refSaldoAwal,
  waktu,
  galat,
  tolak,
  rupiahSah,
  bukaBuku,
  saldoAkun,
  wajibKas,
  cekTanggal,
  posting,
  refPengaturan,
  bacaPengaturan,
  refAnggota,
  rekapAnggota,
} = require('./koperasiBuku');

// Cermin klien: BATAS.potongGaji (src/modules/koperasi/data/aturan.js).
const MAKS_POTONG_GAJI = 200;

// ─── Anggota & simpanan ─────────────────────────────────────────────────────

/**
 * Tambah/ubah anggota. Anggota pegawai diambil dari pegawai_ringkas (satu pegawai satu anggota);
 * anggota luar cukup nama (tanpa akun login). Status awal "calon" sampai simpanan pokok dibayar.
 * Masukan: { id?, jenis: 'pegawai'|'luar', pegawaiId?, nama?, catatan? }. Hasil: { id, nomor }.
 */
exports.simpanAnggota = callable('simpanAnggota', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const catatan = teksSah(d.catatan, 200, 'Catatan', { wajib: false });

  return db.runTransaction(async (tx) => {
    if (d.id) {
      const ref = refAnggota(idSah(d.id, 'Anggota'));
      const a = await tx.get(ref);
      if (!a.exists) throw tolak('Anggota tidak ditemukan.');
      const isi = { catatan, ...jejakUbah(p.uid) };
      if (a.get('jenis') === 'luar') isi.nama = teksSah(d.nama, 100, 'Nama');
      tx.update(ref, isi);
      return { id: ref.id, nomor: a.get('nomor') };
    }
    if (!['pegawai', 'luar'].includes(d.jenis)) throw galat('Jenis anggota tidak sah.');
    const pengaturan = await bacaPengaturan(tx);
    let nama;
    let pegawaiId = '';
    if (d.jenis === 'pegawai') {
      pegawaiId = idSah(d.pegawaiId, 'Pegawai');
      const [peg, kembar] = await Promise.all([
        tx.get(kol('pegawaiRingkas').doc(pegawaiId)),
        tx.get(kol('koperasiAnggota').where('pegawaiId', '==', pegawaiId).limit(1)),
      ]);
      if (!peg.exists) throw tolak('Pegawai tidak ditemukan.');
      if (!kembar.empty) throw tolak('Pegawai ini sudah terdaftar sebagai anggota.');
      nama = peg.get('nama');
    } else {
      nama = teksSah(d.nama, 100, 'Nama');
    }
    const urut = pengaturan.nomorAnggotaTerakhir + 1;
    const nomor = `A${String(urut).padStart(4, '0')}`;
    const ref = kol('koperasiAnggota').doc();
    tx.create(ref, {
      nomor,
      nama,
      jenis: d.jenis,
      pegawaiId,
      status: 'calon',
      tanggalMasuk: '',
      tanggalKeluar: '',
      saldoPokok: 0,
      saldoWajib: 0,
      awalPokok: 0,
      awalWajib: 0,
      piutang: 0,
      potongGajiTerakhir: '',
      catatan,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
      ...jejakUbah(p.uid),
    });
    if (pengaturan.ada) tx.update(refPengaturan(), { nomorAnggotaTerakhir: urut });
    else {
      const { ada: _ada, ...bawaan } = pengaturan;
      tx.create(refPengaturan(), {
        ...bawaan,
        nomorAnggotaTerakhir: urut,
        dibuatPada: waktu(),
        dibuatOleh: p.uid,
        ...jejakUbah(p.uid),
      });
    }
    return { id: ref.id, nomor };
  });
});

/**
 * Saldo simpanan anggota saat pembukuan dimulai (tanpa jurnal: angkanya sudah ada di Saldo Awal
 * akun Simpanan Pokok/Wajib). Anggota dengan saldo pokok menjadi aktif.
 * Masukan: { anggotaId, pokok, wajib, tanggalMasuk? }.
 */
exports.simpanSaldoAwalSimpanan = callable('simpanSaldoAwalSimpanan', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const ref = refAnggota(idSah(d.anggotaId, 'Anggota'));
  const pokok = rupiahSah(d.pokok ?? 0, 'Simpanan pokok', 0);
  const wajib = rupiahSah(d.wajib ?? 0, 'Simpanan wajib', 0);
  if (d.tanggalMasuk && !tanggalSah(d.tanggalMasuk)) throw galat('Tanggal masuk tidak sah.');

  return db.runTransaction(async (tx) => {
    const [a, sa] = await Promise.all([tx.get(ref), tx.get(refSaldoAwal())]);
    if (!a.exists) throw tolak('Anggota tidak ditemukan.');
    if (a.get('status') === 'keluar') throw tolak('Anggota sudah keluar.');
    if (sa.exists && sa.get('terkunciSampai')) throw tolak('Saldo awal sudah dikunci.');
    const saldoPokok = a.get('saldoPokok') - a.get('awalPokok') + pokok;
    const saldoWajib = a.get('saldoWajib') - a.get('awalWajib') + wajib;
    const isi = { awalPokok: pokok, awalWajib: wajib, saldoPokok, saldoWajib, ...jejakUbah(p.uid) };
    if (saldoPokok > 0 && a.get('status') === 'calon') {
      isi.status = 'aktif';
      isi.tanggalMasuk =
        d.tanggalMasuk || (sa.exists ? sa.get('tanggalMulai') : waktuWita().tanggal);
    }
    tx.update(ref, isi);
    catatLog(tx, {
      modul: 'koperasi',
      aksi: 'saldoAwalSimpanan',
      target: ref.path,
      nilaiLama: { pokok: a.get('awalPokok'), wajib: a.get('awalWajib') },
      nilaiBaru: { pokok, wajib },
      oleh: p.uid,
    });
    return { saldoPokok, saldoWajib };
  });
});

/**
 * Setoran simpanan satu anggota. Pokok: sekali, sebesar nominal, anggota menjadi aktif.
 * Wajib: kelipatan nominal per bulan, anggota harus aktif. Jurnal: D Kas / K Simpanan Pokok|Wajib.
 * Masukan: { anggotaId, jenis: 'pokok'|'wajib', jumlah, kasId, tanggal, keterangan }.
 */
exports.catatSimpanan = callable('catatSimpanan', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  if (!['pokok', 'wajib'].includes(d.jenis)) throw galat('Jenis simpanan tidak sah.');
  const ref = refAnggota(idSah(d.anggotaId, 'Anggota'));
  const kasId = idSah(d.kasId, 'Kas');
  const jumlah = rupiahSah(d.jumlah, 'Jumlah', 1);
  const keterangan = teksSah(d.keterangan, 200, 'Keterangan', { wajib: false });
  const pokok = d.jenis === 'pokok';

  return db.runTransaction(async (tx) => {
    const [a, pengaturan] = await Promise.all([tx.get(ref), bacaPengaturan(tx)]);
    const akunSimpanan = pokok ? AKUN.simpananPokok : AKUN.simpananWajib;
    const buku = await bukaBuku(tx, [kasId, akunSimpanan]);
    const tanggal = cekTanggal(buku, d.tanggal);
    wajibKas(buku, kasId);
    if (!a.exists) throw tolak('Anggota tidak ditemukan.');
    if (pokok) {
      if (a.get('status') !== 'calon' || a.get('saldoPokok') > 0) {
        throw tolak('Simpanan pokok anggota ini sudah dibayar.');
      }
      if (jumlah !== pengaturan.nominalPokok) {
        throw tolak(`Simpanan pokok harus Rp${pengaturan.nominalPokok.toLocaleString('id-ID')}.`);
      }
    } else {
      if (a.get('status') !== 'aktif') throw tolak('Anggota belum aktif atau sudah keluar.');
      if (jumlah % pengaturan.nominalWajib !== 0) {
        throw tolak(
          `Simpanan wajib harus kelipatan Rp${pengaturan.nominalWajib.toLocaleString('id-ID')}.`,
        );
      }
    }
    const label = pokok ? 'Simpanan pokok' : 'Simpanan wajib';
    const jurnalId = posting(tx, buku, {
      tanggal,
      jenis: pokok ? 'simpananPokok' : 'simpananWajib',
      keterangan: `${label} · ${a.get('nomor')} ${a.get('nama')}${keterangan ? ` (${keterangan})` : ''}`,
      baris: [
        { akunId: kasId, debit: jumlah },
        { akunId: akunSimpanan, kredit: jumlah },
      ],
      uid: p.uid,
    });
    const isi = { ...jejakUbah(p.uid) };
    if (pokok) {
      isi.saldoPokok = FieldValue.increment(jumlah);
      isi.status = 'aktif';
      isi.tanggalMasuk = tanggal;
    } else {
      isi.saldoWajib = FieldValue.increment(jumlah);
    }
    tx.update(ref, isi);
    rekapAnggota(
      tx,
      tanggal.slice(0, 4),
      ref.id,
      pokok ? { setorPokok: jumlah } : { setorWajib: jumlah },
    );
    const simpRef = kol('koperasiSimpanan').doc();
    tx.create(simpRef, {
      anggotaId: ref.id,
      anggotaNama: a.get('nama'),
      nomor: a.get('nomor'),
      jenis: d.jenis,
      tanggal,
      jumlah,
      pokok: pokok ? jumlah : 0,
      wajib: pokok ? 0 : jumlah,
      kasId,
      keterangan,
      bulan: '',
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
    });
    return { id: simpRef.id, jurnalId };
  });
});

/**
 * Setoran simpanan wajib dari potongan gaji untuk banyak anggota sekaligus (satu jurnal).
 * Satu anggota hanya sekali per bulan potongan. Masukan: { bulan: 'YYYY-MM', kasId, tanggal, anggotaIds }.
 */
exports.setorPotongGaji = callable('setorPotongGaji', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.bulan || '')) throw galat('Bulan potongan tidak sah.');
  const kasId = idSah(d.kasId, 'Kas');
  const ids = Array.isArray(d.anggotaIds) ? [...new Set(d.anggotaIds)] : [];
  if (!ids.length || ids.length > MAKS_POTONG_GAJI) {
    throw galat(`Pilih 1–${MAKS_POTONG_GAJI} anggota.`);
  }
  ids.forEach((id) => idSah(id, 'Anggota'));

  return db.runTransaction(async (tx) => {
    const [pengaturan, anggota] = await Promise.all([
      bacaPengaturan(tx),
      tx.getAll(...ids.map(refAnggota)),
    ]);
    const buku = await bukaBuku(tx, [kasId, AKUN.simpananWajib]);
    const tanggal = cekTanggal(buku, d.tanggal);
    wajibKas(buku, kasId);
    anggota.forEach((a) => {
      if (!a.exists || a.get('status') !== 'aktif') {
        throw tolak('Ada anggota yang tidak ditemukan atau tidak aktif.');
      }
      if (a.get('potongGajiTerakhir') === d.bulan) {
        throw tolak(`${a.get('nama')} sudah tercatat potongan gaji ${d.bulan}.`);
      }
    });
    const nominal = pengaturan.nominalWajib;
    const total = nominal * anggota.length;
    const jurnalId = posting(tx, buku, {
      tanggal,
      jenis: 'simpananWajib',
      keterangan: `Simpanan wajib potong gaji ${d.bulan} · ${anggota.length} anggota`,
      baris: [
        { akunId: kasId, debit: total },
        { akunId: AKUN.simpananWajib, kredit: total },
      ],
      uid: p.uid,
    });
    anggota.forEach((a) => {
      tx.update(a.ref, {
        saldoWajib: FieldValue.increment(nominal),
        potongGajiTerakhir: d.bulan,
        ...jejakUbah(p.uid),
      });
      rekapAnggota(tx, tanggal.slice(0, 4), a.id, { setorWajib: nominal });
      tx.create(kol('koperasiSimpanan').doc(), {
        anggotaId: a.id,
        anggotaNama: a.get('nama'),
        nomor: a.get('nomor'),
        jenis: 'wajib',
        tanggal,
        jumlah: nominal,
        pokok: 0,
        wajib: nominal,
        kasId,
        keterangan: `Potong gaji ${d.bulan}`,
        bulan: d.bulan,
        jurnalId,
        dibuatPada: waktu(),
        dibuatOleh: p.uid,
      });
    });
    return { jurnalId, total, jumlahAnggota: anggota.length };
  });
});

/**
 * Anggota keluar: seluruh simpanan pokok + wajib dikembalikan dan status menjadi "keluar".
 * Ditolak bila masih ada bon. Jurnal: D Simpanan Pokok, D Simpanan Wajib / K Kas.
 * Masukan: { anggotaId, kasId, tanggal, keterangan }.
 */
exports.ambilSimpanan = callable('ambilSimpanan', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const ref = refAnggota(idSah(d.anggotaId, 'Anggota'));
  const kasId = idSah(d.kasId, 'Kas');
  const keterangan = teksSah(d.keterangan, 200, 'Keterangan', { wajib: false });

  return db.runTransaction(async (tx) => {
    const a = await tx.get(ref);
    const buku = await bukaBuku(tx, [kasId, AKUN.simpananPokok, AKUN.simpananWajib]);
    const tanggal = cekTanggal(buku, d.tanggal);
    const kas = wajibKas(buku, kasId);
    if (!a.exists || a.get('status') === 'keluar')
      throw tolak('Anggota tidak ditemukan atau sudah keluar.');
    if (a.get('piutang') > 0) throw tolak('Anggota masih punya bon. Lunasi dulu sebelum keluar.');
    const pokok = a.get('saldoPokok');
    const wajib = a.get('saldoWajib');
    const total = pokok + wajib;
    if (total <= 0) throw tolak('Anggota ini tidak punya saldo simpanan.');
    if (saldoAkun(buku, kasId) < total) throw tolak(`Saldo ${kas.nama} tidak cukup.`);
    const jurnalId = posting(tx, buku, {
      tanggal,
      jenis: 'pengambilanSimpanan',
      keterangan: `Pengambilan simpanan (keluar) · ${a.get('nomor')} ${a.get('nama')}`,
      baris: [
        { akunId: AKUN.simpananPokok, debit: pokok },
        { akunId: AKUN.simpananWajib, debit: wajib },
        { akunId: kasId, kredit: total },
      ],
      uid: p.uid,
    });
    tx.update(ref, {
      saldoPokok: 0,
      saldoWajib: 0,
      status: 'keluar',
      tanggalKeluar: tanggal,
      ...jejakUbah(p.uid),
    });
    rekapAnggota(tx, tanggal.slice(0, 4), ref.id, { ambil: total });
    tx.create(kol('koperasiSimpanan').doc(), {
      anggotaId: ref.id,
      anggotaNama: a.get('nama'),
      nomor: a.get('nomor'),
      jenis: 'pengambilan',
      tanggal,
      jumlah: total,
      pokok,
      wajib,
      kasId,
      keterangan,
      bulan: '',
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
    });
    return { jurnalId, total };
  });
});
