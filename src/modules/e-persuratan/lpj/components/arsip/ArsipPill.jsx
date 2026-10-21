import React from 'react';
import { FaCheck, FaClock, FaLayerGroup, FaQrcode } from 'react-icons/fa';
import { STATUS_LABEL } from '../../utils/drppLogic';
import { FONT, STATUS, T } from '@/utils/uiTokens';

const TONE = {
  neutral: `${T.surface2} ${T.ink2} ${T.border}`,
  warn: `${STATUS.warnBg} ${STATUS.warnInk} border-transparent`,
  info: `${STATUS.infoBg} ${STATUS.infoInk} border-transparent`,
  good: `${STATUS.goodBg} ${STATUS.goodInk} border-transparent`,
};

/** Label status (.status-pill purwarupa). */
export default function ArsipPill({ tone, icon: Icon, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg border text-xs font-semibold leading-[1.35] whitespace-nowrap ${TONE[tone]}`}
    >
      {Icon && <Icon size={11} className="shrink-0" />}
      {children}
    </span>
  );
}

const STATUS_PILL = {
  belum_scan: { tone: 'neutral', icon: FaQrcode },
  belum_drpp: { tone: 'warn', icon: FaClock },
  masuk_drpp: { tone: 'info', icon: FaLayerGroup },
};

/** Status arsip berkas LPJ: Belum Discan / Belum Masuk DRPP / <ID DRPP>. */
export function StatusArsipPill({ status, drppId }) {
  const c = STATUS_PILL[status];
  return (
    <ArsipPill tone={c.tone} icon={c.icon}>
      {status === 'masuk_drpp' ? (
        <span className={`${FONT.mono} text-[11.5px]`}>{drppId}</span>
      ) : (
        STATUS_LABEL[status]
      )}
    </ArsipPill>
  );
}

/** Lengkap / Menunggu Kelengkapan. */
export function DrppStatusPill({ status }) {
  return status === 'lengkap' ? (
    <ArsipPill tone="good" icon={FaCheck}>
      Lengkap
    </ArsipPill>
  ) : (
    <ArsipPill tone="warn" icon={FaClock}>
      Menunggu Kelengkapan
    </ArsipPill>
  );
}
