/**
 * Inventory persediaan (docs/skema-database.md §5.5). Transaksi barang masuk (TBR) & keluar (TBK)
 * hanya ditulis Function supaya nomor tidak ganda/mundur dan stok tidak minus. Nomor berlanjut
 * lintas tahun (keputusan D4): `sistem_penghitung/inventory_masuk|inventory_keluar`.
 *
 * Ringkasan per tahun `inventory_saldo/{tahun}` = { masuk: { [barangId]: int }, keluar: { … },
 * bulan: { MM: { masuk, keluar } } } (jumlah barang & jumlah transaksi) diubah dengan increment
 * di transaksi yang SAMA, jadi stok (stokAwal + Σ masuk − Σ keluar) dan grafik Dashboard dibaca
 * tanpa mengunduh transaksi. Transaksi tidak dihapus: dibatalkan (`status: 'batal'` + alasan).
 * Kode SAKTI kategori/barang hanya diganti Function (penjaga keunikan `inventory_kode`).
 * Tanggal sampai `sistem_pengaturan/inventory.tutupSampai` (tutup buku) tidak bisa diubah.
 */

const { onCall } = require('firebase-functions/v2/https');
const {
  HttpsError,
  FieldValue,
  db,
  OPSI_CALLABLE,
  KOLEKSI,
  pemanggil,
  wajibPeran,
  idSah,
  teksSah,
  tanggalSah,
  waktuWita,
  catatLog,
  jejakUbah,
} = require('./umum');

const MAKS_ITEM = 50;
const MAKS_JUMLAH = 1000000;
const MAKS_GANTI_KODE = 200; // barang berkode dalam satu kategori yang diganti sekaligus

const kol = (nama) => db.collection(nama);
const barangRef = (id) => kol(KOLEKSI.inventoryBarang).doc(id);
const kategoriRef = (id) => kol(KOLEKSI.inventoryKategori).doc(id);
const penjagaRef = (kode) => kol(KOLEKSI.inventoryKode).doc(kode);
const saldoRef = (tahun) => kol(KOLEKSI.inventorySaldo).doc(String(tahun));
const kolTransaksi = (jenis) =>
  kol(jenis === 'masuk' ? KOLEKSI.inventoryMasuk : KOLEKSI.inventoryKeluar);
const waktu = () => FieldValue.serverTimestamp();
const jejakBuat = (uid) => ({ dibuatPada: waktu(), dibuatOleh: uid, ...jejakUbah(uid) });

const galat = (pesan) => new HttpsError('invalid-argument', pesan);
const tolak = (pesan) => new HttpsError('failed-precondition', pesan);

function jenisSah(v) {
  if (v !== 'masuk' && v !== 'keluar') throw galat('Jenis transaksi tidak sah.');
  return v;
}

function jumlahSah(v, label) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAKS_JUMLAH) {
    throw galat(`${label}: jumlah harus bilangan bulat 1–${MAKS_JUMLAH}.`);
  }
  return n;
}

/** Baris barang [{ barangId, jumlah }]: 1–50 baris, tanpa barang ganda. */
function itemsSah(v) {
  if (!Array.isArray(v) || v.length < 1 || v.length > MAKS_ITEM) {
    throw galat(`Isi 1–${MAKS_ITEM} barang.`);
  }
  const ada = new Set();
  return v.map((it, i) => {
    const barangId = idSah(it?.barangId, `Barang baris ${i + 1}`);
    if (ada.has(barangId)) throw galat('Barang yang sama dipilih lebih dari sekali.');
    ada.add(barangId);
    return { barangId, jumlah: jumlahSah(it?.jumlah, `Baris ${i + 1}`) };
  });
}

const itemsDari = (jenis, t) =>
  jenis === 'masuk' ? [{ barangId: t.barangId, jumlah: t.jumlah }] : t.items || [];

/** Tanggal sudah lewat tutup buku → transaksinya tidak bisa diubah/dibatalkan. */
function bukuTerbuka(tanggal, tutupSampai) {
  if (tutupSampai && tanggal <= tutupSampai) {
    throw tolak(
      `Buku persediaan sudah ditutup sampai ${tutupSampai}; transaksi tanggal itu tidak bisa diubah.`,
    );
  }
}

/** Tanggal transaksi baru: sah, tidak di masa depan (WITA), dan setelah tutup buku. */
function tanggalTransaksi(tanggal, tutupSampai) {
  if (!tanggalSah(tanggal)) throw galat('Tanggal transaksi tidak sah.');
  if (tanggal > waktuWita().tanggal) throw galat('Tanggal transaksi tidak boleh di masa depan.');
  bukuTerbuka(tanggal, tutupSampai);
  return tanggal;
}

/**
 * Baca tutup buku, barang yang terlibat, dan seluruh ringkasan tahunan (beberapa dokumen) di
 * dalam transaksi. `stok(id)` = stokAwal + Σ masuk − Σ keluar semua tahun.
 */
async function bacaKeadaan(tx, barangIds) {
  const pengaturan = await tx.get(kol(KOLEKSI.sistemPengaturan).doc('inventory'));
  const saldo = await tx.get(kol(KOLEKSI.inventorySaldo).limit(50));
  const ids = [...new Set(barangIds)];
  const snaps = ids.length ? await tx.getAll(...ids.map(barangRef)) : [];
  const barang = new Map(snaps.map((s) => [s.id, s.exists ? s.data() : null]));
  const stok = (id) =>
    saldo.docs.reduce(
      (n, d) => n + (Number(d.get(`masuk.${id}`)) || 0) - (Number(d.get(`keluar.${id}`)) || 0),
      Number(barang.get(id)?.stokAwal) || 0,
    );
  const nama = (id) => barang.get(id)?.nama || 'barang';
  return { tutupSampai: pengaturan.get('tutupSampai') || '', barang, stok, nama };
}

/** Barang harus ada dan aktif (kecuali `bolehLama`: sudah ada di transaksi yang diubah). */
function wajibBarang(k, ids, bolehLama = new Set()) {
  ids.forEach((id) => {
    const b = k.barang.get(id);
    if (!b || (b.aktif === false && !bolehLama.has(id))) {
      throw tolak(
        'Barang tidak ditemukan atau sudah nonaktif. Muat ulang halaman lalu pilih lagi.',
      );
    }
  });
}

/** Perubahan stok per barang tidak boleh membuat sisa minus. */
function wajibStokCukup(k, delta) {
  delta.forEach((d, id) => {
    const sisa = k.stok(id);
    if (sisa + d < 0) {
      throw tolak(
        `Stok ${k.nama(id)} tidak cukup: sisa ${sisa} ${k.barang.get(id)?.satuan || ''}`.trim() +
          '.',
      );
    }
  });
}

const tambahDelta = (delta, items, kali) =>
  items.forEach(({ barangId, jumlah }) =>
    delta.set(barangId, (delta.get(barangId) || 0) + kali * jumlah),
  );

/** Kumpulan perubahan `inventory_saldo` per tahun, ditulis sekali per dokumen. */
class Saldo {
  constructor() {
    this.perTahun = new Map();
  }

  /** arah +1/−1; `transaksi` = jumlah dokumen transaksi (grafik per bulan). */
  tambah(tanggal, jenis, items, arah, transaksi) {
    const tahun = tanggal.slice(0, 4);
    const bulan = tanggal.slice(5, 7);
    const s = this.perTahun.get(tahun) || { masuk: {}, keluar: {}, bulan: {} };
    items.forEach(({ barangId, jumlah }) => {
      s[jenis][barangId] = (s[jenis][barangId] || 0) + arah * jumlah;
    });
    s.bulan[bulan] = s.bulan[bulan] || { masuk: 0, keluar: 0 };
    s.bulan[bulan][jenis] += arah * transaksi;
    this.perTahun.set(tahun, s);
  }

  tulis(tx) {
    const inc = (v) => FieldValue.increment(v);
    this.perTahun.forEach((s, tahun) => {
      // Peta kosong tidak ikut dikirim: set+merge dengan {} akan menimpa isi lama
      const data = { tahun: Number(tahun), diubahPada: waktu() };
      ['masuk', 'keluar'].forEach((j) => {
        const isi = Object.fromEntries(
          Object.entries(s[j])
            .filter(([, v]) => v)
            .map(([id, v]) => [id, inc(v)]),
        );
        if (Object.keys(isi).length) data[j] = isi;
      });
      const bulan = {};
      Object.entries(s.bulan).forEach(([b, v]) => {
        const isi = {};
        if (v.masuk) isi.masuk = inc(v.masuk);
        if (v.keluar) isi.keluar = inc(v.keluar);
        if (Object.keys(isi).length) bulan[b] = isi;
      });
      if (Object.keys(bulan).length) data.bulan = bulan;
      tx.set(saldoRef(tahun), data, { merge: true });
    });
  }
}

/** Pemasok menurut nama (tanpa beda huruf besar/kecil); dibuat bila belum ada. */
async function pemasokDari(tx, nama, uid) {
  const n = teksSah(nama, 200, 'Pemasok');
  const kunci = n.toLowerCase();
  const q = await tx.get(kol(KOLEKSI.inventoryPemasok).where('namaKunci', '==', kunci).limit(1));
  if (!q.empty) return { id: q.docs[0].id, nama: q.docs[0].get('nama') || n, baru: null };
  const ref = kol(KOLEKSI.inventoryPemasok).doc();
  return {
    id: ref.id,
    nama: n,
    baru: { ref, data: { nama: n, namaKunci: kunci, aktif: true, ...jejakBuat(uid) } },
  };
}

/** Salinan beku pengambil dari pegawai ringkas (aktif, kecuali tetap pengambil lama). */
async function pengambilDari(tx, pegawaiId, idLama = '') {
  const id = idSah(pegawaiId, 'Pegawai pengambil');
  const p = await tx.get(kol(KOLEKSI.pegawaiRingkas).doc(id));
  if (!p.exists || (p.get('aktif') === false && id !== idLama)) {
    throw tolak('Pegawai pengambil tidak ditemukan atau sudah nonaktif.');
  }
  return { pegawaiId: id, nama: p.get('nama') || '', seksi: p.get('seksi') || '' };
}

function tandaiAdaTransaksi(tx, k, items) {
  new Set(items.map((i) => i.barangId)).forEach((id) => {
    if (k.barang.get(id)?.adaTransaksi !== true) tx.update(barangRef(id), { adaTransaksi: true });
  });
}

async function ambilNomor(tx, jenis, n) {
  const ref = kol(KOLEKSI.sistemPenghitung).doc(`inventory_${jenis}`);
  const snap = await tx.get(ref);
  const awal = (snap.exists ? Number(snap.get('nilai')) || 0 : 0) + 1;
  return { ref, awal, akhir: awal + n - 1 };
}

// ─── Barang masuk ─────────────────────────────────────────────────────────────

/**
 * Catat barang masuk (Umum): satu dokumen per barang dengan nomor TBR berurutan.
 * Masukan: { tanggal, pemasokNama, items[{ barangId, jumlah }] }. Hasil: { ids, nomorAwal, nomorAkhir }.
 */
exports.catatMasuk = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'umum');
  const d = req.data || {};
  const items = itemsSah(d.items);

  return db.runTransaction(async (tx) => {
    const pemasok = await pemasokDari(tx, d.pemasokNama, p.uid);
    const k = await bacaKeadaan(
      tx,
      items.map((i) => i.barangId),
    );
    const tanggal = tanggalTransaksi(d.tanggal, k.tutupSampai);
    wajibBarang(
      k,
      items.map((i) => i.barangId),
    );
    const nomor = await ambilNomor(tx, 'masuk', items.length);

    if (pemasok.baru) tx.create(pemasok.baru.ref, pemasok.baru.data);
    tx.set(nomor.ref, { nilai: nomor.akhir, diubahPada: waktu() });
    const ids = items.map(({ barangId, jumlah }, i) => {
      const ref = kolTransaksi('masuk').doc();
      tx.create(ref, {
        nomor: nomor.awal + i,
        tanggal,
        pemasokId: pemasok.id,
        pemasokNama: pemasok.nama,
        barangId,
        jumlah,
        status: 'aktif',
        alasanBatal: '',
        ...jejakBuat(p.uid),
      });
      return ref.id;
    });
    const saldo = new Saldo();
    saldo.tambah(tanggal, 'masuk', items, 1, items.length);
    saldo.tulis(tx);
    tandaiAdaTransaksi(tx, k, items);
    return { ids, nomorAwal: nomor.awal, nomorAkhir: nomor.akhir };
  });
});

// ─── Barang keluar ────────────────────────────────────────────────────────────

/**
 * Catat barang keluar (Umum): satu transaksi TBK berisi beberapa barang; ditolak bila stok kurang.
 * Masukan: { tanggal, seksi, pengambilId, items[{ barangId, jumlah }] }. Hasil: rekaman transaksi.
 */
exports.catatKeluar = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'umum');
  const d = req.data || {};
  const items = itemsSah(d.items);
  const seksi = teksSah(d.seksi, 60, 'Seksi');

  return db.runTransaction(async (tx) => {
    const pengambil = await pengambilDari(tx, d.pengambilId);
    const k = await bacaKeadaan(
      tx,
      items.map((i) => i.barangId),
    );
    const tanggal = tanggalTransaksi(d.tanggal, k.tutupSampai);
    wajibBarang(
      k,
      items.map((i) => i.barangId),
    );
    const delta = new Map();
    tambahDelta(delta, items, -1);
    wajibStokCukup(k, delta);
    const nomor = await ambilNomor(tx, 'keluar', 1);

    tx.set(nomor.ref, { nilai: nomor.akhir, diubahPada: waktu() });
    const ref = kolTransaksi('keluar').doc();
    const rekam = {
      nomor: nomor.awal,
      tanggal,
      seksi,
      pengambil,
      items,
      barangIds: items.map((i) => i.barangId),
      status: 'aktif',
      alasanBatal: '',
    };
    tx.create(ref, { ...rekam, ...jejakBuat(p.uid) });
    const saldo = new Saldo();
    saldo.tambah(tanggal, 'keluar', items, 1, 1);
    saldo.tulis(tx);
    tandaiAdaTransaksi(tx, k, items);
    return { id: ref.id, ...rekam };
  });
});

// ─── Ubah & batalkan transaksi ───────────────────────────────────────────────

/**
 * Ubah transaksi aktif di tempat (nomor tetap; nilai lama dicatat di sistem_log). Masuk:
 * { jenis: 'masuk', id, tanggal, pemasokNama, barangId, jumlah }. Keluar: { jenis: 'keluar', id,
 * tanggal, seksi, pengambilId, items }. Ditolak bila membuat stok minus atau melewati tutup buku.
 */
exports.ubahTransaksi = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'umum');
  const d = req.data || {};
  const jenis = jenisSah(d.jenis);
  const id = idSah(d.id, 'ID transaksi');
  const itemsBaru =
    jenis === 'masuk'
      ? [{ barangId: idSah(d.barangId, 'Barang'), jumlah: jumlahSah(d.jumlah, 'Jumlah') }]
      : itemsSah(d.items);
  const seksi = jenis === 'keluar' ? teksSah(d.seksi, 60, 'Seksi') : '';

  return db.runTransaction(async (tx) => {
    const ref = kolTransaksi(jenis).doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Transaksi tidak ditemukan.');
    const lama = snap.data();
    if (lama.status !== 'aktif') throw tolak('Transaksi yang sudah dibatalkan tidak bisa diubah.');
    const itemsLama = itemsDari(jenis, lama);
    const pemasok = jenis === 'masuk' ? await pemasokDari(tx, d.pemasokNama, p.uid) : null;
    const pengambil =
      jenis === 'keluar' ? await pengambilDari(tx, d.pengambilId, lama.pengambil?.pegawaiId) : null;
    const k = await bacaKeadaan(
      tx,
      [...itemsLama, ...itemsBaru].map((i) => i.barangId),
    );
    bukuTerbuka(lama.tanggal, k.tutupSampai);
    const tanggal = tanggalTransaksi(d.tanggal, k.tutupSampai);
    wajibBarang(
      k,
      itemsBaru.map((i) => i.barangId),
      new Set(itemsLama.map((i) => i.barangId)),
    );
    const arah = jenis === 'masuk' ? 1 : -1;
    const delta = new Map();
    tambahDelta(delta, itemsLama, -arah);
    tambahDelta(delta, itemsBaru, arah);
    wajibStokCukup(k, delta);

    const baru =
      jenis === 'masuk'
        ? {
            tanggal,
            pemasokId: pemasok.id,
            pemasokNama: pemasok.nama,
            barangId: itemsBaru[0].barangId,
            jumlah: itemsBaru[0].jumlah,
          }
        : {
            tanggal,
            seksi,
            pengambil,
            items: itemsBaru,
            barangIds: itemsBaru.map((i) => i.barangId),
          };
    if (pemasok?.baru) tx.create(pemasok.baru.ref, pemasok.baru.data);
    const saldo = new Saldo();
    saldo.tambah(lama.tanggal, jenis, itemsLama, -1, 1);
    saldo.tambah(tanggal, jenis, itemsBaru, 1, 1);
    saldo.tulis(tx);
    tx.update(ref, { ...baru, ...jejakUbah(p.uid) });
    tandaiAdaTransaksi(tx, k, itemsBaru);
    catatLog(tx, {
      modul: 'inventory',
      aksi: jenis === 'masuk' ? 'ubahMasuk' : 'ubahKeluar',
      target: ref.path,
      nilaiLama: Object.fromEntries(Object.keys(baru).map((f) => [f, lama[f] ?? null])),
      nilaiBaru: baru,
      oleh: p.uid,
    });
    return { id, ...baru };
  });
});

/**
 * Batalkan transaksi (Umum, wajib alasan): status `batal`, stok dikembalikan. Barang masuk yang
 * sudah terpakai (stok jadi minus) tidak bisa dibatalkan. Masukan: { jenis, id, alasan }.
 */
exports.batalkanTransaksi = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'umum');
  const jenis = jenisSah(req.data?.jenis);
  const id = idSah(req.data?.id, 'ID transaksi');
  const alasan = teksSah(req.data?.alasan, 300, 'Alasan');

  return db.runTransaction(async (tx) => {
    const ref = kolTransaksi(jenis).doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Transaksi tidak ditemukan.');
    const t = snap.data();
    if (t.status !== 'aktif') throw tolak('Transaksi ini sudah dibatalkan.');
    const items = itemsDari(jenis, t);
    const k = await bacaKeadaan(
      tx,
      items.map((i) => i.barangId),
    );
    bukuTerbuka(t.tanggal, k.tutupSampai);
    if (jenis === 'masuk') {
      const delta = new Map();
      tambahDelta(delta, items, -1);
      wajibStokCukup(k, delta);
    }
    const saldo = new Saldo();
    saldo.tambah(t.tanggal, jenis, items, -1, 1);
    saldo.tulis(tx);
    tx.update(ref, {
      status: 'batal',
      alasanBatal: alasan,
      dibatalkanPada: waktu(),
      dibatalkanOleh: p.uid,
      ...jejakUbah(p.uid),
    });
    catatLog(tx, {
      modul: 'inventory',
      aksi: jenis === 'masuk' ? 'batalkanMasuk' : 'batalkanKeluar',
      target: ref.path,
      nilaiLama: { status: 'aktif', nomor: t.nomor },
      nilaiBaru: { status: 'batal' },
      alasan,
      oleh: p.uid,
    });
    return { dibatalkan: true };
  });
});

// ─── Ganti kode SAKTI ─────────────────────────────────────────────────────────

function kodeSah(v, digit) {
  if (typeof v !== 'string' || !new RegExp(`^[0-9]{${digit}}$`).test(v)) {
    throw galat(`Kode SAKTI harus ${digit} digit angka.`);
  }
  return v;
}

async function ubahKodeKategori(p, id, kode) {
  return db.runTransaction(async (tx) => {
    const ref = kategoriRef(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Kategori tidak ditemukan.');
    const lama = snap.get('kode');
    if (lama === kode) return { kode };
    const anak = await tx.get(
      kol(KOLEKSI.inventoryBarang).where('kategoriId', '==', id).limit(1000),
    );
    const berkode = anak.docs.filter((b) => b.get('kode'));
    if (berkode.length > MAKS_GANTI_KODE) {
      throw tolak('Kategori ini memiliki terlalu banyak barang berkode untuk diganti sekaligus.');
    }
    const kodeBaru = [kode, ...berkode.map((b) => kode + b.get('kode'))];
    const ada = await tx.getAll(...kodeBaru.map(penjagaRef));
    if (ada.some((s) => s.exists)) {
      throw tolak(`Kode SAKTI ${kode} atau kode barang di dalamnya sudah dipakai.`);
    }
    const pemilik = new Set([id, ...berkode.map((b) => b.id)]);
    const kodeLama = [lama, ...berkode.map((b) => lama + b.get('kode'))];
    const lamaSnaps = await tx.getAll(...kodeLama.map(penjagaRef));

    lamaSnaps.forEach((s) => s.exists && pemilik.has(s.get('refId')) && tx.delete(s.ref));
    tx.create(penjagaRef(kode), {
      jenis: 'kategori',
      refId: id,
      dibuatPada: waktu(),
      dibuatOleh: p.uid,
    });
    berkode.forEach((b) =>
      tx.create(penjagaRef(kode + b.get('kode')), {
        jenis: 'barang',
        refId: b.id,
        dibuatPada: waktu(),
        dibuatOleh: p.uid,
      }),
    );
    tx.update(ref, { kode, ...jejakUbah(p.uid) });
    catatLog(tx, {
      modul: 'inventory',
      aksi: 'ubahKodeKategori',
      target: ref.path,
      nilaiLama: { kode: lama },
      nilaiBaru: { kode },
      oleh: p.uid,
    });
    return { kode };
  });
}

async function ubahKodeBarang(p, id, kategoriId, kode) {
  return db.runTransaction(async (tx) => {
    const ref = barangRef(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Barang tidak ditemukan.');
    const b = snap.data();
    if ((b.kategoriId || null) === kategoriId && (b.kode || '') === kode) return { kode };
    let kodeKat = '';
    if (kategoriId) {
      const k = await tx.get(kategoriRef(kategoriId));
      if (!k.exists || k.get('aktif') === false)
        throw tolak('Kategori tidak ditemukan atau nonaktif.');
      kodeKat = k.get('kode');
    }
    const katLama = b.kategoriId ? await tx.get(kategoriRef(b.kategoriId)) : null;
    const penuhLama = b.kode && katLama?.exists ? katLama.get('kode') + b.kode : '';
    const penuhBaru = kode && kodeKat ? kodeKat + kode : '';
    const ganti = penuhBaru !== penuhLama;
    if (ganti && penuhBaru && (await tx.get(penjagaRef(penuhBaru))).exists) {
      throw tolak(`Kode SAKTI barang ${penuhBaru} sudah dipakai barang lain.`);
    }
    const jagaLama = ganti && penuhLama ? await tx.get(penjagaRef(penuhLama)) : null;

    if (jagaLama?.exists && jagaLama.get('refId') === id) tx.delete(jagaLama.ref);
    if (ganti && penuhBaru) {
      tx.create(penjagaRef(penuhBaru), {
        jenis: 'barang',
        refId: id,
        dibuatPada: waktu(),
        dibuatOleh: p.uid,
      });
    }
    tx.update(ref, { kategoriId, kode, ...jejakUbah(p.uid) });
    catatLog(tx, {
      modul: 'inventory',
      aksi: 'ubahKodeBarang',
      target: ref.path,
      nilaiLama: { kategoriId: b.kategoriId || null, kode: b.kode || '' },
      nilaiBaru: { kategoriId, kode },
      oleh: p.uid,
    });
    return { kode };
  });
}

/**
 * Ganti kode SAKTI (Umum), sekaligus memindahkan penjaga keunikan `inventory_kode`:
 * { jenis: 'kategori', id, kode (10 digit) } — kode barang di dalamnya ikut berganti; atau
 * { jenis: 'barang', id, kategoriId|null, kode (6 digit atau '') } — juga untuk melengkapi barang
 * yang belum berkategori. Dicatat di sistem_log.
 */
exports.ubahKodeSakti = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'umum');
  const d = req.data || {};
  if (d.jenis === 'kategori')
    return ubahKodeKategori(p, idSah(d.id, 'Kategori'), kodeSah(d.kode, 10));
  if (d.jenis === 'barang') {
    return ubahKodeBarang(
      p,
      idSah(d.id, 'Barang'),
      d.kategoriId == null || d.kategoriId === '' ? null : idSah(d.kategoriId, 'Kategori'),
      d.kode === '' || d.kode == null ? '' : kodeSah(d.kode, 6),
    );
  }
  throw galat('Jenis kode tidak sah.');
});
