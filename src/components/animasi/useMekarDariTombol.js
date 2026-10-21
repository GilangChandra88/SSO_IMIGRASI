import { useLayoutEffect, useRef } from 'react';
import { ambilJejakMekar, animasiMekar } from '@/utils/animasi';

/**
 * Halaman yang dibuka dari tombol bertanda `data-mekar` (mis. "Buat Sekarang" → form) tampil
 * "mekar" dari tombol itu, lalu isinya muncul bertahap dari atas ke bawah. Pasang `ref` yang
 * dikembalikan pada kartu utama halaman. Tanpa jejak tombol (dibuka lewat alamat) tidak ada efek.
 */
export function useMekarDariTombol() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    // Jejak sekali pakai: pemasangan ulang efek (StrictMode) tidak memutar animasi dua kali
    const jejak = ambilJejakMekar();
    if (jejak) animasiMekar(ref.current, jejak);
  }, []);
  return ref;
}
