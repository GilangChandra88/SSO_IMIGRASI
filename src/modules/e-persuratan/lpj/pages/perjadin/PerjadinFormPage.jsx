/**
 * Form LPJ Perjadin (PerjadinFormPage purwarupa): Surat Perintah → TTE → SPD → Cetak SPD →
 * LPJ & SPBy → Laporan Kegiatan. Sub-langkah dibaca dari URL (?isi=) dan dibatasi status kunci
 * tiap bagian berkas live, sehingga aman saat halaman di-refresh.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { usePegawaiRingkas } from '@/context/usePegawaiRingkas';
import { useMakTahun } from '../../../useMakTahun';
import { useFormBerkas } from '../../hooks/useFormBerkas';
import { useDokumenLpj } from '../../hooks/useDokumenLpj';
import { lpjIdLabel, terkunci } from '../../utils/lpjLogic';
import { InfoSimpan, PeringatanSimpan } from '../../components/StatusSimpan';
import ConfirmPopup from '../../ui/ConfirmPopup';
import LinkBack from '../../ui/LinkBack';
import { useToast } from '@/utils/toastStore';
import { useMekarDariTombol } from '@/components/animasi';
import { ANIM } from '@/utils/animasi';
import { gulirKeAtas, gulirKeGalat } from '../../../gulirPintar';
import { LAYOUT, STATUS, T } from '@/utils/uiTokens';
import StepSuratPerintah from './StepSuratPerintah';
import StepTTE from './StepTTE';
import StepSPD from './StepSPD';
import StepCetakSPD from './StepCetakSPD';
import StepLPJ from './StepLPJ';
import StepLaporan from './StepLaporan';

/** Sub-langkah yang sedang harus dikerjakan (null bila semua fase sudah final). */
function langkahAktif(pack) {
  return ['sp', 'tte', 'spd', 'lpj', 'laporan'].find((b) => !terkunci(pack, b)) || null;
}

function bolehMasuk(pack, step) {
  const k = (b) => terkunci(pack, b);
  switch (step) {
    case 'sp':
      return !k('sp');
    case 'tte':
      return k('sp') && !k('tte');
    case 'spd':
      return k('tte') && !k('spd');
    case 'cetak-spd':
      return k('spd');
    case 'lpj':
      return k('spd') && !k('lpj');
    case 'laporan':
      return k('lpj') && !k('laporan');
    default:
      return false;
  }
}

// Urutan langkah form: menentukan arah geser saat berpindah langkah (maju → dari kanan)
const URUTAN_LANGKAH = ['sp', 'tte', 'spd', 'cetak-spd', 'lpj', 'laporan'];

// Judul kepala form mengikuti langkah yang sedang ditampilkan (fase = nomor fase di Detail LPJ)
const JUDUL_LANGKAH = {
  sp: { judul: 'Surat Perintah', fase: 1 },
  tte: { judul: 'Upload SP ber-TTE & Nomor Surat', fase: 2 },
  spd: { judul: 'SPD (Surat Perjalanan Dinas)', fase: 2 },
  'cetak-spd': { judul: 'Cetak SPD', fase: 2 },
  lpj: { judul: 'LPJ & SPBy', fase: 3 },
  laporan: { judul: 'Laporan Kegiatan', fase: 4 },
};

// Keterangan SPBy mengikuti uraian kegiatan yang diisi saat Buat LPJ (bila belum diisi)
const isiAwal = (pack, pf) => ({
  ...pf,
  lpj: { ...pf.lpj, keterangan: pf.lpj.keterangan || pack.uraian || '' },
});

export default function PerjadinFormPage({ pack, isi, user }) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const showToast = useToast();
  const { pegawai, memuat: loadingPeg } = usePegawaiRingkas();
  const mak = useMakTahun(pack.tahunAnggaran);
  const topRef = useRef(null);
  // Form selalu dibuka dari atas (Detail sebelumnya bisa tergulir jauh), sebelum kartu mekar
  useLayoutEffect(() => gulirKeAtas(topRef.current), []);
  // Dibuka dari "Buat Sekarang/Edit/Upload": kartu form mekar dari tombol itu
  const kartuRef = useMekarDariTombol();

  const form = useFormBerkas(pack, user, { showToast, isiAwal });
  const { pf, pfRef, otomatis, lastSaved, packView } = form;

  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const detailUrl = `/e-persuratan/lpj/${pack.id}`;
  const dok = useDokumenLpj({ pack: packView, showToast });

  // Langkah yang ditahan selama fase diselesaikan lalu kembali ke Detail: tanpa ini, begitu fase
  // terkunci (sebelum simpan selesai) form melompat sebentar ke langkah berikutnya.
  const [langkahDitahan, setLangkahDitahan] = useState(null);
  const step = langkahDitahan || (bolehMasuk(pack, isi) ? isi : langkahAktif(pack));

  /**
   * Simpan isian (lihat useFormBerkas.persist). `tahanLangkah`: tetap tampilkan langkah ini
   * (pemanggil akan pindah ke Detail setelahnya).
   */
  async function persist(nextOrFn, opts = {}) {
    if (opts.tahanLangkah) setLangkahDitahan(step);
    const hasil = await form.persist(nextOrFn, opts);
    if (!hasil && opts.tahanLangkah) setLangkahDitahan(null);
    return hasil;
  }

  function goStep(s) {
    setErrors({});
    setSearchParams({ isi: s }, { replace: true });
    topRef.current?.scrollIntoView({ block: 'start' });
  }

  /** Kembali ke Detail LPJ; Detail menggulir ke kartu fase langkah ini (hasil berkasnya). */
  const keDetail = () => navigate(detailUrl, { state: { sorot: step } });

  async function backToDetail() {
    await persist(pfRef.current, { quiet: true });
    keDetail();
  }

  /** Tampilkan galat validasi; bila ada, gulir ke isian merah pertama. @returns true bila ada galat */
  function tandaiGalat(e) {
    setErrors(e);
    const ada = Object.values(e).some(Boolean);
    if (ada) gulirKeGalat(kartuRef.current);
    return ada;
  }

  const askConfirm = (c) => setConfirm(c);
  const closeConfirm = () => {
    setConfirm(null);
    setConfirmBusy(false);
  };

  // Arah geser antar langkah (state "langkah sebelumnya" diperbarui saat render)
  const [langkahLalu, setLangkahLalu] = useState(step);
  const [arah, setArah] = useState('maju');
  if (step && step !== langkahLalu) {
    setArah(
      URUTAN_LANGKAH.indexOf(step) >= URUTAN_LANGKAH.indexOf(langkahLalu) ? 'maju' : 'mundur',
    );
    setLangkahLalu(step);
  }

  if (!step) return <Navigate to={detailUrl} replace />;

  const ctx = {
    pack,
    packView,
    pf,
    setPf: form.ubahPf,
    pfRef,
    errors,
    setErrors,
    tandaiGalat,
    persist,
    goStep,
    keDetail,
    backToDetail,
    askConfirm,
    closeConfirm,
    showToast,
    pegawai,
    loadingPeg,
    mak,
    dok,
    user,
    navigate,
    detailUrl,
  };

  return (
    <div className={`min-h-full ${T.ground}`}>
      <div className={LAYOUT.page}>
        <section ref={kartuRef} className={`${LAYOUT.card} overflow-x-clip`}>
          <PeringatanSimpan status={otomatis.status} onCoba={otomatis.simpanSekarang} />
          <div ref={topRef} className="scroll-mt-4">
            <LinkBack onClick={backToDetail}>Kembali ke Detail Dokumen</LinkBack>
          </div>
          <div className={LAYOUT.head}>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 key={step} className={`${LAYOUT.h1} ${ANIM.muncul}`}>
                  {JUDUL_LANGKAH[step].judul}
                </h1>
                <p className={LAYOUT.sub}>
                  Fase {JUDUL_LANGKAH[step].fase} dari 4 · LPJ Perjalanan Dinas · {lpjIdLabel(pack)}
                </p>
              </div>
              {step === 'cetak-spd' ? (
                <span
                  className={`px-2.5 py-[3px] rounded-[20px] text-[11px] font-bold tracking-[.04em] border ${STATUS.doneBg} ${STATUS.doneInk} ${STATUS.doneBorder}`}
                >
                  SIAP CETAK
                </span>
              ) : (
                <span className="px-2.5 py-[3px] rounded-[20px] text-[11px] font-bold tracking-[.04em] bg-[#fef9c3] text-[#92400e] border border-[#fde68a]">
                  DRAFT
                </span>
              )}
            </div>
          </div>
          <InfoSimpan status={otomatis.status} lastSaved={lastSaved} />

          <div key={step} className={arah === 'maju' ? ANIM.geserKiri : ANIM.geserKanan}>
            {step === 'sp' && <StepSuratPerintah ctx={ctx} />}
            {step === 'tte' && <StepTTE ctx={ctx} />}
            {step === 'spd' && <StepSPD ctx={ctx} />}
            {step === 'cetak-spd' && <StepCetakSPD ctx={ctx} />}
            {step === 'lpj' && <StepLPJ ctx={ctx} />}
            {step === 'laporan' && <StepLaporan ctx={ctx} />}
          </div>
        </section>
      </div>

      {confirm && (
        <ConfirmPopup
          docLabel={confirm.label}
          busy={confirmBusy}
          onYes={async () => {
            setConfirmBusy(true);
            await confirm.onYes();
          }}
          onNo={async () => {
            setConfirmBusy(true);
            await confirm.onNo();
          }}
        />
      )}
      {dok.modal}
    </div>
  );
}
