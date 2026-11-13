/**
 * Koperasi › Unit Usaha Kantin (docs/skema-database.md §5.7, docs/rencana-koperasi.md §8): kategori &
 * master barang (kemasan, resep, barkode GS1 unik), Kasir, pembelian (barang & bahan habis pakai),
 * stok awal, stok opname, dan pembatalan penjualan. Stok selalu dalam satuan dasar.
 */

const {
  FieldValue,
  db,
  pemanggil,
  wajibPeran,
  idSah,
  teksSah,
  tanggalSah,
  waktuWita,
  jejakUbah,
  catatLog,
} = require('./umum');
const { callable, bacaAmbang } = require('./jejak');
const {
  AKUN,
  kol,
  waktu,
  galat,
  tolak,
  rupiahSah,
  bukaBuku,
  saldoAkun,
  wajibKas,
  cekTanggal,
  posting,
  refAnggota,
  rekapAnggota,
} = require('./koperasiBuku');

// ─── Kategori barang Kantin ─────────────────────────────────────────────────

const MAKS_KATEGORI = 98; // kode akun 3101–3198 / 3501–3598

/**
 * Tambah kategori barang beserta akun Pendapatan Penjualan (3100+n) dan HPP (3500+n), seperti sheet.
 * Masukan: { nama }. Hasil: { id }.
 */
exports.buatKategoriKantin = callable('buatKategoriKantin', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const nama = teksSah(req.data?.nama, 80, 'Nama kategori');

  return db.runTransaction(async (tx) => {
    const semua = await tx.get(kol('koperasiKantinKategori').limit(200));
    const kunci = nama.toLowerCase();
    if (semua.docs.some((k) => String(k.get('nama')).toLowerCase() === kunci)) {
      throw tolak(`Kategori ${nama} sudah ada.`);
    }
    const n = semua.docs.reduce((m, k) => Math.max(m, k.get('urutan') || 0), 0) + 1;
    if (n > MAKS_KATEGORI) throw tolak(`Kategori paling banyak ${MAKS_KATEGORI}.`);

    const ref = kol('koperasiKantinKategori').doc();
    const akunJualId = `k-jual-${ref.id}`;
    const akunHppId = `k-hpp-${ref.id}`;
    const jejak = { dibuatPada: waktu(), dibuatOleh: p.uid, ...jejakUbah(p.uid) };
    tx.create(ref, { nama, urutan: n, akunJualId, akunHppId, aktif: true, ...jejak });
    const akun = (kode, namaAkun, kelompok) => ({
      kode: String(kode),
      nama: namaAkun,
      kelompok,
      kas: false,
      sistem: true,
      urutan: n,
      aktif: true,
      ...jejak,
    });
    tx.create(
      kol('koperasiAkun').doc(akunJualId),
      akun(3100 + n, `Pendapatan Penjualan ${nama}`, 'pendapatan'),
    );
    tx.create(kol('koperasiAkun').doc(akunHppId), akun(3500 + n, `HPP ${nama}`, 'hpp'));
    return { id: ref.id };
  });
});

// ─── Barang Kantin: satuan, resep ───────────────────────────────────────────

// Batas di bawah ini dicerminkan klien di src/modules/koperasi/data/aturan.js (BATAS).
const MAKS_ITEM = 100;
const MAKS_JUMLAH = 999;
const BATAS_STOK = 1000000;

const refBarang = (id) => kol('koperasiKantinBarang').doc(id);
const jenisBarang = (b) => b.get('jenis') || 'barang';

/**
 * Baris { barangId, kemasanId, jumlah } (kemasanId '' = satuan dasar). Barang + satuan yang sama
 * hanya boleh sekali; barang yang sama dengan satuan berbeda boleh.
 */
function itemSah(v, { bolehKosong = false } = {}) {
  if (!Array.isArray(v) || v.length > MAKS_ITEM || (!bolehKosong && !v.length)) {
    throw galat(`Daftar barang harus berisi 1–${MAKS_ITEM} baris.`);
  }
  const terlihat = new Set();
  return v.map((i) => {
    const barangId = idSah(i?.barangId, 'Barang');
    const kemasanId = i?.kemasanId ? idSah(i.kemasanId, 'Kemasan') : '';
    const jumlah = Number(i?.jumlah);
    if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAKS_JUMLAH) {
      throw galat(`Jumlah barang harus 1–${MAKS_JUMLAH}.`);
    }
    const kunci = `${barangId}|${kemasanId}`;
    if (terlihat.has(kunci)) throw galat('Barang dengan kemasan yang sama tercatat dua kali.');
    terlihat.add(kunci);
    return { barangId, kemasanId, jumlah };
  });
}

/** Satuan barang: '' = satuan dasar. Kembalian { id, nama, isi, hargaJual }. */
function satuanJual(b, kemasanId) {
  if (!kemasanId) return { id: '', nama: b.get('satuan'), isi: 1, hargaJual: b.get('hargaJual') };
  const s = (b.get('kemasan') || []).find((x) => x.id === kemasanId);
  if (!s || !Number.isInteger(s.isi) || s.isi < 1) {
    throw tolak(`Kemasan untuk ${b.get('nama')} tidak ditemukan. Muat ulang halaman.`);
  }
  return { id: s.id, nama: s.nama, isi: s.isi, hargaJual: s.hargaJual };
}

/**
 * Baca barang + komponen resepnya (+ kategori bila `kategori`). Semua dibaca sebelum tulisan apa pun.
 * Kembalian: { barang: Map<id, Snapshot>, kategori: Map<id, data> }.
 */
async function bacaBarang(tx, ids, { kategori: perluKategori = true } = {}) {
  const barang = new Map();
  const ambil = async (daftar) => {
    const baru = [...new Set(daftar)].filter((id) => !barang.has(id));
    if (!baru.length) return [];
    const snap = await tx.getAll(...baru.map(refBarang));
    snap.forEach((b) => {
      if (!b.exists) throw tolak('Ada barang yang tidak ditemukan.');
      barang.set(b.id, b);
    });
    return snap;
  };
  const utama = await ambil(ids);
  const resep = utama.filter((b) => jenisBarang(b) === 'resep');
  await ambil(resep.flatMap((b) => (b.get('komponen') || []).map((k) => k.barangId)));
  resep.forEach((r) =>
    (r.get('komponen') || []).forEach((k) => {
      if (jenisBarang(barang.get(k.barangId)) !== 'barang') {
        throw tolak(`Komponen resep ${r.get('nama')} harus barang biasa, bukan resep.`);
      }
    }),
  );

  const kat = new Map();
  if (perluKategori) {
    const katIds = [...new Set(ids.map((id) => barang.get(id).get('kategoriId')))];
    const snap = await tx.getAll(...katIds.map((id) => kol('koperasiKantinKategori').doc(id)));
    snap.forEach((k) => {
      if (!k.exists || !k.get('akunJualId')) {
        throw tolak('Kategori barang belum punya akun. Buat ulang kategorinya di Stok Barang.');
      }
      kat.set(k.id, k.data());
    });
  }
  return { barang, kategori: kat };
}

/** Anggota pembeli ('' = UMUM). Kembalian: snapshot atau null. */
async function bacaAnggota(tx, anggotaId) {
  if (!anggotaId) return null;
  const a = await tx.get(kol('koperasiAnggota').doc(idSah(anggotaId, 'Anggota')));
  if (!a.exists || a.get('status') !== 'aktif') {
    throw tolak('Anggota tidak ditemukan atau sudah keluar.');
  }
  return a;
}

/**
 * Rinci baris penjualan: harga dari server, HPP dari harga pokok rata-rata (resep: jumlah harga pokok
 * komponen), dan stok keluar per barang dalam satuan dasar.
 */
function rinciPenjualan(items, barang, kategori) {
  const keluar = new Map();
  const kurangi = (id, n) => keluar.set(id, (keluar.get(id) || 0) + n);
  const rinci = items.map((i) => {
    const b = barang.get(i.barangId);
    if (b.get('aktif') === false) throw tolak(`${b.get('nama')} sudah nonaktif.`);
    const kat = kategori.get(b.get('kategoriId'));
    const dasar = { barangId: b.id, nama: b.get('nama'), jenis: jenisBarang(b), jumlah: i.jumlah };
    if (jenisBarang(b) === 'resep') {
      if (i.kemasanId) throw tolak(`Resep ${b.get('nama')} tidak punya kemasan.`);
      const komponen = b.get('komponen') || [];
      if (!komponen.length) throw tolak(`Resep ${b.get('nama')} belum punya komponen.`);
      let hppSatu = 0;
      komponen.forEach((k) => {
        if (!Number.isInteger(k.jumlah) || k.jumlah < 1) {
          throw tolak(`Komponen resep ${b.get('nama')} tidak sah.`);
        }
        hppSatu += (barang.get(k.barangId).get('hargaPokok') || 0) * k.jumlah;
        kurangi(k.barangId, k.jumlah * i.jumlah);
      });
      const harga = b.get('hargaJual');
      return {
        kat,
        item: {
          ...dasar,
          kemasanId: '',
          satuan: b.get('satuan'),
          isi: 1,
          harga,
          subtotal: harga * i.jumlah,
          hpp: hppSatu * i.jumlah,
        },
      };
    }
    const s = satuanJual(b, i.kemasanId);
    kurangi(b.id, s.isi * i.jumlah);
    return {
      kat,
      item: {
        ...dasar,
        kemasanId: s.id,
        satuan: s.nama,
        isi: s.isi,
        harga: s.hargaJual,
        subtotal: s.hargaJual * i.jumlah,
        hpp: (b.get('hargaPokok') || 0) * s.isi * i.jumlah,
      },
    };
  });
  const stokKeluar = [...keluar].map(([barangId, jumlah]) => ({
    barangId,
    nama: barang.get(barangId).get('nama'),
    jumlah,
  }));
  return { rinci, stokKeluar };
}

// ─── Master barang Kantin ───────────────────────────────────────────────────

// Cermin klien: BATAS.kemasan / BATAS.komponen (src/modules/koperasi/data/aturan.js).
const MAKS_KEMASAN = 5;
const MAKS_KOMPONEN = 10;
const refBarkode = (kode) => kol('koperasiKantinBarkode').doc(kode);

/** Digit cek GS1 untuk deret angka tanpa digit cek (bobot 3,1,3,… dari kanan). */
function digitCekGs1(angka) {
  const total = [...angka].reverse().reduce((n, d, i) => n + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (total % 10)) % 10;
}

/** UPC-E 8 digit → 11 digit pertama UPC-A (tanpa digit cek). */
function upcEkeUpcA(k) {
  const d = k.slice(1, 7);
  const t = d[5];
  let isi;
  if (t <= '2') isi = `${d.slice(0, 2)}${t}0000${d.slice(2, 5)}`;
  else if (t === '3') isi = `${d.slice(0, 3)}00000${d.slice(3, 5)}`;
  else if (t === '4') isi = `${d.slice(0, 4)}00000${d[4]}`;
  else isi = `${d.slice(0, 5)}0000${t}`;
  return `${k[0]}${isi}`;
}

/**
 * Barkode ritel standar GS1 (EAN-8, UPC-A, EAN-13, GTIN-14, UPC-E) dengan digit cek benar.
 * SAMA dengan src/modules/koperasi/utils/barkode.js.
 */
function barkodeStandar(kode) {
  if (!/^\d+$/.test(kode)) return false;
  const cek = Number(kode[kode.length - 1]);
  if ([8, 12, 13, 14].includes(kode.length) && digitCekGs1(kode.slice(0, -1)) === cek) return true;
  return (
    kode.length === 8 &&
    (kode[0] === '0' || kode[0] === '1') &&
    digitCekGs1(upcEkeUpcA(kode)) === cek
  );
}

function barkodeSah(v, label) {
  const k = String(v ?? '').trim();
  if (!k) return '';
  if (!barkodeStandar(k)) {
    throw galat(
      `${label} ${k} bukan barkode standar (EAN-13/EAN-8/UPC/GTIN-14 dengan digit cek benar).`,
    );
  }
  return k;
}

function bulatSah(v, min, maks, label) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > maks) throw galat(`${label} harus ${min}–${maks}.`);
  return n;
}

/**
 * Tambah/ubah barang atau resep Kantin. Barkode (termasuk barkode kemasan) wajib standar GS1 dan unik
 * di semua barang: dijaga koleksi `koperasi_kantin_barkode/{kode}` di transaksi yang sama. Barkode
 * yang dikosongkan melepas penjaganya. Stok, harga pokok, dan penanda transaksi tidak disentuh.
 * Masukan: { id?, jenis (baru saja), kategoriId, barkode, nama, satuan, hargaJual, kemasan[], komponen[] }.
 */
exports.simpanBarangKantin = callable('simpanBarangKantin', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const id = d.id ? idSah(d.id, 'Barang') : '';
  if (!id && !['barang', 'resep'].includes(d.jenis)) throw galat('Jenis barang tidak sah.');
  const nama = teksSah(d.nama, 200, 'Nama barang');
  const satuan = teksSah(d.satuan, 30, 'Satuan');
  const hargaJual = rupiahSah(d.hargaJual, 'Harga jual', 1);
  const kategoriId = idSah(d.kategoriId, 'Kategori');
  const barkode = barkodeSah(d.barkode, 'Barkode');

  if (!Array.isArray(d.kemasan || []) || (d.kemasan || []).length > MAKS_KEMASAN) {
    throw galat(`Kemasan paling banyak ${MAKS_KEMASAN}.`);
  }
  const kemasan = (d.kemasan || []).map((k) => ({
    id: idSah(k?.id, 'Kemasan'),
    nama: teksSah(k?.nama, 30, 'Nama kemasan'),
    isi: bulatSah(k?.isi, 2, 10000, 'Isi kemasan'),
    hargaJual: rupiahSah(k?.hargaJual, 'Harga kemasan', 1),
    barkode: barkodeSah(k?.barkode, `Barkode kemasan ${k?.nama ?? ''}`.trim()),
  }));
  if (new Set(kemasan.map((k) => k.id)).size !== kemasan.length)
    throw galat('Kode kemasan kembar.');

  if (!Array.isArray(d.komponen || []) || (d.komponen || []).length > MAKS_KOMPONEN) {
    throw galat(`Komponen resep paling banyak ${MAKS_KOMPONEN}.`);
  }
  const komponen = (d.komponen || []).map((k) => ({
    barangId: idSah(k?.barangId, 'Komponen'),
    jumlah: bulatSah(k?.jumlah, 1, 1000, 'Jumlah komponen'),
  }));
  if (new Set(komponen.map((k) => k.barangId)).size !== komponen.length) {
    throw galat('Komponen resep yang sama tercatat dua kali.');
  }

  const kodeBaru = [barkode, ...kemasan.map((k) => k.barkode)].filter(Boolean);
  if (new Set(kodeBaru).size !== kodeBaru.length) {
    throw galat('Barkode yang sama dipakai dua kali di barang ini.');
  }

  return db.runTransaction(async (tx) => {
    const lama = id ? await tx.get(refBarang(id)) : null;
    if (lama && !lama.exists) throw tolak('Barang tidak ditemukan.');
    const jenis = lama ? jenisBarang(lama) : d.jenis;
    if (lama && d.jenis && d.jenis !== jenis) throw tolak('Jenis barang tidak bisa diubah.');
    if (jenis === 'resep' && kemasan.length) throw galat('Resep tidak punya kemasan.');
    if (jenis === 'resep' && !komponen.length) throw galat('Resep harus punya komponen.');
    if (jenis === 'barang' && komponen.length) throw galat('Komponen hanya untuk resep.');
    const ref = lama ? lama.ref : kol('koperasiKantinBarang').doc();
    if (komponen.some((k) => k.barangId === ref.id))
      throw galat('Resep tidak bisa memakai dirinya sendiri.');

    const kat = await tx.get(kol('koperasiKantinKategori').doc(kategoriId));
    if (!kat.exists || (kat.get('aktif') === false && lama?.get('kategoriId') !== kategoriId)) {
      throw tolak('Kategori tidak ditemukan atau sudah nonaktif.');
    }
    if (komponen.length) {
      const snap = await tx.getAll(...komponen.map((k) => refBarang(k.barangId)));
      snap.forEach((b) => {
        if (!b.exists || jenisBarang(b) !== 'barang') {
          throw tolak('Komponen resep harus barang biasa yang ada.');
        }
      });
    }

    // Penjaga barkode: baru (cek bentrok) & lama (dilepas bila tidak dipakai lagi)
    const kodeLama = lama
      ? [lama.get('barkode'), ...(lama.get('kemasan') || []).map((k) => k.barkode)].filter(Boolean)
      : [];
    const semuaKode = [...new Set([...kodeBaru, ...kodeLama])];
    const penjaga = new Map();
    if (semuaKode.length) {
      (await tx.getAll(...semuaKode.map(refBarkode))).forEach((s) => penjaga.set(s.id, s));
    }
    for (const kode of kodeBaru) {
      const s = penjaga.get(kode);
      let pemilik = s?.exists ? s.get('barangId') : '';
      if (!pemilik) {
        // Data lama tanpa penjaga: cek barkode utama barang lain
        const sama = await tx.get(
          kol('koperasiKantinBarang').where('barkode', '==', kode).limit(2),
        );
        pemilik = sama.docs.find((x) => x.id !== ref.id)?.id || '';
      }
      if (pemilik && pemilik !== ref.id) {
        const b = await tx.get(refBarang(pemilik));
        throw tolak(`Barkode ${kode} sudah dipakai ${b.exists ? b.get('nama') : 'barang lain'}.`);
      }
    }

    const isi = {
      kategoriId,
      barkode,
      nama,
      satuan,
      hargaJual,
      kemasan: jenis === 'resep' ? [] : kemasan,
      komponen: jenis === 'resep' ? komponen : [],
      ...jejakUbah(p.uid),
    };
    if (lama) tx.update(ref, isi);
    else {
      tx.create(ref, {
        ...isi,
        jenis,
        stok: 0,
        hargaPokok: 0,
        adaTransaksi: false,
        aktif: true,
        dibuatPada: waktu(),
        dibuatOleh: p.uid,
      });
    }
    kodeBaru.forEach((kode) =>
      tx.set(refBarkode(kode), { barangId: ref.id, nama, diubahPada: waktu(), diubahOleh: p.uid }),
    );
    kodeLama
      .filter((kode) => !kodeBaru.includes(kode))
      .forEach((kode) => {
        const s = penjaga.get(kode);
        if (s?.exists && s.get('barangId') === ref.id) tx.delete(s.ref);
      });
    return { id: ref.id };
  });
});

/** Aktifkan/nonaktifkan barang (barkodenya tetap dipegang). Masukan: { id, aktif }. */
exports.aturAktifBarangKantin = callable('aturAktifBarangKantin', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const ref = refBarang(idSah(req.data?.id, 'Barang'));
  if (typeof req.data?.aktif !== 'boolean') throw galat('Status tidak sah.');
  return db.runTransaction(async (tx) => {
    const b = await tx.get(ref);
    if (!b.exists) throw tolak('Barang tidak ditemukan.');
    tx.update(ref, { aktif: req.data.aktif, ...jejakUbah(p.uid) });
    return { aktif: req.data.aktif };
  });
});

// ─── Kasir Kantin ───────────────────────────────────────────────────────────

/**
 * Penjualan Kasir. Jurnal: D Kas/Bank (atau Piutang Usaha Anggota bila bon) / K Pendapatan Penjualan
 * per kategori; D HPP per kategori / K Persediaan. Stok boleh minus. Harga dari server; `total` dari
 * layar harus cocok. `id` buatan klien mencegah pencatatan ganda.
 * Cara bayar: `caraBayar: 'bon'` (khusus anggota → Piutang Usaha Anggota) atau `pembayaranId` dari
 * pengaturan Pembayaran Kantin; kas tujuan diambil dari pengaturan itu (bukan dari layar).
 * Masukan: { id, items: [{ barangId, kemasanId, jumlah }], caraBayar?, pembayaranId?, anggotaId, total }.
 */
exports.catatPenjualanKantin = callable('catatPenjualanKantin', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const id = idSah(d.id, 'Kode transaksi');
  const items = itemSah(d.items);
  const bon = d.caraBayar === 'bon';
  if (bon && !d.anggotaId) throw galat('Bon hanya untuk anggota. Pilih nama anggotanya.');
  const pembayaranId = bon ? '' : idSah(d.pembayaranId, 'Cara bayar');
  const totalLayar = rupiahSah(d.total, 'Total', 1);
  let rugi = [];

  const hasil = await db.runTransaction(async (tx) => {
    const ref = kol('koperasiKantinTransaksi').doc(id);
    if ((await tx.get(ref)).exists) return { id, ulang: true };
    const bayar = bon ? null : await tx.get(kol('koperasiKantinPembayaran').doc(pembayaranId));
    if (bayar && (!bayar.exists || bayar.get('aktif') === false)) {
      throw tolak('Cara bayar tidak ditemukan atau sudah nonaktif. Periksa pengaturan Pembayaran.');
    }
    const kasId = bon ? '' : bayar.get('kasId');
    const labelBayar = bon ? 'Bon' : bayar.get('nama');
    const anggota = await bacaAnggota(tx, d.anggotaId);
    const { barang, kategori } = await bacaBarang(
      tx,
      items.map((i) => i.barangId),
    );
    const akunKategori = [...kategori.values()].flatMap((k) => [k.akunJualId, k.akunHppId]);
    const buku = await bukaBuku(tx, [
      bon ? AKUN.piutangAnggota : kasId,
      AKUN.persediaan,
      ...akunKategori,
    ]);
    const tanggal = cekTanggal(buku, waktuWita().tanggal);
    if (!bon) wajibKas(buku, kasId, `Kas tujuan cara bayar ${labelBayar}`);

    const { rinci, stokKeluar } = rinciPenjualan(items, barang, kategori);
    const total = rinci.reduce((n, r) => n + r.item.subtotal, 0);
    if (total !== totalLayar)
      throw tolak('Harga barang berubah. Periksa keranjang lalu coba lagi.');
    const hpp = rinci.reduce((n, r) => n + r.item.hpp, 0);
    // A3: dijual di bawah harga pokok
    rugi = rinci.filter((r) => r.item.hpp > 0 && r.item.subtotal < r.item.hpp).map((r) => r.item);
    stokKeluar.forEach((s) => {
      if (barang.get(s.barangId).get('stok') - s.jumlah < -BATAS_STOK) {
        throw tolak(`Stok ${s.nama} melewati batas.`);
      }
    });

    const perAkun = new Map();
    const tambah = (akunId, sisi, n) => {
      const b = perAkun.get(akunId) || { akunId, debit: 0, kredit: 0 };
      b[sisi] += n;
      perAkun.set(akunId, b);
    };
    tambah(bon ? AKUN.piutangAnggota : kasId, 'debit', total);
    rinci.forEach((r) => {
      tambah(r.kat.akunJualId, 'kredit', r.item.subtotal);
      tambah(r.kat.akunHppId, 'debit', r.item.hpp);
    });
    tambah(AKUN.persediaan, 'kredit', hpp);

    const pembeli = anggota
      ? { anggotaId: anggota.id, nama: anggota.get('nama') }
      : { anggotaId: '', nama: 'UMUM' };
    // Uang masuk dicatat menurut akun pendapatan per kategori (HPP/Persediaan bukan arus kas)
    const arusJual = new Map();
    rinci.forEach((r) =>
      arusJual.set(r.kat.akunJualId, (arusJual.get(r.kat.akunJualId) || 0) + r.item.subtotal),
    );
    const jurnalId = posting(tx, buku, {
      tanggal,
      jenis: 'penjualan',
      keterangan: `Penjualan Kantin (${labelBayar}) · ${pembeli.nama}`,
      baris: [...perAkun.values()],
      sumberId: id,
      uid: p.uid,
      arus: bon ? [] : [...arusJual].map(([akunId, masuk]) => ({ akunId, masuk })),
    });

    stokKeluar.forEach((s) =>
      tx.update(refBarang(s.barangId), {
        stok: FieldValue.increment(-s.jumlah),
        adaTransaksi: true,
        ...jejakUbah(p.uid),
      }),
    );
    if (anggota) {
      const [tahun] = tanggal.split('-');
      tx.set(
        kol('koperasiRekapAnggota').doc(tahun),
        { anggota: { [anggota.id]: { belanja: FieldValue.increment(total) } } },
        { merge: true },
      );
      if (bon) {
        tx.update(anggota.ref, { piutang: FieldValue.increment(total), ...jejakUbah(p.uid) });
      }
    }
    tx.create(ref, {
      tanggal,
      items: rinci.map((r) => r.item),
      stokKeluar,
      total,
      hpp,
      caraBayar: bon ? 'bon' : 'bayar',
      pembayaran: bon ? null : { id: pembayaranId, nama: labelBayar },
      kasId,
      kasNama: bon ? '' : buku.akun.get(kasId).nama,
      pembeli,
      status: 'selesai',
      alasanBatal: '',
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
    });
    return { id, jurnalId };
  });
  if (!hasil.ulang) {
    rugi.forEach((x) =>
      req.jejak.anomali({
        kode: 'A3',
        tingkat: 'peringatan',
        modul: 'koperasi',
        judul: `${x.nama} dijual di bawah harga pokok`,
        target: kol('koperasiKantinTransaksi').doc(id).path,
        rincian: {
          jumlah: x.jumlah,
          satuan: x.satuan,
          harga: x.harga,
          subtotal: x.subtotal,
          hpp: x.hpp,
        },
      }),
    );
  }
  return hasil;
});

// ─── Pembelian & stok Kantin ────────────────────────────────────────────────

// Cermin klien: BATAS.bahan / BATAS.opname (src/modules/koperasi/data/aturan.js).
const MAKS_BAHAN = 20;
const MAKS_OPNAME = 200;

function bahanSah(v) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > MAKS_BAHAN) {
    throw galat(`Bahan habis pakai paling banyak ${MAKS_BAHAN} baris.`);
  }
  return v.map((x) => ({
    nama: teksSah(x?.nama, 100, 'Nama bahan'),
    nilai: rupiahSah(x?.nilai, 'Nilai bahan', 1),
  }));
}

/**
 * Pembelian dari pemasok: barang (stok bertambah dalam satuan dasar, harga pokok rata-rata
 * diperbarui) dan/atau bahan habis pakai (langsung dibebankan, tidak distok).
 * Jurnal: D Persediaan (barang) + D HPP Bahan Habis Pakai (bahan) / K Kas (tunai) atau K Utang Usaha.
 * Masukan: { id, tanggal, pemasok, items: [{ barangId, kemasanId, jumlah, harga }], bahan: [{ nama,
 * nilai }], caraBayar, kasId, jatuhTempo, keterangan }. `harga` = harga per satuan yang dibeli.
 */
exports.catatPembelianKantin = callable('catatPembelianKantin', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const id = idSah(d.id, 'Kode pembelian');
  const pemasok = teksSah(d.pemasok, 100, 'Pemasok', { wajib: false });
  const keterangan = teksSah(d.keterangan, 200, 'Keterangan', { wajib: false });
  if (!['tunai', 'utang'].includes(d.caraBayar)) throw galat('Cara bayar tidak sah.');
  const utang = d.caraBayar === 'utang';
  const kasId = utang ? '' : idSah(d.kasId, 'Kas');
  if (utang && d.jatuhTempo && !tanggalSah(d.jatuhTempo)) throw galat('Jatuh tempo tidak sah.');
  const bahan = bahanSah(d.bahan);
  const items = itemSah(d.items, { bolehKosong: bahan.length > 0 }).map((i, n) => ({
    ...i,
    harga: rupiahSah(d.items[n].harga, 'Harga beli', 0),
  }));

  return db.runTransaction(async (tx) => {
    const ref = kol('koperasiKantinPembelian').doc(id);
    if ((await tx.get(ref)).exists) return { id, ulang: true };
    const { barang } = items.length
      ? await bacaBarang(
          tx,
          items.map((i) => i.barangId),
          { kategori: false },
        )
      : { barang: new Map() };
    const buku = await bukaBuku(tx, [
      utang ? AKUN.utangUsaha : kasId,
      AKUN.persediaan,
      AKUN.hppBahan,
    ]);
    const tanggal = cekTanggal(buku, d.tanggal);
    if (!utang) wajibKas(buku, kasId);

    // Baris pembelian, lalu digabung per barang (satuan dasar) untuk harga pokok rata-rata
    const perBarang = new Map();
    const baris = items.map((i) => {
      const b = barang.get(i.barangId);
      if (b.get('aktif') === false) throw tolak(`${b.get('nama')} sudah nonaktif.`);
      if (jenisBarang(b) !== 'barang')
        throw tolak(`${b.get('nama')} adalah resep; beli komponennya.`);
      const s = satuanJual(b, i.kemasanId);
      const subtotal = i.harga * i.jumlah;
      const g = perBarang.get(b.id) || { b, jumlah: 0, nilai: 0 };
      g.jumlah += s.isi * i.jumlah;
      g.nilai += subtotal;
      perBarang.set(b.id, g);
      return {
        barangId: b.id,
        nama: b.get('nama'),
        kemasanId: s.id,
        satuan: s.nama,
        isi: s.isi,
        jumlah: i.jumlah,
        harga: i.harga,
        subtotal,
      };
    });
    const totalBarang = baris.reduce((n, x) => n + x.subtotal, 0);
    const totalBahan = bahan.reduce((n, x) => n + x.nilai, 0);
    const total = totalBarang + totalBahan;
    if (total <= 0) throw galat('Total pembelian harus lebih dari 0.');
    if (!utang && saldoAkun(buku, kasId) < total) {
      throw tolak(`Saldo ${buku.akun.get(kasId).nama} tidak cukup.`);
    }
    const jurnalId = posting(tx, buku, {
      tanggal,
      jenis: 'pembelian',
      keterangan: `Pembelian Kantin${pemasok ? ` · ${pemasok}` : ''}${utang ? ' (utang)' : ''}`,
      baris: [
        { akunId: AKUN.persediaan, debit: totalBarang },
        { akunId: AKUN.hppBahan, debit: totalBahan },
        { akunId: utang ? AKUN.utangUsaha : kasId, kredit: total },
      ],
      sumberId: id,
      uid: p.uid,
    });
    perBarang.forEach(({ b, jumlah, nilai }) => {
      const stokLama = b.get('stok');
      const stok = stokLama + jumlah;
      const pokokLama = b.get('hargaPokok') || 0;
      // Rata-rata bergerak per satuan dasar; bila stok lama ≤ 0, mengikuti pembelian ini
      const hargaPokok =
        stokLama > 0
          ? Math.round((stokLama * pokokLama + nilai) / stok)
          : Math.round(nilai / jumlah);
      tx.update(b.ref, { stok, hargaPokok, adaTransaksi: true, ...jejakUbah(p.uid) });
    });
    tx.create(ref, {
      tanggal,
      pemasok,
      items: baris,
      bahan,
      totalBarang,
      totalBahan,
      total,
      caraBayar: d.caraBayar,
      kasId,
      kasNama: utang ? '' : buku.akun.get(kasId).nama,
      jatuhTempo: utang ? d.jatuhTempo || '' : '',
      sisaUtang: utang ? total : 0,
      keterangan,
      status: 'selesai',
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
    });
    return { id, jurnalId };
  });
});

/**
 * Stok awal barang saat pembukuan dimulai (tanpa jurnal: nilainya masuk Saldo Awal akun Persediaan).
 * Hanya untuk barang (bukan resep) yang belum pernah bertransaksi; stok dalam satuan dasar.
 * Masukan: { barangId, stok, hargaPokok }.
 */
exports.aturStokAwalBarang = callable('aturStokAwalBarang', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const ref = refBarang(idSah(d.barangId, 'Barang'));
  const stok = Number(d.stok);
  if (!Number.isInteger(stok) || stok < 0 || stok > BATAS_STOK) throw galat('Stok awal tidak sah.');
  const hargaPokok = rupiahSah(d.hargaPokok, 'Harga pokok', 0);
  return db.runTransaction(async (tx) => {
    const b = await tx.get(ref);
    if (!b.exists) throw tolak('Barang tidak ditemukan.');
    if (jenisBarang(b) !== 'barang') throw tolak('Resep tidak punya stok.');
    if (b.get('adaTransaksi')) {
      throw tolak(
        'Barang ini sudah punya transaksi; stok berubah lewat pembelian, penjualan, dan opname.',
      );
    }
    tx.update(ref, { stok, hargaPokok, ...jejakUbah(p.uid) });
    catatLog(tx, {
      modul: 'koperasi',
      aksi: 'stokAwalBarang',
      target: ref.path,
      nilaiLama: { stok: b.get('stok'), hargaPokok: b.get('hargaPokok') || 0 },
      nilaiBaru: { stok, hargaPokok },
      oleh: p.uid,
    });
    return { stok, hargaPokok };
  });
});

/**
 * Stok opname: stok sistem disamakan dengan hitung fisik (satuan dasar). Nilai selisih (selisih × harga
 * pokok) dijurnal bersih ke HPP Produk Lain-lain: kurang → D HPP Produk Lain-lain / K Persediaan;
 * lebih → kebalikannya. Data tidak dihapus.
 * Masukan: { tanggal, items: [{ barangId, fisik }], keterangan }. Hasil: { id, jurnalId, totalNilai }.
 */
exports.simpanStokOpname = callable('simpanStokOpname', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const d = req.data || {};
  const keterangan = teksSah(d.keterangan, 200, 'Keterangan', { wajib: false });
  if (!Array.isArray(d.items) || !d.items.length || d.items.length > MAKS_OPNAME) {
    throw galat(`Isi stok fisik 1–${MAKS_OPNAME} barang.`);
  }
  const terlihat = new Set();
  const items = d.items.map((i) => {
    const barangId = idSah(i?.barangId, 'Barang');
    const fisik = Number(i?.fisik);
    if (!Number.isInteger(fisik) || fisik < 0 || fisik > BATAS_STOK) {
      throw galat('Stok fisik harus bilangan bulat 0 atau lebih.');
    }
    if (terlihat.has(barangId)) throw galat('Barang yang sama tercatat dua kali.');
    terlihat.add(barangId);
    return { barangId, fisik };
  });

  const ambang = await bacaAmbang();
  let selisihBesar = [];
  const hasil = await db.runTransaction(async (tx) => {
    const barang = await tx.getAll(...items.map((i) => refBarang(i.barangId)));
    const buku = await bukaBuku(tx, [AKUN.persediaan, AKUN.hppLain]);
    const tanggal = cekTanggal(buku, d.tanggal);
    const rinci = items.map((i, n) => {
      const b = barang[n];
      if (!b.exists) throw tolak('Ada barang yang tidak ditemukan.');
      if (jenisBarang(b) !== 'barang') throw tolak(`${b.get('nama')} adalah resep; tidak distok.`);
      const sistem = b.get('stok');
      const hargaPokok = b.get('hargaPokok') || 0;
      const selisih = i.fisik - sistem;
      return {
        ref: b.ref,
        item: {
          barangId: b.id,
          nama: b.get('nama'),
          satuan: b.get('satuan'),
          sistem,
          fisik: i.fisik,
          selisih,
          hargaPokok,
          nilai: selisih * hargaPokok,
        },
      };
    });
    const totalNilai = rinci.reduce((n, r) => n + r.item.nilai, 0);
    // A1: selisih melewati ambang (persen dari stok sistem atau nilai rupiah)
    selisihBesar = rinci.filter(({ item: x }) => {
      const persen = x.sistem ? (Math.abs(x.selisih) * 100) / Math.abs(x.sistem) : 100;
      return (
        x.selisih &&
        (persen > ambang.selisihOpnamePersen || Math.abs(x.nilai) > ambang.selisihOpnameRupiah)
      );
    });
    const ref = kol('koperasiKantinOpname').doc();
    const jurnalId = totalNilai
      ? posting(tx, buku, {
          tanggal,
          jenis: 'opname',
          keterangan: `Stok opname${keterangan ? ` · ${keterangan}` : ''}`,
          baris:
            totalNilai < 0
              ? [
                  { akunId: AKUN.hppLain, debit: -totalNilai },
                  { akunId: AKUN.persediaan, kredit: -totalNilai },
                ]
              : [
                  { akunId: AKUN.persediaan, debit: totalNilai },
                  { akunId: AKUN.hppLain, kredit: totalNilai },
                ],
          sumberId: ref.id,
          uid: p.uid,
        })
      : '';
    rinci.forEach((r) => {
      if (r.item.selisih) {
        tx.update(r.ref, { stok: r.item.fisik, adaTransaksi: true, ...jejakUbah(p.uid) });
      }
    });
    tx.create(ref, {
      tanggal,
      items: rinci.map((r) => r.item),
      jumlahBarang: rinci.length,
      jumlahSelisih: rinci.filter((r) => r.item.selisih).length,
      totalNilai,
      keterangan,
      jurnalId,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
    });
    return { id: ref.id, jurnalId, totalNilai };
  });
  selisihBesar.forEach(({ ref, item: x }) =>
    req.jejak.anomali({
      kode: 'A1',
      tingkat: Math.abs(x.nilai) > ambang.selisihOpnameRupiah ? 'peringatan' : 'info',
      modul: 'koperasi',
      judul: `Selisih stok opname ${x.nama}: ${x.selisih > 0 ? '+' : ''}${x.selisih} ${x.satuan}`,
      target: ref.path,
      rincian: {
        sistem: x.sistem,
        fisik: x.fisik,
        selisih: x.selisih,
        nilai: x.nilai,
        opnameId: hasil.id,
      },
    }),
  );
  return hasil;
});

/**
 * Batalkan penjualan dengan jurnal pembalik (tanggal hari ini); stok yang keluar (termasuk komponen
 * resep) dikembalikan, bon dikurangi. Data tidak dihapus. Masukan: { id, alasan }.
 */
exports.batalkanPenjualanKantin = callable('batalkanPenjualanKantin', async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'koperasi');
  const ref = kol('koperasiKantinTransaksi').doc(idSah(req.data?.id, 'Transaksi'));
  const alasan = teksSah(req.data?.alasan, 200, 'Alasan');
  let dataBatal = null;

  const hasil = await db.runTransaction(async (tx) => {
    const t = await tx.get(ref);
    if (!t.exists) throw tolak('Transaksi tidak ditemukan.');
    if (t.get('status') === 'batal') throw tolak('Transaksi ini sudah dibatalkan.');
    dataBatal = {
      dibuatOleh: t.get('dibuatOleh') || '',
      total: t.get('total'),
      tanggal: t.get('tanggal'),
    };
    const jurnalRef = kol('koperasiJurnal').doc(t.get('jurnalId'));
    const jurnal = await tx.get(jurnalRef);
    // Data impor lama tanpa stokKeluar: jumlah item × isi
    const stokKeluar =
      t.get('stokKeluar') ||
      t.get('items').map((i) => ({ barangId: i.barangId, jumlah: i.jumlah * (i.isi || 1) }));
    const barang = await tx.getAll(...stokKeluar.map((s) => refBarang(s.barangId)));
    const anggotaId = t.get('pembeli')?.anggotaId;
    const anggota = anggotaId ? await tx.get(refAnggota(anggotaId)) : null;
    const baris = jurnal.get('baris');
    const buku = await bukaBuku(
      tx,
      baris.map((b) => b.akunId),
    );
    const tanggal = cekTanggal(buku, waktuWita().tanggal);
    const bon = t.get('caraBayar') === 'bon';
    if (bon && (!anggota?.exists || anggota.get('piutang') < t.get('total'))) {
      throw tolak('Bon transaksi ini sudah dilunasi sebagian; batalkan lewat pelunasan dulu.');
    }
    if (!bon && saldoAkun(buku, t.get('kasId')) < t.get('total')) {
      throw tolak(`Saldo ${t.get('kasNama')} tidak cukup untuk mengembalikan uang.`);
    }
    // Arus kas: kebalikan penjualan (keluar menurut akun pendapatan)
    const arus = bon
      ? []
      : baris
          .filter((b) => b.kredit && buku.akun.get(b.akunId).kelompok === 'pendapatan')
          .map((b) => ({ akunId: b.akunId, keluar: b.kredit }));
    const jurnalBatal = posting(tx, buku, {
      tanggal,
      jenis: 'pembatalan',
      keterangan: `Batal penjualan ${t.get('tanggal')} · ${alasan}`,
      baris: baris.map((b) => ({ akunId: b.akunId, debit: b.kredit, kredit: b.debit })),
      sumberId: ref.id,
      batalDari: jurnalRef.id,
      uid: p.uid,
      arus,
    });
    tx.update(jurnalRef, { dibatalkan: true });
    stokKeluar.forEach((s, n) => {
      if (barang[n].exists) {
        tx.update(barang[n].ref, { stok: FieldValue.increment(s.jumlah), ...jejakUbah(p.uid) });
      }
    });
    if (anggota?.exists) {
      rekapAnggota(tx, t.get('tanggal').slice(0, 4), anggota.id, { belanja: -t.get('total') });
      if (bon) {
        tx.update(anggota.ref, {
          piutang: FieldValue.increment(-t.get('total')),
          ...jejakUbah(p.uid),
        });
      }
    }
    tx.update(ref, { status: 'batal', alasanBatal: alasan, jurnalBatalId: jurnalBatal });
    catatLog(tx, {
      modul: 'koperasi',
      aksi: 'batalkanPenjualan',
      target: ref.path,
      nilaiLama: { status: 'selesai', total: t.get('total') },
      nilaiBaru: { status: 'batal' },
      alasan,
      oleh: p.uid,
    });
    return { jurnalId: jurnalBatal };
  });
  // A2: setiap pembatalan ditinjau; dibatalkan oleh pencatatnya sendiri = peringatan
  const sendiri = dataBatal.dibuatOleh === p.uid;
  req.jejak.anomali({
    kode: 'A2',
    tingkat: sendiri ? 'peringatan' : 'info',
    modul: 'koperasi',
    judul: sendiri ? 'Penjualan dibatalkan oleh kasir yang mencatatnya' : 'Penjualan dibatalkan',
    target: ref.path,
    rincian: { ...dataBatal, alasan, olehSendiri: sendiri },
  });
  return hasil;
});
