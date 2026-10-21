import React from 'react';

/**
 * Membuka/menutup tinggi isi dengan halus (trik grid-rows 1fr ↔ 0fr, tanpa menganimasikan
 * `height`). Dipakai untuk baris yang muncul/hilang, panel ringkasan, dan bagian yang dilipat.
 * - `buka`: true = terlihat. Saat tertutup isinya disembunyikan dari pembaca layar & klik.
 * - `wadahRef`: elemen luar (dipakai animasiMasuk/animasiHapus di `@/utils/animasi`).
 * Tanpa gerakan bila "kurangi gerakan" aktif.
 */
export default function Lipat({ buka = true, wadahRef, className = '', children }) {
  return (
    <div
      ref={wadahRef}
      aria-hidden={!buka || undefined}
      inert={!buka || undefined}
      className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-out ${
        buka ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
      } ${className}`}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}
