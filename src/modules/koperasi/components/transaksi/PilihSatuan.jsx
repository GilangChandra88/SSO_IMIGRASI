import { FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { K } from '../../ui/kelas';
import { satuanJual } from '../../utils/barang';
import { rupiah } from '../../ui/format';

/** Pilih satuan jual (satuan dasar atau kemasan) untuk barang berkemasan. */
export default function PilihSatuan({ barang, onPilih, onTutup }) {
  return (
    <Modal onClose={onTutup} labelledBy="judul-satuan" lembar>
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="judul-satuan" className={K.judulSeksi}>
            {barang.nama}
          </h2>
          <button type="button" className={K.tombolIkon} aria-label="Tutup" onClick={onTutup}>
            <FaTimes size={15} />
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {satuanJual(barang).map((s) => (
            <li key={s.id || 'dasar'}>
              <button
                type="button"
                className={`${K.kartu} ${K.tautan} w-full flex items-center justify-between gap-3 cursor-pointer text-left`}
                onClick={() => onPilih(s.id)}
              >
                <span>
                  <span className={`${K.judulBaris} block`}>{s.nama}</span>
                  <span className={K.redup}>
                    {s.isi > 1 ? `isi ${s.isi} ${barang.satuan}` : 'satuan dasar'}
                  </span>
                </span>
                <span className={K.nominal}>{rupiah(s.hargaJual)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
