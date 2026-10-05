/**
 * Model kosong tiap bagian berkas LPJ (emptyModels.js purwarupa).
 * Pegawai disimpan sebagai referensi: { id, uid, nama, nip, pangkat, jabatan }.
 */

/** Referensi pegawai dari dokumen koleksi `pegawai` (uid = authUid akun login). */
export const toPegawaiRef = (p) => ({
  id: p.id || '',
  uid: p.authUid || p.uid || '',
  nama: p.nama || '',
  nip: p.nip || '',
  pangkat: p.pangkat || '',
  jabatan: p.jabatan || '',
});

export const emptyMak = () => ({ kode: '', akunNodeId: '', tahunNodeId: '', pilihan: {} });

export const emptyTransaksi = () => ({
  pelaksanaId: '',
  itemNodeId: '',
  itemKode: '',
  itemName: '',
  jumlah: '',
});

export const emptySp = (pegawaiLogin) => ({
  menimbang: '',
  dasar: [],
  kepada: pegawaiLogin ? [pegawaiLogin] : [],
  untuk: [''],
  pejabat: null,
  locked: false,
  nomorSurat: '',
  scan: null,
});

export const emptySpd = () => ({
  lembarKe: '1',
  kodeNo: '',
  nomorSPD: '',
  tanggal: '',
  seksi: '',
  maksud: '',
  alatAngkut: '',
  tujuan: '',
  berangkat: '',
  kembali: '',
  mak: emptyMak(),
  locked: false,
  dicetak: {},
});

export const emptyLpj = () => ({
  tanggalLPJ: '',
  keterangan: '',
  transaksi: [emptyTransaksi()],
  locked: false,
});

export const emptyLap = () => ({
  tanggalLaporan: '',
  pendahuluan: '',
  pelaksanaan: '',
  hasil: '',
  kesimpulan: '',
  rekomendasi: '',
  fotos: [],
  locked: false,
});

export const emptySelesai = () => ({ sp: false, lpjDocs: {}, laporan: false });

export const emptyNp = (pegawaiLogin, uraian = '') => ({
  tanggal: '',
  pelaksana: pegawaiLogin ? [pegawaiLogin] : [],
  mak: emptyMak(),
  uraian,
  transaksi: [emptyTransaksi()],
  formLocked: false,
  npDocs: {},
  lampiran: { foto_bukti: [], nota_pembayaran: [] },
  lampiranLocked: false,
});

export const emptyPembayaran = () => ({
  buktiTransfer: '',
  tanggalTransfer: '',
  nomorRekening: '',
});
