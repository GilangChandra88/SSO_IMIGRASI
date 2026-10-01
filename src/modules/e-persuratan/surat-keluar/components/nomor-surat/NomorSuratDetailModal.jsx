import React from 'react';
import { FaCopy, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { ADMIN, FONT, T } from '@/utils/uiTokens';
import { formatTanggalNomor, kodeKop, kodeLanjutan } from './nomorSuratTampil';

/** Jendela "Lihat" satu nomor surat register. */
export default function NomorSuratDetailModal({ row, onClose }) {
  const salin = async () => {
    try {
      await navigator.clipboard.writeText(row.nomor);
      showToast('Nomor surat disalin.');
    } catch {
      showToast('Gagal menyalin nomor surat.', 'error');
    }
  };

  const baris = [
    ['Tanggal', formatTanggalNomor(row.tanggal)],
    ['Seksi', row.seksi || '-'],
    ['KOP', kodeKop(row)],
    ['Kode Surat', kodeLanjutan(row)],
    ['Perihal', row.perihal || '-'],
    ['Tujuan', row.tujuan || '-'],
    ['Dibuat oleh', row.createdByNama || '-'],
    ['Dibuat pada', row.createdAt ? new Date(row.createdAt).toLocaleString('id-ID') : '-'],
  ];

  return (
    <Modal onClose={onClose} widthClass="max-w-[480px]" labelledBy="judul-detail-nomor">
      <div className={ADMIN.modalBody}>
        <div className="flex justify-between items-start gap-3 mb-0.5">
          <h3 id="judul-detail-nomor" className={ADMIN.modalTitle}>
            Detail Nomor Surat
          </h3>
          <button type="button" className={ADMIN.modalClose} aria-label="Tutup" onClick={onClose}>
            <FaTimes size={15} />
          </button>
        </div>
        <p className={`${FONT.mono} text-[13px] font-semibold mt-1 mb-[18px] break-all ${T.ink2}`}>
          {row.nomor}
        </p>
        <div>
          {baris.map(([label, nilai]) => (
            <div className={ADMIN.viewRow} key={label}>
              <span className={`shrink-0 ${T.inkMuted}`}>{label}</span>
              <span className="font-semibold text-right break-words min-w-0">{nilai}</span>
            </div>
          ))}
        </div>
        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose}>
            Tutup
          </button>
          <button type="button" className={ADMIN.btnSolid} onClick={salin}>
            <span className="inline-flex items-center gap-2">
              <FaCopy size={12} />
              Salin Nomor
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
