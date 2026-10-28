/**
 * Pembakuan & tampilan data pegawai (docs/skema-database.md §5.1). Bentuk simpanan sama dengan
 * rules: NIP 18 digit tanpa spasi, nomor WA berawalan 62, e-mail huruf kecil, golongan "III/c"
 * (PNS) atau "V" (PPPK). Dipakai form & impor Kepegawaian serta halaman Profil Saya.
 */

export const STATUS_KEPEGAWAIAN = Object.freeze([
  { id: 'pns', label: 'PNS' },
  { id: 'cpns', label: 'CPNS' },
  { id: 'pppk', label: 'PPPK' },
  { id: 'nonasn', label: 'Non-ASN' },
]);

export const labelStatus = (id) => STATUS_KEPEGAWAIAN.find((s) => s.id === id)?.label || '';

/** true bila status memakai pangkat/golongan & NIP (ASN). */
export const statusAsn = (id) => ['pns', 'cpns', 'pppk'].includes(id);

// ─── NIP & tanggal ──────────────────────────────────────────────────────────

export const nipBersih = (v) => String(v ?? '').replace(/\D/g, '');

/** "123456781234561123" → "12345678 123456 1 123" (format tampilan NIP). */
export function formatNip(nip) {
  const n = nipBersih(nip);
  return n.length === 18
    ? `${n.slice(0, 8)} ${n.slice(8, 14)} ${n.slice(14, 15)} ${n.slice(15)}`
    : n;
}

/** 'YYYY-MM-DD' bila tanggalnya ada di kalender, selain itu ''. */
export function tanggalSah(t, b, h) {
  const d = new Date(Date.UTC(t, b - 1, h));
  const sah =
    t >= 1900 && d.getUTCFullYear() === t && d.getUTCMonth() === b - 1 && d.getUTCDate() === h;
  return sah ? `${t}-${String(b).padStart(2, '0')}-${String(h).padStart(2, '0')}` : '';
}

/** Tanggal lahir dari 8 digit pertama NIP (YYYYMMDD), atau '' bila bukan tanggal. */
export function tanggalDariNip(nip) {
  const n = nipBersih(nip);
  if (n.length !== 18) return '';
  return tanggalSah(Number(n.slice(0, 4)), Number(n.slice(4, 6)), Number(n.slice(6, 8)));
}

// ─── Kontak ─────────────────────────────────────────────────────────────────

/** Nomor WA/HP apa pun ("0812-3456 789", "+62 812…", "812…") → "62812…"; '' bila kosong. */
export function waBersih(v) {
  let n = String(v ?? '').replace(/\D/g, '');
  if (!n) return '';
  if (n.startsWith('0')) n = `62${n.slice(1)}`;
  else if (n.startsWith('8')) n = `62${n}`;
  return n;
}

export const waSah = (v) => /^62[0-9]{8,13}$/.test(v);

/** "6281234567890" → "0812-3456-7890". */
export function formatWa(v) {
  if (!waSah(v)) return v || '';
  const lokal = `0${v.slice(2)}`;
  return lokal.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3');
}

/** Tautan wa.me untuk nomor yang sah. */
export const tautanWa = (v) => (waSah(v) ? `https://wa.me/${v}` : '');

export const emailBersih = (v) =>
  String(v ?? '')
    .trim()
    .toLowerCase();

/** Sama dengan rules `kontakSah`. */
export const emailSah = (v) =>
  /^[a-z0-9._%+-]+@[a-z0-9-]+([.][a-z0-9-]+)*[.][a-z]{2,}$/.test(v) && v.length <= 120;

export const alamatBersih = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

export const KONTAK_KOSONG = Object.freeze({ alamat: '', emailPribadi: '', noWa: '' });

// ─── Pangkat & golongan ─────────────────────────────────────────────────────

const ROMAWI_PPPK = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
];
const ANGKA_KE_ROMAWI = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

export const golonganPns = (g) => /^(I|II|III|IV)\/[a-e]$/.test(g);
export const golonganPppk = (g) => ROMAWI_PPPK.includes(g);

/**
 * Golongan baku: "III/C", "III c", "3/c", "IIIc" → "III/c"; "v", "IX" → "V", "IX" (PPPK).
 * @returns {string} '' bila tidak dikenali
 */
export function golonganBaku(v) {
  const s = String(v ?? '')
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!s) return '';
  const pns = /^(IV|III|II|I|[1-4])\/?([A-E])$/.exec(s);
  if (pns) return `${ANGKA_KE_ROMAWI[pns[1]] || pns[1]}/${pns[2].toLowerCase()}`;
  return golonganPppk(s) ? s : '';
}

/** Daftar golongan untuk pilihan master pangkat. */
export const GOLONGAN_PNS = Object.freeze(
  ['I', 'II', 'III', 'IV'].flatMap((r) =>
    ['a', 'b', 'c', 'd', ...(r === 'IV' ? ['e'] : [])].map((h) => `${r}/${h}`),
  ),
);
export const GOLONGAN_PPPK = Object.freeze([...ROMAWI_PPPK]);

/** "Penata (III/c)" untuk PNS; nama apa adanya untuk PPPK ("PPPK Golongan V"). */
export function labelPangkat(nama, golongan) {
  if (golonganPns(golongan)) return nama ? `${nama} (${golongan})` : golongan;
  return nama || (golongan ? `Golongan ${golongan}` : '');
}

// ─── Kelengkapan ────────────────────────────────────────────────────────────

/**
 * Data yang belum diisi (label), untuk penanda "belum lengkap" dan halaman Profil.
 * @param {object} p  dokumen pegawai
 * @param {object} [kontak]  dokumen pegawai_kontak (boleh kosong)
 */
export function dataBelumLengkap(p, kontak) {
  const kosong = [];
  const asn = statusAsn(p.statusKepegawaian);
  if (!p.statusKepegawaian) kosong.push('Status kepegawaian');
  if (asn && !p.nip) kosong.push('NIP');
  if (!p.tanggalLahir) kosong.push('Tanggal lahir');
  if (asn && !p.golongan) kosong.push('Pangkat/golongan');
  if (!p.jabatanId) kosong.push('Jabatan');
  if (!p.unitId) kosong.push('Unit kerja');
  if (!kontak?.alamat) kosong.push('Alamat');
  if (!kontak?.emailPribadi) kosong.push('E-mail pribadi');
  if (!kontak?.noWa) kosong.push('No. WA');
  return kosong;
}
