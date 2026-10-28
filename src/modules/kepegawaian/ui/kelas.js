/**
 * Kelas UI modul Kepegawaian, disusun dari token purwarupa admin di `@/utils/uiTokens` (`ADMIN`,
 * `T`, `STATUS`, `BTN`, `GOLD`) supaya tampilan terang/gelapnya sama dengan MAK Setup & Nomor
 * Surat (CLAUDE.md §5). Tombol aksi utama navy; aksen Kepegawaian (amber) memakai token `GOLD`.
 * Jangan menulis kode warna baru di komponen; tambahkan susunan token di sini bila perlu.
 */
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
