import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { K } from '../../ui/kelas';
import { JALUR_STOK_KANTIN } from '../../data/unitUsaha';
import { useStokBarang } from '../../hooks/useStokBarang';
import FormBarang from '../../components/stok/FormBarang';
import StokAwalBarang from '../../components/stok/StokAwalBarang';

/** Halaman penuh tambah barang (`/tambah`) dan ubah barang (`/:id/ubah`). */
export default function HalamanBarang() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { barang, kategori, memuat } = useStokBarang();
  const data = id ? barang.find((b) => b.id === id) : null;

  let isi;
  if (memuat) isi = <p className={K.kosong}>Memuat…</p>;
  else if (id && !data) isi = <p className={K.kosong}>Barang tidak ditemukan.</p>;
  else {
    isi = (
      <>
        <FormBarang
          key={id ?? 'baru'}
          data={data}
          barkodeAwal={state?.barkode}
          kategori={kategori}
          semua={barang}
          onSelesai={() => navigate(JALUR_STOK_KANTIN)}
        />
        {data && <StokAwalBarang key={`${data.id}-${data.adaTransaksi}`} barang={data} />}
      </>
    );
  }

  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <Link to={JALUR_STOK_KANTIN} className={K.kembali}>
          <FaArrowLeft size={11} aria-hidden="true" /> Stok Barang
        </Link>
        <h1 className={`${K.h1} mb-3`}>{id ? 'Ubah Barang' : 'Tambah Barang'}</h1>
        {isi}
      </div>
    </div>
  );
}
