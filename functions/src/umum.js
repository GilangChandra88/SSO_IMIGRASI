/**
 * Pembantu bersama Cloud Functions. Admin SDK melewati rules, jadi setiap callable wajib memeriksa
 * sendiri identitas, peran, dan bentuk masukan memakai pembantu di sini.
 */

const { HttpsError } = require('firebase-functions/v2/https');
const { getApp, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();
const authAdmin = getAuth();

const DI_EMULATOR = process.env.FUNCTIONS_EMULATOR === 'true';
// App Check wajib untuk semua callable di cloud (token debug localhost harus didaftarkan di Console).
const OPSI_CALLABLE = { enforceAppCheck: !DI_EMULATOR };

/** Nama koleksi (sama dengan src/config/koleksi.js dan docs/skema-database.md). */
const KOLEKSI = {
  pegawai: 'pegawai',
  pegawaiRingkas: 'pegawai_ringkas',
  lpjBerkas: 'lpj_berkas',
  lpjRingkas: 'lpj_ringkas',
  lpjNomor: 'lpj_nomor',
  lpjDrpp: 'lpj_drpp',
  makNode: 'mak_node',
  makRealisasi: 'mak_realisasi',
  makRekap: 'mak_rekap',
  suratKode: 'surat_kode',
  suratNomor: 'surat_nomor',
  inventoryKategori: 'inventory_kategori',
  inventoryBarang: 'inventory_barang',
  inventoryPemasok: 'inventory_pemasok',
  inventoryKode: 'inventory_kode',
  inventoryMasuk: 'inventory_masuk',
  inventoryKeluar: 'inventory_keluar',
  inventorySaldo: 'inventory_saldo',
  sistemPengaturan: 'sistem_pengaturan',
  sistemPenghitung: 'sistem_penghitung',
  sistemLog: 'sistem_log',
};

/** Kode peran (sama dengan src/utils/peran.js dan firestore.rules). */
const KODE_PERAN = ['superadmin', 'keuangan', 'kepegawaian', 'umum'];

/** Identitas pemanggil yang sah (login e-mail/kata sandi, akun aktif); selain itu ditolak. */
function pemanggil(req) {
  const t = req.auth?.token;
  if (
    !req.auth ||
    t?.firebase?.sign_in_provider !== 'password' ||
    t.aktif !== true ||
    !Array.isArray(t.peran) ||
    typeof t.pegawaiId !== 'string'
  ) {
    throw new HttpsError('unauthenticated', 'Silakan masuk dengan akun pegawai yang aktif.');
  }
  return { uid: req.auth.uid, peran: t.peran, pegawaiId: t.pegawaiId };
}

const superadmin = (p) => p.peran.includes('superadmin');
const punya = (p, kode) => superadmin(p) || p.peran.includes(kode);

function wajibPeran(p, kode) {
  if (!punya(p, kode)) {
    throw new HttpsError('permission-denied', 'Anda tidak punya hak untuk tindakan ini.');
  }
}

function idSah(v, label = 'ID') {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(v)) {
    throw new HttpsError('invalid-argument', `${label} tidak sah.`);
  }
  return v;
}

function teksSah(v, maks, label, { wajib = true } = {}) {
  const s = typeof v === 'string' ? v.trim() : '';
  if ((wajib && !s) || s.length > maks) {
    throw new HttpsError('invalid-argument', `${label} wajib diisi (maks. ${maks} karakter).`);
  }
  return s;
}

const tanggalSah = (v) =>
  typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);

/** Waktu kantor (WITA) saat ini: { tahun, bulan (2 digit), tanggal 'YYYY-MM-DD' }. */
function waktuWita(waktu = new Date()) {
  const tanggal = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(waktu);
  return { tahun: tanggal.slice(0, 4), bulan: tanggal.slice(5, 7), tanggal };
}

/**
 * Satu entri sistem_log (ditulis di dalam transaksi/batch bila diberikan). `id` tetap dipakai
 * pemicu yang bisa terkirim ulang: entri yang sudah ada tidak ditulis dua kali.
 */
function catatLog(
  tx,
  { id, modul, aksi, target, nilaiLama = null, nilaiBaru = null, alasan = '', oleh },
) {
  const kol = db.collection(KOLEKSI.sistemLog);
  const ref = id ? kol.doc(id) : kol.doc();
  const data = {
    modul,
    aksi,
    target,
    nilaiLama,
    nilaiBaru,
    alasan,
    oleh,
    pada: FieldValue.serverTimestamp(),
  };
  if (tx) tx.create(ref, data);
  else
    return ref.create(data).catch((err) => {
      if (!(id && err?.code === 6)) throw err; // 6 = ALREADY_EXISTS
    });
}

/** Jejak ubah dari server untuk penulisan Admin SDK. */
const jejakUbah = (uid) => ({ diubahPada: FieldValue.serverTimestamp(), diubahOleh: uid });

module.exports = {
  HttpsError,
  FieldValue,
  getApp,
  db,
  authAdmin,
  DI_EMULATOR,
  OPSI_CALLABLE,
  KOLEKSI,
  KODE_PERAN,
  pemanggil,
  superadmin,
  punya,
  wajibPeran,
  idSah,
  teksSah,
  tanggalSah,
  waktuWita,
  catatLog,
  jejakUbah,
};
