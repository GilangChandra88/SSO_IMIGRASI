/**
 * Unggah/hapus berkas LPJ di Firebase Storage (aturan: storage.rules).
 * Path: lpj/{packId}/{folder}/{waktu}-{nama}
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
