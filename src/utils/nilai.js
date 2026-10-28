/**
 * Konversi nilai sesuai konvensi skema (docs/skema-database.md §2):
 * uang = bilangan bulat rupiah, tanggal bisnis = 'YYYY-MM-DD', waktu kejadian = Timestamp.
 */

/** Teks/angka rupiah apa pun ('1.500.000', 'Rp 1.500.000', 1500000) → bilangan bulat; tidak sah → 0. */
export function keRupiah(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
  const angka = String(v ?? '').replace(/[^0-9]/g, '');
  return angka ? Number(angka) : 0;
}

/** Bilangan bulat rupiah → 'Rp 1.500.000'. */
export function formatRupiah(n, { awalan = 'Rp ' } = {}) {
  return awalan + new Intl.NumberFormat('id-ID').format(keRupiah(n));
}

/** Date (default: sekarang) → 'YYYY-MM-DD' menurut zona waktu kantor (WITA). */
export function tanggalIso(tanggal = new Date()) {
  const bagian = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tanggal);
  return bagian; // en-CA sudah berbentuk YYYY-MM-DD
}

/** Tahun berjalan (WITA). */
export const tahunIni = () => Number(tanggalIso().slice(0, 4));

/** Timestamp Firestore / Date / angka ms → Date; nilai lain → null. */
export function keDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'number') return new Date(v);
  return null;
}
