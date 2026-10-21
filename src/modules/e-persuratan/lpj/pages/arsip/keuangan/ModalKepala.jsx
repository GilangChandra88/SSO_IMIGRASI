import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { ADMIN, T } from '@/utils/uiTokens';

/** Judul + subjudul + tombol tutup jendela Arsip Keuangan (.modal-head purwarupa). */
export default function ModalKepala({ id, title, subtitle, extra, onClose, disabled }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 id={id} className={ADMIN.modalTitle}>
          {title}
        </h3>
        {subtitle && <p className={`text-[12.5px] mt-1 leading-[1.5] ${T.inkMuted}`}>{subtitle}</p>}
        {extra}
      </div>
      <button
        type="button"
        className={ADMIN.modalClose}
        onClick={onClose}
        disabled={disabled}
        aria-label="Tutup"
      >
        <FaTimes size={14} />
      </button>
    </div>
  );
}
