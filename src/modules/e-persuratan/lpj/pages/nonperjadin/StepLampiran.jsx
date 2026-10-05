import React, { useState } from 'react';
import {
  FaCheck,
  FaCircleNotch,
  FaPrint,
  FaRegEye,
  FaRegSave,
  FaTimes,
  FaUpload,
} from 'react-icons/fa';
import { NP_LAMPIRAN_MAX_COUNT, NP_PACK_DOCS, SCAN_MAX_BYTES } from '../../data/masterLpj';
import { formatTanggal } from '../../utils/formatTanggal';
import { lpjRowTotal } from '../../utils/lpjLogic';
import { deleteLpjFile, pesanGagalUnggah, uploadLpjFile } from '../../services/lpjStorage';
import ProgressBar from '../../ui/ProgressBar';
import { BTN, FONT, LAYOUT, NAVY, STATUS, T } from '../../ui/tokens';

/** Fase 2 Non-Perjadin — unggah Foto Bukti/Produk & Nota Pembayaran, lalu berkas selesai. */
export default function StepLampiran({ ctx }) {
  const { pack, packView, pf, persist, askConfirm, closeConfirm, showToast, user, dok } = ctx;
  const np = pf.np;
  const lampiran = np.lampiran || {};
  const [uploadingKey, setUploadingKey] = useState('');
  const [errKey, setErrKey] = useState({});

  const uploadedCount = NP_PACK_DOCS.filter((d) => (lampiran[d.key] || []).length > 0).length;
  const allDone = uploadedCount === NP_PACK_DOCS.length;
  const pctUploaded = Math.round((uploadedCount / NP_PACK_DOCS.length) * 100);
  const total = lpjRowTotal(packView);

  async function handleFiles(key, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const existing = ctx.pfRef.current.np.lampiran?.[key] || [];
    const room = NP_LAMPIRAN_MAX_COUNT - existing.length;
    const valid = files.filter((f) => f.type.startsWith('image/') && f.size <= SCAN_MAX_BYTES);
    const toAdd = valid.slice(0, room);
    setErrKey((prev) => ({
      ...prev,
      [key]:
        valid.length < files.length
          ? 'Sebagian file dilewati (harus gambar, maks. 5 MB).'
          : valid.length > room
            ? `Maksimal ${NP_LAMPIRAN_MAX_COUNT} foto.`
            : '',
    }));
    if (!toAdd.length) return;

    setUploadingKey(key);
    try {
      const metas = [];
      for (const f of toAdd) {
        metas.push(await uploadLpjFile(pack.id, `lampiran/${key}`, f, user.uid));
      }
      await persist(
        (prev) => ({
          ...prev,
          np: {
            ...prev.np,
            lampiran: {
              ...(prev.np.lampiran || {}),
              [key]: [...(prev.np.lampiran?.[key] || []), ...metas],
            },
          },
        }),
        {
          quiet: true,
          teks: `mengunggah lampiran ${NP_PACK_DOCS.find((d) => d.key === key)?.label}`,
        },
      );
    } catch (err) {
      console.error('upload lampiran error:', err);
      setErrKey((prev) => ({ ...prev, [key]: pesanGagalUnggah(err) }));
    } finally {
      setUploadingKey('');
    }
  }

  async function removeFile(key, file) {
    try {
      await deleteLpjFile(file.path);
      await persist(
        (prev) => ({
          ...prev,
          np: {
            ...prev.np,
            lampiran: {
              ...(prev.np.lampiran || {}),
              [key]: (prev.np.lampiran?.[key] || []).filter((f) => f.path !== file.path),
            },
          },
        }),
        { quiet: true },
      );
    } catch (err) {
      console.error('hapus lampiran error:', err);
      showToast('Gagal menghapus berkas.', 'error');
    }
  }

  function handleSelesai() {
    askConfirm({
      label: 'Lampiran',
      onYes: async () => {
        const ok = await persist(
          (prev) => ({ ...prev, np: { ...prev.np, lampiranLocked: true } }),
          { quiet: true, teks: `menyelesaikan berkas ${pack.id}`, extra: { status: 'selesai' } },
        );
        closeConfirm();
        if (ok) {
          showToast(`LPJ ${pack.id} berhasil diselesaikan.`);
          ctx.navigate('/e-persuratan/lpj');
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
      <div className={LAYOUT.head}>
        <div>
          <h1 className={LAYOUT.h1}>Lampiran</h1>
          <p className={LAYOUT.sub}>
            Upload foto bukti/produk &amp; nota pembayaran — belum bisa dilihat/dicetak sebelum
            diupload
          </p>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto">
        <div
          className={`${NAVY.gradient} rounded-xl px-[22px] py-[18px] mb-4 flex flex-wrap items-center justify-between gap-2.5`}
        >
          <div className="text-white min-w-0">
            <div className={`${FONT.head} font-bold text-sm`}>
              LPJ Non-Perjadin · {np.tanggal ? formatTanggal(np.tanggal) : '—'}
            </div>
            <div className="text-xs text-white/60 mt-[3px]">
              {np.pelaksana.map((p) => p.nama).join(', ')} · {np.mak?.kode || '—'}
            </div>
          </div>
          <div className="text-right text-white">
            <div className="text-[10px] font-semibold text-white/50">TOTAL BIAYA</div>
            <div className={`${FONT.head} text-lg font-extrabold`}>
              Rp {total.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-4">
          <div
            className={`text-[12.5px] font-semibold ${allDone ? 'text-[#16a34a] dark:text-[#4FD39B]' : T.ink2}`}
          >
            {pctUploaded}% ter-upload
          </div>
          <ProgressBar
            value={pctUploaded}
            className={`!w-[140px] h-1.5 rounded-[3px] ${T.bgBorder} [&::-webkit-progress-bar]:bg-[#E0E5EC] dark:[&::-webkit-progress-bar]:bg-[#233450] [&::-webkit-progress-value]:rounded-[3px] ${
              allDone
                ? '[&::-webkit-progress-value]:bg-[#16a34a] [&::-moz-progress-bar]:bg-[#16a34a]'
                : '[&::-webkit-progress-value]:bg-[#0f2040] [&::-moz-progress-bar]:bg-[#0f2040] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]'
            }`}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          {NP_PACK_DOCS.map((doc, i) => {
            const files = lampiran[doc.key] || [];
            const uploaded = files.length > 0;
            const room = NP_LAMPIRAN_MAX_COUNT - files.length;
            const busy = uploadingKey === doc.key;
            const item = { key: doc.key, docKey: doc.key, label: doc.label };
            return (
              <div
                key={doc.key}
                className={`rounded-xl border-[1.5px] overflow-hidden ${T.surface} ${uploaded ? STATUS.goodBorder : T.border}`}
              >
                <div
                  className={`flex flex-wrap items-center justify-between gap-2.5 px-[18px] py-3.5 ${
                    uploaded ? 'bg-[#f0fdf4] dark:bg-[rgba(25,158,112,.12)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white text-[13px] font-bold ${
                        uploaded ? 'bg-[#16a34a]' : NAVY.bg
                      }`}
                    >
                      {uploaded ? <FaCheck size={12} /> : i + 1}
                    </div>
                    <div className={`text-[13.5px] font-semibold ${T.ink}`}>
                      {doc.label}
                      {uploaded && (
                        <span className={`font-medium ${T.inkMuted}`}>
                          {' '}
                          ({files.length}/{NP_LAMPIRAN_MAX_COUNT} foto)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {uploaded ? (
                      <>
                        <span className="text-[11.5px] font-semibold text-[#16a34a] dark:text-[#4FD39B] flex items-center gap-1">
                          <FaCheck size={10} /> sudah di upload
                        </span>
                        <button type="button" className={BTN.sm} onClick={() => dok.lihat(item)}>
                          <FaRegEye size={12} /> Lihat
                        </button>
                        <button type="button" className={BTN.sm} onClick={() => dok.cetak(item)}>
                          <FaPrint size={12} /> Cetak
                        </button>
                      </>
                    ) : (
                      <span className={`text-[11.5px] ${T.inkMuted}`}>
                        Upload dulu untuk bisa dilihat/dicetak
                      </span>
                    )}
                    {room > 0 ? (
                      <label
                        className={`inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border text-[12.5px] font-semibold cursor-pointer ${
                          uploaded
                            ? `${T.surface} ${T.ink2} ${T.border}`
                            : `${NAVY.bg} ${NAVY.border} text-white`
                        } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        {busy ? (
                          <FaCircleNotch className="animate-spin" size={12} />
                        ) : (
                          <FaUpload size={12} />
                        )}{' '}
                        {busy ? 'Mengunggah…' : uploaded ? 'Tambah Foto' : 'Upload Dokumen'} · maks{' '}
                        {NP_LAMPIRAN_MAX_COUNT}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          disabled={busy}
                          onChange={(e) => {
                            handleFiles(doc.key, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    ) : (
                      <span className={`text-[11px] ${T.inkMuted}`}>
                        Maks {NP_LAMPIRAN_MAX_COUNT} foto tercapai
                      </span>
                    )}
                  </div>
                </div>
                {uploaded && (
                  <div className="flex flex-wrap gap-2 px-[18px] pb-3.5">
                    {files.map((f) => (
                      <span
                        key={f.path}
                        className={`inline-flex items-center gap-1.5 max-w-[220px] text-[11.5px] font-medium pl-2.5 pr-1.5 py-[5px] rounded-[20px] border ${T.surface2} ${T.ink2} ${T.border}`}
                      >
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate"
                          title={f.name}
                        >
                          {f.name}
                        </a>
                        <button
                          type="button"
                          title="Hapus foto"
                          aria-label={`Hapus ${f.name}`}
                          onClick={() => removeFile(doc.key, f)}
                          className={`flex ${STATUS.critInk}`}
                        >
                          <FaTimes size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {errKey[doc.key] && (
                  <p className={`px-[18px] pb-3 text-[11.5px] font-semibold ${STATUS.critInk}`}>
                    {errKey[doc.key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {allDone && (
          <div className="flex flex-wrap justify-end gap-2 mt-5 pb-6">
            <button type="button" className={BTN.warn} onClick={() => persist(ctx.pfRef.current)}>
              <FaRegSave size={13} /> Simpan Draft
            </button>
            <button
              type="button"
              onClick={handleSelesai}
              className={`inline-flex items-center gap-2 px-[22px] py-2.5 rounded-lg text-[13.5px] font-bold text-white shadow-[0_2px_8px_rgba(15,32,64,.3)] ${NAVY.bg} ${NAVY.hoverBg}`}
            >
              <FaCheck size={12} /> Selesai
            </button>
          </div>
        )}
      </div>
    </>
  );
}
