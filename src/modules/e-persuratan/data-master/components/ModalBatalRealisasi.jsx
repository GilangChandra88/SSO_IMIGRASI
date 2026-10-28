import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { PANJANG } from '@/utils/batas';
import { ADMIN, FONT } from '@/utils/uiTokens';
import { formatRupiah } from '@/components/StrukturHierarki/hierarkiUtils';

/** Jendela alasan Batalkan Transaksi realisasi (Super Admin; alasan wajib & tercatat di log). */
export default function ModalBatalRealisasi({ realisasi, onClose, onSubmit, sibuk }) {
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState(false);

  return (
    <Modal onClose={sibuk ? undefined : onClose} labelledBy="judul-batal-realisasi">
      <form
        className={ADMIN.modalBody}
        onSubmit={(e) => {
          e.preventDefault();
          if (!alasan.trim()) {
            setGalat(true);
            return;
          }
          onSubmit(alasan.trim());
        }}
      >
        <div className="flex justify-between items-start gap-3 mb-0.5">
          <h3 id="judul-batal-realisasi" className={ADMIN.modalTitle}>
            Batalkan Transaksi
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
          Realisasi <strong className={FONT.mono}>Rp {formatRupiah(realisasi.jumlah)}</strong> (
          {realisasi.nomorLpj || 'tanpa nomor'}) tidak lagi dihitung di Rekap. Data tidak dihapus
          dan bisa dipulihkan kembali.
        </p>
        <div>
          <label className={ADMIN.label} htmlFor="alasan-batal">
            Alasan pembatalan
          </label>
          <textarea
            id="alasan-batal"
            rows={3}
            className={galat ? ADMIN.inputErr : ADMIN.input}
            maxLength={PANJANG.alasanBatal}
            placeholder="misal: salah input nominal"
            value={alasan}
            aria-invalid={galat || undefined}
            onChange={(e) => {
              setAlasan(e.target.value);
              setGalat(false);
            }}
            autoFocus
          />
          <p className={ADMIN.hint}>Wajib diisi, maks. {PANJANG.alasanBatal} karakter.</p>
        </div>
        <div className={ADMIN.modalActions}>
          <button type="button" className={ADMIN.btnGhost} onClick={onClose} disabled={sibuk}>
            Batal
          </button>
          <button type="submit" className={ADMIN.btnSolid} disabled={sibuk}>
            {sibuk ? 'Memproses...' : 'Batalkan Transaksi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
