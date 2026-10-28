/**
 * Akses Firestore Inventory (docs/skema-database.md §5.5).
 * - Master (`inventory_kategori`, `inventory_barang`, `inventory_pemasok`) ditulis Umum lewat
 *   rules dengan jejak audit; tidak dihapus, dinonaktifkan (`aktif: false`).
 * - Kode SAKTI dijaga unik lewat `inventory_kode/{kode}` (dibuat dalam batch yang sama, tidak bisa
 *   ditimpa) dan hanya diganti lewat Function `ubahKodeSakti`.
 * - Transaksi masuk/keluar hanya lewat Function (`catatMasuk`, `catatKeluar`, `ubahTransaksi`,
 *   `batalkanTransaksi`); nomor TBR/TBK berlanjut lintas tahun.
 * - Stok dihitung dari ringkasan per tahun `inventory_saldo` (ditulis Function), bukan dari
 *   seluruh transaksi.
 */
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  startAt,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { AKUN_PERSEDIAAN } from '../data/konstanta';

const kol = (nama) => collection(db, nama);
const jejakBuat = (uid) => ({
  dibuatPada: serverTimestamp(),
  dibuatOleh: uid,
  diubahPada: serverTimestamp(),
  diubahOleh: uid,
});
const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });
const tulisPenjaga = (batch, kode, jenis, refId, uid) =>
  batch.set(doc(db, KOLEKSI.inventoryKode, kode), {
    jenis,
    refId,
    dibuatPada: serverTimestamp(),
    dibuatOleh: uid,
  });

// ─── Kueri (limit sesuai skema §9) ───────────────────────────────────────────

export const kueriKategori = () =>
  query(kol(KOLEKSI.inventoryKategori), limit(LIMIT_KUERI.kategoriInventory));
export const kueriBarang = () =>
  query(kol(KOLEKSI.inventoryBarang), limit(LIMIT_KUERI.barangInventory));
export const kueriPemasok = () =>
  query(kol(KOLEKSI.inventoryPemasok), limit(LIMIT_KUERI.pemasokInventory));
export const kueriSaldo = () =>
  query(kol(KOLEKSI.inventorySaldo), limit(LIMIT_KUERI.saldoInventory));

const kolTransaksi = (jenis) =>
  kol(jenis === 'masuk' ? KOLEKSI.inventoryMasuk : KOLEKSI.inventoryKeluar);

/**
 * Riwayat transaksi satu jenis, terbaru dulu (≤200 per halaman). Tanpa rentang: menurut nomor
 * (urutan dicatat); dengan rentang tanggal: menurut tanggal. `setelah` = baris terakhir halaman
 * sebelumnya (rentang memakai startAt + buang duplikat karena tanggal bisa sama).
 */
export function kueriTransaksi(jenis, { dari = '', sampai = '', setelah = null } = {}) {
  if (dari) {
    return query(
      kolTransaksi(jenis),
      where('tanggal', '>=', dari),
      where('tanggal', '<=', sampai || dari),
      orderBy('tanggal', 'desc'),
      ...(setelah ? [startAt(setelah.tanggal)] : []),
      limit(LIMIT_KUERI.transaksiInventory),
    );
  }
  return query(
    kolTransaksi(jenis),
    orderBy('nomor', 'desc'),
    ...(setelah ? [startAfter(setelah.nomor)] : []),
    limit(LIMIT_KUERI.transaksiInventory),
  );
}

/**
 * Transaksi satu barang (rincian barang di Stok Barang), ≤200 per jenis; diurutkan di browser
 * supaya cukup indeks satu field (`barangId`, `barangIds`).
 */
export const kueriTransaksiBarang = (jenis, barangId) =>
  query(
    kolTransaksi(jenis),
    jenis === 'masuk'
      ? where('barangId', '==', barangId)
      : where('barangIds', 'array-contains', barangId),
    limit(LIMIT_KUERI.transaksiInventory),
  );

/** Beberapa transaksi terbaru (menurut nomor) untuk Aktivitas Terbaru di Dashboard. */
export const kueriTerbaru = (jenis, n) =>
  query(kolTransaksi(jenis), orderBy('nomor', 'desc'), limit(n));

export async function ambilTransaksiBerikutnya(jenis, opsi, setelah) {
  const snap = await getDocs(kueriTransaksi(jenis, { ...opsi, setelah }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Kategori ─────────────────────────────────────────────────────────────────

/** Kategori baru + penjaga kode 10 digit (gagal bila kode sudah dipakai). */
export async function tambahKategori({ kode, nama, akunKode = AKUN_PERSEDIAAN.kode }, uid) {
  const ref = doc(kol(KOLEKSI.inventoryKategori));
  const batch = writeBatch(db);
  batch.set(ref, { kode, nama, akunKode, aktif: true, ...jejakBuat(uid) });
  tulisPenjaga(batch, kode, 'kategori', ref.id, uid);
  await batch.commit();
  return ref.id;
}

/** Ubah nama/akun kategori (kode diganti lewat `ubahKodeSakti`). */
export const ubahKategori = (id, { nama, akunKode }, uid) =>
  updateDoc(doc(db, KOLEKSI.inventoryKategori, id), { nama, akunKode, ...jejakUbah(uid) });

export const nonaktifkanKategori = (id, uid) =>
  updateDoc(doc(db, KOLEKSI.inventoryKategori, id), { aktif: false, ...jejakUbah(uid) });

// ─── Barang ───────────────────────────────────────────────────────────────────

function tulisBarangBaru(batch, b, kodeKategori, uid) {
  const ref = doc(kol(KOLEKSI.inventoryBarang));
  batch.set(ref, {
    kode: b.kode || '',
    kategoriId: b.kategoriId || null,
    nama: b.nama,
    satuan: b.satuan,
    stokAwal: b.stokAwal,
    stokMin: b.stokMin,
    aktif: true,
    ...jejakBuat(uid),
  });
  if (b.kode && b.kategoriId && kodeKategori) {
    tulisPenjaga(batch, kodeKategori + b.kode, 'barang', ref.id, uid);
  }
  return ref.id;
}

/**
 * Barang baru (+ penjaga kode SAKTI 16 digit bila kategori & kode terisi).
 * @param {{ kode, kategoriId, nama, satuan, stokAwal, stokMin }} b
 * @param {string} kodeKategori  kode 10 digit kategorinya ('' bila tanpa kategori)
 */
export async function tambahBarang(b, kodeKategori, uid) {
  const batch = writeBatch(db);
  const id = tulisBarangBaru(batch, b, kodeKategori, uid);
  await batch.commit();
  return id;
}

/** Ubah keterangan barang; stok awal terkunci (rules) setelah barang punya transaksi. */
export const ubahBarang = (id, { nama, satuan, stokAwal, stokMin }, uid) =>
  updateDoc(doc(db, KOLEKSI.inventoryBarang, id), {
    nama,
    satuan,
    stokAwal,
    stokMin,
    ...jejakUbah(uid),
  });

export const nonaktifkanBarang = (id, uid) =>
  updateDoc(doc(db, KOLEKSI.inventoryBarang, id), { aktif: false, ...jejakUbah(uid) });

/**
 * Tambah banyak barang sekaligus (hasil impor CSV), 200 barang per batch (barang + penjaga).
 * @param {(kategoriId: string|null) => string} kodeKategoriDari
 */
export async function imporBarang(daftar, kodeKategoriDari, uid) {
  for (let i = 0; i < daftar.length; i += 200) {
    const batch = writeBatch(db);
    daftar
      .slice(i, i + 200)
      .forEach((b) => tulisBarangBaru(batch, b, kodeKategoriDari(b.kategoriId), uid));
    await batch.commit();
  }
}

// ─── Pemasok ──────────────────────────────────────────────────────────────────

export function tambahPemasok(nama, uid) {
  const ref = doc(kol(KOLEKSI.inventoryPemasok));
  const batch = writeBatch(db);
  batch.set(ref, { nama, namaKunci: nama.toLowerCase(), aktif: true, ...jejakBuat(uid) });
  return batch.commit().then(() => ref.id);
}

// ─── Function ─────────────────────────────────────────────────────────────────

const panggil = (nama, data) => httpsCallable(functions, nama)(data).then((hasil) => hasil.data);

/** @param {{ tanggal, pemasokNama, items: { barangId, jumlah }[] }} data */
export const catatMasuk = (data) => panggil('catatMasuk', data);
/** @param {{ tanggal, seksi, pengambilId, items: { barangId, jumlah }[] }} data */
export const catatKeluar = (data) => panggil('catatKeluar', data);
/** Ubah transaksi di tempat (nomor tetap): { jenis, id, ...isian seperti catatMasuk/Keluar }. */
export const ubahTransaksi = (data) => panggil('ubahTransaksi', data);
export const batalkanTransaksi = (jenis, id, alasan) =>
  panggil('batalkanTransaksi', { jenis, id, alasan });
/** { jenis: 'kategori', id, kode } atau { jenis: 'barang', id, kategoriId, kode }. */
export const ubahKodeSakti = (data) => panggil('ubahKodeSakti', data);
