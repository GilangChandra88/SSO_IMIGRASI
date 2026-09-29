import React, { useState } from 'react';
import { createLPJPack } from '../hooks/useLPJ';
import { toPackPegawai } from '../utils/pegawaiLPJ';
import { FaTimes, FaCircleNotch, FaCheck, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import StepJenis from './create-pack/StepJenis';
import StepPegawai from './create-pack/StepPegawai';
import StepPerjalanan from './create-pack/StepPerjalanan';
import StepRingkasan from './create-pack/StepRingkasan';

// Langkah form Buat LPJ. Non-Perjalanan Dinas hanya memakai langkah pertama.
const STEPS = [
  {
    label: 'Jenis & Judul',
    title: 'Pilih Jenis Laporan',
    desc: 'Pilih jenis LPJ yang akan dibuat',
  },
  {
    label: 'Pegawai',
    title: 'Pegawai yang Ditugaskan',
    desc: 'Pilih pegawai yang melaksanakan perjalanan dinas',
  },
  {
    label: 'Perjalanan',
    title: 'Detail Perjalanan',
    desc: 'Maksud, tujuan, dan tanggal perjalanan dinas',
  },
  { label: 'Ringkasan', title: 'Ringkasan', desc: 'Periksa kembali sebelum laporan dibuat' },
];

const INITIAL_FORM = {
  type: '',
  judul: '',
  pegawai: [],
  maksud: '',
  tempat_tujuan: '',
  berangkat_dari: 'Singaraja',
  tanggal_berangkat: '',
  tanggal_kembali: '',
};

/** Pesan kesalahan untuk langkah tertentu, atau '' bila valid. */
function validateStep(step, form) {
  if (step === 0) {
    if (!form.type) return 'Pilih jenis LPJ terlebih dahulu.';
    if (!form.judul.trim()) return 'Judul LPJ wajib diisi.';
  }
  if (step === 1 && form.pegawai.length === 0) {
    return 'Pilih minimal satu pegawai yang ditugaskan.';
  }
  if (step === 2) {
    if (!form.maksud.trim()) return 'Maksud perjalanan dinas wajib diisi.';
    if (!form.berangkat_dari.trim()) return 'Tempat berangkat wajib diisi.';
    if (!form.tempat_tujuan.trim()) return 'Tempat tujuan wajib diisi.';
    if (!form.tanggal_berangkat) return 'Tanggal berangkat wajib diisi.';
    if (!form.tanggal_kembali) return 'Tanggal kembali wajib diisi.';
    if (form.tanggal_kembali < form.tanggal_berangkat) {
      return 'Tanggal kembali tidak boleh sebelum tanggal berangkat.';
    }
  }
  return '';
}

export default function CreatePackModal({ onClose, onSuccess, currentUser }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');

  const isPerjadin = form.type === 'perjadin';
  const lastStep = isPerjadin ? STEPS.length - 1 : 0;
  const current = STEPS[step];

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setError('');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const displayName = currentUser?.displayName || currentUser?.email || 'Pengguna';
      const packId = await createLPJPack({
        type: form.type,
        judul: form.judul.trim(),
        perihal: isPerjadin ? form.maksud.trim() : '',
        tujuan: isPerjadin ? form.tempat_tujuan.trim() : '',
        tanggal_mulai: isPerjadin ? form.tanggal_berangkat : '',
        tanggal_selesai: isPerjadin ? form.tanggal_kembali : '',
        berangkat_dari: isPerjadin ? form.berangkat_dari.trim() : '',
        mak: '',
        pegawai_list: isPerjadin ? form.pegawai.map(toPackPegawai) : [],
        created_by: { uid: currentUser?.uid, nama: displayName },
      });
      onSuccess(packId);
    } catch (err) {
      console.error('createLPJPack error:', err);
      setError('Gagal membuat laporan. Periksa koneksi lalu coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    const pesan = validateStep(step, form);
    if (pesan) {
      setError(pesan);
      return;
    }
    if (step < lastStep) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4">
      <div className="bg-white dark:bg-[#0f172a] sm:rounded-[24px] shadow-2xl w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-8 sm:pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {current.title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{current.desc}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <FaTimes size={14} />
            </button>
          </div>

          {/* Penanda langkah (khusus Perjalanan Dinas) */}
          {isPerjadin && (
            <ol className="flex items-center gap-2 mt-6">
              {STEPS.map((s, idx) => {
                const done = idx < step;
                const active = idx === step;
                return (
                  <li key={s.label} className="flex items-center gap-2 flex-1 last:flex-none">
                    <span
                      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        done
                          ? 'bg-indigo-600 text-white'
                          : active
                            ? 'bg-[#1e293b] dark:bg-indigo-500 text-white ring-4 ring-slate-100 dark:ring-indigo-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {done ? <FaCheck size={10} /> : idx + 1}
                    </span>
                    <span
                      className={`hidden sm:inline text-xs font-bold whitespace-nowrap ${
                        active ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                    {idx < STEPS.length - 1 && (
                      <span
                        className={`h-0.5 flex-1 rounded-full ${
                          done ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Konten */}
        <div className="flex-1 p-5 sm:p-8 overflow-y-auto custom-scrollbar">
          {step === 0 && <StepJenis form={form} onChange={set} />}
          {step === 1 && <StepPegawai form={form} onChange={set} />}
          {step === 2 && <StepPerjalanan form={form} onChange={set} />}
          {step === 3 && <StepRingkasan form={form} />}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 sm:px-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#162032] sm:rounded-b-[24px]">
          {error && (
            <p role="alert" className="mb-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          <div className="flex justify-between sm:justify-end gap-3">
            {step === 0 ? (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
              >
                <FaArrowLeft size={11} /> Kembali
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <FaCircleNotch className="animate-spin" /> Membuat...
                </>
              ) : step < lastStep ? (
                <>
                  Lanjut <FaArrowRight size={11} />
                </>
              ) : (
                <>Buat Laporan</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
