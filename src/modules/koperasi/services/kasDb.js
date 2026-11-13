/**
 * Flow kas Koperasi (`koperasi_kas_mutasi`, docs/skema-database.md §5.7): satu catatan per jurnal
 * yang menyentuh rekening kas/bank, ditulis mesin jurnal. Rekening kas/bank = akun bertanda kas.
 */
import { collection, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { daftarDokumen } from '@/utils/pantau';

/** Flow terbaru dulu; `setelah` = `dibuatPada` baris terakhir halaman sebelumnya. */
export const kueriFlow = (setelah = null) =>
  query(
    collection(db, KOLEKSI.koperasiKasMutasi),
    orderBy('dibuatPada', 'desc'),
    ...(setelah ? [startAfter(setelah)] : []),
    limit(LIMIT_KUERI.flowKas),
  );

export const ambilFlow = async (setelah) => daftarDokumen(await getDocs(kueriFlow(setelah)));
