/**
 * Peran pengguna. Sumber kebenaran: custom claims `peran` di token login (ditulis Cloud Function
 * aturPeran), BUKAN dokumen pegawai. Kode di sini sama persis dengan firestore.rules,
 * storage.rules, dan functions/index.js. Tanpa peran khusus = Pegawai.
 */
export const PERAN = Object.freeze({
  superadmin: 'superadmin',
  keuangan: 'keuangan',
  kepegawaian: 'kepegawaian',
  umum: 'umum',
});

/** Peran khusus yang bisa diberikan (urutan tampilan). */
export const PERAN_KHUSUS = Object.freeze(['superadmin', 'keuangan', 'kepegawaian', 'umum']);

/** Pilihan mode "lihat sebagai" untuk Super Admin ('pegawai' = tanpa peran khusus). */
export const PILIHAN_LIHAT_SEBAGAI = Object.freeze([...PERAN_KHUSUS, 'pegawai']);

export const LABEL_PERAN = Object.freeze({
  superadmin: 'Super Admin',
  keuangan: 'Keuangan',
  kepegawaian: 'Kepegawaian',
  umum: 'Umum',
  pegawai: 'Pegawai',
});

export const KETERANGAN_PERAN = Object.freeze({
  superadmin: 'Semua akses, termasuk memberi peran',
  keuangan: 'e-Persuratan: verifikasi, arsip, DRPP, MAK',
  kepegawaian: 'Data pegawai dan akun',
  umum: 'Inventory: barang dan transaksi',
});

/** Daftar peran dari claims → hanya kode yang dikenal, urutan tetap. */
export function peranDariKlaim(klaim) {
  const daftar = Array.isArray(klaim?.peran) ? klaim.peran : [];
  return PERAN_KHUSUS.filter((r) => daftar.includes(r));
}

/** Teks peran untuk tampilan, mis. "Keuangan, Umum"; kosong = "Pegawai". */
export function labelPeran(daftar) {
  return daftar && daftar.length ? daftar.map((r) => LABEL_PERAN[r] || r).join(', ') : 'Pegawai';
}
