/**
 * Pisahkan gelar dari `pegawai.nama` ke `gelarDepan` & `gelarBelakang` (docs/skema-database.md §5.1).
 * Nama disimpan tanpa gelar; gelar tetap tersimpan apa adanya. `pegawai_ringkas` ikut diperbarui
 * oleh Function `diPegawaiDitulis`, jadi deploy Function itu dulu supaya ringkas juga memuat gelar.
 *
 * Bawaan PRATINJAU (tidak menulis apa pun). Pakai --tulis untuk menyimpan.
 *   node functions/scripts/pisahGelarPegawai.js --proyek=dev
 *   node functions/scripts/pisahGelarPegawai.js --proyek=produksi --laporan=gelar.csv
 *   node functions/scripts/pisahGelarPegawai.js --proyek=produksi --tulis
 *
 * Login: `gcloud auth application-default login` dengan akun pemilik proyek.
 * Aman diulang: pegawai yang sudah punya field gelar atau namanya tanpa gelar dilewati.
 * Catatan: penulisan dari skrip tercatat di Log Developer sebagai perubahan dari luar aplikasi (A8).
 */

const PROYEK_PETA = { dev: 'imigrasi-database', produksi: 'imigrasi-database-v2' };
const argv = (nama) => process.argv.find((a) => a.startsWith(`--${nama}=`))?.split('=')[1];
const PROYEK = PROYEK_PETA[argv('proyek')];
if (!PROYEK) {
  console.error('Pilih proyek: --proyek=dev atau --proyek=produksi');
  process.exit(1);
}
const TULIS = process.argv.includes('--tulis');
delete process.env.FIRESTORE_EMULATOR_HOST;
process.env.GCLOUD_PROJECT = PROYEK;
process.env.GOOGLE_CLOUD_PROJECT = PROYEK;
process.env.GOOGLE_CLOUD_QUOTA_PROJECT = PROYEK;

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { FieldValue, db, KOLEKSI } = require('../src/umum');

const PELAKU = 'skrip-pisah-gelar';
const MAKS_BATCH = 400;

(async () => {
  const { pisahGelar } = await import(
    pathToFileURL(path.join(__dirname, '../../src/utils/dataPegawai.js')).href
  );
  const snap = await db.collection(KOLEKSI.pegawai).get();
  const ubah = [];
  const laporan = [['id', 'namaLama', 'namaBaru', 'gelarDepan', 'gelarBelakang', 'perluDicek']];
  let sudah = 0;
  let ragu = 0;
  snap.forEach((d) => {
    const p = d.data();
    if ('gelarDepan' in p || 'gelarBelakang' in p) {
      sudah += 1;
      return;
    }
    const h = pisahGelar(p.nama);
    if (h.ragu) ragu += 1;
    if (!h.gelarDepan && !h.gelarBelakang) return;
    ubah.push({ ref: d.ref, nama: h.nama, gelarDepan: h.gelarDepan, gelarBelakang: h.gelarBelakang });
    laporan.push([d.id, p.nama, h.nama, h.gelarDepan, h.gelarBelakang, h.ragu ? 'YA' : '']);
  });

  console.log(`Proyek ${PROYEK}: ${snap.size} pegawai`);
  console.log(`  akan dipisah gelarnya : ${ubah.length}`);
  console.log(`  sudah terpisah        : ${sudah}`);
  console.log(`  nama perlu dicek      : ${ragu} (masih ada titik/koma sesudah dipisah)`);

  const berkas = argv('laporan');
  if (berkas) {
    fs.writeFileSync(
      berkas,
      '﻿' +
        laporan
          .map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';'))
          .join('\r\n'),
    );
    console.log(`  laporan per pegawai   : ${path.resolve(berkas)} (berisi nama — jangan dibagikan)`);
  }

  if (!TULIS) {
    console.log('\nPRATINJAU saja. Jalankan lagi dengan --tulis untuk menyimpan.');
    process.exit(0);
  }
  for (let i = 0; i < ubah.length; i += MAKS_BATCH) {
    const batch = db.batch();
    ubah.slice(i, i + MAKS_BATCH).forEach((u) =>
      batch.update(u.ref, {
        nama: u.nama,
        gelarDepan: u.gelarDepan,
        gelarBelakang: u.gelarBelakang,
        diubahPada: FieldValue.serverTimestamp(),
        diubahOleh: PELAKU,
      }),
    );
    await batch.commit();
  }
  console.log(`\nSelesai: ${ubah.length} pegawai diperbarui.`);
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
