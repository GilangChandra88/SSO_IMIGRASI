import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  validatePassword,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { FaCheckCircle, FaKey, FaLock, FaRegCircle, FaSignOutAlt } from 'react-icons/fa';
import { auth, functions } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { keluarAkun } from '@/utils/keluarAkun';

const SYARAT = [
  ['meetsMinPasswordLength', 'Minimal 12 karakter'],
  ['containsUppercaseLetter', 'Mengandung huruf besar'],
  ['containsLowercaseLetter', 'Mengandung huruf kecil'],
  ['containsNumericCharacter', 'Mengandung angka'],
];

function pesanGalat(err) {
  const kode = err?.code || '';
  if (kode === 'auth/wrong-password' || kode === 'auth/invalid-credential') {
    return 'Kata sandi saat ini salah. Bila Anda baru saja mengganti kata sandi, pakai kata sandi yang terakhir disimpan (periksa juga isian otomatis browser).';
  }
  if (kode === 'auth/password-does-not-meet-requirements' || kode === 'auth/weak-password') {
    return 'Kata sandi baru belum memenuhi ketentuan.';
  }
  if (kode === 'auth/too-many-requests') {
    return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
  }
  if (kode === 'auth/network-request-failed') return 'Koneksi terputus. Periksa jaringan.';
  return 'Kata sandi gagal diganti. Coba lagi.';
}

/** Pesan galat Function tandaiSandiDiganti (pesan dari server sudah berbahasa Indonesia). */
function pesanGalatStatus(err) {
  const kode = err?.code || '';
  if (kode === 'functions/failed-precondition' && err.message) return err.message;
  if (kode === 'functions/unauthenticated') {
    return 'Permintaan ditolak server (App Check atau sesi). Muat ulang halaman lalu coba lagi.';
  }
  return 'Kata sandi baru sudah tersimpan, tetapi status akun gagal diperbarui. Muat ulang halaman, lalu ganti kata sandi sekali lagi dengan kata sandi baru tadi sebagai kata sandi saat ini.';
}

const jeda = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Mencabut tanda wajib ganti sandi (server memverifikasi kata sandi memang sudah diganti).
 * Dicoba ulang otomatis untuk galat jaringan/sementara; galat dari pemeriksaan server tidak diulang.
 */
async function tandaiSandiDiganti() {
  const panggil = httpsCallable(functions, 'tandaiSandiDiganti');
  for (let percobaan = 1; ; percobaan++) {
    try {
      return await panggil();
    } catch (err) {
      const sementara = [
        'functions/unavailable',
        'functions/internal',
        'functions/deadline-exceeded',
      ].includes(err?.code);
      if (!sementara || percobaan >= 3) throw err;
      await jeda(percobaan * 1000);
    }
  }
}

/**
 * Ganti kata sandi. Wajib saat login pertama (claim wajibGantiSandi dari Function buatAkunPegawai);
 * setelah itu bisa dibuka kapan saja dari Portal. Kebijakan kata sandi ditegakkan Firebase Auth;
 * daftar syarat di sini hanya membantu pengguna.
 */
export default function GantiSandi() {
  const navigate = useNavigate();
  const { currentUser, wajibGantiSandi, segarkanToken } = useAuth();
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [syarat, setSyarat] = useState(null);
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);

  useEffect(() => {
    let aktif = true;
    if (!baru) {
      setSyarat(null);
      return undefined;
    }
    validatePassword(auth, baru)
      .then((status) => aktif && setSyarat(status))
      .catch(() => aktif && setSyarat(null));
    return () => {
      aktif = false;
    };
  }, [baru]);

  const memenuhi = syarat?.isValid === true;
  const cocok = baru !== '' && baru === ulang;

  async function simpan(e) {
    e.preventDefault();
    setGalat('');
    if (!memenuhi) return setGalat('Kata sandi baru belum memenuhi ketentuan.');
    if (!cocok) return setGalat('Ulangi kata sandi baru dengan tepat.');
    if (baru === lama) return setGalat('Kata sandi baru harus berbeda dari yang lama.');
    setProses(true);
    try {
      const user = auth.currentUser;
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, lama));
      await updatePassword(user, baru);
      // Kata sandi baru sudah berlaku: kosongkan isian agar form tidak dikirim ulang dengan sandi lama
      setLama('');
      setBaru('');
      setUlang('');
    } catch (err) {
      setGalat(pesanGalat(err));
      setProses(false);
      return;
    }
    try {
      if (wajibGantiSandi) await tandaiSandiDiganti();
      await segarkanToken();
      navigate('/', { replace: true });
    } catch (err) {
      setGalat(pesanGalatStatus(err));
    } finally {
      setProses(false);
    }
  }

  const masukan =
    'w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-slate-950/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20';

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#020617] p-4 sm:p-8">
      <form
        onSubmit={simpan}
        className="w-full max-w-md bg-slate-900/70 rounded-3xl border border-cyan-500/30 p-6 sm:p-8 shadow-2xl motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:starting:opacity-0 motion-safe:starting:translate-y-4"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center">
            <FaKey size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white">Ganti Kata Sandi</h1>
            <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
          </div>
        </div>

        {wajibGantiSandi && (
          <p className="mb-5 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            Ini login pertama Anda. Ganti kata sandi sementara dari admin sebelum melanjutkan.
          </p>
        )}

        <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="sandi-lama">
          Kata sandi saat ini
        </label>
        <div className="relative mb-4">
          <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
          <input
            id="sandi-lama"
            type="password"
            autoComplete="current-password"
            required
            value={lama}
            onChange={(e) => setLama(e.target.value)}
            className={masukan}
          />
        </div>

        <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="sandi-baru">
          Kata sandi baru
        </label>
        <div className="relative mb-2">
          <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
          <input
            id="sandi-baru"
            type="password"
            autoComplete="new-password"
            required
            value={baru}
            onChange={(e) => setBaru(e.target.value)}
            aria-invalid={baru !== '' && !memenuhi}
            className={masukan}
          />
        </div>
        <ul className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
          {SYARAT.map(([kunci, label]) => {
            const ok = syarat?.[kunci] === true;
            return (
              <li
                key={kunci}
                className={`flex items-center gap-1.5 text-[11.5px] ${ok ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                {ok ? <FaCheckCircle size={11} /> : <FaRegCircle size={11} />}
                {label}
              </li>
            );
          })}
        </ul>

        <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="sandi-ulang">
          Ulangi kata sandi baru
        </label>
        <div className="relative mb-5">
          <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
          <input
            id="sandi-ulang"
            type="password"
            autoComplete="new-password"
            required
            value={ulang}
            onChange={(e) => setUlang(e.target.value)}
            aria-invalid={ulang !== '' && !cocok}
            className={masukan}
          />
        </div>

        {galat && (
          <p
            role="alert"
            className="mb-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3"
          >
            {galat}
          </p>
        )}

        <button
          type="submit"
          disabled={proses}
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-colors disabled:opacity-60 motion-safe:active:scale-[.98]"
        >
          {proses ? 'Menyimpan…' : 'Simpan Kata Sandi Baru'}
        </button>

        <div className="mt-4 flex justify-between gap-3 text-xs">
          {!wajibGantiSandi ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-slate-400 hover:text-white"
            >
              Batal
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={keluarAkun}
            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-300"
          >
            <FaSignOutAlt size={11} /> Keluar
          </button>
        </div>
      </form>
    </div>
  );
}
