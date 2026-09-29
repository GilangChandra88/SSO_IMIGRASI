import React, { useState } from 'react';
import { FaArrowRight, FaCheck, FaCircleNotch, FaTimes } from 'react-icons/fa';
import { createLPJPack } from '../hooks/useLPJ';
import { URAIAN_MAX } from '../data/masterLpj';
import Modal from '../ui/Modal';
import { BTN, FONT, FORM, NAVY, STATUS, T } from '../ui/tokens';

const CARDS = [
  {
    type: 'perjadin',
    name: 'LPJ Perjadin',
    desc: 'Laporan Pertanggungjawaban Perjalanan Dinas — Surat Perintah, SPD, & SPBy',
    badge: '4 Fase',
  },
  {
    type: 'non-perjadin',
    name: 'LPJ Non-Perjadin',
    desc: 'Laporan Pertanggungjawaban Kegiatan Non-Perjalanan Dinas',
    badge: '2 Fase',
  },
];

/**
 * Jendela "Buat Berkas Baru" (TypeModal purwarupa): pilih jenis LPJ + isi uraian kegiatan,
 * lalu berkas dibuat dan pengguna diarahkan ke Detail Dokumen.
 * @param {{ onClose, onCreated: (id) => void, uid, nama, pegawaiLogin }} props
 */
export default function CreatePackModal({ onClose, onCreated, uid, nama, pegawaiLogin }) {
  const [type, setType] = useState('');
  const [uraian, setUraian] = useState('');
  const [errType, setErrType] = useState(false);
  const [errUraian, setErrUraian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errSubmit, setErrSubmit] = useState('');

  async function handleNext() {
    const val = uraian.trim().slice(0, URAIAN_MAX);
    let ok = true;
    if (!type) {
      setErrType(true);
      ok = false;
    } else setErrType(false);
    if (!val) {
      setErrUraian(true);
      ok = false;
    } else setErrUraian(false);
    if (!ok) return;

    setBusy(true);
    setErrSubmit('');
    try {
      const id = await createLPJPack({ jenis: type, uraian: val, uid, nama, pegawaiLogin });
      onCreated(id);
    } catch (err) {
      console.error('createLPJPack error:', err);
      setErrSubmit('Gagal membuat berkas. Periksa koneksi lalu coba lagi.');
      setBusy(false);
    }
  }

  return (
    <Modal onClose={busy ? undefined : onClose} widthClass="max-w-[560px]" labelledBy="judul-buat">
      <div className="flex items-start justify-between px-6 pt-5 pb-1">
        <div>
          <h2 id="judul-buat" className={`${FONT.head} font-extrabold text-[17px] ${T.ink}`}>
            Buat Berkas Baru
          </h2>
          <p className={`mt-1 text-[12.5px] ${T.ink2}`}>Pilih jenis LPJ dan isi uraian kegiatan</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Tutup"
          className={`p-1 leading-none ${T.inkMuted}`}
        >
          <FaTimes size={17} />
        </button>
      </div>
      <div className={`h-px my-3.5 ${T.bgBorder}`} />

      <div className="grid grid-cols-1 min-[560px]:grid-cols-2 gap-3 px-6">
        {CARDS.map((c) => {
          const active = type === c.type;
          return (
            <button
              key={c.type}
              type="button"
              onClick={() => {
                setType(c.type);
                setErrType(false);
              }}
              className={`relative text-left px-3.5 py-4 rounded-xl transition-colors ${
                active
                  ? `border-2 ${NAVY.border} dark:border-[#7DB6F3] ${T.surface2}`
                  : `border ${T.border} ${T.surface} ${T.hoverSurface2}`
              }`}
            >
              {active && (
                <span className={`absolute top-2.5 right-2.5 ${NAVY.text}`}>
                  <FaCheck size={13} />
                </span>
              )}
              <div className={`font-bold text-sm mb-1.5 ${T.ink}`}>{c.name}</div>
              <div className={`text-xs leading-[1.45] mb-2 ${T.ink2}`}>{c.desc}</div>
              <span
                className={`inline-block text-[10.5px] font-bold px-[9px] py-[3px] rounded-full border ${'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] dark:bg-[rgba(57,135,229,.18)] dark:text-[#7DB6F3] dark:border-[rgba(125,182,243,.35)]'}`}
              >
                {c.badge}
              </span>
            </button>
          );
        })}
      </div>
      {errType && (
        <p className={`${FORM.err} px-6 pt-2`}>Pilih salah satu jenis LPJ terlebih dahulu.</p>
      )}

      <div className="px-6 pt-[18px] pb-1">
        <label htmlFor="uraian-kegiatan" className={FORM.label}>
          Uraian Kegiatan <span className="text-[#ef4444]">*</span>
        </label>
        <textarea
          id="uraian-kegiatan"
          rows={3}
          maxLength={URAIAN_MAX}
          placeholder="Contoh: Koordinasi teknis keimigrasian ke Direktorat Jenderal Imigrasi Jakarta"
          value={uraian}
          onChange={(e) => {
            setUraian(e.target.value);
            setErrUraian(false);
          }}
          className={`${FORM.textarea} ${errUraian ? FORM.borderErr : FORM.borderOk}`}
        />
        <div className="flex justify-between gap-2.5 mt-1.5">
          <p className="text-[11.5px] text-[#94a3b8]">
            Uraian singkat ini akan tampil sebagai judul pada Detail Dokumen dan Daftar LPJ.
          </p>
          <p className="text-[11.5px] text-[#94a3b8] whitespace-nowrap">
            {uraian.length}/{URAIAN_MAX}
          </p>
        </div>
        {errUraian && <p className={FORM.err}>Uraian kegiatan wajib diisi.</p>}
      </div>

      {errSubmit && (
        <p
          role="alert"
          className={`mx-6 mt-3 px-3 py-2 rounded-lg text-[12.5px] ${STATUS.critBg} ${STATUS.critInk}`}
        >
          {errSubmit}
        </p>
      )}
      <div className="flex justify-end px-6 pt-4 pb-6">
        <button type="button" className={BTN.primaryDark} onClick={handleNext} disabled={busy}>
          {busy ? (
            <>
              <FaCircleNotch className="animate-spin" size={12} /> Membuat...
            </>
          ) : (
            <>
              Lanjutkan <FaArrowRight size={12} />
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
