/** KWITANSI */
export const definition = {
  id: 'kwitansi',
  kode: 'KWT',
  nama: 'Kwitansi',
  kategori: 'Keuangan',
  deskripsi: 'Bukti penerimaan uang perjalanan dinas oleh pelaksana dari Bendahara Pengeluaran.',
  icon: '🧾',
  warna: '#10b981',
  status: 'active',
  variables: [
    {
      key: 'nomor_kwitansi',
      label: 'Nomor Kwitansi',
      type: 'text',
      required: true,
      source: 'auto',
    },
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true, source: 'linked' },
    { key: 'penerima', label: 'Penerima', type: 'text', required: true, source: 'linked' },
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
  nodePosition: { x: 830, y: 640 },
};
