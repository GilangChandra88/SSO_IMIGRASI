/**
 * Rekap kehadiran pegawai per semester (docs/skema-database.md §5.1 & §8):
 * pegawai_kegiatan → pegawai_rekap_hadir/{tahun}-{semester}. Rekap dihitung ulang dari semua
 * kegiatan semester itu di dalam satu transaksi, jadi tetap benar walau beberapa kegiatan disimpan
 * bersamaan. Hanya kegiatan aktif yang kehadirannya sudah disimpan yang dihitung per pegawai.
 */

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { db, FieldValue, KOLEKSI } = require('./umum');

const STATUS = ['hadir', 'cuti', 'sakit', 'alpa'];

/** 'YYYY-MM-DD' → { id: '2026-2', tahun, semester, dari, sampai }; semester 1 = Januari–Juni. */
function periode(tanggal) {
  if (typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return null;
  const tahun = Number(tanggal.slice(0, 4));
  const semester = Number(tanggal.slice(5, 7)) <= 6 ? 1 : 2;
  return {
    id: `${tahun}-${semester}`,
    tahun,
    semester,
    dari: `${tahun}-${semester === 1 ? '01-01' : '07-01'}`,
    sampai: `${tahun}-${semester === 1 ? '06-30' : '12-31'}`,
  };
}

/** Bagian kegiatan yang memengaruhi rekap (tanggal, aktif, status per pegawai), urutan tetap. */
function jejakRekap(d) {
  if (!d) return '';
  const isi = d.kehadiran && typeof d.kehadiran === 'object' ? d.kehadiran : null;
  const status = isi
    ? Object.keys(isi)
        .sort()
        .map((pid) => `${pid}:${isi[pid]?.status}`)
        .join(',')
    : '-';
  return `${d.tanggal}|${d.aktif}|${status}`;
}

function hitungRekap(dokumen) {
  const pegawai = {};
  let kegiatan = 0;
  let kegiatanTerisi = 0;
  dokumen.forEach((d) => {
    if (d.aktif === false) return;
    kegiatan += 1;
    if (!d.kehadiran || typeof d.kehadiran !== 'object') return;
    kegiatanTerisi += 1;
    Object.entries(d.kehadiran).forEach(([pid, isi]) => {
      const s = isi?.status;
      if (!STATUS.includes(s)) return;
      if (!pegawai[pid]) pegawai[pid] = { hadir: 0, cuti: 0, sakit: 0, alpa: 0 };
      pegawai[pid][s] += 1;
    });
  });
  return { kegiatan, kegiatanTerisi, pegawai };
}

/** pegawai_kegiatan/{id} → pegawai_rekap_hadir semester lama & baru (bila tanggal pindah semester). */
exports.diKegiatanDitulis = onDocumentWritten(
  `${KOLEKSI.pegawaiKegiatan}/{kegiatanId}`,
  async (event) => {
    const sebelum = event.data?.before?.data();
    const sesudah = event.data?.after?.data();
    if (jejakRekap(sebelum) === jejakRekap(sesudah)) return;

    const daftar = new Map();
    [sebelum, sesudah].forEach((d) => {
      const p = d && periode(d.tanggal);
      if (p) daftar.set(p.id, p);
    });
    for (const p of daftar.values()) {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(
          db
            .collection(KOLEKSI.pegawaiKegiatan)
            .where('tanggal', '>=', p.dari)
            .where('tanggal', '<=', p.sampai),
        );
        tx.set(db.collection(KOLEKSI.pegawaiRekapHadir).doc(p.id), {
          tahun: p.tahun,
          semester: p.semester,
          ...hitungRekap(snap.docs.map((d) => d.data())),
          diperbaruiPada: FieldValue.serverTimestamp(),
        });
      });
    }
  },
);
