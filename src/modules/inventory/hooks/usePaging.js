import { useEffect, useMemo, useState } from 'react';

/** Paginasi sederhana. Ubah `resetKey` (mis. gabungan filter) untuk kembali ke halaman 1. */
export function usePaging(items, ukuran = 10, resetKey = '') {
  const [halaman, setHalaman] = useState(1);
  const jumlahHalaman = Math.max(1, Math.ceil(items.length / ukuran));

  useEffect(() => {
    setHalaman(1);
  }, [resetKey, ukuran]);
  useEffect(() => {
    if (halaman > jumlahHalaman) setHalaman(jumlahHalaman);
  }, [halaman, jumlahHalaman]);

  const potongan = useMemo(
    () => items.slice((halaman - 1) * ukuran, halaman * ukuran),
    [items, halaman, ukuran],
  );

  return {
    halaman,
    jumlahHalaman,
    setHalaman,
    potongan,
    total: items.length,
    dari: items.length ? (halaman - 1) * ukuran + 1 : 0,
    sampai: Math.min(halaman * ukuran, items.length),
  };
}
