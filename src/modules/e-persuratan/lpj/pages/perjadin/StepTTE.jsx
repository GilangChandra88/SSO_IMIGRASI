import React, { useState } from 'react';
import {
  FaBolt,
  FaCircleNotch,
  FaExternalLinkAlt,
  FaRegEye,
  FaRegFileAlt,
  FaRegSave,
  FaUpload,
} from 'react-icons/fa';
import { PEJABAT_KATEGORI, SCAN_MAX_BYTES } from '../../data/masterLpj';
import { deleteLpjFile, pesanGagalUnggah, uploadLpjFile } from '../../services/lpjStorage';
import Field from '../../ui/Field';
import { BTN, FORM, NAVY, STATUS, T } from '@/utils/uiTokens';

/**
 * Fase 1 lanjutan — TTE Srikandi: unggah scan Surat Perintah ber-TTE (opsional) dan
 * nomor surat resmi. Setelah itu Surat Perintah selesai dan nomor SPD mengikuti nomor SP.
 */
export default function StepTTE({ ctx }) {
  const {
    pack,
    pf,
    setPf,
    errors,
    setErrors,
    persist,
    goStep,
    backToDetail,
    showToast,
    user,
    dok,
  } = ctx;
  const sp = pf.sp;
  const nomor = sp.nomorTTE || '';
  const filled = nomor.trim().length > 0;
  const [uploading, setUploading] = useState(false);

  const pejabatLabel = sp.pejabat
    ? `${sp.pejabat.nama} (${PEJABAT_KATEGORI.find((k) => k.id === sp.pejabat.kategori)?.label || 'Pejabat'})`
    : '—';

  async function handleFile(file) {
    if (!file) return;
    const okTipe = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!okTipe) {
      setErrors({ ...errors, scan: 'File harus berupa gambar (JPG/PNG) atau PDF.' });
      return;
    }
    if (file.size > SCAN_MAX_BYTES) {
      setErrors({ ...errors, scan: 'Ukuran file maksimal 5 MB.' });
      return;
    }
    setErrors({ ...errors, scan: undefined });
    setUploading(true);
    try {
      const meta = await uploadLpjFile(pack.id, 'scan-sp', file, user.uid);
      const lama = ctx.pfRef.current.sp.scan;
      await persist((prev) => ({ ...prev, sp: { ...prev.sp, scan: meta } }), {
        quiet: true,
        teks: 'mengunggah scan Surat Perintah ber-TTE',
      });
      if (lama?.path) deleteLpjFile(lama.path).catch(() => {});
      showToast('Scan Surat Perintah terunggah.');
    } catch (err) {
      console.error('upload scan error:', err);
      setErrors({ ...errors, scan: pesanGagalUnggah(err) });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!filled) {
      setErrors({ nomorTTE: 'Wajib diisi' });
      return;
    }
    const nomorResmi = nomor.trim();
    const ok = await persist(
      (prev) => ({
        ...prev,
        sp: { ...prev.sp, nomorSurat: nomorResmi },
        spd: { ...prev.spd, nomorSPD: prev.spd.nomorSPD || nomorResmi },
        selesai: { ...prev.selesai, sp: true },
      }),
      { quiet: true, teks: `menyelesaikan Surat Perintah nomor ${nomorResmi}` },
    );
    if (ok) {
      showToast('Surat Perintah ditandai selesai.');
      goStep('spd');
    }
  }

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
              <li>Masukkan nomor surat resmi yang diterbitkan di bawah ini</li>
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
          Pilih file hasil scan (gambar/PDF, maks. 5 MB) dan masukkan nomor surat resmi
        </p>
        <Field label="File Scan Surat Perintah (ber-TTE)" htmlFor="scan-sp" err={errors.scan}>
          <input
            id="scan-sp"
            type="file"
            accept="image/*,application/pdf"
            disabled={uploading}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
            className={`${FORM.input} ${FORM.borderOk} !h-auto py-1.5 file:mr-3 file:px-3 file:py-1 file:rounded-md file:border-0 file:text-[12.5px] file:font-semibold file:bg-[#F3F5F8] dark:file:bg-[#16243A] file:text-[#55627A] dark:file:text-[#A7B6CB]`}
          />
          {uploading && (
            <p className={`mt-1 text-[11.5px] flex items-center gap-1.5 ${T.inkMuted}`}>
              <FaCircleNotch className="animate-spin" size={11} /> Mengunggah…
            </p>
          )}
          {sp.scan && !uploading && (
            <p className={`mt-1 text-[11.5px] flex items-center gap-1.5 ${STATUS.goodInk}`}>
              File terpilih: {sp.scan.name}
              <a
                href={sp.scan.url}
                target="_blank"
                rel="noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                lihat <FaExternalLinkAlt size={9} />
              </a>
            </p>
          )}
        </Field>
        <Field label="Nomor Surat Resmi" htmlFor="nomor-tte" required err={errors.nomorTTE}>
          <input
            id="nomor-tte"
            value={nomor}
            placeholder="Contoh: W26.IMI.2.GR.02.01-140"
            onChange={(e) => {
              const v = e.target.value;
              setPf((prev) => ({ ...prev, sp: { ...prev.sp, nomorTTE: v } }));
              setErrors({ ...errors, nomorTTE: undefined });
            }}
            className={`${FORM.input} ${errors.nomorTTE ? FORM.borderErr : FORM.borderOk}`}
          />
        </Field>
        <button
          type="button"
          disabled={!filled || uploading}
          onClick={handleSubmit}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13.5px] font-semibold border transition-colors ${
            filled
              ? `bg-[#eff6ff] text-[#1d4ed8] ${STATUS.infoBorder} hover:bg-[#dbeafe] dark:bg-[rgba(57,135,229,.18)] dark:text-[#7DB6F3]`
              : `cursor-not-allowed ${T.bgBorder} ${T.inkMuted} ${T.border}`
          }`}
        >
          <FaUpload size={13} /> Upload Surat Ber-TTE
        </button>
      </div>

      <div className="flex justify-end pb-6">
        <button type="button" className={BTN.warn} onClick={backToDetail}>
          <FaRegSave size={13} /> Simpan Draft
        </button>
      </div>
    </>
  );
}
