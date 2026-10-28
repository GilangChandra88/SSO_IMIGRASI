/**
 * Form LPJ Non-Perjadin (NonPerjadinFormPage purwarupa): Fase 1 SPBy & Rincian Bayar
 * (?isi=np, bagian `spby`), Fase 2 Lampiran (?isi=lampiran, bagian `lampiran`). Langkah dibatasi
 * status kunci bagian berkas live.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { usePegawaiRingkas } from '@/context/usePegawaiRingkas';
import { useMakTahun } from '../../../useMakTahun';
import { useFormBerkas } from '../../hooks/useFormBerkas';
import { InfoSimpan, PeringatanSimpan } from '../../components/StatusSimpan';
import { useDokumenLpj } from '../../hooks/useDokumenLpj';
import { terkunci } from '../../utils/lpjLogic';
import ConfirmPopup from '../../ui/ConfirmPopup';
import LinkBack from '../../ui/LinkBack';
import { useToast } from '@/utils/toastStore';
import { useMekarDariTombol } from '@/components/animasi';
import { ANIM } from '@/utils/animasi';
import { gulirKeAtas, gulirKeGalat } from '../../../gulirPintar';
import { LAYOUT, T } from '@/utils/uiTokens';
import StepRincianBayar from './StepRincianBayar';
import StepLampiran from './StepLampiran';

function langkahAktif(pack) {
  if (!terkunci(pack, 'spby')) return 'np';
  if (!terkunci(pack, 'lampiran')) return 'lampiran';
  return null;
}

function bolehMasuk(pack, step) {
  if (step === 'np') return !terkunci(pack, 'spby');
  if (step === 'lampiran') return terkunci(pack, 'spby') && !terkunci(pack, 'lampiran');
  return false;
}

// Urutan langkah form: menentukan arah geser saat berpindah langkah (maju → dari kanan)
const URUTAN_LANGKAH = ['np', 'lampiran'];

export default function NonPerjadinFormPage({ pack, isi, user }) {
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

  const form = useFormBerkas(pack, user, { showToast });
  const { pf, pfRef, otomatis, lastSaved, packView } = form;

  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const detailUrl = `/e-persuratan/lpj/${pack.id}`;
  const dok = useDokumenLpj({ pack: packView, showToast });
  // Langkah ditahan selama fase diselesaikan lalu kembali ke Detail (tanpa melompat sesaat)
  const [langkahDitahan, setLangkahDitahan] = useState(null);
  const step = langkahDitahan || (bolehMasuk(pack, isi) ? isi : langkahAktif(pack));

  /** Simpan isian (lihat useFormBerkas.persist); `tahanLangkah` seperti form Perjadin. */
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
