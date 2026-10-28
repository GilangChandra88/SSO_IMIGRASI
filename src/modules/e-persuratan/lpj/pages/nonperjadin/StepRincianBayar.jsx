import React from 'react';
import { FaCheck, FaChevronLeft } from 'react-icons/fa';
import { PANJANG } from '@/utils/batas';
import { itemDiAkun } from '../../../makPohon';
import { transaksiKosong } from '../../utils/modelKosong';
import { groupTransaksiByItem, transaksiLengkap } from '../../utils/lpjLogic';
import MakDropdowns from '../../components/MakDropdowns';
import PegawaiPicker from '../../components/PegawaiPicker';
import PegawaiCards from '../../components/PegawaiCards';
import TransaksiTable from '../../components/TransaksiTable';
import Field from '../../ui/Field';
import { BTN, FONT, FORM, LAYOUT, NAVY, STATUS, T } from '@/utils/uiTokens';

const URAIAN_MAX = PANJANG.uraianBerkas;

function npValidateForm(spby, uraian) {
  const e = {};
  if (!spby.tanggal) e.tanggal = 'Wajib diisi';
  if (spby.pelaksana.length === 0) e.pelaksana = 'Pilih minimal satu pelaksana';
  if (!spby.mak?.akunNodeId) e.mak = 'Pilih hingga level Akun';
  if (!String(uraian || '').trim()) e.uraian = 'Wajib diisi';
  if (!transaksiLengkap(spby.transaksi)) {
    e.transaksi = 'Lengkapi setiap baris: pelaksana, item, dan jumlah lebih dari 0.';
  }
  return e;
}

/**
 * Fase 1 Non-Perjadin — data umum, kode MAK, dan detail transaksi (bagian `spby`). "Selesai"
 * menyimpan isi terakhir lalu memanggil Function selesaikanSpby: bagian dikunci, nomor LPJ terbit,
 * dan realisasi MAK tercatat di server dalam satu transaksi.
 */
export default function StepRincianBayar({ ctx }) {
  const { pf, setPf, errors, tandaiGalat, persist, askConfirm, closeConfirm, showToast, mak } = ctx;
  const np = pf.spby;
  const updateNp = (patch) => setPf((prev) => ({ ...prev, spby: { ...prev.spby, ...patch } }));
  const akun = mak.byId[np.mak?.akunNodeId];
  const akunItems = itemDiAkun(mak.nodes, np.mak?.akunNodeId);

  function handleSelesai() {
    const e = npValidateForm(np, pf.uraian);
    if (tandaiGalat(e)) return;
    askConfirm({
      label: 'SPBy & Rincian Bayar',
      onYes: async () => {
        const hasil = await persist(ctx.pfRef.current, {
          quiet: true,
          selesaikanSpby: true, // kunci + nomor LPJ + realisasi MAK (satu transaksi di server)
          tahanLangkah: true,
        });
        closeConfirm();
        if (hasil) {
          showToast(`SPBy & Rincian Bayar selesai. Nomor LPJ ${hasil.nomorLpj || ''} terbit.`);
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
      {ctx.infoSimpan}

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
            <Field label="Pelaksana" required err={errors.pelaksana}>
              <PegawaiPicker
                pegawai={ctx.pegawai}
                loading={ctx.loadingPeg}
                selected={np.pelaksana}
                onChange={(pelaksana) => updateNp({ pelaksana })}
                err={!!errors.pelaksana}
              />
            </Field>
          </div>
          {np.pelaksana.length > 0 && (
            <div className={`border-t pt-3.5 mb-3.5 ${T.border}`}>
              <PegawaiCards
                list={np.pelaksana}
                onHapus={(p) =>
                  setPf((prev) => ({
                    ...prev,
                    spby: {
                      ...prev.spby,
                      pelaksana: prev.spby.pelaksana.filter((s) => s.pegawaiId !== p.pegawaiId),
                    },
                  }))
                }
              />
            </div>
          )}
          <Field label="Uraian Kegiatan" htmlFor="np-uraian" required err={errors.uraian}>
            <textarea
              id="np-uraian"
              rows={3}
              maxLength={URAIAN_MAX}
              value={pf.uraian}
              placeholder="Deskripsikan kegiatan yang dilaksanakan..."
              onChange={(e) => setPf((prev) => ({ ...prev, uraian: e.target.value }))}
              className={`${FORM.textarea} ${errors.uraian ? FORM.borderErr : FORM.borderOk}`}
            />
            <p className="mt-[5px] text-[11.5px] text-right text-[#94a3b8]">
              {(pf.uraian || '').length}/{URAIAN_MAX}
            </p>
          </Field>
        </div>

        <div className={FORM.card}>
          <div
            className={`${FONT.head} font-bold text-sm mb-[18px] pb-3 border-b ${T.border} ${T.ink}`}
          >
            Kode MAK{' '}
            {errors.mak && (
              <span
                data-galat
                className={`inline-block text-[11.5px] font-normal ml-2.5 ${STATUS.critInk}`}
              >
                {errors.mak}
              </span>
            )}
          </div>
          <MakDropdowns
            nodes={mak.nodes}
            byId={mak.byId}
            loading={mak.memuat}
            mak={np.mak}
            bertahap
            onChange={(m) =>
              setPf((prev) => ({
                ...prev,
                spby: { ...prev.spby, mak: { ...prev.spby.mak, ...m } },
              }))
            }
          />
        </div>

        <div className={FORM.card}>
          <div className="mb-4">
            <h3 className={FORM.cardTitle}>Detail Transaksi</h3>
            <p className={FORM.cardSub}>Pelaksana · Item · Jumlah</p>
          </div>
          {errors.transaksi && (
            <div data-galat className={`text-xs mb-2.5 ${STATUS.critInk}`}>
              {errors.transaksi}
            </div>
          )}
          <TransaksiTable
            rows={np.transaksi}
            onChange={(transaksi) => updateNp({ transaksi })}
            onTambah={() =>
              updateNp({
                transaksi: [...np.transaksi, transaksiKosong(np.pelaksana[0]?.pegawaiId || '')],
              })
            }
            pelaksana={np.pelaksana}
            items={akunItems}
            akunKode={akun?.kode || ''}
            resetJumlahOnItem
          />
          <Rekap transaksi={np.transaksi} />
        </div>

        <div className="flex flex-wrap justify-end items-center gap-2 pb-8">
          {/* Menyimpan isian lalu kembali (sama dengan tautan "Kembali" di atas form) */}
          <button type="button" className={BTN.ghost} onClick={ctx.backToDetail}>
            <FaChevronLeft size={12} /> Kembali ke Detail LPJ
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
  const grandTotal = transaksi.reduce((s, t) => s + (Number.isInteger(t.jumlah) ? t.jumlah : 0), 0);
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
