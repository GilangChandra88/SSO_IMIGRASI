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
  pegawaiPangkat: 'pegawai_pangkat',
  pegawaiJabatan: 'pegawai_jabatan',
  pegawaiPejabat: 'pegawai_pejabat',
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

  // Sistem (penghitung & log hanya ditulis Cloud Function)
  sistemPenghitung: 'sistem_penghitung',
  sistemPengaturan: 'sistem_pengaturan',
  sistemLog: 'sistem_log',
});

export const SUBKOLEKSI_LPJ = Object.freeze({
  keuangan: 'keuangan', // satu dokumen: keuangan/status
  bukti: 'bukti',
  riwayat: 'riwayat',
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
