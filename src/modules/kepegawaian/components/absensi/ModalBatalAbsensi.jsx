import { useState } from 'react';
import { FaBan, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { PANJANG } from '@/utils/batas';
import { K } from '../../ui/kelas';

/**
 * Pembatalan rekapan atau impor absensi dengan alasan. Data tidak dihapus fisik (CLAUDE.md §7.1):
 * ditandai batal dan tidak dipakai lagi di rekap.
 */
export default function ModalBatalAbsensi({ judul, labelOk, children, onBatalkan, onTutup }) {
  const [alasan, setAlasan] = useState('');
  const [proses, setProses] = useState(false);

  async function kirim(e) {
    e.preventDefault();
    if (!alasan.trim()) return;
    setProses(true);
    try {
      await onBatalkan(alasan.trim());
    } catch {
      setProses(false);
    }
  }

  return (
    <Modal
      onClose={proses ? () => {} : onTutup}
      labelledBy="judul-batal-absensi"
      widthClass="max-w-md"
    >
      <form onSubmit={kirim} className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-batal-absensi" className={K.modalJudul}>
            {judul}
          </h2>
          <button
            type="button"
            onClick={onTutup}
            disabled={proses}
            aria-label="Tutup"
            className={K.modalTutup}
          >
            <FaTimes />
          </button>
        </div>
        <p className={K.modalSub}>{children}</p>
        <label htmlFor="alasan-batal-absensi" className={K.label}>
          Alasan <span className={K.teksBahaya}>*</span>
        </label>
        <textarea
          id="alasan-batal-absensi"
          rows={3}
          required
          autoFocus
          maxLength={PANJANG.alasanBatal}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder="Mis. salah memilih berkas, rekapan dobel"
          className={K.masukan}
        />
        <div className={K.modalAksi}>
          <button type="button" onClick={onTutup} disabled={proses} className={K.tombolKedua}>
            Kembali
          </button>
          <button type="submit" disabled={proses || !alasan.trim()} className={K.tombolBahaya}>
            <FaBan size={12} /> {proses ? 'Memproses…' : labelOk}
          </button>
        </div>
      </form>
    </Modal>
  );
}
