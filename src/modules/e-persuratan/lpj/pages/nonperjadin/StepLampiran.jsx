import React, { useState } from 'react';
import {
  FaCheck,
  FaChevronLeft,
  FaCircleNotch,
  FaPrint,
  FaRegEye,
  FaRegTrashAlt,
  FaUpload,
} from 'react-icons/fa';
import { NP_LAMPIRAN_MAX_COUNT, NP_PACK_DOCS, SCAN_MAX_BYTES } from '../../data/masterLpj';
import { formatTanggal } from '../../utils/formatTanggal';
import { lpjIdOf, lpjRowTotal } from '../../utils/lpjLogic';
import { deleteLpjFile, pesanGagalUnggah, uploadLpjFile } from '../../services/lpjStorage';
import ProgressBar from '../../ui/ProgressBar';
import { BTN, FONT, LAYOUT, NAVY, STATUS, T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';

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
          {
            quiet: true,
            teks: `menyelesaikan berkas ${lpjIdOf(pack)}`,
            extra: { status: 'selesai' },
          },
        );
        closeConfirm();
        if (ok) {
          showToast(`LPJ ${lpjIdOf(pack)} berhasil diselesaikan.`);
          ctx.keDetail(); // berkas final: tampilkan Detail-nya
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
        <div>
          <h1 className={LAYOUT.h1}>Lampiran</h1>
          <p className={LAYOUT.sub}>
            Upload foto bukti/produk &amp; nota pembayaran — belum bisa dilihat/dicetak sebelum
            diupload
          </p>
        </div>
      </div>
      {ctx.infoSimpan}

      {/* Memenuhi lebar kartu form (sama dengan form Perjadin) */}
      <div>
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
          <div className={`text-[12.5px] font-semibold ${allDone ? STATUS.doneInk : T.ink2}`}>
            {pctUploaded}% ter-upload
          </div>
          <ProgressBar
            value={pctUploaded}
            className={`!w-[140px] h-1.5 rounded-[3px] ${T.bgBorder} [&::-webkit-progress-bar]:bg-[#E0E5EC] dark:[&::-webkit-progress-bar]:bg-[#233450] [&::-webkit-progress-value]:rounded-[3px] ${
              allDone
                ? '[&::-webkit-progress-value]:bg-[#2A78D6] [&::-moz-progress-bar]:bg-[#2A78D6] dark:[&::-webkit-progress-value]:bg-[#7DB6F3] dark:[&::-moz-progress-bar]:bg-[#7DB6F3]'
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
                className={`rounded-xl border-[1.5px] overflow-hidden ${T.surface} ${uploaded ? STATUS.doneBorder : T.border}`}
              >
                <div
                  className={`flex flex-wrap items-center justify-between gap-2.5 px-[18px] py-3.5 ${
                    uploaded ? STATUS.doneBg : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white text-[13px] font-bold ${
                        uploaded ? STATUS.doneOn : NAVY.bg
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
                        <span
                          className={`text-[11.5px] font-semibold flex items-center gap-1 ${STATUS.doneInk}`}
                        >
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
                  // Pratinjau foto (gaya sama dengan foto Laporan Kegiatan); klik → ukuran penuh
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 px-[18px] pt-3.5 pb-3.5">
                    {files.map((f) => (
                      <div
                        key={f.path}
                        className={`relative rounded-[10px] border overflow-hidden ${ANIM.meletup} ${T.border} ${T.surface2}`}
                      >
                        <a href={f.url} target="_blank" rel="noreferrer" title="Buka di tab baru">
                          <img
                            src={f.url}
                            alt={f.name}
                            loading="lazy"
                            className="block w-full h-24 object-cover"
                          />
                        </a>
                        <div
                          className={`px-1.5 py-[5px] text-[10.5px] truncate ${T.ink2}`}
                          title={f.name}
                        >
                          {f.name}
                        </div>
                        <button
                          type="button"
                          title="Hapus foto"
                          aria-label={`Hapus foto ${f.name}`}
                          onClick={(e) =>
                            hapusBaris(
                              e.currentTarget.parentElement,
                              () => removeFile(doc.key, f),
                              { geser: false },
                            )
                          }
                          className="absolute top-[5px] right-[5px] w-[26px] h-[26px] rounded-full bg-[rgba(15,20,30,.65)] text-white flex items-center justify-center"
                        >
                          <FaRegTrashAlt size={12} />
                        </button>
                      </div>
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

        <div className="flex flex-wrap justify-end gap-2 mt-5 pb-6">
          {/* Lampiran langsung tersimpan saat diunggah; cukup kembali ke Detail */}
          <button type="button" className={BTN.ghost} onClick={ctx.backToDetail}>
            <FaChevronLeft size={12} /> Kembali ke Detail LPJ
          </button>
          {allDone && (
            <button
              type="button"
              onClick={handleSelesai}
              className={`inline-flex items-center gap-2 px-[22px] py-2.5 rounded-lg text-[13.5px] font-bold text-white shadow-[0_2px_8px_rgba(15,32,64,.3)] ${NAVY.bg} ${NAVY.hoverBg} ${ANIM.muncul}`}
            >
              <FaCheck size={12} /> Selesai
            </button>
          )}
        </div>
      </div>
    </>
  );
}
