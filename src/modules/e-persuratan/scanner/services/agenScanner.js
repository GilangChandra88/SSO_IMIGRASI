/**
 * Klien HTTP "Agen Scanner": program kecil di PC pengguna (NAPS2.Sdk, .NET) yang mendengarkan
 * di 127.0.0.1 dan menjadi jembatan web ↔ scanner (TWAIN/WIA/eSCL), pemecah PDF, dan OCR.
 * Browser tidak bisa mengakses scanner sendiri, jadi semua yang butuh perangkat lewat sini.
 *
 * Halaman hasil pindaian/PDF dikirim sebagai aliran NDJSON (satu objek JSON per baris) supaya
 * tiap halaman bisa tampil begitu selesai, tanpa menunggu seluruh tumpukan kertas.
 */

export const ALAMAT_AGEN = 'http://127.0.0.1:47800';

/** Galat dari agen (pesan sudah berbahasa Indonesia). `offline` = agen tidak bisa dihubungi. */
export class GalatAgen extends Error {
  constructor(pesan, { offline = false, status = 0 } = {}) {
    super(pesan);
    this.offline = offline;
    this.status = status;
  }
}

async function minta(path, { method = 'GET', body, headers, signal } = {}) {
  let res;
  try {
    res = await fetch(`${ALAMAT_AGEN}${path}`, { method, body, headers, signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new GalatAgen(
      'Agen Scanner tidak dapat dihubungi. Pastikan aplikasinya berjalan di PC ini.',
      { offline: true },
    );
  }
  if (!res.ok) {
    let pesan = `Agen Scanner menolak permintaan (kode ${res.status}).`;
    try {
      const data = await res.json();
      if (data?.pesan) pesan = data.pesan;
    } catch {
      /* badan bukan JSON */
    }
    throw new GalatAgen(pesan, { status: res.status });
  }
  return res;
}

const json = (body) => ({
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
});

/** { nama, versi, ocr, bahasaOcr[] } — dipakai juga untuk cek agen hidup. */
export async function cekStatus(signal) {
  return (await minta('/status', { signal })).json();
}

/** Daftar scanner dari semua driver; perangkat yang sama di beberapa driver digabung. */
export async function daftarPerangkat({ segarkan = false } = {}) {
  const res = await minta(`/perangkat${segarkan ? '?segarkan=1' : ''}`);
  return (await res.json()).perangkat || [];
}

/** Kemampuan perangkat: { sumber[], warna[], dpi[], ukuran[] }; kosong = tidak diketahui. */
export async function kemampuanPerangkat(perangkat) {
  const res = await minta('/perangkat/kemampuan', { method: 'POST', ...json(perangkat) });
  return res.json();
}

/**
 * Baca aliran NDJSON halaman. Memanggil `onHalaman({ ke, lebar, tinggi, blob })` per halaman;
 * mengembalikan jumlah halaman. Batalkan lewat `signal` (agen ikut menghentikan pindaian).
 */
async function bacaAliranHalaman(res, onHalaman) {
  const reader = res.body.getReader();
  const dekoder = new TextDecoder();
  let sisa = '';
  let jumlah = 0;

  const olah = (baris) => {
    if (!baris.trim()) return;
    const ev = JSON.parse(baris);
    if (ev.jenis === 'halaman') {
      jumlah += 1;
      onHalaman({
        ke: ev.ke,
        lebar: ev.lebar,
        tinggi: ev.tinggi,
        blob: base64KeBlob(ev.data, ev.tipe),
      });
    } else if (ev.jenis === 'galat') {
      throw new GalatAgen(ev.pesan || 'Proses di Agen Scanner gagal.');
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    sisa += dekoder.decode(value, { stream: true });
    let i;
    while ((i = sisa.indexOf('\n')) >= 0) {
      olah(sisa.slice(0, i));
      sisa = sisa.slice(i + 1);
    }
  }
  olah(sisa);
  return jumlah;
}

/** Pindai: `pengaturan` = { perangkat, sumber, warna, dpi, ukuran }. */
export async function pindai(pengaturan, { onHalaman, signal }) {
  const res = await minta('/pindai', { method: 'POST', ...json(pengaturan), signal });
  return bacaAliranHalaman(res, onHalaman);
}

/** Pecah PDF menjadi gambar per halaman (dirender agen pada `dpi`). */
export async function pecahPdf(file, { dpi = 150, onHalaman, signal }) {
  const res = await minta(`/pdf?dpi=${dpi}`, {
    method: 'POST',
    body: file,
    headers: { 'Content-Type': 'application/pdf' },
    signal,
  });
  return bacaAliranHalaman(res, onHalaman);
}

/**
 * OCR satu gambar (Blob). Mengembalikan { teks, kata: [{ teks, x, y, w, h }] }; koordinat kata
 * dalam piksel gambar yang dikirim. `mode`: 'blok' (potongan kecil) atau 'halaman'.
 */
export async function bacaTeks(blob, { mode = 'blok', signal } = {}) {
  const res = await minta(`/ocr?mode=${mode}`, {
    method: 'POST',
    body: blob,
    headers: { 'Content-Type': blob.type || 'image/png' },
    signal,
  });
  return res.json();
}

function base64KeBlob(data, type = 'image/jpeg') {
  const biner = atob(data);
  const bytes = new Uint8Array(biner.length);
  for (let i = 0; i < biner.length; i++) bytes[i] = biner.charCodeAt(i);
  return new Blob([bytes], { type });
}
