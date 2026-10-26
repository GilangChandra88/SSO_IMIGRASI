const dua = (n) => String(n).padStart(2, '0');

/** Tanggal dari objek Date (zona waktu lokal) dengan format baku tampilan: "01/10/2026". */
export function formatTanggalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
  return `${dua(date.getDate())}/${dua(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Format tanggal `YYYY-MM-DD` menjadi hari/bulan/tahun, mis. "01/10/2026" (format baku tampilan
 * di layar; dokumen PDF tetap memakai format surat, mis. "1 Oktober 2026").
 * Diurai manual (bukan `new Date(str)`) agar tanggal tidak bergeser karena zona waktu.
 */
export function formatTanggal(value) {
  if (!value || typeof value !== 'string') return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return `${dua(d)}/${dua(m)}/${y}`;
}

/** Sama dengan formatTanggal (dipertahankan untuk pemanggil lama). */
export const formatTanggalPendek = formatTanggal;

/** Tanggal hari ini (zona waktu lokal) dalam format `YYYY-MM-DD`. */
export function hariIniISO() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** Jam:menit dari Date, mis. "14.05". */
export function formatJam(date) {
  if (!date) return '-';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
