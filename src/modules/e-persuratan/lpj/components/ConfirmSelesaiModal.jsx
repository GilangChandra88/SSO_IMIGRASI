import React from 'react';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';

/** Konfirmasi sebelum dokumen / kelompok dokumen ditandai selesai. */
export default function ConfirmSelesaiModal({ label, onYes, onNo }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onNo}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-konfirmasi-selesai"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex gap-3.5 px-6 pt-6">
          <div className="w-[42px] h-[42px] shrink-0 rounded-full bg-yellow-100 dark:bg-yellow-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center">
            <FaExclamationTriangle size={18} />
          </div>
          <div>
            <h2
              id="judul-konfirmasi-selesai"
              className="font-bold text-base text-slate-900 dark:text-white"
            >
              Tandai {label} selesai?
            </h2>
            <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Dokumen berikutnya yang menunggu <strong>{label}</strong> akan terbuka.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pt-5 pb-6">
          <button
            type="button"
            onClick={onNo}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Tidak
          </button>
          <button
            type="button"
            onClick={onYes}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f2040] hover:bg-[#1e4080] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            <FaCheck size={12} /> Ya, Tandai Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
