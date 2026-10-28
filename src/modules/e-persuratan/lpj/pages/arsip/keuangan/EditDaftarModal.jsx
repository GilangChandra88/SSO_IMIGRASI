import React, { useMemo, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { useRingkasPerId } from '../../../hooks/useBerkas';
import { barisLpj } from '../../../utils/drppLogic';
import LpjChecklist from './LpjChecklist';
import ModalKepala from './ModalKepala';
import { JUMLAH } from '@/utils/batas';
import { ADMIN, STATUS, T } from '@/utils/uiTokens';

/**
 * Edit daftar LPJ yang tertera pada dokumen DRPP (EditExpectedModal purwarupa). Berkas pada daftar
 * yang tidak ada di `rows` (daftar termuat halaman Arsip) dibaca sekali per ID.
 */
export default function EditDaftarModal({ drpp, rows, drpps, onClose, onSave }) {
  const [sel, setSel] = useState(() =>
    Object.fromEntries((drpp.berkasIds || []).map((id) => [id, true])),
  );
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const adaIds = new Set(rows.map((r) => r.packId));
  const tambahan = useRingkasPerId((drpp.berkasIds || []).filter((id) => !adaIds.has(id)));
  const semuaRows = useMemo(() => {
    const ada = new Set(rows.map((r) => r.packId));
    const lain = Object.values(tambahan)
      .filter((r) => r && !ada.has(r.id))
      .map(barisLpj);
    return [...rows, ...lain];
  }, [rows, tambahan]);
  const memuatIds = (drpp.berkasIds || []).filter((id) => !adaIds.has(id) && !(id in tambahan));

  async function simpan() {
    const ids = Object.keys(sel).filter((k) => sel[k]);
    if (!ids.length || ids.length > JUMLAH.berkasDrpp) {
      setErr(
        ids.length
          ? `Satu DRPP memuat paling banyak ${JUMLAH.berkasDrpp} LPJ.`
          : 'Daftar LPJ tidak boleh kosong. Batalkan DRPP bila tidak dipakai lagi.',
      );
      return;
    }
    setBusy(true);
    const ok = await onSave(ids);
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
          rows={semuaRows}
          drpps={drpps}
          selected={sel}
          search={search}
          onSearch={setSearch}
          currentDrppId={drpp.id}
          memuatIds={memuatIds}
          onToggle={(id, v) => {
            setErr('');
            setSel((m) => ({ ...m, [id]: v }));
          }}
        />
        {err && <p className={`text-xs mt-1.5 font-semibold ${STATUS.critInk}`}>{err}</p>}
        <p className={`text-[11.5px] mt-1 ${T.inkMuted}`}>
          Daftar hanya bisa diubah selama DRPP belum lengkap.
        </p>
        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button
            type="button"
            className={ADMIN.btnSolid}
            onClick={simpan}
            disabled={busy || memuatIds.length > 0}
          >
            <span className="inline-flex items-center gap-2">
              <FaCheck size={12} /> {busy ? 'Menyimpan…' : 'Simpan Daftar'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
