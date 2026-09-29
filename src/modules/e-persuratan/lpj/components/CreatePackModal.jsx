import React, { useState } from 'react';
import { createLPJPack } from '../hooks/useLPJ';
import { FaTimes, FaCheck, FaCircleNotch, FaArrowRight } from 'react-icons/fa';

const JENIS = [
  {
    type: 'perjadin',
    nama: 'LPJ Perjadin',
    desc: 'Laporan Pertanggungjawaban Perjalanan Dinas — Surat Perintah, SPD, & SPBy',
    badge: '4 Fase',
  },
  {
    type: 'non-perjadin',
    nama: 'LPJ Non-Perjadin',
    desc: 'Laporan Pertanggungjawaban Kegiatan Non-Perjalanan Dinas',
    badge: '2 Fase',
  },
];

const URAIAN_MAX = 220;

/**
 * Jendela "Buat Berkas Baru": pilih jenis LPJ dan isi uraian kegiatan.
 * Uraian disimpan sebagai judul paket; pegawai dipilih nanti di form Surat Perintah.
 */
export default function CreatePackModal({ onClose, onSuccess, currentUser }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState('');
  const [uraian, setUraian] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    const judul = uraian.trim().slice(0, URAIAN_MAX);
    const e = {};
    if (!type) e.type = 'Pilih salah satu jenis LPJ terlebih dahulu.';
    if (!judul) e.uraian = 'Uraian kegiatan wajib diisi.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setIsSubmitting(true);
    try {
      const displayName = currentUser?.displayName || currentUser?.email || 'Pengguna';
      const packId = await createLPJPack({
        type,
        judul,
        perihal: '',
        tujuan: '',
        tanggal_mulai: '',
        tanggal_selesai: '',
        mak: '',
        pegawai_list: [],
        created_by: { uid: currentUser?.uid, nama: displayName },
      });
      onSuccess(packId);
    } catch (err) {
      console.error('createLPJPack error:', err);
      setErrors({ submit: 'Gagal membuat berkas. Periksa koneksi lalu coba lagi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-buat-berkas"
        className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2
              id="judul-buat-berkas"
              className="text-[17px] font-extrabold text-slate-900 dark:text-white"
            >
              Buat Berkas Baru
            </h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">
              Pilih jenis LPJ dan isi uraian kegiatan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <FaTimes size={16} />
          </button>
        </div>
        <div className="h-px bg-slate-200 dark:bg-slate-800 my-3.5" />

        <div className="overflow-y-auto custom-scrollbar">
          {/* Pilihan jenis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-6">
            {JENIS.map((j) => {
              const active = type === j.type;
              return (
                <button
                  key={j.type}
                  type="button"
                  onClick={() => {
                    setType(j.type);
                    setErrors((e) => ({ ...e, type: undefined }));
                  }}
                  className={`relative text-left px-3.5 py-4 rounded-xl transition-colors ${
                    active
                      ? 'border-2 border-[#0f2040] dark:border-blue-500 bg-slate-50 dark:bg-slate-800/60'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#162032] hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {active && (
                    <span className="absolute top-2.5 right-2.5 text-[#0f2040] dark:text-blue-400">
                      <FaCheck size={13} />
                    </span>
                  )}
                  <div className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                    {j.nama}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-snug mb-2">
                    {j.desc}
                  </div>
                  <span className="inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30">
                    {j.badge}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.type && (
            <p className="px-6 pt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {errors.type}
            </p>
          )}

          {/* Uraian kegiatan */}
          <div className="px-6 pt-4">
            <label
              htmlFor="uraian-kegiatan"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Uraian Kegiatan <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="uraian-kegiatan"
              rows={3}
              maxLength={URAIAN_MAX}
              placeholder="Contoh: Koordinasi teknis keimigrasian ke Direktorat Jenderal Imigrasi Jakarta"
              value={uraian}
              onChange={(e) => {
                setUraian(e.target.value);
                setErrors((prev) => ({ ...prev, uraian: undefined }));
              }}
              className={`w-full rounded-lg border bg-white dark:bg-[#162032] text-slate-900 dark:text-white px-3 py-2.5 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y ${
                errors.uraian ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
              }`}
            />
            <div className="flex justify-between gap-2.5 mt-1.5 text-[11.5px] text-slate-400">
              <p>
                Uraian singkat ini akan tampil sebagai judul pada Detail Dokumen dan Daftar LPJ.
              </p>
              <p className="whitespace-nowrap">
                {uraian.length}/{URAIAN_MAX}
              </p>
            </div>
            {errors.uraian && (
              <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errors.uraian}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pt-4 pb-6">
          {errors.submit && (
            <p role="alert" className="mb-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
              {errors.submit}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0f2040] hover:bg-[#1e4080] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <FaCircleNotch className="animate-spin" /> Membuat...
                </>
              ) : (
                <>
                  Lanjutkan <FaArrowRight size={12} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
