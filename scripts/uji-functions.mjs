/* global process, Buffer, console, fetch, setTimeout */
// Uji alur Cloud Functions P1 di Firebase Emulator (proyek demo, tidak menyentuh cloud).
// Butuh emulator auth + firestore + functions; firebase.json belum punya blok "emulators",
// jadi sementara jalankan dengan konfigurasi emulator terpisah (lihat docs/skema-database.md §10).
// Jalankan: node scripts/uji-functions.mjs "<akar repo>"
import { execFileSync } from 'node:child_process';
const P = 'demo-imigrasi';
const AUTH = 'http://127.0.0.1:9099';
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`;
const FN = `http://127.0.0.1:5001/${P}/asia-southeast2`;
const ROOT = process.argv[2];

let lulus = 0,
  gagal = 0;
const cek = (judul, ok, info = '') => {
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${judul}${ok ? '' : '  → ' + info}`);
};
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

// bersihkan emulator
await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${P}/databases/(default)/documents`, {
  method: 'DELETE',
});
await fetch(`${AUTH}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE' });

// 1. seed Super Admin lewat skrip asli
const keluaran = execFileSync(
  'node',
  [
    'scripts/seedSuperAdmin.js',
    '--email',
    'admin@contoh.test',
    '--nama',
    'Budi Contoh',
    '--project',
    P,
  ],
  {
    cwd: `${ROOT}/functions`,
    env: {
      ...process.env,
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    },
  },
).toString();
const sandiSA = /Kata sandi awal : (\S+)/.exec(keluaran)?.[1];
cek('seedSuperAdmin membuat akun + mencetak sandi sementara', !!sandiSA, keluaran);
let ulang;
try {
  execFileSync(
    'node',
    ['scripts/seedSuperAdmin.js', '--email', 'lain@contoh.test', '--nama', 'X', '--project', P],
    {
      cwd: `${ROOT}/functions`,
      env: {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      },
      stdio: 'pipe',
    },
  );
  ulang = 'jalan';
} catch {
  ulang = 'ditolak';
}
cek('seedSuperAdmin menolak bila Super Admin sudah ada', ulang === 'ditolak');

async function masuk(email, sandi) {
  const r = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: sandi, returnSecureToken: true }),
    },
  );
  const j = await r.json();
  return j.idToken
    ? { token: j.idToken, klaim: JSON.parse(Buffer.from(j.idToken.split('.')[1], 'base64url')) }
    : { galat: j.error?.message };
}
async function panggil(nama, data, token) {
  const r = await fetch(`${FN}/${nama}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  const j = await r.json();
  return j.error ? { galat: j.error.status } : { hasil: j.result };
}
const nilai = (v) =>
  typeof v === 'string'
    ? { stringValue: v }
    : Array.isArray(v)
      ? { arrayValue: { values: v.map(nilai) } }
      : { nullValue: null };

const sa = await masuk('admin@contoh.test', sandiSA);
cek(
  'Super Admin bisa login; claim peran superadmin + wajibGantiSandi',
  sa.klaim?.peran?.includes('superadmin') && sa.klaim?.wajibGantiSandi === true,
  JSON.stringify(sa),
);

// 2. Super Admin (punya hak Kepegawaian) membuat dokumen pegawai lewat rules
const pegawai = {
  nama: 'Siti Contoh',
  nip: '000000000000000000',
  statusKepegawaian: 'pns',
  pangkatId: '',
  pangkatNama: 'Penata Muda',
  golongan: 'III/a',
  jabatanId: '',
  jabatanNama: '',
  unitId: 'uTIKIM',
  seksi: 'Tikim',
  tanggalLahir: '1991-03-15',
  fotoPaths: ['pegawai/pSiti/foto/1767225600001-siti.jpg'],
  dibuatOleh: sa.klaim.user_id,
  diubahOleh: sa.klaim.user_id,
};
const r = await fetch(`${FS}:commit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sa.token}` },
  body: JSON.stringify({
    writes: [
      {
        update: {
          name: `projects/${P}/databases/(default)/documents/pegawai/pSiti`,
          fields: Object.fromEntries(Object.entries(pegawai).map(([k, v]) => [k, nilai(v)])),
        },
        updateTransforms: [
          { fieldPath: 'dibuatPada', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'diubahPada', setToServerValue: 'REQUEST_TIME' },
        ],
        currentDocument: { exists: false },
      },
    ],
  }),
});
cek('Super Admin membuat dokumen pegawai (lolos rules)', r.ok, await r.text());

// 3. trigger pegawai_ringkas + ultahMd + thumbnail foto pertama
let ringkas;
for (let i = 0; i < 30 && !ringkas; i++) {
  await tunggu(500);
  const x = await fetch(`${FS}/pegawai_ringkas/pSiti`, {
    headers: { Authorization: 'Bearer owner' },
  });
  if (x.ok) ringkas = await x.json();
}
cek('trigger mengisi pegawai_ringkas', !!ringkas);
cek(
  'ringkas berisi ultahMd 03-15 dan tanpa tanggalLahir',
  ringkas?.fields?.ultahMd?.stringValue === '03-15' && !ringkas?.fields?.tanggalLahir,
  JSON.stringify(ringkas?.fields),
);
cek(
  'ringkas berisi unitId, golongan & seksi (tanpa status/kontak)',
  ringkas?.fields?.unitId?.stringValue === 'uTIKIM' &&
    ringkas?.fields?.golongan?.stringValue === 'III/a' &&
    ringkas?.fields?.seksi?.stringValue === 'Tikim' &&
    !ringkas?.fields?.statusKepegawaian,
  JSON.stringify(ringkas?.fields),
);
cek(
  'ringkas berisi fotoThumbPath dari foto pertama (folder thumb, nama sama)',
  ringkas?.fields?.fotoThumbPath?.stringValue === 'pegawai/pSiti/thumb/1767225600001-siti.jpg',
  JSON.stringify(ringkas?.fields?.fotoThumbPath),
);

// 4. buat akun
cek(
  'tanpa login memanggil buatAkunPegawai ditolak',
  (await panggil('buatAkunPegawai', { pegawaiId: 'pSiti', email: 'siti@contoh.test' })).galat ===
    'UNAUTHENTICATED',
);
const akun = await panggil(
  'buatAkunPegawai',
  { pegawaiId: 'pSiti', email: 'Siti@Contoh.test' },
  sa.token,
);
cek('Super Admin membuatkan akun pegawai', !!akun.hasil?.sandiSementara, JSON.stringify(akun));
cek(
  'membuat akun kedua untuk pegawai yang sama ditolak',
  (await panggil('buatAkunPegawai', { pegawaiId: 'pSiti', email: 'siti2@contoh.test' }, sa.token))
    .galat === 'ALREADY_EXISTS',
);
cek(
  'e-mail tidak sah ditolak',
  (await panggil('buatAkunPegawai', { pegawaiId: 'pSiti', email: 'bukan-email' }, sa.token))
    .galat === 'INVALID_ARGUMENT',
);

// 5. peran
let siti = await masuk('siti@contoh.test', akun.hasil?.sandiSementara);
cek(
  'pegawai baru login: peran kosong, aktif, wajib ganti sandi',
  Array.isArray(siti.klaim?.peran) &&
    siti.klaim.peran.length === 0 &&
    siti.klaim.aktif === true &&
    siti.klaim.wajibGantiSandi === true &&
    siti.klaim.pegawaiId === 'pSiti',
  JSON.stringify(siti),
);
cek(
  'pegawai biasa membuat akun ditolak',
  (await panggil('buatAkunPegawai', { pegawaiId: 'pSiti', email: 'x@contoh.test' }, siti.token))
    .galat === 'PERMISSION_DENIED',
);
cek(
  'pegawai biasa mengatur peran ditolak',
  (await panggil('aturPeran', { pegawaiId: 'pSiti', peran: ['superadmin'] }, siti.token)).galat ===
    'PERMISSION_DENIED',
);
cek(
  'peran tidak dikenal ditolak',
  (await panggil('aturPeran', { pegawaiId: 'pSiti', peran: ['raja'] }, sa.token)).galat ===
    'INVALID_ARGUMENT',
);
cek(
  'Super Admin mengubah peran sendiri ditolak',
  (await panggil('aturPeran', { pegawaiId: sa.klaim.pegawaiId, peran: [] }, sa.token)).galat ===
    'FAILED_PRECONDITION',
);
cek(
  'Super Admin memberi peran Keuangan',
  (await panggil('aturPeran', { pegawaiId: 'pSiti', peran: ['keuangan'] }, sa.token)).hasil
    ?.peran?.[0] === 'keuangan',
);
siti = await masuk('siti@contoh.test', akun.hasil.sandiSementara);
cek(
  'token baru berisi peran keuangan',
  siti.klaim?.peran?.includes('keuangan'),
  JSON.stringify(siti.klaim?.peran),
);
cek(
  'Keuangan (bukan Kepegawaian) menonaktifkan pegawai ditolak',
  (
    await panggil(
      'nonaktifkanPegawai',
      { pegawaiId: sa.klaim.pegawaiId, alasan: 'uji' },
      siti.token,
    )
  ).galat === 'PERMISSION_DENIED',
);

// 6. ganti sandi pertama
cek(
  'tandaiSandiDiganti TANPA mengganti kata sandi ditolak',
  (await panggil('tandaiSandiDiganti', {}, siti.token)).galat === 'FAILED_PRECONDITION',
);
await tunggu(1200); // passwordUpdatedAt harus > waktu sandi sementara + 1 detik
const SANDI_BARU = 'SandiBaru2026Aman';
const ubahSandi = await (
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: siti.token, password: SANDI_BARU, returnSecureToken: true }),
  })
).json();
cek('pegawai mengganti kata sandi', !!ubahSandi.idToken, JSON.stringify(ubahSandi.error));
cek(
  'tandaiSandiDiganti setelah kata sandi diganti diterima',
  (await panggil('tandaiSandiDiganti', {}, ubahSandi.idToken)).hasil?.selesai === true,
);
cek(
  'memanggil ulang tandaiSandiDiganti aman (sudah selesai)',
  (await panggil('tandaiSandiDiganti', {}, ubahSandi.idToken)).hasil?.selesai === true,
);
akun.hasil.sandiSementara = SANDI_BARU; // login berikutnya memakai kata sandi baru
siti = await masuk('siti@contoh.test', akun.hasil.sandiSementara);
cek(
  'claim wajibGantiSandi hilang, peran tetap',
  siti.klaim?.wajibGantiSandi === undefined && siti.klaim?.peran?.includes('keuangan'),
  JSON.stringify(siti.klaim),
);

// 7. status
cek(
  'nonaktifkan tanpa alasan ditolak',
  (await panggil('nonaktifkanPegawai', { pegawaiId: 'pSiti' }, sa.token)).galat ===
    'INVALID_ARGUMENT',
);
cek(
  'Super Admin menonaktifkan pegawai',
  (await panggil('nonaktifkanPegawai', { pegawaiId: 'pSiti', alasan: 'Mutasi (uji)' }, sa.token))
    .hasil?.aktif === false,
);
const masukNonaktif = await masuk('siti@contoh.test', akun.hasil.sandiSementara);
cek('pegawai nonaktif tidak bisa login', !!masukNonaktif.galat, JSON.stringify(masukNonaktif));
await tunggu(1500);
const rk = await (
  await fetch(`${FS}/pegawai_ringkas/pSiti`, { headers: { Authorization: 'Bearer owner' } })
).json();
cek(
  'ringkas ikut aktif=false',
  rk?.fields?.aktif?.booleanValue === false,
  JSON.stringify(rk?.fields?.aktif),
);
cek(
  'Super Admin mengaktifkan kembali',
  (await panggil('aktifkanPegawai', { pegawaiId: 'pSiti' }, sa.token)).hasil?.aktif === true,
);
cek(
  'pegawai aktif kembali bisa login',
  !!(await masuk('siti@contoh.test', akun.hasil.sandiSementara)).token,
);

// 7b. atur ulang kata sandi (pegawai lupa sandi)
const rr = await fetch(`${FS}:commit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sa.token}` },
  body: JSON.stringify({
    writes: [
      {
        update: {
          name: `projects/${P}/databases/(default)/documents/pegawai/pRudi`,
          fields: Object.fromEntries(
            Object.entries({
              ...pegawai,
              nama: 'Rudi Contoh',
              nip: '000000000000000002',
              tanggalLahir: '1990-01-02',
              fotoPaths: [],
            }).map(([k, v]) => [k, nilai(v)]),
          ),
        },
        updateTransforms: [
          { fieldPath: 'dibuatPada', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'diubahPada', setToServerValue: 'REQUEST_TIME' },
        ],
        currentDocument: { exists: false },
      },
    ],
  }),
});
cek('Super Admin membuat dokumen pegawai kedua', rr.ok, await rr.text());
cek(
  'atur ulang sandi pegawai yang belum punya akun ditolak',
  (await panggil('aturUlangSandi', { pegawaiId: 'pRudi' }, sa.token)).galat ===
    'FAILED_PRECONDITION',
);
const akunRudi = await panggil(
  'buatAkunPegawai',
  { pegawaiId: 'pRudi', email: 'rudi@contoh.test' },
  sa.token,
);
await panggil('aturPeran', { pegawaiId: 'pRudi', peran: ['kepegawaian'] }, sa.token);
const rudi = await masuk('rudi@contoh.test', akunRudi.hasil?.sandiSementara);
cek(
  'akun Kepegawaian kedua siap',
  rudi.klaim?.peran?.includes('kepegawaian'),
  JSON.stringify(rudi.klaim),
);
siti = await masuk('siti@contoh.test', akun.hasil.sandiSementara);
cek(
  'tanpa login memanggil aturUlangSandi ditolak',
  (await panggil('aturUlangSandi', { pegawaiId: 'pSiti' })).galat === 'UNAUTHENTICATED',
);
cek(
  'Keuangan (bukan Kepegawaian) mengatur ulang sandi ditolak',
  (await panggil('aturUlangSandi', { pegawaiId: 'pRudi' }, siti.token)).galat ===
    'PERMISSION_DENIED',
);
cek(
  'Kepegawaian mengatur ulang sandi akun sendiri ditolak',
  (await panggil('aturUlangSandi', { pegawaiId: 'pRudi' }, rudi.token)).galat ===
    'FAILED_PRECONDITION',
);
cek(
  'Kepegawaian mengatur ulang sandi Super Admin ditolak',
  (await panggil('aturUlangSandi', { pegawaiId: sa.klaim.pegawaiId }, rudi.token)).galat ===
    'PERMISSION_DENIED',
);
cek(
  'Kepegawaian mengatur ulang sandi akun berperan Keuangan ditolak',
  (await panggil('aturUlangSandi', { pegawaiId: 'pSiti' }, rudi.token)).galat ===
    'PERMISSION_DENIED',
);
const ulangSA = await panggil('aturUlangSandi', { pegawaiId: 'pSiti' }, sa.token);
cek(
  'Super Admin mengatur ulang sandi akun Keuangan',
  !!ulangSA.hasil?.sandiSementara && ulangSA.hasil.email === 'siti@contoh.test',
  JSON.stringify(ulangSA),
);
cek('kata sandi lama tidak berlaku lagi', !!(await masuk('siti@contoh.test', SANDI_BARU)).galat);
siti = await masuk('siti@contoh.test', ulangSA.hasil?.sandiSementara);
cek(
  'login dengan sandi sementara baru: wajib ganti sandi, peran tetap',
  siti.klaim?.wajibGantiSandi === true && siti.klaim?.peran?.includes('keuangan'),
  JSON.stringify(siti.klaim),
);
cek(
  'tandaiSandiDiganti setelah atur ulang TANPA mengganti sandi ditolak',
  (await panggil('tandaiSandiDiganti', {}, siti.token)).galat === 'FAILED_PRECONDITION',
);
await panggil('aturPeran', { pegawaiId: 'pSiti', peran: [] }, sa.token);
const ulangKep = await panggil('aturUlangSandi', { pegawaiId: 'pSiti' }, rudi.token);
cek(
  'Kepegawaian mengatur ulang sandi pegawai biasa',
  !!ulangKep.hasil?.sandiSementara,
  JSON.stringify(ulangKep),
);
cek(
  'sandi sementara sebelumnya ikut tidak berlaku',
  !!(await masuk('siti@contoh.test', ulangSA.hasil?.sandiSementara)).galat,
);
cek(
  'login dengan sandi sementara terbaru',
  !!(await masuk('siti@contoh.test', ulangKep.hasil?.sandiSementara)).token,
);

// 8. log
const lg = await (
  await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'sistem_log' }] } }),
  })
).json();
const aksi = lg
  .filter((x) => x.document)
  .map((x) => x.document.fields.aksi.stringValue)
  .sort();
cek(
  'sistem_log mencatat aksi sensitif',
  [
    'aktifkan',
    'aturPeran',
    'aturUlangSandi',
    'buatAkun',
    'gantiSandiPertama',
    'nonaktifkan',
    'seedSuperAdmin',
  ].every((a) => aksi.includes(a)),
  aksi.join(','),
);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
