import { useEffect, useRef } from 'react';

/** Panggil `tutup` saat tombol Escape ditekan (popup yang sedang terbuka). */
export function useEscape(tutup, aktif = true) {
  const ref = useRef(tutup);
  useEffect(() => {
    ref.current = tutup;
  });
  useEffect(() => {
    if (!aktif) return undefined;
    const esc = (e) => {
      if (e.key === 'Escape' && ref.current) ref.current();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aktif]);
}
