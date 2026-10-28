import { useState } from 'react';
import { FaBan, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { PANJANG } from '@/utils/batas';
import { formatTanggal } from '../../utils/kehadiran';
import { K } from '../../ui/kelas';

/**
 * Pengganti "hapus kegiatan" purwarupa: data pegawai tidak dihapus fisik (CLAUDE.md §7.1), jadi
 * kegiatan dibatalkan dengan alasan dan tidak dihitung lagi di rekap.
 */
export default function ModalBatalKegiatan({ kegiatan, onBatalkan, onTutup }) {
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
      labelledBy="judul-batal-kegiatan"
      widthClass="max-w-md"
    >
      <form onSubmit={kirim} className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-batal-kegiatan" className={K.modalJudul}>
            Batalkan Kegiatan
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
        <p className={K.modalSub}>
          <strong className={K.teks}>{kegiatan.nama}</strong> ({formatTanggal(kegiatan.tanggal)})
          tidak dihapus, tetapi ditandai batal{kegiatan.kehadiran ? ' beserta kehadirannya' : ''}{' '}
          dan tidak dihitung lagi di rekap. Pembatalan tidak bisa diurungkan.
        </p>
        <label htmlFor="alasan-batal-kegiatan" className={K.label}>
          Alasan <span className={K.teksBahaya}>*</span>
        </label>
        <textarea
          id="alasan-batal-kegiatan"
          rows={3}
          required
          autoFocus
          maxLength={PANJANG.alasanBatal}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder="Mis. kegiatan ditiadakan karena hujan, salah input tanggal"
          className={K.masukan}
        />
        <div className={K.modalAksi}>
          <button type="button" onClick={onTutup} disabled={proses} className={K.tombolKedua}>
            Kembali
          </button>
          <button type="submit" disabled={proses || !alasan.trim()} className={K.tombolBahaya}>
            <FaBan size={12} /> {proses ? 'Memproses…' : 'Batalkan Kegiatan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
