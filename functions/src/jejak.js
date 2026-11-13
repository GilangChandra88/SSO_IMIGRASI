/**
 * Jejak sistem (docs/skema-database.md §5.8, docs/rencana-jejak-sistem.md): inti pencatatan untuk
 * modul Log Developer.
 *
 * - `callable(nama, handler)`: pengganti `onCall(OPSI_CALLABLE, handler)` untuk SEMUA callable.
 *   Mencatat aktivitas (siapa, IP, perangkat, durasi, hasil), metrik per Function, galat tak terduga,
 *   penolakan akses, dan anomali umum (tanggal mundur, jam malam, pengaturan penting). Handler bisa
 *   menambah anomali khusus lewat `req.jejak.anomali({...})`; ditulis HANYA bila handler berhasil.
 * - Pencatatan tidak pernah menggagalkan aksi utama (`aman()`): bila log gagal ditulis, aksi tetap
 *   berhasil dan kegagalannya masuk Cloud Logging.
 *
 * Koleksi sistem_galat/_anomali/_aktivitas/_sesi/_metrik/_segel tertutup untuk browser (rules: false);
 * hanya dibaca Super Admin lewat Function di logdev.js.
 */

const crypto = require('crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { Timestamp } = require('firebase-admin/firestore');
const { db, FieldValue, KOLEKSI, OPSI_CALLABLE, DI_EMULATOR } = require('./umum');

const HARI_MS = 86400000;
/** Retensi (keputusan pemilik 12 Nov 2026): aktivitas 90 hari, galat 180 hari; log & anomali permanen. */
const RETENSI = Object.freeze({ aktivitasHari: 90, galatHari: 180 });
/** Akun layanan Function (index.js `serviceAccount`); penulisan Admin lain = di luar aplikasi. */
const AKUN_FUNGSI = 'fungsi-imigrasi@';

/** Ambang anomali bawaan; Super Admin mengubahnya di Pengaturan Log Developer. */
const AMBANG_BAWAAN = Object.freeze({
  hariMundur: 7,
  jamMalamMulai: 22,
  jamMalamSelesai: 5,
  selisihOpnamePersen: 10,
  selisihOpnameRupiah: 100000,
  ditolakPerJam: 10,
  gagalMasukPerJam: 5,
  galatPerHari: 20,
});

/**
 * Function yang mengubah pengaturan penting/akses; setiap pemanggilan yang berhasil dicatat sebagai
 * anomali `info` A7 agar ditinjau Super Admin.
 */
const FUNGSI_PENTING = new Set([
  'buatAkunPegawai',
  'aturPeran',
  'nonaktifkanPegawai',
  'aktifkanPegawai',
  'aturUlangSandi',
  'aturPenghitung',
  'hapusBerkas',
  'hapusNodeMak',
  'batalkanRealisasi',
  'pulihkanRealisasi',
  'batalkanDrpp',
  'ubahKodeSakti',
  'simpanSaldoAwal',
  'simpanSaldoAwalSimpanan',
  'simpanPengaturanKoperasi',
  'aturStokAwalBarang',
  'tutupBuku',
  'aturAmbangLogDev',
]);

const KODE_DITOLAK = new Set(['permission-denied', 'unauthenticated']);

// ─── Pembantu kecil ─────────────────────────────────────────────────────────

const kol = (nama) => db.collection(KOLEKSI[nama]);
const sidik = (...bagian) =>
  crypto.createHash('sha256').update(bagian.map(String).join('|')).digest('hex').slice(0, 24);
const kedaluwarsa = (hari) => Timestamp.fromMillis(Date.now() + hari * HARI_MS);

/** Waktu WITA: { tanggal 'YYYY-MM-DD', jam 'HH', kunciJam 'YYYYMMDDHH' }. */
function jamWita(waktu = new Date()) {
  const g = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(waktu)
      .map((p) => [p.type, p.value]),
  );
  const tanggal = `${g.year}-${g.month}-${g.day}`;
  return { tanggal, jam: g.hour, kunciJam: `${g.year}${g.month}${g.day}${g.hour}` };
}

/** Jalankan janji pencatatan tanpa pernah melempar galat ke aksi utama. */
async function aman(janji, konteks = 'jejak') {
  try {
    return await janji;
  } catch (err) {
    logger.error(`Pencatatan ${konteks} gagal`, { galat: String(err?.stack || err) });
    return null;
  }
}

// ─── Identitas & perangkat ──────────────────────────────────────────────────

function perangkatDari(ua) {
  const cari = (daftar) => (daftar.find(([re]) => re.test(ua)) || [null, 'Lainnya'])[1];
  return {
    peramban: cari([
      [/Edg\//, 'Edge'],
      [/OPR\/|Opera/, 'Opera'],
      [/SamsungBrowser/, 'Samsung Internet'],
      [/Firefox\//, 'Firefox'],
      [/Chrome\//, 'Chrome'],
      [/Safari\//, 'Safari'],
    ]),
    os: cari([
      [/Windows/, 'Windows'],
      [/Android/, 'Android'],
      [/iPhone|iPad|iPod/, 'iOS'],
      [/Mac OS X/, 'macOS'],
      [/Linux/, 'Linux'],
    ]),
    jenis: /iPad|Tablet/.test(ua)
      ? 'tablet'
      : /Mobi|Android|iPhone/.test(ua)
        ? 'ponsel'
        : 'komputer',
  };
}

/** IP & perangkat dari permintaan HTTP (dibaca server, tidak bisa diisi klien lewat data). */
function infoKlien(raw) {
  const h = raw?.headers || {};
  const ip = String(h['x-forwarded-for'] || raw?.ip || '')
    .split(',')[0]
    .trim()
    .slice(0, 45);
  const ua = String(h['user-agent'] || '').slice(0, 256);
  return { ip, ua, perangkat: perangkatDari(ua) };
}

/** Pelaku dari token login (bukan dari data kiriman klien). */
function pelakuDari(req) {
  const t = req.auth?.token || {};
  return {
    uid: req.auth?.uid || '',
    email: typeof t.email === 'string' ? t.email : '',
    pegawaiId: typeof t.pegawaiId === 'string' ? t.pegawaiId : '',
    peran: Array.isArray(t.peran) ? t.peran.filter((x) => typeof x === 'string') : [],
  };
}

const ringkasPelaku = (pelaku, klien) => ({
  ...pelaku,
  ip: klien?.ip || '',
  perangkat: klien?.perangkat || null,
});

// ─── Bentuk nilai hemat & selisih ───────────────────────────────────────────

const adalahWaktu = (v) => v instanceof Timestamp || typeof v?.toDate === 'function';

/** Nilai ringkas untuk log: teks panjang dipotong, daftar besar dihitung, kedalaman dibatasi. */
function padat(v, d = 0) {
  if (v === null || v === undefined) return null;
  if (adalahWaktu(v)) return v.toDate().toISOString();
  if (typeof v === 'string')
    return v.length > 300 ? { panjang: v.length, awal: v.slice(0, 80) } : v;
  if (typeof v !== 'object') return v;
  if (Array.isArray(v)) {
    // Firestore tidak menerima larik di dalam larik
    return v.length > 10 || v.some(Array.isArray)
      ? { jumlah: v.length }
      : v.map((x) => padat(x, d + 1));
  }
  if (d >= 3) {
    const s = JSON.stringify(v);
    return s.length > 300 ? { panjang: s.length, awal: s.slice(0, 80) } : JSON.parse(s);
  }
  return Object.fromEntries(
    Object.entries(v)
      .slice(0, 30)
      .map(([k, x]) => [k, padat(x, d + 1)]),
  );
}

const ABAIKAN = new Set(['diubahPada', 'dibuatPada', 'diubahOleh', 'dibuatOleh', 'versi']);

function ratakan(o, awalan = '', hasil = {}, d = 0) {
  Object.entries(o || {}).forEach(([k, v]) => {
    if (!awalan && ABAIKAN.has(k)) return;
    const kunci = awalan ? `${awalan}.${k}` : k;
    const peta = v && typeof v === 'object' && !Array.isArray(v) && !adalahWaktu(v);
    if (peta && d < 2 && Object.keys(v).length) ratakan(v, kunci, hasil, d + 1);
    else hasil[kunci] = v;
  });
  return hasil;
}

/**
 * Selisih dua versi dokumen: { perubahan: { 'a.b': { lama, baru } }, lebih } (maks. 40 field).
 * `samarkan` = nilai diganti '••••' (data pribadi), hanya nama field yang tercatat.
 */
function selisih(lama, baru, { samarkan = false } = {}) {
  const a = ratakan(lama);
  const b = ratakan(baru);
  const perubahan = {};
  let n = 0;
  let lebih = 0;
  [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().forEach((k) => {
    const x = padat(a[k]);
    const y = padat(b[k]);
    if (JSON.stringify(x) === JSON.stringify(y)) return;
    if (n >= 40) {
      lebih += 1;
      return;
    }
    perubahan[k] = samarkan
      ? { lama: x === null ? null : '••••', baru: y === null ? null : '••••' }
      : { lama: x, baru: y };
    n += 1;
  });
  return { perubahan, lebih };
}

// ─── Penulis catatan ────────────────────────────────────────────────────────

let cacheAmbang = null;
let cacheAmbangPada = 0;
async function bacaAmbang() {
  if (cacheAmbang && Date.now() - cacheAmbangPada < 5 * 60000) return cacheAmbang;
  const s = await kol('sistemPengaturan').doc('logdev').get();
  cacheAmbang = { ...AMBANG_BAWAAN, ...((s.exists && s.get('ambang')) || {}) };
  cacheAmbangPada = Date.now();
  return cacheAmbang;
}
const segarkanAmbang = () => {
  cacheAmbang = null;
};

/**
 * Anomali. `kunci` = gabungkan kejadian sejenis (mis. per pengguna per jam) menjadi satu dokumen
 * dengan `jumlah` yang naik; tanpa kunci = satu dokumen per kejadian.
 */
async function catatAnomali({
  kode,
  tingkat = 'peringatan',
  modul = 'sistem',
  judul,
  target = '',
  pelaku = null,
  rincian = {},
  kunci = '',
}) {
  const sekarang = FieldValue.serverTimestamp();
  const isi = {
    kode,
    tingkat,
    modul,
    judul: String(judul || kode).slice(0, 200),
    target: String(target).slice(0, 300),
    pelaku,
    rincian: padat(rincian),
    terakhirPada: sekarang,
  };
  const awal = { jumlah: 1, status: 'baru', catatan: '', diperiksaOleh: '', pertamaPada: sekarang };
  if (!kunci) return kol('sistemAnomali').add({ ...isi, ...awal });
  const ref = kol('sistemAnomali').doc(`${kode}_${sidik(kunci)}`);
  try {
    await ref.create({ ...isi, ...awal });
  } catch (err) {
    if (err?.code !== 6) throw err; // 6 = ALREADY_EXISTS: kejadian sejenis berikutnya
    await ref.update({ ...isi, jumlah: FieldValue.increment(1) });
  }
  return ref;
}

/**
 * Galat dikelompokkan per sidik jari (sumber + nama + pesan + lokasi): galat yang sama dari banyak
 * pengguna = satu dokumen dengan `jumlah`. Galat yang sudah `ditangani` lalu muncul lagi = kambuh.
 */
async function catatGalat({
  sumber,
  nama = '',
  pesan = '',
  lokasi = '',
  stack = '',
  uid = '',
  versi = '',
  kode = '',
}) {
  const teks = String(pesan).slice(0, 500);
  const id = sidik(sumber, nama, teks.slice(0, 200), lokasi);
  const ref = kol('sistemGalat').doc(id);
  const contoh = {
    pesan: teks,
    stack: String(stack).slice(0, 2000),
    uid,
    versi: String(versi).slice(0, 40),
    kode: String(kode).slice(0, 60),
    pada: Timestamp.now(),
  };
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const segar = {
      terakhirPada: FieldValue.serverTimestamp(),
      kedaluwarsaPada: kedaluwarsa(RETENSI.galatHari),
      contoh,
    };
    if (!s.exists) {
      tx.create(ref, {
        sumber,
        nama: String(nama).slice(0, 60),
        pesan: teks,
        lokasi: String(lokasi).slice(0, 200),
        jumlah: 1,
        penggunaTerdampak: uid ? [uid] : [],
        status: 'baru',
        kambuh: false,
        catatan: '',
        ditanganiOleh: '',
        pertamaPada: FieldValue.serverTimestamp(),
        ...segar,
      });
      return;
    }
    const terdampak = s.get('penggunaTerdampak') || [];
    tx.update(ref, {
      ...segar,
      jumlah: FieldValue.increment(1),
      ...(uid && !terdampak.includes(uid) && terdampak.length < 20
        ? { penggunaTerdampak: FieldValue.arrayUnion(uid) }
        : {}),
      ...(s.get('status') === 'ditangani' ? { status: 'baru', kambuh: true } : {}),
    });
  });
  return id;
}

/** Aktivitas (riwayat 90 hari): panggilan Function, masuk/keluar, halaman, gagal masuk. */
const catatAktivitas = (isi) =>
  kol('sistemAktivitas').add({
    ...isi,
    pada: FieldValue.serverTimestamp(),
    kedaluwarsaPada: kedaluwarsa(RETENSI.aktivitasHari),
  });

/** Metrik harian per Function: jumlah panggilan per hasil + total durasi (rata-rata = total/panggil). */
function catatMetrik(nama, status, ms) {
  const { tanggal, jam } = jamWita();
  const inc = FieldValue.increment;
  return kol('sistemMetrik')
    .doc(tanggal)
    .set(
      {
        tanggal,
        fn: { [nama]: { panggil: inc(1), [status]: inc(1), totalMs: inc(ms) } },
        jam: { [jam]: inc(1) },
        diubahPada: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

// ─── Pembungkus callable ────────────────────────────────────────────────────

/** Anomali umum setelah aksi berhasil: tanggal mundur (A4), jam malam (A5), pengaturan penting (A7). */
async function anomaliUmum(nama, req, pelaku) {
  const ambang = await bacaAmbang();
  const sekarang = jamWita();
  const hasil = [];
  const tgl = req.data?.tanggal;
  if (typeof tgl === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
    const mundur = Math.round((Date.parse(sekarang.tanggal) - Date.parse(tgl)) / HARI_MS);
    if (mundur > ambang.hariMundur) {
      hasil.push({
        kode: 'A4',
        tingkat: 'info',
        judul: `Transaksi bertanggal mundur ${mundur} hari`,
        rincian: { tanggal: tgl, mundur },
      });
    }
  }
  const jam = Number(sekarang.jam);
  const { jamMalamMulai: m, jamMalamSelesai: s } = ambang;
  const malam = m > s ? jam >= m || jam < s : jam >= m && jam < s;
  if (malam && pelaku.uid) {
    hasil.push({
      kode: 'A5',
      tingkat: 'info',
      judul: 'Aktivitas di luar jam kerja',
      rincian: { jam },
      kunci: `${pelaku.uid}|${sekarang.tanggal}`,
    });
  }
  if (FUNGSI_PENTING.has(nama)) {
    hasil.push({ kode: 'A7', tingkat: 'info', judul: `Pengaturan penting diubah: ${nama}` });
  }
  return hasil;
}

/**
 * Pengganti `onCall(OPSI_CALLABLE, handler)`. `senyap` = tidak mencatat aktivitas per panggilan
 * (untuk Function yang dipanggil berkala: detak sesi, baca log), metrik tetap dihitung.
 */
function callable(nama, handler, { senyap = false } = {}) {
  return onCall(OPSI_CALLABLE, async (req) => {
    const mulai = Date.now();
    const klien = infoKlien(req.rawRequest);
    const pelaku = pelakuDari(req);
    const tertunda = [];
    req.jejak = { klien, pelaku, anomali: (a) => tertunda.push(a) };
    let status = 'ok';
    let kode = '';
    try {
      const hasil = await handler(req);
      await aman(
        (async () => {
          const daftar = [...tertunda, ...(senyap ? [] : await anomaliUmum(nama, req, pelaku))];
          await Promise.all(
            daftar.map((a) =>
              catatAnomali({
                ...a,
                pelaku: ringkasPelaku(pelaku, klien),
                rincian: { fn: nama, ...(a.rincian || {}) },
              }),
            ),
          );
        })(),
        `anomali ${nama}`,
      );
      return hasil;
    } catch (err) {
      const terduga = err instanceof HttpsError && err.code !== 'internal';
      if (terduga) {
        status = KODE_DITOLAK.has(err.code) ? 'ditolak' : 'tolak';
        kode = err.code;
        if (status === 'ditolak') {
          await aman(
            catatAnomali({
              kode: 'A6',
              tingkat: 'peringatan',
              judul: 'Permintaan ditolak karena hak akses',
              pelaku: ringkasPelaku(pelaku, klien),
              rincian: { fn: nama, pesan: err.message },
              kunci: `${pelaku.uid || klien.ip}|${jamWita().kunciJam}`,
            }),
          );
        }
        throw err;
      }
      status = 'galat';
      kode = 'internal';
      const id = await aman(
        catatGalat({
          sumber: `fn:${nama}`,
          nama: err?.name || 'Error',
          pesan: String(err?.message || err),
          lokasi: nama,
          stack: String(err?.stack || ''),
          uid: pelaku.uid,
        }),
      );
      logger.error(`Galat di Function ${nama}`, {
        fn: nama,
        uid: pelaku.uid,
        galat: String(err?.stack || err),
      });
      throw new HttpsError(
        'internal',
        `Terjadi kesalahan sistem${id ? ` (kode ${id.slice(0, 8)})` : ''}. Laporkan ke Super Admin.`,
      );
    } finally {
      const ms = Date.now() - mulai;
      await Promise.all([
        aman(catatMetrik(nama, status, ms), 'metrik'),
        senyap
          ? null
          : aman(
              catatAktivitas({
                jenis: 'panggil',
                fn: nama,
                status,
                kode,
                ms,
                uid: pelaku.uid,
                email: pelaku.email,
                pegawaiId: pelaku.pegawaiId,
                ip: klien.ip,
                perangkat: klien.perangkat,
              }),
              'aktivitas',
            ),
      ]);
    }
  });
}

module.exports = {
  HARI_MS,
  RETENSI,
  AKUN_FUNGSI,
  AMBANG_BAWAAN,
  DI_EMULATOR,
  sidik,
  kedaluwarsa,
  jamWita,
  aman,
  infoKlien,
  pelakuDari,
  ringkasPelaku,
  padat,
  selisih,
  bacaAmbang,
  segarkanAmbang,
  catatAnomali,
  catatGalat,
  catatAktivitas,
  catatMetrik,
  callable,
};
