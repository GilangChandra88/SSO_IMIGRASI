import React from 'react';
import { FaPen } from 'react-icons/fa';
import { STATUS } from '@/utils/uiTokens';

/**
 * Keterangan di atas form fase yang sudah selesai tetapi sedang diedit (boleh sampai berkas
 * diarsip). Isian di sini tidak disimpan otomatis; perubahan baru masuk lewat "Simpan Perubahan".
 * `catatan` (opsional) menambah keterangan khusus fase (mis. realisasi MAK ikut diperbarui).
 */
export default function BannerEditFase({ label, catatan }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 mb-3.5 text-[13px] leading-relaxed ${STATUS.warnBg} ${STATUS.warnBorder} ${STATUS.warnInk}`}
    >
      <FaPen size={12} className="shrink-0 mt-1" />
      <div>
        <strong>{label}</strong> sudah selesai dan sedang diedit. Perubahan baru tersimpan setelah
        Anda menekan <strong>Simpan Perubahan</strong>; dokumen yang sudah dicetak perlu dicetak
        ulang. Berkas bisa diedit sampai diarsip Keuangan.
        {catatan && <> {catatan}</>}
      </div>
    </div>
  );
}
