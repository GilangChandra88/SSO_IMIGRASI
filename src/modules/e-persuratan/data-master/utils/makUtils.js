/**
 * Helper MAK Setup & History (06-data-mak.js purwarupa admin): urutan tingkat, nama bulan,
 * format tanggal, agregat Pagu/Realisasi, dan CSV impor.
 */

export const MAK_HIERARCHY = [
  'Tahun',
  'Program',
  'Kegiatan',
  'KRO',
  'Output',
  'Komponen',
  'Sub Komponen',
  'Akun',
  'Item',
];

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

const BULAN_PENDEK = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/** '2026-09-03' → '03 Sep 2026' */
export function formatTanggalID(str) {
  if (!str) return '-';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Pagu & realisasi per node untuk satu bulan/tahun (makComputeAgg purwarupa).
 * Node tanpa anak memakai pagu sendiri dan realisasi `MAK_History` aktif (`makNodeId`) pada
 * periode itu; node berinduk menjumlahkan anak-anaknya.
 * @returns {(id: string) => { pagu: number, realisasi: number }}
 */
export function buatAgregat(indeks, history, bulan, tahun) {
  const langsung = new Map();
  history.forEach((h) => {
    if (h.status !== 'active' || h.bulan !== bulan || h.tahun !== tahun) return;
    langsung.set(h.makNodeId, (langsung.get(h.makNodeId) || 0) + (Number(h.jumlah) || 0));
  });

  const memo = new Map();
  const hitung = (id) => {
    if (memo.has(id)) return memo.get(id);
    const anak = indeks.anakDari(id);
    let hasil;
    if (anak.length === 0) {
      hasil = {
        pagu: Number(indeks.byId.get(id)?.pagu) || 0,
        realisasi: langsung.get(id) || 0,
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

/**
 * Rencana Import CSV MAK: node baru (Tahun → Item, format "KODE - NAMA") dan perubahan pagu node
 * yang sudah ada. Node yang cocok (tingkat + induk + kode/nama sama) dipakai ulang. Pagu masuk
 * ke tingkat paling bawah yang terisi pada baris itu. Tidak mengubah `nodes`.
 * @param {object[]} nodes  node MAK saat ini
 * @param {string} text     isi berkas CSV
 * @param {() => string} buatId  pembuat id dokumen baru
 * @returns {{ baru: object[], ubahPagu: [string, number][] }}
 */
export function rencanaImportCsv(nodes, text, buatId) {
  const parsed = parseCSV(text);
  if (parsed.length < 2) throw new Error('File kosong atau hanya berisi header.');
  // trim() juga membuang BOM dari CSV hasil Excel
  const headers = parsed[0].map((h) => h.trim().toLowerCase());
  const indices = MAK_HIERARCHY.map((l) => headers.indexOf(l.toLowerCase()));
  const idxPagu = headers.indexOf('pagu');
  if (indices[0] === -1 || indices[MAK_HIERARCHY.length - 1] === -1) {
    throw new Error('Format kolom tidak sesuai template.');
  }

  const kerja = [...nodes];
  const baru = new Map();
  const ubahPagu = new Map();
  for (const row of parsed.slice(1)) {
    if (!(row[indices[0]] || '').trim()) continue;
    let parentId = null;
    let terdalam = null;
    MAK_HIERARCHY.forEach((type, i) => {
      const raw = (row[indices[i]] || '').trim();
      if (!raw) return;
      let kode = '';
      let name = raw;
      if (raw.includes(' - ')) {
        const parts = raw.split(' - ');
        kode = parts[0].trim();
        name = parts.slice(1).join(' - ').trim();
      }
      terdalam = kerja.find(
        (n) =>
          n.type === type &&
          (n.parentId ?? null) === parentId &&
          (kode ? n.kode === kode : n.name === name),
      );
      if (!terdalam) {
        terdalam = { id: buatId(), kode, name, type, parentId, pagu: 0, lockPagu: 0 };
        kerja.push(terdalam);
        baru.set(terdalam.id, terdalam);
      }
      parentId = terdalam.id;
    });
    const pagu = idxPagu !== -1 ? Number((row[idxPagu] || '').replace(/[^0-9.-]+/g, '')) : 0;
    if (!terdalam || !(pagu > 0)) continue;
    if (baru.has(terdalam.id)) baru.get(terdalam.id).pagu = pagu;
    else if (Number(terdalam.pagu) !== pagu) ubahPagu.set(terdalam.id, pagu);
  }
  return { baru: [...baru.values()], ubahPagu: [...ubahPagu] };
}

/** Isi berkas Template_Import_MAK.csv (contoh kode anggaran umum, bukan data pribadi). */
export function templateCsvMak() {
  const header = [...MAK_HIERARCHY, 'Pagu', 'Lock Pagu'];
  const contoh = [
    '2026',
    '054.01.WA - Program Dukungan Manajemen',
    '1048 - Pembinaan Keimigrasian',
    'EBA - Laporan Pelaksanaan Tugas',
    '994 - Layanan Umum',
    '002 - Dukungan Operasional',
    'A - Operasional',
    '524111 - Belanja Perjalanan Dinas Biasa',
    '000001 - Perjalanan Dinas Dalam Kota',
    '5000000',
    '0',
  ];
  return [header.join(','), `"${contoh.join('","')}"`].join('\n');
}
