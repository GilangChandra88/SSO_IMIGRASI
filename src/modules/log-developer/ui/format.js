const FORMAT_ANGKA = new Intl.NumberFormat('id-ID');
const FORMAT_WAKTU = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export const angka = (n) => FORMAT_ANGKA.format(Number(n) || 0);

/** Milidetik → '12 Nov 2026 14.30.05' (WITA). */
export const waktu = (ms) => (ms ? FORMAT_WAKTU.format(new Date(ms)) : '-');

/** Milidetik → '3 menit lalu' relatif terhadap `kini` (waktu server bila ada). */
export function relatif(ms, kini = Date.now()) {
  if (!ms) return '-';
  const d = Math.max(0, Math.round((kini - ms) / 1000));
  if (d < 60) return `${d} detik lalu`;
  if (d < 3600) return `${Math.floor(d / 60)} menit lalu`;
  if (d < 86400) return `${Math.floor(d / 3600)} jam lalu`;
  return `${Math.floor(d / 86400)} hari lalu`;
}

/** Perangkat ringkas: 'Chrome · Windows · komputer'. */
export const perangkat = (p) => (p ? [p.peramban, p.os, p.jenis].filter(Boolean).join(' · ') : '-');

/** Nilai log (bisa teks, angka, objek ringkas) → teks satu baris. */
export function nilaiTeks(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v || '""';
  if (typeof v !== 'object') return String(v);
  if ('panjang' in v && 'awal' in v) return `${v.awal}… (${angka(v.panjang)} karakter)`;
  if ('jumlah' in v && Object.keys(v).length === 1) return `[${angka(v.jumlah)} item]`;
  return JSON.stringify(v);
}

const FORMAT_JAM = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Milidetik → 'Kam 15.00' (WITA). */
export const jamHari = (ms) => (ms ? FORMAT_JAM.format(new Date(ms)) : '-');
