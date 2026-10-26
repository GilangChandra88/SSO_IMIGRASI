import { T } from '@/utils/uiTokens';

/**
 * Pembantu animasi bersama seluruh aplikasi (lihat aturan animasi di CLAUDE.md §5).
 * - `ANIM` / `jedaKe()`: kelas Tailwind siap pakai untuk transisi sederhana (muncul, meletup, …).
 * - Fungsi Web Animations API (`element.animate`) untuk animasi bertahap; hanya menggerakkan
 *   `transform`/`opacity` dan dilewati bila "kurangi gerakan" aktif.
 * Komponen pendamping: `@/components/animasi` (Lipat, AngkaBerjalan).
 */

/** Durasi transisi Tailwind pendek; samakan dengan kelas `duration-300`. */
export const DURASI_ANIMASI = 300;

// ─── Kelas siap pakai (transisi sederhana) ───────────────────────────────────
// Semua bergerak hanya bila "kurangi gerakan" tidak aktif (motion-safe:). Varian starting: berlaku
// saat elemen pertama kali dipasang — pakai `key` agar animasi muncul berulang (mis. isi tab).

/** Kurva pegas kecil (melenting). */
export const PEGAS = 'motion-safe:ease-[cubic-bezier(.34,1.56,.64,1)]';

export const ANIM = {
  /**
   * Muncul: memudar + turun sedikit ke tempatnya (isi tab, kartu, baris daftar). Masuk dari atas
   * (bukan dari bawah) agar tidak meluap ke bawah wadah ber-overflow dan memunculkan bilah gulir.
   */
  muncul:
    'motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:opacity-0 motion-safe:starting:-translate-y-2',
  /** Memudar saja (isi yang mengukur posisinya sendiri saat dipasang, mis. diagram alur). */
  pudar:
    'motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:opacity-0',
  /** Muncul dari samping (langkah form maju). */
  geserKiri:
    'motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:opacity-0 motion-safe:starting:translate-x-6',
  /** Muncul dari samping (langkah form mundur). */
  geserKanan:
    'motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:opacity-0 motion-safe:starting:-translate-x-6',
  /** Meletup dari kecil dengan pegas (lencana, centang, chip baru). */
  meletup: `motion-safe:transition-[opacity,scale] motion-safe:duration-300 ${PEGAS} motion-safe:starting:opacity-0 motion-safe:starting:scale-50`,
  /** Menu tarik-turun / popover: memudar + membesar dari atas. */
  popover:
    'origin-top motion-safe:transition-[opacity,scale,translate] motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:opacity-0 motion-safe:starting:scale-95 motion-safe:starting:-translate-y-1',
  /** Bilah/panel bawah: membesar dari tepi bawah dengan pegas (tanpa geser, agar tidak meluap). */
  naik: `origin-bottom motion-safe:transition-[opacity,scale] motion-safe:duration-300 ${PEGAS} motion-safe:starting:opacity-0 motion-safe:starting:scale-90`,
  /** Latar gelap popup: memudar masuk. */
  latar:
    'motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:opacity-0',
  /** Kartu popup: melenting dari sedikit lebih kecil & lebih rendah. */
  popup: `motion-safe:transition-[opacity,scale,translate] motion-safe:duration-300 ${PEGAS} motion-safe:starting:opacity-0 motion-safe:starting:scale-90 motion-safe:starting:translate-y-3`,
  /** Chip / tombol pilihan: warna berganti halus + mengecil saat ditekan. */
  pilih:
    'motion-safe:transition-[color,background-color,border-color,box-shadow,scale] motion-safe:duration-200 motion-safe:active:scale-95',
  /** Bilah (progres, distribusi) tumbuh dari kiri saat pertama tampil. */
  tumbuhX:
    'origin-left motion-safe:transition-[scale] motion-safe:duration-700 motion-safe:ease-out motion-safe:starting:scale-x-0',
  /** Umpan balik tekan untuk tombol/kartu yang bisa diklik. */
  tekan: 'motion-safe:transition-[scale] motion-safe:duration-150 motion-safe:active:scale-[.97]',
};

const JEDA = [
  'motion-safe:delay-0',
  'motion-safe:delay-[40ms]',
  'motion-safe:delay-[80ms]',
  'motion-safe:delay-[120ms]',
  'motion-safe:delay-[160ms]',
  'motion-safe:delay-[200ms]',
  'motion-safe:delay-[240ms]',
  'motion-safe:delay-[280ms]',
];

/** Jeda untuk muncul berurutan (item ke-i; dibatasi agar daftar panjang tidak menunggu lama). */
export const jedaKe = (i) => JEDA[Math.min(Math.max(i, 0), JEDA.length - 1)];

/** true bila pengguna memilih "kurangi gerakan" di sistem operasinya. */
export function kurangiGerakan() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Tunggu animasi keluar selesai sebelum data diubah; langsung selesai bila "kurangi gerakan". */
export const tungguAnimasi = (ms = DURASI_ANIMASI) =>
  new Promise((resolve) => setTimeout(resolve, kurangiGerakan() ? 0 : ms));

/** Baris di bawahnya "terbentur" setelah naik menutup celah: memantul kecil berurutan. */
export function benturan(wadah) {
  let n = wadah?.nextElementSibling;
  for (let i = 0; n && i < 12; i++, n = n.nextElementSibling) {
    n.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-7px)', offset: 0.35 },
        { transform: 'translateY(2px)', offset: 0.7 },
        { transform: 'translateY(0)' },
      ],
      { duration: 340, easing: 'ease-out', delay: i * 22 },
    );
  }
}

// ─── Masuk (berkas baru) ─────────────────────────────────────────────────────
// Gaya "siber": ruang dibuka dulu, lalu baris terbentuk dari kiri ke kanan seperti kebalikan
// jentikan Thanos — partikel debu piksel (warna aplikasi) tersedot menyatu ke garis pemindai.

const BUKA_MS = DURASI_ANIMASI; // celah terbuka
const BENTUK_MS = 820; // garis pemindai menyapu kiri → kanan
const PARTIKEL_MS = 460;
const PARTIKEL = [
  'bg-[#0f2040] dark:bg-[#EAF0F8]',
  'bg-[#2A78D6] shadow-[0_0_6px_rgba(42,120,214,.9)]',
  'bg-[#7DB6F3] shadow-[0_0_8px_rgba(125,182,243,.95)]',
  'bg-[#2A78D6] shadow-[0_0_6px_rgba(42,120,214,.9)]',
  'bg-[#C9973B] shadow-[0_0_6px_rgba(201,151,59,.85)]',
];

const tambahKelas = (el, ...kelas) => kelas.forEach((k) => el.classList.add(...k.split(' ')));

/** Partikel debu yang terbang dari kanan lalu tersedot ke titik (x, y) pada waktu `tiba` ms. */
function partikelMasuk(x, y, tiba, i) {
  const p = document.createElement('span');
  p.setAttribute('aria-hidden', 'true');
  tambahKelas(
    p,
    'pointer-events-none',
    PARTIKEL[i % PARTIKEL.length],
    i % 4 ? 'w-[3px] h-[3px]' : 'w-[4px] h-[4px] rounded-[1px]',
  );
  Object.assign(p.style, { position: 'fixed', left: `${x}px`, top: `${y}px`, zIndex: '1100' });
  document.body.appendChild(p);
  const dx = 28 + Math.random() * 110; // datang dari sisi kanan garis pemindai
  const dy = (Math.random() - 0.5) * 70;
  const putar = (Math.random() - 0.5) * 180;
  p.animate(
    [
      { transform: `translate(${dx}px,${dy}px) rotate(${putar}deg) scale(1.3)`, opacity: 0 },
      {
        transform: `translate(${dx * 0.55}px,${dy * 0.55}px) rotate(${putar / 2}deg) scale(1)`,
        opacity: 1,
        offset: 0.35,
      },
      { transform: 'translate(0,0) rotate(0deg) scale(.3)', opacity: 0 },
    ],
    {
      duration: PARTIKEL_MS,
      delay: Math.max(tiba - PARTIKEL_MS, 0),
      easing: 'cubic-bezier(.5,0,.75,0)', // makin cepat saat tersedot
      fill: 'backwards',
    },
  )
    .finished.catch(() => {})
    .finally(() => p.remove());
}

/**
 * Animasi berkas baru masuk tabel: (1) celah baris terbuka (`onBuka`) dan baris di bawahnya
 * terdorong lalu memantul; (2) baris "terbentuk" dari kiri ke kanan — penutup selebar baris
 * menyusut (scaleX) di belakang garis pemindai bercahaya, sementara partikel debu warna aplikasi
 * tersedot menyatu ke garis; (3) glitch singkat.
 * @param {{ wadah: HTMLElement, onBuka: () => void }} opsi
 *   wadah = elemen luar `<Lipat>` baris baru (masih tertutup)
 * @returns {Promise<void>} selesai
 */
export async function animasiMasuk({ wadah, onBuka }) {
  const isi = wadah?.firstElementChild?.firstElementChild;
  if (!isi || !isi.animate || kurangiGerakan()) {
    onBuka();
    return;
  }

  // Tabel digulir ke awal agar kolom ID terlihat saat baris terbentuk
  const gulir = wadah.closest('.overflow-x-auto');
  if (gulir) gulir.scrollLeft = 0;

  // Penutup (warna permukaan) + garis pemindai di atas baris, disiapkan sebelum celah terbuka
  const penutup = document.createElement('div');
  penutup.setAttribute('aria-hidden', 'true');
  tambahKelas(penutup, 'pointer-events-none absolute inset-0 z-10 origin-right', T.surface);
  const garis = document.createElement('div');
  garis.setAttribute('aria-hidden', 'true');
  tambahKelas(
    garis,
    'pointer-events-none absolute top-0 bottom-0 left-0 z-20 w-[2px] bg-[#7DB6F3] shadow-[0_0_14px_3px_rgba(125,182,243,.85)]',
  );
  // jejak cahaya di belakang garis
  const jejak = document.createElement('div');
  tambahKelas(
    jejak,
    'absolute top-0 bottom-0 right-full w-24 bg-gradient-to-l from-[rgba(42,120,214,.28)] to-transparent',
  );
  garis.appendChild(jejak);
  isi.append(penutup, garis);

  // (1) Geser membuat ruang
  onBuka();
  await new Promise((resolve) => setTimeout(resolve, BUKA_MS));
  if (!wadah.isConnected) return;
  benturan(wadah);

  // (2) Terbentuk dari kiri ke kanan
  const r = isi.getBoundingClientRect();
  const rg = gulir?.getBoundingClientRect() || r;
  const lebar = r.width;
  const kiriTampak = Math.max(r.left, rg.left, 0);
  const kananTampak = Math.min(r.right, rg.right, window.innerWidth);

  const sapu = { duration: BENTUK_MS, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' };
  const animPenutup = penutup.animate(
    [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
    sapu,
  );
  garis.animate(
    [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: `translateX(${lebar}px)`, opacity: 1, offset: 0.92 },
      { transform: `translateX(${lebar}px)`, opacity: 0 },
    ],
    sapu,
  );

  // Partikel hanya di bagian baris yang terlihat; tibanya mengikuti posisi garis
  const jumlah = Math.round(Math.min(90, Math.max(40, (kananTampak - kiriTampak) / 10)));
  for (let i = 0; i < jumlah; i++) {
    const x = kiriTampak + Math.random() * Math.max(kananTampak - kiriTampak, 1);
    const y = r.top + 4 + Math.random() * Math.max(r.height - 8, 1);
    const tiba = ((x - r.left) / lebar) * BENTUK_MS;
    partikelMasuk(x, y, tiba, i);
  }

  try {
    await animPenutup.finished;
  } catch {
    // dibatalkan
  }
  penutup.remove();
  garis.remove();
  if (!isi.isConnected) return;

  // (3) Glitch singkat: baris bergetar menyamping & berkedip
  await isi
    .animate(
      [
        { transform: 'translateX(0)', opacity: 1 },
        { transform: 'translateX(-3px)', opacity: 0.75, offset: 0.2 },
        { transform: 'translateX(3px)', opacity: 1, offset: 0.4 },
        { transform: 'translateX(-1px)', opacity: 0.85, offset: 0.65 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 180, easing: 'steps(5, end)' },
    )
    .finished.catch(() => {});
}

// ─── Hapus (kebalikan animasi masuk) ─────────────────────────────────────────
// Glitch merah → baris luruh kiri → kanan menjadi debu piksel merah di belakang garis pemindai
// merah (seperti jentikan Thanos) → celah menutup dan baris di bawahnya terbentur.

const GLITCH_MS = 220;
const LEBUR_MS = 820;
const DEBU_MS = 620;
const DEBU = [
  'bg-[#A62D2D] shadow-[0_0_6px_rgba(166,45,45,.85)]',
  'bg-[#E05252] shadow-[0_0_8px_rgba(224,82,82,.9)]',
  'bg-[#F19191] shadow-[0_0_6px_rgba(241,145,145,.85)]',
  'bg-[#E05252] shadow-[0_0_8px_rgba(224,82,82,.9)]',
  'bg-[#7A1F1F] dark:bg-[#F7C2C2]',
];

/** Debu yang lepas dari titik (x, y) saat garis melewatinya (`lepas` ms), lalu melayang & pudar. */
function debuKeluar(x, y, lepas, i) {
  const p = document.createElement('span');
  p.setAttribute('aria-hidden', 'true');
  tambahKelas(
    p,
    'pointer-events-none',
    DEBU[i % DEBU.length],
    i % 4 ? 'w-[3px] h-[3px]' : 'w-[4px] h-[4px] rounded-[1px]',
  );
  Object.assign(p.style, { position: 'fixed', left: `${x}px`, top: `${y}px`, zIndex: '1100' });
  document.body.appendChild(p);
  const dx = 30 + Math.random() * 130; // terbawa ke kanan
  const dy = -(8 + Math.random() * 70) + (Math.random() < 0.25 ? 50 : 0); // kebanyakan naik
  const putar = (Math.random() - 0.5) * 220;
  p.animate(
    [
      { transform: 'translate(0,0) rotate(0deg) scale(.6)', opacity: 0 },
      { transform: 'translate(4px,-2px) rotate(0deg) scale(1.2)', opacity: 1, offset: 0.12 },
      { transform: `translate(${dx}px,${dy}px) rotate(${putar}deg) scale(.3)`, opacity: 0 },
    ],
    {
      duration: DEBU_MS + Math.random() * 260,
      delay: lepas,
      easing: 'cubic-bezier(.25,.6,.4,1)', // lepas cepat lalu melambat seperti debu
      fill: 'backwards',
    },
  )
    .finished.catch(() => {})
    .finally(() => p.remove());
}

/**
 * Animasi hapus baris (kebalikan animasiMasuk), bernuansa merah: (1) glitch merah; (2) garis
 * pemindai merah menyapu kiri → kanan, baris lenyap di belakangnya (penutup scaleX 0 → 1) sambil
 * luruh menjadi debu piksel merah; (3) celah menutup (`onTutup`) dan baris di bawahnya terbentur.
 * @param {{ wadah: HTMLElement, onTutup: () => void }} opsi
 *   wadah = elemen luar `<Lipat>` baris yang dihapus
 * @returns {{ tutup: Promise<void>, pulihkan: () => void }}
 *   tutup = celah sudah tertutup (data boleh dihapus); pulihkan = tampilkan lagi baris (bila gagal)
 */
export function animasiHapus({ wadah, onTutup }) {
  const isi = wadah?.firstElementChild?.firstElementChild;
  if (!isi || !isi.animate || kurangiGerakan()) {
    onTutup();
    return { tutup: Promise.resolve(), pulihkan: () => {} };
  }

  const gulir = wadah.closest('.overflow-x-auto');
  if (gulir) gulir.scrollLeft = 0;

  const tambahan = [];
  const animasi = [];
  const buat = (kelas) => {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    tambahKelas(el, 'pointer-events-none absolute', kelas);
    tambahan.push(el);
    return el;
  };
  // Rona merah saat glitch, penutup (warna permukaan) yang "menghapus", dan garis pemindai merah
  const rona = buat('inset-0 z-[9] bg-[rgba(166,45,45,.14)] dark:bg-[rgba(241,145,145,.16)]');
  const penutup = buat(`inset-0 z-10 origin-left ${T.surface}`);
  const garis = buat(
    'top-0 bottom-0 left-0 z-20 w-[2px] bg-[#E05252] shadow-[0_0_14px_3px_rgba(224,82,82,.85)] opacity-0',
  );
  const jejak = document.createElement('div');
  tambahKelas(
    jejak,
    'absolute top-0 bottom-0 right-full w-24 bg-gradient-to-l from-[rgba(224,82,82,.3)] to-transparent',
  );
  garis.appendChild(jejak);
  penutup.style.transform = 'scaleX(0)';
  isi.append(rona, penutup, garis);

  const bersihkan = () => {
    animasi.forEach((a) => a.cancel());
    tambahan.forEach((el) => el.remove());
  };

  const tutup = (async () => {
    // (1) Glitch merah
    animasi.push(
      rona.animate(
        [
          { opacity: 0 },
          { opacity: 1, offset: 0.25 },
          { opacity: 0.4, offset: 0.5 },
          { opacity: 1, offset: 0.75 },
          { opacity: 0.6 },
        ],
        { duration: GLITCH_MS, easing: 'steps(4, end)', fill: 'forwards' },
      ),
    );
    const getar = isi.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-3px)', offset: 0.2 },
        { transform: 'translateX(3px)', offset: 0.45 },
        { transform: 'translateX(-2px)', offset: 0.7 },
        { transform: 'translateX(0)' },
      ],
      { duration: GLITCH_MS, easing: 'steps(5, end)' },
    );
    animasi.push(getar);
    await getar.finished.catch(() => {});
    if (!isi.isConnected) return;

    // (2) Luruh kiri → kanan
    const r = isi.getBoundingClientRect();
    const rg = gulir?.getBoundingClientRect() || r;
    const lebar = r.width;
    const kiriTampak = Math.max(r.left, rg.left, 0);
    const kananTampak = Math.min(r.right, rg.right, window.innerWidth);
    const sapu = { duration: LEBUR_MS, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' };
    const animPenutup = penutup.animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      sapu,
    );
    animasi.push(
      animPenutup,
      garis.animate(
        [
          { transform: 'translateX(0)', opacity: 1 },
          { transform: `translateX(${lebar}px)`, opacity: 1, offset: 0.92 },
          { transform: `translateX(${lebar}px)`, opacity: 0 },
        ],
        sapu,
      ),
    );
    const jumlah = Math.round(Math.min(90, Math.max(40, (kananTampak - kiriTampak) / 10)));
    for (let i = 0; i < jumlah; i++) {
      const x = kiriTampak + Math.random() * Math.max(kananTampak - kiriTampak, 1);
      const y = r.top + 4 + Math.random() * Math.max(r.height - 8, 1);
      debuKeluar(x, y, ((x - r.left) / lebar) * LEBUR_MS, i);
    }
    await animPenutup.finished.catch(() => {});
    if (!wadah.isConnected) return;

    // (3) Celah menutup + benturan
    onTutup();
    await new Promise((resolve) => setTimeout(resolve, DURASI_ANIMASI));
    if (wadah.isConnected) benturan(wadah);
  })();

  return {
    tutup,
    pulihkan: bersihkan,
  };
}

// ─── Popup "Lihat": tumbuh dari tombol & kembali ke tombol ───────────────────

/** Tombol/tautan yang terakhir diklik (asal popup "Lihat"); dicatat lewat satu pendengar global. */
let tombolTerakhir = null;
let jejakMekar = null;
if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target?.closest?.('button, a, [role="button"]');
      if (el) tombolTerakhir = { el, waktu: performance.now() };
      // Tombol pembuka form (data-mekar) lenyap begitu form tampil: catat jejaknya sekarang
      if (el?.hasAttribute('data-mekar')) {
        const r = el.getBoundingClientRect();
        jejakMekar = {
          kotak: { left: r.left, top: r.top, width: r.width, height: r.height },
          warna: getComputedStyle(el).backgroundColor,
          waktu: performance.now(),
        };
      }
    },
    true,
  );
}

/** Tombol yang baru saja diklik (≤ `maksMs` lalu) dan masih ada di halaman, atau null. */
export function ambilTombolAsal(maksMs = 1500) {
  const t = tombolTerakhir;
  return t && t.el.isConnected && performance.now() - t.waktu < maksMs ? t.el : null;
}

/**
 * Isi `akar` muncul bertahap dari atas ke bawah (memudar + naik), mulai setelah `mulai` ms.
 * Blok yang dianimasikan = anak-anak dari wadah pertama yang punya lebih dari satu anak.
 */
export function munculBertahap(akar, { mulai = 0, jeda = 55, maks = 14 } = {}) {
  if (!akar?.animate || kurangiGerakan()) return;
  let wadah = akar;
  while (wadah.children.length === 1) wadah = wadah.children[0];
  [...wadah.children].slice(0, maks).forEach((el, i) => {
    el.animate(
      [
        { opacity: 0, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: 320,
        delay: mulai + i * jeda,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards',
      },
    );
  });
}

/**
 * transform non-seragam yang membuat kotak `ke` (popup) tepat menutupi kotak `dari` (tombol):
 * lebar & tinggi sama persis, bukan sekadar diperkecil.
 */
function morphKe(dari, ke) {
  const sx = Math.max(dari.width / ke.width, 0.005);
  const sy = Math.max(dari.height / ke.height, 0.005);
  const dx = dari.left + dari.width / 2 - (ke.left + ke.width / 2);
  const dy = dari.top + dari.height / 2 - (ke.top + ke.height / 2);
  return { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, sx, sy };
}

/** Warna "kulit" morph: warna latar tombol; bila tombol putih/transparan, biru muda agar terlihat. */
function warnaKulit(asal) {
  return warnaKulitDari(getComputedStyle(asal).backgroundColor);
}

/** Sama dengan warnaKulit, dari teks warna CSS (mis. warna tombol yang dicatat saat diklik). */
function warnaKulitDari(css) {
  const c = css || '';
  const m = c.match(/[\d.]+/g)?.map(Number) || [];
  const [r = 255, g = 255, b = 255, a = 1] = m;
  const terang = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return a < 0.1 || terang > 0.92 ? '#D6E4F5' : c;
}

/**
 * Lapisan polos seukuran popup yang berubah bentuk menjadi tombol (dan sebaliknya). Sudutnya
 * dikompensasi skala (`sx`, `sy`) sehingga pada akhir morph sudutnya sama dengan tombol.
 */
function buatKulit(kotak, asal, sx, sy) {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  const rad = parseFloat(getComputedStyle(asal).borderTopLeftRadius) || 8;
  Object.assign(el.style, {
    position: 'fixed',
    left: `${kotak.left}px`,
    top: `${kotak.top}px`,
    width: `${kotak.width}px`,
    height: `${kotak.height}px`,
    background: warnaKulit(asal),
    borderRadius: `${rad / sx}px / ${rad / sy}px`,
    zIndex: '1002',
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(el);
  return el;
}

/** Tombol asal "menelan"/"melepas" popup: memantul kecil. */
function pantulTombol(asal) {
  if (!asal?.isConnected) return;
  asal.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.16)', offset: 0.4 },
      { transform: 'scale(1)' },
    ],
    { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' },
  );
}

/**
 * Buka popup dari tombol `asal`: kulit seukuran & sewarna tombol mekar menjadi popup (berubah
 * bentuk), memudar memperlihatkan popup, lalu isinya muncul bertahap. Tanpa `asal`: melenting.
 */
export function animasiBukaDariTombol(dialog, asal) {
  if (!dialog?.animate || kurangiGerakan()) return;
  if (!asal) {
    dialog.animate(
      [
        { transform: 'translateY(12px) scale(.9)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 300, easing: 'cubic-bezier(.2,.9,.25,1.04)' },
    );
    munculBertahap(dialog, { mulai: 90 });
    return;
  }
  const r = dialog.getBoundingClientRect();
  const kotak = { left: r.left, top: r.top, width: r.width, height: r.height };
  const { transform, sx, sy } = morphKe(asal.getBoundingClientRect(), kotak);
  const kulit = buatKulit(kotak, asal, sx, sy);
  const waktu = { duration: 480, easing: 'cubic-bezier(.2,.85,.25,1.02)' };
  pantulTombol(asal);
  kulit
    .animate(
      [
        { transform, opacity: 1 },
        { opacity: 1, offset: 0.5 },
        { transform: 'none', opacity: 0 },
      ],
      waktu,
    )
    .finished.catch(() => {})
    .finally(() => kulit.remove());
  dialog.animate(
    [
      { transform, opacity: 0 },
      { opacity: 0, offset: 0.3 },
      { opacity: 1, offset: 0.6 },
      { transform: 'none', opacity: 1 },
    ],
    waktu,
  );
  munculBertahap(dialog, { mulai: 280 });
}

/**
 * Tutup popup ke tombol `asal`: isi salinan popup memudar, kartunya menyusut sedikit (ancang-
 * ancang) lalu berubah bentuk tepat menjadi ukuran & posisi tombol sementara kulit sewarna tombol
 * mengambil alih; saat mendarat kulit memudar dan tombol memantul "menelan" popup.
 * Tanpa `asal`: mengecil di tempat.
 * @param {{ dialog: HTMLElement, kotak: {left,top,width,height}, scrollTop: number,
 *           asal: HTMLElement|null, latar: HTMLElement|null }} opsi
 * @returns {() => void} batalkan (buang salinan seketika)
 */
export function animasiTutupKeTombol({ dialog, kotak, scrollTop, asal, latar }) {
  if (!dialog || kurangiGerakan() || !kotak.width) return () => {};
  const keTombol = !!asal?.isConnected;
  const sisa = [];
  const timer = [];
  if (latar) {
    const l = latar.cloneNode(false);
    l.setAttribute('aria-hidden', 'true');
    l.classList.add('pointer-events-none');
    document.body.appendChild(l);
    sisa.push(l);
    l.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: keTombol ? 360 : 240,
      easing: 'ease-out',
      fill: 'forwards',
    });
  }
  const k = dialog.cloneNode(true);
  k.setAttribute('aria-hidden', 'true');
  k.removeAttribute('role');
  k.inert = true;
  Object.assign(k.style, {
    position: 'fixed',
    left: `${kotak.left}px`,
    top: `${kotak.top}px`,
    width: `${kotak.width}px`,
    height: `${kotak.height}px`,
    margin: '0',
    zIndex: '1001',
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(k);
  k.scrollTop = scrollTop;
  sisa.push(k);
  const buang = () => {
    timer.forEach(clearTimeout);
    sisa.forEach((el) => el.remove());
  };

  if (!keTombol) {
    k.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(10px) scale(.9)', opacity: 0 },
      ],
      { duration: 220, easing: 'cubic-bezier(.5,0,.75,.3)', fill: 'forwards' },
    )
      .finished.catch(() => {})
      .finally(buang);
    return buang;
  }

  const LAMA = 560;
  const { transform, sx, sy } = morphKe(asal.getBoundingClientRect(), kotak);
  const kulit = buatKulit(kotak, asal, sx, sy);
  sisa.push(kulit);
  // Gerak bersama kartu & kulit: ancang-ancang menyusut sedikit, lalu menjadi tombol
  const gerak = [
    { transform: 'none', easing: 'ease-out' },
    { transform: 'scale(.97)', offset: 0.16, easing: 'cubic-bezier(.65,0,.25,1)' },
    { transform },
  ];
  const opsi = { duration: LAMA, fill: 'forwards' };
  // Isi memudar lebih dulu supaya yang mengecil terlihat sebagai "kulit" kosong
  [...k.children].forEach((c) =>
    c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, fill: 'forwards' }),
  );
  k.animate(
    gerak.map((f, i) => ({ ...f, opacity: i < 2 ? 1 : 0 })),
    opsi,
  );
  kulit
    .animate(
      [
        { ...gerak[0], opacity: 0 },
        { ...gerak[1], opacity: 0.35 },
        { offset: 0.55, opacity: 1 },
        { offset: 0.9, opacity: 1 },
        { transform, opacity: 0 },
      ],
      opsi,
    )
    .finished.catch(() => {})
    .finally(buang);
  // Tombol memantul tepat saat kulit mendarat
  timer.push(setTimeout(() => pantulTombol(asal), LAMA * 0.86));
  return buang;
}

/**
 * Semua elemen bertanda `data-bertahap` di dalam `akar` muncul satu per satu sesuai urutan di
 * halaman (atas → bawah). Jeda per elemen menyesuaikan jumlah agar total ≤ ±900 ms.
 */
export function munculBerurutan(akar, { maksTotal = 900 } = {}) {
  if (!akar?.animate || kurangiGerakan()) return;
  const el = [...akar.querySelectorAll('[data-bertahap]')];
  const jeda = Math.min(55, maksTotal / Math.max(el.length, 1));
  el.forEach((e, i) =>
    e.animate(
      [
        { opacity: 0, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 340, delay: i * jeda, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
    ),
  );
}

// ─── Tombol mekar menjadi halaman (mis. "Buat Sekarang" → form) ─────────────

/** Jejak tombol `data-mekar` yang baru diklik (sekali pakai), atau null. */
export function ambilJejakMekar(maksMs = 3000) {
  const j = jejakMekar;
  jejakMekar = null;
  return j && performance.now() - j.waktu < maksMs ? j : null;
}

/**
 * Halaman/kartu `tujuan` "mekar" dari tombol yang membukanya: kulit sewarna tombol tumbuh dari
 * posisi tombol ke bagian kartu yang terlihat di layar, memudar memperlihatkan kartu, lalu isi
 * kartu muncul bertahap dari atas ke bawah.
 */
export function animasiMekar(tujuan, jejak) {
  if (!tujuan?.animate || !jejak || kurangiGerakan()) return;
  const r = tujuan.getBoundingClientRect();
  const atas = Math.max(r.top, 0);
  const bawah = Math.min(r.bottom, window.innerHeight);
  if (bawah - atas < 40) return;
  const kotak = { left: r.left, top: atas, width: r.width, height: bawah - atas };
  const { transform } = morphKe(jejak.kotak, kotak);
  const warna = warnaKulitDari(jejak.warna);
  const kulit = document.createElement('div');
  kulit.setAttribute('aria-hidden', 'true');
  Object.assign(kulit.style, {
    position: 'fixed',
    left: `${kotak.left}px`,
    top: `${kotak.top}px`,
    width: `${kotak.width}px`,
    height: `${kotak.height}px`,
    background: warna,
    borderRadius: '20px',
    zIndex: '900',
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(kulit);
  const waktu = { duration: 560, easing: 'cubic-bezier(.2,.85,.25,1)' };
  kulit
    .animate(
      [
        { transform, opacity: 1 },
        { opacity: 1, offset: 0.55 },
        { transform: 'none', opacity: 0 },
      ],
      waktu,
    )
    .finished.catch(() => {})
    .finally(() => kulit.remove());
  tujuan.animate(
    [{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1, offset: 0.75 }, { opacity: 1 }],
    waktu,
  );
  munculBertahap(tujuan, { mulai: 330, jeda: 60 });
}

// ─── Baris & daftar (form) ───────────────────────────────────────────────────

const duaFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * Hapus baris dengan halus: `el` meluncur keluar & memudar, lalu `ubah()` (boleh async) mengubah
 * data; bila `geser`, baris-baris setelahnya naik dari posisi lamanya (tidak melompat). Cocok
 * untuk daftar vertikal; untuk chip/kisi pakai `geser: false`.
 */
export async function hapusBaris(el, ubah, { geser = true } = {}) {
  if (!el?.animate || kurangiGerakan()) {
    await ubah();
    return;
  }
  const wadah = el.parentElement;
  const idx = [...wadah.children].indexOf(el);
  const gaya = getComputedStyle(el);
  const tinggi =
    el.getBoundingClientRect().height +
    (parseFloat(gaya.marginTop) || 0) +
    (parseFloat(gaya.marginBottom) || 0) +
    (parseFloat(getComputedStyle(wadah).rowGap) || 0);
  const keluar = el.animate(
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: geser ? 'translateX(18px) scale(.97)' : 'scale(.6)' },
    ],
    { duration: 180, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' },
  );
  await keluar.finished.catch(() => {});
  try {
    await ubah();
  } finally {
    await duaFrame();
    keluar.cancel();
    if (geser && wadah.isConnected) {
      [...wadah.children].slice(Math.max(idx, 0)).forEach((n, k) =>
        n.animate([{ transform: `translateY(${tinggi}px)` }, { transform: 'none' }], {
          duration: 260,
          delay: k * 15,
          easing: 'cubic-bezier(.2,.8,.2,1)',
        }),
      );
    }
  }
}

// ─── Penunjuk sekali: sapuan kilau ───────────────────────────────────────────

/**
 * Sapuan kilau sekali di atas `el` — pita cahaya warna aplikasi seperti `KilauFase` — untuk
 * menunjuk satu elemen, mis. isian wajib yang belum diisi setelah layar digulir ke sana. Lapisan
 * `fixed` di `body` mengikuti kotak & sudut `el`, jadi bisa dipakai pada input. Tidak menghalangi klik.
 */
export function kilauSekali(el) {
  if (!el?.isConnected || !document.body.animate || kurangiGerakan()) return;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const bingkai = document.createElement('div');
  bingkai.setAttribute('aria-hidden', 'true');
  tambahKelas(bingkai, 'pointer-events-none fixed z-[1090] overflow-hidden');
  Object.assign(bingkai.style, {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    borderRadius: getComputedStyle(el).borderRadius,
  });
  const pita = document.createElement('span');
  tambahKelas(
    pita,
    'absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(42,120,214,.22),rgba(125,182,243,.32),rgba(201,151,59,.28),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(42,120,214,.26),rgba(125,182,243,.26),rgba(217,169,74,.26),transparent)]',
  );
  bingkai.appendChild(pita);
  document.body.appendChild(bingkai);
  pita
    .animate(
      [
        { transform: 'translateX(0) skewX(-20deg)' },
        { transform: 'translateX(400%) skewX(-20deg)' },
      ],
      { duration: 1100, easing: 'ease-out' },
    )
    .finished.catch(() => {})
    .finally(() => bingkai.remove());
}
