import { tahunIni } from '@/utils/nilai';

/** Tahun anggaran yang bisa dipilih: tahun depan sampai 2024 (awal sistem). */
export const daftarTahun = () =>
  Array.from({ length: tahunIni() + 2 - 2024 }, (_, i) => tahunIni() + 1 - i);
