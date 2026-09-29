import React from 'react';
import { FaCheck, FaInfoCircle, FaPlus, FaRegSave } from 'react-icons/fa';
import { LPJ_DOCS } from '../../data/masterLpj';
import { emptyTransaksi } from '../../utils/emptyModels';
import { formatTanggal } from '../../utils/formatTanggal';
import { parseNum } from '../../utils/lpjLogic';
import { makItemsOfAkun } from '../../utils/makTree';
import { catatMakHistory } from '../../services/makHistory';
import TransaksiTable from '../../components/TransaksiTable';
import Field from '../../ui/Field';
import { BTN, FONT, FORM, STATUS, T } from '../../ui/tokens';

/** Fase 3 — LPJ & SPBy: detail transaksi → pack dokumen pertanggungjawaban. */
export default function StepLPJ({ ctx }) {
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
  const { sp, spd, lpj } = pf;
  const setLpj = (patch) => setPf((prev) => ({ ...prev, lpj: { ...prev.lpj, ...patch } }));
  const akun = mak.byId[spd.mak?.akunNodeId];
  const akunItems = makItemsOfAkun(mak.nodes, spd.mak?.akunNodeId);
  const total = lpj.transaksi.reduce((s, t) => s + parseNum(t.jumlah), 0);

  function handleSelesai() {
    if (!lpj.tanggalLPJ) {
      setErrors({ tanggalLPJ: 'Wajib diisi' });
      return;
    }
    setErrors({});
    askConfirm({
      label: 'LPJ & SPBy (Pack Dokumen)',
      onYes: async () => {
        const lpjDocs = { ...(pf.selesai.lpjDocs || {}) };
        LPJ_DOCS.forEach((d) => {
          if (d.perPelaksana) sp.kepada.forEach((p) => (lpjDocs[`${d.key}_${p.id}`] = true));
          else lpjDocs[d.key] = true;
        });
        const ok = await persist(
          (prev) => ({
            ...prev,
            lpj: { ...prev.lpj, locked: true },
            selesai: { ...prev.selesai, lpjDocs },
          }),
          { quiet: true, teks: 'menandai LPJ & SPBy selesai' },
        );
        if (ok) {
          try {
            await catatMakHistory(pack, {
              transaksi: ctx.pfRef.current.lpj.transaksi,
              mak: spd.mak,
              tanggal: lpj.tanggalLPJ,
              pelaksana: sp.kepada,
              uid: user.uid,
            });
          } catch (err) {
            console.error('catatMakHistory error:', err);
            showToast('LPJ tersimpan, tetapi pencatatan History MAK gagal.', 'error');
          }
          showToast('LPJ & SPBy ditandai selesai.');
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

  const ringkas = [
    ['No. SPD', spd.nomorSPD],
    ['Tujuan', spd.tujuan],
    ['Berangkat', spd.berangkat && formatTanggal(spd.berangkat)],
    ['Kembali', spd.kembali && formatTanggal(spd.kembali)],
    ['Pelaksana', sp.kepada.map((p) => p.nama).join(', ')],
    ['Seksi', spd.seksi],
    ['Kode MAK', spd.mak?.kode],
    ['Alat Angkut', spd.alatAngkut],
  ];

  return (
    <>
      <div className={FORM.cardMuted}>
        <div className={`text-[11px] font-bold uppercase tracking-[.06em] mb-2.5 ${T.ink2}`}>
          Data dari Dokumen Awal · read-only
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[12.5px]">
          {ringkas.map(([label, val]) => (
            <div
              key={label}
              className={`px-2.5 py-2 rounded-[7px] border min-w-0 ${T.surface} ${T.border}`}
            >
              <div className={`text-[10.5px] font-semibold mb-0.5 ${T.inkMuted}`}>{label}</div>
              <div className={`font-medium break-words ${T.ink}`}>{val || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Informasi SPBy &amp; LPJ</h3>
        <Field label="Tanggal LPJ" htmlFor="lpj-tanggal" required err={errors.tanggalLPJ}>
          <input
            id="lpj-tanggal"
            type="date"
            value={lpj.tanggalLPJ}
            onChange={(e) => setLpj({ tanggalLPJ: e.target.value })}
            className={`${FORM.input} ${errors.tanggalLPJ ? FORM.borderErr : FORM.borderOk} max-w-[240px]`}
          />
        </Field>
        <Field label="Keterangan" htmlFor="lpj-ket">
          <textarea
            id="lpj-ket"
            value={lpj.keterangan}
            placeholder="Catatan tambahan..."
            onChange={(e) => setLpj({ keterangan: e.target.value })}
            className={`${FORM.textarea} ${FORM.borderOk}`}
          />
        </Field>
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
            onClick={() =>
              setLpj({
                transaksi: [
                  ...lpj.transaksi,
                  { ...emptyTransaksi(), pelaksanaId: sp.kepada[0]?.id || '' },
                ],
              })
            }
          >
            <FaPlus size={11} /> Tambah
          </button>
        </div>
        {spd.mak?.akunNodeId ? (
          <div
            className={`flex items-center gap-2 px-3 py-2 mb-3.5 rounded-lg border text-xs ${STATUS.infoBg} ${STATUS.infoBorder} ${STATUS.infoInk}`}
          >
            <FaInfoCircle size={13} className="shrink-0" />
            <span>
              Item tersedia untuk <strong>Akun {akun?.kode || '—'}</strong> · {akunItems.length}{' '}
              jenis item
            </span>
          </div>
        ) : (
          <div
            className={`flex items-center gap-2 px-3 py-2 mb-3.5 rounded-lg border text-xs ${STATUS.warnBg} ${STATUS.warnBorder} ${STATUS.warnInk}`}
          >
            <FaInfoCircle size={13} className="shrink-0" />
            <span>
              Pilih <strong>Akun MAK</strong> di tahap SPD untuk mengaktifkan pilihan item
            </span>
          </div>
        )}
        <TransaksiTable
          rows={lpj.transaksi}
          onChange={(transaksi) => setLpj({ transaksi })}
          pelaksana={sp.kepada}
          items={akunItems}
          akunKode={akun?.kode || ''}
        />
        {total > 0 && (
          <div className={`flex justify-end border-t pt-3 mt-1 ${T.border}`}>
            <div className="text-right">
              <div className={`text-[11px] font-semibold ${T.inkMuted}`}>TOTAL BIAYA</div>
              <div className={`${FONT.head} text-xl font-extrabold ${T.ink}`}>
                Rp {total.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={FORM.cardMuted}>
        <h3 className={`${FORM.cardTitle} mb-1`}>Pack 7 Dokumen Pertanggungjawaban</h3>
        <p className={`text-xs mb-3.5 ${T.ink2}`}>Digenerate otomatis setelah data disimpan</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LPJ_DOCS.map((d) => (
            <div
              key={d.key}
              className={`flex items-center gap-2 px-3 py-[9px] rounded-lg border ${T.surface} ${T.border}`}
            >
              <div
                className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-bold ${STATUS.infoBg} ${STATUS.infoBorder} ${STATUS.infoInk}`}
              >
                {d.num}
              </div>
              <span className={`text-[12.5px] ${T.ink}`}>
                {d.label === 'Surat Pernyataan Pengeluaran Biaya Perjalanan Dinas'
                  ? 'Surat Pernyataan Pengeluaran'
                  : d.label}
              </span>
            </div>
          ))}
        </div>
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
