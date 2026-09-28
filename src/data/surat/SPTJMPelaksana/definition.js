/** SPTJM PELAKSANA */
export const definition = {
  id: 'sptjm-pelaksana',
  kode: 'SPTJM',
  nama: 'SPTJM Pelaksana',
  kategori: 'Keuangan',
  deskripsi: 'Surat Pernyataan Tanggung Jawab Mutlak dari pelaksana perjalanan dinas.',
  icon: '✍️',
  warna: '#10b981',
  status: 'active',
  variables: [
    {
      key: 'pegawai_list',
      label: 'Pegawai Pelaksana',
      type: 'multi_pegawai',
      required: true,
      source: 'linked',
    },
    {
      key: 'nomor_sp_ref',
      label: 'No. SP Referensi',
      type: 'text',
      required: true,
      source: 'linked',
    },
    { key: 'tujuan', label: 'Tujuan Perjalanan', type: 'text', required: true, source: 'linked' },
    {
      key: 'tanggal_mulai',
      label: 'Tanggal Mulai',
      type: 'date',
      required: true,
      source: 'linked',
    },
    {
      key: 'tanggal_selesai',
      label: 'Tanggal Selesai',
      type: 'date',
      required: true,
      source: 'linked',
    },
    {
      key: 'total_biaya',
      label: 'Total Biaya (Rp)',
      type: 'currency',
      required: true,
      source: 'linked',
    },
    { key: 'tanggal_ttd', label: 'Tanggal TTD', type: 'date', required: true, source: 'auto' },
  ],
  connections: [
    {
      targetSuratId: 'lembar-verifikasi',
      type: 'references',
      label: '→ Verifikasi',
      variableMapping: {},
    },
  ],
  nodePosition: { x: 830, y: 440 },
};
