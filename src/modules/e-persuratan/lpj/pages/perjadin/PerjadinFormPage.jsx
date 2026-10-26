/**
 * Form LPJ Perjadin (PerjadinFormPage purwarupa): Surat Perintah → TTE → SPD → Cetak SPD →
 * LPJ & SPBy → Laporan Kegiatan. Sub-langkah dibaca dari URL (?isi=) dan dibatasi status
 * kunci tiap fase, sehingga aman saat halaman di-refresh.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { saveLPJ } from '../../hooks/useLPJ';
import { useSimpanOtomatis } from '../../hooks/useSimpanOtomatis';
import { usePegawaiList } from '../../hooks/usePegawaiList';
import { useMakTree } from '../../hooks/useMakTree';
import { useDokumenLpj } from '../../hooks/useDokumenLpj';
import { lpjIdLabel } from '../../utils/lpjLogic';
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

const salin = (obj) => JSON.parse(JSON.stringify(obj ?? null));

const ambilBagian = (pack) => ({
  sp: salin(pack.sp),
  spd: salin(pack.spd),
  // Keterangan SPBy mengikuti uraian kegiatan yang diisi saat Buat LPJ (bila belum diisi)
  lpj: { ...salin(pack.lpj), keterangan: pack.lpj?.keterangan || pack.uraian || '' },
  lap: salin(pack.lap),
  selesai: salin(pack.selesai) || { sp: false, lpjDocs: {}, laporan: false },
});

/** Sub-langkah yang sedang harus dikerjakan (null bila semua fase sudah final). */
function langkahAktif(pf) {
  if (!pf.sp.locked) return 'sp';
  if (!pf.selesai.sp) return 'tte';
  if (!pf.spd.locked) return 'spd';
  if (!pf.lpj.locked) return 'lpj';
  if (!pf.lap.locked) return 'laporan';
  return null;
}

function bolehMasuk(pf, step) {
  switch (step) {
    case 'sp':
      return !pf.sp.locked;
    case 'tte':
      return pf.sp.locked && !pf.selesai.sp;
    case 'spd':
      return pf.selesai.sp && !pf.spd.locked;
    case 'cetak-spd':
      return pf.spd.locked;
    case 'lpj':
      return pf.spd.locked && !pf.lpj.locked;
    case 'laporan':
      return pf.lpj.locked && !pf.lap.locked;
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

export default function PerjadinFormPage({ pack, isi, user }) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const showToast = useToast();
  const { pegawai, loading: loadingPeg } = usePegawaiList();
  const mak = useMakTree();
  const topRef = useRef(null);
  // Form selalu dibuka dari atas (Detail sebelumnya bisa tergulir jauh), sebelum kartu mekar
  useLayoutEffect(() => gulirKeAtas(topRef.current), []);
  // Dibuka dari "Buat Sekarang/Edit/Upload": kartu form mekar dari tombol itu
  const kartuRef = useMekarDariTombol();

  const [pf, setPfState] = useState(() => ambilBagian(pack));
  const pfRef = useRef(pf);
  const setPf = (fn) =>
    setPfState((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      pfRef.current = next;
      return next;
    });

  // Setiap perubahan isian (lewat ctx.setPf) disimpan otomatis setelah pengguna berhenti mengetik
  const otomatis = useSimpanOtomatis(() => persist(pfRef.current, { quiet: true, auto: true }));
  const ubahPf = (fn) => {
    setPf(fn);
    otomatis.tandai();
  };

  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [lastSaved, setLastSaved] = useState(() => pack.updated_at?.toDate?.() || null);

  const detailUrl = `/e-persuratan/lpj/${pack.id}`;
  const packView = { ...pack, ...pf };
  const dok = useDokumenLpj({ pack: packView, pegawai, showToast });

  // Langkah yang ditahan selama fase diselesaikan lalu kembali ke Detail: tanpa ini, begitu fase
  // terkunci (sebelum simpan selesai) form melompat sebentar ke langkah berikutnya.
  const [langkahDitahan, setLangkahDitahan] = useState(null);
  const step = langkahDitahan || (bolehMasuk(pf, isi) ? isi : langkahAktif(pf));

  /**
   * Simpan bagian berkas ke Firestore. Terima objek pf baru atau fungsi (pf lama → pf baru).
   * `tahanLangkah`: tetap tampilkan langkah ini (pemanggil akan pindah ke Detail setelahnya).
   */
  async function persist(nextOrFn, opts = {}) {
    const prev = pfRef.current;
    const next = typeof nextOrFn === 'function' ? nextOrFn(prev) : nextOrFn;
    if (opts.tahanLangkah) setLangkahDitahan(step);
    setPf(next);
    if (!opts.auto) otomatis.bersih(); // simpanan ini sudah memuat isian terbaru
    try {
      await saveLPJ(
        pack,
        {
          sp: next.sp,
          spd: next.spd,
          lpj: next.lpj,
          lap: next.lap,
          selesai: next.selesai,
          ...(opts.extra || {}),
        },
        { teks: opts.teks, uid: user.uid, nama: user.nama },
        { beriNomor: !!opts.beriNomor },
      );
      setLastSaved(new Date());
      if (!opts.quiet) showToast('Draft tersimpan.');
      return true;
    } catch (err) {
      console.error('saveLPJ error:', err);
      // SPBy selesai + nomor LPJ: kembalikan isian agar fase tidak tampak terkunci tanpa nomor
      if (opts.beriNomor) setPf(prev);
      if (opts.tahanLangkah) setLangkahDitahan(null);
      // Simpan otomatis yang gagal cukup ditandai lewat peringatan di atas form
      if (!opts.auto) showToast('Gagal menyimpan. Periksa koneksi lalu coba lagi.', 'error');
      return false;
    }
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
    setPf: ubahPf,
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
