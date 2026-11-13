import { useCallback, useMemo } from 'react';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { hitungSaldo } from '../data/baganAkun';
import { refRekap, refSaldoAwal } from '../services/bukuDb';

const OPSI = { tahanMs: 10 * 60_000, pesan: 'Buku besar gagal dimuat.' };

/**
 * Saldo terkini setiap akun: saldo awal + total sepanjang masa (`koperasi_rekap/total`).
 * Kembalian: { saldoAwal, memuat, saldo(akun) }.
 */
export function useBukuBesar() {
  const sa = usePantauBersama('koperasi_saldo_awal', refSaldoAwal, OPSI);
  const total = usePantauBersama('koperasi_rekap:total', () => refRekap('total'), OPSI);
  const gerak = useMemo(() => total.data?.akun || {}, [total.data]);
  const awal = useMemo(() => sa.data?.saldo || {}, [sa.data]);
  const saldo = useCallback(
    (akun) => {
      const g = gerak[akun.id] || {};
      return hitungSaldo(akun, awal[akun.id] || 0, g.d || 0, g.k || 0);
    },
    [gerak, awal],
  );
  return { saldoAwal: sa.data, memuat: sa.memuat || total.memuat, saldo };
}
