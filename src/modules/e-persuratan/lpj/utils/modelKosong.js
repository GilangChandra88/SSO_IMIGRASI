/**
 * Model kosong tiap bagian berkas LPJ (docs/skema-database.md §5.2). Bagian yang belum ada di
 * dokumen dibaca sebagai model kosongnya lewat `bagianDari`. Pegawai disimpan sebagai salinan beku
 * `Orang` { pegawaiId, nama, nip, pangkat, jabatan } (keOrang di @/context/usePegawaiRingkas).
 */

/** ID baris transaksi, unik di dalam satu berkas (dipakai Function sebagai ID realisasi MAK). */
export const idBaris = () => crypto.randomUUID().replace(/-/g, '').slice(0, 20);

export const makKosong = () => ({ kode: '', akunNodeId: '', tahunNodeId: '', pilihan: {} });

export const transaksiKosong = (pelaksanaId = '') => ({
  barisId: idBaris(),
  pelaksanaId,
  itemNodeId: '',
  jumlah: 0,
  salinan: { itemKode: '', itemNama: '' },
});

export const spKosong = (orang = null) => ({
  menimbang: '',
  dasar: [],
  kepada: orang ? [orang] : [],
  untuk: [''],
  pejabat: null, // Orang + kategori: 'kepala' | 'plt' | 'plh'
  terkunci: false,
});

export const tteKosong = () => ({ nomorSurat: '', tanggalSurat: '', scan: null, terkunci: false });

export const spdKosong = (maksud = '') => ({
  lembarKe: '1',
  nomorSpd: '',
  tanggal: '',
  seksi: '',
  maksud, // diawali uraian kegiatan
  alatAngkut: '',
  tujuan: '',
  berangkat: '',
  kembali: '',
  mak: makKosong(),
  terkunci: false,
});

export const lpjKosong = () => ({
  tanggalLpj: '',
  keterangan: '',
  transaksi: [transaksiKosong()],
  terkunci: false, // hanya dikunci Function selesaikanSpby
});

export const laporanKosong = () => ({
  tanggalLaporan: '',
  pendahuluan: '', // A.1 Umum
  maksud: '',
  ruangLingkup: '',
  pelaksanaan: '', // B.3 Uraian Kegiatan
  hasil: '',
  kesimpulan: '', // D. Simpulan dan Saran
  penutup: '',
  penandatangan: null,
  foto: [],
  terkunci: false,
});

export const spbyKosong = (orang = null) => ({
  tanggal: '',
  pelaksana: orang ? [orang] : [],
  mak: makKosong(),
  transaksi: [transaksiKosong()],
  terkunci: false, // hanya dikunci Function selesaikanSpby
});

export const lampiranKosong = () => ({ foto: [], nota: [], terkunci: false });

const MODEL = {
  sp: () => spKosong(),
  tte: tteKosong,
  spd: (berkas) => spdKosong(berkas?.uraian || ''),
  lpj: lpjKosong,
  laporan: laporanKosong,
  spby: () => spbyKosong(),
  lampiran: lampiranKosong,
};

/** Isi satu bagian berkas, dilengkapi model kosong untuk field yang belum ada. */
export const bagianDari = (berkas, bagian) => ({
  ...MODEL[bagian](berkas),
  ...(berkas?.[bagian] || {}),
});
