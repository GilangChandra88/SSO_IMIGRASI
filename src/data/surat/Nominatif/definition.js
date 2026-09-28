/** NOMINATIF */
export const definition = {
  id: 'nominatif',
  kode: 'NOM',
  nama: 'Nominatif',
  kategori: 'Keuangan',
  deskripsi:
    'Daftar nominatif penerima uang perjalanan dinas: nama, NIP, jumlah yang diterima, dan tanda tangan.',
  icon: '📊',
  warna: '#10b981',
  status: 'active',
  variables: [
    {
      key: 'pegawai_list',
      label: 'Daftar Pegawai',
      type: 'multi_pegawai',
      required: true,
      source: 'linked',
    },
    { key: 'tujuan', label: 'Tujuan', type: 'text', required: true, source: 'linked' },
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
      key: 'uang_harian',
      label: 'Uang Harian/hari',
      type: 'currency',
      required: true,
      source: 'linked',
    },
    { key: 'total_hari', label: 'Total Hari', type: 'number', required: true, source: 'linked' },
    {
      key: 'total_per_orang',
      label: 'Total per Orang (Rp)',
      type: 'currency',
      required: true,
      source: 'auto',
    },
    {
      key: 'grand_total',
      label: 'Grand Total (Rp)',
      type: 'currency',
      required: true,
      source: 'linked',
    },
    { key: 'bendahara', label: 'Bendahara', type: 'pegawai', required: true, source: 'linked' },
  ],
  connections: [
    {
      targetSuratId: 'lembar-verifikasi',
      type: 'references',
      label: '→ Verifikasi',
      variableMapping: {},
    },
  ],
  nodePosition: { x: 830, y: 540 },
};
