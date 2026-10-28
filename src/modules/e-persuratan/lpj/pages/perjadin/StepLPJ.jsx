import React from 'react';
import { FaCheck, FaChevronLeft, FaInfoCircle } from 'react-icons/fa';
import { itemDiAkun } from '../../../makPohon';
import { transaksiKosong } from '../../utils/modelKosong';
import { formatTanggal } from '../../utils/formatTanggal';
import { transaksiLengkap } from '../../utils/lpjLogic';
import TransaksiTable from '../../components/TransaksiTable';
import Field from '../../ui/Field';
import { BTN, FONT, FORM, STATUS, T } from '@/utils/uiTokens';

/**
 * Fase 3 — LPJ & SPBy: detail transaksi → pack dokumen pertanggungjawaban. "Selesai" menyimpan isi
 * terakhir lalu memanggil Function selesaikanSpby: bagian dikunci, nomor LPJ terbit, dan realisasi
 * MAK tercatat di server dalam satu transaksi.
 */
export default function StepLPJ({ ctx }) {
  const {
    pack,
    pf,
    setPf,
    errors,
    tandaiGalat,
    persist,
    askConfirm,
    closeConfirm,
    showToast,
    mak,
  } = ctx;
  // Surat Perintah & SPD sudah final: dibaca dari berkas live
  const sp = pack.sp || {};
  const spd = pack.spd || {};
  const kepada = sp.kepada || [];
  const { lpj } = pf;
  const setLpj = (patch) => setPf((prev) => ({ ...prev, lpj: { ...prev.lpj, ...patch } }));
  const akun = mak.byId[spd.mak?.akunNodeId];
  const akunItems = itemDiAkun(mak.nodes, spd.mak?.akunNodeId);
  const total = lpj.transaksi.reduce((s, t) => s + (Number.isInteger(t.jumlah) ? t.jumlah : 0), 0);

  function handleSelesai() {
    const e = {};
    if (!lpj.tanggalLpj) e.tanggalLpj = 'Wajib diisi';
    if (!transaksiLengkap(lpj.transaksi)) {
      e.transaksi = 'Lengkapi setiap baris: pelaksana, item, dan jumlah lebih dari 0.';
    }
    if (tandaiGalat(e)) return;
    askConfirm({
      label: 'LPJ & SPBy (Pack Dokumen)',
      onYes: async () => {
        const hasil = await persist(ctx.pfRef.current, {
          quiet: true,
          selesaikanSpby: true, // kunci + nomor LPJ + realisasi MAK (satu transaksi di server)
          tahanLangkah: true, // tetap di form ini sampai pindah ke Detail
        });
        closeConfirm();
        if (hasil) {
          showToast(`LPJ & SPBy selesai. Nomor LPJ ${hasil.nomorLpj || ''} terbit.`);
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

  const ringkas = [
    ['No. SPD', spd.nomorSpd],
    ['Tujuan', spd.tujuan],
    ['Berangkat', spd.berangkat && formatTanggal(spd.berangkat)],
    ['Kembali', spd.kembali && formatTanggal(spd.kembali)],
    ['Pelaksana', kepada.map((p) => p.nama).join(', ')],
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
        <Field label="Tanggal LPJ" htmlFor="lpj-tanggal" required err={errors.tanggalLpj}>
          <input
            id="lpj-tanggal"
            type="date"
            value={lpj.tanggalLpj}
            onChange={(e) => setLpj({ tanggalLpj: e.target.value })}
            className={`${FORM.input} ${errors.tanggalLpj ? FORM.borderErr : FORM.borderOk} max-w-[240px]`}
          />
        </Field>
        <Field label="Keterangan" htmlFor="lpj-ket">
          <textarea
            id="lpj-ket"
            value={lpj.keterangan}
            placeholder="Uraian kegiatan"
            onChange={(e) => setLpj({ keterangan: e.target.value })}
            className={`${FORM.textarea} ${FORM.borderOk}`}
          />
        </Field>
      </div>

      <div className={FORM.card}>
        <div className="mb-4">
          <h3 className={FORM.cardTitle}>Detail Transaksi</h3>
          <p className={FORM.cardSub}>Pelaksana · Item · Jumlah</p>
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
          onTambah={() =>
            setLpj({ transaksi: [...lpj.transaksi, transaksiKosong(kepada[0]?.pegawaiId || '')] })
          }
          pelaksana={kepada}
          items={akunItems}
          akunKode={akun?.kode || ''}
        />
        {errors.transaksi && (
          <p data-galat className={FORM.err}>
            {errors.transaksi}
          </p>
        )}
        {total > 0 && (
          <div className={`flex justify-end border-t pt-3 mt-3.5 ${T.border}`}>
            <div className="text-right">
              <div className={`text-[11px] font-semibold ${T.inkMuted}`}>TOTAL BIAYA</div>
              <div className={`${FONT.head} text-xl font-extrabold ${T.ink}`}>
                Rp {total.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end items-center gap-2 pb-6">
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
