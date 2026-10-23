import { useEffect, useState } from 'react';
import { kurangiGerakan } from '@/utils/animasi';

const SAPA_AWAL_MS = 700; // sapaan pertama setelah halaman tampil
const JEDA_MS = 2500; // lalu menyapa lagi setiap selang ini (juga saat pengguna menggulir/mengetik)

/**
 * Sapaan (tombol fase & kepala blok fase aktif): naik 1 setiap kali perlu "menyapa" — sekali
 * setelah tampil, lalu setiap JEDA_MS. Tiap sapaan satu gerakan singkat dengan jeda di antaranya
 * (animasi berulang untuk penanda yang perlu diperhatikan, lihat CLAUDE.md §5). Pemakai yang
 * dipasang bersamaan menyapa serempak. Tidak berjalan bila "kurangi gerakan" aktif.
 */
export function useSapaan() {
  const [ke, setKe] = useState(0);
  useEffect(() => {
    if (kurangiGerakan()) return;
    const sapa = () => setKe((k) => k + 1);
    let interval = null;
    const awal = setTimeout(() => {
      sapa();
      interval = setInterval(sapa, JEDA_MS);
    }, SAPA_AWAL_MS);
    return () => {
      clearTimeout(awal);
      clearInterval(interval);
    };
  }, []);
  return ke;
}
