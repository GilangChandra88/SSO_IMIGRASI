import { useState } from 'react';
import { FaPen, FaPlus, FaToggleOff, FaToggleOn } from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { PANJANG } from '@/utils/batas';
import { pesanGalat, simpanMaster } from '../services/pegawaiDb';

const KOSONG = { nama: '', urutan: '' };

/**
 * Data master pangkat/jabatan. Tidak ada hapus (rules menolak): master yang sudah dipakai
 * dinonaktifkan agar tidak muncul di pilihan baru, sedangkan data pegawai lama tetap utuh.
 */
export default function TabMaster({ jenis, daftar, uid }) {
  const [form, setForm] = useState(null); // null = tertutup; { id?, nama, urutan }
  const [proses, setProses] = useState(false);
  const label = jenis === 'pangkat' ? 'Pangkat/Golongan' : 'Jabatan';

  async function simpan(e) {
    e.preventDefault();
    if (!form.nama.trim()) return;
    setProses(true);
    try {
      const lama = daftar.find((m) => m.id === form.id);
      await simpanMaster(
        jenis,
        {
          nama: form.nama,
          urutan: form.urutan === '' ? daftar.length + 1 : form.urutan,
          aktif: lama?.aktif !== false,
        },
        form.id,
        uid,
      );
      setForm(null);
    } catch (err) {
      showToast(pesanGalat(err, `Data ${label.toLowerCase()} gagal disimpan.`), 'error');
    } finally {
      setProses(false);
    }
  }

  async function aturAktif(m) {
    try {
      await simpanMaster(
        jenis,
        { nama: m.nama, urutan: m.urutan, aktif: m.aktif === false },
        m.id,
        uid,
      );
    } catch (err) {
      showToast(pesanGalat(err, 'Status gagal diubah.'), 'error');
    }
  }

  const masukan =
    'w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden max-w-2xl mx-auto">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center gap-3">
        <h2 className="font-bold text-slate-700 dark:text-slate-200">Data Master {label}</h2>
        {!form && (
          <button
            type="button"
            onClick={() => setForm({ ...KOSONG })}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2"
          >
            <FaPlus /> Tambah Data
          </button>
        )}
      </div>

      {form && (
        <form
          onSubmit={simpan}
          className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10 grid grid-cols-1 sm:grid-cols-[1fr_7rem_auto] gap-3 items-end"
        >
          <div>
            <label
              htmlFor="nama-master"
              className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1"
            >
              NAMA {label.toUpperCase()}
            </label>
            <input
              id="nama-master"
              required
              maxLength={PANJANG.namaMaster}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className={masukan}
            />
          </div>
          <div>
            <label
              htmlFor="urutan-master"
              className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1"
            >
              URUTAN
            </label>
            <input
              id="urutan-master"
              type="number"
              min={0}
              max={9999}
              value={form.urutan}
              onChange={(e) => setForm({ ...form, urutan: e.target.value })}
              className={masukan}
              placeholder="otomatis"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={proses}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {proses ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <tbody>
            {daftar.length === 0 && (
              <tr>
                <td className="p-6 text-center text-sm text-slate-400">Belum ada data.</td>
              </tr>
            )}
            {daftar.map((m) => (
              <tr
                key={m.id}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <td className="p-4 w-14 text-xs font-mono text-slate-400">{m.urutan}</td>
                <td
                  className={`p-4 font-semibold ${m.aktif === false ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}
                >
                  {m.nama}
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setForm({ id: m.id, nama: m.nama, urutan: m.urutan })}
                    title="Ubah"
                    aria-label={`Ubah ${m.nama}`}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg"
                  >
                    <FaPen size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => aturAktif(m)}
                    title={m.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}
                    aria-label={`${m.aktif === false ? 'Aktifkan' : 'Nonaktifkan'} ${m.nama}`}
                    className={`p-2 rounded-lg ${m.aktif === false ? 'text-slate-400 hover:text-emerald-600' : 'text-emerald-600 hover:text-slate-500'}`}
                  >
                    {m.aktif === false ? <FaToggleOff size={18} /> : <FaToggleOn size={18} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
