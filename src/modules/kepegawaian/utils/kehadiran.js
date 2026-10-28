/**
 * Aturan kegiatan & kehadiran pegawai (dari purwarupa kehadiran-react). Kode status dan jenis sama
 * dengan firestore.rules dan Function diKegiatanDitulis (docs/skema-database.md §5.1).
 */
import { tanggalIso } from '@/utils/nilai';

/** Urutan tampil: Hadir, Cuti, Sakit, Alpa. `nilai` = bobot tiap kegiatan untuk % hadir. */
export const STATUS_HADIR = Object.freeze([
  { id: 'hadir', label: 'Hadir', nilai: 1, nada: 'ok' },
  { id: 'cuti', label: 'Cuti', nilai: 0.8, nada: 'info' },
  { id: 'sakit', label: 'Sakit', nilai: 0.9, nada: 'waspada' },
  { id: 'alpa', label: 'Alpa', nilai: 0, nada: 'bahaya' },
]);
export const STATUS_BY_ID = Object.freeze(Object.fromEntries(STATUS_HADIR.map((s) => [s.id, s])));

export const JENIS_KEGIATAN = Object.freeze([
  { id: 'apel', label: 'Apel' },
  { id: 'upacara', label: 'Upacara' },
  { id: 'rapat', label: 'Rapat' },
  { id: 'senam', label: 'Senam' },
  { id: 'lainnya', label: 'Lainnya' },
]);
/** Isian awal form kegiatan baru (purwarupa: apel pukul 07.30 di lapangan upacara). */
export const kegiatanKosong = () => ({
  nama: '',
  jenis: 'apel',
  tanggal: tanggalIso(),
  jam: '07:30',
  tempat: 'Lapangan Upacara',
  keterangan: '',
});

export const labelJenis = (id) => JENIS_KEGIATAN.find((j) => j.id === id)?.label || id;

/** Semester dari tanggal 'YYYY-MM-DD': 1 = Januari–Juni, 2 = Juli–Desember. */
export const semesterDari = (tanggal) => (Number(tanggal.slice(5, 7)) <= 6 ? 1 : 2);

/** Rentang tanggal periode; semester 0 = setahun penuh. */
export function rentangPeriode(tahun, semester) {
  if (semester === 1) return { dari: `${tahun}-01-01`, sampai: `${tahun}-06-30` };
  if (semester === 2) return { dari: `${tahun}-07-01`, sampai: `${tahun}-12-31` };
  return { dari: `${tahun}-01-01`, sampai: `${tahun}-12-31` };
}

export const labelPeriode = (tahun, semester) =>
  semester ? `Semester ${semester} Tahun ${tahun}` : `Tahun ${tahun}`;

/** Pilihan tahun: 2024 (batas rules) sampai tahun depan. */
export function pilihanTahun(tahunIni) {
  const hasil = [];
  for (let t = tahunIni + 1; t >= 2024; t -= 1) hasil.push(t);
  return hasil;
}

/** Jumlahkan hitungan beberapa rekap semester (mis. setahun = semester 1 + 2). */
export function gabungRekap(daftar) {
  const pegawai = {};
  let kegiatan = 0;
  let kegiatanTerisi = 0;
  daftar.forEach((r) => {
    kegiatan += r.kegiatan || 0;
    kegiatanTerisi += r.kegiatanTerisi || 0;
    Object.entries(r.pegawai || {}).forEach(([pid, c]) => {
      const t = pegawai[pid] || { hadir: 0, cuti: 0, sakit: 0, alpa: 0 };
      STATUS_HADIR.forEach((s) => {
        t[s.id] += c[s.id] || 0;
      });
      pegawai[pid] = t;
    });
  });
  return { kegiatan, kegiatanTerisi, pegawai };
}

/** Jumlah kegiatan yang mencatat pegawai (hadir + cuti + sakit + alpa). */
export const totalTercatat = (c) => STATUS_HADIR.reduce((n, s) => n + (c?.[s.id] || 0), 0);

/** % hadir = jumlah nilai ÷ total kegiatan tercatat × 100, dibulatkan 2 desimal. */
export function hitungPersen(c) {
  const total = totalTercatat(c);
  if (!total) return 0;
  const nilai = STATUS_HADIR.reduce((n, s) => n + (c[s.id] || 0) * s.nilai, 0);
  return Math.round((nilai / total) * 10000) / 100;
}

export function predikatDari(persen) {
  if (persen >= 90) return { label: 'Sangat Rajin', nada: 'ok' };
  if (persen >= 80) return { label: 'Rajin', nada: 'info' };
  if (persen >= 70) return { label: 'Cukup Rajin', nada: 'waspada' };
  return { label: 'Kurang Rajin', nada: 'bahaya' };
}

const NOL = Object.freeze({ hadir: 0, cuti: 0, sakit: 0, alpa: 0 });

/** Baris rekap: pegawai aktif + pegawai yang tercatat di rekap (walau kini nonaktif), urut nama. */
export function barisRekap(pegawai, rekap) {
  const byId = new Map(pegawai.map((p) => [p.id, p]));
  const ids = new Set([
    ...pegawai.filter((p) => p.aktif !== false).map((p) => p.id),
    ...Object.keys(rekap.pegawai),
  ]);
  return [...ids]
    .map((id) => {
      const p = byId.get(id) || { id, nama: '(pegawai tidak ditemukan)', nip: '' };
      const c = rekap.pegawai[id] || NOL;
      const total = totalTercatat(c);
      const persen = hitungPersen(c);
      return { pegawai: p, c, total, persen, predikat: total ? predikatDari(persen) : null };
    })
    .sort((a, b) => a.pegawai.nama.localeCompare(b.pegawai.nama, 'id'));
}

/** '2026-10-12' → '12-10-2026' (seperti purwarupa). */
export const formatTanggal = (t) => (t ? t.split('-').reverse().join('-') : '');

/** Format persen Indonesia: 92,5 → '92,50 %'. */
export const formatPersen = (p) =>
  `${p.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
