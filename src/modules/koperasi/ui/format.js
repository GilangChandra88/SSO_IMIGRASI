import { formatRupiah, keDate } from '@/utils/nilai';

/** Rupiah bertanda: minus ditulis "−Rp 1.000". */
export const rupiah = (n) => (n < 0 ? `−${formatRupiah(-n)}` : formatRupiah(n));

const FORMAT_ANGKA = new Intl.NumberFormat('id-ID');

/** 1234567 → '1.234.567'. */
export const angka = (n) => FORMAT_ANGKA.format(n);

export const NAMA_BULAN = Object.freeze([
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]);

/** 'YYYY-MM-DD' → '9 Nov 2026'. */
export function tanggalPendek(t) {
  if (!t) return '';
  const [y, m, d] = t.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** 'YYYY-MM' → 'November 2026'. */
export const namaPeriode = (p) =>
  p ? `${NAMA_BULAN[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}` : '';

/** Timestamp → '9 Nov 2026 14.30' (WITA). */
export const waktuPendek = (t) =>
  keDate(t)?.toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) ?? '';
