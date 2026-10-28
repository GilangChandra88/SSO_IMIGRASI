/**
 * Ulang tahun berikutnya per pegawai, untuk halaman Ulang Tahun. Semua tanggal 'YYYY-MM-DD' (WITA).
 * Lahir 29 Februari dirayakan 28 Februari di tahun biasa (sama dengan kunciUltahHariIni).
 */

const HARI_MS = 86400000;

const keUtc = (iso) => {
  const [t, b, h] = iso.split('-').map(Number);
  return Date.UTC(t, b - 1, h);
};

const kabisat = (t) => (t % 4 === 0 && t % 100 !== 0) || t % 400 === 0;

/** Tanggal ulang tahun pada tahun `t` (29 Feb → 28 Feb bila bukan kabisat). */
function tanggalPadaTahun(tanggalLahir, t) {
  const [, b, h] = tanggalLahir.split('-').map(Number);
  const hari = b === 2 && h === 29 && !kabisat(t) ? 28 : h;
  return `${t}-${String(b).padStart(2, '0')}-${String(hari).padStart(2, '0')}`;
}

/**
 * @param {string} tanggalLahir 'YYYY-MM-DD'
 * @param {string} hariIni 'YYYY-MM-DD'
 * @returns {{ tanggal: string, hari: number, usia: number } | null}  tanggal ulang tahun
 *   berikutnya (hari ini termasuk), jumlah hari menuju ke sana, dan usia yang dicapai
 */
export function ultahBerikut(tanggalLahir, hariIni) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalLahir || '')) return null;
  const tahunIni = Number(hariIni.slice(0, 4));
  let tanggal = tanggalPadaTahun(tanggalLahir, tahunIni);
  if (tanggal < hariIni) tanggal = tanggalPadaTahun(tanggalLahir, tahunIni + 1);
  return {
    tanggal,
    hari: Math.round((keUtc(tanggal) - keUtc(hariIni)) / HARI_MS),
    usia: Number(tanggal.slice(0, 4)) - Number(tanggalLahir.slice(0, 4)),
  };
}

/** Pegawai aktif bertanggal lahir, ditambah `ultah` (ultahBerikut), urut dari yang terdekat. */
export function daftarUltah(pegawai, hariIni) {
  return pegawai
    .filter((p) => p.aktif !== false)
    .map((p) => ({ ...p, ultah: ultahBerikut(p.tanggalLahir, hariIni) }))
    .filter((p) => p.ultah)
    .sort((a, b) => a.ultah.hari - b.ultah.hari || a.nama.localeCompare(b.nama, 'id'));
}

/** "Sen, 3 Nov" */
export const formatTanggalPendek = (iso) =>
  new Date(keUtc(iso)).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** "November 2026" */
export const formatBulan = (iso) =>
  new Date(keUtc(iso)).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** "Hari ini", "Besok", "Dalam 6 hari" */
export const labelHari = (n) => (n === 0 ? 'Hari ini' : n === 1 ? 'Besok' : `Dalam ${n} hari`);
