import { K } from '../ui/kelas';
import { usePengaturan } from '../hooks/useAnggota';
import Halaman from '../components/Halaman';
import FormPengaturan from '../components/FormPengaturan';

/** Pengaturan Simpanan (nominal) dan Persentase SHU memakai dokumen pengaturan yang sama. */
function HalamanPengaturan({ bagian }) {
  const { pengaturan, memuat } = usePengaturan();
  const simpanan = bagian === 'simpanan';
  return (
    <Halaman
      judul={simpanan ? 'Pengaturan Simpanan' : 'Persentase SHU'}
      sub={
        simpanan
          ? 'Nominal simpanan pokok dan wajib. Berlaku untuk setoran berikutnya.'
          : 'Pembagian SHU tahunan ke setiap bagian; disahkan RAT.'
      }
      kembali={
        simpanan
          ? { to: '/koperasi/anggota', label: 'Anggota & Simpanan' }
          : { to: '/koperasi/shu', label: 'SHU' }
      }
    >
      {memuat ? (
        <p className={K.kosong}>Memuat…</p>
      ) : (
        <FormPengaturan
          key={pengaturan.diubahPada?.seconds ?? 'awal'}
          pengaturan={pengaturan}
          bagian={bagian}
        />
      )}
    </Halaman>
  );
}

export const PengaturanSimpanan = () => <HalamanPengaturan bagian="simpanan" />;
export const PersentaseShu = () => <HalamanPengaturan bagian="shu" />;
