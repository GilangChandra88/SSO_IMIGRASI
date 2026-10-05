import React from 'react';
import { FaDownload, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { ADMIN, T } from '@/utils/uiTokens';

/** Jendela "Import Data MAK (CSV)" (MakImportModal purwarupa). */
export default function MakImportModal({
  fileInputRef,
  onClose,
  onDownloadTemplate,
  onSubmit,
  sibuk,
}) {
  return (
    <Modal
      widthClass="max-w-[520px]"
      onClose={sibuk ? undefined : onClose}
      labelledBy="judul-import-mak"
    >
      <form
        className={ADMIN.modalBody}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex justify-between items-start gap-3 mb-0.5">
          <h3 id="judul-import-mak" className={ADMIN.modalTitle}>
            Import Data MAK (CSV)
          </h3>
          <button
            type="button"
            className={ADMIN.modalClose}
            aria-label="Tutup"
            onClick={onClose}
            disabled={sibuk}
          >
            <FaTimes size={15} />
          </button>
        </div>
        <p className={`text-[12.5px] mt-1 mb-3.5 leading-[1.5] ${T.inkMuted}`}>
          Impor struktur MAK sekaligus dari file CSV. Sistem akan otomatis membuat hierarki dari{' '}
          <strong>Tahun</strong> hingga <strong>Item</strong> beserta <strong>Pagu</strong>.
        </p>
        <div className={ADMIN.warnBanner}>
          <FaExclamationTriangle size={12} className="shrink-0 mt-0.5" />
          <span>
            Gunakan template CSV yang disediakan. Format kode &amp; nama:{' '}
            <strong>KODE - NAMA</strong>. Pagu diisi hanya di level paling bawah (umumnya Item).
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="flex items-center gap-[5px] font-bold mt-2 underline cursor-pointer"
            >
              <FaDownload size={11} />
              Download Template
            </button>
          </span>
        </div>
        <div>
          <label className={ADMIN.label} htmlFor="import-csv">
            Upload File CSV
          </label>
          <input
            id="import-csv"
            className={ADMIN.input}
            type="file"
            accept=".csv"
            ref={fileInputRef}
          />
        </div>
        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={sibuk}>
            Batal
          </button>
          <button type="submit" className={ADMIN.btnSolid} disabled={sibuk}>
            {sibuk ? 'Mengimpor...' : 'Mulai Import'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
