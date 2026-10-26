/** Helper tampilan baris register nomor surat. */

/**
 * '2026-09-01' → '01/09/2026' (hari/bulan/tahun, format baku tampilan). Cap waktu lengkap
 * (mis. dari toISOString) dibaca sebagai waktu lokal agar tanggalnya tidak mundur sehari.
 */
export function formatTanggalNomor(str) {
  if (!str) return '-';
  const dua = (n) => String(n).padStart(2, '0');
  const s = String(str);
  if (s.length > 10) {
    const t = new Date(s);
    if (Number.isNaN(t.getTime())) return '-';
    return `${dua(t.getDate())}/${dua(t.getMonth() + 1)}/${t.getFullYear()}`;
  }
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '-';
  return `${dua(d)}/${dua(m)}/${y}`;
}

/** Kode tingkat KOP. */
export const kodeKop = (row) => row.kode?.[0]?.kode || '-';

/** Kode surat 1–3 yang terisi, digabung titik. */
export const kodeLanjutan = (row) =>
  (row.kode || [])
    .slice(1)
    .map((k) => k.kode)
    .filter(Boolean)
    .join('.') || '-';
