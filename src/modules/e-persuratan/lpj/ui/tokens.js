/**
 * Token warna & gaya purwarupa LPJ (app.css + sharedStyles.js) sebagai kelas Tailwind.
 * Setiap token berpasangan terang/gelap. Pakai dengan template string:
 *   className={`${T.surface} ${T.border} border rounded-xl`}
 * Jangan membuat kelas dinamis (mis. `bg-[${x}]`); Tailwind hanya membaca kelas yang tertulis utuh.
 */

// ─── Font ────────────────────────────────────────────────────────────────────
export const FONT = {
  body: "font-['Inter',system-ui,sans-serif]",
  head: "font-['Plus_Jakarta_Sans',system-ui,sans-serif]",
  mono: "font-['IBM_Plex_Mono',ui-monospace,monospace] tabular-nums",
};

// ─── Warna dasar (variabel CSS purwarupa) ────────────────────────────────────
export const T = {
  ground: 'bg-white dark:bg-[#0A121D]',
  surface: 'bg-white dark:bg-[#111D2E]',
  surface2: 'bg-[#F3F5F8] dark:bg-[#16243A]',
  hoverSurface2: 'hover:bg-[#F3F5F8] dark:hover:bg-[#16243A]',
  hoverSurfaceHover: 'hover:bg-[#E9ECF1] dark:hover:bg-[#1C2C45]',
  border: 'border-[#E0E5EC] dark:border-[#233450]',
  borderStrong: 'border-[#CBD3DE] dark:border-[#304864]',
  divide: 'divide-[#E0E5EC] dark:divide-[#233450]',
  bgBorder: 'bg-[#E0E5EC] dark:bg-[#233450]',
  ink: 'text-[#101A2C] dark:text-[#EAF0F8]',
  ink2: 'text-[#55627A] dark:text-[#A7B6CB]',
  inkMuted: 'text-[#8895A9] dark:text-[#71829B]',
  placeholder: 'placeholder:text-[#8895A9] dark:placeholder:text-[#71829B]',
  shadowSm: 'shadow-[0_1px_2px_rgba(16,26,44,.07)] dark:shadow-[0_1px_2px_rgba(0,0,0,.5)]',
  shadowMd:
    'shadow-[0_10px_28px_-10px_rgba(16,26,44,.18)] dark:shadow-[0_14px_30px_-10px_rgba(0,0,0,.6)]',
  focus: 'focus:border-[#2A78D6] dark:focus:border-[#5599e8]',
};

// Navy khas LPJ purwarupa (#0f2040), dipakai sama di mode terang & gelap
export const NAVY = {
  bg: 'bg-[#0f2040]',
  hoverBg: 'hover:bg-[#1e4080]',
  text: 'text-[#0f2040] dark:text-[#7DB6F3]',
  border: 'border-[#0f2040]',
  gradient: 'bg-gradient-to-r from-[#0f2040] to-[#1e4080]',
};

// ─── Warna status (status-info/good/warn/critical) ──────────────────────────
export const STATUS = {
  infoBg: 'bg-[rgba(42,120,214,.12)] dark:bg-[rgba(57,135,229,.18)]',
  infoInk: 'text-[#1D5CA8] dark:text-[#7DB6F3]',
  infoBorder: 'border-[#1D5CA8] dark:border-[#7DB6F3]',
  goodBg: 'bg-[rgba(27,175,122,.13)] dark:bg-[rgba(25,158,112,.2)]',
  goodInk: 'text-[#147C55] dark:text-[#4FD39B]',
  goodBorder: 'border-[#147C55] dark:border-[#4FD39B]',
  goodSolid: 'bg-[#147C55] dark:bg-[#4FD39B]',
  warnBg: 'bg-[rgba(237,161,0,.16)] dark:bg-[rgba(201,133,0,.22)]',
  warnInk: 'text-[#8A5B00] dark:text-[#F0B93E]',
  warnBorder: 'border-[#8A5B00] dark:border-[#F0B93E]',
  warnSolid: 'bg-[#8A5B00] dark:bg-[#C98500]',
  critBg: 'bg-[rgba(208,59,59,.13)] dark:bg-[rgba(208,59,59,.22)]',
  critInk: 'text-[#A62D2D] dark:text-[#F19191]',
  critBorder: 'border-[#A62D2D] dark:border-[#F19191]',
};

// Warna status Fase (STAGE_STATUS_CFG purwarupa)
export const STAGE_CLS = {
  selesai: {
    badge:
      'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] dark:bg-[rgba(57,135,229,.18)] dark:text-[#7DB6F3] dark:border-[rgba(125,182,243,.35)]',
    border: 'border-[#bfdbfe] dark:border-[rgba(125,182,243,.35)]',
  },
  proses: {
    badge:
      'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] dark:bg-[rgba(57,135,229,.18)] dark:text-[#7DB6F3] dark:border-[rgba(125,182,243,.35)]',
    border: 'border-[#bfdbfe] dark:border-[rgba(125,182,243,.35)]',
  },
  revisi: {
    badge:
      'bg-[#fef2f2] text-[#991b1b] border-[#fecaca] dark:bg-[rgba(208,59,59,.22)] dark:text-[#F19191] dark:border-[rgba(241,145,145,.35)]',
    border: 'border-[#fecaca] dark:border-[rgba(241,145,145,.35)]',
  },
  belum: {
    badge:
      'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0] dark:bg-[#16243A] dark:text-[#A7B6CB] dark:border-[#233450]',
    border: 'border-[#e2e8f0] dark:border-[#233450]',
  },
  terkunci: {
    badge:
      'bg-[#f8fafc] text-[#94a3b8] border-[#e2e8f0] dark:bg-[#16243A] dark:text-[#71829B] dark:border-[#233450]',
    border: 'border-[#e2e8f0] dark:border-[#233450]',
  },
};

// ─── Komponen form (sharedStyles.js) ────────────────────────────────────────
const CONTROL = `w-full rounded-lg border ${T.surface} ${T.ink} ${T.placeholder} text-[13.5px] outline-none ${T.focus} dark:[color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed`;

export const FORM = {
  input: `${CONTROL} h-[38px] px-3 py-[9px]`,
  textarea: `${CONTROL} min-h-20 px-3 py-2.5 resize-y`,
  select: `${CONTROL} h-[38px] px-3 cursor-pointer`,
  borderOk: T.border,
  borderErr: 'border-[#ef4444]',
  label: `block text-[12.5px] font-semibold ${T.ink2} mb-1.5`,
  hint: `mt-1 text-[11.5px] ${T.inkMuted}`,
  err: `mt-1 text-[11.5px] font-semibold ${STATUS.critInk}`,
  card: `${T.surface} ${T.border} ${T.ink} border rounded-xl p-4 sm:p-[22px] mb-3.5`,
  // Kartu latar abu (data hanya-baca). Jangan digabung dengan `card` (warna latar bentrok).
  cardMuted: `${T.surface2} ${T.border} ${T.ink} border rounded-xl p-4 sm:p-[22px] mb-3.5`,
  cardTitle: `${FONT.head} text-[13.5px] font-bold ${T.ink}`,
  cardSub: `mt-0.5 text-xs ${T.ink2}`,
};

// ─── Tombol (btn.* purwarupa) ────────────────────────────────────────────────
const BTN_BASE =
  'inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN = {
  primaryDark: `${BTN_BASE} px-5 py-2.5 ${NAVY.bg} ${NAVY.hoverBg} text-white rounded-lg text-[13.5px] font-bold`,
  ghost: `${BTN_BASE} px-5 py-2.5 ${T.surface} ${T.ink2} ${T.border} border rounded-lg text-sm ${T.hoverSurface2}`,
  warn: `${BTN_BASE} px-[18px] py-2.5 ${STATUS.warnBg} ${STATUS.warnInk} border border-transparent rounded-lg text-[13.5px] font-semibold hover:brightness-95`,
  sm: `${BTN_BASE} px-3.5 py-[7px] ${T.surface} ${T.ink2} ${T.border} border rounded-lg text-[12.5px] ${T.hoverSurface2}`,
  xs: `${BTN_BASE} px-2.5 py-1 ${T.surface} ${T.ink2} ${T.border} border rounded-lg text-[11.5px] ${T.hoverSurface2}`,
  danger: `${BTN_BASE} px-3.5 py-[7px] bg-[#ef4444] hover:bg-[#dc2626] text-white border border-[#ef4444] rounded-lg text-[12.5px] font-semibold`,
  action: `${BTN_BASE} px-3.5 py-[7px] ${NAVY.bg} ${NAVY.hoverBg} text-white rounded-[7px] text-[12.5px] font-semibold shrink-0`,
  warnSolid: `${BTN_BASE} px-3.5 py-[7px] ${STATUS.warnSolid} text-white rounded-[7px] text-[12.5px] font-semibold hover:brightness-110`,
  // Tombol hapus kotak kecil (baris transaksi/dasar)
  trash: `w-8 h-[38px] shrink-0 rounded-[7px] border ${STATUS.critBorder} ${STATUS.critBg} ${STATUS.critInk} flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed`,
};

// ─── Tata letak halaman (.page-main, .supplier-card.card, .berkas-page-head) ─
export const LAYOUT = {
  page: `${FONT.body} w-full max-w-[1400px] mx-auto px-4 pt-[18px] pb-[100px] sm:pb-11 min-[1080px]:px-8 min-[1080px]:pt-[26px]`,
  card: `${T.surface} ${T.border} ${T.shadowSm} ${T.ink} border rounded-[20px] p-4 sm:p-[22px]`,
  head: 'flex flex-wrap justify-between items-start gap-4 mb-5',
  h1: `${FONT.head} text-[21px] font-extrabold tracking-[-0.01em] ${T.ink}`,
  sub: `text-[13px] mt-1 ${T.inkMuted}`,
  label: `text-[10.5px] font-bold uppercase tracking-[.06em] ${T.ink2}`,
};
