import React, { useState } from 'react';
import { FaCircleNotch, FaDownload, FaPrint, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import LembarVerifikasiSheet from './LembarVerifikasiSheet';
import { ADMIN, BTN, T } from '@/utils/uiTokens';

/**
 * Pop-up "Lihat" Lembar Verifikasi (LembarPreviewModal purwarupa): pratinjau lembar, lalu Unduh
 * atau Cetak PDF. `onPdf('cetak'|'unduh')` mengembalikan Promise.
 */
export default function ModalLembar({ data, onClose, onPdf }) {
  const [sibuk, setSibuk] = useState('');

  async function jalankan(mode) {
    setSibuk(mode);
    try {
      await onPdf(mode);
    } finally {
      setSibuk('');
    }
  }

  return (
    <Modal
      widthClass="max-w-[760px]"
      onClose={sibuk ? undefined : onClose}
      labelledBy="judul-lembar"
      dariTombol
    >
      <div className="flex flex-col max-h-[90vh]">
        <div
          className={`flex items-center justify-between gap-3 px-[22px] py-4 border-b ${T.border}`}
        >
          <h3 id="judul-lembar" className={ADMIN.modalTitle}>
            Lembar Verifikasi{data.id ? ` — ${data.id}` : ''}
          </h3>
          <button type="button" className={ADMIN.modalClose} onClick={onClose} aria-label="Tutup">
            <FaTimes size={14} />
          </button>
        </div>
        <div className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-[22px] ${T.surface2}`}>
          <LembarVerifikasiSheet data={data} />
        </div>
        <div className={`flex justify-end gap-2 px-[22px] py-3.5 border-t ${T.border}`}>
          <button
            type="button"
            className={`${BTN.ghost} max-sm:flex-1`}
            onClick={() => jalankan('unduh')}
            disabled={!!sibuk}
          >
            {sibuk === 'unduh' ? (
              <FaCircleNotch size={12} className="animate-spin" />
            ) : (
              <FaDownload size={12} />
            )}{' '}
            Unduh
          </button>
          <button
            type="button"
            className={`${BTN.primaryDark} max-sm:flex-1`}
            onClick={() => jalankan('cetak')}
            disabled={!!sibuk}
          >
            {sibuk === 'cetak' ? (
              <FaCircleNotch size={12} className="animate-spin" />
            ) : (
              <FaPrint size={12} />
            )}{' '}
            Cetak
          </button>
        </div>
      </div>
    </Modal>
  );
}
