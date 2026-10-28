import { useMemo, useRef, useState } from 'react';
import { SEKSI } from '@/data/seksi';
import { T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { K } from '../ui/kelas';
import { useInventori } from '../hooks/useInventori';
import { usePaging } from '../hooks/usePaging';
import { useTransaksi } from '../hooks/useTransaksi';
import { formatTanggal, idTransaksi, totalBarang } from '../utils/stokLogic';
import KepalaHalaman from '../components/KepalaHalaman';
import TabTransaksi from '../components/TabTransaksi';
import TombolTambah from '../components/TombolTambah';
import Pager from '../components/Pager';
import MemuatInventori from '../components/MemuatInventori';
import { KotakCari, PilihCari, PilihRentang } from '../components/Pilihan';

// Di HP (≤ 820 px) tiap baris menjadi kartu: seksi & total, ID & tanggal, tombol di bawah
const TD = `px-4 py-3 border-b align-middle ${T.border} max-[820px]:p-0 max-[820px]:border-0 max-[820px]:min-w-0`;
const TR = `${T.hoverSurface2} max-[820px]:grid max-[820px]:grid-cols-[minmax(0,1fr)_auto] max-[820px]:gap-x-3 max-[820px]:gap-y-1 max-[820px]:items-center max-[820px]:p-4 max-[820px]:border-b ${T.border} last:border-b-0 [&:last-child>td]:border-b-0`;

/**
 * Tab "Cetak Terima Barang": riwayat transaksi barang keluar + bukti serah terima. Transaksi
 * dimuat per halaman (200 terbaru; rentang tanggal memakai kueri tanggal). Transaksi batal tidak
 * dicetak.
 */
export default function CetakTerima() {
  const { siap, semuaBarang: barang, namaKategori, bukaBukti } = useInventori();
  const [cari, setCari] = useState('');
  const [seksi, setSeksi] = useState('');
  const [kategori, setKategori] = useState('');
  const [rentang, setRentang] = useState({ dari: '', sampai: '' });
  const tk = useTransaksi('keluar', rentang);
  const keluar = tk.rows;
  const [ukuran, setUkuran] = useState(10);
  const tabelRef = useRef(null);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return [...keluar]
      .sort((x, y) =>
        x.tanggal === y.tanggal ? (y.nomor || 0) - (x.nomor || 0) : x.tanggal < y.tanggal ? 1 : -1,
      )
      .filter((k) => {
        const brg = k.items.map((it) => barang.find((x) => x.id === it.barangId)).filter(Boolean);
        if (seksi && k.seksi !== seksi) return false;
        if (kategori && !brg.some((b) => b.kategori === kategori)) return false;
        if (rentang.dari && k.tanggal < rentang.dari) return false;
        if (rentang.dari && k.tanggal > (rentang.sampai || rentang.dari)) return false;
        if (
          q &&
          !(
            (k.pegawai || '').toLowerCase().includes(q) ||
            (k.seksi || '').toLowerCase().includes(q) ||
            brg.some((b) => b.nama.toLowerCase().includes(q) || b.idSakti.includes(q))
          )
        )
          return false;
        return true;
      });
  }, [keluar, barang, cari, seksi, kategori, rentang]);

  const paging = usePaging(
    tersaring,
    ukuran,
    `${cari}|${seksi}|${kategori}|${rentang.dari}|${rentang.sampai}`,
  );

  if (!siap) return <MemuatInventori judul="Transaksi" />;

  return (
    <div className={K.halaman}>
      <KepalaHalaman judul="Transaksi" />
      <TabTransaksi />

      <section
        className={`${K.kartu} overflow-hidden ${ANIM.muncul}`}
        aria-label="Riwayat barang keluar"
      >
        <div className={K.kepala}>
          <h2 className={K.judulKartu}>Riwayat Barang Keluar</h2>
          <div className="flex items-center gap-4 max-[820px]:w-full">
            <TombolTambah />
          </div>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 xl:flex-row xl:items-center">
          <div className="min-w-0 xl:flex-[1_1_180px]">
            <KotakCari
              id="h-cari"
              ariaLabel="Cari"
              placeholder="Pengambil atau nama barang"
              nilai={cari}
              onUbah={setCari}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:flex xl:flex-nowrap xl:shrink-0">
            <div className="min-w-0 xl:w-[170px]">
              <PilihCari
                id="h-kat"
                ariaLabel="Kategori barang"
                placeholder="Kategori barang"
                nilai={kategori}
                opsi={namaKategori.map((x) => ({ nilai: x, label: x }))}
                onPilih={setKategori}
                onHapus={() => setKategori('')}
              />
            </div>
            <div className="min-w-0 xl:w-[150px]">
              <PilihCari
                id="h-seksi"
                ariaLabel="Seksi"
                placeholder="Seksi"
                nilai={seksi}
                opsi={SEKSI.map((x) => ({ nilai: x, label: x }))}
                onPilih={setSeksi}
                onHapus={() => setSeksi('')}
              />
            </div>
            <div className="min-w-0 sm:col-span-2 xl:w-[235px]">
              <PilihRentang id="h-rentang" nilai={rentang} onUbah={setRentang} kanan />
            </div>
          </div>
        </div>
        <div
          ref={tabelRef}
          className={`${K.tabelWrap} border-t min-h-[300px] max-[820px]:min-h-0 ${T.border}`}
        >
          <table className={`${K.tabel} min-w-[700px] max-[820px]:min-w-0 max-[820px]:block`}>
            <thead className="max-[820px]:hidden">
              <tr>
                <th className={K.th}>ID Transaksi</th>
                <th className={K.th}>Tanggal</th>
                <th className={K.th}>Seksi / Pengambil</th>
                <th className={`${K.th} text-right`}>Total Barang</th>
                <th className={`${K.th} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="max-[820px]:block">
              {paging.potongan.length === 0 && (
                <tr className="max-[820px]:block">
                  <td className={`${K.kosong} max-[820px]:block`} colSpan={5}>
                    {tk.memuat
                      ? 'Memuat transaksi…'
                      : 'Belum ada data barang keluar untuk filter ini.'}
                  </td>
                </tr>
              )}
              {paging.potongan.map((k) => (
                <tr key={k.id} className={TR}>
                  <td
                    className={`${TD} ${K.mono} max-[820px]:col-start-1 max-[820px]:row-start-2 max-[820px]:text-[13px]`}
                  >
                    <span className={k.status === 'batal' ? `line-through ${T.inkMuted}` : ''}>
                      {idTransaksi('keluar', k.nomor)}
                    </span>
                    {k.status === 'batal' && <span className={K.batal}>Batal</span>}
                  </td>
                  <td
                    className={`${TD} whitespace-nowrap ${T.inkMuted} max-[820px]:col-start-2 max-[820px]:row-start-2 max-[820px]:text-right max-[820px]:text-[13px]`}
                  >
                    {formatTanggal(k.tanggal)}
                  </td>
                  <td className={`${TD} max-[820px]:col-start-1 max-[820px]:row-start-1`}>
                    <span className="block font-semibold max-[820px]:text-[15px]">{k.seksi}</span>
                    {k.pegawai && (
                      <span className={`block mt-0.5 text-[12.5px] ${T.inkMuted}`}>
                        {k.pegawai}
                      </span>
                    )}
                  </td>
                  <td
                    className={`${TD} text-right font-semibold tabular-nums max-[820px]:col-start-2 max-[820px]:row-start-1`}
                  >
                    {totalBarang(k.items)}
                  </td>
                  <td
                    className={`${TD} text-right whitespace-nowrap max-[820px]:col-span-2 max-[820px]:text-left max-[820px]:mt-1.5`}
                  >
                    {k.status !== 'batal' && (
                      <button className={K.btnKecil} type="button" onClick={() => bukaBukti(k)}>
                        Detail dan Cetak
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager
          paging={paging}
          satuan="transaksi"
          ukuran={ukuran}
          onUkuran={setUkuran}
          onPindah={() =>
            tabelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        />
        {tk.bisaLagi && (
          <div className="flex justify-center px-4 pb-4">
            <button className={K.btn} type="button" disabled={tk.memuatLagi} onClick={tk.muatLagi}>
              {tk.memuatLagi ? 'Memuat…' : 'Muat transaksi lebih lama'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
