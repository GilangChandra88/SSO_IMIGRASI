import { useMemo, useState } from 'react';
import { FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { tanggalIso } from '@/utils/nilai';
import {
  JENIS_PEJABAT,
  berlakuPada,
  penetapanPada,
  usePenetapanPejabat,
} from '@/context/usePejabat';
import { pesanGalat } from '../services/pegawaiDb';
import { akhiriPejabat, sehariSebelum, tetapkanPejabat } from '../services/pejabatDb';

const masukan =
  'w-full text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';
const masukanTanggal = `${masukan} dark:[color-scheme:dark]`;
const labelKelas = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1';

const tgl = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const [t, b, h] = iso.split('-').map(Number);
  return new Date(t, b - 1, h).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
const rentang = (p) =>
  `${tgl(p.berlakuMulai)} – ${p.berlakuSampai ? tgl(p.berlakuSampai) : 'sekarang'}`;

// Dokumen yang memakai tiap jabatan
const PEMAKAIAN = {
  ppk: 'Tanda tangan PPK di SPD, dokumen LPJ, Lembar Verifikasi, dan form surat.',
  bendahara: 'Tanda tangan Bendahara di dokumen LPJ dan form surat.',
  kpa: 'Catatan penetapan (belum dipakai di dokumen).',
  kepala: 'Pilihan cepat penandatangan Surat Perintah.',
  plt: 'Pilihan cepat penandatangan Surat Perintah.',
  plh: 'Pilihan cepat penandatangan Surat Perintah.',
};

const CHIP = {
  berlaku:
    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
  datang:
    'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50',
  lalu: 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

function statusPenetapan(p, kini, hariIni) {
  if (p.id === kini?.id) return ['berlaku', 'Berlaku'];
  if (p.berlakuMulai > hariIni) return ['datang', 'Akan datang'];
  if (berlakuPada(p, hariIni)) return ['lalu', 'Digantikan'];
  return ['lalu', 'Selesai'];
}

/**
 * Pejabat penandatangan (PPK, Bendahara, KPA, Kepala, PLT, PLH) dengan masa berlaku. PPK &
 * Bendahara dipakai otomatis di dokumen LPJ dan form surat sesuai tanggal dokumennya; Kepala/PLT/PLH
 * menjadi pilihan cepat penandatangan Surat Perintah. Penetapan tidak diubah atau
 * dihapus (rules); jabatan diakhiri lewat tanggal akhir. Menetapkan pejabat baru otomatis
 * mengakhiri penetapan jenis yang sama yang masih berjalan, sehari sebelum tanggal mulai baru.
 */
export default function TabPejabat({ pegawai, uid, bolehUbah }) {
  const { daftar, memuat } = usePenetapanPejabat();
  const [form, setForm] = useState(null); // null = tertutup
  const [galatForm, setGalatForm] = useState('');
  const [proses, setProses] = useState(false);
  const [akhiri, setAkhiri] = useState(null); // { penetapan, tanggal }

  const hariIni = tanggalIso();
  const pegawaiById = useMemo(() => Object.fromEntries(pegawai.map((p) => [p.id, p])), [pegawai]);
  const pilihanPegawai = pegawai.filter((p) => p.aktif !== false);
  const nama = (p) => pegawaiById[p.pegawaiId]?.nama || '(pegawai tidak ditemukan)';

  // Penetapan jenis yang sama yang masih terbuka dan dimulai sebelum tanggal mulai baru
  const diakhiri =
    form?.jenis && form.berlakuMulai
      ? daftar.filter(
          (p) => p.jenis === form.jenis && !p.berlakuSampai && p.berlakuMulai < form.berlakuMulai,
        )
      : [];

  function buka() {
    setGalatForm('');
    setForm({ jenis: '', pegawaiId: '', berlakuMulai: hariIni, berlakuSampai: '' });
  }

  async function simpan(e) {
    e.preventDefault();
    if (!form.jenis || !form.pegawaiId || !form.berlakuMulai)
      return setGalatForm('Jenis, pegawai, dan tanggal mulai wajib diisi.');
    if (form.berlakuSampai && form.berlakuSampai < form.berlakuMulai)
      return setGalatForm('Tanggal akhir tidak boleh sebelum tanggal mulai.');
    setGalatForm('');
    setProses(true);
    try {
      const sampai = sehariSebelum(form.berlakuMulai);
      await tetapkanPejabat(
        form,
        diakhiri.map((p) => ({ id: p.id, berlakuSampai: sampai })),
        uid,
      );
      showToast('Pejabat ditetapkan.');
      setForm(null);
    } catch (err) {
      setGalatForm(pesanGalat(err, 'Penetapan pejabat gagal disimpan.'));
    } finally {
      setProses(false);
    }
  }

  async function simpanAkhir(e) {
    e.preventDefault();
    const { penetapan, tanggal } = akhiri;
    if (!tanggal || tanggal < penetapan.berlakuMulai) return;
    setProses(true);
    try {
      await akhiriPejabat(penetapan.id, tanggal, uid);
      showToast('Masa jabatan diakhiri.');
      setAkhiri(null);
    } catch (err) {
      showToast(pesanGalat(err, 'Tanggal akhir gagal disimpan.'), 'error');
    } finally {
      setProses(false);
    }
  }

  const tombolAkhiri = (p) =>
    bolehUbah &&
    !p.berlakuSampai && (
      <button
        type="button"
        onClick={() =>
          setAkhiri({
            penetapan: p,
            tanggal: p.berlakuMulai > hariIni ? p.berlakuMulai : hariIni,
          })
        }
        className="shrink-0 text-[11px] font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 rounded-lg"
      >
        Akhiri
      </button>
    );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-bold text-slate-700 dark:text-slate-200">Pejabat Penandatangan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            PPK & Bendahara dipakai otomatis di dokumen LPJ dan form surat sesuai tanggal
            dokumennya.
          </p>
        </div>
        {bolehUbah && !form && (
          <button
            type="button"
            onClick={buka}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
          >
            <FaPlus /> Tetapkan Pejabat
          </button>
        )}
      </div>

      {form && (
        <form
          onSubmit={simpan}
          className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label htmlFor="pj-jenis" className={labelKelas}>
              JABATAN
            </label>
            <select
              id="pj-jenis"
              required
              value={form.jenis}
              onChange={(e) => setForm({ ...form, jenis: e.target.value })}
              className={masukan}
            >
              <option value="">-- Pilih --</option>
              {JENIS_PEJABAT.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pj-pegawai" className={labelKelas}>
              PEGAWAI
            </label>
            <select
              id="pj-pegawai"
              required
              value={form.pegawaiId}
              onChange={(e) => setForm({ ...form, pegawaiId: e.target.value })}
              className={masukan}
            >
              <option value="">-- Pilih --</option>
              {pilihanPegawai.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pj-mulai" className={labelKelas}>
              BERLAKU MULAI
            </label>
            <input
              id="pj-mulai"
              type="date"
              required
              value={form.berlakuMulai}
              onChange={(e) => setForm({ ...form, berlakuMulai: e.target.value })}
              className={masukanTanggal}
            />
          </div>
          <div>
            <label htmlFor="pj-sampai" className={labelKelas}>
              BERLAKU SAMPAI (opsional)
            </label>
            <input
              id="pj-sampai"
              type="date"
              min={form.berlakuMulai || undefined}
              value={form.berlakuSampai}
              onChange={(e) => setForm({ ...form, berlakuSampai: e.target.value })}
              className={masukanTanggal}
            />
          </div>
          {diakhiri.length > 0 && (
            <p className="md:col-span-4 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2">
              Penetapan {diakhiri.map(nama).join(', ')} yang masih berjalan akan diakhiri pada{' '}
              {tgl(sehariSebelum(form.berlakuMulai))}.
            </p>
          )}
          {galatForm && (
            <p
              role="alert"
              className="md:col-span-4 text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-900/50 rounded-lg px-3 py-2"
            >
              {galatForm}
            </p>
          )}
          <div className="md:col-span-4 flex flex-wrap justify-between items-center gap-2">
            <p className="text-[11px] text-slate-400">
              Kosongkan tanggal akhir bila masih menjabat. Penetapan tidak bisa dihapus; salah input
              diperbaiki dengan penetapan baru.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <FaTimes /> Batal
              </button>
              <button
                type="submit"
                disabled={proses}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 shadow-sm"
              >
                <FaSave /> {proses ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </form>
      )}

      {memuat ? (
        <p className="p-8 text-center text-sm text-slate-400">Memuat data pejabat…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">
          {JENIS_PEJABAT.map((j) => {
            const riwayat = daftar.filter((p) => p.jenis === j.id);
            const kini = penetapanPada(daftar, j.id, hariIni);
            const lain = riwayat.filter((p) => p.id !== kini?.id);
            const orangKini = kini && pegawaiById[kini.pegawaiId];
            return (
              <section key={j.id} className="bg-white dark:bg-slate-900 p-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                  {j.label}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{PEMAKAIAN[j.id]}</p>
                {kini ? (
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {nama(kini)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {orangKini?.nip ? `NIP ${orangKini.nip} · ` : ''}
                        {rentang(kini)}
                      </p>
                    </div>
                    {tombolAkhiri(kini)}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">Belum ditetapkan</p>
                )}
                {lain.length > 0 && (
                  <ul className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    {lain.map((p) => {
                      const [warna, label] = statusPenetapan(p, kini, hariIni);
                      return (
                        <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">{nama(p)}</span> · {rentang(p)}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${CHIP[warna]}`}
                            >
                              {label}
                            </span>
                            {tombolAkhiri(p)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {akhiri && (
        <Modal
          onClose={proses ? () => {} : () => setAkhiri(null)}
          labelledBy="judul-akhiri-pejabat"
          widthClass="max-w-sm"
        >
          <form onSubmit={simpanAkhir} className="p-5">
            <h2
              id="judul-akhiri-pejabat"
              className="font-bold text-slate-800 dark:text-slate-100 text-lg"
            >
              Akhiri Masa Jabatan
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {nama(akhiri.penetapan)} ·{' '}
              {JENIS_PEJABAT.find((j) => j.id === akhiri.penetapan.jenis)?.label}
            </p>
            <label htmlFor="pj-akhir" className={`${labelKelas} mt-4`}>
              TANGGAL TERAKHIR MENJABAT
            </label>
            <input
              id="pj-akhir"
              type="date"
              required
              min={akhiri.penetapan.berlakuMulai}
              value={akhiri.tanggal}
              onChange={(e) => setAkhiri({ ...akhiri, tanggal: e.target.value })}
              className={masukanTanggal}
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setAkhiri(null)}
                disabled={proses}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  proses || !akhiri.tanggal || akhiri.tanggal < akhiri.penetapan.berlakuMulai
                }
                className="bg-rose-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
              >
                {proses ? 'Menyimpan…' : 'Akhiri'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
