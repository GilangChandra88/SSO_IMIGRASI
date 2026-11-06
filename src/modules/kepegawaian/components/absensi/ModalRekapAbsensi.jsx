import { useState } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { PANJANG } from '@/utils/batas';
import { K } from '../../ui/kelas';

/** Form buat/ubah rekapan absensi (nama + keterangan). Rekapan baru langsung dibuka untuk diimpor. */
export default function ModalRekapAbsensi({ awal, onSimpan, onTutup }) {
  const [f, setF] = useState(awal);
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);
  const baru = !awal.id;

  async function kirim(e) {
    e.preventDefault();
    const data = {
      ...f,
      nama: f.nama.replace(/\s+/g, ' ').trim(),
      keterangan: f.keterangan.trim(),
    };
    if (!data.nama) return setGalat('Nama rekapan wajib diisi.');
    setGalat('');
    setProses(true);
    try {
      await onSimpan(data);
    } catch {
      setProses(false);
    }
  }

  return (
    <Modal
      onClose={proses ? () => {} : onTutup}
      labelledBy="judul-form-absensi"
      widthClass="max-w-lg"
      lembar
    >
      <form onSubmit={kirim} noValidate className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-form-absensi" className={K.modalJudul}>
            {baru ? 'Buat Rekapan Absensi' : 'Ubah Rekapan Absensi'}
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
          {baru
            ? 'Satu rekapan bisa diisi beberapa kali impor CSV; semuanya digabung. Setelah disimpan, lanjutkan dengan Impor CSV.'
            : 'Hanya nama dan keterangan yang berubah; data impor tetap.'}
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="ab-nama" className={K.label}>
              Nama rekapan
            </label>
            <input
              id="ab-nama"
              autoFocus
              maxLength={PANJANG.namaAbsensi}
              placeholder="Contoh: Absensi Oktober 2026"
              value={f.nama}
              aria-invalid={!!galat || undefined}
              onChange={(e) => setF((x) => ({ ...x, nama: e.target.value }))}
              className={galat ? K.masukanGalat : K.masukan}
            />
            {galat && <p className={K.pesanGalat}>{galat}</p>}
          </div>
          <div>
            <label htmlFor="ab-ket" className={K.label}>
              Keterangan <span className={`font-normal ${K.redup}`}>(opsional)</span>
            </label>
            <input
              id="ab-ket"
              maxLength={PANJANG.keteranganAbsensi}
              placeholder="Mis. mesin lobi depan"
              value={f.keterangan}
              onChange={(e) => setF((x) => ({ ...x, keterangan: e.target.value }))}
              className={K.masukan}
            />
          </div>
        </div>
        <div className={K.modalAksi}>
          <button type="button" onClick={onTutup} disabled={proses} className={K.tombolKedua}>
            Batal
          </button>
          <button type="submit" disabled={proses} className={K.tombolUtama}>
            <FaSave size={12} />
            {proses ? 'Menyimpan…' : baru ? 'Simpan & Lanjut Impor' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
