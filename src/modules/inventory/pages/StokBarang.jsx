import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaBan,
  FaChevronDown,
  FaEllipsisV,
  FaExclamationCircle,
  FaFileCsv,
  FaFileExcel,
  FaPen,
  FaPlus,
} from 'react-icons/fa';
import { STATUS, T } from '@/utils/uiTokens';
import { ANIM, hapusBaris } from '@/utils/animasi';
import { pesanGalat } from '@/utils/pesanGalat';
import { showToast } from '@/utils/toastStore';
import { BIRU, K, TEKS_STATUS } from '../ui/kelas';
import { FILTER_STATUS } from '../data/konstanta';
import { useInventori } from '../hooks/useInventori';
import { useMedia } from '../hooks/useMedia';
import { useTutupLuar } from '../hooks/useTutupLuar';
import {
  imporBarang as imporBarangDb,
  nonaktifkanBarang,
  nonaktifkanKategori,
  tambahBarang,
  tambahKategori,
  tambahPemasok,
  ubahBarang,
  ubahKategori,
  ubahKodeSakti,
} from '../services/inventoryDb';
import {
  bandingStok,
  formatSisa,
  kelompokStok,
  LABEL_STATUS,
  statusStok,
} from '../utils/stokLogic';
import { buatXlsx, simpanBerkas, TIPE_XLSX } from '@/utils/xlsx';
import KepalaHalaman from '../components/KepalaHalaman';
import StatusBadge from '../components/StatusBadge';
import { KotakCari, PilihCari } from '../components/Pilihan';
import PanelBarang from '../components/PanelBarang';
import ImporModal from '../components/ImporModal';
import FormBarang from '../components/FormBarang';
import KonfirmasiAksi from '../components/KonfirmasiAksi';
import UbahKategoriModal from '../components/UbahKategoriModal';
import MemuatInventori from '../components/MemuatInventori';

const JUDUL_STOK = [
  'No',
  'Kode Akun',
  'Kode SAKTI Kategori',
  'Kategori',
  'Kode SAKTI Barang',
  'Nama Barang',
  'Satuan',
  'Stok Awal',
  'Total Masuk',
  'Total Keluar',
  'Sisa Stok',
  'Stok Minimum',
  'Status',
];
const LEBAR_STOK = [6, 12, 20, 34, 18, 40, 10, 11, 12, 12, 11, 13, 12];
const PESAN_PEMBACA = 'Hanya peran Umum yang bisa mengubah data inventory';
const GALAT_SIMPAN = 'Gagal menyimpan. Periksa koneksi lalu coba lagi.';
// Mentah = field yang disimpan di Firestore (tanpa kolom turunan)
const mentah = ({ nama, satuan, stokAwal, stokMin, kategoriId, kode }) => ({
  nama,
  satuan,
  stokAwal,
  stokMin,
  kategoriId,
  kode,
});

// Lencana "Belum diisi" di judul kelompok "Belum ada kategori SAKTI" (cukup satu, bukan per barang)
function PeringatanKode({ kecil = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full whitespace-nowrap font-semibold leading-none bg-[#f3eac9] text-[#5b2a0f] dark:bg-[rgba(237,161,0,.2)] dark:text-[#F0B93E] ${
        kecil ? 'h-[22px] pl-1.5 pr-2 text-[11.5px]' : 'h-6 pl-[7px] pr-2.5 text-[12.5px]'
      }`}
      title="Barang di kelompok ini belum punya kode barang SAKTI"
    >
      <FaExclamationCircle size={kecil ? 11 : 13} />
      Belum diisi
    </span>
  );
}

export default function StokBarang() {
  const {
    siap,
    barang,
    semuaBarang,
    kategoriList,
    namaKategori,
    pemasokList,
    totalMasuk,
    totalKeluar,
    sisa,
    izin,
    pengguna,
    lengkapiId,
    setLengkapiId,
  } = useInventori();
  const [dialog, setDialog] = useState(null); // null | { edit }
  const [ekspor, setEkspor] = useState(false);
  const [hapusB, setHapusB] = useState(null); // barang yang menunggu konfirmasi hapus
  const [ubahKat, setUbahKat] = useState(null);
  const [hapusKat, setHapusKat] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [pilihId, setPilihId] = useState(null); // barang yang rinciannya tampil
  const [impor, setImpor] = useState(false);
  const [kategori, setKategori] = useState('');
  const [status, setStatus] = useState('semua');
  const [cari, setCari] = useState('');
  const [ciut, setCiut] = useState(() => new Set()); // kode kategori yang barangnya disembunyikan
  const [menuAksi, setMenuAksi] = useState(false);
  const menuRef = useRef(null);
  const tutupMenu = useCallback(() => setMenuAksi(false), []);
  useTutupLuar(menuRef, menuAksi, tutupMenu);

  const terpilih = barang.find((b) => b.id === pilihId) || null;
  const sempit = useMedia('(max-width: 1100px)'); // daftar ringkas, rincian jadi lembar
  const wa = !!terpilih || sempit;
  const bukaTutup = (k) =>
    setCiut((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  // Dari Dashboard ("Lengkapi"): buka Ubah Barang (peran tanpa hak ubah: rinciannya saja)
  useEffect(() => {
    if (lengkapiId == null || !siap) return;
    const b = barang.find((x) => x.id === lengkapiId);
    if (b) {
      if (izin.tulis) setDialog({ edit: b });
      else setPilihId(b.id);
    }
    setLengkapiId(null);
  }, [lengkapiId, siap, barang, izin.tulis, setLengkapiId]);

  // Mencari: semua kategori dibuka agar hasilnya tidak tersembunyi
  useEffect(() => {
    if (cari.trim()) setCiut(new Set());
  }, [cari]);

  const baris = useMemo(
    () => barang.map((b) => ({ b, sisa: sisa[b.id], status: statusStok(sisa[b.id], b.stokMin) })),
    [barang, sisa],
  );
  const hitung = useMemo(
    () => ({
      semua: baris.length,
      aman: baris.filter((r) => r.status === 'aman').length,
      menipis: baris.filter((r) => r.status === 'menipis').length,
      habis: baris.filter((r) => r.status === 'habis').length,
    }),
    [baris],
  );

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return baris
      .filter((r) => {
        if (kategori && kelompokStok(r.b).nama !== kategori) return false;
        if (status !== 'semua' && r.status !== status) return false;
        if (q && !(r.b.nama.toLowerCase().includes(q) || r.b.idSakti.includes(q))) return false;
        return true;
      })
      .sort((x, y) => bandingStok(x.b, y.b));
  }, [baris, kategori, status, cari]);

  // Kategori tanpa barang tetap tampil (tanpa filter status/pencarian) supaya bisa diubah atau dihapus
  const daftarTampil = useMemo(() => {
    if (status !== 'semua' || cari.trim()) return tersaring;
    const kosong = kategoriList
      .filter(
        (k) =>
          !barang.some((b) => b.kategoriId === k.id && b.kode) &&
          (!kategori || k.nama === kategori),
      )
      .map((k) => ({
        kosong: true,
        b: {
          id: `kat${k.id}`,
          kode: '',
          kosong: true,
          kategoriId: k.id,
          kategori: k.nama,
          kategoriKode: k.kode,
        },
      }));
    return kosong.length
      ? [...tersaring, ...kosong].sort((x, y) => bandingStok(x.b, y.b))
      : tersaring;
  }, [tersaring, kategoriList, barang, kategori, status, cari]);

  const adaFilter = Boolean(cari.trim() || kategori || status !== 'semua');
  const daftarFilter = [
    cari.trim() && `Pencarian: "${cari.trim()}"`,
    kategori && `Kategori: ${kategori}`,
    status !== 'semua' && `Status stok: ${LABEL_STATUS[status]}`,
  ].filter(Boolean);
  const namaBerkas =
    `Stok Barang${kategori ? ` ${kategori}` : ''}${status !== 'semua' ? ` ${LABEL_STATUS[status]}` : ''}.xlsx`.replace(
      /[\\/:*?"<>|]/g,
      '-',
    );

  // Ekspor Excel: semua barang yang cocok dengan filter aktif, urutan sama dengan daftar
  function eksporStok() {
    setEkspor(false);
    if (tersaring.length === 0) return;
    const total = (id) => ({ masuk: totalMasuk[id] || 0, keluar: totalKeluar[id] || 0 });
    const isi = tersaring.map((r, i) => {
      const t = total(r.b.id);
      const g = kelompokStok(r.b);
      return [
        i + 1,
        g.id ? r.b.akunKode || '' : '',
        g.kode,
        g.id ? g.nama : '',
        r.b.kode || '',
        r.b.nama,
        r.b.satuan,
        r.b.stokAwal || 0,
        t.masuk,
        t.keluar,
        r.sisa,
        r.b.stokMin || 0,
        LABEL_STATUS[r.status],
      ];
    });
    const blob = new Blob(
      [buatXlsx([{ nama: 'Stok Barang', lebar: LEBAR_STOK, baris: [JUDUL_STOK, ...isi] }])],
      { type: TIPE_XLSX },
    );
    simpanBerkas(blob, namaBerkas);
    showToast(
      `${isi.length} barang diekspor${adaFilter ? ' sesuai filter yang aktif' : ' (semua data)'}.`,
    );
  }

  // Simpan barang baru / hasil ubah. Mengembalikan teks galat bila ditolak.
  // Kode 10 digit kategori (untuk penjaga keunikan kode SAKTI barang)
  const kodeKategori = (id) => kategoriList.find((k) => k.id === id)?.kode || '';

  async function simpanBarang(d) {
    const edit = dialog.edit;
    if (
      d.kode &&
      semuaBarang.some(
        (b) => b.kategoriId === d.kategoriId && b.kode === d.kode && (!edit || b.id !== edit.id),
      )
    )
      return 'Kode barang SAKTI tersebut sudah dipakai pada kategori yang sama.';
    if (edit && edit.adaTransaksi && Number(d.stokAwal) !== Number(edit.stokAwal || 0))
      return 'Stok awal tidak bisa diubah karena barang ini sudah punya transaksi.';
    try {
      if (edit) {
        // Kategori/kode SAKTI diganti lewat Function (penjaga keunikan kode ikut pindah)
        const gantiKode =
          (edit.kategoriId || null) !== (d.kategoriId || null) ||
          (edit.kode || '') !== (d.kode || '');
        if (gantiKode) {
          await ubahKodeSakti({
            jenis: 'barang',
            id: edit.id,
            kategoriId: d.kategoriId || null,
            kode: d.kode || '',
          });
        }
        await ubahBarang(edit.id, mentah(d), pengguna.uid);
      } else {
        await tambahBarang(mentah(d), kodeKategori(d.kategoriId), pengguna.uid);
      }
    } catch (err) {
      return pesanGalat(err, GALAT_SIMPAN);
    }
    setDialog(null);
    showToast(edit ? 'Barang diperbarui.' : 'Barang ditambahkan.');
    return null;
  }

  // Barang tidak dihapus (riwayat stok tetap ada): dinonaktifkan bila sisa stoknya sudah 0
  async function hapusBarang() {
    const b = hapusB;
    setHapusB(null);
    if (!b || !izin.hapus || sisa[b.id] > 0) return;
    setPilihId(null);
    try {
      await hapusBaris(document.querySelector(`[data-baris-barang="${b.id}"]`), () =>
        nonaktifkanBarang(b.id, pengguna.uid),
      );
      showToast(`Barang ${b.nama} dinonaktifkan.`);
    } catch (err) {
      showToast(pesanGalat(err, 'Barang gagal dinonaktifkan.'), 'error');
    }
  }

  async function simpanUbahKategori(d) {
    const k = ubahKat;
    if (!k) return false;
    try {
      // Kode SAKTI kategori diganti lewat Function (kode barang di dalamnya ikut berganti)
      if (d.kode !== k.kode) await ubahKodeSakti({ jenis: 'kategori', id: k.id, kode: d.kode });
      if (d.nama !== k.nama || d.akunKode !== (k.akunKode || '')) {
        await ubahKategori(k.id, { nama: d.nama, akunKode: d.akunKode }, pengguna.uid);
      }
    } catch (err) {
      showToast(pesanGalat(err, GALAT_SIMPAN), 'error');
      return false;
    }
    setCiut((s) => {
      if (!s.has(k.kode) || k.kode === d.kode) return s;
      const n = new Set(s);
      n.delete(k.kode);
      n.add(d.kode);
      return n;
    });
    if (kategori === k.nama) setKategori(d.nama);
    setUbahKat(null);
    showToast(`Kategori ${d.nama} diperbarui.`);
    return true;
  }

  // Kategori tidak dihapus: dinonaktifkan (sudah dikonfirmasi), hanya kategori tanpa barang aktif
  async function hapusKategori() {
    const k = hapusKat;
    setHapusKat(null);
    if (!k || !izin.hapus || barang.some((b) => b.kategoriId === k.id)) return;
    try {
      await hapusBaris(document.querySelector(`[data-baris-kat="${k.id}"]`), () =>
        nonaktifkanKategori(k.id, pengguna.uid),
      );
      if (kategori === k.nama) setKategori('');
      showToast(`Kategori ${k.nama} dinonaktifkan.`);
    } catch (err) {
      showToast(pesanGalat(err, 'Kategori gagal dinonaktifkan.'), 'error');
    }
  }

  async function simpanKategori(d) {
    if (kategoriList.some((k) => k.kode === d.kode))
      return `Kode kategori ${d.kode} sudah dipakai kategori lain.`;
    try {
      await tambahKategori(d, pengguna.uid);
    } catch (err) {
      return pesanGalat(err, GALAT_SIMPAN);
    }
    return null;
  }

  async function simpanPemasok(nama) {
    const ada = pemasokList.find((p) => p.toLowerCase() === nama.toLowerCase());
    if (ada) return `Pemasok ${ada} sudah ada.`;
    try {
      await tambahPemasok(nama, pengguna.uid);
    } catch (err) {
      return pesanGalat(err, GALAT_SIMPAN);
    }
    return null;
  }

  async function imporBarang(daftar) {
    try {
      await imporBarangDb(daftar, kodeKategori, pengguna.uid);
    } catch (err) {
      showToast(pesanGalat(err, 'Impor gagal. Periksa koneksi lalu coba lagi.'), 'error');
      return false;
    }
    setImpor(false);
    showToast(`${daftar.length} barang berhasil diimpor dari CSV.`);
    return true;
  }

  const bukaTambah = () => {
    setMenuAksi(false);
    setDialog({ edit: null });
  };
  const bukaEkspor = () => {
    setMenuAksi(false);
    setEkspor(true);
  };
  const bukaImpor = () => {
    setMenuAksi(false);
    setImpor(true);
  };

  if (!siap) return <MemuatInventori judul="Stok Barang" />;

  const terbagi = terpilih && !sempit;
  const TD = `px-4 border-b ${T.border}`;

  return (
    <div className={K.halaman}>
      <KepalaHalaman judul="Stok Barang" />

      <div
        className={`flex gap-5 items-stretch ${terbagi ? 'h-[calc(100dvh-150px)] min-h-[440px]' : ''}`}
      >
        <section
          className={`${K.kartu} @container flex-1 min-w-0 ${terbagi ? 'h-full overflow-y-auto' : ''}`}
          aria-label="Daftar stok barang"
        >
          <div className={`${K.kepala} @container`}>
            <h2 className={K.judulKartu}>Daftar Stok Barang</h2>
            <div className="flex items-center gap-3 @max-[600px]:hidden">
              <button
                className={K.btnUtama}
                type="button"
                disabled={!izin.tulis}
                onClick={bukaTambah}
                title={izin.tulis ? undefined : PESAN_PEMBACA}
              >
                <FaPlus size={12} />
                Tambah Barang
              </button>
              <button
                className={K.btn}
                type="button"
                disabled={tersaring.length === 0}
                onClick={bukaEkspor}
                title={
                  tersaring.length === 0
                    ? 'Tidak ada data untuk diekspor'
                    : adaFilter
                      ? 'Ekspor data sesuai filter yang aktif'
                      : 'Ekspor semua data stok'
                }
              >
                Ekspor Excel
              </button>
              <button
                className={K.btn}
                type="button"
                disabled={!izin.tulis}
                onClick={bukaImpor}
                title={izin.tulis ? undefined : PESAN_PEMBACA}
              >
                Impor CSV
              </button>
            </div>
            <div className="relative hidden @max-[600px]:block" ref={menuRef}>
              <button
                className={K.ikonBtn}
                type="button"
                aria-label="Menu aksi daftar stok"
                aria-haspopup="menu"
                aria-expanded={menuAksi}
                onClick={() => setMenuAksi((v) => !v)}
              >
                <FaEllipsisV size={15} />
              </button>
              {menuAksi && (
                <div
                  className={`${K.menu} ${ANIM.popover} right-0 top-[calc(100%+6px)] w-56`}
                  role="menu"
                >
                  <button
                    className={K.menuItem}
                    type="button"
                    role="menuitem"
                    disabled={!izin.tulis}
                    onClick={bukaTambah}
                  >
                    <FaPlus size={13} />
                    Tambah Barang
                  </button>
                  <button
                    className={K.menuItem}
                    type="button"
                    role="menuitem"
                    disabled={tersaring.length === 0}
                    onClick={bukaEkspor}
                  >
                    <FaFileExcel size={13} />
                    Ekspor Excel
                  </button>
                  <button
                    className={K.menuItem}
                    type="button"
                    role="menuitem"
                    disabled={!izin.tulis}
                    onClick={bukaImpor}
                  >
                    <FaFileCsv size={13} />
                    Impor CSV
                  </button>
                  {!izin.tulis && <div className={K.menuCatatan}>{PESAN_PEMBACA}</div>}
                </div>
              )}
            </div>
          </div>

          <div
            className={`flex flex-col gap-5 px-4 py-4 sm:px-6 ${terbagi ? `sticky top-0 z-[6] ${T.surface}` : ''}`}
          >
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-[2_1_320px] min-w-0">
                <label className="sr-only" htmlFor="f-cari">
                  Cari barang
                </label>
                <KotakCari
                  id="f-cari"
                  placeholder="Kode SAKTI atau nama barang"
                  nilai={cari}
                  onUbah={setCari}
                />
              </div>
              <div className="flex-[1_1_200px] min-w-0">
                <label className="sr-only" htmlFor="f-kat">
                  Kategori
                </label>
                <PilihCari
                  id="f-kat"
                  ariaLabel="Kategori"
                  placeholder="Semua kategori"
                  nilai={kategori}
                  opsi={namaKategori.map((k) => ({ nilai: k, label: k }))}
                  onPilih={setKategori}
                  onHapus={() => setKategori('')}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-xs font-semibold ${T.ink2}`}>Status stok</span>
              <div
                className="flex @max-[539px]:w-full @max-[539px]:overflow-x-auto"
                role="group"
                aria-label="Status stok"
              >
                {FILTER_STATUS.map((f, i) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={status === f.id}
                    onClick={() => setStatus(f.id)}
                    className={`h-10 px-3.5 border text-[13px] font-semibold whitespace-nowrap cursor-pointer @max-[539px]:flex-auto @max-[539px]:px-1.5 @max-[539px]:text-[12.5px] ${ANIM.pilih} ${
                      i === 0 ? 'rounded-l-lg' : '-ml-px'
                    } ${i === FILTER_STATUS.length - 1 ? 'rounded-r-lg' : ''} ${
                      status === f.id
                        ? `relative z-[1] ${STATUS.doneOn}`
                        : `${T.surface} ${T.borderStrong} text-[#0f2040] dark:text-[#A7B6CB] ${T.hoverSurface2}`
                    }`}
                  >
                    {f.label} ({hitung[f.id]})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`mx-4 mb-4 sm:mx-6 sm:mb-6 border rounded-[14px] overflow-hidden ${T.border}`}
          >
            <div className={K.tabelWrap}>
              <table className={`${K.tabel} ${wa ? 'table-fixed' : 'min-w-[760px]'}`}>
                {!wa && (
                  <thead>
                    <tr>
                      <th className={K.th}>Kode SAKTI</th>
                      <th className={K.th}>Nama Barang</th>
                      <th className={K.th}>Sisa Barang</th>
                      <th className={K.th}>Status</th>
                    </tr>
                  </thead>
                )}
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  {daftarTampil.length === 0 && (
                    <tr>
                      <td className={K.kosong} colSpan={wa ? 1 : 4}>
                        {barang.length === 0 && kategoriList.length === 0
                          ? 'Belum ada barang. Mulai dengan Tambah Barang atau Impor CSV.'
                          : 'Tidak ada barang yang cocok dengan filter.'}
                      </td>
                    </tr>
                  )}
                  {daftarTampil.map((r, i) => {
                    const grup = kelompokStok(r.b);
                    const kunciKat = grup.kode;
                    const awalGrup =
                      i === 0 || kelompokStok(daftarTampil[i - 1].b).kode !== kunciKat;
                    const tertutup = ciut.has(kunciKat);
                    const kat = grup.id ? kategoriList.find((k) => k.id === grup.id) : null;
                    const tombol = (
                      <button
                        type="button"
                        aria-expanded={!tertutup}
                        aria-label={`${tertutup ? 'Buka' : 'Ciutkan'} kategori ${grup.kode} ${grup.nama}`.replace(
                          /\s+/g,
                          ' ',
                        )}
                        className={`shrink-0 inline-flex items-center justify-center w-6 h-6 mr-1.5 -ml-1.5 rounded-md cursor-pointer text-[#0f2040] dark:text-[#A7B6CB] hover:bg-[rgba(10,22,40,.06)] dark:hover:bg-white/10`}
                      >
                        <FaChevronDown
                          size={11}
                          className={`motion-safe:transition-transform motion-safe:duration-150 ${tertutup ? '-rotate-90' : ''}`}
                        />
                      </button>
                    );
                    // Ikon ubah / hapus muncul saat baris kategori disorot (di layar sentuh selalu tampak)
                    const aksiKat =
                      kat && izin.tulis ? (
                        <span
                          className="shrink-0 inline-flex items-center gap-0.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto motion-safe:transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className={`${K.ikonBtn} w-7 h-7`}
                            type="button"
                            aria-label={`Ubah kategori ${kat.nama}`}
                            title="Ubah kategori"
                            onClick={() => setUbahKat(kat)}
                          >
                            <FaPen size={12} />
                          </button>
                          <button
                            className={`${K.ikonBtn} ${K.ikonHapus} w-7 h-7`}
                            type="button"
                            aria-label={`Nonaktifkan kategori ${kat.nama}`}
                            disabled={!izin.hapus}
                            title="Nonaktifkan kategori"
                            onClick={() => setHapusKat(kat)}
                          >
                            <FaBan size={12} />
                          </button>
                        </span>
                      ) : null;
                    const namaKat = (
                      <span className={grup.id ? undefined : STATUS.critInk}>{grup.nama}</span>
                    );
                    return (
                      <Fragment key={r.b.id}>
                        {awalGrup && (
                          <tr
                            data-baris-kat={grup.id || 'tanpa'}
                            className={`group cursor-pointer font-bold ${T.surface2} hover:bg-[#E9ECF1] dark:hover:bg-[#1C2C45] text-[#0f2040] dark:text-[#EAF0F8]`}
                            onClick={() => bukaTutup(kunciKat)}
                          >
                            {wa ? (
                              <td className={`${TD} py-1.5 max-w-0 w-full`}>
                                <div className="flex items-center gap-1">
                                  {tombol}
                                  <div className="flex-auto min-w-0">
                                    <div
                                      className={`text-[15px] font-semibold leading-[1.3] ${K.mono} ${BIRU.text}`}
                                    >
                                      {grup.id ? grup.kode : <PeringatanKode kecil />}
                                    </div>
                                    <div className="mt-0.5 text-[13.5px] font-semibold truncate">
                                      {namaKat}
                                    </div>
                                  </div>
                                  {aksiKat}
                                </div>
                              </td>
                            ) : (
                              <>
                                <td className={`${TD} py-1.5 ${K.mono} ${BIRU.text}`}>
                                  <span className="relative inline-flex items-center">
                                    {tombol}
                                    {grup.id ? (
                                      grup.kode
                                    ) : (
                                      <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2">
                                        <PeringatanKode />
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td className={`${TD} py-1.5`} colSpan={3}>
                                  <div className="flex items-center justify-between gap-3 min-h-6">
                                    {namaKat}
                                    {aksiKat}
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        )}
                        {!tertutup && r.kosong && (
                          <tr className={`text-[13px] italic ${T.inkMuted}`}>
                            {wa ? (
                              <td className={`${TD} py-2.5`}>Belum ada barang di kategori ini</td>
                            ) : (
                              <>
                                <td className={`${TD} py-3`} />
                                <td className={`${TD} py-3`} colSpan={3}>
                                  Belum ada barang di kategori ini
                                </td>
                              </>
                            )}
                          </tr>
                        )}
                        {!tertutup && !r.kosong && (
                          <tr
                            data-baris-barang={r.b.id}
                            tabIndex={0}
                            aria-selected={pilihId === r.b.id}
                            onClick={() => setPilihId(r.b.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setPilihId(r.b.id);
                            }}
                            className={`cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2A78D6] ${
                              pilihId === r.b.id
                                ? 'bg-[#EAF1FB] dark:bg-[rgba(125,182,243,.12)]'
                                : 'hover:bg-[#F3F5F8] dark:hover:bg-[#16243A]'
                            }`}
                          >
                            {wa ? (
                              <td className={`${TD} py-2.5 max-w-0 w-full`}>
                                <div className="flex items-baseline justify-between gap-3 text-[15px] font-semibold leading-[1.3]">
                                  <span
                                    className={`${K.mono} ${pilihId === r.b.id ? BIRU.text : ''}`}
                                  >
                                    {r.b.kode || '-'}
                                  </span>
                                  <span
                                    className={`shrink-0 text-[13px] font-semibold ${TEKS_STATUS[r.status]}`}
                                  >
                                    {formatSisa(r.b, r.sisa)}
                                  </span>
                                </div>
                                <div
                                  className={`mt-0.5 text-[13.5px] leading-[1.35] truncate ${T.inkMuted}`}
                                >
                                  {r.b.nama}
                                </div>
                              </td>
                            ) : (
                              <>
                                <td className={`${TD} py-3 pl-14 ${K.mono}`}>{r.b.kode || '-'}</td>
                                <td className={`${TD} py-3 font-semibold ${T.inkMuted}`}>
                                  {r.b.nama}
                                </td>
                                <td className={`${TD} py-3 font-semibold tabular-nums`}>
                                  {formatSisa(r.b, r.sisa)}
                                </td>
                                <td className={`${TD} py-3`}>
                                  <StatusBadge status={r.status} />
                                </td>
                              </>
                            )}
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={`px-4 py-3.5 border-t text-[13px] ${T.border} ${T.inkMuted}`}>
              {tersaring.length === 0
                ? 'Tidak ada barang'
                : `Menampilkan semua ${tersaring.length} barang`}
            </div>
          </div>
        </section>
        {terpilih && (
          <div className={sempit ? '' : 'shrink-0 basis-[480px] h-full'}>
            <PanelBarang
              lembar={sempit}
              b={terpilih}
              sisa={sisa[terpilih.id]}
              izin={izin}
              onUbah={() => setDialog({ edit: terpilih })}
              onHapus={() => setHapusB(terpilih)}
              onTutup={() => setPilihId(null)}
            />
          </div>
        )}
      </div>

      {impor && (
        <ImporModal
          kategoriList={kategoriList}
          barang={semuaBarang}
          onImpor={imporBarang}
          onTutup={() => setImpor(false)}
        />
      )}
      {ekspor && (
        <KonfirmasiAksi
          nada="biasa"
          ikon="ekspor"
          judul="Ekspor data ke Excel?"
          teks={
            adaFilter
              ? 'Berkas berisi semua barang yang cocok dengan filter yang sedang aktif.'
              : 'Tidak ada filter aktif, jadi berkas berisi semua barang.'
          }
          rincian={[
            { label: 'Jumlah data', nilai: <strong>{tersaring.length} barang</strong> },
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
          onYa={eksporStok}
          onBatal={() => setEkspor(false)}
        />
      )}
      {hapusB &&
        (() => {
          const sisaB = sisa[hapusB.id];
          const masihAda = sisaB > 0;
          return (
            <KonfirmasiAksi
              terblokir={masihAda}
              judul={masihAda ? 'Barang tidak bisa dinonaktifkan' : 'Nonaktifkan barang ini?'}
              teks={
                masihAda
                  ? 'Barang ini masih punya sisa stok.'
                  : 'Barang tidak dihapus: disembunyikan dari daftar stok dan pilihan transaksi, sedangkan riwayat transaksinya tetap tersimpan.'
              }
              rincian={[
                { label: 'Kode SAKTI Barang', nilai: hapusB.kode || '-', mono: true },
                { label: 'Nama barang', nilai: <strong>{hapusB.nama}</strong> },
                { label: 'Sisa stok', nilai: formatSisa(hapusB, sisaB) },
              ]}
              galat={
                masihAda
                  ? `Sisa ${formatSisa(hapusB, sisaB)} harus dikeluarkan dulu (catat barang keluar) sebelum barang ini dinonaktifkan.`
                  : undefined
              }
              labelYa="Ya, Nonaktifkan"
              onYa={hapusBarang}
              onBatal={() => setHapusB(null)}
            />
          );
        })()}
      {hapusKat &&
        (() => {
          const n = barang.filter((b) => b.kategoriId === hapusKat.id).length;
          const nTanpaKode = barang.filter((b) => b.kategoriId === hapusKat.id && !b.kode).length;
          return (
            <KonfirmasiAksi
              terblokir={n > 0}
              judul={n > 0 ? 'Kategori tidak bisa dinonaktifkan' : 'Nonaktifkan kategori ini?'}
              teks={
                n > 0
                  ? 'Kategori ini masih punya barang.'
                  : 'Kategori tidak dihapus: disembunyikan dari daftar dan pilihan, data lamanya tetap tersimpan.'
              }
              rincian={[
                { label: 'Kode kategori SAKTI', nilai: hapusKat.kode, mono: true },
                { label: 'Nama kategori', nilai: <strong>{hapusKat.nama}</strong> },
                { label: 'Jumlah barang', nilai: n },
              ]}
              galat={
                n > 0
                  ? `Masih ada ${n} barang yang memakai kategori ini${nTanpaKode > 0 ? ` (${nTanpaKode} di antaranya belum punya kode barang, jadi tampil di "Belum ada kategori SAKTI")` : ''}. Pindahkan barangnya ke kategori lain lewat Ubah Barang, atau nonaktifkan barangnya terlebih dahulu.`
                  : undefined
              }
              labelYa="Ya, Nonaktifkan"
              sibuk={sibuk}
              onYa={async () => {
                setSibuk(true);
                await hapusKategori();
                setSibuk(false);
              }}
              onBatal={() => setHapusKat(null)}
            />
          );
        })()}
      {ubahKat && (
        <UbahKategoriModal
          kat={ubahKat}
          jumlahBarang={barang.filter((b) => b.kategoriId === ubahKat.id).length}
          kategoriLain={kategoriList.filter((k) => k.id !== ubahKat.id)}
          onSimpan={simpanUbahKategori}
          onTutup={() => setUbahKat(null)}
        />
      )}
      {dialog && (
        <FormBarang
          edit={dialog.edit}
          kategori={kategoriList}
          satuanAda={[...new Set(barang.map((b) => b.satuan))].sort()}
          onSimpan={simpanBarang}
          onSimpanKategori={simpanKategori}
          onSimpanPemasok={simpanPemasok}
          onTutup={() => setDialog(null)}
        />
      )}
    </div>
  );
}
