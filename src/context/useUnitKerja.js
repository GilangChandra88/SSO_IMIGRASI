/**
 * Struktur unit kerja kantor (`pegawai_unit`, docs/skema-database.md §5.1), diatur Kepegawaian di
 * tab Unit Kerja. Dibaca semua modul lewat listener bersama (≤200 unit) dan menggantikan daftar
 * seksi tetap: pilihan "Seksi / Bagian" di SPD, Nomor Surat, dan Inventory berasal dari sini.
 *
 * Tingkat: kantor (0) → subbagian/seksi (1) → urusan/subseksi (2). "Seksi" seorang pegawai = unit
 * bagiannya: seksi, subbagian, atau urusan; anggota subseksi ikut seksinya, pimpinan ikut kantor.
 */
import { useMemo } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { JENIS_BAGIAN, labelUnit, susunPohon } from '@/utils/unitKerja';

export * from '@/utils/unitKerja';

const sumber = () =>
  query(collection(db, KOLEKSI.pegawaiUnit), orderBy('urutan'), limit(LIMIT_KUERI.masterPegawai));

/**
 * @returns {{ semua: object[], pohon: object[], aktif: object[], byId: Record<string, object>,
 *   pilihanSeksi: string[], memuat: boolean, galat: Error|null }}
 *   pohon = semua unit urut pohon (+ kedalaman); aktif = pohon yang aktif; pilihanSeksi = label
 *   unit bagian yang aktif (untuk pilihan "Seksi / Bagian" di modul lain)
 */
export function useUnitKerja() {
  const { data, memuat, galat } = usePantauBersama('pegawai_unit', sumber, {
    tahanMs: Infinity,
    pesan: 'Gagal memuat unit kerja.',
  });
  return useMemo(() => {
    const semua = data || [];
    const pohon = susunPohon(semua);
    const aktif = pohon.filter((u) => u.aktif !== false);
    const pilihanSeksi = [
      ...new Set(aktif.filter((u) => JENIS_BAGIAN.includes(u.jenis)).map(labelUnit)),
    ];
    return {
      semua,
      pohon,
      aktif,
      byId: Object.fromEntries(semua.map((u) => [u.id, u])),
      pilihanSeksi,
      memuat,
      galat,
    };
  }, [data, memuat, galat]);
}
