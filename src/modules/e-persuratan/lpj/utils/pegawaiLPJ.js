/**
 * Helper data pegawai untuk paket LPJ.
 */

/**
 * Format baku string pegawai yang dipakai form surat (SuratForm) dan PDF.
 * Harus sama persis dengan SuratForm agar pencocokan nama di syncSPDItems berjalan.
 */
export const formatPegawaiString = (p) =>
  `${p.nama}\nNIP. ${p.nip || '-'}\nPangkat: ${p.pangkat || '-'}\nJabatan: ${p.jabatan || '-'}`;

/**
 * Ubah dokumen koleksi `pegawai` menjadi entri `pegawai_list` pada paket LPJ.
 * `uid` memakai `authUid` (UID akun login), bukan ID dokumen pegawai.
 */
export const toPackPegawai = (p) => ({
  uid: p.authUid || '',
  pegawai_id: p.id,
  nama: p.nama || '',
  nip: p.nip || '',
  pangkat: p.pangkat || '',
  jabatan: p.jabatan || '',
});
