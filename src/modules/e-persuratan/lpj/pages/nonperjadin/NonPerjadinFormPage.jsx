/**
 * Form LPJ Non-Perjadin (NonPerjadinFormPage purwarupa): Fase 1 SPBy & Rincian Bayar
 * (?isi=np), Fase 2 Lampiran (?isi=lampiran). Langkah dibatasi status kunci tiap fase.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { saveLPJ } from '../../hooks/useLPJ';
import { useSimpanOtomatis } from '../../hooks/useSimpanOtomatis';
import { InfoSimpan, PeringatanSimpan } from '../../components/StatusSimpan';
import { usePegawaiList } from '../../hooks/usePegawaiList';
import { useMakTree } from '../../hooks/useMakTree';
import { useDokumenLpj } from '../../hooks/useDokumenLpj';
import ConfirmPopup from '../../ui/ConfirmPopup';
import LinkBack from '../../ui/LinkBack';
import { useToast } from '@/utils/toastStore';
import { useMekarDariTombol } from '@/components/animasi';
import { ANIM } from '@/utils/animasi';
import { gulirKeAtas, gulirKeGalat } from '../../../gulirPintar';
import { LAYOUT, T } from '@/utils/uiTokens';
import StepRincianBayar from './StepRincianBayar';
import StepLampiran from './StepLampiran';

const salin = (obj) => JSON.parse(JSON.stringify(obj ?? null));

function langkahAktif(pf) {
  if (!pf.np.formLocked) return 'np';
  if (!pf.np.lampiranLocked) return 'lampiran';
  return null;
}

function bolehMasuk(pf, step) {
  if (step === 'np') return !pf.np.formLocked;
  if (step === 'lampiran') return pf.np.formLocked && !pf.np.lampiranLocked;
  return false;
}

// Urutan langkah form: menentukan arah geser saat berpindah langkah (maju → dari kanan)
const URUTAN_LANGKAH = ['np', 'lampiran'];

export default function NonPerjadinFormPage({ pack, isi, user }) {
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

  const [pf, setPfState] = useState(() => ({ np: salin(pack.np) }));
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
  const step = bolehMasuk(pf, isi) ? isi : langkahAktif(pf);

  async function persist(nextOrFn, opts = {}) {
    const prev = pfRef.current;
    const next = typeof nextOrFn === 'function' ? nextOrFn(prev) : nextOrFn;
    setPf(next);
    if (!opts.auto) otomatis.bersih(); // simpanan ini sudah memuat isian terbaru
    try {
      await saveLPJ(
        pack,
        { np: next.np, ...(opts.extra || {}) },
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
    // Baris "Tersimpan otomatis" dipasang tiap langkah tepat di bawah judulnya
    infoSimpan: <InfoSimpan status={otomatis.status} lastSaved={lastSaved} />,
    errors,
    setErrors,
    tandaiGalat,
    persist,
    goStep,
    keDetail,
    backToDetail,
    askConfirm: setConfirm,
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
          <div key={step} className={arah === 'maju' ? ANIM.geserKiri : ANIM.geserKanan}>
            {step === 'np' && <StepRincianBayar ctx={ctx} />}
            {step === 'lampiran' && <StepLampiran ctx={ctx} />}
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
