import { useEffect } from 'react';

/** Panggil `tutup` saat klik di luar `ref` atau tombol Escape, selama `aktif`. */
export function useTutupLuar(ref, aktif, tutup) {
  useEffect(() => {
    if (!aktif) return undefined;
    const luar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) tutup();
    };
    const esc = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // jangan ikut menutup popup form
        tutup();
      }
    };
    document.addEventListener('pointerdown', luar);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', luar);
      document.removeEventListener('keydown', esc, true);
    };
  }, [ref, aktif, tutup]);
}
