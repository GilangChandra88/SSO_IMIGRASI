/**
 * Kelas Tailwind Inventory (padanan styles.css purwarupa inventory-ui), dibangun dari token
 * `@/utils/uiTokens` agar terang/gelap seragam dengan aplikasi lain. Pakai lewat template string.
 */
import { FONT, NAVY, STATUS, T } from '@/utils/uiTokens';

const FOKUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A78D6] dark:focus-visible:outline-[#5599e8]';
const BTN_DASAR = `inline-flex items-center justify-center gap-2 rounded-lg border font-semibold whitespace-nowrap cursor-pointer ${FOKUS} motion-safe:transition-[color,background-color,border-color,scale] motion-safe:duration-200 motion-safe:enabled:active:scale-[.97] disabled:opacity-45 disabled:cursor-not-allowed`;

// Biru aksen (pilihan aktif, kalender, tautan)
export const BIRU = {
  bg: 'bg-[#2A78D6] dark:bg-[#3987E5]',
  text: 'text-[#1D5CA8] dark:text-[#7DB6F3]',
  border: 'border-[#2A78D6] dark:border-[#5599e8]',
  soft: 'bg-[rgba(42,120,214,.12)] dark:bg-[rgba(57,135,229,.18)]',
};

export const K = {
  // Kerangka halaman
  halaman: `${FONT.body} w-full max-w-[1400px] mx-auto px-4 pt-5 pb-24 sm:px-8 sm:pt-7 sm:pb-12 flex flex-col gap-4 sm:gap-6`,
  judul: `${FONT.head} text-[22px] sm:text-[26px] font-extrabold tracking-[-0.01em] ${NAVY.text}`,
  subJudul: `block mt-1 text-sm ${T.inkMuted}`,

  // Kartu
  kartu: `${T.surface} ${T.border} ${T.shadowSm} ${T.ink} border rounded-xl`,
  kepala: `flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 border-b ${T.border}`,
  judulKartu: `${FONT.head} text-base font-bold ${NAVY.text}`,
  subKartu: `block mt-0.5 text-[13px] ${T.inkMuted}`,

  // Form
  lbl: `block mb-1.5 text-xs font-semibold ${T.ink2}`,
  wajib: STATUS.critInk,
  ctl: `w-full h-10 px-3 rounded-lg border ${T.borderStrong} ${T.surface} ${T.ink} ${T.placeholder} text-base sm:text-sm outline-none ${T.focus} dark:[color-scheme:dark] disabled:opacity-60 disabled:cursor-not-allowed`,
  bantu: `mt-1.5 text-[12.5px] ${T.inkMuted}`,

  // Tombol
  btn: `${BTN_DASAR} h-10 px-4 text-sm ${T.surface} ${T.borderStrong} ${NAVY.text} ${T.hoverSurface2}`,
  btnUtama: `${BTN_DASAR} h-10 px-4 text-sm ${NAVY.bg} ${NAVY.hoverBg} border-transparent text-white`,
  btnBahaya: `${BTN_DASAR} h-10 px-4 text-sm bg-[#A62D2D] hover:bg-[#8C2424] border-transparent text-white`,
  btnKecil: `${BTN_DASAR} h-8 px-3 text-[13px] ${T.surface} ${T.borderStrong} ${NAVY.text} ${T.hoverSurface2}`,
  btnKecilUtama: `${BTN_DASAR} h-8 px-3 text-[13px] ${NAVY.bg} ${NAVY.hoverBg} border-transparent text-white`,
  ikonBtn: `inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border border-transparent cursor-pointer ${T.inkMuted} hover:bg-[#F3F5F8] dark:hover:bg-[#16243A] hover:border-[#CBD3DE] dark:hover:border-[#304864] ${FOKUS} disabled:opacity-40 disabled:cursor-not-allowed`,
  ikonHapus:
    'hover:enabled:text-[#A62D2D] dark:hover:enabled:text-[#F19191] hover:enabled:bg-[rgba(208,59,59,.1)]',
  tautan: `p-0 border-0 bg-transparent text-[13px] font-semibold cursor-pointer hover:underline ${BIRU.text} ${FOKUS}`,

  // Tabel
  tabelWrap: 'overflow-x-auto overflow-y-hidden',
  tabel: 'w-full border-collapse text-sm',
  th: `text-left text-xs font-semibold tracking-[.05em] uppercase px-4 py-3 border-b whitespace-nowrap ${T.surface2} ${T.ink2} ${T.border}`,
  td: `px-4 py-3 border-b align-middle ${T.border}`,
  trSorot: `${T.hoverSurface2} [&:last-child>td]:border-b-0`,
  kosong: `text-center px-4 py-8 ${T.inkMuted}`,
  mono: `${FONT.mono} text-[13px]`,
  tebal: 'block font-semibold',
  redup: T.inkMuted,
  // Lencana transaksi yang dibatalkan (tetap tercatat, tidak dihitung ke stok)
  batal: `inline-block align-middle ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${STATUS.critBg} ${STATUS.critInk}`,

  // Menu titik tiga / popover
  menu: `absolute z-30 w-44 py-1.5 rounded-[10px] border text-left ${T.surface} ${T.borderStrong} ${T.shadowMd}`,
  menuItem: `flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-left cursor-pointer ${T.ink} ${T.hoverSurface2} disabled:opacity-45 disabled:cursor-not-allowed`,
  menuBahaya: `flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-left cursor-pointer ${STATUS.critInk} ${T.hoverSurface2}`,
  menuCatatan: `px-3.5 pt-1.5 pb-1 mt-1 text-[11px] border-t ${T.inkMuted} ${T.border}`,

  // Pesan di dalam form/popup (notifikasi halaman memakai showToast)
  galat: `rounded-lg px-3.5 py-2.5 text-[13px] border border-[rgba(208,59,59,.3)] ${STATUS.critBg} ${STATUS.critInk}`,
  sukses: `rounded-lg px-3.5 py-2.5 text-[13px] border border-[rgba(27,175,122,.3)] ${STATUS.goodBg} ${STATUS.goodInk}`,
  peringatan: `rounded-lg px-3.5 py-2.5 text-[13px] border border-[rgba(237,161,0,.35)] ${STATUS.warnBg} ${STATUS.warnInk}`,

  // Tab garis bawah (sub menu Transaksi)
  tabbar: `flex gap-1 border-b overflow-x-auto ${T.border}`,
  tab: `inline-flex items-center gap-2 px-4 py-3 -mb-px border-b-2 text-sm font-semibold whitespace-nowrap cursor-pointer motion-safe:transition-colors ${FOKUS}`,
  tabAktif: `${BIRU.text} border-[#2A78D6] dark:border-[#7DB6F3]`,
  tabPasif: `border-transparent ${T.inkMuted} hover:text-[#0f2040] dark:hover:text-[#EAF0F8]`,

  // Tab pil di dalam popup
  // Lebar diatur pemakai: `w-fit mx-auto` (rata tengah) atau `w-full` (dibagi rata)
  tabPil: `flex gap-1 p-1 max-w-full rounded-full border ${T.surface2} ${T.border}`,
  tabPilBtn: `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer motion-safe:transition-[color,background-color] motion-safe:duration-200 ${FOKUS}`,
  tabPilAktif: `${BIRU.bg} text-white shadow-[0_1px_3px_rgba(10,22,40,.18)]`,
  tabPilPasif: `${T.inkMuted} hover:text-[#0f2040] dark:hover:text-[#EAF0F8]`,

  // Isi popup
  popupIsi: 'flex flex-col gap-5 p-4 sm:p-6',
  popupJudul: `${FONT.head} text-base font-bold ${NAVY.text}`,
};

export const BADGE = {
  aman: `${STATUS.goodBg} ${STATUS.goodInk}`,
  menipis: `${STATUS.warnBg} ${STATUS.warnInk}`,
  habis: `${STATUS.critBg} ${STATUS.critInk}`,
};

// Warna teks sisa stok (daftar ringkas)
export const TEKS_STATUS = {
  aman: T.inkMuted,
  menipis: STATUS.warnInk,
  habis: STATUS.critInk,
};

// Tanda panah masuk (hijau, ke bawah) dan keluar (merah, ke atas)
export const PANAH = {
  masuk: `inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full ${STATUS.goodBg} ${STATUS.goodInk}`,
  keluar: `inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full ${STATUS.critBg} ${STATUS.critInk}`,
};
