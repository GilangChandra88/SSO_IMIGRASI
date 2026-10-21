import React from 'react';
import { createPortal } from 'react-dom';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { useToastItems } from '@/utils/toastStore';
import { FONT, NAVY } from '@/utils/uiTokens';
import { PEGAS } from '@/utils/animasi';

/**
 * Menampilkan toast (`showToast`) di bawah tengah layar. Dirender lewat portal ke `body` agar
 * posisinya tidak terpengaruh transform leluhur (mis. animasi perpindahan halaman).
 * Masuk: melenting naik dari bawah; keluar (`keluar` dari toastStore): memudar turun.
 */
const GERAK = `motion-safe:transition-[opacity,translate,scale] motion-safe:duration-300 ${PEGAS} motion-safe:starting:opacity-0 motion-safe:starting:translate-y-5 motion-safe:starting:scale-90`;

export default function ToastViewport() {
  const toasts = useToastItems();
  return createPortal(
    <div
      aria-live="polite"
      className={`${FONT.body} fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] flex flex-col items-center gap-2 pointer-events-none`}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tipe === 'error' ? 'alert' : 'status'}
          className={`${t.tipe === 'error' ? 'bg-[#A62D2D]' : NAVY.bg} ${GERAK} ${t.keluar ? 'opacity-0 translate-y-2 scale-95' : ''} text-white rounded-[10px] px-6 py-3 text-[13.5px] font-semibold flex items-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,.3)] max-w-[90vw]`}
        >
          {t.tipe === 'error' ? (
            <FaExclamationTriangle size={13} className="shrink-0" />
          ) : (
            <FaCheck size={13} className="shrink-0" />
          )}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
