import React from 'react';
import { T, FONT } from '@/utils/uiTokens';

/**
 * Overlay + kartu di tengah (pola `.lpjv-overlay` / `Modal.jsx` purwarupa).
 * `widthClass` menggantikan prop `width` purwarupa, mis. 'max-w-[420px]'.
 */
export default function Modal({ onClose, widthClass = 'max-w-[440px]', labelledBy, children }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[rgba(10,18,32,.55)]"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`${FONT.body} ${T.surface} ${T.ink} w-full ${widthClass} max-h-[90vh] overflow-y-auto rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)]`}
      >
        {children}
      </div>
    </div>
  );
}
