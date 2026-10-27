/**
 * Kejutan ulang tahun: captcha "pemeriksaan keimigrasian" saat login (SSO), ucapan rekan kerja,
 * dan pengaturannya di Kepegawaian. Dipakai modul `sso` dan `kepegawaian`.
 *
 * Data Firestore:
 *  - pegawai/{id}: `tanggal_lahir` 'YYYY-MM-DD', `ultah_md` 'MM-DD' (kueri "ulang tahun hari ini"),
 *    `fotos` [{ path, url }] maks. MAKS_FOTO_ULTAH (Storage `pegawai/{id}/...`, diunggah admin)
 *  - ulang_tahun/{pegawaiId}: `kejutanTahun` (tahun captcha terakhir selesai), `resetAt`, `resetOleh`
 *  - ucapan_ultah/{tahun}_{untukId}_{dariUid}: ucapan; `terimaKasih` true setelah dibalas
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export const KOLEKSI_STATUS = 'ulang_tahun';
export const KOLEKSI_UCAPAN = 'ucapan_ultah';
/** Popup ucapan yang ditutup tanpa "Terima kasih" muncul lagi setelah jeda ini. */
export const JEDA_POPUP_MS = 5 * 60 * 1000;
export const MAKS_UCAPAN = 200;
/** Sesuai jumlah kotak captcha 3×3. */
export const MAKS_FOTO_ULTAH = 9;

/** Foto pegawai untuk captcha ([{ path, url }]); `foto` tunggal = bentuk awal sebelum `fotos`. */
export function daftarFoto(pegawai) {
  if (Array.isArray(pegawai?.fotos)) return pegawai.fotos.filter((f) => f?.url);
  return pegawai?.foto?.url ? [pegawai.foto] : [];
}

const dua = (n) => String(n).padStart(2, '0');

export const tahunIni = () => new Date().getFullYear();

/** 'MM-DD' dari objek Date (waktu lokal). */
export const mdDari = (d) => `${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;

/** 'MM-DD' dari tanggal lahir 'YYYY-MM-DD'; '' bila kosong/tidak sah. */
export const ultahMd = (tgl) => (/^\d{4}-\d{2}-\d{2}$/.test(tgl || '') ? tgl.slice(5) : '');

/** Nilai `ultah_md` yang berulang tahun hari ini (29 Feb dirayakan 28 Feb di tahun biasa). */
export function kunciUltahHariIni(now = new Date()) {
  const md = mdDari(now);
  const kabisat = new Date(now.getFullYear(), 1, 29).getMonth() === 1;
  return md === '02-28' && !kabisat ? ['02-28', '02-29'] : [md];
}

export function adalahUltahHariIni(tgl, now = new Date()) {
  const md = ultahMd(tgl);
  return !!md && kunciUltahHariIni(now).includes(md);
}

/** '27 Oktober 1990' dari 'YYYY-MM-DD'. */
export function formatTanggal(tgl) {
  if (!ultahMd(tgl)) return '';
  const [y, m, d] = tgl.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Satu dokumen pegawai (untuk mode uji), atau null. */
export async function ambilPegawai(id) {
  const snap = await getDoc(doc(db, 'pegawai', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Pantau pegawai yang berulang tahun hari ini. @returns unsubscribe */
export function pantauUltahHariIni(cb) {
  const q = query(collection(db, 'pegawai'), where('ultah_md', 'in', kunciUltahHariIni()));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

// ─── Captcha (sekali per tahun) ─────────────────────────────────────────────

/** true bila captcha tahun ini belum diselesaikan pegawai itu. */
export async function perluKejutan(pegawaiId) {
  const snap = await getDoc(doc(db, KOLEKSI_STATUS, pegawaiId));
  return snap.data()?.kejutanTahun !== tahunIni();
}

export const tandaiKejutanSelesai = (pegawaiId) =>
  setDoc(
    doc(db, KOLEKSI_STATUS, pegawaiId),
    { kejutanTahun: tahunIni(), kejutanAt: new Date().toISOString() },
    { merge: true },
  );

// ─── Ucapan ──────────────────────────────────────────────────────────────────

const urutWaktu = (a, b) => String(a.createdAt).localeCompare(String(b.createdAt));
const keDaftar = (snap) =>
  snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => u.tahun === tahunIni())
    .sort(urutWaktu);

/** Satu pengirim satu ucapan per orang per tahun (ID tetap). */
export function kirimUcapan({ untuk, dariUid, dariNama, pesan }) {
  return setDoc(doc(db, KOLEKSI_UCAPAN, `${tahunIni()}_${untuk.id}_${dariUid}`), {
    tahun: tahunIni(),
    untukId: untuk.id,
    untukNama: untuk.nama || '',
    dariUid,
    dariNama,
    pesan: pesan.trim().slice(0, MAKS_UCAPAN),
    createdAt: new Date().toISOString(),
    terimaKasih: false,
  });
}

/** Pantau ucapan tahun ini untuk seorang pegawai. @returns unsubscribe */
export function pantauUcapanUntuk(pegawaiId, cb) {
  const q = query(collection(db, KOLEKSI_UCAPAN), where('untukId', '==', pegawaiId));
  return onSnapshot(
    q,
    (snap) => cb(keDaftar(snap)),
    () => cb([]),
  );
}

/** Pantau ucapan tahun ini yang dikirim pengguna `uid`. @returns unsubscribe */
export function pantauUcapanDari(uid, cb) {
  const q = query(collection(db, KOLEKSI_UCAPAN), where('dariUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => cb(keDaftar(snap)),
    () => cb([]),
  );
}

export async function balasTerimaKasih(ids) {
  const batch = writeBatch(db);
  const waktu = new Date().toISOString();
  ids.forEach((id) =>
    batch.update(doc(db, KOLEKSI_UCAPAN, id), { terimaKasih: true, terimaKasihAt: waktu }),
  );
  await batch.commit();
}

// ─── Pengaturan admin (Kepegawaian) ──────────────────────────────────────────

export async function ambilStatusUltah(pegawaiId) {
  const [status, ucapan] = await Promise.all([
    getDoc(doc(db, KOLEKSI_STATUS, pegawaiId)),
    getDocs(query(collection(db, KOLEKSI_UCAPAN), where('untukId', '==', pegawaiId))),
  ]);
  return { ...(status.data() || {}), ucapan: keDaftar(ucapan) };
}

/**
 * Reset untuk pengujian.
 * @param {{ kejutan: boolean, ucapan: 'biarkan'|'belum-dibalas'|'hapus' }} opsi
 *   kejutan = captcha muncul lagi saat login berikutnya; ucapan = perlakuan ucapan tahun ini
 */
export async function resetUltah(pegawaiId, { kejutan, ucapan }, oleh = '') {
  if (kejutan) {
    await setDoc(
      doc(db, KOLEKSI_STATUS, pegawaiId),
      { kejutanTahun: null, resetAt: new Date().toISOString(), resetOleh: oleh },
      { merge: true },
    );
  }
  if (ucapan === 'biarkan') return;
  const snap = await getDocs(
    query(collection(db, KOLEKSI_UCAPAN), where('untukId', '==', pegawaiId)),
  );
  const tahunan = snap.docs.filter((d) => d.data().tahun === tahunIni());
  if (ucapan === 'hapus') {
    await Promise.all(tahunan.map((d) => deleteDoc(d.ref)));
    return;
  }
  const batch = writeBatch(db);
  tahunan.forEach((d) => batch.update(d.ref, { terimaKasih: false, terimaKasihAt: null }));
  await batch.commit();
}
