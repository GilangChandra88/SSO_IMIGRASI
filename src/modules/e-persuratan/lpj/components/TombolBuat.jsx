import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { useSapaan } from '../hooks/useSapaan';
import { BTN } from '@/utils/uiTokens';

/**
 * Tombol fase (mis. "Buat Surat Perintah", "Lanjutkan SPD") beraksen emas agar jelas harus diklik.
 * Setiap sapaan: kilau cahaya menyapu tombol dari kiri ke kanan, bersamaan dengan garis bingkai
 * emas yang mengembang keluar & memudar.
 * Elemen sapaan dipasang ulang lewat `key`, sehingga transisi dari `starting:` diputar lagi.
 */
export default function TombolBuat({ onClick, label = 'Buat Sekarang', ikon: Ikon = FaPlus }) {
  const ke = useSapaan();

  return (
    <span className="relative inline-flex shrink-0">
      {ke > 0 && (
        <span
          key={ke}
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-[11px] border-2 border-[#C9973B] dark:border-[#D9A94A] opacity-0 scale-x-[1.14] scale-y-[1.5] motion-safe:transition-[scale,opacity] motion-safe:duration-[900ms] motion-safe:ease-out motion-safe:starting:opacity-100 motion-safe:starting:scale-100"
        />
      )}
      <button
        type="button"
        className={`relative overflow-hidden ${BTN.action} ring-2 ring-[#C9973B] ring-offset-2 ring-offset-white dark:ring-[#D9A94A] dark:ring-offset-[#111D2E] hover:ring-[#E5B95C] shadow-[0_4px_14px_-4px_rgba(201,151,59,.7)]`}
        data-mekar
        onClick={onClick}
      >
        {ke > 0 && (
          <span
            key={ke}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-[20deg] bg-gradient-to-r from-transparent via-[rgba(255,236,190,.55)] to-transparent translate-x-[420%] motion-safe:transition-[translate] motion-safe:duration-[800ms] motion-safe:ease-out motion-safe:starting:translate-x-0"
          />
        )}
        <Ikon size={11} className="relative text-[#E5B95C]" />
        <span className="relative">{label}</span>
      </button>
    </span>
  );
}
