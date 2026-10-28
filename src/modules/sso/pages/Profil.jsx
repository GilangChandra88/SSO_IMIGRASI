import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaExclamationCircle, FaKey, FaSave } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useUnitKerja } from '@/context/useUnitKerja';
import ToastViewport from '@/components/ToastViewport';
import { showToast } from '@/utils/toastStore';
import { PANJANG } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { jalurNamaUnit } from '@/utils/unitKerja';
import {
  alamatBersih,
  dataBelumLengkap,
  emailBersih,
  emailSah,
  formatNip,
  formatWa,
  labelPangkat,
  labelStatus,
  waBersih,
  waSah,
} from '@/utils/dataPegawai';
import { pantauKontakSaya, simpanKontakSaya } from '../services/profilDb';
import FotoWajah from '../ulang-tahun/FotoWajah';

const masukan =
  'w-full text-sm py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 aria-[invalid=true]:border-rose-400';
const labelKelas = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1';
const kartu =
  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm';
const KONTAK_SAJA = ['Alamat', 'E-mail pribadi', 'No. WA'];

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
 * Profil Saya: data kepegawaian sendiri (hanya baca; diubah Kepegawaian) dan kontak pribadi yang
 * bisa diperbarui pegawai sendiri (alamat, e-mail pribadi, nomor WA).
 */
export default function Profil() {
  const navigate = useNavigate();
  const { currentUser, userData, pegawaiId } = useAuth();
  const unit = useUnitKerja();
  const [kontak, setKontak] = useState(undefined); // undefined = memuat, null = belum ada
  const [form, setForm] = useState({ alamat: '', emailPribadi: '', noWa: '' });
  const [galat, setGalat] = useState({});
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    if (!pegawaiId) return undefined;
    return pantauKontakSaya(
      pegawaiId,
      (k) => {
        setKontak(k);
        setForm({
          alamat: k?.alamat || '',
          emailPribadi: k?.emailPribadi || '',
          noWa: k?.noWa ? formatWa(k.noWa) : '',
        });
      },
      () => setKontak(null),
    );
  }, [pegawaiId]);

  async function simpan(e) {
    e.preventDefault();
    const isi = {
      alamat: alamatBersih(form.alamat),
      emailPribadi: emailBersih(form.emailPribadi),
      noWa: waBersih(form.noWa),
    };
    const g = {};
    if (isi.emailPribadi && !emailSah(isi.emailPribadi))
      g.emailPribadi = 'Format e-mail tidak sah.';
    if (isi.noWa && !waSah(isi.noWa)) g.noWa = 'Nomor WA tidak sah (contoh 0812-3456-7890).';
    setGalat(g);
    if (Object.keys(g).length) return;
    setMenyimpan(true);
    try {
      await simpanKontakSaya(pegawaiId, isi, currentUser.uid, !!kontak);
      showToast('Kontak pribadi disimpan.');
    } catch (err) {
      showToast(pesanGalat(err, 'Kontak gagal disimpan.'), 'error');
    } finally {
      setMenyimpan(false);
    }
  }

  if (!userData || kontak === undefined)
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  const p = userData;
  const kurang = dataBelumLengkap(p, kontak);
  const kurangData = kurang.filter((k) => !KONTAK_SAJA.includes(k));
  const baris = [
    ['NIP', formatNip(p.nip) || '-'],
    ['Tanggal lahir', formatTanggal(p.tanggalLahir) || '-'],
    ['Status kepegawaian', labelStatus(p.statusKepegawaian) || '-'],
    ['Pangkat/golongan', labelPangkat(p.pangkatNama, p.golongan) || '-'],
    ['Jabatan', p.jabatanNama || '-'],
    ['Unit kerja', jalurNamaUnit(unit.byId, p.unitId) || p.seksi || '-'],
  ];
  const pesan = (f) =>
    galat[f] && <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-1">{galat[f]}</p>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="bg-[#1e293b] rounded-2xl p-5 sm:p-6 flex flex-wrap items-center gap-4 sm:gap-5">
          <FotoWajah
            pegawai={p}
            alt=""
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0 text-lg border border-cyan-500/30"
          />
          <div className="flex-1 min-w-[12rem]">
            <p className="text-cyan-400 font-bold text-[11px] uppercase tracking-widest mb-1">
              Profil Saya
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{p.nama}</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {p.jabatanNama || 'Jabatan belum diisi'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2"
            >
              <FaArrowLeft size={12} /> Portal
            </button>
            <button
              type="button"
              onClick={() => navigate('/ganti-sandi')}
              className="bg-slate-800 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2"
            >
              <FaKey size={12} /> Ganti Kata Sandi
            </button>
          </div>
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm flex items-start gap-2.5 border ${
            kurang.length
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {kurang.length ? (
            <FaExclamationCircle className="mt-0.5 shrink-0" />
          ) : (
            <FaCheckCircle className="mt-0.5 shrink-0" />
          )}
          <span>
            {kurang.length
              ? `Data Anda belum lengkap: ${kurang.join(', ')}.${kurangData.length ? ' Selain kontak pribadi, data dilengkapi oleh Kepegawaian.' : ''}`
              : 'Data Anda sudah lengkap. Terima kasih!'}
          </span>
        </div>

        <section className={kartu}>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Data Kepegawaian</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Diubah oleh Kepegawaian. Hubungi Kepegawaian bila ada yang keliru.
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {baris.map(([label, isi]) => (
              <div key={label}>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </dt>
                <dd className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5 break-words">
                  {isi}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <form onSubmit={simpan} noValidate className={kartu}>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Kontak Pribadi</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Hanya terlihat oleh Anda dan Kepegawaian.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="p-alamat" className={labelKelas}>
                ALAMAT
              </label>
              <textarea
                id="p-alamat"
                rows={3}
                maxLength={PANJANG.alamat}
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className={masukan}
              />
            </div>
            <div>
              <label htmlFor="p-email" className={labelKelas}>
                E-MAIL PRIBADI
              </label>
              <input
                id="p-email"
                type="email"
                inputMode="email"
                maxLength={PANJANG.emailPribadi}
                value={form.emailPribadi}
                aria-invalid={!!galat.emailPribadi || undefined}
                onChange={(e) => setForm({ ...form, emailPribadi: e.target.value })}
                className={masukan}
              />
              {pesan('emailPribadi')}
            </div>
            <div>
              <label htmlFor="p-wa" className={labelKelas}>
                NO. WHATSAPP
              </label>
              <input
                id="p-wa"
                type="tel"
                inputMode="tel"
                maxLength={20}
                placeholder="0812-3456-7890"
                value={form.noWa}
                aria-invalid={!!galat.noWa || undefined}
                onChange={(e) => setForm({ ...form, noWa: e.target.value })}
                className={`${masukan} font-mono`}
              />
              {pesan('noWa')}
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button
              type="submit"
              disabled={menyimpan}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white rounded-xl px-6 py-2.5 text-sm font-bold flex items-center gap-2"
            >
              <FaSave size={12} /> {menyimpan ? 'Menyimpan…' : 'Simpan Kontak'}
            </button>
          </div>
        </form>

        <section className={kartu}>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Akun</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 break-all">
            E-mail login: <span className="font-semibold">{currentUser?.email}</span>
          </p>
        </section>
      </div>
      <ToastViewport />
    </div>
  );
}
