import { useState } from 'react';
import { FaSave, FaTimes, FaUndo } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { PANJANG } from '@/utils/batas';
import { showToast } from '@/utils/toastStore';
import { pesanGalat } from '../../services/pegawaiDb';
import { kembalikanKoreksiAbsensi, simpanKoreksiAbsensi } from '../../services/absensiDb';
import { formatWaktu, jamSah, kunciBarisNo } from '../../utils/absensi';
import { K } from '../../ui/kelas';

const dua = (n) => String(n).padStart(2, '0');

/**
 * Penyesuaian jam masuk/pulang satu pegawai pada satu tanggal (klik sel di rekap bulanan). Jam dari
 * mesin tidak diubah: koreksi disimpan terpisah dan menggantikannya di rekap, PDF, dan Excel.
 * Alasan wajib. "Kembalikan ke jam mesin" menonaktifkan koreksi (tidak dihapus).
 */
export default function ModalKoreksiJam({
  rekap,
  baris,
  hari,
  bulanan,
  namaPetugas,
  uid,
  onTutup,
}) {
  const x = baris.sel[hari.tgl] || null;
  const k = x?.koreksi || null;
  const tanggal = `${bulanan.bulan}-${dua(hari.tgl)}`;
  // Koreksi yang sudah ada diperbarui di dokumennya sendiri (bisa dibuat saat No. belum dipetakan)
  const kunci = k?.baris || (baris.pegawai ? baris.pegawai.id : kunciBarisNo(baris.nos[0]));
  const [masuk, setMasuk] = useState(x?.masuk || '');
  const [pulang, setPulang] = useState(x?.pulang || '');
  const [alasan, setAlasan] = useState(k?.alasan || '');
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState('');

  async function simpan(e) {
    e.preventDefault();
    const teksAlasan = alasan.replace(/\s+/g, ' ').trim();
    if (!jamSah(masuk) || !jamSah(pulang)) return setGalat('Jam harus berformat JJ:MM.');
    if (masuk && pulang && pulang <= masuk) return setGalat('Jam pulang harus setelah jam masuk.');
    if (!teksAlasan) return setGalat('Alasan penyesuaian wajib diisi.');
    setGalat('');
    setProses('simpan');
    try {
      await simpanKoreksiAbsensi(
        rekap.id,
        { baris: kunci, tanggal, masuk, pulang, alasan: teksAlasan },
        uid,
      );
      showToast('Jam disesuaikan.');
      onTutup();
    } catch (err) {
      setProses('');
      setGalat(pesanGalat(err, 'Penyesuaian jam gagal disimpan.'));
    }
  }

  async function kembalikan() {
    setGalat('');
    setProses('kembali');
    try {
      await kembalikanKoreksiAbsensi(rekap.id, k.id, uid);
      showToast('Jam dikembalikan ke data mesin.');
      onTutup();
    } catch (err) {
      setProses('');
      setGalat(pesanGalat(err, 'Gagal mengembalikan ke jam mesin.'));
    }
  }

  const sibuk = !!proses;
  const mesin = x?.mesin || { masuk: '', pulang: '' };

  return (
    <Modal
      onClose={sibuk ? () => {} : onTutup}
      labelledBy="judul-koreksi-jam"
      widthClass="max-w-md"
      lembar
    >
      <form onSubmit={simpan} noValidate className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="judul-koreksi-jam" className={K.modalJudul}>
              Sesuaikan Jam
            </h2>
            <p className={`text-[12.5px] mt-1 ${K.teks2}`}>
              <b className={K.teks}>{baris.nama}</b> · {hari.label}, {hari.tgl} {bulanan.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            disabled={sibuk}
            aria-label="Tutup"
            className={K.modalTutup}
          >
            <FaTimes />
          </button>
        </div>

        <div className={`${K.kotak} mt-4 mb-4 text-[12.5px] space-y-1`}>
          <div className="flex justify-between gap-3">
            <span className={K.redup}>Data mesin</span>
            <span className={`text-right ${K.teks}`}>
              {x?.semua.length ? x.semua.join(', ') : 'Tidak ada pindaian'}
            </span>
          </div>
          {x?.semua.length > 0 && (
            <div className="flex justify-between gap-3">
              <span className={K.redup}>Terbaca</span>
              <span className={K.mono}>
                masuk {mesin.masuk || '–'} · pulang {mesin.pulang || '–'}
              </span>
            </div>
          )}
          {k && (
            <div className="flex justify-between gap-3">
              <span className={K.redup}>Dikoreksi</span>
              <span className={`text-right ${K.teks2}`}>
                {namaPetugas.get(k.diubahOleh) || 'Petugas'} · {formatWaktu(k.diubahPada)}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="kj-masuk" className={K.label}>
              Jam masuk
            </label>
            <input
              id="kj-masuk"
              type="time"
              value={masuk}
              autoFocus
              onChange={(e) => setMasuk(e.target.value)}
              className={`${K.masukan} dark:[color-scheme:dark]`}
            />
          </div>
          <div>
            <label htmlFor="kj-pulang" className={K.label}>
              Jam pulang
            </label>
            <input
              id="kj-pulang"
              type="time"
              value={pulang}
              onChange={(e) => setPulang(e.target.value)}
              className={`${K.masukan} dark:[color-scheme:dark]`}
            />
          </div>
        </div>
        <p className={K.bantuan}>
          Kosongkan kedua jam bila hari itu tidak dihitung hadir (mis. pindaian salah orang).
        </p>

        <div className="mt-4">
          <label htmlFor="kj-alasan" className={K.label}>
            Alasan <span className={K.teksBahaya}>*</span>
          </label>
          <input
            id="kj-alasan"
            maxLength={PANJANG.alasanKoreksiAbsen}
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Mis. lupa absen pulang, mesin rusak, dinas luar"
            className={K.masukan}
          />
        </div>

        {galat && (
          <div className="mt-4">
            <p role="alert" className={K.galat}>
              {galat}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2.5 mt-5">
          {k ? (
            <button
              type="button"
              onClick={kembalikan}
              disabled={sibuk}
              className={K.tombolKecilBahaya}
            >
              <FaUndo size={11} /> {proses === 'kembali' ? 'Memproses…' : 'Kembalikan ke jam mesin'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2.5">
            <button type="button" onClick={onTutup} disabled={sibuk} className={K.tombolKedua}>
              Batal
            </button>
            <button type="submit" disabled={sibuk} className={K.tombolUtama}>
              <FaSave size={12} /> {proses === 'simpan' ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
