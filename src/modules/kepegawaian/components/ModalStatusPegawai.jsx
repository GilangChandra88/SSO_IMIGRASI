import { useState } from 'react';
import { FaTimes, FaUserCheck, FaUserSlash } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { PANJANG } from '@/utils/batas';
import { aktifkanPegawai, nonaktifkanPegawai, pesanGalat } from '../services/pegawaiDb';
import { K } from '../ui/kelas';

/**
 * Menonaktifkan (pengganti hapus) atau mengaktifkan kembali pegawai lewat Cloud Function.
 * Nonaktif = akun login dimatikan dan semua sesinya dicabut; data pegawai tetap ada untuk arsip.
 */
export default function ModalStatusPegawai({ pegawai, onClose }) {
  const nonaktifkan = pegawai.aktif !== false;
  const [alasan, setAlasan] = useState('');
  const [proses, setProses] = useState(false);

  async function simpan(e) {
    e.preventDefault();
    if (nonaktifkan && !alasan.trim()) return;
    setProses(true);
    try {
      if (nonaktifkan) await nonaktifkanPegawai(pegawai.id, alasan.trim());
      else await aktifkanPegawai(pegawai.id, alasan.trim());
      showToast(`${pegawai.nama} ${nonaktifkan ? 'dinonaktifkan' : 'diaktifkan kembali'}.`);
      onClose();
    } catch (err) {
      showToast(pesanGalat(err, 'Status pegawai gagal diubah.'), 'error');
    } finally {
      setProses(false);
    }
  }

  return (
    <Modal
      onClose={proses ? () => {} : onClose}
      labelledBy="judul-status-pegawai"
      widthClass="max-w-md"
    >
      <form onSubmit={simpan} className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-status-pegawai" className={K.modalJudul}>
            {nonaktifkan ? 'Nonaktifkan Pegawai' : 'Aktifkan Kembali'}
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
        <p className={K.modalSub}>
          {nonaktifkan ? (
            <>
              <strong className={K.teks}>{pegawai.nama}</strong> tidak bisa login lagi dan sesi yang
              sedang berjalan dicabut. Data dan riwayatnya tetap tersimpan.
            </>
          ) : (
            <>
              <strong className={K.teks}>{pegawai.nama}</strong> bisa login kembali dengan kata
              sandi terakhirnya.
            </>
          )}
        </p>
        <label htmlFor="alasan-status" className={K.label}>
          Alasan {nonaktifkan ? <span className={K.teksBahaya}>*</span> : '(opsional)'}
        </label>
        <textarea
          id="alasan-status"
          rows={3}
          required={nonaktifkan}
          maxLength={PANJANG.alasanBatal}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          className={K.masukan}
          placeholder={nonaktifkan ? 'Mis. mutasi ke kantor lain, pensiun' : ''}
        />
        <div className={K.modalAksi}>
          <button type="button" onClick={onClose} disabled={proses} className={K.tombolKedua}>
            Batal
          </button>
          <button
            type="submit"
            disabled={proses || (nonaktifkan && !alasan.trim())}
            className={nonaktifkan ? K.tombolBahaya : K.tombolUtama}
          >
            {nonaktifkan ? <FaUserSlash size={12} /> : <FaUserCheck size={12} />}
            {proses ? 'Memproses…' : nonaktifkan ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
