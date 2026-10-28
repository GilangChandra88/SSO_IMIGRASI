/**
 * Membuat Super Admin PERTAMA di proyek yang masih kosong (sekali saja, oleh pemilik proyek).
 * Super Admin berikutnya dan semua peran lain diatur dari aplikasi (Function aturPeran).
 *
 * Prasyarat: `gcloud auth application-default login` dengan akun pemilik proyek, lalu
 * `gcloud auth application-default set-quota-project imigrasi-database-v2`.
 *
 * Jalankan dari folder functions/:
 *   node scripts/seedSuperAdmin.js --email nama@domain.go.id --nama "Nama Lengkap"
 *   (opsional: --project imigrasi-database-v2, --nip 18digit)
 *
 * Kata sandi sementara dicetak SEKALI di terminal; wajib diganti saat login pertama.
 * Skrip menolak berjalan bila Super Admin sudah ada.
 */

const crypto = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

function argumen(nama) {
  const i = process.argv.indexOf(`--${nama}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function sandiSementara() {
  const besar = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const kecil = 'abcdefghijkmnopqrstuvwxyz';
  const angka = '23456789';
  const semua = besar + kecil + angka;
  const pilih = (s) => s[crypto.randomInt(s.length)];
  const isi = [pilih(besar), pilih(kecil), pilih(angka)];
  while (isi.length < 16) isi.push(pilih(semua));
  for (let i = isi.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [isi[i], isi[j]] = [isi[j], isi[i]];
  }
  return isi.join('');
}

async function utama() {
  const projectId = argumen('project') || 'imigrasi-database-v2';
  const email = String(argumen('email') || '').trim().toLowerCase();
  const nama = String(argumen('nama') || '').trim();
  const nip = String(argumen('nip') || '').trim();

  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) throw new Error('--email tidak sah.');
  if (!nama || nama.length > 120) throw new Error('--nama wajib diisi (maks. 120 karakter).');
  if (nip && !/^\d{18}$/.test(nip)) throw new Error('--nip harus 18 digit.');

  initializeApp({ projectId });
  const auth = getAuth();
  const db = getFirestore();

  const sudahAda = await db
    .collection('pegawai')
    .where('peran', 'array-contains', 'superadmin')
    .limit(1)
    .get();
  if (!sudahAda.empty) {
    throw new Error('Super Admin sudah ada. Atur peran berikutnya dari aplikasi (Kepegawaian).');
  }

  const sandi = sandiSementara();
  const user = await auth.createUser({ email, password: sandi, displayName: nama });
  const ref = db.collection('pegawai').doc();
  try {
    await auth.setCustomUserClaims(user.uid, {
      peran: ['superadmin'],
      aktif: true,
      pegawaiId: ref.id,
      wajibGantiSandi: true,
      sandiSementaraPada: Date.now(),
    });
    const batch = db.batch();
    batch.create(ref, {
      nama,
      nip,
      pangkatId: '',
      pangkatNama: '',
      jabatanId: '',
      jabatanNama: '',
      seksi: '',
      tanggalLahir: '',
      fotoPaths: [],
      email,
      authUid: user.uid,
      peran: ['superadmin'],
      aktif: true,
      ultahMd: '',
      dibuatPada: FieldValue.serverTimestamp(),
      dibuatOleh: user.uid,
      diubahPada: FieldValue.serverTimestamp(),
      diubahOleh: user.uid,
    });
    batch.create(db.collection('sistem_log').doc(), {
      modul: 'sistem',
      aksi: 'seedSuperAdmin',
      target: ref.path,
      nilaiLama: null,
      nilaiBaru: { email },
      alasan: 'Super Admin pertama (skrip)',
      oleh: user.uid,
      pada: FieldValue.serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    await auth.deleteUser(user.uid).catch(() => {});
    throw err;
  }

  process.stdout.write(
    [
      '',
      `Super Admin dibuat di proyek ${projectId}.`,
      `  E-mail          : ${email}`,
      `  Kata sandi awal : ${sandi}`,
      '',
      'Simpan kata sandi ini sekarang (tidak ditampilkan lagi). Saat login pertama, aplikasi',
      'meminta kata sandi baru (min. 12 karakter, huruf besar, huruf kecil, dan angka).',
      '',
    ].join('\n'),
  );
}

utama().catch((err) => {
  process.stderr.write(`Gagal: ${err.message}\n`);
  process.exit(1);
});
