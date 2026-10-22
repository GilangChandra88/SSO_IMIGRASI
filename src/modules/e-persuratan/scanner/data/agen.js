/**
 * Distribusi Agen Scanner lewat web. Berkas setup ada di public/unduh (ikut ter-deploy ke Vercel).
 * Saat merilis agen baru: ganti berkasnya dan naikkan VERSI_AGEN_TERBARU agar pengguna diminta
 * memperbarui.
 */
export const VERSI_AGEN_TERBARU = '1.1.1';
export const URL_UNDUH_AGEN = '/unduh/AgenScanner-Setup.exe';
export const UKURAN_UNDUH_AGEN = '±81 MB';

/** Tautan khusus yang didaftarkan pemasang: membuka/menyalakan agen di PC ini. */
export const TAUTAN_NYALAKAN_AGEN = 'agenscanner://mulai';

/** true bila versi `a` lebih lama dari `b` (format angka.angka.angka). */
export function versiLebihLama(a, b) {
  const pa = String(a || '0')
    .split('.')
    .map(Number);
  const pb = String(b || '0')
    .split('.')
    .map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y;
  }
  return false;
}
