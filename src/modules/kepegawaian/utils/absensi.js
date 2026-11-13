/**
 * Rekap absensi mesin sidik jari (docs/skema-database.md §5.1 `pegawai_absensi`). CSV mesin berisi
 * satu pindaian per baris, mis. `Nama;No.;Date/Time` → `Budi Contoh;2;01/10/2026 07:37:26`.
 * Satu impor disimpan sebagai peta No. → { nama, waktu }, dengan `waktu` = token `YYYYMMDDHHmmss`
 * dipisah spasi (ringkas, tidak membuat ribuan entri indeks). Semua impor aktif satu rekapan
 * digabung (pindaian kembar dibuang), lalu direkap per bulan: jam masuk & jam pulang per tanggal.
 * No. mesin dipetakan ke pegawai lewat `pegawai_no_absen` (berlaku untuk semua rekapan).
 */
import { JUMLAH, PANJANG } from '@/utils/batas';
import { keDate } from '@/utils/nilai';
import { kunciTeks, uraiCsv } from './imporPegawai';

/** Ukuran berkas CSV maksimum, dan perkiraan isi satu dokumen impor (batas Firestore 1 MiB). */
export const MAKS_BYTE_CSV = 5 * 1024 * 1024;
export const MAKS_BYTE_IMPOR = 900 * 1024;

/** Pindaian terakhir dianggap jam pulang bila berjarak minimal sekian menit dari pindaian pertama. */
export const JEDA_PULANG_MENIT = 30;

export const FORMAT_TANGGAL = Object.freeze([
  { id: 'otomatis', label: 'Otomatis' },
  { id: 'dmy', label: 'DD/MM/YYYY' },
  { id: 'mdy', label: 'MM/DD/YYYY' },
]);

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const POLA_TOKEN = /^\d{14}$/;

// ─── Baca CSV ───────────────────────────────────────────────────────────────

// Judul kolom (huruf kecil, tanpa spasi/simbol) → peran kolom
const PETA_JUDUL = {
  nama: 'nama',
  name: 'nama',
  namapegawai: 'nama',
  no: 'no',
  nomor: 'no',
  noid: 'no',
  id: 'no',
  userid: 'no',
  acno: 'no',
  enno: 'no',
  datetime: 'waktu',
  tanggaljam: 'waktu',
  tanggalwaktu: 'waktu',
  waktu: 'waktu',
  date: 'tanggal',
  tanggal: 'tanggal',
  tgl: 'tanggal',
  time: 'jam',
  jam: 'jam',
};

function petakanKolom(judul) {
  const kolom = {};
  judul.forEach((j, i) => {
    const peran =
      PETA_JUDUL[
        String(j || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      ];
    if (peran && !(peran in kolom)) kolom[peran] = i;
  });
  return kolom;
}

const rapikan = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const POLA_DMY =
  /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})[\sT]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp][Mm])?$/;
const POLA_YMD =
  /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})[\sT]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp][Mm])?$/;

/** Teks tanggal + jam → bagian angka; tanggal garis miring dibiarkan (a, b) sampai formatnya jelas. */
function pecahWaktu(teks) {
  const t = rapikan(teks);
  let m = POLA_YMD.exec(t);
  const jam = (h, ampm) => {
    if (!ampm) return h;
    if (h < 1 || h > 12) return -1;
    return (h % 12) + (/p/i.test(ampm) ? 12 : 0);
  };
  if (m) {
    return {
      iso: true,
      y: +m[1],
      a: +m[3], // hari
      b: +m[2], // bulan
      h: jam(+m[4], m[7]),
      i: +m[5],
      s: +(m[6] || 0),
    };
  }
  m = POLA_DMY.exec(t);
  if (!m) return null;
  return {
    iso: false,
    y: +m[3],
    a: +m[1],
    b: +m[2],
    h: jam(+m[4], m[7]),
    i: +m[5],
    s: +(m[6] || 0),
  };
}

/** DD/MM atau MM/DD: pasti bila ada angka > 12 di salah satu posisi; bila tidak, DD/MM (Indonesia). */
function tebakFormat(daftar) {
  const garis = daftar.filter((w) => !w.iso);
  if (garis.some((w) => w.a > 12)) return { format: 'dmy', pasti: true };
  if (garis.some((w) => w.b > 12)) return { format: 'mdy', pasti: true };
  return { format: 'dmy', pasti: !garis.length };
}

const dua = (n) => String(n).padStart(2, '0');

function tanggalNyata(y, m, d) {
  if (y < 2024 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Bagian waktu → token `YYYYMMDDHHmmss`, atau null bila tidak sah. */
function keToken(w, format) {
  const [hari, bulan] = w.iso || format === 'dmy' ? [w.a, w.b] : [w.b, w.a];
  if (!tanggalNyata(w.y, bulan, hari)) return null;
  if (w.h < 0 || w.h > 23 || w.i > 59 || w.s > 59) return null;
  return `${w.y}${dua(bulan)}${dua(hari)}${dua(w.h)}${dua(w.i)}${dua(w.s)}`;
}

/** Token → 'YYYY-MM-DD'. */
export const tanggalToken = (t) => `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;

/**
 * Urai CSV mesin absensi.
 * @param {string} teks isi berkas
 * @param {'otomatis'|'dmy'|'mdy'} format urutan tanggal pada kolom Date/Time
 * @returns {{ galat: string } | { format: string, formatPasti: boolean,
 *   pindaian: Record<string, { nama: string, waktu: string[] }>, jumlahBaris: number,
 *   jumlahPindaian: number, dari: string, sampai: string, salah: { baris: number, alasan: string }[] }}
 */
export function uraiAbsensi(teks, format = 'otomatis') {
  const sel = uraiCsv(teks);
  if (sel.length < 2) return { galat: 'Berkas tidak berisi baris data.' };
  const kolom = petakanKolom(sel[0]);
  if (kolom.no == null || (kolom.waktu == null && kolom.tanggal == null)) {
    return {
      galat:
        'Kolom "No." dan "Date/Time" tidak ditemukan di baris pertama. Pastikan berkas berasal dari ekspor mesin absensi (Nama;No.;Date/Time).',
    };
  }

  const mentah = [];
  const salah = [];
  sel.slice(1).forEach((b, i) => {
    const baris = i + 2;
    const noTeks = rapikan(b[kolom.no]);
    const teksWaktu =
      kolom.waktu != null ? b[kolom.waktu] : `${b[kolom.tanggal] || ''} ${b[kolom.jam] || ''}`;
    if (!/^\d{1,9}$/.test(noTeks) || Number(noTeks) < 1) {
      salah.push({ baris, alasan: `No. "${noTeks}" tidak sah` });
      return;
    }
    const w = pecahWaktu(teksWaktu);
    if (!w) {
      salah.push({ baris, alasan: `Tanggal/jam "${rapikan(teksWaktu)}" tidak dikenali` });
      return;
    }
    const nama = kolom.nama != null ? rapikan(b[kolom.nama]).slice(0, PANJANG.namaMesinAbsen) : '';
    mentah.push({ baris, no: String(Number(noTeks)), nama, w });
  });

  const tebakan = tebakFormat(mentah.map((x) => x.w));
  const dipakai = format === 'otomatis' ? tebakan.format : format;
  const peta = new Map();
  let jumlahBaris = 0;
  mentah.forEach(({ baris, no, nama, w }) => {
    const token = keToken(w, dipakai);
    if (!token) {
      salah.push({ baris, alasan: 'Tanggal/jam tidak sah (periksa format tanggal)' });
      return;
    }
    jumlahBaris += 1;
    const e = peta.get(no) || { nama: '', waktu: new Set() };
    if (nama) e.nama = nama;
    e.waktu.add(token);
    peta.set(no, e);
  });
  salah.sort((a, b) => a.baris - b.baris);

  if (!peta.size) {
    return {
      galat: 'Tidak ada baris yang bisa dibaca. Periksa format tanggal dan kolom No.',
      salah,
    };
  }
  if (peta.size > JUMLAH.noAbsenPerImpor) {
    return { galat: `Berkas berisi ${peta.size} No. mesin; maksimal ${JUMLAH.noAbsenPerImpor}.` };
  }

  const pindaian = {};
  let jumlahPindaian = 0;
  let awal = '';
  let akhir = '';
  [...peta.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([no, e]) => {
      const waktu = [...e.waktu].sort();
      jumlahPindaian += waktu.length;
      if (!awal || waktu[0] < awal) awal = waktu[0];
      if (waktu[waktu.length - 1] > akhir) akhir = waktu[waktu.length - 1];
      pindaian[no] = { nama: e.nama, waktu };
    });

  return {
    format: dipakai,
    formatPasti: format !== 'otomatis' || tebakan.pasti,
    pindaian,
    jumlahBaris,
    jumlahPindaian,
    dari: tanggalToken(awal),
    sampai: tanggalToken(akhir),
    salah,
  };
}

/** Bentuk simpanan peta pindaian (waktu digabung spasi). */
export const pindaianSimpan = (pindaian) =>
  Object.fromEntries(
    Object.entries(pindaian).map(([no, x]) => [no, { nama: x.nama, waktu: x.waktu.join(' ') }]),
  );

/** Perkiraan ukuran dokumen impor (byte) untuk dicek sebelum ditulis. */
export const ukuranPindaian = (simpan) =>
  Object.entries(simpan).reduce(
    (n, [no, x]) => n + no.length + x.nama.length + x.waktu.length + 32,
    0,
  );

// ─── Gabung & rekap ─────────────────────────────────────────────────────────

/**
 * Gabungkan pindaian semua impor aktif (urutan impor lama → baru; nama mesin dari impor terbaru).
 * @returns {Map<string, { nama: string, waktu: Set<string> }>}
 */
export function gabungImpor(daftarImpor) {
  const peta = new Map();
  daftarImpor
    .filter((imp) => imp.aktif !== false)
    .forEach((imp) => {
      Object.entries(imp.pindaian || {}).forEach(([no, x]) => {
        const e = peta.get(no) || { nama: '', waktu: new Set() };
        if (x?.nama) e.nama = x.nama;
        String(x?.waktu || '')
          .split(' ')
          .forEach((t) => {
            if (POLA_TOKEN.test(t)) e.waktu.add(t);
          });
        peta.set(no, e);
      });
    });
  return peta;
}

/** Ringkasan gabungan: jumlah pindaian, rentang tanggal, dan bulan yang berisi data (terbaru dulu). */
export function ringkasGabungan(gabungan) {
  let jumlah = 0;
  let awal = '';
  let akhir = '';
  const bulan = new Set();
  gabungan.forEach((e) => {
    e.waktu.forEach((t) => {
      jumlah += 1;
      if (!awal || t < awal) awal = t;
      if (t > akhir) akhir = t;
      bulan.add(`${t.slice(0, 4)}-${t.slice(4, 6)}`);
    });
  });
  return {
    jumlah,
    dari: awal ? tanggalToken(awal) : '',
    sampai: akhir ? tanggalToken(akhir) : '',
    bulan: [...bulan].sort().reverse(),
  };
}

/** Jumlah pindaian berkas baru yang belum ada di gabungan rekapan. */
export function hitungPindaianBaru(pindaian, gabungan) {
  let baru = 0;
  Object.entries(pindaian).forEach(([no, x]) => {
    const ada = gabungan.get(no)?.waktu;
    x.waktu.forEach((t) => {
      if (!ada?.has(t)) baru += 1;
    });
  });
  return baru;
}

/** Rentang tanggal (dari/sampai) beberapa impor aktif, untuk ringkasan di dokumen rekapan. */
export function rentangImpor(daftarImpor) {
  const aktif = daftarImpor.filter((imp) => imp.aktif !== false);
  if (!aktif.length) return { dari: '', sampai: '' };
  return {
    dari: aktif.reduce((m, x) => (x.dari < m ? x.dari : m), aktif[0].dari),
    sampai: aktif.reduce((m, x) => (x.sampai > m ? x.sampai : m), aktif[0].sampai),
  };
}

const keMenit = (hhmmss) => Number(hhmmss.slice(0, 2)) * 60 + Number(hhmmss.slice(2, 4));
const formatJam = (hhmmss) => `${hhmmss.slice(0, 2)}:${hhmmss.slice(2, 4)}`;

/** Timestamp → '2 Nov 2026, 08.15' (WITA); '…' selama waktu server belum terisi. */
export function formatWaktu(v) {
  const d = keDate(v);
  if (!d) return '…';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Makassar',
  }).format(d);
}

/** 'YYYY-MM-DD' → '1 Okt 2026'. */
export function formatTanggalPendek(t) {
  if (!t) return '';
  const [y, m, d] = t.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** Rentang 'YYYY-MM-DD' → '1 Okt 2026 – 31 Okt 2026'. */
export const formatRentang = (dari, sampai) =>
  dari ? `${formatTanggalPendek(dari)} – ${formatTanggalPendek(sampai)}` : '';

/** 'YYYY-MM' → 'Oktober 2026'. */
export function labelBulan(bulan) {
  const [y, m] = bulan.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Kunci baris rekap untuk koreksi jam: ID pegawai, atau `no-<No.>` bila No. belum dipetakan. */
export const kunciBarisNo = (no) => `no-${no}`;

/** ID dokumen koreksi jam: `{baris}_{YYYY-MM-DD}` (sama dengan rules). */
export const idKoreksi = (baris, tanggal) => `${baris}_${tanggal}`;

/** Jam 'HH:mm' atau kosong (koreksi boleh mengosongkan jam masuk/pulang). */
export const jamSah = (v) => v === '' || /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v);

/**
 * Rekap satu bulan: baris = pegawai terpetakan yang aktif (walau tanpa pindaian) + setiap No. yang
 * punya pindaian di bulan itu. Satu pegawai dengan beberapa No. digabung menjadi satu baris.
 * Sel per tanggal: jam masuk = pindaian pertama, jam pulang = pindaian terakhir bila berjarak
 * ≥ JEDA_PULANG_MENIT (pindaian yang lebih rapat dianggap pindaian ganda). Koreksi jam yang aktif
 * menggantikan jam dari mesin (jam mesin tetap ada di `semua`/`mesin`); koreksi yang
 * mengosongkan kedua jam membuat hari itu tidak dihitung hadir.
 * @param {{ gabungan: Map, bulan: string, noAbsen: Record<string, object>,
 *   pegawaiById: Map<string, object>, koreksi?: Record<string, object> }} p
 *   koreksi: peta idKoreksi → dokumen koreksi bulan itu
 */
export function rekapBulan({ gabungan, bulan, noAbsen, pegawaiById, koreksi = {} }) {
  const [y, m] = bulan.split('-').map(Number);
  const jumlahHari = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const hari = Array.from({ length: jumlahHari }, (_, i) => {
    const dow = new Date(Date.UTC(y, m - 1, i + 1)).getUTCDay();
    return { tgl: i + 1, label: HARI[dow], libur: dow === 0 || dow === 6 };
  });
  const awalan = `${y}${dua(m)}`;

  const kumpulan = new Map();
  const semuaNo = new Set([
    ...Object.keys(noAbsen).filter((no) => noAbsen[no].pegawaiId),
    ...gabungan.keys(),
  ]);
  semuaNo.forEach((no) => {
    const p = pegawaiById.get(noAbsen[no]?.pegawaiId || '') || null;
    const token = [...(gabungan.get(no)?.waktu || [])].filter((t) => t.startsWith(awalan));
    if (!token.length && (!p || p.aktif === false)) return;
    const kunci = p ? p.id : kunciBarisNo(no);
    const r = kumpulan.get(kunci) || {
      kunci,
      pegawai: p,
      nama: p?.nama || gabungan.get(no)?.nama || noAbsen[no]?.namaMesin || `No. ${no}`,
      nip: p?.nip || '',
      nos: [],
      token: [],
    };
    r.nos.push(no);
    r.token.push(...token);
    kumpulan.set(kunci, r);
  });

  const baris = [...kumpulan.values()]
    .map(({ token, ...r }) => {
      const perHari = {};
      token.sort().forEach((t) => {
        const d = Number(t.slice(6, 8));
        (perHari[d] ||= []).push(t.slice(8));
      });
      // Koreksi pegawai didahulukan, lalu koreksi yang dibuat saat No.-nya belum dipetakan
      const kunciKoreksi = [r.kunci, ...(r.pegawai ? r.nos.map(kunciBarisNo) : [])];
      const sel = {};
      let hadir = 0;
      let tidakLengkap = 0;
      let dikoreksi = 0;
      hari.forEach(({ tgl }) => {
        const tanggal = `${bulan}-${dua(tgl)}`;
        const k =
          kunciKoreksi.map((x) => koreksi[idKoreksi(x, tanggal)]).find((x) => x?.aktif) || null;
        const jam = perHari[tgl] || [];
        if (!jam.length && !k) return;
        let masuk = '';
        let pulang = '';
        if (jam.length) {
          const terakhir = jam[jam.length - 1];
          masuk = formatJam(jam[0]);
          if (keMenit(terakhir) - keMenit(jam[0]) >= JEDA_PULANG_MENIT)
            pulang = formatJam(terakhir);
        }
        const mesin = { masuk, pulang };
        if (k) {
          masuk = k.masuk;
          pulang = k.pulang;
          dikoreksi += 1;
        }
        if (masuk || pulang) hadir += 1;
        if ((masuk || pulang) && !(masuk && pulang)) tidakLengkap += 1;
        sel[tgl] = { masuk, pulang, semua: jam.map(formatJam), mesin, koreksi: k };
      });
      return {
        ...r,
        nos: r.nos.sort((a, b) => Number(a) - Number(b)),
        sel,
        hadir,
        tidakLengkap,
        dikoreksi,
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { numeric: true }));

  return { bulan, label: labelBulan(bulan), hari, baris };
}

// ─── Pemetaan No. mesin → pegawai ───────────────────────────────────────────

const GELAR_DEPAN = /^(PROF|DR|DRS|DRA|IR|H|HJ)\s+/;

/** Inti nama untuk dicocokkan: tanpa gelar di belakang koma dan gelar depan umum. */
function intiNama(nama) {
  let k = kunciTeks(String(nama || '').split(',')[0]);
  while (GELAR_DEPAN.test(k)) k = k.replace(GELAR_DEPAN, '');
  return k;
}

/**
 * Tebak pegawai dari nama di mesin: inti nama sama persis, atau (nama mesin terpotong) inti nama
 * pegawai diawali nama mesin. Hanya bila hasilnya tepat satu pegawai aktif.
 * @returns {string} pegawaiId, atau '' bila tidak yakin
 */
export function saranPegawai(namaMesin, pegawai) {
  const inti = intiNama(namaMesin);
  if (inti.length < 3) return '';
  const aktif = pegawai.filter((p) => p.aktif !== false);
  const sama = aktif.filter((p) => intiNama(p.nama) === inti);
  if (sama.length) return sama.length === 1 ? sama[0].id : '';
  if (inti.length < 8) return '';
  const awal = aktif.filter((p) => intiNama(p.nama).startsWith(inti));
  return awal.length === 1 ? awal[0].id : '';
}

/** Peta pegawaiId → daftar No. (untuk menandai pegawai yang punya lebih dari satu No.). */
export function noPerPegawai(noAbsen) {
  const hasil = {};
  Object.values(noAbsen).forEach((x) => {
    if (x.pegawaiId) (hasil[x.pegawaiId] ||= []).push(String(x.no));
  });
  return hasil;
}
