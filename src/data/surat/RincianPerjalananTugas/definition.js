/** RINCIAN PERJALANAN TUGAS */
export const definition = {
  id: 'rincian-perjalanan-tugas',
  kode: 'RPERT',
  nama: 'Rincian Perjalanan Tugas',
  kategori: 'Keuangan',
  deskripsi:
    'Rincian detail perjalanan: tanggal, rute, alat angkutan, dan biaya masing-masing tahap perjalanan.',
  icon: '🗺️',
  warna: '#3b82f6',
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
      key: 'tanggal_berangkat',
      label: 'Tanggal Berangkat',
      type: 'date',
      required: true,
      source: 'linked',
    },
    {
      key: 'tanggal_kembali',
      label: 'Tanggal Kembali',
      type: 'date',
      required: true,
      source: 'linked',
    },
    {
      key: 'rute_perjalanan',
      label: 'Rute Perjalanan',
      type: 'text',
      required: true,
      source: 'input',
    },
    {
      key: 'alat_angkutan',
      label: 'Alat Angkutan',
      type: 'text',
      required: true,
      source: 'linked',
    },
    {
      key: 'biaya_transport',
      label: 'Biaya Transport (Rp)',
      type: 'currency',
      required: true,
      source: 'linked',
    },
  ],
  connections: [
    {
      targetSuratId: 'lembar-verifikasi',
      type: 'references',
      label: '→ Verifikasi',
      variableMapping: {},
    },
  ],
  nodePosition: { x: 830, y: 340 },
};
