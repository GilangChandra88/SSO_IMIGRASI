import { useState } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { PANJANG } from '@/utils/batas';
import { K } from '../../ui/kelas';

/** Tambah satu No. mesin secara manual (sebelum ada impor CSV yang memuatnya). */
export default function ModalTambahNoAbsen({ noAbsen, opsiPegawai, onSimpan, onTutup }) {
  const [f, setF] = useState({ no: '', namaMesin: '', pegawaiId: '' });
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);
  const ubah = (isi) => setF((x) => ({ ...x, ...isi }));

  async function kirim(e) {
    e.preventDefault();
    const no = f.no.trim();
    if (!/^\d{1,9}$/.test(no) || Number(no) < 1) return setGalat('No. harus angka 1–999999999.');
    const kunci = String(Number(no));
    if (noAbsen[kunci]) return setGalat(`No. ${kunci} sudah ada; ubah pegawainya di tabel.`);
    setGalat('');
    setProses(true);
    try {
      await onSimpan({
        no: kunci,
        pegawaiId: f.pegawaiId,
        namaMesin: f.namaMesin.replace(/\s+/g, ' ').trim(),
        baru: true,
      });
    } catch {
      setProses(false);
    }
  }

  return (
    <Modal onClose={proses ? () => {} : onTutup} labelledBy="judul-tambah-no" widthClass="max-w-md">
      <form onSubmit={kirim} noValidate className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-tambah-no" className={K.modalJudul}>
            Tambah No. Absen
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
          No. = nomor pegawai di mesin absensi (kolom No. pada CSV). No. yang ada di CSV juga
          tercatat otomatis saat diimpor.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="no-absen" className={K.label}>
              No.
            </label>
            <input
              id="no-absen"
              autoFocus
              inputMode="numeric"
              maxLength={9}
              value={f.no}
              aria-invalid={!!galat || undefined}
              onChange={(e) => ubah({ no: e.target.value.replace(/\D/g, '') })}
              className={galat ? K.masukanGalat : K.masukan}
            />
            {galat && <p className={K.pesanGalat}>{galat}</p>}
          </div>
          <div>
            <label htmlFor="no-nama" className={K.label}>
              Nama di mesin <span className={`font-normal ${K.redup}`}>(opsional)</span>
            </label>
            <input
              id="no-nama"
              maxLength={PANJANG.namaMesinAbsen}
              value={f.namaMesin}
              onChange={(e) => ubah({ namaMesin: e.target.value })}
              className={K.masukan}
            />
          </div>
          <div>
            <label htmlFor="no-pegawai" className={K.label}>
              Pegawai
            </label>
            <select
              id="no-pegawai"
              value={f.pegawaiId}
              onChange={(e) => ubah({ pegawaiId: e.target.value })}
              className={K.masukan}
            >
              <option value="">(belum dipetakan)</option>
              {opsiPegawai.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={K.modalAksi}>
          <button type="button" onClick={onTutup} disabled={proses} className={K.tombolKedua}>
            Batal
          </button>
          <button type="submit" disabled={proses} className={K.tombolUtama}>
            <FaSave size={12} /> {proses ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
