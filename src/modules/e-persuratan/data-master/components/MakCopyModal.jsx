import React from 'react';
import { FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { ADMIN } from '@/utils/uiTokens';

/** Jendela "Copy Struktur Tahun" (MakCopyModal purwarupa). */
export default function MakCopyModal({ state, tahunList, onChange, onClose, onSubmit, sibuk }) {
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
          Salin seluruh struktur MAK (Program, Kegiatan, dst.) beserta Pagu dari tahun sumber ke
          tahun tujuan baru. Lock Pagu akan direset ke 0.
        </p>
        <div className="flex flex-col gap-[18px]">
          <div>
            <label className={ADMIN.label} htmlFor="copy-dari">
              Tahun Sumber
            </label>
            <select
              id="copy-dari"
              className={ADMIN.input}
              value={state.from}
              onChange={(e) => onChange({ ...state, from: e.target.value })}
            >
              <option value="">-- Pilih Tahun Sumber --</option>
              {tahunList.map((n) => (
                <option value={n.id} key={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
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
              placeholder="misal: 2027"
              value={state.to}
              onChange={(e) => onChange({ ...state, to: e.target.value })}
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
