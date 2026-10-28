import React, { useState } from 'react';
import {
  FaBolt,
  FaCircleNotch,
  FaExternalLinkAlt,
  FaRegEye,
  FaRegFileAlt,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import { bukaBerkas, formatUkuran, pesanGagalUnggah } from '@/utils/berkasStorage';
import { tanggalIso } from '@/utils/nilai';
import { PEJABAT_KATEGORI } from '../../data/masterLpj';
import { ATURAN_UNGGAHAN, pesanUnggah, simpanScanTte } from '../../services/unggahan';
import Field from '../../ui/Field';
import { BTN, FORM, NAVY, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import ProgressBar from '../../ui/ProgressBar';

/**
 * Fase 2 (awal) — TTE Srikandi: unggah scan Surat Perintah ber-TTE, lalu isi nomor & tanggal
 * surat resmi (semuanya wajib), lalu "Lanjut Buat SPD": bagian TTE dikunci, form SPD terbuka dan
 * nomor SPD mengikuti nomor SP. Scan langsung tersimpan begitu terunggah (unggahan.js).
 */
export default function StepTTE({ ctx }) {
  const {
    pack,
    pf,
    setPf,
    errors,
    setErrors,
    tandaiGalat,
    persist,
    goStep,
    backToDetail,
    showToast,
    user,
    dok,
  } = ctx;
  const tte = pf.tte;
  const sp = pf.sp;
  const scan = pack.tte?.scan || null; // berkas unggahan selalu dari berkas live
  const nomor = tte.nomorSurat || '';
  const [uploading, setUploading] = useState(false);
  const [persen, setPersen] = useState(0); // progres unggah scan (0–100)
  // Tanggal surat resmi bawaan hari ini (bisa disesuaikan dengan tanggal di Srikandi)
  const tanggal = tte.tanggalSurat || tanggalIso();

  const pejabatLabel = sp.pejabat
    ? `${sp.pejabat.nama} (${PEJABAT_KATEGORI.find((k) => k.id === sp.pejabat.kategori)?.label || 'Pejabat'})`
    : '—';

  const setTte = (patch) => setPf((prev) => ({ ...prev, tte: { ...prev.tte, ...patch } }));

  async function handleFile(file) {
    if (!file) return;
    setErrors({ ...errors, scan: undefined });
    setPersen(0);
    setUploading(true);
    try {
      await simpanScanTte(pack, file, user.uid, { onProgress: setPersen });
      showToast('Scan Surat Perintah terunggah.');
    } catch (err) {
      setErrors({ ...errors, scan: pesanUnggah(err) });
    } finally {
      setUploading(false);
    }
  }

  /** "Lanjut Buat SPD": scan, nomor, dan tanggal wajib; lalu TTE dikunci dan form SPD terbuka. */
  async function handleSubmit() {
    if (uploading) return;
    const e = {};
    if (!scan) e.scan = 'Unggah scan Surat Perintah ber-TTE';
    if (!nomor.trim()) e.nomorSurat = 'Wajib diisi';
    if (!tanggal) e.tanggalSurat = 'Wajib diisi';
    if (tandaiGalat(e)) return;
    const nomorResmi = nomor.trim();
    const ok = await persist(
      (prev) => ({
        ...prev,
        tte: { ...prev.tte, nomorSurat: nomorResmi, tanggalSurat: tanggal },
        // Nomor SPD mengikuti nomor SP; tersimpan begitu bagian SPD terbuka (setelah TTE terkunci)
        spd: { ...prev.spd, nomorSpd: prev.spd.nomorSpd || nomorResmi },
      }),
      { quiet: true, kunci: 'tte' },
    );
    if (ok) {
      showToast('Surat Perintah ditandai selesai.');
      goStep('spd');
    }
  }

  const lihatScan = () =>
    bukaBerkas(scan).catch((err) =>
      showToast(pesanGagalUnggah(err, 'Berkas gagal dibuka.'), 'error'),
    );

  return (
    <>
      <div className={`rounded-xl border p-[22px] mb-3.5 ${STATUS.warnBg} ${STATUS.warnBorder}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-[10px] bg-[rgba(237,161,0,.2)] flex items-center justify-center text-[#A97C24] dark:text-[#F0B93E]">
            <FaBolt size={18} />
          </div>
          <div className={STATUS.warnInk}>
            <div className="font-bold text-sm mb-1">
              Upload Scan &amp; Nomor Surat (TTE Srikandi)
            </div>
            <div className="text-[13px] leading-relaxed">
              Draft Surat Perintah telah dibuat. Langkah selanjutnya:
            </div>
            <ol className="mt-2 pl-[18px] text-[12.5px] leading-[1.8] list-decimal">
              <li>
                Proses TTE (tanda tangan elektronik) di Aplikasi Srikandi oleh pejabat{' '}
                <strong>{pejabatLabel}</strong>
              </li>
              <li>Upload hasil scan Surat Perintah yang sudah ber-TTE</li>
              <li>Masukkan nomor & tanggal surat resmi yang diterbitkan di bawah ini</li>
            </ol>
          </div>
        </div>
      </div>

      <div className={FORM.card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white ${NAVY.bg}`}
            >
              <FaRegFileAlt size={14} />
            </div>
            <div>
              <div className={`text-[13.5px] font-semibold ${T.ink}`}>Surat Perintah</div>
              <div className={`text-[11.5px] mt-px ${T.inkMuted}`}>
                Sudah final — tidak dapat diubah lagi
              </div>
            </div>
          </div>
          <button
            type="button"
            className={BTN.sm}
            onClick={() => dok.lihat({ key: 'sp', label: 'Surat Perintah' })}
          >
            <FaRegEye size={12} /> Lihat
          </button>
        </div>
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-1`}>Upload Scan &amp; Nomor Surat dari TTE</h3>
        <p className={`text-xs mb-4 ${T.ink2}`}>
          Pilih file hasil scan (gambar diperkecil otomatis, PDF maks.{' '}
          {formatUkuran(ATURAN_UNGGAHAN.tte.maksByte)}) dan masukkan nomor & tanggal surat resmi
        </p>
        <Field
          label="File Scan Surat Perintah (ber-TTE)"
          htmlFor="scan-sp"
          required
          err={errors.scan}
        >
          <input
            id="scan-sp"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            disabled={uploading}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
            className={`${FORM.input} ${FORM.borderOk} !h-auto py-1.5 file:mr-3 file:px-3 file:py-1 file:rounded-md file:border-0 file:text-[12.5px] file:font-semibold file:bg-[#F3F5F8] dark:file:bg-[#16243A] file:text-[#55627A] dark:file:text-[#A7B6CB]`}
          />
          {uploading && (
            <div className={`mt-2 ${ANIM.muncul}`}>
              <div
                className={`flex items-center justify-between gap-2 mb-1 text-[11.5px] ${T.inkMuted}`}
              >
                <span className="flex items-center gap-1.5">
                  <FaCircleNotch className="animate-spin" size={11} />
                  {persen < 100 ? 'Mengunggah…' : 'Menyimpan…'}
                </span>
                <span className="font-semibold tabular-nums">{Math.round(persen)}%</span>
              </div>
              <ProgressBar
                value={persen}
                className="h-1.5 rounded-full bg-[#E0E5EC] dark:bg-[#233450] [&::-webkit-progress-bar]:bg-[#E0E5EC] dark:[&::-webkit-progress-bar]:bg-[#233450] [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-[#2A78D6] [&::-moz-progress-bar]:bg-[#2A78D6] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]"
              />
            </div>
          )}
          {scan && !uploading && (
            <p className={`mt-1 text-[11.5px] flex items-center gap-1.5 ${STATUS.doneInk}`}>
              File terpilih: {scan.nama}
              <button
                type="button"
                onClick={lihatScan}
                className="underline inline-flex items-center gap-1"
              >
                lihat <FaExternalLinkAlt size={9} />
              </button>
            </p>
          )}
        </Field>
        <Field label="Nomor Surat Resmi" htmlFor="nomor-tte" required err={errors.nomorSurat}>
          <input
            id="nomor-tte"
            value={nomor}
            placeholder="Contoh: W26.IMI.2.GR.02.01-140"
            onChange={(e) => {
              setTte({ nomorSurat: e.target.value });
              setErrors({ ...errors, nomorSurat: undefined });
            }}
            className={`${FORM.input} ${errors.nomorSurat ? FORM.borderErr : FORM.borderOk}`}
          />
        </Field>
        <Field
          label="Tanggal Surat Resmi"
          htmlFor="tanggal-tte"
          required
          hint="Sesuai tanggal surat di Srikandi"
          err={errors.tanggalSurat}
        >
          <input
            id="tanggal-tte"
            type="date"
            value={tanggal}
            onChange={(e) => {
              setTte({ tanggalSurat: e.target.value });
              setErrors({ ...errors, tanggalSurat: undefined });
            }}
            className={`${FORM.input} ${errors.tanggalSurat ? FORM.borderErr : FORM.borderOk}`}
          />
        </Field>
      </div>

      <div className="flex flex-wrap justify-end items-center gap-2 pb-6">
        <button type="button" className={BTN.ghost} onClick={backToDetail}>
          <FaChevronLeft size={12} /> Kembali ke Detail LPJ
        </button>
        <button
          type="button"
          className={BTN.primaryDark}
          disabled={uploading}
          onClick={handleSubmit}
        >
          Lanjut Buat SPD <FaChevronRight size={12} />
        </button>
      </div>
    </>
  );
}
