import { useEffect, useState } from 'react';

/** Mengikuti media query (mis. '(max-width: 1100px)') dan diperbarui saat ukuran layar berubah. */
export function useMedia(query) {
  const [cocok, setCocok] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const ubah = () => setCocok(mq.matches);
    ubah();
    mq.addEventListener('change', ubah);
    return () => mq.removeEventListener('change', ubah);
  }, [query]);
  return cocok;
}
