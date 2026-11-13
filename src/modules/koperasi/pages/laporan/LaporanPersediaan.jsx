import { K } from '../../ui/kelas';
import { angka, rupiah } from '../../ui/format';
import { useKasBank } from '../../hooks/useKasBank';
import { useStokBarang } from '../../hooks/useStokBarang';
import Halaman from '../../components/Halaman';
import TombolExcel from '../../components/laporan/TombolExcel';

const KEMBALI = { to: '/koperasi/laporan', label: 'Laporan' };

/** Stok dan nilai barang saat ini (harga pokok rata-rata), dibanding saldo akun Persediaan. */
export default function LaporanPersediaan() {
  const { barang, kategori, memuat } = useStokBarang();
  const { persediaan } = useKasBank();
  const namaKat = Object.fromEntries(kategori.map((k) => [k.id, k.nama]));
  const daftar = barang.filter((b) => b.jenis !== 'resep' && (b.aktif || b.stok !== 0));
  const nilai = (b) => b.stok * (b.hargaPokok || 0);
  const total = daftar.reduce((n, b) => n + nilai(b), 0);
  const akun = persediaan?.saldo ?? 0;

  const lembar = () => [
    {
      nama: 'Persediaan',
      lebar: [36, 18, 10, 10, 16, 16, 16],
      baris: [
        ['Barang', 'Kategori', 'Stok', 'Satuan', 'Harga pokok', 'Nilai', 'Harga jual'],
        ...daftar.map((b) => [
          b.nama,
          namaKat[b.kategoriId] ?? '',
          b.stok,
          b.satuan,
          b.hargaPokok || 0,
          nilai(b),
          b.hargaJual,
        ]),
        ['TOTAL', '', '', '', '', total, ''],
        ['Saldo akun Persediaan', '', '', '', '', akun, ''],
      ],
    },
  ];

  return (
    <Halaman
      judul="Persediaan"
      sub="Stok barang kantin saat ini dan nilainya menurut harga pokok rata-rata."
      kembali={KEMBALI}
      aksi={
        <TombolExcel namaBerkas="Persediaan Kantin.xlsx" buatLembar={lembar} disabled={memuat} />
      }
    >
      <div className={`${K.kartu} mb-4 grid gap-1`}>
        <span className={`${K.teks} flex justify-between gap-3`}>
          <span>Nilai barang (stok × harga pokok)</span>
          <span className="tabular-nums">{rupiah(total)}</span>
        </span>
        <span className={`${K.teks} flex justify-between gap-3`}>
          <span>Saldo akun Persediaan</span>
          <span className="tabular-nums">{rupiah(akun)}</span>
        </span>
        {total !== akun && (
          <span className={K.redup}>
            Selisih {rupiah(total - akun)}: bisa karena pembulatan harga rata-rata, stok minus, atau
            stok awal yang belum dimasukkan ke Saldo Awal akun Persediaan.
          </span>
        )}
      </div>
      {memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : !daftar.length ? (
        <p className={K.kosong}>Belum ada barang.</p>
      ) : (
        <ul className={K.kartuDaftar}>
          {daftar.map((b) => (
            <li key={b.id} className={`${K.barisDaftar} px-4 py-2.5 flex justify-between gap-3`}>
              <span className="min-w-0">
                <span className={`${K.judulBaris} block truncate`}>{b.nama}</span>
                <span className={K.redup}>
                  {angka(b.stok)} {b.satuan} × {rupiah(b.hargaPokok || 0)}
                </span>
                {b.stok < 0 && <span className={K.lencanaBahaya}>Stok minus</span>}
              </span>
              <span className={K.nominal}>{rupiah(nilai(b))}</span>
            </li>
          ))}
        </ul>
      )}
    </Halaman>
  );
}
