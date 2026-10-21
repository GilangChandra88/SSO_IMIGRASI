/**
 * Unggah/hapus berkas LPJ di Firebase Storage (aturan: storage.rules).
 * Path: lpj/{packId}/{folder}/{waktu}-{nama}
 */

import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '@/config/firebase';

/**
 * @returns {Promise<{path, url, name, size, type, uploadedAt, uploadedBy}>}
 */
export async function uploadLpjFile(packId, folder, file, uid = '') {
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80);
  const path = `lpj/${packId}/${folder}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' });
  const url = await getDownloadURL(fileRef);
  return {
    path,
    url,
    name: file.name,
    size: file.size,
    type: file.type || '',
    uploadedAt: new Date().toISOString(),
    uploadedBy: uid,
  };
}

/** Hapus berkas; diam bila sudah tidak ada. */
export async function deleteLpjFile(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    if (err?.code !== 'storage/object-not-found') throw err;
  }
}

/** Hapus seluruh isi folder Storage `prefix` (rekursif); diam bila gagal. */
export async function deleteLpjFolder(prefix) {
  try {
    const res = await listAll(ref(storage, prefix));
    await Promise.all([
      ...res.items.map((it) => deleteObject(it).catch(() => {})),
      ...res.prefixes.map((p) => deleteLpjFolder(p.fullPath)),
    ]);
  } catch (err) {
    console.error('deleteLpjFolder error:', err);
  }
}

/**
 * Validasi berkas pindaian (gambar/PDF, < 5 MB sesuai storage.rules).
 * @returns {string} pesan galat, atau '' bila sah
 */
export function validasiBerkas(file) {
  if (!file) return 'Pilih berkas terlebih dahulu.';
  if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) {
    return 'File harus berupa gambar (JPG/PNG) atau PDF.';
  }
  if (file.size >= 5 * 1024 * 1024) return 'Ukuran file harus kurang dari 5 MB.';
  return '';
}

/** Buka berkas unggahan di tab baru (penampil PDF/gambar bawaan browser, termasuk cetak). */
export function bukaBerkas(file) {
  if (file?.url) window.open(file.url, '_blank', 'noopener');
}

/** Pesan error unggah yang bisa dibaca pengguna. */
export function pesanGagalUnggah(err) {
  if (err?.code === 'storage/unauthorized') {
    return 'Unggah ditolak. Pastikan aturan Firebase Storage sudah dipasang (storage.rules).';
  }
  if (err?.code === 'storage/retry-limit-exceeded' || err?.code === 'storage/canceled') {
    return 'Unggah terputus. Periksa koneksi lalu coba lagi.';
  }
  return 'Gagal mengunggah berkas. Coba lagi.';
}
