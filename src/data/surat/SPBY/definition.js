/**
 * SPBY — Form Hub Pembayaran Perjalanan Dinas
 * =============================================
 * SPBY bukan surat tunggal — ini adalah "form input" yang menjadi
 * sumber data bagi 7 dokumen keuangan sekaligus.
 * Setelah SPBY diisi, 7 surat turunan dibuat otomatis.
 */
export const definition = {
  id: 'spby',
  kode: 'SPBY',
  nama: 'SPBY (Form Hub)',
  kategori: 'Keuangan',
  deskripsi:
    'Form Surat Permintaan Bayar yang menjadi sumber data bagi 7 dokumen keuangan: Nota Dinas, SPB, Rincian SPBy, Rincian Perjalanan, SPTJM, Nominatif, dan Kwitansi.',
  icon: '💰',
  warna: '#f59e0b',
  status: 'active',
  variables: [
    {
      key: 'mak',
      label: 'Pembebanan Anggaran (MAK)',
      type: 'mak',
      required: true,
      source: 'input',
    },
    {
      key: 'uraian',
      label: 'Uraian Pembayaran',
      type: 'textarea',
      required: true,
      source: 'input',
    },
    {
      key: 'detail_transaksi',
      label: 'Detail Transaksi',
      type: 'detail_transaksi',
      required: true,
      source: 'input',
    },
    {
      key: 'pejabat_ppk',
      label: 'Pejabat Pembuat Komitmen',
      type: 'pegawai',
      required: true,
      source: 'pegawai',
    },
    {
      key: 'bendahara',
      label: 'Bendahara Pengeluaran',
      type: 'pegawai',
      required: true,
      source: 'pegawai',
    },
    { key: 'tanggal_spby', label: 'Tanggal SPBY', type: 'date', required: true, source: 'input' },
  ],
  connections: [
    { targetSuratId: 'nota-dinas', type: 'triggers', label: '→ Nota Dinas', variableMapping: {} },
    {
      targetSuratId: 'surat-perintah-bayar',
      type: 'triggers',
      label: '→ SPB',
      variableMapping: {},
    },
    {
      targetSuratId: 'rincian-spby',
      type: 'triggers',
      label: '→ Rincian SPBy',
      variableMapping: {},
    },
    {
      targetSuratId: 'rincian-perjalanan-tugas',
      type: 'triggers',
      label: '→ Rincian Perjalanan',
      variableMapping: {},
    },
    { targetSuratId: 'sptjm-pelaksana', type: 'triggers', label: '→ SPTJM', variableMapping: {} },
    { targetSuratId: 'nominatif', type: 'triggers', label: '→ Nominatif', variableMapping: {} },
    { targetSuratId: 'kwitansi', type: 'triggers', label: '→ Kwitansi', variableMapping: {} },
  ],
  nodePosition: { x: 560, y: 220 },
};
