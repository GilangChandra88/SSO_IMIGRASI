import React from 'react';
import { FaChevronLeft } from 'react-icons/fa';
import { T } from '@/utils/uiTokens';

/** Tombol "Kembali" di kiri atas halaman (pola `.link-back` purwarupa). */
export default function LinkBack({ onClick, children = 'Kembali' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[13px] font-semibold mb-[18px] ${T.ink2} hover:text-[#101A2C] dark:hover:text-[#EAF0F8] transition-colors`}
    >
      <FaChevronLeft size={11} /> {children}
    </button>
  );
}
