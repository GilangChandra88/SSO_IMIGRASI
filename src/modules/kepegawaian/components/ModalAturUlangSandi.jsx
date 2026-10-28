import { useState } from 'react';
import { FaExclamationTriangle, FaTimes, FaUnlockAlt } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { aturUlangSandi, pesanGalat } from '../services/pegawaiDb';
import { K } from '../ui/kelas';
import HasilSandiSementara from './HasilSandiSementara';

/**
 * Atur ulang kata sandi pegawai yang lupa (Cloud Function aturUlangSandi): kata sandi lama langsung
 * tidak berlaku, semua sesinya dicabut, dan kata sandi sementara baru ditampilkan SEKALI di sini.
 * Pegawai wajib menggantinya saat login berikutnya.
 */
export default function ModalAturUlangSandi({ pegawai, onClose }) {
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  const [hasil, setHasil] = useState(null);

  async function jalankan() {
    setGalat('');
    setProses(true);
    try {
      setHasil(await aturUlangSandi(pegawai.id));
    } catch (err) {
      setGalat(pesanGalat(err, 'Kata sandi gagal diatur ulang. Coba lagi.'));
    } finally {
      setProses(false);
    }
  }

  return (
    <Modal
      onClose={proses ? () => {} : onClose}
      labelledBy="judul-atur-ulang-sandi"
      widthClass="max-w-md"
    >
      <div className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-atur-ulang-sandi" className={K.modalJudul}>
            Atur Ulang Kata Sandi
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={proses}
            aria-label="Tutup"
            className={K.modalTutup}
          >
            <FaTimes />
          </button>
        </div>

        {!hasil ? (
          <>
            <p className={K.modalSub}>
              Untuk <strong className={K.teks}>{pegawai.nama}</strong>
              {pegawai.email ? <span className="break-all"> ({pegawai.email})</span> : null}. Kata
              sandi sementara baru dibuat otomatis.
            </p>
            <p className={K.peringatan}>
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <span>
                Kata sandi lama langsung tidak berlaku dan pegawai ini keluar dari semua perangkat.
                Lakukan hanya atas permintaan pegawai yang bersangkutan (pastikan orangnya benar).
              </span>
            </p>
            {galat && (
              <p role="alert" className={K.galat}>
                {galat}
              </p>
            )}
            <div className={K.modalAksi}>
              <button type="button" onClick={onClose} disabled={proses} className={K.tombolKedua}>
                Batal
              </button>
              <button type="button" onClick={jalankan} disabled={proses} className={K.tombolUtama}>
                <FaUnlockAlt size={12} /> {proses ? 'Memproses…' : 'Atur Ulang'}
              </button>
            </div>
          </>
        ) : (
          <HasilSandiSementara
            pesan={
              <>
                Kata sandi <strong className="break-all">{hasil.email}</strong> sudah diatur ulang.
              </>
            }
            email={hasil.email}
            sandi={hasil.sandiSementara}
            onSelesai={onClose}
          />
        )}
      </div>
    </Modal>
  );
}
