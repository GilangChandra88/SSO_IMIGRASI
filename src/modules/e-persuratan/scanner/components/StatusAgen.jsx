import React from 'react';
import {
  FaCheckCircle,
  FaCircleNotch,
  FaExclamationTriangle,
  FaPlug,
  FaSyncAlt,
} from 'react-icons/fa';
import { ADMIN, BTN, FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { ALAMAT_AGEN } from '../services/agenScanner';

/** Kartu status Agen Scanner + petunjuk bila belum terhubung. */
export default function StatusAgen({ status, info, pesan, onPeriksa }) {
  if (status === 'terhubung') {
    return (
      <div
        className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 ${STATUS.goodBg} ${ANIM.muncul}`}
      >
        <FaCheckCircle size={16} className={`shrink-0 ${STATUS.goodInk}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-bold ${STATUS.goodInk}`}>Agen Scanner terhubung</p>
          <p className={`text-[11.5px] ${T.ink2}`}>
            Versi {info?.versi} · OCR{' '}
            {info?.ocr ? `aktif (${info.bahasaOcr.join(', ')})` : 'tidak tersedia'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'memeriksa') {
    return (
      <div className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 ${T.surface2}`}>
        <FaCircleNotch size={14} className={`animate-spin ${T.inkMuted}`} />
        <p className={`text-[13px] ${T.ink2}`}>Menghubungi Agen Scanner…</p>
      </div>
    );
  }

  const ditolak = status === 'ditolak';
  return (
    <div className={`rounded-[14px] px-3.5 py-3 ${STATUS.warnBg} ${ANIM.muncul}`}>
      <div className="flex items-start gap-3">
        {ditolak ? (
          <FaExclamationTriangle size={15} className={`shrink-0 mt-0.5 ${STATUS.warnInk}`} />
        ) : (
          <FaPlug size={15} className={`shrink-0 mt-0.5 ${STATUS.warnInk}`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-bold ${STATUS.warnInk}`}>
            {ditolak ? 'Agen Scanner menolak web ini' : 'Agen Scanner belum terhubung'}
          </p>
          {ditolak ? (
            <p className={`text-[12px] mt-1 leading-[1.55] break-words ${T.ink2}`}>{pesan}</p>
          ) : (
            <ol className={`text-[12px] mt-1 leading-[1.6] list-decimal pl-4 ${T.ink2}`}>
              <li>
                Jalankan <b>Agen Scanner</b> di PC yang tersambung ke scanner (ikonnya muncul di
                area notifikasi).
              </li>
              <li>
                Bila browser menanyakan izin <b>akses jaringan lokal / perangkat lain</b>, pilih
                Izinkan.
              </li>
              <li>
                Agen mendengarkan di <span className={FONT.mono}>{ALAMAT_AGEN}</span>.
              </li>
            </ol>
          )}
        </div>
      </div>
      <button type="button" className={`${BTN.xs} mt-2.5 ml-7`} onClick={onPeriksa}>
        <FaSyncAlt size={9} /> Cek ulang
      </button>
      <p className={`${ADMIN.hint} ml-7`}>Web memeriksa ulang otomatis setiap 5 detik.</p>
    </div>
  );
}
