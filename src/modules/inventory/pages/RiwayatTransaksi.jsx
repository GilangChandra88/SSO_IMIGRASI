import { useCallback, useMemo, useRef, useState } from 'react';
import { FaArrowDown, FaArrowUp, FaBan, FaEllipsisV } from 'react-icons/fa';
import { SEKSI } from '@/data/seksi';
import { T } from '@/utils/uiTokens';
import { ANIM } from '@/utils/animasi';
import { PANJANG } from '@/utils/batas';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { K, PANAH } from '../ui/kelas';
import { useInventori } from '../hooks/useInventori';
import { usePaging } from '../hooks/usePaging';
import { useTutupLuar } from '../hooks/useTutupLuar';
import { useTransaksi } from '../hooks/useTransaksi';
import { batalkanTransaksi } from '../services/inventoryDb';
import { bandingRiwayat, formatSisa, formatTanggal, idTransaksi } from '../utils/stokLogic';
import { buatXlsx, simpanBerkas, TIPE_XLSX } from '../utils/xlsx';
import KepalaHalaman from '../components/KepalaHalaman';
import TabTransaksi from '../components/TabTransaksi';
import TombolTambah from '../components/TombolTambah';
import Pager from '../components/Pager';
import KonfirmasiAksi from '../components/KonfirmasiAksi';
import MemuatInventori from '../components/MemuatInventori';
import { KotakCari, PilihCari, PilihRentang } from '../components/Pilihan';

const JUDUL_RIWAYAT = [
  'No',
  'Tanggal',
  'Jenis',
  'ID Transaksi',
  'Kode SAKTI Kategori',
  'Kode SAKTI Barang',
  'Nama Barang',
  'Kategori',
  'Jumlah',
  'Satuan',
  'Pemasok/Pengambil',
  'Nama Pengambil',
];
const LEBAR_RIWAYAT = [6, 13, 10, 14, 20, 18, 36, 30, 10, 10, 26, 24];
// Di HP (≤ 820 px) tiap baris menjadi kartu: nama & jumlah, kode & tanggal, pihak & ID, menu di kanan
const TD = `px-4 py-3 border-b align-middle ${T.border} max-[820px]:p-0 max-[820px]:border-0 max-[820px]:min-w-0`;
const TR = `${T.hoverSurface2} max-[820px]:grid max-[820px]:grid-cols-[minmax(0,1fr)_auto_40px] max-[820px]:gap-x-3 max-[820px]:gap-y-1 max-[820px]:items-center max-[820px]:py-3 max-[820px]:pl-4 max-[820px]:pr-2 max-[820px]:border-b ${T.border} last:border-b-0 [&:last-child>td]:border-b-0`;

/** Baris tabel riwayat dari transaksi masuk & keluar (barang keluar dipecah per barang). */
const keBaris = (masuk, keluar) => [
  ...masuk.map((m) => ({
    jenis: 'masuk',
    key: `m${m.id}`,
    nomor: m.nomor,
    dibuat: m.dibuat || 0,
    tanggal: m.tanggal,
    barangId: m.barangId,
    jumlah: m.jumlah,
    pihak: m.pemasok,
    batal: m.status === 'batal',
    ref: m,
  })),
  ...keluar.flatMap((k) =>
    (k.items || []).map((it) => ({
      jenis: 'keluar',
      key: `k${k.id}-${it.barangId}`,
      nomor: k.nomor,
      dibuat: k.dibuat || 0,
      tanggal: k.tanggal,
      barangId: it.barangId,
      jumlah: it.jumlah,
      pihak: k.seksi,
      pegawai: k.pegawai,
      batal: k.status === 'batal',
      ref: k,
    })),
  ),
];

/**
 * Tab "Barang Masuk": satu tabel riwayat barang masuk dan keluar. Transaksi dimuat per halaman
 * (200 terbaru per jenis; rentang tanggal memakai kueri tanggal). Transaksi tidak dihapus:
 * dibatalkan dengan alasan (tetap tampil bertanda Batal, tidak dihitung ke stok).
 */
export default function RiwayatTransaksi() {
  const { siap, semuaBarang, namaKategori, izin, bukaTransaksi, bukaBukti } = useInventori();
  const [menuId, setMenuId] = useState(null);
  const [cari, setCari] = useState('');
  const [kategori, setKategori] = useState('');
  const [jenisF, setJenisF] = useState('semua');
  const [seksi, setSeksi] = useState('');
  const [rentang, setRentang] = useState({ dari: '', sampai: '' });
  const tm = useTransaksi('masuk', rentang);
  const tk = useTransaksi('keluar', rentang);
  const [ukuran, setUkuran] = useState(10);
  const [konfEkspor, setKonfEkspor] = useState(false);
  const menuRef = useRef(null);
  const tabelRef = useRef(null);
  const tutupMenu = useCallback(() => setMenuId(null), []);
  useTutupLuar(menuRef, Boolean(menuId), tutupMenu);

  const cariBarang = useCallback(
    (id) =>
      semuaBarang.find((x) => x.id === id) || {
        id,
        nama: '(barang sudah dihapus)',
        satuan: '',
        kode: '',
        idSakti: '',
        kategori: '',
        kategoriKode: '',
      },
    [semuaBarang],
  );

  // Transaksi tidak dihapus: dibatalkan dengan alasan; stok dikembalikan oleh server
  const [batal, setBatal] = useState(null); // baris yang menunggu konfirmasi batal
  const [alasan, setAlasan] = useState('');
  const [membatalkan, setMembatalkan] = useState(false);

  async function konfirmBatal() {
    const m = batal;
    if (!m || !alasan.trim() || !izin.hapus) return;
    setMembatalkan(true);
    try {
      await batalkanTransaksi(m.jenis, m.ref.id, alasan.trim());
      showToast(`Transaksi ${idTransaksi(m.jenis, m.nomor)} dibatalkan. Stok sudah disesuaikan.`);
      setBatal(null);
      setAlasan('');
    } catch (err) {
      showToast(pesanGalat(err, 'Transaksi gagal dibatalkan.'), 'error');
    } finally {
      setMembatalkan(false);
    }
  }

  const semuaBaris = useMemo(() => keBaris(tm.rows, tk.rows), [tm.rows, tk.rows]);

  const saring = useCallback(
    (baris) => {
      const q = cari.trim().toLowerCase();
      return [...baris].sort(bandingRiwayat).filter((m) => {
        const bm = cariBarang(m.barangId);
        if (kategori && bm.kategori !== kategori) return false;
        if (jenisF !== 'semua' && m.jenis !== jenisF) return false;
        if (seksi && !(m.jenis === 'keluar' && m.pihak === seksi)) return false; // seksi hanya pada barang keluar
        if (rentang.dari && m.tanggal < rentang.dari) return false;
        if (rentang.dari && m.tanggal > (rentang.sampai || rentang.dari)) return false;
        if (
          q &&
          !(
            bm.nama.toLowerCase().includes(q) ||
            bm.idSakti.includes(q) ||
            idTransaksi(m.jenis, m.nomor).toLowerCase().includes(q)
          )
        )
          return false;
        return true;
      });
    },
    [cariBarang, kategori, jenisF, seksi, rentang, cari],
  );
  const tersaring = useMemo(() => saring(semuaBaris), [saring, semuaBaris]);

  // Filter aktif: semua data cocok tampil sekaligus; tanpa filter: dibagi per halaman
  const adaFilter = Boolean(cari.trim() || kategori || jenisF !== 'semua' || seksi || rentang.dari);
  const paging = usePaging(
    tersaring,
    adaFilter ? Math.max(1, tersaring.length) : ukuran,
    `${kategori}|${jenisF}|${seksi}|${rentang.dari}|${rentang.sampai}|${cari}`,
  );

  const daftarFilter = [
    cari.trim() && `Pencarian: "${cari.trim()}"`,
    jenisF !== 'semua' && `Riwayat: ${jenisF === 'masuk' ? 'Barang Masuk' : 'Barang Keluar'}`,
    kategori && `Kategori: ${kategori}`,
    seksi && `Seksi: ${seksi}`,
    rentang.dari &&
      `Tanggal: ${formatTanggal(rentang.dari)}${rentang.sampai && rentang.sampai !== rentang.dari ? ` sampai ${formatTanggal(rentang.sampai)}` : ''}`,
  ].filter(Boolean);
  const namaBerkas = `Riwayat ${jenisF === 'masuk' ? 'Barang Masuk' : jenisF === 'keluar' ? 'Barang Keluar' : 'Barang Masuk dan Keluar'}${rentang.dari ? ` ${rentang.dari} sd ${rentang.sampai || rentang.dari}` : ''}.xlsx`;

  // Ekspor Excel: semua transaksi aktif yang cocok dengan filter (bukan hanya halaman yang tampil);
  // halaman transaksi yang belum dimuat diambil dulu
  async function ekspor() {
    setKonfEkspor(false);
    const [m0, k0] =
      tm.bisaLagi || tk.bisaLagi
        ? await Promise.all([tm.muatSemua(), tk.muatSemua()])
        : [tm.rows, tk.rows];
    const data = saring(keBaris(m0, k0)).filter((x) => !x.batal);
    if (data.length === 0) return;
    const isi = data.map((m, i) => {
      const bm = cariBarang(m.barangId);
      return [
        i + 1,
        { tgl: m.tanggal },
        m.jenis === 'keluar' ? 'Keluar' : 'Masuk',
        idTransaksi(m.jenis, m.nomor),
        bm.kategoriKode || '',
        bm.kode || '',
        bm.nama,
        bm.kategoriId ? bm.kategori : '',
        m.jumlah,
        bm.satuan,
        m.pihak,
        m.pegawai || '',
      ];
    });
    simpanBerkas(
      new Blob(
        [buatXlsx([{ nama: 'Riwayat', lebar: LEBAR_RIWAYAT, baris: [JUDUL_RIWAYAT, ...isi] }])],
        { type: TIPE_XLSX },
      ),
      namaBerkas,
    );
    showToast(
      `${isi.length} baris riwayat diekspor${adaFilter ? ' sesuai filter yang aktif' : ' (semua data)'}.`,
    );
  }

  if (!siap) return <MemuatInventori judul="Transaksi" />;
  const bisaAksi = izin.tulis || izin.hapus;

  return (
    <div className={K.halaman}>
      <KepalaHalaman judul="Transaksi" />
      <TabTransaksi />

      <section
        className={`${K.kartu} overflow-hidden ${ANIM.muncul}`}
        aria-label="Riwayat barang masuk dan keluar"
      >
        <div className={`${K.kepala} justify-start gap-x-0 gap-y-2.5`}>
          <h2 className={`${K.judulKartu} flex-auto mr-8`}>Riwayat Barang Masuk dan Keluar</h2>
          <span
            className={`inline-flex items-center gap-4 mr-4 text-[13px] ${T.inkMuted}`}
            aria-label="Keterangan tanda panah"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className={`${PANAH.masuk} w-5 h-5`}>
                <FaArrowDown size={10} />
              </span>
              Masuk
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`${PANAH.keluar} w-5 h-5`}>
                <FaArrowUp size={10} />
              </span>
              Keluar
            </span>
          </span>
          <div className="flex items-center gap-3 ml-auto max-[820px]:w-full max-[820px]:gap-2">
            <TombolTambah />
            <button
              className={`${K.btn} max-[820px]:flex-auto`}
              type="button"
              disabled={tersaring.length === 0}
              onClick={() => setKonfEkspor(true)}
              title={
                tersaring.length === 0
                  ? 'Tidak ada data untuk diekspor'
                  : adaFilter
                    ? 'Ekspor data sesuai filter yang aktif'
                    : 'Ekspor semua data riwayat'
              }
            >
              Ekspor Excel
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 xl:flex-row xl:items-center">
          <div className="min-w-0 xl:flex-[1_1_180px]">
            <KotakCari
              id="r-cari"
              ariaLabel="Cari"
              placeholder="Cari barang"
              nilai={cari}
              onUbah={setCari}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:flex xl:flex-nowrap xl:shrink-0">
            <div className="min-w-0 xl:w-[130px]">
              <PilihCari
                id="r-jenis-transaksi"
                ariaLabel="Riwayat barang"
                placeholder="Riwayat barang"
                nilai={jenisF}
                nilaiAwal="semua"
                opsi={[
                  { nilai: 'semua', label: 'Semua' },
                  { nilai: 'masuk', label: 'Barang Masuk' },
                  { nilai: 'keluar', label: 'Barang Keluar' },
                ]}
                onPilih={setJenisF}
              />
            </div>
            <div className="min-w-0 xl:w-[170px]">
              <PilihCari
                id="r-kat"
                ariaLabel="Kategori barang"
                placeholder="Kategori barang"
                nilai={kategori}
                opsi={namaKategori.map((k) => ({ nilai: k, label: k }))}
                onPilih={setKategori}
                onHapus={() => setKategori('')}
              />
            </div>
            <div className="min-w-0 xl:w-[120px]">
              <PilihCari
                id="r-seksi"
                ariaLabel="Seksi"
                placeholder="Seksi"
                nilai={seksi}
                opsi={SEKSI.map((x) => ({ nilai: x, label: x }))}
                onPilih={setSeksi}
                onHapus={() => setSeksi('')}
              />
            </div>
            <div className="min-w-0 xl:w-[235px]">
              <PilihRentang id="r-rentang" nilai={rentang} onUbah={setRentang} kanan />
            </div>
          </div>
        </div>
        <div
          ref={tabelRef}
          className={`${K.tabelWrap} border-t ${T.border} ${menuId ? 'pb-32' : ''}`}
        >
          <table className={`${K.tabel} min-w-[940px] max-[820px]:min-w-0 max-[820px]:block`}>
            <thead className="max-[820px]:hidden">
              <tr>
                <th className={`${K.th} w-12`}>No</th>
                <th className={K.th}>Kode SAKTI</th>
                <th className={K.th}>Nama Barang</th>
                <th className={K.th}>Jumlah</th>
                <th className={K.th}>Tanggal</th>
                <th className={K.th}>Pemasok/Pengambil</th>
                <th className={K.th}>ID Transaksi</th>
                <th className={`${K.th} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="max-[820px]:block">
              {paging.potongan.length === 0 && (
                <tr className="max-[820px]:block">
                  <td className={`${K.kosong} max-[820px]:block`} colSpan={8}>
                    {tm.memuat || tk.memuat
                      ? 'Memuat transaksi…'
                      : 'Belum ada data transaksi untuk filter ini.'}
                  </td>
                </tr>
              )}
              {paging.potongan.map((m, i) => {
                const bm = cariBarang(m.barangId);
                return (
                  <tr key={m.key} className={TR}>
                    <td className={`${TD} ${T.inkMuted} max-[820px]:hidden`}>{paging.dari + i}</td>
                    <td
                      className={`${TD} ${K.mono} max-[820px]:col-start-1 max-[820px]:row-start-2`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={PANAH[m.jenis]}
                          title={m.jenis === 'keluar' ? 'Barang keluar' : 'Barang masuk'}
                          role="img"
                          aria-label={m.jenis === 'keluar' ? 'Barang keluar' : 'Barang masuk'}
                        >
                          {m.jenis === 'keluar' ? (
                            <FaArrowUp size={11} />
                          ) : (
                            <FaArrowDown size={11} />
                          )}
                        </span>
                        {bm.kode || '-'}
                      </span>
                    </td>
                    <td
                      className={`${TD} font-semibold max-[820px]:col-start-1 max-[820px]:row-start-1 max-[820px]:text-[15px]`}
                    >
                      {bm.nama}
                    </td>
                    <td
                      className={`${TD} font-semibold tabular-nums max-[820px]:col-start-2 max-[820px]:row-start-1 max-[820px]:text-right`}
                    >
                      {formatSisa(bm, m.jumlah)}
                    </td>
                    <td
                      className={`${TD} whitespace-nowrap ${T.inkMuted} max-[820px]:col-start-2 max-[820px]:row-start-2 max-[820px]:text-right max-[820px]:text-[13px]`}
                    >
                      {formatTanggal(m.tanggal)}
                    </td>
                    <td
                      className={`${TD} max-[820px]:col-start-1 max-[820px]:row-start-3 max-[820px]:text-[13px]`}
                    >
                      <span className="block">{m.pihak}</span>
                      {m.pegawai && (
                        <span className={`block mt-0.5 text-[12.5px] ${T.inkMuted}`}>
                          {m.pegawai}
                        </span>
                      )}
                    </td>
                    <td
                      className={`${TD} ${K.mono} whitespace-nowrap max-[820px]:col-start-2 max-[820px]:row-start-3 max-[820px]:text-right`}
                    >
                      <span className={m.batal ? `line-through ${T.inkMuted}` : ''}>
                        {idTransaksi(m.jenis, m.nomor)}
                      </span>
                      {m.batal && <span className={K.batal}>Batal</span>}
                    </td>
                    <td
                      className={`${TD} relative text-right max-[820px]:col-start-3 max-[820px]:row-start-1 max-[820px]:row-span-2 max-[820px]:self-start`}
                      ref={menuId === m.key ? menuRef : undefined}
                    >
                      {bisaAksi && !m.batal && (
                        <button
                          className={K.ikonBtn}
                          type="button"
                          aria-label={`Menu aksi untuk ${bm.nama}`}
                          aria-expanded={menuId === m.key}
                          onClick={() => setMenuId(menuId === m.key ? null : m.key)}
                        >
                          <FaEllipsisV size={14} />
                        </button>
                      )}
                      {menuId === m.key && (
                        <div
                          className={`${K.menu} ${ANIM.popover} right-14 top-1.5 max-[820px]:right-11`}
                        >
                          {izin.tulis && (
                            <button
                              className={K.menuItem}
                              type="button"
                              onClick={() => {
                                setMenuId(null);
                                bukaTransaksi(m.jenis, m.ref);
                              }}
                            >
                              Ubah
                            </button>
                          )}
                          {m.jenis === 'keluar' && (
                            <button
                              className={K.menuItem}
                              type="button"
                              onClick={() => {
                                setMenuId(null);
                                bukaBukti(m.ref);
                              }}
                            >
                              Cetak bukti
                            </button>
                          )}
                          {izin.hapus && (
                            <button
                              className={K.menuBahaya}
                              type="button"
                              onClick={() => {
                                setMenuId(null);
                                setBatal(m);
                              }}
                            >
                              <FaBan size={13} />
                              Batalkan
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager
          paging={paging}
          satuan="data"
          ukuran={ukuran}
          onUkuran={setUkuran}
          semua={adaFilter}
          onPindah={() =>
            tabelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        />
        {(tm.bisaLagi || tk.bisaLagi) && (
          <div className="flex justify-center px-4 pb-4">
            <button
              className={K.btn}
              type="button"
              disabled={tm.memuatLagi || tk.memuatLagi}
              onClick={() => {
                if (tm.bisaLagi) tm.muatLagi();
                if (tk.bisaLagi) tk.muatLagi();
              }}
            >
              {tm.memuatLagi || tk.memuatLagi ? 'Memuat…' : 'Muat transaksi lebih lama'}
            </button>
          </div>
        )}
      </section>
      {batal && (
        <KonfirmasiAksi
          judul={`Batalkan ${idTransaksi(batal.jenis, batal.nomor)}?`}
          teks={
            batal.jenis === 'keluar'
              ? 'Seluruh barang pada transaksi ini ikut dibatalkan dan stoknya dikembalikan. Transaksi tetap tercatat dengan tanda Batal.'
              : 'Stok barang ini dikurangi kembali. Transaksi tetap tercatat dengan tanda Batal.'
          }
          rincian={
            batal.jenis === 'keluar'
              ? [
                  { label: 'Pengambil', nilai: batal.pegawai || batal.pihak || '-' },
                  { label: 'Jumlah barang', nilai: `${(batal.ref.items || []).length} jenis` },
                ]
              : [
                  { label: 'Barang', nilai: cariBarang(batal.barangId).nama },
                  { label: 'Jumlah', nilai: formatSisa(cariBarang(batal.barangId), batal.jumlah) },
                ]
          }
          labelYa="Ya, Batalkan"
          sibuk={membatalkan}
          yaNonaktif={!alasan.trim()}
          onYa={konfirmBatal}
          onBatal={() => {
            if (membatalkan) return;
            setBatal(null);
            setAlasan('');
          }}
        >
          <label className="block" htmlFor="alasan-batal-transaksi">
            <span className={K.lbl}>Alasan pembatalan</span>
            <textarea
              id="alasan-batal-transaksi"
              rows={3}
              maxLength={PANJANG.alasanBatal}
              value={alasan}
              disabled={membatalkan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Mis. salah input jumlah"
              className={`${K.ctl} h-auto py-2 resize-y`}
            />
          </label>
        </KonfirmasiAksi>
      )}
      {konfEkspor && (
        <KonfirmasiAksi
          nada="biasa"
          ikon="ekspor"
          judul="Ekspor data ke Excel?"
          teks={
            adaFilter
              ? 'Berkas berisi semua data yang cocok dengan filter yang sedang aktif.'
              : 'Tidak ada filter aktif, jadi berkas berisi semua data riwayat.'
          }
          rincian={[
            {
              label: 'Jumlah data',
              nilai: (
                <strong>
                  {tersaring.filter((x) => !x.batal).length} baris
                  {tm.bisaLagi || tk.bisaLagi ? ' + transaksi lama yang belum dimuat' : ''}
                </strong>
              ),
            },
            {
              label: 'Filter aktif',
              nilai: daftarFilter.length
                ? daftarFilter.map((f) => (
                    <span key={f} className="block">
                      {f}
                    </span>
                  ))
                : 'Tidak ada (semua data)',
            },
            { label: 'Nama berkas', nilai: namaBerkas },
          ]}
          labelYa="Ya, Ekspor"
          onYa={ekspor}
          onBatal={() => setKonfEkspor(false)}
        />
      )}
    </div>
  );
}
