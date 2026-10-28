/* global process, console, fetch, setTimeout */
// Uji alur Cloud Functions LPJ, MAK, Persuratan & Inventory (P3–P6) di Firebase Emulator (proyek demo, tidak
// menyentuh cloud): buat berkas → kunci SP/TTE/SPD lewat rules → selesaikanSpby (nomor + realisasi
// + rekap) → Keuangan → hapusBerkas; Batal/Pulihkan realisasi, revisi pagu, hapus node MAK; DRPP;
// nomor surat (terbitkanNomorSurat, aturPenghitung, nomor SP Srikandi); lalu Inventory (catat,
// ubah, batalkan transaksi, tutup buku, ganti kode SAKTI).
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

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
