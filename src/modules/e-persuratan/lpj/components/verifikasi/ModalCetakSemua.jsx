import React, { useState } from 'react';
import { FaCircleNotch, FaPrint, FaRegEye, FaRegFileAlt, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { lpjIdLabel } from '../../utils/lpjLogic';
import { dokLengkap } from '../../utils/verifikasiLogic';
import { TONE } from './tahapTampil';
import { ADMIN, BTN, FONT, STATUS, T } from '@/utils/uiTokens';

/**
 * Pop-up "Cetak semua" (PgvCetakAllModal purwarupa): daftar dokumen yang akan dicetak, lalu
 * semuanya dicetak sebagai satu PDF. Dokumen tanpa template (lampiran unggahan, bukti fisik)
 * tidak ikut dicetak. `onCetak()` mengembalikan Promise.
 */
export default function ModalCetakSemua({ pack, label, docs, verif, onClose, onCetak }) {
  const [sibuk, setSibuk] = useState(false);
  const bisa = docs.filter((d) => d.cetak?.jenis === 'pdf');
  const lewat = docs.length - bisa.length;

  async function cetak() {
    setSibuk(true);
    try {
      await onCetak(bisa);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <Modal
      widthClass="max-w-[560px]"
      onClose={sibuk ? undefined : onClose}
      labelledBy="judul-cetak-semua"
    >
      <div className={ADMIN.modalBody}>
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`grid place-items-center w-10 h-10 shrink-0 rounded-xl ${TONE.verif.solid}`}
            >
              <FaPrint size={17} />
            </span>
            <div className="min-w-0">
              <h3 id="judul-cetak-semua" className={ADMIN.modalTitle}>
                Cetak {label}
              </h3>
              <p className={`${FONT.mono} text-xs mt-0.5 ${T.inkMuted}`}>
                {lpjIdLabel(pack)} · {bisa.length} dokumen
              </p>
            </div>
          </div>
          <button
            type="button"
            className={ADMIN.modalClose}
            onClick={onClose}
            disabled={sibuk}
            aria-label="Tutup"
          >
            <FaTimes size={14} />
          </button>
        </div>
        <p className={`flex items-center gap-2 mb-3 text-[12.5px] ${T.ink2}`}>
          <FaRegEye size={12} className="shrink-0" /> Cek daftar dokumen di bawah, lalu cetak. Semua
          dokumen digabung menjadi satu PDF; mencetak tidak mengubah status centang.
        </p>
        <ol className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto">
          {bisa.map((d) => (
            <li
              key={d.key}
              className={`flex items-center gap-2.5 px-3 py-[9px] rounded-[10px] border text-[13.5px] ${T.surface} ${T.border}`}
            >
              <span
                className={`grid place-items-center w-[26px] h-[26px] shrink-0 rounded-lg ${T.surface2} ${T.inkMuted}`}
              >
                <FaRegFileAlt size={11} />
              </span>
              <span className={`flex-1 min-w-0 font-semibold break-words ${T.ink}`}>{d.nama}</span>
              {dokLengkap(verif, d.key) && (
                <span
                  className={`shrink-0 px-[9px] py-0.5 rounded-full text-[11px] font-bold ${STATUS.doneBg} ${STATUS.doneInk}`}
                >
                  Sudah dicentang
                </span>
              )}
            </li>
          ))}
        </ol>
        {lewat > 0 && (
          <p className={ADMIN.hint}>
            {lewat} dokumen lain (lampiran unggahan / bukti fisik dari pelaksana) tidak dicetak dari
            sini.
          </p>
        )}
        <div className="flex justify-end mt-5">
          <button
            type="button"
            className={BTN.primaryDark}
            onClick={cetak}
            disabled={sibuk || !bisa.length}
          >
            {sibuk ? <FaCircleNotch size={12} className="animate-spin" /> : <FaPrint size={12} />}
            {sibuk ? 'Menyiapkan…' : 'Cetak'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
