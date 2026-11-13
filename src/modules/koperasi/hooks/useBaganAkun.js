import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { AKUN_STANDAR, KELOMPOK_AKUN, urutAkun } from '../data/baganAkun';
import { kueriAkun, siapkanAkunStandar } from '../services/akunDb';

const OPSI = { tahanMs: 10 * 60_000, pesan: 'Bagan akun gagal dimuat.' };

/**
 * Bagan akun, dikelompokkan per kelompok. Akun bawaan yang belum ada dibuat otomatis,
 * jadi tidak ada langkah persiapan.
 */
export function useBaganAkun() {
  const { currentUser } = useAuth();
  const { data, memuat, galat } = usePantauBersama('koperasi_akun', kueriAkun, OPSI);
  const sudahDicoba = useRef(false);

  const idAda = useMemo(() => new Set((data || []).map((a) => a.id)), [data]);
  const kurang = !memuat && !galat && !!data && AKUN_STANDAR.some((a) => !idAda.has(a.id));

  useEffect(() => {
    if (!kurang || sudahDicoba.current) return;
    sudahDicoba.current = true;
    siapkanAkunStandar(idAda, currentUser.uid).catch((err) =>
      showToast(pesanGalat(err, 'Akun bawaan gagal disiapkan.'), 'error'),
    );
  }, [kurang, idAda, currentUser]);

  const akun = useMemo(() => [...(data || [])].sort(urutAkun), [data]);
  const perKelompok = useMemo(
    () => KELOMPOK_AKUN.map((k) => ({ ...k, akun: akun.filter((a) => a.kelompok === k.id) })),
    [akun],
  );
  return { akun, perKelompok, memuat: memuat || kurang };
}
