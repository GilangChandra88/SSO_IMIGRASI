import React from 'react';
import { FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { ADMIN, FONT } from '@/utils/uiTokens';

/**
 * Jendela Tambah/Edit node (MakNodeModal purwarupa): Kode, Nama / Uraian, dan Pagu (hanya
 * tingkat terakhir bila `denganPagu`).
 * @param {{ mode: 'add'|'edit', type: string, kode: string, name: string, pagu: string|number, error: boolean }} data
 */
export default function NodeModal({ data, setData, denganPagu, onTutup, onSimpan, sibuk }) {
  const ubah = (patch) => setData({ ...data, ...patch });
  return (
    <Modal onClose={sibuk ? undefined : onTutup} labelledBy="judul-node">
      <form
        className={ADMIN.modalBody}
        onSubmit={(e) => {
          e.preventDefault();
          onSimpan();
        }}
      >
        <div className="flex justify-between items-start gap-3 mb-0.5">
          <h3 id="judul-node" className={ADMIN.modalTitle}>
            {data.mode === 'edit' ? `Edit ${data.type}` : `Tambah ${data.type}`}
          </h3>
          <button
            type="button"
            className={ADMIN.modalClose}
            aria-label="Tutup"
            onClick={onTutup}
            disabled={sibuk}
          >
            <FaTimes size={15} />
          </button>
        </div>
        <p className={ADMIN.modalSub}>
          {data.mode === 'edit'
            ? `Mengubah data pada level ${data.type}.`
            : `Menambahkan data baru pada level ${data.type}.`}
        </p>
        <div className="flex flex-col gap-[18px]">
          <div>
            <label className={ADMIN.label} htmlFor="node-kode">
              Kode
            </label>
            <input
              id="node-kode"
              className={ADMIN.input}
              type="text"
              placeholder="misal: 000001"
              value={data.kode}
              onChange={(e) => ubah({ kode: e.target.value })}
            />
          </div>
          <div>
            <label className={ADMIN.label} htmlFor="node-nama">
              Nama / Uraian
            </label>
            <input
              id="node-nama"
              className={data.error ? ADMIN.inputErr : ADMIN.input}
              type="text"
              placeholder="Nama item"
              value={data.name}
              aria-invalid={data.error || undefined}
              onChange={(e) => ubah({ name: e.target.value, error: false })}
              autoFocus
            />
          </div>
          {denganPagu && (
            <div>
              <label className={ADMIN.label} htmlFor="node-pagu">
                Pagu (Rp)
              </label>
              <input
                id="node-pagu"
                className={`${ADMIN.input} ${FONT.mono}`}
                type="number"
                min="0"
                placeholder="0"
                value={data.pagu}
                onChange={(e) => ubah({ pagu: e.target.value })}
              />
            </div>
          )}
        </div>
        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onTutup} disabled={sibuk}>
            Batal
          </button>
          <button type="submit" className={ADMIN.btnSolid} disabled={sibuk}>
            {sibuk ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
