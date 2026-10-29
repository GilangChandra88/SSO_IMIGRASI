import {
  FaArchive,
  FaClipboardCheck,
  FaMoneyBillWave,
  FaRegFileAlt,
  FaUpload,
} from 'react-icons/fa';
import { NAVY, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

/**
 * Warna & ikon tiap tahap Berkas Verifikasi (--act-verif / --act-sakti / --act-transfer
 * purwarupa admin): `solid` = tombol & ikon jendela, `ink` = ikon tab terpilih, `soft` = latar
 * lembut, `bar` = garis bawah tab terpilih, `go` = panah kartu tahap Dashboard saat kartunya
 * (`group`) disorot.
 */
export const TONE = {
  draft: {
    solid: `${T.surface2} ${T.ink2}`,
    ink: T.inkMuted,
    soft: T.surface2,
    bar: T.bgBorder,
    go: 'group-hover:bg-[#8895A9] group-hover:border-[#8895A9] dark:group-hover:bg-[#71829B] dark:group-hover:border-[#71829B] group-hover:text-white',
  },
  verif: {
    solid: 'bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white',
    ink: 'text-[#2563EB] dark:text-[#3B82F6]',
    soft: 'bg-[rgba(37,99,235,.11)] dark:bg-[rgba(59,130,246,.18)]',
    bar: 'bg-[#2563EB] dark:bg-[#3B82F6]',
    go: 'group-hover:bg-[#2563EB] group-hover:border-[#2563EB] dark:group-hover:bg-[#3B82F6] dark:group-hover:border-[#3B82F6] group-hover:text-white',
  },
  sakti: {
    solid: 'bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white',
    ink: 'text-[#0F766E] dark:text-[#14B8A6]',
    soft: 'bg-[rgba(15,118,110,.12)] dark:bg-[rgba(20,184,166,.18)]',
    bar: 'bg-[#0F766E] dark:bg-[#14B8A6]',
    go: 'group-hover:bg-[#0F766E] group-hover:border-[#0F766E] dark:group-hover:bg-[#14B8A6] dark:group-hover:border-[#14B8A6] group-hover:text-white',
  },
  transfer: {
    solid: 'bg-[#F97316] hover:bg-[#EA6A0C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] text-white',
    ink: 'text-[#F97316] dark:text-[#FB923C]',
    soft: 'bg-[rgba(249,115,22,.13)] dark:bg-[rgba(251,146,60,.18)]',
    bar: 'bg-[#F97316] dark:bg-[#FB923C]',
    go: 'group-hover:bg-[#F97316] group-hover:border-[#F97316] dark:group-hover:bg-[#FB923C] dark:group-hover:border-[#FB923C] group-hover:text-white',
  },
  arsip: {
    solid: `${NAVY.bg} ${NAVY.hoverBg} text-white`,
    ink: STATUS.doneInk,
    soft: STATUS.doneBg,
    bar: STATUS.doneSolid,
    go: 'group-hover:bg-[#0f2040] group-hover:border-[#0f2040] group-hover:text-white dark:group-hover:bg-[#7DB6F3] dark:group-hover:border-[#7DB6F3] dark:group-hover:text-[#0A121D]',
  },
};

export const IKON_TAHAP = {
  draft: FaRegFileAlt,
  verif: FaClipboardCheck,
  sakti: FaUpload,
  transfer: FaMoneyBillWave,
  arsip: FaArchive,
};

/** Label tombol di kolom Aksi tiap tab (warnanya TONE[tahap].solid). */
export const AKSI_TAHAP = {
  verif: 'Verifikasi',
  sakti: 'Upload SAKTI',
  transfer: 'Transfer',
  arsip: 'Arsip Berkas',
};

/** Titik warna jenis berkas: Perjadin biru, Non-Perjadin oranye. */
export const JENIS_DOT = {
  perjadin: 'bg-[#2563EB] dark:bg-[#3B82F6]',
  non: 'bg-[#F97316] dark:bg-[#FB923C]',
};

/** Label kecil berhuruf kapital (.pgw-xlbl purwarupa). */
export const XLBL = `text-[10px] font-bold uppercase tracking-[.05em] ${T.inkMuted}`;

// Tombol simbol Pemeriksaan Dokumen (.pgv-ib purwarupa): Cetak / Centang / Ulang
const IB = `inline-flex items-center justify-center shrink-0 w-[34px] h-[34px] rounded-[9px] border cursor-pointer disabled:cursor-default ${ANIM.pilih}`;
const IB_OFF = `${T.surface} ${T.borderStrong} ${T.ink2}`;
const IB_WARNA = {
  cetak: (on) => (on ? `${NAVY.bg} ${NAVY.border} text-white` : `${IB_OFF} ${T.hoverSurface2}`),
  centang: (on) =>
    on
      ? STATUS.doneOn
      : `${IB_OFF} hover:text-[#0f2040] hover:border-[#0f2040] dark:hover:text-[#7DB6F3] dark:hover:border-[#7DB6F3] disabled:opacity-45`,
  ulang: () => `${STATUS.warnBg} ${STATUS.warnInk} ${STATUS.warnBorder}`,
};
export const IB_CLS = {
  cetak: (on) => `${IB} ${IB_WARNA.cetak(on)}`,
  centang: (on) => `${IB} ${IB_WARNA.centang(on)}`,
  ulang: () => `${IB} ${IB_WARNA.ulang()}`,
};
/** Versi kecil untuk panduan "Arti tombol" (bukan tombol). */
export const IB_PANDUAN = (jenis, on) =>
  `inline-flex items-center justify-center shrink-0 w-7 h-7 rounded-lg border pointer-events-none ${IB_WARNA[jenis](on)}`;
