/**
 * Gulir pintar e-Persuratan: setelah pengguna melakukan satu langkah, layar diarahkan ke langkah
 * berikutnya (isian wajib yang masih kosong, hasil berkas yang baru dibuat, tombol lanjutan).
 * Area gulir aplikasi ada di AppLayout (bukan window), jadi posisi dihitung terhadap wadah gulir
 * terdekat. Gulir memakai animasi sendiri (`gulirHalus`). Hormati "kurangi gerakan": gulir
 * langsung (tanpa halus) dan tanpa sorotan.
 */

import { kilauSekali, kurangiGerakan } from '@/utils/animasi';

const JARAK = 16; // ruang di atas elemen tujuan (px)

const akarGulir = () => document.scrollingElement || document.documentElement;

// Mulai pelan → cepat di tengah → berhenti pelan (tidak terasa "melompat")
const lembut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const animGulir = new WeakMap(); // wadah → pembatal animasi gulir yang sedang berjalan

/**
 * Gulir `w` ke `tujuan` dengan animasi sendiri (bukan `behavior: 'smooth'` bawaan browser yang
 * kecepatannya berbeda-beda dan bisa terputus, mis. oleh fokus). Durasi menyesuaikan jarak
 * (±450–900 ms). Berhenti bila pengguna menggulir sendiri. "Kurangi gerakan" → langsung.
 * @returns {Promise<void>} selesai saat gulir usai
 */
function gulirHalus(w, tujuan) {
  animGulir.get(w)?.();
  const awal = w.scrollTop;
  const jarak = tujuan - awal;
  if (kurangiGerakan()) {
    w.scrollTop = tujuan;
    return Promise.resolve();
  }
  const durasi = Math.min(900, Math.max(450, 300 + Math.abs(jarak) * 0.45));
  return new Promise((selesai) => {
    let batal = false;
    const acara = ['wheel', 'touchstart', 'keydown'];
    const henti = () => (batal = true);
    const bersih = () => {
      acara.forEach((a) => w.removeEventListener(a, henti));
      if (animGulir.get(w) === henti) animGulir.delete(w);
      selesai();
    };
    acara.forEach((a) => w.addEventListener(a, henti, { passive: true }));
    animGulir.set(w, henti);
    const mulai = performance.now();
    const langkah = (kini) => {
      if (batal) return bersih();
      const t = Math.min(1, (kini - mulai) / durasi);
      w.scrollTop = awal + jarak * lembut(t);
      if (t < 1) requestAnimationFrame(langkah);
      else bersih();
    };
    requestAnimationFrame(langkah);
  });
}

/**
 * Wadah gulir terdekat dari `el`. `bisaGulir`: hanya wadah yang isinya memang lebih tinggi
 * (lewati pembungkus `overflow-x-auto` yang ikut ber-overflow-y auto).
 */
export function wadahGulir(el, { bisaGulir = true } = {}) {
  let p = el?.parentElement;
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && (!bisaGulir || p.scrollHeight > p.clientHeight + 1))
      return p;
    p = p.parentElement;
  }
  return akarGulir();
}

/**
 * Gulir halus ke `el`. `posisi`: 'atas' (tepi atas elemen di dekat atas layar) atau 'tengah'.
 * Elemen yang sudah terlihat utuh — atau, bila lebih tinggi dari layar, tepi atasnya sudah di
 * seperempat atas layar — tidak digulir (kecuali `paksa`: selalu ditata ke `posisi`).
 * Tujuan dibatasi ke rentang gulir yang sah, jadi tidak pernah melewati atas/bawah halaman
 * (elemen di dekat ujung halaman berhenti sedekat mungkin ke tengah).
 * @returns {Promise<void>|null} janji yang selesai saat gulir usai, atau null bila tidak digulir
 */
export function gulirKe(el, { posisi = 'atas', paksa = false } = {}) {
  if (!el?.isConnected) return null;
  const w = wadahGulir(el);
  const atasWadah = w === akarGulir() ? 0 : w.getBoundingClientRect().top;
  const r = el.getBoundingClientRect();
  const atas = r.top - atasWadah;
  const tinggi = w.clientHeight;
  const utuh = atas >= JARAK && atas + r.height <= tinggi - JARAK;
  const cukup = r.height > tinggi - 2 * JARAK && atas >= JARAK && atas <= tinggi / 4;
  if (!paksa && (utuh || cukup)) return null;
  const geser = posisi === 'tengah' ? Math.max((tinggi - r.height) / 2, JARAK) : JARAK;
  const maks = Math.max(0, w.scrollHeight - tinggi);
  const tujuan = Math.min(maks, Math.max(0, Math.round(w.scrollTop + atas - geser)));
  if (Math.abs(tujuan - w.scrollTop) < 2) return null; // sudah di posisinya
  return gulirHalus(w, tujuan);
}

/** Kembalikan wadah gulir halaman `el` ke paling atas (langsung, untuk halaman/form baru). */
export function gulirKeAtas(el) {
  const w = wadahGulir(el, { bisaGulir: false });
  if (w.scrollTop) w.scrollTo({ top: 0, behavior: 'auto' });
}

/** Cari elemen lewat `cari()` setiap frame sampai ada (data masih dimuat) atau waktu habis. */
export function tungguElemen(cari, { batas = 2500 } = {}) {
  return new Promise((selesai) => {
    const mulai = performance.now();
    const cek = () => {
      const el = cari();
      if (el) selesai(el);
      else if (performance.now() - mulai > batas) selesai(null);
      else requestAnimationFrame(cek);
    };
    cek();
  });
}

const duaFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * Sorotan singkat pada `el` agar mata langsung menemukannya: bingkai biru memudar masuk-keluar
 * (elemen ber-`position` selain static), atau kedip lembut untuk baris tabel.
 */
export function sorot(el, { tunda = 0 } = {}) {
  if (!el?.animate || kurangiGerakan()) return;
  if (el.tagName === 'TR' || getComputedStyle(el).position === 'static') {
    el.animate(
      [{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }],
      {
        duration: 1100,
        delay: tunda,
        easing: 'ease-in-out',
      },
    );
    return;
  }
  const bingkai = document.createElement('span');
  bingkai.setAttribute('aria-hidden', 'true');
  bingkai.className =
    'pointer-events-none absolute inset-0 z-10 opacity-0 rounded-[inherit] ring-2 ring-inset ring-[#2A78D6] bg-[#2A78D6]/[.05] dark:ring-[#7DB6F3] dark:bg-[#7DB6F3]/[.07]';
  el.appendChild(bingkai);
  bingkai
    .animate(
      [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.65 }, { opacity: 0 }],
      { duration: 1700, delay: tunda, easing: 'ease-out' },
    )
    .finished.catch(() => {})
    .finally(() => bingkai.remove());
}

/** Tunggu elemen tujuan ada, gulir ke sana, lalu sorot setelah gulir usai. */
export async function gulirDanSorot(cari, { posisi = 'atas', batas } = {}) {
  await duaFrame();
  const el = await tungguElemen(cari, { batas });
  if (!el) return null;
  await gulirKe(el, { posisi });
  sorot(el);
  return el;
}

const KONTROL = 'input:not([type=hidden]):not([type=file]):not([disabled]), select, textarea';

/**
 * Setelah validasi gagal: gulir ke isian bertanda galat pertama (`data-galat` pada pembungkus
 * atau `aria-invalid="true"` pada kontrol) di dalam `akar` sampai tepat di tengah layar; setelah
 * gulir usai, fokuskan kontrolnya (hanya di perangkat bertetikus agar papan ketik HP tidak
 * tiba-tiba muncul) dan sapu isian itu dengan kilau sekali agar langsung terlihat.
 */
export async function gulirKeGalat(akar) {
  await duaFrame(); // tunggu tanda merah tampil
  const root = akar?.isConnected ? akar : document;
  const el = root.querySelector('[data-galat], [aria-invalid="true"]');
  if (!el) return;
  // Selalu ditata tepat di tengah layar, walau isiannya sudah terlihat
  await gulirKe(el, { posisi: 'tengah', paksa: true });
  fokuskan(el);
  kilauSekali(el);
}

function fokuskan(el) {
  const kontrol = el.matches(KONTROL) ? el : el.querySelector(KONTROL);
  let tetikus = false;
  try {
    tetikus = window.matchMedia('(pointer: fine)').matches;
  } catch {
    // abaikan
  }
  if (kontrol && tetikus) kontrol.focus({ preventScroll: true });
}

/**
 * Pulihkan posisi gulir `w` ke `atas` saat kembali ke halaman sebelumnya. Isi halaman sering
 * masih dimuat, jadi tunggu (≤1,5 detik) sampai cukup tinggi; batal bila pengguna menggulir sendiri.
 * @returns {() => void} pembatal
 */
export function pulihkanGulir(w, atas) {
  let batal = false;
  const henti = () => (batal = true);
  const acara = ['wheel', 'touchstart', 'keydown'];
  acara.forEach((a) => w.addEventListener(a, henti, { passive: true }));
  const bersih = () => acara.forEach((a) => w.removeEventListener(a, henti));
  const mulai = performance.now();
  const coba = () => {
    if (batal) return bersih();
    const cukup = w.scrollHeight - w.clientHeight >= atas - 1;
    if (cukup || performance.now() - mulai > 1500) {
      w.scrollTop = atas;
      return bersih();
    }
    requestAnimationFrame(coba);
  };
  coba();
  return () => {
    batal = true;
    bersih();
  };
}
