import { FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { K } from '../ui/kelas';

/**
 * Popup form: judul + tombol tutup, naik dari bawah di ponsel. Tanpa `onSimpan`, isinya dibungkus
 * div (untuk isi yang punya form sendiri; form tidak boleh bersarang).
 */
export default function ModalForm({ id, judul, onTutup, onSimpan, children }) {
  const Wadah = onSimpan ? 'form' : 'div';
  return (
    <Modal onClose={onTutup} labelledBy={id} lembar>
      <Wadah className="p-4 sm:p-5 flex flex-col gap-3.5" onSubmit={onSimpan}>
        <div className="flex items-center justify-between gap-3">
          <h2 id={id} className={K.judulSeksi}>
            {judul}
          </h2>
          <button type="button" className={K.tombolIkon} aria-label="Tutup" onClick={onTutup}>
            <FaTimes size={15} />
          </button>
        </div>
        {children}
      </Wadah>
    </Modal>
  );
}
