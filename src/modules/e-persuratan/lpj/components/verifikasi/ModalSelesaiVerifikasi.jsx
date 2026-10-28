import React, { useState } from 'react';
import { FaCheck, FaCircleNotch, FaExclamationTriangle } from 'react-icons/fa';
import ModalTahap from './ModalTahap';
import { ADMIN, T } from '@/utils/uiTokens';

/**
 * Konfirmasi "Selesaikan Verifikasi?" (PgvConfirmModal purwarupa). Bila masih ada dokumen yang
 * belum dicentang, semuanya ditandai tercentang. `tanpaPejabat` = label pejabat (PPK/Bendahara)
 * yang belum ditetapkan di Kepegawaian. `onConfirm()` mengembalikan true bila tersimpan.
 */
export default function ModalSelesaiVerifikasi({
  pack,
  belum,
  total,
  tanpaPejabat = [],
  onClose,
  onConfirm,
}) {
  const [sibuk, setSibuk] = useState(false);

  async function ya() {
    setSibuk(true);
    const ok = await onConfirm();
    if (!ok) setSibuk(false);
  }

  return (
    <ModalTahap
      tahap="verif"
      judul="Selesaikan Verifikasi?"
      pack={pack}
      onClose={onClose}
      sibuk={sibuk}
    >
      <p className={`text-[13px] leading-[1.5] mb-3 ${T.ink2}`}>
        Yakin verifikasi berkas ini sudah selesai? Setelah itu berkas pindah ke tab Upload SAKTI dan
        hasil pemeriksaan tidak bisa diubah lagi.
      </p>
      {belum > 0 && (
        <div className={`${ADMIN.warnBanner} mb-1`}>
          <FaExclamationTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            Masih ada {belum} dari {total} dokumen yang belum dicentang. Kalau dilanjutkan, semuanya
            ditandai sudah dicentang.
          </span>
        </div>
      )}
      {tanpaPejabat.length > 0 && (
        <div className={`${ADMIN.warnBanner} mb-1`}>
          <FaExclamationTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            {tanpaPejabat.join(' dan ')} belum ditetapkan di Kepegawaian (tab Pejabat). Kalau
            dilanjutkan, Lembar Verifikasi dibekukan tanpa nama {tanpaPejabat.join(' dan ')}.
          </span>
        </div>
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
        <button type="button" className={ADMIN.btnSolid} onClick={ya} disabled={sibuk}>
          <span className="inline-flex items-center gap-2">
            {sibuk ? <FaCircleNotch size={12} className="animate-spin" /> : <FaCheck size={12} />}
            {sibuk ? 'Menyimpan…' : 'Ya, Selesaikan'}
          </span>
        </button>
      </div>
    </ModalTahap>
  );
}
