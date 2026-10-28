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
import { formatUkuran } from '@/utils/berkasStorage';
import { NP_PACK_DOCS } from '../../data/masterLpj';
import { formatTanggal } from '../../utils/formatTanggal';
import { lpjIdOf, lpjRowTotal } from '../../utils/lpjLogic';
import {
  ATURAN_UNGGAHAN,
  DAFTAR_GAMBAR,
  hapusGambar,
  pesanUnggah,
  tambahGambar,
} from '../../services/unggahan';
import FotoBerkas from '../../components/FotoBerkas';
import ProgressBar from '../../ui/ProgressBar';
import { BTN, FONT, LAYOUT, NAVY, STATUS, T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';

const UKURAN = formatUkuran(ATURAN_UNGGAHAN.lampiran.maksByte);

/**
 * Fase 2 Non-Perjadin — unggah Foto Bukti/Produk & Nota Pembayaran (bagian `lampiran`), lalu
 * berkas selesai. Foto langsung tersimpan begitu terunggah (diperkecil otomatis).
 */
export default function StepLampiran({ ctx }) {
  const { pack, packView, persist, askConfirm, closeConfirm, showToast, user, dok } = ctx;
  // SPBy sudah final dan lampiran selalu dari berkas live
  const spby = pack.spby || {};
  const lampiran = pack.lampiran || {};
  const [uploadingKey, setUploadingKey] = useState('');
  const [errKey, setErrKey] = useState({});

  const uploadedCount = NP_PACK_DOCS.filter((d) => (lampiran[d.key] || []).length > 0).length;
  const allDone = uploadedCount === NP_PACK_DOCS.length;
  const pctUploaded = Math.round((uploadedCount / NP_PACK_DOCS.length) * 100);
  const total = lpjRowTotal(packView);

  async function handleFiles(doc, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const maks = DAFTAR_GAMBAR[doc.daftar].maks;
    const room = maks - (lampiran[doc.key] || []).length;
    const valid = files.filter((f) => ATURAN_UNGGAHAN.lampiran.tipe.includes(f.type));
    const toAdd = valid.slice(0, room);
    setErrKey((prev) => ({
      ...prev,
      [doc.key]:
        valid.length < files.length
          ? 'Sebagian file dilewati (harus gambar JPG/PNG).'
          : valid.length > room
            ? `Maksimal ${maks} foto.`
            : '',
    }));
    if (!toAdd.length) return;

    setUploadingKey(doc.key);
    for (const f of toAdd) {
      try {
        await tambahGambar(pack.id, doc.daftar, f, user.uid);
      } catch (err) {
        setErrKey((prev) => ({ ...prev, [doc.key]: pesanUnggah(err) }));
      }
    }
    setUploadingKey('');
  }

  async function removeFile(doc, file) {
    try {
      await hapusGambar(pack.id, doc.daftar, file, user.uid);
    } catch (err) {
      showToast(pesanUnggah(err), 'error');
    }
  }

  function handleSelesai() {
    askConfirm({
      label: 'Lampiran',
      onYes: async () => {
        // Bagian terakhir dikunci → status berkas "selesai" ditulis Function
        const ok = await persist(ctx.pfRef.current, {
          quiet: true,
          kunci: 'lampiran',
          tahanLangkah: true,
        });
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
              LPJ Non-Perjadin · {spby.tanggal ? formatTanggal(spby.tanggal) : '—'}
            </div>
            <div className="text-xs text-white/60 mt-[3px]">
              {(spby.pelaksana || []).map((p) => p.nama).join(', ')} · {spby.mak?.kode || '—'}
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
            const maks = DAFTAR_GAMBAR[doc.daftar].maks;
            const uploaded = files.length > 0;
            const room = maks - files.length;
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
                          ({files.length}/{maks} foto)
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
                        title={`JPG/PNG, diperkecil otomatis ke maks. ${UKURAN}`}
                      >
                        {busy ? (
                          <FaCircleNotch className="animate-spin" size={12} />
                        ) : (
                          <FaUpload size={12} />
                        )}{' '}
                        {busy ? 'Mengunggah…' : uploaded ? 'Tambah Foto' : 'Upload Dokumen'} · maks{' '}
                        {maks}
                        <input
                          type="file"
                          accept="image/jpeg,image/png"
                          multiple
                          hidden
                          disabled={busy}
                          onChange={(e) => {
                            handleFiles(doc, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    ) : (
                      <span className={`text-[11px] ${T.inkMuted}`}>Maks {maks} foto tercapai</span>
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
                        <FotoBerkas foto={f} />
                        <div
                          className={`px-1.5 py-[5px] text-[10.5px] truncate ${T.ink2}`}
                          title={f.nama}
                        >
                          {f.nama}
                        </div>
                        <button
                          type="button"
                          title="Hapus foto"
                          aria-label={`Hapus foto ${f.nama}`}
                          onClick={(e) =>
                            hapusBaris(e.currentTarget.parentElement, () => removeFile(doc, f), {
                              geser: false,
                            })
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
