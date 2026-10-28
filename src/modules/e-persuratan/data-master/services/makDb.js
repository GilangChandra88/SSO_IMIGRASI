/**
 * Akses Firestore & Cloud Functions MAK (docs/skema-database.md §5.3). Pohon `mak_node` dan DIPA
 * ditulis Keuangan (rules memeriksa bentuk data dan tahun yang masih terbuka). Hapus node,
 * Batal/Pulihkan realisasi, dan rekap realisasi hanya lewat Function.
 */

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';
import { keRupiah } from '@/utils/nilai';

const kolNode = () => collection(db, KOLEKSI.makNode);
export const idNodeBaru = () => doc(kolNode()).id;

const jejakBuat = (uid) => ({
  dibuatPada: serverTimestamp(),
  dibuatOleh: uid,
  diubahPada: serverTimestamp(),
  diubahOleh: uid,
});
const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });

/** Dokumen node baru dengan semua field yang diwajibkan rules. */
function dataNodeBaru({ tahunAnggaran, tingkat, kode, nama, indukId, pagu }, uid) {
  return {
    tahunAnggaran,
    tingkat,
    kode: String(kode || '').trim(),
    nama: String(nama || '').trim(),
    indukId: tingkat === 'tahun' ? null : indukId,
    pagu: tingkat === 'item' ? keRupiah(pagu) : 0,
    aktif: true,
    urutan: 0,
    ...jejakBuat(uid),
  };
}

export const tambahNode = (data, uid) => setDoc(doc(kolNode()), dataNodeBaru(data, uid));

/** Ubah kode/nama (+ pagu untuk Item, + status aktif). Tingkat, induk, dan tahun tetap. */
export const ubahNode = (id, { tingkat, kode, nama, pagu, aktif }, uid) =>
  updateDoc(doc(kolNode(), id), {
    kode: String(kode || '').trim(),
    nama: String(nama || '').trim(),
    ...(tingkat === 'item' ? { pagu: keRupiah(pagu) } : {}),
    ...(typeof aktif === 'boolean' ? { aktif } : {}),
    ...jejakUbah(uid),
  });

const BATAS_BATCH = 450;

async function tulisBertahap(ops) {
  for (let i = 0; i < ops.length; i += BATAS_BATCH) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATAS_BATCH).forEach((op) => op(batch));
    await batch.commit();
  }
}

/** Apakah tahun anggaran sudah punya pohon MAK (membaca 1 dokumen). */
export async function tahunSudahAda(tahun) {
  const snap = await getDocs(query(kolNode(), where('tahunAnggaran', '==', tahun), limit(1)));
  return !snap.empty;
}

/** Simpan hasil rencanaImportCsv: node baru + perubahan pagu. */
export function simpanImport({ baru, ubahPagu }, uid) {
  return tulisBertahap([
    ...baru.map(
      ({ id, ...n }) =>
        (b) =>
          b.set(doc(kolNode(), id), dataNodeBaru(n, uid)),
    ),
    ...ubahPagu.map(
      ([id, pagu]) =>
        (b) =>
          b.update(doc(kolNode(), id), { pagu, ...jejakUbah(uid) }),
    ),
  ]);
}

/**
 * Salin pohon AKTIF satu tahun ke tahun anggaran baru (node baru, pagu ikut). Cabang di bawah node
 * nonaktif tidak ikut. Tahun tujuan harus masih kosong.
 * @returns {Promise<number>} jumlah node yang dibuat
 */
export async function salinTahun(nodes, keTahun, uid) {
  if (await tahunSudahAda(keTahun)) {
    throw Object.assign(new Error('tahun sudah ada'), {
      pesan: `Tahun ${keTahun} sudah punya struktur MAK.`,
    });
  }
  const anak = new Map();
  nodes
    .filter((n) => n.aktif !== false)
    .forEach((n) => {
      const k = n.indukId ?? null;
      if (!anak.has(k)) anak.set(k, []);
      anak.get(k).push(n);
    });
  const ops = [];
  const antre = (anak.get(null) || [])
    .filter((n) => n.tingkat === 'tahun')
    .map((n) => ({ n, indukBaru: null }));
  while (antre.length) {
    const { n, indukBaru } = antre.shift();
    const id = idNodeBaru();
    const data = dataNodeBaru(
      {
        tahunAnggaran: keTahun,
        tingkat: n.tingkat,
        kode: n.kode,
        nama: n.tingkat === 'tahun' ? String(keTahun) : n.nama,
        indukId: indukBaru,
        pagu: n.pagu,
      },
      uid,
    );
    ops.push((b) => b.set(doc(kolNode(), id), data));
    (anak.get(n.id) || []).forEach((c) => antre.push({ n: c, indukBaru: id }));
  }
  await tulisBertahap(ops);
  return ops.length;
}

/** Simpan DIPA tahun anggaran (dokumen `mak_dipa/{tahun}`). */
export function simpanDipa(tahun, { nomor, tanggal, tahunNodeId }, uid, sudahAda) {
  return setDoc(
    doc(db, KOLEKSI.makDipa, String(tahun)),
    {
      tahunAnggaran: tahun,
      nomor: nomor.trim(),
      tanggal,
      tahunNodeId,
      ...(sudahAda ? jejakUbah(uid) : jejakBuat(uid)),
    },
    { merge: true },
  );
}

// ─── Realisasi (ditulis Function; dibaca Keuangan/Super Admin) ───────────────

/** 100 realisasi terbaru per halaman untuk satu tahun anggaran (+ bulan). */
export function kueriRealisasi({ tahunAnggaran, bulan = 0, setelah = null }) {
  const syarat = [where('tahunAnggaran', '==', tahunAnggaran)];
  if (bulan) syarat.push(where('bulan', '==', bulan));
  return query(
    collection(db, KOLEKSI.makRealisasi),
    ...syarat,
    orderBy('dibuatPada', 'desc'),
    ...(setelah ? [startAfter(setelah)] : []),
    limit(LIMIT_KUERI.realisasi),
  );
}

export async function ambilRealisasiBerikutnya(opsi, setelah) {
  const snap = await getDocs(kueriRealisasi({ ...opsi, setelah }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Cloud Functions ────────────────────────────────────────────────────────

const panggil = (nama, data) => httpsCallable(functions, nama)(data).then((hasil) => hasil.data);

/**
 * Hapus node + turunannya; bila sudah dipakai realisasi, node dinonaktifkan oleh server.
 * @returns {Promise<{ dihapus?: number, dinonaktifkan?: number }>}
 */
export const hapusNodeMak = (nodeId) => panggil('hapusNodeMak', { nodeId });
export const batalkanRealisasi = (realisasiId, alasan) =>
  panggil('batalkanRealisasi', { realisasiId, alasan });
export const pulihkanRealisasi = (realisasiId) => panggil('pulihkanRealisasi', { realisasiId });
