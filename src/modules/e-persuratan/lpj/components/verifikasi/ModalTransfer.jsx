import React, { useState } from 'react';
import { FaCheck, FaCircleNotch } from 'react-icons/fa';
import { rupiah } from '../../utils/lpjLogic';
import { validasiBerkas } from '../../services/lpjStorage';
import SlotBerkas from '../arsip/SlotBerkas';
import ModalTahap, { KotakNilai } from './ModalTahap';
import { ADMIN, FONT, T } from '@/utils/uiTokens';

/**
 * Transfer (PgvTransferModal purwarupa): unggah bukti transfer penggantian ke pelaksana.
 * `onSave(file)` mengembalikan true bila tersimpan.
 */
export default function ModalTransfer({ pack, nom, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [sibuk, setSibuk] = useState(false);

  function pilih(f) {
    if (!f) return;
    const pesan = validasiBerkas(f);
    setErr(pesan);
    setFile(pesan ? null : f);
  }

  async function kirim() {
    if (!file) {
      setErr('Pilih file bukti transfer dulu, baru bisa dikirim.');
      return;
    }
    setSibuk(true);
    const ok = await onSave(file);
    if (!ok) setSibuk(false);
  }

  return (
    <ModalTahap
      tahap="transfer"
      judul="Transfer"
      pack={pack}
      onClose={onClose}
      sibuk={sibuk}
      tanpaTotal
    >
      <KotakNilai label="Total penggantian ke pelaksana">
        <b className={`${FONT.head} text-[17px] font-bold ${T.ink}`}>{rupiah(nom.jumlah)}</b>
      </KotakNilai>
      <p className={`text-[13px] leading-[1.5] mb-3 ${T.ink2}`}>
        Unggah bukti transfer penggantian ke pelaksana (PDF, JPG, atau PNG). Bukti ini tampil di
        kartu Status Pembayaran pada Detail LPJ pelaksana.
      </p>
      <SlotBerkas
        label="Bukti Transfer"
        file={file}
        onPick={pilih}
        disabled={sibuk}
        hint="Klik untuk memilih file (gambar/PDF, < 5 MB)"
        err={err}
      />
      <div className={ADMIN.modalActions}>
        <button
          type="button"
          className={`${ADMIN.btnGhost} sm:flex-none sm:px-6`}
          onClick={onClose}
          disabled={sibuk}
        >
          Batal
        </button>
        <button type="button" className={ADMIN.btnSolid} onClick={kirim} disabled={sibuk}>
          <span className="inline-flex items-center gap-2">
            {sibuk ? <FaCircleNotch size={12} className="animate-spin" /> : <FaCheck size={12} />}
            {sibuk ? 'Mengunggah…' : 'Kirim Bukti Transfer'}
          </span>
        </button>
      </div>
    </ModalTahap>
  );
}
