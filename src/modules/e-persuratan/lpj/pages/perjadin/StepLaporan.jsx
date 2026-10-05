import React, { useState } from 'react';
import { FaCircleNotch, FaRegSave, FaRegTrashAlt, FaUpload } from 'react-icons/fa';
import { LAP_FOTO_MAX_BYTES, LAP_FOTO_MAX_COUNT, LAP_SECTIONS } from '../../data/masterLpj';
import { formatTanggal } from '../../utils/formatTanggal';
import { deleteLpjFile, pesanGagalUnggah, uploadLpjFile } from '../../services/lpjStorage';
import Field from '../../ui/Field';
import { BTN, FORM, T } from '../../ui/tokens';

/** Fase 4 — Laporan Kegiatan + foto dokumentasi, lalu berkas diselesaikan. */
export default function StepLaporan({ ctx }) {
  const { pack, pf, setPf, errors, setErrors, persist, askConfirm, closeConfirm, showToast, user } =
    ctx;
  const { sp, spd, lap } = pf;
  const fotos = lap.fotos || [];
  const fotoRoom = LAP_FOTO_MAX_COUNT - fotos.length;
  const [uploading, setUploading] = useState(false);
  const setLap = (patch) => setPf((prev) => ({ ...prev, lap: { ...prev.lap, ...patch } }));

  async function handleFotoFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = LAP_FOTO_MAX_COUNT - (ctx.pfRef.current.lap.fotos || []).length;
    if (room <= 0) {
      setErrors({
        ...errors,
        fotoData: `Sudah mencapai batas maksimal ${LAP_FOTO_MAX_COUNT} foto.`,
      });
      return;
    }
    let skippedType = false;
    let skippedSize = false;
    let skippedRoom = false;
    const toAdd = [];
    files.forEach((f) => {
      if (toAdd.length >= room) {
        skippedRoom = true;
        return;
      }
      if (!f.type.startsWith('image/')) {
        skippedType = true;
        return;
      }
      if (f.size > LAP_FOTO_MAX_BYTES) {
        skippedSize = true;
        return;
      }
      toAdd.push(f);
    });
    if (!toAdd.length) {
      setErrors({
        ...errors,
        fotoData: skippedSize
          ? 'Ukuran foto melebihi 200KB.'
          : skippedType
            ? 'File harus berupa gambar (JPG/PNG).'
            : 'Tidak ada foto yang bisa ditambahkan.',
      });
      return;
    }

    setUploading(true);
    try {
      const metas = [];
      for (const f of toAdd) {
        metas.push(await uploadLpjFile(pack.id, 'laporan-foto', f, user.uid));
      }
      await persist(
        (prev) => ({
          ...prev,
          lap: { ...prev.lap, fotos: [...(prev.lap.fotos || []), ...metas] },
        }),
        { quiet: true, teks: `mengunggah ${metas.length} foto kegiatan` },
      );
      setErrors({
        ...errors,
        fotoData:
          skippedRoom || skippedType || skippedSize
            ? 'Sebagian file dilewati (format/ukuran/slot tidak sesuai).'
            : undefined,
      });
    } catch (err) {
      console.error('upload foto error:', err);
      setErrors({ ...errors, fotoData: pesanGagalUnggah(err) });
    } finally {
      setUploading(false);
    }
  }

  async function hapusFoto(foto) {
    try {
      await deleteLpjFile(foto.path);
      await persist(
        (prev) => ({
          ...prev,
          lap: { ...prev.lap, fotos: (prev.lap.fotos || []).filter((f) => f.path !== foto.path) },
        }),
        { quiet: true },
      );
    } catch (err) {
      console.error('hapus foto error:', err);
      showToast('Gagal menghapus foto.', 'error');
    }
  }

  function handleSelesai() {
    const e = {};
    if (!lap.tanggalLaporan) e.tanggalLaporan = 'Wajib diisi';
    LAP_SECTIONS.forEach(([key, , required]) => {
      if (required && !String(lap[key] || '').trim()) e[key] = 'Wajib diisi';
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    askConfirm({
      label: 'Laporan Kegiatan',
      onYes: async () => {
        const ok = await persist(
          (prev) => ({
            ...prev,
            lap: { ...prev.lap, locked: true },
            selesai: { ...prev.selesai, laporan: true },
          }),
          { quiet: true, teks: `menyelesaikan berkas ${pack.id}`, extra: { status: 'selesai' } },
        );
        closeConfirm();
        if (ok) {
          showToast('Berkas LPJ berhasil diselesaikan.');
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
            <strong>{sp.kepada.map((p) => p.nama).join(', ') || '—'}</strong>
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
        {LAP_SECTIONS.map(([key, label, required]) => (
          <Field
            key={key}
            label={label}
            htmlFor={`lap-${key}`}
            required={required}
            err={errors[key]}
          >
            <textarea
              id={`lap-${key}`}
              value={lap[key]}
              onChange={(e) => setLap({ [key]: e.target.value })}
              className={`${FORM.textarea} !min-h-[90px] ${errors[key] ? FORM.borderErr : FORM.borderOk}`}
            />
          </Field>
        ))}
      </div>

      <div className={FORM.card}>
        <h3 className={`${FORM.cardTitle} mb-1`}>Lampiran Foto Kegiatan</h3>
        <p className={`text-xs mb-3.5 ${T.ink2}`}>
          Unggah foto dokumentasi kegiatan · JPG/PNG · maks. 200KB per foto · maksimal{' '}
          {LAP_FOTO_MAX_COUNT} foto ({fotos.length}/{LAP_FOTO_MAX_COUNT})
        </p>
        {fotos.length > 0 && (
          <div
            className={`grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2.5 ${fotoRoom > 0 ? 'mb-2.5' : ''}`}
          >
            {fotos.map((f) => (
              <div
                key={f.path}
                className={`relative rounded-[10px] border overflow-hidden ${T.border} ${T.surface2}`}
              >
                <a href={f.url} target="_blank" rel="noreferrer">
                  <img src={f.url} alt={f.name} className="block w-full h-24 object-cover" />
                </a>
                <div className={`px-1.5 py-[5px] text-[10.5px] truncate ${T.ink2}`} title={f.name}>
                  {f.name}
                </div>
                <button
                  type="button"
                  title="Hapus foto"
                  aria-label={`Hapus foto ${f.name}`}
                  onClick={() => hapusFoto(f)}
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
              accept="image/*"
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
              JPG atau PNG, maksimal 200KB per foto — bisa pilih beberapa sekaligus
            </div>
          </label>
        ) : (
          <p className={`text-[11.5px] ${T.inkMuted}`}>
            Sudah mencapai batas maksimal {LAP_FOTO_MAX_COUNT} foto.
          </p>
        )}
        {errors.fotoData && <p className={FORM.err}>{errors.fotoData}</p>}
      </div>

      <div className="flex flex-wrap justify-end items-center gap-2 pb-6">
        <button type="button" className={BTN.warn} onClick={() => persist(ctx.pfRef.current)}>
          <FaRegSave size={13} /> Simpan Draft
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
