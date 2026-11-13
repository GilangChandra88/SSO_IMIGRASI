import { useState } from 'react';
import { ANIM } from '@/utils/animasi';
import { useKasBank } from '../../hooks/useKasBank';
import Halaman from '../../components/Halaman';
import TabHalaman from '../../components/TabHalaman';
import FlowKas from '../../components/kas/FlowKas';
import DaftarKas from '../../components/kas/DaftarKas';
import TransferKas from '../../components/kas/TransferKas';

const TAB = [
  { id: 'flow', label: 'Flow' },
  { id: 'daftar', label: 'Daftar Kas' },
  { id: 'transfer', label: 'Transfer Kas' },
];

export default function Kas() {
  const [tab, setTab] = useState('flow');
  const { kas, persediaan, memuat } = useKasBank();
  return (
    <Halaman judul="Kas & Bank" kembali={{ to: '/koperasi/pembukuan', label: 'Pembukuan' }}>
      <TabHalaman daftar={TAB} aktif={tab} onUbah={setTab} label="Bagian Kas" />
      <div key={tab} className={ANIM.muncul}>
        {tab === 'flow' && <FlowKas />}
        {tab === 'daftar' && <DaftarKas kas={kas} persediaan={persediaan} memuat={memuat} />}
        {tab === 'transfer' && <TransferKas kas={kas} onSelesai={() => setTab('flow')} />}
      </div>
    </Halaman>
  );
}
