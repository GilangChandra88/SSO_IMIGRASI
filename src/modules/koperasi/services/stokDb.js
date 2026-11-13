/**
 * Akses Firestore master barang Kantin (docs/skema-database.md §5.7). Barang ditulis HANYA lewat
 * Function `simpanBarangKantin`/`aturAktifBarangKantin` (barkode standar & unik dijaga server; lihat
 * services/fungsi.js). Kategori diubah langsung (nama/aktif). Tidak ada yang dihapus.
 */
import { collection, doc, limit, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { buatKategoriKantin } from './fungsi';

const koleksiKategori = () => collection(db, KOLEKSI.koperasiKantinKategori);
const koleksiBarang = () => collection(db, KOLEKSI.koperasiKantinBarang);

const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });

export const kueriKategori = () => query(koleksiKategori(), limit(LIMIT_KUERI.kategoriKantin));
export const kueriBarang = () => query(koleksiBarang(), limit(LIMIT_KUERI.barangKantin));

/** Kategori baru dibuat Function (sekaligus akun Penjualan 31xx & HPP 35xx-nya). */
export const tambahKategori = (nama) => buatKategoriKantin({ nama });

export const ubahKategori = (id, data, uid) =>
  updateDoc(doc(koleksiKategori(), id), { ...data, ...jejakUbah(uid) });
