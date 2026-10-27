import React, { useEffect, useMemo, useState } from 'react';
import { FaCheck, FaCircleNotch, FaRegFilePdf, FaTimes, FaUpload } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { LAP_BUKTI_JENIS } from '../data/masterLpj';
import { tambahBuktiPengeluaran } from '../hooks/useLPJ';
import { pesanGagalUnggah, uploadLpjFile, validasiBerkas } from '../services/lpjStorage';
import { BTN, FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

const LABEL_JENIS = Object.fromEntries(LAP_BUKTI_JENIS);

// Bukti pengeluaran hanya JPG, PNG, atau PDF (diperiksa dari jenis MIME, cadangan ekstensi)
const TIPE_BOLEH = ['image/jpeg', 'image/png', 'application/pdf'];
const EKSTENSI_BOLEH = /\.(jpe?g|png|pdf)$/i;
const ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

function cekBerkas(f) {
  const tipeSah = f.type ? TIPE_BOLEH.includes(f.type) : EKSTENSI_BOLEH.test(f.name);
  if (!tipeSah) return 'File harus berupa JPG, PNG, atau PDF.';
  return validasiBerkas(f); // ukuran < 5 MB
}

/**
 * Popup unggah satu bukti pengeluaran untuk `pelaksana`: pilih label (bawaan = label pertama yang
 * belum ada buktinya; label yang sudah ada tidak bisa dipilih) dan berkasnya — seret-lepas ke area
 * unggah atau klik untuk memilih. JPG/PNG/PDF < 5 MB.
 */
export default function ModalUnggahBukti({ pack, pelaksana, terpakai, user, showToast, onClose }) {
  const sudah = useMemo(() => new Set(terpakai), [terpakai]);
  const [jenis, setJenis] = useState(() => LAP_BUKTI_JENIS.find(([k]) => !sudah.has(k))?.[0] || '');
  const [file, setFile] = useState(null);
  const [seret, setSeret] = useState(false); // berkas sedang diseret di atas area unggah
  const [galat, setGalat] = useState('');
  const [persen, setPersen] = useState(null); // progres unggah (null = belum mengunggah)
  const sibuk = persen !== null;

  // Pratinjau berkas terpilih (gambar) lewat URL sementara
  const pratinjau = useMemo(
    () => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => () => pratinjau && URL.revokeObjectURL(pratinjau), [pratinjau]);

  function pilih(f) {
    if (!f) return;
    const salah = cekBerkas(f);
    setGalat(salah);
    setFile(salah ? null : f);
  }

  async function unggah() {
    if (!jenis || !file || sibuk) return;
    if (sudah.has(jenis)) {
      setGalat(`Bukti ${LABEL_JENIS[jenis]} sudah ada. Hapus dulu bila ingin menggantinya.`);
      return;
    }
    setGalat('');
    setPersen(0);
    try {
      const meta = await uploadLpjFile(pack.id, `laporan-bukti/${pelaksana.id}`, file, user.uid, {
        onProgress: (p) => setPersen(Math.round(p)),
      });
      await tambahBuktiPengeluaran(pack, pelaksana.id, [{ ...meta, jenis }], {
        teks: `mengunggah bukti ${LABEL_JENIS[jenis]} ${pelaksana.nama}`,
        uid: user.uid,
        nama: user.nama,
      });
      showToast?.(`Bukti ${LABEL_JENIS[jenis]} ${pelaksana.nama} terunggah.`);
      onClose();
    } catch (err) {
      console.error('upload bukti pengeluaran error:', err);
      setGalat(pesanGagalUnggah(err));
      setPersen(null);
    }
  }

  return (
    <Modal
      widthClass="max-w-[520px]"
      onClose={sibuk ? undefined : onClose}
      labelledBy="judul-unggah-bukti"
      dariTombol
    >
      <div
        className={`flex items-center justify-between gap-3 px-[22px] py-[18px] border-b ${T.border}`}
      >
        <div className="min-w-0">
          <h3 id="judul-unggah-bukti" className={`${FONT.head} font-bold text-[15px] ${T.ink}`}>
            Unggah Bukti Pengeluaran
          </h3>
          <p className={`text-[12px] mt-0.5 truncate ${T.inkMuted}`}>{pelaksana.nama}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={sibuk}
          aria-label="Tutup"
          className={T.inkMuted}
        >
          <FaTimes size={15} />
        </button>
      </div>

      <div className="p-[22px] flex flex-col gap-4">
        {/* Label: satu berkas per label */}
        <div>
          <div className={`text-[12px] font-semibold mb-2 ${T.ink2}`}>Label bukti</div>
          <div role="radiogroup" aria-label="Label bukti" className="grid grid-cols-2 gap-2">
            {LAP_BUKTI_JENIS.map(([k, label]) => {
              const ada = sudah.has(k);
              const aktif = jenis === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  disabled={ada || sibuk}
                  onClick={() => setJenis(k)}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left text-[12.5px] font-semibold ${ANIM.tekan} ${
                    aktif
                      ? STATUS.doneOn
                      : ada
                        ? `${T.surface2} ${T.border} ${T.inkMuted} cursor-not-allowed`
                        : `${T.surface} ${T.borderStrong} ${T.ink2} ${T.hoverSurface2}`
                  }`}
                >
                  <span className="truncate">{label}</span>
                  {ada ? (
                    <span className="text-[10.5px] font-medium shrink-0">sudah ada</span>
                  ) : (
                    aktif && <FaCheck size={11} className={`shrink-0 ${ANIM.meletup}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Area unggah: seret-lepas atau klik */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!sibuk) setSeret(true);
          }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSeret(false);
            if (!sibuk) pilih(e.dataTransfer.files?.[0]);
          }}
          className={`block rounded-xl border-2 border-dashed text-center motion-safe:transition-colors motion-safe:duration-150 ${
            sibuk ? 'pointer-events-none opacity-70' : 'cursor-pointer'
          } ${
            seret
              ? 'border-[#2A78D6] bg-[#EAF1FB] dark:border-[#7DB6F3] dark:bg-[rgba(125,182,243,.12)]'
              : `${T.borderStrong} ${T.surface2}`
          }`}
        >
          <input
            type="file"
            accept={ACCEPT}
            hidden
            disabled={sibuk}
            onChange={(e) => {
              pilih(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {file ? (
            <div key={file.name + file.size} className={`p-3 ${ANIM.muncul}`}>
              {pratinjau ? (
                <img
                  src={pratinjau}
                  alt={file.name}
                  className={`mx-auto max-h-48 rounded-lg border object-contain bg-white ${T.border}`}
                />
              ) : (
                <div className={`flex justify-center py-4 ${T.inkMuted}`}>
                  <FaRegFilePdf size={40} />
                </div>
              )}
              <div className={`mt-2 text-[12.5px] font-semibold truncate ${T.ink}`}>
                {file.name}
              </div>
              <div className={`text-[11.5px] ${T.inkMuted}`}>
                Klik atau seret berkas lain untuk mengganti
              </div>
            </div>
          ) : (
            <div className="px-4 py-8">
              <FaUpload size={20} className={`mx-auto mb-2 ${T.inkMuted}`} />
              <div className={`text-[13px] font-semibold ${T.ink}`}>
                Seret berkas ke sini, atau klik untuk memilih
              </div>
              <div className={`text-[11.5px] mt-1 ${T.inkMuted}`}>
                JPG, PNG, atau PDF, kurang dari 5 MB
              </div>
            </div>
          )}
        </label>

        {galat && (
          <p className={`text-[12px] font-semibold ${STATUS.critInk} ${ANIM.muncul}`}>{galat}</p>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 px-[22px] pb-[22px]">
        <button type="button" className={BTN.ghost} onClick={onClose} disabled={sibuk}>
          Batal
        </button>
        <button
          type="button"
          className={`${BTN.primaryDark} disabled:opacity-50`}
          disabled={!jenis || !file || sibuk}
          onClick={unggah}
        >
          {sibuk ? <FaCircleNotch size={12} className="animate-spin" /> : <FaUpload size={12} />}
          {sibuk ? `Mengunggah… ${persen}%` : 'Unggah'}
        </button>
      </div>
    </Modal>
  );
}
