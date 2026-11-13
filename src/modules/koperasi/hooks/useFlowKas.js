import { LIMIT_KUERI } from '@/utils/batas';
import { ambilFlow, kueriFlow } from '../services/kasDb';
import { useDaftarBerhalaman } from './useDaftarBerhalaman';

export function useFlowKas() {
  const { daftar, ...lain } = useDaftarBerhalaman(
    'koperasi_kas_mutasi',
    () => kueriFlow(),
    ambilFlow,
    LIMIT_KUERI.flowKas,
    'Flow kas gagal dimuat.',
  );
  return { flow: daftar, ...lain };
}
