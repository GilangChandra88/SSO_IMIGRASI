/**
 * Akun, peran, dan status pegawai (docs/skema-database.md §8). Satu-satunya penulis claims
 * { peran, aktif, pegawaiId, wajibGantiSandi } dan field akun di dokumen pegawai.
 */

const crypto = require('node:crypto');
const { onCall } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const {
  HttpsError,
  FieldValue,
  getApp,
  db,
  authAdmin,
  OPSI_CALLABLE,
  KOLEKSI,
  KODE_PERAN,
  pemanggil,
  superadmin,
  wajibPeran,
  idSah: idSahUmum,
  teksSah,
  catatLog,
} = require('./umum');

const idSah = (v) => idSahUmum(v, 'ID pegawai');

/** Kata sandi sementara 16 karakter: memenuhi kebijakan (huruf besar, kecil, angka; ≥12). */
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


async function ambilPegawai(pegawaiId) {
  const ref = db.collection(KOLEKSI.pegawai).doc(pegawaiId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Data pegawai tidak ditemukan.');
  return { ref, data: snap.data() };
}

/** Data Super Admin hanya boleh disentuh Super Admin (sama dengan rules pegawai). */
function jagaSuperAdmin(p, data) {
  if ((data.peran || []).includes('superadmin') && !superadmin(p)) {
    throw new HttpsError('permission-denied', 'Data Super Admin hanya bisa diubah Super Admin.');
  }
}

async function klaimDari(uid) {
  const user = await authAdmin.getUser(uid);
  return user.customClaims || {};
}

/**
 * Waktu terakhir kata sandi akun diubah (ms). Admin SDK tidak menyediakannya, jadi dibaca dari
 * Identity Toolkit accounts:lookup dengan kredensial Function (atau Auth Emulator saat uji lokal).
 */
async function waktuSandiDiubah(uid) {
  const projek = process.env.GCLOUD_PROJECT || getApp().options.projectId;
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const dasar = emulator
    ? `http://${emulator}/identitytoolkit.googleapis.com`
    : 'https://identitytoolkit.googleapis.com';
  const token = emulator ? 'owner' : (await getApp().options.credential.getAccessToken()).access_token;
  const res = await fetch(`${dasar}/v1/projects/${projek}/accounts:lookup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: [uid] }),
  });
  if (!res.ok) throw new HttpsError('internal', 'Status kata sandi tidak bisa diperiksa.');
  const data = await res.json();
  return Number(data.users?.[0]?.passwordUpdatedAt || 0);
}

// ─── Akun & peran ─────────────────────────────────────────────────────────────

/**
 * Membuat akun login untuk dokumen pegawai yang belum punya akun.
 * Masukan: { pegawaiId, email }. Keluaran: { email, sandiSementara } — tampilkan sekali ke admin;
 * pegawai wajib mengganti kata sandi saat login pertama (claim wajibGantiSandi).
 */
exports.buatAkunPegawai = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  wajibPeran(p, 'kepegawaian');
  const pegawaiId = idSah(req.data?.pegawaiId);
  const email = teksSah(req.data?.email, 120, 'E-mail').toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Format e-mail tidak sah.');
  }

  const { ref, data } = await ambilPegawai(pegawaiId);
  jagaSuperAdmin(p, data);
  if (data.authUid) throw new HttpsError('already-exists', 'Pegawai ini sudah punya akun.');
  if (data.aktif === false) {
    throw new HttpsError('failed-precondition', 'Pegawai nonaktif tidak bisa dibuatkan akun.');
  }

  const sandi = sandiSementara();
  let user;
  try {
    user = await authAdmin.createUser({ email, password: sandi, displayName: data.nama });
  } catch (err) {
    if (err?.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'E-mail sudah dipakai akun lain.');
    }
    throw new HttpsError('internal', 'Akun gagal dibuat.');
  }

  try {
    await authAdmin.setCustomUserClaims(user.uid, {
      peran: [],
      aktif: true,
      pegawaiId,
      wajibGantiSandi: true,
      sandiSementaraPada: Date.now(),
    });
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.get('authUid')) throw new HttpsError('already-exists', 'Pegawai ini sudah punya akun.');
      tx.update(ref, {
        email,
        authUid: user.uid,
        peran: [],
        aktif: true,
        diubahPada: FieldValue.serverTimestamp(),
        diubahOleh: p.uid,
      });
      catatLog(tx, {
        modul: 'pegawai',
        aksi: 'buatAkun',
        target: ref.path,
        nilaiBaru: { email },
        oleh: p.uid,
      });
    });
  } catch (err) {
    // Langkah setelah akun dibuat gagal: hapus akunnya supaya tidak ada akun yatim.
    await authAdmin.deleteUser(user.uid).catch(() => {});
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'Akun gagal dibuat.');
  }

  return { email, sandiSementara: sandi };
});

/**
 * Mengatur peran khusus pegawai. Hanya Super Admin, tidak untuk akunnya sendiri.
 * Masukan: { pegawaiId, peran: string[] } (subset KODE_PERAN; [] = Pegawai biasa).
 */
exports.aturPeran = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  if (!superadmin(p)) {
    throw new HttpsError('permission-denied', 'Hanya Super Admin yang bisa mengatur peran.');
  }
  const pegawaiId = idSah(req.data?.pegawaiId);
  const peranBaru = req.data?.peran;
  if (
    !Array.isArray(peranBaru) ||
    peranBaru.some((r) => !KODE_PERAN.includes(r)) ||
    new Set(peranBaru).size !== peranBaru.length
  ) {
    throw new HttpsError('invalid-argument', 'Daftar peran tidak sah.');
  }
  if (pegawaiId === p.pegawaiId) {
    throw new HttpsError('failed-precondition', 'Peran akun sendiri tidak bisa diubah.');
  }

  const { ref, data } = await ambilPegawai(pegawaiId);
  if (!data.authUid) throw new HttpsError('failed-precondition', 'Pegawai ini belum punya akun.');
  if (data.aktif === false) throw new HttpsError('failed-precondition', 'Pegawai ini nonaktif.');

  const peran = KODE_PERAN.filter((r) => peranBaru.includes(r)); // urutan tetap
  const klaim = await klaimDari(data.authUid);
  await authAdmin.setCustomUserClaims(data.authUid, { ...klaim, peran });
  await db.runTransaction(async (tx) => {
    tx.update(ref, { peran, diubahPada: FieldValue.serverTimestamp(), diubahOleh: p.uid });
    catatLog(tx, {
      modul: 'pegawai',
      aksi: 'aturPeran',
      target: ref.path,
      nilaiLama: data.peran || [],
      nilaiBaru: peran,
      oleh: p.uid,
    });
  });
  return { peran };
});

async function aturStatus(req, aktif) {
  const p = pemanggil(req);
  wajibPeran(p, 'kepegawaian');
  const pegawaiId = idSah(req.data?.pegawaiId);
  const alasan = teksSah(req.data?.alasan, 300, 'Alasan', { wajib: !aktif });
  if (pegawaiId === p.pegawaiId) {
    throw new HttpsError('failed-precondition', 'Status akun sendiri tidak bisa diubah.');
  }

  const { ref, data } = await ambilPegawai(pegawaiId);
  jagaSuperAdmin(p, data);
  if ((data.aktif !== false) === aktif) return { aktif };

  if (data.authUid) {
    const klaim = await klaimDari(data.authUid);
    await authAdmin.updateUser(data.authUid, { disabled: !aktif });
    await authAdmin.setCustomUserClaims(data.authUid, { ...klaim, aktif });
    if (!aktif) await authAdmin.revokeRefreshTokens(data.authUid);
  }
  await db.runTransaction(async (tx) => {
    tx.update(ref, { aktif, diubahPada: FieldValue.serverTimestamp(), diubahOleh: p.uid });
    catatLog(tx, {
      modul: 'pegawai',
      aksi: aktif ? 'aktifkan' : 'nonaktifkan',
      target: ref.path,
      nilaiLama: !aktif,
      nilaiBaru: aktif,
      alasan,
      oleh: p.uid,
    });
  });
  return { aktif };
}

/** Menonaktifkan pegawai (pengganti hapus): akun dimatikan, sesi dicabut. Masukan: { pegawaiId, alasan }. */
exports.nonaktifkanPegawai = onCall(OPSI_CALLABLE, (req) => aturStatus(req, false));

/** Mengaktifkan kembali pegawai nonaktif. Masukan: { pegawaiId, alasan? }. */
exports.aktifkanPegawai = onCall(OPSI_CALLABLE, (req) => aturStatus(req, true));

/**
 * Mencabut claim wajibGantiSandi SETELAH server memastikan kata sandi benar-benar sudah diganti:
 * waktu ubah kata sandi (Identity Toolkit) harus lebih baru dari saat kata sandi sementara dibuat
 * (claim sandiSementaraPada; akun lama memakai waktu pembuatan akun). Aman dipanggil ulang.
 */
exports.tandaiSandiDiganti = onCall(OPSI_CALLABLE, async (req) => {
  const p = pemanggil(req);
  const klaim = await klaimDari(p.uid);
  if (!klaim.wajibGantiSandi) return { selesai: true };
  const user = await authAdmin.getUser(p.uid);
  const acuan = Number(klaim.sandiSementaraPada) || Date.parse(user.metadata.creationTime) || 0;
  const diubah = await waktuSandiDiubah(p.uid);
  if (!(diubah > acuan + 1000)) {
    throw new HttpsError('failed-precondition', 'Kata sandi sementara belum diganti.');
  }
  const { wajibGantiSandi: _hapus, sandiSementaraPada: _acuan, ...sisa } = klaim;
  await authAdmin.setCustomUserClaims(p.uid, sisa);
  await catatLog(null, {
    modul: 'pegawai',
    aksi: 'gantiSandiPertama',
    target: `${KOLEKSI.pegawai}/${p.pegawaiId}`,
    oleh: p.uid,
  });
  return { selesai: true };
});

// ─── Data turunan ─────────────────────────────────────────────────────────────

/**
 * Thumbnail foto pertama pegawai: foto asli `pegawai/{id}/foto/{nama}` punya pasangan
 * `pegawai/{id}/thumb/{nama}` (nama sama, diunggah Kepegawaian bersamaan). Path di luar folder
 * pegawai itu diabaikan.
 */
function thumbPertama(pegawaiId, fotoPaths) {
  const pertama = Array.isArray(fotoPaths) ? fotoPaths[0] : '';
  const cocok =
    typeof pertama === 'string' &&
    /^pegawai\/([^/]+)\/foto\/([0-9]{13}-[A-Za-z0-9._-]{1,80})$/.exec(pertama);
  return cocok && cocok[1] === pegawaiId ? `pegawai/${pegawaiId}/thumb/${cocok[2]}` : '';
}

/**
 * pegawai/{id} → pegawai_ringkas/{id} (data yang boleh dibaca semua pegawai), ultahMd (turunan
 * tanggalLahir), dan fotoThumbPath. Dokumen pegawai lengkap hanya dibaca Kepegawaian & pemilik.
 */
exports.diPegawaiDitulis = onDocumentWritten(`${KOLEKSI.pegawai}/{pegawaiId}`, async (event) => {
  const ringkasRef = db.collection(KOLEKSI.pegawaiRingkas).doc(event.params.pegawaiId);
  const sesudah = event.data?.after;
  if (!sesudah?.exists) {
    await ringkasRef.delete();
    return;
  }
  const d = sesudah.data();
  const ultahMd = /^\d{4}-\d{2}-\d{2}$/.test(d.tanggalLahir || '') ? d.tanggalLahir.slice(5) : '';
  const batch = db.batch();
  if ((d.ultahMd || '') !== ultahMd) batch.update(sesudah.ref, { ultahMd });
  batch.set(ringkasRef, {
    nama: d.nama || '',
    nip: d.nip || '',
    pangkatNama: d.pangkatNama || '',
    jabatanNama: d.jabatanNama || '',
    seksi: d.seksi || '',
    authUid: d.authUid || '',
    aktif: d.aktif !== false,
    ultahMd,
    fotoThumbPath: thumbPertama(event.params.pegawaiId, d.fotoPaths),
  });
  await batch.commit();
});
