/**
 * DEFINISI SURAT: Surat Keterangan Tinggal (SKT)
 * ================================================
 * Ini adalah contoh/template definisi surat.
 * Gunakan file ini sebagai panduan saat membuat surat baru.
 *
 * STRUKTUR WAJIB:
 *  - id          : ID unik, gunakan kebab-case
 *  - kode        : Kode singkat surat (untuk label)
 *  - nama        : Nama lengkap surat
 *  - kategori    : Kelompok surat
 *  - deskripsi   : Penjelasan singkat
 *  - icon        : Emoji representasi
 *  - warna       : Hex color untuk node di flow diagram
 *  - status      : 'active' | 'draft' | 'deprecated'
 *  - variables   : Array variabel yang diisi saat buat surat
 *  - connections : Array hubungan ke surat lain
 *  - nodePosition: Posisi default node di flow diagram (x, y)
 */

export const definition = {
  // ─── Identitas ────────────────────────────────────────────────────────────
  id: 'surat-keterangan-tinggal',
  kode: 'SKT',
  nama: 'Surat Keterangan Tinggal',
  kategori: 'Layanan WNA',
  deskripsi: 'Surat keterangan domisili untuk Warga Negara Asing yang tinggal sementara.',
  icon: '🏠',
  warna: '#6366f1', // indigo
  status: 'active',

  // ─── Variabel ─────────────────────────────────────────────────────────────
  // "source" bisa: 'input' (diketik manual), 'pegawai' (pilih dari data pegawai),
  //                'auto' (digenerate sistem), 'linked' (dari surat lain)
  variables: [
    {
      key: 'nama_pemohon',
      label: 'Nama Pemohon',
      type: 'text',
      required: true,
      source: 'input',
    },
    {
      key: 'nomor_paspor',
      label: 'Nomor Paspor',
      type: 'text',
      required: true,
      source: 'input',
    },
    {
      key: 'kewarganegaraan',
      label: 'Kewarganegaraan',
      type: 'text',
      required: true,
      source: 'input',
    },
    {
      key: 'alamat_tinggal',
      label: 'Alamat Tinggal',
      type: 'textarea',
      required: true,
      source: 'input',
    },
    {
      key: 'tanggal_surat',
      label: 'Tanggal Surat',
      type: 'date',
      required: true,
      source: 'auto', // digenerate otomatis
    },
    {
      key: 'pejabat_ttd',
      label: 'Pejabat Penandatangan',
      type: 'pegawai',
      required: true,
      source: 'pegawai', // pilih dari data pegawai
    },
    {
      key: 'nomor_surat',
      label: 'Nomor Surat',
      type: 'text',
      required: true,
      source: 'auto',
    },
  ],

  // ─── Koneksi ke Surat Lain ────────────────────────────────────────────────
  // "type" bisa: 'triggers' (surat ini memicu surat itu),
  //              'requires' (surat ini butuh surat itu lebih dulu),
  //              'references' (surat ini mereferensi data surat itu)
  connections: [
    // Contoh: SKT bisa memicu pembuatan ITAS
    // {
    //   targetSuratId: 'surat-izin-tinggal-terbatas',
    //   type: 'triggers',
    //   label: 'Dapat memicu',
    //   variableMapping: {
    //     nama_pemohon: 'nama_pemohon',
    //     nomor_paspor: 'no_paspor',
    //   },
    // },
  ],

  // ─── Layout di Flow Diagram ───────────────────────────────────────────────
  nodePosition: { x: 80, y: 80 },
};
