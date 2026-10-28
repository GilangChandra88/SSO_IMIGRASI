import React, { useState } from 'react';
import {
  FaChevronLeft,
  FaCircleNotch,
  FaInfoCircle,
  FaRegSave,
  FaRegTrashAlt,
  FaUpload,
} from 'react-icons/fa';
import { formatUkuran } from '@/utils/berkasStorage';
import { PANJANG } from '@/utils/batas';
import { LAP_PENUTUP_BAKU, LAP_SECTIONS } from '../../data/masterLpj';
import { formatTanggal } from '../../utils/formatTanggal';
import {
  ATURAN_UNGGAHAN,
  DAFTAR_GAMBAR,
  hapusGambar,
  pesanUnggah,
  tambahGambar,
} from '../../services/unggahan';
import FotoBerkas from '../../components/FotoBerkas';
import PegawaiPicker from '../../components/PegawaiPicker';
import PegawaiCards from '../../components/PegawaiCards';
import Field from '../../ui/Field';
import { BTN, FORM, STATUS, T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';

const MAKS_FOTO = DAFTAR_GAMBAR.laporan.maks;
const UKURAN_FOTO = formatUkuran(ATURAN_UNGGAHAN.laporan.maksByte);

// Petunjuk singkat di bawah isian Laporan Kegiatan
const HINT_LAP = {
  hasil: 'Satu baris = satu poin bernomor di Laporan Kegiatan',
  penutup: 'Boleh dikosongkan — dicetak kalimat penutup baku seperti contoh di kolom',
};

/**
 * Fase 4 — Laporan Kegiatan + foto dokumentasi, lalu berkas diselesaikan. Foto langsung tersimpan
 * begitu terunggah (diperkecil otomatis); teks laporan ikut simpan otomatis form.
 */
export default function StepLaporan({ ctx }) {
  const {
    pack,
    pf,
    setPf,
    errors,
    setErrors,
    tandaiGalat,
    persist,
    askConfirm,
    closeConfirm,
    showToast,
    user,
    pegawai,
    loadingPeg,
  } = ctx;
  // Surat Perintah & SPD sudah final; foto selalu dari berkas live
  const sp = pack.sp || {};
  const spd = pack.spd || {};
  const lap = pf.laporan;
  const fotos = pack.laporan?.foto || [];
  const fotoRoom = MAKS_FOTO - fotos.length;
  const [uploading, setUploading] = useState(false);
  const setLap = (patch) => setPf((prev) => ({ ...prev, laporan: { ...prev.laporan, ...patch } }));

  async function handleFotoFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (fotoRoom <= 0) {
      setErrors({ ...errors, fotoData: `Sudah mencapai batas maksimal ${MAKS_FOTO} foto.` });
      return;
    }
    const gambar = files.filter((f) => ATURAN_UNGGAHAN.laporan.tipe.includes(f.type));
    const toAdd = gambar.slice(0, fotoRoom);
    if (!toAdd.length) {
      setErrors({ ...errors, fotoData: 'File harus berupa gambar (JPG/PNG).' });
      return;
    }

    setUploading(true);
    let gagal = '';
    for (const f of toAdd) {
      try {
        await tambahGambar(pack.id, 'laporan', f, user.uid);
      } catch (err) {
        gagal = pesanUnggah(err);
      }
    }
    setUploading(false);
    const dilewati = toAdd.length < files.length;
    setErrors({
      ...errors,
      fotoData:
        gagal ||
        (dilewati ? 'Sebagian file dilewati (bukan JPG/PNG atau melebihi slot).' : undefined),
    });
  }

  async function hapusFoto(foto) {
    try {
      await hapusGambar(pack.id, 'laporan', foto, user.uid);
    } catch (err) {
      showToast(pesanUnggah(err), 'error');
    }
  }

  function handleSelesai() {
    const e = {};
    if (!lap.tanggalLaporan) e.tanggalLaporan = 'Wajib diisi';
    LAP_SECTIONS.forEach(([key, , required]) => {
      if (required && !String(lap[key] || '').trim()) e[key] = 'Wajib diisi';
    });
    if (!lap.penandatangan) e.penandatangan = 'Pilih penanda tangan';
    if (tandaiGalat(e)) return;
    askConfirm({
      label: 'Laporan Kegiatan',
      onYes: async () => {
        // Bagian terakhir dikunci → status berkas "selesai" ditulis Function
        const ok = await persist(ctx.pfRef.current, {
          quiet: true,
          kunci: 'laporan',
          tahanLangkah: true, // tetap di form ini sampai pindah ke Detail LPJ
        });
        closeConfirm();
        if (ok) {
          showToast('Berkas LPJ berhasil diselesaikan.');
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
      <div className={FORM.cardMuted}>
        <div className={`text-[11px] font-bold uppercase tracking-[.06em] mb-1.5 ${T.ink2}`}>
          Konteks · read-only
        </div>
        <div className={`flex flex-wrap gap-x-5 gap-y-1 text-[13px] ${T.ink}`}>
          <span>
            <span className={T.inkMuted}>Tujuan:</span> <strong>{spd.tujuan || '—'}</strong>
          </span>
          <span>
            <span className={T.inkMuted}>Tanggal:</span>{' '}
            <strong>
              {formatTanggal(spd.berangkat)} s/d {formatTanggal(spd.kembali)}
            </strong>
          </span>
          <span>
            <span className={T.inkMuted}>Pelaksana:</span>{' '}
            <strong>{(sp.kepada || []).map((p) => p.nama).join(', ') || '—'}</strong>
          </span>
        </div>
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Laporan Kegiatan Perjalanan Dinas</h3>
        <Field label="Tanggal Laporan" htmlFor="lap-tanggal" required err={errors.tanggalLaporan}>
          <input
            id="lap-tanggal"
            type="date"
            value={lap.tanggalLaporan}
            onChange={(e) => setLap({ tanggalLaporan: e.target.value })}
            className={`${FORM.input} ${errors.tanggalLaporan ? FORM.borderErr : FORM.borderOk} max-w-[240px]`}
          />
        </Field>
        <p
          className={`flex items-start gap-2 px-3 py-2 mb-3.5 rounded-lg border text-xs ${STATUS.infoBg} ${STATUS.infoBorder} ${STATUS.infoInk}`}
        >
          <FaInfoCircle size={13} className="shrink-0 mt-px" />
          <span>
            A.4 Dasar, B.1 Pelaksana Kegiatan, dan B.2 Waktu dan Tempat Kegiatan terisi otomatis
            dari Surat Perintah &amp; SPD.
          </span>
        </p>
        {LAP_SECTIONS.map(([key, label, required]) => (
          <Field
            key={key}
            label={label}
            htmlFor={`lap-${key}`}
            required={required}
            err={errors[key]}
            hint={HINT_LAP[key]}
          >
            {/* Tinggi kolom mengikuti panjang teks (tanpa gulir di dalam kolom) */}
            <textarea
              id={`lap-${key}`}
              value={lap[key] || ''}
              maxLength={PANJANG.teksLaporan}
              placeholder={key === 'penutup' ? LAP_PENUTUP_BAKU : undefined}
              onChange={(e) => setLap({ [key]: e.target.value })}
              className={`${FORM.textarea} !min-h-[90px] field-sizing-content ${errors[key] ? FORM.borderErr : FORM.borderOk}`}
            />
          </Field>
        ))}
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-4`}>Penanda Tangan Laporan</h3>
        <Field label="Pegawai" required err={errors.penandatangan}>
          <PegawaiPicker
            pegawai={pegawai}
            loading={loadingPeg}
            selected={lap.penandatangan ? [lap.penandatangan] : []}
            onChange={(refs) => setLap({ penandatangan: refs[refs.length - 1] || null })}
            err={!!errors.penandatangan}
          />
        </Field>
        {lap.penandatangan && (
          <div className="mb-3.5">
            <PegawaiCards
              list={[lap.penandatangan]}
              onHapus={() => setLap({ penandatangan: null })}
            />
          </div>
        )}
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-1`}>Lampiran Foto Kegiatan</h3>
        <p className={`text-xs mb-3.5 ${T.ink2}`}>
          Unggah foto dokumentasi kegiatan · JPG/PNG · diperkecil otomatis ke maks. {UKURAN_FOTO}{' '}
          per foto · maksimal {MAKS_FOTO} foto ({fotos.length}/{MAKS_FOTO})
        </p>
        {fotos.length > 0 && (
          <div
            className={`grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2.5 ${fotoRoom > 0 ? 'mb-2.5' : ''}`}
          >
            {fotos.map((f) => (
              <div
                key={f.path}
                className={`relative rounded-[10px] border overflow-hidden ${ANIM.meletup} ${T.border} ${T.surface2}`}
              >
                <FotoBerkas foto={f} />
                <div className={`px-1.5 py-[5px] text-[10.5px] truncate ${T.ink2}`} title={f.nama}>
                  {f.nama}
                </div>
                <button
                  type="button"
                  title="Hapus foto"
                  aria-label={`Hapus foto ${f.nama}`}
                  onClick={(e) =>
                    hapusBaris(e.currentTarget.parentElement, () => hapusFoto(f), { geser: false })
                  }
                  className="absolute top-[5px] right-[5px] w-[26px] h-[26px] rounded-full bg-[rgba(15,20,30,.65)] text-white flex items-center justify-center"
                >
                  <FaRegTrashAlt size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {fotoRoom > 0 ? (
          <label
            className={`block rounded-[10px] border-2 border-dashed text-center cursor-pointer ${
              fotos.length ? 'p-4' : 'p-[26px]'
            } ${T.borderStrong} ${T.surface2} ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => {
                handleFotoFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className={`flex justify-center mb-2 ${T.inkMuted}`}>
              {uploading ? (
                <FaCircleNotch className="animate-spin" size={16} />
              ) : (
                <FaUpload size={16} />
              )}
            </div>
            <div className={`text-[13.5px] font-semibold ${T.ink}`}>
              {uploading
                ? 'Mengunggah foto…'
                : fotos.length
                  ? `Tambah foto lagi (${fotoRoom} slot tersisa)`
                  : 'Klik untuk upload foto kegiatan'}
            </div>
            <div className={`text-xs mt-1 ${T.inkMuted}`}>
              JPG atau PNG, diperkecil otomatis — bisa pilih beberapa sekaligus
            </div>
          </label>
        ) : (
          <p className={`text-[11.5px] ${T.inkMuted}`}>
            Sudah mencapai batas maksimal {MAKS_FOTO} foto.
          </p>
        )}
        {errors.fotoData && <p className={FORM.err}>{errors.fotoData}</p>}
      </div>

      <div className="flex flex-wrap justify-end items-center gap-2 pb-6">
        {/* Isian sudah tersimpan otomatis; tombol ini menyimpan sisa perubahan lalu kembali */}
        <button type="button" className={BTN.ghost} onClick={ctx.backToDetail}>
          <FaChevronLeft size={12} /> Kembali ke Detail LPJ
        </button>
        <button
          type="button"
          className={BTN.primaryDark}
          onClick={handleSelesai}
          disabled={uploading}
        >
          <FaRegSave size={13} /> Simpan &amp; Selesaikan Berkas
        </button>
      </div>
    </>
  );
}
