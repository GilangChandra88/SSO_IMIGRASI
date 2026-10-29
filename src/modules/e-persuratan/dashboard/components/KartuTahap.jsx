import React from 'react';
import { FaChevronRight } from 'react-icons/fa';
import { T } from '@/utils/uiTokens';
import { AngkaBerjalan } from '@/components/animasi';
import { IKON_TAHAP, TONE, labelTahap } from '@/modules/e-persuratan/lpj';

/** Keterangan singkat tiap tahap (apa yang dikerjakan Keuangan). */
const PETUNJUK = {
  draft: 'Disiapkan pelaksana',
  verif: 'Periksa dan centang dokumen',
  sakti: 'Catat nomor kwitansi SAKTI',
  transfer: 'Unggah bukti transfer',
  arsip: 'Pindai dan arsipkan berkas',
};

// Lebar kartu di kisi .d2-kpis: 2 kolom (Draft selebar dua) → kontainer ≥900px: 3 + 2 kartu →
// kontainer ≥1240px: lima kartu sebaris.
const LEBAR = {
  verif: '@min-[900px]/d2:col-span-2 @min-[1240px]/d2:col-span-1',
  sakti: '@min-[900px]/d2:col-span-2 @min-[1240px]/d2:col-span-1',
  transfer: '@min-[900px]/d2:col-span-2 @min-[1240px]/d2:col-span-1',
  arsip: '@min-[900px]/d2:col-span-3 @min-[1240px]/d2:col-span-1',
  draft: 'col-span-2 @min-[900px]/d2:col-span-3 @min-[1240px]/d2:col-span-1',
};

/**
 * Kartu jumlah berkas satu tahap Berkas Verifikasi (.d2-kpi purwarupa): angka besar di tengah atas,
 * ikon + judul + keterangan di bawah, panah di pojok kanan atas. Klik → tab tahap itu.
 * `jumlah` null = masih memuat; `galat` = gagal dimuat. Bertanda `data-bertahap` (muncul
 * berurutan lewat useMunculBerurutan pada wadahnya, karena kartu punya efek sorot).
 */
export default function KartuTahap({ tahap, jumlah, galat, onClick }) {
  const Ikon = IKON_TAHAP[tahap];
  const label = labelTahap(tahap);
  const draft = tahap === 'draft';
  const nada = TONE[tahap];
  return (
    <button
      type="button"
      data-bertahap
      onClick={onClick}
      aria-label={`${label}: ${jumlah ?? '…'} berkas. Buka daftar`}
      className={`group relative grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(46px,1fr)_auto_auto] items-center gap-x-3.5 min-h-[120px] pt-4 pb-[18px] pl-[18px] pr-[18px] @min-[1240px]/d2:pr-4 rounded-[20px] text-left ${T.surface} ${T.ink} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A78D6] dark:focus-visible:outline-[#5599e8] motion-safe:transition-[translate,box-shadow,background-color] motion-safe:duration-150 motion-safe:hover:-translate-y-[3px] max-[560px]:grid-rows-[minmax(42px,1fr)_auto] max-[560px]:min-h-0 max-[560px]:gap-x-2.5 max-[560px]:pt-3 max-[560px]:px-3 max-[560px]:pb-3.5 ${
        draft
          ? `border-[1.5px] border-dashed ${T.borderStrong} ${T.hoverSurface2}`
          : `border ${T.border} shadow-[0_14px_28px_-18px_rgba(14,35,64,.45)] hover:shadow-[0_16px_28px_-16px_rgba(14,35,64,.4)] dark:shadow-[0_14px_28px_-18px_rgba(0,0,0,.7)]`
      } ${LEBAR[tahap]}`}
    >
      <span
        className={`absolute top-3.5 right-3.5 grid place-items-center w-7 h-7 rounded-full border ${T.border} ${T.inkMuted} motion-safe:transition-colors motion-safe:duration-150 ${nada.go} max-[560px]:top-2.5 max-[560px]:right-2.5 max-[560px]:w-6 max-[560px]:h-6`}
      >
        <FaChevronRight size={11} />
      </span>
      <span
        className={`col-span-2 justify-self-center text-center mb-1.5 text-[34px] font-extrabold tracking-[-.03em] leading-[1.05] tabular-nums max-[560px]:text-[30px] max-[560px]:mb-1 ${
          jumlah == null && !galat ? `animate-pulse ${T.inkMuted}` : ''
        }`}
      >
        {galat ? '—' : jumlah == null ? '…' : <AngkaBerjalan nilai={jumlah} />}
      </span>
      <span
        className={`row-span-2 self-center grid place-items-center w-11 h-11 rounded-[13px] ${nada.soft} ${nada.ink} max-[560px]:row-span-1 max-[560px]:w-[34px] max-[560px]:h-[34px] max-[560px]:rounded-[10px]`}
      >
        <Ikon size={17} className="max-[560px]:w-3.5 max-[560px]:h-3.5" />
      </span>
      <span className="self-end text-[14.5px] font-bold max-[560px]:self-center max-[560px]:text-[13px]">
        {label}
      </span>
      <span
        className={`self-start mt-[3px] text-xs leading-[1.35] @min-[1240px]/d2:min-h-[2.7em] max-[560px]:hidden ${T.inkMuted}`}
      >
        {PETUNJUK[tahap]}
      </span>
    </button>
  );
}
