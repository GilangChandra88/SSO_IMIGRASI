import React from 'react';
import { createPortal } from 'react-dom';
import { T, FONT } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { useDariTombol } from '@/components/animasi';

/**
 * Overlay + kartu di tengah (pola `.lpjv-overlay` / `Modal.jsx` purwarupa).
 * `widthClass` menggantikan prop `width` purwarupa, mis. 'max-w-[420px]'.
 * `animasi` (bawaan aktif) = latar memudar masuk & kartu melenting (ANIM.latar/ANIM.popup); murni
 *   CSS lewat varian `starting:`, tanpa gerakan bila "kurangi gerakan" aktif.
 * `dariTombol` = popup "Lihat": tumbuh dari tombol yang membukanya, isinya muncul bertahap dari
 *   atas ke bawah, dan saat ditutup mengecil kembali ke tombol itu (useDariTombol).
 * Dirender lewat portal ke `body` agar posisinya tidak terpengaruh transform leluhur
 * (mis. animasi perpindahan halaman).
 */
export default function Modal({
  onClose,
  widthClass = 'max-w-[440px]',
  labelledBy,
  animasi = true,
  dariTombol = false,
  children,
}) {
  const { dialogRef, latarRef } = useDariTombol(animasi && dariTombol);
  // Popup "Lihat" (dariTombol): tumbuh dari tombol pembukanya; bukan ANIM.popup (bertumpuk)
  const kartuAnim = animasi && !dariTombol ? ANIM.popup : '';
  return createPortal(
    <div
      ref={latarRef}
      className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[rgba(10,18,32,.55)] ${animasi ? ANIM.latar : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`${FONT.body} ${T.surface} ${T.ink} w-full ${widthClass} max-h-[90vh] overflow-y-auto rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)] ${kartuAnim}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
