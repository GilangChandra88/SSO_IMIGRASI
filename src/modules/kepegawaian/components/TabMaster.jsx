import { useState } from 'react';
import { FaListOl, FaPen, FaPlus, FaToggleOff, FaToggleOn } from 'react-icons/fa';
import { showToast } from '@/utils/toastStore';
import { PANJANG } from '@/utils/batas';
import { GOLONGAN_PNS, GOLONGAN_PPPK, labelPangkat } from '@/utils/dataPegawai';
import { isiPangkatBaku, pesanGalat, simpanMaster } from '../services/pegawaiDb';
import { ESELON, JENIS_JABATAN, PANGKAT_BAKU } from '../data/masterBaku';
import { K } from '../ui/kelas';

const JENIS_PANGKAT = [
  { id: 'pns', label: 'PNS' },
  { id: 'pppk', label: 'PPPK' },
];
const KOSONG = {
  pangkat: { nama: '', golongan: '', jenis: 'pns', urutan: '' },
  jabatan: { nama: '', jenis: 'pelaksana', eselon: '', urutan: '' },
};
const labelJenis = (daftar, id) => daftar.find((j) => j.id === id)?.label || '';

/**
 * Data master pangkat/golongan atau jabatan. Tidak ada hapus (rules menolak): master yang sudah
 * dipakai dinonaktifkan agar tidak muncul di pilihan baru, sedangkan data pegawai lama tetap utuh.
 * Pangkat: golongan PNS (I/a–IV/e) atau PPPK (I–XVII). Jabatan: jenis + eselon (khusus struktural).
 */
export default function TabMaster({ jenis, daftar, uid, bolehUbah = true }) {
  const [form, setForm] = useState(null); // null = tertutup
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);
  const pangkat = jenis === 'pangkat';
  const label = pangkat ? 'Pangkat/Golongan' : 'Jabatan';
  const golonganKurang = pangkat
    ? PANGKAT_BAKU.filter((p) => !daftar.some((d) => d.golongan === p.golongan)).length
    : 0;

  function buka(m) {
    setGalat('');
    setForm(m ? { ...KOSONG[jenis], ...m } : { ...KOSONG[jenis] });
  }

  async function simpan(e) {
    e.preventDefault();
    if (!form.nama.trim()) return setGalat(`Nama ${label.toLowerCase()} wajib diisi.`);
    if (pangkat && !form.golongan) return setGalat('Pilih golongan.');
    if (pangkat && daftar.some((d) => d.id !== form.id && d.golongan === form.golongan))
      return setGalat(`Golongan ${form.golongan} sudah ada di master.`);
    setGalat('');
    setProses(true);
    try {
      const lama = daftar.find((m) => m.id === form.id);
      await simpanMaster(
        jenis,
        {
          ...form,
          eselon: form.jenis === 'struktural' ? form.eselon || '' : '',
          urutan: form.urutan === '' ? daftar.length + 1 : form.urutan,
          aktif: lama?.aktif !== false,
        },
        form.id,
        uid,
      );
      setForm(null);
    } catch (err) {
      setGalat(pesanGalat(err, `Data ${label.toLowerCase()} gagal disimpan.`));
    } finally {
      setProses(false);
    }
  }

  async function aturAktif(m) {
    try {
      await simpanMaster(jenis, { ...KOSONG[jenis], ...m, aktif: m.aktif === false }, m.id, uid);
    } catch (err) {
      showToast(
        pesanGalat(err, 'Status gagal diubah. Lengkapi datanya lewat tombol Ubah.'),
        'error',
      );
    }
  }

  async function isiBaku() {
    setProses(true);
    try {
      const n = await isiPangkatBaku(daftar, uid);
      showToast(n ? `${n} pangkat/golongan ditambahkan.` : 'Semua golongan baku sudah ada.');
    } catch (err) {
      showToast(pesanGalat(err, 'Pangkat baku gagal ditambahkan.'), 'error');
    } finally {
      setProses(false);
    }
  }

  const opsiGolongan = form?.jenis === 'pppk' ? GOLONGAN_PPPK : GOLONGAN_PNS;

  return (
    <div className={`${K.kartu} max-w-3xl mx-auto`}>
      <div className={K.kepalaKartu}>
        <h2 className={K.judulKartu}>
          Data Master {label} ({daftar.length})
        </h2>
        {bolehUbah && !form && (
          <div className="flex flex-wrap gap-2">
            {pangkat && golonganKurang > 0 && (
              <button type="button" onClick={isiBaku} disabled={proses} className={K.tombolKedua}>
                <FaListOl /> Isi pangkat baku ({golonganKurang})
              </button>
            )}
            <button type="button" onClick={() => buka(null)} className={K.tombolUtama}>
              <FaPlus /> Tambah Data
            </button>
          </div>
        )}
      </div>

      {form && (
        <form
          onSubmit={simpan}
          noValidate
          className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
        >
          <div className="sm:col-span-3">
            <label htmlFor="m-nama" className={K.label}>
              NAMA {label.toUpperCase()}
            </label>
            <input
              id="m-nama"
              maxLength={PANJANG.namaMaster}
              value={form.nama}
              placeholder={
                pangkat ? 'mis. Penata Muda Tk. I' : 'mis. Analis Keimigrasian Ahli Pertama'
              }
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className={K.masukan}
            />
          </div>
          <div>
            <label htmlFor="m-jenis" className={K.label}>
              JENIS
            </label>
            <select
              id="m-jenis"
              value={form.jenis}
              onChange={(e) =>
                setForm({ ...form, jenis: e.target.value, ...(pangkat ? { golongan: '' } : {}) })
              }
              className={K.masukan}
            >
              {(pangkat ? JENIS_PANGKAT : JENIS_JABATAN).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="m-gol" className={K.label}>
              {pangkat ? 'GOLONGAN' : 'ESELON'}
            </label>
            {pangkat ? (
              <select
                id="m-gol"
                value={form.golongan}
                onChange={(e) => setForm({ ...form, golongan: e.target.value })}
                className={K.masukan}
              >
                <option value="">--</option>
                {opsiGolongan.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="m-gol"
                value={form.eselon}
                disabled={form.jenis !== 'struktural'}
                onChange={(e) => setForm({ ...form, eselon: e.target.value })}
                className={K.masukan}
              >
                <option value="">--</option>
                {ESELON.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="m-urutan" className={K.label}>
              URUTAN
            </label>
            <input
              id="m-urutan"
              type="number"
              min={0}
              max={9999}
              value={form.urutan}
              onChange={(e) => setForm({ ...form, urutan: e.target.value })}
              className={K.masukan}
              placeholder="otomatis"
            />
          </div>
          {galat && (
            <p role="alert" className={`${K.galat} sm:col-span-6`}>
              {galat}
            </p>
          )}
          <div className="sm:col-span-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setForm(null)}
              disabled={proses}
              className={K.tombolBatal}
            >
              Batal
            </button>
            <button type="submit" disabled={proses} className={K.tombolUtama}>
              {proses ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <tbody>
            {daftar.length === 0 && (
              <tr>
                <td className="p-6 text-center text-sm text-slate-400">
                  Belum ada data.
                  {pangkat && ' Pakai "Isi pangkat baku" untuk menambahkan golongan PNS & PPPK.'}
                </td>
              </tr>
            )}
            {daftar.map((m) => {
              const nonaktif = m.aktif === false;
              const lengkap = pangkat ? !!m.golongan : !!m.jenis;
              return (
                <tr
                  key={m.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <td className="p-4 w-14 text-xs font-mono text-slate-400">{m.urutan}</td>
                  <td className="p-4">
                    <div
                      className={`font-semibold ${nonaktif ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}
                    >
                      {pangkat ? labelPangkat(m.nama, m.golongan) : m.nama}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.jenis && (
                        <span className={`${K.lencana} ${K.lencanaNetral}`}>
                          {labelJenis(pangkat ? JENIS_PANGKAT : JENIS_JABATAN, m.jenis)}
                        </span>
                      )}
                      {m.eselon && (
                        <span className={`${K.lencana} ${K.lencanaInfo}`}>Eselon {m.eselon}</span>
                      )}
                      {!lengkap && (
                        <span className={`${K.lencana} ${K.lencanaWaspada}`}>
                          {pangkat ? 'Golongan belum diisi' : 'Jenis belum diisi'}
                        </span>
                      )}
                    </div>
                  </td>
                  {bolehUbah && (
                    <td className="p-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => buka(m)}
                        title="Ubah"
                        aria-label={`Ubah ${m.nama}`}
                        className={K.tombolIkon}
                      >
                        <FaPen size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => aturAktif(m)}
                        title={nonaktif ? 'Aktifkan' : 'Nonaktifkan'}
                        aria-label={`${nonaktif ? 'Aktifkan' : 'Nonaktifkan'} ${m.nama}`}
                        className={`p-2 rounded-lg ${nonaktif ? 'text-slate-400 hover:text-emerald-600' : 'text-emerald-600 hover:text-slate-500'}`}
                      >
                        {nonaktif ? <FaToggleOff size={18} /> : <FaToggleOn size={18} />}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
