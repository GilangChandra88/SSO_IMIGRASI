import { useMemo } from 'react';
import { collection, limit, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { usePantauBersama } from '@/utils/usePantauBersama';

const OPSI = { tahanMs: 10 * 60_000, pesan: 'Rekap pembukuan gagal dimuat.' };

/** Semua dokumen rekap (`{tahun}` & `total`) sebagai { [id]: data }. */
export function useRekap() {
  const { data, memuat } = usePantauBersama(
    'koperasi_rekap:semua',
    () => query(collection(db, KOLEKSI.koperasiRekap), limit(LIMIT_KUERI.rekapKoperasi)),
    OPSI,
  );
  const rekap = useMemo(() => Object.fromEntries((data || []).map((d) => [d.id, d])), [data]);
  return { rekap, memuat };
}

/** Semua dokumen rekap anggota per tahun sebagai { [tahun]: { anggota } }. */
export function useRekapAnggota() {
  const { data, memuat } = usePantauBersama(
    'koperasi_rekap_anggota:semua',
    () => query(collection(db, KOLEKSI.koperasiRekapAnggota), limit(LIMIT_KUERI.rekapKoperasi)),
    OPSI,
  );
  const rekap = useMemo(() => Object.fromEntries((data || []).map((d) => [d.id, d])), [data]);
  return { rekap, memuat };
}
