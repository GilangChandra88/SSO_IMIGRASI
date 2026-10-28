/**
 * Impor data pegawai dari CSV (Excel → Simpan Sebagai → CSV). Urai berkas, bakukan tiap nilai
 * (NIP, tanggal, golongan, WA, e-mail), cocokkan dengan master & pegawai yang sudah ada, lalu beri
 * status per baris: baru / perbarui / sama / ditolak, dengan catatan bila ada yang perlu dicek.
 * Pegawai dicocokkan lewat NIP (atau nama bila NIP kosong), jadi impor boleh diulang.
 */
import { labelSeksi } from '@/utils/unitKerja';
import { PANJANG } from '@/utils/batas';
import {
  alamatBersih,
  emailBersih,
  emailSah,
  golonganBaku,
  golonganPns,
  golonganPppk,
  nipBersih,
  tanggalDariNip,
  tanggalSah,
  waBersih,
  waSah,
} from '@/utils/dataPegawai';

// ─── Berkas ─────────────────────────────────────────────────────────────────

/** Judul kolom templat (urutan mengikuti tabel kepegawaian kantor). */
export const KOLOM_TEMPLAT = [
  'NIP',
  'Nama',
  'Tgl Lahir',
  'Alamat',
  'Email Pribadi',
  'No. WA',
  'Status',
  'Pangkat',
  'Gol',
  'Jabatan',
  'Seksi / Bagian',
  'Eselon',
];

/** Isi templat CSV (pemisah titik koma seperti Excel berbahasa Indonesia), dengan data contoh palsu. */
export function templatCsv() {
  const contoh = [
    '00000000 000000 0 000',
    'Budi Contoh, S.H.',
    '01-01-1990',
    'Jl. Contoh No. 1, Singaraja',
    'budi.contoh@contoh.test',
    '081200000000',
    'PNS',
    'Penata',
    'III/c',
    'Pemeriksa Keimigrasian Ahli Pertama',
    'Lantaskim',
    '',
  ];
  return `\uFEFF${KOLOM_TEMPLAT.join(';')}\r\n${contoh.join(';')}\r\n`;
}

/** Pemisah kolom dari baris judul (di luar tanda kutip): koma, titik koma, atau tab. */
function cariPemisah(teks) {
  const hitung = { ',': 0, ';': 0, '\t': 0 };
  let kutip = false;
  for (const c of teks) {
    if (c === '"') kutip = !kutip;
    else if (!kutip && c in hitung) hitung[c] += 1;
    else if (!kutip && (c === '\n' || c === '\r')) break;
  }
  return Object.entries(hitung).sort((a, b) => b[1] - a[1])[0][0];
}

/** Teks CSV → baris berisi sel. Mendukung tanda kutip (termasuk baris baru di dalam sel). */
export function uraiCsv(teksAsli) {
  let teks = String(teksAsli || '').replace(/^\uFEFF/, '');
  const sep = /^sep=(.)\r?\n/i.exec(teks);
  if (sep) teks = teks.slice(sep[0].length);
  const pemisah = sep ? sep[1] : cariPemisah(teks);
  const hasil = [];
  let baris = [];
  let sel = '';
  let kutip = false;
  for (let i = 0; i < teks.length; i += 1) {
    const c = teks[i];
    if (kutip) {
      if (c === '"' && teks[i + 1] === '"') {
        sel += '"';
        i += 1;
      } else if (c === '"') kutip = false;
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === pemisah) {
      baris.push(sel);
      sel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && teks[i + 1] === '\n') i += 1;
      baris.push(sel);
      hasil.push(baris);
      baris = [];
      sel = '';
    } else sel += c;
  }
  if (sel !== '' || baris.length) {
    baris.push(sel);
    hasil.push(baris);
  }
  return hasil.filter((b) => b.some((s) => s.trim() !== ''));
}

// Judul kolom (huruf kecil, tanpa spasi/simbol) → field
const PETA_JUDUL = {
  nip: 'nip',
  nipnrp: 'nip',
  nipppk: 'nip',
  nama: 'nama',
  namalengkap: 'nama',
  namapegawai: 'nama',
  tgllahir: 'tanggalLahir',
  tanggallahir: 'tanggalLahir',
  tgllhr: 'tanggalLahir',
  alamat: 'alamat',
  alamatrumah: 'alamat',
  emailpribadi: 'emailPribadi',
  email: 'emailPribadi',
  surel: 'emailPribadi',
  nowa: 'noWa',
  nomorwa: 'noWa',
  wa: 'noWa',
  whatsapp: 'noWa',
  nowhatsapp: 'noWa',
  nohp: 'noWa',
  nomorhp: 'noWa',
  notelp: 'noWa',
  status: 'status',
  statuskepegawaian: 'status',
  statuspegawai: 'status',
  jenispegawai: 'status',
  pangkat: 'pangkat',
  gol: 'golongan',
  golongan: 'golongan',
  golruang: 'golongan',
  pangkatgol: 'pangkatGol',
  pangkatgolongan: 'pangkatGol',
  jabatan: 'jabatan',
  namajabatan: 'jabatan',
  seksibagian: 'unit',
  seksi: 'unit',
  bagian: 'unit',
  unit: 'unit',
  unitkerja: 'unit',
  kodeunit: 'unit',
  eselon: 'eselon',
};

const bersihJudul = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** @returns {{ kolom: Record<string, number>, dikenal: string[], diabaikan: string[] }} */
export function petakanJudul(judul) {
  const kolom = {};
  const dikenal = [];
  const diabaikan = [];
  judul.forEach((j, i) => {
    const field = PETA_JUDUL[bersihJudul(j)];
    if (field && !(field in kolom)) {
      kolom[field] = i;
      dikenal.push(j.trim());
    } else if (j.trim()) diabaikan.push(j.trim());
  });
  return { kolom, dikenal, diabaikan };
}

// ─── Pembakuan nilai ────────────────────────────────────────────────────────

/** Teks → kunci pembanding: huruf besar, tanpa tanda baca, spasi tunggal. */
export const kunciTeks = (v) =>
  String(v ?? '')
    .normalize('NFKD')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

const rapikan = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const BULAN = {
  JAN: 1,
  JANUARI: 1,
  FEB: 2,
  FEBRUARI: 2,
  MAR: 3,
  MARET: 3,
  APR: 4,
  APRIL: 4,
  MEI: 5,
  MAY: 5,
  JUN: 6,
  JUNI: 6,
  JUL: 7,
  JULI: 7,
  AGU: 8,
  AGT: 8,
  AGS: 8,
  AUG: 8,
  AGUSTUS: 8,
  SEP: 9,
  SEPT: 9,
  SEPTEMBER: 9,
  OKT: 10,
  OCT: 10,
  OKTOBER: 10,
  NOV: 11,
  NOVEMBER: 11,
  DES: 12,
  DEC: 12,
  DESEMBER: 12,
};

/**
 * Tanggal dari sel CSV: "17-08-1990", "17/08/1990", "1990-08-17", "17 Agustus 1990", atau nomor
 * seri Excel. Urutan hari-bulan mengikuti kebiasaan Indonesia.
 * @returns {string|null} 'YYYY-MM-DD', '' bila kosong, null bila tidak terbaca
 */
export function tanggalCsv(v) {
  const s = rapikan(v);
  if (!s) return '';
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return tanggalSah(+m[1], +m[2], +m[3]) || null;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
  if (m) return tanggalSah(+m[3], +m[2], +m[1]) || null;
  m = /^(\d{1,2})[\s-]+([A-Za-z]+)\.?[\s-]+(\d{4})$/.exec(s);
  if (m && BULAN[m[2].toUpperCase()])
    return tanggalSah(+m[3], BULAN[m[2].toUpperCase()], +m[1]) || null;
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    return tanggalSah(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) || null;
  }
  return null;
}

/** "IV.B", "iv b", "IV-b" → "IV.b"; "V" → "V"; "JFU", "0", "-" → ''. */
export function eselonBaku(v) {
  const m = /^(IV|III|II|I|V)(?:[.\s-]?([AB]))?$/.exec(
    String(v ?? '')
      .trim()
      .toUpperCase(),
  );
  return m ? `${m[1]}${m[2] ? `.${m[2].toLowerCase()}` : ''}` : '';
}

const STATUS_DARI_TEKS = {
  PNS: 'pns',
  CPNS: 'cpns',
  PPPK: 'pppk',
  P3K: 'pppk',
  'NON ASN': 'nonasn',
  NONASN: 'nonasn',
  'NON PNS': 'nonasn',
  HONORER: 'nonasn',
  PPNPN: 'nonasn',
};

/** Tebakan jenis jabatan untuk jabatan baru dari impor (bisa diubah di Master Jabatan). */
export function tebakJenisJabatan(nama, eselon) {
  const k = kunciTeks(nama);
  if (eselon || /^KEPALA\b/.test(k)) return 'struktural';
  if (
    /\b(ANALIS|PEMERIKSA|PRANATA|ARSIPARIS|AUDITOR|PERENCANA|ASESOR|PENYULUH|AHLI|TERAMPIL)\b/.test(
      k,
    )
  )
    return 'fungsional';
  return 'pelaksana';
}

const tanpaAwalanUnit = (k) => k.replace(/^(KANTOR|SUB ?BAGIAN|SUB ?SEKSI|SEKSI|URUSAN)\s+/, '');
const kunciPangkat = (v) => kunciTeks(v).replace(/\bTINGKAT\b/g, 'TK');

/**
 * Unit dari nilai kolom "Seksi / Bagian": kode, singkatan, atau nama (dengan/tanpa awalan
 * Seksi/Subseksi/Urusan/Subbagian); terakhir nama yang memuat nilai itu bila hanya ada satu.
 * @returns {string} id unit, atau '' bila tidak (atau tidak pasti) cocok
 */
export function cocokkanUnit(nilai, units) {
  const k = kunciTeks(nilai);
  if (!k) return '';
  const satu = (hasil) => (hasil.length === 1 ? hasil[0].id : '');
  const tepat =
    satu(units.filter((u) => kunciTeks(u.kode) === k)) ||
    satu(units.filter((u) => kunciTeks(u.singkatan) === k)) ||
    satu(units.filter((u) => kunciTeks(u.nama) === k)) ||
    satu(units.filter((u) => tanpaAwalanUnit(kunciTeks(u.nama)) === tanpaAwalanUnit(k)));
  if (tepat) return tepat;
  const inti = tanpaAwalanUnit(k);
  return inti.length >= 4
    ? satu(units.filter((u) => tanpaAwalanUnit(kunciTeks(u.nama)).includes(inti)))
    : '';
}

// ─── Penilaian per baris ────────────────────────────────────────────────────

const ambil = (baris, kolom, field) => (field in kolom ? rapikan(baris[kolom[field]]) : '');

/**
 * Baca baris data (tanpa judul) menjadi nilai mentah yang sudah dibakukan. Dipanggil sekali per
 * berkas; pencocokan dengan master dilakukan `nilaiImpor` (diulang saat pilihan berubah).
 */
export function bacaBaris(isiCsv) {
  const [judul = [], ...data] = isiCsv;
  const peta = petakanJudul(judul);
  if (!('nama' in peta.kolom)) {
    return { ...peta, baris: [], galat: 'Kolom "Nama" tidak ditemukan di baris judul.' };
  }
  const baris = data.map((b, i) => {
    const catatan = [];
    let tolak = '';
    const nipMentah = ambil(b, peta.kolom, 'nip');
    const nip = nipBersih(nipMentah);
    if (/e\+?\d/i.test(nipMentah)) {
      tolak =
        'NIP terbaca sebagai angka ilmiah (mis. 1,99E+17). Format kolom NIP sebagai Teks di Excel.';
    } else if (nip && nip.length !== 18)
      tolak = `NIP harus 18 digit (terbaca ${nip.length} digit).`;

    const nama = ambil(b, peta.kolom, 'nama');
    if (!nama) tolak ||= 'Nama kosong.';
    else if (nama.length > PANJANG.namaPegawai)
      tolak ||= `Nama lebih dari ${PANJANG.namaPegawai} karakter.`;

    // Tanggal lahir: dari kolom, dicek dengan 8 digit awal NIP
    const dariNip = tanggalDariNip(nip);
    const mentahTgl = ambil(b, peta.kolom, 'tanggalLahir');
    let tanggalLahir = tanggalCsv(mentahTgl);
    if (tanggalLahir === null) {
      catatan.push(
        `Tgl lahir "${mentahTgl}" tidak terbaca${dariNip ? '; dipakai tanggal dari NIP' : ''}.`,
      );
      tanggalLahir = dariNip;
    } else if (!tanggalLahir && dariNip) tanggalLahir = dariNip;
    else if (tanggalLahir && dariNip && tanggalLahir !== dariNip) {
      const [t, bln, h] = tanggalLahir.split('-');
      if (`${t}-${h}-${bln}` === dariNip) tanggalLahir = dariNip;
      else catatan.push('Tgl lahir berbeda dengan tanggal di NIP.');
    }

    // Golongan & status
    let gol = ambil(b, peta.kolom, 'golongan');
    let pangkat = ambil(b, peta.kolom, 'pangkat');
    const pangkatGol = ambil(b, peta.kolom, 'pangkatGol');
    if (pangkatGol && !gol) {
      const m = /^(.*?)[\s(/,-]*([IV]+\s*\/?\s*[a-e]|[IVX]+)\)?$/i.exec(pangkatGol);
      gol = m ? m[2] : '';
      pangkat ||= m ? m[1] : pangkatGol;
    }
    const golongan = golonganBaku(gol);
    if (gol && !golongan) catatan.push(`Golongan "${gol}" tidak dikenal.`);
    const unitMentah = ambil(b, peta.kolom, 'unit');
    let status = STATUS_DARI_TEKS[kunciTeks(ambil(b, peta.kolom, 'status'))] || '';
    if (!status && STATUS_DARI_TEKS[kunciTeks(unitMentah)] === 'pppk') status = 'pppk';
    if (!status && golonganPns(golongan)) status = 'pns';
    if (!status && golonganPppk(golongan)) status = 'pppk';
    if (!status && !nip && !golongan) {
      status = 'nonasn';
      catatan.push('Tanpa NIP & golongan: dianggap Non-ASN.');
    }
    if (!status) catatan.push('Status kepegawaian belum diketahui.');
    else if (status === 'pppk' && golonganPns(golongan))
      catatan.push('PPPK tetapi golongannya bergaya PNS.');

    // Kontak
    let alamat = alamatBersih(ambil(b, peta.kolom, 'alamat'));
    if (alamat.length > PANJANG.alamat) {
      alamat = alamat.slice(0, PANJANG.alamat);
      catatan.push(`Alamat dipotong menjadi ${PANJANG.alamat} karakter.`);
    }
    let emailPribadi = emailBersih(ambil(b, peta.kolom, 'emailPribadi'));
    if (emailPribadi && !emailSah(emailPribadi)) {
      catatan.push(`E-mail "${emailPribadi}" tidak sah, dikosongkan.`);
      emailPribadi = '';
    }
    let noWa = waBersih(ambil(b, peta.kolom, 'noWa'));
    if (noWa && !waSah(noWa)) {
      catatan.push(`No. WA "${ambil(b, peta.kolom, 'noWa')}" tidak sah, dikosongkan.`);
      noWa = '';
    }

    return {
      no: i + 2, // nomor baris di berkas (baris 1 = judul)
      nama,
      nip,
      tanggalLahir,
      status,
      golongan,
      pangkat,
      jabatan: ambil(b, peta.kolom, 'jabatan').slice(0, PANJANG.namaMaster),
      eselon: eselonBaku(ambil(b, peta.kolom, 'eselon')),
      unitMentah: STATUS_DARI_TEKS[kunciTeks(unitMentah)] ? '' : unitMentah,
      kontak: { alamat, emailPribadi, noWa },
      adaKontak: ['alamat', 'emailPribadi', 'noWa'].some((f) => f in peta.kolom),
      catatan,
      tolak,
    };
  });
  return { ...peta, baris, galat: '' };
}

const SAMA_FIELD = [
  'nama',
  'nip',
  'statusKepegawaian',
  'pangkatId',
  'golongan',
  'jabatanId',
  'unitId',
  'seksi',
  'tanggalLahir',
];

/**
 * Cocokkan baris dengan master & pegawai yang ada.
 * @param {object[]} baris hasil bacaBaris
 * @param {{ pegawai: object[], kontak: Record<string, object>, pangkat: object[], jabatan: object[],
 *   units: object[], unitById: Record<string, object>, superAdmin: boolean }} konteks
 * @param {{ petaUnit: Record<string, string>, buatJabatan: boolean }} opsi  petaUnit = pilihan
 *   pengguna untuk nilai "Seksi / Bagian" yang tidak dikenali (kunci = kunciTeks nilai)
 * @returns {{ baris: object[], unitTakDikenal: { kunci, nilai, jumlah }[],
 *   jabatanBaru: { kunci, nama, jenis, eselon, jumlah }[] }}
 */
export function nilaiImpor(baris, konteks, { petaUnit = {}, buatJabatan = true } = {}) {
  const { pegawai, kontak, pangkat, jabatan, units, unitById, superAdmin } = konteks;
  const pegawaiByNip = new Map(pegawai.filter((p) => p.nip).map((p) => [p.nip, p]));
  const pegawaiByNama = new Map();
  pegawai.forEach((p) => {
    const k = kunciTeks(p.nama);
    pegawaiByNama.set(k, pegawaiByNama.has(k) ? null : p); // null = nama ganda, tidak dipakai
  });
  const pangkatByGol = new Map(pangkat.map((p) => [p.golongan, p]));
  const pangkatByNama = new Map(pangkat.map((p) => [kunciPangkat(p.nama), p]));
  const jabatanByKunci = new Map(jabatan.map((j) => [kunciTeks(j.nama), j]));

  const unitTakDikenal = new Map();
  const jabatanBaru = new Map();
  const nipDipakai = new Map();
  const tujuanDipakai = new Map();

  const hasil = baris.map((r) => {
    const catatan = [...r.catatan];
    let tolak = r.tolak;

    // Pegawai tujuan
    let lama = null;
    if (r.nip) lama = pegawaiByNip.get(r.nip) || null;
    else if (r.nama) {
      lama = pegawaiByNama.get(kunciTeks(r.nama)) || null;
      if (lama?.nip) lama = null; // nama sama tetapi pegawai itu ber-NIP: jangan ditimpa
      if (lama) catatan.push('Dicocokkan lewat nama (NIP kosong).');
    }
    if (r.nip && nipDipakai.has(r.nip))
      tolak ||= `NIP ganda dengan baris ${nipDipakai.get(r.nip)}.`;
    if (r.nip && !nipDipakai.has(r.nip)) nipDipakai.set(r.nip, r.no);
    if (lama && tujuanDipakai.has(lama.id) && !tolak)
      tolak = `Pegawai yang sama sudah diisi baris ${tujuanDipakai.get(lama.id)}.`;
    if (lama && !tolak) tujuanDipakai.set(lama.id, r.no);
    if (lama && !superAdmin && (lama.peran || []).includes('superadmin'))
      tolak ||= 'Data Super Admin hanya bisa diubah Super Admin.';

    // Pangkat (lewat golongan; atau lewat nama pangkat bila golongan kosong)
    let p = r.golongan ? pangkatByGol.get(r.golongan) : null;
    if (!p && !r.golongan && r.pangkat) p = pangkatByNama.get(kunciPangkat(r.pangkat)) || null;
    if (r.golongan && !p) catatan.push(`Golongan ${r.golongan} belum ada di Master Pangkat.`);
    if (
      p &&
      r.pangkat &&
      golonganPns(p.golongan) &&
      kunciPangkat(r.pangkat) !== kunciPangkat(p.nama)
    )
      catatan.push(`Pangkat "${r.pangkat}" tidak sesuai golongan ${p.golongan} (${p.nama}).`);

    // Jabatan
    let jabatanId = '';
    let jabatanNama = '';
    if (r.jabatan) {
      const kunci = kunciTeks(r.jabatan);
      const j = jabatanByKunci.get(kunci);
      if (j) {
        jabatanId = j.id;
        jabatanNama = j.nama;
      } else if (buatJabatan) {
        const ada = jabatanBaru.get(kunci);
        jabatanBaru.set(kunci, {
          kunci,
          nama: ada?.nama || r.jabatan,
          eselon: ada?.eselon || r.eselon,
          jenis: tebakJenisJabatan(r.jabatan, ada?.eselon || r.eselon),
          jumlah: (ada?.jumlah || 0) + 1,
        });
        jabatanId = `baru:${kunci}`;
        jabatanNama = ada?.nama || r.jabatan;
      } else catatan.push(`Jabatan "${r.jabatan}" belum ada di Master Jabatan.`);
    }

    // Unit
    let unitId = '';
    if (r.unitMentah) {
      const kunci = kunciTeks(r.unitMentah);
      unitId = cocokkanUnit(r.unitMentah, units);
      if (!unitId) {
        const ada = unitTakDikenal.get(kunci);
        unitTakDikenal.set(kunci, { kunci, nilai: r.unitMentah, jumlah: (ada?.jumlah || 0) + 1 });
        unitId = petaUnit[kunci] || '';
        if (!unitId) catatan.push(`Unit "${r.unitMentah}" belum dipetakan.`);
      }
    }

    // Data akhir: nilai CSV yang kosong tidak menimpa data lama
    const isi = (baru, lamaNilai) => (baru !== '' && baru != null ? baru : (lamaNilai ?? ''));
    const unitAkhir = isi(unitId, lama?.unitId);
    const data = {
      nama: r.nama,
      nip: isi(r.nip, lama?.nip),
      statusKepegawaian: isi(r.status, lama?.statusKepegawaian),
      pangkatId: p ? p.id : r.golongan ? '' : lama?.pangkatId || '',
      pangkatNama: p ? p.nama : r.golongan ? r.pangkat.slice(0, 80) : lama?.pangkatNama || '',
      golongan: p ? p.golongan : isi(r.golongan, lama?.golongan),
      jabatanId: isi(jabatanId, lama?.jabatanId),
      jabatanNama: isi(jabatanNama, lama?.jabatanNama),
      unitId: unitAkhir,
      seksi: unitAkhir ? labelSeksi(unitById, unitAkhir) : lama?.seksi || '',
      tanggalLahir: isi(r.tanggalLahir, lama?.tanggalLahir),
      fotoPaths: lama?.fotoPaths || [],
    };
    const kontakLama = lama ? kontak[lama.id] : null;
    const kontakAkhir = {
      alamat: isi(r.kontak.alamat, kontakLama?.alamat),
      emailPribadi: isi(r.kontak.emailPribadi, kontakLama?.emailPribadi),
      noWa: isi(r.kontak.noWa, kontakLama?.noWa),
    };
    const kontakBerubah =
      r.adaKontak &&
      ['alamat', 'emailPribadi', 'noWa'].some((f) => kontakAkhir[f] !== (kontakLama?.[f] || ''));

    let aksi = 'baru';
    if (tolak) aksi = 'tolak';
    else if (lama) {
      const berubah = SAMA_FIELD.some((f) => data[f] !== (lama[f] ?? ''));
      aksi = berubah || kontakBerubah ? 'perbarui' : 'sama';
    }
    return {
      ...r,
      aksi,
      tolak,
      catatan,
      id: lama?.id || '',
      data,
      kontak: kontakBerubah || (!lama && r.adaKontak) ? kontakAkhir : null,
      kontakAda: !!kontakLama,
      pangkatLabel: p ? p.nama : '',
    };
  });

  return {
    baris: hasil,
    unitTakDikenal: [...unitTakDikenal.values()],
    jabatanBaru: [...jabatanBaru.values()],
  };
}
