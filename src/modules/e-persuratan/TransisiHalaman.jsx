import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { animasiHalaman, arahHalaman } from './animasiHalaman';
import { pulihkanGulir, wadahGulir } from './gulirPintar';

/**
 * Pembungkus rute e-Persuratan: menganimasikan halaman setiap kali alamat (pathname) berubah —
 * geser dari kanan saat masuk lebih dalam, dari kiri saat kembali, naik-memudar saat pindah menu.
 * Halaman tidak dipasang ulang, jadi filter/isian tetap tersimpan. Perubahan query (?isi=
 * langkah form) tidak dianimasikan di sini.
 *
 * Gulir: halaman baru dibuka dari paling atas; saat kembali ke halaman sebelumnya (mis. Detail →
 * Daftar LPJ) posisi gulir terakhir di halaman itu dipulihkan (lihat `gulirPintar.js`).
 */
export default function TransisiHalaman({ children }) {
  const { pathname, state } = useLocation();
  const wadahRef = useRef(null);
  const isiRef = useRef(null);
  const sebelum = useRef(pathname);
  const animRef = useRef(null);
  const posisi = useRef(new Map()); // pathname → posisi gulir terakhir
  const batalPulih = useRef(null);

  // Catat posisi gulir halaman yang sedang tampil
  useEffect(() => {
    const w = wadahGulir(wadahRef.current, { bisaGulir: false });
    const catat = () => posisi.current.set(sebelum.current, w.scrollTop);
    w.addEventListener('scroll', catat, { passive: true });
    return () => {
      w.removeEventListener('scroll', catat);
      batalPulih.current?.();
    };
  }, []);

  useLayoutEffect(() => {
    const dari = sebelum.current;
    sebelum.current = pathname;
    if (dari === pathname) return;
    const arah = arahHalaman(dari, pathname);

    const w = wadahGulir(wadahRef.current, { bisaGulir: false });
    batalPulih.current?.();
    batalPulih.current = null;
    // Navigasi yang membawa state (pemberitahuan, tujuan gulir) diatur halaman tujuannya sendiri
    const lalu = posisi.current.get(pathname);
    if (arah === 'luar' && lalu && !state) {
      batalPulih.current = pulihkanGulir(w, lalu);
    } else w.scrollTop = 0;

    animRef.current?.cancel();
    animRef.current = animasiHalaman(wadahRef.current, isiRef.current, arah);
  }, [pathname, state]);

  return (
    <div ref={wadahRef} className="min-h-full">
      <div ref={isiRef} className="min-h-full">
        {children}
      </div>
    </div>
  );
}
