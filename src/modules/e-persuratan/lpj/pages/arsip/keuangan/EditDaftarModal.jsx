import React, { useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import Modal from '@/components/Modal';
import LpjChecklist from './LpjChecklist';
import ModalKepala from './ModalKepala';
import { ADMIN } from '@/utils/uiTokens';

/** Edit daftar LPJ yang tertera pada dokumen DRPP (EditExpectedModal purwarupa). */
export default function EditDaftarModal({ drpp, rows, drpps, onClose, onSave }) {
  const [sel, setSel] = useState(() =>
    Object.fromEntries((drpp.expectedLpjIds || []).map((id) => [id, true])),
  );
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  async function simpan() {
    setBusy(true);
    const ok = await onSave(Object.keys(sel).filter((k) => sel[k]));
    if (!ok) setBusy(false);
  }

  return (
    <Modal
      widthClass="max-w-[600px]"
      onClose={busy ? undefined : onClose}
      labelledBy="judul-edit-daftar"
    >
      <div className={ADMIN.modalBody}>
        <ModalKepala
          id="judul-edit-daftar"
          title={`Edit Daftar LPJ — ${drpp.id}`}
          subtitle="Sesuaikan daftar LPJ yang tertera pada dokumen DRPP ini."
          onClose={onClose}
          disabled={busy}
        />
        <LpjChecklist
          rows={rows}
          drpps={drpps}
          selected={sel}
          search={search}
          onSearch={setSearch}
          currentDrppId={drpp.id}
          onToggle={(id, v) => setSel((m) => ({ ...m, [id]: v }))}
        />
        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button type="button" className={ADMIN.btnSolid} onClick={simpan} disabled={busy}>
            <span className="inline-flex items-center gap-2">
              <FaCheck size={12} /> {busy ? 'Menyimpan…' : 'Simpan Daftar'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
