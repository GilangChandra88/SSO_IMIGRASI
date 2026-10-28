/**
 * Pegawai ringkas (`pegawai_ringkas`, diturunkan Cloud Function dari `pegawai`) untuk semua modul di
 * luar Kepegawaian: pemilih pelaksana/pejabat, pengambil barang, banner ulang tahun. Dibaca SATU
 * kali per sesi lewat listener bersama (≤500 dokumen); modul tidak membuat kueri pegawai sendiri.
 */
import { useMemo } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { usePantauBersama } from '@/utils/usePantauBersama';

const sumber = () =>
  query(collection(db, KOLEKSI.pegawaiRingkas), orderBy('nama'), limit(LIMIT_KUERI.pegawaiRingkas));

const urutNama = (a, b) => a.nama.localeCompare(b.nama, 'id');

/**
 * @returns {{ pegawai: object[], semua: object[], byId: Record<string, object>, memuat: boolean, galat: Error|null }}
 *   pegawai = yang aktif saja (untuk pilihan baru); semua/byId termasuk nonaktif (untuk data lama)
 */
export function usePegawaiRingkas() {
  const { data, memuat, galat } = usePantauBersama('pegawai_ringkas', sumber, {
    tahanMs: Infinity,
    pesan: 'Gagal memuat daftar pegawai.',
  });
  return useMemo(() => {
    const semua = (data || []).filter((p) => p.nama).sort(urutNama);
    return {
      semua,
      pegawai: semua.filter((p) => p.aktif !== false),
      byId: Object.fromEntries(semua.map((p) => [p.id, p])),
      memuat,
      galat,
    };
  }, [data, memuat, galat]);
}

/**
 * Salinan beku `Orang` (docs/skema-database.md §3) dari pegawai ringkas atau dokumen pegawai.
 * Dipakai di isi dokumen resmi supaya cetakan tidak berubah bila data pegawai diubah kemudian.
 */
export function keOrang(p) {
  if (!p?.id) return null;
  return {
    pegawaiId: p.id,
    nama: p.nama || '',
    nip: p.nip || '',
    pangkat: p.pangkatNama || '',
    jabatan: p.jabatanNama || '',
  };
}
