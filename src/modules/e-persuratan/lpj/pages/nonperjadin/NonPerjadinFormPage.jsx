/**
 * Form LPJ Non-Perjadin (NonPerjadinFormPage purwarupa): Fase 1 SPBy & Rincian Bayar
 * (?isi=np), Fase 2 Lampiran (?isi=lampiran). Langkah dibatasi status kunci tiap fase.
 */

import React, { useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { saveLPJ } from '../../hooks/useLPJ';
import { usePegawaiList } from '../../hooks/usePegawaiList';
import { useMakTree } from '../../hooks/useMakTree';
import { useDokumenLpj } from '../../hooks/useDokumenLpj';
import ConfirmPopup from '../../ui/ConfirmPopup';
import LinkBack from '../../ui/LinkBack';
import { useToast } from '@/utils/toastStore';
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

export default function NonPerjadinFormPage({ pack, isi, user }) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const showToast = useToast();
  const { pegawai, loading: loadingPeg } = usePegawaiList();
  const mak = useMakTree();
  const topRef = useRef(null);

  const [pf, setPfState] = useState(() => ({ np: salin(pack.np) }));
  const pfRef = useRef(pf);
  const setPf = (fn) =>
    setPfState((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      pfRef.current = next;
      return next;
    });

  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const detailUrl = `/e-persuratan/lpj/${pack.id}`;
  const packView = { ...pack, ...pf };
  const dok = useDokumenLpj({ pack: packView, pegawai, showToast });
  const step = bolehMasuk(pf, isi) ? isi : langkahAktif(pf);

  async function persist(nextOrFn, opts = {}) {
    const next = typeof nextOrFn === 'function' ? nextOrFn(pfRef.current) : nextOrFn;
    setPf(next);
    try {
      await saveLPJ(
        pack,
        { np: next.np, ...(opts.extra || {}) },
        { teks: opts.teks, uid: user.uid, nama: user.nama },
      );
      if (!opts.quiet) showToast('Draft tersimpan.');
      return true;
    } catch (err) {
      console.error('saveLPJ error:', err);
      showToast('Gagal menyimpan. Periksa koneksi lalu coba lagi.', 'error');
      return false;
    }
  }

  function goStep(s) {
    setErrors({});
    setSearchParams({ isi: s }, { replace: true });
    topRef.current?.scrollIntoView({ block: 'start' });
  }

  async function backToDetail() {
    await persist(pfRef.current, { quiet: true });
    navigate(detailUrl);
  }

  const closeConfirm = () => {
    setConfirm(null);
    setConfirmBusy(false);
  };

  if (!step) return <Navigate to={detailUrl} replace />;

  const ctx = {
    pack,
    packView,
    pf,
    setPf,
    pfRef,
    errors,
    setErrors,
    persist,
    goStep,
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
        <section className={LAYOUT.card}>
          <div ref={topRef} className="scroll-mt-4">
            <LinkBack onClick={backToDetail}>Kembali</LinkBack>
          </div>
          {step === 'np' && <StepRincianBayar ctx={ctx} />}
          {step === 'lampiran' && <StepLampiran ctx={ctx} />}
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
