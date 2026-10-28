import { useContext } from 'react';
import { InventoriKonteks } from '../konteks/inventoriKonteks';

/** Data Inventory: barang (dengan Kode SAKTI), kategori, pemasok, transaksi, sisa stok, izin. */
export function useInventori() {
  return useContext(InventoriKonteks);
}
