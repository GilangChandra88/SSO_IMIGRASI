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

/** Label sumber nomor (`surat_nomor.sumber`). */
export const LABEL_SUMBER = Object.freeze({
  register: 'Daftar Nomor',
  form: 'Form Surat',
  srikandi: 'SP Srikandi (LPJ)',
});

/**
 * Keterangan nomor boleh diubah pemohon atau Keuangan selama belum batal; nomor SP Srikandi tidak
 * (sama dengan firestore.rules).
 */
export const bolehUbahNomor = (row, { uid, isKeuangan }) =>
  row.status === 'aktif' &&
  ['register', 'form'].includes(row.sumber) &&
  (isKeuangan || (!!uid && row.dibuatOleh === uid));
