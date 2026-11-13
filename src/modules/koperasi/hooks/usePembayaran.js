import { useMemo } from 'react';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { kueriPembayaran } from '../services/pembayaranDb';

const OPSI = { tahanMs: 10 * 60_000, pesan: 'Cara bayar gagal dimuat.' };

/** Cara bayar Kasir, urut menurut `urutan` lalu nama. */
export function usePembayaran() {
  const { data, memuat } = usePantauBersama('koperasi_kantin_pembayaran', kueriPembayaran, OPSI);
  return useMemo(() => {
    const semua = [...(data || [])].sort(
      (a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama, 'id'),
    );
    return { semua, aktif: semua.filter((p) => p.aktif), memuat };
  }, [data, memuat]);
}
