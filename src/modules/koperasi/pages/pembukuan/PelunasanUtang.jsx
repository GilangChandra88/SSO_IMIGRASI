import { useKasBank } from '../../hooks/useKasBank';
import Halaman from '../../components/Halaman';
import DaftarUtang from '../../components/pembelian/DaftarUtang';

export default function PelunasanUtang() {
  const { kas } = useKasBank();
  return (
    <Halaman
      judul="Pelunasan Utang"
      sub="Pembelian barang yang dibayar dengan utang dan belum lunas."
      kembali={{ to: '/koperasi/pembukuan', label: 'Pembukuan' }}
    >
      <DaftarUtang kas={kas} />
    </Halaman>
  );
}
