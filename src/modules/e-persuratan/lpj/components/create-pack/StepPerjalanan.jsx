import React from 'react';
import { INPUT_CLASS, LABEL_CLASS } from './formStyles';

const Wajib = () => <span className="text-rose-500">*</span>;

/** Langkah 3 — Detail perjalanan (mengisi awal Surat Perintah & SPD) */
export default function StepPerjalanan({ form, onChange }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
        Isian ini dipakai untuk mengisi awal Surat Perintah dan SPD. Semuanya masih bisa diubah di
        form masing-masing.
      </p>

      <div>
        <label htmlFor="maksud" className={LABEL_CLASS}>
          Maksud Perjalanan Dinas <Wajib />
        </label>
        <textarea
          id="maksud"
          rows={3}
          placeholder="Contoh: Menghadiri rapat koordinasi keimigrasian"
          value={form.maksud}
          onChange={(e) => onChange('maksud', e.target.value)}
          className={`${INPUT_CLASS} resize-y`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="berangkat-dari" className={LABEL_CLASS}>
            Berangkat Dari <Wajib />
          </label>
          <input
            id="berangkat-dari"
            type="text"
            value={form.berangkat_dari}
            onChange={(e) => onChange('berangkat_dari', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="tempat-tujuan" className={LABEL_CLASS}>
            Tempat Tujuan <Wajib />
          </label>
          <input
            id="tempat-tujuan"
            type="text"
            placeholder="Contoh: Denpasar"
            value={form.tempat_tujuan}
            onChange={(e) => onChange('tempat_tujuan', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tanggal-berangkat" className={LABEL_CLASS}>
            Tanggal Berangkat <Wajib />
          </label>
          <input
            id="tanggal-berangkat"
            type="date"
            value={form.tanggal_berangkat}
            onChange={(e) => onChange('tanggal_berangkat', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="tanggal-kembali" className={LABEL_CLASS}>
            Tanggal Kembali <Wajib />
          </label>
          <input
            id="tanggal-kembali"
            type="date"
            min={form.tanggal_berangkat || undefined}
            value={form.tanggal_kembali}
            onChange={(e) => onChange('tanggal_kembali', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  );
}
