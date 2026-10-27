/**
 * Animasi kejutan ulang tahun (Web Animations API), mengikuti aturan animasi CLAUDE.md §5:
 * hanya `transform`/`opacity`, dilewati bila "kurangi gerakan" aktif. Seperti `@/utils/animasi`,
 * hanya berkas ini (di modul SSO) yang mengatur `element.style` (posisi konfeti di `body`).
 */
import { kurangiGerakan } from '@/utils/animasi';

const tambahKelas = (el, ...kelas) => kelas.forEach((k) => el.classList.add(...k.split(' ')));
const selesai = (anim) => anim.finished.catch(() => {});

/** Garis pemindai menyapu bingkai foto turun-naik `kali` kali. */
export function sapuPindai(garis, jarak, kali = 2) {
  if (!garis?.animate || kurangiGerakan()) return Promise.resolve();
  return selesai(
    garis.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${jarak}px)` }], {
      duration: 550,
      iterations: kali * 2,
      direction: 'alternate',
      easing: 'ease-in-out',
    }),
  );
}

/** Kilat putih sesaat saat foto diambil (`el` = lapisan putih di atas bingkai kamera). */
export function kilatKamera(el) {
  if (!el?.animate || kurangiGerakan()) return;
  el.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 320, easing: 'ease-out' });
}

/** Kartu bergetar menyamping (jawaban salah). */
export function goyang(el) {
  if (!el?.animate || kurangiGerakan()) return;
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)', offset: 0.2 },
      { transform: 'translateX(7px)', offset: 0.4 },
      { transform: 'translateX(-5px)', offset: 0.6 },
      { transform: 'translateX(3px)', offset: 0.8 },
      { transform: 'translateX(0)' },
    ],
    { duration: 380, easing: 'ease-out' },
  );
}

/**
 * Kotak "Saya bukan robot" kabur ke posisi acak di mana saja di layar (boleh keluar dari
 * wadahnya), menjauh dari posisinya sekarang, tetapi selalu di dalam layar yang terlihat agar
 * tidak hilang atau memunculkan bilah gulir. Pergeseran disimpan di data-x/data-y agar lompatan
 * berikutnya berangkat dari posisi terakhir. Tetap berpindah saat "kurangi gerakan" aktif, hanya
 * tanpa gerakan (langsung di tempat baru).
 */
export function kaburkan(el) {
  if (!el?.animate) return;
  const x0 = Number(el.dataset.x) || 0;
  const y0 = Number(el.dataset.y) || 0;
  const r = el.getBoundingClientRect();
  const kiri = r.left - x0; // posisi asal tanpa pergeseran
  const atas = r.top - y0;
  const tepi = 16;
  const minX = tepi - kiri;
  const maksX = window.innerWidth - tepi - r.width - kiri;
  const minY = tepi - atas;
  const maksY = window.innerHeight - tepi - r.height - atas;
  const jauh = Math.min(window.innerWidth, window.innerHeight) / 3;
  let x = x0;
  let y = y0;
  for (let i = 0; i < 12 && Math.hypot(x - x0, y - y0) < jauh; i++) {
    x = minX + Math.random() * Math.max(maksX - minX, 0);
    y = minY + Math.random() * Math.max(maksY - minY, 0);
  }
  el.dataset.x = String(x);
  el.dataset.y = String(y);
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(
    [{ transform: `translate(${x0}px,${y0}px)` }, { transform: `translate(${x}px,${y}px)` }],
    {
      duration: kurangiGerakan() ? 0 : 280,
      // tanpa lentingan: lentingan bisa sesaat melewati tepi layar
      easing: 'cubic-bezier(.2,.8,.2,1)',
      fill: 'forwards',
    },
  );
}

/** Cap "DIIZINKAN MASUK" dihentakkan ke kartu visa, lalu kartunya sedikit terbentur. */
export async function hentakCap(cap, kartu) {
  if (!cap?.animate || kurangiGerakan()) return;
  await selesai(
    cap.animate(
      [
        { transform: 'scale(2.8)', opacity: 0 },
        { transform: 'scale(.94)', opacity: 1, offset: 0.75 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'backwards' },
    ),
  );
  kartu?.animate(
    [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(3px) scale(.99)', offset: 0.3 },
      { transform: 'translateY(0) scale(1)' },
    ],
    { duration: 260, easing: 'ease-out' },
  );
}

const KONFETI = [
  'bg-[#2A78D6]',
  'bg-[#7DB6F3]',
  'bg-[#C9973B]',
  'bg-[#E8C37A]',
  'bg-white',
  'bg-[#1e4080]',
];

/** Konfeti meledak dari tengah `asal`, naik lalu jatuh dan memudar. */
export function konfeti(asal, jumlah = 70) {
  if (!asal?.isConnected || !document.body.animate || kurangiGerakan()) return;
  const r = asal.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  for (let i = 0; i < jumlah; i++) {
    const p = document.createElement('span');
    p.setAttribute('aria-hidden', 'true');
    tambahKelas(
      p,
      'pointer-events-none',
      KONFETI[i % KONFETI.length],
      i % 3 ? 'w-2 h-3 rounded-[1px]' : 'w-2 h-2 rounded-full',
    );
    Object.assign(p.style, { position: 'fixed', left: `${cx}px`, top: `${cy}px`, zIndex: '1200' });
    document.body.appendChild(p);
    const vx = (Math.random() - 0.5) * 560;
    const naik = 160 + Math.random() * 260;
    const turun = 360 + Math.random() * 260;
    const putar = (Math.random() - 0.5) * 900;
    p.animate(
      [
        { transform: 'translate(-50%,-50%) rotate(0deg) scale(.6)', opacity: 1 },
        {
          transform: `translate(-50%,-50%) translate(${vx * 0.55}px,${-naik}px) rotate(${putar * 0.4}deg) scale(1)`,
          opacity: 1,
          offset: 0.35,
        },
        {
          transform: `translate(-50%,-50%) translate(${vx}px,${turun - naik}px) rotate(${putar}deg) scale(1)`,
          opacity: 0,
        },
      ],
      {
        duration: 1300 + Math.random() * 600,
        delay: Math.random() * 120,
        easing: 'cubic-bezier(.2,.7,.4,1)',
        fill: 'backwards',
      },
    )
      .finished.catch(() => {})
      .finally(() => p.remove());
  }
}
