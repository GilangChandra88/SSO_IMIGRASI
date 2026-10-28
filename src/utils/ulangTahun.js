/**
 * Kejutan ulang tahun: captcha "pemeriksaan keimigrasian" saat login (SSO), ucapan rekan kerja,
 * dan pengaturannya di Kepegawaian (docs/skema-database.md §5.1). Dipakai modul `sso` dan
 * `kepegawaian`.
 *
 * Data:
 *  - pegawai_ringkas.ultahMd 'MM-DD' (diturunkan Function dari pegawai.tanggalLahir): siapa yang
 *    berulang tahun hari ini; foto banner = pegawai_ringkas.fotoThumbPath (dibaca semua pegawai)
 *  - pegawai.fotoPaths: foto captcha (Storage pegawai/{id}/foto/, hanya pemilik & Kepegawaian)
 *  - ultah_status/{pegawaiId}: kejutanTahun (tahun captcha terakhir selesai), resetPada, resetOleh
 *  - ultah_ucapan/{tahun}_{untukPegawaiId}_{dariUid}: satu ucapan per pengirim per penerima per
 *    tahun; nama pengirim ditampilkan dari pegawai_ringkas (authUid), tidak disimpan di ucapan
 * Tahun & tanggal memakai WITA (sama dengan rules).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { JUMLAH, LIMIT_KUERI, PANJANG } from './batas';
import { tahunIni, tanggalIso } from './nilai';
import { daftarDokumen, pantau } from './pantau';

export { tahunIni };

/** Popup ucapan yang ditutup tanpa "Terima kasih" muncul lagi setelah jeda ini. */
export const JEDA_POPUP_MS = 5 * 60 * 1000;
export const MAKS_UCAPAN = PANJANG.pesanUcapan;
/** Sesuai jumlah kotak captcha 3×3 (rules: pegawai.fotoPaths ≤ 9). */
export const MAKS_FOTO_ULTAH = JUMLAH.fotoPegawai;

/** 'MM-DD' dari tanggal lahir 'YYYY-MM-DD'; '' bila kosong/tidak sah. */
export const ultahMd = (tgl) => (/^\d{4}-\d{2}-\d{2}$/.test(tgl || '') ? tgl.slice(5) : '');

/** Nilai `ultahMd` yang berulang tahun pada `hariIni` (29 Feb dirayakan 28 Feb di tahun biasa). */
export function kunciUltahHariIni(hariIni = tanggalIso()) {
  const md = hariIni.slice(5);
  const t = Number(hariIni.slice(0, 4));
  const kabisat = (t % 4 === 0 && t % 100 !== 0) || t % 400 === 0;
  return md === '02-28' && !kabisat ? ['02-28', '02-29'] : [md];
}

export function adalahUltahHariIni(tglLahir, hariIni = tanggalIso()) {
  const md = ultahMd(tglLahir);
  return !!md && kunciUltahHariIni(hariIni).includes(md);
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

/** Dokumen pegawai lengkap (mode uji admin; rules: Kepegawaian & pemilik), atau null. */
export async function ambilPegawai(id) {
  const snap = await getDoc(doc(db, KOLEKSI.pegawai, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Pantau pegawai (ringkas, aktif) yang berulang tahun hari ini. @returns unsubscribe */
export function pantauUltahHariIni(cb) {
  const q = query(
    collection(db, KOLEKSI.pegawaiRingkas),
    where('ultahMd', 'in', kunciUltahHariIni()),
    limit(LIMIT_KUERI.halaman),
  );
  return pantau(q, (snap) => cb(daftarDokumen(snap).filter((p) => p.aktif !== false)), {
    onGalat: () => cb([]),
    diam: true,
  });
}

// ─── Captcha (sekali per tahun) ─────────────────────────────────────────────

/** true bila captcha tahun ini belum diselesaikan pegawai itu. */
export async function perluKejutan(pegawaiId) {
  const snap = await getDoc(doc(db, KOLEKSI.ultahStatus, pegawaiId));
  return snap.data()?.kejutanTahun !== tahunIni();
}

export const tandaiKejutanSelesai = (pegawaiId) =>
  setDoc(
    doc(db, KOLEKSI.ultahStatus, pegawaiId),
    { kejutanTahun: tahunIni(), kejutanPada: serverTimestamp() },
    { merge: true },
  );

// ─── Ucapan ──────────────────────────────────────────────────────────────────

const waktuMs = (u) => u.dibuatPada?.toMillis?.() ?? Number.MAX_SAFE_INTEGER; // belum sampai server = terbaru
const urutWaktu = (a, b) => waktuMs(a) - waktuMs(b);
const keDaftar = (snap) => daftarDokumen(snap).sort(urutWaktu);

const kueriUcapan = (field, nilai) =>
  query(
    collection(db, KOLEKSI.ultahUcapan),
    where(field, '==', nilai),
    where('tahun', '==', tahunIni()),
    limit(LIMIT_KUERI.ucapan),
  );

/** Satu pengirim satu ucapan per orang per tahun (ID tetap; rules menolak kiriman kedua). */
export function kirimUcapan({ untukPegawaiId, dariUid, pesan }) {
  const tahun = tahunIni();
  return setDoc(doc(db, KOLEKSI.ultahUcapan, `${tahun}_${untukPegawaiId}_${dariUid}`), {
    tahun,
    untukPegawaiId,
    dariUid,
    pesan: pesan.trim().slice(0, MAKS_UCAPAN),
    dibuatPada: serverTimestamp(),
    terimaKasih: false,
    terimaKasihPada: null,
  });
}

/** Pantau ucapan tahun ini untuk seorang pegawai (penerima sendiri). @returns unsubscribe */
export const pantauUcapanUntuk = (pegawaiId, cb) =>
  pantau(kueriUcapan('untukPegawaiId', pegawaiId), (snap) => cb(keDaftar(snap)), {
    onGalat: () => cb([]),
    diam: true,
  });

/** Pantau ucapan tahun ini yang dikirim pengguna `uid`. @returns unsubscribe */
export const pantauUcapanDari = (uid, cb) =>
  pantau(kueriUcapan('dariUid', uid), (snap) => cb(keDaftar(snap)), {
    onGalat: () => cb([]),
    diam: true,
  });

export async function balasTerimaKasih(ids) {
  const batch = writeBatch(db);
  ids.forEach((id) =>
    batch.update(doc(db, KOLEKSI.ultahUcapan, id), {
      terimaKasih: true,
      terimaKasihPada: serverTimestamp(),
    }),
  );
  await batch.commit();
}

// ─── Pengaturan admin (Kepegawaian) ──────────────────────────────────────────

/** Status captcha + ucapan tahun ini untuk seorang pegawai (rules: Kepegawaian). */
export async function ambilStatusUltah(pegawaiId) {
  const [status, ucapan] = await Promise.all([
    getDoc(doc(db, KOLEKSI.ultahStatus, pegawaiId)),
    getDocs(kueriUcapan('untukPegawaiId', pegawaiId)),
  ]);
  return { ...(status.data() || {}), ucapan: keDaftar(ucapan) };
}

/**
 * Reset untuk pengujian (Kepegawaian).
 * @param {{ kejutan: boolean, hapusUcapan: boolean }} opsi  kejutan = captcha muncul lagi saat
 *   login berikutnya; hapusUcapan = ucapan tahun ini untuk pegawai itu dihapus
 * @param {string} uid  pengguna yang me-reset
 */
export async function resetUltah(pegawaiId, { kejutan, hapusUcapan }, uid) {
  if (kejutan) {
    await setDoc(
      doc(db, KOLEKSI.ultahStatus, pegawaiId),
      { kejutanTahun: null, resetPada: serverTimestamp(), resetOleh: uid },
      { merge: true },
    );
  }
  if (!hapusUcapan) return;
  const snap = await getDocs(kueriUcapan('untukPegawaiId', pegawaiId));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
