// Uji firestore.rules & storage.rules di Firebase Emulator (tanpa dependensi tambahan).
// Jalankan Emulator lebih dulu dengan proyek demo (tidak menyentuh proyek cloud):
//   firebase emulators:start --only firestore,storage --project demo-imigrasi
// lalu di terminal lain: node scripts/uji-rules.mjs
// Setiap perubahan rules wajib menambah kasus izin & tolak di sini (docs/skema-database.md bagian 10).
/* global Buffer, process, console, fetch */
const P = 'demo-imigrasi';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`;
const ST = 'http://127.0.0.1:9199/v0/b/demo-imigrasi.appspot.com/o';
const TAHUN = new Date().getUTCFullYear();
const TAHUN_WITA = Number(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric' }).format(
    new Date(),
  ),
);

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token(uid, klaim = {}, provider = 'password') {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${P}`,
    aud: P,
    auth_time: now,
    iat: now,
    exp: now + 3600,
    sub: uid,
    user_id: uid,
    email: `${uid}@contoh.test`,
    email_verified: true,
    firebase: { sign_in_provider: provider, identities: {} },
    ...klaim,
  })}.`;
}
const akun = (uid, peran, pegawaiId) => token(uid, { aktif: true, peran, pegawaiId });
const U = {
  sa: akun('uSA', ['superadmin'], 'pSA'),
  keu: akun('uKEU', ['keuangan'], 'pKEU'),
  kep: akun('uKEP', ['kepegawaian'], 'pKEP'),
  um: akun('uUM', ['umum'], 'pUM'),
  pg: akun('uPG', [], 'pPG'),
  pg2: akun('uPG2', [], 'pPG2'),
  tanpaKlaim: token('uX'),
  anonim: token('uAN', { aktif: true, peran: [], pegawaiId: 'pAN' }, 'anonymous'),
  owner: 'owner',
};

function nilai(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number')
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(nilai) } };
  return { mapValue: { fields: medan(v) } };
}
const medan = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, nilai(v)]));
const nama = (path) => `projects/${P}/databases/(default)/documents/${path}`;
const auth = (t) => (t ? { Authorization: `Bearer ${t}` } : {});

async function commit(t, write) {
  const r = await fetch(`${FS}:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth(t) },
    body: JSON.stringify({ writes: [write] }),
  });
  return r.ok;
}
// waktu: daftar field yang diisi waktu server (serverTimestamp)
const buat = (t, path, data, waktu = []) =>
  commit(t, {
    update: { name: nama(path), fields: medan(data) },
    updateTransforms: waktu.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' })),
    currentDocument: { exists: false },
  });
const tulisUlang = (t, path, data, waktu = []) =>
  commit(t, {
    update: { name: nama(path), fields: medan(data) },
    updateTransforms: waktu.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' })),
  });
const ubah = (t, path, data, waktu = []) =>
  commit(t, {
    update: { name: nama(path), fields: medan(data) },
    updateMask: {
      fieldPaths: [...Object.keys(data)].map((k) =>
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `\`${k}\``,
      ),
    },
    updateTransforms: waktu.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' })),
    currentDocument: { exists: true },
  });
const hapusDok = (t, path) => commit(t, { delete: nama(path) });
const ambil = async (t, path) => (await fetch(`${FS}/${path}`, { headers: auth(t) })).ok;
async function daftar(t, koleksi, { limit, filter } = {}) {
  const q = { from: [{ collectionId: koleksi }] };
  if (limit) q.limit = limit;
  if (filter)
    q.where = {
      fieldFilter: { field: { fieldPath: filter[0] }, op: filter[1], value: nilai(filter[2]) },
    };
  const r = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth(t) },
    body: JSON.stringify({ structuredQuery: q }),
  });
  return r.ok;
}
// Unggah multipart seperti SDK Firebase (contentType dikirim lewat metadata).
async function unggah(t, path, tipe, ukuran = 100) {
  const batas = 'batasUjiRules';
  const body = Buffer.concat([
    Buffer.from(
      `--${batas}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${JSON.stringify({ name: path, contentType: tipe })}\r\n--${batas}\r\nContent-Type: ${tipe}\r\n\r\n`,
    ),
    Buffer.alloc(ukuran, 1),
    Buffer.from(`\r\n--${batas}--`),
  ]);
  const r = await fetch(`${ST}?name=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${batas}`,
      'X-Goog-Upload-Protocol': 'multipart',
      ...auth(t),
    },
    body,
  });
  return r.ok;
}
const unduh = async (t, path) =>
  (await fetch(`${ST}/${encodeURIComponent(path)}?alt=media`, { headers: auth(t) })).ok;
const hapusBerkas = async (t, path) =>
  (await fetch(`${ST}/${encodeURIComponent(path)}`, { method: 'DELETE', headers: auth(t) })).ok;
const daftarBerkas = async (t, prefix) =>
  (await fetch(`${ST}?prefix=${encodeURIComponent(prefix)}`, { headers: auth(t) })).ok;

let lulus = 0,
  gagal = 0;
async function cek(judul, harap, janji) {
  const hasil = await janji;
  const ok = hasil === harap;
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  [${harap ? 'izin' : 'tolak'}] ${judul}`);
}

const AUDIT = ['dibuatPada', 'diubahPada'];
const audit = (uid) => ({ dibuatOleh: uid, diubahOleh: uid });

// ── Data awal (owner melewati rules) ──────────────────────────────────────
await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${P}/databases/(default)/documents`, {
  method: 'DELETE',
});
{
  // kosongkan Storage emulator (owner melewati rules)
  const isi = await (await fetch(ST, { headers: auth(U.owner) })).json();
  for (const it of isi.items || []) await hapusBerkas(U.owner, it.name);
}
const pegawaiDasar = {
  nama: 'Budi Contoh',
  nip: '000000000000000000',
  statusKepegawaian: 'pns',
  pangkatId: '',
  pangkatNama: '',
  golongan: '',
  jabatanId: '',
  jabatanNama: '',
  unitId: '',
  seksi: 'Tata Usaha',
  tanggalLahir: '1990-01-01',
  fotoPaths: [],
};
await buat(
  U.owner,
  'pegawai/pPG',
  { ...pegawaiDasar, ...audit('uKEP'), peran: [], aktif: true },
  AUDIT,
);
await buat(
  U.owner,
  'pegawai/pSA2',
  { ...pegawaiDasar, ...audit('uSA'), peran: ['superadmin'], aktif: true },
  AUDIT,
);
await buat(U.owner, 'pegawai_ringkas/pPG2', { nama: 'Siti Contoh', aktif: true });
const berkasDasar = (anggota) => ({
  skema: 1,
  jenis: 'perjadin',
  uraian: 'Perjalanan dinas contoh',
  tahunAnggaran: TAHUN,
  dicetak: {},
  anggotaUids: anggota,
  ...audit('uPG'),
});
await buat(
  U.owner,
  'lpj_berkas/B1',
  { ...berkasDasar(['uPG']), versi: 3, sp: { terkunci: true, menimbang: 'x' } },
  AUDIT,
);
await buat(
  U.owner,
  'lpj_berkas/B3',
  {
    ...berkasDasar(['uPG']),
    versi: 5,
    sp: { terkunci: true },
    tte: { terkunci: true },
    spd: { terkunci: true },
  },
  AUDIT,
);
await buat(
  U.owner,
  'lpj_berkas/B2',
  {
    ...berkasDasar(['uPG']),
    versi: 9,
    nomorLpj: `LPJ-${TAHUN}-10-0001`,
    sp: { terkunci: true },
    tte: { terkunci: true },
    spd: { terkunci: true },
    lpj: { terkunci: true },
  },
  AUDIT,
);
await buat(U.owner, 'lpj_ringkas/B1', { anggotaUids: ['uPG'], tahunAnggaran: TAHUN });
await buat(U.owner, 'lpj_ringkas/BX', { anggotaUids: ['uLAIN'], tahunAnggaran: TAHUN });
const drppDasar = {
  tahunAnggaran: TAHUN,
  tanggal: `${TAHUN}-10-30`,
  berkasIds: ['B2'],
  masuk: {},
  dokumen: {},
  anggotaUids: ['uPG'],
  ...audit('uKEU'),
};
await buat(U.owner, 'lpj_drpp/D1', { ...drppDasar, status: 'aktif' }, AUDIT);
await buat(
  U.owner,
  'lpj_drpp/D2',
  { ...drppDasar, status: 'batal', berkasIds: [], batal: { alasan: 'uji', berkasIds: ['B2'] } },
  AUDIT,
);
const nomorDasar = {
  nomorUrut: 1,
  tahun: TAHUN,
  tanggal: `${TAHUN}-10-01`,
  jenisSurat: '',
  kode: [],
  perihal: 'Undangan rapat',
  tujuan: 'Kanwil',
  seksi: 'Tata Usaha',
  berkasId: null,
  status: 'aktif',
  ...audit('uPG'),
};
await buat(
  U.owner,
  'surat_nomor/N1',
  { ...nomorDasar, nomor: 'W20.IMI.1-0001', sumber: 'register' },
  AUDIT,
);
await buat(
  U.owner,
  'surat_nomor/N4',
  { ...nomorDasar, nomor: 'SP-SRIKANDI-1', sumber: 'srikandi', berkasId: 'B2' },
  AUDIT,
);
await buat(U.owner, `sistem_penghitung/surat_${TAHUN}`, { nilai: 1 });
await buat(U.owner, `sistem_penghitung/lpj_${TAHUN}`, { nilai: 1 });

// ── Identitas ─────────────────────────────────────────────────────────────
await cek('tanpa login membaca pegawai_ringkas', false, ambil(null, 'pegawai_ringkas/pPG2'));
await cek(
  'akun tanpa claim aktif membaca pegawai_ringkas',
  false,
  ambil(U.tanpaKlaim, 'pegawai_ringkas/pPG2'),
);
await cek(
  'akun anonim (bukan password) membaca pegawai_ringkas',
  false,
  ambil(U.anonim, 'pegawai_ringkas/pPG2'),
);
await cek('pegawai membaca pegawai_ringkas', true, ambil(U.pg, 'pegawai_ringkas/pPG2'));
await cek('pegawai daftar pegawai_ringkas tanpa limit', false, daftar(U.pg, 'pegawai_ringkas'));
await cek(
  'pegawai daftar pegawai_ringkas limit 50',
  true,
  daftar(U.pg, 'pegawai_ringkas', { limit: 50 }),
);
await cek('pegawai membaca dokumen pegawai sendiri', true, ambil(U.pg, 'pegawai/pPG'));
await cek('pegawai membaca dokumen pegawai orang lain', false, ambil(U.pg2, 'pegawai/pPG'));
await cek(
  'pegawai membuat dokumen pegawai',
  false,
  buat(U.pg, 'pegawai/pBaru', { ...pegawaiDasar, ...audit('uPG') }, AUDIT),
);
await cek(
  'Kepegawaian membuat pegawai sah',
  true,
  buat(U.kep, 'pegawai/pBaru', { ...pegawaiDasar, ...audit('uKEP') }, AUDIT),
);
await cek(
  'Kepegawaian membuat pegawai berisi peran',
  false,
  buat(
    U.kep,
    'pegawai/pBaru2',
    { ...pegawaiDasar, ...audit('uKEP'), peran: ['superadmin'] },
    AUDIT,
  ),
);
await cek(
  'Kepegawaian memberi peran lewat update',
  false,
  ubah(U.kep, 'pegawai/pPG', { peran: ['keuangan'], diubahOleh: 'uKEP' }, ['diubahPada']),
);
await cek(
  'Kepegawaian mengubah nama pegawai',
  true,
  ubah(U.kep, 'pegawai/pPG', { nama: 'Budi Contoh Baru', diubahOleh: 'uKEP' }, ['diubahPada']),
);
await cek(
  'Kepegawaian mengubah data Super Admin',
  false,
  ubah(U.kep, 'pegawai/pSA2', { nama: 'X', diubahOleh: 'uKEP' }, ['diubahPada']),
);
await cek(
  'Kepegawaian memalsukan diubahOleh',
  false,
  ubah(U.kep, 'pegawai/pPG', { nama: 'Y', diubahOleh: 'uLAIN' }, ['diubahPada']),
);
await cek('Kepegawaian menghapus pegawai', false, commit(U.kep, { delete: nama('pegawai/pPG') }));
await cek(
  'preferensi sendiri',
  true,
  tulisUlang(U.pg, 'pengguna_preferensi/uPG', { modeGelap: true }, ['diubahPada']),
);
await cek(
  'preferensi orang lain',
  false,
  tulisUlang(U.pg, 'pengguna_preferensi/uPG2', { modeGelap: true }, ['diubahPada']),
);
await cek(
  'ucapan ultah sah',
  true,
  buat(
    U.pg,
    `ultah_ucapan/${TAHUN_WITA}_pPG2_uPG`,
    {
      tahun: TAHUN_WITA,
      untukPegawaiId: 'pPG2',
      dariUid: 'uPG',
      pesan: 'Selamat!',
      terimaKasih: false,
      terimaKasihPada: null,
    },
    ['dibuatPada'],
  ),
);
await cek(
  'ucapan ultah dengan pengirim palsu',
  false,
  buat(
    U.pg,
    `ultah_ucapan/${TAHUN_WITA}_pPG2_uLAIN`,
    {
      tahun: TAHUN_WITA,
      untukPegawaiId: 'pPG2',
      dariUid: 'uLAIN',
      pesan: 'x',
      terimaKasih: false,
      terimaKasihPada: null,
    },
    ['dibuatPada'],
  ),
);
await cek(
  'ucapan ultah untuk diri sendiri',
  false,
  buat(
    U.pg,
    `ultah_ucapan/${TAHUN_WITA}_pPG_uPG`,
    {
      tahun: TAHUN_WITA,
      untukPegawaiId: 'pPG',
      dariUid: 'uPG',
      pesan: 'x',
      terimaKasih: false,
      terimaKasihPada: null,
    },
    ['dibuatPada'],
  ),
);

// ── Foto pegawai, pejabat, kejutan & ucapan ulang tahun (P7) ──────────────
const fotoPPG = (n) => `pegawai/pPG/foto/${1767225600000 + n}-f.jpg`;
const ubahFoto = (fotoPaths) =>
  ubah(U.kep, 'pegawai/pPG', { fotoPaths, diubahOleh: 'uKEP' }, ['diubahPada']);
await cek('Kepegawaian menyimpan fotoPaths sah', true, ubahFoto([fotoPPG(1), fotoPPG(2)]));
await cek(
  'fotoPaths menunjuk folder pegawai lain',
  false,
  ubahFoto(['pegawai/pPG2/foto/1767225600001-f.jpg']),
);
await cek(
  'fotoPaths menunjuk folder thumb',
  false,
  ubahFoto(['pegawai/pPG/thumb/1767225600001-f.jpg']),
);
await cek('fotoPaths berisi path ganda', false, ubahFoto([fotoPPG(1), fotoPPG(1)]));
await cek(
  'fotoPaths lebih dari 9',
  false,
  ubahFoto(Array.from({ length: 10 }, (_, i) => fotoPPG(i))),
);
await cek('fotoPaths berisi bukan teks', false, ubahFoto([fotoPPG(1), 5]));
await cek(
  'Kepegawaian membuat pegawai dengan foto di folder sendiri',
  true,
  buat(
    U.kep,
    'pegawai/pFoto',
    { ...pegawaiDasar, fotoPaths: ['pegawai/pFoto/foto/1767225600001-f.jpg'], ...audit('uKEP') },
    AUDIT,
  ),
);

const pejabatBaru = (pegawaiId, jenis = 'ppk') => ({
  jenis,
  pegawaiId,
  berlakuMulai: `${TAHUN}-01-01`,
  berlakuSampai: null,
});
await cek(
  'Kepegawaian menetapkan PPK',
  true,
  buat(U.kep, 'pegawai_pejabat/J1', { ...pejabatBaru('pPG'), ...audit('uKEP') }, AUDIT),
);
await cek(
  'Keuangan menetapkan pejabat',
  false,
  buat(U.keu, 'pegawai_pejabat/J2', { ...pejabatBaru('pPG'), ...audit('uKEU') }, AUDIT),
);
await cek(
  'pegawai menetapkan pejabat',
  false,
  buat(U.pg, 'pegawai_pejabat/J2', { ...pejabatBaru('pPG'), ...audit('uPG') }, AUDIT),
);
await cek(
  'pejabat untuk pegawai yang tidak ada',
  false,
  buat(U.kep, 'pegawai_pejabat/J3', { ...pejabatBaru('pTIDAKADA'), ...audit('uKEP') }, AUDIT),
);
await cek(
  'jenis pejabat tidak dikenal',
  false,
  buat(U.kep, 'pegawai_pejabat/J4', { ...pejabatBaru('pPG', 'direktur'), ...audit('uKEP') }, AUDIT),
);
await cek('pegawai membaca daftar pejabat', true, daftar(U.pg, 'pegawai_pejabat', { limit: 200 }));
await cek('daftar pejabat melebihi batas', false, daftar(U.pg, 'pegawai_pejabat', { limit: 201 }));
await cek(
  'Kepegawaian mengakhiri masa jabatan',
  true,
  ubah(U.kep, 'pegawai_pejabat/J1', { berlakuSampai: `${TAHUN}-06-30`, diubahOleh: 'uKEP' }, [
    'diubahPada',
  ]),
);
await cek(
  'tanggal akhir sebelum tanggal mulai',
  false,
  ubah(U.kep, 'pegawai_pejabat/J1', { berlakuSampai: `${TAHUN - 1}-12-31`, diubahOleh: 'uKEP' }, [
    'diubahPada',
  ]),
);
await cek(
  'mengganti pegawai pada penetapan',
  false,
  ubah(U.kep, 'pegawai_pejabat/J1', { pegawaiId: 'pSA2', diubahOleh: 'uKEP' }, ['diubahPada']),
);
await cek(
  'Keuangan mengakhiri masa jabatan',
  false,
  ubah(U.keu, 'pegawai_pejabat/J1', { berlakuSampai: `${TAHUN}-07-31`, diubahOleh: 'uKEU' }, [
    'diubahPada',
  ]),
);
await cek('menghapus penetapan pejabat', false, hapusDok(U.kep, 'pegawai_pejabat/J1'));

await cek(
  'pemilik menandai kejutan tahun ini',
  true,
  tulisUlang(U.pg, 'ultah_status/pPG', { kejutanTahun: TAHUN_WITA }, ['kejutanPada']),
);
await cek(
  'pemilik menandai kejutan tahun lain',
  false,
  tulisUlang(U.pg, 'ultah_status/pPG', { kejutanTahun: TAHUN_WITA - 1 }, ['kejutanPada']),
);
await cek(
  'pegawai menandai kejutan orang lain',
  false,
  tulisUlang(U.pg2, 'ultah_status/pPG', { kejutanTahun: TAHUN_WITA }, ['kejutanPada']),
);
await cek('pemilik membaca status kejutannya', true, ambil(U.pg, 'ultah_status/pPG'));
await cek('pegawai lain membaca status kejutan', false, ambil(U.pg2, 'ultah_status/pPG'));
await cek(
  'Kepegawaian me-reset kejutan',
  true,
  ubah(U.kep, 'ultah_status/pPG', { kejutanTahun: null, resetOleh: 'uKEP' }, ['resetPada']),
);
await cek(
  'Kepegawaian me-reset dengan pelaku palsu',
  false,
  ubah(U.kep, 'ultah_status/pPG', { kejutanTahun: null, resetOleh: 'uLAIN' }, ['resetPada']),
);

const ucapanPG = `ultah_ucapan/${TAHUN_WITA}_pPG2_uPG`;
await cek(
  'mengirim ucapan kedua ke orang yang sama',
  false,
  tulisUlang(
    U.pg,
    ucapanPG,
    {
      tahun: TAHUN_WITA,
      untukPegawaiId: 'pPG2',
      dariUid: 'uPG',
      pesan: 'Lagi!',
      terimaKasih: false,
      terimaKasihPada: null,
    },
    ['dibuatPada'],
  ),
);
await cek('pengirim mengubah pesan ucapan', false, ubah(U.pg, ucapanPG, { pesan: 'Ganti' }));
await cek(
  'penerima membalas terima kasih',
  true,
  ubah(U.pg2, ucapanPG, { terimaKasih: true }, ['terimaKasihPada']),
);
await cek(
  'penerima membatalkan terima kasih',
  false,
  ubah(U.pg2, ucapanPG, { terimaKasih: false, terimaKasihPada: null }),
);
await cek(
  'penerima melihat daftar ucapannya',
  true,
  daftar(U.pg2, 'ultah_ucapan', { limit: 50, filter: ['untukPegawaiId', 'EQUAL', 'pPG2'] }),
);
await cek(
  'pegawai melihat ucapan untuk orang lain',
  false,
  daftar(U.pg, 'ultah_ucapan', { limit: 50, filter: ['untukPegawaiId', 'EQUAL', 'pPG2'] }),
);
await cek(
  'pengirim melihat ucapan yang ia kirim',
  true,
  daftar(U.pg, 'ultah_ucapan', { limit: 50, filter: ['dariUid', 'EQUAL', 'uPG'] }),
);
await cek('pegawai menghapus ucapan', false, hapusDok(U.pg2, ucapanPG));
await cek('Kepegawaian menghapus ucapan (reset uji)', true, hapusDok(U.kep, ucapanPG));

// ── LPJ ───────────────────────────────────────────────────────────────────
const berkasBaru = {
  skema: 1,
  jenis: 'perjadin',
  uraian: 'Kegiatan baru',
  tahunAnggaran: TAHUN,
  versi: 1,
  dicetak: {},
  sp: { terkunci: false },
  anggotaUids: ['uPG'],
  ...audit('uPG'),
};
await cek('pegawai membuat berkas LPJ sah', true, buat(U.pg, 'lpj_berkas/BN', berkasBaru, AUDIT));
await cek(
  'membuat berkas dengan nomorLpj sendiri',
  false,
  buat(U.pg, 'lpj_berkas/BN2', { ...berkasBaru, nomorLpj: 'LPJ-PALSU' }, AUDIT),
);
await cek(
  'membuat berkas dengan anggota tambahan',
  false,
  buat(U.pg, 'lpj_berkas/BN3', { ...berkasBaru, anggotaUids: ['uPG', 'uPG2'] }, AUDIT),
);
await cek(
  'membuat berkas langsung berisi SPD',
  false,
  buat(U.pg, 'lpj_berkas/BN4', { ...berkasBaru, spd: { terkunci: false } }, AUDIT),
);
await cek(
  'mengubah SP yang sudah terkunci',
  false,
  ubah(
    U.pg,
    'lpj_berkas/B1',
    { sp: { terkunci: true, menimbang: 'diubah' }, versi: 4, diubahOleh: 'uPG' },
    ['diubahPada'],
  ),
);
await cek(
  'mengisi TTE setelah SP terkunci',
  true,
  ubah(
    U.pg,
    'lpj_berkas/B1',
    { tte: { terkunci: false, nomorSurat: 'X' }, versi: 4, diubahOleh: 'uPG' },
    ['diubahPada'],
  ),
);
await cek(
  'mengisi SPD sebelum TTE terkunci',
  false,
  ubah(U.pg, 'lpj_berkas/B1', { spd: { terkunci: false }, versi: 5, diubahOleh: 'uPG' }, [
    'diubahPada',
  ]),
);
await cek(
  'simpan tanpa menaikkan versi',
  false,
  ubah(U.pg, 'lpj_berkas/B1', { uraian: 'lain', versi: 4, diubahOleh: 'uPG' }, ['diubahPada']),
);
await cek(
  'mengisi LPJ setelah SPD terkunci',
  true,
  ubah(
    U.pg,
    'lpj_berkas/B3',
    { lpj: { terkunci: false, transaksi: [] }, versi: 6, diubahOleh: 'uPG' },
    ['diubahPada'],
  ),
);
await cek(
  'mengunci LPJ sendiri (harus lewat Function)',
  false,
  ubah(
    U.pg,
    'lpj_berkas/B3',
    { lpj: { terkunci: true, transaksi: [] }, versi: 7, diubahOleh: 'uPG' },
    ['diubahPada'],
  ),
);
await cek(
  'menulis tahap/nomor dari klien',
  false,
  ubah(U.pg, 'lpj_berkas/B3', { tahap: 'arsip', versi: 7, diubahOleh: 'uPG' }, ['diubahPada']),
);
await cek('bukan anggota membaca berkas', false, ambil(U.pg2, 'lpj_berkas/B1'));
await cek('Keuangan membaca berkas', true, ambil(U.keu, 'lpj_berkas/B1'));
await cek(
  'Keuangan menyunting isi fase (D5 belum diizinkan)',
  false,
  ubah(U.keu, 'lpj_berkas/B3', { uraian: 'x', versi: 7, diubahOleh: 'uKEU' }, ['diubahPada']),
);
await cek(
  'daftar lpj_berkas langsung (harus lewat ringkas)',
  false,
  daftar(U.keu, 'lpj_berkas', { limit: 10 }),
);
await cek(
  'pegawai daftar ringkas miliknya + limit',
  true,
  daftar(U.pg, 'lpj_ringkas', { limit: 50, filter: ['anggotaUids', 'ARRAY_CONTAINS', 'uPG'] }),
);
await cek('pegawai daftar semua ringkas', false, daftar(U.pg, 'lpj_ringkas', { limit: 50 }));
await cek('Keuangan daftar ringkas tanpa limit', false, daftar(U.keu, 'lpj_ringkas'));
await cek('Keuangan daftar ringkas limit 50', true, daftar(U.keu, 'lpj_ringkas', { limit: 50 }));
await cek('berkas dihapus dari klien', false, commit(U.pg, { delete: nama('lpj_berkas/BN') }));
await cek(
  'bukti pengeluaran sebelum verifikasi',
  true,
  buat(
    U.pg,
    'lpj_berkas/B2/bukti/K1',
    {
      pelaksanaId: 'pPG',
      label: 'Tiket',
      dibuatOleh: 'uPG',
      berkas: {
        path: 'lpj/B2/bukti/pPG/1767225600000-tiket.pdf',
        nama: 'tiket.pdf',
        ukuran: 1000,
        tipe: 'application/pdf',
        diunggahOleh: 'uPG',
      },
    },
    ['dibuatPada'],
  ),
);
await cek(
  'bukti dengan path folder lain',
  false,
  buat(
    U.pg,
    'lpj_berkas/B2/bukti/K2',
    {
      pelaksanaId: 'pPG',
      label: 'Tiket',
      dibuatOleh: 'uPG',
      berkas: {
        path: 'lpj/B9/arsip/1767225600000-x.pdf',
        nama: 'x.pdf',
        ukuran: 1000,
        tipe: 'application/pdf',
        diunggahOleh: 'uPG',
      },
    },
    ['dibuatPada'],
  ),
);
await cek(
  'verifikasi untuk berkas belum bernomor',
  false,
  buat(
    U.keu,
    'lpj_berkas/B1/keuangan/status',
    { verifikasi: { selesai: false }, ...audit('uKEU') },
    AUDIT,
  ),
);
await cek(
  'SAKTI selesai sebelum verifikasi selesai',
  false,
  buat(
    U.keu,
    'lpj_berkas/B2/keuangan/status',
    { verifikasi: { selesai: false }, sakti: { selesai: true }, ...audit('uKEU') },
    AUDIT,
  ),
);
await cek(
  'pegawai menulis bagian Keuangan',
  false,
  buat(
    U.pg,
    'lpj_berkas/B2/keuangan/status',
    { verifikasi: { selesai: true }, ...audit('uPG') },
    AUDIT,
  ),
);
await cek(
  'Keuangan membuat status keuangan yang sudah bertaut DRPP',
  false,
  buat(
    U.keu,
    'lpj_berkas/B2/keuangan/status',
    { verifikasi: { selesai: true }, arsip: { drppId: 'D1' }, ...audit('uKEU') },
    AUDIT,
  ),
);
await cek(
  'Keuangan menyelesaikan verifikasi',
  true,
  buat(
    U.keu,
    'lpj_berkas/B2/keuangan/status',
    { verifikasi: { selesai: true }, ...audit('uKEU') },
    AUDIT,
  ),
);
const KEU_B2 = 'lpj_berkas/B2/keuangan/status';
await cek(
  'Keuangan menautkan berkas ke DRPP sendiri (hanya Function)',
  false,
  ubah(U.keu, KEU_B2, { arsip: { drppId: 'D1' }, diubahOleh: 'uKEU' }, ['diubahPada']),
);
await cek(
  'no. kwitansi SAKTI lebih dari 60 karakter',
  false,
  ubah(
    U.keu,
    KEU_B2,
    { sakti: { selesai: true, nomorKwitansi: 'K'.repeat(61) }, diubahOleh: 'uKEU' },
    ['diubahPada'],
  ),
);
await cek(
  'Keuangan mencatat no. kwitansi SAKTI',
  true,
  ubah(
    U.keu,
    KEU_B2,
    { sakti: { selesai: true, nomorKwitansi: `00001/KW/000000/${TAHUN}` }, diubahOleh: 'uKEU' },
    ['diubahPada'],
  ),
);
const metaDrpp = (id) => ({
  path: `drpp/${id}/drpp/1767225600000-d.pdf`,
  nama: 'd.pdf',
  ukuran: 1000,
  tipe: 'application/pdf',
  diunggahOleh: 'uKEU',
});
await cek('pelaksana membaca DRPP berkasnya', true, ambil(U.pg, 'lpj_drpp/D1'));
await cek('pegawai lain membaca DRPP', false, ambil(U.pg2, 'lpj_drpp/D1'));
await cek(
  'daftar DRPP anggota tanpa limit',
  false,
  daftar(U.pg, 'lpj_drpp', { filter: ['anggotaUids', 'ARRAY_CONTAINS', 'uPG'] }),
);
await cek(
  'daftar DRPP anggota dengan limit 50',
  true,
  daftar(U.pg, 'lpj_drpp', { limit: 50, filter: ['anggotaUids', 'ARRAY_CONTAINS', 'uPG'] }),
);
await cek(
  'Keuangan membuat DRPP langsung (hanya Function)',
  false,
  buat(U.keu, 'lpj_drpp/D3', { ...drppDasar, status: 'aktif' }, AUDIT),
);
await cek(
  'Keuangan mengisi dokumen DRPP aktif',
  true,
  ubah(U.keu, 'lpj_drpp/D1', { dokumen: { drpp: metaDrpp('D1') }, diubahOleh: 'uKEU' }, [
    'diubahPada',
  ]),
);
await cek(
  'Keuangan mengisi dokumen DRPP yang dibatalkan',
  false,
  ubah(U.keu, 'lpj_drpp/D2', { dokumen: { drpp: metaDrpp('D2') }, diubahOleh: 'uKEU' }, [
    'diubahPada',
  ]),
);
await cek(
  'Keuangan mengubah daftar berkas DRPP (hanya Function)',
  false,
  ubah(U.keu, 'lpj_drpp/D1', { berkasIds: ['B1'], diubahOleh: 'uKEU' }, ['diubahPada']),
);
await cek(
  'Keuangan menulis berkas masuk DRPP (hanya Function)',
  false,
  ubah(U.keu, 'lpj_drpp/D1', { masuk: { B2: { nomorLpj: 'x', total: 1 } }, diubahOleh: 'uKEU' }, [
    'diubahPada',
  ]),
);
await cek(
  'bukti setelah verifikasi selesai',
  false,
  buat(
    U.pg,
    'lpj_berkas/B2/bukti/K3',
    {
      pelaksanaId: 'pPG',
      label: 'Tiket',
      dibuatOleh: 'uPG',
      berkas: {
        path: 'lpj/B2/bukti/pPG/1767225600000-t2.pdf',
        nama: 't2.pdf',
        ukuran: 1000,
        tipe: 'application/pdf',
        diunggahOleh: 'uPG',
      },
    },
    ['dibuatPada'],
  ),
);

// ── MAK ───────────────────────────────────────────────────────────────────
const nodeTahun = {
  tahunAnggaran: TAHUN,
  tingkat: 'tahun',
  kode: '',
  nama: String(TAHUN),
  indukId: null,
  pagu: 0,
  aktif: true,
  urutan: 0,
  ...audit('uKEU'),
};
await cek('Keuangan membuat node MAK', true, buat(U.keu, 'mak_node/M1', nodeTahun, AUDIT));
await cek(
  'pegawai membuat node MAK',
  false,
  buat(U.pg, 'mak_node/M2', { ...nodeTahun, ...audit('uPG') }, AUDIT),
);
await cek(
  'pagu di tingkat selain Item',
  false,
  buat(U.keu, 'mak_node/M3', { ...nodeTahun, tingkat: 'akun', indukId: 'M1', pagu: 5000 }, AUDIT),
);
await cek(
  'pagu berupa teks',
  false,
  buat(
    U.keu,
    'mak_node/M4',
    { ...nodeTahun, tingkat: 'item', indukId: 'M1', pagu: '1.500.000' },
    AUDIT,
  ),
);
await cek(
  'Item dengan pagu angka bulat',
  true,
  buat(
    U.keu,
    'mak_node/M5',
    { ...nodeTahun, tingkat: 'item', indukId: 'M1', pagu: 1500000 },
    AUDIT,
  ),
);
await cek('menulis realisasi dari klien', false, buat(U.keu, 'mak_realisasi/R1', { jumlah: 1 }));
await cek('pegawai membaca realisasi', false, daftar(U.pg, 'mak_realisasi', { limit: 10 }));

// ── Persuratan ────────────────────────────────────────────────────────────
await cek(
  'pegawai membuat nomor surat langsung',
  false,
  buat(U.pg, 'surat_nomor/N2', { nomor: 'X' }),
);
await cek(
  'Keuangan membuat nomor surat langsung',
  false,
  buat(U.keu, 'surat_nomor/N3', { nomor: 'X' }),
);
await cek(
  'pegawai membaca register nomor (limit)',
  true,
  daftar(U.pg, 'surat_nomor', { limit: 50 }),
);
await cek(
  'pemohon mengubah keterangan nomor (perihal, tujuan)',
  true,
  ubah(
    U.pg,
    'surat_nomor/N1',
    { perihal: 'Undangan rapat koordinasi', tujuan: 'Kanwil Bali', diubahOleh: 'uPG' },
    ['diubahPada'],
  ),
);
await cek(
  'pegawai lain mengubah keterangan nomor',
  false,
  ubah(U.pg2, 'surat_nomor/N1', { perihal: 'Ganti', diubahOleh: 'uPG2' }, ['diubahPada']),
);
await cek(
  'pemohon mengubah nomor suratnya',
  false,
  ubah(U.pg, 'surat_nomor/N1', { nomor: 'W20.IMI.1-0099', diubahOleh: 'uPG' }, ['diubahPada']),
);
await cek(
  'memindahkan tanggal nomor ke tahun lain',
  false,
  ubah(U.pg, 'surat_nomor/N1', { tanggal: `${TAHUN - 1}-12-31`, diubahOleh: 'uPG' }, [
    'diubahPada',
  ]),
);
await cek(
  'Keuangan mengubah keterangan nomor',
  true,
  ubah(U.keu, 'surat_nomor/N1', { seksi: 'Keuangan', diubahOleh: 'uKEU' }, ['diubahPada']),
);
await cek(
  'mengubah keterangan nomor SP Srikandi',
  false,
  ubah(U.pg, 'surat_nomor/N4', { perihal: 'Ganti', diubahOleh: 'uPG' }, ['diubahPada']),
);
await cek(
  'pegawai membatalkan nomor',
  false,
  ubah(
    U.pg,
    'surat_nomor/N1',
    { status: 'batal', alasanBatal: 'salah', dibatalkanOleh: 'uPG', diubahOleh: 'uPG' },
    ['dibatalkanPada', 'diubahPada'],
  ),
);
await cek(
  'Keuangan membatalkan nomor dengan alasan',
  true,
  ubah(
    U.keu,
    'surat_nomor/N1',
    { status: 'batal', alasanBatal: 'salah ketik', dibatalkanOleh: 'uKEU', diubahOleh: 'uKEU' },
    ['dibatalkanPada', 'diubahPada'],
  ),
);
await cek(
  'mengubah keterangan nomor yang sudah batal',
  false,
  ubah(U.keu, 'surat_nomor/N1', { perihal: 'Lagi', diubahOleh: 'uKEU' }, ['diubahPada']),
);
await cek(
  'Super Admin menulis penghitung',
  false,
  tulisUlang(U.sa, `sistem_penghitung/surat_${TAHUN}`, { nilai: 0 }),
);
await cek(
  'pegawai membaca penghitung nomor surat (pratinjau)',
  true,
  ambil(U.pg, `sistem_penghitung/surat_${TAHUN}`),
);
await cek('pegawai membaca penghitung lain', false, ambil(U.pg, `sistem_penghitung/lpj_${TAHUN}`));
await cek('Super Admin membaca penghitung', true, ambil(U.sa, `sistem_penghitung/lpj_${TAHUN}`));
await cek(
  'Keuangan membuat kode surat tingkat KOP',
  true,
  buat(
    U.keu,
    'surat_kode/K0',
    {
      kode: 'W20.IMI.1',
      nama: 'Kanim Buleleng',
      tingkat: 0,
      indukId: null,
      aktif: true,
      urutan: 0,
      ...audit('uKEU'),
    },
    AUDIT,
  ),
);
await cek(
  'pegawai membuat kode surat',
  false,
  buat(
    U.pg,
    'surat_kode/K1',
    {
      kode: 'UM',
      nama: 'Umum',
      tingkat: 1,
      indukId: 'K0',
      aktif: true,
      urutan: 0,
      ...audit('uPG'),
    },
    AUDIT,
  ),
);
await cek(
  'kode surat dengan karakter tidak sah',
  false,
  buat(
    U.keu,
    'surat_kode/K2',
    {
      kode: 'UM 01',
      nama: 'Umum',
      tingkat: 1,
      indukId: 'K0',
      aktif: true,
      urutan: 0,
      ...audit('uKEU'),
    },
    AUDIT,
  ),
);
await cek(
  'Keuangan menonaktifkan kode surat',
  true,
  ubah(U.keu, 'surat_kode/K0', { aktif: false, diubahOleh: 'uKEU' }, ['diubahPada']),
);
await cek(
  'Keuangan memindahkan induk kode surat',
  false,
  ubah(U.keu, 'surat_kode/K0', { tingkat: 1, indukId: 'K9', diubahOleh: 'uKEU' }, ['diubahPada']),
);
await cek('Keuangan menghapus kode surat', false, hapusDok(U.keu, 'surat_kode/K0'));

// ── Inventory ─────────────────────────────────────────────────────────────
await cek(
  'Umum membuat penjaga kode SAKTI',
  true,
  buat(U.um, 'inventory_kode/1010101001', { jenis: 'kategori', refId: 'K1', dibuatOleh: 'uUM' }, [
    'dibuatPada',
  ]),
);
await cek(
  'kode SAKTI ganda (ditulis ulang)',
  false,
  tulisUlang(
    U.um,
    'inventory_kode/1010101001',
    { jenis: 'kategori', refId: 'K2', dibuatOleh: 'uUM' },
    ['dibuatPada'],
  ),
);
await cek(
  'Umum membuat kategori sah',
  true,
  buat(
    U.um,
    'inventory_kategori/K1',
    { kode: '1010101001', nama: 'Alat Tulis', akunKode: '', aktif: true, ...audit('uUM') },
    AUDIT,
  ),
);
await cek(
  'pegawai membuat kategori',
  false,
  buat(
    U.pg,
    'inventory_kategori/K2',
    { kode: '1010101002', nama: 'X', akunKode: '', aktif: true, ...audit('uPG') },
    AUDIT,
  ),
);
await cek(
  'Umum mencatat barang masuk langsung',
  false,
  buat(U.um, 'inventory_masuk/T1', { jumlah: 5 }),
);
const barangDasar = {
  kode: '000001',
  kategoriId: 'K1',
  nama: 'Pulpen Contoh',
  satuan: 'buah',
  stokAwal: 10,
  stokMin: 2,
  aktif: true,
  ...audit('uUM'),
};
await cek('Umum membuat barang sah', true, buat(U.um, 'inventory_barang/BR1', barangDasar, AUDIT));
await buat(
  U.owner,
  'inventory_barang/BR2',
  { ...barangDasar, kode: '000002', adaTransaksi: true },
  AUDIT,
);
await buat(U.owner, `inventory_saldo/${TAHUN}`, { tahun: TAHUN, masuk: { BR2: 5 } });
await cek(
  'Umum mengubah stok minimum barang',
  true,
  ubah(U.um, 'inventory_barang/BR1', { stokMin: 3, diubahOleh: 'uUM' }, ['diubahPada']),
);
await cek(
  'Umum mengubah kode SAKTI barang langsung (hanya Function)',
  false,
  ubah(U.um, 'inventory_barang/BR1', { kode: '000009', diubahOleh: 'uUM' }, ['diubahPada']),
);
await cek(
  'Umum mengubah kode SAKTI kategori langsung (hanya Function)',
  false,
  ubah(U.um, 'inventory_kategori/K1', { kode: '1010101009', diubahOleh: 'uUM' }, ['diubahPada']),
);
await cek(
  'stok awal barang yang sudah punya transaksi terkunci',
  false,
  ubah(U.um, 'inventory_barang/BR2', { stokAwal: 99, diubahOleh: 'uUM' }, ['diubahPada']),
);
await cek(
  'Umum menandai adaTransaksi sendiri',
  false,
  ubah(U.um, 'inventory_barang/BR1', { adaTransaksi: true, diubahOleh: 'uUM' }, ['diubahPada']),
);
await cek(
  'Umum menonaktifkan barang',
  true,
  ubah(U.um, 'inventory_barang/BR1', { aktif: false, diubahOleh: 'uUM' }, ['diubahPada']),
);
await cek('Umum menghapus barang', false, hapusDok(U.um, 'inventory_barang/BR1'));
await cek(
  'pegawai membaca ringkasan stok (limit)',
  true,
  daftar(U.pg, 'inventory_saldo', { limit: 20 }),
);
await cek('daftar ringkasan stok tanpa limit', false, daftar(U.pg, 'inventory_saldo'));
await cek(
  'Umum menulis ringkasan stok (hanya Function)',
  false,
  tulisUlang(U.um, `inventory_saldo/${TAHUN}`, { tahun: TAHUN, masuk: { BR2: 500 } }),
);

// ── Koleksi lain ──────────────────────────────────────────────────────────
await cek(
  'Super Admin menulis koleksi tak dikenal (MAK lama)',
  false,
  buat(U.sa, 'MAK/x', { a: 1 }),
);
await cek('Super Admin membaca koleksi tak dikenal', false, ambil(U.sa, 'userSettings/x'));

// ── Storage ───────────────────────────────────────────────────────────────
const scan = 'lpj/B1/tte/1767225600000-scan.pdf';
await cek('anggota mengunggah scan TTE (PDF)', true, unggah(U.pg, scan, 'application/pdf'));
await cek(
  'bukan anggota mengunggah scan TTE',
  false,
  unggah(U.pg2, 'lpj/B1/tte/1767225600001-scan.pdf', 'application/pdf'),
);
await cek('mengunggah SVG', false, unggah(U.pg, 'lpj/B1/tte/1767225600002-x.svg', 'image/svg+xml'));
await cek(
  'nama berkas tidak berpola',
  false,
  unggah(U.pg, 'lpj/B1/tte/scan.pdf', 'application/pdf'),
);
await cek('menimpa berkas yang sudah ada', false, unggah(U.pg, scan, 'application/pdf'));
await cek(
  'scan TTE lebih dari 5 MB',
  false,
  unggah(U.pg, 'lpj/B1/tte/1767225600003-besar.pdf', 'application/pdf', 5 * 1024 * 1024 + 1),
);
await cek(
  'foto laporan sebelum LPJ terkunci',
  false,
  unggah(U.pg, 'lpj/B1/laporan/1767225600004-f.jpg', 'image/jpeg'),
);
await cek(
  'foto laporan setelah LPJ terkunci',
  true,
  unggah(U.pg, 'lpj/B2/laporan/1767225600004-f.jpg', 'image/jpeg'),
);
await cek(
  'foto laporan PDF',
  false,
  unggah(U.pg, 'lpj/B2/laporan/1767225600009-f.pdf', 'application/pdf'),
);
await cek(
  'foto laporan lebih dari 300 KB',
  false,
  unggah(U.pg, 'lpj/B2/laporan/1767225600010-f.jpg', 'image/jpeg', 301 * 1024),
);
await cek(
  'scan TTE untuk berkas yang SP-nya belum terkunci',
  false,
  unggah(U.pg, 'lpj/BN/tte/1767225600011-s.pdf', 'application/pdf'),
);
await cek('anggota membaca scan', true, unduh(U.pg, scan));
await cek('bukan anggota membaca scan', false, unduh(U.pg2, scan));
await cek('tanpa login membaca scan', false, unduh(null, scan));
await cek('daftar isi folder lpj', false, daftarBerkas(U.keu, 'lpj/'));
await cek(
  'pegawai mengunggah arsip Keuangan',
  false,
  unggah(U.pg, 'lpj/B2/keuangan/arsip/1767225600005-a.pdf', 'application/pdf'),
);
await cek(
  'Keuangan mengunggah arsip',
  true,
  unggah(U.keu, 'lpj/B2/keuangan/arsip/1767225600005-a.pdf', 'application/pdf'),
);
await cek(
  'Keuangan menghapus arsip',
  false,
  hapusBerkas(U.keu, 'lpj/B2/keuangan/arsip/1767225600005-a.pdf'),
);
await cek(
  'bukti setelah verifikasi selesai (Storage)',
  false,
  unggah(U.pg, 'lpj/B2/bukti/pPG/1767225600006-b.pdf', 'application/pdf'),
);
await cek(
  'Kepegawaian mengunggah thumbnail',
  true,
  unggah(U.kep, 'pegawai/pPG/thumb/1767225600007-t.jpg', 'image/jpeg'),
);
await cek(
  'pegawai lain melihat thumbnail',
  true,
  unduh(U.pg2, 'pegawai/pPG/thumb/1767225600007-t.jpg'),
);
await cek(
  'Kepegawaian mengunggah foto asli',
  true,
  unggah(U.kep, 'pegawai/pPG/foto/1767225600008-f.jpg', 'image/jpeg'),
);
await cek(
  'pegawai lain melihat foto asli',
  false,
  unduh(U.pg2, 'pegawai/pPG/foto/1767225600008-f.jpg'),
);
await cek(
  'pemilik melihat foto aslinya',
  true,
  unduh(U.pg, 'pegawai/pPG/foto/1767225600008-f.jpg'),
);

await cek(
  'Kepegawaian mengunggah thumbnail PNG',
  false,
  unggah(U.kep, 'pegawai/pPG/thumb/1767225600009-t.png', 'image/png'),
);
await cek(
  'thumbnail lebih dari 60 KB',
  false,
  unggah(U.kep, 'pegawai/pPG/thumb/1767225600010-t.jpg', 'image/jpeg', 61 * 1024),
);
await cek(
  'foto asli lebih dari 300 KB',
  false,
  unggah(U.kep, 'pegawai/pPG/foto/1767225600011-f.jpg', 'image/jpeg', 301 * 1024),
);
await cek(
  'pegawai mengunggah fotonya sendiri',
  false,
  unggah(U.pg, 'pegawai/pPG/foto/1767225600012-f.jpg', 'image/jpeg'),
);
await cek(
  'menimpa foto yang sudah ada',
  false,
  unggah(U.kep, 'pegawai/pPG/foto/1767225600008-f.jpg', 'image/jpeg'),
);
await cek(
  'Kepegawaian menghapus foto pegawai',
  true,
  hapusBerkas(U.kep, 'pegawai/pPG/foto/1767225600008-f.jpg'),
);
await cek(
  'pegawai menghapus thumbnail',
  false,
  hapusBerkas(U.pg, 'pegawai/pPG/thumb/1767225600007-t.jpg'),
);

// ── Meta di dalam bagian LPJ: tte.scan, laporan.foto, lampiran.foto/nota (P8) ──
const metaUji = (path, tipe = 'image/jpeg', ukuran = 2048) => ({
  path,
  nama: 'contoh.jpg',
  ukuran,
  tipe,
  diunggahPada: new Date(),
  diunggahOleh: 'uPG',
});
const ubahBagian = (path, versi, bagian) =>
  ubah(U.pg, path, { ...bagian, versi, diubahOleh: 'uPG' }, ['diubahPada']);
await buat(
  U.owner,
  'lpj_berkas/BM1',
  { ...berkasDasar(['uPG']), versi: 1, sp: { terkunci: true } },
  AUDIT,
);
await buat(
  U.owner,
  'lpj_berkas/BM2',
  {
    ...berkasDasar(['uPG']),
    versi: 1,
    sp: { terkunci: true },
    tte: { terkunci: true },
    spd: { terkunci: true },
    lpj: { terkunci: true },
  },
  AUDIT,
);
await buat(
  U.owner,
  'lpj_berkas/BM3',
  { ...berkasDasar(['uPG']), jenis: 'nonperjadin', versi: 1, spby: { terkunci: true } },
  AUDIT,
);
const tteUji = (scan) => ({
  tte: { terkunci: false, nomorSurat: '', tanggalSurat: '', scan },
});
await cek(
  'anggota menyimpan scan TTE sah',
  true,
  ubahBagian(
    'lpj_berkas/BM1',
    2,
    tteUji(metaUji('lpj/BM1/tte/1767225600001-scan.pdf', 'application/pdf')),
  ),
);
await cek(
  'scan TTE di folder berkas lain',
  false,
  ubahBagian('lpj_berkas/BM1', 3, tteUji(metaUji('lpj/B1/tte/1767225600001-scan.pdf'))),
);
await cek(
  'scan TTE bertipe HTML',
  false,
  ubahBagian('lpj_berkas/BM1', 3, tteUji(metaUji('lpj/BM1/tte/1767225600002-s.html', 'text/html'))),
);
await cek(
  'scan TTE lebih dari 5 MB',
  false,
  ubahBagian(
    'lpj_berkas/BM1',
    3,
    tteUji(metaUji('lpj/BM1/tte/1767225600003-scan.pdf', 'application/pdf', 6 * 1024 * 1024)),
  ),
);
{
  const tanpaWaktu = metaUji('lpj/BM1/tte/1767225600004-scan.pdf');
  delete tanpaWaktu.diunggahPada;
  await cek(
    'scan TTE tanpa waktu unggah',
    false,
    ubahBagian('lpj_berkas/BM1', 3, tteUji(tanpaWaktu)),
  );
}
await cek(
  'scan TTE berisi url',
  false,
  ubahBagian(
    'lpj_berkas/BM1',
    3,
    tteUji({ ...metaUji('lpj/BM1/tte/1767225600005-scan.pdf'), url: 'https://contoh.test/x' }),
  ),
);
await cek('scan TTE dikosongkan (null)', true, ubahBagian('lpj_berkas/BM1', 3, tteUji(null)));

const laporanUji = (foto) => ({ laporan: { terkunci: false, foto } });
const fotoLap = (n, tipe, ukuran) =>
  metaUji(`lpj/BM2/laporan/${1767225600000 + n}-foto.jpg`, tipe, ukuran);
const f1 = fotoLap(1);
const f2 = fotoLap(2, 'image/png');
await cek(
  'anggota menambah foto laporan sah',
  true,
  ubahBagian('lpj_berkas/BM2', 2, laporanUji([f1])),
);
await cek(
  'anggota menambah foto laporan kedua (PNG)',
  true,
  ubahBagian('lpj_berkas/BM2', 3, laporanUji([f1, f2])),
);
await cek(
  'menambah dua foto laporan dalam satu simpan',
  false,
  ubahBagian('lpj_berkas/BM2', 4, laporanUji([f1, f2, fotoLap(7), fotoLap(8)])),
);
await cek(
  'foto laporan lebih dari 300 KB',
  false,
  ubahBagian('lpj_berkas/BM2', 4, laporanUji([f1, f2, fotoLap(3, 'image/jpeg', 301 * 1024)])),
);
await cek(
  'foto laporan berupa PDF',
  false,
  ubahBagian('lpj_berkas/BM2', 4, laporanUji([f1, f2, fotoLap(4, 'application/pdf')])),
);
await cek(
  'foto laporan dari folder lampiran',
  false,
  ubahBagian(
    'lpj_berkas/BM2',
    4,
    laporanUji([f1, f2, metaUji('lpj/BM2/lampiran/foto/1767225600005-foto.jpg')]),
  ),
);
await cek(
  'isi daftar foto laporan bukan Meta',
  false,
  ubahBagian('lpj_berkas/BM2', 4, laporanUji([f1, f2, 'lpj/BM2/laporan/1767225600006-foto.jpg'])),
);
await cek(
  'foto laporan lebih dari 10',
  false,
  ubahBagian(
    'lpj_berkas/BM2',
    4,
    laporanUji([f1, f2, ...Array.from({ length: 9 }, (_, i) => fotoLap(10 + i))]),
  ),
);
await cek('anggota melepas foto laporan', true, ubahBagian('lpj_berkas/BM2', 4, laporanUji([f1])));
await cek(
  'menyunting teks laporan tanpa mengubah foto',
  true,
  ubahBagian('lpj_berkas/BM2', 5, {
    laporan: { terkunci: false, foto: [f1], pendahuluan: 'Isi uji' },
  }),
);

const lampiranUji = (foto, nota) => ({ lampiran: { terkunci: false, foto, nota } });
const metaLampiran = (jenis, n, ukuran) =>
  metaUji(`lpj/BM3/lampiran/${jenis}/${1767225600000 + n}-bukti.jpg`, 'image/jpeg', ukuran);
await cek(
  'anggota menyimpan foto & nota lampiran sah',
  true,
  ubahBagian(
    'lpj_berkas/BM3',
    2,
    lampiranUji([metaLampiran('foto', 1)], [metaLampiran('nota', 2, 900 * 1024)]),
  ),
);
await cek(
  'nota lampiran dari folder foto',
  false,
  ubahBagian('lpj_berkas/BM3', 3, lampiranUji([], [metaLampiran('foto', 3)])),
);
await cek(
  'foto lampiran lebih dari 1 MB',
  false,
  ubahBagian('lpj_berkas/BM3', 3, lampiranUji([metaLampiran('foto', 4, 1025 * 1024)], [])),
);

// ── Kelengkapan pegawai: unit kerja, kontak pribadi, field kepegawaian, master ──
const unitUji = (kode, jenis, indukId, lain = {}) => ({
  kode,
  nama: `Unit Contoh ${kode}`,
  singkatan: kode,
  jenis,
  indukId,
  urutan: 10,
  aktif: true,
  ...lain,
});
const buatUnit = (t, id, data, uid = 'uKEP') =>
  buat(t, `pegawai_unit/${id}`, { ...data, ...audit(uid) }, AUDIT);
await cek(
  'Kepegawaian membuat unit kantor',
  true,
  buatUnit(U.kep, 'UK0', unitUji('KANIM', 'kantor', '')),
);
await cek(
  'Kepegawaian membuat seksi di bawah kantor',
  true,
  buatUnit(U.kep, 'UK1', unitUji('SEKSI-A', 'seksi', 'UK0')),
);
await cek(
  'Kepegawaian membuat subseksi di bawah seksi',
  true,
  buatUnit(U.kep, 'UK2', unitUji('SUB-A', 'subseksi', 'UK1')),
);
await cek(
  'subseksi langsung di bawah kantor',
  false,
  buatUnit(U.kep, 'UK9', unitUji('SUB-X', 'subseksi', 'UK0')),
);
await cek(
  'kantor yang punya induk',
  false,
  buatUnit(U.kep, 'UK9', unitUji('KANIM-2', 'kantor', 'UK0')),
);
await cek(
  'unit dengan induk yang tidak ada',
  false,
  buatUnit(U.kep, 'UK9', unitUji('SEKSI-X', 'seksi', 'UKTIDAKADA')),
);
await cek(
  'kode unit huruf kecil',
  false,
  buatUnit(U.kep, 'UK9', unitUji('seksi-b', 'seksi', 'UK0')),
);
await cek(
  'label pendek unit kosong',
  false,
  buatUnit(U.kep, 'UK9', unitUji('SEKSI-B', 'seksi', 'UK0', { singkatan: '' })),
);
await cek(
  'pegawai biasa membuat unit',
  false,
  buatUnit(U.pg, 'UK9', unitUji('SEKSI-B', 'seksi', 'UK0'), 'uPG'),
);
await cek(
  'Keuangan membuat unit',
  false,
  buatUnit(U.keu, 'UK9', unitUji('SEKSI-B', 'seksi', 'UK0'), 'uKEU'),
);
await buatUnit(U.owner, 'UK3', unitUji('SEKSI-C', 'seksi', 'UK0'));
await cek(
  'Kepegawaian memindah subseksi ke seksi lain & mengganti nama',
  true,
  ubah(
    U.kep,
    'pegawai_unit/UK2',
    { indukId: 'UK3', nama: 'Subseksi Contoh Baru', diubahOleh: 'uKEP' },
    ['diubahPada'],
  ),
);
await cek(
  'memindah subseksi ke bawah subseksi lain',
  false,
  ubah(U.kep, 'pegawai_unit/UK2', { indukId: 'UK2', diubahOleh: 'uKEP' }, ['diubahPada']),
);
await cek(
  'mengubah jenis unit',
  false,
  ubah(U.kep, 'pegawai_unit/UK1', { jenis: 'subbagian', diubahOleh: 'uKEP' }, ['diubahPada']),
);
await cek(
  'Kepegawaian menonaktifkan unit',
  true,
  ubah(U.kep, 'pegawai_unit/UK3', { aktif: false, diubahOleh: 'uKEP' }, ['diubahPada']),
);
await cek('menghapus unit', false, hapusDok(U.kep, 'pegawai_unit/UK1'));
await cek(
  'pegawai membaca daftar unit (limit 200)',
  true,
  daftar(U.pg, 'pegawai_unit', { limit: 200 }),
);
await cek('daftar unit tanpa limit', false, daftar(U.pg, 'pegawai_unit'));

const kontakUji = {
  alamat: 'Jl. Contoh No. 1',
  emailPribadi: 'budi@contoh.test',
  noWa: '6281200000000',
};
const buatKontak = (t, id, data, uid) =>
  buat(t, `pegawai_kontak/${id}`, { ...data, ...audit(uid) }, AUDIT);
await cek('pemilik membuat kontak pribadinya', true, buatKontak(U.pg, 'pPG', kontakUji, 'uPG'));
await cek(
  'pemilik memperbarui kontaknya',
  true,
  ubah(U.pg, 'pegawai_kontak/pPG', { noWa: '6281299999999', diubahOleh: 'uPG' }, ['diubahPada']),
);
await cek('pemilik membaca kontaknya', true, ambil(U.pg, 'pegawai_kontak/pPG'));
await cek('pegawai lain membaca kontak', false, ambil(U.pg2, 'pegawai_kontak/pPG'));
await cek(
  'pegawai lain mengubah kontak orang lain',
  false,
  ubah(U.pg2, 'pegawai_kontak/pPG', { alamat: 'Palsu', diubahOleh: 'uPG2' }, ['diubahPada']),
);
await cek('pegawai membuat kontak orang lain', false, buatKontak(U.pg, 'pPG2', kontakUji, 'uPG'));
await cek(
  'Kepegawaian membuat kontak pegawai lain',
  true,
  buatKontak(U.kep, 'pPG2', kontakUji, 'uKEP'),
);
await cek(
  'Kepegawaian membaca daftar kontak (limit 500)',
  true,
  daftar(U.kep, 'pegawai_kontak', { limit: 500 }),
);
await cek('pegawai membaca daftar kontak', false, daftar(U.pg, 'pegawai_kontak', { limit: 50 }));
await cek(
  'e-mail pribadi huruf besar / tidak baku',
  false,
  buatKontak(U.kep, 'pK1', { ...kontakUji, emailPribadi: 'Budi@Contoh.test' }, 'uKEP'),
);
await cek(
  'nomor WA tidak berawalan 62',
  false,
  buatKontak(U.kep, 'pK1', { ...kontakUji, noWa: '081200000000' }, 'uKEP'),
);
await cek(
  'alamat lebih dari 300 karakter',
  false,
  buatKontak(U.kep, 'pK1', { ...kontakUji, alamat: 'x'.repeat(301) }, 'uKEP'),
);
await cek('menghapus kontak', false, hapusDok(U.kep, 'pegawai_kontak/pPG'));

const pegawaiP3 = {
  ...pegawaiDasar,
  statusKepegawaian: 'pppk',
  golongan: 'IX',
  unitId: 'UK2',
  seksi: 'SEKSI-C',
  ...audit('uKEP'),
};
await cek(
  'Kepegawaian membuat pegawai PPPK lengkap',
  true,
  buat(U.kep, 'pegawai/pP3a', pegawaiP3, AUDIT),
);
await cek(
  'golongan tidak sah',
  false,
  buat(U.kep, 'pegawai/pP3b', { ...pegawaiP3, golongan: 'III/z' }, AUDIT),
);
await cek(
  'status kepegawaian tidak dikenal',
  false,
  buat(U.kep, 'pegawai/pP3b', { ...pegawaiP3, statusKepegawaian: 'honorer' }, AUDIT),
);
await cek(
  'label seksi lebih dari 60 karakter',
  false,
  buat(U.kep, 'pegawai/pP3b', { ...pegawaiP3, seksi: 's'.repeat(61) }, AUDIT),
);
await cek(
  'unitId tidak sah',
  false,
  buat(U.kep, 'pegawai/pP3b', { ...pegawaiP3, unitId: 'unit/salah' }, AUDIT),
);
// Dokumen bentuk sebelum field baru: tetap bisa diperbarui sebagian (mis. label seksi saja)
await buat(
  U.owner,
  'pegawai/pLamaSeksi',
  {
    nama: 'Dewi Contoh',
    nip: '',
    pangkatId: '',
    pangkatNama: '',
    jabatanId: '',
    jabatanNama: '',
    seksi: 'Lalintalkim',
    tanggalLahir: '',
    fotoPaths: [],
    ...audit('uKEP'),
  },
  AUDIT,
);
await cek(
  'Kepegawaian memperbarui label seksi pada dokumen bentuk lama',
  true,
  ubah(U.kep, 'pegawai/pLamaSeksi', { seksi: 'Lantaskim', diubahOleh: 'uKEP' }, ['diubahPada']),
);

const masterUji = (lain) => ({ urutan: 1, aktif: true, ...lain, ...audit('uKEP') });
await cek(
  'Kepegawaian membuat pangkat PNS III/c',
  true,
  buat(
    U.kep,
    'pegawai_pangkat/PK1',
    masterUji({ nama: 'Penata', golongan: 'III/c', jenis: 'pns' }),
    AUDIT,
  ),
);
await cek(
  'pangkat PPPK bergolongan PNS',
  false,
  buat(
    U.kep,
    'pegawai_pangkat/PK2',
    masterUji({ nama: 'PPPK X', golongan: 'III/c', jenis: 'pppk' }),
    AUDIT,
  ),
);
await cek(
  'Kepegawaian membuat jabatan struktural eselon IV.b',
  true,
  buat(
    U.kep,
    'pegawai_jabatan/JB1',
    masterUji({ nama: 'Kepala Subseksi Contoh', jenis: 'struktural', eselon: 'IV.b' }),
    AUDIT,
  ),
);
await cek(
  'jabatan fungsional dengan eselon',
  false,
  buat(
    U.kep,
    'pegawai_jabatan/JB2',
    masterUji({ nama: 'Analis Contoh', jenis: 'fungsional', eselon: 'IV.b' }),
    AUDIT,
  ),
);
await cek(
  'pegawai biasa membuat jabatan',
  false,
  buat(
    U.pg,
    'pegawai_jabatan/JB3',
    { ...masterUji({ nama: 'X', jenis: 'pelaksana', eselon: '' }), ...audit('uPG') },
    AUDIT,
  ),
);

// ── Kegiatan & kehadiran ──────────────────────────────────────────────────
const kegiatanUji = (lain = {}) => ({
  nama: 'Apel Contoh',
  jenis: 'apel',
  tanggal: `${TAHUN}-03-02`,
  jam: '07:30',
  tempat: 'Lapangan Contoh',
  keterangan: '',
  kehadiran: null,
  kehadiranPada: null,
  kehadiranOleh: null,
  aktif: true,
  alasanBatal: '',
  ...lain,
});
const buatKegiatan = (t, id, lain, uid = 'uKEP', waktu = AUDIT) =>
  buat(t, `pegawai_kegiatan/${id}`, { ...kegiatanUji(lain), ...audit(uid) }, waktu);
const hadirUji = {
  pPG: { status: 'hadir', keterangan: '' },
  pPG2: { status: 'sakit', keterangan: 'Surat dokter' },
};
await cek('Kepegawaian membuat kegiatan', true, buatKegiatan(U.kep, 'KG1'));
await cek('pegawai biasa membuat kegiatan', false, buatKegiatan(U.pg, 'KG2', {}, 'uPG'));
await cek('Keuangan membuat kegiatan', false, buatKegiatan(U.keu, 'KG2', {}, 'uKEU'));
await cek(
  'kegiatan baru langsung berisi kehadiran',
  false,
  buatKegiatan(U.kep, 'KG2', { kehadiran: hadirUji, kehadiranOleh: 'uKEP' }, 'uKEP', [
    ...AUDIT,
    'kehadiranPada',
  ]),
);
await cek('jenis kegiatan tidak dikenal', false, buatKegiatan(U.kep, 'KG2', { jenis: 'pesta' }));
await cek('jam kegiatan tidak sah', false, buatKegiatan(U.kep, 'KG2', { jam: '25:00' }));
await cek('kegiatan tanpa tempat', false, buatKegiatan(U.kep, 'KG2', { tempat: '' }));
await cek(
  'Kepegawaian menyimpan kehadiran',
  true,
  ubah(
    U.kep,
    'pegawai_kegiatan/KG1',
    { kehadiran: hadirUji, kehadiranOleh: 'uKEP', diubahOleh: 'uKEP' },
    ['kehadiranPada', 'diubahPada'],
  ),
);
await cek(
  'menyimpan kehadiran tanpa waktu simpan dari server',
  false,
  ubah(
    U.kep,
    'pegawai_kegiatan/KG1',
    { kehadiran: hadirUji, kehadiranOleh: 'uKEP', kehadiranPada: new Date(), diubahOleh: 'uKEP' },
    ['diubahPada'],
  ),
);
await cek(
  'menyimpan kehadiran atas nama orang lain',
  false,
  ubah(
    U.kep,
    'pegawai_kegiatan/KG1',
    { kehadiran: hadirUji, kehadiranOleh: 'uLAIN', diubahOleh: 'uKEP' },
    ['kehadiranPada', 'diubahPada'],
  ),
);
await cek(
  'mengosongkan kehadiran yang sudah disimpan',
  false,
  ubah(
    U.kep,
    'pegawai_kegiatan/KG1',
    { kehadiran: null, kehadiranPada: null, kehadiranOleh: null, diubahOleh: 'uKEP' },
    ['diubahPada'],
  ),
);
await cek(
  'Kepegawaian mengubah tempat kegiatan',
  true,
  ubah(U.kep, 'pegawai_kegiatan/KG1', { tempat: 'Aula Contoh', diubahOleh: 'uKEP' }, [
    'diubahPada',
  ]),
);
await cek(
  'membatalkan kegiatan tanpa alasan',
  false,
  ubah(U.kep, 'pegawai_kegiatan/KG1', { aktif: false, alasanBatal: '', diubahOleh: 'uKEP' }, [
    'diubahPada',
  ]),
);
await cek(
  'Kepegawaian membatalkan kegiatan dengan alasan',
  true,
  ubah(
    U.kep,
    'pegawai_kegiatan/KG1',
    { aktif: false, alasanBatal: 'Hujan deras (uji)', diubahOleh: 'uKEP' },
    ['diubahPada'],
  ),
);
await cek(
  'mengubah kegiatan yang sudah batal',
  false,
  ubah(U.kep, 'pegawai_kegiatan/KG1', { tempat: 'Lapangan Lain', diubahOleh: 'uKEP' }, [
    'diubahPada',
  ]),
);
await cek('menghapus kegiatan', false, hapusDok(U.kep, 'pegawai_kegiatan/KG1'));
await cek(
  'Kepegawaian membaca daftar kegiatan (limit 200)',
  true,
  daftar(U.kep, 'pegawai_kegiatan', { limit: 200 }),
);
await cek('daftar kegiatan tanpa limit', false, daftar(U.kep, 'pegawai_kegiatan'));
await cek(
  'pegawai biasa membaca daftar kegiatan',
  false,
  daftar(U.pg, 'pegawai_kegiatan', { limit: 10 }),
);
await cek('pegawai biasa membaca kegiatan', false, ambil(U.pg, 'pegawai_kegiatan/KG1'));
await cek(
  'Kepegawaian membaca rekap kehadiran (limit 10)',
  true,
  daftar(U.kep, 'pegawai_rekap_hadir', { limit: 10, filter: ['tahun', 'EQUAL', TAHUN] }),
);
await cek(
  'pegawai biasa membaca rekap kehadiran',
  false,
  daftar(U.pg, 'pegawai_rekap_hadir', { limit: 10 }),
);
await cek(
  'Kepegawaian menulis rekap kehadiran (hanya Function)',
  false,
  buat(U.kep, `pegawai_rekap_hadir/${TAHUN}-1`, { tahun: TAHUN, semester: 1 }),
);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
