/**
 * Format tanggal `YYYY-MM-DD` menjadi mis. "1 Oktober 2026".
 * Diurai manual (bukan `new Date(str)`) agar tanggal tidak bergeser karena zona waktu.
 */
export function formatTanggal(value) {
  if (!value || typeof value !== 'string') return '—';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Format singkat, mis. "1 Okt 2026". */
export function formatTanggalPendek(value) {
  if (!value || typeof value !== 'string') return '—';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

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
