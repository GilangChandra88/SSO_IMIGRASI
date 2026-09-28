/** LAMPIRAN */
export const definition = {
  id: 'lampiran',
  kode: 'LMP',
  nama: 'Lampiran',
  kategori: 'Bundle/Arsip',
  deskripsi:
    'Lampiran pendukung dokumen perjalanan dinas: tiket, nota, bukti akomodasi, foto, dan dokumen pendukung lainnya.',
  icon: '📎',
  warna: '#ef4444',
  status: 'active',
  variables: [
    {
      key: 'jenis_lampiran',
      label: 'Jenis Lampiran',
      type: 'checklist',
      required: true,
      source: 'input',
      options: [
        'Tiket Pesawat/Kereta',
        'Nota Hotel/Penginapan',
        'Bukti Akomodasi Lain',
        'Dokumentasi Foto',
        'Hasil Notulensi/Rapat',
        'Sertifikat/Tanda Peserta',
        'Dokumen Lain',
      ],
    },
    {
      key: 'keterangan',
      label: 'Keterangan Tambahan',
      type: 'textarea',
      required: false,
      source: 'input',
    },
    {
      key: 'jumlah_halaman',
      label: 'Jumlah Halaman',
      type: 'number',
      required: false,
      source: 'input',
    },
  ],
  connections: [],
  nodePosition: { x: 1090, y: 580 },
};
