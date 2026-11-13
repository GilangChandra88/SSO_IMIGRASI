/**
 * Jejak dari browser untuk modul Log Developer (docs/skema-database.md §5.8): detak sesi, galat, dan
 * percobaan masuk yang gagal. Semuanya dikirim lewat Function; pelaku, waktu, IP, dan perangkat
 * dibaca server, bukan dari data yang dikirim di sini. Pengiriman tidak pernah menggagalkan
 * tampilan: bila gagal, diabaikan diam-diam (tanpa toast, tanpa laporan galat baru).
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { version } from '../../package.json';

/** Versi aplikasi yang tercatat bersama sesi & galat. */
export const VERSI_APLIKASI = `${version}-${import.meta.env.MODE}`;

function idAcak() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Satu ID per tab yang dibuka (hilang saat tab ditutup/dimuat ulang; tidak disimpan di storage). */
export const SESI_ID = idAcak();

const kirim = (nama, data) => httpsCallable(functions, nama)(data).catch(() => null);

/** Detak sesi: 'mulai' | 'halaman' | 'detak' | 'keluar'. Halaman tanpa query string. */
export const catatSesi = (jenis, halaman = window.location.pathname) =>
  kirim('catatSesi', { jenis, sesiId: SESI_ID, halaman, versi: VERSI_APLIKASI });

export const laporGagalMasuk = (email) =>
  kirim('laporkanGagalMasuk', { email: String(email || '') });

// Galat yang sama dari tab ini dilaporkan paling sering sekali per menit.
const terakhirLapor = new Map();
let sedangMelapor = false;

/**
 * Laporkan galat ke Log Developer. `jenis`: render | skrip | janji | baca | fungsi | lain.
 * Tidak mengirim isi form atau data dokumen; hanya nama, pesan, potongan stack, dan halaman.
 */
export function laporGalat(err, { jenis = 'lain' } = {}) {
  if (sedangMelapor) return; // cegah putaran bila pelaporan itu sendiri bergalat
  const pesan = String(err?.message || err || '').slice(0, 500);
  if (!pesan) return;
  const lokasi = window.location.pathname;
  const kunci = `${jenis}|${pesan}|${lokasi}`;
  const sekarang = Date.now();
  if (sekarang - (terakhirLapor.get(kunci) || 0) < 60000) return;
  terakhirLapor.set(kunci, sekarang);
  if (terakhirLapor.size > 200) terakhirLapor.clear();
  sedangMelapor = true;
  kirim('laporkanGalat', {
    jenis,
    nama: String(err?.name || 'Error').slice(0, 60),
    pesan,
    stack: String(err?.stack || '')
      .split('\n')
      .slice(0, 12)
      .join('\n')
      .slice(0, 2000),
    lokasi,
    versi: VERSI_APLIKASI,
    kode: typeof err?.code === 'string' ? err.code.slice(0, 60) : '',
  }).finally(() => {
    sedangMelapor = false;
  });
}

/** Pasang penangkap galat global (sekali, dari main.jsx). */
export function pasangPenangkapGalat() {
  window.addEventListener('error', (e) => laporGalat(e.error || e.message, { jenis: 'skrip' }));
  window.addEventListener('unhandledrejection', (e) => laporGalat(e.reason, { jenis: 'janji' }));
}
