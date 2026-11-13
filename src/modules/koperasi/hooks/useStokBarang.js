import { useMemo } from 'react';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { kueriBarang, kueriKategori } from '../services/stokDb';

const OPSI_KATEGORI = { tahanMs: 10 * 60_000, pesan: 'Kategori barang gagal dimuat.' };
const OPSI_BARANG = { tahanMs: 10 * 60_000, pesan: 'Daftar barang gagal dimuat.' };

/** Yang aktif di atas, lalu menurut nama. */
const urutkan = (daftar) =>
  [...(daftar || [])].sort((a, b) => b.aktif - a.aktif || a.nama.localeCompare(b.nama, 'id'));

/** Daftar barang & kategori Kantin. Dipanggil sekali per halaman; anak menerimanya lewat props. */
export function useStokBarang() {
  const k = usePantauBersama('koperasi_kantin_kategori', kueriKategori, OPSI_KATEGORI);
  const b = usePantauBersama('koperasi_kantin_barang', kueriBarang, OPSI_BARANG);
  const kategori = useMemo(() => urutkan(k.data), [k.data]);
  const barang = useMemo(() => urutkan(b.data), [b.data]);
  return { kategori, barang, memuat: k.memuat || b.memuat };
}
