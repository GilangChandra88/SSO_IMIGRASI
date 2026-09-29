import React from 'react';
import { FaCheck, FaPlus, FaRegSave, FaTimes } from 'react-icons/fa';
import { NP_RINCIAN_DOCS, URAIAN_MAX } from '../../data/masterLpj';
import { emptyTransaksi, toPegawaiRef } from '../../utils/emptyModels';
import { groupTransaksiByItem, parseNum } from '../../utils/lpjLogic';
import { makItemsOfAkun } from '../../utils/makTree';
import { catatMakHistory } from '../../services/makHistory';
import MakDropdowns from '../../components/MakDropdowns';
import TransaksiTable from '../../components/TransaksiTable';
import Field from '../../ui/Field';
import { BTN, FONT, FORM, LAYOUT, NAVY, STATUS, T } from '../../ui/tokens';

function npValidateForm(np) {
  const e = {};
  if (!np.tanggal) e.tanggal = 'Wajib diisi';
  if (np.pelaksana.length === 0) e.pelaksana = 'Pilih minimal satu pelaksana';
  if (!np.mak?.akunNodeId) e.mak = 'Pilih hingga level Akun';
  if (!np.uraian.trim()) e.uraian = 'Wajib diisi';
  if (np.transaksi.every((t) => !t.itemNodeId && !t.jumlah))
    e.transaksi = 'Tambahkan minimal satu transaksi';
  return e;
}

/** Fase 1 Non-Perjadin — data umum, kode MAK, dan detail transaksi. */
export default function StepRincianBayar({ ctx }) {
  const {
    pack,
    pf,
    setPf,
    errors,
    setErrors,
    persist,
    askConfirm,
    closeConfirm,
    showToast,
    mak,
    user,
  } = ctx;
  const np = pf.np;
  const updateNp = (patch) => setPf((prev) => ({ ...prev, np: { ...prev.np, ...patch } }));
  const akun = mak.byId[np.mak?.akunNodeId];
  const akunItems = makItemsOfAkun(mak.nodes, np.mak?.akunNodeId);
  const belumDipilih = ctx.pegawai.filter((p) => !np.pelaksana.find((s) => s.id === p.id));

  function handleSelesai() {
    const e = npValidateForm(np);
    setErrors(e);
    if (Object.keys(e).length) return;
    askConfirm({
      label: 'SPBy & Rincian Bayar',
      onYes: async () => {
        const npDocs = { ...(np.npDocs || {}) };
        NP_RINCIAN_DOCS.forEach((d) => {
          if (d.perPelaksana) np.pelaksana.forEach((p) => (npDocs[`${d.key}_${p.id}`] = true));
          else npDocs[d.key] = true;
        });
        const ok = await persist(
          (prev) => ({ ...prev, np: { ...prev.np, formLocked: true, npDocs } }),
          { quiet: true, teks: 'menandai SPBy & Rincian Bayar selesai' },
        );
        if (ok) {
          try {
            await catatMakHistory(pack, {
              transaksi: np.transaksi,
              mak: np.mak,
              tanggal: np.tanggal,
              pelaksana: np.pelaksana,
              uid: user.uid,
            });
          } catch (err) {
            console.error('catatMakHistory error:', err);
            showToast('Data tersimpan, tetapi pencatatan History MAK gagal.', 'error');
          }
          showToast('SPBy & Rincian Bayar ditandai selesai.');
        }
        closeConfirm();
        if (ok) ctx.navigate(ctx.detailUrl);
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
      <div className={LAYOUT.head}>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className={LAYOUT.h1}>SPBy &amp; Rincian Bayar</h1>
            <p className={LAYOUT.sub}>
              Data umum, kode MAK, dan detail transaksi — bukan perjalanan dinas, jadi tanpa Surat
              Perintah/SPD
            </p>
          </div>
          <span
            className={`px-2.5 py-[3px] rounded-[20px] text-[11px] font-bold tracking-[.04em] border ${STATUS.infoBg} ${STATUS.infoInk} ${STATUS.infoBorder}`}
          >
            NON-PERJADIN
          </span>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto">
        <div className={FORM.card}>
          <div
            className={`${FONT.head} font-bold text-sm mb-[18px] pb-3 border-b ${T.border} ${T.ink}`}
          >
            Informasi Umum
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="Tanggal" htmlFor="np-tanggal" required err={errors.tanggal}>
              <input
                id="np-tanggal"
                type="date"
                value={np.tanggal}
                onChange={(e) => updateNp({ tanggal: e.target.value })}
                className={`${FORM.input} ${errors.tanggal ? FORM.borderErr : FORM.borderOk}`}
              />
            </Field>
            <Field label="Pelaksana" htmlFor="np-pelaksana" required err={errors.pelaksana}>
              <select
                id="np-pelaksana"
                value=""
                onChange={(e) => {
                  const p = ctx.pegawai.find((x) => x.id === e.target.value);
                  if (p) updateNp({ pelaksana: [...np.pelaksana, toPegawaiRef(p)] });
                }}
                className={`${FORM.select} ${errors.pelaksana ? FORM.borderErr : FORM.borderOk}`}
              >
                <option value="">
                  {ctx.loadingPeg ? 'Memuat daftar pegawai…' : '— Tambah Pelaksana —'}
                </option>
                {belumDipilih.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} — {p.jabatan || '-'}
                  </option>
                ))}
              </select>
              {np.pelaksana.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {np.pelaksana.map((p) => (
                    <span
                      key={p.id}
                      className={`flex items-center gap-1.5 text-xs font-medium pl-3 pr-2.5 py-1 rounded-[20px] text-white ${NAVY.bg}`}
                    >
                      {p.nama}
                      <button
                        type="button"
                        aria-label={`Hapus ${p.nama}`}
                        onClick={() =>
                          updateNp({ pelaksana: np.pelaksana.filter((x) => x.id !== p.id) })
                        }
                        className="flex text-white/70 hover:text-white"
                      >
                        <FaTimes size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>
          <Field label="Uraian Kegiatan" htmlFor="np-uraian" required err={errors.uraian}>
            <textarea
              id="np-uraian"
              rows={3}
              maxLength={URAIAN_MAX}
              value={np.uraian}
              placeholder="Deskripsikan kegiatan yang dilaksanakan..."
              onChange={(e) => updateNp({ uraian: e.target.value })}
              className={`${FORM.textarea} ${errors.uraian ? FORM.borderErr : FORM.borderOk}`}
            />
            <p className="mt-[5px] text-[11.5px] text-right text-[#94a3b8]">
              {(np.uraian || '').length}/{URAIAN_MAX}
            </p>
          </Field>
        </div>

        <div className={FORM.card}>
          <div
            className={`${FONT.head} font-bold text-sm mb-[18px] pb-3 border-b ${T.border} ${T.ink}`}
          >
            Kode MAK{' '}
            {errors.mak && (
              <span className={`text-[11.5px] font-normal ml-2.5 ${STATUS.critInk}`}>
                {errors.mak}
              </span>
            )}
          </div>
          <MakDropdowns
            nodes={mak.nodes}
            byId={mak.byId}
            loading={mak.loading}
            mak={np.mak}
            onChange={(m) =>
              setPf((prev) => ({ ...prev, np: { ...prev.np, mak: { ...prev.np.mak, ...m } } }))
            }
          />
        </div>

        <div className={FORM.card}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className={FORM.cardTitle}>Detail Transaksi</h3>
              <p className={FORM.cardSub}>Pelaksana · Item · Jumlah</p>
            </div>
            <button
              type="button"
              className={BTN.action}
              onClick={() => updateNp({ transaksi: [...np.transaksi, emptyTransaksi()] })}
            >
              <FaPlus size={11} /> Tambah
            </button>
          </div>
          {errors.transaksi && (
            <div className={`text-xs mb-2.5 ${STATUS.critInk}`}>{errors.transaksi}</div>
          )}
          <TransaksiTable
            rows={np.transaksi}
            onChange={(transaksi) => updateNp({ transaksi })}
            pelaksana={np.pelaksana}
            items={akunItems}
            akunKode={akun?.kode || ''}
            resetJumlahOnItem
          />
          <Rekap transaksi={np.transaksi} />
        </div>

        <div className="flex flex-wrap justify-end items-center gap-2 pb-8">
          <button type="button" className={BTN.warn} onClick={() => persist(ctx.pfRef.current)}>
            <FaRegSave size={13} /> Simpan Draft
          </button>
          <button type="button" className={BTN.primaryDark} onClick={handleSelesai}>
            <FaCheck size={12} /> Selesai
          </button>
        </div>
      </div>
    </>
  );
}

/** Rekapitulasi total per item + total keseluruhan. */
function Rekap({ transaksi }) {
  const rows = groupTransaksiByItem(transaksi);
  if (!rows.length) return null;
  const grandTotal = transaksi.reduce((s, t) => s + parseNum(t.jumlah), 0);
  return (
    <div className={`mt-4 border-t pt-3.5 ${T.border}`}>
      <div className={`text-[11.5px] font-bold uppercase tracking-[.05em] mb-2 ${T.ink2}`}>
        Rekapitulasi Per Item
      </div>
      <div className={`rounded-[10px] border overflow-hidden ${T.surface2} ${T.border}`}>
        {rows.map((r, idx) => (
          <div
            key={r.itemKode + r.label + idx}
            className={`flex items-center justify-between gap-2 px-3.5 py-[9px] ${
              idx < rows.length - 1 ? `border-b ${T.border}` : ''
            }`}
          >
            <div className="min-w-0">
              <span className={`${FONT.mono} text-[11px] font-semibold ${T.ink2}`}>
                {r.itemKode}
              </span>
              <span className={`text-[12.5px] ml-2 ${T.ink}`}>{r.label}</span>
            </div>
            <div className={`text-[13px] font-bold whitespace-nowrap ${T.ink}`}>
              Rp {r.total.toLocaleString('id-ID')}
            </div>
          </div>
        ))}
        <div
          className={`flex items-center justify-between px-3.5 py-[11px] border-t-2 border-[#163057] ${NAVY.bg}`}
        >
          <div className="text-xs font-bold uppercase tracking-[.05em] text-white/70">
            Total Keseluruhan
          </div>
          <div className={`${FONT.head} text-[15px] font-extrabold text-white`}>
            Rp {grandTotal.toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  );
}
