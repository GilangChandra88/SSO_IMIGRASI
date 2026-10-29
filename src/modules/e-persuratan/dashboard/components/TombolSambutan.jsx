import React from 'react';
import { FONT } from '@/utils/uiTokens';

/**
 * Tombol putih besar di kartu sambutan (.btn-hero-primary purwarupa): ikon emas + judul + keterangan.
 * `putar` = ikon berputar seperempat saat disorot (ikon tambah).
 */
export default function TombolSambutan({
  ikon: Ikon,
  judul,
  keterangan,
  onClick,
  putar = false,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-4 py-[17px] pl-[17px] pr-[26px] rounded-[18px] bg-white text-[#16213C] text-left shadow-[0_16px_34px_-12px_rgba(4,10,22,.5)] transition hover:-translate-y-[3px] active:-translate-y-px ${className}`}
    >
      <span className="w-[46px] h-[46px] shrink-0 rounded-[13px] flex items-center justify-center bg-gradient-to-br from-[#C9973B] to-[#A97C24] shadow-[0_5px_12px_-3px_rgba(169,124,36,.6)] transition-transform group-hover:scale-105">
        <Ikon
          size={18}
          className={`text-white ${putar ? 'motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:rotate-90' : ''}`}
        />
      </span>
      <span className="flex flex-col items-start gap-0.5 min-w-0">
        <strong className={`${FONT.head} font-extrabold text-[18.5px] leading-tight`}>
          {judul}
        </strong>
        <small className="text-[12.5px] font-semibold text-[#7C8798]">{keterangan}</small>
      </span>
    </button>
  );
}
