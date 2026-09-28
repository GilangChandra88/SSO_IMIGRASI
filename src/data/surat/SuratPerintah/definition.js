/** SURAT PERINTAH (SP) */
export const definition = {
  id: 'surat-perintah',
  kode: 'SP',
  nama: 'Surat Perintah',
  kategori: 'Perjalanan Dinas',
  deskripsi:
    'Surat perintah tugas yang menugaskan pegawai untuk melaksanakan perjalanan dinas. Jumlah pegawai yang ditugaskan akan menentukan jumlah Surat Perjalanan Dinas yang dibuat.',
  icon: '📋',
  warna: '#6366f1',
  status: 'active',
  variables: [
    {
      key: 'nomor_sp',
      label: 'Nomor Surat Perintah',
      type: 'nomor_surat',
      required: true,
      source: 'input',
    },
    {
      key: 'menimbang',
      label: 'Menimbang (Alasan/Latar Belakang)',
      type: 'textarea',
      required: true,
      source: 'input',
    },
    {
      key: 'dasar',
      label: 'Dasar (Hukum/Surat)',
      type: 'dynamic_list',
      required: true,
      source: 'input',
    },
    {
      key: 'pegawai_list',
      label: 'Kepada (Pegawai Bertugas)',
      type: 'pegawai_multi',
      required: true,
      source: 'pegawai',
    },
    {
      key: 'kegiatan_poin_1',
      label: 'Untuk (Detail Kegiatan Poin 1)',
      type: 'textarea',
      required: true,
      source: 'input',
    },
    { key: 'tempat_terbit', label: 'Tempat Terbit', type: 'text', required: true, source: 'input' },
    { key: 'tanggal_sp', label: 'Tanggal Surat', type: 'date', required: true, source: 'input' },
    {
      key: 'pejabat_ttd',
      label: 'Pejabat Penandatangan',
      type: 'pegawai',
      required: true,
      source: 'pegawai',
    },
  ],
  connections: [
    {
      targetSuratId: 'surat-perjalanan-dinas',
      type: 'triggers',
      label: 'Generates SPD ×N',
      variableMapping: {
        pegawai_list: 'pegawai',
        tujuan: 'tujuan',
        tanggal_mulai: 'tanggal_berangkat',
        tanggal_selesai: 'tanggal_kembali',
        perihal: 'keperluan',
        nomor_sp: 'nomor_sp_ref',
      },
    },
  ],
  nodePosition: { x: 60, y: 220 },
};
