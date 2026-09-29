import React from 'react';
import { generateSuratItems, PACK_TYPES } from '../../data/packTemplates';
import { formatTanggal } from '../../utils/formatTanggal';

const Baris = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:gap-4 py-3">
    <dt className="sm:w-44 shrink-0 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 sm:mb-0 sm:pt-0.5">
      {label}
    </dt>
    <dd className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-words min-w-0">
      {children}
    </dd>
  </div>
);

/** Langkah 4 — Ringkasan sebelum paket dibuat */
export default function StepRingkasan({ form }) {
  const jumlahDokumen = generateSuratItems(form.type, form.pegawai).length;

  return (
    <div className="space-y-6">
      <dl className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 sm:px-6">
        <Baris label="Jenis">{PACK_TYPES[form.type]?.label || form.type}</Baris>
        <Baris label="Judul">{form.judul.trim()}</Baris>
        <Baris label={`Pegawai (${form.pegawai.length})`}>
          <ol className="list-decimal list-inside space-y-0.5">
            {form.pegawai.map((p) => (
              <li key={p.id}>{p.nama}</li>
            ))}
          </ol>
        </Baris>
        <Baris label="Maksud">{form.maksud.trim()}</Baris>
        <Baris label="Rute">
          {form.berangkat_dari.trim()} → {form.tempat_tujuan.trim()}
        </Baris>
        <Baris label="Tanggal">
          {formatTanggal(form.tanggal_berangkat)} s.d. {formatTanggal(form.tanggal_kembali)}
        </Baris>
      </dl>

      <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-sm text-indigo-800 dark:text-indigo-300">
        <span className="font-black text-lg leading-none">{jumlahDokumen}</span>
        <span>
          dokumen akan dibuat, termasuk {form.pegawai.length} SPD dan {form.pegawai.length} SPTJM
          (satu per pegawai). Surat Perintah dan SPD langsung terisi dari data di atas.
        </span>
      </div>
    </div>
  );
}
