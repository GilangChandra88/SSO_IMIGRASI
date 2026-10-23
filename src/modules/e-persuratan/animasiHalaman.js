/**
 * Animasi perpindahan halaman e-Persuratan (lihat aturan animasi di CLAUDE.md §5).
 * Web Animations API, hanya `transform`/`opacity`; dilewati bila "kurangi gerakan" aktif.
 */
import { kurangiGerakan } from '@/utils/animasi';
import { FONT, NAVY, T } from '@/utils/uiTokens';

const DURASI = 300;
const terakhir = new WeakMap(); // wadah → animasi halaman yang sedang berjalan

const bagian = (path) => path.split('/').filter(Boolean);

/**
 * Arah perpindahan: `dalam` (mis. Daftar → Detail), `luar` (kembali), atau `pindah` (menu lain).
 */
export function arahHalaman(dari, ke) {
  const a = bagian(dari);
  const b = bagian(ke);
  const sama = (x, y) => x.every((s, i) => s === y[i]);
  if (b.length > a.length && sama(a, b)) return 'dalam';
  if (b.length < a.length && sama(b, a)) return 'luar';
  return 'pindah';
}

const AWAL = {
  dalam: 'translateX(22px)',
  luar: 'translateX(-22px)',
  pindah: 'translateY(12px) scale(.995)',
};

/**
 * Jalankan animasi masuk halaman pada `isi`. Selama animasi `wadah` diberi `overflow-clip`
 * sementara agar geseran tidak memunculkan bilah gulir.
 * @returns {Animation|null} untuk dibatalkan bila halaman berganti lagi
 */
export function animasiHalaman(wadah, isi, arah) {
  // Saat berkas sedang dibuka (bukaBerkas), lembarnya yang membawa pengguna ke halaman baru
  if (!wadah || !isi?.animate || kurangiGerakan() || berkasDibuka) return null;
  wadah.classList.add('overflow-clip');
  const anim = isi.animate(
    [
      { opacity: 0, transform: AWAL[arah] || AWAL.pindah },
      { opacity: 1, transform: 'none' },
    ],
    { duration: DURASI, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
  terakhir.set(wadah, anim);
  // Lepas overflow-clip hanya bila ini animasi terakhir (animasi lama yang dibatalkan saat pindah
  // halaman lagi tidak boleh melepasnya dari animasi yang sedang berjalan)
  anim.finished
    .catch(() => {})
    .finally(() => {
      if (terakhir.get(wadah) === anim) wadah.classList.remove('overflow-clip');
    });
  return anim;
}

// ─── Buka berkas (berkas baru dibuat → Detail LPJ) ───────────────────────────
// Map berkas terbang dari baris barunya ke tengah layar, sampulnya terbuka dan lembar dokumen
// naik keluar; begitu Detail siap, lembar itu berubah bentuk menjadi kartu judul Detail.

let berkasDibuka = false; // lapisan buka berkas masih tampil
let tertunda = null; // { packId, lapis, latar, map, kertas, timer } menunggu Detail siap

const MAP_MS = 460;
const SIAP_MS = 1000; // map terbang + sampul terbuka + lembar naik
const MORPH_MS = 560;
const PERCIK = [
  'bg-[#C9973B] shadow-[0_0_6px_rgba(201,151,59,.85)]',
  'bg-[#7DB6F3] shadow-[0_0_8px_rgba(125,182,243,.95)]',
  'bg-[#2A78D6] shadow-[0_0_6px_rgba(42,120,214,.9)]',
];

const buat = (kelas, teks = '') => {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.className = kelas;
  el.textContent = teks;
  return el;
};

function tutupLapis(t) {
  clearTimeout(t.timer);
  t.lapis
    .animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 260,
      easing: 'ease-out',
      fill: 'forwards',
    })
    .finished.catch(() => {})
    .finally(() => {
      t.lapis.remove();
      berkasDibuka = false;
    });
}

/**
 * Tahap 1 (di Daftar LPJ): map berkas terbang dari `asal` (baris berkas baru) ke tengah layar,
 * sampulnya terbuka ke depan, lembar dokumen naik keluar dengan percikan warna aplikasi.
 * Pindah ke Detail setelah promise selesai; Detail melanjutkan lewat `lanjutBukaBerkas()`.
 * Lapisan dipasang di `body` (tetap tampil saat halaman berpindah) dan tidak menghalangi klik.
 * @param {{ asal?: HTMLElement, packId: string, judul?: string, jenis?: string }} opsi
 * @returns {Promise<void>} map sudah terbuka
 */
export function bukaBerkas({ asal, packId, judul = '', jenis = '' }) {
  if (typeof document === 'undefined' || !document.body.animate || kurangiGerakan()) {
    return Promise.resolve();
  }
  if (tertunda) {
    clearTimeout(tertunda.timer);
    tertunda.lapis.remove();
  }
  const lebar = Math.min(300, window.innerWidth - 48);
  const tinggi = Math.round(lebar * 0.7);
  const kiri = (window.innerWidth - lebar) / 2;
  const atas = (window.innerHeight - tinggi) / 2 + tinggi * 0.15; // lembar naik ke atas nanti

  const lapis = buat('pointer-events-none fixed inset-0 z-[1090]');
  const latar = buat('absolute inset-0 bg-[rgba(10,18,32,.3)] backdrop-blur-[2px]');
  const map = buat('absolute');
  Object.assign(map.style, {
    left: `${kiri}px`,
    top: `${atas}px`,
    width: `${lebar}px`,
    height: `${tinggi}px`,
  });
  const tab = buat(
    'absolute left-0 -top-[13px] w-[42%] h-[24px] rounded-t-[10px] bg-[#0b1830] dark:bg-[#1A3A63]',
  );
  const belakang = buat(
    'absolute inset-0 rounded-[4px_14px_14px_14px] bg-[#0b1830] dark:bg-[#1A3A63] shadow-[0_24px_60px_-18px_rgba(10,18,32,.6)]',
  );
  const kertas = buat(
    `absolute left-[7%] right-[7%] top-[7%] bottom-[12%] rounded-[8px] overflow-hidden px-3.5 py-3 ${T.surface} shadow-[0_6px_18px_-6px_rgba(10,18,32,.35)]`,
  );
  kertas.append(
    buat(`${FONT.mono} text-[10px] font-bold uppercase tracking-[.1em] text-[#C9973B]`, jenis),
    buat(`${FONT.head} mt-1 text-[13px] font-bold leading-snug line-clamp-2 ${T.ink}`, judul),
    buat('mt-2.5 h-[5px] w-[90%] rounded-full bg-[#E0E5EC] dark:bg-[#233450]'),
    buat('mt-1.5 h-[5px] w-[74%] rounded-full bg-[#E0E5EC] dark:bg-[#233450]'),
    buat('mt-1.5 h-[5px] w-[58%] rounded-full bg-[#E0E5EC] dark:bg-[#233450]'),
  );
  const sampul = buat(
    `absolute inset-x-0 bottom-0 top-[24%] origin-bottom rounded-[12px] px-4 py-3.5 flex flex-col justify-end border-t border-white/15 ${NAVY.gradient}`,
  );
  sampul.append(
    buat('w-8 h-[3px] mb-2 rounded-full bg-[#C9973B]'),
    buat('text-[10.5px] font-bold uppercase tracking-[.12em] text-white/60', 'Berkas LPJ'),
    buat(`${FONT.head} text-[15px] font-bold text-white truncate`, 'Membuka berkas…'),
  );
  map.append(tab, belakang, kertas, sampul);
  lapis.append(latar, map);
  document.body.appendChild(lapis);
  berkasDibuka = true;
  const t = { packId, lapis, latar, map, kertas, timer: null };
  tertunda = t;

  // (1) Terbang dari baris berkas baru ke tengah layar
  const r = asal?.getBoundingClientRect();
  const dari = r?.width
    ? `translate(${r.left + r.width / 2 - (kiri + lebar / 2)}px, ${r.top + r.height / 2 - (atas + tinggi / 2)}px) scale(.3)`
    : 'translateY(24px) scale(.6)';
  latar.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
  map.animate(
    [
      { transform: dari, opacity: 0 },
      { opacity: 1, offset: 0.35 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: MAP_MS, easing: 'cubic-bezier(.3,1.25,.5,1)' },
  );

  // (2) Sampul terbuka ke depan (engsel di bawah), lembar naik keluar
  sampul.animate(
    [
      { transform: 'perspective(900px) rotateX(0deg)' },
      { transform: 'perspective(900px) rotateX(-66deg)', offset: 0.7 },
      { transform: 'perspective(900px) rotateX(-60deg)' },
    ],
    { duration: 500, delay: MAP_MS - 60, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'both' },
  );
  kertas.animate(
    [{ transform: 'none' }, { transform: `translateY(${-tinggi * 0.42}px) scale(1.04)` }],
    { duration: 520, delay: MAP_MS + 20, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'both' },
  );
  for (let i = 0; i < 16; i++) {
    const p = buat(`absolute w-[4px] h-[4px] rounded-[1px] ${PERCIK[i % PERCIK.length]}`);
    Object.assign(p.style, {
      left: `${kiri + lebar * (0.1 + Math.random() * 0.8)}px`,
      top: `${atas}px`,
    });
    lapis.appendChild(p);
    p.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        {
          transform: `translate(${(Math.random() - 0.5) * 70}px, ${-40 - Math.random() * 80}px) scale(.4)`,
          opacity: 0,
        },
      ],
      {
        duration: 560 + Math.random() * 200,
        delay: MAP_MS + 120 + i * 12,
        easing: 'cubic-bezier(.1,.7,.3,1)',
        fill: 'both',
      },
    );
  }

  return new Promise((resolve) =>
    setTimeout(() => {
      // Cadangan: Detail tidak kunjung memanggil lanjutBukaBerkas (gagal dimuat, dsb.)
      if (tertunda === t) {
        t.timer = setTimeout(() => {
          if (tertunda === t) tertunda = null;
          tutupLapis(t);
        }, 2500);
      }
      resolve();
    }, SIAP_MS),
  );
}

/**
 * Tahap 2 (di Detail, saat berkas pertama tampil): lembar yang keluar dari map berubah bentuk
 * menjadi kartu judul Detail (elemen `data-bertahap` pertama di `akar`) sambil map turun memudar,
 * lalu sisa isi halaman muncul bertahap.
 * @returns {boolean} true bila animasi buka berkas yang dilanjutkan (tanpa munculBerurutan biasa)
 */
export function lanjutBukaBerkas(packId, akar) {
  const t = tertunda;
  if (!t || t.packId !== packId) return false;
  tertunda = null;
  clearTimeout(t.timer);
  const semua = [...(akar?.querySelectorAll('[data-bertahap]') || [])];
  const kartu = semua[0];
  const r = kartu?.getBoundingClientRect();
  if (!r || r.bottom < 40 || r.top > window.innerHeight - 40) {
    tutupLapis(t);
    return false;
  }

  // Lembar dilepas dari map pada posisinya sekarang, lalu berubah bentuk menjadi kartu judul
  const k = t.kertas.getBoundingClientRect();
  const lembar = t.kertas.cloneNode(true);
  Object.assign(lembar.style, {
    left: `${k.left}px`,
    top: `${k.top}px`,
    width: `${k.width}px`,
    height: `${k.height}px`,
  });
  const navy = buat(`absolute inset-0 ${NAVY.gradient}`);
  lembar.appendChild(navy);
  t.kertas.remove();
  t.lapis.appendChild(lembar);

  const sx = r.width / k.width;
  const sy = r.height / k.height;
  const dx = r.left + r.width / 2 - (k.left + k.width / 2);
  const dy = r.top + r.height / 2 - (k.top + k.height / 2);
  // Isi lembar memudar dulu agar tidak tampak tertarik saat berubah ukuran
  [...lembar.children].forEach((c) => {
    if (c !== navy)
      c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
  });
  navy.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, fill: 'both' });
  t.map.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: 'translateY(60px) scale(.85)', opacity: 0 },
    ],
    { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' },
  );
  t.latar.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: MORPH_MS - 80,
    easing: 'ease-out',
    fill: 'forwards',
  });
  lembar
    .animate(
      [
        { transform: 'none', opacity: 1 },
        { opacity: 1, offset: 0.82 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0 },
      ],
      { duration: MORPH_MS, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'forwards' },
    )
    .finished.catch(() => {})
    .finally(() => {
      t.lapis.remove();
      berkasDibuka = false;
    });

  // Kartu asli muncul saat lembar mendarat; sisa isi halaman menyusul dari atas ke bawah
  kartu.animate([{ opacity: 0 }, { opacity: 0, offset: 0.78 }, { opacity: 1 }], {
    duration: MORPH_MS,
  });
  const sisa = semua.slice(1);
  const jeda = Math.min(55, 900 / Math.max(sisa.length, 1));
  sisa.forEach((e, i) =>
    e.animate(
      [
        { opacity: 0, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: 340,
        delay: MORPH_MS - 160 + i * jeda,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards',
      },
    ),
  );
  return true;
}
