import {
  FaBoxes,
  FaCashRegister,
  FaCreditCard,
  FaHistory,
  FaReceipt,
  FaTruck,
  FaUtensils,
} from 'react-icons/fa';

export const AKAR_UNIT = '/koperasi/unit-usaha';
export const JALUR_STOK_KANTIN = `${AKAR_UNIT}/kantin/stok`;
export const JALUR_KASIR_KANTIN = `${AKAR_UNIT}/kantin/kasir`;

/**
 * Unit usaha koperasi. `menu` = isi modul unit itu (paling banyak 5: batas NavBawah);
 * menu pertama menjadi halaman masuknya.
 */
export const UNIT_USAHA = Object.freeze([
  {
    id: 'kantin',
    kode: 'KTN',
    nama: 'Kantin',
    Ikon: FaUtensils,
    menu: [
      { segmen: 'stok', label: 'Stok Barang', Ikon: FaBoxes },
      {
        segmen: 'pembelian',
        label: 'Pembelian',
        Ikon: FaTruck,
        keterangan: 'Barang masuk dari pemasok, dibayar tunai atau utang.',
      },
      { segmen: 'history', label: 'History Transaksi', pendek: 'History', Ikon: FaHistory },
      {
        segmen: 'bon',
        label: 'Bon Anggota',
        pendek: 'Bon',
        Ikon: FaReceipt,
        keterangan: 'Bon anggota yang belum lunas dan pelunasannya.',
      },
      {
        segmen: 'pembayaran',
        label: 'Pembayaran',
        Ikon: FaCreditCard,
        keterangan: 'Cara bayar Kasir dan kas tujuan masing-masing.',
      },
    ],
    // Menu tambahan di menu samping layar lebar; di ponsel lewat tombol melayang
    menuSamping: [{ segmen: 'kasir', label: 'Kasir', Ikon: FaCashRegister }],
  },
]);

export const jalurUnit = (unit, segmen) =>
  segmen ? `${AKAR_UNIT}/${unit.id}/${segmen}` : `${AKAR_UNIT}/${unit.id}`;

/** Unit yang sedang dibuka menurut URL; null bila berada di menu utama Koperasi. */
export function unitDariPath(path) {
  if (!path.startsWith(`${AKAR_UNIT}/`)) return null;
  const id = path.slice(AKAR_UNIT.length + 1).split('/')[0];
  return UNIT_USAHA.find((u) => u.id === id) ?? null;
}
