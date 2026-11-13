import { useState } from 'react';
import { LIMIT_KUERI, PANJANG } from '@/utils/batas';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { rupiah, tanggalPendek } from '../../ui/format';
import { KELOMPOK_AKUN } from '../../data/baganAkun';
import { useDaftarBerhalaman } from '../../hooks/useDaftarBerhalaman';
import { useKasBank } from '../../hooks/useKasBank';
import { ambilTransaksiUmum, kueriTransaksiUmum } from '../../services/bukuDb';
import { catatTransaksiUmum } from '../../services/fungsi';
import Halaman from '../../components/Halaman';
import MasukanRupiah from '../../components/MasukanRupiah';
import PilihKas from '../../components/PilihKas';
import TabHalaman from '../../components/TabHalaman';
import { akunKontrol } from '../../data/aturan';

const KEMBALI = { to: '/koperasi/pembukuan', label: 'Pembukuan' };
const bolehDipilih = (a) => a.aktif && !a.kas && !akunKontrol(a.id);
const CARA = [
  { id: 'kas', label: 'Tunai/Bank' },
  { id: 'utang', label: 'Utang' },
];

/** Pengeluaran lain-lain (beban, iuran pusat, dll.) atau penerimaan lain-lain. */
function TransaksiUmum({ jenis }) {
  const keluar = jenis === 'pengeluaran';
  const { kas, akun } = useKasBank();
  const [akunId, setAkunId] = useState('');
  const [cara, setCara] = useState('kas');
  const [kasId, setKasId] = useState('');
  const [jumlah, setJumlah] = useState(0);
  const [tanggal, setTanggal] = useState(tanggalIso());
  const [keterangan, setKeterangan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const { daftar, memuat } = useDaftarBerhalaman(
    'koperasi_transaksi_umum',
    () => kueriTransaksiUmum(),
    ambilTransaksiUmum,
    LIMIT_KUERI.transaksiUmum,
    'Riwayat transaksi gagal dimuat.',
  );
  const riwayat = daftar.filter((t) => t.jenis === jenis);
  const utang = keluar && cara === 'utang';
  const kasDipilih = kas.find((k) => k.id === kasId);
  const lebih = keluar && !utang && kasDipilih && jumlah > kasDipilih.saldo;

  // Pengeluaran: utamakan beban; penerimaan: utamakan pendapatan
  const urutan = keluar
    ? [
        'beban',
        'asetLancar',
        'asetTetap',
        'ekuitas',
        'kewajibanLancar',
        'kewajibanPanjang',
        'pendapatan',
        'hpp',
      ]
    : [
        'pendapatan',
        'kewajibanLancar',
        'kewajibanPanjang',
        'ekuitas',
        'asetLancar',
        'asetTetap',
        'beban',
        'hpp',
      ];
  const kelompok = urutan
    .map((id) => ({
      ...KELOMPOK_AKUN.find((k) => k.id === id),
      akun: akun.filter((a) => a.kelompok === id && bolehDipilih(a)),
    }))
    .filter((k) => k.akun.length);

  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await catatTransaksiUmum({
        jenis,
        tanggal,
        akunId,
        kasId: utang ? '' : kasId,
        utang,
        jumlah,
        keterangan: keterangan.trim(),
      });
      showToast(keluar ? 'Pengeluaran tersimpan.' : 'Penerimaan tersimpan.');
      setJumlah(0);
      setKeterangan('');
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <Halaman
      judul={keluar ? 'Pengeluaran Lain-lain' : 'Penerimaan Lain-lain'}
      sub={
        keluar
          ? 'Beban & pengeluaran di luar pembelian barang, termasuk iuran wajib ke koperasi pusat.'
          : 'Pemasukan di luar penjualan dan simpanan, misalnya bunga bank atau hibah.'
      }
      kembali={KEMBALI}
    >
      <form className={`${K.kartu} flex flex-col gap-3.5 mb-5`} onSubmit={simpan}>
        <label>
          <span className={K.label}>{keluar ? 'Untuk (akun)' : 'Dari (akun)'}</span>
          <select className={K.masukan} value={akunId} onChange={(e) => setAkunId(e.target.value)}>
            <option value="">Pilih akun…</option>
            {kelompok.map((k) => (
              <optgroup key={k.id} label={k.label}>
                {k.akun.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.kode} {a.nama}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          <span className={K.label}>Keterangan</span>
          <input
            className={K.masukan}
            maxLength={PANJANG.keteranganKoperasi}
            placeholder={keluar ? 'Mis. Iuran wajib ke koperasi pusat' : 'Mis. Bunga bank November'}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </label>
        <label>
          <span className={K.label}>Jumlah</span>
          <MasukanRupiah nilai={jumlah} onUbah={setJumlah} />
        </label>
        {keluar && <TabHalaman daftar={CARA} aktif={cara} onUbah={setCara} label="Cara bayar" />}
        {!utang && (
          <PilihKas
            kas={kas}
            nilai={kasId}
            onUbah={setKasId}
            label={keluar ? 'Dibayar dari kas' : 'Masuk ke kas'}
          />
        )}
        {lebih && <span className={K.pesanGalat}>Saldo {kasDipilih.nama} tidak cukup.</span>}
        <label>
          <span className={K.label}>Tanggal</span>
          <input
            type="date"
            className={K.masukan}
            max={tanggalIso()}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className={K.tombolUtama}
          disabled={
            sibuk ||
            !akunId ||
            !jumlah ||
            !keterangan.trim() ||
            !tanggal ||
            (!utang && !kasId) ||
            lebih
          }
        >
          {sibuk ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>

      <h2 className={`${K.judulSeksi} mb-2`}>Terbaru</h2>
      {memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : !riwayat.length ? (
        <p className={K.kosong}>Belum ada catatan.</p>
      ) : (
        <ul className={K.kartuDaftar}>
          {riwayat.map((t) => (
            <li key={t.id} className={`${K.barisDaftar} px-4 py-2.5 flex justify-between gap-3`}>
              <span className="min-w-0">
                <span className={`${K.judulBaris} block break-words`}>{t.keterangan}</span>
                <span className={`${K.redup} block`}>
                  {tanggalPendek(t.tanggal)} · {t.akunNama} · {t.utang ? 'Utang' : t.kasNama}
                </span>
              </span>
              <span className={K.nominal}>{rupiah(t.jumlah)}</span>
            </li>
          ))}
        </ul>
      )}
    </Halaman>
  );
}

export const Pengeluaran = () => <TransaksiUmum jenis="pengeluaran" />;
export const Penerimaan = () => <TransaksiUmum jenis="penerimaan" />;
