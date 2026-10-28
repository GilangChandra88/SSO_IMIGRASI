import { useEffect, useState } from 'react';
import { ambilBlob } from './berkasStorage';

const KOSONG = { url: '', memuat: false, galat: null };

/**
 * URL lokal (blob:) untuk menampilkan berkas Storage di <img> atau unduhan, tanpa link publik.
 * URL dilepas saat komponen dilepas atau path berganti.
 * @param {string} [path]
 * @returns {{ url: string, memuat: boolean, galat: Error|null }}
 */
export function useUrlBerkas(path) {
  const [keadaan, setKeadaan] = useState(() => (path ? { ...KOSONG, memuat: true } : KOSONG));

  useEffect(() => {
    if (!path) {
      setKeadaan(KOSONG);
      return undefined;
    }
    let aktif = true;
    let url = '';
    setKeadaan({ ...KOSONG, memuat: true });
    ambilBlob(path).then(
      (blob) => {
        if (!aktif) return;
        url = URL.createObjectURL(blob);
        setKeadaan({ url, memuat: false, galat: null });
      },
      (galat) => {
        if (aktif) setKeadaan({ url: '', memuat: false, galat });
      },
    );
    return () => {
      aktif = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  return keadaan;
}
