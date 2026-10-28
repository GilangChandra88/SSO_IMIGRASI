import React from 'react';
import { FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { ADMIN } from '@/utils/uiTokens';

/** Jendela "Copy Struktur Tahun" (MakCopyModal purwarupa): dari tahun terpilih ke tahun baru. */
export default function MakCopyModal({ dariTahun, keTahun, onChange, onClose, onSubmit, sibuk }) {
  return (
    <Modal onClose={sibuk ? undefined : onClose} labelledBy="judul-copy-tahun">
      <form
        className={ADMIN.modalBody}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex justify-between items-start gap-3 mb-0.5">
          <h3 id="judul-copy-tahun" className={ADMIN.modalTitle}>
            Copy Struktur Tahun
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
        <p className={ADMIN.modalSub}>
          Salin seluruh struktur MAK yang aktif (Program, Kegiatan, dst.) beserta Pagu dari tahun{' '}
          {dariTahun} ke tahun anggaran baru yang masih kosong. Realisasi tidak ikut disalin.
        </p>
        <div className="flex flex-col gap-[18px]">
          <div>
            <span className={ADMIN.label}>Tahun Sumber</span>
            <div className={ADMIN.kodeFixed}>{dariTahun}</div>
          </div>
          <div>
            <label className={ADMIN.label} htmlFor="copy-ke">
              Tahun Tujuan
            </label>
            <input
              id="copy-ke"
              className={ADMIN.input}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder={`misal: ${dariTahun + 1}`}
              value={keTahun}
              onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>
        </div>
        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={sibuk}>
            Batal
          </button>
          <button type="submit" className={ADMIN.btnSolid} disabled={sibuk}>
            {sibuk ? 'Menyalin...' : 'Copy Sekarang'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
