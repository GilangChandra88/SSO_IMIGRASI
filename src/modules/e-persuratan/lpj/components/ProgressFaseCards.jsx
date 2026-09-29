import React from 'react';
import { FaCheck, FaLock } from 'react-icons/fa';
import { lpjDetailStages, lpjStageStatus, STAGE_STATUS_LABEL } from '../utils/lpjLogic';
import { NAVY, STAGE_CLS, T } from '../ui/tokens';

/**
 * Kartu ringkas "Progress Dokumen" per fase (ProgressFaseCards purwarupa).
 * Dipakai di baris Daftar LPJ yang dibuka dan di Dashboard.
 */
export default function ProgressFaseCards({ pack }) {
  const stages = lpjDetailStages(pack);
  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage, i) => {
        const raw = lpjStageStatus(pack, stage);
        const prevDone = i === 0 ? true : lpjStageStatus(pack, stages[i - 1]) === 'selesai';
        const st =
          raw === 'selesai'
            ? 'selesai'
            : raw === 'proses'
              ? 'proses'
              : prevDone
                ? 'belum'
                : 'terkunci';
        const muted = st === 'terkunci' || st === 'belum';
        return (
          <div
            key={stage.num}
            className={`flex items-center gap-2.5 px-3 py-[9px] border rounded-[9px] ${T.surface} ${T.border}`}
          >
            <div
              className={`w-[26px] h-[26px] shrink-0 rounded-[7px] flex items-center justify-center ${
                muted ? `${T.surface2} ${T.inkMuted}` : `${NAVY.bg} text-white`
              }`}
            >
              {st === 'selesai' ? (
                <FaCheck size={11} />
              ) : st === 'terkunci' ? (
                <FaLock size={10} />
              ) : (
                <span className="text-[11px] font-extrabold">{stage.num}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold ${T.ink}`}>
                Fase {stage.num} — {stage.label}
              </div>
              <div className={`text-[10.5px] mt-px ${T.inkMuted}`}>{stage.sub}</div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-2xl border whitespace-nowrap shrink-0 ${STAGE_CLS[st].badge}`}
            >
              {STAGE_STATUS_LABEL[st]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
