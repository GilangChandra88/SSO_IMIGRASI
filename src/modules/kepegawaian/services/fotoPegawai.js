/**
 * Foto pegawai di Firebase Storage `pegawai/{id}/...` (aturan: storage.rules). Dipakai captcha
 * ulang tahun saat login; dokumen pegawai hanya menyimpan { path, url }.
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/config/firebase';

export const MAKS_FOTO = 2 * 1024 * 1024;

/** @returns {string} pesan galat, atau '' bila sah */
export function validasiFoto(file) {
  if (!file) return '';
  if (!file.type.startsWith('image/')) return 'Foto harus berupa gambar (JPG/PNG).';
  if (file.size >= MAKS_FOTO) return 'Ukuran foto harus kurang dari 2 MB.';
  return '';
}

export async function unggahFotoPegawai(pegawaiId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `pegawai/${pegawaiId}/foto-${Date.now()}.${ext || 'jpg'}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return { path, url: await getDownloadURL(fileRef) };
}

/** Hapus foto lama; diam bila sudah tidak ada. */
export async function hapusFotoPegawai(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    if (err?.code !== 'storage/object-not-found') throw err;
  }
}
