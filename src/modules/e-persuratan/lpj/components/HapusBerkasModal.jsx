import React from 'react';
import { FaExclamationTriangle, FaRegTrashAlt } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { isSkemaBaru, lpjIdOf, uraianOf } from '../utils/lpjLogic';
import { BTN, FONT, STATUS, T } from '@/utils/uiTokens';

/**
 * Popup konfirmasi hapus berkas LPJ (lihat canDeletePack). Hanya bertanya; penghapusan dan
 * animasi baris keluar dijalankan pemanggil lewat `onYa` (lihat BerkasListPage).
 */
export default function HapusBerkasModal({ pack, onClose, onYa }) {
  const nomor = lpjIdOf(pack);

  return (
    <Modal widthClass="max-w-[440px]" onClose={onClose} labelledBy="judul-hapus-berkas" animasi>
      <div className="flex gap-3.5 px-6 pt-6">
        {/* Ikon peringatan "meletup" sambil berputar, menyusul kartu yang melenting masuk */}
        <div
          className={`w-[42px] h-[42px] shrink-0 rounded-full flex items-center justify-center ${STATUS.critBg} ${STATUS.critInk} motion-safe:transition-[scale,rotate] motion-safe:duration-500 motion-safe:delay-100 motion-safe:ease-[cubic-bezier(.34,1.56,.64,1)] motion-safe:starting:scale-0 motion-safe:starting:-rotate-45`}
        >
          <FaExclamationTriangle size={18} />
        </div>
        <div className="min-w-0">
          <h3 id="judul-hapus-berkas" className={`${FONT.head} font-bold text-base ${T.ink}`}>
            Hapus berkas {nomor || 'ini'}?
          </h3>
          <p className={`mt-1.5 text-[13px] leading-[1.55] break-words ${T.inkMuted}`}>
            "{uraianOf(pack) || 'Tanpa uraian'}" beserta isinya akan{' '}
            <strong>dihapus permanen</strong> dan tidak bisa dikembalikan.
          </p>
          {!isSkemaBaru(pack) ? (
            <p className={`mt-2 text-[12.5px] leading-[1.55] ${STATUS.critInk}`}>
              Berkas format lama: seluruh dokumen suratnya (surat_items) dan catatan realisasinya di
              History MAK ikut dihapus.
            </p>
          ) : (
            nomor && (
              <p className={`mt-2 text-[12.5px] leading-[1.55] ${STATUS.critInk}`}>
                Nomor {nomor} tidak akan dipakai ulang. Berkas juga dikeluarkan dari DRPP, catatan
                realisasinya di History MAK dihapus, dan pindaian arsipnya ikut terhapus.
              </p>
            )
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 px-6 pt-5 pb-6">
        <button type="button" className={BTN.ghost} onClick={onClose}>
          Batal
        </button>
        <button type="button" className={BTN.danger} onClick={onYa}>
          <FaRegTrashAlt size={12} /> Ya, Hapus
        </button>
      </div>
    </Modal>
  );
}
