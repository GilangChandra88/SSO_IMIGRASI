import React from 'react';
import { FONT, T } from '@/utils/uiTokens';
import { ANIM, jedaKe } from '@/utils/animasi';
import { AngkaBerjalan } from '@/components/animasi';
import { JENIS_DOT } from '@/modules/e-persuratan/lpj';
import { TAHAP_DIARSIP, TAHAP_PROSES } from '../utils/tahap';

const R = 46;
const KELILING = 2 * Math.PI * R;
const persen = (n) => `${Math.round(n)}%`;

/**
 * Kartu Progres Pengarsipan (.d2-prog purwarupa): persen berkas bernomor yang sudah diarsipkan
 * dari semua berkas bernomor tahun ini, ditambah jumlah berkas Perjadin & Non-Perjadin (semua
 * tahap). `rekap` dari Function hitungTahapLpj (null = memuat).
 */
export default function ProgresArsip({ rekap, galat }) {
  const t = rekap?.tahap || {};
  const diarsip = TAHAP_DIARSIP.reduce((s, k) => s + (t[k] || 0), 0);
  const total = diarsip + TAHAP_PROSES.reduce((s, k) => s + (t[k] || 0), 0);
  const pct = total ? (diarsip * 100) / total : 0;

  let keterangan = `${diarsip} dari ${total} berkas sudah diarsipkan`;
  if (galat) keterangan = 'Jumlah berkas tidak dapat dimuat.';
  else if (!rekap) keterangan = 'Memuat…';

  return (
    <section
      aria-label="Progres pengarsipan"
      className={`flex items-center gap-4 min-w-0 px-[22px] py-5 rounded-[24px] border ${T.surface} ${T.border} ${T.shadowSm} ${T.ink} max-[1180px]:col-span-full max-sm:px-4 max-sm:rounded-[22px] ${ANIM.muncul} ${jedaKe(1)}`}
    >
      <div className="relative shrink-0 w-[84px] h-[84px] max-sm:w-[76px] max-sm:h-[76px]">
        <svg
          viewBox="0 0 120 120"
          role="img"
          aria-label={`Progres pengarsipan ${Math.round(pct)} persen`}
          className="w-full h-full"
        >
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="11"
            className="stroke-[#F3F5F8] dark:stroke-[#16243A]"
          />
          {pct > 0 && (
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={`${(KELILING * pct) / 100} ${KELILING}`}
              transform="rotate(-90 60 60)"
              className="stroke-[#0f2040] dark:stroke-[#7DB6F3]"
            />
          )}
        </svg>
        <span
          aria-hidden="true"
          className={`absolute inset-0 grid place-items-center ${FONT.mono} text-[17px] font-semibold ${T.ink}`}
        >
          {rekap && !galat ? <AngkaBerjalan nilai={pct} format={persen} /> : '—'}
        </span>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <h2 className={`${FONT.head} text-base font-bold`}>Progres Pengarsipan</h2>
        <p className={`text-[13px] leading-[1.4] ${T.inkMuted}`}>{keterangan}</p>
        {rekap && !galat && (
          <div className={`flex flex-wrap gap-x-3.5 gap-y-1.5 mt-2 text-[12.5px] ${T.ink2}`}>
            <span className="inline-flex items-center gap-1.5">
              <i className={`w-[7px] h-[7px] rounded-full ${JENIS_DOT.perjadin}`} />
              Perjadin <b className={`tabular-nums ${T.ink}`}>{rekap.jenis.perjadin}</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className={`w-[7px] h-[7px] rounded-full ${JENIS_DOT.non}`} />
              Non-Perjadin <b className={`tabular-nums ${T.ink}`}>{rekap.jenis.nonperjadin}</b>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
