import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { catatSesi } from './jejakKlien';

/**
 * Keluar akun lalu memuat ulang ke halaman login. Memuat ulang membuang semua data di memori tab
 * (cache pratinjau berkas, data berkas & pegawai yang sudah diunduh), sehingga pengguna berikutnya
 * di PC bersama tidak bisa melihatnya lewat tab yang sama (K33).
 */
export async function keluarAkun() {
  try {
    // Catat keluar di Log Developer selagi masih login (paling lama 1,5 detik, tidak menghalangi)
    await Promise.race([catatSesi('keluar'), new Promise((r) => setTimeout(r, 1500))]);
    await signOut(auth);
  } finally {
    try {
      sessionStorage.clear();
    } catch {
      // abaikan: penyimpanan sesi tidak tersedia
    }
    window.location.replace('/login');
  }
}
