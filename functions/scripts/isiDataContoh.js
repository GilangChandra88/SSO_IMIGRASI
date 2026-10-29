/**
 * Mengisi data PURA-PURA untuk pengembangan: akun per peran, unit kerja, pangkat/jabatan, pegawai,
 * pejabat penandatangan, kegiatan & kehadiran, MAK + DIPA tahun berjalan, kode surat, dan barang
 * Inventory. Semua nama dan NIP jelas palsu (CLAUDE.md §7).
 *
 * Tujuan hanya dua, ditetapkan di sini (bukan dibaca dari luar), jadi tidak mungkin mengenai produksi:
 * - Emulator di komputer sendiri (proyek demo-imigrasi). `npm run emulator` menjalankan skrip ini
 *   otomatis setelah Emulator siap. Manual, saat Emulator menyala:
 *     npm run emulator:isi              isi Emulator yang masih kosong
 *     npm run emulator:isi -- --ulang   kosongkan Emulator lalu isi ulang dari awal
 * - Dapur latihan di cloud, proyek pengembangan `imigrasi-database` (database `(default)`), sekali
 *   setelah rules & Functions di-deploy ke sana. Butuh `gcloud auth application-default login`:
 *     npm run dev:isi                   kata sandi acak per akun dicetak SEKALI di terminal
 * Panduan lengkap: docs/pengembangan-lokal.md
 */

const DEV = process.argv.includes('--dev');
const PROYEK = DEV ? 'imigrasi-database' : 'demo-imigrasi';
const HOST_FIRESTORE = '127.0.0.1:8080';
const HOST_AUTH = '127.0.0.1:9099';
const HUB = 'http://127.0.0.1:4400';

// Wajib sebelum firebase-admin dimuat: tujuan penulisan ditentukan oleh mode, bukan lingkungan.
if (DEV) {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT = PROYEK;
} else {
  process.env.FIRESTORE_EMULATOR_HOST = HOST_FIRESTORE;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = HOST_AUTH;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const crypto = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

// Emulator: kata sandi pura-pura yang sama untuk semua akun (akun Emulator tidak ada di cloud).
// Dapur latihan bisa diakses dari internet, jadi kata sandinya acak (dicetak sekali).
const SANDI_EMULATOR = 'SandiContoh123';
const ULANG = process.argv.includes('--ulang');

/** 16 karakter acak dengan huruf besar, huruf kecil, dan angka (sama dengan seedSuperAdmin). */
function sandiAcak() {
  const besar = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const kecil = 'abcdefghijkmnopqrstuvwxyz';
  const angka = '23456789';
  const pilih = (s) => s[crypto.randomInt(s.length)];
  const isi = [pilih(besar), pilih(kecil), pilih(angka)];
  while (isi.length < 16) isi.push(pilih(besar + kecil + angka));
  for (let i = isi.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [isi[i], isi[j]] = [isi[j], isi[i]];
  }
  return isi.join('');
}

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
const keluar = (pesan) => {
  process.stderr.write(`\n${pesan}\n\n`);
  process.exit(1);
};

/** Tanggal 'YYYY-MM-DD' zona WITA, digeser n hari dari hari ini. */
function tanggalWita(n = 0) {
  const t = new Date(Date.now() + n * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(t);
}
const HARI_INI = tanggalWita();
const T = Number(HARI_INI.slice(0, 4));
/** Tanggal lahir yang ulang tahunnya n hari lagi (tahun kabisat supaya 29 Feb tetap sah). */
const lahirDalam = (n, tahun) => `${tahun}${tanggalWita(n).slice(4)}`;

async function cekEmulator() {
  let daftar;
  try {
    daftar = await (await fetch(`${HUB}/emulators`)).json();
  } catch {
    keluar('Emulator belum menyala. Jalankan dulu "npm run emulator" di terminal lain, tunggu sampai muncul "All emulators ready", lalu ulangi perintah ini.');
  }
  const kurang = ['auth', 'firestore', 'functions'].filter((e) => !daftar[e]);
  if (kurang.length) keluar(`Emulator ${kurang.join(', ')} belum menyala. Jalankan lewat "npm run emulator".`);
}

async function kosongkan() {
  const fs = `http://${HOST_FIRESTORE}/emulator/v1/projects/${PROYEK}/databases/(default)/documents`;
  const auth = `http://${HOST_AUTH}/emulator/v1/projects/${PROYEK}/accounts`;
  await fetch(fs, { method: 'DELETE' });
  await fetch(auth, { method: 'DELETE' });
}

async function utama() {
  if (DEV && ULANG) keluar('--ulang hanya untuk Emulator. Data dapur latihan dihapus lewat Firebase Console.');
  if (!DEV) await cekEmulator();
  initializeApp({ projectId: PROYEK });
  const auth = getAuth();
  const db = getFirestore();

  const sudahAda = !(await db.collection('pegawai').limit(1).get()).empty;
  if (sudahAda && DEV) keluar(`Database (default) proyek ${PROYEK} sudah berisi pegawai; data contoh tidak diisi ulang.`);
  if (sudahAda && !ULANG) {
    keluar('Emulator sudah berisi data. Untuk mengosongkan lalu mengisi ulang dari awal:\n  npm run emulator:isi -- --ulang');
  }
  if (ULANG) {
    await kosongkan();
    await tunggu(1500); // beri waktu pemicu Function selesai sebelum data baru masuk
  }

  // ── Akun (dibuat dulu supaya uid bisa dipakai sebagai pelaku jejak audit) ──
  const AKUN = [
    { kunci: 'superadmin', email: 'superadmin@contoh.test', peran: ['superadmin'] },
    { kunci: 'keuangan', email: 'keuangan@contoh.test', peran: ['keuangan'] },
    { kunci: 'kepegawaian', email: 'kepegawaian@contoh.test', peran: ['kepegawaian'] },
    { kunci: 'umum', email: 'umum@contoh.test', peran: ['umum'] },
    { kunci: 'pegawai', email: 'pegawai@contoh.test', peran: [] },
  ];
  const uid = {};
  const sandi = {};
  for (const a of AKUN) {
    sandi[a.kunci] = DEV ? sandiAcak() : SANDI_EMULATOR;
    uid[a.kunci] = (await auth.createUser({ email: a.email, password: sandi[a.kunci] })).uid;
  }
  const oleh = uid.superadmin;
  const jejak = (u = oleh) => ({
    dibuatPada: FieldValue.serverTimestamp(),
    dibuatOleh: u,
    diubahPada: FieldValue.serverTimestamp(),
    diubahOleh: u,
  });
  const batch = db.batch();
  const baru = (kol) => db.collection(kol).doc();

  // ── Unit kerja: kantor → subbagian/seksi → urusan ──
  const unit = {};
  const UNIT = [
    ['kantor', 'KANIM', 'Kantor Imigrasi Kelas II TPI Buleleng', 'Kanim Buleleng', 'kantor', null],
    ['tu', 'TU', 'Subbagian Tata Usaha', 'Subbag TU', 'subbagian', 'kantor'],
    ['keu', 'KEU', 'Urusan Keuangan', 'Keuangan', 'urusan', 'tu'],
    ['kep', 'KEP', 'Urusan Kepegawaian', 'Kepegawaian', 'urusan', 'tu'],
    ['umum', 'UMUM', 'Urusan Umum', 'Umum', 'urusan', 'tu'],
    ['lantas', 'LANTASKIM', 'Seksi Lalu Lintas Keimigrasian', 'Lantaskim', 'seksi', 'kantor'],
    ['intel', 'INTELDAKIM', 'Seksi Intelijen dan Penindakan Keimigrasian', 'Inteldakim', 'seksi', 'kantor'],
    ['tik', 'TIKKIM', 'Seksi Teknologi Informasi dan Komunikasi Keimigrasian', 'Tikkim', 'seksi', 'kantor'],
  ];
  UNIT.forEach(([k]) => (unit[k] = baru('pegawai_unit')));
  UNIT.forEach(([k, kode, nama, singkatan, jenis, induk], i) => {
    batch.create(unit[k], {
      kode,
      nama,
      singkatan,
      jenis,
      indukId: induk ? unit[induk].id : '',
      urutan: i,
      aktif: true,
      ...jejak(),
    });
  });
  const singkatan = Object.fromEntries(UNIT.map(([k, , , s]) => [k, s]));

  // ── Master pangkat & jabatan ──
  const pangkat = {};
  [
    ['IIc', 'Pengatur', 'II/c', 'pns'],
    ['IIIa', 'Penata Muda', 'III/a', 'pns'],
    ['IIIb', 'Penata Muda Tingkat I', 'III/b', 'pns'],
    ['IIIc', 'Penata', 'III/c', 'pns'],
    ['IIId', 'Penata Tingkat I', 'III/d', 'pns'],
    ['IVa', 'Pembina', 'IV/a', 'pns'],
    ['IX', 'PPPK Golongan IX', 'IX', 'pppk'],
  ].forEach(([k, nama, golongan, jenis], i) => {
    pangkat[k] = { ref: baru('pegawai_pangkat'), nama, golongan };
    batch.create(pangkat[k].ref, { nama, golongan, jenis, urutan: i, aktif: true, ...jejak() });
  });
  const jabatan = {};
  [
    ['kakan', 'Kepala Kantor', 'struktural', 'III.b'],
    ['kasubbag', 'Kepala Subbagian Tata Usaha', 'struktural', 'IV.a'],
    ['kasi', 'Kepala Seksi', 'struktural', 'IV.a'],
    ['analis', 'Analis Keimigrasian Ahli Pertama', 'fungsional', ''],
    ['pengelola', 'Pengelola Keuangan', 'pelaksana', ''],
    ['pengolah', 'Pengolah Data', 'pelaksana', ''],
  ].forEach(([k, nama, jenis, eselon], i) => {
    jabatan[k] = { ref: baru('pegawai_jabatan'), nama };
    batch.create(jabatan[k].ref, { nama, jenis, eselon, urutan: i, aktif: true, ...jejak() });
  });

  // ── Pegawai (nama & NIP palsu); lima pertama punya akun ──
  const PEGAWAI = [
    ['superadmin', 'Budi Contoh', 'pns', 'IIIc', 'pengolah', 'tik', '1990-03-14'],
    ['keuangan', 'Ani Contoh', 'pns', 'IIIb', 'pengelola', 'keu', lahirDalam(20, 1992)],
    ['kepegawaian', 'Citra Contoh', 'pns', 'IIIa', 'pengolah', 'kep', lahirDalam(3, 1996)],
    ['umum', 'Dodi Contoh', 'pns', 'IIc', 'pengolah', 'umum', '1988-07-02'],
    ['pegawai', 'Eka Contoh', 'pns', 'IIIa', 'analis', 'lantas', lahirDalam(0, 1996)],
    ['kakan', 'Fajar Contoh', 'pns', 'IVa', 'kakan', 'kantor', '1978-01-21'],
    ['kasubbag', 'Gita Contoh', 'pns', 'IIId', 'kasubbag', 'tu', '1984-05-09'],
    ['kasi', 'Hadi Contoh', 'pns', 'IIId', 'kasi', 'intel', lahirDalam(45, 1980)],
    ['pppk', 'Indah Contoh', 'pppk', 'IX', 'pengolah', 'tik', '1995-11-30'],
    ['nonasn', 'Joko Contoh', 'nonasn', '', 'pengolah', 'umum', ''],
  ];
  const pegawai = {};
  PEGAWAI.forEach(([k, nama, status, pk, jb, un, lahir], i) => {
    const ref = baru('pegawai');
    const akun = AKUN.find((a) => a.kunci === k);
    pegawai[k] = ref;
    batch.create(ref, {
      nama,
      nip: status === 'nonasn' ? '' : String(i + 1).padStart(18, '0'),
      statusKepegawaian: status,
      pangkatId: pk ? pangkat[pk].ref.id : '',
      pangkatNama: pk ? pangkat[pk].nama : '',
      golongan: pk ? pangkat[pk].golongan : '',
      jabatanId: jabatan[jb].ref.id,
      jabatanNama: jabatan[jb].nama,
      unitId: unit[un].id,
      seksi: singkatan[un],
      tanggalLahir: lahir,
      fotoPaths: [],
      ...(akun ? { email: akun.email, authUid: uid[k], peran: akun.peran, aktif: true } : {}),
      ...jejak(),
    });
  });

  // ── Pejabat penandatangan (berlaku sejak awal tahun) ──
  [
    ['kepala', 'kakan'],
    ['ppk', 'kasubbag'],
    ['bendahara', 'keuangan'],
  ].forEach(([jenis, k]) => {
    batch.create(baru('pegawai_pejabat'), {
      jenis,
      pegawaiId: pegawai[k].id,
      berlakuMulai: `${T}-01-01`,
      berlakuSampai: null,
      ...jejak(),
    });
  });

  // ── Kegiatan & kehadiran (rekap dihitung Function diKegiatanDitulis) ──
  const hadirSemua = (kecuali = {}) =>
    Object.fromEntries(
      Object.entries(pegawai).map(([k, ref]) => [
        ref.id,
        { status: kecuali[k] || 'hadir', keterangan: kecuali[k] ? 'Contoh keterangan' : '' },
      ]),
    );
  const kegiatan = (nama, jenis, n, jam, tempat, kehadiran) => ({
    nama,
    jenis,
    tanggal: tanggalWita(n),
    jam,
    tempat,
    keterangan: '',
    kehadiran: kehadiran || null,
    kehadiranPada: kehadiran ? Timestamp.now() : null,
    kehadiranOleh: kehadiran ? uid.kepegawaian : null,
    aktif: true,
    alasanBatal: '',
    ...jejak(uid.kepegawaian),
  });
  batch.create(
    baru('pegawai_kegiatan'),
    kegiatan('Apel Pagi', 'apel', -7, '07:30', 'Lapangan Upacara', hadirSemua({ umum: 'sakit', pppk: 'cuti' })),
  );
  batch.create(
    baru('pegawai_kegiatan'),
    kegiatan('Rapat Koordinasi Bulanan', 'rapat', -3, '09:00', 'Ruang Rapat', hadirSemua({ nonasn: 'alpa' })),
  );
  batch.create(baru('pegawai_kegiatan'), kegiatan('Senam Pagi Bersama', 'senam', 0, '07:00', 'Halaman Kantor'));

  // ── MAK tahun berjalan: Tahun > Program > ... > Akun > Item (pagu hanya di Item) ──
  const mak = (tingkat, induk, kode, nama, pagu = 0, urutan = 0) => {
    const ref = baru('mak_node');
    batch.create(ref, {
      tahunAnggaran: T,
      tingkat,
      kode,
      nama,
      indukId: induk ? induk.id : null,
      pagu,
      aktif: true,
      urutan,
      ...jejak(uid.keuangan),
    });
    return ref;
  };
  const tahun = mak('tahun', null, '', String(T));
  const program = mak('program', tahun, 'WA', 'Program Dukungan Manajemen (contoh)');
  const keg = mak('kegiatan', program, '0000', 'Dukungan Manajemen dan Pelaksanaan Tugas Teknis (contoh)');
  const kro = mak('kro', keg, 'EBA', 'Layanan Dukungan Manajemen Internal');
  const output = mak('output', kro, '994', 'Layanan Perkantoran');
  const komp = mak('komponen', output, '002', 'Operasional dan Pemeliharaan Kantor');
  const sub = mak('subkomponen', komp, 'A', 'Penyelenggaraan Operasional Perkantoran');
  const bahan = mak('akun', sub, '521211', 'Belanja Bahan', 0, 0);
  mak('item', bahan, '001', 'Konsumsi rapat', 15000000, 0);
  mak('item', bahan, '002', 'Alat tulis kantor', 25000000, 1);
  const perjadin = mak('akun', sub, '524111', 'Belanja Perjalanan Dinas Biasa', 0, 1);
  mak('item', perjadin, '001', 'Perjalanan dinas pengawasan orang asing', 60000000, 0);
  mak('item', perjadin, '002', 'Perjalanan dinas koordinasi ke Kantor Wilayah', 40000000, 1);
  const dalamKota = mak('akun', sub, '524113', 'Belanja Perjalanan Dinas Dalam Kota', 0, 2);
  mak('item', dalamKota, '001', 'Transport lokal', 12000000, 0);
  batch.create(db.collection('mak_dipa').doc(String(T)), {
    tahunAnggaran: T,
    nomor: `SP DIPA-000.00.0.000000/${T}`,
    tanggal: `${T - 1}-12-01`,
    tahunNodeId: tahun.id,
    ...jejak(uid.keuangan),
  });

  // ── Kode surat: KOP > kode 1 > kode 2 ──
  const kode = (k, nama, tingkat, induk, urutan = 0) => {
    const ref = baru('surat_kode');
    batch.create(ref, {
      kode: k,
      nama,
      tingkat,
      indukId: induk ? induk.id : null,
      aktif: true,
      urutan,
      ...jejak(uid.keuangan),
    });
    return ref;
  };
  const kop = kode('IMI.CONTOH', 'Kantor Imigrasi (contoh)', 0, null);
  [
    ['UM', 'Umum', '01', 'Surat keluar umum'],
    ['KP', 'Kepegawaian', '01', 'Surat tugas'],
    ['KU', 'Keuangan', '01', 'Pembayaran'],
  ].forEach(([k1, n1, k2, n2], i) => kode(k2, n2, 2, kode(k1, n1, 1, kop, i)));

  // ── Inventory: kategori SAKTI, barang, pemasok (+ penjaga keunikan kode) ──
  const kategori = baru('inventory_kategori');
  batch.create(kategori, { kode: '1010301001', nama: 'Alat Tulis Kantor', akunKode: '117111', aktif: true, ...jejak(uid.umum) });
  batch.create(db.collection('inventory_kode').doc('1010301001'), {
    jenis: 'kategori',
    refId: kategori.id,
    dibuatPada: FieldValue.serverTimestamp(),
    dibuatOleh: uid.umum,
  });
  [
    ['000001', 'Kertas HVS A4 70 gram', 'rim', 20, 5],
    ['000002', 'Pulpen hitam', 'buah', 50, 10],
    ['000003', 'Map snelhecter', 'buah', 30, 10],
  ].forEach(([k, nama, satuan, stokAwal, stokMin]) => {
    const ref = baru('inventory_barang');
    batch.create(ref, { kode: k, kategoriId: kategori.id, nama, satuan, stokAwal, stokMin, aktif: true, ...jejak(uid.umum) });
    batch.create(db.collection('inventory_kode').doc(`1010301001${k}`), {
      jenis: 'barang',
      refId: ref.id,
      dibuatPada: FieldValue.serverTimestamp(),
      dibuatOleh: uid.umum,
    });
  });
  batch.create(baru('inventory_pemasok'), { nama: 'Toko Contoh Jaya', namaKunci: 'toko contoh jaya', aktif: true, ...jejak(uid.umum) });

  await batch.commit();

  // Peran disimpan di token login (custom claims), sama seperti akun yang dibuat Function.
  for (const a of AKUN) {
    await auth.setCustomUserClaims(uid[a.kunci], {
      peran: a.peran,
      aktif: true,
      pegawaiId: pegawai[a.kunci].id,
      wajibGantiSandi: false,
    });
  }

  // pegawai_ringkas & rekap kehadiran ditulis pemicu Function; tunggu sampai lengkap
  // (di cloud, panggilan pertama Function bisa lambat karena instans baru dinyalakan).
  let ringkas = 0;
  let rekap = 0;
  for (let i = 0; i < (DEV ? 120 : 30) && (ringkas < PEGAWAI.length || rekap < 1); i++) {
    await tunggu(1000);
    ringkas = (await db.collection('pegawai_ringkas').count().get()).data().count;
    rekap = (await db.collection('pegawai_rekap_hadir').count().get()).data().count;
  }

  const peranAkun = (a) => (a.peran.length ? a.peran.join(', ') : 'pegawai biasa');
  process.stdout.write(
    [
      '',
      DEV ? `Dapur latihan (${PROYEK}) sudah diisi data pura-pura.` : 'Emulator sudah diisi data pura-pura.',
      `  ${PEGAWAI.length} pegawai, ${UNIT.length} unit kerja, 3 kegiatan, MAK & DIPA ${T}, kode surat, 3 barang.`,
      ringkas < PEGAWAI.length || rekap < 1
        ? `  PERHATIAN: data turunan (pegawai_ringkas, rekap kehadiran) belum lengkap; pastikan ${DEV ? 'Functions sudah di-deploy' : 'Emulator Functions menyala'}.`
        : '  Data turunan (pegawai_ringkas, rekap kehadiran) sudah ditulis Function.',
      '',
      ...(DEV
        ? [
            'Akun login (kata sandi acak, SIMPAN SEKARANG; tidak ditampilkan lagi):',
            ...AKUN.map((a) => `  ${a.email.padEnd(26)} ${sandi[a.kunci]}   ${peranAkun(a)}`),
            '',
            'Buka web dengan "npm run dev" (atau Vercel Preview), lalu login memakai salah satu akun di atas.',
          ]
        : [
            `Akun login (semua kata sandi: ${SANDI_EMULATOR})`,
            ...AKUN.map((a) => `  ${a.email.padEnd(26)} ${peranAkun(a)}`),
            '',
            'Buka web dengan "npm run dev:emulator", lalu login memakai salah satu akun di atas.',
          ]),
      '',
    ].join('\n'),
  );
}

utama().catch((err) => keluar(`Gagal mengisi Emulator: ${err.message}`));
