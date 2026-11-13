/**
 * Kelas UI modul Log Developer, disusun dari token `@/utils/uiTokens` (terang/gelap seragam).
 * Daftar tampil sebagai kartu bertumpuk di ponsel dan baris tabel dari `md:` ke atas.
 */
import { ANIM } from '@/utils/animasi';
import { ADMIN, FONT, NAVY, STATUS, T } from '@/utils/uiTokens';

const TOMBOL = `inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-[10px] text-sm font-bold cursor-pointer ${ANIM.tekan} disabled:opacity-45 disabled:cursor-not-allowed`;
const LENCANA =
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap';

export const K = Object.freeze({
  halaman: `${ADMIN.page}`,
  h1: ADMIN.h1,
  sub: ADMIN.sub,
  kepala: 'flex flex-wrap items-start justify-between gap-3 mb-4',
  kartu: `${T.surface} ${T.border} ${T.shadowSm} ${T.ink} border rounded-2xl p-4 sm:p-5`,
  kartuDaftar: `${T.surface} ${T.border} ${T.shadowSm} border rounded-2xl overflow-hidden`,
  baris: `w-full text-left flex flex-col md:grid gap-1 md:gap-3 md:items-center px-4 py-3 border-b last:border-b-0 ${T.border} ${T.hoverSurface2} cursor-pointer ${ANIM.tekan}`,
  barisDiam: `w-full flex flex-col md:grid gap-1 md:gap-3 md:items-center px-4 py-3 border-b last:border-b-0 ${T.border}`,
  kepalaTabel: `hidden md:grid gap-3 px-4 py-2 text-[11px] font-bold uppercase tracking-wide ${T.surface2} ${T.inkMuted}`,
  judulSeksi: `${FONT.head} text-[15px] font-bold ${T.ink}`,
  judulBaris: `text-sm font-semibold ${T.ink} break-words`,
  teks: `text-[13px] ${T.ink2} break-words`,
  redup: `text-xs ${T.inkMuted}`,
  mono: `${FONT.mono} text-xs ${T.ink2} break-all`,
  angkaBesar: `${FONT.head} text-[26px] font-extrabold leading-none ${T.ink}`,
  kosong: `text-center px-3 py-10 text-sm ${T.inkMuted}`,
  grid4: 'grid grid-cols-2 lg:grid-cols-4 gap-3',

  // Lencana
  lencana: `${LENCANA} ${T.surface2} ${T.ink2}`,
  lencanaInfo: `${LENCANA} ${STATUS.infoBg} ${STATUS.infoInk}`,
  lencanaBaik: `${LENCANA} ${STATUS.goodBg} ${STATUS.goodInk}`,
  lencanaPeringatan: `${LENCANA} ${STATUS.warnBg} ${STATUS.warnInk}`,
  lencanaBahaya: `${LENCANA} ${STATUS.critBg} ${STATUS.critInk}`,
  titikOnline: `inline-block w-2 h-2 rounded-full ${STATUS.goodSolid}`,
  titikDiam: `inline-block w-2 h-2 rounded-full ${STATUS.warnSolid}`,
  titikMati: `inline-block w-2 h-2 rounded-full ${T.bgBorder}`,

  // Saring
  seg: `${ADMIN.seg} mb-3`,
  segBtn: ADMIN.segBtn,
  segAktif: ADMIN.segActive,
  bilah: 'flex flex-wrap gap-2 items-center mb-3',

  // Form
  label: `block text-[13px] font-semibold mb-1.5 ${T.ink2}`,
  masukan: `w-full min-h-10 px-3 rounded-[10px] border ${T.borderStrong} ${T.surface} ${T.ink} ${T.placeholder} text-base sm:text-sm outline-none ${T.focus} dark:[color-scheme:dark] disabled:opacity-60`,
  pesanGalat: `block mt-1 text-xs font-semibold ${STATUS.critInk}`,

  // Tombol
  tombolUtama: `${TOMBOL} ${NAVY.bg} ${NAVY.hoverBg} text-white`,
  tombolKedua: `${TOMBOL} border ${T.borderStrong} ${T.surface} ${T.ink} ${T.hoverSurface2}`,
  tombolBahaya: `${TOMBOL} border ${STATUS.critInk} ${STATUS.critBg}`,
  tombolKecil: `inline-flex items-center gap-1.5 min-h-8 px-3 rounded-lg text-xs font-bold cursor-pointer border ${T.borderStrong} ${T.surface} ${T.ink2} ${T.hoverSurface2} ${ANIM.tekan} disabled:opacity-45`,

  // Detail
  kotakInfo: `rounded-xl border p-3 ${STATUS.infoBorder} ${STATUS.infoBg}`,
  meterLintas: `block w-full h-2.5 rounded-full appearance-none border-0 overflow-hidden ${T.bgBorder} [&::-webkit-progress-bar]:bg-transparent`,
  meterIsiBaik:
    '[&::-webkit-progress-value]:bg-[#2A78D6] [&::-moz-progress-bar]:bg-[#2A78D6] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]',
  meterIsiAwas: '[&::-webkit-progress-value]:bg-[#C98500] [&::-moz-progress-bar]:bg-[#C98500]',
  meterIsiBahaya: '[&::-webkit-progress-value]:bg-[#D03B3B] [&::-moz-progress-bar]:bg-[#D03B3B]',
  kv: `grid grid-cols-[minmax(110px,32%)_1fr] gap-x-3 gap-y-1.5 text-[13px]`,
  kvKunci: `${T.inkMuted} break-words`,
  kvNilai: `${T.ink} break-words min-w-0`,
  pre: `${FONT.mono} text-[11px] leading-relaxed whitespace-pre-wrap break-all max-h-72 overflow-auto rounded-lg p-3 ${T.surface2} ${T.ink2}`,
  lama: `${FONT.mono} text-xs break-all ${STATUS.critInk}`,
  baru: `${FONT.mono} text-xs break-all ${STATUS.goodInk}`,
});

/** Kelas lencana menurut tingkat anomali. */
export const lencanaTingkat = (t) =>
  t === 'kritis' ? K.lencanaBahaya : t === 'peringatan' ? K.lencanaPeringatan : K.lencanaInfo;
