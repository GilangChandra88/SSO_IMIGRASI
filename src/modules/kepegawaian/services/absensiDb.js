/**
 * Rekap absensi mesin (docs/skema-database.md §5.1). `pegawai_absensi/{id}` = satu rekapan,
 * subkoleksi `impor` = satu dokumen per berkas CSV (peta No. → { nama, waktu }), dan
 * subkoleksi `koreksi` = penyesuaian jam manual per baris & tanggal, dan `pegawai_no_absen/{no}` =
 * pemetaan No. mesin → pegawai untuk semua rekapan. Hanya Kepegawaian (+ Super Admin). Rekapan,
 * impor, dan koreksi tidak dihapus, melainkan dibatalkan/dinonaktifkan.
 */
import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { KOLEKSI, SUBKOLEKSI_ABSENSI } from '@/config/koleksi';
import { LIMIT_KUERI } from '@/utils/batas';

const jejakUbah = (uid) => ({ diubahPada: serverTimestamp(), diubahOleh: uid });
const jejakBuat = (uid) => ({ dibuatPada: serverTimestamp(), dibuatOleh: uid, ...jejakUbah(uid) });

const refRekap = (id) => doc(db, KOLEKSI.pegawaiAbsensi, id);
const koleksiImpor = (id) => collection(db, KOLEKSI.pegawaiAbsensi, id, SUBKOLEKSI_ABSENSI.impor);
const koleksiKoreksi = (id) =>
  collection(db, KOLEKSI.pegawaiAbsensi, id, SUBKOLEKSI_ABSENSI.koreksi);

/** Daftar rekapan (termasuk yang batal; disaring di tampilan), terbaru dulu. */
export const kueriRekapAbsensi = () =>
  query(
    collection(db, KOLEKSI.pegawaiAbsensi),
    orderBy('dibuatPada', 'desc'),
    limit(LIMIT_KUERI.rekapAbsensi),
  );

/** Semua impor satu rekapan, urut lama → baru (urutan penggabungan). */
export const kueriImporAbsensi = (rekapId) =>
  query(koleksiImpor(rekapId), orderBy('dibuatPada', 'asc'), limit(LIMIT_KUERI.imporAbsensi));

export const kueriNoAbsen = () =>
  query(collection(db, KOLEKSI.pegawaiNoAbsen), limit(LIMIT_KUERI.noAbsen));

/** Koreksi jam satu bulan ('YYYY-MM') dalam satu rekapan; rentang satu field, tanpa indeks komposit. */
export const kueriKoreksiAbsensi = (rekapId, bulan) =>
  query(
    koleksiKoreksi(rekapId),
    where('tanggal', '>=', `${bulan}-01`),
    where('tanggal', '<=', `${bulan}-31`),
    limit(LIMIT_KUERI.koreksiAbsensi),
  );

/**
 * Simpan penyesuaian jam satu baris pada satu tanggal (ID `{baris}_{tanggal}`). Ada-tidaknya
 * dokumen dibaca di dalam transaksi, supaya buat/ubah tidak bergantung pada data di layar.
 * @param {{ baris: string, tanggal: string, masuk: string, pulang: string, alasan: string }} k
 */
export function simpanKoreksiAbsensi(rekapId, k, uid) {
  const ref = doc(koleksiKoreksi(rekapId), `${k.baris}_${k.tanggal}`);
  const isi = {
    baris: k.baris,
    tanggal: k.tanggal,
    masuk: k.masuk,
    pulang: k.pulang,
    alasan: k.alasan,
    aktif: true,
  };
  return runTransaction(db, async (tx) => {
    const ada = await tx.get(ref);
    if (ada.exists()) tx.update(ref, { ...isi, ...jejakUbah(uid) });
    else tx.set(ref, { ...isi, ...jejakBuat(uid) });
  });
}

/** Kembalikan sel ke jam dari mesin (koreksi dinonaktifkan, tidak dihapus). */
export const kembalikanKoreksiAbsensi = (rekapId, koreksiId, uid) =>
  updateDoc(doc(koleksiKoreksi(rekapId), koreksiId), { aktif: false, ...jejakUbah(uid) });

/** Buat rekapan baru (belum ada impor) → id. */
export async function buatRekapAbsensi({ nama, keterangan }, uid) {
  const ref = doc(collection(db, KOLEKSI.pegawaiAbsensi));
  await setDoc(ref, {
    nama,
    keterangan,
    jumlahImpor: 0,
    dari: '',
    sampai: '',
    aktif: true,
    alasanBatal: '',
    ...jejakBuat(uid),
  });
  return ref.id;
}

export const ubahRekapAbsensi = (id, { nama, keterangan }, uid) =>
  updateDoc(refRekap(id), { nama, keterangan, ...jejakUbah(uid) });

export const batalkanRekapAbsensi = (id, alasan, uid) =>
  updateDoc(refRekap(id), { aktif: false, alasanBatal: alasan, ...jejakUbah(uid) });

/**
 * Tulis perubahan pemetaan No. ke batch.
 * @param {{ no: string, pegawaiId: string, namaMesin: string, baru: boolean }[]} perubahan
 */
function tulisNoAbsen(batch, perubahan, uid) {
  perubahan.forEach((x) => {
    const ref = doc(db, KOLEKSI.pegawaiNoAbsen, x.no);
    const isi = { pegawaiId: x.pegawaiId, namaMesin: x.namaMesin };
    if (x.baru) batch.set(ref, { no: Number(x.no), ...isi, ...jejakBuat(uid) });
    else batch.update(ref, { ...isi, ...jejakUbah(uid) });
  });
}

/** Simpan perubahan pemetaan No. (dipecah per 400 tulisan; batas batch Firestore 500). */
export async function simpanNoAbsen(perubahan, uid) {
  for (let i = 0; i < perubahan.length; i += 400) {
    const batch = writeBatch(db);
    tulisNoAbsen(batch, perubahan.slice(i, i + 400), uid);
    await batch.commit();
  }
}

/**
 * Simpan satu impor, ringkasan rekapan (jumlah impor aktif & rentang tanggal), dan pemetaan No.
 * yang baru/berubah dalam satu batch.
 */
export async function simpanImporAbsensi({ rekapId, impor, ringkasan, noAbsen }, uid) {
  const batch = writeBatch(db);
  batch.set(doc(koleksiImpor(rekapId)), {
    namaBerkas: impor.namaBerkas,
    jumlahBaris: impor.jumlahBaris,
    jumlahPindaian: impor.jumlahPindaian,
    dari: impor.dari,
    sampai: impor.sampai,
    pindaian: impor.pindaian,
    aktif: true,
    alasanBatal: '',
    ...jejakBuat(uid),
  });
  batch.update(refRekap(rekapId), { ...ringkasan, ...jejakUbah(uid) });
  tulisNoAbsen(batch, noAbsen, uid);
  await batch.commit();
}

/** Batalkan satu impor (pindaiannya tidak ikut digabung lagi) + perbarui ringkasan rekapan. */
export async function batalkanImporAbsensi({ rekapId, imporId, alasan, ringkasan }, uid) {
  const batch = writeBatch(db);
  batch.update(doc(koleksiImpor(rekapId), imporId), {
    aktif: false,
    alasanBatal: alasan,
    ...jejakUbah(uid),
  });
  batch.update(refRekap(rekapId), { ...ringkasan, ...jejakUbah(uid) });
  await batch.commit();
}
