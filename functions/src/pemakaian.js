/**
 * Pemakaian Firebase untuk Log Developer (docs/skema-database.md §5.8): angka dari Cloud Monitoring
 * (sama dengan grafik "Usage" di Firebase Console), dibaca Function dengan akun layanannya sendiri.
 *
 * Syarat sekali (pemilik proyek): akun layanan Function diberi peran `roles/monitoring.viewer`.
 * Tanpa itu Google menjawab 403 dan halaman menampilkan cara memberi izinnya.
 *
 * Hemat: hasil disimpan di `sistem_metrik/firebase` dan baru diambil ulang bila lebih tua dari
 * 15 menit (tombol Segarkan: 2 menit). Tidak ada library baru: token dari kredensial bawaan Admin
 * SDK dan `fetch` bawaan Node 22.
 *
 * Hari kuota gratis Firestore mengikuti tengah malam waktu Pasifik (15.00/16.00 WITA); bulan tagihan
 * juga menurut waktu Pasifik.
 */

const { applicationDefault } = require('firebase-admin/app');
const { FieldValue } = require('firebase-admin/firestore');
const { db, KOLEKSI, DI_EMULATOR } = require('./umum');

const HARI_DETIK = 86400;
const SEGAR_MS = 15 * 60000;
const SEGAR_PAKSA_MS = 2 * 60000;
const TREN_HARI = 30;
const PROYEK = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';

/**
 * Tarif (USD) & kuota gratis BAWAAN: angka umum Google Cloud yang dipakai sebagai perkiraan.
 * Tarif wilayah Jakarta bisa sedikit berbeda; Super Admin menyesuaikannya di Pengaturan dengan
 * angka di Console › Billing. Storage di asia-southeast2 tidak mendapat jatah gratis.
 */
const TARIF_BAWAAN = Object.freeze({
  kurs: 16500, // Rp per USD
  bacaPer100rb: 0.06,
  tulisPer100rb: 0.18,
  hapusPer100rb: 0.02,
  panggilanPerJuta: 0.4,
  instansPerJam: 0.025, // ±0,167 vCPU + 256 MiB per jam
  storagePerGbBulan: 0.023,
  unduhPerGb: 0.12,
  gratisBacaHari: 50000,
  gratisTulisHari: 20000,
  gratisHapusHari: 20000,
  gratisPanggilanBulan: 2000000,
  gratisInstansJamBulan: 1000,
  gratisStorageGb: 0,
  gratisUnduhGbBulan: 1,
});

const refCache = () => db.collection(KOLEKSI.sistemMetrik).doc('firebase');

async function bacaTarif() {
  const s = await db.collection(KOLEKSI.sistemPengaturan).doc('logdev').get();
  return { ...TARIF_BAWAAN, ...((s.exists && s.get('tarif')) || {}) };
}

// ─── Waktu Pasifik ──────────────────────────────────────────────────────────

const tanggalLA = (ms) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
const jamLA = (ms) =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(ms)),
  );

/** Milidetik UTC untuk 00.00 waktu Pasifik pada tanggal 'YYYY-MM-DD' (PDT −7 atau PST −8). */
function tengahMalamLA(tanggal) {
  for (const zona of ['-07:00', '-08:00']) {
    const ms = Date.parse(`${tanggal}T00:00:00${zona}`);
    if (tanggalLA(ms) === tanggal && jamLA(ms) === 0) return ms;
  }
  return Date.parse(`${tanggal}T00:00:00-08:00`);
}

// ─── Cloud Monitoring ───────────────────────────────────────────────────────

class GalatMonitoring extends Error {
  constructor(status, pesan) {
    super(pesan);
    this.status = status;
  }
}

/**
 * Satu deret waktu (dijumlah lintas sumber) untuk `metrik` pada [mulai, akhir] dengan periode
 * `periodeDetik`. `perDatabase` = kelompokkan per database Firestore dan ambil `(default)` saja
 * (kuota gratis hanya untuk database bawaan). Hasil: [{ akhir (ms), nilai }] urut naik.
 */
async function deret(
  token,
  metrik,
  mulai,
  akhir,
  periodeDetik,
  { penyelaras = 'ALIGN_SUM', perDatabase = false } = {},
) {
  const q = new URLSearchParams({
    filter: `metric.type="${metrik}"`,
    'interval.startTime': new Date(mulai).toISOString(),
    'interval.endTime': new Date(akhir).toISOString(),
    'aggregation.alignmentPeriod': `${Math.max(60, Math.round(periodeDetik))}s`,
    'aggregation.perSeriesAligner': penyelaras,
    'aggregation.crossSeriesReducer': 'REDUCE_SUM',
  });
  if (perDatabase) q.append('aggregation.groupByFields', 'resource.label.database_id');
  const r = await fetch(`https://monitoring.googleapis.com/v3/projects/${PROYEK}/timeSeries?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new GalatMonitoring(r.status, j?.error?.message || `HTTP ${r.status}`);
  const semua = j.timeSeries || [];
  const pilih = perDatabase
    ? semua.filter((s) => (s.resource?.labels?.database_id || '(default)') === '(default)')
    : semua;
  const peta = new Map();
  pilih.forEach((s) =>
    (s.points || []).forEach((p) => {
      const t = Date.parse(p.interval.endTime);
      // Monitoring juga mengembalikan periode SEBELUM `mulai` (berakhir tepat di `mulai`);
      // hanya periode di dalam rentang yang dihitung (tanpa ini angka "hari ini" ikut kemarin).
      if (t <= mulai + 1000) return;
      const v = Number(p.value.int64Value ?? p.value.doubleValue ?? 0);
      peta.set(t, (peta.get(t) || 0) + v);
    }),
  );
  return [...peta].map(([t, nilai]) => ({ akhir: t, nilai })).sort((a, b) => a.akhir - b.akhir);
}

const jumlah = (d) => d.reduce((n, p) => n + p.nilai, 0);

const METRIK = {
  baca: 'firestore.googleapis.com/document/read_count',
  tulis: 'firestore.googleapis.com/document/write_count',
  hapus: 'firestore.googleapis.com/document/delete_count',
  panggilan: 'run.googleapis.com/request_count',
  instans: 'run.googleapis.com/container/billable_instance_time',
  storageByte: 'storage.googleapis.com/storage/total_bytes',
  storageObjek: 'storage.googleapis.com/storage/object_count',
  unduhByte: 'storage.googleapis.com/network/sent_bytes_count',
};

/** Ambil semua angka pemakaian dari Monitoring (±13 panggilan paralel). */
async function ambilDariGoogle() {
  const { access_token: token } = await applicationDefault().getAccessToken();
  const kini = Date.now();
  const hariIni = tanggalLA(kini);
  const mulaiHari = tengahMalamLA(hariIni);
  const mulaiBulan = tengahMalamLA(`${hariIni.slice(0, 8)}01`);
  const mulaiTren = mulaiHari - TREN_HARI * HARI_DETIK * 1000;
  const sejakHari = (kini - mulaiHari) / 1000;
  const sejakBulan = (kini - mulaiBulan) / 1000;
  const fs = { perDatabase: true };

  const [
    bacaHari,
    tulisHari,
    hapusHari,
    bacaTren,
    tulisTren,
    hapusTren,
    panggilanTren,
    panggilanBulan,
    instansBulan,
    unduhBulan,
    storageByte,
    storageObjek,
  ] = await Promise.all([
    deret(token, METRIK.baca, mulaiHari, kini, sejakHari, fs),
    deret(token, METRIK.tulis, mulaiHari, kini, sejakHari, fs),
    deret(token, METRIK.hapus, mulaiHari, kini, sejakHari, fs),
    deret(token, METRIK.baca, mulaiTren, mulaiHari, HARI_DETIK, fs),
    deret(token, METRIK.tulis, mulaiTren, mulaiHari, HARI_DETIK, fs),
    deret(token, METRIK.hapus, mulaiTren, mulaiHari, HARI_DETIK, fs),
    deret(token, METRIK.panggilan, mulaiTren, mulaiHari, HARI_DETIK),
    deret(token, METRIK.panggilan, mulaiBulan, kini, sejakBulan),
    deret(token, METRIK.instans, mulaiBulan, kini, sejakBulan),
    deret(token, METRIK.unduhByte, mulaiBulan, kini, sejakBulan),
    deret(token, METRIK.storageByte, kini - 3 * HARI_DETIK * 1000, kini, HARI_DETIK, {
      penyelaras: 'ALIGN_MEAN',
    }),
    deret(token, METRIK.storageObjek, kini - 3 * HARI_DETIK * 1000, kini, HARI_DETIK, {
      penyelaras: 'ALIGN_MEAN',
    }),
  ]);

  // Tren harian (tanggal = hari kuota Pasifik yang berakhir pada titik itu)
  const tren = new Map();
  const isi = (d, k) =>
    d.forEach((p) => {
      const tgl = tanggalLA(p.akhir - 1000);
      tren.set(tgl, {
        tanggal: tgl,
        baca: 0,
        tulis: 0,
        hapus: 0,
        panggilan: 0,
        ...tren.get(tgl),
        [k]: p.nilai,
      });
    });
  isi(bacaTren, 'baca');
  isi(tulisTren, 'tulis');
  isi(hapusTren, 'hapus');
  isi(panggilanTren, 'panggilan');

  return {
    proyek: PROYEK,
    hariKuota: {
      tanggal: hariIni,
      mulai: mulaiHari,
      baca: jumlah(bacaHari),
      tulis: jumlah(tulisHari),
      hapus: jumlah(hapusHari),
    },
    bulan: {
      bulan: hariIni.slice(0, 7),
      mulai: mulaiBulan,
      panggilan: jumlah(panggilanBulan),
      instansDetik: jumlah(instansBulan),
      unduhByte: jumlah(unduhBulan),
    },
    storage: {
      byte: storageByte.at(-1)?.nilai || 0,
      objek: Math.round(storageObjek.at(-1)?.nilai || 0),
    },
    // 30 hari penuh; hari tanpa pemakaian = 0 (grafik tidak melompat)
    tren: Array.from({ length: TREN_HARI }, (_, i) => {
      const tgl = tanggalLA(mulaiHari - (TREN_HARI - i) * HARI_DETIK * 1000 + 12 * 3600000);
      return tren.get(tgl) || { tanggal: tgl, baca: 0, tulis: 0, hapus: 0, panggilan: 0 };
    }),
  };
}

/** Pesan galat Monitoring yang bisa ditindaklanjuti di layar. */
function galatKeHasil(err) {
  if (err instanceof GalatMonitoring && err.status === 403) {
    return {
      galat: 'IZIN',
      pesan: 'Akun layanan Function belum punya izin membaca Cloud Monitoring.',
      perintah: `gcloud projects add-iam-policy-binding ${PROYEK} --member="serviceAccount:fungsi-imigrasi@${PROYEK}.iam.gserviceaccount.com" --role="roles/monitoring.viewer"`,
    };
  }
  if (err instanceof GalatMonitoring && err.status === 404) {
    return {
      galat: 'API',
      pesan:
        'Cloud Monitoring API belum aktif di proyek ini. Aktifkan di Console › APIs & Services.',
    };
  }
  return { galat: 'LAIN', pesan: String(err?.message || err).slice(0, 300) };
}

/**
 * Pemakaian dari cache, diambil ulang bila sudah basi. Hasil: { data, diambilPada, tarif, galat? }.
 * `cekAnomali(data, tarif)` dipanggil hanya saat data baru diambil.
 */
// Hasil terakhir di memori instans (1 menit): Ringkasan yang menyegarkan diri tidak membaca ulang
// dokumen tarif & cache setiap kali.
let memo = null;
const MEMO_MS = 60000;
const lupakanCachePemakaian = () => {
  memo = null;
};

async function pemakaianFirebase(opsi = {}) {
  if (!opsi.paksa && memo && Date.now() - memo.pada < MEMO_MS) return memo.hasil;
  const hasil = await pemakaianSegar(opsi);
  memo = { pada: Date.now(), hasil };
  return hasil;
}

async function pemakaianSegar({ paksa = false, cekAnomali = null } = {}) {
  const tarif = await bacaTarif();
  if (DI_EMULATOR) {
    return {
      tarif,
      galat: 'EMULATOR',
      pesan: 'Data pemakaian hanya tersedia di proyek cloud (dev/produksi).',
    };
  }
  const cache = await refCache().get();
  const umur = Date.now() - (cache.get('diambilPada')?.toMillis?.() || 0);
  if (cache.exists && umur < (paksa ? SEGAR_PAKSA_MS : SEGAR_MS)) {
    return { tarif, data: cache.get('data'), diambilPada: cache.get('diambilPada').toMillis() };
  }
  try {
    const data = await ambilDariGoogle();
    await refCache().set({ data, diambilPada: FieldValue.serverTimestamp() });
    if (cekAnomali) await cekAnomali(data, tarif);
    return { tarif, data, diambilPada: Date.now() };
  } catch (err) {
    const g = galatKeHasil(err);
    // Data lama tetap ditampilkan bila ada
    return cache.exists
      ? {
          tarif,
          data: cache.get('data'),
          diambilPada: cache.get('diambilPada')?.toMillis?.() || 0,
          ...g,
        }
      : { tarif, ...g };
  }
}

module.exports = {
  TARIF_BAWAAN,
  bacaTarif,
  pemakaianFirebase,
  lupakanCachePemakaian,
  ambilDariGoogle,
};
