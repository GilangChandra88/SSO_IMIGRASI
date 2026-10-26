import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaArrowRight, FaCheck, FaTimes } from 'react-icons/fa';
import { FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

const LAMA_TAMPIL = 6000;

/**
 * Pemberitahuan besar setelah satu tahap selesai (PgvNotice purwarupa): berkas apa, dari tab
 * mana, pindah ke mana. Hilang sendiri setelah beberapa detik. `info` = { key, judul, id,
 * tambahan?, dari, ke } atau null.
 */
export default function Pemberitahuan({ info, onClose }) {
  useEffect(() => {
    if (!info) return;
    const t = setTimeout(onClose, LAMA_TAMPIL);
    return () => clearTimeout(t);
  }, [info, onClose]);

  if (!info) return null;
  return createPortal(
    <div className="fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] sm:bottom-7 z-[1090] flex justify-center px-4 pointer-events-none">
      <div
        key={info.key}
        role="status"
        aria-live="polite"
        className={`pointer-events-auto w-full max-w-[460px] flex items-start gap-3.5 p-[18px] pb-5 rounded-[18px] border ${T.surface} ${T.border} ${T.ink} shadow-[0_24px_60px_-16px_rgba(4,8,18,.45),0_4px_14px_rgba(4,8,18,.12)] ${ANIM.popup}`}
      >
        <span
          className={`grid place-items-center w-[46px] h-[46px] shrink-0 rounded-full ${STATUS.doneBg} ${STATUS.doneInk} ${ANIM.meletup}`}
        >
          <FaCheck size={20} />
        </span>
        <div className="flex flex-col gap-[3px] min-w-0 flex-1">
          <b className={`${FONT.head} text-[16.5px] font-extrabold leading-[1.3]`}>{info.judul}</b>
          <span className={`${FONT.mono} text-xs break-all ${T.inkMuted}`}>
            {info.id}
            {info.tambahan ? ` · ${info.tambahan}` : ''}
          </span>
          <div
            className={`flex items-center flex-wrap gap-2 mt-2.5 ${T.inkMuted}`}
            aria-label={`${info.dari} pindah ke ${info.ke}`}
          >
            <span
              className={`inline-flex px-[11px] py-1 rounded-full border text-[12.5px] font-semibold ${T.surface2} ${T.border} ${T.ink2}`}
            >
              {info.dari}
            </span>
            <FaArrowRight size={11} />
            <span
              className={`inline-flex px-[11px] py-1 rounded-full text-[12.5px] font-bold ${STATUS.doneBg} ${STATUS.doneInk}`}
            >
              {info.ke}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Tutup pemberitahuan"
          onClick={onClose}
          className={`p-1.5 -mt-1 -mr-1 rounded-lg shrink-0 ${T.inkMuted} ${T.hoverSurface2}`}
        >
          <FaTimes size={13} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
