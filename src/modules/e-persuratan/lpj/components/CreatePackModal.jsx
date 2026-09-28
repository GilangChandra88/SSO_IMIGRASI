import React, { useState } from 'react';
import { createLPJPack } from '../hooks/useLPJ';
import { FaTimes, FaRegFileAlt, FaCircleNotch, FaMagic } from 'react-icons/fa';

export default function CreatePackModal({ onClose, onSuccess, currentUser }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: '',
    judul: '',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const displayName = currentUser?.displayName || currentUser?.email || 'Pengguna';
      const packId = await createLPJPack({
        type: form.type,
        judul: form.judul,
        perihal: '',
        tujuan: '',
        tanggal_mulai: '',
        tanggal_selesai: '',
        mak: '',
        pegawai_list: [],
        created_by: { uid: currentUser?.uid, nama: displayName },
      });
      // index.jsx passes onSuccess instead of onCreated
      onSuccess(packId);
    } catch (err) {
      console.error('createLPJPack error:', err);
      alert('Gagal membuat laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !!form.type && !!form.judul;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0f172a] rounded-[24px] shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Pilih Jenis Laporan
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pilih jenis LPJ yang akan dibuat
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Konten */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
          {/* Judul Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Judul LPJ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Masukkan judul laporan kegiatan..."
              value={form.judul}
              onChange={(e) => set('judul', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#162032] text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Grid Pilihan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opsi 1: Perjadin */}
            <button
              onClick={() => set('type', 'perjadin')}
              className={`text-left p-6 rounded-2xl border-2 transition-all ${
                form.type === 'perjadin'
                  ? 'border-[#1e293b] dark:border-indigo-500 bg-slate-50 dark:bg-[#1e293b]/50 shadow-md ring-4 ring-slate-100 dark:ring-indigo-500/20'
                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-[#1e293b] flex items-center justify-center text-white mb-6 shadow-sm">
                <FaMagic size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                LPJ Perjadin
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed min-h-[40px]">
                Laporan Pertanggungjawaban Perjalanan Dinas - Surat Perintah, SPD, & SPBy
              </p>
              <span className="inline-flex items-center px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-full">
                3 Dokumen Utama
              </span>
            </button>

            {/* Opsi 2: Non-Perjadin */}
            <button
              onClick={() => set('type', 'non-perjadin')}
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

        {/* Footer */}
        <div className="p-6 px-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-[#162032] rounded-b-[24px]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Batal
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="px-8 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <FaCircleNotch className="animate-spin" /> Membuat...
              </>
            ) : (
              <>Buat Laporan</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
