/** Impor CSV Stok Barang (ImporModal purwarupa inventory-ui): urai berkas dan periksa tiap baris. */

export const KOLOM_IMPOR = 'kode_kategori,kode_barang,nama_barang,satuan,stok_awal,stok_minimum';
export const CONTOH_IMPOR = '1010301001,000099,Pulpen Contoh,pcs,100,20';

// Nama judul kolom (dibersihkan dari spasi/simbol, huruf kecil) -> kolom data
const PETA_JUDUL = {
  kodekategori: 'kategori',
  kodekategorisakti: 'kategori',
  kodekat: 'kategori',
  kodebarang: 'kode',
  kodebarangsakti: 'kode',
  kodeuraian: 'kode',
  kode: 'kode',
  namabarang: 'nama',
  nama: 'nama',
  satuan: 'satuan',
  stokawal: 'stokAwal',
  stokminimum: 'stokMin',
  stokmin: 'stokMin',
  minimum: 'stokMin',
};
const WAJIB = [
  ['nama', 'nama_barang'],
  ['satuan', 'satuan'],
  ['stokAwal', 'stok_awal'],
  ['stokMin', 'stok_minimum'],
];

/** Pecah teks CSV menjadi baris sel. Mendukung tanda kutip, pemisah koma, titik koma, atau tab. */
function uraiCsv(teks) {
  const isi = teks.replace(/^FEFF/, '');
  const barisPertama = isi.split(/\r?\n/)[0] || '';
  const pemisah = [',', ';', '\t']
    .map((p) => [p, barisPertama.split(p).length])
    .sort((a, b) => b[1] - a[1])[0][0];
  const hasil = [];
  let baris = [];
  let sel = '';
  let kutip = false;
  for (let i = 0; i < isi.length; i += 1) {
    const c = isi[i];
    if (kutip) {
      if (c === '"' && isi[i + 1] === '"') {
        sel += '"';
        i += 1;
      } else if (c === '"') kutip = false;
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === pemisah) {
      baris.push(sel);
      sel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && isi[i + 1] === '\n') i += 1;
      baris.push(sel);
      sel = '';
      hasil.push(baris);
      baris = [];
    } else sel += c;
  }
  if (sel !== '' || baris.length) {
    baris.push(sel);
    hasil.push(baris);
  }
  return hasil;
}

/** Periksa isi CSV terhadap aturan Tambah Barang. Mengembalikan baris valid dan galat per baris. */
export function periksaImpor(teks, kategoriList, barang) {
  const tabel = uraiCsv(teks);
  if (tabel.length === 0 || tabel.every((r) => r.every((s) => s.trim() === '')))
    return { galatUmum: 'Berkas kosong.', valid: [], galat: [], total: 0 };
  const judul = tabel[0].map((h) => PETA_JUDUL[h.toLowerCase().replace(/[^a-z0-9]/g, '')]);
  const hilang = WAJIB.filter(([k]) => !judul.includes(k)).map(([, nama]) => nama);
  if (hilang.length)
    return {
      galatUmum: `Kolom wajib tidak ditemukan di baris pertama: ${hilang.join(', ')}.`,
      valid: [],
      galat: [],
      total: 0,
    };
  const ambil = (r, k) => (judul.indexOf(k) >= 0 ? (r[judul.indexOf(k)] || '').trim() : '');

  const valid = [];
  const galat = [];
  const dipakai = new Set(
    barang.filter((b) => b.kode).map((b) => `${b.kategoriId || 0}|${b.kode}`),
  );
  let total = 0;
  tabel.slice(1).forEach((r, i) => {
    if (r.every((s) => s.trim() === '')) return;
    total += 1;
    const nomor = i + 2; // nomor baris di berkas (baris 1 = judul kolom)
    const nama = ambil(r, 'nama');
    const satuan = ambil(r, 'satuan');
    const awal = ambil(r, 'stokAwal');
    const min = ambil(r, 'stokMin');
    let kode = ambil(r, 'kode');
    const kodeKat = ambil(r, 'kategori');
    const tolak = (teksGalat) => galat.push({ nomor, teks: teksGalat });
    if (!nama) return tolak('Nama barang kosong.');
    if (!satuan) return tolak('Satuan kosong.');
    if (!/^\d+$/.test(awal)) return tolak('Stok awal harus bilangan bulat 0 atau lebih.');
    if (!/^\d+$/.test(min)) return tolak('Stok minimum harus bilangan bulat 0 atau lebih.');
    if (kode && !/^\d{1,6}$/.test(kode))
      return tolak('Kode barang SAKTI harus angka, maksimal 6 digit.');
    let kategoriId = null;
    if (kodeKat) {
      const k = kategoriList.find((x) => x.kode === kodeKat);
      if (!k) return tolak(`Kode kategori ${kodeKat} tidak ditemukan.`);
      kategoriId = k.id;
    }
    if (kode) {
      kode = kode.padStart(6, '0');
      const kunci = `${kategoriId || 0}|${kode}`;
      if (dipakai.has(kunci))
        return tolak(`Kode barang ${kode} sudah dipakai pada kategori yang sama.`);
      dipakai.add(kunci);
    }
    valid.push({ nama, satuan, stokAwal: Number(awal), stokMin: Number(min), kategoriId, kode });
    return undefined;
  });
  return {
    galatUmum: total === 0 ? 'Tidak ada baris data setelah judul kolom.' : null,
    valid,
    galat,
    total,
  };
}
