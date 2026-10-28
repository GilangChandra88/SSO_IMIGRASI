/**
 * DIPA satu tahun anggaran (`mak_dipa/{tahun}`: nomor & tanggal), satu sumber teks DIPA untuk
 * form surat/LPJ dan template PDF. Ditulis Keuangan di MAK Setup; dibaca sekali per sesi.
 */
import { doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { usePantauBersama } from '@/utils/usePantauBersama';

const tanggalPanjang = (iso) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso || '')
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${iso}T00:00:00Z`))
    : '[tanggal DIPA]';

/**
 * Kalimat dasar DIPA baku untuk Surat Perintah / Nota Dinas. Belum diisi di MAK Setup →
 * placeholder bertanda kurung siku.
 */
export const teksDipa = (dipa) =>
  `Daftar Isian Pelaksanaan Anggaran (DIPA) Kantor Imigrasi Kelas II TPI Buleleng Nomor ${
    dipa?.nomor || '[Nomor DIPA]'
  } tanggal ${tanggalPanjang(dipa?.tanggal)};`;

/**
 * @param {number} [tahunAnggaran]
 * @returns {{ dipa: { nomor, tanggal, tahunNodeId } | null, memuat: boolean, galat: Error|null }}
 */
export function useDipa(tahunAnggaran) {
  const tahun = Number.isInteger(tahunAnggaran) ? tahunAnggaran : null;
  const { data, memuat, galat } = usePantauBersama(
    tahun ? `mak_dipa:${tahun}` : null,
    () => doc(db, KOLEKSI.makDipa, String(tahun)),
    { tahanMs: Infinity, pesan: 'Gagal memuat data DIPA.' },
  );
  return { dipa: data, memuat, galat };
}
