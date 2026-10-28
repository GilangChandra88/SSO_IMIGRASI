/**
 * Logika stok Inventory (lib.js purwarupa inventory-ui). Stok tidak pernah diketik manual:
 * sisa = stok awal + total barang masuk - total barang keluar.
 */

export const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
export const BULAN_SINGKAT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const dua = (n) => String(n).padStart(2, '0');
export const buatIso = (y, m, d) => `${y}-${dua(m)}-${dua(d)}`;

/** Tanggal hari ini (zona waktu perangkat) berbentuk 'YYYY-MM-DD'. */
export function hariIni() {
  const t = new Date();
  return buatIso(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

export function formatTanggal(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d} ${BULAN_SINGKAT[Number(m) - 1]} ${y}`;
}

export function formatTanggalPanjang(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-').map(Number);
  const hari = HARI[new Date(y, m - 1, d).getDay()];
  return `${hari}, ${d} ${BULAN[m - 1]} ${y}`;
}

/** ID transaksi berurutan sesuai waktu dicatat: TBR = barang masuk, TBK = barang keluar. */
export function idTransaksi(jenis, nomor) {
  return `${jenis === 'keluar' ? 'TBK' : 'TBR'}-${String(nomor || 0).padStart(5, '0')}`;
}

export function hitungStok(daftarBarang, masuk, keluar) {
  const sisa = {};
  daftarBarang.forEach((b) => {
    sisa[b.id] = b.stokAwal || 0; // stok awal = saldo sebelum transaksi tercatat
  });
  masuk.forEach((m) => {
    if (m.barangId in sisa) sisa[m.barangId] += m.jumlah;
  });
  keluar.forEach((k) =>
    (k.items || []).forEach((i) => {
      if (i.barangId in sisa) sisa[i.barangId] -= i.jumlah;
    }),
  );
  return sisa;
}

export function adaStokMinus(daftarBarang, masuk, keluar) {
  return Object.values(hitungStok(daftarBarang, masuk, keluar)).some((v) => v < 0);
}

// Habis: sisa 0. Menipis: 0 < sisa <= stok minimum. Aman: sisa > stok minimum.
export function statusStok(sisa, stokMin) {
  if (sisa <= 0) return 'habis';
  if (sisa <= stokMin) return 'menipis';
  return 'aman';
}

export const LABEL_STATUS = { aman: 'Aman', menipis: 'Menipis', habis: 'Habis' };

export function formatSisa(barang, sisa) {
  return `${sisa} ${barang?.satuan || ''}`.trim();
}

/**
 * Kelompok tampil barang di Stok Barang dan pilihan transaksi. Barang tanpa kode barang SAKTI
 * ditaruh di "Belum ada kategori SAKTI" (meski kategorinya sudah dipilih).
 * `kosong`: baris penanda kategori tanpa barang, tetap memakai kategorinya sendiri.
 */
export function kelompokStok(b) {
  const masuk = Boolean(b.kategoriId) && Boolean(b.kode || b.kosong);
  return masuk
    ? { id: b.kategoriId, kode: b.kategoriKode || '', nama: b.kategori }
    : { id: null, kode: '', nama: 'Belum ada kategori SAKTI' };
}

// Urutan Stok Barang: kelompok dulu (yang belum punya kategori SAKTI paling atas), lalu kode barang.
export function bandingStok(x, y) {
  const kx = kelompokStok(x).kode;
  const ky = kelompokStok(y).kode;
  return kx === ky
    ? (x.kode || '').localeCompare(y.kode || '') || String(x.id).localeCompare(String(y.id))
    : kx.localeCompare(ky);
}

/**
 * Pilihan barang di popup Tambah Transaksi: sama dengan daftar Stok Barang.
 * pakai(id): true bila barang sudah dipilih di baris lain. perluStok: sisa 0 tampil tetapi nonaktif.
 */
export function opsiBarang(daftar, sisaDari, { pakai = () => false, perluStok = false } = {}) {
  return [...daftar]
    .sort(bandingStok)
    .filter((b) => !pakai(b.id))
    .map((b) => {
      const s = sisaDari(b.id);
      const grup = kelompokStok(b);
      return {
        nilai: b.id,
        label: b.nama,
        kode: b.kode || '-',
        kelompok: { kode: grup.kode || '-', nama: grup.nama },
        cari: `${b.idSakti} ${b.kategori}`,
        info: formatSisa(b, s),
        nonaktif: perluStok && s <= 0,
      };
    });
}

export function tanggalLewat(iso) {
  return iso > hariIni();
}

export function totalBarang(items) {
  return (items || []).reduce((a, i) => a + i.jumlah, 0);
}

/** Urutan riwayat: yang baru dicatat paling atas; lalu tanggal, barang keluar dulu, nomor. */
export function bandingRiwayat(x, y) {
  if ((x.dibuat || 0) !== (y.dibuat || 0)) return (y.dibuat || 0) - (x.dibuat || 0);
  if (x.tanggal !== y.tanggal) return x.tanggal < y.tanggal ? 1 : -1;
  if (x.jenis !== y.jenis) return x.jenis === 'keluar' ? -1 : 1;
  return (y.nomor || 0) - (x.nomor || 0);
}
