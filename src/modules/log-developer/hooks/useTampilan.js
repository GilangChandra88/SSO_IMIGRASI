import { useCallback, useEffect, useRef, useState } from 'react';
import { showToast } from '@/utils/toastStore';
import { pesanGalat } from '@/utils/pesanGalat';
import { useLogDev } from '../konteks/konteks';
import { perluKunciUlang } from '../services/logDev';

/**
 * Muat satu tampilan Log Developer lewat Function. Daftar berhalaman ("Muat lagi" memakai id baris
 * terakhir); `otomatisMs` = segarkan berkala selama tab terlihat (ringkasan & pengguna aktif).
 * Hasil: { data, daftar, nama, habis, memuat, segarkan, muatLagi }.
 */
export function useTampilan(tampilan, saring = {}, { otomatisMs = 0, ukuran = 30 } = {}) {
  const { baca } = useLogDev();
  const [keadaan, setKeadaan] = useState({ data: null, daftar: [], nama: {}, habis: true });
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const kunciSaring = JSON.stringify(saring);
  const urutan = useRef(0);

  const muat = useCallback(
    async (setelah = null, diam = false) => {
      const ke = ++urutan.current;
      if (!diam) setMemuat(true);
      try {
        const hasil = await baca(tampilan, { saring: JSON.parse(kunciSaring), setelah, ukuran });
        if (ke !== urutan.current) return; // hasil kueri lama (saring sudah berganti)
        setGalat('');
        setKeadaan((s) => ({
          data: hasil,
          daftar: setelah ? [...s.daftar, ...(hasil.daftar || [])] : hasil.daftar || [],
          nama: { ...(setelah ? s.nama : {}), ...(hasil.nama || {}) },
          habis: hasil.habis !== false,
        }));
      } catch (err) {
        if (perluKunciUlang(err) || ke !== urutan.current) return;
        const pesan = pesanGalat(err, 'Gagal memuat log.');
        // Muatan pertama gagal: tampilkan di halaman (bukan "Memuat…" selamanya)
        setGalat(pesan);
        if (!diam) showToast(pesan, 'error');
      } finally {
        if (ke === urutan.current) setMemuat(false);
      }
    },
    [baca, tampilan, kunciSaring, ukuran],
  );

  useEffect(() => {
    muat();
  }, [muat]);

  useEffect(() => {
    if (!otomatisMs) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') muat(null, true);
    }, otomatisMs);
    return () => clearInterval(id);
  }, [muat, otomatisMs]);

  const terakhir = keadaan.daftar.at(-1)?.id;
  return {
    ...keadaan,
    memuat,
    galat,
    segarkan: () => muat(),
    muatLagi: () => terakhir && muat(terakhir),
  };
}
