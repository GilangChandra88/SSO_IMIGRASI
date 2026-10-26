import React, { useEffect, useRef } from 'react';
import { TAHAP } from '../../utils/verifikasiLogic';
import { IKON_TAHAP, TONE } from './tahapTampil';
import { FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

/**
 * Tab tahap berkas (PgvTabs purwarupa): kontrol segmen penuh berisi ikon, label, dan jumlah
 * berkas. Tab terpilih bergaris bawah warna tahapnya; tab tujuan setelah berkas pindah disorot
 * sebentar (`sorot`). Layar sempit: bisa digeser ke samping. Panah kiri/kanan berpindah tab.
 */
export default function TabTahap({ tab, jumlah, sorot, onPilih }) {
  const wadahRef = useRef(null);

  // Tab terpilih selalu terlihat saat daftar tab bisa digeser (layar sempit)
  useEffect(() => {
    const w = wadahRef.current;
    const el = w?.querySelector('[aria-selected="true"]');
    if (!w || !el || w.scrollWidth <= w.clientWidth) return;
    w.scrollTo({ left: Math.max(0, el.offsetLeft - (w.clientWidth - el.offsetWidth) / 2) });
  }, [tab]);

  function tombolArah(e, i) {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = TAHAP[(i + d + TAHAP.length) % TAHAP.length].key;
    onPilih(n);
    document.getElementById(`tab-tahap-${n}`)?.focus();
  }

  return (
    <div
      ref={wadahRef}
      role="tablist"
      aria-label="Tahap berkas"
      className={`flex sm:grid sm:grid-cols-5 gap-1 p-[5px] mb-[18px] rounded-2xl border overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${T.surface2} ${T.border}`}
    >
      {TAHAP.map((t, i) => {
        const on = t.key === tab;
        const Ikon = IKON_TAHAP[t.key];
        const disorot = sorot === t.key && !on;
        return (
          <button
            key={t.key}
            id={`tab-tahap-${t.key}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls="daftar-verifikasi"
            tabIndex={on ? 0 : -1}
            onClick={() => onPilih(t.key)}
            onKeyDown={(e) => tombolArah(e, i)}
            className={`relative flex flex-[1_0_auto] items-center justify-center gap-2 sm:gap-[9px] h-[46px] sm:h-[50px] px-3.5 sm:px-3 rounded-xl text-[13px] sm:text-[13.5px] font-bold whitespace-nowrap min-w-0 overflow-hidden ${ANIM.pilih} ${
              on
                ? `${T.surface} ${T.ink} shadow-[0_0_0_1px_#E0E5EC,0_6px_14px_-6px_rgba(15,23,42,.28)] dark:shadow-[0_0_0_1px_#233450,0_6px_14px_-6px_rgba(0,0,0,.5)]`
                : `${T.inkMuted} hover:text-[#101A2C] dark:hover:text-[#EAF0F8] hover:bg-[rgba(127,140,160,.10)]`
            } ${disorot ? `ring-2 ring-[#2A78D6] dark:ring-[#7DB6F3] ${STATUS.doneBg}` : ''}`}
          >
            <Ikon
              size={15}
              className={`shrink-0 motion-safe:transition-colors motion-safe:duration-200 ${on ? TONE[t.key].ink : T.inkMuted}`}
            />
            <span className="min-w-0 truncate">{t.label}</span>
            <span
              className={`min-w-6 px-[7px] py-px rounded-full border text-xs font-bold leading-[1.6] text-center ${FONT.mono} motion-safe:transition-colors motion-safe:duration-200 ${
                disorot
                  ? STATUS.doneOn
                  : on
                    ? `${TONE[t.key].bar} border-transparent ${t.key === 'draft' ? T.ink2 : 'text-white'}`
                    : `${T.surface} ${T.border} ${T.ink2}`
              }`}
            >
              {jumlah[t.key]}
            </span>
            {on && (
              <span
                aria-hidden="true"
                className={`absolute left-4 right-4 bottom-0 h-[3px] rounded-t-[3px] ${TONE[t.key].bar} ${ANIM.pudar}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
