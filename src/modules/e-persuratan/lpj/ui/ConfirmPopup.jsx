import React from 'react';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { BTN, FONT, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

/**
 * "Tandai X selesai?" — konfirmasi sebelum sebuah fase ditandai selesai. Fase yang selesai masih
 * bisa diedit sampai berkas diarsip Keuangan. `pesan` (opsional) menggantikan keterangan bawaan.
 */
export default function ConfirmPopup({ docLabel = 'Surat Perintah', pesan, onYes, onNo, busy }) {
  return (
    <Modal widthClass="max-w-[420px]" onClose={onNo} labelledBy="judul-konfirmasi">
      <div className="flex gap-3.5 px-6 pt-6">
        <div
          className={`w-[42px] h-[42px] shrink-0 rounded-full bg-[#fef9c3] text-[#92400e] flex items-center justify-center ${ANIM.meletup} motion-safe:delay-100`}
        >
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
            {pesan || (
              <>
                Fase berikutnya akan terbuka. {docLabel} masih bisa diedit lewat tombol{' '}
                <strong>Edit</strong> di Detail LPJ sampai berkas diarsip Keuangan.
              </>
            )}
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
