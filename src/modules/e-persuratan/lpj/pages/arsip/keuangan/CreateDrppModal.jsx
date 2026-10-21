import React, { useState } from 'react';
import { FaArchive, FaCircleNotch } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { validasiBerkas } from '../../../services/lpjStorage';
import { DRPP_DOCS } from '../../../utils/drppLogic';
import SlotBerkas from '../../../components/arsip/SlotBerkas';
import LpjChecklist from './LpjChecklist';
import ModalKepala from './ModalKepala';
import { ADMIN, T } from '@/utils/uiTokens';

/**
 * Buat DRPP baru (CreateDrppModal purwarupa): pindai dokumen DRPP/SPM/SP2D (boleh menyusul) lalu
 * pilih LPJ yang tertera di dokumen DRPP. `onSubmit({ files, expectedIds })` → true bila berhasil.
 */
export default function CreateDrppModal({
  rows,
  drpps,
  initialExpectedIds = [],
  onClose,
  onSubmit,
}) {
  const [files, setFiles] = useState({});
  const [errs, setErrs] = useState({});
  const [expected, setExpected] = useState(() =>
    Object.fromEntries(initialExpectedIds.map((id) => [id, true])),
  );
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  function pilih(key, f) {
    if (!f) return;
    const pesan = validasiBerkas(f);
    setErrs((e) => ({ ...e, [key]: pesan }));
    if (!pesan) setFiles((x) => ({ ...x, [key]: f }));
  }

  async function submit() {
    setBusy(true);
    const ok = await onSubmit({
      files,
      expectedIds: Object.keys(expected).filter((k) => expected[k]),
    });
    if (!ok) setBusy(false);
  }

  return (
    <Modal
      widthClass="max-w-[620px]"
      onClose={busy ? undefined : onClose}
      labelledBy="judul-buat-drpp"
    >
      <div className={ADMIN.modalBody}>
        <ModalKepala
          id="judul-buat-drpp"
          title="Buat DRPP Baru"
          subtitle="Pindai dokumen DRPP, SPM & SP2D, lalu pilih LPJ yang tertera di dokumen tersebut."
          onClose={onClose}
          disabled={busy}
        />

        <div className={ADMIN.label}>Dokumen DRPP, SPM &amp; SP2D</div>
        {DRPP_DOCS.map(({ key, label }) => (
          <SlotBerkas
            key={key}
            label={label}
            file={files[key]}
            onPick={(f) => pilih(key, f)}
            disabled={busy}
            err={errs[key]}
            hint="Klik untuk memilih hasil pindaian (boleh menyusul dari halaman detail DRPP)"
          />
        ))}

        <div className={`${ADMIN.label} mt-4`}>Daftar LPJ pada Dokumen DRPP Ini</div>
        <LpjChecklist
          rows={rows}
          drpps={drpps}
          selected={expected}
          search={search}
          onSearch={setSearch}
          currentDrppId={null}
          onToggle={(id, v) => setExpected((m) => ({ ...m, [id]: v }))}
        />
        <p className={`text-[11.5px] mt-3 ${T.inkMuted}`}>
          DRPP baru dianggap lengkap setelah ketiga dokumen terpindai dan seluruh LPJ pada daftar
          ini sudah masuk (dari tab Berkas LPJ).
        </p>

        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button type="button" className={ADMIN.btnSolid} onClick={submit} disabled={busy}>
            <span className="inline-flex items-center gap-2">
              {busy ? (
                <FaCircleNotch size={12} className="animate-spin" />
              ) : (
                <FaArchive size={12} />
              )}
              {busy ? 'Membuat…' : 'Buat DRPP'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
