/**
 * Isi awal master Kepegawaian (tombol "Isi struktur awal" & "Isi pangkat baku"). Setelah terisi,
 * semuanya bisa diubah di tab masing-masing; data ini hanya titik awal.
 */

/**
 * Struktur unit kerja Kanim (dari tabel struktur pemilik proyek, 28 Okt 2026). `induk` = kode
 * unit induk. Nama kantor memakai "Buleleng" (CLAUDE.md §1).
 */
export const STRUKTUR_AWAL = Object.freeze([
  {
    kode: 'KANIM',
    nama: 'Kantor Imigrasi Kelas II TPI Buleleng',
    singkatan: 'Kanim Buleleng',
    jenis: 'kantor',
    induk: '',
  },
  {
    kode: 'TU',
    nama: 'Subbagian Tata Usaha',
    singkatan: 'Tata Usaha',
    jenis: 'subbagian',
    induk: 'KANIM',
  },
  {
    kode: 'URS-KEPEG',
    nama: 'Urusan Kepegawaian',
    singkatan: 'Kepegawaian',
    jenis: 'urusan',
    induk: 'TU',
  },
  { kode: 'URS-KEU', nama: 'Urusan Keuangan', singkatan: 'Keuangan', jenis: 'urusan', induk: 'TU' },
  { kode: 'URS-UMUM', nama: 'Urusan Umum', singkatan: 'Umum', jenis: 'urusan', induk: 'TU' },
  {
    kode: 'LANTASKIM',
    nama: 'Seksi Lalu Lintas dan Izin Tinggal Keimigrasian',
    singkatan: 'Lantaskim',
    jenis: 'seksi',
    induk: 'KANIM',
  },
  {
    kode: 'SUB-LANTAS',
    nama: 'Subseksi Lalu Lintas Keimigrasian',
    singkatan: 'Lalu Lintas',
    jenis: 'subseksi',
    induk: 'LANTASKIM',
  },
  {
    kode: 'SUB-INTAL',
    nama: 'Subseksi Izin Tinggal Keimigrasian',
    singkatan: 'Izin Tinggal',
    jenis: 'subseksi',
    induk: 'LANTASKIM',
  },
  {
    kode: 'INTELDAKIM',
    nama: 'Seksi Intelijen dan Penindakan Keimigrasian',
    singkatan: 'Inteldakim',
    jenis: 'seksi',
    induk: 'KANIM',
  },
  {
    kode: 'SUB-INTEL',
    nama: 'Subseksi Intelijen Keimigrasian',
    singkatan: 'Intelijen',
    jenis: 'subseksi',
    induk: 'INTELDAKIM',
  },
  {
    kode: 'SUB-DAKIM',
    nama: 'Subseksi Penindakan Keimigrasian',
    singkatan: 'Penindakan',
    jenis: 'subseksi',
    induk: 'INTELDAKIM',
  },
  {
    kode: 'TIKIM',
    nama: 'Seksi Teknologi Informasi dan Komunikasi Keimigrasian',
    singkatan: 'Tikim',
    jenis: 'seksi',
    induk: 'KANIM',
  },
  {
    kode: 'SUB-INFOKOM',
    nama: 'Subseksi Informasi dan Komunikasi Keimigrasian',
    singkatan: 'Infokom',
    jenis: 'subseksi',
    induk: 'TIKIM',
  },
  {
    kode: 'SUB-TI',
    nama: 'Subseksi Teknologi Informasi Keimigrasian',
    singkatan: 'Teknologi Informasi',
    jenis: 'subseksi',
    induk: 'TIKIM',
  },
]);

const PANGKAT_PNS = [
  ['I/a', 'Juru Muda'],
  ['I/b', 'Juru Muda Tk. I'],
  ['I/c', 'Juru'],
  ['I/d', 'Juru Tk. I'],
  ['II/a', 'Pengatur Muda'],
  ['II/b', 'Pengatur Muda Tk. I'],
  ['II/c', 'Pengatur'],
  ['II/d', 'Pengatur Tk. I'],
  ['III/a', 'Penata Muda'],
  ['III/b', 'Penata Muda Tk. I'],
  ['III/c', 'Penata'],
  ['III/d', 'Penata Tk. I'],
  ['IV/a', 'Pembina'],
  ['IV/b', 'Pembina Tk. I'],
  ['IV/c', 'Pembina Utama Muda'],
  ['IV/d', 'Pembina Utama Madya'],
  ['IV/e', 'Pembina Utama'],
];

const GOLONGAN_PPPK = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
];

/** Pangkat/golongan PNS (I/a–IV/e) dan golongan PPPK (I–XVII). */
export const PANGKAT_BAKU = Object.freeze([
  ...PANGKAT_PNS.map(([golongan, nama], i) => ({ nama, golongan, jenis: 'pns', urutan: 101 + i })),
  ...GOLONGAN_PPPK.map((golongan, i) => ({
    nama: `PPPK Golongan ${golongan}`,
    golongan,
    jenis: 'pppk',
    urutan: 201 + i,
  })),
]);

export const JENIS_JABATAN = Object.freeze([
  { id: 'struktural', label: 'Struktural' },
  { id: 'fungsional', label: 'Fungsional' },
  { id: 'pelaksana', label: 'Pelaksana' },
]);

export const ESELON = Object.freeze([
  'I.a',
  'I.b',
  'II.a',
  'II.b',
  'III.a',
  'III.b',
  'IV.a',
  'IV.b',
  'V.a',
  'V.b',
  'V',
]);
