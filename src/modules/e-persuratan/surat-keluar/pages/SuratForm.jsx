import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaSave,
  FaPrint,
  FaCheckCircle,
  FaSpinner,
  FaSearch,
  FaTimes,
  FaTrashAlt,
} from 'react-icons/fa';
import { SURAT_REGISTRY } from '@/data/surat';
import { usePegawaiRingkas } from '@/context/usePegawaiRingkas';
import { usePejabat } from '@/context/usePejabat';
import { PANJANG } from '@/utils/batas';
import { tahunIni, tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { ANIM } from '@/utils/animasi';
import { useMekarDariTombol } from '@/components/animasi';
import { gulirKeGalat } from '../../gulirPintar';
import {
  LABEL_TINGKAT,
  TINGKAT_PILIHAN,
  itemDiAkun,
  kodeMakDari,
  makDariAkun,
  pilihanTingkat,
} from '../../makPohon';
import { daftarTahun } from '../../tahunAnggaran';
import { useMakTahun } from '../../useMakTahun';
import { HIERARKI_KODE } from '../data/nomorSuratConfig';
import { useKodeSurat } from '../hooks/useNomorSurat';
import { terbitkanNomorSurat } from '../services/nomorSurat';

const nilaiKosong = (x) => !x || (Array.isArray(x) && x.length === 0);

export default function SuratForm() {
  // Dibuka dari "Isi Form": halaman form mekar dari tombol itu
  const mekarRef = useMekarDariTombol();
  const { suratId } = useParams();
  const navigate = useNavigate();

  const found = SURAT_REGISTRY.find((s) => s.id === suratId);

  const butuh = (tipe) => !!found?.variables?.some((v) => tipe.includes(v.type));

  const [surat, setSurat] = useState(found || null);
  const [formData, setFormData] = useState({});
  const [savedInstance, setSavedInstance] = useState(null);
  const [missingFieldInfo, setMissingFieldInfo] = useState(null);
  // Setelah "Lanjutkan Isi Form": isian wajib yang kosong ditandai merah dan layar menuju ke sana
  const [tandaiKosong, setTandaiKosong] = useState(false);

  // Data pendukung dari Firestore (listener bersama): pegawai ringkas, MAK satu tahun anggaran,
  // dan kode surat aktif. MAK & kode surat hanya dimuat bila definisi surat memakainya.
  const { pegawai } = usePegawaiRingkas();
  const pegawaiDB = useMemo(
    () =>
      pegawai.map((p) => ({
        uid: p.id,
        nama: p.nama,
        nip: p.nip,
        pangkat: p.pangkatNama,
        jabatan: p.jabatanNama,
      })),
    [pegawai],
  );
  const [tahunMak, setTahunMak] = useState(tahunIni);
  const mak = useMakTahun(butuh(['mak', 'detail_transaksi']) ? tahunMak : null);
  const kodeSurat = useKodeSurat({ aktif: butuh(['nomor_surat']) });

  // Init Surat & isian awal. Isian tidak disimpan ke database.
  useEffect(() => {
    const found = SURAT_REGISTRY.find((s) => s.id === suratId);
    if (!found) {
      showToast('Surat tidak ditemukan.', 'error');
      navigate('/e-persuratan/persuratan');
      return;
    }
    setSurat(found);
    const initial = {};
    found.variables?.forEach((v) => {
      if (v.source !== 'auto') {
        if (v.type === 'pegawai_multi' || v.type === 'detail_transaksi') {
          initial[v.key] = [];
        } else if (v.type === 'dynamic_list') {
          initial[v.key] = ['']; // Array string kosong pertama
        } else if (v.key === 'tempat_terbit') {
          initial[v.key] = 'Singaraja';
        } else if (v.type === 'date') {
          initial[v.key] = tanggalIso();
        } else {
          initial[v.key] = v.default !== undefined ? v.default : '';
        }
      }
    });
    setFormData(initial);
  }, [suratId, navigate]);

  // PPK & Bendahara diisi otomatis (sekali per jenis surat) dari pejabat yang berlaku hari ini
  // (`pegawai_pejabat`, ditetapkan di Kepegawaian); isian yang sudah terisi tidak ditimpa.
  const { pejabatPada, memuat: memuatPejabat } = usePejabat();
  const pejabatTerisi = useRef('');
  useEffect(() => {
    if (memuatPejabat || pejabatTerisi.current === suratId) return;
    pejabatTerisi.current = suratId;
    const ppk = pejabatPada('ppk');
    const bendahara = pejabatPada('bendahara');
    const isi = { ppk, pejabat_ppk: ppk, bendahara };
    setFormData((f) => {
      const tambahan = Object.entries(isi)
        .filter(([k, orang]) => orang && k in f && !f[k])
        .map(([k, orang]) => [k, formatPegawai(orang)]);
      return tambahan.length ? { ...f, ...Object.fromEntries(tambahan) } : f;
    });
  }, [suratId, memuatPejabat, pejabatPada]);

  if (!surat) return <div className="p-8">Loading...</div>;

  // Isian surat tidak disimpan ke database (draf lama `surat_instances` tidak pernah dibaca dan
  // sudah dihapus, lihat docs/skema-database.md §6). "Selesai Mengisi" hanya memeriksa isian
  // wajib, lalu membuka langkah berikutnya (nomor surat & cetak).
  const handleSave = (keluar = false) => {
    if (keluar) {
      navigate('/e-persuratan/persuratan');
      return;
    }
    const missing = surat.variables
      ?.filter((v) => v.required && v.source !== 'auto')
      .find(
        (v) => !formData[v.key] || (Array.isArray(formData[v.key]) && formData[v.key].length === 0),
      );
    if (missing) {
      setMissingFieldInfo(missing);
      return;
    }
    setMissingFieldInfo(null);
    setSavedInstance({ ...formData });
  };

  return (
    <div
      ref={mekarRef}
      className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden"
    >
      {/* Custom Warning Modal */}
      {missingFieldInfo && (
        <div
          className={`${ANIM.latar} fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm`}
        >
          <div
            className={`${ANIM.popup} bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 overflow-hidden`}
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center shrink-0 shadow-inner">
                <svg
                  className="w-7 h-7 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                  Isian Belum Lengkap
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Terdapat form yang masih kosong.
                </p>
              </div>
            </div>

            <div className="mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bagian{' '}
                <strong className="text-indigo-600 font-bold">"{missingFieldInfo.label}"</strong>{' '}
                belum Anda isi.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                Pilih{' '}
                <strong className="text-slate-800 dark:text-slate-100">Lanjutkan Isi Form</strong>{' '}
                untuk melengkapinya, atau{' '}
                <strong className="text-slate-800 dark:text-slate-100">Keluar</strong> untuk kembali
                ke daftar surat. Isian tidak disimpan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setMissingFieldInfo(null);
                  setTandaiKosong(true);
                  gulirKeGalat();
                }}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 rounded-xl transition-colors"
              >
                Lanjutkan Isi Form
              </button>
              <button
                onClick={() => handleSave(true)}
                className="px-6 py-2.5 flex items-center gap-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Baru (Mockup) */}
      <div className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 px-8 py-6 z-20 shrink-0 print:hidden flex flex-col items-center">
        <div className="w-full max-w-6xl">
          <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{surat.nama}</h1>
                <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase">
                  Draft
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!savedInstance ? (
                <button
                  onClick={() => handleSave(false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-900/20"
                >
                  <FaSave />
                  Selesai Mengisi
                </button>
              ) : (
                <button
                  onClick={() => navigate('/e-persuratan/persuratan')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500 hover:text-emerald-700 dark:hover:text-white border border-emerald-200 dark:border-emerald-500/20 text-sm font-bold rounded-xl transition-all"
                >
                  <FaCheckCircle /> Selesai
                </button>
              )}
              <button
                onClick={() => navigate('/e-persuratan/persuratan')}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500 hover:text-rose-700 dark:hover:text-white text-sm font-bold rounded-xl transition-colors"
              >
                <FaTimes /> Batal
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-[#0f172a] relative">
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-6">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold">
                  {surat.kode}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {surat.nama}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Lengkapi form di bawah untuk membuat draf surat
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {surat.variables?.map((v) => {
                  if (v.source === 'auto') return null;
                  const kosong = tandaiKosong && v.required && nilaiKosong(formData[v.key]);

                  return (
                    <div
                      key={v.key}
                      data-galat={kosong ? '' : undefined}
                      className={
                        kosong
                          ? 'rounded-lg ring-2 ring-rose-400 ring-offset-4 ring-offset-white dark:ring-rose-500 dark:ring-offset-slate-800'
                          : undefined
                      }
                    >
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                        {v.label} {v.required && <span className="text-rose-500">*</span>}
                      </label>
                      {kosong && (
                        <p
                          className={`-mt-1 mb-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 ${ANIM.muncul}`}
                        >
                          Wajib diisi
                        </p>
                      )}

                      {v.type === 'text' && (
                        <input
                          type="text"
                          value={formData[v.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                          placeholder={`Masukkan ${v.label.toLowerCase()}...`}
                        />
                      )}

                      {v.type === 'select' && (
                        <select
                          value={formData[v.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                        >
                          <option value="">-- Pilih {v.label} --</option>
                          {v.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {v.type === 'textarea' && (
                        <textarea
                          rows={3}
                          value={formData[v.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors resize-y"
                          placeholder={`Masukkan ${v.label.toLowerCase()}...`}
                        />
                      )}

                      {v.type === 'dynamic_list' && (
                        <div className="space-y-2">
                          {(Array.isArray(formData[v.key])
                            ? formData[v.key]
                            : [formData[v.key] || '']
                          ).map((item, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const newArr = Array.isArray(formData[v.key])
                                    ? [...formData[v.key]]
                                    : [formData[v.key] || ''];
                                  newArr[index] = e.target.value;
                                  setFormData({ ...formData, [v.key]: newArr });
                                }}
                                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                                placeholder={`Item ${index + 1}`}
                              />
                              <button
                                onClick={() => {
                                  const newArr = Array.isArray(formData[v.key])
                                    ? [...formData[v.key]]
                                    : [formData[v.key] || ''];
                                  newArr.splice(index, 1);
                                  setFormData({ ...formData, [v.key]: newArr });
                                }}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newArr = Array.isArray(formData[v.key])
                                ? [...formData[v.key]]
                                : [formData[v.key] || ''];
                              newArr.push('');
                              setFormData({ ...formData, [v.key]: newArr });
                            }}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                          >
                            + Tambah Item
                          </button>
                        </div>
                      )}

                      {v.type === 'date' && (
                        <input
                          type="date"
                          value={formData[v.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                        />
                      )}

                      {v.type === 'number' && (
                        <input
                          type="number"
                          value={formData[v.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                          placeholder="0"
                        />
                      )}

                      {v.type === 'pegawai' && (
                        <PegawaiSearch
                          pegawaiDB={pegawaiDB}
                          multi={false}
                          value={formData[v.key]}
                          onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                          placeholder={`Cari ${v.label.toLowerCase()}...`}
                          disabled={v.readonly}
                        />
                      )}

                      {v.type === 'pegawai_multi' && (
                        <PegawaiSearch
                          pegawaiDB={pegawaiDB}
                          multi={true}
                          value={formData[v.key] || []}
                          onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                          placeholder={`Cari ${v.label.toLowerCase()}...`}
                          disabled={v.readonly}
                        />
                      )}

                      {v.type === 'mak' && (
                        <MakSearch
                          nodes={mak.nodes}
                          byId={mak.byId}
                          memuat={mak.memuat}
                          tahun={tahunMak}
                          onTahun={setTahunMak}
                          value={formData[v.key]}
                          onChange={(val, meta) =>
                            setFormData({ ...formData, [v.key]: val, ...(meta || {}) })
                          }
                          disabled={v.readonly}
                        />
                      )}

                      {v.type === 'detail_transaksi' && (
                        <DetailTransaksi
                          value={formData[v.key]}
                          onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                          pegawaiList={formData.pegawai_list || []}
                          disabled={v.readonly}
                          isSaved={!!savedInstance}
                          nodes={mak.nodes}
                          byId={mak.byId}
                          akunNodeId={formData._akunNodeId || ''}
                          tahunNodeId={formData._tahunNodeId || ''}
                          makString={formData.mak || ''}
                        />
                      )}

                      {v.type === 'nomor_surat' && (
                        <NomorSuratSearch
                          indeks={kodeSurat.indeksAktif}
                          memuat={kodeSurat.memuat}
                          value={formData[v.key]}
                          onChange={(val) => setFormData({ ...formData, [v.key]: val })}
                          disabled={v.readonly}
                          formData={formData}
                          surat={surat}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub Komponen: Search Pegawai ──────────────────────────────────────────

// Format baku penyimpanan string pegawai ({ nama, nip, pangkat, jabatan }, juga salinan Orang)
const formatPegawai = (p) =>
  `${p.nama}\nNIP. ${p.nip || '-'}\nPangkat: ${p.pangkat || '-'}\nJabatan: ${p.jabatan || '-'}`;

function PegawaiSearch({ pegawaiDB, multi, value, onChange, placeholder, disabled }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Mem-parsing kembali nama untuk ditampilkan di badge
  const extractNama = (str) => str.split('\n')[0];

  const filtered = pegawaiDB.filter(
    (p) => p.nama?.toLowerCase().includes(query.toLowerCase()) || p.nip?.includes(query),
  );

  const handleSelect = (p) => {
    if (disabled) return;
    const val = formatPegawai(p);
    if (multi) {
      if (!value.includes(val)) {
        onChange([...value, val]);
      }
    } else {
      onChange(val);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (valToRemove) => {
    if (disabled) return;
    if (multi) {
      onChange(value.filter((v) => v !== valToRemove));
    } else {
      onChange('');
    }
  };

  return (
    <div className="relative w-full">
      {/* Jika Single dan sudah ada value, tampilkan state terpilih, bukan input text */}
      {!multi && value ? (
        <div
          className={`flex items-center justify-between w-full px-4 py-3 border rounded-xl text-sm ${disabled ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400' : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-inner'}`}
        >
          <div className="font-semibold">{extractNama(value)}</div>
          {!disabled && (
            <button
              onClick={() => handleRemove()}
              className="text-slate-400 hover:text-rose-500 p-1"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>
      ) : (
        /* Input Search */
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500/50 hover:border-slate-600/80 shadow-inner transition-colors disabled:opacity-50 disabled:bg-slate-100 dark:bg-slate-800/50 disabled:cursor-not-allowed"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            disabled={disabled}
          />
        </div>
      )}

      {/* Helper text for multi */}
      {multi && !disabled && (
        <p className="text-[11px] text-slate-500 mt-2 ml-1">Bisa memilih lebih dari satu pegawai</p>
      )}

      {/* Area Tampilan yang sudah dipilih (Table-like Cards) */}
      {multi && value.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {value.map((v, i) => {
            const parts = v.split('\n');
            const parsedNama = parts[0];
            const parsedNip = parts[1]?.replace('NIP. ', '') || '-';
            const parsedPangkat = parts[2]?.replace('Pangkat: ', '') || '-';
            const parsedJabatan = parts[3]?.replace('Jabatan: ', '') || '-';

            return (
              <div
                key={i}
                className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 bg-white dark:bg-[#111827]/40 border border-slate-200 dark:border-slate-700/80 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full pr-8">
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Nama</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {parsedNama}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">NIP</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {parsedNip}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Pangkat/Gol</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {parsedPangkat}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Jabatan</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                      {parsedJabatan}
                    </div>
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleRemove(v);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 shrink-0 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                    title="Hapus Pegawai"
                  >
                    <FaTrashAlt className="text-sm" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown Hasil Pencarian */}
      {isOpen && query && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <button
                key={p.uid}
                type="button"
                onMouseDown={() => handleSelect(p)}
                className="w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors last:border-0"
              >
                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{p.nama}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {p.nip || '-'} • {p.jabatan || '-'}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
              Pegawai tidak ditemukan.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pilihan MAK bertingkat dari `mak_node` satu tahun anggaran: Tahun → Program → … → Akun.
 * Memilih Akun menyimpan kode MAK (teks) + `_akunNodeId`/`_tahunNodeId` untuk Detail Transaksi.
 */
function MakSearch({ nodes, byId, memuat, tahun, onTahun, value, onChange, disabled }) {
  // { [indeks tingkat]: nodeId } untuk Program (1) sampai Akun (7); Tahun dipilih lewat `tahun`
  const [selections, setSelections] = useState({});
  const akar = pilihanTingkat(nodes, 0)[0] || null; // node Tahun tahun anggaran terpilih
  const terakhir = TINGKAT_PILIHAN.length - 1;

  const handleClear = () => {
    if (disabled) return;
    onChange('', { _akunNodeId: '', _tahunNodeId: '' });
    setSelections({});
  };

  const handleSelectChange = (levelIndex, nodeId) => {
    // Tingkat di bawah tingkat yang diganti dikosongkan
    const next = {};
    for (let i = 1; i < levelIndex; i++) if (selections[i]) next[i] = selections[i];
    if (nodeId) next[levelIndex] = nodeId;
    setSelections(next);
    if (levelIndex === terakhir && nodeId) {
      const m = makDariAkun(byId, nodeId);
      onChange(m.kode, { _akunNodeId: nodeId, _tahunNodeId: m.tahunNodeId });
    }
  };

  if (value) {
    return (
      <div
        className={`flex items-center justify-between w-full px-4 py-3 border rounded-xl text-sm shadow-sm ${disabled ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}
      >
        <div className="font-semibold leading-relaxed">{value}</div>
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-rose-600 p-1 shrink-0 ml-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"
          >
            <FaTimes size={12} />
          </button>
        )}
      </div>
    );
  }

  const SELECT =
    'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm disabled:opacity-50';
  const LABEL =
    'text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 ml-1';

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
        Silakan pilih secara berurutan sesuai struktur MAK:
      </div>
      <div className="flex flex-col">
        <label className={LABEL}>1. {LABEL_TINGKAT.tahun}</label>
        <select
          value={tahun}
          onChange={(e) => {
            onTahun(Number(e.target.value));
            setSelections({});
          }}
          disabled={disabled}
          className={SELECT}
        >
          {daftarTahun().map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {memuat ? (
        <div className="text-xs text-slate-500 dark:text-slate-400 italic">Memuat data MAK…</div>
      ) : !akar ? (
        <div className="text-xs text-rose-500 italic">
          Data MAK tahun {tahun} belum diisi. Minta Keuangan mengisinya di menu MAK Setup.
        </div>
      ) : (
        TINGKAT_PILIHAN.slice(1).map((tingkat, j) => {
          const idx = j + 1;
          // Hanya tampil bila tingkat sebelumnya sudah dipilih
          if (idx > 1 && !selections[idx - 1]) return null;
          const indukId = idx === 1 ? akar.id : selections[idx - 1];
          const options = pilihanTingkat(nodes, idx, indukId);
          if (options.length === 0) {
            return (
              <div key={tingkat} className="text-xs text-rose-500 italic">
                Data {LABEL_TINGKAT[tingkat]} tidak tersedia untuk hirarki ini.
              </div>
            );
          }
          return (
            <div key={tingkat} className="flex flex-col">
              <label className={LABEL}>
                {idx + 1}. {LABEL_TINGKAT[tingkat]}
              </label>
              <select
                value={selections[idx] || ''}
                onChange={(e) => handleSelectChange(idx, e.target.value)}
                disabled={disabled}
                className={SELECT}
              >
                <option value="">-- Pilih {LABEL_TINGKAT[tingkat]} --</option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.kode ? `${opt.kode} - ` : ''}
                    {opt.nama}
                  </option>
                ))}
              </select>
            </div>
          );
        })
      )}
    </div>
  );
}

// --- Sub Komponen: Search Nomor Surat ----------------------------------

/** Data register nomor dari isian form (tanggal, perihal, tujuan, seksi untuk Riwayat Surat). */
function dataRegisterDari(formData, surat) {
  const tanggal =
    [formData.tanggal_sp, formData.tanggal_surat, formData.tanggal].find((t) =>
      /^\d{4}-\d{2}-\d{2}$/.test(t || ''),
    ) || tanggalIso();
  const daftar = Array.isArray(formData.pegawai_list)
    ? formData.pegawai_list
    : [formData.pegawai_list];
  const kepada = daftar.filter(Boolean).map((s) => String(s).split('\n')[0]);
  const tujuan =
    kepada.length > 1
      ? `${kepada[0]} dkk. (${kepada.length} orang)`
      : kepada[0] || String(formData.tujuan || '');
  const perihal = String(
    formData.perihal || formData.kegiatan_poin_1 || formData.maksud || surat.nama,
  ).trim();
  return {
    tanggal,
    perihal: perihal.slice(0, PANJANG.perihalSurat),
    tujuan: tujuan.trim().slice(0, PANJANG.tujuanSurat),
    seksi: String(formData.seksi || '').slice(0, 60),
  };
}

/**
 * Nomor surat: ketik manual, atau pilih kode surat aktif (KOP → … sampai tingkat terakhir) lalu
 * "Generate" — nomor terbit lewat Function dan tercatat di Riwayat Surat (sumber form).
 */
function NomorSuratSearch({ indeks, memuat, value, onChange, disabled, formData, surat }) {
  const [kodeIds, setKodeIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [customValue, setCustomValue] = useState(value || '');

  // Keep customValue in sync with value if it changes externally
  useEffect(() => {
    setCustomValue(value || '');
  }, [value]);

  const ujung = indeks.byId.get(kodeIds[kodeIds.length - 1]);
  const kodeLengkap = !!ujung && indeks.anakDari(ujung.id).length === 0;

  const handleGenerate = async () => {
    if (disabled || isGenerating) return;
    if (!kodeLengkap) {
      showToast('Pilih kode surat sampai tingkat terakhir terlebih dahulu.', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const { nomor } = await terbitkanNomorSurat({
        sumber: 'form',
        jenisSurat: surat.nama,
        kodeIds,
        ...dataRegisterDari(formData, surat),
      });
      onChange(nomor);
      setCustomValue(nomor);
      setGenerateSuccess(true);
      setTimeout(() => setGenerateSuccess(false), 3000);
    } catch (err) {
      showToast(pesanGalat(err, 'Gagal membuat nomor surat.'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
          Pengaturan Nomor Surat:
        </div>
        {generateSuccess && (
          <span className="text-[10px] font-bold text-emerald-600 animate-pulse">
            Berhasil di-generate!
          </span>
        )}
      </div>

      {/* Jika sudah ada value, tampilkan input text (bisa diedit manual jika perlu) */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Atau ketik nomor surat manual..."
          disabled={disabled}
          className="flex-1 px-4 py-2 border rounded-xl text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {!value && (
        <div className="flex flex-col gap-3 mt-2 border-t pt-3 border-slate-200 dark:border-slate-700">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-1">
            Buat otomatis (Pilih struktur):
          </div>
          {memuat && (
            <div className="text-xs text-slate-500 dark:text-slate-400 italic">
              Memuat kode surat…
            </div>
          )}
          {!memuat && indeks.anakDari(null).length === 0 && (
            <div className="text-xs text-rose-500 italic">
              Kode surat belum diisi. Minta Keuangan mengisinya di menu Nomor Surat.
            </div>
          )}
          {HIERARKI_KODE.map((tingkat, idx) => {
            if (idx > 0 && !kodeIds[idx - 1]) return null;
            const options = indeks.anakDari(idx === 0 ? null : kodeIds[idx - 1]);
            if (options.length === 0) return null; // tingkat sebelumnya sudah tingkat terakhir

            return (
              <div key={tingkat} className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 ml-1">
                  {idx + 1}. {tingkat}
                </label>
                <select
                  value={kodeIds[idx] || ''}
                  onChange={(e) =>
                    setKodeIds([...kodeIds.slice(0, idx), e.target.value].filter(Boolean))
                  }
                  disabled={disabled || isGenerating}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm disabled:opacity-50"
                >
                  <option value="">-- Pilih {tingkat} --</option>
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.kode ? `${opt.kode} - ` : ''}
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled || !kodeLengkap || isGenerating}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <FaSpinner className="animate-spin" /> : <FaPrint />}
            Generate Nomor Surat
          </button>
        </div>
      )}
    </div>
  );
}

// --- Sub Komponen: Detail Transaksi ----------------------------------
function DetailTransaksi({
  value,
  onChange,
  pegawaiList,
  disabled,
  isSaved,
  nodes,
  byId,
  akunNodeId,
  tahunNodeId,
  makString,
}) {
  const [rows, setRows] = useState(Array.isArray(value) && value.length > 0 ? value : []);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Akun dari teks kode MAK bila id Akun belum ada (mis. kode MAK diketik/diwarisi sebagai teks)
  const resolvedAkunNodeId = useMemo(() => {
    if (akunNodeId) return akunNodeId;
    if (!makString) return '';
    const akun = nodes.find((n) => n.tingkat === 'akun' && kodeMakDari(byId, n.id) === makString);
    return akun?.id || '';
  }, [akunNodeId, makString, nodes, byId]);

  // Item MAK aktif di bawah Akun terpilih
  const itemOptions = itemDiAkun(nodes, resolvedAkunNodeId);

  useEffect(() => {
    // Jika form sudah pernah disimpan (isSaved = true), jangan auto-generate ulang
    // meskipun rows kosong (karena mungkin user sengaja menghapusnya).
    // Hanya render sesuai value yang ada dari database.
    if (isSaved) {
      if (Array.isArray(value) && JSON.stringify(value) !== JSON.stringify(rows)) {
        setRows(value);
      }
      if (!hasInitialized) setHasInitialized(true);
      return;
    }

    // --- Mode Auto-Generate (HANYA untuk form baru yang belum pernah disave) ---
    // Jika ada value sementara, gunakan
    if (Array.isArray(value) && value.length > 0) {
      if (JSON.stringify(value) !== JSON.stringify(rows)) {
        setRows(value);
      }
      if (!hasInitialized) setHasInitialized(true);
    }
    // Jika value benar-benar kosong dan belum inisialisasi, auto-buatkan baris
    else if (!hasInitialized && pegawaiList && pegawaiList.length > 0) {
      const initialRows = pegawaiList.map((p, i) => {
        const nipNama = p.split('\n')[0];
        const nipOnly = p.includes('NIP.') ? p.split('NIP. ')[1].split('\n')[0] : '';
        const label = nipOnly ? `${nipOnly} - ${nipNama}` : nipNama;
        return {
          id: Date.now() + i, // unique ID
          pegawai: label,
          detail: '',
          itemNodeId: '',
          akunNodeId: '',
          tahunNodeId: '',
          itemKode: '',
          itemName: '',
          uraian: '',
          jumlah: '',
        };
      });
      setRows(initialRows);
      onChange(initialRows);
      setHasInitialized(true);
    }
  }, [value, pegawaiList, hasInitialized, isSaved]);

  const updateParent = (newRows) => {
    setRows(newRows);
    onChange(newRows);
  };

  const handleAdd = () => {
    updateParent([
      ...rows,
      {
        id: Date.now(),
        pegawai: '',
        detail: '',
        itemNodeId: '',
        akunNodeId: '',
        tahunNodeId: '',
        itemKode: '',
        itemName: '',
        uraian: '',
        jumlah: '',
      },
    ]);
  };

  const handleRemove = (id) => {
    updateParent(rows.filter((r) => r.id !== id));
  };

  const handleChange = (id, field, val) => {
    updateParent(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const handleDetailChange = (id, selectedValue) => {
    // Check if it's a MAK Item (starts with "mak:") or a static option
    if (selectedValue.startsWith('mak:')) {
      const itemId = selectedValue.replace('mak:', '');
      const itemNode = byId[itemId];
      if (itemNode) {
        updateParent(
          rows.map((r) =>
            r.id === id
              ? {
                  ...r,
                  detail: `${itemNode.kode || ''} - ${itemNode.nama}`.trim().replace(/^- /, ''),
                  itemNodeId: itemId,
                  akunNodeId: resolvedAkunNodeId || '',
                  tahunNodeId: tahunNodeId || '',
                  itemKode: itemNode.kode || '',
                  itemName: itemNode.nama || '',
                }
              : r,
          ),
        );
        return;
      }
    }
    // Static option or clear
    updateParent(
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              detail: selectedValue,
              itemNodeId: '',
              akunNodeId: '',
              tahunNodeId: '',
              itemKode: '',
              itemName: '',
            }
          : r,
      ),
    );
  };

  const formatRupiah = (angka) => {
    if (!angka) return '';
    const number_string = angka.toString().replace(/[^,\d]/g, '');
    const split = number_string.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
    return rupiah;
  };

  const parseRupiah = (string) => {
    return string.replace(/[^,\d]/g, '');
  };

  // Helper to find the current dropdown value for a row
  const getDropdownValue = (row) => {
    if (row.itemNodeId) {
      return `mak:${row.itemNodeId}`;
    }
    return row.detail || '';
  };

  return (
    <div className="flex flex-col border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center border-r">
                NAMA
              </th>
              <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center border-r">
                Detail / Item MAK
                {itemOptions.length > 0 && (
                  <span className="ml-1 text-[9px] font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                    {itemOptions.length} Item
                  </span>
                )}
              </th>
              <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center border-r">
                Jumlah (Rp)
              </th>
              <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selectedItem = row.itemNodeId ? byId[row.itemNodeId] : null;
              const itemPagu = selectedItem ? Number(selectedItem.pagu) || 0 : 0;

              return (
                <tr
                  key={row.id}
                  className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <td className="p-2 border-r">
                    <select
                      value={row.pegawai}
                      onChange={(e) => handleChange(row.id, 'pegawai', e.target.value)}
                      disabled={disabled}
                      className="w-full p-1.5 border rounded bg-white dark:bg-slate-800 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Pilih Pegawai --</option>
                      {pegawaiList.map((p, i) => {
                        const nipNama = p.split('\n')[0]; // Ambil baris pertama (Nama)
                        const nipOnly = p.includes('NIP.')
                          ? p.split('NIP. ')[1].split('\n')[0]
                          : '';
                        const label = nipOnly ? `${nipOnly} - ${nipNama}` : nipNama;
                        return (
                          <option key={i} value={label}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="p-2 border-r">
                    <select
                      value={getDropdownValue(row)}
                      onChange={(e) => handleDetailChange(row.id, e.target.value)}
                      disabled={disabled}
                      className={`w-full p-1.5 border rounded bg-white dark:bg-slate-800 focus:ring-1 focus:ring-indigo-500 ${row.itemNodeId ? 'border-teal-300 bg-teal-50' : ''}`}
                    >
                      <option value="">-- Pilih Detail --</option>
                      {/* MAK Item options (dynamic from hierarchy) */}
                      {itemOptions.length > 0 && (
                        <optgroup label="📦 Item MAK">
                          {itemOptions.map((item) => (
                            <option key={item.id} value={`mak:${item.id}`}>
                              {item.kode ? `${item.kode} - ` : ''}
                              {item.nama}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {/* Show item budget info */}
                    {selectedItem && itemPagu > 0 && (
                      <div className="mt-1 text-[9px] text-teal-600 flex items-center gap-1">
                        <span>Pagu: Rp {new Intl.NumberFormat('id-ID').format(itemPagu)}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-2 border-r">
                    <input
                      type="text"
                      value={formatRupiah(row.jumlah)}
                      onChange={(e) => handleChange(row.id, 'jumlah', parseRupiah(e.target.value))}
                      disabled={disabled}
                      className="w-full p-1.5 border rounded focus:ring-1 focus:ring-indigo-500 text-right"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(row.id)}
                      disabled={disabled}
                      className="bg-rose-50 text-rose-600 px-2 py-1 rounded hover:bg-rose-100 disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-400 italic">
                  Belum ada detail transaksi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <div className="p-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors font-semibold text-xs"
          >
            + Tambah Baris Transaksi
          </button>
        </div>
      )}
    </div>
  );
}
