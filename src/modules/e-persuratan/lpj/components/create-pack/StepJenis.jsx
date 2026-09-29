import React from 'react';
import { FaRegFileAlt, FaMagic } from 'react-icons/fa';
import { INPUT_CLASS, LABEL_CLASS } from './formStyles';

/** Langkah 1 — Jenis & Judul LPJ */
export default function StepJenis({ form, onChange }) {
  return (
    <div className="space-y-8">
      {/* Judul Input */}
      <div>
        <label htmlFor="judul-lpj" className={LABEL_CLASS}>
          Judul LPJ <span className="text-rose-500">*</span>
        </label>
        <input
          id="judul-lpj"
          type="text"
          placeholder="Masukkan judul laporan kegiatan..."
          value={form.judul}
          onChange={(e) => onChange('judul', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      {/* Grid Pilihan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opsi 1: Perjadin */}
        <button
          type="button"
          onClick={() => onChange('type', 'perjadin')}
          className={`text-left p-6 rounded-2xl border-2 transition-all ${
            form.type === 'perjadin'
              ? 'border-[#1e293b] dark:border-indigo-500 bg-slate-50 dark:bg-[#1e293b]/50 shadow-md ring-4 ring-slate-100 dark:ring-indigo-500/20'
              : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-[#1e293b] flex items-center justify-center text-white mb-6 shadow-sm">
            <FaMagic size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">LPJ Perjadin</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed min-h-[40px]">
            Laporan Pertanggungjawaban Perjalanan Dinas - Surat Perintah, SPD, & SPBy
          </p>
          <span className="inline-flex items-center px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-full">
            3 Dokumen Utama
          </span>
        </button>

        {/* Opsi 2: Non-Perjadin */}
        <button
          type="button"
          onClick={() => onChange('type', 'non-perjadin')}
          className={`text-left p-6 rounded-2xl border-2 transition-all ${
            form.type === 'non-perjadin'
              ? 'border-[#335d88] dark:border-blue-500 bg-slate-50 dark:bg-[#335d88]/20 shadow-md ring-4 ring-slate-100 dark:ring-blue-500/20'
              : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-[#335d88] flex items-center justify-center text-white mb-6 shadow-sm">
            <FaRegFileAlt size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            LPJ Non-Perjadin
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed min-h-[40px]">
            Laporan Pertanggungjawaban Kegiatan Non-Perjalanan Dinas
          </p>
          <span className="inline-flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">
            5 Dokumen Pack
          </span>
        </button>
      </div>
    </div>
  );
}
