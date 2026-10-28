// Pemeriksaan `npm audit --omit=dev` untuk CI: gagal bila ada kerentanan high/critical, KECUALI
// temuan K36 (@grpc/grpc-js lewat @firebase/firestore: hanya jalur Node, tidak masuk bundel
// browser; lihat docs/rencana-keamanan-efisiensi-firebase.md). Paket yang semua jalurnya berujung
// pada paket pengecualian ikut dikecualikan. Jangan pernah menjalankan `npm audit fix --force`.
// Jalankan: node scripts/cek-audit.mjs
/* global console, process */
import { execFileSync } from 'node:child_process';

const PENGECUALIAN = new Set(['@grpc/grpc-js']); // K36
const PARAH = ['high', 'critical'];

let keluaran;
try {
  keluaran = execFileSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (err) {
  keluaran = err.stdout; // npm audit keluar dengan kode ≠ 0 bila ada temuan
}
const { vulnerabilities = {} } = JSON.parse(keluaran || '{}');

function dikecualikan(nama, dilihat = new Set()) {
  if (PENGECUALIAN.has(nama) || dilihat.has(nama)) return true;
  dilihat.add(nama);
  const v = vulnerabilities[nama];
  if (!v) return false;
  return v.via.every((x) =>
    typeof x === 'string' ? dikecualikan(x, dilihat) : PENGECUALIAN.has(x.name),
  );
}

const temuan = Object.entries(vulnerabilities).filter(
  ([nama, v]) => PARAH.includes(v.severity) && !dikecualikan(nama),
);
const dilewati = Object.keys(vulnerabilities).filter((nama) => dikecualikan(nama));
if (dilewati.length) console.log(`Dikecualikan (K36): ${dilewati.join(', ')}`);
if (temuan.length) {
  for (const [nama, v] of temuan) console.log(`GAGAL  ${v.severity.padEnd(8)} ${nama}`);
  console.log(
    `\n${temuan.length} kerentanan high/critical baru. Perbarui paketnya (bukan --force).`,
  );
  process.exit(1);
}
console.log('Tidak ada kerentanan high/critical baru pada dependensi produksi.');
