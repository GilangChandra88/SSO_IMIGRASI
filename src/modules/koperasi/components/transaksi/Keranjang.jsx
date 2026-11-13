import { FaMinus, FaPlus } from 'react-icons/fa';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';

/** Isi keranjang. baris: [{ kunci, barang, satuan, jumlah }] (satuan = satuan dasar atau kemasan). */
export default function Keranjang({ baris, total, onUbah, onKosongkan, onBayar }) {
  if (!baris.length) return <p className={K.kosong}>Belum ada barang dipilih.</p>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {baris.map(({ kunci, barang, satuan, jumlah }) => (
          <li key={kunci} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className={`${K.judulBaris} block truncate`}>{barang.nama}</span>
              <span className={`${K.redup} block`}>
                {satuan.isi > 1 || barang.kemasan?.length ? `${satuan.nama} · ` : ''}
                {rupiah(satuan.hargaJual * jumlah)}
              </span>
            </div>
            <button
              type="button"
              className={K.tombolKotak}
              aria-label={`Kurangi ${barang.nama}`}
              onClick={() => onUbah(kunci, -1)}
            >
              <FaMinus size={11} />
            </button>
            <span className={`${K.nominal} w-7 text-center`}>{jumlah}</span>
            <button
              type="button"
              className={K.tombolKotak}
              aria-label={`Tambah ${barang.nama}`}
              onClick={() => onUbah(kunci, 1)}
            >
              <FaPlus size={11} />
            </button>
          </li>
        ))}
      </ul>
      <div className={K.barisTotal}>
        <span className={K.judulBaris}>Total</span>
        <span className={K.nominal}>{rupiah(total)}</span>
      </div>
      <button type="button" className={K.tombolUtama} onClick={onBayar}>
        Bayar
      </button>
      <button type="button" className={K.tombolKedua} onClick={onKosongkan}>
        Kosongkan
      </button>
    </div>
  );
}
