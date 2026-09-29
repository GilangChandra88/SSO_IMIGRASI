import React, { useState } from 'react';
import { FaSearch, FaPlus, FaTrashAlt, FaCircleNotch, FaUser } from 'react-icons/fa';
import { usePegawaiList } from '../../hooks/usePegawaiList';
import { INPUT_CLASS, LABEL_CLASS } from './formStyles';

/** Langkah 2 — Pegawai yang ditugaskan (Perjalanan Dinas) */
export default function StepPegawai({ form, onChange }) {
  const { pegawai, loading, error } = usePegawaiList();
  const [cari, setCari] = useState('');

  const selectedIds = new Set(form.pegawai.map((p) => p.id));
  const kata = cari.trim().toLowerCase();
  const hasil = pegawai.filter(
    (p) =>
      !selectedIds.has(p.id) &&
      (!kata || p.nama.toLowerCase().includes(kata) || (p.nip || '').includes(kata)),
  );

  const tambah = (p) => onChange('pegawai', [...form.pegawai, p]);
  const hapus = (id) =>
    onChange(
      'pegawai',
      form.pegawai.filter((p) => p.id !== id),
    );

  return (
    <div className="space-y-6">
      {/* Pegawai terpilih */}
      <div>
        <div className={LABEL_CLASS}>
          Pegawai Terpilih ({form.pegawai.length}) <span className="text-rose-500">*</span>
        </div>
        {form.pegawai.length === 0 ? (
          <div className="px-4 py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm text-center text-slate-500 dark:text-slate-400">
            Belum ada pegawai. Pilih dari daftar di bawah.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {form.pegawai.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 sm:p-4 bg-slate-50 dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <span className="w-7 h-7 shrink-0 rounded-full bg-[#1e293b] text-white text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {p.nama}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    NIP {p.nip || '-'} • {p.jabatan || '-'}
                  </div>
                  {!p.authUid && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      Belum punya akun: dokumennya tidak masuk Dashboard pegawai ini.
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => hapus(p.id)}
                  className="shrink-0 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Hapus pegawai"
                  aria-label={`Hapus ${p.nama}`}
                >
                  <FaTrashAlt size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pencarian & daftar pegawai */}
      <div>
        <label htmlFor="cari-pegawai" className={LABEL_CLASS}>
          Tambah Pegawai
        </label>
        <div className="relative mb-3">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <input
            id="cari-pegawai"
            type="text"
            placeholder="Cari nama atau NIP..."
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            className={`${INPUT_CLASS} pl-10`}
          />
        </div>

        <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              <FaCircleNotch className="animate-spin" /> Memuat daftar pegawai...
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-sm text-center text-rose-600 dark:text-rose-400">
              {error}
            </div>
          ) : hasil.length === 0 ? (
            <div className="px-4 py-6 text-sm text-center text-slate-500 dark:text-slate-400">
              {pegawai.length > 0 && selectedIds.size === pegawai.length
                ? 'Semua pegawai sudah dipilih.'
                : 'Pegawai tidak ditemukan.'}
            </div>
          ) : (
            hasil.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => tambah(p)}
                className="w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FaUser className="shrink-0 text-slate-300 dark:text-slate-600" size={14} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {p.nama}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {p.nip || '-'} • {p.jabatan || '-'}
                  </div>
                </div>
                <FaPlus className="shrink-0 text-indigo-500" size={12} />
              </button>
            ))
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 ml-1">
          Satu SPD dan satu SPTJM akan dibuat untuk setiap pegawai.
        </p>
      </div>
    </div>
  );
}
