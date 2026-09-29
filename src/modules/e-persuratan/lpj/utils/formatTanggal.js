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
