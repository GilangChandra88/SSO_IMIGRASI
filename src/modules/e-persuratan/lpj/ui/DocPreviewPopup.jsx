import React from 'react';
import { FaRegFileAlt, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { BTN, FONT, T } from '@/utils/uiTokens';

/**
 * Pratinjau placeholder untuk dokumen yang belum punya template PDF
 * (sama seperti DocPreviewPopup purwarupa).
 */
export default function DocPreviewPopup({ label, onClose }) {
  return (
    <Modal widthClass="max-w-[520px]" onClose={onClose} labelledBy="judul-pratinjau">
      <div className={`flex items-center justify-between px-[22px] py-[18px] border-b ${T.border}`}>
        <h3 id="judul-pratinjau" className={`${FONT.head} font-bold text-[15px] ${T.ink}`}>
          Pratinjau Dokumen
        </h3>
        <button type="button" onClick={onClose} aria-label="Tutup" className={T.inkMuted}>
          <FaTimes size={15} />
        </button>
      </div>
      <div className="p-7 text-center">
        <div
          className={`w-14 h-14 rounded-[14px] mx-auto mb-3.5 flex items-center justify-center ${T.surface2} ${T.inkMuted}`}
        >
          <FaRegFileAlt size={24} />
        </div>
        <div className={`text-sm font-bold mb-1 ${T.ink}`}>{label}</div>
        <p className={`text-[12.5px] ${T.inkMuted}`}>
          Pratinjau dokumen — template cetak untuk dokumen ini belum tersedia.
        </p>
      </div>
      <div className="flex justify-end px-[22px] pb-[22px]">
        <button type="button" className={BTN.ghost} onClick={onClose}>
          Tutup
        </button>
      </div>
    </Modal>
  );
}
