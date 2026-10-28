import Modal from '@/components/Modal';
import { K, NADA_LENCANA } from '../../ui/kelas';

/**
 * Popup konfirmasi seragam (purwarupa kehadiran: ikon bulat, judul, penjelasan, dua tombol).
 * nada: ok | waspada | bahaya — warna ikon; tombol utama merah untuk bahaya, navy selainnya.
 */
export default function ModalKonfirmasi({
  ikon,
  nada = 'ok',
  judul,
  children,
  labelOk,
  labelBatal = 'Batal',
  proses = false,
  onOk,
  onBatal,
}) {
  return (
    <Modal
      onClose={proses ? () => {} : onBatal}
      labelledBy="judul-konfirmasi-kehadiran"
      widthClass="max-w-sm"
    >
      <div className={`${K.modalIsi} text-center`}>
        <div
          className={`w-[52px] h-[52px] rounded-full grid place-items-center mx-auto ${NADA_LENCANA[nada]}`}
        >
          {ikon}
        </div>
        <h2 id="judul-konfirmasi-kehadiran" className={`${K.modalJudul} mt-3.5`}>
          {judul}
        </h2>
        <p className={`${K.modalSub} mb-0`}>{children}</p>
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button type="button" onClick={onBatal} disabled={proses} className={K.tombolKedua}>
            {labelBatal}
          </button>
          <button
            type="button"
            onClick={onOk}
            disabled={proses}
            autoFocus
            className={nada === 'bahaya' ? K.tombolBahaya : K.tombolUtama}
          >
            {proses ? 'Memproses…' : labelOk}
          </button>
        </div>
      </div>
    </Modal>
  );
}
