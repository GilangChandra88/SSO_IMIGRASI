/**
 * Kontak pribadi milik pegawai yang login (`pegawai_kontak/{pegawaiId}`, docs/skema-database.md
 * §5.1). Rules: pemilik boleh membaca & menulis kontaknya sendiri; data kepegawaian lain hanya
 * diubah Kepegawaian.
 */
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { pantau } from '@/utils/pantau';

/** @param {(kontak: object|null) => void} onData  null = belum pernah diisi */
export function pantauKontakSaya(pegawaiId, onData, onGalat) {
  return pantau(
    doc(db, KOLEKSI.pegawaiKontak, pegawaiId),
    (snap) => onData(snap.exists() ? snap.data() : null),
    { onGalat, pesan: 'Gagal memuat kontak Anda.' },
  );
}

/** Simpan kontak sendiri. `ada` = dokumen kontak sudah ada (ubah), selain itu buat baru. */
export function simpanKontakSaya(pegawaiId, { alamat, emailPribadi, noWa }, uid, ada) {
  const ref = doc(db, KOLEKSI.pegawaiKontak, pegawaiId);
  const isi = { alamat, emailPribadi, noWa, diubahPada: serverTimestamp(), diubahOleh: uid };
  return ada
    ? updateDoc(ref, isi)
    : setDoc(ref, { ...isi, dibuatPada: serverTimestamp(), dibuatOleh: uid });
}
