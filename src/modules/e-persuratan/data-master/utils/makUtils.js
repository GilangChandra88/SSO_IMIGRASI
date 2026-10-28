/**
 * Helper MAK Setup & History (06-data-mak.js purwarupa admin): label tingkat, nama bulan, format
 * tanggal, agregat Pagu/Realisasi (realisasi dari `mak_rekap`), dan rencana impor CSV ke `mak_node`.
 */

import { PANJANG } from '@/utils/batas';
import { LABEL_TINGKAT, TINGKAT_MAK } from '../../makPohon';

/** Label tingkat dari Tahun sampai Item (urutan StrukturHierarki). */
export const HIERARKI_MAK = TINGKAT_MAK.map((t) => LABEL_TINGKAT[t]);
export const TINGKAT_DARI_LABEL = Object.fromEntries(TINGKAT_MAK.map((t) => [LABEL_TINGKAT[t], t]));

export const BULAN_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** '2026-09-03' → '03/09/2026' (format baku tampilan). */
export function formatTanggalID(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '-';
}

/**
 * Pagu & realisasi per node (makComputeAgg purwarupa). Node tanpa anak: pagu sendiri (hanya Item
 * yang berpagu) dan realisasi bulan itu dari mak_rekap; node berinduk menjumlahkan anak-anaknya.
 * @param {{ byId: Map, anakDari: (id) => object[] }} indeks  indeks node tampilan
 * @param {{ item?: Record<string, { real?: Record<string, number> }> } | null} rekap
 * @param {number} bulan  1–12
 * @returns {(id: string) => { pagu: number, realisasi: number }}
 */
export function buatAgregat(indeks, rekap, bulan) {
  const memo = new Map();
  const hitung = (id) => {
    if (memo.has(id)) return memo.get(id);
    const anak = indeks.anakDari(id);
    let hasil;
    if (anak.length === 0) {
      hasil = {
        pagu: Number(indeks.byId.get(id)?.pagu) || 0,
        realisasi: Number(rekap?.item?.[id]?.real?.[bulan]) || 0,
      };
    } else {
      hasil = { pagu: 0, realisasi: 0 };
      anak.forEach((c) => {
        const a = hitung(c.id);
        hasil.pagu += a.pagu;
        hasil.realisasi += a.realisasi;
      });
    }
    memo.set(id, hasil);
    return hasil;
  };
  return hitung;
}

/** Pengurai CSV sederhana (tanda kutip ganda, koma, CRLF). */
export function parseCSV(text) {
  const result = [];
  let row = [];
  let inQuotes = false;
  let val = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          val += '"';
          i++;
        } else inQuotes = false;
      } else val += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(val);
      val = '';
    } else if (ch === '\n' || ch === '\r') {
      row.push(val);
      result.push(row);
      row = [];
      val = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else val += ch;
  }
  if (row.length > 0 || val !== '') {
    row.push(val);
    result.push(row);
  }
  return result;
}

/** Pagu CSV → rupiah bulat ('5000000', '5.000.000', 'Rp 5,000,000'); desimal ditolak. */
function bacaPagu(raw, baris) {
  const s = String(raw ?? '')
    .trim()
    .replace(/^rp\.?\s*/i, '');
  if (!s) return 0;
  if (/^\d+$|^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  throw new Error(`Baris ${baris}: Pagu "${raw}" tidak sah (isi rupiah bulat, mis. 5000000).`);
}

/**
 * Rencana Import CSV MAK untuk SATU tahun anggaran: node baru (Tahun → Item, format "KODE - NAMA")
 * dan perubahan pagu Item yang sudah ada. Node yang cocok (tingkat + induk + kode/nama sama)
 * dipakai ulang. Kolom Tahun wajib sama dengan `tahunAnggaran`; pagu hanya di tingkat Item.
 * Tidak mengubah `nodes`.
 * @param {object[]} nodes  node mak_node tahun itu
 * @param {string} text  isi berkas CSV
 * @param {() => string} buatId  pembuat id dokumen baru
 * @returns {{ baru: object[], ubahPagu: [string, number][] }}
 */
export function rencanaImportCsv(nodes, text, buatId, tahunAnggaran) {
  const parsed = parseCSV(text);
  if (parsed.length < 2) throw new Error('File kosong atau hanya berisi header.');
  // trim() juga membuang BOM dari CSV hasil Excel
  const headers = parsed[0].map((h) => h.trim().toLowerCase());
  const indices = TINGKAT_MAK.map((t) => headers.indexOf(LABEL_TINGKAT[t].toLowerCase()));
  const idxPagu = headers.indexOf('pagu');
  if (indices[0] === -1 || indices[indices.length - 1] === -1) {
    throw new Error('Format kolom tidak sesuai template.');
  }

  const kerja = [...nodes];
  const baru = new Map();
  const ubahPagu = new Map();
  parsed.slice(1).forEach((row, i) => {
    const baris = i + 2;
    const sel = (row[indices[0]] || '').trim();
    if (!sel) return;
    if (Number(sel.split(' - ')[0]) !== tahunAnggaran) {
      throw new Error(
        `Baris ${baris}: kolom Tahun harus ${tahunAnggaran} (tahun anggaran terpilih).`,
      );
    }
    let indukId = null;
    let terdalam = null;
    TINGKAT_MAK.forEach((tingkat, t) => {
      const raw = (row[indices[t]] || '').trim();
      if (!raw) return;
      let kode = '';
      let nama = raw;
      if (tingkat === 'tahun') nama = String(tahunAnggaran);
      else if (raw.includes(' - ')) {
        const parts = raw.split(' - ');
        kode = parts[0].trim();
        nama = parts.slice(1).join(' - ').trim();
      }
      terdalam =
        tingkat === 'tahun'
          ? kerja.find((n) => n.tingkat === 'tahun')
          : kerja.find(
              (n) =>
                n.tingkat === tingkat &&
                (n.indukId ?? null) === indukId &&
                (kode ? n.kode === kode : n.nama === nama),
            );
      if (!terdalam) {
        if (!nama || nama.length > PANJANG.namaMak || kode.length > PANJANG.kodeMak) {
          throw new Error(
            `Baris ${baris}: kode/nama ${LABEL_TINGKAT[tingkat]} kosong atau terlalu panjang.`,
          );
        }
        terdalam = { id: buatId(), tahunAnggaran, tingkat, kode, nama, indukId, pagu: 0 };
        kerja.push(terdalam);
        baru.set(terdalam.id, terdalam);
      }
      indukId = terdalam.id;
    });
    const pagu = idxPagu !== -1 ? bacaPagu(row[idxPagu], baris) : 0;
    if (!terdalam || !(pagu > 0)) return;
    if (terdalam.tingkat !== 'item') {
      throw new Error(`Baris ${baris}: Pagu hanya boleh diisi pada tingkat Item.`);
    }
    if (baru.has(terdalam.id)) baru.get(terdalam.id).pagu = pagu;
    else if (Number(terdalam.pagu) !== pagu) ubahPagu.set(terdalam.id, pagu);
  });
  return { baru: [...baru.values()], ubahPagu: [...ubahPagu] };
}

/** Isi berkas Template_Import_MAK.csv (contoh kode anggaran umum, bukan data pribadi). */
export function templateCsvMak(tahun) {
  const header = [...HIERARKI_MAK, 'Pagu'];
  const contoh = [
    String(tahun),
    '054.01.WA - Program Dukungan Manajemen',
    '1048 - Pembinaan Keimigrasian',
    'EBA - Laporan Pelaksanaan Tugas',
    '994 - Layanan Umum',
    '002 - Dukungan Operasional',
    'A - Operasional',
    '524111 - Belanja Perjalanan Dinas Biasa',
    '000001 - Perjalanan Dinas Dalam Kota',
    '5000000',
  ];
  return [header.join(','), `"${contoh.join('","')}"`].join('\n');
}
