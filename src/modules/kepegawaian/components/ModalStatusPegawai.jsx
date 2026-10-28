import { useState } from 'react';
import { FaTimes, FaUserCheck, FaUserSlash } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { PANJANG } from '@/utils/batas';
import { aktifkanPegawai, nonaktifkanPegawai, pesanGalat } from '../services/pegawaiDb';

/**
 * Menonaktifkan (pengganti hapus) atau mengaktifkan kembali pegawai lewat Cloud Function.
 * Nonaktif = akun login dimatikan dan semua sesinya dicabut; data pegawai tetap ada untuk arsip.
 */
export default function ModalStatusPegawai({ pegawai, onClose }) {
  const nonaktifkan = pegawai.aktif !== false;
  const [alasan, setAlasan] = useState('');
  const [proses, setProses] = useState(false);

  async function simpan(e) {
    e.preventDefault();
    if (nonaktifkan && !alasan.trim()) return;
    setProses(true);
    try {
      if (nonaktifkan) await nonaktifkanPegawai(pegawai.id, alasan.trim());
      else await aktifkanPegawai(pegawai.id, alasan.trim());
      showToast(`${pegawai.nama} ${nonaktifkan ? 'dinonaktifkan' : 'diaktifkan kembali'}.`);
      onClose();
    } catch (err) {
      showToast(pesanGalat(err, 'Status pegawai gagal diubah.'), 'error');
    } finally {
      setProses(false);
    }
  }

  return (
    <Modal
      onClose={proses ? () => {} : onClose}
      labelledBy="judul-status-pegawai"
      widthClass="max-w-md"
    >
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2
          id="judul-status-pegawai"
          className="font-bold text-lg text-slate-800 dark:text-slate-100"
        >
          {nonaktifkan ? 'Nonaktifkan Pegawai' : 'Aktifkan Kembali'}
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
      <form onSubmit={simpan} className="p-6 space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {nonaktifkan ? (
            <>
              <strong>{pegawai.nama}</strong> tidak bisa login lagi dan sesi yang sedang berjalan
              dicabut. Data dan riwayatnya tetap tersimpan.
            </>
          ) : (
            <>
              <strong>{pegawai.nama}</strong> bisa login kembali dengan kata sandi terakhirnya.
            </>
          )}
        </p>
        <div>
          <label
            htmlFor="alasan-status"
            className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5"
          >
            Alasan {nonaktifkan ? <span className="text-rose-500">*</span> : '(opsional)'}
          </label>
          <textarea
            id="alasan-status"
            rows={3}
            required={nonaktifkan}
            maxLength={PANJANG.alasanBatal}
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm"
            placeholder={nonaktifkan ? 'Mis. mutasi ke kantor lain, pensiun' : ''}
          />
        </div>
        <div className="pt-1 flex gap-3">
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
            disabled={proses || (nonaktifkan && !alasan.trim())}
            className={`flex-1 text-white font-bold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 ${
              nonaktifkan ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {nonaktifkan ? <FaUserSlash size={13} /> : <FaUserCheck size={13} />}
            {proses ? 'Memproses…' : nonaktifkan ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
