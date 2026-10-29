/* global process, console */
// Menyalakan Firebase Emulator untuk pengembangan lokal (proyek demo-imigrasi, tidak menyentuh
// cloud): Auth, Firestore, Storage, dan Functions memakai rules & kode di repo ini. Setelah siap,
// Emulator langsung diisi data pura-pura (functions/scripts/isiDataContoh.js).
// Emulator selalu mulai kosong: data yang dibuat saat mencoba hilang ketika dihentikan (Ctrl+C).
// (--export-on-exit tidak dipakai: di Windows, firebase-tools 13 gagal memindahkan hasil ekspor.)
// firebase-tools 13.35.1 dipakai karena masih berjalan dengan Java 11 (versi terbaru butuh Java 21).
// Jalankan: npm run emulator            (tanpa data awal: npm run emulator -- --kosong)
// Panduan: docs/pengembangan-lokal.md
import { spawn } from 'node:child_process';

const tanpaData = process.argv.includes('--kosong');
const diWindows = process.platform === 'win32';

const emulator = spawn(
  'npx',
  [
    '-y',
    'firebase-tools@13.35.1',
    'emulators:start',
    '--only',
    'auth,firestore,storage,functions',
    '--project',
    'demo-imigrasi',
    '--config',
    'firebase.emulator.json',
  ],
  {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: diWindows,
    // Pemuatan awal kode Functions bisa lebih dari 10 detik (batas bawaan)
    env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '60', FORCE_COLOR: '1' },
  },
);

// Teruskan keluaran Emulator; begitu semua siap (pemicu Function sudah dimuat), isi data awal.
// Penanda "siap" bisa keluar lewat stdout maupun stderr, jadi keduanya diperiksa.
let sudahDiisi = tanpaData;
let ekor = ''; // ujung keluaran, supaya penanda yang terpotong dua tetap terbaca
function periksa(potongan) {
  if (sudahDiisi) return;
  const teks = ekor + potongan.toString();
  ekor = teks.slice(-40);
  if (!teks.includes('All emulators ready')) return;
  sudahDiisi = true;
  console.log('\nMengisi Emulator dengan data pura-pura…');
  spawn('node', ['functions/scripts/isiDataContoh.js'], { stdio: 'inherit' }).on('exit', (kode) => {
    if (kode === 0) console.log('Emulator UI (melihat isi data): http://127.0.0.1:4000\n');
  });
}
emulator.stdout.on('data', (p) => {
  process.stdout.write(p);
  periksa(p);
});
emulator.stderr.on('data', (p) => {
  process.stderr.write(p);
  periksa(p);
});

// Ctrl+C juga diterima Emulator; tunggu sampai ia benar-benar berhenti sebelum keluar.
process.on('SIGINT', () => console.log('\nMenghentikan Emulator…'));
emulator.on('exit', (kode) => process.exit(kode ?? 0));
