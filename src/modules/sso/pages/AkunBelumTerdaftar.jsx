import React from 'react';
import { FaSignOutAlt, FaUserLock } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { keluarAkun } from '@/utils/keluarAkun';

/**
 * Ditampilkan bila login berhasil tetapi akun tidak punya claim aktif (dibuat di luar aplikasi,
 * atau pegawainya nonaktif). Akun seperti ini tidak bisa membaca data apa pun (rules menolak).
 */
export default function AkunBelumTerdaftar() {
  const { currentUser } = useAuth();
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#020617] p-4">
      <div className="w-full max-w-md bg-slate-900/70 rounded-3xl border border-amber-500/30 p-6 sm:p-8 text-center shadow-2xl">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center mb-4">
          <FaUserLock size={20} />
        </div>
        <h1 className="text-lg font-bold text-white">Akun belum terdaftar</h1>
        <p className="mt-2 text-sm text-slate-300">
          Akun <span className="font-semibold break-all">{currentUser?.email}</span> belum terhubung
          dengan data pegawai aktif. Hubungi admin Kepegawaian untuk dibuatkan atau diaktifkan
          kembali.
        </p>
        <button
          type="button"
          onClick={keluarAkun}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-bold hover:bg-slate-700"
        >
          <FaSignOutAlt size={13} /> Keluar
        </button>
      </div>
    </div>
  );
}
