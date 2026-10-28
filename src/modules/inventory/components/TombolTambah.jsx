import { FaPlus } from 'react-icons/fa';
import { K } from '../ui/kelas';
import { useInventori } from '../hooks/useInventori';

/** Tombol "Tambah Transaksi" di kepala kartu riwayat dan Cetak Terima Barang. */
export default function TombolTambah() {
  const { izin, bukaTransaksi } = useInventori();
  return (
    <button
      className={`${K.btnUtama} max-[820px]:flex-auto`}
      type="button"
      disabled={!izin.tulis}
      onClick={() => bukaTransaksi('keluar')}
      title={izin.tulis ? undefined : 'Hanya peran Umum yang bisa mencatat transaksi'}
    >
      <FaPlus size={12} />
      Tambah Transaksi
    </button>
  );
}
