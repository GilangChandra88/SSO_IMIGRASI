/**
 * Kelas UI modul Kepegawaian, disusun dari token purwarupa admin di `@/utils/uiTokens` (`ADMIN`,
 * `T`, `STATUS`, `BTN`, `GOLD`) supaya tampilan terang/gelapnya sama dengan MAK Setup & Nomor
 * Surat (CLAUDE.md §5). Tombol aksi utama navy; aksen Kepegawaian (amber) memakai token `GOLD`.
 * Jangan menulis kode warna baru di komponen; tambahkan susunan token di sini bila perlu.
 */
import { ANIM } from '@/utils/animasi';
import { ADMIN, BTN, FONT, GOLD, NAVY, STATUS, T } from '@/utils/uiTokens';

const LENCANA =
  'inline-flex items-center gap-1 text-[10.5px] font-bold tracking-[.02em] px-2 py-[3px] rounded-md whitespace-nowrap';

export const K = Object.freeze({
  // Halaman
  latar: `min-h-full ${T.ground}`,
  halaman: ADMIN.page,
  kartu: ADMIN.card,
  h1: ADMIN.h1,
  sub: ADMIN.sub,
  seg: `${ADMIN.seg} w-fit`,
  segBtn: ADMIN.segBtn,
  segAktif: ADMIN.segActive,
  toolbar: ADMIN.toolbar,
  cari: ADMIN.search,
  cariInput: ADMIN.searchInput,
  kontrol: ADMIN.control,
  kepala: 'flex flex-wrap items-start justify-between gap-3 mb-4',
  judulSeksi: `${FONT.head} text-[15px] font-bold ${T.ink}`,
  subSeksi: `text-[12.5px] mt-0.5 ${T.inkMuted}`,
  labelAksen: `${FONT.head} text-[11px] font-bold uppercase tracking-[.06em] ${GOLD.strongText}`,
  judulBagian: `${FONT.head} text-[11px] font-bold uppercase tracking-[.06em] ${GOLD.strongText} mb-3`,
  wadah: `border ${T.border} rounded-[14px] overflow-hidden`,
  teks: T.ink,
  teks2: T.ink2,
  redup: T.inkMuted,
  garis: T.border,
  pembatas: T.divide,
  permukaan: T.surface,
  permukaan2: T.surface2,
  sorot: T.hoverSurface2,
  mono: ADMIN.mono,
  monoRedup: `${FONT.mono} text-[12.5px] ${T.inkMuted} whitespace-nowrap`,
  judulLayar: `${FONT.head} text-[19px] font-bold leading-[1.35] ${T.ink}`,
  kosong: ADMIN.empty,
  aksen: GOLD.text,

  // Form
  label: ADMIN.label,
  masukan: ADMIN.input,
  masukanGalat: ADMIN.inputErr,
  bantuan: ADMIN.hint,
  pesanGalat: `text-[11.5px] font-semibold mt-1 ${STATUS.critInk}`,
  galat: ADMIN.errorBanner,
  peringatan: ADMIN.warnBanner,
  berhasil: `flex gap-2.5 items-start rounded-[10px] px-3.5 py-3 text-[12.5px] leading-[1.5] mb-3.5 ${STATUS.goodBg} ${STATUS.goodInk}`,
  pilihan: `border ${T.surface} ${T.border} ${T.hoverSurface2}`,
  pilihanAktif: `border ${GOLD.tintBg} ${GOLD.strongBorder}`,
  centang: 'mt-0.5 accent-[#0f2040] dark:accent-[#7DB6F3]',
  progres: 'w-40 h-2 accent-[#0f2040] dark:accent-[#7DB6F3]',
  kotak: `border ${T.border} rounded-[14px] p-3 sm:p-4`,
  // Kotak isian dengan saran (CariPegawai)
  ikonMasukan: `absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${T.inkMuted}`,
  hapusMasukan: `absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-md cursor-pointer ${T.inkMuted} ${T.hoverSurface2}`,
  saranDaftar: `mt-1.5 p-1 max-h-60 overflow-y-auto rounded-[10px] border ${T.surface} ${T.borderStrong} ${T.shadowMd}`,
  saranOpsi: 'flex flex-col px-3 py-2 rounded-lg cursor-pointer',
  sorotCocok: `bg-transparent font-bold ${GOLD.strongText}`,

  // Tombol
  tombolUtama: ADMIN.btnSubmit,
  tombolTambah: ADMIN.btnAdd,
  tombolKedua: BTN.ghost,
  tombolKecil: BTN.sm,
  tombolBahaya: BTN.danger,
  tombolIkon: ADMIN.rowBtn,
  tombolIkonBahaya: `w-[30px] h-[30px] rounded-lg grid place-items-center shrink-0 cursor-pointer ${STATUS.critInk} ${T.hoverSurface2}`,
  tombolKecilBahaya: `inline-flex items-center gap-1.5 cursor-pointer px-3.5 py-[7px] border rounded-lg text-[12.5px] ${T.surface} ${T.border} ${STATUS.critInk} ${T.hoverSurface2} ${ANIM.tekan} disabled:opacity-50 disabled:cursor-not-allowed`,
  tombolBuangKecil: `absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full grid place-items-center text-white shadow ${NAVY.bg} ${NAVY.hoverBg} disabled:opacity-60`,
  garisAksen: GOLD.strongBorder,

  // Tabel
  tabelWadah: ADMIN.tableWrap,
  tabel: ADMIN.table,
  th: ADMIN.th,
  td: ADMIN.td,
  tr: ADMIN.tr,

  // Lencana
  lencana: LENCANA,
  lencanaNetral: `${T.surface2} ${T.ink2}`,
  lencanaInfo: `${STATUS.infoBg} ${STATUS.infoInk}`,
  lencanaOk: `${STATUS.goodBg} ${STATUS.goodInk}`,
  lencanaWaspada: `${STATUS.warnBg} ${STATUS.warnInk}`,
  lencanaBahaya: `${STATUS.critBg} ${STATUS.critInk}`,
  lencanaAksen: `${GOLD.tintBg} ${GOLD.strongText}`,
  teksOk: STATUS.goodInk,
  teksWaspada: STATUS.warnInk,
  teksBahaya: STATUS.critInk,

  // Modal (komponen @/components/Modal)
  modalIsi: ADMIN.modalBody,
  modalJudul: ADMIN.modalTitle,
  modalSub: ADMIN.modalSub,
  modalTutup: ADMIN.modalClose,
  modalAksi: 'flex flex-wrap justify-end gap-2.5 mt-5',
});

/** Lencana per nada (status kehadiran & predikat): ok, info, waspada, bahaya. */
export const NADA_LENCANA = Object.freeze({
  ok: K.lencanaOk,
  info: K.lencanaInfo,
  waspada: K.lencanaWaspada,
  bahaya: K.lencanaBahaya,
});

// Bilah % hadir (<progress>, lebar lewat atribut value) dengan warna nada; sama dengan STATUS.*Ink.
const PROGRES = `${ANIM.tumbuhX} block w-full h-2 rounded-full overflow-hidden appearance-none border-0 ${T.surface2} [&::-webkit-progress-bar]:bg-[#F3F5F8] dark:[&::-webkit-progress-bar]:bg-[#16243A] [&::-webkit-progress-value]:rounded-full`;
export const PROGRES_NADA = Object.freeze({
  ok: `${PROGRES} [&::-webkit-progress-value]:bg-[#147C55] [&::-moz-progress-bar]:bg-[#147C55] dark:[&::-webkit-progress-value]:bg-[#4FD39B] dark:[&::-moz-progress-bar]:bg-[#4FD39B]`,
  info: `${PROGRES} [&::-webkit-progress-value]:bg-[#1D5CA8] [&::-moz-progress-bar]:bg-[#1D5CA8] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]`,
  waspada: `${PROGRES} [&::-webkit-progress-value]:bg-[#8A5B00] [&::-moz-progress-bar]:bg-[#8A5B00] dark:[&::-webkit-progress-value]:bg-[#F0B93E] dark:[&::-moz-progress-bar]:bg-[#F0B93E]`,
  bahaya: `${PROGRES} [&::-webkit-progress-value]:bg-[#A62D2D] [&::-moz-progress-bar]:bg-[#A62D2D] dark:[&::-webkit-progress-value]:bg-[#F19191] dark:[&::-moz-progress-bar]:bg-[#F19191]`,
});

/** Pilihan status kehadiran per pegawai (Hadir/Cuti/Sakit/Alpa): satu kelompok tombol. */
export const SEG_STATUS = Object.freeze({
  wadah: `flex w-full sm:w-auto sm:inline-flex border ${T.border} rounded-[10px] overflow-hidden`,
  tombol: `flex-1 sm:flex-none px-3 py-2 text-[12.5px] font-bold border-r last:border-r-0 ${T.border} cursor-pointer ${ANIM.tekan}`,
  mati: `${T.surface} ${T.inkMuted} ${T.hoverSurface2}`,
});
