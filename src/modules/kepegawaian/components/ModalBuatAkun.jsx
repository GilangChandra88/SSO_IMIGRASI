import { useState } from 'react';
import { FaCopy, FaKey, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { buatAkunPegawai, pesanGalat } from '../services/pegawaiDb';

const pola = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/**
 * Membuat akun login lewat Cloud Function buatAkunPegawai. Kata sandi sementara dibuat server,
 * ditampilkan SEKALI di sini, dan wajib diganti pegawai saat login pertama.
 */
export default function ModalBuatAkun({ pegawai, onClose }) {
  const [email, setEmail] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  const [hasil, setHasil] = useState(null);
  const [tersalin, setTersalin] = useState(false);

  async function kirim(e) {
    e.preventDefault();
    const bersih = email.trim().toLowerCase();
    if (!pola.test(bersih)) return setGalat('Format e-mail tidak sah.');
    setGalat('');
    setProses(true);
    try {
      setHasil(await buatAkunPegawai(pegawai.id, bersih));
    } catch (err) {
      setGalat(pesanGalat(err, 'Akun gagal dibuat. Coba lagi.'));
    } finally {
      setProses(false);
    }
  }

  async function salin() {
    try {
      await navigator.clipboard.writeText(hasil.sandiSementara);
      setTersalin(true);
    } catch {
      setTersalin(false);
    }
  }

  return (
    <Modal
      onClose={hasil ? onClose : proses ? () => {} : onClose}
      labelledBy="judul-buat-akun"
      widthClass="max-w-md"
    >
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 id="judul-buat-akun" className="font-bold text-lg text-slate-800 dark:text-slate-100">
          Buat Akun Pegawai
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={proses}
          aria-label="Tutup"
          className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg"
        >
          <FaTimes />
        </button>
      </div>

      {!hasil ? (
        <form onSubmit={kirim} className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Akun untuk <strong>{pegawai.nama}</strong>. Kata sandi sementara dibuat otomatis dan
            wajib diganti saat login pertama.
          </p>
          {galat && (
            <div
              role="alert"
              className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 p-3 rounded-lg text-sm border border-rose-100 dark:border-rose-900/50"
            >
              {galat}
            </div>
          )}
          <div>
            <label
              htmlFor="email-akun"
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              E-mail login
            </label>
            <input
              id="email-akun"
              type="email"
              required
              maxLength={120}
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ''))}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              placeholder="nama@domain-kantor"
            />
            <p className="text-xs text-slate-400 mt-2">
              Gunakan alamat kantor yang benar-benar dimiliki pegawai; jangan diturunkan dari nama.
            </p>
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={proses}
              className="flex-1 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={proses}
              className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaKey size={13} /> {proses ? 'Membuat…' : 'Buat Akun'}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6 space-y-4">
          <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-4 py-3">
            Akun <strong className="break-all">{hasil.email}</strong> berhasil dibuat.
          </p>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              KATA SANDI SEMENTARA
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono text-sm select-all break-all">
                {hasil.sandiSementara}
              </code>
              <button
                type="button"
                onClick={salin}
                className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Salin kata sandi"
                title="Salin"
              >
                <FaCopy size={13} />
              </button>
            </div>
            {tersalin && <p className="text-xs text-emerald-600 mt-1.5">Tersalin.</p>}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/50 rounded-xl px-4 py-3">
            Kata sandi ini hanya tampil sekali. Serahkan langsung ke pegawai (jangan lewat grup
            chat); pegawai wajib menggantinya saat login pertama.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700"
          >
            Selesai
          </button>
        </div>
      )}
    </Modal>
  );
}
