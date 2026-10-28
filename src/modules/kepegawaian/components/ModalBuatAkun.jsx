import { useState } from 'react';
import { FaKey, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { buatAkunPegawai, pesanGalat } from '../services/pegawaiDb';
import { K } from '../ui/kelas';
import HasilSandiSementara from './HasilSandiSementara';

const pola = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/**
 * Membuat akun login lewat Cloud Function buatAkunPegawai. Kata sandi sementara dibuat server,
 * ditampilkan SEKALI di sini, dan wajib diganti pegawai saat login pertama.
 */
export default function ModalBuatAkun({ pegawai, onClose }) {
  const [email, setEmail] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  const [hasil, setHasil] = useState(null);

  async function kirim(e) {
    e.preventDefault();
    const bersih = email.trim().toLowerCase();
    if (!pola.test(bersih)) return setGalat('Format e-mail tidak sah.');
    setGalat('');
    setProses(true);
    try {
      setHasil(await buatAkunPegawai(pegawai.id, bersih));
    } catch (err) {
      setGalat(pesanGalat(err, 'Akun gagal dibuat. Coba lagi.'));
    } finally {
      setProses(false);
    }
  }

  return (
    <Modal
      onClose={hasil ? onClose : proses ? () => {} : onClose}
      labelledBy="judul-buat-akun"
      widthClass="max-w-md"
    >
      <div className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-buat-akun" className={K.modalJudul}>
            Buat Akun Pegawai
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
          <form onSubmit={kirim}>
            <p className={K.modalSub}>
              Akun untuk <strong className={K.teks}>{pegawai.nama}</strong>. Kata sandi sementara
              dibuat otomatis dan wajib diganti saat login pertama.
            </p>
            {galat && (
              <p role="alert" className={K.galat}>
                {galat}
              </p>
            )}
            <label htmlFor="email-akun" className={K.label}>
              E-mail login
            </label>
            <input
              id="email-akun"
              type="email"
              required
              maxLength={120}
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ''))}
              className={K.masukan}
              placeholder="nama@domain-kantor"
            />
            <p className={K.bantuan}>
              Gunakan alamat kantor yang benar-benar dimiliki pegawai; jangan diturunkan dari nama.
            </p>
            <div className={K.modalAksi}>
              <button type="button" onClick={onClose} disabled={proses} className={K.tombolKedua}>
                Batal
              </button>
              <button type="submit" disabled={proses} className={K.tombolUtama}>
                <FaKey size={12} /> {proses ? 'Membuat…' : 'Buat Akun'}
              </button>
            </div>
          </form>
        ) : (
          <HasilSandiSementara
            pesan={
              <>
                Akun <strong className="break-all">{hasil.email}</strong> berhasil dibuat.
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
