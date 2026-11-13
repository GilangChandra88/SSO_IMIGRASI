import { K } from '../../ui/kelas';
import { adalahResep, bisaDibuat } from '../../utils/barang';
import { rupiah, angka } from '../../ui/format';

/**
 * Kisi barang: ketuk = tambah satu (barang berkemasan: pilih satuannya dulu).
 * `jumlahDi(barangId)` = banyak baris barang itu di keranjang (semua satuan).
 */
export default function PilihBarang({ barang, petaBarang, jumlahDi, onPilih }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {barang.map((b) => {
        const n = jumlahDi(b.id);
        const kemasan = b.kemasan || [];
        return (
          <li key={b.id}>
            <button
              type="button"
              className={`${K.kartu} ${K.tautan} relative block w-full h-full text-left cursor-pointer`}
              onClick={() => onPilih(b)}
            >
              {n > 0 && (
                <span className={K.jumlahPilih} aria-label={`${n} di keranjang`}>
                  {n}
                </span>
              )}
              <span className={`${K.judulBaris} block pr-6 line-clamp-2`}>{b.nama}</span>
              <span className={`${K.nominal} block mt-1`}>{rupiah(b.hargaJual)}</span>
              {kemasan.length > 0 && (
                <span className={`${K.redup} block truncate`}>
                  + {kemasan.map((k) => k.nama).join(', ')}
                </span>
              )}
              <span className={`${K.redup} block`}>
                {adalahResep(b)
                  ? `Bisa dibuat ±${angka(bisaDibuat(b, petaBarang))}`
                  : `Stok ${angka(b.stok)} ${b.satuan}`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
