/**
 * Nama koleksi Firestore dan path Storage — satu-satunya tempat nama ini ditulis.
 * Acuan: docs/skema-database.md (§5 koleksi, §7 Storage). Penegaknya: firestore.rules & storage.rules.
 *
 * Komponen dan hook tidak menulis nama koleksi/path sebagai teks; selalu lewat konstanta ini.
 * Menambah/mengubah koleksi atau path = ubah skema, rules, berkas ini, dan scripts/uji-rules.mjs
 * dalam PR yang sama (CLAUDE.md bagian 7.1).
 */

export const KOLEKSI = Object.freeze({
  // Pegawai & akun
  pegawai: 'pegawai',
  pegawaiRingkas: 'pegawai_ringkas',
  pegawaiKontak: 'pegawai_kontak',
  pegawaiPangkat: 'pegawai_pangkat',
  pegawaiJabatan: 'pegawai_jabatan',
  pegawaiUnit: 'pegawai_unit',
  pegawaiPejabat: 'pegawai_pejabat',
  pegawaiKegiatan: 'pegawai_kegiatan',
  pegawaiRekapHadir: 'pegawai_rekap_hadir',
  pegawaiAbsensi: 'pegawai_absensi', // subkoleksi: SUBKOLEKSI_ABSENSI
  pegawaiNoAbsen: 'pegawai_no_absen',
  penggunaPreferensi: 'pengguna_preferensi',
  ultahStatus: 'ultah_status',
  ultahUcapan: 'ultah_ucapan',

  // LPJ (subkoleksi lpj_berkas/{id}: SUBKOLEKSI_LPJ)
  lpjBerkas: 'lpj_berkas',
  lpjRingkas: 'lpj_ringkas',
  lpjNomor: 'lpj_nomor',
  lpjDrpp: 'lpj_drpp',

  // MAK & anggaran
  makNode: 'mak_node',
  makRealisasi: 'mak_realisasi',
  makRekap: 'mak_rekap',
  makDipa: 'mak_dipa',

  // Persuratan
  suratKode: 'surat_kode',
  suratNomor: 'surat_nomor',

  // Inventory
  inventoryKategori: 'inventory_kategori',
  inventoryBarang: 'inventory_barang',
  inventoryPemasok: 'inventory_pemasok',
  inventoryKode: 'inventory_kode',
  inventoryMasuk: 'inventory_masuk',
  inventoryKeluar: 'inventory_keluar',
  inventorySaldo: 'inventory_saldo',

  // Koperasi (saldo & riwayat hanya ditulis Cloud Function)
  koperasiKasMutasi: 'koperasi_kas_mutasi',
  koperasiAkun: 'koperasi_akun',
  koperasiSaldoAwal: 'koperasi_saldo_awal',
  koperasiJurnal: 'koperasi_jurnal',
  koperasiRekap: 'koperasi_rekap',
  koperasiRekapAnggota: 'koperasi_rekap_anggota',
  koperasiPengaturan: 'koperasi_pengaturan',
  koperasiAnggota: 'koperasi_anggota',
  koperasiSimpanan: 'koperasi_simpanan',
  koperasiTransaksiUmum: 'koperasi_transaksi_umum',
  koperasiKantinKategori: 'koperasi_kantin_kategori',
  koperasiKantinBarang: 'koperasi_kantin_barang',
  koperasiKantinTransaksi: 'koperasi_kantin_transaksi',
  koperasiKantinPembelian: 'koperasi_kantin_pembelian',
  koperasiKantinOpname: 'koperasi_kantin_opname',
  koperasiKantinPembayaran: 'koperasi_kantin_pembayaran',
  koperasiKantinBarkode: 'koperasi_kantin_barkode',

  // Sistem (penghitung & log hanya ditulis Cloud Function)
  sistemPenghitung: 'sistem_penghitung',
  sistemPengaturan: 'sistem_pengaturan',
  sistemLog: 'sistem_log',
  // Jejak sistem (Log Developer, Super Admin; hanya dibaca lewat Function)
  sistemGalat: 'sistem_galat',
  sistemAnomali: 'sistem_anomali',
  sistemAktivitas: 'sistem_aktivitas',
  sistemSesi: 'sistem_sesi',
  sistemMetrik: 'sistem_metrik',
  sistemSegel: 'sistem_segel',
});

export const SUBKOLEKSI_LPJ = Object.freeze({
  keuangan: 'keuangan', // satu dokumen: keuangan/status
  bukti: 'bukti',
  riwayat: 'riwayat',
});

export const SUBKOLEKSI_ABSENSI = Object.freeze({
  impor: 'impor', // pegawai_absensi/{id}/impor: satu dokumen per berkas CSV mesin absensi
  koreksi: 'koreksi', // pegawai_absensi/{id}/koreksi/{baris}_{tanggal}: penyesuaian jam manual
});

/** ID dokumen tunggal bagian Keuangan berkas LPJ. */
export const DOK_KEUANGAN = 'status';

/** Nama berkas Storage: {epochMs13}-{namaAman}; dicek storage.rules (namaSah). */
export function namaBerkasAman(namaAsli, waktu = Date.now()) {
  const titik = String(namaAsli || '').lastIndexOf('.');
  const ekstensi =
    titik > 0
      ? namaAsli
          .slice(titik)
          .toLowerCase()
          .replace(/[^a-z0-9.]/g, '')
      : '';
  const dasar = (titik > 0 ? namaAsli.slice(0, titik) : String(namaAsli || 'berkas'))
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const aman = `${dasar || 'berkas'}`.slice(0, 80 - ekstensi.length) + ekstensi;
  return `${String(waktu).padStart(13, '0')}-${aman}`;
}

/** Folder Storage per jenis berkas (tanpa nama berkas). Path lengkap = folder + namaBerkasAman(). */
export const JALUR_BERKAS = Object.freeze({
  lpjTte: (berkasId) => `lpj/${berkasId}/tte/`,
  lpjLaporan: (berkasId) => `lpj/${berkasId}/laporan/`,
  /** jenis: 'foto' | 'nota' */
  lpjLampiran: (berkasId, jenis) => `lpj/${berkasId}/lampiran/${jenis}/`,
  lpjBukti: (berkasId, pegawaiId) => `lpj/${berkasId}/bukti/${pegawaiId}/`,
  /** tahap: 'sakti' | 'transfer' | 'arsip' */
  lpjKeuangan: (berkasId, tahap) => `lpj/${berkasId}/keuangan/${tahap}/`,
  /** jenis: 'drpp' | 'spm' | 'sp2d' */
  drpp: (drppId, jenis) => `drpp/${drppId}/${jenis}/`,
  pegawaiThumb: (pegawaiId) => `pegawai/${pegawaiId}/thumb/`,
  pegawaiFoto: (pegawaiId) => `pegawai/${pegawaiId}/foto/`,
});

/** Tipe berkas yang diterima rules Storage (tanpa SVG). */
export const TIPE_GAMBAR = Object.freeze(['image/jpeg', 'image/png']);
export const TIPE_GAMBAR_PDF = Object.freeze(['image/jpeg', 'image/png', 'application/pdf']);
