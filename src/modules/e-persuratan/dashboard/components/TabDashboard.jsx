import React from 'react';
import { FaClipboardCheck, FaFolderOpen } from 'react-icons/fa';
import { ANIM } from '@/utils/animasi';

const TAB = [
  { key: 'verif', label: 'Berkas Verifikasi', ikon: FaClipboardCheck },
  { key: 'saya', label: 'Berkas Saya', ikon: FaFolderOpen },
];

/**
 * Tab pil di kartu sambutan Dashboard Keuangan (.d2-utabs purwarupa): Berkas Verifikasi (dengan
 * jumlah berkas yang sedang diproses) dan Berkas Saya.
 */
export default function TabDashboard({ tab, onPilih, jumlahProses }) {
  return (
    <div
      role="tablist"
      aria-label="Tampilan dashboard"
      className="inline-flex gap-1.5 p-1.5 rounded-full bg-white/10 border border-white/12 max-[760px]:flex"
    >
      {TAB.map(({ key, label, ikon: Ikon }) => {
        const on = tab === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onPilih(key)}
            className={`inline-flex items-center gap-2.5 h-[52px] pl-[22px] pr-[26px] rounded-full text-[15.5px] font-bold whitespace-nowrap max-[760px]:flex-1 max-[760px]:justify-center max-[760px]:px-3 max-sm:h-[46px] max-sm:px-2 max-sm:gap-1.5 max-sm:text-[13px] ${ANIM.pilih} ${
              on
                ? 'bg-white text-[#0E2340] dark:text-[#081524] shadow-[0_8px_18px_-10px_rgba(0,0,0,.6)]'
                : 'text-[#B7C7DE] dark:text-[#8FA6C4] hover:text-white hover:bg-white/8'
            }`}
          >
            <Ikon size={18} className="shrink-0 max-sm:hidden" />
            {label}
            {key === 'verif' && jumlahProses > 0 && (
              <span
                className={`grid place-items-center min-w-[26px] h-[26px] px-2 rounded-full text-[13px] font-bold tabular-nums text-white max-sm:min-w-[22px] max-sm:h-[22px] max-sm:text-xs ${ANIM.meletup} ${
                  on ? 'bg-[#0E2340] dark:bg-[#081524]' : 'bg-white/16'
                }`}
              >
                {jumlahProses}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
