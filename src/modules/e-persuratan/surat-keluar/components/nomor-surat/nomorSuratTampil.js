/** Helper tampilan baris register nomor surat. */

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** '2026-09-01' → '01 Sep 2026' */
export function formatTanggalNomor(str) {
  if (!str) return '-';
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '-';
  return `${String(d).padStart(2, '0')} ${BULAN[m - 1]} ${y}`;
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
