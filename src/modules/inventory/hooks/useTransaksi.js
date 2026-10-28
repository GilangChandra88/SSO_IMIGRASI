/**
 * Riwayat transaksi Inventory satu jenis lewat listener bersama: 200 terbaru mengikuti listener,
 * halaman berikutnya lewat `muatLagi`/`muatSemua` (tanpa listener). Baris dinormalkan ke bentuk
 * tampilan lama (`jenis`, `dibuat` ms, `pemasok`, `pegawai`, `pegawaiId`).
 */
import { useState } from 'react';
import { LIMIT_KUERI } from '@/utils/batas';
import { keDate } from '@/utils/nilai';
import { showToast } from '@/utils/toastStore';
import { usePantauBersama } from '@/utils/usePantauBersama';
import {
  ambilTransaksiBerikutnya,
  kueriTerbaru,
  kueriTransaksi,
  kueriTransaksiBarang,
} from '../services/inventoryDb';

const MAKS_HALAMAN = 50; // jaga-jaga muatSemua (50 × 200 transaksi)

const normal = (jenis) => (d) => ({
  ...d,
  jenis,
  dibuat: keDate(d.dibuatPada)?.getTime() || 0,
  ...(jenis === 'masuk'
    ? { pemasok: d.pemasokNama || '' }
    : { pegawai: d.pengambil?.nama || '', pegawaiId: d.pengambil?.pegawaiId || '' }),
});

const KOSONG = { kunci: null, baris: [], habis: false, memuat: false };

/**
 * @param {'masuk'|'keluar'} jenis
 * @param {{ dari?: string, sampai?: string }} [rentang]  tanggal 'YYYY-MM-DD'; kosong = semua
 */
export function useTransaksi(jenis, { dari = '', sampai = '' } = {}) {
  const opsi = { dari, sampai: dari ? sampai || dari : '' };
  const kunci = `inventory_${jenis}:${opsi.dari}:${opsi.sampai}`;
  const { data, memuat } = usePantauBersama(kunci, () => kueriTransaksi(jenis, opsi), {
    tahanMs: 5 * 60_000,
    pesan: 'Gagal memuat riwayat transaksi.',
  });
  const [lanjutan, setLanjutan] = useState(KOSONG);
  const tambahan = lanjutan.kunci === kunci ? lanjutan : KOSONG;
  const pertama = data || [];
  const ada = new Set(pertama.map((r) => r.id));
  const mentah = [...pertama, ...tambahan.baris.filter((r) => !ada.has(r.id))];
  const rows = mentah.map(normal(jenis));
  const bisaLagi = pertama.length === LIMIT_KUERI.transaksiInventory && !tambahan.habis;

  /** Ambil halaman berikutnya dari daftar `sudah`; hasil: { baris baru, habis }. */
  async function halamanBerikut(sudah) {
    const terakhir = sudah[sudah.length - 1];
    const baru = await ambilTransaksiBerikutnya(jenis, opsi, terakhir);
    const kenal = new Set(sudah.map((r) => r.id));
    const unik = baru.filter((r) => !kenal.has(r.id));
    return { unik, habis: baru.length < LIMIT_KUERI.transaksiInventory || unik.length === 0 };
  }

  const muatLagi = async () => {
    if (!mentah.length) return;
    setLanjutan({ ...tambahan, kunci, memuat: true });
    try {
      const { unik, habis } = await halamanBerikut(mentah);
      setLanjutan({ kunci, baris: [...tambahan.baris, ...unik], habis, memuat: false });
    } catch {
      showToast('Tidak punya akses atau gagal memuat data berikutnya.', 'error');
      setLanjutan({ ...tambahan, kunci, memuat: false });
    }
  };

  /** Muat semua halaman yang tersisa (mis. sebelum ekspor); hasil: seluruh baris ternormal. */
  const muatSemua = async () => {
    if (!bisaLagi) return rows;
    setLanjutan({ ...tambahan, kunci, memuat: true });
    let semua = mentah;
    let habis = false;
    try {
      for (let i = 0; i < MAKS_HALAMAN && !habis; i++) {
        const h = await halamanBerikut(semua);
        semua = [...semua, ...h.unik];
        habis = h.habis;
      }
    } catch {
      showToast('Sebagian transaksi gagal dimuat.', 'error');
    }
    const baris = semua.slice(pertama.length);
    setLanjutan({ kunci, baris, habis, memuat: false });
    return semua.map(normal(jenis));
  };

  return { rows, memuat, bisaLagi, memuatLagi: tambahan.memuat, muatLagi, muatSemua };
}

/** Beberapa transaksi terbaru satu jenis (Aktivitas Terbaru di Dashboard), ternormal. */
export function useTransaksiTerbaru(jenis, n = 5) {
  const { data, memuat } = usePantauBersama(
    `inventory_${jenis}:terbaru:${n}`,
    () => kueriTerbaru(jenis, n),
    { tahanMs: 5 * 60_000, pesan: 'Gagal memuat transaksi terbaru.' },
  );
  return { rows: (data || []).map(normal(jenis)), memuat };
}

/** Transaksi masuk & keluar satu barang (≤200 per jenis), ternormal. */
export function useTransaksiBarang(barangId) {
  const opsi = { tahanMs: 60_000, pesan: 'Gagal memuat riwayat barang.' };
  const m = usePantauBersama(
    barangId ? `inventory_masuk:barang:${barangId}` : null,
    () => kueriTransaksiBarang('masuk', barangId),
    opsi,
  );
  const k = usePantauBersama(
    barangId ? `inventory_keluar:barang:${barangId}` : null,
    () => kueriTransaksiBarang('keluar', barangId),
    opsi,
  );
  return {
    masuk: (m.data || []).map(normal('masuk')),
    keluar: (k.data || []).map(normal('keluar')),
    memuat: m.memuat || k.memuat,
  };
}
