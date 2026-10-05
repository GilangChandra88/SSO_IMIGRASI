import React from 'react';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import Modal from './Modal';
import { BTN, FONT, T } from './tokens';

/** "Tandai X selesai?" — konfirmasi sebelum sebuah fase dikunci (final). */
export default function ConfirmPopup({ docLabel = 'Surat Perintah', onYes, onNo, busy }) {
  return (
    <Modal widthClass="max-w-[420px]" onClose={onNo} labelledBy="judul-konfirmasi">
      <div className="flex gap-3.5 px-6 pt-6">
        <div className="w-[42px] h-[42px] shrink-0 rounded-full bg-[#fef9c3] text-[#92400e] flex items-center justify-center">
          <FaExclamationTriangle size={18} />
        </div>
        <div>
          <h3
            id="judul-konfirmasi"
            className={`${FONT.head} font-bold text-base text-[#0a1628] dark:text-[#EAF0F8]`}
          >
            Tandai {docLabel} selesai?
          </h3>
          <p className={`mt-1.5 text-[13px] leading-[1.55] ${T.inkMuted}`}>
            {docLabel} yang sudah ditandai selesai <strong>tidak akan bisa diedit lagi</strong>.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 px-6 pt-5 pb-6">
        <button type="button" className={BTN.ghost} onClick={onNo} disabled={busy}>
          Tidak
        </button>
        <button type="button" className={BTN.primaryDark} onClick={onYes} disabled={busy}>
          <FaCheck size={12} /> Ya, Tandai Selesai
        </button>
      </div>
    </Modal>
  );
}
