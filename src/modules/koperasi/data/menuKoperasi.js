import {
  FaArrowCircleDown,
  FaArrowCircleUp,
  FaBalanceScale,
  FaBook,
  FaBoxes,
  FaChartBar,
  FaChartLine,
  FaChartPie,
  FaCoins,
  FaExchangeAlt,
  FaFlagCheckered,
  FaHandshake,
  FaIdCard,
  FaLock,
  FaMoneyCheckAlt,
  FaPercent,
  FaPiggyBank,
  FaSitemap,
  FaSlidersH,
  FaUserCheck,
  FaUsers,
  FaWallet,
} from 'react-icons/fa';

/**
 * Menu bagian Pusat Koperasi (docs/rencana-koperasi.md §5). Setiap grup punya halaman daftar
 * sub-menu; sub-menu yang belum dibangun tampil sebagai kerangka ("Menyusul").
 */
export const GRUP_MENU = Object.freeze([
  {
    id: 'anggota',
    label: 'Anggota & Simpanan',
    pendek: 'Anggota',
    Ikon: FaUsers,
    keterangan: 'Data anggota, simpanan pokok, dan simpanan wajib.',
    sub: [
      {
        segmen: 'daftar',
        label: 'Daftar Anggota',
        Ikon: FaIdCard,
        keterangan: 'Anggota pegawai dan anggota luar, status keanggotaan, dan buku anggota.',
      },
      {
        segmen: 'transaksi',
        label: 'Transaksi Simpanan',
        Ikon: FaPiggyBank,
        keterangan: 'Setoran simpanan pokok dan wajib, serta pengambilan saat anggota keluar.',
      },
      {
        segmen: 'potong-gaji',
        label: 'Setor Potong Gaji',
        Ikon: FaMoneyCheckAlt,
        keterangan: 'Catat simpanan wajib dari potongan gaji untuk semua anggota sekaligus.',
      },
      {
        segmen: 'saldo-awal',
        label: 'Saldo Awal Simpanan',
        Ikon: FaFlagCheckered,
        keterangan: 'Saldo simpanan tiap anggota saat pembukuan di sistem dimulai.',
      },
      {
        segmen: 'pengaturan',
        label: 'Pengaturan Simpanan',
        Ikon: FaSlidersH,
        keterangan: 'Nominal simpanan pokok dan simpanan wajib per bulan.',
      },
    ],
  },
  {
    id: 'pembukuan',
    label: 'Pembukuan',
    Ikon: FaBook,
    keterangan: 'Bagan akun, jurnal, dan transaksi umum koperasi.',
    sub: [
      {
        segmen: 'kas',
        label: 'Kas & Bank',
        Ikon: FaWallet,
        keterangan: 'Saldo setiap rekening kas dan bank, Flow uang, dan transfer antar kas.',
      },
      {
        segmen: 'akun',
        label: 'Bagan Akun',
        Ikon: FaSitemap,
        keterangan: 'Daftar akun mengikuti kode di buku koperasi.',
      },
      {
        segmen: 'saldo-awal',
        label: 'Saldo Awal',
        Ikon: FaFlagCheckered,
        keterangan: 'Saldo setiap akun saat pembukuan di sistem dimulai.',
      },
      {
        segmen: 'jurnal',
        label: 'Jurnal',
        Ikon: FaBook,
        keterangan: 'Semua transaksi dalam bentuk debit dan kredit, tercatat otomatis.',
      },
      {
        segmen: 'pengeluaran',
        label: 'Pengeluaran Lain-lain',
        Ikon: FaArrowCircleUp,
        keterangan: 'Beban dan pengeluaran lain, termasuk iuran wajib ke koperasi pusat.',
      },
      {
        segmen: 'penerimaan',
        label: 'Penerimaan Lain-lain',
        Ikon: FaArrowCircleDown,
        keterangan: 'Pemasukan di luar penjualan dan simpanan, misalnya bunga bank.',
      },
      {
        segmen: 'pelunasan-utang',
        label: 'Pelunasan Utang',
        Ikon: FaHandshake,
        keterangan: 'Pembayaran utang kepada pemasok atau pihak lain.',
      },
      {
        segmen: 'tutup-buku',
        label: 'Tutup Buku',
        Ikon: FaLock,
        keterangan: 'Kunci periode yang sudah selesai agar laporannya tidak berubah.',
      },
    ],
  },
  {
    id: 'laporan',
    label: 'Laporan',
    Ikon: FaChartBar,
    keterangan: 'Laporan keuangan bulanan dan tahunan.',
    sub: [
      {
        segmen: 'laba-rugi',
        label: 'Perhitungan Hasil Usaha',
        Ikon: FaChartLine,
        keterangan: 'Pendapatan, HPP, beban, dan SHU per bulan dan per tahun.',
      },
      {
        segmen: 'neraca',
        label: 'Neraca',
        Ikon: FaBalanceScale,
        keterangan: 'Aset, kewajiban, dan ekuitas per akhir bulan dan akhir tahun.',
      },
      {
        segmen: 'arus-kas',
        label: 'Arus Kas',
        Ikon: FaExchangeAlt,
        keterangan: 'Uang masuk dan keluar per bulan, serta saldo setiap rekening.',
      },
      {
        segmen: 'persediaan',
        label: 'Persediaan',
        Ikon: FaBoxes,
        keterangan: 'Mutasi dan nilai barang kantin per bulan.',
      },
    ],
  },
  {
    id: 'shu',
    label: 'SHU',
    Ikon: FaCoins,
    keterangan: 'Pembagian Sisa Hasil Usaha per tahun.',
    sub: [
      {
        segmen: 'alokasi',
        label: 'Alokasi SHU',
        Ikon: FaChartPie,
        keterangan: 'Pembagian SHU tahunan ke jasa modal, jasa usaha, dan dana-dana.',
      },
      {
        segmen: 'anggota',
        label: 'SHU per Anggota',
        Ikon: FaUserCheck,
        keterangan: 'Jasa modal menurut simpanan dan jasa usaha menurut belanja tiap anggota.',
      },
      {
        segmen: 'pengaturan',
        label: 'Persentase SHU',
        Ikon: FaPercent,
        keterangan: 'Persentase setiap bagian alokasi SHU (harus berjumlah 100%).',
      },
    ],
  },
]);

export const jalurGrup = (grup, segmen) =>
  segmen ? `/koperasi/${grup.id}/${segmen}` : `/koperasi/${grup.id}`;
