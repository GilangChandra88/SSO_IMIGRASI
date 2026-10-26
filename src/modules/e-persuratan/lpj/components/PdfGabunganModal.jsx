import React, { useRef } from 'react';
import { FaCircleNotch, FaDownload, FaPrint, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { BTN, FONT, T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';

/**
 * Popup "Cetak Semua": PDF gabungan satu fase ditampilkan di penampil PDF browser (tanpa panel
 * daftar halaman), dengan tombol Cetak & Unduh. Selama `url` belum ada, tampil "Menyiapkan…".
 */
export default function PdfGabunganModal({ label, url, namaBerkas, onClose }) {
  const bingkaiRef = useRef(null);

  function cetak() {
    try {
      bingkaiRef.current?.contentWindow?.focus();
      bingkaiRef.current?.contentWindow?.print();
    } catch {
      // Penampil PDF tidak mengizinkan cetak dari skrip: buka di tab baru sebagai cadangan
      window.open(url, '_blank', 'noopener');
    }
  }

  return (
    <Modal widthClass="max-w-[960px]" onClose={onClose} labelledBy="judul-cetak-semua" dariTombol>
      <div
        className={`flex items-center justify-between gap-3 px-[22px] py-[18px] border-b ${T.border}`}
      >
        <h3
          id="judul-cetak-semua"
          className={`${FONT.head} font-bold text-[15px] truncate ${T.ink}`}
        >
          {label}
        </h3>
        <button type="button" onClick={onClose} aria-label="Tutup" className={T.inkMuted}>
          <FaTimes size={15} />
        </button>
      </div>

      <div className="p-3 sm:p-[18px]">
        {url ? (
          <iframe
            ref={bingkaiRef}
            src={`${url}#toolbar=1&navpanes=0&view=FitH`}
            title={label}
            className={`block w-full h-[72vh] rounded-lg border ${T.border} bg-white ${ANIM.muncul}`}
          />
        ) : (
          <div
            className={`flex flex-col items-center justify-center gap-2.5 h-[40vh] text-[13px] ${T.inkMuted}`}
          >
            <FaCircleNotch size={22} className="animate-spin" />
            Menyiapkan dokumen…
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 px-[22px] pb-[22px]">
        <button type="button" className={BTN.ghost} onClick={onClose}>
          Tutup
        </button>
        {url && (
          <>
            <a href={url} download={namaBerkas} className={BTN.ghost}>
              <FaDownload size={12} /> Unduh
            </a>
            <button type="button" className={BTN.primaryDark} onClick={cetak}>
              <FaPrint size={12} /> Cetak
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
