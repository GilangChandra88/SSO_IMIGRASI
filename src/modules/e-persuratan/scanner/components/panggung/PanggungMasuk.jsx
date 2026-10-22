import React from 'react';
import { FaStop } from 'react-icons/fa';
import { BTN, FONT, STATUS, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import FigurPanggung from './FigurPanggung';

const JUDUL = {
  scan: (nama) => `Memindai dari ${nama}`,
  pdf: (nama) => `Memecah ${nama}`,
  gambar: (nama) => `Mengimpor ${nama}`,
};

/**
 * Panggung animasi halaman masuk di panel tengah: figur sesuai sumber (maskot scanner,
 * dokumen PDF, bingkai gambar) + keterangan + tombol Hentikan. `besar` = tampilan tengah
 * kanvas kosong; selain itu kartu ringkas yang melayang di bawah kanvas.
 * `menata` = berkas sudah terbaca tetapi halamannya masih ditampilkan satu per satu (`sisa`).
 * Setelah selesai, tampil sebentar "✓ N halaman masuk" (diatur `usePanggung`).
 */
export default function PanggungMasuk({
  mode,
  nama,
  jumlah,
  selesai,
  menata,
  sisa = 0,
  hentikan,
  besar = false,
}) {
  const judul = selesai
    ? 'Selesai'
    : menata
      ? 'Menampilkan ke kanvas'
      : (JUDUL[mode] || JUDUL.scan)(nama || 'scanner');
  const sub = selesai
    ? `${jumlah} halaman masuk ke kanvas`
    : menata
      ? `Halaman ${Math.max(1, jumlah - sisa + 1)} dari ${jumlah}…`
      : jumlah
        ? `${jumlah} halaman masuk${sisa > 1 ? ` · ${sisa} menunggu tampil` : '…'}`
        : mode === 'scan'
          ? 'Menyiapkan scanner…'
          : 'Membaca berkas…';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${FONT.body} ${ANIM.naik} ${
        besar
          ? 'flex flex-col items-center gap-3 text-center'
          : `flex items-center gap-3 rounded-[16px] border pl-2 pr-3.5 py-2 max-w-full ${T.surface} ${T.border} shadow-[0_12px_32px_-8px_rgba(15,32,64,.35)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,.6)]`
      }`}
    >
      {/* Versi ringkas: figur diperkecil 75% (margin negatif menyusutkan ruang tata letaknya) */}
      <div className={besar ? '' : '-mx-4 -my-3.5 scale-75'}>
        <FigurPanggung mode={mode} jumlah={jumlah} selesai={selesai} />
      </div>
      <div className={`min-w-0 ${besar ? '' : 'flex-1'}`}>
        <p
          className={`font-bold truncate ${besar ? `${FONT.head} text-[15px]` : 'text-[13px]'} ${
            selesai ? STATUS.goodInk : T.ink
          }`}
        >
          {judul}
        </p>
        <p className={`text-[12px] mt-0.5 ${T.inkMuted}`}>{sub}</p>
        {!selesai && hentikan && (
          <button type="button" className={`${BTN.danger} mt-2`} onClick={hentikan}>
            <FaStop size={9} /> Hentikan
          </button>
        )}
      </div>
    </div>
  );
}
