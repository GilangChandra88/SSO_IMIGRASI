/**
 * Pesan galat Firestore / Cloud Functions yang bisa dibaca pengguna. Pesan HttpsError dari Function
 * kita sudah berbahasa Indonesia dan aman ditampilkan; galat internal tidak pernah diteruskan.
 */
export function pesanGalat(err, cadangan = 'Gagal menyimpan. Coba lagi.') {
  const kode = err?.code || '';
  if (kode === 'permission-denied' || kode === 'functions/permission-denied') {
    return err?.message && kode.startsWith('functions/')
      ? err.message
      : 'Anda tidak punya akses untuk tindakan ini.';
  }
  if (kode.startsWith('functions/') && kode !== 'functions/internal' && err?.message) {
    return err.message;
  }
  if (kode === 'unavailable' || kode === 'functions/unavailable') {
    return 'Server tidak bisa dihubungi. Periksa jaringan.';
  }
  return cadangan;
}
