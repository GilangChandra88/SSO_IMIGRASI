/**
 * MAK & realisasi anggaran (docs/skema-database.md §5.3 & §8). Pohon MAK ditulis Keuangan lewat
 * rules; Function di sini menangani yang tidak boleh dari browser: menghapus node (dicek dulu
 * terhadap realisasi), membatalkan/memulihkan realisasi (Super Admin), dan jejak revisi pagu.
 */

const { onCall } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const {
  HttpsError,
  FieldValue,
  db,
  OPSI_CALLABLE,
  KOLEKSI,
  pemanggil,
  superadmin,
  wajibPeran,
  idSah,
  teksSah,
  waktuWita,
  catatLog,
  jejakUbah,
} = require('./umum');
const { ubahRekap } = require('./rekap');

const BATAS_BATCH = 450;
const BATAS_NODE = 5000;

const potong = (daftar, n) =>
  Array.from({ length: Math.ceil(daftar.length / n) }, (_, i) => daftar.slice(i * n, i * n + n));

/** Anggaran lebih dari setahun lalu hanya diubah Super Admin (sama dengan firestore.rules). */
function wajibTahunTerbuka(p, tahunAnggaran) {
  if (!(tahunAnggaran >= Number(waktuWita().tahun) - 1 || superadmin(p))) {
    throw new HttpsError(
      'permission-denied',
      'Anggaran lebih dari setahun lalu hanya bisa diubah Super Admin.',
    );
  }
}

/**
 * Hapus node MAK beserta seluruh turunannya. Bila ada Item di dalamnya yang sudah dipakai
 * realisasi, node tidak dihapus tetapi dinonaktifkan (tidak bisa dipilih lagi, riwayat tetap utuh).
 * Masukan: { nodeId }. Hasil: { dihapus } atau { dinonaktifkan } (jumlah node).
 */
exports.hapusNodeMak = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'keuangan');
  const nodeId = idSah(req.data?.nodeId, 'ID node');
  const akar = await db.collection(KOLEKSI.makNode).doc(nodeId).get();
  if (!akar.exists) throw new HttpsError('not-found', 'Node MAK tidak ditemukan.');
  wajibTahunTerbuka(p, akar.get('tahunAnggaran'));

  // Turunan dikumpulkan per tingkat lewat kueri anak (indukId unik per node)
  const semua = [akar];
  let lapis = [akar.id];
  while (lapis.length && semua.length <= BATAS_NODE) {
    const berikut = [];
    for (const ids of potong(lapis, 30)) {
      const snap = await db.collection(KOLEKSI.makNode).where('indukId', 'in', ids).get();
      snap.docs.forEach((d) => {
        semua.push(d);
        berikut.push(d.id);
      });
    }
    lapis = berikut;
  }

  const itemIds = semua.filter((d) => d.get('tingkat') === 'item').map((d) => d.id);
  let dipakai = false;
  for (const ids of potong(itemIds, 30)) {
    const q = await db.collection(KOLEKSI.makRealisasi).where('itemNodeId', 'in', ids).limit(1).get();
    if (!q.empty) {
      dipakai = true;
      break;
    }
  }

  for (const kelompok of potong(semua, BATAS_BATCH)) {
    const batch = db.batch();
    kelompok.forEach((d) =>
      dipakai ? batch.update(d.ref, { aktif: false, ...jejakUbah(p.uid) }) : batch.delete(d.ref),
    );
    await batch.commit();
  }
  await catatLog(null, {
    modul: 'mak',
    aksi: dipakai ? 'nonaktifkanNode' : 'hapusNode',
    target: akar.ref.path,
    nilaiLama: {
      kode: akar.get('kode') || '',
      nama: akar.get('nama') || '',
      jumlahNode: semua.length,
    },
    oleh: p.uid,
  });
  return dipakai ? { dinonaktifkan: semua.length } : { dihapus: semua.length };
});

/** Ubah status satu realisasi + rekapnya dalam satu transaksi. */
async function ubahStatusRealisasi(p, realisasiId, keStatus, alasan) {
  const ref = db.collection(KOLEKSI.makRealisasi).doc(realisasiId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Realisasi tidak ditemukan.');
    const r = snap.data();
    if (r.status === keStatus) {
      throw new HttpsError(
        'failed-precondition',
        keStatus === 'batal' ? 'Realisasi ini sudah dibatalkan.' : 'Realisasi ini masih aktif.',
      );
    }
    if (keStatus === 'aktif') {
      const berkas = await tx.get(db.collection(KOLEKSI.lpjBerkas).doc(r.berkasId));
      if (!berkas.exists) {
        throw new HttpsError(
          'failed-precondition',
          'Berkas LPJ realisasi ini sudah dihapus, jadi tidak bisa dipulihkan.',
        );
      }
    }
    tx.update(ref, {
      status: keStatus,
      alasanBatal: keStatus === 'batal' ? alasan : '',
      dibatalkanPada: keStatus === 'batal' ? FieldValue.serverTimestamp() : null,
      dibatalkanOleh: keStatus === 'batal' ? p.uid : '',
      ...jejakUbah(p.uid),
    });
    ubahRekap(tx, [
      {
        tahunAnggaran: r.tahunAnggaran,
        itemNodeId: r.itemNodeId,
        bulan: r.bulan,
        jumlah: keStatus === 'batal' ? -r.jumlah : r.jumlah,
      },
    ]);
    catatLog(tx, {
      modul: 'mak',
      aksi: keStatus === 'batal' ? 'batalkanRealisasi' : 'pulihkanRealisasi',
      target: ref.path,
      nilaiLama: { status: r.status },
      nilaiBaru: { status: keStatus },
      alasan,
      oleh: p.uid,
    });
  });
}

/** Batalkan realisasi (Super Admin, wajib alasan). Masukan: { realisasiId, alasan }. */
exports.batalkanRealisasi = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  if (!superadmin(p)) {
    throw new HttpsError('permission-denied', 'Hanya Super Admin yang bisa membatalkan realisasi.');
  }
  const id = idSah(req.data?.realisasiId, 'ID realisasi');
  await ubahStatusRealisasi(p, id, 'batal', teksSah(req.data?.alasan, 300, 'Alasan'));
  return { status: 'batal' };
});

/** Pulihkan realisasi yang dibatalkan (Super Admin). Masukan: { realisasiId, alasan? }. */
exports.pulihkanRealisasi = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  if (!superadmin(p)) {
    throw new HttpsError('permission-denied', 'Hanya Super Admin yang bisa memulihkan realisasi.');
  }
  const id = idSah(req.data?.realisasiId, 'ID realisasi');
  await ubahStatusRealisasi(p, id, 'aktif', teksSah(req.data?.alasan, 300, 'Alasan', { wajib: false }));
  return { status: 'aktif' };
});

/** Jejak revisi pagu Item ke sistem_log (pembuatan/penghapusan node sudah berjejak sendiri). */
exports.diMakNodeDitulis = onDocumentWritten(`${KOLEKSI.makNode}/{nodeId}`, async (event) => {
  const sebelum = event.data?.before?.exists ? event.data.before.data() : null;
  const sesudah = event.data?.after?.exists ? event.data.after.data() : null;
  if (!sebelum || !sesudah || sesudah.tingkat !== 'item' || sebelum.pagu === sesudah.pagu) return;
  await catatLog(null, {
    id: event.id, // pemicu bisa terkirim ulang: ID tetap mencegah entri ganda
    modul: 'mak',
    aksi: 'ubahPagu',
    target: `${KOLEKSI.makNode}/${event.params.nodeId}`,
    nilaiLama: { pagu: sebelum.pagu },
    nilaiBaru: { pagu: sesudah.pagu },
    oleh: sesudah.diubahOleh || '',
  });
});
