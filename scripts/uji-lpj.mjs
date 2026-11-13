/* global process, console, fetch, setTimeout, Buffer */
// Uji alur Cloud Functions LPJ, MAK, Persuratan & Inventory (P3–P6) di Firebase Emulator (proyek demo, tidak
// menyentuh cloud): buat berkas → kunci SP/TTE/SPD lewat rules → selesaikanSpby (nomor + realisasi
// + rekap) → Keuangan → hapusBerkas; Batal/Pulihkan realisasi, revisi pagu, hapus node MAK; DRPP;
// jumlah per tahap Dashboard Keuangan (hitungTahapLpj); nomor surat (terbitkanNomorSurat,
// aturPenghitung, nomor SP Srikandi); lalu Inventory (catat, ubah, batalkan transaksi, tutup buku,
// ganti kode SAKTI).
// Butuh emulator auth + firestore + functions (lihat docs/skema-database.md §10).
// Jalankan: node scripts/uji-lpj.mjs
const P = 'demo-imigrasi';
const AUTH = 'http://127.0.0.1:9099';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`;
const FN = `http://127.0.0.1:5001/${P}/asia-southeast2`;
const T = new Date().getFullYear();

let lulus = 0;
let gagal = 0;
const cek = (judul, ok, info = '') => {
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${judul}${ok ? '' : '  → ' + info}`);
};
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

function nilai(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number')
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(nilai) } };
  return { mapValue: { fields: medan(v) } };
}
const medan = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, nilai(v)]));
function asli(v) {
  if (!v) return v;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(asli);
  if ('mapValue' in v)
    return Object.fromEntries(
      Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, asli(x)]),
    );
  return v;
}
const namaDok = (path) => `projects/${P}/databases/(default)/documents/${path}`;
const auth = (t) => (t ? { Authorization: `Bearer ${t}` } : {});

async function tulis(token, path, data, { baru = false, waktu = [], ubah = false } = {}) {
  const write = {
    update: { name: namaDok(path), fields: medan(data) },
    updateTransforms: waktu.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' })),
  };
  if (baru) write.currentDocument = { exists: false };
  if (ubah) {
    write.updateMask = { fieldPaths: Object.keys(data) };
    write.currentDocument = { exists: true };
  }
  const r = await fetch(`${FS}:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth(token) },
    body: JSON.stringify({ writes: [write] }),
  });
  return r.ok ? true : (await r.json()).error?.message || r.status;
}
async function baca(token, path) {
  const r = await fetch(`${FS}/${path}`, { headers: auth(token) });
  if (!r.ok) return null;
  const j = await r.json();
  return asli({ mapValue: { fields: j.fields || {} } });
}
async function daftar(koleksi, filter) {
  const q = { from: [{ collectionId: koleksi }] };
  if (filter)
    q.where = {
      fieldFilter: { field: { fieldPath: filter[0] }, op: 'EQUAL', value: nilai(filter[1]) },
    };
  const r = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ structuredQuery: q }),
  });
  return (await r.json())
    .filter((x) => x.document)
    .map((x) => ({
      id: x.document.name.split('/').pop(),
      ...asli({ mapValue: { fields: x.document.fields } }),
    }));
}
async function riwayat(berkasId) {
  const r = await fetch(`${FS}/lpj_berkas/${berkasId}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'riwayat' }] } }),
  });
  return (await r.json()).filter((x) => x.document).map((x) => x.document.fields.kode.stringValue);
}
async function panggil(nama, data, token) {
  const r = await fetch(`${FN}/${nama}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth(token) },
    body: JSON.stringify({ data }),
  });
  const j = await r.json();
  return j.error ? { galat: j.error.status, pesan: j.error.message } : { hasil: j.result };
}
async function sampai(fn, maks = 30) {
  for (let i = 0; i < maks; i++) {
    const v = await fn();
    if (v) return v;
    await tunggu(500);
  }
  return null;
}

// ── Persiapan ────────────────────────────────────────────────────────────
await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${P}/databases/(default)/documents`, {
  method: 'DELETE',
});
await fetch(`${AUTH}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE' });

const AKUN = {
  pg: { pegawaiId: 'pPG', peran: [] },
  pl: { pegawaiId: 'pPL', peran: [] },
  lain: { pegawaiId: 'pLAIN', peran: [] },
  keu: { pegawaiId: 'pKEU', peran: ['keuangan'] },
  sa: { pegawaiId: 'pSA', peran: ['superadmin'] },
  um: { pegawaiId: 'pUM', peran: ['umum'] },
  kop: { pegawaiId: 'pKOP', peran: ['koperasi'] },
};
const T0 = {};
for (const [k, a] of Object.entries(AKUN)) {
  const email = `${k}@contoh.test`;
  const s = await (
    await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'SandiUji2026Aman', returnSecureToken: true }),
    })
  ).json();
  a.uid = s.localId;
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${P}/accounts:update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({
      localId: a.uid,
      customAttributes: JSON.stringify({ peran: a.peran, aktif: true, pegawaiId: a.pegawaiId }),
    }),
  });
  const m = await (
    await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'SandiUji2026Aman', returnSecureToken: true }),
    })
  ).json();
  T0[k] = m.idToken;
}

const orang = (id, nama) => ({
  pegawaiId: id,
  nama,
  nip: '000000000000000000',
  pangkat: '',
  jabatan: '',
});
await tulis('owner', 'pegawai_ringkas/pPG', {
  nama: 'Budi Contoh',
  authUid: AKUN.pg.uid,
  aktif: true,
});
await tulis('owner', 'pegawai_ringkas/pPL', {
  nama: 'Siti Contoh',
  authUid: AKUN.pl.uid,
  aktif: true,
});
const node = (tingkat, indukId, extra = {}) => ({
  tahunAnggaran: T,
  tingkat,
  kode: '',
  nama: tingkat,
  indukId,
  pagu: 0,
  aktif: true,
  urutan: 0,
  ...extra,
});
await tulis('owner', 'mak_node/TH', node('tahun', null));
await tulis('owner', 'mak_node/A1', node('akun', 'TH', { kode: '524111' }));
await tulis('owner', 'mak_node/A2', node('akun', 'TH', { kode: '524113' }));
await tulis(
  'owner',
  'mak_node/I1',
  node('item', 'A1', { kode: '001', nama: 'Uang harian', pagu: 10000000 }),
);
await tulis(
  'owner',
  'mak_node/I2',
  node('item', 'A2', { kode: '002', nama: 'Transport', pagu: 5000000 }),
);

// ── Berkas Perjadin ──────────────────────────────────────────────────────
const audit = (uid) => ({ dibuatOleh: uid, diubahOleh: uid });
const B = 'BERKAS1';
let r = await tulis(
  T0.pg,
  `lpj_berkas/${B}`,
  {
    skema: 1,
    jenis: 'perjadin',
    uraian: 'Pengawasan orang asing (uji)',
    tahunAnggaran: T,
    versi: 1,
    dicetak: {},
    sp: {
      terkunci: false,
      menimbang: '',
      kepada: [orang('pPG', 'Budi Contoh'), orang('pPL', 'Siti Contoh')],
    },
    anggotaUids: [AKUN.pg.uid],
    ...audit(AKUN.pg.uid),
  },
  { baru: true, waktu: ['dibuatPada', 'diubahPada'] },
);
cek('pegawai membuat berkas Perjadin (lolos rules)', r === true, r);

const anggota = await sampai(async () => {
  const d = await baca('owner', `lpj_berkas/${B}`);
  return d?.anggotaUids?.includes(AKUN.pl.uid) ? d : null;
});
cek('trigger menambahkan pelaksana ber-akun ke anggotaUids', !!anggota);
cek(
  'trigger mengisi tahap draft & status draft',
  anggota?.tahap === 'draft' && anggota?.status === 'draft',
  JSON.stringify(anggota),
);
const ringkas0 = await sampai(() => baca('owner', `lpj_ringkas/${B}`));
cek(
  'lpj_ringkas dibuat (progres 0/5, tanpa nomor, belum disunting)',
  ringkas0?.progres?.total === 5 && ringkas0?.nomorLpj === null && ringkas0?.adaIsian === false,
  JSON.stringify(ringkas0),
);
cek('pelaksana kini bisa membaca berkas (rules)', !!(await baca(T0.pl, `lpj_berkas/${B}`)));
cek('pegawai lain tetap tidak bisa membaca berkas', !(await baca(T0.lain, `lpj_berkas/${B}`)));

let versi = 1;
const simpan = (token, uid, data) => {
  versi++;
  return tulis(
    token,
    `lpj_berkas/${B}`,
    { ...data, versi, diubahOleh: uid },
    { ubah: true, waktu: ['diubahPada'] },
  );
};
r = await simpan(T0.pg, AKUN.pg.uid, {
  sp: {
    terkunci: true,
    menimbang: 'Uji',
    kepada: [orang('pPG', 'Budi Contoh'), orang('pPL', 'Siti Contoh')],
  },
});
cek('SP ditetapkan final', r === true, r);
r = await simpan(T0.pl, AKUN.pl.uid, {
  tte: { terkunci: true, nomorSurat: 'W20.IMI.1-0001', tanggalSurat: `${T}-10-01`, scan: null },
});
cek('pelaksana menyimpan TTE', r === true, r);
r = await simpan(T0.pg, AKUN.pg.uid, {
  spd: {
    terkunci: true,
    maksud: 'Uji',
    mak: { kode: '524111', akunNodeId: 'A1', tahunNodeId: 'TH', pilihan: {} },
  },
});
cek('SPD ditetapkan final', r === true, r);
const lpjSalah = {
  terkunci: false,
  tanggalLpj: `${T}-10-20`,
  keterangan: '',
  transaksi: [{ barisId: 'b1', pelaksanaId: 'pPG', itemNodeId: 'I2', jumlah: 150000 }],
};
r = await simpan(T0.pg, AKUN.pg.uid, { lpj: lpjSalah });
cek('mengisi LPJ (item di Akun lain)', r === true, r);

cek(
  'bukan anggota memanggil selesaikanSpby ditolak',
  (await panggil('selesaikanSpby', { berkasId: B }, T0.lain)).galat === 'PERMISSION_DENIED',
);
const salah = await panggil('selesaikanSpby', { berkasId: B }, T0.pg);
cek(
  'item MAK di luar Akun terpilih ditolak server',
  salah.galat === 'FAILED_PRECONDITION',
  JSON.stringify(salah),
);

r = await simpan(T0.pg, AKUN.pg.uid, {
  lpj: {
    terkunci: false,
    tanggalLpj: `${T}-10-20`,
    keterangan: '',
    transaksi: [
      { barisId: 'b1', pelaksanaId: 'pPG', itemNodeId: 'I1', jumlah: 150000 },
      { barisId: 'b2', pelaksanaId: 'pPL', itemNodeId: 'I1', jumlah: 250000 },
    ],
  },
});
cek('memperbaiki transaksi LPJ', r === true, r);
const hasil = await panggil('selesaikanSpby', { berkasId: B }, T0.pl);
const nomor = hasil.hasil?.nomorLpj || '';
cek(
  'pelaksana menyelesaikan SPBy → nomor LPJ terbit',
  /^LPJ-\d{4}-\d{2}-0001$/.test(nomor),
  JSON.stringify(hasil),
);
cek(
  'memanggil ulang ditolak (nomor sudah terbit)',
  (await panggil('selesaikanSpby', { berkasId: B }, T0.pl)).galat === 'ALREADY_EXISTS',
);

const d1 = await baca('owner', `lpj_berkas/${B}`);
cek(
  'berkas: lpj terkunci, nomor & realisasiTercatat',
  d1?.lpj?.terkunci === true && d1?.nomorLpj === nomor && d1?.realisasiTercatat === true,
  JSON.stringify({ lpj: d1?.lpj?.terkunci, n: d1?.nomorLpj }),
);
cek('penjaga nomor lpj_nomor dibuat', (await baca('owner', `lpj_nomor/${nomor}`))?.berkasId === B);
const real = await daftar('mak_realisasi', ['berkasId', B]);
cek(
  'realisasi 2 baris, jumlah bilangan bulat, status aktif, tanpa NIP',
  real.length === 2 &&
    real.every((x) => Number.isInteger(x.jumlah) && x.status === 'aktif' && !('nip' in x)) &&
    real
      .map((x) => x.jumlah)
      .sort()
      .join() === '150000,250000',
  JSON.stringify(real.map((x) => [x.id, x.jumlah, x.status])),
);
const rekap1 = await baca('owner', `mak_rekap/${T}`);
cek(
  'mak_rekap bertambah di transaksi yang sama (I1: 400.000, bulan 10)',
  rekap1?.item?.I1?.total === 400000 && rekap1?.item?.I1?.real?.['10'] === 400000,
  JSON.stringify(rekap1?.item),
);
r = await simpan(T0.pg, AKUN.pg.uid, { lpj: { ...d1.lpj, keterangan: 'diubah' } });
cek('mengubah LPJ setelah terkunci ditolak rules', r !== true);
versi--;
const ringkas1 = await sampai(async () => {
  const x = await baca('owner', `lpj_ringkas/${B}`);
  return x?.tahap === 'verif' ? x : null;
});
cek(
  'ringkasan: tahap verif, nomor, total 400.000, sudah disunting',
  ringkas1?.nomorLpj === nomor && ringkas1?.total === 400000 && ringkas1?.adaIsian === true,
  JSON.stringify(ringkas1),
);
const rw = await sampai(async () => {
  const x = await riwayat(B);
  return x.includes('nomor') ? x : null;
});
cek(
  'riwayat mencatat dibuat, kunci tiap fase, nomor',
  ['dibuat', 'kunci_sp', 'kunci_tte', 'kunci_spd', 'kunci_lpj', 'nomor'].every((k) =>
    (rw || []).includes(k),
  ),
  JSON.stringify(rw),
);

// ── Keuangan ─────────────────────────────────────────────────────────────
r = await tulis(
  T0.keu,
  `lpj_berkas/${B}/keuangan/status`,
  {
    verifikasi: { selesai: true },
    sakti: {},
    transfer: {},
    arsip: {},
    pejabatBeku: {},
    pokBeku: {},
    ...audit(AKUN.keu.uid),
  },
  { baru: true, waktu: ['dibuatPada', 'diubahPada'] },
);
cek('Keuangan menyelesaikan verifikasi (rules)', r === true, r);
const ringkas2 = await sampai(async () => {
  const x = await baca('owner', `lpj_ringkas/${B}`);
  return x?.tahap === 'sakti' ? x : null;
});
cek(
  'tahap pindah ke sakti setelah verifikasi',
  !!ringkas2 && ringkas2.keuangan?.verifikasi === true,
  JSON.stringify(ringkas2?.tahap),
);

// ── Hapus ────────────────────────────────────────────────────────────────
cek(
  'pembuat menghapus berkas bernomor ditolak',
  (await panggil('hapusBerkas', { berkasId: B }, T0.pg)).galat === 'PERMISSION_DENIED',
);
cek(
  'Super Admin menghapus berkas bernomor tanpa alasan ditolak',
  (await panggil('hapusBerkas', { berkasId: B }, T0.sa)).galat === 'INVALID_ARGUMENT',
);
cek(
  'Super Admin menghapus berkas bernomor dengan alasan',
  (await panggil('hapusBerkas', { berkasId: B, alasan: 'Data uji' }, T0.sa)).hasil?.terhapus ===
    true,
);
cek(
  'berkas & subkoleksi terhapus',
  !(await baca('owner', `lpj_berkas/${B}`)) &&
    !(await baca('owner', `lpj_berkas/${B}/keuangan/status`)),
);
const real2 = await daftar('mak_realisasi', ['berkasId', B]);
cek(
  'realisasi dibatalkan (tidak dihapus)',
  real2.length === 2 && real2.every((x) => x.status === 'batal'),
  JSON.stringify(real2.map((x) => x.status)),
);
const rekap2 = await baca('owner', `mak_rekap/${T}`);
cek(
  'rekap dikurangi saat berkas bernomor dihapus',
  rekap2?.item?.I1?.total === 0 && rekap2?.item?.I1?.real?.['10'] === 0,
  JSON.stringify(rekap2?.item),
);
cek(
  'ringkasan ikut terhapus',
  !!(await sampai(async () => !(await baca('owner', `lpj_ringkas/${B}`)))),
);

const B2 = 'BERKAS2';
await tulis(
  T0.pg,
  `lpj_berkas/${B2}`,
  {
    skema: 1,
    jenis: 'nonperjadin',
    uraian: 'Belanja ATK (uji)',
    tahunAnggaran: T,
    versi: 1,
    dicetak: {},
    spby: { terkunci: false, pelaksana: [orang('pPG', 'Budi Contoh')] },
    anggotaUids: [AKUN.pg.uid],
    ...audit(AKUN.pg.uid),
  },
  { baru: true, waktu: ['dibuatPada', 'diubahPada'] },
);
cek(
  'pegawai lain menghapus draf orang lain ditolak',
  (await panggil('hapusBerkas', { berkasId: B2 }, T0.lain)).galat === 'PERMISSION_DENIED',
);
cek(
  'pembuat menghapus draf sendiri',
  (await panggil('hapusBerkas', { berkasId: B2 }, T0.pg)).hasil?.terhapus === true,
);
const log = (await daftar('sistem_log')).map((x) => x.aksi);
cek(
  'sistem_log mencatat selesaikanSpby & hapusBerkas',
  log.includes('selesaikanSpby') && log.filter((a) => a === 'hapusBerkas').length === 2,
  JSON.stringify(log),
);

// ── MAK: Batal/Pulihkan realisasi, revisi pagu, hapus node ──────────────
const B3 = 'BERKAS3';
await tulis(
  T0.pg,
  `lpj_berkas/${B3}`,
  {
    skema: 1,
    jenis: 'nonperjadin',
    uraian: 'Belanja konsumsi (uji)',
    tahunAnggaran: T,
    versi: 1,
    dicetak: {},
    spby: {
      terkunci: false,
      tanggal: `${T}-10-25`,
      pelaksana: [orang('pPG', 'Budi Contoh')],
      mak: { kode: '524111', akunNodeId: 'A1', tahunNodeId: 'TH', pilihan: {} },
      transaksi: [{ barisId: 'c1', pelaksanaId: 'pPG', itemNodeId: 'I1', jumlah: 300000 }],
    },
    anggotaUids: [AKUN.pg.uid],
    ...audit(AKUN.pg.uid),
  },
  { baru: true, waktu: ['dibuatPada', 'diubahPada'] },
);
const n3 = await panggil('selesaikanSpby', { berkasId: B3 }, T0.pg);
cek(
  'SPBy Non-Perjadin selesai → nomor LPJ berikutnya',
  /-0002$/.test(n3.hasil?.nomorLpj || ''),
  JSON.stringify(n3),
);
const idReal = `${B3}_c1`;
const totalI1 = async () => (await baca('owner', `mak_rekap/${T}`))?.item?.I1?.total;
cek('rekap I1 menjadi 300.000', (await totalI1()) === 300000, String(await totalI1()));
cek(
  'Keuangan membatalkan realisasi ditolak (hanya Super Admin)',
  (await panggil('batalkanRealisasi', { realisasiId: idReal, alasan: 'uji' }, T0.keu)).galat ===
    'PERMISSION_DENIED',
);
cek(
  'Super Admin membatalkan tanpa alasan ditolak',
  (await panggil('batalkanRealisasi', { realisasiId: idReal }, T0.sa)).galat === 'INVALID_ARGUMENT',
);
r = await panggil('batalkanRealisasi', { realisasiId: idReal, alasan: 'Salah input (uji)' }, T0.sa);
const rBatal = await baca('owner', `mak_realisasi/${idReal}`);
cek(
  'Super Admin membatalkan realisasi → status batal + alasan, rekap berkurang',
  r.hasil?.status === 'batal' &&
    rBatal?.status === 'batal' &&
    rBatal?.alasanBatal === 'Salah input (uji)' &&
    (await totalI1()) === 0,
  JSON.stringify({ r, s: rBatal?.status }),
);
cek(
  'membatalkan ulang ditolak',
  (await panggil('batalkanRealisasi', { realisasiId: idReal, alasan: 'x' }, T0.sa)).galat ===
    'FAILED_PRECONDITION',
);
r = await panggil('pulihkanRealisasi', { realisasiId: idReal }, T0.sa);
cek(
  'Super Admin memulihkan → aktif lagi, rekap kembali 300.000',
  r.hasil?.status === 'aktif' && (await totalI1()) === 300000,
  JSON.stringify(r),
);
cek(
  'memulihkan realisasi dari berkas yang sudah dihapus ditolak',
  (await panggil('pulihkanRealisasi', { realisasiId: `${B}_b1` }, T0.sa)).galat ===
    'FAILED_PRECONDITION',
);

r = await tulis(
  T0.keu,
  'mak_node/I3',
  {
    ...node('item', 'A2', { kode: '003', nama: 'Konsumsi', pagu: 1000000 }),
    ...audit(AKUN.keu.uid),
  },
  { baru: true, waktu: ['dibuatPada', 'diubahPada'] },
);
cek('Keuangan menambah Item MAK (rules)', r === true, r);
r = await tulis(
  T0.keu,
  'mak_node/I3',
  { pagu: 2000000, diubahOleh: AKUN.keu.uid },
  { ubah: true, waktu: ['diubahPada'] },
);
cek('Keuangan merevisi pagu (rules)', r === true, r);
const logPagu = await sampai(async () => {
  const l = await daftar('sistem_log', ['aksi', 'ubahPagu']);
  return l.length ? l : null;
});
cek(
  'revisi pagu tercatat di sistem_log (1 juta → 2 juta)',
  logPagu?.length === 1 &&
    logPagu[0].nilaiLama?.pagu === 1000000 &&
    logPagu[0].nilaiBaru?.pagu === 2000000,
  JSON.stringify(logPagu),
);
r = await tulis(
  T0.keu,
  'mak_node/I3',
  { realisasiAwal: 500000, diubahOleh: AKUN.keu.uid },
  { ubah: true, waktu: ['diubahPada'] },
);
cek('Keuangan mengisi Sisa Awal Item (rules)', r === true, r);
const logAwal = await sampai(async () => {
  const l = await daftar('sistem_log', ['aksi', 'ubahRealisasiAwal']);
  return l.length ? l : null;
});
cek(
  'Sisa Awal tercatat di sistem_log (terpakai di luar aplikasi 0 → 500 ribu)',
  logAwal?.length === 1 &&
    logAwal[0].nilaiLama?.realisasiAwal === 0 &&
    logAwal[0].nilaiBaru?.realisasiAwal === 500000,
  JSON.stringify(logAwal),
);

cek(
  'pegawai menghapus node MAK ditolak',
  (await panggil('hapusNodeMak', { nodeId: 'A2' }, T0.pg)).galat === 'PERMISSION_DENIED',
);
r = await panggil('hapusNodeMak', { nodeId: 'A2' }, T0.keu);
cek(
  'Akun tanpa realisasi dihapus beserta turunannya',
  r.hasil?.dihapus === 3 &&
    !(await baca('owner', 'mak_node/A2')) &&
    !(await baca('owner', 'mak_node/I3')),
  JSON.stringify(r),
);
r = await panggil('hapusNodeMak', { nodeId: 'A1' }, T0.keu);
const a1 = await baca('owner', 'mak_node/A1');
const i1 = await baca('owner', 'mak_node/I1');
cek(
  'Akun yang sudah dipakai realisasi dinonaktifkan, tidak dihapus',
  r.hasil?.dinonaktifkan === 2 && a1?.aktif === false && i1?.aktif === false,
  JSON.stringify({ r, a1: a1?.aktif, i1: i1?.aktif }),
);
const logMak = (await daftar('sistem_log')).map((x) => x.aksi);
cek(
  'sistem_log mencatat Batal/Pulihkan dan hapus/nonaktifkan node',
  ['batalkanRealisasi', 'pulihkanRealisasi', 'hapusNode', 'nonaktifkanNode'].every((a) =>
    logMak.includes(a),
  ),
  JSON.stringify(logMak),
);

// ── Keuangan & DRPP ──────────────────────────────────────────────────────
r = await tulis(
  T0.keu,
  `lpj_berkas/${B3}/keuangan/status`,
  {
    verifikasi: { selesai: true, koreksi: { I1: { jumlah: 250000 } } },
    sakti: { selesai: true, nomorKwitansi: 'KW-UJI-1' },
    transfer: { selesai: true, tanggal: `${T}-10-28` },
    arsip: {},
    pejabatBeku: {},
    pokBeku: {},
    ...audit(AKUN.keu.uid),
  },
  { baru: true, waktu: ['dibuatPada', 'diubahPada'] },
);
cek('Keuangan menyelesaikan verifikasi, SAKTI, transfer (rules)', r === true, r);
const r3 = await sampai(async () => {
  const x = await baca('owner', `lpj_ringkas/${B3}`);
  return x?.tahap === 'arsip' ? x : null;
});
cek(
  'ringkasan: tahap arsip, total setelah koreksi 250.000, nomor kwitansi',
  r3?.keuangan?.totalVerifikasi === 250000 && r3?.keuangan?.nomorKwitansi === 'KW-UJI-1',
  JSON.stringify(r3?.keuangan),
);
cek(
  'pegawai membuat DRPP ditolak',
  (await panggil('buatDrpp', { tahunAnggaran: T, berkasIds: [B3] }, T0.pg)).galat ===
    'PERMISSION_DENIED',
);
const dr = await panggil('buatDrpp', { tahunAnggaran: T, berkasIds: [B3] }, T0.keu);
const drppId = dr.hasil?.id || '';
cek(
  'Keuangan membuat DRPP (berkas belum diarsip → menunggu)',
  /^DRPP-\d{4}-0001$/.test(drppId) && dr.hasil?.menunggu === 1,
  JSON.stringify(dr),
);
cek(
  'berkas yang sama tidak bisa masuk DRPP kedua',
  (await panggil('buatDrpp', { tahunAnggaran: T, berkasIds: [B3] }, T0.keu)).galat ===
    'FAILED_PRECONDITION',
);
cek('pelaksana bisa membaca DRPP berkasnya', !!(await baca(T0.pg, `lpj_drpp/${drppId}`)));
cek('pegawai lain tidak bisa membaca DRPP itu', !(await baca(T0.lain, `lpj_drpp/${drppId}`)));
r = await tulis(
  T0.keu,
  `lpj_berkas/${B3}/keuangan/status`,
  { arsip: { selesai: true, tanggalArsip: `${T}-10-29` }, diubahOleh: AKUN.keu.uid },
  { ubah: true, waktu: ['diubahPada'] },
);
cek('Keuangan menyelesaikan arsip (rules)', r === true, r);
const k3 = await sampai(async () => {
  const x = await baca('owner', `lpj_berkas/${B3}/keuangan/status`);
  return x?.arsip?.drppId ? x : null;
});
cek(
  'berkas yang diarsipkan otomatis masuk DRPP yang mencantumkannya',
  k3?.arsip?.drppId === drppId,
  JSON.stringify(k3?.arsip),
);
const r4 = await sampai(async () => {
  const x = await baca('owner', `lpj_ringkas/${B3}`);
  return x?.tahap === 'selesai' ? x : null;
});
cek('ringkasan: tahap selesai + drppId', r4?.keuangan?.drppId === drppId, JSON.stringify(r4));
const dMasuk = await sampai(async () => {
  const x = await baca('owner', `lpj_drpp/${drppId}`);
  return x?.masuk?.[B3] ? x : null;
});
cek(
  'DRPP mencatat berkas yang masuk (nomor LPJ + total setelah koreksi)',
  dMasuk?.masuk?.[B3]?.total === 250000 && /^LPJ-/.test(dMasuk?.masuk?.[B3]?.nomorLpj || ''),
  JSON.stringify(dMasuk?.masuk),
);
cek(
  'Keuangan membatalkan DRPP ditolak (hanya Super Admin)',
  (await panggil('batalkanDrpp', { drppId, alasan: 'uji' }, T0.keu)).galat === 'PERMISSION_DENIED',
);
cek(
  'membatalkan DRPP tanpa alasan ditolak',
  (await panggil('batalkanDrpp', { drppId, alasan: '' }, T0.sa)).galat === 'INVALID_ARGUMENT',
);
r = await panggil('batalkanDrpp', { drppId, alasan: 'Salah daftar (uji)' }, T0.sa);
const k4 = await baca('owner', `lpj_berkas/${B3}/keuangan/status`);
const dBatal = await baca('owner', `lpj_drpp/${drppId}`);
cek(
  'Super Admin membatalkan DRPP → dokumen tetap (status batal), berkas lepas',
  r.hasil?.dibatalkan === true &&
    k4?.arsip?.drppId === null &&
    dBatal?.status === 'batal' &&
    dBatal?.berkasIds?.length === 0 &&
    dBatal?.batal?.berkasIds?.[0] === B3 &&
    dBatal?.batal?.alasan === 'Salah daftar (uji)',
  JSON.stringify({ r, a: k4?.arsip, d: dBatal }),
);
const r5 = await sampai(async () => {
  const x = await baca('owner', `lpj_ringkas/${B3}`);
  return x?.tahap === 'drpp' ? x : null;
});
cek(
  'ringkasan kembali tahap drpp (belum masuk DRPP)',
  r5?.keuangan?.drppId === null,
  JSON.stringify(r5),
);
cek(
  'DRPP batal tidak bisa diubah daftarnya atau dibatalkan lagi',
  (await panggil('ubahDaftarDrpp', { drppId, berkasIds: [B3] }, T0.keu)).galat ===
    'FAILED_PRECONDITION' &&
    (await panggil('batalkanDrpp', { drppId, alasan: 'lagi' }, T0.sa)).galat ===
      'FAILED_PRECONDITION',
);
const dr2 = await panggil('buatDrpp', { tahunAnggaran: T, berkasIds: [B3] }, T0.keu);
cek(
  'berkas dari DRPP batal bisa masuk DRPP baru (langsung masuk karena sudah diarsip)',
  /^DRPP-\d{4}-0002$/.test(dr2.hasil?.id || '') && dr2.hasil?.masuk === 1,
  JSON.stringify(dr2),
);
const drppId2 = dr2.hasil?.id || '';
const STATUS_B3 = `lpj_berkas/${B3}/keuangan/status`;
r = await tulis(
  T0.keu,
  STATUS_B3,
  { sakti: { selesai: true, nomorKwitansi: 'KW-UJI-2' }, diubahOleh: AKUN.keu.uid },
  { ubah: true, waktu: ['diubahPada'] },
);
cek('Keuangan mengubah tahap Keuangan setelah arsip selesai ditolak', r !== true, r);
r = await tulis(
  T0.sa,
  STATUS_B3,
  {
    arsip: { dibatalkan: { drppId: drppId2, tanggalArsip: `${T}-10-29` } },
    diubahOleh: AKUN.sa.uid,
  },
  { ubah: true, waktu: ['diubahPada'] },
);
cek('Super Admin membatalkan arsip (rules)', r === true, r);
const r6 = await sampai(async () => {
  const x = await baca('owner', `lpj_ringkas/${B3}`);
  return x?.tahap === 'arsip' ? x : null;
});
const d6 = await sampai(async () => {
  const x = await baca('owner', `lpj_drpp/${drppId2}`);
  return x && !x.masuk?.[B3] ? x : null;
});
const rw6 = await sampai(async () => {
  const x = await riwayat(B3);
  return x.includes('keuangan_arsip_batal') && x.includes('drpp_keluar') ? x : null;
});
cek(
  'arsip batal → tahap arsip, keluar dari DRPP (tetap tercantum di daftar), riwayat tercatat',
  !!r6 && !!d6 && d6.berkasIds?.includes(B3) && !!rw6,
  JSON.stringify({ tahap: r6?.tahap, masuk: d6?.masuk, rw6 }),
);
r = await tulis(
  T0.keu,
  STATUS_B3,
  { arsip: { selesai: true, tanggalArsip: `${T}-10-31` }, diubahOleh: AKUN.keu.uid },
  { ubah: true, waktu: ['diubahPada'] },
);
cek('Keuangan mengarsipkan ulang (rules)', r === true, r);
const d7 = await sampai(async () => {
  const x = await baca('owner', `lpj_drpp/${drppId2}`);
  return x?.masuk?.[B3] ? x : null;
});
const r7 = await sampai(async () => {
  const x = await baca('owner', `lpj_ringkas/${B3}`);
  return x?.tahap === 'selesai' ? x : null;
});
cek(
  'arsip ulang otomatis masuk lagi ke DRPP yang mencantumkannya',
  !!d7 && r7?.keuangan?.drppId === drppId2,
  JSON.stringify({ masuk: d7?.masuk, r7: r7?.keuangan }),
);

// ── Dashboard Keuangan: hitungTahapLpj ───────────────────────────────────
cek(
  'pegawai meminta jumlah per tahap ditolak',
  (await panggil('hitungTahapLpj', { tahunAnggaran: T }, T0.pg)).galat === 'PERMISSION_DENIED',
);
cek(
  'jumlah per tahap dengan tahun anggaran tidak sah ditolak',
  (await panggil('hitungTahapLpj', { tahunAnggaran: 'semua' }, T0.keu)).galat ===
    'INVALID_ARGUMENT',
);
const ringkasT = await daftar('lpj_ringkas', ['tahunAnggaran', T]);
const harapTahap = Object.fromEntries(
  ['draft', 'verif', 'sakti', 'transfer', 'arsip', 'drpp', 'selesai'].map((t) => [
    t,
    ringkasT.filter((x) => x.tahap === t).length,
  ]),
);
const harapJenis = {
  perjadin: ringkasT.filter((x) => x.jenis === 'perjadin').length,
  nonperjadin: ringkasT.filter((x) => x.jenis === 'nonperjadin').length,
};
const hitungKeu = await panggil('hitungTahapLpj', { tahunAnggaran: T }, T0.keu);
const hitungSa = await panggil('hitungTahapLpj', { tahunAnggaran: T }, T0.sa);
cek(
  'Keuangan & Super Admin: jumlah per tahap dan per jenis sama dengan isi lpj_ringkas',
  ringkasT.length > 0 &&
    JSON.stringify(hitungKeu.hasil) === JSON.stringify({ tahap: harapTahap, jenis: harapJenis }) &&
    JSON.stringify(hitungSa.hasil) === JSON.stringify(hitungKeu.hasil),
  JSON.stringify({ keu: hitungKeu, sa: hitungSa, harapTahap, harapJenis }),
);
const hitungKosong = await panggil('hitungTahapLpj', { tahunAnggaran: T + 1 }, T0.keu);
cek(
  'tahun anggaran tanpa berkas → semua nol',
  Object.values(hitungKosong.hasil?.tahap || { x: 1 }).every((n) => n === 0) &&
    hitungKosong.hasil?.jenis?.perjadin === 0,
  JSON.stringify(hitungKosong),
);

// ── Persuratan ────────────────────────────────────────────────────────────
const sp = await sampai(() => baca('owner', `surat_nomor/sp_${B}`));
cek(
  'nomor SP ber-TTE tercatat di register surat (sumber srikandi)',
  sp?.nomor === 'W20.IMI.1-0001' &&
    sp?.sumber === 'srikandi' &&
    sp?.berkasId === B &&
    sp?.nomorUrut === 1 &&
    sp?.tujuan === 'Budi Contoh dkk. (2 orang)',
  JSON.stringify(sp),
);
const kodeSurat = (kode, tingkat, indukId, aktif = true) => ({
  kode,
  nama: `Kode ${kode}`,
  tingkat,
  indukId,
  aktif,
  urutan: 0,
});
await tulis('owner', 'surat_kode/K0', kodeSurat('W20.IMI.1', 0, null));
await tulis('owner', 'surat_kode/K1', kodeSurat('UM', 1, 'K0'));
await tulis('owner', 'surat_kode/K2', kodeSurat('01', 2, 'K1'));
await tulis('owner', 'surat_kode/K4', kodeSurat('02', 2, 'K1'));
await tulis('owner', 'surat_kode/K3', kodeSurat('KP', 1, 'K0', false));
const minta = (ubah = {}, token = T0.pg) =>
  panggil(
    'terbitkanNomorSurat',
    {
      sumber: 'register',
      tanggal: `${T}-10-05`,
      kodeIds: ['K0', 'K1', 'K2'],
      perihal: 'Undangan rapat',
      tujuan: 'Kanwil',
      seksi: 'Tata Usaha',
      ...ubah,
    },
    token,
  );
r = await minta();
cek(
  'pegawai menerbitkan nomor register',
  r.hasil?.nomor === 'W20.IMI.1.UM.01-0001' && r.hasil?.nomorUrut === 1,
  JSON.stringify(r),
);
const n1 = await baca('owner', `surat_nomor/${r.hasil?.id}`);
cek(
  'register menyimpan kode beku, tahun, pemohon',
  n1?.kode?.length === 3 &&
    n1?.kode?.[2]?.kode === '01' &&
    n1?.tahun === T &&
    n1?.status === 'aktif' &&
    n1?.dibuatOleh === AKUN.pg.uid,
  JSON.stringify(n1),
);
r = await minta();
cek('nomor berikutnya berurutan', r.hasil?.nomor === 'W20.IMI.1.UM.01-0002', JSON.stringify(r));
cek(
  'kode belum sampai tingkat terakhir ditolak',
  (await minta({ kodeIds: ['K0', 'K1'] })).galat === 'FAILED_PRECONDITION',
);
cek(
  'kode nonaktif ditolak',
  (await minta({ kodeIds: ['K0', 'K3'] })).galat === 'FAILED_PRECONDITION',
);
cek(
  'kode yang tidak berantai ditolak',
  (await minta({ kodeIds: ['K0', 'K2'] })).galat === 'FAILED_PRECONDITION',
);
cek(
  'tanggal di luar rentang tahun ditolak',
  (await minta({ tanggal: `${T - 3}-01-01` })).galat === 'INVALID_ARGUMENT',
);
cek('register tanpa tujuan ditolak', (await minta({ tujuan: '' })).galat === 'INVALID_ARGUMENT');
r = await minta({ sumber: 'form', jenisSurat: 'Surat Perintah', tujuan: '', seksi: '' });
cek(
  'nomor dari form surat memakai penghitung yang sama',
  r.hasil?.nomorUrut === 3,
  JSON.stringify(r),
);
r = await minta({ tanggal: `${T + 1}-01-02` });
cek(
  'tahun berikutnya mulai lagi dari 0001',
  r.hasil?.nomor === 'W20.IMI.1.UM.01-0001',
  JSON.stringify(r),
);
const atur = (data, token) => panggil('aturPenghitung', data, token);
cek(
  'pegawai mengatur penghitung ditolak',
  (await atur({ tahun: T, nilai: 50, alasan: 'uji' }, T0.pg)).galat === 'PERMISSION_DENIED',
);
cek(
  'penghitung tidak boleh di bawah nomor yang sudah terbit',
  (await atur({ tahun: T, nilai: 1, alasan: 'uji' }, T0.keu)).galat === 'FAILED_PRECONDITION',
);
cek(
  'mengatur penghitung tanpa alasan ditolak',
  (await atur({ tahun: T, nilai: 120, alasan: '' }, T0.keu)).galat === 'INVALID_ARGUMENT',
);
r = await atur({ tahun: T, nilai: 120, alasan: 'Lanjut dari buku agenda' }, T0.keu);
const r9 = await minta();
cek(
  'Keuangan melanjutkan penghitung dari sistem lama',
  r.hasil?.nilai === 120 && r9.hasil?.nomorUrut === 121,
  JSON.stringify({ r, r9 }),
);
const logSurat = (await daftar('sistem_log', ['modul', 'surat'])).map((x) => x.aksi);
cek(
  'sistem_log mencatat aturPenghitung',
  logSurat.includes('aturPenghitung'),
  JSON.stringify(logSurat),
);

// ── Inventory ─────────────────────────────────────────────────────────────
const kiniWita = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Makassar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const tahunWita = Number(kiniWita.slice(0, 4));
const bulanWita = kiniWita.slice(5, 7);
const brg = (kode, kategoriId, nama, stokAwal) => ({
  kode,
  kategoriId,
  nama,
  satuan: 'buah',
  stokAwal,
  stokMin: 1,
  aktif: true,
});
await tulis('owner', 'inventory_kategori/IK1', {
  kode: '1010101001',
  nama: 'ATK Contoh',
  akunKode: '117111',
  aktif: true,
});
await tulis('owner', 'inventory_kode/1010101001', { jenis: 'kategori', refId: 'IK1' });
await tulis('owner', 'inventory_barang/IB1', brg('000001', 'IK1', 'Kertas Contoh', 5));
await tulis('owner', 'inventory_kode/1010101001000001', { jenis: 'barang', refId: 'IB1' });
await tulis('owner', 'inventory_barang/IB2', brg('', null, 'Map Contoh', 0));
const saldoInv = () => baca('owner', `inventory_saldo/${tahunWita}`);

cek(
  'pegawai mencatat barang masuk ditolak',
  (
    await panggil(
      'catatMasuk',
      { tanggal: kiniWita, pemasokNama: 'Toko Contoh', items: [{ barangId: 'IB1', jumlah: 1 }] },
      T0.pg,
    )
  ).galat === 'PERMISSION_DENIED',
);
r = await panggil(
  'catatMasuk',
  {
    tanggal: kiniWita,
    pemasokNama: 'Toko Contoh',
    items: [
      { barangId: 'IB1', jumlah: 10 },
      { barangId: 'IB2', jumlah: 4 },
    ],
  },
  T0.um,
);
let sInv = await saldoInv();
const ib1 = await baca('owner', 'inventory_barang/IB1');
cek(
  'Umum mencatat 2 barang masuk: TBR 1–2, ringkasan stok & adaTransaksi',
  r.hasil?.nomorAwal === 1 &&
    r.hasil?.nomorAkhir === 2 &&
    sInv?.masuk?.IB1 === 10 &&
    sInv?.masuk?.IB2 === 4 &&
    sInv?.bulan?.[bulanWita]?.masuk === 2 &&
    ib1?.adaTransaksi === true,
  JSON.stringify({ r, sInv }),
);
const masuk1 = r.hasil?.ids?.[0];
cek(
  'tanggal transaksi di masa depan ditolak',
  (
    await panggil(
      'catatMasuk',
      {
        tanggal: `${tahunWita + 1}-01-01`,
        pemasokNama: 'Toko Contoh',
        items: [{ barangId: 'IB1', jumlah: 1 }],
      },
      T0.um,
    )
  ).galat === 'INVALID_ARGUMENT',
);
cek(
  'barang yang sama dua kali dalam satu transaksi ditolak',
  (
    await panggil(
      'catatMasuk',
      {
        tanggal: kiniWita,
        pemasokNama: 'Toko Contoh',
        items: [
          { barangId: 'IB1', jumlah: 1 },
          { barangId: 'IB1', jumlah: 2 },
        ],
      },
      T0.um,
    )
  ).galat === 'INVALID_ARGUMENT',
);
r = await panggil(
  'catatMasuk',
  { tanggal: kiniWita, pemasokNama: 'TOKO CONTOH', items: [{ barangId: 'IB2', jumlah: 1 }] },
  T0.um,
);
const pemasok = await daftar('inventory_pemasok');
cek(
  'pemasok yang sama (beda huruf besar/kecil) tidak dibuat dua kali',
  r.hasil?.nomorAwal === 3 && pemasok.length === 1 && pemasok[0].namaKunci === 'toko contoh',
  JSON.stringify({ r, pemasok }),
);
const keluarData = {
  tanggal: kiniWita,
  seksi: 'Tata Usaha',
  pengambilId: 'pPG',
  items: [{ barangId: 'IB1', jumlah: 12 }],
};
r = await panggil('catatKeluar', keluarData, T0.um);
const keluar1 = r.hasil?.id;
sInv = await saldoInv();
cek(
  'Umum mencatat barang keluar (TBK 1, pengambil dari pegawai ringkas, stok berkurang)',
  r.hasil?.nomor === 1 &&
    r.hasil?.pengambil?.nama === 'Budi Contoh' &&
    sInv?.keluar?.IB1 === 12 &&
    sInv?.bulan?.[bulanWita]?.keluar === 1,
  JSON.stringify({ r, sInv }),
);
cek(
  'barang keluar melebihi sisa stok ditolak',
  (await panggil('catatKeluar', { ...keluarData, items: [{ barangId: 'IB1', jumlah: 4 }] }, T0.um))
    .galat === 'FAILED_PRECONDITION',
);
const ubahMasuk = (jumlah) =>
  panggil(
    'ubahTransaksi',
    {
      jenis: 'masuk',
      id: masuk1,
      tanggal: kiniWita,
      pemasokNama: 'Toko Contoh',
      barangId: 'IB1',
      jumlah,
    },
    T0.um,
  );
r = await ubahMasuk(8);
sInv = await saldoInv();
const m1 = await baca('owner', `inventory_masuk/${masuk1}`);
cek(
  'ubah barang masuk di tempat (nomor tetap, ringkasan disesuaikan)',
  !r.galat && m1?.nomor === 1 && m1?.jumlah === 8 && sInv?.masuk?.IB1 === 8,
  JSON.stringify({ r, m1, sInv }),
);
cek(
  'ubah barang masuk yang membuat stok minus ditolak',
  (await ubahMasuk(6)).galat === 'FAILED_PRECONDITION',
);
const batal = (jenis, id, alasan = 'Salah input (uji)') =>
  panggil('batalkanTransaksi', { jenis, id, alasan }, T0.um);
cek(
  'barang masuk yang sudah terpakai tidak bisa dibatalkan',
  (await batal('masuk', masuk1)).galat === 'FAILED_PRECONDITION',
);
cek(
  'batal tanpa alasan ditolak',
  (await batal('keluar', keluar1, '')).galat === 'INVALID_ARGUMENT',
);
r = await batal('keluar', keluar1);
sInv = await saldoInv();
const k1 = await baca('owner', `inventory_keluar/${keluar1}`);
cek(
  'batalkan barang keluar: status batal, stok kembali',
  r.hasil?.dibatalkan === true &&
    k1?.status === 'batal' &&
    sInv?.keluar?.IB1 === 0 &&
    sInv?.bulan?.[bulanWita]?.keluar === 0,
  JSON.stringify({ r, k1, sInv }),
);
cek(
  'transaksi batal tidak bisa dibatalkan atau diubah lagi',
  (await batal('keluar', keluar1)).galat === 'FAILED_PRECONDITION' &&
    (await panggil('ubahTransaksi', { jenis: 'keluar', id: keluar1, ...keluarData }, T0.um))
      .galat === 'FAILED_PRECONDITION',
);
r = await batal('masuk', masuk1);
sInv = await saldoInv();
cek(
  'barang masuk yang belum terpakai bisa dibatalkan',
  r.hasil?.dibatalkan === true && sInv?.masuk?.IB1 === 0,
  JSON.stringify({ r, sInv }),
);
await tulis('owner', 'sistem_pengaturan/inventory', { tutupSampai: `${tahunWita - 1}-12-31` });
cek(
  'transaksi bertanggal sebelum tutup buku ditolak',
  (
    await panggil(
      'catatMasuk',
      {
        tanggal: `${tahunWita - 1}-06-01`,
        pemasokNama: 'Toko Contoh',
        items: [{ barangId: 'IB1', jumlah: 1 }],
      },
      T0.um,
    )
  ).galat === 'FAILED_PRECONDITION',
);
cek(
  'pegawai mengganti kode SAKTI ditolak',
  (
    await panggil(
      'ubahKodeSakti',
      { jenis: 'barang', id: 'IB2', kategoriId: 'IK1', kode: '000002' },
      T0.pg,
    )
  ).galat === 'PERMISSION_DENIED',
);
r = await panggil(
  'ubahKodeSakti',
  { jenis: 'barang', id: 'IB2', kategoriId: 'IK1', kode: '000002' },
  T0.um,
);
const ib2 = await baca('owner', 'inventory_barang/IB2');
const jaga2 = await baca('owner', 'inventory_kode/1010101001000002');
cek(
  'melengkapi kategori & kode barang (penjaga kode dibuat)',
  !r.galat && ib2?.kategoriId === 'IK1' && ib2?.kode === '000002' && jaga2?.refId === 'IB2',
  JSON.stringify({ r, ib2, jaga2 }),
);
cek(
  'kode SAKTI barang yang sudah dipakai ditolak',
  (
    await panggil(
      'ubahKodeSakti',
      { jenis: 'barang', id: 'IB2', kategoriId: 'IK1', kode: '000001' },
      T0.um,
    )
  ).galat === 'FAILED_PRECONDITION',
);
r = await panggil('ubahKodeSakti', { jenis: 'kategori', id: 'IK1', kode: '1010101009' }, T0.um);
const jagaBaru = await Promise.all(
  ['1010101009', '1010101009000001', '1010101009000002'].map((k) =>
    baca('owner', `inventory_kode/${k}`),
  ),
);
const jagaLama = await Promise.all(
  ['1010101001', '1010101001000001', '1010101001000002'].map((k) =>
    baca('owner', `inventory_kode/${k}`),
  ),
);
cek(
  'ganti kode kategori: penjaga kategori & barangnya pindah ke kode baru',
  !r.galat &&
    (await baca('owner', 'inventory_kategori/IK1'))?.kode === '1010101009' &&
    jagaBaru.every(Boolean) &&
    jagaLama.every((x) => !x),
  JSON.stringify({ r, jagaBaru, jagaLama }),
);
const logInv = (await daftar('sistem_log', ['modul', 'inventory'])).map((x) => x.aksi);
cek(
  'sistem_log mencatat ubah, batal, dan ganti kode Inventory',
  ['ubahMasuk', 'batalkanKeluar', 'batalkanMasuk', 'ubahKodeBarang', 'ubahKodeKategori'].every(
    (a) => logInv.includes(a),
  ),
  JSON.stringify(logInv),
);

// ── Koperasi: persiapan (bagan akun bawaan, mulai pembukuan bulan lalu) ───
const { AKUN_STANDAR, KELOMPOK_AKUN } = await import('../src/modules/koperasi/data/baganAkun.js');
for (const { id, ...a } of AKUN_STANDAR) {
  await tulis('owner', `koperasi_akun/${id}`, { ...a, sistem: true, aktif: true });
}
const [thnKini, blnKini] = kiniWita.split('-').map(Number);
const blnLalu =
  blnKini === 1 ? `${thnKini - 1}-12` : `${thnKini}-${String(blnKini - 1).padStart(2, '0')}`;
const mulaiBuku = `${blnLalu}-01`;
const bacaTotal = async () => (await baca('owner', 'koperasi_rekap/total'))?.akun || {};
const gerak = async (akunId) => {
  const t = (await bacaTotal())[akunId] || {};
  return { d: t.d || 0, k: t.k || 0 };
};

// ── Saldo awal ────────────────────────────────────────────────────────────
const simpanSA = (o, t = T0.kop) =>
  panggil(
    'simpanSaldoAwal',
    {
      tanggalMulai: mulaiBuku,
      saldo: { 's-kas': 1000000, 's-akumulasi-kantor': 200000, 's-simpanan-pokok': 800000 },
      ...o,
    },
    t,
  );
r = await simpanSA({}, T0.pg);
cek(
  'pegawai biasa tidak bisa menyimpan saldo awal',
  r.galat === 'PERMISSION_DENIED',
  JSON.stringify(r),
);
r = await simpanSA({ saldo: { 's-pendapatan-lain': 5000 } });
cek('saldo awal akun pendapatan ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await simpanSA({ saldo: { 's-kas': -5 } });
cek('saldo awal minus ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await simpanSA({ saldo: { TIDAKADA: 5 } });
cek('saldo awal akun tidak dikenal ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await simpanSA({ tanggalMulai: '2026-13-01' });
cek('tanggal mulai tidak sah ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await simpanSA({});
const sa1 = await baca('owner', 'koperasi_saldo_awal/utama');
cek(
  'saldo awal tersimpan; akumulasi penyusutan mengurangi aset',
  !r.galat && sa1?.totalAset === 800000 && sa1?.totalPasiva === 800000,
  JSON.stringify({ r, sa1 }),
);
// Saldo awal akhir yang seimbang: Kas 1 jt = Simpanan Pokok 600 rb + Simpanan Wajib 400 rb
r = await simpanSA({
  saldo: {
    's-kas': 1000000,
    's-akumulasi-kantor': 0,
    's-simpanan-pokok': 600000,
    's-simpanan-wajib': 400000,
  },
});
const sa2 = await baca('owner', 'koperasi_saldo_awal/utama');
cek(
  'saldo nol tidak disimpan & pembuat awal tetap',
  !r.galat &&
    sa2?.totalAset === 1000000 &&
    sa2?.totalPasiva === 1000000 &&
    !('s-akumulasi-kantor' in (sa2?.saldo || {})) &&
    sa2?.dibuatOleh === sa1?.dibuatOleh,
  JSON.stringify(sa2),
);
cek(
  'setiap perubahan saldo awal tercatat di log',
  (await daftar('sistem_log', ['aksi', 'simpanSaldoAwal'])).length === 2,
);

// ── Pengaturan ────────────────────────────────────────────────────────────
const alokasi = {
  jasaModal: 20,
  jasaUsaha: 30,
  pengembangan: 20,
  pengurus: 5,
  karyawan: 5,
  pendidikan: 5,
  sosial: 5,
  cadangan: 10,
};
r = await panggil(
  'simpanPengaturanKoperasi',
  { nominalPokok: 300000, nominalWajib: 100000, alokasiShu: { ...alokasi, cadangan: 15 } },
  T0.kop,
);
cek('persentase SHU tidak 100% ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await panggil(
  'simpanPengaturanKoperasi',
  { nominalPokok: 300000, nominalWajib: 100000, alokasiShu: alokasi },
  T0.kop,
);
cek('pengaturan koperasi tersimpan', !r.galat, JSON.stringify(r));

// ── Kategori & barang ─────────────────────────────────────────────────────
r = await panggil('buatKategoriKantin', { nama: 'Minuman Contoh' }, T0.pg);
cek(
  'pegawai biasa tidak bisa menambah kategori',
  r.galat === 'PERMISSION_DENIED',
  JSON.stringify(r),
);
r = await panggil('buatKategoriKantin', { nama: 'Minuman Contoh' }, T0.kop);
const kat1 = r.hasil?.id;
const akunJual1 = await baca('owner', `koperasi_akun/k-jual-${kat1}`);
const akunHpp1 = await baca('owner', `koperasi_akun/k-hpp-${kat1}`);
cek(
  'kategori membuat akun penjualan 3101 & HPP 3501',
  akunJual1?.kode === '3101' && akunJual1?.kelompok === 'pendapatan' && akunHpp1?.kode === '3501',
  JSON.stringify({ r, akunJual1, akunHpp1 }),
);
r = await panggil('buatKategoriKantin', { nama: 'minuman contoh' }, T0.kop);
cek('nama kategori kembar ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await panggil('buatKategoriKantin', { nama: 'Makanan Contoh' }, T0.kop);
cek(
  'kategori kedua berkode 3102',
  (await baca('owner', `koperasi_akun/k-jual-${r.hasil?.id}`))?.kode === '3102',
  JSON.stringify(r),
);
const brgUji = (o) => ({
  kategoriId: kat1,
  barkode: '',
  nama: 'Teh Contoh',
  satuan: 'botol',
  hargaJual: 5000,
  stok: 0,
  hargaPokok: 0,
  adaTransaksi: false,
  aktif: true,
  dibuatOleh: 'x',
  diubahOleh: 'x',
  ...o,
});
await tulis('owner', 'koperasi_kantin_barang/BK1', brgUji({}), {
  waktu: ['dibuatPada', 'diubahPada'],
});
await tulis('owner', 'koperasi_kantin_barang/BK2', brgUji({ nama: 'Kopi Contoh', aktif: false }), {
  waktu: ['dibuatPada', 'diubahPada'],
});
r = await panggil('aturStokAwalBarang', { barangId: 'BK1', stok: 10, hargaPokok: 3000 }, T0.kop);
const bk1a = await baca('owner', 'koperasi_kantin_barang/BK1');
cek(
  'stok awal barang tersimpan',
  !r.galat && bk1a?.stok === 10 && bk1a?.hargaPokok === 3000,
  JSON.stringify({ r, bk1a }),
);

// ── Transfer kas ──────────────────────────────────────────────────────────
const kirim = (o, t = T0.kop) =>
  panggil(
    'transferKas',
    {
      dariKasId: 's-kas',
      keKasId: 's-bank-1',
      jumlah: 300000,
      tanggal: kiniWita,
      keterangan: 'Setor ke bank',
      ...o,
    },
    t,
  );
r = await kirim({}, T0.keu);
cek(
  'Keuangan kantor tidak bisa transfer kas koperasi',
  r.galat === 'PERMISSION_DENIED',
  JSON.stringify(r),
);
r = await kirim({ keKasId: 's-kas' });
cek('transfer ke kas yang sama ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await kirim({ keKasId: 's-persediaan' });
cek(
  'transfer ke akun bukan kas/bank ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await kirim({ tanggal: '2999-01-01' });
cek('transfer bertanggal masa depan ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await kirim({ tanggal: '2000-01-01' });
cek(
  'transfer sebelum mulai pembukuan ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await kirim({ jumlah: 2000000 });
cek(
  'transfer melebihi saldo (saldo awal + gerak) ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await kirim({});
const jurnalTrf = await baca('owner', `koperasi_jurnal/${r.hasil?.jurnalId}`);
cek(
  'transfer menjadi jurnal seimbang',
  jurnalTrf?.total === 300000 && jurnalTrf?.baris?.length === 2,
  JSON.stringify({ r, jurnalTrf }),
);
const gKas = await gerak('s-kas');
const gBank = await gerak('s-bank-1');
cek(
  'rekap total mencatat debit/kredit',
  gKas.k === 300000 && gBank.d === 300000,
  JSON.stringify({ gKas, gBank }),
);
const flowTrf = (await daftar('koperasi_kas_mutasi')).find((x) => x.jurnalId === r.hasil?.jurnalId);
cek(
  'Flow mencatat transfer dengan saldo sesudah',
  flowTrf?.dari?.saldoSesudah === 700000 && flowTrf?.ke?.saldoSesudah === 300000,
  JSON.stringify(flowTrf),
);

// ── Kasir ─────────────────────────────────────────────────────────────────
await tulis('owner', 'koperasi_kantin_pembayaran/PQ', {
  nama: 'QRIS',
  kasId: 's-bank-1',
  aktif: true,
  urutan: 1,
});
await tulis('owner', 'koperasi_kantin_pembayaran/PX', {
  nama: 'Salah',
  kasId: 's-persediaan',
  aktif: true,
  urutan: 2,
});
await tulis('owner', 'koperasi_kantin_pembayaran/PN', {
  nama: 'Lama',
  kasId: 's-kas',
  aktif: false,
  urutan: 3,
});
const jual = (o, t = T0.kop) =>
  panggil(
    'catatPenjualanKantin',
    {
      id: 'TRX1',
      items: [{ barangId: 'BK1', jumlah: 2 }],
      pembayaranId: 'PQ',
      total: 10000,
      ...o,
    },
    t,
  );
r = await jual({}, T0.pg);
cek(
  'pegawai biasa tidak bisa mencatat penjualan',
  r.galat === 'PERMISSION_DENIED',
  JSON.stringify(r),
);
r = await jual({ items: [{ barangId: 'BK2', jumlah: 1 }], total: 5000 });
cek('barang nonaktif tidak bisa dijual', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await jual({ total: 9000 });
cek(
  'total berbeda dari harga server ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await jual({ pembayaranId: 'PN' });
cek('cara bayar nonaktif ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await jual({ pembayaranId: 'TIDAKADA' });
cek('cara bayar tidak dikenal ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await jual({ pembayaranId: 'PX' });
cek(
  'cara bayar ke akun bukan kas/bank ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await jual({ caraBayar: 'bon', pembayaranId: '' });
cek('bon tanpa anggota ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await jual({
  items: [
    { barangId: 'BK1', jumlah: 1 },
    { barangId: 'BK1', jumlah: 1 },
  ],
});
cek('barang kembar dalam keranjang ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await jual({});
const jurnalJual = await baca('owner', `koperasi_jurnal/${r.hasil?.jurnalId}`);
const baris = Object.fromEntries((jurnalJual?.baris || []).map((b) => [b.akunId, b]));
cek(
  'penjualan: D Bank / K Penjualan kategori, D HPP / K Persediaan',
  baris['s-bank-1']?.debit === 10000 &&
    baris[`k-jual-${kat1}`]?.kredit === 10000 &&
    baris[`k-hpp-${kat1}`]?.debit === 6000 &&
    baris['s-persediaan']?.kredit === 6000,
  JSON.stringify(jurnalJual),
);
const trx1 = await baca('owner', 'koperasi_kantin_transaksi/TRX1');
cek(
  'transaksi mencatat pembeli UMUM, harga beku, HPP',
  trx1?.pembeli?.nama === 'UMUM' &&
    trx1?.items?.[0]?.harga === 5000 &&
    trx1?.hpp === 6000 &&
    trx1?.kasId === 's-bank-1' &&
    trx1?.pembayaran?.nama === 'QRIS',
  JSON.stringify(trx1),
);
const rekapThn = await baca('owner', `koperasi_rekap/${thnKini}`);
cek(
  'arus kas penjualan dicatat menurut akun pendapatan',
  rekapThn?.arus?.[String(blnKini).padStart(2, '0')]?.[`k-jual-${kat1}`]?.m === 10000,
  JSON.stringify(rekapThn?.arus),
);
r = await jual({});
cek(
  'panggilan ulang tidak tercatat dua kali',
  r.hasil?.ulang === true && (await baca('owner', 'koperasi_kantin_barang/BK1'))?.stok === 8,
  JSON.stringify(r),
);
r = await panggil('aturStokAwalBarang', { barangId: 'BK1', stok: 5, hargaPokok: 1 }, T0.kop);
cek(
  'stok awal barang yang sudah bertransaksi ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);

// ── Pembelian ─────────────────────────────────────────────────────────────
const beli = (o) =>
  panggil(
    'catatPembelianKantin',
    {
      id: 'PB1',
      tanggal: kiniWita,
      pemasok: 'Toko Contoh',
      items: [{ barangId: 'BK1', jumlah: 10, harga: 4000 }],
      caraBayar: 'tunai',
      kasId: 's-kas',
      ...o,
    },
    T0.kop,
  );
r = await beli({});
const bk1b = await baca('owner', 'koperasi_kantin_barang/BK1');
cek(
  'pembelian menambah stok & harga pokok rata-rata',
  !r.galat && bk1b?.stok === 18 && bk1b?.hargaPokok === 3556,
  JSON.stringify({ r, bk1b }),
);
r = await beli({
  id: 'PB2',
  caraBayar: 'utang',
  kasId: '',
  items: [{ barangId: 'BK1', jumlah: 5, harga: 4000 }],
  jatuhTempo: kiniWita,
});
const pb2 = await baca('owner', 'koperasi_kantin_pembelian/PB2');
cek(
  'pembelian utang: sisa utang & akun Utang Usaha',
  pb2?.sisaUtang === 20000 && (await gerak('s-utang-usaha-lain')).k === 20000,
  JSON.stringify(pb2),
);
r = await beli({ id: 'PB3', items: [{ barangId: 'BK1', jumlah: 999, harga: 999999 }] });
cek(
  'pembelian tunai melebihi saldo kas ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);

// ── Anggota & simpanan ────────────────────────────────────────────────────
r = await panggil('simpanAnggota', { jenis: 'luar', nama: 'Budi Contoh' }, T0.kop);
const ang1 = r.hasil?.id;
cek(
  'anggota luar terdaftar sebagai calon bernomor A0001',
  r.hasil?.nomor === 'A0001' &&
    (await baca('owner', `koperasi_anggota/${ang1}`))?.status === 'calon',
  JSON.stringify(r),
);
r = await panggil('simpanAnggota', { jenis: 'pegawai', pegawaiId: 'pPG' }, T0.kop);
const ang2 = r.hasil?.id;
cek(
  'anggota pegawai mengambil nama dari data pegawai',
  r.hasil?.nomor === 'A0002' && !!(await baca('owner', `koperasi_anggota/${ang2}`))?.nama,
  JSON.stringify(r),
);
r = await panggil('simpanAnggota', { jenis: 'pegawai', pegawaiId: 'pPG' }, T0.kop);
cek('satu pegawai hanya satu keanggotaan', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
const setor = (o) =>
  panggil(
    'catatSimpanan',
    { anggotaId: ang1, jenis: 'pokok', jumlah: 300000, kasId: 's-kas', tanggal: kiniWita, ...o },
    T0.kop,
  );
r = await setor({ jenis: 'wajib', jumlah: 100000 });
cek('simpanan wajib calon anggota ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await setor({ jumlah: 250000 });
cek('simpanan pokok bukan nominal ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await setor({});
cek(
  'simpanan pokok mengaktifkan anggota',
  !r.galat && (await baca('owner', `koperasi_anggota/${ang1}`))?.status === 'aktif',
  JSON.stringify(r),
);
r = await setor({});
cek('simpanan pokok kedua ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await setor({ jenis: 'wajib', jumlah: 150000 });
cek('simpanan wajib bukan kelipatan ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await setor({ jenis: 'wajib', jumlah: 200000 });
cek(
  'simpanan wajib tersimpan',
  !r.galat && (await baca('owner', `koperasi_anggota/${ang1}`))?.saldoWajib === 200000,
  JSON.stringify(r),
);
r = await panggil(
  'simpanSaldoAwalSimpanan',
  { anggotaId: ang2, pokok: 300000, wajib: 100000 },
  T0.kop,
);
const a2 = await baca('owner', `koperasi_anggota/${ang2}`);
cek(
  'saldo awal simpanan mengaktifkan anggota',
  !r.galat && a2?.status === 'aktif' && a2?.saldoPokok === 300000 && a2?.tanggalMasuk === mulaiBuku,
  JSON.stringify({ r, a2 }),
);
const potong = () =>
  panggil(
    'setorPotongGaji',
    { bulan: kiniWita.slice(0, 7), kasId: 's-bank-1', tanggal: kiniWita, anggotaIds: [ang1, ang2] },
    T0.kop,
  );
r = await potong();
cek(
  'potong gaji: satu jurnal untuk semua anggota',
  !r.galat &&
    r.hasil?.total === 200000 &&
    (await baca('owner', `koperasi_anggota/${ang2}`))?.saldoWajib === 200000,
  JSON.stringify(r),
);
r = await potong();
cek('potong gaji bulan yang sama ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));

// ── Bon, pembatalan, pelunasan ────────────────────────────────────────────
r = await jual({
  id: 'TRX2',
  caraBayar: 'bon',
  pembayaranId: '',
  anggotaId: ang1,
  items: [{ barangId: 'BK1', jumlah: 1 }],
  total: 5000,
});
const a1bon = await baca('owner', `koperasi_anggota/${ang1}`);
const rekapAng = await baca('owner', `koperasi_rekap_anggota/${thnKini}`);
cek(
  'bon menambah piutang & belanja anggota',
  !r.galat &&
    a1bon?.piutang === 5000 &&
    rekapAng?.anggota?.[ang1]?.belanja === 5000 &&
    (await gerak('s-piutang-usaha-anggota')).d === 5000,
  JSON.stringify({ r, a1bon }),
);
const lunas = (o) =>
  panggil(
    'lunasiBon',
    { anggotaId: ang1, jumlah: 3000, kasId: 's-kas', tanggal: kiniWita, ...o },
    T0.kop,
  );
r = await lunas({ jumlah: 9000 });
cek('pelunasan melebihi bon ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await lunas({});
cek(
  'pelunasan bon mengurangi piutang',
  !r.galat && (await baca('owner', `koperasi_anggota/${ang1}`))?.piutang === 2000,
  JSON.stringify(r),
);
r = await panggil('batalkanPenjualanKantin', { id: 'TRX2', alasan: 'Uji' }, T0.kop);
cek(
  'pembatalan bon yang sudah dicicil ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await panggil('batalkanPenjualanKantin', { id: 'TRX1', alasan: 'Salah input' }, T0.kop);
const trx1b = await baca('owner', 'koperasi_kantin_transaksi/TRX1');
const jurnalAsli = await baca('owner', `koperasi_jurnal/${trx1b?.jurnalId}`);
cek(
  'pembatalan: jurnal pembalik, stok kembali, data tidak dihapus',
  !r.galat &&
    trx1b?.status === 'batal' &&
    jurnalAsli?.dibatalkan === true &&
    (await baca('owner', 'koperasi_kantin_barang/BK1'))?.stok === 24,
  JSON.stringify({ r, trx1b }),
);
r = await panggil('batalkanPenjualanKantin', { id: 'TRX1', alasan: 'Lagi' }, T0.kop);
cek('pembatalan kedua ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));

// ── Transaksi umum ────────────────────────────────────────────────────────
const umum = (o) =>
  panggil(
    'catatTransaksiUmum',
    {
      jenis: 'pengeluaran',
      tanggal: kiniWita,
      akunId: 's-beban-4019',
      kasId: 's-kas',
      jumlah: 50000,
      keterangan: 'Beli ATK',
      ...o,
    },
    T0.kop,
  );
r = await umum({ akunId: 's-persediaan' });
cek('pengeluaran ke akun kontrol ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await umum({ akunId: 's-bank-1' });
cek(
  'pengeluaran ke akun kas ditolak (pakai transfer)',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await umum({});
cek(
  'pengeluaran lain tercatat',
  !r.galat && (await gerak('s-beban-4019')).d === 50000,
  JSON.stringify(r),
);
r = await umum({
  jenis: 'penerimaan',
  akunId: 's-pendapatan-bunga-bank',
  kasId: 's-bank-1',
  jumlah: 1000,
  keterangan: 'Bunga bank',
});
cek(
  'penerimaan lain tercatat',
  !r.galat && (await gerak('s-pendapatan-bunga-bank')).k === 1000,
  JSON.stringify(r),
);
r = await panggil(
  'lunasiUtang',
  { pembelianId: 'PB2', jumlah: 30000, kasId: 's-kas', tanggal: kiniWita },
  T0.kop,
);
cek('pelunasan melebihi sisa utang ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await panggil(
  'lunasiUtang',
  { pembelianId: 'PB2', jumlah: 20000, kasId: 's-kas', tanggal: kiniWita },
  T0.kop,
);
cek(
  'pelunasan utang tercatat',
  !r.galat && (await baca('owner', 'koperasi_kantin_pembelian/PB2'))?.sisaUtang === 0,
  JSON.stringify(r),
);

// ── Anggota keluar ────────────────────────────────────────────────────────
const keluar = () =>
  panggil('ambilSimpanan', { anggotaId: ang1, kasId: 's-kas', tanggal: kiniWita }, T0.kop);
r = await keluar();
cek(
  'anggota yang masih punya bon tidak bisa keluar',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
await lunas({ jumlah: 2000 });
r = await keluar();
const a1k = await baca('owner', `koperasi_anggota/${ang1}`);
cek(
  'anggota keluar: seluruh simpanan dikembalikan',
  !r.galat && r.hasil?.total === 600000 && a1k?.status === 'keluar' && a1k?.saldoPokok === 0,
  JSON.stringify({ r, a1k }),
);

// ── Kemasan, resep, dan stok opname ───────────────────────────────────────
await tulis(
  'owner',
  'koperasi_kantin_barang/BK3',
  brgUji({
    nama: 'Rokok Contoh',
    satuan: 'batang',
    hargaJual: 2000,
    jenis: 'barang',
    komponen: [],
    kemasan: [{ id: 'bks', nama: 'bungkus', isi: 16, hargaJual: 30000, barkode: '' }],
  }),
  { waktu: ['dibuatPada', 'diubahPada'] },
);
await tulis(
  'owner',
  'koperasi_kantin_barang/BK5',
  brgUji({
    nama: 'Kopi Saset Contoh',
    satuan: 'saset',
    hargaJual: 2000,
    jenis: 'barang',
    kemasan: [],
    komponen: [],
  }),
  { waktu: ['dibuatPada', 'diubahPada'] },
);
await tulis(
  'owner',
  'koperasi_kantin_barang/BK4',
  brgUji({
    nama: 'Es Kopi Contoh',
    satuan: 'gelas',
    hargaJual: 5000,
    jenis: 'resep',
    kemasan: [],
    komponen: [{ barangId: 'BK5', jumlah: 1 }],
  }),
  { waktu: ['dibuatPada', 'diubahPada'] },
);
r = await beli({
  id: 'PB10',
  items: [{ barangId: 'BK3', kemasanId: 'bks', jumlah: 2, harga: 27200 }],
});
const bk3a = await baca('owner', 'koperasi_kantin_barang/BK3');
cek(
  'pembelian per kemasan: stok & harga pokok per satuan terkecil',
  !r.galat && bk3a?.stok === 32 && bk3a?.hargaPokok === 1700,
  JSON.stringify({ r, bk3a }),
);
r = await jual({
  id: 'TRX10',
  items: [{ barangId: 'BK3', kemasanId: 'xx', jumlah: 1 }],
  total: 30000,
});
cek('satuan kemasan yang tidak ada ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await jual({
  id: 'TRX10',
  items: [
    { barangId: 'BK3', kemasanId: 'bks', jumlah: 1 },
    { barangId: 'BK3', jumlah: 2 },
  ],
  total: 34000,
});
const bk3b = await baca('owner', 'koperasi_kantin_barang/BK3');
const trx10 = await baca('owner', 'koperasi_kantin_transaksi/TRX10');
cek(
  'satu barang dalam dua satuan: harga kemasan, stok berkurang 16 + 2',
  !r.galat &&
    bk3b?.stok === 14 &&
    trx10?.hpp === 18 * 1700 &&
    trx10?.stokKeluar?.[0]?.jumlah === 18 &&
    trx10?.items?.[0]?.satuan === 'bungkus',
  JSON.stringify({ r, bk3b, trx10 }),
);
r = await panggil('aturStokAwalBarang', { barangId: 'BK5', stok: 20, hargaPokok: 1400 }, T0.kop);
r = await jual({ id: 'TRX11', items: [{ barangId: 'BK4', jumlah: 2 }], total: 10000 });
const bk5a = await baca('owner', 'koperasi_kantin_barang/BK5');
const trx11 = await baca('owner', 'koperasi_kantin_transaksi/TRX11');
cek(
  'resep mengurangi stok komponen, HPP dari komponen, resep tanpa stok',
  !r.galat &&
    bk5a?.stok === 18 &&
    trx11?.hpp === 2800 &&
    (await baca('owner', 'koperasi_kantin_barang/BK4'))?.stok === 0,
  JSON.stringify({ r, bk5a, trx11 }),
);
r = await jual({
  id: 'TRX12',
  items: [{ barangId: 'BK4', kemasanId: 'bks', jumlah: 1 }],
  total: 5000,
});
cek('resep dengan satuan kemasan ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await beli({ id: 'PB11', items: [{ barangId: 'BK4', jumlah: 1, harga: 1000 }] });
cek('resep tidak bisa dibeli', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await panggil('aturStokAwalBarang', { barangId: 'BK4', stok: 5, hargaPokok: 1 }, T0.kop);
cek('resep tidak bisa diberi stok awal', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await panggil('batalkanPenjualanKantin', { id: 'TRX11', alasan: 'Uji resep' }, T0.kop);
cek(
  'pembatalan resep mengembalikan stok komponen',
  !r.galat && (await baca('owner', 'koperasi_kantin_barang/BK5'))?.stok === 20,
  JSON.stringify(r),
);
const opname = (items) =>
  panggil('simpanStokOpname', { tanggal: kiniWita, keterangan: 'Uji', items }, T0.kop);
r = await opname([{ barangId: 'BK4', fisik: 1 }]);
cek('opname resep ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
const hppLainSebelum = await gerak('s-hpp-lain');
r = await opname([
  { barangId: 'BK3', fisik: 10 },
  { barangId: 'BK5', fisik: 21 },
]);
const hppLainSesudah = await gerak('s-hpp-lain');
const opn = await baca('owner', `koperasi_kantin_opname/${r.hasil?.id}`);
cek(
  'opname: stok = fisik, selisih bersih −5.400 ke HPP Produk Lain-lain',
  !r.galat &&
    r.hasil?.totalNilai === -5400 &&
    hppLainSesudah.d - hppLainSebelum.d === 5400 &&
    (await baca('owner', 'koperasi_kantin_barang/BK3'))?.stok === 10 &&
    opn?.items?.length === 2,
  JSON.stringify({ r, hppLainSebelum, hppLainSesudah }),
);

// ── Bahan habis pakai ─────────────────────────────────────────────────────
r = await beli({
  id: 'PB12',
  items: [{ barangId: 'BK5', jumlah: 10, harga: 1400 }],
  bahan: [
    { nama: 'Cup contoh', nilai: 15000 },
    { nama: 'Es batu contoh', nilai: 5000 },
  ],
});
const pb12 = await baca('owner', 'koperasi_kantin_pembelian/PB12');
const jurnalPb12 = await baca('owner', `koperasi_jurnal/${r.hasil?.jurnalId}`);
const barisPb12 = Object.fromEntries((jurnalPb12?.baris || []).map((b) => [b.akunId, b]));
cek(
  'pembelian barang + bahan: D Persediaan & D HPP Bahan Habis Pakai / K Kas',
  !r.galat &&
    pb12?.totalBarang === 14000 &&
    pb12?.totalBahan === 20000 &&
    barisPb12['s-persediaan']?.debit === 14000 &&
    barisPb12['s-hpp-bahan']?.debit === 20000 &&
    barisPb12['s-kas']?.kredit === 34000,
  JSON.stringify({ r, pb12, jurnalPb12 }),
);
r = await beli({ id: 'PB13', items: [], bahan: [{ nama: 'Gula contoh', nilai: 12000 }] });
cek('pembelian bahan saja (tanpa barang)', !r.galat, JSON.stringify(r));
r = await beli({ id: 'PB14', items: [] });
cek('pembelian tanpa barang & bahan ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await beli({ id: 'PB15', items: [], bahan: [{ nama: 'Gula contoh', nilai: 0 }] });
cek('bahan bernilai 0 ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));

// ── Master barang lewat Function: barkode standar & unik ──────────────────
const simpanB = (o, t = T0.kop) =>
  panggil(
    'simpanBarangKantin',
    {
      jenis: 'barang',
      kategoriId: kat1,
      nama: 'Barang Contoh',
      satuan: 'pcs',
      hargaJual: 3000,
      barkode: '',
      kemasan: [],
      komponen: [],
      ...o,
    },
    t,
  );
r = await simpanB({ nama: 'Pegawai Coba' }, T0.pg);
cek(
  'pegawai biasa tidak bisa menyimpan barang',
  r.galat === 'PERMISSION_DENIED',
  JSON.stringify(r),
);
r = await simpanB({
  nama: 'Susu Contoh',
  barkode: '4006381333931',
  kemasan: [{ id: 'dus', nama: 'dus', isi: 24, hargaJual: 60000, barkode: '10012345678902' }],
});
const susu = r.hasil?.id;
cek(
  'barang baru dengan barkode & barkode kemasan standar',
  !!susu &&
    (await baca('owner', 'koperasi_kantin_barkode/4006381333931'))?.barangId === susu &&
    (await baca('owner', 'koperasi_kantin_barkode/10012345678902'))?.barangId === susu &&
    (await baca('owner', `koperasi_kantin_barang/${susu}`))?.stok === 0,
  JSON.stringify(r),
);
r = await simpanB({ nama: 'Kembar 1', barkode: '4006381333931' });
cek(
  'barkode kembar dengan barang lain ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await simpanB({
  nama: 'Kembar 2',
  kemasan: [{ id: 'k', nama: 'pak', isi: 6, hargaJual: 1, barkode: '10012345678902' }],
});
cek(
  'barkode kemasan kembar dengan barang lain ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await simpanB({
  nama: 'Kembar 3',
  barkode: '036000291452',
  kemasan: [{ id: 'k', nama: 'pak', isi: 6, hargaJual: 1, barkode: '036000291452' }],
});
cek(
  'barkode sama dua kali di satu barang ditolak',
  r.galat === 'INVALID_ARGUMENT',
  JSON.stringify(r),
);
r = await simpanB({ nama: 'Tak Standar', barkode: '12345' });
cek('barkode tidak standar ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await simpanB({ nama: 'Digit Cek Salah', barkode: '4006381333932' });
cek('barkode dengan digit cek salah ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await simpanB({ nama: 'UPC-E Contoh', barkode: '01234565' });
cek('barkode UPC-E diterima', !r.galat, JSON.stringify(r));
await tulis(
  'owner',
  'koperasi_kantin_barang/BLAMA',
  brgUji({ nama: 'Barang Lama Contoh', barkode: '96385074' }),
  { waktu: ['dibuatPada', 'diubahPada'] },
);
r = await simpanB({ nama: 'Tabrak Lama', barkode: '96385074' });
cek(
  'barkode milik data lama tanpa penjaga tetap ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await simpanB({ id: susu, nama: 'Susu Contoh', barkode: '', kemasan: [] });
cek(
  'mengosongkan barkode melepas penjaganya',
  !r.galat &&
    !(await baca('owner', 'koperasi_kantin_barkode/4006381333931')) &&
    !(await baca('owner', 'koperasi_kantin_barkode/10012345678902')),
  JSON.stringify(r),
);
r = await simpanB({ nama: 'Pemakai Baru', barkode: '4006381333931' });
cek('barkode yang dilepas bisa dipakai barang lain', !r.galat, JSON.stringify(r));
const stokBk1 = (await baca('owner', 'koperasi_kantin_barang/BK1'))?.stok;
r = await simpanB({ id: 'BK1', nama: 'Teh Contoh Baru', hargaJual: 5500 });
const bk1x = await baca('owner', 'koperasi_kantin_barang/BK1');
cek(
  'ubah barang tidak mengubah stok',
  !r.galat && bk1x?.stok === stokBk1 && bk1x?.hargaJual === 5500,
  JSON.stringify({ r, bk1x }),
);
r = await simpanB({ id: 'BK1', jenis: 'resep', komponen: [{ barangId: 'BK5', jumlah: 1 }] });
cek('jenis barang tidak bisa diubah', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await simpanB({ jenis: 'resep', nama: 'Resep Kosong', satuan: 'gelas' });
cek('resep tanpa komponen ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await simpanB({
  jenis: 'resep',
  nama: 'Resep Dari Resep',
  satuan: 'gelas',
  komponen: [{ barangId: 'BK4', jumlah: 1 }],
});
cek('komponen resep berupa resep ditolak', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await simpanB({
  nama: 'Kemasan Isi 1',
  kemasan: [{ id: 'k', nama: 'pcs2', isi: 1, hargaJual: 1, barkode: '' }],
});
cek('kemasan berisi kurang dari 2 ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
r = await panggil('aturAktifBarangKantin', { id: 'BK1', aktif: false }, T0.kop);
cek(
  'barang bisa dinonaktifkan',
  !r.galat && (await baca('owner', 'koperasi_kantin_barang/BK1'))?.aktif === false,
  JSON.stringify(r),
);
await panggil('aturAktifBarangKantin', { id: 'BK1', aktif: true }, T0.kop);

// ── Persamaan akuntansi: aset = kewajiban + ekuitas + (pendapatan − HPP − beban) ──
{
  const total = await bacaTotal();
  const sa = (await baca('owner', 'koperasi_saldo_awal/utama'))?.saldo || {};
  const kelompok = Object.fromEntries(AKUN_STANDAR.map((a) => [a.id, a.kelompok]));
  const sisi = (id) => kelompok[id] || (id.startsWith('k-jual-') ? 'pendapatan' : 'hpp');
  const debitNormal = new Set(
    KELOMPOK_AKUN.filter((k) => k.saldoNormal === 'debit').map((k) => k.id),
  );
  let kiri = 0;
  let kanan = 0;
  for (const id of new Set([...Object.keys(total), ...Object.keys(sa)])) {
    const g = total[id] || {};
    const net =
      (sa[id] || 0) * (debitNormal.has(sisi(id)) && !id.startsWith('s-akumulasi-') ? 1 : -1) +
      (g.d || 0) -
      (g.k || 0);
    if (debitNormal.has(sisi(id))) kiri += net;
    else kanan -= net;
  }
  cek('neraca seimbang setelah semua transaksi', kiri === kanan, JSON.stringify({ kiri, kanan }));
}

// ── Tutup buku ────────────────────────────────────────────────────────────
r = await panggil('tutupBuku', { sampai: kiniWita.slice(0, 7) }, T0.kop);
cek('bulan berjalan tidak bisa ditutup', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));
r = await panggil('tutupBuku', { sampai: blnLalu }, T0.kop);
cek(
  'tutup buku bulan lalu',
  !r.galat && (await baca('owner', 'koperasi_saldo_awal/utama'))?.terkunciSampai === blnLalu,
  JSON.stringify(r),
);
r = await kirim({ tanggal: mulaiBuku, jumlah: 1000 });
cek(
  'transaksi di periode yang ditutup ditolak',
  r.galat === 'FAILED_PRECONDITION',
  JSON.stringify(r),
);
r = await simpanSA({});
cek('saldo awal terkunci setelah tutup buku', r.galat === 'FAILED_PRECONDITION', JSON.stringify(r));

// ── Log Developer: jejak sistem ───────────────────────────────────────────
{
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  /** Token palsu Emulator dengan auth_time tertentu (detik lalu). */
  const tokenLama = (a, umurDetik) => {
    const now = Math.floor(Date.now() / 1000);
    return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
      iss: `https://securetoken.google.com/${P}`,
      aud: P,
      auth_time: now - umurDetik,
      iat: now,
      exp: now + 3600,
      sub: a.uid,
      user_id: a.uid,
      email: 'sa@contoh.test',
      firebase: { sign_in_provider: 'password', identities: {} },
      aktif: true,
      peran: a.peran,
      pegawaiId: a.pegawaiId,
    })}.`;
  };
  const saSegar = tokenLama(AKUN.sa, 5);
  const saBasi = tokenLama(AKUN.sa, 31 * 60);
  const bacaLog = (tampilan, extra = {}, t = saSegar) =>
    panggil('bacaLogDev', { tampilan, ...extra }, t);

  r = await bacaLog('ringkasan', {}, T0.pg);
  cek(
    'pegawai biasa membuka Log Developer ditolak',
    r.galat === 'PERMISSION_DENIED',
    JSON.stringify(r),
  );
  r = await bacaLog('ringkasan', {}, T0.keu);
  cek('Keuangan membuka Log Developer ditolak', r.galat === 'PERMISSION_DENIED', JSON.stringify(r));
  r = await bacaLog('ringkasan', {}, saBasi);
  cek(
    'Super Admin dengan login > 30 menit diminta kata sandi lagi',
    r.galat === 'FAILED_PRECONDITION' && r.pesan === 'KUNCI_ULANG',
    JSON.stringify(r),
  );
  r = await panggil('bukaKunciLogDev', {}, tokenLama(AKUN.sa, 10 * 60));
  cek(
    'buka kunci tanpa ketik ulang kata sandi (login 10 menit lalu) ditolak',
    r.galat === 'FAILED_PRECONDITION',
    JSON.stringify(r),
  );
  r = await panggil('bukaKunciLogDev', {}, saSegar);
  cek(
    'buka kunci setelah ketik ulang kata sandi',
    !r.galat && r.hasil.terkunciPada > Date.now(),
    JSON.stringify(r),
  );
  cek(
    'pembukaan Log Developer tercatat',
    (await daftar('sistem_log', ['modul', 'logdev'])).some((x) => x.aksi === 'buka'),
  );

  // Sesi & aktivitas
  r = await panggil('catatSesi', { jenis: 'mulai', sesiId: 'sesi-uji-0001', halaman: '/' }, T0.pg);
  cek('detak sesi diterima', !r.galat, JSON.stringify(r));
  const sesi = await baca('owner', `sistem_sesi/${AKUN.pg.uid}`);
  cek(
    'sesi mencatat pegawai, halaman, IP & perangkat dari server',
    sesi?.online === true &&
      sesi.halaman === '/' &&
      typeof sesi.ip === 'string' &&
      !!sesi.perangkat,
    JSON.stringify(sesi),
  );
  await panggil(
    'catatSesi',
    { jenis: 'halaman', sesiId: 'sesi-uji-0001', halaman: '/koperasi' },
    T0.pg,
  );
  r = await panggil('catatSesi', { jenis: 'curang', sesiId: 'x' }, T0.pg);
  cek('detak sesi tidak sah ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
  const akt = await daftar('sistem_aktivitas', ['uid', AKUN.pg.uid]);
  cek(
    'aktivitas mencatat buka halaman & panggilan Function dengan TTL',
    akt.some((x) => x.jenis === 'halaman' && x.halaman === '/koperasi') &&
      akt.every((x) => x.kedaluwarsaPada),
    JSON.stringify(akt.map((x) => x.jenis)),
  );
  cek(
    'panggilan Function tercatat (fungsi, hasil, durasi)',
    (await daftar('sistem_aktivitas', ['fn', 'catatPenjualanKantin'])).some(
      (x) => x.status === 'ok' && Number.isInteger(x.ms),
    ),
  );

  // Galat browser & gagal masuk
  const galat = {
    jenis: 'skrip',
    nama: 'TypeError',
    pesan: 'x is undefined',
    lokasi: '/koperasi?q=1',
  };
  await panggil('laporkanGalat', galat, T0.pg);
  r = await panggil('laporkanGalat', galat, T0.pl);
  cek('laporan galat browser diterima', !r.galat && r.hasil.ok, JSON.stringify(r));
  const g = (await daftar('sistem_galat', ['sumber', 'klien:skrip']))[0];
  cek(
    'galat sama dari dua pengguna digabung satu catatan',
    g?.jumlah === 2 && g.penggunaTerdampak.length === 2 && g.lokasi === '/koperasi',
    JSON.stringify(g),
  );
  r = await panggil('laporkanGalat', galat);
  cek('laporan galat tanpa login ditolak', r.galat === 'UNAUTHENTICATED', JSON.stringify(r));
  await panggil('laporkanGagalMasuk', { email: 'Salah@Contoh.test' });
  await panggil('laporkanGagalMasuk', { email: 'salah@contoh.test' });
  const a10 = await daftar('sistem_anomali', ['kode', 'A10']);
  cek(
    'gagal masuk berulang digabung per IP per jam',
    a10.length === 1 && a10[0].jumlah === 2 && a10[0].rincian.emailTerakhir === 'salah@contoh.test',
    JSON.stringify(a10),
  );

  // Anomali dari alur sebelumnya
  const kodeAnomali = new Set((await daftar('sistem_anomali')).map((x) => x.kode));
  cek('anomali penolakan akses (A6) tercatat', kodeAnomali.has('A6'));
  cek('anomali pembatalan penjualan (A2) tercatat', kodeAnomali.has('A2'));
  cek('anomali selisih opname (A1) tercatat', kodeAnomali.has('A1'));
  cek('anomali pengaturan penting (A7) tercatat', kodeAnomali.has('A7'));
  const a2 = (await daftar('sistem_anomali', ['kode', 'A2'])).find((x) => x.modul === 'koperasi');
  cek(
    'anomali menyimpan pelaku dari token (bukan dari data kiriman)',
    a2?.pelaku?.uid === AKUN.kop.uid && a2.status === 'baru',
    JSON.stringify(a2?.pelaku),
  );

  // Baca lewat Function
  r = await bacaLog('ringkasan');
  cek(
    'ringkasan: pengguna online, anomali, galat baru & kuota Firebase',
    !r.galat &&
      r.hasil.online.some((s) => s.uid === AKUN.pg.uid) &&
      r.hasil.galatBaru >= 1 &&
      r.hasil.firebase?.galat === 'EMULATOR',
    JSON.stringify(r).slice(0, 300),
  );
  r = await bacaLog('anomali', { saring: { kode: 'A2' }, ukuran: 5 });
  cek(
    'daftar anomali tersaring menurut kode',
    !r.galat && r.hasil.daftar.length >= 2 && r.hasil.daftar.every((x) => x.kode === 'A2'),
    JSON.stringify(r).slice(0, 300),
  );
  r = await bacaLog('aktivitas', { saring: { uid: AKUN.pg.uid }, ukuran: 2 });
  cek(
    'nama pegawai ditampilkan untuk pelaku',
    r.hasil?.nama?.[AKUN.pg.uid] === 'Budi Contoh',
    JSON.stringify(r.hasil?.nama),
  );
  const hal2 = r.hasil?.daftar?.at(-1)?.id;
  const r2 = await bacaLog('aktivitas', { saring: { uid: AKUN.pg.uid }, ukuran: 2, setelah: hal2 });
  cek(
    'aktivitas berhalaman (halaman 2 berbeda)',
    !r.galat &&
      !r2.galat &&
      r2.hasil.daftar.every((x) => !r.hasil.daftar.some((y) => y.id === x.id)),
    JSON.stringify(r2).slice(0, 200),
  );
  r = await bacaLog('rahasia');
  cek('tampilan tidak dikenal ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
  cek(
    'setiap bacaan Log Developer tercatat',
    (await daftar('sistem_log', ['aksi', 'lihat'])).some(
      (x) => x.target === 'anomali' && x.jumlah >= 1,
    ),
  );

  // Tinjau & ambang
  const idA2 = a2?.id || 'x';
  r = await panggil('tinjauAnomali', { id: idA2, status: 'wajar', catatan: '' }, saSegar);
  cek('tinjau anomali tanpa catatan ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
  r = await panggil(
    'tinjauAnomali',
    { id: idA2, status: 'wajar', catatan: 'Salah input, sudah dicek' },
    T0.kop,
  );
  cek(
    'Manager Koperasi meninjau anomali ditolak',
    r.galat === 'PERMISSION_DENIED',
    JSON.stringify(r),
  );
  r = await panggil(
    'tinjauAnomali',
    { id: idA2, status: 'wajar', catatan: 'Salah input, sudah dicek' },
    saSegar,
  );
  const a2b = await baca('owner', `sistem_anomali/${idA2}`);
  cek(
    'Super Admin meninjau anomali (status, catatan, pemeriksa)',
    !r.galat && a2b.status === 'wajar' && a2b.diperiksaOleh === AKUN.sa.uid,
    JSON.stringify(a2b),
  );
  r = await panggil('aturAmbangLogDev', { ambang: { hariMundur: 0 }, alasan: 'Uji' }, saSegar);
  cek('ambang di luar batas ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
  r = await panggil(
    'aturAmbangLogDev',
    { ambang: { hariMundur: 3 }, alasan: 'Uji ketat' },
    saSegar,
  );
  cek(
    'ambang tersimpan & tercatat',
    !r.galat &&
      (await baca('owner', 'sistem_pengaturan/logdev'))?.ambang?.hariMundur === 3 &&
      (await daftar('sistem_log', ['aksi', 'aturAmbang'])).length === 1,
    JSON.stringify(r),
  );

  // Pemakaian Firebase & tarif
  r = await bacaLog('firebase');
  cek(
    'pemakaian Firebase di Emulator: pesan jelas + tarif bawaan',
    !r.galat && r.hasil.galat === 'EMULATOR' && r.hasil.tarif?.gratisBacaHari === 50000,
    JSON.stringify(r).slice(0, 300),
  );
  r = await bacaLog('firebase', {}, T0.um);
  cek(
    'pemakaian Firebase oleh non-Super Admin ditolak',
    r.galat === 'PERMISSION_DENIED',
    JSON.stringify(r),
  );
  r = await panggil('aturTarifLogDev', { tarif: { kurs: -1 }, alasan: 'Uji' }, saSegar);
  cek('tarif negatif ditolak', r.galat === 'INVALID_ARGUMENT', JSON.stringify(r));
  r = await panggil(
    'aturTarifLogDev',
    { tarif: { kurs: 16000, bacaPer100rb: 0.07 }, alasan: 'Sesuai Console' },
    saSegar,
  );
  const peng = await baca('owner', 'sistem_pengaturan/logdev');
  cek(
    'tarif tersimpan (yang tidak diisi memakai bawaan) & tercatat',
    !r.galat &&
      peng?.tarif?.kurs === 16000 &&
      peng.tarif.bacaPer100rb === 0.07 &&
      peng.tarif.gratisTulisHari === 20000 &&
      (await daftar('sistem_log', ['aksi', 'aturTarif'])).length === 1,
    JSON.stringify({ r, tarif: peng?.tarif }),
  );

  // Pemeriksaan & segel
  r = await panggil('jalankanPemeriksaan', {}, saSegar);
  cek(
    'pemeriksaan: buku Koperasi seimbang, tidak ada segel rusak',
    !r.galat && r.hasil.bukuKoperasi === 'seimbang' && r.hasil.segelRusak.length === 0,
    JSON.stringify(r),
  );
  const kemarin = new Date(Date.now() + 8 * 3600000 - 86400000).toISOString().slice(0, 10);
  const segel = await baca('owner', `sistem_segel/${kemarin}`);
  cek(
    'segel harian dibuat (hash berantai)',
    /^[0-9a-f]{64}$/.test(segel?.hash || ''),
    JSON.stringify(segel),
  );

  // Pengamat penulisan browser (lewat rules)
  const pathKat = `koperasi_kantin_kategori/${kat1}`;
  r = await tulis(
    T0.kop,
    pathKat,
    { nama: 'Minuman Dingin', diubahOleh: AKUN.kop.uid },
    { ubah: true, waktu: ['diubahPada'] },
  );
  const logKlien = await sampai(async () =>
    (await daftar('sistem_log', ['target', pathKat])).find(
      (x) => x.jalur === 'klien' && x.aksi === 'ubah',
    ),
  );
  cek(
    'perubahan dari browser tercatat beserta selisihnya',
    logKlien?.perubahan?.nama?.lama === 'Minuman Contoh' &&
      logKlien.perubahan.nama.baru === 'Minuman Dingin' &&
      logKlien.oleh === AKUN.kop.uid,
    JSON.stringify({ r, logKlien }),
  );
}

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
