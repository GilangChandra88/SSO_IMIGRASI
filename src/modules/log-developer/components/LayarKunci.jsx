import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { FaArrowLeft, FaLock, FaShieldAlt } from 'react-icons/fa';
import { auth } from '@/config/firebase';
import { laporGagalMasuk } from '@/utils/jejakKlien';
import { pesanGalat } from '@/utils/pesanGalat';
import { ANIM } from '@/utils/animasi';
import { bukaKunci } from '../services/logDev';
import { K } from '../ui/kelas';

/**
 * Layar kunci: Super Admin mengetik ulang kata sandi (autentikasi ulang Firebase), lalu Function
 * `bukaKunciLogDev` memeriksa login itu benar-benar baru (≤ 2 menit) dan mencatat pembukaan.
 */
export default function LayarKunci({ onTerbuka }) {
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const email = auth.currentUser?.email || '';

  const buka = async (e) => {
    e.preventDefault();
    if (!sandi) return;
    setSibuk(true);
    setGalat('');
    try {
      await reauthenticateWithCredential(
        auth.currentUser,
        EmailAuthProvider.credential(email, sandi),
      );
      await auth.currentUser.getIdToken(true);
      const { terkunciPada } = await bukaKunci({});
      onTerbuka(terkunciPada);
    } catch (err) {
      const salahSandi = String(err?.code || '').startsWith('auth/');
      if (salahSandi && err.code !== 'auth/network-request-failed') laporGagalMasuk(email);
      setGalat(
        err?.code === 'auth/too-many-requests'
          ? 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'
          : salahSandi
            ? 'Kata sandi salah.'
            : pesanGalat(err, 'Gagal membuka Log Developer.'),
      );
    } finally {
      setSandi('');
      setSibuk(false);
    }
  };

  return (
    <div className={`${K.halaman} grid place-items-center min-h-[70vh]`}>
      <form onSubmit={buka} className={`${K.kartu} w-full max-w-sm ${ANIM.muncul}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className={`${K.lencanaBahaya} w-10 h-10 justify-center rounded-full`}>
            <FaShieldAlt size={18} />
          </span>
          <div>
            <h1 className={K.judulSeksi}>Log Developer terkunci</h1>
            <p className={K.redup}>Khusus Super Admin · semua akses tercatat</p>
          </div>
        </div>
        <p className={`${K.teks} mb-3`}>
          Ketik ulang kata sandi akun <b>{email}</b> untuk membuka. Kunci berlaku 30 menit dan
          tertutup otomatis bila tidak ada aktivitas 10 menit.
        </p>
        <label className={K.label} htmlFor="sandi-logdev">
          Kata sandi
        </label>
        <input
          id="sandi-logdev"
          type="password"
          autoComplete="current-password"
          className={K.masukan}
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          aria-invalid={galat ? 'true' : undefined}
          autoFocus
        />
        {galat && <span className={K.pesanGalat}>{galat}</span>}
        <button type="submit" className={`${K.tombolUtama} w-full mt-4`} disabled={sibuk || !sandi}>
          <FaLock size={12} /> {sibuk ? 'Memeriksa…' : 'Buka'}
        </button>
        <Link to="/" className={`${K.tombolKedua} w-full mt-2`}>
          <FaArrowLeft size={12} /> Kembali ke Portal
        </Link>
      </form>
    </div>
  );
}
