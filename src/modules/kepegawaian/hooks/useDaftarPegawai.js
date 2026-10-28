/**
 * Daftar pegawai lengkap untuk halaman Kepegawaian (Data Pegawai & Ulang Tahun). Satu listener
 * bersama, jadi berpindah halaman tidak mengunduh ulang (CLAUDE.md 7.1 "Membaca data").
 */
import { usePantauBersama } from '@/utils/usePantauBersama';
import { kueriPegawai } from '../services/pegawaiDb';

/** @returns {{ pegawai: object[], memuat: boolean }} */
export function useDaftarPegawai() {
  const { data, memuat } = usePantauBersama('kepegawaian_pegawai', kueriPegawai, {
    pesan: 'Tidak punya akses atau gagal memuat data pegawai.',
  });
  return { pegawai: data || [], memuat };
}
