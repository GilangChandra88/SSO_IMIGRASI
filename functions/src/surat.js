/**
 * Persuratan (docs/skema-database.md §5.4): nomor surat hanya diterbitkan Function supaya tidak
 * ganda atau mundur. Nomor = kode tiap tingkat (`surat_kode`, KOP → Kode surat 3) digabung titik
 * + "-" + nomor urut 4 digit. Nomor urut mulai ulang tiap tahun (keputusan D4): penghitung
 * `sistem_penghitung/surat_{tahun}` menurut tahun tanggal surat.
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

const MAKS_TINGKAT = 4; // KOP, Kode surat 1, 2, 3
const SUMBER_PEGAWAI = ['register', 'form']; // memakai penghitung kantor

const penghitungRef = (tahun) => db.collection(KOLEKSI.sistemPenghitung).doc(`surat_${tahun}`);
const nomorDari = (kode, urut) =>
  `${kode.map((k) => k.kode).join('.')}-${String(urut).padStart(4, '0')}`;

/** Tahun yang boleh diberi nomor: tahun lalu sampai tahun depan (WITA). */
function tahunSah(tahun) {
  const kini = Number(waktuWita().tahun);
  if (!Number.isInteger(tahun) || tahun < kini - 1 || tahun > kini + 1) {
    throw new HttpsError('invalid-argument', `Tahun surat harus ${kini - 1}–${kini + 1}.`);
  }
  return tahun;
}

/**
 * Rantai kode surat dari KOP sampai tingkat terakhir: tiap node aktif, bertingkat 0, 1, 2, … dan
 * berinduk node sebelumnya; node terakhir tidak punya anak aktif. Dibaca di dalam transaksi.
 */
async function rantaiKode(tx, kodeIds) {
  if (!Array.isArray(kodeIds) || kodeIds.length < 1 || kodeIds.length > MAKS_TINGKAT) {
    throw new HttpsError('invalid-argument', 'Pilih kode surat dari KOP sampai tingkat terakhir.');
  }
  const ids = kodeIds.map((x) => idSah(x, 'Kode surat'));
  const kol = db.collection(KOLEKSI.suratKode);
  const snaps = await tx.getAll(...ids.map((id) => kol.doc(id)));
  const kode = snaps.map((s, i) => {
    const d = s.exists ? s.data() : null;
    const indukSah = i === 0 ? d?.indukId == null : d?.indukId === ids[i - 1];
    if (!d || d.aktif === false || d.tingkat !== i || !indukSah) {
      throw new HttpsError(
        'failed-precondition',
        'Kode surat tidak sah atau sudah dinonaktifkan. Muat ulang halaman lalu pilih lagi.',
      );
    }
    return { kodeId: s.id, tingkat: i, kode: d.kode, nama: d.nama };
  });
  const anak = await tx.get(kol.where('indukId', '==', ids[ids.length - 1]).limit(20));
  if (anak.docs.some((a) => a.get('aktif') !== false)) {
    throw new HttpsError('failed-precondition', 'Pilih kode surat sampai tingkat terakhir.');
  }
  return kode;
}

/**
 * Terbitkan satu nomor surat (semua pegawai aktif). Masukan: { sumber: 'register'|'form',
 * tanggal, kodeIds[], perihal, tujuan, seksi, jenisSurat }. Hasil: { id, nomor, nomorUrut }.
 */
exports.terbitkanNomorSurat = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  const d = req.data || {};
  if (!SUMBER_PEGAWAI.includes(d.sumber)) {
    throw new HttpsError('invalid-argument', 'Sumber nomor surat tidak sah.');
  }
  if (!tanggalSah(d.tanggal)) throw new HttpsError('invalid-argument', 'Tanggal surat tidak sah.');
  const sumber = d.sumber;
  const tahun = tahunSah(Number(d.tanggal.slice(0, 4)));
  const register = sumber === 'register';
  const perihal = teksSah(d.perihal, 300, 'Perihal');
  const tujuan = teksSah(d.tujuan, 200, 'Tujuan', { wajib: register });
  const seksi = teksSah(d.seksi, 60, 'Seksi', { wajib: register });
  const jenisSurat = teksSah(d.jenisSurat, 120, 'Jenis surat', { wajib: !register });
  const ref = db.collection(KOLEKSI.suratNomor).doc();

  return db.runTransaction(async (tx) => {
    const kode = await rantaiKode(tx, d.kodeIds);
    const hitung = await tx.get(penghitungRef(tahun));
    const urut = (hitung.exists ? Number(hitung.get('nilai')) || 0 : 0) + 1;
    const nomor = nomorDari(kode, urut);
    tx.set(penghitungRef(tahun), { nilai: urut, diubahPada: FieldValue.serverTimestamp() });
    tx.create(ref, {
      nomor,
      nomorUrut: urut,
      tahun,
      tanggal: d.tanggal,
      sumber,
      jenisSurat,
      kode,
      perihal,
      tujuan,
      seksi,
      berkasId: null,
      status: 'aktif',
      dibuatPada: FieldValue.serverTimestamp(),
      dibuatOleh: p.uid,
      ...jejakUbah(p.uid),
    });
    return { id: ref.id, nomor, nomorUrut: urut };
  });
});

/**
 * Atur nomor urut terakhir surat satu tahun (Keuangan/Super Admin), mis. melanjutkan nomor dari
 * sistem lama. Tidak boleh lebih kecil dari nomor yang sudah terbit di tahun itu (mencegah nomor
 * ganda). Masukan: { tahun, nilai, alasan }. Dicatat di sistem_log.
 */
exports.aturPenghitung = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'keuangan');
  const tahun = tahunSah(Number(req.data?.tahun));
  const nilai = Number(req.data?.nilai);
  if (!Number.isInteger(nilai) || nilai < 0 || nilai > 999999) {
    throw new HttpsError('invalid-argument', 'Nomor terakhir harus bilangan bulat 0–999999.');
  }
  const alasan = teksSah(req.data?.alasan, 300, 'Alasan');

  return db.runTransaction(async (tx) => {
    const ref = penghitungRef(tahun);
    const snap = await tx.get(ref);
    const terbit = await tx.get(
      db
        .collection(KOLEKSI.suratNomor)
        .where('sumber', 'in', SUMBER_PEGAWAI)
        .where('tahun', '==', tahun)
        .orderBy('nomorUrut', 'desc')
        .limit(1),
    );
    const tertinggi = terbit.empty ? 0 : Number(terbit.docs[0].get('nomorUrut')) || 0;
    if (nilai < tertinggi) {
      throw new HttpsError(
        'failed-precondition',
        `Nomor urut ${tertinggi} sudah terbit di tahun ${tahun}; nomor terakhir tidak boleh lebih kecil.`,
      );
    }
    const lama = snap.exists ? Number(snap.get('nilai')) || 0 : 0;
    tx.set(ref, { nilai, diubahPada: FieldValue.serverTimestamp() });
    catatLog(tx, {
      modul: 'surat',
      aksi: 'aturPenghitung',
      target: ref.path,
      nilaiLama: { nilai: lama },
      nilaiBaru: { nilai },
      alasan,
      oleh: p.uid,
    });
    return { nilai };
  });
});
