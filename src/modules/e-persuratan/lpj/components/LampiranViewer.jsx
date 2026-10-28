import React, { useEffect, useState } from 'react';
import {
  FaChevronLeft,
  FaCircleNotch,
  FaExternalLinkAlt,
  FaPrint,
  FaRegFilePdf,
  FaTimes,
} from 'react-icons/fa';
import Modal from '@/components/Modal';
import { bukaBerkas, pesanGagalUnggah } from '@/utils/berkasStorage';
import { showToast } from '@/utils/toastStore';
import { useUrlBerkas } from '@/utils/useUrlBerkas';
import { halamanDariBerkas } from '../utils/halamanBerkas';
import { cetakBlob, pdfGabungan } from '../utils/cetakPdf';
import { BTN, FONT, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

const isGambar = (f) => String(f?.tipe || '').startsWith('image/');

const bukaDiTab = (file) =>
  bukaBerkas(file).catch((err) =>
    showToast(pesanGagalUnggah(err, 'Berkas gagal dibuka.'), 'error'),
  );

/**
 * Menampilkan berkas unggahan (foto/PDF) dari Firebase Storage lewat getBlob() — tanpa link
 * publik. Satu berkas langsung tampil besar (PDF dirender per halaman, juga di HP); banyak berkas
 * tampil sebagai kisi, klik untuk melihat salah satunya.
 * @param {{ label: string, files: { path, nama, tipe }[], onClose }} props  files = Meta berkas
 */
export default function LampiranViewer({ label, files, onClose }) {
  const [dipilih, setDipilih] = useState(files.length === 1 ? 0 : null);
  const file = dipilih === null ? null : files[dipilih];
  const [mencetak, setMencetak] = useState(false);

  /** Cetak berkas yang sedang dilihat (gambar/PDF → PDF A4) tanpa membuka tab baru. */
  async function cetakBerkas() {
    setMencetak(true);
    try {
      const { blob, gagal } = await pdfGabungan([{ kind: 'files', files: [file] }]);
      if (gagal) throw new Error('Berkas tidak bisa diolah untuk dicetak.');
      await cetakBlob(blob);
    } catch {
      bukaDiTab(file); // cadangan: cetak dari penampil bawaan browser di tab baru
    } finally {
      setMencetak(false);
    }
  }

  return (
    <Modal widthClass="max-w-[860px]" onClose={onClose} labelledBy="judul-lampiran" dariTombol>
      <div
        className={`flex items-center justify-between gap-3 px-[22px] py-[18px] border-b ${T.border}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {file && files.length > 1 && (
            <button
              type="button"
              onClick={() => setDipilih(null)}
              aria-label="Kembali ke semua berkas"
              className={`shrink-0 ${T.inkMuted} hover:text-[#0f2040] dark:hover:text-[#7DB6F3]`}
            >
              <FaChevronLeft size={14} />
            </button>
          )}
          <h3
            id="judul-lampiran"
            className={`${FONT.head} font-bold text-[15px] truncate ${T.ink}`}
            title={file?.nama}
          >
            {label}
            {file && files.length > 1 && (
              <span className={`font-medium ${T.inkMuted}`}> · {file.nama}</span>
            )}
          </h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Tutup" className={T.inkMuted}>
          <FaTimes size={15} />
        </button>
      </div>

      <div className="p-[22px]">
        {files.length === 0 ? (
          <p className={`text-center text-[13px] py-8 ${T.inkMuted}`}>
            Belum ada berkas yang diunggah.
          </p>
        ) : file ? (
          <div key={file.path} className={ANIM.muncul}>
            <PratinjauBerkas file={file} />
          </div>
        ) : (
          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${ANIM.muncul}`}>
            {files.map((f, i) => (
              <button
                type="button"
                key={f.path}
                onClick={() => setDipilih(i)}
                className={`group block text-left rounded-[10px] border overflow-hidden ${T.border} ${T.surface2} ${ANIM.tekan}`}
                title="Lihat berkas"
              >
                {isGambar(f) ? (
                  <GambarBerkas file={f} className="w-full h-36 object-cover block" />
                ) : (
                  <div className={`h-36 flex items-center justify-center ${T.inkMuted}`}>
                    <FaRegFilePdf size={40} />
                  </div>
                )}
                <div className={`px-2 py-1.5 text-[11.5px] truncate ${T.ink2}`}>{f.nama}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 px-[22px] pb-[22px]">
        {file && (
          <button type="button" className={BTN.ghost} onClick={() => bukaDiTab(file)}>
            <FaExternalLinkAlt size={11} /> Buka di tab baru
          </button>
        )}
        <button type="button" className={BTN.ghost} onClick={onClose}>
          Tutup
        </button>
        {file && (
          <button
            type="button"
            className={`${BTN.primaryDark} disabled:opacity-60`}
            disabled={mencetak}
            onClick={cetakBerkas}
          >
            {mencetak ? (
              <FaCircleNotch size={12} className="animate-spin" />
            ) : (
              <FaPrint size={12} />
            )}
            {mencetak ? 'Menyiapkan…' : 'Cetak'}
          </button>
        )}
      </div>
    </Modal>
  );
}

/** Gambar dari Storage (URL lokal blob:, dilepas saat komponen dilepas). */
function GambarBerkas({ file, className }) {
  const { url, galat } = useUrlBerkas(file.path);
  if (galat) {
    return (
      <div className={`flex items-center justify-center text-[11.5px] ${T.inkMuted} ${className}`}>
        Gagal memuat gambar
      </div>
    );
  }
  if (!url) return <div className={`animate-pulse ${T.surface2} ${className}`} />;
  return <img src={url} alt={file.nama} className={className} />;
}

/** Pratinjau besar satu berkas: gambar utuh, atau halaman-halaman PDF yang dirender. */
function PratinjauBerkas({ file }) {
  if (isGambar(file)) {
    return (
      <GambarBerkas
        file={file}
        className={`block w-full max-h-[70vh] min-h-40 object-contain rounded-lg border ${T.border} bg-white`}
      />
    );
  }
  return <HalamanPdf file={file} />;
}

function HalamanPdf({ file }) {
  const [hasil, setHasil] = useState({ path: null, halaman: [], galat: null, selesai: false });
  const milikBerkas = hasil.path === file.path;

  useEffect(() => {
    let aktif = true;
    // Halaman tampil satu per satu begitu dirender (tidak menunggu semua halaman)
    const onHalaman = (halaman) =>
      aktif && setHasil({ path: file.path, halaman, galat: null, selesai: false });
    halamanDariBerkas(file, { onHalaman }).then(
      (halaman) => aktif && setHasil({ path: file.path, halaman, galat: null, selesai: true }),
      (err) => {
        if (aktif) setHasil({ path: file.path, halaman: [], galat: err?.message || String(err) });
      },
    );
    return () => {
      aktif = false;
    };
  }, [file]);

  if (milikBerkas && hasil.galat) {
    // Cadangan: penampil PDF bawaan browser di tab baru (berkas tetap lewat getBlob)
    return (
      <div className={`flex flex-col items-center gap-3 py-10 text-center text-[13px] ${T.ink2}`}>
        <p>Pratinjau PDF tidak bisa disiapkan di sini.</p>
        <p className={`text-[11.5px] ${T.inkMuted}`}>Detail: {hasil.galat}</p>
        <button type="button" className={BTN.ghost} onClick={() => bukaDiTab(file)}>
          <FaExternalLinkAlt size={11} /> Buka di tab baru
        </button>
      </div>
    );
  }
  if (!milikBerkas || hasil.halaman.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2.5 py-16 text-[13px] ${T.inkMuted}`}
      >
        <FaCircleNotch size={20} className="animate-spin" />
        Menyiapkan pratinjau…
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {hasil.halaman.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`${file.nama} — halaman ${i + 1}`}
          className={`block w-full rounded-lg border ${T.border} bg-white ${ANIM.muncul}`}
        />
      ))}
      {!hasil.selesai && (
        <div className={`flex items-center justify-center gap-2 py-4 text-[12.5px] ${T.inkMuted}`}>
          <FaCircleNotch size={13} className="animate-spin" /> Menyiapkan halaman berikutnya…
        </div>
      )}
    </div>
  );
}
