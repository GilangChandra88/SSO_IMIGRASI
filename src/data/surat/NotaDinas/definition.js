/** NOTA DINAS */
export const definition = {
  id: 'nota-dinas',
  kode: 'NDINAS',
  nama: 'Nota Dinas',
  kategori: 'Keuangan',
  deskripsi:
    'Nota dinas pertanggungjawaban biaya perjalanan dinas. Ditujukan kepada Kepala Kantor dari PPK.',
  icon: '📝',
  warna: '#3b82f6',
  status: 'active',
  variables: [
    { key: 'nomor_nd', label: 'Nomor Nota Dinas', type: 'text', required: true, source: 'auto' },
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true, source: 'linked' },
    { key: 'kepada', label: 'Kepada (Jabatan)', type: 'text', required: true, source: 'input' },
    { key: 'perihal', label: 'Perihal', type: 'textarea', required: true, source: 'linked' },
    {
      key: 'total_biaya',
      label: 'Total Biaya (Rp)',
      type: 'currency',
      required: true,
      source: 'linked',
    },
    { key: 'mak', label: 'Kode MAK', type: 'text', required: true, source: 'linked' },
    { key: 'pejabat_ppk', label: 'Pejabat PPK', type: 'pegawai', required: true, source: 'linked' },
  ],
  connections: [
    {
      targetSuratId: 'lembar-verifikasi',
      type: 'references',
      label: '→ Verifikasi',
      variableMapping: {},
    },
  ],
  nodePosition: { x: 830, y: 40 },
};
