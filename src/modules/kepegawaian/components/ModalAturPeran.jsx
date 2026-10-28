import { useState } from 'react';
import { FaTimes, FaUserShield } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { ANIM } from '@/utils/animasi';
import { showToast } from '@/utils/toastStore';
import { KETERANGAN_PERAN, LABEL_PERAN, PERAN_KHUSUS, peranDariKlaim } from '@/utils/peran';
import { aturPeran, pesanGalat } from '../services/pegawaiDb';
import { K } from '../ui/kelas';

/** Mengatur peran khusus lewat Cloud Function aturPeran (hanya Super Admin, bukan akun sendiri). */
export default function ModalAturPeran({ pegawai, onClose }) {
  const [pilihan, setPilihan] = useState(() => peranDariKlaim({ peran: pegawai.peran }));
  const [proses, setProses] = useState(false);

  const ubah = (r) =>
    setPilihan((d) =>
      d.includes(r)
        ? d.filter((x) => x !== r)
        : PERAN_KHUSUS.filter((x) => x === r || d.includes(x)),
    );

  async function simpan() {
    setProses(true);
    try {
      await aturPeran(pegawai.id, pilihan);
      showToast(`Peran ${pegawai.nama} diperbarui.`);
      onClose();
    } catch (err) {
      showToast(pesanGalat(err, 'Peran gagal diubah.'), 'error');
    } finally {
      setProses(false);
    }
  }

  return (
    <Modal
      onClose={proses ? () => {} : onClose}
      labelledBy="judul-atur-peran"
      widthClass="max-w-lg"
    >
      <div className={K.modalIsi}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-atur-peran" className={K.modalJudul}>
            Atur Peran · {pegawai.nama}
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
          Boleh lebih dari satu; tanpa centang = Pegawai biasa. Perubahan berlaku pada sesi pegawai
          dalam beberapa detik dan tercatat di log sistem.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PERAN_KHUSUS.map((r) => {
            const aktif = pilihan.includes(r);
            return (
              <label
                key={r}
                className={`flex items-start gap-2.5 p-3 rounded-[10px] text-[13px] cursor-pointer ${ANIM.pilih} ${aktif ? K.pilihanAktif : K.pilihan}`}
              >
                <input
                  type="checkbox"
                  checked={aktif}
                  onChange={() => ubah(r)}
                  className={K.centang}
                />
                <span>
                  <span className={`block font-bold ${K.teks}`}>{LABEL_PERAN[r]}</span>
                  <span className={`block text-[11.5px] ${K.redup}`}>{KETERANGAN_PERAN[r]}</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className={K.modalAksi}>
          <button type="button" onClick={onClose} disabled={proses} className={K.tombolKedua}>
            Batal
          </button>
          <button type="button" onClick={simpan} disabled={proses} className={K.tombolUtama}>
            <FaUserShield size={12} /> {proses ? 'Menyimpan…' : 'Simpan Peran'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
