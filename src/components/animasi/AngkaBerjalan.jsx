import React, { useEffect, useRef } from 'react';
import { kurangiGerakan } from '@/utils/animasi';

const bawaan = (n) => Math.round(n).toLocaleString('id-ID');

/**
 * Angka yang "berjalan" dari nilai sebelumnya ke `nilai` (kartu statistik, total rupiah).
 * Teks diperbarui lewat ref tiap frame (tanpa render ulang React); langsung tampil bila
 * "kurangi gerakan" aktif. `format(n)` mengubah angka menjadi teks (bawaan: 1.234).
 */
export default function AngkaBerjalan({ nilai, format = bawaan, durasi = 700, className = '' }) {
  const ref = useRef(null);
  const sekarang = useRef(0); // nilai yang sedang tampil

  useEffect(() => {
    const el = ref.current;
    const target = Number(nilai) || 0;
    const awal = sekarang.current;
    if (!el) return undefined;
    if (kurangiGerakan() || awal === target) {
      sekarang.current = target;
      el.textContent = format(target);
      return undefined;
    }
    let raf = 0;
    const mulai = performance.now();
    const langkah = (t) => {
      const p = Math.min((t - mulai) / durasi, 1);
      const e = 1 - (1 - p) ** 3; // ease-out
      sekarang.current = awal + (target - awal) * e;
      el.textContent = format(sekarang.current);
      if (p < 1) raf = requestAnimationFrame(langkah);
    };
    raf = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(raf);
  }, [nilai, format, durasi]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {format(0)}
    </span>
  );
}
