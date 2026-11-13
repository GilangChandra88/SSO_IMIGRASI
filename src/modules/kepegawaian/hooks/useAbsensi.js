import { useMemo } from 'react';
import { usePantauBersama } from '@/utils/usePantauBersama';
import {
  kueriImporAbsensi,
  kueriKoreksiAbsensi,
  kueriNoAbsen,
  kueriRekapAbsensi,
} from '../services/absensiDb';

/** Daftar rekapan absensi (termasuk yang batal), terbaru dulu. */
export function useDaftarRekapAbsensi() {
  const { data, memuat } = usePantauBersama('kepegawaian_absensi', kueriRekapAbsensi, {
    pesan: 'Tidak punya akses atau gagal memuat rekapan absensi.',
  });
  return { rekapan: data || [], memuat };
}

/** Semua impor satu rekapan (lama → baru). Dipasang di layar detail rekapan. */
export function useImporAbsensi(rekapId) {
  const { data, memuat } = usePantauBersama(
    rekapId ? `kepegawaian_absensi_impor:${rekapId}` : null,
    () => kueriImporAbsensi(rekapId),
    { pesan: 'Tidak punya akses atau gagal memuat data impor absensi.' },
  );
  return { impor: data || [], memuat };
}

/** Koreksi jam satu bulan sebagai peta { [`{baris}_{tanggal}`]: dokumen } (termasuk yang nonaktif). */
export function useKoreksiAbsensi(rekapId, bulan) {
  const { data, memuat } = usePantauBersama(
    rekapId && bulan ? `kepegawaian_absensi_koreksi:${rekapId}:${bulan}` : null,
    () => kueriKoreksiAbsensi(rekapId, bulan),
    { pesan: 'Tidak punya akses atau gagal memuat koreksi jam absensi.' },
  );
  const koreksi = useMemo(() => Object.fromEntries((data || []).map((x) => [x.id, x])), [data]);
  return { koreksi, memuat };
}

/**
 * Pemetaan No. mesin → pegawai sebagai peta { [no]: dokumen }. Dipasang di setiap layar yang
 * memakainya (bukan di halaman), supaya listener yang pernah gagal dimulai ulang saat berpindah
 * layar. `siap` = daftar sudah termuat tanpa galat; impor wajib menunggu ini, karena No. yang
 * tidak dikenal dianggap baru dan penulisannya ditolak rules bila ternyata sudah ada.
 */
export function useNoAbsen() {
  const { data, memuat, galat } = usePantauBersama('kepegawaian_no_absen', kueriNoAbsen, {
    pesan: 'Tidak punya akses atau gagal memuat pengaturan No. absen.',
  });
  const noAbsen = useMemo(() => Object.fromEntries((data || []).map((x) => [x.id, x])), [data]);
  return { noAbsen, memuat, galat, siap: !!data && !memuat && !galat };
}
