import React from 'react';
import { FaCheck, FaLock, FaPlus, FaRegSave, FaRegTrashAlt } from 'react-icons/fa';
import { DIPA_DASAR_TEXT, UNTUK_FIXED } from '../../data/masterLpj';
import { hariIniISO } from '../../utils/formatTanggal';
import PegawaiPicker from '../../components/PegawaiPicker';
import PejabatPicker from '../../components/PejabatPicker';
import PegawaiCards from '../../components/PegawaiCards';
import Field from '../../ui/Field';
import { BTN, FORM, NAVY, T } from '../../ui/tokens';

function validateSp(sp) {
  const e = {};
  if (!sp.menimbang.trim()) e.menimbang = 'Wajib diisi';
  if (!sp.untuk[0] || !sp.untuk[0].trim()) e.untuk = 'Wajib diisi';
  if (sp.kepada.length === 0) e.kepada = 'Pilih minimal satu pegawai';
  if (!sp.pejabat) e.pejabat = 'Pilih pejabat';
  return e;
}

/** Fase 1 — isian Surat Perintah. */
export default function StepSuratPerintah({ ctx }) {
  const { pf, setPf, errors, setErrors, persist, goStep, askConfirm, closeConfirm } = ctx;
  const sp = pf.sp;
  const setSp = (patch) => setPf((prev) => ({ ...prev, sp: { ...prev.sp, ...patch } }));

  function handleSelesai() {
    const e = validateSp(sp);
    setErrors(e);
    if (Object.keys(e).length) return;
    askConfirm({
      label: 'Surat Perintah',
      onYes: async () => {
        const ok = await persist(
          (prev) => ({
            ...prev,
            sp: { ...prev.sp, locked: true, tanggal: prev.sp.tanggal || hariIniISO() },
          }),
          { quiet: true, teks: 'menandai Surat Perintah selesai' },
        );
        closeConfirm();
        if (ok) goStep('tte');
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
      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Surat Perintah</h3>
        <Field label="Menimbang" htmlFor="sp-menimbang" required err={errors.menimbang}>
          <textarea
            id="sp-menimbang"
            value={sp.menimbang}
            placeholder="bahwa dalam rangka..."
            onChange={(e) => setSp({ menimbang: e.target.value })}
            className={`${FORM.textarea} ${errors.menimbang ? FORM.borderErr : FORM.borderOk}`}
          />
        </Field>
        <Field
          label="Dasar"
          hint="Tambah baris sesuai kebutuhan — DIPA otomatis menjadi dasar terakhir"
        >
          <DasarList items={sp.dasar} onChange={(dasar) => setSp({ dasar })} />
        </Field>
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Pegawai yang Ditugaskan</h3>
        <Field
          label="Kepada"
          required
          hint="Bisa memilih lebih dari satu pegawai"
          err={errors.kepada}
        >
          <PegawaiPicker
            pegawai={ctx.pegawai}
            loading={ctx.loadingPeg}
            selected={sp.kepada}
            onChange={(kepada) => setSp({ kepada })}
            err={!!errors.kepada}
          />
        </Field>
        {sp.kepada.length > 0 && (
          <div className={`border-t pt-3.5 ${T.border}`}>
            <PegawaiCards list={sp.kepada} />
          </div>
        )}
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Isi Perintah &amp; Penandatangan</h3>
        <Field
          label="Untuk"
          required
          hint="Poin 2—4 sudah baku, cukup isi poin 1"
          err={errors.untuk}
        >
          <UntukList items={sp.untuk} err={errors.untuk} onChange={(untuk) => setSp({ untuk })} />
        </Field>
        <Field label="Pejabat Penandatangan (KPA/PLt/PLh)" required err={errors.pejabat}>
          <PejabatPicker
            pegawai={ctx.pegawai}
            value={sp.pejabat}
            onChange={(pejabat) => setSp({ pejabat })}
            err={!!errors.pejabat}
          />
        </Field>
      </div>

      <div className="flex flex-wrap justify-end items-center gap-2 mb-3.5">
        <button type="button" className={BTN.ghost} onClick={() => persist(ctx.pfRef.current)}>
          <FaRegSave size={13} /> Simpan
        </button>
        <button type="button" className={BTN.primaryDark} onClick={handleSelesai}>
          <FaCheck size={12} /> Selesai
        </button>
      </div>
    </>
  );
}

/** Baris dinamis "Dasar" + DIPA baku yang terkunci di akhir. */
function DasarList({ items, onChange }) {
  const nomor = `w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${T.surface2}`;
  return (
    <div>
      {items.map((val, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <div className={`${nomor} ${T.ink2}`}>{i + 1}</div>
          <input
            aria-label={`Dasar ${i + 1}`}
            value={val}
            placeholder="Dasar hukum / peraturan"
            onChange={(e) => {
              const next = items.slice();
              next[i] = e.target.value;
              onChange(next);
            }}
            className={`${FORM.input} ${FORM.borderOk} flex-1`}
          />
          <button
            type="button"
            aria-label={`Hapus dasar ${i + 1}`}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className={`${BTN.trash} !h-8`}
          >
            <FaRegTrashAlt size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mb-2">
        <div className={`${nomor} ${T.inkMuted}`}>{items.length + 1}</div>
        <div
          className={`flex-1 min-w-0 flex items-center h-[38px] px-3 rounded-lg border text-[13px] ${T.surface2} ${T.border} ${T.ink2}`}
        >
          <span className="truncate" title={DIPA_DASAR_TEXT}>
            {DIPA_DASAR_TEXT}
          </span>
        </div>
        <div
          className={`w-8 h-8 shrink-0 flex items-center justify-center ${T.inkMuted}`}
          title="Dasar baku, otomatis ditambahkan"
        >
          <FaLock size={13} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className={`inline-flex items-center gap-1.5 mt-1 px-3.5 py-1.5 rounded-lg border border-dashed text-[12.5px] ${T.surface2} ${T.borderStrong} ${T.ink2}`}
      >
        <FaPlus size={11} /> Tambah Baris
      </button>
    </div>
  );
}

/** Poin 1 "Untuk" diisi pengguna, poin 2–4 baku. */
function UntukList({ items, err, onChange }) {
  const first = items[0] || '';
  return (
    <div>
      <div className="flex items-start gap-2 mb-2">
        <div
          className={`w-6 h-6 mt-0.5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${NAVY.bg}`}
        >
          1
        </div>
        <input
          aria-label="Untuk poin 1"
          value={first}
          placeholder="Maksud / tujuan tugas"
          onChange={(e) => onChange([e.target.value])}
          className={`${FORM.input} ${err ? FORM.borderErr : FORM.borderOk} flex-1`}
        />
      </div>
      {UNTUK_FIXED.map((txt, i) => (
        <div key={i} className="flex items-start gap-2 mb-2">
          <div
            className={`w-6 h-6 mt-0.5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${T.surface2} ${T.inkMuted}`}
          >
            {i + 2}
          </div>
          <div
            className={`flex-1 min-h-[38px] px-3 py-2 rounded-lg border text-[13px] leading-normal ${T.surface2} ${T.border} ${T.ink2}`}
          >
            {txt}
          </div>
        </div>
      ))}
    </div>
  );
}
