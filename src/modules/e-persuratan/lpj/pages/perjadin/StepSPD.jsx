import React from 'react';
import { FaCheck, FaRegSave } from 'react-icons/fa';
import { ALAT_ANGKUT, SEKSI_LIST } from '../../data/masterLpj';
import MakDropdowns from '../../components/MakDropdowns';
import PegawaiCards from '../../components/PegawaiCards';
import Field from '../../ui/Field';
import { BTN, FORM, STATUS, T } from '@/utils/uiTokens';

function validateSpd(spd) {
  const e = {};
  if (!String(spd.nomorSPD || '').trim()) e.nomorSPD = 'Wajib diisi';
  if (!spd.tanggal) e.tanggal = 'Wajib diisi';
  if (!spd.seksi) e.seksi = 'Wajib dipilih';
  if (!spd.tujuan.trim()) e.tujuan = 'Wajib diisi';
  if (!spd.berangkat) e.berangkat = 'Wajib diisi';
  if (!spd.kembali) e.kembali = 'Wajib diisi';
  else if (spd.berangkat && spd.kembali < spd.berangkat)
    e.kembali = 'Tidak boleh sebelum tanggal berangkat';
  if (!spd.mak?.akunNodeId) e.mak = 'Pilih sampai level Akun';
  return e;
}

/** Fase 2 — Surat Perjalanan Dinas (satu form untuk semua pelaksana). */
export default function StepSPD({ ctx }) {
  const {
    pf,
    setPf,
    errors,
    setErrors,
    persist,
    goStep,
    askConfirm,
    closeConfirm,
    showToast,
    mak,
  } = ctx;
  const spd = pf.spd;
  const setSpd = (patch) => setPf((prev) => ({ ...prev, spd: { ...prev.spd, ...patch } }));
  const border = (key) => (errors[key] ? FORM.borderErr : FORM.borderOk);

  function handleSelesai() {
    const e = validateSpd(spd);
    setErrors(e);
    if (Object.keys(e).length) return;
    askConfirm({
      label: 'SPD (Surat Perjalanan Dinas)',
      onYes: async () => {
        const ok = await persist((prev) => ({ ...prev, spd: { ...prev.spd, locked: true } }), {
          quiet: true,
          teks: 'menandai SPD selesai',
        });
        closeConfirm();
        if (ok) {
          showToast('SPD ditandai selesai.');
          goStep('cetak-spd');
        }
      },
      onNo: async () => {
        await persist(ctx.pfRef.current, { quiet: true });
        closeConfirm();
        ctx.navigate(ctx.detailUrl);
      },
    });
  }

  return (
    <>
      <div
        className={`flex items-center gap-2 px-3.5 py-2.5 mb-3.5 rounded-[10px] border text-[13px] ${STATUS.goodBg} ${STATUS.goodBorder} ${STATUS.goodInk}`}
      >
        <FaCheck size={12} className="shrink-0" />
        <span>
          Nomor Surat <strong>{pf.sp.nomorSurat}</strong> otomatis mengikuti Surat Perintah yang
          sudah selesai
        </span>
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Surat Perjalanan Dinas (SPD)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
          <Field label="Lembar Ke" htmlFor="spd-lembar">
            <input
              id="spd-lembar"
              type="number"
              min={1}
              value={spd.lembarKe}
              onChange={(e) => setSpd({ lembarKe: e.target.value })}
              className={`${FORM.input} ${FORM.borderOk}`}
            />
          </Field>
          <Field label="Kode No" htmlFor="spd-kode">
            <input
              id="spd-kode"
              value={spd.kodeNo}
              placeholder="Otomatis / manual"
              onChange={(e) => setSpd({ kodeNo: e.target.value })}
              className={`${FORM.input} ${FORM.borderOk}`}
            />
          </Field>
          <Field
            label="Nomor SPD"
            required
            hint="Otomatis mengikuti nomor Surat Perintah"
            err={errors.nomorSPD}
          >
            <div
              className={`flex items-center gap-2 h-[38px] px-3 rounded-lg border ${STATUS.goodBg} border-[#86efac] dark:border-[rgba(79,211,155,.4)]`}
            >
              <FaCheck size={12} className={STATUS.goodInk} />
              <span
                className={`flex-1 min-w-0 truncate text-[13.5px] font-semibold ${STATUS.goodInk}`}
              >
                {spd.nomorSPD || '—'}
              </span>
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-[10px] bg-[#dcfce7] text-[#16a34a] whitespace-nowrap">
                Otomatis
              </span>
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Tanggal SPD" htmlFor="spd-tanggal" required err={errors.tanggal}>
            <input
              id="spd-tanggal"
              type="date"
              value={spd.tanggal}
              onChange={(e) => setSpd({ tanggal: e.target.value })}
              className={`${FORM.input} ${border('tanggal')}`}
            />
          </Field>
          <Field label="Seksi / Bagian" htmlFor="spd-seksi" required err={errors.seksi}>
            <select
              id="spd-seksi"
              value={spd.seksi}
              onChange={(e) => setSpd({ seksi: e.target.value })}
              className={`${FORM.select} ${border('seksi')}`}
            >
              <option value="">— Pilih Seksi —</option>
              {SEKSI_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-1`}>Pelaksana</h3>
        <p className={`text-xs mb-3 ${T.ink2}`}>Data otomatis dari Surat Perintah · read-only</p>
        <PegawaiCards list={pf.sp.kepada} />
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Detail Perjalanan</h3>
        <Field label="Maksud" htmlFor="spd-maksud">
          <textarea
            id="spd-maksud"
            value={spd.maksud}
            placeholder="Koordinasi teknis keimigrasian ke..."
            onChange={(e) => setSpd({ maksud: e.target.value })}
            className={`${FORM.textarea} ${FORM.borderOk}`}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Alat Angkut" htmlFor="spd-alat">
            <select
              id="spd-alat"
              value={spd.alatAngkut}
              onChange={(e) => setSpd({ alatAngkut: e.target.value })}
              className={`${FORM.select} ${FORM.borderOk}`}
            >
              <option value="">— Pilih —</option>
              {ALAT_ANGKUT.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Tujuan" htmlFor="spd-tujuan" required err={errors.tujuan}>
            <input
              id="spd-tujuan"
              value={spd.tujuan}
              placeholder="Jakarta"
              onChange={(e) => setSpd({ tujuan: e.target.value })}
              className={`${FORM.input} ${border('tujuan')}`}
            />
          </Field>
          <Field label="Tanggal Berangkat" htmlFor="spd-berangkat" required err={errors.berangkat}>
            <input
              id="spd-berangkat"
              type="date"
              value={spd.berangkat}
              onChange={(e) => setSpd({ berangkat: e.target.value })}
              className={`${FORM.input} ${border('berangkat')}`}
            />
          </Field>
          <Field label="Tanggal Kembali" htmlFor="spd-kembali" required err={errors.kembali}>
            <input
              id="spd-kembali"
              type="date"
              min={spd.berangkat || undefined}
              value={spd.kembali}
              onChange={(e) => setSpd({ kembali: e.target.value })}
              className={`${FORM.input} ${border('kembali')}`}
            />
          </Field>
        </div>
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-1`}>Kode Program / MAK</h3>
        <p className={`text-xs mb-4 ${T.ink2}`}>
          Pilih bertahap — setiap pilihan menyesuaikan opsi berikutnya
        </p>
        <MakDropdowns
          nodes={mak.nodes}
          byId={mak.byId}
          loading={mak.loading}
          mak={spd.mak}
          onChange={(m) => setSpd({ mak: { ...spd.mak, ...m } })}
        />
        {errors.mak && <p className={FORM.err}>{errors.mak}</p>}
      </div>

      <div className="flex flex-wrap justify-end items-center gap-2 pb-6">
        <button type="button" className={BTN.warn} onClick={() => persist(ctx.pfRef.current)}>
          <FaRegSave size={13} /> Simpan Draft
        </button>
        <button type="button" className={BTN.primaryDark} onClick={handleSelesai}>
          <FaCheck size={12} /> Selesai
        </button>
      </div>
    </>
  );
}
