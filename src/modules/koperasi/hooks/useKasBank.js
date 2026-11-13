import { useMemo } from 'react';
import { useBaganAkun } from './useBaganAkun';
import { useBukuBesar } from './useBukuBesar';

/**
 * Rekening kas & bank (akun ber-tanda kas) beserta saldonya, dan akun Persediaan.
 * Kembalian: { kas: [{ id, nama, kode, saldo, aktif }], persediaan, memuat, saldo }.
 */
export function useKasBank() {
  const { akun, memuat: memuatAkun } = useBaganAkun();
  const { saldo, memuat } = useBukuBesar();
  return useMemo(() => {
    const kas = akun.filter((a) => a.kas && a.aktif).map((a) => ({ ...a, saldo: saldo(a) }));
    const p = akun.find((a) => a.id === 's-persediaan');
    return {
      kas,
      persediaan: p ? { ...p, saldo: saldo(p) } : null,
      akun,
      saldo,
      memuat: memuat || memuatAkun,
    };
  }, [akun, saldo, memuat, memuatAkun]);
}
