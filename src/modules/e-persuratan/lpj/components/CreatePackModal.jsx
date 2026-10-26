import React, { useEffect, useRef, useState } from 'react';
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaCircleNotch,
  FaFolderPlus,
  FaPlaneDeparture,
  FaReceipt,
  FaTimes,
} from 'react-icons/fa';
import { createLPJPack, idBerkasBaru } from '../hooks/useLPJ';
import { URAIAN_MAX } from '../data/masterLpj';
import { kurangiGerakan } from '@/utils/animasi';
import Modal from '@/components/Modal';
import { gulirKeGalat } from '../../gulirPintar';
import { BTN, FONT, FORM, NAVY, STATUS, T } from '@/utils/uiTokens';

const CARDS = [
  {
    type: 'perjadin',
    name: 'LPJ Perjadin',
    desc: 'Perjalanan dinas — Surat Perintah, SPD, sampai SPBy & laporan kegiatan.',
    Icon: FaPlaneDeparture,
    tile: NAVY.gradient,
    fase: ['Surat Perintah', 'SPD', 'LPJ & SPBy', 'Laporan'],
    // urutan muncul kartu (berurutan)
    delay: 'motion-safe:delay-100',
  },
  {
    type: 'non-perjadin',
    name: 'LPJ Non-Perjadin',
    desc: 'Kegiatan selain perjalanan dinas — SPBy, rincian bayar, & lampiran bukti.',
    Icon: FaReceipt,
    tile: 'bg-gradient-to-r from-[#A97C24] to-[#C9973B]',
    fase: ['SPBy & Rincian', 'Lampiran'],
    delay: 'motion-safe:delay-200',
  },
];

// Pegas kecil (melenting) untuk semua animasi muncul di jendela ini
const PEGAS = 'motion-safe:ease-[cubic-bezier(.34,1.56,.64,1)]';
const MASUK_KARTU = `motion-safe:transition-[opacity,translate,scale] motion-safe:duration-500 ${PEGAS} motion-safe:starting:opacity-0 motion-safe:starting:translate-y-5 motion-safe:starting:scale-95`;

/**
 * Jendela "Buat Berkas Baru" (TypeModal purwarupa), dua langkah:
 * 1) pilih jenis LPJ (Perjadin / Non-Perjadin), 2) isi uraian kegiatan → berkas dibuat, lalu
 * onCreated dipanggil (induk menutup jendela dan menganimasikan berkas masuk ke Daftar LPJ).
 * `onAkanDibuat(id)` dipanggil sebelum berkas ditulis, `onGagal(id)` bila gagal.
 * @param {{ onClose, onCreated: (id) => void, onAkanDibuat, onGagal, uid, nama, pegawaiLogin }} props
 */
export default function CreatePackModal({
  onClose,
  onCreated,
  onAkanDibuat,
  onGagal,
  uid,
  nama,
  pegawaiLogin,
}) {
  const [langkah, setLangkah] = useState(1);
  const [arah, setArah] = useState('maju'); // arah geser isi saat pindah langkah
  const [type, setType] = useState('');
  const [uraian, setUraian] = useState('');
  const [errUraian, setErrUraian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errSubmit, setErrSubmit] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const kartu = CARDS.find((c) => c.type === type);

  function pilih(t) {
    setType(t);
    clearTimeout(timer.current);
    // beri waktu kartu terpilih "meletup" sebelum pindah ke langkah uraian
    timer.current = setTimeout(
      () => {
        setArah('maju');
        setLangkah(2);
      },
      kurangiGerakan() ? 0 : 260,
    );
  }

  function kembali() {
    clearTimeout(timer.current);
    setArah('mundur');
    setLangkah(1);
    setErrSubmit('');
  }

  async function handleBuat() {
    const val = uraian.trim().slice(0, URAIAN_MAX);
    if (!val) {
      setErrUraian(true);
      gulirKeGalat();
      return;
    }
    setBusy(true);
    setErrSubmit('');
    const id = idBerkasBaru();
    onAkanDibuat?.(id);
    try {
      await createLPJPack({ id, jenis: type, uraian: val, uid, nama, pegawaiLogin });
      onCreated(id);
    } catch (err) {
      console.error('createLPJPack error:', err);
      onGagal?.(id);
      setErrSubmit('Gagal membuat berkas. Periksa koneksi lalu coba lagi.');
      setBusy(false);
    }
  }

  // Isi langkah dipasang ulang (key) agar animasi geser masuk berjalan setiap pindah langkah
  const geserMasuk = `motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:opacity-0 ${
    arah === 'maju' ? 'motion-safe:starting:translate-x-6' : 'motion-safe:starting:-translate-x-6'
  }`;

  return (
    <Modal
      onClose={busy ? undefined : onClose}
      widthClass="max-w-[600px]"
      labelledBy="judul-buat"
      animasi
    >
      {/* Kepala */}
      <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-1">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-10 h-10 shrink-0 rounded-xl grid place-items-center text-white ${NAVY.gradient} motion-safe:transition-[rotate,scale] motion-safe:duration-700 motion-safe:delay-150 ${PEGAS} motion-safe:starting:-rotate-[25deg] motion-safe:starting:scale-50`}
          >
            <FaFolderPlus size={17} />
          </span>
          <div className="min-w-0">
            <h2 id="judul-buat" className={`${FONT.head} font-extrabold text-[17px] ${T.ink}`}>
              Buat Berkas Baru
            </h2>
            <p className={`mt-0.5 text-[12.5px] ${T.ink2}`}>
              {langkah === 1
                ? 'Langkah 1 dari 2 — pilih jenis LPJ'
                : 'Langkah 2 dari 2 — isi uraian kegiatan'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Tutup"
          className={`p-1 leading-none rounded-lg ${T.inkMuted} ${T.hoverSurface2}`}
        >
          <FaTimes size={17} />
        </button>
      </div>

      {/* Indikator langkah */}
      <div className="flex items-center gap-2 px-6 pt-3">
        {[1, 2].map((n) => (
          <span
            key={n}
            className={`w-8 h-1.5 rounded-full origin-left motion-safe:transition-[scale,background-color] motion-safe:duration-300 ${
              n === langkah ? 'bg-[#0f2040] dark:bg-[#7DB6F3]' : `scale-x-[.4] ${T.bgBorder}`
            }`}
          />
        ))}
      </div>
      <div className={`h-px mt-3.5 ${T.bgBorder}`} />

      <div className="overflow-x-clip">
        {langkah === 1 ? (
          <div key="langkah-1" className={`px-6 pt-4 pb-6 ${geserMasuk}`}>
            <div className="grid grid-cols-1 min-[560px]:grid-cols-2 gap-3">
              {CARDS.map((c) => (
                <div key={c.type} className={`${MASUK_KARTU} ${c.delay}`}>
                  <KartuJenis
                    kartu={c}
                    aktif={type === c.type}
                    fokusAwal={arah === 'mundur' && type === c.type}
                    onPilih={() => pilih(c.type)}
                  />
                </div>
              ))}
            </div>
            <p className={`mt-3.5 text-[11.5px] ${T.inkMuted}`}>
              Nomor LPJ terbit otomatis setelah SPBy selesai dibuat.
            </p>
          </div>
        ) : (
          <div key="langkah-2" className={`px-6 pt-4 ${geserMasuk}`}>
            <div
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${T.border} ${T.surface2}`}
            >
              <span
                className={`w-9 h-9 shrink-0 rounded-[10px] grid place-items-center text-white ${kartu.tile}`}
              >
                <kartu.Icon size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] font-bold ${T.ink}`}>{kartu.name}</div>
                <div className={`text-[11.5px] ${T.inkMuted}`}>{kartu.fase.length} fase</div>
              </div>
              <button
                type="button"
                onClick={kembali}
                disabled={busy}
                className={`inline-flex items-center gap-1.5 text-[12.5px] font-bold ${STATUS.infoInk} hover:underline`}
              >
                <FaArrowLeft size={10} /> Ganti
              </button>
            </div>

            <div className="pt-4 pb-1">
              <label htmlFor="uraian-kegiatan" className={FORM.label}>
                Uraian Kegiatan <span className="text-[#ef4444]">*</span>
              </label>
              <textarea
                id="uraian-kegiatan"
                rows={3}
                autoFocus
                maxLength={URAIAN_MAX}
                placeholder={
                  type === 'perjadin'
                    ? 'Contoh: Koordinasi teknis keimigrasian ke Direktorat Jenderal Imigrasi Jakarta'
                    : 'Contoh: Pengadaan alat tulis kantor untuk kegiatan pelayanan paspor'
                }
                value={uraian}
                onChange={(e) => {
                  setUraian(e.target.value);
                  setErrUraian(false);
                }}
                aria-invalid={errUraian || undefined}
                className={`${FORM.textarea} ${errUraian ? FORM.borderErr : FORM.borderOk}`}
              />
              <div className="flex justify-between gap-2.5 mt-1.5">
                <p className={`text-[11.5px] ${T.inkMuted}`}>
                  Uraian singkat ini tampil sebagai judul pada Detail Dokumen dan Daftar LPJ.
                </p>
                <p className={`text-[11.5px] whitespace-nowrap ${T.inkMuted}`}>
                  {uraian.length}/{URAIAN_MAX}
                </p>
              </div>
              {errUraian && <p className={FORM.err}>Uraian kegiatan wajib diisi.</p>}
            </div>

            {errSubmit && (
              <p
                role="alert"
                className={`mt-3 px-3 py-2 rounded-lg text-[12.5px] ${STATUS.critBg} ${STATUS.critInk}`}
              >
                {errSubmit}
              </p>
            )}
            <div className="flex justify-between gap-2 pt-4 pb-6">
              <button type="button" className={BTN.ghost} onClick={kembali} disabled={busy}>
                <FaArrowLeft size={11} /> Kembali
              </button>
              <button
                type="button"
                className={BTN.primaryDark}
                onClick={handleBuat}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <FaCircleNotch className="animate-spin" size={12} /> Membuat...
                  </>
                ) : (
                  <>
                    Buat Berkas <FaArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Kartu pilihan jenis LPJ: ubin ikon, ikon hiasan, garis fase, efek angkat & centang. */
function KartuJenis({ kartu, aktif, fokusAwal, onPilih }) {
  const { Icon } = kartu;
  return (
    <button
      type="button"
      aria-pressed={aktif}
      autoFocus={fokusAwal}
      onClick={onPilih}
      className={`group relative w-full h-full overflow-hidden text-left px-4 pt-4 pb-3.5 rounded-2xl border-2 motion-safe:transition-[translate,box-shadow,border-color,background-color,scale] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-1 motion-safe:active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A78D6] ${
        aktif
          ? `${NAVY.border} dark:border-[#7DB6F3] ${T.surface2} shadow-[0_10px_26px_-10px_rgba(15,32,64,.45)] motion-safe:scale-[1.02]`
          : `border-transparent ${T.surface2} hover:border-[#CBD3DE] dark:hover:border-[#304864] hover:shadow-[0_10px_24px_-12px_rgba(16,26,44,.35)]`
      }`}
    >
      {/* Ikon besar samar sebagai hiasan */}
      <Icon
        size={92}
        aria-hidden="true"
        className={`absolute -right-4 -bottom-5 opacity-[.07] dark:opacity-[.1] rotate-[-12deg] ${T.ink} motion-safe:transition-[rotate,translate] motion-safe:duration-500 motion-safe:group-hover:rotate-0 motion-safe:group-hover:-translate-x-1`}
      />

      {/* Centang terpilih: meletup */}
      {aktif && (
        <span
          className={`absolute top-3 right-3 w-6 h-6 rounded-full grid place-items-center text-white ${NAVY.bg} dark:bg-[#7DB6F3] dark:text-[#0A121D] motion-safe:transition-[scale,rotate] motion-safe:duration-300 ${PEGAS} motion-safe:starting:scale-0 motion-safe:starting:-rotate-90`}
        >
          <FaCheck size={11} />
        </span>
      )}

      <span
        className={`w-11 h-11 rounded-xl grid place-items-center text-white ${kartu.tile} shadow-[0_6px_14px_-6px_rgba(16,26,44,.5)] motion-safe:transition-[rotate,scale] motion-safe:duration-300 ${PEGAS} motion-safe:group-hover:-rotate-[10deg] motion-safe:group-hover:scale-110`}
      >
        <Icon size={18} />
      </span>
      <div className={`relative mt-3 font-bold text-[14.5px] ${T.ink}`}>{kartu.name}</div>
      <div className={`relative mt-1 text-xs leading-[1.5] ${T.ink2}`}>{kartu.desc}</div>

      {/* Garis fase */}
      <div className="relative mt-3.5 flex items-center">
        {kartu.fase.map((f, i) => (
          <React.Fragment key={f}>
            {i > 0 && (
              <span
                className={`flex-1 h-0.5 mx-1 rounded-full ${aktif ? 'bg-[#0f2040] dark:bg-[#7DB6F3]' : T.bgBorder} motion-safe:transition-colors motion-safe:duration-300`}
              />
            )}
            <span
              title={f}
              className={`w-5 h-5 shrink-0 rounded-full grid place-items-center text-[10px] font-extrabold motion-safe:transition-colors motion-safe:duration-300 ${
                aktif
                  ? 'bg-[#0f2040] text-white dark:bg-[#7DB6F3] dark:text-[#0A121D]'
                  : `${T.surface} ${T.ink2} border ${T.border}`
              }`}
            >
              {i + 1}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className={`relative mt-1.5 text-[10.5px] font-semibold truncate ${T.inkMuted}`}>
        {kartu.fase.join(' · ')}
      </div>
    </button>
  );
}
