import React from 'react';
import { FaCheck, FaChevronLeft, FaLock, FaPlus, FaRegTrashAlt } from 'react-icons/fa';
import { teksDipa, useDipa } from '../../../useDipa';
import { UNTUK_FIXED } from '../../data/masterLpj';
import PegawaiPicker from '../../components/PegawaiPicker';
import PejabatPicker from '../../components/PejabatPicker';
import PegawaiCards from '../../components/PegawaiCards';
import Field from '../../ui/Field';
import { BTN, FORM, NAVY, T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';

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
  const { pf, setPf, errors, tandaiGalat, persist, askConfirm, closeConfirm } = ctx;
  const sp = pf.sp;
  const setSp = (patch) => setPf((prev) => ({ ...prev, sp: { ...prev.sp, ...patch } }));
  const { dipa } = useDipa(ctx.pack.tahunAnggaran);

  function handleSelesai() {
    const e = validateSp(sp);
    if (tandaiGalat(e)) return;
    askConfirm({
      label: 'Surat Perintah',
      onYes: async () => {
        // Final: isi terakhir + kunci ditulis bersama (tanggal resmi SP datang dari TTE)
        const ok = await persist(ctx.pfRef.current, {
          quiet: true,
          kunci: 'sp',
          // tahanLangkah: tetap di form ini sampai pindah ke Detail
          tahanLangkah: true,
        });
        closeConfirm();
        if (ok) {
          // Upload SP ber-TTE dilanjutkan dari Fase 2 di Detail LPJ
          ctx.keDetail();
        }
      },
      onNo: async () => {
        await persist(ctx.pfRef.current, { quiet: true });
        closeConfirm();
        ctx.keDetail();
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
          <DasarList
            items={sp.dasar}
            dipaTeks={teksDipa(dipa)}
            onChange={(dasar) => setSp({ dasar })}
          />
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
            <PegawaiCards
              list={sp.kepada}
              onHapus={(p) =>
                setPf((prev) => ({
                  ...prev,
                  sp: {
                    ...prev.sp,
                    kepada: prev.sp.kepada.filter((s) => s.pegawaiId !== p.pegawaiId),
                  },
                }))
              }
            />
          </div>
        )}
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Isi Perintah</h3>
        <Field
          label="Untuk"
          required
          hint="Poin 2—4 sudah baku, cukup isi poin 1"
          err={errors.untuk}
        >
          <UntukList items={sp.untuk} err={errors.untuk} onChange={(untuk) => setSp({ untuk })} />
        </Field>
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Penandatangan</h3>
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
        {/* Isian sudah tersimpan otomatis; tombol ini menyimpan sisa perubahan lalu kembali */}
        <button type="button" className={BTN.ghost} onClick={ctx.backToDetail}>
          <FaChevronLeft size={12} /> Kembali ke Detail LPJ
        </button>
        <button type="button" className={BTN.primaryDark} onClick={handleSelesai}>
          <FaCheck size={12} /> Selesai
        </button>
      </div>
    </>
  );
}

/** Baris dinamis "Dasar" + DIPA baku (dari MAK Setup) yang terkunci di akhir. */
function DasarList({ items, dipaTeks, onChange }) {
  const nomor = `w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${T.surface2}`;
  return (
    <div>
      {items.map((val, i) => (
        <div key={i} className={`flex items-center gap-2 mb-2 ${ANIM.muncul}`}>
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
            onClick={(e) =>
              hapusBaris(e.currentTarget.parentElement, () =>
                onChange(items.filter((_, j) => j !== i)),
              )
            }
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
          <span className="truncate" title={dipaTeks}>
            {dipaTeks}
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
