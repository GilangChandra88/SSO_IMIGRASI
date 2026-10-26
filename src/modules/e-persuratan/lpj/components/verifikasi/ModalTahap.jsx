import React from 'react';
import { FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { lpjIdLabel, lpjRowTotal, pelaksanaOf, rupiah, uraianOf } from '../../utils/lpjLogic';
import { namaDkk } from '../../utils/verifikasiLogic';
import { IKON_TAHAP, TONE, XLBL } from './tahapTampil';
import { ADMIN, FONT, T } from '@/utils/uiTokens';

/** Kotak angka/teks penting di jendela (.lj-amount-box purwarupa). */
export function KotakNilai({ label, children }) {
  return (
    <div className={`rounded-lg border px-[13px] py-2.5 mb-3 ${T.surface2} ${T.border}`}>
      <div className={`text-[11px] mb-[3px] ${T.inkMuted}`}>{label}</div>
      {children}
    </div>
  );
}

/**
 * Jendela dasar aksi tahap (PgvModal purwarupa): ikon berwarna tahap + judul + ID LPJ.
 * - `gulir`: isi informasi yang bisa digulir di atas, `children` (isian & tombol) tetap di bawah.
 * - tanpa `gulir`: ringkasan Pelaksana / Uraian / Total, lalu `children`.
 */
export default function ModalTahap({
  tahap,
  ikon,
  judul,
  pack,
  onClose,
  sibuk,
  gulir,
  tanpaTotal,
  children,
}) {
  const Ikon = ikon || IKON_TAHAP[tahap];
  const idJudul = `judul-tahap-${tahap}`;
  const tutup = sibuk ? undefined : onClose;
  const nama = pelaksanaOf(pack).map((p) => p.nama);
  return (
    <Modal
      widthClass={gulir ? 'max-w-[680px]' : 'max-w-[500px]'}
      onClose={tutup}
      labelledBy={idJudul}
    >
      <div className={`${ADMIN.modalBody} ${gulir ? 'flex flex-col max-h-[90vh]' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`grid place-items-center w-10 h-10 shrink-0 rounded-xl ${TONE[tahap].solid}`}
            >
              <Ikon size={18} />
            </span>
            <div className="min-w-0">
              <h3 id={idJudul} className={ADMIN.modalTitle}>
                {judul}
              </h3>
              <p className={`${FONT.mono} text-xs mt-0.5 ${T.inkMuted}`}>{lpjIdLabel(pack)}</p>
            </div>
          </div>
          <button
            type="button"
            className={ADMIN.modalClose}
            onClick={onClose}
            disabled={sibuk}
            aria-label="Tutup"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {gulir ? (
          <>
            <div
              tabIndex={0}
              aria-label="Informasi LPJ"
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-4 mt-3.5 -mx-2.5 px-2.5 pt-0.5 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] rounded-[10px]"
            >
              {gulir}
            </div>
            <div className={`shrink-0 pt-3.5 border-t ${T.border}`}>{children}</div>
          </>
        ) : (
          <>
            <div className={`grid gap-2.5 my-4 p-3.5 rounded-xl border ${T.surface2} ${T.border}`}>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={XLBL}>Pelaksana</span>
                <b className={`text-[13.5px] font-semibold break-words ${T.ink}`}>
                  {namaDkk(nama) || '—'}
                </b>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={XLBL}>Uraian</span>
                <p className={`text-[13.5px] leading-[1.45] break-words ${T.ink2}`}>
                  {uraianOf(pack) || '—'}
                </p>
              </div>
              {!tanpaTotal && (
                <div className="flex flex-col gap-0.5">
                  <span className={XLBL}>Total</span>
                  <b className={`text-[13.5px] font-semibold ${T.ink}`}>
                    {rupiah(lpjRowTotal(pack))}
                  </b>
                </div>
              )}
            </div>
            {children}
          </>
        )}
      </div>
    </Modal>
  );
}
