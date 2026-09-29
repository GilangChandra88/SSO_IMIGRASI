import React from 'react';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { useToastItems } from './toastStore';
import { FONT, NAVY } from './tokens';

/** Menampilkan toast LPJ di bawah tengah layar. */
export default function ToastViewport() {
  const toasts = useToastItems();
  return (
    <div
      aria-live="polite"
      className={`${FONT.body} fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] flex flex-col items-center gap-2 pointer-events-none`}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tipe === 'error' ? 'alert' : 'status'}
          className={`${t.tipe === 'error' ? 'bg-[#A62D2D]' : NAVY.bg} text-white rounded-[10px] px-6 py-3 text-[13.5px] font-semibold flex items-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,.3)] max-w-[90vw]`}
        >
          {t.tipe === 'error' ? (
            <FaExclamationTriangle size={13} className="shrink-0" />
          ) : (
            <FaCheck size={13} className="shrink-0" />
          )}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
