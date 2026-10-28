/**
 * Berkas di Firebase Storage (CLAUDE.md 7.1 "Berkas"): unggah dengan nama `{epochMs13}-{namaAman}`
 * dan cacheControl privat, simpan metadata `Meta` saja (tanpa url), buka lewat getBlob().
 * Folder dan batas ukuran ditentukan pemanggil (JALUR_BERKAS, UKURAN_BERKAS); storage.rules
 * menegakkan path, tipe, ukuran, dan siapa yang boleh.
 */

import { Timestamp } from 'firebase/firestore';
import { deleteObject, getBlob, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '@/config/firebase';
import { namaBerkasAman, TIPE_GAMBAR_PDF } from '@/config/koleksi';
import { PANJANG } from './batas';

const CACHE_CONTROL = 'private, max-age=31536000, immutable';
const KB = 1024;
const MB = 1024 * KB;

/** 1536000 → '1,5 MB'; 307200 → '300 KB'. */
export const formatUkuran = (byte) =>
  byte >= MB
    ? `${(byte / MB).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.ceil(byte / KB))} KB`;

/**
 * @param {{ tipe: readonly string[], maksByte: number }} aturan
 * @returns {string} pesan galat, atau '' bila sah
 */
export function validasiBerkas(file, { tipe, maksByte }) {
  if (!file) return 'Pilih berkas terlebih dahulu.';
  if (!tipe.includes(file.type)) {
    return tipe.includes('application/pdf')
      ? 'Berkas harus berupa gambar JPG/PNG atau PDF.'
      : 'Berkas harus berupa gambar JPG atau PNG.';
  }
  if (!file.size) return 'Berkas kosong.';
  if (file.size > maksByte) return `Ukuran berkas maksimal ${formatUkuran(maksByte)}.`;
  return '';
}

// Nama berkas memakai waktu unggah (ms); dijaga selalu naik supaya unggahan beruntun yang bernama
// sama (mis. "image.jpg" dari ponsel) tidak bertabrakan (rules menolak penimpaan).
let waktuTerakhir = 0;

/**
 * Unggah satu berkas ke `folder` (diakhiri "/").
 * @param {{ uid: string, onProgress?: (persen: number) => void, nama?: string }} opsi  nama = nama
 *   berkas yang sudah aman (`{epochMs13}-{namaAman}`) untuk memakai nama yang sama di folder lain,
 *   mis. thumbnail foto pegawai
 * @returns {Promise<{ path, nama, ukuran, tipe, diunggahPada, diunggahOleh }>} Meta untuk Firestore
 */
export async function unggahBerkas(folder, file, { uid, onProgress, nama } = {}) {
  let path = folder + nama;
  if (!nama) {
    const waktu = Math.max(Date.now(), waktuTerakhir + 1);
    waktuTerakhir = waktu;
    path = folder + namaBerkasAman(file.name, waktu);
  }
  const tugas = uploadBytesResumable(ref(storage, path), file, {
    contentType: file.type,
    cacheControl: CACHE_CONTROL,
  });
  if (onProgress) {
    tugas.on('state_changed', (s) =>
      onProgress(s.totalBytes ? (s.bytesTransferred / s.totalBytes) * 100 : 0),
    );
  }
  await tugas;
  return {
    path,
    nama: String(file.name || 'berkas').slice(0, PANJANG.namaBerkas),
    ukuran: file.size,
    tipe: file.type,
    // Waktu browser (serverTimestamp tidak bisa dipakai di dalam daftar); jejak resmi ada di dokumen
    diunggahPada: Timestamp.now(),
    diunggahOleh: uid,
  };
}

/** Hapus satu berkas; diam bila sudah tidak ada. */
export async function hapusDariStorage(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    if (err?.code !== 'storage/object-not-found') throw err;
  }
}

// ─── Membuka berkas ─────────────────────────────────────────────────────────
// Berkas tidak pernah ditimpa (path unik), jadi isi hasil getBlob() aman disimpan per path.
// Cache hanya di memori (hilang saat logout karena halaman dimuat ulang), dibatasi total ukurannya.

const BATAS_CACHE = 80 * MB;
const cache = new Map(); // path → { janji: Promise<Blob>, ukuran } ; urutan = terakhir dipakai
let totalCache = 0;

function rampingkanCache(kecuali) {
  for (const [path, e] of cache) {
    if (totalCache <= BATAS_CACHE) break;
    if (path === kecuali || !e.ukuran) continue;
    cache.delete(path);
    totalCache -= e.ukuran;
  }
}

/** Isi berkas sebagai Blob, bertipe aman (hanya JPEG/PNG/PDF; selain itu diperlakukan biner). */
export function ambilBlob(path) {
  const ada = cache.get(path);
  if (ada) {
    cache.delete(path);
    cache.set(path, ada);
    return ada.janji;
  }
  const e = { ukuran: 0, janji: null };
  e.janji = getBlob(ref(storage, path)).then(
    (blob) => {
      const aman = TIPE_GAMBAR_PDF.includes(blob.type)
        ? blob
        : new Blob([blob], { type: 'application/octet-stream' });
      e.ukuran = aman.size;
      totalCache += aman.size;
      rampingkanCache(path);
      return aman;
    },
    (err) => {
      if (cache.get(path) === e) cache.delete(path);
      throw err;
    },
  );
  cache.set(path, e);
  return e.janji;
}

/**
 * Buka berkas di tab baru (penampil PDF/gambar bawaan browser, termasuk cetak). Tab dibuka saat
 * itu juga (masih dalam klik pengguna, supaya tidak diblokir), lalu diisi setelah berkas terunduh.
 * `meta` boleh berupa Promise (Meta yang masih dibaca dari Firestore); bila hasilnya kosong, tab
 * ditutup lagi.
 * @param {{ path: string, nama?: string } | Promise<{ path: string, nama?: string } | null>} meta
 * @returns {Promise<boolean>}  false bila tidak ada berkas untuk dibuka
 */
export async function bukaBerkas(meta) {
  const janji = typeof meta?.then === 'function';
  if (!janji && !meta?.path) return false;
  const tab = window.open('', '_blank');
  if (tab) {
    tab.opener = null;
    tab.document.title = (!janji && meta.nama) || 'Berkas';
    tab.document.body.textContent = 'Memuat berkas…';
  }
  try {
    const m = await meta;
    if (!m?.path) {
      tab?.close();
      return false;
    }
    if (tab && m.nama) tab.document.title = m.nama;
    const url = URL.createObjectURL(await ambilBlob(m.path));
    if (tab) tab.location.replace(url);
    else window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch (err) {
    tab?.close();
    throw err;
  }
}

/** Pesan galat unggah/unduh yang bisa dibaca pengguna. */
export function pesanGagalUnggah(err, cadangan = 'Gagal mengunggah berkas. Coba lagi.') {
  switch (err?.code) {
    case 'storage/unauthorized':
      return 'Ditolak server: tahap ini sudah dikunci, Anda tidak punya akses, atau berkas tidak sesuai aturan (tipe/ukuran).';
    case 'storage/object-not-found':
      return 'Berkas tidak ditemukan.';
    case 'storage/retry-limit-exceeded':
    case 'storage/canceled':
      return 'Koneksi terputus. Periksa jaringan lalu coba lagi.';
    case 'storage/quota-exceeded':
      return 'Kuota penyimpanan habis. Hubungi pemilik proyek.';
    default:
      return cadangan;
  }
}
