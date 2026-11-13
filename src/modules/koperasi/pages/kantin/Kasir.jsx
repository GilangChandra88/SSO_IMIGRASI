import { useMemo, useState } from 'react';
import { FaBarcode, FaShoppingCart, FaTimes } from 'react-icons/fa';
import Modal from '@/components/Modal';
import { showToast } from '@/utils/toastStore';
import { K } from '../../ui/kelas';
import { useAnggota } from '../../hooks/useAnggota';
import { useKasBank } from '../../hooks/useKasBank';
import { usePembayaran } from '../../hooks/usePembayaran';
import { useStokBarang } from '../../hooks/useStokBarang';
import PemindaiBarkode from '../../components/stok/PemindaiBarkode';
import BayarKasir from '../../components/transaksi/BayarKasir';
import Keranjang from '../../components/transaksi/Keranjang';
import PilihBarang from '../../components/transaksi/PilihBarang';
import PilihSatuan from '../../components/transaksi/PilihSatuan';
import { cariBarkode, satuanDari } from '../../utils/barang';
import { rupiah } from '../../ui/format';
import { BATAS } from '../../data/aturan';

export default function Kasir() {
  const { barang, kategori, memuat } = useStokBarang();
  const [cari, setCari] = useState('');
  const [saringKategori, setSaringKategori] = useState('');
  const [pindai, setPindai] = useState(false);
  const [lihatKeranjang, setLihatKeranjang] = useState(false);
  const [bayar, setBayar] = useState(false);
  const { kas } = useKasBank();
  const { aktif: pembayaran } = usePembayaran();
  const { aktif: anggotaAktif } = useAnggota();
  // { ['barangId|kemasanId']: jumlah } (kemasanId '' = satuan dasar)
  const [keranjang, setKeranjang] = useState({});
  const [pilihSatuan, setPilihSatuan] = useState(null);

  const aktif = useMemo(() => barang.filter((b) => b.aktif), [barang]);
  const petaBarang = useMemo(() => new Map(barang.map((b) => [b.id, b])), [barang]);
  const kunci = cari.trim().toLowerCase();
  const tampil = aktif.filter(
    (b) =>
      (!kunci ||
        b.nama.toLowerCase().includes(kunci) ||
        b.barkode?.includes(kunci) ||
        (b.kemasan || []).some((k) => k.barkode?.includes(kunci))) &&
      (!saringKategori || b.kategoriId === saringKategori),
  );

  const ubahJumlah = (id, selisih) =>
    setKeranjang((isi) => {
      const jumlah = Math.min((isi[id] ?? 0) + selisih, BATAS.jumlahPerBaris);
      const { [id]: _lama, ...sisa } = isi;
      return jumlah > 0 ? { ...isi, [id]: jumlah } : sisa;
    });

  const tambah = (b, kemasanId) => {
    const id = `${b.id}|${kemasanId}`;
    if (!keranjang[id] && Object.keys(keranjang).length >= BATAS.barisTransaksi) {
      showToast(`Paling banyak ${BATAS.barisTransaksi} jenis barang per transaksi.`, 'error');
      return;
    }
    ubahJumlah(id, 1);
  };
  const pilih = (b) => ((b.kemasan || []).length ? setPilihSatuan(b) : tambah(b, ''));

  const saatTerbaca = (kode) => {
    const hasil = cariBarkode(barang, kode);
    const ketemu = hasil?.barang;
    if (!ketemu) {
      showToast('Barkode ini belum terdaftar di Stok Barang.', 'error');
    } else if (!ketemu.aktif) {
      showToast(`${ketemu.nama} sedang nonaktif.`, 'error');
    } else {
      tambah(ketemu, hasil.kemasanId);
      showToast(`${ketemu.nama} (${satuanDari(ketemu, hasil.kemasanId).nama}) ditambahkan.`);
    }
  };

  const baris = Object.entries(keranjang)
    .map(([k, jumlah]) => {
      const [barangId, kemasanId] = k.split('|');
      const b = petaBarang.get(barangId);
      if (!b?.aktif) return null;
      const satuan = satuanDari(b, kemasanId);
      // Kemasan yang sudah dihapus dari barang: baris dibuang
      if (satuan.id !== kemasanId) return null;
      return { kunci: k, barang: b, satuan, jumlah };
    })
    .filter(Boolean);
  const total = baris.reduce((n, b) => n + b.satuan.hargaJual * b.jumlah, 0);
  const jumlahDi = (id) =>
    baris.filter((b) => b.barang.id === id).reduce((n, b) => n + b.jumlah, 0);
  const banyak = baris.reduce((n, b) => n + b.jumlah, 0);

  const isiKeranjang = (
    <Keranjang
      baris={baris}
      total={total}
      onUbah={ubahJumlah}
      onBayar={() => {
        setLihatKeranjang(false);
        setBayar(true);
      }}
      onKosongkan={() => {
        setKeranjang({});
        setLihatKeranjang(false);
      }}
    />
  );

  let daftar;
  if (memuat) daftar = <p className={K.kosong}>Memuat…</p>;
  else if (!aktif.length) daftar = <p className={K.kosong}>Belum ada barang di Stok Barang.</p>;
  else if (!tampil.length) daftar = <p className={K.kosong}>Barang tidak ditemukan.</p>;
  else
    daftar = (
      <PilihBarang barang={tampil} petaBarang={petaBarang} jumlahDi={jumlahDi} onPilih={pilih} />
    );

  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <h1 className={`${K.h1} mb-3`}>Kasir</h1>
        <div
          className={`md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-5 md:items-start ${baris.length ? 'pb-16 md:pb-0' : ''}`}
        >
          <div className="min-w-0">
            {pindai && <PemindaiBarkode berulang onHasil={saatTerbaca} />}
            <div className="flex gap-2 mb-2">
              <input
                type="search"
                className={K.masukan}
                placeholder="Cari nama atau barkode…"
                aria-label="Cari nama atau barkode"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
              />
              <button
                type="button"
                className={K.tombolKotak}
                disabled={memuat}
                aria-pressed={pindai}
                aria-label={pindai ? 'Tutup kamera' : 'Scan barkode'}
                title={pindai ? 'Tutup kamera' : 'Scan barkode'}
                onClick={() => setPindai((p) => !p)}
              >
                {pindai ? <FaTimes size={16} /> : <FaBarcode size={18} />}
              </button>
            </div>
            <select
              className={`${K.masukan} mb-3`}
              aria-label="Saring menurut kategori"
              value={saringKategori}
              onChange={(e) => setSaringKategori(e.target.value)}
            >
              <option value="">Semua kategori</option>
              {kategori
                .filter((k) => k.aktif)
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
            </select>
            {daftar}
          </div>

          {/* Layar lebar: keranjang di samping; ponsel lewat bilah di bawah */}
          <aside className={`hidden md:block sticky top-4 ${K.kartu}`}>
            <h2 className={`${K.judulSeksi} mb-3`}>Keranjang</h2>
            {isiKeranjang}
          </aside>
        </div>
      </div>

      {baris.length > 0 && (
        <div className={K.bilahKeranjang}>
          <button
            type="button"
            className={`${K.tombolUtama} justify-between`}
            onClick={() => setLihatKeranjang(true)}
          >
            <span className="inline-flex items-center gap-2">
              <FaShoppingCart size={13} aria-hidden="true" /> {banyak} barang
            </span>
            <span>{rupiah(total)}</span>
          </button>
        </div>
      )}

      {lihatKeranjang && (
        <Modal onClose={() => setLihatKeranjang(false)} labelledBy="judul-keranjang" lembar>
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 id="judul-keranjang" className={K.judulSeksi}>
                Keranjang
              </h2>
              <button
                type="button"
                className={K.tombolIkon}
                aria-label="Tutup"
                onClick={() => setLihatKeranjang(false)}
              >
                <FaTimes size={15} />
              </button>
            </div>
            {isiKeranjang}
          </div>
        </Modal>
      )}

      {pilihSatuan && (
        <PilihSatuan
          barang={pilihSatuan}
          onTutup={() => setPilihSatuan(null)}
          onPilih={(kemasanId) => {
            tambah(pilihSatuan, kemasanId);
            setPilihSatuan(null);
          }}
        />
      )}

      {bayar && (
        <BayarKasir
          baris={baris}
          total={total}
          pembayaran={pembayaran}
          namaKas={Object.fromEntries(kas.map((k) => [k.id, k.nama]))}
          anggota={anggotaAktif}
          onTutup={() => setBayar(false)}
          onSelesai={() => {
            setKeranjang({});
            setBayar(false);
          }}
        />
      )}
    </div>
  );
}
