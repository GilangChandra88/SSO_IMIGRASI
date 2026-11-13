import { useState } from 'react';
import { ANIM } from '@/utils/animasi';
import { K } from '../../ui/kelas';
import { useStokBarang } from '../../hooks/useStokBarang';
import TabHalaman from '../../components/TabHalaman';
import DaftarBarang from '../../components/stok/DaftarBarang';
import KategoriBarang from '../../components/stok/KategoriBarang';
import StokOpname from '../../components/stok/StokOpname';

const TAB = [
  { id: 'barang', label: 'Barang' },
  { id: 'kategori', label: 'Kategori' },
  { id: 'opname', label: 'Opname' },
];

export default function StokBarang() {
  const [tab, setTab] = useState('barang');
  const { barang, kategori, memuat } = useStokBarang();
  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <h1 className={`${K.h1} mb-3`}>Stok Barang</h1>
        <TabHalaman daftar={TAB} aktif={tab} onUbah={setTab} label="Bagian Stok Barang" />
        <div key={tab} className={ANIM.muncul}>
          {tab === 'barang' && <DaftarBarang barang={barang} kategori={kategori} memuat={memuat} />}
          {tab === 'kategori' && (
            <KategoriBarang kategori={kategori} barang={barang} memuat={memuat} />
          )}
          {tab === 'opname' && <StokOpname barang={barang} kategori={kategori} memuat={memuat} />}
        </div>
      </div>
    </div>
  );
}
