/**
 * Halaman Draft (PgvDraftPage purwarupa admin) — hanya dilihat: berkas yang belum memiliki ID
 * LPJ, tampil per fase seperti di sisi pelaksana. Berkas masuk tab Verifikasi begitu ID LPJ
 * terbit (SPBy selesai).
 */

import React, { useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaExclamationTriangle, FaLock, FaRegFileAlt } from 'react-icons/fa';
import {
  STAGE_STATUS_LABEL,
  isPerjadin,
  lpjGroupSubDone,
  lpjIdOf,
  lpjRowTotal,
  lpjSingleStatus,
  overallProgress,
  pelaksanaOf,
  rupiah,
  stagesWithStatus,
  tanggalRingkas,
  uraianOf,
} from '../../utils/lpjLogic';
import { formatTanggal } from '../../utils/formatTanggal';
import LinkBack from '../../ui/LinkBack';
import ProgressBar from '../../ui/ProgressBar';
import { FONT, LAYOUT, NAVY, STATUS, T } from '@/utils/uiTokens';
import { munculBerurutan } from '@/utils/animasi';

const CHIP = 'inline-flex items-center px-[15px] py-1.5 rounded-full border text-[13px] font-bold';
const PILL = {
  selesai: `${STATUS.doneBg} ${STATUS.doneInk} border-transparent`,
  proses: `${STATUS.infoBg} ${STATUS.infoInk} border-transparent`,
  belum: `${T.surface} ${T.border} ${T.ink2}`,
  terkunci: `${T.surface2} ${T.border} ${T.ink2}`,
};
const NOMOR = {
  selesai: `${STATUS.doneBg} ${STATUS.doneInk}`,
  proses: `${STATUS.infoBg} ${STATUS.infoInk}`,
  belum: `${T.surface2} ${T.ink2}`,
  terkunci: `${T.surface2} ${T.ink2}`,
};

/** Dokumen satu fase beserta status "sudah dibuat". */
function dokumenFase(pack, stage) {
  return [
    ...(stage.items || []).map((d) => ({
      key: d.key,
      code: d.code,
      label: d.label,
      done: lpjSingleStatus(pack, stage, d) === 'selesai',
    })),
    ...(stage.groups || []).flatMap((g) =>
      g.subItems.map((it) => ({
        key: `${g.key}-${it.key}`,
        code: it.code,
        label: it.label,
        done: lpjGroupSubDone(pack, stage, g, it),
      })),
    ),
  ];
}

export default function HalamanDraft({ pack }) {
  const navigate = useNavigate();
  const isiRef = useRef(null);
  useLayoutEffect(() => munculBerurutan(isiRef.current), []);

  const fases = stagesWithStatus(pack);
  const prog = overallProgress(pack);
  const total = lpjRowTotal(pack);
  const nomor = lpjIdOf(pack);
  const tgl = tanggalRingkas(pack);
  const nama = pelaksanaOf(pack).map((p) => p.nama);
  const info = [
    ['Pelaksana', nama.join(', ')],
    ...(isPerjadin(pack)
      ? [
          ['Seksi', pack.spd?.seksi],
          ['Berangkat', formatTanggal(tgl.berangkat)],
          ['Kembali', formatTanggal(tgl.kembali)],
        ]
      : []),
    ['Tanggal LPJ', formatTanggal(tgl.tanggalLPJ)],
    ['Total Biaya', rupiah(total)],
  ];

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={LAYOUT.page}>
        <LinkBack onClick={() => navigate('/e-persuratan/verifikasi?tab=draft')}>
          Kembali ke Berkas Verifikasi
        </LinkBack>
        <div ref={isiRef} className={`${LAYOUT.card} flex flex-col gap-5`}>
          <section
            data-bertahap
            aria-label="Ringkasan draft"
            className={`flex flex-wrap items-start justify-between gap-x-6 gap-y-4 px-[18px] pt-5 pb-[22px] sm:px-[30px] sm:pt-[26px] sm:pb-[30px] rounded-[18px] sm:rounded-[22px] text-white ${NAVY.gradient} ${T.shadowMd}`}
          >
            <div className="flex-[1_1_360px] min-w-0">
              <div className="flex gap-2 flex-wrap mb-3.5">
                <span
                  className={`${CHIP} ${nomor ? `${FONT.mono} bg-white/15 border-white/20` : 'bg-white/10 border-white/20 text-[#D4DEEE] italic'}`}
                >
                  {nomor || 'Belum bernomor'}
                </span>
                <span className={`${CHIP} bg-white/15 border-white/20`}>
                  {isPerjadin(pack) ? 'Perjadin' : 'Non-Perjadin'}
                </span>
                <span className={`${CHIP} bg-white border-white text-[#1D4ED8]`}>Draft</span>
              </div>
              <h1
                className={`${FONT.head} text-lg sm:text-[22px] font-extrabold leading-[1.3] break-words`}
              >
                {uraianOf(pack) || 'Belum diisi'}
              </h1>
              <p className="mt-2.5 text-[13.5px] font-medium tracking-[.01em] text-[#C7D5EA]">
                {nama.join(', ') || '—'} · TOTAL BIAYA{' '}
                <b className="text-white font-extrabold">{rupiah(total)}</b>
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end sm:text-right max-sm:basis-full">
              <b className={`${FONT.head} text-[28px] sm:text-[34px] font-extrabold leading-[1.1]`}>
                {prog.pct}%
              </b>
              <span className="mt-1 text-[13px] font-semibold text-[#C7D5EA]">
                {prog.done}/{prog.total} dokumen selesai
              </span>
            </div>
            <ProgressBar
              value={prog.pct}
              className="basis-full h-2 mt-1.5 rounded-full bg-white/20 [&::-webkit-progress-bar]:bg-white/20 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-[#7FB5F5] [&::-moz-progress-bar]:bg-[#7FB5F5]"
            />
          </section>

          <div
            data-bertahap
            className={`flex flex-wrap gap-x-9 gap-y-4 px-[18px] py-4 sm:px-6 sm:py-[18px] rounded-2xl border ${T.surface2} ${T.border}`}
          >
            {info.map(([label, isi]) => (
              <div key={label} className="min-w-[110px]">
                <div
                  className={`text-[10.5px] font-bold uppercase tracking-[.05em] mb-1 ${T.inkMuted}`}
                >
                  {label}
                </div>
                <div className={`text-[13px] font-medium ${T.ink}`}>{isi || '—'}</div>
              </div>
            ))}
          </div>

          <div
            data-bertahap
            className={`flex items-start gap-2.5 px-3.5 py-[11px] rounded-[10px] text-[13px] ${STATUS.warnBg} ${STATUS.warnInk}`}
          >
            <FaExclamationTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              Berkas ini belum memiliki ID LPJ. Admin hanya bisa melihat. Berkas masuk tab
              Verifikasi setelah SPBy selesai dan ID LPJ terbit.
            </span>
          </div>

          <div className="flex flex-col gap-3.5">
            {fases.map((f, i) => {
              const st = f.display;
              const docs = dokumenFase(pack, f.stage);
              return (
                <section
                  key={f.stage.num}
                  data-bertahap
                  className={`rounded-[18px] border overflow-hidden ${T.surface} ${T.border}`}
                >
                  <header
                    className={`flex items-center gap-3 sm:gap-4 p-3.5 sm:px-[22px] sm:py-[18px] ${f.locked ? 'opacity-60' : ''}`}
                  >
                    <span
                      className={`grid place-items-center shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] ${FONT.head} text-base sm:text-lg font-extrabold ${NOMOR[st]}`}
                    >
                      {st === 'selesai' ? (
                        <FaCheck size={18} />
                      ) : f.locked ? (
                        <FaLock size={17} />
                      ) : (
                        f.stage.num
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className={`${FONT.head} text-base font-extrabold ${T.ink}`}>
                        Fase {f.stage.num} — {f.stage.label}
                      </h3>
                      <p className={`mt-[3px] text-[13px] leading-[1.45] ${T.inkMuted}`}>
                        {f.tally.done}/{f.tally.total} selesai · {f.stage.sub}
                        {f.locked ? ' · menunggu tahap sebelumnya' : ''}
                      </p>
                    </div>
                    <span
                      className={`max-sm:hidden shrink-0 px-3.5 py-[5px] rounded-full border text-xs font-bold whitespace-nowrap ${PILL[st]}`}
                    >
                      {STAGE_STATUS_LABEL[st]}
                    </span>
                  </header>
                  {f.locked ? (
                    <div
                      className={`flex items-center gap-2.5 px-3.5 sm:px-[22px] py-[13px] sm:py-[15px] border-t text-[13.5px] ${T.border} ${T.surface2} ${T.inkMuted}`}
                    >
                      <FaLock size={12} />
                      <span>
                        Selesaikan fase "{fases[i - 1]?.stage.label || 'sebelumnya'}" terlebih
                        dahulu untuk membuka fase ini.
                      </span>
                    </div>
                  ) : (
                    docs.map((d) => (
                      <div
                        key={d.key}
                        className={`flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 px-3.5 sm:px-[22px] py-3 sm:py-3.5 border-t ${T.border}`}
                      >
                        <span
                          className={`grid place-items-center shrink-0 w-11 h-11 rounded-xl ${d.done ? `${STATUS.doneBg} ${STATUS.doneInk}` : `${T.surface2} ${T.inkMuted}`}`}
                        >
                          {d.done ? <FaCheck size={16} /> : <FaRegFileAlt size={16} />}
                        </span>
                        <span
                          className={`shrink-0 px-[9px] py-[3px] rounded-[7px] border text-[11.5px] font-extrabold tracking-[.03em] ${T.surface2} ${T.border} ${T.ink2}`}
                        >
                          {d.code}
                        </span>
                        <span
                          className={`flex-[1_1_calc(100%-120px)] sm:flex-1 min-w-0 text-[14.5px] font-bold break-words ${T.ink}`}
                        >
                          {d.label}
                        </span>
                        <span
                          className={`shrink-0 ml-auto px-3 py-[5px] rounded-full text-xs font-bold whitespace-nowrap ${d.done ? `${STATUS.doneBg} ${STATUS.doneInk}` : `${T.surface2} ${T.inkMuted}`}`}
                        >
                          {d.done ? 'Sudah dibuat' : 'Belum dibuat'}
                        </span>
                      </div>
                    ))
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
