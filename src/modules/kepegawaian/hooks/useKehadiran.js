import { useMemo } from 'react';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { gabungRekap } from '../utils/kehadiran';
import { kueriKegiatan, kueriRekapHadir } from '../services/kehadiranDb';

/** Kegiatan satu periode (semester 0 = setahun), terbaru dulu. Dipasang di tab yang menampilkannya. */
export function useKegiatanPeriode(tahun, semester) {
  const { data, memuat } = usePantauBersama(
    `kepegawaian_kegiatan:${tahun}-${semester}`,
    () => kueriKegiatan(tahun, semester),
    { pesan: 'Tidak punya akses atau gagal memuat kegiatan.' },
  );
  return { kegiatan: data || [], memuat };
}

/** Rekap kehadiran (ditulis Function) untuk satu semester, atau gabungan setahun bila semester 0. */
export function useRekapHadir(tahun, semester) {
  const { data, memuat } = usePantauBersama(
    `kepegawaian_rekap_hadir:${tahun}`,
    () => kueriRekapHadir(tahun),
    { pesan: 'Tidak punya akses atau gagal memuat rekap kehadiran.' },
  );
  const rekap = useMemo(
    () => gabungRekap((data || []).filter((r) => !semester || r.semester === semester)),
    [data, semester],
  );
  return { rekap, memuat };
}
