/**
 * Modul Log Developer (docs/skema-database.md §5.8): Function untuk Super Admin dan pengamat sistem.
 *
 * PENGAMANAN
 * - Semua data log hanya dibaca lewat Function di sini (rules menolak bacaan langsung browser).
 * - Wajib Super Admin + login kata sandi yang SEGAR: `bukaKunciLogDev` hanya menerima token yang
 *   baru diautentikasi ulang (≤ 2 menit), dan setiap bacaan menolak token yang lebih tua dari
 *   KUNCI_MENIT (klien lalu meminta kata sandi lagi).
 * - Setiap pembukaan dan bacaan Log Developer ikut tercatat di sistem_log (modul `logdev`).
 * - Catatan harian disegel (hash berantai, `sistem_segel`); pemeriksaan harian memverifikasi segel
 *   7 hari terakhir, jadi perubahan log lewat Console ketahuan.
 *
 * PENGAMAT
 * - `diDokumenDitulis`/`diSubDokumenDitulis`: setiap penulisan Firestore. Penulisan browser (lewat
 *   rules) dicatat selisihnya dengan pelaku dari konteks autentikasi server; penulisan dari luar
 *   aplikasi (Console, skrip, akun layanan lain) menjadi anomali kritis A8.
 */

const crypto = require('crypto');
const logger = require('firebase-functions/logger');
const { onDocumentWrittenWithAuthContext } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { Timestamp } = require('firebase-admin/firestore');
const {
  HttpsError,
  FieldValue,
  db,
  authAdmin,
  KOLEKSI,
  pemanggil,
  teksSah,
  catatLog,
} = require('./umum');
const {
  HARI_MS,
  AKUN_FUNGSI,
  AMBANG_BAWAAN,
  DI_EMULATOR,
  sidik,
  jamWita,
  aman,
  ringkasPelaku,
  selisih,
  bacaAmbang,
  segarkanAmbang,
  catatAnomali,
  catatGalat,
  catatAktivitas,
  callable,
} = require('./jejak');
const { TARIF_BAWAAN, pemakaianFirebase, lupakanCachePemakaian } = require('./pemakaian');

const KUNCI_MENIT = 30;
const PROYEK_JADWAL =
  process.env.GCLOUD_PROJECT || JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId || '';
const BUKA_MAKS_DETIK = 120;
const UKURAN_MAKS = 50;
const kol = (nama) => db.collection(KOLEKSI[nama]);

// ─── Gerbang ────────────────────────────────────────────────────────────────

/** Super Admin dengan login kata sandi yang belum lebih tua dari `maksDetik`. */
function wajibLogDev(req, maksDetik = KUNCI_MENIT * 60) {
  const p = pemanggil(req);
  if (!p.peran.includes('superadmin')) {
    throw new HttpsError('permission-denied', 'Log Developer khusus Super Admin.');
  }
  const umur = Date.now() / 1000 - Number(req.auth.token.auth_time || 0);
  if (!(umur >= 0 && umur <= maksDetik)) {
    throw new HttpsError('failed-precondition', 'KUNCI_ULANG');
  }
  return p;
}

/** Jejak bacaan Log Developer: satu dokumen per Super Admin per tampilan per jam (`jumlah` naik). */
async function catatBacaan(req, tampilan, saring) {
  const { uid } = req.auth;
  const ref = kol('sistemLog').doc(`logdev_${sidik(uid, tampilan, jamWita().kunciJam)}`);
  const isi = {
    modul: 'logdev',
    aksi: 'lihat',
    target: tampilan,
    oleh: uid,
    pelaku: ringkasPelaku(req.jejak.pelaku, req.jejak.klien),
    saring: saring || null,
    agregat: true,
    terakhirPada: FieldValue.serverTimestamp(),
  };
  try {
    await ref.create({ ...isi, jumlah: 1, pada: FieldValue.serverTimestamp() });
  } catch (err) {
    if (err?.code !== 6) throw err;
    await ref.update({ ...isi, jumlah: FieldValue.increment(1) });
  }
}

/** Timestamp → milidetik di seluruh objek (hasil callable berupa JSON biasa). */
function keJson(v) {
  if (v === null || v === undefined) return v ?? null;
  if (v instanceof Timestamp || typeof v?.toMillis === 'function') return v.toMillis();
  if (Array.isArray(v)) return v.map(keJson);
  if (typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, keJson(x)]));
  return v;
}
const baris = (s) => ({ id: s.id, ...keJson(s.data()) });

/** Nama pegawai untuk uid yang tampil (pegawai_ringkas.authUid), per 30 uid sekali kueri. */
async function namaPengguna(uids) {
  const unik = [...new Set(uids.filter((u) => typeof u === 'string' && u))].slice(0, 120);
  const peta = {};
  for (let i = 0; i < unik.length; i += 30) {
    const snap = await kol('pegawaiRingkas')
      .where('authUid', 'in', unik.slice(i, i + 30))
      .limit(30)
      .get();
    snap.forEach((d) => {
      peta[d.get('authUid')] = d.get('nama') || '';
    });
  }
  return peta;
}

// ─── Buka kunci & baca ──────────────────────────────────────────────────────

/** Dipanggil tepat setelah Super Admin mengetik ulang kata sandi; mencatat pembukaan modul. */
exports.bukaKunciLogDev = callable(
  'bukaKunciLogDev',
  async (req) => {
    const p = wajibLogDev(req, BUKA_MAKS_DETIK);
    await catatLog(null, {
      modul: 'logdev',
      aksi: 'buka',
      target: 'logdev',
      nilaiBaru: ringkasPelaku(req.jejak.pelaku, req.jejak.klien),
      oleh: p.uid,
    });
    return { terkunciPada: (Number(req.auth.token.auth_time) + KUNCI_MENIT * 60) * 1000 };
  },
  { senyap: true },
);

const TAMPILAN = new Set([
  'ringkasan',
  'sesi',
  'aktivitas',
  'perubahan',
  'galat',
  'anomali',
  'fungsi',
  'akses',
  'segel',
  'pengaturan',
  'firebase',
]);

/** Halaman berikutnya: `setelah` = id dokumen terakhir halaman sebelumnya. */
async function halaman(kueri, koleksi, setelah, ukuran) {
  let q = kueri;
  if (setelah) {
    const s = await kol(koleksi).doc(String(setelah).slice(0, 64)).get();
    if (s.exists) q = q.startAfter(s);
  }
  const snap = await q.limit(ukuran).get();
  return { daftar: snap.docs.map(baris), habis: snap.size < ukuran };
}

const saringTeks = (v, maks = 128) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, maks) : '';

async function bacaTampilan(tampilan, saring, setelah, ukuran) {
  const sekarang = Date.now();
  switch (tampilan) {
    case 'ringkasan': {
      const hariIni = jamWita().tanggal;
      // Hemat baca: metrik hari ini saja (1 dokumen) & anomali dihitung, bukan diunduh
      const baruTingkat = (tingkat) =>
        kol('sistemAnomali')
          .where('status', '==', 'baru')
          .where('tingkat', '==', tingkat)
          .count()
          .get();
      const [
        online,
        galatBaru,
        anomaliBaru,
        kritis,
        peringatan,
        info,
        metrik,
        segel,
        pengaturan,
        firebase,
      ] = await Promise.all([
        kol('sistemSesi')
          .where('terakhirAktif', '>=', Timestamp.fromMillis(sekarang - 5 * 60000))
          .orderBy('terakhirAktif', 'desc')
          .limit(200)
          .get(),
        kol('sistemGalat').where('status', '==', 'baru').count().get(),
        kol('sistemAnomali')
          .where('status', '==', 'baru')
          .orderBy('terakhirPada', 'desc')
          .limit(5)
          .get(),
        baruTingkat('kritis'),
        baruTingkat('peringatan'),
        baruTingkat('info'),
        kol('sistemMetrik').doc(hariIni).get(),
        kol('sistemSegel').orderBy('tanggal', 'desc').limit(1).get(),
        kol('sistemPengaturan').doc('logdev').get(),
        // Kuota Firebase dari cache (diambil ulang dari Google paling sering tiap 15 menit)
        pemakaianFirebase({ cekAnomali: cekKuota }),
      ]);
      const perTingkat = {
        kritis: kritis.data().count,
        peringatan: peringatan.data().count,
        info: info.data().count,
      };
      return {
        hariIni,
        online: online.docs.map(baris).filter((s) => s.online !== false),
        galatBaru: galatBaru.data().count,
        anomaliBaru: {
          jumlah: perTingkat.kritis + perTingkat.peringatan + perTingkat.info,
          ...perTingkat,
          terbaru: anomaliBaru.docs.map(baris),
        },
        metrik: metrik.exists ? [baris(metrik)] : [],
        segelTerakhir: segel.empty ? null : baris(segel.docs[0]),
        pemeriksaanTerakhir: keJson(pengaturan.get('pemeriksaanTerakhir') || null),
        firebase,
      };
    }
    case 'sesi': {
      const snap = await kol('sistemSesi').orderBy('terakhirAktif', 'desc').limit(200).get();
      return { daftar: snap.docs.map(baris), habis: true };
    }
    case 'aktivitas': {
      let q = kol('sistemAktivitas');
      const uid = saringTeks(saring.uid);
      const jenis = saringTeks(saring.jenis, 20);
      if (uid) q = q.where('uid', '==', uid);
      else if (jenis) q = q.where('jenis', '==', jenis);
      return halaman(q.orderBy('pada', 'desc'), 'sistemAktivitas', setelah, ukuran);
    }
    case 'perubahan':
    case 'akses': {
      let q = kol('sistemLog');
      const modul = tampilan === 'akses' ? 'logdev' : saringTeks(saring.modul, 20);
      const oleh = saringTeks(saring.oleh);
      const target = saringTeks(saring.target, 300);
      if (target) q = q.where('target', '==', target);
      else if (oleh) q = q.where('oleh', '==', oleh);
      else if (modul) q = q.where('modul', '==', modul);
      return halaman(q.orderBy('pada', 'desc'), 'sistemLog', setelah, ukuran);
    }
    case 'galat': {
      let q = kol('sistemGalat');
      const status = saringTeks(saring.status, 20);
      if (status) q = q.where('status', '==', status);
      return halaman(q.orderBy('terakhirPada', 'desc'), 'sistemGalat', setelah, ukuran);
    }
    case 'anomali': {
      let q = kol('sistemAnomali');
      const status = saringTeks(saring.status, 20);
      const kode = saringTeks(saring.kode, 10);
      if (status) q = q.where('status', '==', status);
      else if (kode) q = q.where('kode', '==', kode);
      return halaman(q.orderBy('terakhirPada', 'desc'), 'sistemAnomali', setelah, ukuran);
    }
    case 'fungsi': {
      const hari = Math.min(Math.max(Number(saring.hari) || 7, 1), 31);
      const ids = Array.from(
        { length: hari },
        (_, i) => jamWita(new Date(sekarang - i * HARI_MS)).tanggal,
      );
      const snap = await db.getAll(...ids.map((t) => kol('sistemMetrik').doc(t)));
      return { daftar: snap.filter((d) => d.exists).map(baris), habis: true };
    }
    case 'segel': {
      const snap = await kol('sistemSegel').orderBy('tanggal', 'desc').limit(31).get();
      return { daftar: snap.docs.map(baris), habis: true };
    }
    case 'pengaturan': {
      const s = await kol('sistemPengaturan').doc('logdev').get();
      return {
        ambang: { ...AMBANG_BAWAAN, ...((s.exists && s.get('ambang')) || {}) },
        bawaan: AMBANG_BAWAAN,
        tarif: { ...TARIF_BAWAAN, ...((s.exists && s.get('tarif')) || {}) },
        tarifBawaan: TARIF_BAWAAN,
      };
    }
    case 'firebase':
      return pemakaianFirebase({ paksa: saring.paksa === true, cekAnomali: cekKuota });
    default:
      throw new HttpsError('invalid-argument', 'Tampilan tidak dikenal.');
  }
}

/** Satu pintu baca semua data Log Developer. Masukan: { tampilan, saring, setelah, ukuran }. */
exports.bacaLogDev = callable(
  'bacaLogDev',
  async (req) => {
    wajibLogDev(req);
    const d = req.data || {};
    if (!TAMPILAN.has(d.tampilan))
      throw new HttpsError('invalid-argument', 'Tampilan tidak dikenal.');
    const saring = d.saring && typeof d.saring === 'object' ? d.saring : {};
    const ukuran = Math.min(Math.max(Number(d.ukuran) || 30, 1), UKURAN_MAKS);
    const hasil = await bacaTampilan(d.tampilan, saring, d.setelah, ukuran);
    const daftar = hasil.daftar || [...(hasil.online || []), ...(hasil.anomaliBaru?.terbaru || [])];
    const uids = daftar.flatMap((r) => [
      r.uid,
      r.oleh,
      r.pelaku?.uid,
      ...(r.penggunaTerdampak || []),
    ]);
    const [nama] = await Promise.all([
      namaPengguna(uids),
      aman(
        catatBacaan(req, d.tampilan, Object.keys(saring).length ? saring : null),
        'bacaan logdev',
      ),
    ]);
    return { ...hasil, nama, server: Date.now() };
  },
  { senyap: true },
);

// ─── Tinjau anomali & galat, ambang ─────────────────────────────────────────

const STATUS_ANOMALI = ['baru', 'diperiksa', 'wajar', 'ditindak'];
const STATUS_GALAT = ['baru', 'ditangani', 'abaikan'];

function tinjau(koleksi, statusSah, label) {
  return async (req) => {
    const p = wajibLogDev(req);
    const d = req.data || {};
    if (typeof d.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(d.id)) {
      throw new HttpsError('invalid-argument', `${label} tidak dikenal.`);
    }
    if (!statusSah.includes(d.status))
      throw new HttpsError('invalid-argument', 'Status tidak sah.');
    const catatan = teksSah(d.catatan, 500, 'Catatan pemeriksaan');
    const ref = kol(koleksi).doc(d.id);
    await db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists) throw new HttpsError('not-found', `${label} tidak ditemukan.`);
      tx.update(ref, {
        status: d.status,
        catatan,
        [koleksi === 'sistemGalat' ? 'ditanganiOleh' : 'diperiksaOleh']: p.uid,
        ditinjauPada: FieldValue.serverTimestamp(),
      });
      catatLog(tx, {
        modul: 'logdev',
        aksi: koleksi === 'sistemGalat' ? 'tinjauGalat' : 'tinjauAnomali',
        target: ref.path,
        nilaiLama: { status: s.get('status') },
        nilaiBaru: { status: d.status },
        alasan: catatan,
        oleh: p.uid,
      });
    });
    return { ok: true };
  };
}
exports.tinjauAnomali = callable(
  'tinjauAnomali',
  tinjau('sistemAnomali', STATUS_ANOMALI, 'Anomali'),
);
exports.tinjauGalat = callable('tinjauGalat', tinjau('sistemGalat', STATUS_GALAT, 'Galat'));

const BATAS_AMBANG = {
  hariMundur: [1, 365],
  jamMalamMulai: [0, 23],
  jamMalamSelesai: [0, 23],
  selisihOpnamePersen: [1, 100],
  selisihOpnameRupiah: [0, 100000000],
  ditolakPerJam: [1, 1000],
  gagalMasukPerJam: [1, 1000],
  galatPerHari: [1, 10000],
};

/** Ubah ambang anomali. Masukan: { ambang: { ... }, alasan }. */
exports.aturAmbangLogDev = callable('aturAmbangLogDev', async (req) => {
  const p = wajibLogDev(req);
  const masuk = req.data?.ambang || {};
  const alasan = teksSah(req.data?.alasan, 300, 'Alasan perubahan');
  const ambang = {};
  Object.entries(BATAS_AMBANG).forEach(([k, [min, maks]]) => {
    const v = masuk[k] ?? AMBANG_BAWAAN[k];
    if (!Number.isInteger(v) || v < min || v > maks) {
      throw new HttpsError('invalid-argument', `Ambang ${k} harus bilangan bulat ${min}–${maks}.`);
    }
    ambang[k] = v;
  });
  const ref = kol('sistemPengaturan').doc('logdev');
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    tx.set(
      ref,
      { ambang, diubahPada: FieldValue.serverTimestamp(), diubahOleh: p.uid },
      { merge: true },
    );
    catatLog(tx, {
      modul: 'logdev',
      aksi: 'aturAmbang',
      target: ref.path,
      nilaiLama: (s.exists && s.get('ambang')) || AMBANG_BAWAAN,
      nilaiBaru: ambang,
      alasan,
      oleh: p.uid,
    });
  });
  segarkanAmbang();
  return { ambang };
});

// ─── Pemakaian Firebase: kuota & tarif ──────────────────────────────────────

/** R7: kuota gratis hari ini (Firestore) / bulan ini (Function) mendekati atau melewati batas. */
async function cekKuota(data, tarif) {
  const daftar = [
    ['baca', data.hariKuota.baca, tarif.gratisBacaHari, data.hariKuota.tanggal],
    ['tulis', data.hariKuota.tulis, tarif.gratisTulisHari, data.hariKuota.tanggal],
    ['hapus', data.hariKuota.hapus, tarif.gratisHapusHari, data.hariKuota.tanggal],
    ['panggilan Function', data.bulan.panggilan, tarif.gratisPanggilanBulan, data.bulan.bulan],
  ];
  await Promise.all(
    daftar
      .filter(([, pakai, gratis]) => gratis > 0 && pakai >= gratis * 0.8)
      .map(([jenis, pakai, gratis, periode]) =>
        catatAnomali({
          kode: 'R7',
          tingkat: pakai >= gratis ? 'kritis' : 'peringatan',
          judul: `Kuota gratis ${jenis} ${pakai >= gratis ? 'terlampaui' : 'hampir habis'} (${Math.round((pakai * 100) / gratis)}%)`,
          rincian: { jenis, pakai, gratis, periode },
          kunci: `R7|${jenis}|${periode}`,
        }),
      ),
  );
}

/** Tarif (USD), kurs, dan kuota gratis untuk perkiraan biaya. Masukan: { tarif: {...}, alasan }. */
exports.aturTarifLogDev = callable('aturTarifLogDev', async (req) => {
  const p = wajibLogDev(req);
  const masuk = req.data?.tarif || {};
  const alasan = teksSah(req.data?.alasan, 300, 'Alasan perubahan');
  const tarif = {};
  Object.keys(TARIF_BAWAAN).forEach((k) => {
    const v = masuk[k] ?? TARIF_BAWAAN[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1e9) {
      throw new HttpsError('invalid-argument', `Nilai ${k} harus angka 0 atau lebih.`);
    }
    tarif[k] = v;
  });
  const ref = kol('sistemPengaturan').doc('logdev');
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    tx.set(
      ref,
      { tarif, diubahPada: FieldValue.serverTimestamp(), diubahOleh: p.uid },
      { merge: true },
    );
    catatLog(tx, {
      modul: 'logdev',
      aksi: 'aturTarif',
      target: ref.path,
      nilaiLama: (s.exists && s.get('tarif')) || TARIF_BAWAAN,
      nilaiBaru: tarif,
      alasan,
      oleh: p.uid,
    });
  });
  lupakanCachePemakaian();
  return { tarif };
});

// ─── Sesi, galat browser, gagal masuk ───────────────────────────────────────

const JENIS_SESI = new Set(['mulai', 'halaman', 'detak', 'keluar']);
const ID_SESI = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Detak sesi dari browser. Masukan: { jenis, sesiId, halaman, versi }. IP & perangkat dibaca
 * server. `mulai` dengan login ≤ 2 menit lalu dicatat sebagai `masuk`.
 */
exports.catatSesi = callable(
  'catatSesi',
  async (req) => {
    const p = pemanggil(req);
    const d = req.data || {};
    if (!JENIS_SESI.has(d.jenis) || !ID_SESI.test(String(d.sesiId || ''))) {
      throw new HttpsError('invalid-argument', 'Data sesi tidak sah.');
    }
    const halaman =
      typeof d.halaman === 'string' && d.halaman.startsWith('/') ? d.halaman.slice(0, 200) : '';
    const versi = typeof d.versi === 'string' ? d.versi.slice(0, 40) : '';
    const { klien, pelaku } = req.jejak;
    const ref = kol('sistemSesi').doc(p.uid);
    const s = await ref.get();
    const lama = s.exists ? s.data() : {};
    const sekarang = Date.now();
    const terakhir = lama.terakhirAktif?.toMillis?.() || 0;
    const sesiSama = lama.sesiId === d.sesiId;
    if (d.jenis === 'detak' && sesiSama && sekarang - terakhir < 60000) return { ok: true };
    if (
      d.jenis === 'halaman' &&
      sesiSama &&
      lama.halaman === halaman &&
      sekarang - terakhir < 10000
    ) {
      return { ok: true };
    }
    const baruMasuk = sekarang / 1000 - Number(req.auth.token.auth_time || 0) <= BUKA_MAKS_DETIK;
    const jenis = d.jenis === 'mulai' && baruMasuk ? 'masuk' : d.jenis;

    // A11: akun yang sama aktif di dua tempat (sesi lain dari IP lain masih berdetak < 5 menit)
    if (
      d.jenis === 'mulai' &&
      lama.sesiId &&
      !sesiSama &&
      lama.online &&
      sekarang - terakhir < 5 * 60000 &&
      lama.ip &&
      lama.ip !== klien.ip
    ) {
      await aman(
        catatAnomali({
          kode: 'A11',
          tingkat: 'peringatan',
          judul: 'Akun dipakai di dua tempat sekaligus',
          pelaku: ringkasPelaku(pelaku, klien),
          rincian: { ipLain: lama.ip, perangkatLain: lama.perangkat || null },
          kunci: `${p.uid}|${jamWita().tanggal}`,
        }),
      );
    }

    await ref.set(
      {
        uid: p.uid,
        email: pelaku.email,
        pegawaiId: p.pegawaiId,
        peran: p.peran,
        sesiId: d.sesiId,
        online: d.jenis !== 'keluar',
        terakhirAktif: FieldValue.serverTimestamp(),
        halaman: halaman || lama.halaman || '',
        ip: klien.ip,
        ua: klien.ua,
        perangkat: klien.perangkat,
        versi,
        ...(d.jenis === 'mulai' || !sesiSama ? { mulaiPada: FieldValue.serverTimestamp() } : {}),
        ...(d.jenis === 'keluar' ? { keluarPada: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    );
    if (d.jenis !== 'detak') {
      await catatAktivitas({
        jenis,
        uid: p.uid,
        email: pelaku.email,
        pegawaiId: p.pegawaiId,
        sesiId: d.sesiId,
        halaman,
        ip: klien.ip,
        perangkat: klien.perangkat,
      });
    }
    return { ok: true };
  },
  { senyap: true },
);

const JENIS_GALAT = new Set(['render', 'skrip', 'janji', 'baca', 'fungsi', 'lain']);
const LAPORAN_PER_JAM = 30;

/** Galat dari browser. Masukan: { jenis, nama, pesan, stack, lokasi, versi }. Maks. 30/jam/pengguna. */
exports.laporkanGalat = callable(
  'laporkanGalat',
  async (req) => {
    const p = pemanggil(req);
    const d = req.data || {};
    const pesan = typeof d.pesan === 'string' ? d.pesan.trim().slice(0, 500) : '';
    if (!pesan) throw new HttpsError('invalid-argument', 'Pesan galat kosong.');
    const jenis = JENIS_GALAT.has(d.jenis) ? d.jenis : 'lain';
    const kunciJam = jamWita().kunciJam;
    const ref = kol('sistemSesi').doc(p.uid);
    const boleh = await db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      const jumlah = s.exists && s.get('galatJam') === kunciJam ? s.get('galatJumlah') || 0 : 0;
      if (jumlah >= LAPORAN_PER_JAM) return false;
      tx.set(ref, { galatJam: kunciJam, galatJumlah: jumlah + 1 }, { merge: true });
      return true;
    });
    if (!boleh) return { ok: false };
    const id = await catatGalat({
      sumber: `klien:${jenis}`,
      nama: typeof d.nama === 'string' ? d.nama : 'Error',
      pesan,
      lokasi: typeof d.lokasi === 'string' ? d.lokasi.split('?')[0] : '',
      stack: typeof d.stack === 'string' ? d.stack : '',
      uid: p.uid,
      versi: typeof d.versi === 'string' ? d.versi : '',
      kode: typeof d.kode === 'string' ? d.kode : '',
    });
    return { ok: true, kode: id.slice(0, 8) };
  },
  { senyap: true },
);

/**
 * Percobaan masuk yang gagal (dipanggil halaman Login, tanpa login; App Check tetap wajib).
 * Digabung per IP per jam menjadi anomali A10. Masukan: { email }.
 */
exports.laporkanGagalMasuk = callable(
  'laporkanGagalMasuk',
  async (req) => {
    const email =
      typeof req.data?.email === 'string' ? req.data.email.trim().toLowerCase().slice(0, 100) : '';
    const { klien } = req.jejak;
    const ambang = await bacaAmbang();
    await Promise.all([
      catatAnomali({
        kode: 'A10',
        tingkat: 'peringatan',
        judul: 'Percobaan masuk gagal',
        pelaku: { uid: '', email, ip: klien.ip, perangkat: klien.perangkat },
        rincian: { emailTerakhir: email, ambangPerJam: ambang.gagalMasukPerJam },
        kunci: `${klien.ip}|${jamWita().kunciJam}`,
      }),
      catatAktivitas({
        jenis: 'gagalMasuk',
        uid: '',
        email,
        ip: klien.ip,
        perangkat: klien.perangkat,
      }),
    ]);
    return { ok: true };
  },
  { senyap: true },
);

// ─── Pengamat penulisan Firestore ───────────────────────────────────────────

/**
 * Koleksi yang ditulis browser (lewat rules). Kunci = koleksi atau `koleksi/subkoleksi`.
 * `samarkan` = nilai tidak dicatat (data pribadi); `gabung` = simpan otomatis dari orang yang sama
 * dalam 10 menit digabung satu entri; `abaikan` = tidak dicatat (preferensi tampilan).
 */
const POLA_KLIEN = {
  inventory_barang: { modul: 'inventory' },
  inventory_kategori: { modul: 'inventory' },
  inventory_kode: { modul: 'inventory' },
  inventory_pemasok: { modul: 'inventory' },
  koperasi_akun: { modul: 'koperasi' },
  koperasi_kantin_kategori: { modul: 'koperasi' },
  koperasi_kantin_pembayaran: { modul: 'koperasi' },
  lpj_berkas: { modul: 'lpj', gabung: true },
  'lpj_berkas/bukti': { modul: 'lpj' },
  'lpj_berkas/keuangan': { modul: 'lpj' },
  lpj_drpp: { modul: 'lpj' },
  mak_dipa: { modul: 'mak' },
  mak_node: { modul: 'mak' },
  pegawai: { modul: 'pegawai' },
  pegawai_absensi: { modul: 'pegawai' },
  'pegawai_absensi/impor': { modul: 'pegawai' },
  'pegawai_absensi/koreksi': { modul: 'pegawai' },
  pegawai_jabatan: { modul: 'pegawai' },
  pegawai_kegiatan: { modul: 'pegawai' },
  pegawai_kontak: { modul: 'pegawai', samarkan: true },
  pegawai_no_absen: { modul: 'pegawai' },
  pegawai_pangkat: { modul: 'pegawai' },
  pegawai_pejabat: { modul: 'pegawai' },
  pegawai_unit: { modul: 'pegawai' },
  pengguna_preferensi: { abaikan: true },
  sistem_pengaturan: { modul: 'sistem' },
  surat_kode: { modul: 'surat' },
  surat_nomor: { modul: 'surat' },
  ultah_status: { modul: 'pegawai' },
  ultah_ucapan: { modul: 'pegawai', samarkan: true },
};

/** 'fungsi' | 'sistem' (TTL) | 'pengguna' | 'luar' | 'tidakDiketahui' (Emulator tanpa konteks). */
function jenisPenulis(e) {
  const id = String(e.authId || '');
  if (e.authType === 'system') return 'sistem';
  if (id.startsWith(AKUN_FUNGSI)) return 'fungsi';
  // Emulator memberi identitas pengganti yang sama untuk semua penulisan
  if (DI_EMULATOR && (!id || id === 'fake-auth-id@gmail.com')) return 'tidakDiketahui';
  if (e.authType === 'service_account' || e.authType === 'api_key' || id.includes('@'))
    return 'luar';
  if (id) return 'pengguna';
  return DI_EMULATOR ? 'tidakDiketahui' : 'luar';
}

async function tulisLogKlien(atur, path, aksi, uid, terverifikasi, sebelum, sesudah) {
  const { perubahan, lebih } = selisih(sebelum, sesudah, { samarkan: atur.samarkan });
  if (!Object.keys(perubahan).length && aksi === 'ubah') return;
  const isi = {
    modul: atur.modul,
    aksi,
    target: path,
    perubahan,
    lebih,
    jalur: 'klien',
    oleh: uid,
    terverifikasi,
    alasan: typeof sesudah?.alasan === 'string' ? sesudah.alasan.slice(0, 300) : '',
    pada: FieldValue.serverTimestamp(),
  };
  if (!(atur.gabung && aksi === 'ubah')) {
    await kol('sistemLog').add(isi);
    return;
  }
  const ref = kol('sistemLog').doc(`g_${sidik(path, uid, Math.floor(Date.now() / 600000))}`);
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists) {
      tx.create(ref, {
        ...isi,
        agregat: true,
        jumlahSimpan: 1,
        pertamaPada: FieldValue.serverTimestamp(),
      });
      return;
    }
    const lama = s.get('perubahan') || {};
    const gabungan = { ...lama };
    Object.entries(perubahan).forEach(([k, v]) => {
      gabungan[k] = { lama: lama[k] ? lama[k].lama : v.lama, baru: v.baru };
    });
    tx.update(ref, {
      perubahan: gabungan,
      jumlahSimpan: FieldValue.increment(1),
      pada: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Koleksi catatan sistem sendiri: pemicu TIDAK PERNAH menulis apa pun karena penulisannya, agar
 * tidak terjadi putaran tanpa akhir (catatan → pemicu → catatan ...). Perubahan sistem_log dari
 * luar ketahuan lewat segel harian; di sini hanya ke Cloud Logging.
 */
const KOLEKSI_JEJAK = new Set([
  'sistem_log',
  'sistem_anomali',
  'sistem_galat',
  'sistem_aktivitas',
  'sistem_sesi',
  'sistem_metrik',
  'sistem_segel',
]);

async function amati(e, pola) {
  const penulis = jenisPenulis(e);
  if (penulis === 'fungsi' || penulis === 'sistem') return;
  if (KOLEKSI_JEJAK.has(pola.split('/')[0])) {
    if (penulis === 'luar') {
      logger.error('Catatan sistem ditulis dari luar aplikasi', {
        path: e.document,
        authType: e.authType,
        authId: e.authId || '',
      });
    }
    return;
  }
  const path = e.document;
  const atur = POLA_KLIEN[pola];
  const sebelum = e.data?.before?.exists ? e.data.before.data() : null;
  const sesudah = e.data?.after?.exists ? e.data.after.data() : null;
  const aksi = !sebelum ? 'buat' : !sesudah ? 'hapus' : 'ubah';

  if (penulis === 'pengguna' || (penulis === 'tidakDiketahui' && atur)) {
    if (atur?.abaikan) return;
    const uid =
      penulis === 'pengguna'
        ? e.authId
        : sesudah?.diubahOleh || sesudah?.dibuatOleh || sebelum?.diubahOleh || '';
    if (!atur) {
      // Rules seharusnya menolak ini: tanda ada celah aturan.
      await catatAnomali({
        kode: 'A9',
        tingkat: 'kritis',
        judul: 'Browser menulis data yang seharusnya hanya ditulis Function',
        target: path,
        pelaku: { uid },
        rincian: { aksi, koleksi: pola },
      });
      return;
    }
    const klaim = sesudah?.diubahOleh;
    if (penulis === 'pengguna' && typeof klaim === 'string' && klaim && klaim !== e.authId) {
      await catatAnomali({
        kode: 'A9',
        tingkat: 'kritis',
        judul: 'Pelaku tercatat di dokumen berbeda dengan penulis sebenarnya',
        modul: atur.modul,
        target: path,
        pelaku: { uid: e.authId },
        rincian: { diubahOleh: klaim },
      });
    }
    await tulisLogKlien(atur, path, aksi, uid, penulis === 'pengguna', sebelum, sesudah);
    return;
  }
  if (penulis === 'tidakDiketahui') return;

  // Di luar aplikasi: Console, skrip lokal, atau akun layanan lain
  const pelaku = { uid: '', email: String(e.authId || ''), jenis: e.authType || '' };
  await Promise.all([
    catatAnomali({
      kode: 'A8',
      tingkat: 'kritis',
      judul: pola.startsWith('sistem_')
        ? 'Catatan sistem diubah dari luar aplikasi'
        : 'Data diubah dari luar aplikasi',
      modul: atur?.modul || pola.split('_')[0],
      target: path,
      pelaku,
      rincian: { aksi, koleksi: pola },
      kunci: `${e.authId || e.authType}|${jamWita().kunciJam}`,
    }),
    kol('sistemLog').add({
      modul: atur?.modul || pola.split('_')[0],
      aksi,
      target: path,
      ...selisih(sebelum, sesudah),
      jalur: 'luar',
      oleh: String(e.authId || e.authType || ''),
      terverifikasi: true,
      alasan: '',
      pada: FieldValue.serverTimestamp(),
    }),
  ]);
}

async function amatiAman(nama, e, pola) {
  try {
    await amati(e, pola);
  } catch (err) {
    await aman(
      catatGalat({
        sumber: `fn:${nama}`,
        nama: err?.name || 'Error',
        pesan: String(err?.message || err),
        lokasi: pola,
        stack: String(err?.stack || ''),
      }),
    );
  }
}

const OPSI_PEMICU = { maxInstances: 10, memory: '256MiB', retry: false };
exports.diDokumenDitulis = onDocumentWrittenWithAuthContext(
  { ...OPSI_PEMICU, document: '{koleksi}/{id}' },
  (e) => amatiAman('diDokumenDitulis', e, e.params.koleksi),
);
exports.diSubDokumenDitulis = onDocumentWrittenWithAuthContext(
  { ...OPSI_PEMICU, document: '{koleksi}/{id}/{sub}/{subId}' },
  (e) => amatiAman('diSubDokumenDitulis', e, `${e.params.koleksi}/${e.params.sub}`),
);

// ─── Pemeriksaan & segel harian ─────────────────────────────────────────────

/** JSON stabil (kunci urut, Timestamp → milidetik) untuk hash segel. */
function stabil(v) {
  if (v === null || v === undefined) return 'null';
  if (v instanceof Timestamp || typeof v?.toMillis === 'function') return String(v.toMillis());
  if (Array.isArray(v)) return `[${v.map(stabil).join(',')}]`;
  if (typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stabil(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

const awalHari = (tanggal) => Timestamp.fromMillis(Date.parse(`${tanggal}T00:00:00+08:00`));

/** Hash satu hari sistem_log (entri tetap, tanpa agregat) disambung hash segel sebelumnya. */
async function hitungHash(tanggal, hashSebelumnya) {
  const besok = jamWita(new Date(Date.parse(`${tanggal}T12:00:00+08:00`) + HARI_MS)).tanggal;
  const snap = await kol('sistemLog')
    .where('pada', '>=', awalHari(tanggal))
    .where('pada', '<', awalHari(besok))
    .orderBy('pada')
    .limit(20000)
    .get();
  const h = crypto.createHash('sha256').update(hashSebelumnya);
  let jumlah = 0;
  snap.docs
    .filter((d) => !d.get('agregat'))
    .sort((a, b) => a.get('pada').toMillis() - b.get('pada').toMillis() || a.id.localeCompare(b.id))
    .forEach((d) => {
      h.update(`${d.id}:${stabil(d.data())}\n`);
      jumlah += 1;
    });
  return { hash: h.digest('hex'), jumlah };
}

async function segelHari(tanggal) {
  const ref = kol('sistemSegel').doc(tanggal);
  if ((await ref.get()).exists) return { tanggal, sudahAda: true };
  const sebelum = await kol('sistemSegel')
    .where('tanggal', '<', tanggal)
    .orderBy('tanggal', 'desc')
    .limit(1)
    .get();
  const hashSebelumnya = sebelum.empty ? 'awal' : sebelum.docs[0].get('hash');
  const { hash, jumlah } = await hitungHash(tanggal, hashSebelumnya);
  await ref.create({
    tanggal,
    hash,
    jumlah,
    hashSebelumnya,
    dibuatPada: FieldValue.serverTimestamp(),
  });
  return { tanggal, hash, jumlah };
}

/** Bandingkan ulang segel N hari terakhir; berbeda = log diubah setelah disegel (A8 kritis). */
async function verifikasiSegel(n) {
  const snap = await kol('sistemSegel').orderBy('tanggal', 'desc').limit(n).get();
  const hasil = [];
  for (const d of snap.docs) {
    const { hash } = await hitungHash(d.get('tanggal'), d.get('hashSebelumnya'));
    const cocok = hash === d.get('hash');
    hasil.push({ tanggal: d.get('tanggal'), cocok });
    if (!cocok) {
      await catatAnomali({
        kode: 'A8',
        tingkat: 'kritis',
        judul: `Catatan log tanggal ${d.get('tanggal')} berubah setelah disegel`,
        target: d.ref.path,
        rincian: { tanggal: d.get('tanggal') },
        kunci: `segel|${d.get('tanggal')}`,
      });
    }
  }
  return hasil;
}

/** R1: buku Koperasi seimbang (total debit = total kredit di rekap sepanjang masa). */
async function periksaBukuKoperasi() {
  const s = await kol('koperasiRekap').doc('total').get();
  if (!s.exists) return { ada: false };
  let d = 0;
  let k = 0;
  Object.values(s.get('akun') || {}).forEach((x) => {
    d += x.d || 0;
    k += x.k || 0;
  });
  if (d !== k) {
    await catatAnomali({
      kode: 'R1',
      tingkat: 'kritis',
      modul: 'koperasi',
      judul: 'Buku Koperasi tidak seimbang (debit ≠ kredit)',
      target: s.ref.path,
      rincian: { debit: d, kredit: k, selisih: d - k },
      kunci: `R1|${jamWita().tanggal}`,
    });
  }
  return { ada: true, seimbang: d === k, debit: d, kredit: k };
}

const KOLEKSI_DIHITUNG = [
  'pegawai',
  'lpjBerkas',
  'lpjDrpp',
  'makNode',
  'suratNomor',
  'inventoryBarang',
  'inventoryMasuk',
  'inventoryKeluar',
  'koperasiJurnal',
  'koperasiAnggota',
  'koperasiKantinBarang',
  'koperasiKantinTransaksi',
  'sistemLog',
  'sistemAktivitas',
  'sistemGalat',
  'sistemAnomali',
];

async function potretSistem() {
  const jumlah = {};
  await Promise.all(
    KOLEKSI_DIHITUNG.map(async (k) => {
      jumlah[KOLEKSI[k]] = (await kol(k).count().get()).data().count;
    }),
  );
  const akun = { total: 0, aktif: 0, perPeran: {} };
  let token;
  do {
    const hasil = await authAdmin.listUsers(1000, token);
    hasil.users.forEach((u) => {
      akun.total += 1;
      const c = u.customClaims || {};
      if (c.aktif === true && !u.disabled) akun.aktif += 1;
      (Array.isArray(c.peran) ? c.peran : []).forEach((r) => {
        akun.perPeran[r] = (akun.perPeran[r] || 0) + 1;
      });
    });
    token = hasil.pageToken;
  } while (token);
  return { koleksi: jumlah, akun };
}

async function periksa(oleh) {
  const ambang = await bacaAmbang();
  const kemarin = jamWita(new Date(Date.now() - HARI_MS)).tanggal;
  const segel = await segelHari(kemarin);
  const verifikasi = await verifikasiSegel(7);
  const buku = await periksaBukuKoperasi();
  const galat24 = (
    await kol('sistemGalat')
      .where('status', '==', 'baru')
      .where('terakhirPada', '>=', Timestamp.fromMillis(Date.now() - HARI_MS))
      .count()
      .get()
  ).data().count;
  if (galat24 >= ambang.galatPerHari) {
    await catatAnomali({
      kode: 'R6',
      tingkat: 'peringatan',
      judul: `${galat24} jenis galat baru dalam 24 jam`,
      rincian: { jumlah: galat24, ambang: ambang.galatPerHari },
      kunci: `R6|${jamWita().tanggal}`,
    });
  }
  const potret = await potretSistem();
  const pakai = await aman(pemakaianFirebase({ paksa: true, cekAnomali: cekKuota }), 'pemakaian');
  await kol('sistemMetrik')
    .doc(jamWita().tanggal)
    .set(
      { tanggal: jamWita().tanggal, potret, diubahPada: FieldValue.serverTimestamp() },
      { merge: true },
    );
  const ringkas = {
    segel: segel.sudahAda ? 'sudah ada' : `${segel.jumlah} catatan`,
    segelRusak: verifikasi.filter((v) => !v.cocok).map((v) => v.tanggal),
    bukuKoperasi: buku.ada ? (buku.seimbang ? 'seimbang' : 'TIDAK seimbang') : 'belum ada',
    galat24,
    pemakaianFirebase: pakai?.galat ? pakai.pesan : 'diperbarui',
  };
  await kol('sistemPengaturan')
    .doc('logdev')
    .set(
      { pemeriksaanTerakhir: { pada: FieldValue.serverTimestamp(), oleh, ringkas } },
      { merge: true },
    );
  return ringkas;
}

exports.pemeriksaanHarian = onSchedule(
  {
    schedule: '0 5 * * *',
    timeZone: 'Asia/Makassar',
    memory: '512MiB',
    timeoutSeconds: 300,
    // Email lengkap: Firebase CLI tidak melengkapi singkatan 'fungsi-imigrasi@' untuk token OIDC
    // Cloud Scheduler (job ditolak HTTP 400). Proyek dibaca dari lingkungan saat deploy.
    ...(PROYEK_JADWAL
      ? { serviceAccount: `fungsi-imigrasi@${PROYEK_JADWAL}.iam.gserviceaccount.com` }
      : {}),
  },
  async () => {
    try {
      await periksa('jadwal');
    } catch (err) {
      await aman(
        catatGalat({
          sumber: 'fn:pemeriksaanHarian',
          nama: err?.name || 'Error',
          pesan: String(err?.message || err),
          lokasi: 'pemeriksaanHarian',
          stack: String(err?.stack || ''),
        }),
      );
      throw err;
    }
  },
);

/** Jalankan pemeriksaan sekarang (tombol di Ringkasan Log Developer). */
exports.jalankanPemeriksaan = callable('jalankanPemeriksaan', async (req) => {
  const p = wajibLogDev(req);
  return periksa(p.uid);
});
