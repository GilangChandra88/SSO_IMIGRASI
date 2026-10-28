/**
 * Cloud Functions (Gen 2) — Imigrasi Super Web.
 * Daftar Function dan tugasnya: docs/skema-database.md §8. Function ini satu-satunya penulis
 * data resmi (akun & peran, nomor, realisasi, ringkasan/rekap, penghitung, log); rules menolak
 * klien yang mencoba menulis data tersebut. Admin SDK melewati rules, jadi SETIAP callable wajib
 * memeriksa sendiri identitas, peran, dan bentuk masukan (pembantu di src/umum.js).
 *
 * Deploy hanya oleh pemilik proyek, selalu dengan --only:
 *   firebase deploy --only functions --project imigrasi-database-v2
 */

const { setGlobalOptions } = require('firebase-functions/v2');

// Region sama dengan Firestore & Storage. maxInstances kecil = batas biaya bila disalahgunakan.
// Berjalan sebagai akun layanan khusus berizin minimum, bukan akun bawaan Compute; akhiran "@"
// dilengkapi CLI menjadi <nama>@<proyek>.iam.gserviceaccount.com.
// Penyiapannya: docs/rencana-pembersihan-firebase.md (Cloud Functions: akun layanan).
setGlobalOptions({
  region: 'asia-southeast2',
  maxInstances: 5,
  serviceAccount: 'fungsi-imigrasi@',
});

Object.assign(
  exports,
  require('./src/akun'),
  require('./src/lpj'),
  require('./src/drpp'),
  require('./src/mak'),
  require('./src/surat'),
  require('./src/inventory'),
);
