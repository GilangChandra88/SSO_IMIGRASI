import { useState } from 'react';
import { FaListOl, FaPen, FaPlus, FaTimes, FaToggleOff, FaToggleOn } from 'react-icons/fa';
import Modal from '@/components/Modal';
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
 * Data master pangkat/golongan atau jabatan. Tambah/ubah lewat popup. Tidak ada hapus (rules
 * menolak): master yang sudah dipakai dinonaktifkan agar tidak muncul di pilihan baru, sedangkan
 * data pegawai lama tetap utuh. Pangkat: golongan PNS (I/a–IV/e) atau PPPK (I–XVII). Jabatan:
 * jenis + eselon (khusus struktural).
 */
export default function TabMaster({ jenis, daftar, uid, bolehUbah = true }) {
  const [form, setForm] = useState(null); // null = popup tertutup
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
      showToast(`${label} ${form.id ? 'diperbarui' : 'ditambahkan'}.`);
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
    <div>
      <div className={K.kepala}>
        <div>
          <h2 className={K.judulSeksi}>
            Master {label} ({daftar.length})
          </h2>
          <p className={K.subSeksi}>
            {pangkat
              ? 'Pangkat & golongan PNS serta golongan PPPK untuk pilihan di data pegawai.'
              : 'Jabatan beserta jenis dan eselonnya; eselon pegawai dibaca dari sini.'}
          </p>
        </div>
        {bolehUbah && (
          <div className="flex flex-wrap gap-2">
            {pangkat && golonganKurang > 0 && (
              <button type="button" onClick={isiBaku} disabled={proses} className={K.tombolKecil}>
                <FaListOl className={K.aksen} /> Isi pangkat baku ({golonganKurang})
              </button>
            )}
            <button type="button" onClick={() => buka(null)} className={K.tombolTambah}>
              <FaPlus size={11} className={K.aksen} /> Tambah {pangkat ? 'Pangkat' : 'Jabatan'}
            </button>
          </div>
        )}
      </div>

      <div className={K.tabelWadah}>
        <table className={K.tabel}>
          <thead>
            <tr>
              <th className={`${K.th} w-16`}>Urutan</th>
              <th className={K.th}>{label}</th>
              {bolehUbah && <th className={`${K.th} text-right`}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {daftar.length === 0 && (
              <tr>
                <td colSpan={3} className={K.kosong}>
                  Belum ada data.
                  {pangkat && ' Pakai "Isi pangkat baku" untuk menambahkan golongan PNS & PPPK.'}
                </td>
              </tr>
            )}
            {daftar.map((m) => {
              const nonaktif = m.aktif === false;
              const lengkap = pangkat ? !!m.golongan : !!m.jenis;
              return (
                <tr key={m.id} className={`${K.tr} ${nonaktif ? 'opacity-60' : ''}`}>
                  <td className={`${K.td} ${K.mono}`}>{m.urutan}</td>
                  <td className={K.td}>
                    <div className={`font-semibold ${nonaktif ? 'line-through' : ''}`}>
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
                      {nonaktif && (
                        <span className={`${K.lencana} ${K.lencanaBahaya}`}>Nonaktif</span>
                      )}
                      {!lengkap && (
                        <span className={`${K.lencana} ${K.lencanaWaspada}`}>
                          {pangkat ? 'Golongan belum diisi' : 'Jenis belum diisi'}
                        </span>
                      )}
                    </div>
                  </td>
                  {bolehUbah && (
                    <td className={K.td}>
                      <div className="flex items-center justify-end gap-1">
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
                          className={K.tombolIkon}
                        >
                          {nonaktif ? (
                            <FaToggleOff size={18} />
                          ) : (
                            <FaToggleOn size={18} className={K.teksOk} />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          onClose={proses ? () => {} : () => setForm(null)}
          labelledBy="judul-form-master"
          widthClass="max-w-lg"
          lembar
        >
          <form onSubmit={simpan} noValidate className={K.modalIsi}>
            <div className="flex items-start justify-between gap-3">
              <h2 id="judul-form-master" className={K.modalJudul}>
                {form.id ? 'Ubah' : 'Tambah'} {label}
              </h2>
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={proses}
                aria-label="Tutup"
                className={K.modalTutup}
              >
                <FaTimes />
              </button>
            </div>
            <p className={K.modalSub}>
              {pangkat
                ? 'Golongan harus unik; pangkat yang sudah dipakai cukup dinonaktifkan.'
                : 'Eselon hanya untuk jabatan struktural.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="m-nama" className={K.label}>
                  Nama {label.toLowerCase()}
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
                  Jenis
                </label>
                <select
                  id="m-jenis"
                  value={form.jenis}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      jenis: e.target.value,
                      ...(pangkat ? { golongan: '' } : {}),
                    })
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
                  {pangkat ? 'Golongan' : 'Eselon'}
                </label>
                {pangkat ? (
                  <select
                    id="m-gol"
                    value={form.golongan}
                    onChange={(e) => setForm({ ...form, golongan: e.target.value })}
                    className={K.masukan}
                  >
                    <option value="">-- Pilih --</option>
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
                    <option value="">Tanpa eselon</option>
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
                  Urutan
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
            </div>
            {galat && (
              <p role="alert" className={`${K.galat} mt-4 mb-0`}>
                {galat}
              </p>
            )}
            <div className={K.modalAksi}>
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={proses}
                className={K.tombolKedua}
              >
                Batal
              </button>
              <button type="submit" disabled={proses} className={K.tombolUtama}>
                {proses ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
