import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePegawaiRingkas } from '@/context/usePegawaiRingkas';
import ToastViewport from '@/components/ToastViewport';
import { showToast } from '@/utils/toastStore';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { InventoriKonteks } from './inventoriKonteks';
import { kueriBarang, kueriKategori, kueriPemasok, kueriSaldo } from '../services/inventoryDb';
import TransaksiModal from '../components/TransaksiModal';
import BuktiModal from '../components/BuktiModal';

const urutNama = (a, b) => (a.nama || '').localeCompare(b.nama || '');
const OPSI = { tahanMs: 10 * 60_000, pesan: 'Data inventory gagal dimuat.' };

/**
 * Pengganti state App.jsx purwarupa: master Inventory (kategori ≤500, barang ≤2.000, pemasok
 * ≤1.000) dan ringkasan stok per tahun (`inventory_saldo`, ditulis Function) lewat listener
 * bersama, pegawai dari `pegawai_ringkas`; menghitung sisa stok dan memegang popup Tambah
 * Transaksi & Bukti Serah Terima. Riwayat transaksi dimuat per halaman (`useTransaksi`).
 * Hak akses: Super Admin & peran Umum menulis (ditegakkan rules & Function); peran lain melihat.
 */
export default function InventoriProvider({ children }) {
  const navigate = useNavigate();
  const { currentUser, isUmum } = useAuth();
  const kategori = usePantauBersama('inventory_kategori', kueriKategori, OPSI);
  const barang = usePantauBersama('inventory_barang', kueriBarang, OPSI);
  const pemasok = usePantauBersama('inventory_pemasok', kueriPemasok, OPSI);
  const saldo = usePantauBersama('inventory_saldo', kueriSaldo, OPSI);
  const { semua: pegawaiRingkas } = usePegawaiRingkas();
  const [dialog, setDialog] = useState(null); // popup Tambah Transaksi: { tab, edit }
  const [bukti, setBukti] = useState(null); // transaksi barang keluar yang buktinya tampil
  const [lengkapiId, setLengkapiId] = useState(null); // "Lengkapi" dari Dashboard → Ubah Barang

  // Pengambil barang keluar = pegawai aktif (nama + seksi dari modul Kepegawaian)
  const pegawai = useMemo(
    () =>
      pegawaiRingkas
        .filter((p) => p.aktif !== false)
        .map((p) => ({ id: p.id, nama: p.nama || '', seksi: p.seksi || '' }))
        .sort(urutNama),
    [pegawaiRingkas],
  );

  // Semua kategori (termasuk nonaktif) untuk nama di riwayat; pilihan memakai yang aktif saja
  const semuaKategori = useMemo(
    () => [...(kategori.data || [])].sort((a, b) => (a.kode || '').localeCompare(b.kode || '')),
    [kategori.data],
  );
  const kategoriList = useMemo(
    () => semuaKategori.filter((k) => k.aktif !== false),
    [semuaKategori],
  );
  // Barang untuk halaman: Kode SAKTI = kode kategori + kode barang; nama kategori ikut master
  const semuaBarang = useMemo(
    () =>
      (barang.data || []).map((b) => {
        const k = semuaKategori.find((x) => x.id === b.kategoriId);
        return {
          ...b,
          kategoriId: k ? b.kategoriId : null,
          kategori: k ? k.nama : '-',
          kategoriKode: k ? k.kode : '',
          akunKode: k ? k.akunKode || '' : '',
          idSakti: `${k ? k.kode : ''}${b.kode || ''}`,
        };
      }),
    [barang.data, semuaKategori],
  );
  const daftarBarang = useMemo(() => semuaBarang.filter((b) => b.aktif !== false), [semuaBarang]);

  // Stok = stok awal + Σ masuk − Σ keluar seluruh tahun; jumlah transaksi per bulan untuk grafik
  const { totalMasuk, totalKeluar, bulanan } = useMemo(() => {
    const masuk = {};
    const keluar = {};
    const perBulan = {};
    (saldo.data || []).forEach((s) => {
      Object.entries(s.masuk || {}).forEach(([id, n]) => (masuk[id] = (masuk[id] || 0) + n));
      Object.entries(s.keluar || {}).forEach(([id, n]) => (keluar[id] = (keluar[id] || 0) + n));
      Object.entries(s.bulan || {}).forEach(([b, v]) => {
        perBulan[`${s.tahun || s.id}-${b}`] = { masuk: v.masuk || 0, keluar: v.keluar || 0 };
      });
    });
    return { totalMasuk: masuk, totalKeluar: keluar, bulanan: perBulan };
  }, [saldo.data]);
  const sisa = useMemo(
    () =>
      Object.fromEntries(
        semuaBarang.map((b) => [
          b.id,
          (b.stokAwal || 0) + (totalMasuk[b.id] || 0) - (totalKeluar[b.id] || 0),
        ]),
      ),
    [semuaBarang, totalMasuk, totalKeluar],
  );
  const pemasokList = useMemo(
    () =>
      (pemasok.data || [])
        .filter((p) => p.aktif !== false)
        .map((p) => p.nama)
        .sort(),
    [pemasok.data],
  );

  const bukaTransaksi = useCallback((tab = 'keluar', edit = null) => setDialog({ tab, edit }), []);

  // Setelah disimpan: tutup popup, pindah ke tab bersangkutan, tampilkan hasil (+ bukti barang keluar)
  const selesaiTransaksi = useCallback(
    (jenis, teks, rekam) => {
      setDialog(null);
      navigate(jenis === 'keluar' ? '/inventory/transaksi/cetak' : '/inventory/transaksi');
      if (teks) showToast(teks);
      if (rekam) setBukti(rekam);
    },
    [navigate],
  );

  const nilai = {
    siap: !kategori.memuat && !barang.memuat && !pemasok.memuat && !saldo.memuat,
    kategoriList,
    semuaKategori,
    namaKategori: kategoriList.map((k) => k.nama),
    barang: daftarBarang,
    semuaBarang,
    pemasokList,
    pegawai,
    sisa,
    totalMasuk,
    totalKeluar,
    bulanan,
    izin: { tulis: isUmum, hapus: isUmum },
    pengguna: { uid: currentUser?.uid || '' },
    bukaTransaksi,
    bukaBukti: setBukti,
    lengkapiId,
    setLengkapiId,
  };

  return (
    <InventoriKonteks.Provider value={nilai}>
      {children}
      {dialog && (
        <TransaksiModal
          tabAwal={dialog.tab}
          edit={dialog.edit}
          onTutup={() => setDialog(null)}
          onSelesai={selesaiTransaksi}
        />
      )}
      {bukti && (
        <BuktiModal
          transaksi={bukti}
          onTutup={() => setBukti(null)}
          onUbah={
            isUmum && bukti.status !== 'batal'
              ? () => {
                  setDialog({ tab: 'keluar', edit: bukti });
                  setBukti(null);
                }
              : undefined
          }
        />
      )}
      <ToastViewport />
    </InventoriKonteks.Provider>
  );
}
