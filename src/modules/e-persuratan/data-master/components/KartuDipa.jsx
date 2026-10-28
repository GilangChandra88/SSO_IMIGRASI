import React, { useState } from 'react';
import { FaFileInvoice, FaPen } from 'react-icons/fa';
import { PANJANG } from '@/utils/batas';
import { ADMIN, FONT, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { formatTanggalID } from '../utils/makUtils';

/**
 * DIPA tahun anggaran terpilih (`mak_dipa/{tahun}`): nomor & tanggal, satu sumber teks DIPA untuk
 * form surat/LPJ dan template PDF. Baru bisa diisi setelah node Tahun dibuat.
 */
export default function KartuDipa({ tahun, tahunNodeId, dipa, bolehUbah, onSimpan }) {
  const [isian, setIsian] = useState(null); // null = tidak sedang menyunting
  const [sibuk, setSibuk] = useState(false);
  const galat = isian && (!isian.nomor.trim() || !isian.tanggal);

  const simpan = async (e) => {
    e.preventDefault();
    if (galat) return;
    setSibuk(true);
    try {
      await onSimpan({ nomor: isian.nomor, tanggal: isian.tanggal, tahunNodeId });
      setIsian(null);
    } catch {
      // pesan galat sudah ditampilkan halaman; isian dibiarkan supaya bisa dicoba lagi
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 mb-4 sm:flex-row sm:items-center ${T.border} ${T.surface2}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <FaFileInvoice size={14} className={`shrink-0 ${T.inkMuted}`} />
        {isian ? (
          <span className={`text-[12.5px] font-bold ${T.ink}`}>DIPA {tahun}</span>
        ) : !tahunNodeId ? (
          <span className={`text-[12.5px] ${T.inkMuted}`}>
            DIPA {tahun}: buat node Tahun {tahun} dulu untuk mengisi nomor DIPA.
          </span>
        ) : dipa ? (
          <span className={`text-[12.5px] min-w-0 ${T.ink2}`}>
            <strong className={T.ink}>DIPA {tahun}</strong> · Nomor{' '}
            <span className={FONT.mono}>{dipa.nomor}</span> · tanggal{' '}
            {formatTanggalID(dipa.tanggal)}
          </span>
        ) : (
          <span className={`text-[12.5px] ${T.inkMuted}`}>
            DIPA {tahun} belum diisi. Nomor & tanggal DIPA dipakai di Surat Perintah dan Nota Dinas.
          </span>
        )}
      </div>
      {isian ? (
        <form
          className={`flex flex-col gap-2 sm:flex-row sm:items-center ${ANIM.muncul}`}
          onSubmit={simpan}
        >
          <input
            className={`${ADMIN.control} ${FONT.mono} sm:w-[260px]`}
            aria-label="Nomor DIPA"
            placeholder="Nomor DIPA"
            maxLength={PANJANG.nomorDipa}
            value={isian.nomor}
            onChange={(e) => setIsian({ ...isian, nomor: e.target.value })}
            autoFocus
          />
          <input
            type="date"
            className={ADMIN.control}
            aria-label="Tanggal DIPA"
            value={isian.tanggal}
            onChange={(e) => setIsian({ ...isian, tanggal: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={ADMIN.btnGhost}
              onClick={() => setIsian(null)}
              disabled={sibuk}
            >
              Batal
            </button>
            <button type="submit" className={ADMIN.btnSolid} disabled={sibuk || galat}>
              {sibuk ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      ) : (
        bolehUbah &&
        tahunNodeId && (
          <button
            type="button"
            className={`${ADMIN.btnGhost} inline-flex items-center gap-1.5 self-start sm:self-auto`}
            onClick={() => setIsian({ nomor: dipa?.nomor || '', tanggal: dipa?.tanggal || '' })}
          >
            <FaPen size={10} />
            {dipa ? 'Ubah DIPA' : 'Isi DIPA'}
          </button>
        )
      )}
    </div>
  );
}
