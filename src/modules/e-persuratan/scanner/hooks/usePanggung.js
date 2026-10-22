import { useEffect, useRef, useState } from 'react';

const LAMA_SELESAI = 1600; // "✓ N halaman masuk" tetap tampil sebentar (juga titik berangkat terbang)

/**
 * Panggung animasi untuk satu sumber halaman. `sumber` = { mode, nama, jumlah, hentikan } selama
 * aktif, atau null. Saat sumber berakhir:
 *  - bila `tahan` (antrean tampil kanvas belum habis) → tetap tampil dengan `menata: true`
 *    (figur terus bergerak, halaman masih terbang satu per satu dari sini);
 *  - lalu tampil `LAMA_SELESAI` ms dengan `selesai: true`, kemudian hilang.
 */
export function usePanggung(sumber, tahan = false) {
  const [panggung, setPanggung] = useState(null);
  const terakhir = useRef(null);

  useEffect(() => {
    if (sumber) {
      terakhir.current = sumber;
      setPanggung({ ...sumber, selesai: false, menata: false });
      return undefined;
    }
    const lalu = terakhir.current;
    if (!lalu) return undefined;
    if (tahan && lalu.jumlah) {
      setPanggung({ ...lalu, hentikan: null, selesai: false, menata: true });
      return undefined;
    }
    terakhir.current = null;
    if (!lalu.jumlah) {
      setPanggung(null); // dibatalkan sebelum ada halaman
      return undefined;
    }
    setPanggung({ ...lalu, hentikan: null, selesai: true, menata: false });
    const t = setTimeout(() => setPanggung(null), LAMA_SELESAI);
    return () => clearTimeout(t);
  }, [sumber, tahan]);

  return panggung;
}
