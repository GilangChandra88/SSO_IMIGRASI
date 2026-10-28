import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBirthdayCake,
  FaBriefcase,
  FaKey,
  FaMedal,
  FaPen,
  FaSave,
  FaTimes,
  FaUserCheck,
  FaUserPlus,
  FaUserShield,
  FaUserSlash,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import ToastViewport from '@/components/ToastViewport';
import { showToast } from '@/utils/toastStore';
import { PANJANG } from '@/utils/batas';
import { pesanGagalUnggah } from '@/utils/berkasStorage';
import { labelPeran, peranDariKlaim } from '@/utils/peran';
import { adalahUltahHariIni } from '@/utils/ulangTahun';
import { SEKSI } from '@/data/seksi';
import {
  PEGAWAI_KOSONG,
  idPegawaiBaru,
  pantauMaster,
  pantauPegawai,
  pesanGalat,
  simpanPegawai,
} from '../services/pegawaiDb';
import { hapusFotoPegawai, unggahFotoPegawai } from '../services/fotoPegawai';
import AvatarPegawai from '../components/AvatarPegawai';
import FotoPegawaiEditor from '../components/FotoPegawaiEditor';
import ModalBuatAkun from '../components/ModalBuatAkun';
import ModalAturPeran from '../components/ModalAturPeran';
import ModalKejutanUltah from '../components/ModalKejutanUltah';
import ModalStatusPegawai from '../components/ModalStatusPegawai';
import TabMaster from '../components/TabMaster';
import TabPejabat from '../components/TabPejabat';

const masukan =
  'w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';
const labelKelas = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1';

const formatTanggal = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const [t, b, h] = iso.split('-').map(Number);
  return new Date(t, b - 1, h).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Data pegawai, akun, peran, foto, dan pejabat penandatangan (docs/skema-database.md §5.1).
 * Data pegawai ditulis langsung (rules memvalidasi); akun, peran, dan status aktif hanya lewat
 * Cloud Function. Data Super Admin hanya bisa diubah Super Admin; akun sendiri tidak bisa diubah
 * peran/statusnya. Foto diunggah dulu, lalu data disimpan, baru foto yang dibuang dihapus.
 */
export default function Pegawai() {
  const navigate = useNavigate();
  const { currentUser, userData, isSuperAdmin, isKepegawaian } = useAuth();
  const uid = currentUser?.uid;
  const [tab, setTab] = useState('pegawai');
  const [daftar, setDaftar] = useState([]);
  const [pangkat, setPangkat] = useState([]);
  const [jabatan, setJabatan] = useState([]);
  const [memuat, setMemuat] = useState(true);

  const [form, setForm] = useState(null); // null = tertutup; { id?, ...data }
  const [galatForm, setGalatForm] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  // Foto di form: form.fotoPaths = foto tersimpan yang dipertahankan, fotoBaru = berkas yang akan
  // diunggah, fotoDihapus = path tersimpan yang dibuang (dihapus setelah simpan berhasil)
  const [fotoBaru, setFotoBaru] = useState([]);
  const [fotoDihapus, setFotoDihapus] = useState([]);
  const [modal, setModal] = useState(null); // { jenis: 'akun'|'peran'|'status'|'ultah', pegawai }

  useEffect(() => {
    const berhenti = [
      pantauPegawai(
        (d) => {
          setDaftar(d);
          setMemuat(false);
        },
        () => setMemuat(false),
      ),
      pantauMaster('pangkat', setPangkat),
      pantauMaster('jabatan', setJabatan),
    ];
    return () => berhenti.forEach((f) => f());
  }, []);

  const dataSuperAdmin = (k) => (k.peran || []).includes('superadmin');
  const bolehUbah = (k) => isKepegawaian && (isSuperAdmin || !dataSuperAdmin(k));
  const akunSendiri = (k) => userData?.id === k.id;

  function bukaForm(k) {
    setGalatForm('');
    setFotoBaru([]);
    setFotoDihapus([]);
    setForm(k ? { id: k.id, ...PEGAWAI_KOSONG, ...k } : { ...PEGAWAI_KOSONG });
  }

  function buangFotoTersimpan(path) {
    setForm((f) => ({ ...f, fotoPaths: f.fotoPaths.filter((p) => p !== path) }));
    setFotoDihapus((d) => [...d, path]);
  }

  function pilihMaster(jenis, id) {
    const sumber = jenis === 'pangkat' ? pangkat : jabatan;
    const m = sumber.find((x) => x.id === id);
    setForm((f) => ({ ...f, [`${jenis}Id`]: m?.id || '', [`${jenis}Nama`]: m?.nama || '' }));
  }

  async function simpan(e) {
    e.preventDefault();
    const nama = form.nama.trim();
    const nip = form.nip.trim();
    if (!nama) return setGalatForm('Nama wajib diisi.');
    if (nip && !/^\d{18}$/.test(nip))
      return setGalatForm('NIP harus 18 digit angka (kosongkan untuk non-PNS).');
    setGalatForm('');
    setMenyimpan(true);
    const id = form.id || idPegawaiBaru();
    try {
      const hasil = await Promise.allSettled(fotoBaru.map((f) => unggahFotoPegawai(id, f, uid)));
      const unggahan = hasil.filter((h) => h.status === 'fulfilled').map((h) => h.value);
      const gagal = hasil.find((h) => h.status === 'rejected');
      if (gagal) {
        unggahan.forEach((p) => hapusFotoPegawai(p).catch(() => {}));
        setGalatForm(
          pesanGagalUnggah(gagal.reason, 'Foto gagal diproses atau diunggah. Coba foto lain.'),
        );
        return;
      }
      try {
        await simpanPegawai(
          { ...form, nama, nip, fotoPaths: [...form.fotoPaths, ...unggahan] },
          id,
          uid,
          { baru: !form.id },
        );
      } catch (err) {
        unggahan.forEach((p) => hapusFotoPegawai(p).catch(() => {}));
        throw err;
      }
      fotoDihapus.forEach((p) => hapusFotoPegawai(p).catch(() => {}));
      showToast(form.id ? 'Data pegawai diperbarui.' : 'Pegawai ditambahkan.');
      setForm(null);
    } catch (err) {
      setGalatForm(pesanGalat(err, 'Data pegawai gagal disimpan.'));
    } finally {
      setMenyimpan(false);
    }
  }

  /** Pilihan master: yang aktif, ditambah nilai yang sedang dipakai pegawai ini (bila dinonaktifkan). */
  const opsiMaster = (sumber, idTerpilih) =>
    sumber.filter((m) => m.aktif !== false || m.id === idTerpilih);

  if (memuat)
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  const tombolTab = (kunci, ikon, label) => (
    <button
      type="button"
      onClick={() => setTab(kunci)}
      className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
        tab === kunci
          ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {ikon} {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Data Pegawai
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Kelola data pegawai, pangkat, jabatan, akun sistem, peran, dan pejabat penandatangan.
          </p>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {tombolTab('pegawai', <FaUsers />, 'Pegawai')}
          {tombolTab('pejabat', <FaUserTie />, 'Pejabat')}
          {tombolTab('pangkat', <FaMedal />, 'Master Pangkat')}
          {tombolTab('jabatan', <FaBriefcase />, 'Master Jabatan')}
        </div>

        {tab === 'pegawai' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center gap-3">
              <h2 className="font-bold text-slate-700 dark:text-slate-200">
                Daftar Pegawai ({daftar.length})
              </h2>
              {!form && isKepegawaian && (
                <button
                  type="button"
                  onClick={() => bukaForm(null)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
                >
                  <FaUserPlus /> Tambah Pegawai
                </button>
              )}
            </div>

            {form && (
              <form
                onSubmit={simpan}
                className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
              >
                <div>
                  <label htmlFor="f-nama" className={labelKelas}>
                    NAMA
                  </label>
                  <input
                    id="f-nama"
                    required
                    maxLength={PANJANG.namaPegawai}
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    className={masukan}
                  />
                </div>
                <div>
                  <label htmlFor="f-nip" className={labelKelas}>
                    NIP (18 digit, kosongkan bila non-PNS)
                  </label>
                  <input
                    id="f-nip"
                    inputMode="numeric"
                    maxLength={18}
                    value={form.nip}
                    onChange={(e) => setForm({ ...form, nip: e.target.value.replace(/\D/g, '') })}
                    className={`${masukan} font-mono`}
                  />
                </div>
                <div>
                  <label htmlFor="f-lahir" className={labelKelas}>
                    TANGGAL LAHIR
                  </label>
                  <input
                    id="f-lahir"
                    type="date"
                    value={form.tanggalLahir}
                    onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                    className={`${masukan} dark:[color-scheme:dark]`}
                  />
                </div>
                <div>
                  <label htmlFor="f-pangkat" className={labelKelas}>
                    PANGKAT/GOL
                  </label>
                  <select
                    id="f-pangkat"
                    value={form.pangkatId}
                    onChange={(e) => pilihMaster('pangkat', e.target.value)}
                    className={masukan}
                  >
                    <option value="">-- Pilih --</option>
                    {opsiMaster(pangkat, form.pangkatId).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="f-jabatan" className={labelKelas}>
                    JABATAN
                  </label>
                  <select
                    id="f-jabatan"
                    value={form.jabatanId}
                    onChange={(e) => pilihMaster('jabatan', e.target.value)}
                    className={masukan}
                  >
                    <option value="">-- Pilih --</option>
                    {opsiMaster(jabatan, form.jabatanId).map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="f-seksi" className={labelKelas}>
                    SEKSI
                  </label>
                  <select
                    id="f-seksi"
                    value={form.seksi}
                    onChange={(e) => setForm({ ...form, seksi: e.target.value })}
                    className={masukan}
                  >
                    <option value="">-- Pilih --</option>
                    {SEKSI.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <FotoPegawaiEditor
                    tersimpan={form.fotoPaths}
                    baru={fotoBaru}
                    onBuangTersimpan={buangFotoTersimpan}
                    onTambah={(files) => setFotoBaru((d) => [...d, ...files])}
                    onBuangBaru={(i) => setFotoBaru((d) => d.filter((_, j) => j !== i))}
                    disabled={menyimpan}
                  />
                </div>
                {galatForm && (
                  <p
                    role="alert"
                    className="md:col-span-3 text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-900/50 rounded-lg px-3 py-2"
                  >
                    {galatForm}
                  </p>
                )}
                <div className="md:col-span-3 flex flex-wrap justify-between items-center gap-2 mt-1">
                  <p className="text-[11px] text-slate-400">
                    Akun login, peran, dan status aktif diatur dari tombol di daftar pegawai.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(null)}
                      disabled={menyimpan}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 flex items-center gap-2"
                    >
                      <FaTimes /> Batal
                    </button>
                    <button
                      type="submit"
                      disabled={menyimpan}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 shadow-sm"
                    >
                      <FaSave />{' '}
                      {menyimpan ? (fotoBaru.length ? 'Mengunggah foto…' : 'Menyimpan…') : 'Simpan'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      NAMA / PERAN
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      NIP
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      JABATAN & PANGKAT
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      AKUN SISTEM
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 text-right">
                      AKSI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-slate-400">
                        Belum ada data pegawai.
                      </td>
                    </tr>
                  )}
                  {daftar.map((k) => {
                    const nonaktif = k.aktif === false;
                    const sendiri = akunSendiri(k);
                    return (
                      <tr
                        key={k.id}
                        className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${nonaktif ? 'opacity-60' : ''}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <AvatarPegawai pegawai={k} />
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {k.nama}{' '}
                                {sendiri && (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    (Anda)
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                                  {labelPeran(peranDariKlaim({ peran: k.peran }))}
                                </span>
                                {k.seksi && (
                                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    · {k.seksi}
                                  </span>
                                )}
                                {nonaktif && (
                                  <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 px-1.5 py-0.5 rounded">
                                    Nonaktif
                                  </span>
                                )}
                                {!nonaktif && adalahUltahHariIni(k.tanggalLahir) && (
                                  <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded">
                                    🎂 Ulang tahun hari ini
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-sm">
                          {k.nip || '-'}
                          {k.tanggalLahir && (
                            <div className="font-sans text-xs text-slate-400 mt-0.5">
                              Lahir {formatTanggal(k.tanggalLahir)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-slate-700 dark:text-slate-200 text-sm font-semibold">
                            {k.jabatanNama || '-'}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                            {k.pangkatNama || '-'}
                          </div>
                        </td>
                        <td className="p-4">
                          {k.authUid ? (
                            <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded text-xs font-bold border border-emerald-200 dark:border-emerald-900/50 break-all">
                              {k.email}
                            </span>
                          ) : (
                            !nonaktif &&
                            bolehUbah(k) && (
                              <button
                                type="button"
                                onClick={() => setModal({ jenis: 'akun', pegawai: k })}
                                className="text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 flex items-center gap-1.5"
                              >
                                <FaKey /> Buat Akun
                              </button>
                            )
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            {isKepegawaian && !nonaktif && (
                              <button
                                type="button"
                                onClick={() => setModal({ jenis: 'ultah', pegawai: k })}
                                title="Kejutan ulang tahun"
                                aria-label={`Kejutan ulang tahun ${k.nama}`}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg"
                              >
                                <FaBirthdayCake size={14} />
                              </button>
                            )}
                            {isSuperAdmin && k.authUid && !nonaktif && !sendiri && (
                              <button
                                type="button"
                                onClick={() => setModal({ jenis: 'peran', pegawai: k })}
                                title="Atur peran"
                                aria-label={`Atur peran ${k.nama}`}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg"
                              >
                                <FaUserShield size={14} />
                              </button>
                            )}
                            {bolehUbah(k) && (
                              <button
                                type="button"
                                onClick={() => bukaForm(k)}
                                title="Ubah data"
                                aria-label={`Ubah data ${k.nama}`}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg"
                              >
                                <FaPen size={14} />
                              </button>
                            )}
                            {bolehUbah(k) && !sendiri && (
                              <button
                                type="button"
                                onClick={() => setModal({ jenis: 'status', pegawai: k })}
                                title={nonaktif ? 'Aktifkan kembali' : 'Nonaktifkan'}
                                aria-label={`${nonaktif ? 'Aktifkan kembali' : 'Nonaktifkan'} ${k.nama}`}
                                className={`p-2 rounded-lg ${nonaktif ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'}`}
                              >
                                {nonaktif ? <FaUserCheck size={14} /> : <FaUserSlash size={14} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'pejabat' && <TabPejabat pegawai={daftar} uid={uid} bolehUbah={isKepegawaian} />}
        {tab === 'pangkat' && <TabMaster jenis="pangkat" daftar={pangkat} uid={uid} />}
        {tab === 'jabatan' && <TabMaster jenis="jabatan" daftar={jabatan} uid={uid} />}
      </div>

      {modal?.jenis === 'ultah' && (
        <ModalKejutanUltah
          pegawai={modal.pegawai}
          uid={uid}
          onUji={() => navigate(`/?uji-ultah=${modal.pegawai.id}`)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.jenis === 'akun' && (
        <ModalBuatAkun pegawai={modal.pegawai} onClose={() => setModal(null)} />
      )}
      {modal?.jenis === 'peran' && (
        <ModalAturPeran pegawai={modal.pegawai} onClose={() => setModal(null)} />
      )}
      {modal?.jenis === 'status' && (
        <ModalStatusPegawai pegawai={modal.pegawai} onClose={() => setModal(null)} />
      )}
      <ToastViewport />
    </div>
  );
}
