import { useState } from 'react';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { aturStokAwalBarang } from '../../services/fungsi';
import MasukanRupiah from '../MasukanRupiah';

/**
 * Stok awal & harga pokok barang saat pembukuan dimulai. Hanya bisa diisi sebelum barang
 * bertransaksi; nilainya (stok × harga pokok) harus ikut di Saldo Awal akun Persediaan.
 */
export default function StokAwalBarang({ barang }) {
  const [stok, setStok] = useState(barang.stok > 0 ? barang.stok : 0);
  const [harga, setHarga] = useState(barang.hargaPokok || 0);
  const [sibuk, setSibuk] = useState(false);

  if (barang.jenis === 'resep') return null;

  if (barang.adaTransaksi) {
    return (
      <div className={`${K.kartu} max-w-xl mt-4`}>
        <h2 className={`${K.judulSeksi} mb-1`}>Stok & harga pokok</h2>
        <p className={K.teks}>
          Stok {barang.stok} {barang.satuan} · harga pokok rata-rata{' '}
          {rupiah(barang.hargaPokok || 0)}
        </p>
        <p className={K.redup}>Berubah otomatis lewat Pembelian dan Kasir.</p>
      </div>
    );
  }

  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await aturStokAwalBarang({ barangId: barang.id, stok, hargaPokok: harga });
      showToast('Stok awal tersimpan.');
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <form className={`${K.kartu} flex flex-col gap-3.5 max-w-xl mt-4`} onSubmit={simpan}>
      <div>
        <h2 className={K.judulSeksi}>Stok awal</h2>
        <p className={K.redup}>
          Stok yang sudah ada di rak saat pembukuan dimulai. Setelah barang bertransaksi, stok hanya
          berubah lewat Pembelian dan Kasir.
        </p>
      </div>
      <label>
        <span className={K.label}>Jumlah ({barang.satuan})</span>
        <input
          className={K.masukan}
          inputMode="numeric"
          value={stok || ''}
          placeholder="0"
          onChange={(e) => setStok(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
        />
      </label>
      <label>
        <span className={K.label}>Harga beli per {barang.satuan}</span>
        <MasukanRupiah nilai={harga} onUbah={setHarga} />
      </label>
      <p className={K.redup}>
        Nilai persediaan: {rupiah(stok * harga)} (masukkan juga ke Saldo Awal akun Persediaan).
      </p>
      <button type="submit" className={K.tombolKedua} disabled={sibuk}>
        {sibuk ? 'Menyimpan…' : 'Simpan stok awal'}
      </button>
    </form>
  );
}
