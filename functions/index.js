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
// CPU penuh + beberapa permintaan per mesin (docs/rencana-percepatan.md Tahap 4): server "bangun"
// lebih cepat (bawaan 0,17 vCPU membuat aksi pertama menunggu beberapa detik) dan permintaan
// bersamaan dilayani satu mesin tanpa antre. CPU hanya dibayar saat melayani permintaan. Aman
// karena kode tidak menyimpan data per permintaan di variabel global (hanya cache bersama).
setGlobalOptions({
  region: 'asia-southeast2',
  maxInstances: 5,
  cpu: 1,
  memory: '512MiB',
  concurrency: 40,
  serviceAccount: 'fungsi-imigrasi@',
});

Object.assign(
  exports,
  require('./src/akun'),
  require('./src/kehadiran'),
  require('./src/lpj'),
  require('./src/drpp'),
  require('./src/mak'),
  require('./src/surat'),
  require('./src/inventory'),
  require('./src/koperasiPembukuan'),
  require('./src/koperasiAnggota'),
  require('./src/koperasiKantin'),
  require('./src/logdev'),
);
