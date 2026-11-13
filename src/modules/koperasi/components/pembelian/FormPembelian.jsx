import { useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { PANJANG } from '@/utils/batas';
import { tanggalIso } from '@/utils/nilai';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { idPembelianBaru } from '../../services/bukuDb';
import { catatPembelian } from '../../services/fungsi';
import MasukanRupiah from '../MasukanRupiah';
import PilihKas from '../PilihKas';
import TabHalaman from '../TabHalaman';
import { adalahResep, satuanJual } from '../../utils/barang';
import { BATAS } from '../../data/aturan';

const CARA = [
  { id: 'tunai', label: 'Tunai' },
  { id: 'utang', label: 'Utang' },
];
const barisBaru = () => ({
  kunci: crypto.randomUUID?.() ?? String(Math.random()),
  barangId: '',
  kemasanId: '',
  jumlah: 1,
  harga: 0,
});
const bahanBaru = () => ({
  kunci: crypto.randomUUID?.() ?? String(Math.random()),
  nama: '',
  nilai: 0,
});
/**
 * Catat pembelian dari pemasok: barang (stok bertambah, harga pokok rata-rata diperbarui; bisa per
 * kemasan) dan bahan habis pakai seperti es, gula, sedotan, cup (langsung dibebankan, tidak distok).
 */
export default function FormPembelian({ barang, kas, onSelesai }) {
  const [id, setId] = useState(idPembelianBaru);
  const [tanggal, setTanggal] = useState(tanggalIso());
  const [pemasok, setPemasok] = useState('');
  const [baris, setBaris] = useState([barisBaru()]);
  const [bahan, setBahan] = useState([]);
  const [cara, setCara] = useState('tunai');
  const [kasId, setKasId] = useState('');
  const [jatuhTempo, setJatuhTempo] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const aktif = barang.filter((b) => b.aktif && !adalahResep(b));
  const petaBarang = new Map(barang.map((b) => [b.id, b]));
  const ubahBahan = (kunci, isi) =>
    setBahan((s) => s.map((x) => (x.kunci === kunci ? { ...x, ...isi } : x)));
  const bahanTerisi = bahan.filter((x) => x.nama.trim() && x.nilai > 0);
  const bahanSetengah = bahan.some((x) => !x.nama.trim() !== !(x.nilai > 0));
  const totalBahan = bahanTerisi.reduce((n, x) => n + x.nilai, 0);
  const ubah = (kunci, isi) =>
    setBaris((s) => s.map((b) => (b.kunci === kunci ? { ...b, ...isi } : b)));
  const terisi = baris.filter((b) => b.barangId && b.jumlah > 0);
  const totalBarang = terisi.reduce((n, b) => n + b.jumlah * b.harga, 0);
  const total = totalBarang + totalBahan;
  const kembar = new Set(terisi.map((b) => `${b.barangId}|${b.kemasanId}`)).size !== terisi.length;
  const kasDipilih = kas.find((k) => k.id === kasId);
  const lebih = cara === 'tunai' && kasDipilih && total > kasDipilih.saldo;

  const simpan = async (e) => {
    e.preventDefault();
    setSibuk(true);
    try {
      await catatPembelian({
        id,
        tanggal,
        pemasok: pemasok.trim(),
        items: terisi.map(({ barangId, kemasanId, jumlah, harga }) => ({
          barangId,
          kemasanId,
          jumlah,
          harga,
        })),
        bahan: bahanTerisi.map((x) => ({ nama: x.nama.trim(), nilai: x.nilai })),
        caraBayar: cara,
        kasId: cara === 'tunai' ? kasId : '',
        jatuhTempo: cara === 'utang' ? jatuhTempo : '',
        keterangan: keterangan.trim(),
      });
      showToast('Pembelian tersimpan.');
      setId(idPembelianBaru());
      setBaris([barisBaru()]);
      setBahan([]);
      setPemasok('');
      setKeterangan('');
      onSelesai?.();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <form className={`${K.kartu} flex flex-col gap-3.5`} onSubmit={simpan}>
      <div className="grid gap-3.5 sm:grid-cols-2">
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
        <label>
          <span className={K.label}>Pemasok (boleh kosong)</span>
          <input
            className={K.masukan}
            maxLength={PANJANG.pemasok}
            value={pemasok}
            onChange={(e) => setPemasok(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={K.label}>Barang</span>
        {baris.map((b) => (
          <div
            key={b.kunci}
            className={`${K.kotakBaris} grid gap-2 sm:grid-cols-[1fr_130px_80px_140px_auto] sm:items-end`}
          >
            <select
              className={K.masukan}
              aria-label="Barang"
              value={b.barangId}
              onChange={(e) => ubah(b.kunci, { barangId: e.target.value, kemasanId: '' })}
            >
              <option value="">Pilih barang…</option>
              {aktif.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama} ({x.satuan})
                </option>
              ))}
            </select>
            <select
              className={K.masukan}
              aria-label="Satuan beli"
              value={b.kemasanId}
              disabled={!b.barangId}
              onChange={(e) => ubah(b.kunci, { kemasanId: e.target.value })}
            >
              {(petaBarang.get(b.barangId) ? satuanJual(petaBarang.get(b.barangId)) : []).map(
                (s) => (
                  <option key={s.id || 'dasar'} value={s.id}>
                    {s.nama}
                    {s.isi > 1 ? ` (${s.isi})` : ''}
                  </option>
                ),
              )}
            </select>
            <input
              className={K.masukan}
              inputMode="numeric"
              aria-label="Jumlah"
              placeholder="Jumlah"
              value={b.jumlah || ''}
              onChange={(e) =>
                ubah(b.kunci, { jumlah: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })
              }
            />
            <MasukanRupiah
              nilai={b.harga}
              onUbah={(v) => ubah(b.kunci, { harga: v })}
              aria-label="Harga beli per satuan yang dibeli"
              placeholder="Harga per satuan"
            />
            <button
              type="button"
              className={K.tombolKotak}
              aria-label="Hapus baris"
              disabled={baris.length === 1 && !bahan.length}
              onClick={() => setBaris((s) => s.filter((x) => x.kunci !== b.kunci))}
            >
              <FaTimes size={13} />
            </button>
          </div>
        ))}
        {baris.length < BATAS.barisTransaksi && (
          <button
            type="button"
            className={`${K.tombolKedua} self-start`}
            onClick={() => setBaris((s) => [...s, barisBaru()])}
          >
            <FaPlus size={11} /> Tambah barang
          </button>
        )}
        {kembar && (
          <span className={K.pesanGalat}>Barang dengan satuan yang sama dipilih dua kali.</span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div>
          <span className={K.label}>Bahan habis pakai (boleh kosong)</span>
          <span className={`${K.redup} block`}>
            Es, gula, sedotan, cup, dan sejenisnya: tidak distok, langsung dicatat sebagai biaya.
          </span>
        </div>
        {bahan.map((x) => (
          <div
            key={x.kunci}
            className={`${K.kotakBaris} grid gap-2 sm:grid-cols-[1fr_160px_auto] sm:items-end`}
          >
            <input
              className={K.masukan}
              maxLength={100}
              aria-label="Nama bahan"
              placeholder="Mis. Es batu 2 bungkus"
              value={x.nama}
              onChange={(e) => ubahBahan(x.kunci, { nama: e.target.value })}
            />
            <MasukanRupiah
              nilai={x.nilai}
              onUbah={(v) => ubahBahan(x.kunci, { nilai: v })}
              aria-label="Nilai bahan"
              placeholder="Nilai"
            />
            <button
              type="button"
              className={K.tombolKotak}
              aria-label="Hapus bahan"
              onClick={() => setBahan((s) => s.filter((y) => y.kunci !== x.kunci))}
            >
              <FaTimes size={13} />
            </button>
          </div>
        ))}
        {bahan.length < BATAS.bahan && (
          <button
            type="button"
            className={`${K.tombolKedua} self-start`}
            onClick={() => setBahan((s) => [...s, bahanBaru()])}
          >
            <FaPlus size={11} /> Tambah bahan habis pakai
          </button>
        )}
        {bahanSetengah && (
          <span className={K.pesanGalat}>Lengkapi nama dan nilai setiap bahan.</span>
        )}
      </div>

      <div>
        <span className={K.label}>Cara bayar</span>
        <TabHalaman daftar={CARA} aktif={cara} onUbah={setCara} label="Cara bayar" />
      </div>
      {cara === 'tunai' ? (
        <>
          <PilihKas kas={kas} nilai={kasId} onUbah={setKasId} label="Dibayar dari kas" />
          {lebih && <span className={K.pesanGalat}>Saldo {kasDipilih.nama} tidak cukup.</span>}
        </>
      ) : (
        <label>
          <span className={K.label}>Jatuh tempo (boleh kosong)</span>
          <input
            type="date"
            className={K.masukan}
            value={jatuhTempo}
            onChange={(e) => setJatuhTempo(e.target.value)}
          />
        </label>
      )}
      <label>
        <span className={K.label}>Keterangan (boleh kosong)</span>
        <input
          className={K.masukan}
          maxLength={PANJANG.keteranganKoperasi}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
        />
      </label>
      <div className={K.barisTotal}>
        <span className={K.judulBaris}>Total</span>
        <span className={K.nominal}>{rupiah(total)}</span>
      </div>
      <button
        type="submit"
        className={K.tombolUtama}
        disabled={
          sibuk ||
          (!terisi.length && !bahanTerisi.length) ||
          kembar ||
          bahanSetengah ||
          !total ||
          !tanggal ||
          (cara === 'tunai' && (!kasId || lebih))
        }
      >
        {sibuk ? 'Menyimpan…' : 'Simpan pembelian'}
      </button>
    </form>
  );
}
