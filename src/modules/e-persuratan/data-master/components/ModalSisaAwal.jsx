import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { formatRupiah } from '@/components/StrukturHierarki/hierarkiUtils';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';

/**
 * Jendela "Sisa Awal" Item MAK: sisa anggaran sebelum ada realisasi yang tercatat di aplikasi
 * (mis. sisa per SAKTI saat aplikasi mulai dipakai). Disimpan sebagai `realisasiAwal` = pagu − sisa
 * awal, sehingga revisi pagu sesudahnya tetap menambah sisa.
 * @param {{ id, kode, name, pagu, realisasiAwal }} item  node tampilan MAK Setup
 * @param {number} realisasiAplikasi  total realisasi Item ini setahun (`mak_rekap`)
 * @param {(realisasiAwal: number) => void} onSubmit
 */
export default function ModalSisaAwal({ item, realisasiAplikasi, onClose, onSubmit, sibuk }) {
  const pagu = Number(item.pagu) || 0;
  const awalLama = Number(item.realisasiAwal) || 0;
  const [teks, setTeks] = useState(() => String(pagu - awalLama));
  const [galat, setGalat] = useState(false);

  const angka = teks.trim() === '' ? NaN : Number(teks);
  const sah = Number.isInteger(angka) && angka >= 0 && angka <= pagu;
  const sisaKini = sah ? angka - realisasiAplikasi : null;

  const baris = [
    ['Pagu', `Rp ${formatRupiah(pagu)}`, T.ink],
    ['Terpakai di luar aplikasi', sah ? `Rp ${formatRupiah(pagu - angka)}` : '—', STATUS.warnInk],
    ['Realisasi tercatat di aplikasi', `Rp ${formatRupiah(realisasiAplikasi)}`, STATUS.warnInk],
    [
      'Sisa anggaran saat ini',
      sisaKini == null ? '—' : `${sisaKini < 0 ? '−' : ''}Rp ${formatRupiah(Math.abs(sisaKini))}`,
      sisaKini != null && sisaKini < 0 ? STATUS.critInk : STATUS.goodInk,
    ],
  ];

  return (
    <Modal onClose={sibuk ? undefined : onClose} labelledBy="judul-sisa-awal">
      <form
        className={ADMIN.modalBody}
        onSubmit={(e) => {
          e.preventDefault();
          if (!sah) {
            setGalat(true);
            return;
          }
          if (pagu - angka === awalLama) onClose();
          else onSubmit(pagu - angka);
        }}
      >
        <div className="flex justify-between items-start gap-3 mb-0.5">
          <h3 id="judul-sisa-awal" className={ADMIN.modalTitle}>
            Sisa Awal Item
          </h3>
          <button
            type="button"
            className={ADMIN.modalClose}
            aria-label="Tutup"
            onClick={onClose}
            disabled={sibuk}
          >
            <FaTimes size={15} />
          </button>
        </div>
        <p className={ADMIN.modalSub}>
          {item.kode && <span className={`${FONT.mono} font-semibold`}>{item.kode} · </span>}
          {item.name}
        </p>
        <div>
          <label className={ADMIN.label} htmlFor="sisa-awal">
            Sisa Awal (Rp)
          </label>
          <input
            id="sisa-awal"
            className={`${galat ? ADMIN.inputErr : ADMIN.input} ${FONT.mono}`}
            type="number"
            min="0"
            max={pagu}
            step="1"
            value={teks}
            aria-invalid={galat || undefined}
            onChange={(e) => {
              setTeks(e.target.value);
              setGalat(false);
            }}
            autoFocus
          />
          <p className={galat ? `${ADMIN.hint} ${STATUS.critInk}` : ADMIN.hint}>
            {galat
              ? `Isi rupiah bulat dari 0 sampai Rp ${formatRupiah(pagu)}.`
              : 'Sisa anggaran sebelum ada realisasi yang tercatat di aplikasi (mis. sisa per SAKTI saat aplikasi mulai dipakai). Sama dengan pagu bila belum ada yang terpakai.'}
          </p>
        </div>
        <div className="mt-3">
          {baris.map(([label, nilai, warna]) => (
            <div className={ADMIN.viewRow} key={label}>
              <span className={T.inkMuted}>{label}</span>
              <span className={`${FONT.mono} font-semibold text-right ${warna}`}>{nilai}</span>
            </div>
          ))}
        </div>
        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={sibuk}>
            Batal
          </button>
          <button type="submit" className={ADMIN.btnSolid} disabled={sibuk}>
            {sibuk ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
