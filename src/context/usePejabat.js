/**
 * Pejabat penandatangan (`pegawai_pejabat`, docs/skema-database.md §5.1): PPK, Bendahara, KPA,
 * Kepala Kantor, PLT, dan PLH beserta masa berlakunya. Ditetapkan Kepegawaian; dibaca semua modul
 * lewat listener bersama (≤200 penetapan, terbaru dulu). Nama/NIP/pangkat/jabatan diambil dari
 * pegawai ringkas saat dipakai, lalu dibekukan sebagai `Orang` di dokumen yang memerlukannya.
 */
import { useMemo } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { tanggalIso } from '@/utils/nilai';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { keOrang, usePegawaiRingkas } from './usePegawaiRingkas';

/** Urutan & label jenis pejabat (sama dengan rules `pejabatSah`). */
export const JENIS_PEJABAT = Object.freeze([
  { id: 'ppk', label: 'Pejabat Pembuat Komitmen (PPK)' },
  { id: 'bendahara', label: 'Bendahara Pengeluaran' },
  { id: 'kpa', label: 'Kuasa Pengguna Anggaran (KPA)' },
  { id: 'kepala', label: 'Kepala Kantor' },
  { id: 'plt', label: 'Pelaksana Tugas (PLT)' },
  { id: 'plh', label: 'Pelaksana Harian (PLH)' },
]);

const sumber = () =>
  query(
    collection(db, KOLEKSI.pegawaiPejabat),
    orderBy('berlakuMulai', 'desc'),
    limit(LIMIT_KUERI.masterPegawai),
  );

/** Penetapan berlaku pada `tanggal` ('YYYY-MM-DD'): mulai ≤ tanggal ≤ akhir (akhir kosong = menjabat). */
export const berlakuPada = (p, tanggal) =>
  p.berlakuMulai <= tanggal && (!p.berlakuSampai || p.berlakuSampai >= tanggal);

const waktuBuat = (p) => p.dibuatPada?.toMillis?.() ?? Number.MAX_SAFE_INTEGER; // belum sampai server = terbaru

/**
 * Penetapan `jenis` yang berlaku pada `tanggal`. Bila tumpang tindih, yang mulai paling akhir (lalu
 * yang dibuat paling akhir, mis. koreksi salah input) yang dipakai.
 */
export function penetapanPada(daftar, jenis, tanggal = tanggalIso()) {
  let pilih = null;
  for (const p of daftar) {
    if (p.jenis !== jenis || !berlakuPada(p, tanggal)) continue;
    const lebihBaru =
      !pilih ||
      p.berlakuMulai > pilih.berlakuMulai ||
      (p.berlakuMulai === pilih.berlakuMulai && waktuBuat(p) > waktuBuat(pilih));
    if (lebihBaru) pilih = p;
  }
  return pilih;
}

/** Daftar penetapan saja (tanpa data pegawai), mis. untuk halaman Kepegawaian. */
export function usePenetapanPejabat() {
  const { data, memuat, galat } = usePantauBersama('pegawai_pejabat', sumber, {
    tahanMs: Infinity,
    pesan: 'Gagal memuat data pejabat.',
  });
  return useMemo(() => ({ daftar: data || [], memuat, galat }), [data, memuat, galat]);
}

/**
 * @returns {{ pejabatPada: (jenis: string, tanggal?: string) => object|null, memuat: boolean }}
 *   pejabatPada = salinan `Orang` pejabat yang berlaku pada tanggal itu (bawaan: hari ini, WITA),
 *   atau null bila belum ditetapkan
 */
export function usePejabat() {
  const { daftar, memuat } = usePenetapanPejabat();
  const { byId, memuat: memuatPegawai } = usePegawaiRingkas();
  return useMemo(
    () => ({
      pejabatPada: (jenis, tanggal) => {
        const p = penetapanPada(daftar, jenis, tanggal || tanggalIso());
        return p ? keOrang(byId[p.pegawaiId]) : null;
      },
      memuat: memuat || memuatPegawai,
    }),
    [daftar, byId, memuat, memuatPegawai],
  );
}
