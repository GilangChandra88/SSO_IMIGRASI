import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { animasiHalaman, arahHalaman } from './animasiHalaman';

/**
 * Pembungkus rute e-Persuratan: menganimasikan halaman setiap kali alamat (pathname) berubah —
 * geser dari kanan saat masuk lebih dalam, dari kiri saat kembali, naik-memudar saat pindah menu.
 * Halaman tidak dipasang ulang, jadi filter/isian tetap tersimpan. Perubahan query (?isi=
 * langkah form) tidak dianimasikan di sini.
 */
export default function TransisiHalaman({ children }) {
  const { pathname } = useLocation();
  const wadahRef = useRef(null);
  const isiRef = useRef(null);
  const sebelum = useRef(pathname);
  const animRef = useRef(null);

  useEffect(() => {
    const dari = sebelum.current;
    sebelum.current = pathname;
    if (dari === pathname) return;
    animRef.current?.cancel();
    animRef.current = animasiHalaman(wadahRef.current, isiRef.current, arahHalaman(dari, pathname));
  }, [pathname]);

  return (
    <div ref={wadahRef} className="min-h-full">
      <div ref={isiRef} className="min-h-full">
        {children}
      </div>
    </div>
  );
}
