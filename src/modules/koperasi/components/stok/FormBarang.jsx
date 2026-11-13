import { useMemo, useState } from 'react';
import { PANJANG } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { rupiah } from '../../ui/format';
import { aturAktifBarang, simpanBarang } from '../../services/fungsi';
import { barkodeStandar, PESAN_TIDAK_STANDAR } from '../../utils/barkode';
import MasukanBarkode from './MasukanBarkode';
import { hppResep } from '../../utils/barang';
import MasukanRupiah from '../MasukanRupiah';
import TabHalaman from '../TabHalaman';
import EditorKemasan from './EditorKemasan';
import EditorKomponen from './EditorKomponen';

const JENIS = [
  { id: 'barang', label: 'Barang' },
  { id: 'resep', label: 'Resep' },
];

/**
 * Isian barang baru, atau ubah/nonaktifkan bila `data` diisi. Jenis (barang/resep) tetap setelah
 * dibuat. Stok tidak diisi di sini.
 */
export default function FormBarang({ data, barkodeAwal, kategori, semua, onSelesai }) {
  const [jenis, setJenis] = useState(data?.jenis ?? 'barang');
  const [barkode, setBarkode] = useState(data?.barkode ?? barkodeAwal ?? '');
  const [nama, setNama] = useState(data?.nama ?? '');
  const [kategoriId, setKategoriId] = useState(data?.kategoriId ?? '');
  const [satuan, setSatuan] = useState(data?.satuan ?? '');
  const [hargaJual, setHargaJual] = useState(data?.hargaJual ?? 0);
  const [kemasan, setKemasan] = useState(data?.kemasan ?? []);
  const [komponen, setKomponen] = useState(data?.komponen ?? []);
  const [sibuk, setSibuk] = useState(false);
  const resep = jenis === 'resep';

  const petaBarang = useMemo(() => new Map(semua.map((b) => [b.id, b])), [semua]);
  const bersih = nama.trim();
  const satuanBersih = satuan.trim();
  const lain = semua.filter((b) => b.id !== data?.id);
  const kembar = lain.some((b) => b.nama.toLowerCase() === bersih.toLowerCase());
  const pilihan = kategori.filter((k) => k.aktif || k.id === data?.kategoriId);

  // Barkode unik di semua barang, termasuk barkode kemasan
  const barkodeLain = useMemo(() => {
    const peta = new Map();
    lain.forEach((b) => {
      if (b.barkode) peta.set(b.barkode, b.nama);
      (b.kemasan || []).forEach((k) => k.barkode && peta.set(k.barkode, `${b.nama} (${k.nama})`));
    });
    return peta;
  }, [lain]);
  const kodeIni = [barkode.trim(), ...kemasan.map((k) => k.barkode.trim())].filter(Boolean);
  const pesanBentrok = (kode) =>
    kode && !barkodeStandar(kode)
      ? PESAN_TIDAK_STANDAR
      : barkodeLain.has(kode)
        ? `Sudah dipakai ${barkodeLain.get(kode)}.`
        : '';
  const galatBarkodeDasar = pesanBentrok(barkode.trim());
  const galatBarkode = {};
  kemasan.forEach((k, i) => {
    const kode = k.barkode.trim();
    if (!kode) return;
    if (pesanBentrok(kode)) galatBarkode[k.id] = pesanBentrok(kode);
    else if (kodeIni.indexOf(kode) !== i + (barkode.trim() ? 1 : 0)) {
      galatBarkode[k.id] = 'Barkode ini dipakai dua kali di barang ini.';
    }
  });

  const kemasanBersih = resep
    ? []
    : kemasan.map((k) => ({ ...k, nama: k.nama.trim(), barkode: k.barkode.trim() }));
  const komponenBersih = resep ? komponen.filter((k) => k.barangId) : [];
  const kemasanSah = kemasanBersih.every((k) => k.nama && k.isi >= 2 && k.hargaJual > 0);
  const komponenKembar =
    new Set(komponenBersih.map((k) => k.barangId)).size !== komponenBersih.length;
  const komponenSah =
    !resep || (komponenBersih.length > 0 && komponenBersih.every((k) => k.jumlah >= 1));
  const hpp = resep ? hppResep({ komponen: komponenBersih }, petaBarang) : 0;

  const jalankan = async (aksi, pesan) => {
    setSibuk(true);
    try {
      await aksi();
      showToast(pesan);
      onSelesai();
    } catch (err) {
      showToast(pesanGalat(err), 'error');
      setSibuk(false);
    }
  };

  const simpan = (e) => {
    e.preventDefault();
    const isi = {
      barkode: barkode.trim(),
      nama: bersih,
      kategoriId,
      satuan: satuanBersih,
      hargaJual,
      kemasan: kemasanBersih,
      komponen: komponenBersih,
    };
    jalankan(
      () => simpanBarang(data ? { id: data.id, ...isi } : { ...isi, jenis }),
      data ? 'Barang diperbarui.' : resep ? 'Resep ditambahkan.' : 'Barang ditambahkan.',
    );
  };

  const bisaSimpan =
    !sibuk &&
    bersih &&
    !kembar &&
    !galatBarkodeDasar &&
    !Object.keys(galatBarkode).length &&
    kategoriId &&
    satuanBersih &&
    hargaJual &&
    kemasanSah &&
    komponenSah &&
    !komponenKembar;

  return (
    <form className={`${K.kartu} flex flex-col gap-3.5 max-w-xl`} onSubmit={simpan}>
      {data ? (
        <span className={K.lencana}>{resep ? 'Resep' : 'Barang'}</span>
      ) : (
        <div>
          <TabHalaman daftar={JENIS} aktif={jenis} onUbah={setJenis} label="Jenis barang" />
          <span className={K.redup}>
            {resep
              ? 'Resep tidak punya stok; setiap terjual, stok komponennya yang berkurang.'
              : 'Barang punya stok sendiri.'}
          </span>
        </div>
      )}
      <MasukanBarkode
        label="Barkode"
        nilai={barkode}
        onUbah={setBarkode}
        galat={galatBarkodeDasar}
      />
      <label>
        <span className={K.label}>{resep ? 'Nama menu' : 'Nama barang'}</span>
        <input
          className={K.masukan}
          maxLength={PANJANG.namaBarang}
          placeholder={resep ? 'Mis. Es Kopi Susu' : ''}
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
        {kembar && <span className={K.pesanGalat}>Nama ini sudah ada.</span>}
      </label>
      <label>
        <span className={K.label}>Kategori</span>
        <select
          className={K.masukan}
          value={kategoriId}
          onChange={(e) => setKategoriId(e.target.value)}
        >
          <option value="">Pilih kategori…</option>
          {pilihan.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
        {!pilihan.length && (
          <span className={K.pesanGalat}>Tambahkan kategori lebih dulu di tab Kategori.</span>
        )}
      </label>
      <label>
        <span className={K.label}>{resep ? 'Satuan jual' : 'Satuan dasar (terkecil)'}</span>
        <input
          className={K.masukan}
          maxLength={PANJANG.satuanBarang}
          placeholder={resep ? 'Mis. gelas, porsi' : 'Mis. pcs, batang, botol'}
          value={satuan}
          onChange={(e) => setSatuan(e.target.value)}
        />
      </label>
      <label>
        <span className={K.label}>Harga jual{resep ? '' : ' per satuan dasar'}</span>
        <MasukanRupiah nilai={hargaJual} onUbah={setHargaJual} />
      </label>

      {resep ? (
        <>
          <EditorKomponen
            komponen={komponen}
            onUbah={setKomponen}
            barang={semua}
            petaBarang={petaBarang}
          />
          {komponenKembar && (
            <span className={K.pesanGalat}>Barang yang sama dipilih dua kali.</span>
          )}
          <div className={K.barisTotal}>
            <span className={K.teks}>Perkiraan HPP per porsi</span>
            <span className={K.nominal}>
              {rupiah(hpp)}
              {hargaJual > 0 && ` · untung ${rupiah(hargaJual - hpp)}`}
            </span>
          </div>
        </>
      ) : (
        <>
          <EditorKemasan
            kemasan={kemasan}
            onUbah={setKemasan}
            satuanDasar={satuanBersih}
            galatBarkode={galatBarkode}
          />
          {!kemasanSah && (
            <span className={K.pesanGalat}>
              Lengkapi kemasan: nama, isi minimal 2, dan harga jual.
            </span>
          )}
        </>
      )}

      <button type="submit" className={K.tombolUtama} disabled={!bisaSimpan}>
        {sibuk ? 'Menyimpan…' : 'Simpan'}
      </button>
      {data && (
        <button
          type="button"
          className={K.tombolKedua}
          disabled={sibuk}
          onClick={() =>
            jalankan(
              () => aturAktifBarang({ id: data.id, aktif: !data.aktif }),
              data.aktif ? 'Barang dinonaktifkan.' : 'Barang diaktifkan.',
            )
          }
        >
          {data.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      )}
    </form>
  );
}
