/**
 * REGISTRY SURAT IMIGRASI
 * ========================
 * Daftarkan semua jenis surat di sini.
 * Tiap surat punya folder sendiri di src/data/surat/<NamaSurat>/
 * dengan file definition.js di dalamnya.
 *
 * Untuk menambah surat baru:
 * 1. Buat folder baru: src/data/surat/NamaSuratBaru/
 * 2. Buat definition.js di folder tersebut (copy dari yang sudah ada)
 * 3. Import dan daftarkan di SURAT_REGISTRY di bawah
 */

// ─── Workflow: Perjalanan Dinas ───────────────────────────────────────────────
import { definition as suratPerintah } from './SuratPerintah/definition';
import { definition as suratPerjalananDinas } from './SuratPerjalananDinas/definition';
import { definition as spby } from './SPBY/definition';
// Turunan SPBY (7 dokumen keuangan)
import { definition as notaDinas } from './NotaDinas/definition';
import { definition as suratPerintahBayar } from './SuratPerintahBayar/definition';
import { definition as rincianSPBy } from './RincianSPBy/definition';
import { definition as rincianPerjalananTugas } from './RincianPerjalananTugas/definition';
import { definition as sptjmPelaksana } from './SPTJMPelaksana/definition';
import { definition as nominatif } from './Nominatif/definition';
import { definition as kwitansi } from './Kwitansi/definition';
// Bundle Akhir
import { definition as lembarVerifikasi } from './LembarVerifikasi/definition';
import { definition as laporan } from './Laporan/definition';
import { definition as lampiran } from './Lampiran/definition';

// ─── Daftar semua surat yang terdaftar ────────────────────────────────────────
// Urutan = urutan tampil di CardView & flow (kiri ke kanan, atas ke bawah)
export const SURAT_REGISTRY = [
  // — Workflow: Perjalanan Dinas —
  suratPerintah, // 1. SP → trigger SPD
  suratPerjalananDinas, // 2. SPD → input SPBY
  spby, // 3. SPBY (form hub) → generate 7 dok
  notaDinas, // 4a. Nota Dinas
  suratPerintahBayar, // 4b. Surat Perintah Bayar
  rincianSPBy, // 4c. Rincian SPBy
  rincianPerjalananTugas, // 4d. Rincian Perjalanan
  sptjmPelaksana, // 4e. SPTJM Pelaksana
  nominatif, // 4f. Nominatif
  kwitansi, // 4g. Kwitansi
  lembarVerifikasi, // 5. Cover Bundle/Verifikasi
  laporan, // 6. Laporan
  lampiran, // 7. Lampiran

  // — Tambahkan workflow lain di sini ↓ —
  // suratKeteranganTinggal, // Layanan WNA
];

/**
 * Ambil definisi surat berdasarkan ID-nya
 * @param {string} id
 * @returns {object|undefined}
 */
export function getSuratById(id) {
  return SURAT_REGISTRY.find((s) => s.id === id);
}

/**
 * Ambil semua surat berdasarkan kategori
 * @param {string} kategori
 * @returns {object[]}
 */
export function getSuratByKategori(kategori) {
  return SURAT_REGISTRY.filter((s) => s.kategori === kategori);
}

/**
 * Ambil semua kategori unik yang ada
 * @returns {string[]}
 */
export function getAllKategori() {
  return [...new Set(SURAT_REGISTRY.map((s) => s.kategori))];
}
