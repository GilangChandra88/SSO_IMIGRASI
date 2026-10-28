/**
 * Distribusi Agen Scanner. Berkas setup tidak disimpan di git (±81 MB, temuan K31), melainkan
 * sebagai lampiran GitHub Release ber-tag `agen-scanner-v<versi>` di repo publik.
 * Saat merilis agen baru: buat Release dengan tag `agen-scanner-v<versi baru>`, lampirkan
 * `AgenScanner-Setup.exe` (cantumkan SHA-256-nya di catatan rilis), lalu naikkan
 * VERSI_AGEN_TERBARU agar link ikut berganti dan pengguna diminta memperbarui.
 */
export const VERSI_AGEN_TERBARU = '1.1.1';
export const URL_UNDUH_AGEN = `https://github.com/GilangChandra88/SSO_IMIGRASI/releases/download/agen-scanner-v${VERSI_AGEN_TERBARU}/AgenScanner-Setup.exe`;
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
