/**
 * Rekap realisasi per Item satu tahun anggaran (`mak_rekap/{tahun}`, ditulis Cloud Function di
 * transaksi yang sama dengan realisasi). Dipakai Rekap MAK, History MAK, dan POK verifikasi LPJ.
 */
import { doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { usePantauBersama } from '@/utils/usePantauBersama';

/** @param {number|null} tahun  null = tidak membaca apa pun */
export function useRekapMak(tahun) {
  const { data, memuat, galat } = usePantauBersama(
    Number.isInteger(tahun) ? `mak_rekap:${tahun}` : null,
    () => doc(db, KOLEKSI.makRekap, String(tahun)),
    { tahanMs: 5 * 60_000, pesan: 'Gagal memuat rekap realisasi.' },
  );
  return { rekap: data, memuat, galat };
}
