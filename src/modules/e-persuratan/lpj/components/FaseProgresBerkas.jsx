import React, { useState } from 'react';
import { FaCheck, FaClock, FaLock, FaRegEye, FaRegFileAlt } from 'react-icons/fa';
import { keDate } from '@/utils/nilai';
import { useKeuanganBerkas } from '../hooks/useBerkas';
import { useDokumenLpj } from '../hooks/useDokumenLpj';
import { lpjIdOf } from '../utils/lpjLogic';
import { formatTanggal, formatTanggalDate } from '../utils/formatTanggal';
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

/**
 * Tahap pengolahan berkas oleh Keuangan dari dokumen `keuangan/status` (urut, sama dengan tab
 * Berkas Verifikasi). `namaAkun(uid)` memberi nama pegawai dari pegawai ringkas.
 */
function tahapProgres(k, namaAkun) {
  const v = k?.verifikasi || {};
  const sakti = k?.sakti || {};
  const transfer = k?.transfer || {};
  const arsip = k?.arsip || {};
  const oleh = namaAkun(v.selesaiOleh);
  return [
    {
      key: 'verif',
      kode: 'VER',
      label: 'Verifikasi',
      selesai: !!v.selesai,
      ket: v.selesai
        ? `Terverifikasi ${formatTanggalDate(keDate(v.selesaiPada))}${oleh ? ` oleh ${oleh}` : ''}`
        : 'Menunggu verifikasi dokumen oleh Keuangan',
    },
    {
      key: 'sakti',
      kode: 'SAKTI',
      label: 'Upload SAKTI',
      selesai: !!sakti.selesai,
      ket: sakti.selesai ? 'Nomor kwitansi SAKTI' : 'Menunggu upload SAKTI',
      kodeSakti: sakti.nomorKwitansi,
    },
    {
      key: 'transfer',
      kode: 'TRF',
      label: 'Bukti Transfer Bendahara',
      selesai: !!transfer.selesai,
      ket: transfer.selesai
        ? `Ditransfer ${formatTanggal(transfer.tanggal)}`
        : 'Menunggu bukti transfer dari Bendahara',
      berkas: transfer.berkas,
    },
    {
      key: 'arsip',
      kode: 'ARS',
      label: 'Arsip',
      selesai: !!arsip.selesai,
      ket: arsip.selesai
        ? `Berkas asli diarsipkan ${formatTanggal(arsip.tanggalArsip)}`
        : 'Menunggu berkas asli dipindai & diarsipkan',
      berkas: arsip.berkas,
    },
  ];
}

/**
 * Fase terakhir Detail LPJ (Fase 5 Perjadin / Fase 3 Non-Perjadin): progres pengolahan berkas oleh
 * Keuangan — Verifikasi (Lembar Verifikasi), Upload SAKTI (nomor kwitansi), Bukti Transfer
 * Bendahara, dan Arsip (scan berkas asli). Hanya-baca; tidak ikut dihitung di progres dokumen.
 * Terbuka setelah nomor LPJ terbit (saat berkas masuk Berkas Verifikasi).
 * @param {{ pack, num, pegawai: object[], showToast }} props  pegawai = pegawai ringkas
 */
export default function FaseProgresBerkas({ pack, num, pegawai, showToast }) {
  const terbuka = !!lpjIdOf(pack);
  const { keuangan } = useKeuanganBerkas(terbuka ? pack.id : null);
  const namaAkun = (uid) => (uid && pegawai.find((p) => p.authUid === uid)?.nama) || '';
  const tahap = tahapProgres(keuangan, namaAkun);
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
            Keuangan
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
        <IsiProgres pack={pack} keuangan={keuangan} tahap={tahap} showToast={showToast} />
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

/** Baris tiap tahap. Lembar Verifikasi memakai POK & pejabat yang dibekukan saat verifikasi. */
function IsiProgres({ pack, keuangan, tahap, showToast }) {
  const dok = useDokumenLpj({
    pack,
    showToast,
    mak: { pok: keuangan?.pokBeku || {} },
    pejabat: keuangan?.pejabatBeku || {},
    verifikasi: keuangan?.verifikasi || {},
  });
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
        } else if (t.selesai && t.berkas?.path) {
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
