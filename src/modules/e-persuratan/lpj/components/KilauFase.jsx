import React from 'react';
import { useSapaan } from '../hooks/useSapaan';

/**
 * Kilau kepala blok fase yang sedang berjalan, serempak dengan sapaan tombol fase: pita cahaya
 * bergradasi warna aplikasi (biru → biru muda → emas) menyapu dari kiri ke kanan, lalu hilang.
 * Pasang di dalam kepala fase (`relative overflow-hidden`). Tidak menghalangi klik.
 */
export default function KilauFase() {
  const ke = useSapaan();
  if (ke === 0) return null;
  return (
    <span
      key={ke}
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 -skew-x-[20deg] bg-[linear-gradient(90deg,transparent,rgba(42,120,214,.16),rgba(125,182,243,.24),rgba(201,151,59,.22),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(42,120,214,.2),rgba(125,182,243,.2),rgba(217,169,74,.2),transparent)] translate-x-[400%] motion-safe:transition-[translate] motion-safe:duration-[1100ms] motion-safe:ease-out motion-safe:starting:translate-x-0"
    />
  );
}
