/**
 * Susunan tabel ekspor Rekap Kehadiran (Excel & PDF, seperti purwarupa). `excel` berisi angka asli
 * supaya bisa dihitung di Excel; `pdf` berisi teks yang sudah diformat.
 */
import { buatXlsx, simpanBerkas, TIPE_XLSX } from '@/utils/xlsx';
import { formatNip } from '@/utils/dataPegawai';
import { STATUS_BY_ID, formatPersen, formatTanggal, labelPeriode } from './kehadiran';

const namaBerkas = (...bagian) =>
  bagian
    .join(' ')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * @param {{ baris: { pegawai: object, c: object, total: number, persen: number, predikat: object|null }[],
 *   tahun: number, semester: number, kegiatanTerisi: number }} p
 */
export function tabelRekap({ baris, tahun, semester, kegiatanTerisi }) {
  const periode = labelPeriode(tahun, semester);
  const kolom = [
    'No',
    'Nama Pegawai',
    'NIP',
    'Hadir',
    'Cuti',
    'Sakit',
    'Alpa',
    'Total Kegiatan',
    '% Hadir',
    'Predikat',
  ];
  const sel = (r, i, persen) => [
    i + 1,
    r.pegawai.nama,
    r.pegawai.nip ? formatNip(r.pegawai.nip) : '-',
    r.c.hadir,
    r.c.cuti,
    r.c.sakit,
    r.c.alpa,
    r.total,
    persen,
    r.predikat?.label || '-',
  ];
  return {
    nama: namaBerkas('Rekap Kehadiran', periode),
    lembar: `Rekap ${tahun}${semester ? ` S${semester}` : ''}`,
    judul: 'Rekap Kehadiran Pegawai',
    sub: `${periode} · ${kegiatanTerisi} kegiatan terisi`,
    kolom,
    lebarExcel: [5, 34, 22, 8, 8, 8, 8, 15, 10, 16],
    lebarPdf: [4, 26, 18, 7, 7, 7, 7, 9, 9, 12],
    rataPdf: ['c', 'l', 'l', 'c', 'c', 'c', 'c', 'c', 'r', 'l'],
    mendatar: true,
    excel: baris.map((r, i) => sel(r, i, r.total ? r.persen : '')),
    pdf: baris.map((r, i) =>
      sel(r, i, r.total ? formatPersen(r.persen) : '-').map((v) => String(v)),
    ),
  };
}

/**
 * @param {{ pegawai: object, riwayat: { kegiatan: object, isi: object|null, catatan: string }[],
 *   tahun: number, semester: number, ringkas: string }} p
 */
export function tabelRiwayat({ pegawai, riwayat, tahun, semester, ringkas }) {
  const periode = labelPeriode(tahun, semester);
  const baris = riwayat.map((r, i) => [
    i + 1,
    r.kegiatan.nama,
    { tgl: r.kegiatan.tanggal },
    r.isi ? STATUS_BY_ID[r.isi.status]?.label || r.isi.status : r.catatan,
    r.isi?.keterangan || '-',
  ]);
  return {
    nama: namaBerkas('Kehadiran', pegawai.nama, periode),
    lembar: 'Kehadiran',
    judul: `Kehadiran ${pegawai.nama}`,
    sub: [pegawai.nip ? `NIP ${formatNip(pegawai.nip)}` : '', periode, ringkas]
      .filter(Boolean)
      .join(' · '),
    kolom: ['No', 'Kegiatan', 'Tanggal', 'Status', 'Keterangan'],
    lebarExcel: [5, 40, 13, 14, 34],
    lebarPdf: [4, 38, 12, 12, 30],
    rataPdf: ['c', 'l', 'l', 'l', 'l'],
    mendatar: false,
    excel: baris,
    pdf: baris.map((b) =>
      b.map((v) => (v && typeof v === 'object' ? formatTanggal(v.tgl) : String(v))),
    ),
  };
}

/** Unduh tabel sebagai .xlsx (baris pertama = judul kolom). */
export function unduhExcel(tabel) {
  const isi = buatXlsx([
    { nama: tabel.lembar, lebar: tabel.lebarExcel, baris: [tabel.kolom, ...tabel.excel] },
  ]);
  simpanBerkas(new Blob([isi], { type: TIPE_XLSX }), `${tabel.nama}.xlsx`);
}
