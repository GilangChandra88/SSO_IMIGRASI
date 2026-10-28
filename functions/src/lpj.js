/**
 * Berkas LPJ (docs/skema-database.md §5.2 & §8): penerbitan nomor LPJ + realisasi anggaran,
 * penghapusan berkas, dan data turunan (anggotaUids, tahap, status, lpj_ringkas, riwayat).
 * Klien tidak bisa menulis field turunan maupun mengunci bagian LPJ/SPBy (firestore.rules).
 */

const { onCall } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { getStorage } = require('firebase-admin/storage');
const {
  HttpsError,
  FieldValue,
  db,
  OPSI_CALLABLE,
  KOLEKSI,
  pemanggil,
  superadmin,
  idSah,
  teksSah,
  tanggalSah,
  waktuWita,
  catatLog,
  jejakUbah,
} = require('./umum');
const { ubahRekap } = require('./rekap');
const { perjadin, transaksiDari, totalVerifikasiDari, masukDrppDari } = require('./hitungBerkas');

const SUB ={ keuangan: 'keuangan', riwayat: 'riwayat', bukti: 'bukti' };
const DOK_KEUANGAN = 'status';
const BAGIAN = { perjadin: ['sp', 'tte', 'spd', 'lpj', 'laporan'], nonperjadin: ['spby', 'lampiran'] };
const LABEL_KUNCI = {
  sp: 'Surat Perintah ditetapkan final',
  tte: 'Scan & nomor Surat Perintah (TTE) tersimpan',
  spd: 'SPD ditetapkan final',
  lpj: 'LPJ & SPBy selesai',
  laporan: 'Laporan Kegiatan selesai — berkas selesai',
  spby: 'SPBy & Rincian Bayar selesai',
  lampiran: 'Lampiran selesai — berkas selesai',
};
const TAHAP_KEUANGAN = [
  ['verifikasi', 'Verifikasi selesai'],
  ['sakti', 'Upload SAKTI selesai'],
  ['transfer', 'Bukti transfer Bendahara tersimpan'],
  ['arsip', 'Berkas diarsipkan'],
];

const berkasRef = (id) => db.collection(KOLEKSI.lpjBerkas).doc(id);
const keuanganRef = (id) => berkasRef(id).collection(SUB.keuangan).doc(DOK_KEUANGAN);
const pelaksanaDari = (d) => (perjadin(d) ? d.sp?.kepada : d.spby?.pelaksana) || [];
const makDari = (d) => (perjadin(d) ? d.spd?.mak : d.spby?.mak) || {};
const tanggalSpbyDari = (d) => (perjadin(d) ? d.lpj?.tanggalLpj : d.spby?.tanggal) || '';
const terkunci = (d, b) => d?.[b]?.terkunci === true;

/** Tahap berkas: draft → verif → sakti → transfer → arsip → drpp (menunggu DRPP) → selesai. */
function tahapDari(d, k) {
  if (!d.nomorLpj) return 'draft';
  if (!k.verifikasi?.selesai) return 'verif';
  if (!k.sakti?.selesai) return 'sakti';
  if (!k.transfer?.selesai) return 'transfer';
  if (!k.arsip?.selesai) return 'arsip';
  return k.arsip?.drppId ? 'selesai' : 'drpp';
}

const statusDari = (d) => (terkunci(d, perjadin(d) ? 'laporan' : 'lampiran') ? 'selesai' : 'draft');

function progresDari(d) {
  const daftar = BAGIAN[perjadin(d) ? 'perjadin' : 'nonperjadin'];
  return { selesai: daftar.filter((b) => terkunci(d, b)).length, total: daftar.length };
}

/** Akun yang boleh membuka berkas: pembuat + pelaksana yang punya akun (dari pegawai_ringkas). */
async function anggotaDari(d) {
  const ids = [...new Set(pelaksanaDari(d).map((o) => o?.pegawaiId).filter((x) => typeof x === 'string' && x))];
  const refs = ids.slice(0, 100).map((id) => db.collection(KOLEKSI.pegawaiRingkas).doc(id));
  const snaps = refs.length ? await db.getAll(...refs) : [];
  const uids = snaps.map((s) => (s.exists ? s.get('authUid') : '')).filter(Boolean);
  return [...new Set([d.dibuatOleh, ...uids].filter(Boolean))];
}

async function namaAkun(uid) {
  if (!uid) return '';
  const q = await db.collection(KOLEKSI.pegawaiRingkas).where('authUid', '==', uid).limit(1).get();
  return q.empty ? '' : q.docs[0].get('nama') || '';
}

const samaDaftar = (a = [], b = []) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Hitung ulang field turunan berkas (+ ringkasan & riwayat). Dipanggil kedua pemicu; menulis
 * dokumen berkas hanya bila ada yang berubah, sehingga pemicu berhenti di putaran kedua.
 */
async function segarkanBerkas(id, d, k, riwayatBaru = [], oleh = '') {
  const anggotaUids = await anggotaDari(d);
  const tahap = tahapDari(d, k);
  const status = statusDari(d);
  const batch = db.batch();

  if (!samaDaftar(d.anggotaUids, anggotaUids) || d.tahap !== tahap || d.status !== status) {
    batch.update(berkasRef(id), { anggotaUids, tahap, status });
  }

  let aktivitasTerakhir = null;
  if (riwayatBaru.length) {
    const olehNama = await namaAkun(oleh);
    riwayatBaru.forEach(({ kode, teks }) => {
      batch.create(berkasRef(id).collection(SUB.riwayat).doc(), {
        kode,
        teks,
        oleh,
        olehNama,
        pada: FieldValue.serverTimestamp(),
      });
    });
    const akhir = riwayatBaru[riwayatBaru.length - 1];
    aktivitasTerakhir = { teks: akhir.teks, oleh, olehNama, pada: FieldValue.serverTimestamp() };
  }

  const pelaksana = pelaksanaDari(d).map((o) => ({ pegawaiId: o?.pegawaiId || '', nama: o?.nama || '' }));
  batch.set(
    db.collection(KOLEKSI.lpjRingkas).doc(id),
    {
      tahunAnggaran: d.tahunAnggaran || 0,
      jenis: d.jenis || '',
      uraian: d.uraian || '',
      tahap,
      status,
      nomorLpj: d.nomorLpj || null,
      tanggalLpj: tanggalSpbyDari(d),
      total: transaksiDari(d).reduce((s, t) => s + (Number.isInteger(t?.jumlah) ? t.jumlah : 0), 0),
      pelaksana,
      anggotaUids,
      progres: progresDari(d),
      adaIsian: (Number(d.versi) || 0) > 1, // pernah disunting sejak dibuat (Baru vs Draft)
      keuangan: {
        verifikasi: k.verifikasi?.selesai === true,
        sakti: k.sakti?.selesai === true,
        transfer: k.transfer?.selesai === true,
        arsip: k.arsip?.selesai === true,
        drppId: k.arsip?.drppId || null,
        nomorKwitansi: k.sakti?.nomorKwitansi || '',
        // Total setelah koreksi Keuangan (null sebelum verifikasi selesai)
        totalVerifikasi: k.verifikasi?.selesai ? totalVerifikasiDari(d, k) : null,
        tanggalArsip: k.arsip?.tanggalArsip || '',
      },
      dibuatOleh: d.dibuatOleh || '',
      dibuatPada: d.dibuatPada || FieldValue.serverTimestamp(),
      diubahPada: FieldValue.serverTimestamp(),
      ...(aktivitasTerakhir ? { aktivitasTerakhir } : {}),
    },
    { merge: true },
  );
  await batch.commit();
}

/** Riwayat dari perubahan dokumen berkas (dibuat, bagian dikunci, nomor terbit). */
function riwayatBerkas(sebelum, sesudah) {
  if (!sebelum) return [{ kode: 'dibuat', teks: `Berkas dibuat: "${sesudah.uraian || ''}"` }];
  const hasil = [];
  BAGIAN[perjadin(sesudah) ? 'perjadin' : 'nonperjadin'].forEach((b) => {
    if (!terkunci(sebelum, b) && terkunci(sesudah, b)) hasil.push({ kode: `kunci_${b}`, teks: LABEL_KUNCI[b] });
  });
  if (!sebelum.nomorLpj && sesudah.nomorLpj) {
    hasil.push({ kode: 'nomor', teks: `Nomor LPJ ${sesudah.nomorLpj} terbit` });
  }
  return hasil;
}

/**
 * Sidik isi berkas yang memengaruhi ringkasan & anggota. Field turunan tulisan Function sendiri
 * (anggotaUids, tahap, status) sengaja tidak ikut, sehingga putaran kedua pemicu berhenti.
 */
const sidikRingkas = (d) =>
  JSON.stringify([
    d.uraian,
    d.tahunAnggaran,
    d.jenis,
    d.nomorLpj || null,
    tanggalSpbyDari(d),
    transaksiDari(d).map((t) => t?.jumlah),
    pelaksanaDari(d).map((o) => [o?.pegawaiId, o?.nama]),
    progresDari(d).selesai,
    (Number(d.versi) || 0) > 1,
  ]);

// ─── Pemicu ───────────────────────────────────────────────────────────────────

exports.diBerkasDitulis = onDocumentWritten(`${KOLEKSI.lpjBerkas}/{berkasId}`, async (event) => {
  const id = event.params.berkasId;
  const sebelum = event.data?.before?.exists ? event.data.before.data() : null;
  const sesudah = event.data?.after?.exists ? event.data.after.data() : null;
  if (!sesudah) {
    await db.collection(KOLEKSI.lpjRingkas).doc(id).delete();
    return;
  }
  const riwayat = riwayatBerkas(sebelum, sesudah);
  // Simpan otomatis yang tidak mengubah ringkasan (mis. mengetik "Menimbang") selesai tanpa
  // baca/tulis apa pun: form menyimpan tiap beberapa detik, jadi ini penghemat biaya utama.
  if (sebelum && !riwayat.length && sidikRingkas(sebelum) === sidikRingkas(sesudah)) return;
  const k = (await keuanganRef(id).get()).data() || {};
  const oleh = sesudah.diubahOleh || sesudah.dibuatOleh || '';
  if (!terkunci(sebelum, 'tte') && terkunci(sesudah, 'tte')) await catatNomorSrikandi(id, sesudah);
  await segarkanBerkas(id, sesudah, k, riwayat, oleh);
});

/**
 * Nomor Surat Perintah ber-TTE (terbit di Srikandi, bukan penghitung kantor) dicatat ke register
 * surat sekali saja: ID tetap per berkas, jadi pemicu yang terkirim ulang tidak menggandakannya.
 * `nomorUrut` = urutan pencatatan per tahun (`sistem_penghitung/srikandi_{tahun}`) untuk Riwayat.
 */
async function catatNomorSrikandi(id, d) {
  const nomor = String(d.tte?.nomorSurat || '').trim();
  if (!nomor) return;
  const tanggal = tanggalSah(d.tte?.tanggalSurat) ? d.tte.tanggalSurat : '';
  const tahun = Number(tanggal.slice(0, 4)) || Number(d.tahunAnggaran) || Number(waktuWita().tahun);
  const kepada = (d.sp?.kepada || []).map((o) => o?.nama).filter(Boolean);
  const tujuan = kepada.length > 1 ? `${kepada[0]} dkk. (${kepada.length} orang)` : kepada[0] || '';
  const ref = db.collection(KOLEKSI.suratNomor).doc(`sp_${id}`);
  const hitungRef = db.collection(KOLEKSI.sistemPenghitung).doc(`srikandi_${tahun}`);
  const oleh = d.diubahOleh || d.dibuatOleh || '';
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const hitung = await tx.get(hitungRef);
    const urut = (hitung.exists ? Number(hitung.get('nilai')) || 0 : 0) + 1;
    tx.set(hitungRef, { nilai: urut, diubahPada: FieldValue.serverTimestamp() });
    tx.create(ref, {
      nomor,
      nomorUrut: urut,
      tahun,
      tanggal,
      sumber: 'srikandi',
      jenisSurat: 'Surat Perintah',
      kode: [],
      perihal: String(d.uraian || '').slice(0, 300),
      tujuan: tujuan.slice(0, 200),
      seksi: '',
      berkasId: id,
      status: 'aktif',
      dibuatPada: FieldValue.serverTimestamp(),
      dibuatOleh: oleh,
      ...jejakUbah(oleh),
    });
  });
}

/**
 * `lpj_drpp/{drppId}.masuk.{berkasId}` mengikuti `arsip.drppId` berkas (progres & total DRPP
 * tanpa membaca berkasnya). Keadaan dibaca ulang dari dokumen keuangan saat ini, bukan dari data
 * pemicu, sehingga pemicu yang terulang atau berjalan tidak berurutan tetap berakhir benar.
 */
async function segarkanMasukDrpp(id, d, drppIds) {
  const ids = [...new Set(drppIds.filter(Boolean))];
  if (!ids.length) return;
  const k = (await keuanganRef(id).get()).data() || {};
  await Promise.all(
    ids.map((drppId) =>
      db
        .collection(KOLEKSI.lpjDrpp)
        .doc(drppId)
        .update({
          [`masuk.${id}`]: k.arsip?.drppId === drppId ? masukDrppDari(d, k) : FieldValue.delete(),
        })
        .catch((err) => {
          if (err.code !== 5) throw err; // NOT_FOUND: DRPP tidak ada
        }),
    ),
  );
}

exports.diKeuanganDitulis = onDocumentWritten(
  `${KOLEKSI.lpjBerkas}/{berkasId}/${SUB.keuangan}/{dok}`,
  async (event) => {
    const id = event.params.berkasId;
    const berkas = await berkasRef(id).get();
    if (!berkas.exists) return;
    const d = berkas.data();
    const sebelum = event.data?.before?.exists ? event.data.before.data() : {};
    let sesudah = event.data?.after?.exists ? event.data.after.data() : {};
    const drppLama = sebelum.arsip?.drppId || null;
    const drppBaru = sesudah.arsip?.drppId || null;
    const riwayat = TAHAP_KEUANGAN.filter(([t]) => !sebelum[t]?.selesai && sesudah[t]?.selesai).map(
      ([t, teks]) => ({ kode: `keuangan_${t}`, teks }),
    );
    if (sebelum.arsip?.selesai && !sesudah.arsip?.selesai) {
      riwayat.push({ kode: 'keuangan_arsip_batal', teks: 'Arsip dibatalkan Super Admin' });
    }
    if (drppLama && drppLama !== drppBaru) {
      riwayat.push({ kode: 'drpp_keluar', teks: `Keluar dari ${drppLama}` });
    }
    if (drppBaru && drppLama !== drppBaru) {
      riwayat.push({ kode: 'drpp', teks: `Masuk ${drppBaru}` });
    }
    // Berkas yang baru diarsipkan masuk DRPP yang mencantumkannya (daftar buatDrpp). Tulisan ini
    // memicu putaran berikutnya yang mencatat riwayat "Masuk DRPP-…" dan mengisi `masuk` DRPP;
    // ringkasan putaran ini langsung memakai tautan barunya supaya tahapnya tidak mundur.
    if (!sebelum.arsip?.selesai && sesudah.arsip?.selesai && !sesudah.arsip?.drppId) {
      const q = await db
        .collection(KOLEKSI.lpjDrpp)
        .where('berkasIds', 'array-contains', id)
        .limit(1)
        .get();
      if (!q.empty) {
        await keuanganRef(id).update({
          'arsip.drppId': q.docs[0].id,
          ...jejakUbah(sesudah.diubahOleh || ''),
        });
        sesudah = { ...sesudah, arsip: { ...sesudah.arsip, drppId: q.docs[0].id } };
      }
    }
    if (
      drppLama !== drppBaru ||
      (drppBaru && totalVerifikasiDari(d, sebelum) !== totalVerifikasiDari(d, sesudah))
    ) {
      await segarkanMasukDrpp(id, d, [drppLama, drppBaru]);
    }
    await segarkanBerkas(id, d, sesudah, riwayat, sesudah.diubahOleh || '');
  },
);

// ─── Selesaikan SPBy: kunci + nomor LPJ + realisasi (satu transaksi) ─────────

function wajib(kondisi, pesan) {
  if (!kondisi) throw new HttpsError('failed-precondition', pesan);
}

/**
 * Menyelesaikan fase "LPJ & SPBy" (Perjadin) atau "SPBy & Rincian Bayar" (Non-Perjadin):
 * memvalidasi isian di server, mengunci bagian itu, menerbitkan nomor LPJ-TAHUN-BULAN-NNNN,
 * dan mencatat realisasi per baris transaksi ke mak_realisasi. Masukan: { berkasId }.
 */
exports.selesaikanSpby = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  const berkasId = idSah(req.data?.berkasId, 'ID berkas');
  const ref = berkasRef(berkasId);

  const nomor = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Berkas tidak ditemukan.');
    const d = snap.data();
    if (!(d.anggotaUids || []).includes(p.uid)) {
      throw new HttpsError('permission-denied', 'Anda bukan pembuat atau pelaksana berkas ini.');
    }
    if (d.nomorLpj) throw new HttpsError('already-exists', 'Nomor LPJ berkas ini sudah terbit.');

    const bagian = perjadin(d) ? 'lpj' : 'spby';
    if (perjadin(d)) wajib(terkunci(d, 'spd'), 'SPD belum ditetapkan final.');
    wajib(!terkunci(d, bagian), 'Bagian ini sudah selesai.');
    const tanggal = tanggalSpbyDari(d);
    wajib(tanggalSah(tanggal), perjadin(d) ? 'Tanggal LPJ wajib diisi.' : 'Tanggal SPBy wajib diisi.');

    const idPelaksana = new Set(pelaksanaDari(d).map((o) => o?.pegawaiId).filter(Boolean));
    wajib(idPelaksana.size > 0, 'Pelaksana belum diisi.');
    const mak = makDari(d);
    wajib(typeof mak.akunNodeId === 'string' && mak.akunNodeId, 'Akun MAK belum dipilih.');

    const transaksi = transaksiDari(d);
    wajib(transaksi.length > 0 && transaksi.length <= 100, 'Detail transaksi wajib diisi (1–100 baris).');
    const barisIds = new Set();
    transaksi.forEach((t, i) => {
      const no = `Baris transaksi ${i + 1}`;
      wajib(typeof t?.barisId === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(t.barisId), `${no}: ID baris tidak sah.`);
      wajib(!barisIds.has(t.barisId), `${no}: ID baris ganda.`);
      barisIds.add(t.barisId);
      wajib(idPelaksana.has(t.pelaksanaId), `${no}: pelaksana tidak terdaftar di berkas.`);
      wajib(typeof t.itemNodeId === 'string' && t.itemNodeId, `${no}: item MAK belum dipilih.`);
      wajib(Number.isInteger(t.jumlah) && t.jumlah > 0 && t.jumlah <= 1e12, `${no}: jumlah tidak sah.`);
    });

    // Item MAK harus ada, berada di bawah Akun terpilih, dan tahun anggarannya sama dengan berkas
    const itemIds = [...new Set(transaksi.map((t) => t.itemNodeId))];
    const nodeSnaps = await tx.getAll(...itemIds.map((id) => db.collection(KOLEKSI.makNode).doc(id)));
    const nodes = Object.fromEntries(nodeSnaps.map((s) => [s.id, s.exists ? s.data() : null]));
    itemIds.forEach((id) => {
      const n = nodes[id];
      wajib(n && n.tingkat === 'item' && n.aktif !== false, 'Ada item MAK yang tidak ditemukan atau nonaktif.');
      wajib(n.indukId === mak.akunNodeId, 'Ada item MAK yang tidak berada di bawah Akun terpilih.');
      wajib(n.tahunAnggaran === d.tahunAnggaran, 'Tahun anggaran item MAK berbeda dengan berkas.');
    });

    const waktu = waktuWita();
    const penghitungRef = db.collection(KOLEKSI.sistemPenghitung).doc(`lpj_${waktu.tahun}`);
    const penghitung = await tx.get(penghitungRef);
    const urut = (penghitung.exists ? Number(penghitung.get('nilai')) || 0 : 0) + 1;
    const nomorLpj = `LPJ-${waktu.tahun}-${waktu.bulan}-${String(urut).padStart(4, '0')}`;
    const nomorRef = db.collection(KOLEKSI.lpjNomor).doc(nomorLpj);
    if ((await tx.get(nomorRef)).exists) throw new HttpsError('aborted', 'Nomor bentrok, coba lagi.');

    tx.set(penghitungRef, { nilai: urut, diubahPada: FieldValue.serverTimestamp() });
    tx.create(nomorRef, { berkasId, dibuatPada: FieldValue.serverTimestamp() });
    tx.update(ref, {
      [`${bagian}.terkunci`]: true,
      nomorLpj,
      nomorLpjPada: FieldValue.serverTimestamp(),
      realisasiTercatat: true,
      versi: (Number(d.versi) || 0) + 1,
      ...jejakUbah(p.uid),
    });
    const [tahun, bulan] = tanggal.split('-').map(Number);
    transaksi.forEach((t) => {
      const n = nodes[t.itemNodeId];
      tx.set(db.collection(KOLEKSI.makRealisasi).doc(`${berkasId}_${t.barisId}`), {
        tahunAnggaran: d.tahunAnggaran,
        tahun,
        bulan,
        tanggal,
        itemNodeId: t.itemNodeId,
        akunNodeId: mak.akunNodeId,
        berkasId,
        nomorLpj,
        jenis: d.jenis,
        jumlah: t.jumlah,
        pelaksanaId: t.pelaksanaId,
        status: 'aktif',
        alasanBatal: '',
        salinan: { makKode: mak.kode || '', itemKode: n.kode || '', itemNama: n.nama || '', uraian: d.uraian || '' },
        dibuatPada: FieldValue.serverTimestamp(),
        dibuatOleh: p.uid,
        ...jejakUbah(p.uid),
      });
    });
    ubahRekap(
      tx,
      transaksi.map((t) => ({ tahunAnggaran: d.tahunAnggaran, itemNodeId: t.itemNodeId, bulan, jumlah: t.jumlah })),
    );
    catatLog(tx, { modul: 'lpj', aksi: 'selesaikanSpby', target: ref.path, nilaiBaru: { nomorLpj }, oleh: p.uid });
    return nomorLpj;
  });

  return { nomorLpj: nomor };
});

// ─── Hapus berkas ─────────────────────────────────────────────────────────────

/**
 * Menghapus berkas beserta subkoleksi, ringkasan, dan folder Storage-nya.
 * - Belum bernomor: pembuat berkas atau Super Admin.
 * - Sudah bernomor: hanya Super Admin, wajib alasan, dan belum diarsip; realisasi dibatalkan
 *   (bukan dihapus) dan nomor LPJ tidak dipakai ulang.
 * Masukan: { berkasId, alasan? }.
 */
exports.hapusBerkas = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  const berkasId = idSah(req.data?.berkasId, 'ID berkas');
  const ref = berkasRef(berkasId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Berkas tidak ditemukan.');
  const d = snap.data();
  let alasan = '';

  if (!d.nomorLpj) {
    if (d.dibuatOleh !== p.uid && !superadmin(p)) {
      throw new HttpsError('permission-denied', 'Hanya pembuat berkas yang bisa menghapusnya.');
    }
  } else {
    if (!superadmin(p)) {
      throw new HttpsError('permission-denied', 'Berkas bernomor hanya bisa dihapus Super Admin.');
    }
    alasan = teksSah(req.data?.alasan, 300, 'Alasan');
    const k = (await keuanganRef(berkasId).get()).data() || {};
    wajib(!k.arsip?.selesai, 'Berkas yang sudah diarsip tidak bisa dihapus.');
    // Realisasi yang masih aktif dibatalkan dan dikurangkan dari rekap dalam satu transaksi
    await db.runTransaction(async (tx) => {
      const realisasi = await tx.get(db.collection(KOLEKSI.makRealisasi).where('berkasId', '==', berkasId));
      const aktif = realisasi.docs.filter((r) => r.get('status') === 'aktif');
      aktif.forEach((r) =>
        tx.update(r.ref, {
          status: 'batal',
          alasanBatal: `Berkas dihapus: ${alasan}`,
          dibatalkanPada: FieldValue.serverTimestamp(),
          dibatalkanOleh: p.uid,
          ...jejakUbah(p.uid),
        }),
      );
      ubahRekap(
        tx,
        aktif.map((r) => ({
          tahunAnggaran: r.get('tahunAnggaran'),
          itemNodeId: r.get('itemNodeId'),
          bulan: r.get('bulan'),
          jumlah: -r.get('jumlah'),
        })),
      );
    });
  }

  await catatLog(null, {
    modul: 'lpj',
    aksi: 'hapusBerkas',
    target: ref.path,
    nilaiLama: { nomorLpj: d.nomorLpj || null, uraian: d.uraian || '' },
    alasan,
    oleh: p.uid,
  });
  await db.recursiveDelete(ref);
  await db.collection(KOLEKSI.lpjRingkas).doc(berkasId).delete();
  try {
    await getStorage().bucket().deleteFiles({ prefix: `lpj/${berkasId}/` });
  } catch {
    // Berkas Storage gagal dihapus (mis. izin bucket belum diberikan): data Firestore sudah terhapus.
    await catatLog(null, {
      modul: 'lpj',
      aksi: 'hapusBerkasStorageGagal',
      target: `lpj/${berkasId}/`,
      oleh: p.uid,
    });
  }
  return { terhapus: true };
});
