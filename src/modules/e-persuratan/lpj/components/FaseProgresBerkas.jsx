import React, { useState } from 'react';
import { FaCheck, FaClock, FaLock, FaRegEye, FaRegFileAlt } from 'react-icons/fa';
import { useMakBerkas } from '../hooks/useVerifikasi';
import { useDokumenLpj } from '../hooks/useDokumenLpj';
import { lpjIdOf } from '../utils/lpjLogic';
import { verifOf } from '../utils/verifikasiLogic';
import { formatTanggal } from '../utils/formatTanggal';
import ProgressBar from '../ui/ProgressBar';
import LampiranViewer from './LampiranViewer';
import { BTN, FONT, NAVY, STAGE_CLS, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

const KODE = `text-[10px] font-extrabold tracking-[.02em] px-[7px] py-[3px] rounded-md border shrink-0 whitespace-nowrap ${T.surface2} ${T.ink2} ${T.border}`;
const LEMBAR = {
  key: 'lembar_verifikasi',
  docKey: 'lembar_verifikasi',
  label: 'Lembar Verifikasi',
};

/** Tahap pengolahan berkas oleh Admin/Keuangan (urut, sama dengan tab Berkas Verifikasi). */
function tahapProgres(pack) {
  const verif = verifOf(pack);
  const bayar = pack.pembayaran || {};
  const arsip = pack.arsip || {};
  return [
    {
      key: 'verif',
      kode: 'VER',
      label: 'Verifikasi',
      selesai: !!verif.selesai,
      ket: verif.selesai
        ? `Terverifikasi ${formatTanggal(verif.selesaiAt)}${verif.oleh?.nama ? ` oleh ${verif.oleh.nama}` : ''}`
        : 'Menunggu verifikasi dokumen oleh Admin',
    },
    {
      key: 'sakti',
      kode: 'SAKTI',
      label: 'Upload SAKTI',
      selesai: !!arsip.kwitansi,
      ket: arsip.kwitansi ? 'Kode upload SAKTI' : 'Menunggu kode upload SAKTI',
      kodeSakti: arsip.kwitansi,
    },
    {
      key: 'transfer',
      kode: 'TRF',
      label: 'Bukti Transfer Bendahara',
      selesai: !!bayar.buktiTransfer,
      ket: bayar.buktiTransfer
        ? `Ditransfer ${formatTanggal(bayar.tanggalTransfer)}`
        : 'Menunggu bukti transfer dari Bendahara',
      berkas: bayar.berkas,
    },
    {
      key: 'arsip',
      kode: 'ARS',
      label: 'Arsip',
      selesai: !!arsip.scan,
      ket: arsip.scan
        ? `Berkas asli dipindai ${formatTanggal(arsip.scan.uploadedAt)}`
        : 'Menunggu berkas asli dipindai & diarsipkan',
      berkas: arsip.scan,
    },
  ];
}

/**
 * Fase terakhir Detail LPJ (Fase 5 Perjadin / Fase 3 Non-Perjadin): progres pengolahan berkas oleh
 * Admin/Keuangan — Verifikasi (Lembar Verifikasi), Upload SAKTI (kode), Bukti Transfer Bendahara,
 * dan Arsip (scan berkas asli lengkap). Hanya-baca; tidak ikut dihitung di progres dokumen.
 * Terbuka setelah nomor LPJ terbit (saat berkas masuk Berkas Verifikasi).
 */
export default function FaseProgresBerkas({ pack, num, pegawai, showToast }) {
  const terbuka = !!lpjIdOf(pack);
  const tahap = tahapProgres(pack);
  const nSelesai = terbuka ? tahap.filter((t) => t.selesai).length : 0;
  const semua = nSelesai === tahap.length;
  const pct = (nSelesai / tahap.length) * 100;

  return (
    <div
      data-bertahap
      data-fase={num}
      className={`relative ${T.surface} border rounded-[14px] mb-4 overflow-hidden ${
        terbuka ? STAGE_CLS[semua ? 'selesai' : 'proses'].border : `${T.border} opacity-80`
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4">
        <div
          key={semua ? 'selesai' : terbuka ? 'buka' : 'kunci'}
          className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center ${ANIM.meletup} ${
            terbuka ? `${NAVY.bg} text-white` : `${T.surface2} ${T.inkMuted}`
          }`}
        >
          {semua ? (
            <FaCheck size={15} />
          ) : terbuka ? (
            <span className="text-sm font-extrabold">{num}</span>
          ) : (
            <FaLock size={14} />
          )}
        </div>
        <div className="flex-1 min-w-[180px]">
          <h2 className={`${FONT.head} font-bold text-[14.5px] ${T.ink}`}>
            Fase {num} — Progres Berkas
          </h2>
          <p className={`text-xs mt-0.5 ${T.inkMuted}`}>
            {nSelesai}/{tahap.length} selesai · Verifikasi, SAKTI, Transfer &amp; Arsip oleh
            Admin/Keuangan
          </p>
        </div>
        {semua && (
          <span
            className={`text-[11px] font-bold px-2.5 py-[3px] rounded-[20px] border whitespace-nowrap shrink-0 ${ANIM.meletup} ${STAGE_CLS.selesai.badge}`}
          >
            Diarsipkan
          </span>
        )}
      </div>
      <ProgressBar
        value={pct}
        className={`h-1 ${T.surface2} [&::-webkit-progress-bar]:bg-[#F3F5F8] dark:[&::-webkit-progress-bar]:bg-[#16243A] [&::-webkit-progress-value]:bg-[#0f2040] [&::-moz-progress-bar]:bg-[#0f2040] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]`}
      />

      {terbuka ? (
        <IsiProgres pack={pack} tahap={tahap} pegawai={pegawai} showToast={showToast} />
      ) : (
        <div
          data-bertahap
          className={`flex items-center gap-2 px-4 sm:px-5 py-4 text-[12.5px] border-t ${T.border} ${T.inkMuted}`}
        >
          <FaLock size={13} className="shrink-0" />
          <span>Terbuka setelah nomor LPJ terbit (SPBy selesai) dan berkas masuk verifikasi.</span>
        </div>
      )}
    </div>
  );
}

/** Baris tiap tahap; dipisah agar data MAK Lembar Verifikasi baru dimuat saat fase terbuka. */
function IsiProgres({ pack, tahap, pegawai, showToast }) {
  const { mak } = useMakBerkas(pack);
  const dok = useDokumenLpj({ pack, pegawai, showToast, mak });
  const [lihat, setLihat] = useState(null); // { label, files }
  const aktif = tahap.findIndex((t) => !t.selesai); // tahap yang sedang berjalan

  return (
    <>
      {tahap.map((t, i) => {
        const status = t.selesai ? 'selesai' : i === aktif ? 'proses' : 'menunggu';
        let aksi = null;
        if (t.key === 'verif' && t.selesai) {
          aksi = (
            <button
              type="button"
              className={`${BTN.sm} shrink-0`}
              onClick={() => dok.lihat(LEMBAR)}
            >
              <FaRegEye size={12} /> Lembar Verifikasi
            </button>
          );
        } else if (t.key === 'sakti' && t.selesai) {
          aksi = (
            <span
              className={`${FONT.mono} text-[12.5px] font-bold px-2.5 py-1 rounded-md border shrink-0 ${STATUS.doneBg} ${STATUS.doneInk} ${STATUS.doneBorder}`}
            >
              {t.kodeSakti}
            </span>
          );
        } else if (t.selesai && t.berkas?.url) {
          aksi = (
            <button
              type="button"
              className={`${BTN.sm} shrink-0`}
              onClick={() => setLihat({ label: t.label, files: [t.berkas] })}
            >
              <FaRegEye size={12} /> {t.key === 'arsip' ? 'Lihat Berkas' : 'Lihat Bukti'}
            </button>
          );
        } else if (!t.selesai) {
          aksi = (
            <span className={`text-[11.5px] shrink-0 ${T.inkMuted}`}>
              {status === 'proses' ? 'Sedang diproses' : 'Menunggu'}
            </span>
          );
        }
        return (
          <div
            key={t.key}
            data-bertahap
            className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-[13px] border-t ${T.border}`}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <IkonTahap key={status} status={status} />
              <span className={KODE}>{t.kode}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] font-semibold ${T.ink}`}>{t.label}</div>
                <div className={`text-[11px] mt-px ${T.inkMuted}`}>{t.ket}</div>
              </div>
            </div>
            {aksi}
          </div>
        );
      })}
      {dok.modal}
      {lihat && (
        <LampiranViewer label={lihat.label} files={lihat.files} onClose={() => setLihat(null)} />
      )}
    </>
  );
}

function IkonTahap({ status }) {
  const cls =
    {
      selesai: STATUS.doneOn,
      proses: 'bg-[#2A78D6] border-[#2A78D6] text-white dark:bg-[#3987e5] dark:border-[#3987e5]',
    }[status] || `border-transparent ${T.surface2} ${T.inkMuted}`;
  const Ikon = { selesai: FaCheck, proses: FaClock }[status] || FaRegFileAlt;
  return (
    <div
      className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${ANIM.meletup} ${cls}`}
    >
      <Ikon size={13} />
    </div>
  );
}
