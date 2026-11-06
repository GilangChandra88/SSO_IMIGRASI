/**
 * Ekspor rekap absensi bulanan: Excel (satu baris per pegawai, satu kolom per tanggal berisi
 * "masuk – pulang") dan nama berkas bersama untuk PDF.
 */
import { buatXlsx, simpanBerkas, TIPE_XLSX } from '@/utils/xlsx';
import { formatNip } from '@/utils/dataPegawai';

export const namaBerkasAbsensi = (rekap, bulanan) =>
  ['Rekap Absensi', rekap.nama, bulanan.label]
    .join(' ')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Isi sel satu tanggal: '07:37 – 16:05', satu jam saja ('07:37' atau '– 16:05'), atau kosong.
 * Jam yang disesuaikan manual diberi tanda ' *'.
 */
export function teksSelAbsensi(x) {
  if (!x || !(x.masuk || x.pulang)) return '';
  const jam = x.masuk && x.pulang ? `${x.masuk} – ${x.pulang}` : x.masuk || `– ${x.pulang}`;
  return x.koreksi ? `${jam} *` : jam;
}

export function unduhExcelAbsensi(rekap, bulanan) {
  const kolom = [
    'No',
    'No. Mesin',
    'Nama Pegawai',
    'NIP',
    ...bulanan.hari.map((h) => `${h.tgl} ${h.label}`),
    'Hadir',
    'Tidak Lengkap',
  ];
  const baris = bulanan.baris.map((r, i) => [
    i + 1,
    r.nos.join(', '),
    r.nama,
    r.nip ? formatNip(r.nip) : '',
    ...bulanan.hari.map((h) => teksSelAbsensi(r.sel[h.tgl])),
    r.hadir,
    r.tidakLengkap,
  ]);
  const catatan = bulanan.baris.some((r) => r.dikoreksi > 0)
    ? [[], ['', '', '* = jam disesuaikan manual oleh Kepegawaian']]
    : [];
  const isi = buatXlsx([
    {
      nama: bulanan.label,
      lebar: [5, 10, 34, 22, ...bulanan.hari.map(() => 15), 8, 14],
      baris: [kolom, ...baris, ...catatan],
    },
  ]);
  simpanBerkas(new Blob([isi], { type: TIPE_XLSX }), `${namaBerkasAbsensi(rekap, bulanan)}.xlsx`);
}
