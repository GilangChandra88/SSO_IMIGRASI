import React, { useState } from 'react';
import { FaCheck, FaCircleNotch } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { validasiBerkas } from '../../../services/lpjStorage';
import { BERKAS_LABEL } from '../../../utils/drppLogic';
import Kwitansi from '../../../components/arsip/Kwitansi';
import SlotBerkas from '../../../components/arsip/SlotBerkas';
import ModalKepala from './ModalKepala';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';

/**
 * Scan berkas LPJ (satu dokumen gabungan) + no. kwitansi SAKTI (ScanLpjModal purwarupa).
 * `onSave({ file, kwitansi })` mengunggah & menyimpan; mengembalikan true bila berhasil.
 */
export default function ScanLpjModal({ row, pendingDrppId, onClose, onSave }) {
  const ganti = !!row.scan;
  const [file, setFile] = useState(null);
  const [kw, setKw] = useState(row.kwitansi);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);

  function pilih(f) {
    if (!f) return;
    const pesan = validasiBerkas(f);
    setErr((e) => ({ ...e, file: pesan }));
    setFile(pesan ? null : f);
  }

  async function simpan() {
    const e = {};
    if (!file) e.file = 'Pilih berkas hasil pindaian.';
    if (!kw.trim()) e.kw = 'No. kwitansi SAKTI wajib diisi.';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await onSave({ file, kwitansi: kw });
    if (!ok) setBusy(false);
  }

  return (
    <Modal
      widthClass="max-w-[540px]"
      onClose={busy ? undefined : onClose}
      labelledBy="judul-scan-lpj"
    >
      <div className={ADMIN.modalBody}>
        <ModalKepala
          id="judul-scan-lpj"
          title={`${ganti ? 'Ganti Scan' : 'Scan Berkas'} — ${row.id}`}
          subtitle={row.uraian}
          onClose={onClose}
          disabled={busy}
        />
        <p className={`text-[12.5px] mb-3.5 ${T.ink2}`}>
          Berbeda dari e-Persuratan yang memindai per jenis surat, di Arsip seluruh berkas LPJ ini
          dipindai sekaligus sebagai satu dokumen gabungan.
        </p>
        <SlotBerkas
          label={BERKAS_LABEL(row.pack)}
          file={file}
          onPick={pilih}
          disabled={busy}
          err={err.file}
        />

        <label className={`${ADMIN.label} mt-3`} htmlFor="kw-scan">
          No. Kwitansi SAKTI
        </label>
        <input
          id="kw-scan"
          value={kw}
          onChange={(e) => {
            setKw(e.target.value);
            setErr((x) => ({ ...x, kw: '' }));
          }}
          placeholder="00000/KW/000000/2026"
          className={`${err.kw ? ADMIN.inputErr : ADMIN.input} ${FONT.mono}`}
        />
        {err.kw ? (
          <p className={`text-xs mt-1.5 font-semibold ${STATUS.critInk}`}>{err.kw}</p>
        ) : (
          kw.trim() && (
            <div className="mt-1">
              <Kwitansi value={kw.trim()} />
            </div>
          )
        )}

        {pendingDrppId && !ganti && (
          <p className={ADMIN.hint}>
            Berkas ini tercantum di daftar <b>{pendingDrppId}</b> dan otomatis masuk ke sana setelah
            dipindai.
          </p>
        )}

        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button type="button" className={ADMIN.btnSolid} onClick={simpan} disabled={busy}>
            <span className="inline-flex items-center gap-2">
              {busy ? <FaCircleNotch size={12} className="animate-spin" /> : <FaCheck size={12} />}
              {busy ? 'Mengunggah…' : 'Simpan & Tandai Selesai'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
