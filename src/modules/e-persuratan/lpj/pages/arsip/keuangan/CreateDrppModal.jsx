import React, { useState } from 'react';
import { FaArchive, FaCircleNotch } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { cekBerkasDipilih } from '../../../services/unggahan';
import { DRPP_DOCS } from '../../../utils/drppLogic';
import SlotBerkas from '../../../components/arsip/SlotBerkas';
import LpjChecklist from './LpjChecklist';
import ModalKepala from './ModalKepala';
import { JUMLAH } from '@/utils/batas';
import { ADMIN, STATUS, T } from '@/utils/uiTokens';

/**
 * Buat DRPP baru (CreateDrppModal purwarupa): pindai dokumen DRPP/SPM/SP2D (boleh menyusul) lalu
 * pilih LPJ yang tertera di dokumen DRPP (1–100 LPJ). `onSubmit({ files, expectedIds })` → true
 * bila berhasil; dokumen diunggah setelah nomor DRPP terbit.
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
  const [errDaftar, setErrDaftar] = useState('');

  function pilih(key, f) {
    if (!f) return;
    const pesan = cekBerkasDipilih('keuangan', f);
    setErrs((e) => ({ ...e, [key]: pesan }));
    if (!pesan) setFiles((x) => ({ ...x, [key]: f }));
  }

  async function submit() {
    const expectedIds = Object.keys(expected).filter((k) => expected[k]);
    if (!expectedIds.length || expectedIds.length > JUMLAH.berkasDrpp) {
      setErrDaftar(
        expectedIds.length
          ? `Satu DRPP memuat paling banyak ${JUMLAH.berkasDrpp} LPJ.`
          : 'Pilih minimal satu LPJ yang tertera di dokumen DRPP.',
      );
      return;
    }
    setBusy(true);
    const ok = await onSubmit({ files, expectedIds });
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
          onToggle={(id, v) => {
            setErrDaftar('');
            setExpected((m) => ({ ...m, [id]: v }));
          }}
        />
        {errDaftar && (
          <p className={`text-xs mt-1.5 font-semibold ${STATUS.critInk}`}>{errDaftar}</p>
        )}
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
