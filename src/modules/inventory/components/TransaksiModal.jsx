import { useState } from 'react';
import { FaFileDownload, FaFileUpload, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { K } from '../ui/kelas';
import { useEscape } from '../hooks/useEscape';
import FormMasuk from './FormMasuk';
import FormKeluar from './FormKeluar';

const TAB_TAMBAH = [
  { id: 'keluar', label: 'Tambah Barang Keluar', Ikon: FaFileUpload },
  { id: 'masuk', label: 'Tambah Barang Masuk', Ikon: FaFileDownload },
];

/**
 * Popup Tambah Transaksi: tab Barang Keluar dan Barang Masuk. Kedua form tetap terpasang agar
 * isian tidak hilang saat berpindah tab. `edit` = ubah satu transaksi (tanpa tab).
 * onSelesai(jenis, teks, rekam?) dipanggil setelah tersimpan.
 */
export default function TransaksiModal({ tabAwal, edit, onTutup, onSelesai }) {
  const [tab, setTab] = useState(tabAwal);
  useEscape(onTutup);

  return (
    <Modal
      onClose={onTutup}
      labelledBy="tambah-judul"
      widthClass="max-w-[1000px]"
      lembar
      tinggiTetap
    >
      <div className={K.popupIsi}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={K.popupJudul} id="tambah-judul">
            {edit
              ? tabAwal === 'keluar'
                ? 'Ubah Barang Keluar'
                : 'Ubah Barang Masuk'
              : 'Tambah Transaksi'}
          </h2>
          <button className={K.ikonBtn} type="button" aria-label="Tutup" onClick={onTutup}>
            <FaTimes size={15} />
          </button>
        </div>

        {!edit && (
          <div className={`${K.tabPil} w-fit mx-auto`} role="tablist" aria-label="Jenis transaksi">
            {TAB_TAMBAH.map(({ id, label, Ikon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`${K.tabPilBtn} ${tab === id ? K.tabPilAktif : K.tabPilPasif} max-[520px]:px-3 max-[520px]:text-[12.5px]`}
                onClick={() => setTab(id)}
              >
                <Ikon size={14} className="max-[520px]:hidden" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}

        {(!edit || tabAwal === 'masuk') && (
          <div hidden={tab !== 'masuk'}>
            <FormMasuk edit={edit} onSelesai={onSelesai} onTutup={onTutup} />
          </div>
        )}
        {(!edit || tabAwal === 'keluar') && (
          <div hidden={tab !== 'keluar'}>
            <FormKeluar edit={edit} onSelesai={onSelesai} onTutup={onTutup} />
          </div>
        )}
      </div>
    </Modal>
  );
}
