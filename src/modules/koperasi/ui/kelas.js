/**
 * Kelas UI modul Koperasi, disusun dari token `@/utils/uiTokens` (terang/gelap seragam).
 *
 * MOBILE-FIRST: modul ini harus bisa dikelola penuh dari ponsel. Aturan setiap halaman baru:
 *  - Rancang untuk lebar 360 px lebih dulu; layar lebar hanya tambahan (`sm:`/`md:`).
 *  - Navigasi lewat NavBawah (paling banyak 5 menu); menu samping hanya untuk layar lebar.
 *  - Area sentuh minimal 44 px; tombol aksi selebar layar di ponsel.
 *  - Isian berhuruf 16 px di ponsel (di bawah itu iOS memperbesar halaman saat diketuk).
 *  - Daftar tampil sebagai kartu bertumpuk di ponsel; tabel hanya dari `md:` ke atas.
 *  - Popup memakai `Modal` dengan `lembar` (naik dari bawah di ponsel).
 */
import { ANIM } from '@/utils/animasi';
import { ADMIN, FONT, NAVY, STATUS, T } from '@/utils/uiTokens';

const TOMBOL = `inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto px-4 rounded-[10px] text-sm font-bold cursor-pointer ${ANIM.tekan} disabled:opacity-45 disabled:cursor-not-allowed`;
// Tombol selebar isinya (untuk dalam bilah bersama teks)
const TOMBOL_PAS = TOMBOL.replace(' w-full sm:w-auto', '');

export const K = Object.freeze({
  // Kerangka. Jarak bawah ponsel = NavBawah + bilah browser (AppLayout setinggi 100vh)
  latar: `min-h-full ${T.ground}`,
  halaman: `${FONT.body} w-full max-w-[1200px] mx-auto px-4 pt-4 pb-[calc(128px+env(safe-area-inset-bottom,0px))] sm:px-8 sm:pt-[26px] md:pb-12`,
  h1: ADMIN.h1,
  sub: ADMIN.sub,
  kartu: `${T.surface} ${T.border} ${T.shadowSm} ${T.ink} border rounded-2xl p-4 sm:p-5`,

  tautan: `${T.hoverSurface2} ${ANIM.tekan}`,
  kembali: `inline-flex items-center gap-1.5 min-h-11 text-[13px] font-semibold ${T.ink2}`,
  bingkaiKamera: 'relative overflow-hidden rounded-2xl bg-black',
  garisPindai: 'absolute inset-x-6 top-1/2 h-0.5 bg-white/80 pointer-events-none',
  lencana: `inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${T.surface2} ${T.inkMuted}`,
  judulSeksi: `${FONT.head} text-base font-bold ${T.ink}`,
  judulBaris: `text-sm font-semibold ${T.ink}`,
  nominal: `${FONT.mono} text-sm font-bold whitespace-nowrap ${T.ink}`,
  teks: `text-[13px] ${T.ink2}`,
  redup: `text-xs ${T.inkMuted}`,
  kosong: `text-center px-3 py-10 text-sm ${T.inkMuted}`,
  ikonBulat: `w-9 h-9 shrink-0 rounded-full grid place-items-center ${STATUS.infoBg} ${STATUS.infoInk}`,

  ikonMasuk: `w-9 h-9 shrink-0 rounded-full grid place-items-center ${STATUS.goodBg} ${STATUS.goodInk}`,
  lencanaPeringatan: `inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS.warnBg} ${STATUS.warnInk}`,
  lencanaBahaya: `inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS.critBg} ${STATUS.critInk}`,
  lencanaBaik: `inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS.goodBg} ${STATUS.goodInk}`,
  ikonKeluar: `w-9 h-9 shrink-0 rounded-full grid place-items-center ${STATUS.critBg} ${STATUS.critInk}`,

  // Tab: selebar layar, dibagi rata
  seg: `grid grid-flow-col auto-cols-fr gap-1 p-1 mb-4 rounded-xl ${T.surface2}`,
  segBtn: `min-h-11 px-1 rounded-lg text-[13px] font-bold cursor-pointer ${ANIM.pilih}`,
  segAktif: `${T.surface} ${STATUS.infoInk} ${T.shadowSm}`,
  segPasif: T.inkMuted,

  // Form
  pesanGalat: `block mt-1 text-xs font-semibold ${STATUS.critInk}`,
  label: `block text-[13px] font-semibold mb-1.5 ${T.ink2}`,
  masukan: `w-full min-h-11 px-3 rounded-[10px] border ${T.borderStrong} ${T.surface} ${T.ink} ${T.placeholder} text-base sm:text-sm outline-none ${T.focus} dark:[color-scheme:dark] disabled:opacity-60 disabled:cursor-not-allowed`,

  // Tombol
  tombolUtama: `${TOMBOL} ${NAVY.bg} ${NAVY.hoverBg} text-white`,
  tombolKedua: `${TOMBOL} border ${T.borderStrong} ${T.surface} ${T.ink} ${T.hoverSurface2}`,
  tombolIkon: `w-11 h-11 -mr-2 shrink-0 grid place-items-center rounded-lg cursor-pointer ${T.inkMuted} ${T.hoverSurface2}`,

  tombolKotak: `inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-[10px] border cursor-pointer ${T.borderStrong} ${T.surface} ${T.ink} ${T.hoverSurface2} ${ANIM.tekan} disabled:opacity-45 disabled:cursor-not-allowed`,

  jumlahPilih: `absolute top-2 right-2 min-w-6 h-6 px-1.5 rounded-full grid place-items-center text-xs font-bold text-white ${NAVY.bg}`,
  barisTotal: `flex items-center justify-between gap-3 pt-3 border-t ${T.border}`,
  // Tepat di atas NavBawah (setinggi 56 px)
  bilahKeranjang: `md:hidden fixed inset-x-0 z-20 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] px-4 py-2 border-t ${T.surface} ${T.border}`,

  // Ponsel saja (layar lebar lewat menu samping); 16 px di atas NavBawah (setinggi 56 px)
  tombolMelayang: `print:hidden md:hidden fixed z-30 right-[max(16px,env(safe-area-inset-right,0px))] bottom-[calc(72px+env(safe-area-inset-bottom,0px))] w-14 h-14 rounded-full grid place-items-center text-white shadow-lg ${NAVY.bg} ${NAVY.hoverBg} ${ANIM.tekan}`,

  kepalaBagian: T.surface2,

  // Pilihan bergaya chip (mis. cara bayar), area sentuh 44 px
  chip: `min-h-11 px-4 rounded-full border text-sm font-semibold cursor-pointer ${ANIM.pilih}`,
  chipAktif: `${NAVY.bg} text-white border-transparent`,
  chipPasif: `${T.surface} ${T.ink} ${T.borderStrong}`,

  // Satu baris isian berulang di dalam form (mis. barang pembelian)
  kotakBaris: `p-2.5 rounded-xl border ${T.border} ${T.surface2}`,

  // Daftar baris rapat dalam satu kartu (mis. bagan akun)
  kartuDaftar: `${T.surface} ${T.border} ${T.shadowSm} border rounded-2xl overflow-hidden`,
  barisDaftar: `border-t first:border-t-0 ${T.border}`,
  tombolBaris: `w-full min-h-12 flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer ${T.hoverSurface2}`,
  barisCentang: `flex items-center gap-2.5 min-h-11 text-sm cursor-pointer ${T.ink}`,

  tombolUtamaPas: `${TOMBOL_PAS} shrink-0 ${NAVY.bg} ${NAVY.hoverBg} text-white`,
  // Bilah aksi tetap tepat di atas NavBawah (ponsel saja)
  bilahAksi: `md:hidden fixed inset-x-0 z-20 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] px-4 py-2 border-t ${T.surface} ${T.border}`,

  // Bilah menu bawah (ponsel)
  navBawah: `print:hidden md:hidden fixed inset-x-0 bottom-0 z-30 flex border-t pb-[env(safe-area-inset-bottom,0px)] ${T.surface} ${T.border}`,
  navItem: `flex-1 min-w-0 min-h-14 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${ANIM.tekan}`,
  navAktif: STATUS.infoInk,
  navPasif: T.inkMuted,
});
