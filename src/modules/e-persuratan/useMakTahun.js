/**
 * Pohon MAK satu tahun anggaran (`mak_node where tahunAnggaran == t`, ≤5.000 node), dibaca SATU kali
 * per sesi lewat listener bersama dan dipakai MAK Setup, form LPJ, verifikasi, dan form surat.
 */
import { useMemo } from 'react';
import { collection, limit, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { usePantauBersama } from '@/utils/usePantauBersama';

/**
 * @param {number} [tahunAnggaran]  kosong = belum dipilih (tidak membaca apa pun)
 * @returns {{ nodes: object[], byId: Record<string, object>, memuat: boolean, galat: Error|null }}
 */
export function useMakTahun(tahunAnggaran) {
  const tahun = Number.isInteger(tahunAnggaran) ? tahunAnggaran : null;
  const { data, memuat, galat } = usePantauBersama(
    tahun ? `mak_node:${tahun}` : null,
    () =>
      query(
        collection(db, KOLEKSI.makNode),
        where('tahunAnggaran', '==', tahun),
        limit(LIMIT_KUERI.makNode),
      ),
    { tahanMs: Infinity, pesan: 'Gagal memuat data MAK.' },
  );
  return useMemo(() => {
    const nodes = data || [];
    return { nodes, byId: Object.fromEntries(nodes.map((n) => [n.id, n])), memuat, galat };
  }, [data, memuat, galat]);
}
