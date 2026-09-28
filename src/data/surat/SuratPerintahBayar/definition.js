/** SURAT PERINTAH BAYAR (SPB) */
export const definition = {
  id: 'surat-perintah-bayar',
  kode: 'SPB',
  nama: 'Surat Perintah Bayar',
  kategori: 'Keuangan',
  deskripsi:
    'Surat perintah kepada Bendahara Pengeluaran untuk membayarkan biaya perjalanan dinas.',
  icon: '💳',
  warna: '#3b82f6',
  status: 'active',
  variables: [
    { key: 'nomor_spb', label: 'Nomor SPB', type: 'text', required: true, source: 'auto' },
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true, source: 'linked' },
    {
      key: 'jumlah_uang',
      label: 'Jumlah Uang (Rp)',
      type: 'currency',
      required: true,
      source: 'linked',
    },
    { key: 'terbilang', label: 'Terbilang', type: 'text', required: true, source: 'auto' },
    { key: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, source: 'linked' },
    { key: 'mak', label: 'Kode MAK', type: 'text', required: true, source: 'linked' },
    { key: 'pejabat_ppk', label: 'Pejabat PPK', type: 'pegawai', required: true, source: 'linked' },
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
  nodePosition: { x: 830, y: 140 },
};
