import { useState } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { PANJANG } from '@/utils/batas';
import { JENIS_KEGIATAN, labelPeriode, semesterDari } from '../../utils/kehadiran';
import { K } from '../../ui/kelas';

/**
 * Form tambah/ubah kegiatan. Semester mengikuti tanggal (1 = Januari–Juni, 2 = Juli–Desember).
 * Kegiatan baru langsung dibuka untuk diisi kehadirannya setelah disimpan.
 */
export default function ModalKegiatan({ awal, onSimpan, onTutup }) {
  const [f, setF] = useState(awal);
  const [galat, setGalat] = useState({});
  const [proses, setProses] = useState(false);
  const ubah = (isi) => setF((x) => ({ ...x, ...isi }));
  const baru = !awal.id;

  async function kirim(e) {
    e.preventDefault();
    const data = {
      ...f,
      nama: f.nama.replace(/\s+/g, ' ').trim(),
      tempat: f.tempat.replace(/\s+/g, ' ').trim(),
      keterangan: f.keterangan.trim(),
    };
    const g = {};
    if (!data.nama) g.nama = 'Nama kegiatan wajib diisi.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.tanggal) || data.tanggal < '2024-01-01')
      g.tanggal = 'Tanggal tidak sah.';
    if (!/^\d{2}:\d{2}$/.test(data.jam)) g.jam = 'Jam wajib diisi.';
    if (!data.tempat) g.tempat = 'Tempat wajib diisi.';
    setGalat(g);
    if (Object.keys(g).length) return;
    setProses(true);
    try {
      await onSimpan(data);
    } catch {
      setProses(false);
    }
  }

  const isian = (k) => (galat[k] ? K.masukanGalat : K.masukan);
  const pesan = (k) => galat[k] && <p className={K.pesanGalat}>{galat[k]}</p>;

  return (
    <Modal
      onClose={proses ? () => {} : onTutup}
      labelledBy="judul-form-kegiatan"
      widthClass="max-w-lg"
      lembar
    >
      <form onSubmit={kirim} noValidate className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-form-kegiatan" className={K.modalJudul}>
            {baru ? 'Tambah Kegiatan' : 'Ubah Kegiatan'}
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
            ? 'Setelah disimpan, halaman langsung berlanjut ke pengisian kehadiran.'
            : 'Perubahan tanggal bisa memindahkan kegiatan ke semester lain di rekap.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="kg-nama" className={K.label}>
              Nama kegiatan
            </label>
            <input
              id="kg-nama"
              autoFocus
              maxLength={PANJANG.namaKegiatan}
              placeholder="Contoh: Apel Senin I November"
              value={f.nama}
              aria-invalid={!!galat.nama || undefined}
              onChange={(e) => ubah({ nama: e.target.value })}
              className={isian('nama')}
            />
            {pesan('nama')}
          </div>
          <div>
            <label htmlFor="kg-tanggal" className={K.label}>
              Tanggal
            </label>
            <input
              id="kg-tanggal"
              type="date"
              min="2024-01-01"
              value={f.tanggal}
              aria-invalid={!!galat.tanggal || undefined}
              onChange={(e) => ubah({ tanggal: e.target.value })}
              className={`${isian('tanggal')} dark:[color-scheme:dark]`}
            />
            {galat.tanggal ? (
              pesan('tanggal')
            ) : (
              <p className={K.bantuan}>
                {/^\d{4}-\d{2}-\d{2}$/.test(f.tanggal)
                  ? `Masuk ${labelPeriode(f.tanggal.slice(0, 4), semesterDari(f.tanggal))}.`
                  : ' '}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="kg-jam" className={K.label}>
              Jam (WITA)
            </label>
            <input
              id="kg-jam"
              type="time"
              value={f.jam}
              aria-invalid={!!galat.jam || undefined}
              onChange={(e) => ubah({ jam: e.target.value })}
              className={`${isian('jam')} dark:[color-scheme:dark]`}
            />
            {pesan('jam')}
          </div>
          <div>
            <label htmlFor="kg-jenis" className={K.label}>
              Jenis
            </label>
            <select
              id="kg-jenis"
              value={f.jenis}
              onChange={(e) => ubah({ jenis: e.target.value })}
              className={K.masukan}
            >
              {JENIS_KEGIATAN.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="kg-tempat" className={K.label}>
              Tempat
            </label>
            <input
              id="kg-tempat"
              maxLength={PANJANG.namaKegiatan}
              value={f.tempat}
              aria-invalid={!!galat.tempat || undefined}
              onChange={(e) => ubah({ tempat: e.target.value })}
              className={isian('tempat')}
            />
            {pesan('tempat')}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="kg-ket" className={K.label}>
              Keterangan <span className={`font-normal ${K.redup}`}>(opsional)</span>
            </label>
            <input
              id="kg-ket"
              maxLength={PANJANG.keteranganKegiatan}
              value={f.keterangan}
              onChange={(e) => ubah({ keterangan: e.target.value })}
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
            {proses ? 'Menyimpan…' : baru ? 'Simpan & Isi Kehadiran' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
