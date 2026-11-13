import { useMemo } from 'react';
import { tanggalIso } from '@/utils/nilai';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { kueriAnggota, refPengaturan } from '../services/bukuDb';

const OPSI = { tahanMs: 10 * 60_000, pesan: 'Daftar anggota gagal dimuat.' };
const OPSI_PENGATURAN = { tahanMs: 10 * 60_000, pesan: 'Pengaturan koperasi gagal dimuat.' };

export const PENGATURAN_BAWAAN = Object.freeze({
  nominalPokok: 300000,
  nominalWajib: 100000,
  alokasiShu: {
    jasaModal: 20,
    jasaUsaha: 30,
    pengembangan: 20,
    pengurus: 5,
    karyawan: 5,
    pendidikan: 5,
    sosial: 5,
    cadangan: 10,
  },
});

/** Pengaturan koperasi (nilai bawaan sheet bila belum pernah disimpan). */
export function usePengaturan() {
  const { data, memuat } = usePantauBersama('koperasi_pengaturan', refPengaturan, OPSI_PENGATURAN);
  const pengaturan = useMemo(() => ({ ...PENGATURAN_BAWAAN, ...(data || {}) }), [data]);
  return { pengaturan, memuat };
}

/**
 * Status simpanan wajib: bulan seharusnya (dari bulan masuk s.d. bulan ini) dibanding bulan yang
 * sudah dibayar (saldo wajib ÷ nominal). Selisih negatif = tunggakan.
 */
export function statusWajib(a, nominalWajib, hariIni = tanggalIso()) {
  if (a.status !== 'aktif' || !a.tanggalMasuk) return null;
  const [ty, tm] = a.tanggalMasuk.split('-').map(Number);
  const [hy, hm] = hariIni.split('-').map(Number);
  const seharusnya = Math.max(0, (hy - ty) * 12 + hm - tm + 1);
  const dibayar = Math.floor(a.saldoWajib / nominalWajib);
  return { seharusnya, dibayar, selisih: dibayar - seharusnya };
}

/** Semua anggota (urut nomor), satu listener bersama. */
export function useAnggota() {
  const { data, memuat } = usePantauBersama('koperasi_anggota', kueriAnggota, OPSI);
  return useMemo(() => {
    const semua = [...(data || [])].sort((a, b) => a.nomor.localeCompare(b.nomor));
    return {
      semua,
      aktif: semua.filter((a) => a.status === 'aktif'),
      byId: Object.fromEntries(semua.map((a) => [a.id, a])),
      memuat,
    };
  }, [data, memuat]);
}
