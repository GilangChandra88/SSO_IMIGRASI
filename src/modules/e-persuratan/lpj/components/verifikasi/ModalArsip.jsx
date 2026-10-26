import React, { useState } from 'react';
import { FaArchive, FaCircleNotch } from 'react-icons/fa';
import { lpjIdLabel } from '../../utils/lpjLogic';
import { BERKAS_LABEL } from '../../utils/drppLogic';
import { validasiBerkas } from '../../services/lpjStorage';
import Kwitansi from '../arsip/Kwitansi';
import SlotBerkas from '../arsip/SlotBerkas';
import ModalTahap, { KotakNilai } from './ModalTahap';
import { ADMIN, T } from '@/utils/uiTokens';

/**
 * Arsip Berkas (PgvArsipModal purwarupa): unggah pindaian seluruh berkas LPJ sebagai satu
 * dokumen gabungan. Setelah diarsipkan berkas pindah ke menu Arsip (status "Belum Masuk DRPP",
 * atau langsung masuk DRPP yang mencantumkannya). `onSave(file)` mengembalikan true bila tersimpan.
 */
export default function ModalArsip({ pack, pendingDrppId, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const no = pack.arsip?.kwitansi || '';

  function pilih(f) {
    if (!f) return;
    const pesan = validasiBerkas(f);
    setErr(pesan);
    setFile(pesan ? null : f);
  }

  async function arsipkan() {
    if (!file) {
      setErr('Pilih berkas hasil pindaian dulu, baru bisa diarsipkan.');
      return;
    }
    setSibuk(true);
    const ok = await onSave(file);
    if (!ok) setSibuk(false);
  }

  return (
    <ModalTahap tahap="arsip" judul="Arsip Berkas" pack={pack} onClose={onClose} sibuk={sibuk}>
      <KotakNilai label="Nomor Kwitansi SAKTI">
        {no ? <Kwitansi value={no} /> : <b className={T.ink}>—</b>}
      </KotakNilai>
      <p className={`text-[13px] leading-[1.5] mb-3 ${T.ink2}`}>
        Arsipkan berkas LPJ {lpjIdLabel(pack)}
        {no ? ` dengan nomor kwitansi SAKTI ${no}` : ''}. Pindai seluruh berkas fisik sebagai satu
        dokumen (mis. lewat menu Scanner), lalu unggah hasilnya di sini. Setelah diarsipkan, berkas
        pindah ke menu Arsip.
      </p>
      <SlotBerkas
        label={BERKAS_LABEL(pack)}
        file={file}
        onPick={pilih}
        disabled={sibuk}
        err={err}
      />
      {pendingDrppId && (
        <p className={ADMIN.hint}>
          Berkas ini tercantum di daftar <b>{pendingDrppId}</b> dan otomatis masuk ke sana setelah
          diarsipkan.
        </p>
      )}
      <div className={ADMIN.modalActions}>
        <button
          type="button"
          className={`${ADMIN.btnGhost} sm:flex-none sm:px-6`}
          onClick={onClose}
          disabled={sibuk}
        >
          Batal
        </button>
        <button type="button" className={ADMIN.btnSolid} onClick={arsipkan} disabled={sibuk}>
          <span className="inline-flex items-center gap-2">
            {sibuk ? <FaCircleNotch size={12} className="animate-spin" /> : <FaArchive size={12} />}
            {sibuk ? 'Mengunggah…' : 'Arsipkan Berkas'}
          </span>
        </button>
      </div>
    </ModalTahap>
  );
}
