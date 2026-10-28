/**
 * DRPP (Daftar Rincian Permintaan Pembayaran) — docs/skema-database.md §5.2 `lpj_drpp`.
 * DRPP dan keanggotaannya hanya ditulis Function: nomor DRPP-TAHUN-NNNN, daftar berkas
 * (`berkasIds`), berkas yang sudah masuk (`masuk`, juga dijaga pemicu diKeuanganDitulis), anggota
 * yang boleh membacanya, dan tautan `keuangan/status.arsip.drppId`. Berkas yang tercantum tetapi
 * belum diarsipkan tertaut otomatis begitu arsipnya selesai (pemicu diKeuanganDitulis di lpj.js).
 * Dokumen DRPP/SPM/SP2D diunggah Keuangan lewat rules. DRPP tidak dihapus fisik: Super Admin
 * membatalkannya (`status: 'batal'`) dan berkasnya lepas.
 */

const { onCall } = require('firebase-functions/v2/https');
const {
  HttpsError,
  FieldValue,
  db,
  OPSI_CALLABLE,
  KOLEKSI,
  pemanggil,
  superadmin,
  wajibPeran,
  idSah,
  teksSah,
  waktuWita,
  catatLog,
  jejakUbah,
} = require('./umum');
const { masukDrppDari } = require('./hitungBerkas');

const MAKS_BERKAS = 100;
const DOKUMEN = ['drpp', 'spm', 'sp2d'];

const berkasRef = (id) => db.collection(KOLEKSI.lpjBerkas).doc(id);
const keuanganRef = (id) => berkasRef(id).collection('keuangan').doc('status');
const drppRef = (id) => db.collection(KOLEKSI.lpjDrpp).doc(id);

function daftarSah(v) {
  if (!Array.isArray(v) || v.length < 1 || v.length > MAKS_BERKAS) {
    throw new HttpsError('invalid-argument', `Daftar berkas wajib berisi 1–${MAKS_BERKAS} LPJ.`);
  }
  return [...new Set(v.map((x) => idSah(x, 'ID berkas')))];
}

/**
 * Baca berkas + keuangan di dalam transaksi. Berkas di `wajib` harus ada, bernomor, dan bertahun
 * anggaran sama; berkas lain yang sudah hilang dilewati.
 */
async function bacaBerkas(tx, ids, tahunAnggaran, wajib = ids) {
  if (!ids.length) return [];
  const snaps = await tx.getAll(...ids.map(berkasRef));
  const kSnaps = await tx.getAll(...ids.map(keuanganRef));
  const hasil = [];
  ids.forEach((id, i) => {
    const d = snaps[i].exists ? snaps[i].data() : null;
    if (!wajib.includes(id)) {
      if (d) hasil.push({ id, d, k: kSnaps[i].exists ? kSnaps[i].data() : {} });
      return;
    }
    if (!d?.nomorLpj) {
      throw new HttpsError('failed-precondition', `Berkas ${d?.uraian || id} belum bernomor LPJ.`);
    }
    if (d.tahunAnggaran !== tahunAnggaran) {
      throw new HttpsError(
        'failed-precondition',
        `Berkas ${d.nomorLpj} bukan tahun anggaran ${tahunAnggaran}.`,
      );
    }
    hasil.push({ id, d, k: kSnaps[i].exists ? kSnaps[i].data() : {} });
  });
  return hasil;
}

/** DRPP lain yang sudah mencantumkan salah satu berkas (null bila bebas). */
async function dipakaiDrppLain(tx, ids, kecualiId) {
  for (let i = 0; i < ids.length; i += 30) {
    const q = await tx.get(
      db.collection(KOLEKSI.lpjDrpp).where('berkasIds', 'array-contains-any', ids.slice(i, i + 30)),
    );
    const lain = q.docs.find((d) => d.id !== kecualiId);
    if (lain) {
      const nomor = (lain.get('berkasIds') || []).find((x) => ids.includes(x));
      return { drppId: lain.id, berkasId: nomor };
    }
  }
  return null;
}

/** Akun yang boleh membaca DRPP: gabungan anggota berkasnya. */
const anggotaDari = (rows) => [...new Set(rows.flatMap((r) => r.d.anggotaUids || []))];

const sudahDiarsip = (r) => r.k.arsip?.selesai === true;

function wajibAktif(drpp) {
  if (drpp.status === 'batal') throw new HttpsError('failed-precondition', 'DRPP sudah dibatalkan.');
}

/**
 * Buat DRPP dari daftar LPJ yang tertera di dokumen DRPP. Berkas yang sudah diarsipkan langsung
 * masuk; sisanya menunggu dan masuk otomatis saat arsipnya selesai.
 * Masukan: { tahunAnggaran, berkasIds }. Hasil: { id, masuk, menunggu }.
 */
exports.buatDrpp = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'keuangan');
  const tahunAnggaran = Number(req.data?.tahunAnggaran);
  if (!Number.isInteger(tahunAnggaran) || tahunAnggaran < 2024 || tahunAnggaran > 2100) {
    throw new HttpsError('invalid-argument', 'Tahun anggaran tidak sah.');
  }
  const ids = daftarSah(req.data?.berkasIds);
  const waktu = waktuWita();

  return db.runTransaction(async (tx) => {
    const penghitungRef = db.collection(KOLEKSI.sistemPenghitung).doc(`drpp_${waktu.tahun}`);
    const penghitung = await tx.get(penghitungRef);
    const rows = await bacaBerkas(tx, ids, tahunAnggaran);
    const bentrok = await dipakaiDrppLain(tx, ids, null);
    if (bentrok) {
      throw new HttpsError('failed-precondition', `Sebagian berkas sudah tercantum di ${bentrok.drppId}.`);
    }
    const urut = (penghitung.exists ? Number(penghitung.get('nilai')) || 0 : 0) + 1;
    const id = `DRPP-${waktu.tahun}-${String(urut).padStart(4, '0')}`;
    const ref = drppRef(id);
    if ((await tx.get(ref)).exists) throw new HttpsError('aborted', 'Nomor bentrok, coba lagi.');

    tx.set(penghitungRef, { nilai: urut, diubahPada: FieldValue.serverTimestamp() });
    const masuk = rows.filter((r) => sudahDiarsip(r) && !r.k.arsip?.drppId);
    tx.create(ref, {
      tahunAnggaran,
      tanggal: waktu.tanggal,
      status: 'aktif',
      berkasIds: ids,
      masuk: Object.fromEntries(masuk.map((r) => [r.id, masukDrppDari(r.d, r.k)])),
      dokumen: {},
      anggotaUids: anggotaDari(rows),
      dibuatPada: FieldValue.serverTimestamp(),
      dibuatOleh: p.uid,
      ...jejakUbah(p.uid),
    });
    masuk.forEach((r) => tx.update(keuanganRef(r.id), { 'arsip.drppId': id, ...jejakUbah(p.uid) }));
    catatLog(tx, {
      modul: 'lpj',
      aksi: 'buatDrpp',
      target: ref.path,
      nilaiBaru: { berkasIds: ids },
      oleh: p.uid,
    });
    return { id, masuk: masuk.length, menunggu: rows.length - masuk.length };
  });
});

/**
 * Ganti daftar LPJ sebuah DRPP (aktif, belum lengkap). Berkas yang dikeluarkan lepas dari DRPP;
 * berkas baru yang sudah diarsipkan langsung masuk. Masukan: { drppId, berkasIds }.
 */
exports.ubahDaftarDrpp = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'keuangan');
  const drppId = idSah(req.data?.drppId, 'ID DRPP');
  const ids = daftarSah(req.data?.berkasIds);

  return db.runTransaction(async (tx) => {
    const ref = drppRef(drppId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'DRPP tidak ditemukan.');
    const drpp = snap.data();
    wajibAktif(drpp);
    const lama = drpp.berkasIds || [];
    const baru = ids.filter((x) => !lama.includes(x));
    const rows = await bacaBerkas(tx, [...new Set([...lama, ...ids])], drpp.tahunAnggaran, baru);
    const bentrok = baru.length ? await dipakaiDrppLain(tx, baru, drppId) : null;
    if (bentrok) {
      throw new HttpsError('failed-precondition', `Sebagian berkas sudah tercantum di ${bentrok.drppId}.`);
    }
    const dokLengkap = DOKUMEN.every((k) => drpp.dokumen?.[k]);
    const semuaMasuk = rows
      .filter((r) => lama.includes(r.id))
      .every((r) => r.k.arsip?.drppId === drppId);
    if (dokLengkap && semuaMasuk) {
      throw new HttpsError('failed-precondition', 'DRPP sudah lengkap dan terkunci.');
    }

    const masuk = {};
    rows.forEach((r) => {
      const tetap = ids.includes(r.id);
      if (!tetap && r.k.arsip?.drppId === drppId) {
        tx.update(keuanganRef(r.id), { 'arsip.drppId': null, ...jejakUbah(p.uid) });
      } else if (tetap && sudahDiarsip(r) && !r.k.arsip?.drppId) {
        tx.update(keuanganRef(r.id), { 'arsip.drppId': drppId, ...jejakUbah(p.uid) });
        masuk[r.id] = masukDrppDari(r.d, r.k);
      } else if (tetap && r.k.arsip?.drppId === drppId) {
        masuk[r.id] = masukDrppDari(r.d, r.k);
      }
    });
    tx.update(ref, {
      berkasIds: ids,
      masuk,
      anggotaUids: anggotaDari(rows.filter((r) => ids.includes(r.id))),
      ...jejakUbah(p.uid),
    });
    catatLog(tx, {
      modul: 'lpj',
      aksi: 'ubahDaftarDrpp',
      target: ref.path,
      nilaiLama: { berkasIds: lama },
      nilaiBaru: { berkasIds: ids },
      oleh: p.uid,
    });
    return { berkasIds: ids };
  });
});

/**
 * Batalkan DRPP (Super Admin, wajib alasan) — pengganti hapus: dokumen DRPP tetap ada dengan
 * `status: 'batal'` (daftar lama di `batal.berkasIds`), berkas anggotanya lepas dan kembali
 * "Belum Masuk DRPP". Pindaian dokumen DRPP di Storage tetap. Nomor DRPP tidak dipakai ulang.
 * Masukan: { drppId, alasan }.
 */
exports.batalkanDrpp = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  if (!superadmin(p)) {
    throw new HttpsError('permission-denied', 'Hanya Super Admin yang bisa membatalkan DRPP.');
  }
  const drppId = idSah(req.data?.drppId, 'ID DRPP');
  const alasan = teksSah(req.data?.alasan, 300, 'Alasan');

  await db.runTransaction(async (tx) => {
    const ref = drppRef(drppId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'DRPP tidak ditemukan.');
    wajibAktif(snap.data());
    const ids = snap.get('berkasIds') || [];
    const kSnaps = ids.length ? await tx.getAll(...ids.map(keuanganRef)) : [];
    kSnaps.forEach((s) => {
      if (s.exists && s.get('arsip.drppId') === drppId) {
        tx.update(s.ref, { 'arsip.drppId': null, ...jejakUbah(p.uid) });
      }
    });
    tx.update(ref, {
      status: 'batal',
      berkasIds: [],
      masuk: {},
      batal: { alasan, berkasIds: ids, pada: FieldValue.serverTimestamp(), oleh: p.uid },
      ...jejakUbah(p.uid),
    });
    catatLog(tx, {
      modul: 'lpj',
      aksi: 'batalkanDrpp',
      target: ref.path,
      nilaiLama: { berkasIds: ids, tanggal: snap.get('tanggal') || '' },
      alasan,
      oleh: p.uid,
    });
  });
  return { dibatalkan: true };
});
