import { useState } from 'react';
import { ANIM } from '@/utils/animasi';
import { LIMIT_KUERI } from '@/utils/batas';
import { K } from '../../ui/kelas';
import { rupiah, tanggalPendek } from '../../ui/format';
import { useDaftarBerhalaman } from '../../hooks/useDaftarBerhalaman';
import { useKasBank } from '../../hooks/useKasBank';
import { useStokBarang } from '../../hooks/useStokBarang';
import { ambilPembelian, kueriPembelian } from '../../services/bukuDb';
import Halaman from '../../components/Halaman';
import TabHalaman from '../../components/TabHalaman';
import FormPembelian from '../../components/pembelian/FormPembelian';
import DaftarUtang from '../../components/pembelian/DaftarUtang';

const TAB = [
  { id: 'catat', label: 'Catat' },
  { id: 'riwayat', label: 'Riwayat' },
  { id: 'utang', label: 'Utang' },
];

function Riwayat() {
  const { daftar, memuat, memuatLagi, adaLagi, muatLagi } = useDaftarBerhalaman(
    'koperasi_kantin_pembelian',
    () => kueriPembelian(),
    ambilPembelian,
    LIMIT_KUERI.pembelianKantin,
    'Riwayat pembelian gagal dimuat.',
  );
  if (memuat) return <p className={K.kosong}>Memuat…</p>;
  if (!daftar.length) return <p className={K.kosong}>Belum ada pembelian.</p>;
  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {daftar.map((p) => (
          <li key={p.id} className={`${K.kartu} flex flex-col gap-2`}>
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className={`${K.judulBaris} block truncate`}>
                  {p.pemasok || 'Tanpa nama pemasok'}
                </span>
                <span className={`${K.redup} block`}>
                  {tanggalPendek(p.tanggal)} ·{' '}
                  {p.caraBayar === 'utang' ? 'Utang' : `Tunai · ${p.kasNama}`}
                </span>
                {p.sisaUtang > 0 && (
                  <span className={K.lencanaPeringatan}>Sisa utang {rupiah(p.sisaUtang)}</span>
                )}
              </span>
              <span className={K.nominal}>{rupiah(p.total)}</span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {p.items.map((i) => (
                <li
                  key={`${i.barangId}-${i.kemasanId || ''}`}
                  className={`${K.teks} flex justify-between gap-3`}
                >
                  <span className="min-w-0 truncate">
                    {i.jumlah} {i.satuan} {i.nama} @ {rupiah(i.harga)}
                  </span>
                  <span className="whitespace-nowrap">{rupiah(i.subtotal)}</span>
                </li>
              ))}
              {(p.bahan || []).map((x, n) => (
                <li key={`bahan-${n}`} className={`${K.teks} flex justify-between gap-3`}>
                  <span className="min-w-0 truncate">{x.nama} (bahan habis pakai)</span>
                  <span className="whitespace-nowrap">{rupiah(x.nilai)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {adaLagi && (
        <button
          type="button"
          className={`${K.tombolKedua} mt-3`}
          disabled={memuatLagi}
          onClick={muatLagi}
        >
          {memuatLagi ? 'Memuat…' : 'Muat lagi'}
        </button>
      )}
    </>
  );
}

export default function Pembelian() {
  const [tab, setTab] = useState('catat');
  const { barang } = useStokBarang();
  const { kas } = useKasBank();
  return (
    <Halaman
      judul="Pembelian"
      sub="Barang masuk dari pemasok. Stok dan harga pokok diperbarui otomatis."
    >
      <TabHalaman daftar={TAB} aktif={tab} onUbah={setTab} label="Bagian Pembelian" />
      <div key={tab} className={ANIM.muncul}>
        {tab === 'catat' && (
          <FormPembelian barang={barang} kas={kas} onSelesai={() => setTab('riwayat')} />
        )}
        {tab === 'riwayat' && <Riwayat />}
        {tab === 'utang' && <DaftarUtang kas={kas} />}
      </div>
    </Halaman>
  );
}
