import React, { useState } from 'react';
import { FaExclamationTriangle, FaRegTrashAlt } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { PANJANG } from '@/utils/batas';
import { lpjIdOf, uraianOf } from '../utils/lpjLogic';
import { BTN, FONT, FORM, STATUS, T } from '@/utils/uiTokens';

/**
 * Popup konfirmasi hapus berkas LPJ (lihat canDeletePack). Berkas bernomor (hanya Super Admin)
 * wajib disertai alasan. Hanya bertanya; penghapusan dan animasi baris keluar dijalankan
 * pemanggil lewat `onYa(alasan)` (lihat BerkasListPage).
 */
export default function HapusBerkasModal({ pack, onClose, onYa }) {
  const nomor = lpjIdOf(pack);
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState(false);

  const ya = () => {
    if (nomor && !alasan.trim()) {
      setGalat(true);
      return;
    }
    onYa(alasan.trim());
  };

  return (
    <Modal widthClass="max-w-[440px]" onClose={onClose} labelledBy="judul-hapus-berkas" animasi>
      <div className="flex gap-3.5 px-6 pt-6">
        {/* Ikon peringatan "meletup" sambil berputar, menyusul kartu yang melenting masuk */}
        <div
          className={`w-[42px] h-[42px] shrink-0 rounded-full flex items-center justify-center ${STATUS.critBg} ${STATUS.critInk} motion-safe:transition-[scale,rotate] motion-safe:duration-500 motion-safe:delay-100 motion-safe:ease-[cubic-bezier(.34,1.56,.64,1)] motion-safe:starting:scale-0 motion-safe:starting:-rotate-45`}
        >
          <FaExclamationTriangle size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="judul-hapus-berkas" className={`${FONT.head} font-bold text-base ${T.ink}`}>
            Hapus berkas {nomor || 'ini'}?
          </h3>
          <p className={`mt-1.5 text-[13px] leading-[1.55] break-words ${T.inkMuted}`}>
            "{uraianOf(pack) || 'Tanpa uraian'}" beserta isi dan berkas unggahannya akan{' '}
            <strong>dihapus permanen</strong> dan tidak bisa dikembalikan.
          </p>
          {nomor && (
            <>
              <p className={`mt-2 text-[12.5px] leading-[1.55] ${STATUS.critInk}`}>
                Nomor {nomor} tidak akan dipakai ulang. Realisasinya di History MAK dibatalkan
                (tidak dihapus) dan tidak lagi dihitung di Rekap.
              </p>
              <label htmlFor="alasan-hapus" className={`${FORM.label} mt-3`}>
                Alasan penghapusan <span className="text-[#ef4444]">*</span>
              </label>
              <textarea
                id="alasan-hapus"
                rows={2}
                maxLength={PANJANG.alasanBatal}
                value={alasan}
                aria-invalid={galat || undefined}
                onChange={(e) => {
                  setAlasan(e.target.value);
                  setGalat(false);
                }}
                className={`${FORM.textarea} ${galat ? FORM.borderErr : FORM.borderOk}`}
                autoFocus
              />
              {galat && <p className={FORM.err}>Alasan wajib diisi untuk berkas bernomor.</p>}
            </>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 px-6 pt-5 pb-6">
        <button type="button" className={BTN.ghost} onClick={onClose}>
          Batal
        </button>
        <button type="button" className={BTN.danger} onClick={ya}>
          <FaRegTrashAlt size={12} /> Ya, Hapus
        </button>
      </div>
    </Modal>
  );
}
