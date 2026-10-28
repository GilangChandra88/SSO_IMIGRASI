/**
 * Akses Firestore berkas LPJ (docs/skema-database.md §5.2): `lpj_berkas` + subkoleksi `keuangan`,
 * `bukti`, `riwayat`, dan daftar `lpj_ringkas`. Komponen tidak memanggil Firestore langsung.
 *
 * TIDAK ditulis dari sini (hanya Cloud Function, functions/src/lpj.js): anggotaUids, tahap, status,
 * nomor LPJ, realisasi MAK, lpj_ringkas, riwayat. Rules menolak klien yang mencobanya.
 */

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getCountFromServer,
  getDocFromCache,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { DOK_KEUANGAN, KOLEKSI, SUBKOLEKSI_LPJ } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { hentikanPantau } from '@/utils/usePantauBersama';
import { JENIS } from '../data/masterLpj';
import { spbyKosong, spKosong } from '../utils/modelKosong';

export const refBerkas = (id) => doc(db, KOLEKSI.lpjBerkas, id);
export const refKeuangan = (id) =>
  doc(db, KOLEKSI.lpjBerkas, id, SUBKOLEKSI_LPJ.keuangan, DOK_KEUANGAN);
const kolBukti = (id) => collection(db, KOLEKSI.lpjBerkas, id, SUBKOLEKSI_LPJ.bukti);

export const kueriBukti = (id) =>
  query(kolBukti(id), orderBy('dibuatPada'), limit(LIMIT_KUERI.buktiBerkas));

export const kueriRiwayat = (id) =>
  query(
    collection(db, KOLEKSI.lpjBerkas, id, SUBKOLEKSI_LPJ.riwayat),
    orderBy('pada', 'desc'),
    limit(LIMIT_KUERI.riwayatBerkas),
  );

/**
 * Kueri `lpj_ringkas` (indeks: docs/skema-database.md §10), 50 terbaru per halaman.
 * @param {{ uid: string, semua?: boolean, tahunAnggaran: number, tahap?: string, setelah?: any }} opsi
 *   semua = Keuangan/Super Admin (seluruh berkas tahun itu); selain itu hanya berkas yang
 *   mencantumkan `uid`. tahap = saring satu tahap (mis. 'selesai' untuk Arsip pelaksana) atau
 *   beberapa tahap (array, `in`). setelah = `dibuatPada` baris terakhir.
 */
export function kueriRingkas({ uid, semua = false, tahunAnggaran, tahap = '', setelah = null }) {
  const syarat = semua ? [] : [where('anggotaUids', 'array-contains', uid)];
  syarat.push(where('tahunAnggaran', '==', tahunAnggaran));
  if (Array.isArray(tahap)) syarat.push(where('tahap', 'in', tahap));
  else if (tahap) syarat.push(where('tahap', '==', tahap));
  return query(
    collection(db, KOLEKSI.lpjRingkas),
    ...syarat,
    orderBy('dibuatPada', 'desc'),
    ...(setelah ? [startAfter(setelah)] : []),
    limit(LIMIT_KUERI.halaman),
  );
}

/** Satu ringkasan berkas (sekali baca); null bila tidak ada. */
export async function ambilRingkas(id) {
  const snap = await getDoc(doc(db, KOLEKSI.lpjRingkas, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Halaman berikutnya daftar ringkas (berkas yang lebih lama dari `setelah`). */
export async function ambilRingkasBerikutnya(opsi, setelah) {
  const snap = await getDocs(kueriRingkas({ ...opsi, setelah }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Jumlah berkas ringkas yang cocok (kueri hitung, ±1 baca), dibatasi limit daftar (50) yang
 * diterima rules: hasil 50 berarti "50 atau lebih".
 */
export async function hitungRingkas(opsi) {
  const snap = await getCountFromServer(kueriRingkas(opsi));
  return snap.data().count;
}

// ─── Menulis isi berkas ─────────────────────────────────────────────────────

export const idBerkasBaru = () => doc(collection(db, KOLEKSI.lpjBerkas)).id;

/**
 * Buat berkas baru (draf) dengan bagian pertamanya saja (`sp` / `spby`); bagian berikutnya
 * ditulis saat fasenya diisi. Nomor LPJ terbit lewat `selesaikanSpby`.
 * @param {{ id?: string, jenis: 'perjadin'|'nonperjadin', uraian: string, tahunAnggaran: number,
 *   uid: string, pelaksana?: object|null }} data  pelaksana = Orang pembuat (pelaksana pertama)
 * @returns {Promise<string>} id berkas
 */
export async function buatBerkas({
  id = idBerkasBaru(),
  jenis,
  uraian,
  tahunAnggaran,
  uid,
  pelaksana = null,
}) {
  const awal =
    jenis === JENIS.perjadin ? { sp: spKosong(pelaksana) } : { spby: spbyKosong(pelaksana) };
  await setDoc(refBerkas(id), {
    skema: 1,
    jenis,
    uraian: uraian.trim(),
    tahunAnggaran,
    versi: 1,
    dicetak: { spd: {}, dokumen: {} },
    ...awal,
    anggotaUids: [uid],
    dibuatPada: serverTimestamp(),
    dibuatOleh: uid,
    diubahPada: serverTimestamp(),
    diubahOleh: uid,
  });
  return id;
}

// Simpanan per berkas dijalankan berurutan, dan versi dasar dibaca tepat sebelum menulis (cache
// lokal sudah memuat simpanan sebelumnya), sehingga simpan otomatis beruntun tidak saling menolak.
// Tulisan orang lain di antara baca-tulis tetap ditolak rules (versi bentrok).
const antrean = new Map();

/**
 * Simpan perubahan isi berkas sebagai dot-path (mis. { 'sp.menimbang': '…' }) dengan versi + 1.
 * Ditolak rules bila versi bentrok, bagian sudah terkunci, fase belum terbuka, atau isian
 * melanggar batas; galatnya diteruskan ke pemanggil.
 */
export function simpanBerkas(id, perubahan, uid) {
  const sebelumnya = antrean.get(id) || Promise.resolve();
  const kerja = sebelumnya
    .catch(() => {})
    .then(async () => {
      const ref = refBerkas(id);
      const snap = await getDocFromCache(ref).catch(() => getDoc(ref));
      if (!snap.exists()) {
        throw Object.assign(new Error('Berkas tidak ditemukan.'), { code: 'not-found' });
      }
      await updateDoc(ref, {
        ...perubahan,
        versi: snap.data().versi + 1,
        diubahPada: serverTimestamp(),
        diubahOleh: uid,
      });
    });
  antrean.set(id, kerja);
  kerja
    .catch(() => {})
    .finally(() => {
      if (antrean.get(id) === kerja) antrean.delete(id);
    });
  return kerja;
}

/**
 * Field bagian yang berubah → { 'bagian.field': nilai } (simpan otomatis hanya mengirim yang
 * berubah). `terkunci` tidak pernah ikut; penguncian lewat kunciBagian/selesaikanSpby.
 */
export function perubahanBagian(bagian, lama = {}, baru = {}) {
  const hasil = {};
  Object.keys(baru).forEach((k) => {
    if (k !== 'terkunci' && JSON.stringify(lama?.[k]) !== JSON.stringify(baru[k])) {
      hasil[`${bagian}.${k}`] = baru[k];
    }
  });
  return hasil;
}

/**
 * Kunci bagian (fase "Selesai", final) bersama isi akhirnya. Bagian `lpj` dan `spby` tidak bisa
 * dikunci dari sini (rules); pakai selesaikanSpby.
 */
export const kunciBagian = (id, bagian, perubahanAkhir, uid) =>
  simpanBerkas(id, { ...perubahanAkhir, [`${bagian}.terkunci`]: true }, uid);

/** Tandai dokumen sudah dicetak. jalur: `spd.<pegawaiId>` atau `dokumen.<kunciDokumen>`. */
export const tandaiDicetak = (id, jalur, uid) =>
  simpanBerkas(id, { [`dicetak.${jalur}`]: true }, uid);

/** Tambah/lepas Meta berkas di daftar bagian (`laporan.foto`, `lampiran.foto`, `lampiran.nota`). */
export const tambahKeDaftar = (id, jalur, meta, uid) =>
  simpanBerkas(id, { [jalur]: arrayUnion(meta) }, uid);
export const lepasDariDaftar = (id, jalur, meta, uid) =>
  simpanBerkas(id, { [jalur]: arrayRemove(meta) }, uid);

// ─── Bukti pengeluaran (subkoleksi bukti) ───────────────────────────────────

/** @param {{ pelaksanaId: string, label: string, berkas: object }} data  berkas = Meta */
export const tambahBuktiDoc = (id, { pelaksanaId, label, berkas }, uid) =>
  addDoc(kolBukti(id), {
    pelaksanaId,
    label,
    berkas,
    dibuatPada: serverTimestamp(),
    dibuatOleh: uid,
  });

export const hapusBuktiDoc = (id, buktiId) => deleteDoc(doc(kolBukti(id), buktiId));

// ─── Cloud Functions ────────────────────────────────────────────────────────

const panggil = (nama, data) => httpsCallable(functions, nama)(data).then((hasil) => hasil.data);

/**
 * Selesaikan LPJ & SPBy (Perjadin) / SPBy (Non-Perjadin) di server dalam satu transaksi: validasi
 * transaksi, kunci bagian, nomor LPJ, dan realisasi MAK. Simpan isi terakhir dulu (await
 * simpanBerkas), karena Function membaca isi dari Firestore.
 * @returns {Promise<{ nomorLpj: string }>}
 */
export const selesaikanSpby = (berkasId) => panggil('selesaikanSpby', { berkasId });

/**
 * Hapus berkas beserta subkoleksi dan berkas Storage-nya (draf: pembuat/Super Admin; bernomor:
 * Super Admin + alasan, realisasinya dibatalkan). Listener berkas ini dihentikan dulu, karena
 * listener dokumen yang terhapus ditolak rules.
 */
export function hapusBerkas(berkasId, alasan = '') {
  hentikanPantau(`lpj_berkas:${berkasId}`);
  return panggil('hapusBerkas', { berkasId, alasan });
}
