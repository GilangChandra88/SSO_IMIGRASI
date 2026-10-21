import { useLayoutEffect, useRef } from 'react';
import { munculBerurutan } from '@/utils/animasi';

/**
 * Daftar kartu yang punya efek sorot (terangkat/bayangan) muncul berurutan atas → bawah tanpa
 * menunda efek sorotnya: pasang `ref` pada wadah dan `data-bertahap` pada tiap kartu. Animasi
 * (Web Animations API) diulang setiap `kunci` berubah, mis. filter/pencarian atau daftar yang
 * baru selesai dimuat (`kunci` sertakan "ada isi" agar berjalan setelah data tiba).
 * Untuk elemen tanpa efek sorot cukup kelas `ANIM.muncul` + `jedaKe(i)`.
 */
export function useMunculBerurutan(kunci) {
  const ref = useRef(null);
  const terakhir = useRef(undefined);
  // Tanpa daftar dependensi: wadah bisa baru terpasang belakangan (setelah data dimuat)
  useLayoutEffect(() => {
    if (!ref.current || terakhir.current === kunci) return;
    terakhir.current = kunci;
    munculBerurutan(ref.current);
  });
  return ref;
}
