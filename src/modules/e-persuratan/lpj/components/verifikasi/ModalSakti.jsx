import React, { useState } from 'react';
import { FaCheck, FaCircleNotch, FaExclamationTriangle } from 'react-icons/fa';
import { pelaksanaOf } from '../../utils/lpjLogic';
import Kwitansi from '../arsip/Kwitansi';
import ModalTahap from './ModalTahap';
import { InfoBerkasVerif, TabelPelaksana } from './InfoBerkasVerif';
import { TabelTransaksi } from './DetailTransaksi';
import { XLBL } from './tahapTampil';
import { ADMIN, FONT, STATUS } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

// Layar sempit: jangan fokus otomatis supaya keyboard tidak langsung menutupi jendela
const layarSempit = () => window.matchMedia?.('(max-width:640px)').matches;

/**
 * Upload SAKTI (PgvSaktiModal purwarupa): informasi LPJ yang bisa digulir + isian nomor kwitansi
 * SAKTI. `onSave(nomor)` mengembalikan true bila tersimpan.
 */
export default function ModalSakti({ pack, nom, onSalin, onClose, onSave }) {
  const [no, setNo] = useState(pack.arsip?.kwitansi || '');
  const [err, setErr] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const inputId = `sakti-${pack.id}`;

  async function simpan() {
    if (!no.trim()) {
      setErr(true);
      document.getElementById(inputId)?.focus();
      return;
    }
    setSibuk(true);
    const ok = await onSave(no.trim());
    if (!ok) setSibuk(false);
  }

  const info = (
    <>
      <InfoBerkasVerif pack={pack} judul="Informasi LPJ" onSalin={onSalin} />
      <TabelPelaksana pelaksana={pelaksanaOf(pack)} />
      <div className="flex flex-col gap-2">
        <div className={XLBL}>Detail Transaksi</div>
        <TabelTransaksi nom={nom} />
      </div>
    </>
  );

  return (
    <ModalTahap
      tahap="sakti"
      judul="Upload SAKTI"
      pack={pack}
      onClose={onClose}
      sibuk={sibuk}
      gulir={info}
    >
      <label className={ADMIN.label} htmlFor={inputId}>
        Nomor Kwitansi SAKTI
      </label>
      <input
        id={inputId}
        type="text"
        value={no}
        autoFocus={!layarSempit()}
        autoComplete="off"
        aria-invalid={err}
        placeholder="00000/KW/000000/2026"
        disabled={sibuk}
        onChange={(e) => {
          setNo(e.target.value);
          if (err) setErr(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            simpan();
          }
        }}
        className={`${err ? ADMIN.inputErr : ADMIN.input} ${FONT.mono} max-sm:text-base`}
      />
      {err ? (
        <p
          role="alert"
          className={`flex items-center gap-1.5 mt-2 text-[12.5px] font-semibold ${STATUS.critInk} ${ANIM.muncul}`}
        >
          <FaExclamationTriangle size={12} /> Isi nomor kwitansi SAKTI dulu, baru bisa disimpan.
        </p>
      ) : (
        no.trim() && (
          <div className="mt-1">
            <Kwitansi value={no.trim()} />
          </div>
        )
      )}
      <div className={`${ADMIN.modalActions} mt-3.5`}>
        <button
          type="button"
          className={`${ADMIN.btnGhost} sm:flex-none sm:px-6`}
          onClick={onClose}
          disabled={sibuk}
        >
          Batal
        </button>
        <button type="button" className={ADMIN.btnSolid} onClick={simpan} disabled={sibuk}>
          <span className="inline-flex items-center gap-2">
            {sibuk ? <FaCircleNotch size={12} className="animate-spin" /> : <FaCheck size={12} />}
            {sibuk ? 'Menyimpan…' : 'Simpan Nomor Kwitansi'}
          </span>
        </button>
      </div>
    </ModalTahap>
  );
}
