import { flushSync } from 'react-dom';
import { kurangiGerakan } from '@/utils/animasi';

/**
 * Pembantu animasi halaman Scanner (Web Animations API), seperti `animasiHalaman.js`:
 * hanya menggerakkan transform/opacity, dilewati bila "kurangi gerakan" aktif. Hanya di berkas
 * ini JavaScript mengatur `element.style` (posisi salinan halaman yang diterbangkan).
 * Warna mengikuti aplikasi: navy #0f2040, biru #2A78D6, emas #C9973B.
 */

const PEGAS = 'cubic-bezier(.34,1.56,.64,1)';

/**
 * Maskot scanner bergerak selama memindai (indikator memuat, boleh berulang): badan bergoyang,
 * cahaya pemindai bolak-balik, kertas keluar dari celah, mata berkedip. Mengembalikan fungsi henti.
 */
export function mulaiMaskotPindai(akar) {
  if (!akar?.animate || kurangiGerakan()) return () => {};
  const q = (s) => akar.querySelector(s);
  const jalan = [];
  const badan = q('[data-badan]');
  const cahaya = q('[data-cahaya]');
  const kertas = q('[data-kertas]');
  if (badan) {
    jalan.push(
      badan.animate(
        [
          { transform: 'translateY(0) rotate(-1.5deg)' },
          { transform: 'translateY(-3px) rotate(1.5deg)' },
        ],
        {
          duration: 700,
          direction: 'alternate',
          iterations: Infinity,
          easing: 'ease-in-out',
        },
      ),
    );
  }
  if (cahaya) {
    jalan.push(
      cahaya.animate([{ transform: 'translateX(-10%)' }, { transform: 'translateX(210%)' }], {
        duration: 900,
        direction: 'alternate',
        iterations: Infinity,
        easing: 'ease-in-out',
      }),
    );
  }
  if (kertas) {
    jalan.push(
      kertas.animate(
        [
          { transform: 'translateY(-100%)', opacity: 0 },
          { transform: 'translateY(-70%)', opacity: 1, offset: 0.15 },
          { transform: 'translateY(0)', opacity: 1, offset: 0.8 },
          { transform: 'translateY(12%)', opacity: 0 },
        ],
        { duration: 1500, iterations: Infinity, easing: 'ease-in-out' },
      ),
    );
  }
  akar
    .querySelectorAll('[data-mata]')
    .forEach((m) =>
      jalan.push(
        m.animate(
          [
            { transform: 'scaleY(1)' },
            { transform: 'scaleY(1)', offset: 0.9 },
            { transform: 'scaleY(.1)', offset: 0.95 },
            { transform: 'scaleY(1)' },
          ],
          { duration: 2600, iterations: Infinity },
        ),
      ),
    );
  return () => jalan.forEach((a) => a.cancel());
}

/**
 * Figur panggung (maskot scanner / dokumen PDF / bingkai gambar) "tersentak senang" saat satu
 * halaman keluar darinya. Elemen yang memantul bertanda `data-pantul`.
 */
export function figurDapatHalaman(akar) {
  const el = akar?.querySelector('[data-pantul]');
  if (!el?.animate || kurangiGerakan()) return;
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.12, .9)' }, { transform: 'scale(1)' }],
    {
      duration: 320,
      easing: PEGAS,
    },
  );
}

/**
 * Dokumen PDF sedang dipecah (indikator memuat, boleh berulang): dokumen mengambang dan
 * lembar-lembar (`data-lembar`) bergantian mengelupas keluar ke kanan atas.
 */
export function mulaiAnimasiPdf(akar) {
  if (!akar?.animate || kurangiGerakan()) return () => {};
  const jalan = [];
  const dokumen = akar.querySelector('[data-dokumen]');
  if (dokumen) {
    jalan.push(
      dokumen.animate(
        [
          { transform: 'translateY(0) rotate(-2deg)' },
          { transform: 'translateY(-3px) rotate(2deg)' },
        ],
        { duration: 800, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' },
      ),
    );
  }
  akar.querySelectorAll('[data-lembar]').forEach((l, i) =>
    jalan.push(
      l.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 0 },
          { transform: 'translate(2px,-4px) rotate(2deg)', opacity: 1, offset: 0.2 },
          { transform: 'translate(34px,-30px) rotate(18deg)', opacity: 0 },
        ],
        { duration: 1500, delay: i * 500, iterations: Infinity, easing: 'cubic-bezier(.4,0,.3,1)' },
      ),
    ),
  );
  return () => jalan.forEach((a) => a.cancel());
}

/**
 * Gambar sedang diimpor (indikator memuat, boleh berulang): bingkai foto bergoyang, matahari
 * berdenyut, dan kilau menyapu permukaan foto.
 */
export function mulaiAnimasiGambar(akar) {
  if (!akar?.animate || kurangiGerakan()) return () => {};
  const jalan = [];
  const q = (s) => akar.querySelector(s);
  const bingkai = q('[data-bingkai]');
  const matahari = q('[data-matahari]');
  const kilau = q('[data-kilau]');
  if (bingkai) {
    jalan.push(
      bingkai.animate(
        [
          { transform: 'rotate(-4deg) translateY(0)' },
          { transform: 'rotate(3deg) translateY(-3px)' },
        ],
        { duration: 900, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' },
      ),
    );
  }
  if (matahari) {
    jalan.push(
      matahari.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }], {
        duration: 700,
        direction: 'alternate',
        iterations: Infinity,
        easing: 'ease-in-out',
      }),
    );
  }
  if (kilau) {
    jalan.push(
      kilau.animate(
        [
          { transform: 'translateX(-60px) skewX(-20deg)' },
          { transform: 'translateX(120px) skewX(-20deg)' },
        ],
        { duration: 1600, iterations: Infinity, easing: 'ease-in-out' },
      ),
    );
  }
  return () => jalan.forEach((a) => a.cancel());
}

/**
 * Salinan kecil halaman terbang melengkung dari `asal` (panel kiri) ke `tujuan` (halaman di
 * kanvas), berputar sedikit, lalu memudar saat mendarat. Elemen dipasang `fixed` di body.
 */
export function terbangkanHalaman({ url, asal, tujuan }) {
  if (kurangiGerakan() || !asal || !tujuan) return;
  const a = asal.getBoundingClientRect();
  const t = tujuan.getBoundingClientRect();
  if (!a.width || !t.width) return;

  const w = 46;
  const h = 62;
  const x0 = a.left + a.width / 2 - w / 2;
  const y0 = a.top + a.height / 2 - h / 2;
  // Tujuan bisa masih di luar layar (kanvas sedang menggulir): jaga titik mendarat tetap terlihat
  const tx = t.left + Math.min(t.width, 240) / 2 - w / 2;
  const ty = Math.min(Math.max(t.top + 40, 70), window.innerHeight - h - 40);
  const dx = tx - x0;
  const dy = ty - y0;

  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  Object.assign(img.style, {
    position: 'fixed',
    left: `${x0}px`,
    top: `${y0}px`,
    width: `${w}px`,
    height: `${h}px`,
    objectFit: 'contain',
    background: '#fff',
    borderRadius: '4px',
    boxShadow: '0 8px 22px rgba(15,32,64,.35), 0 0 0 2px #C9973B',
    zIndex: '950',
    pointerEvents: 'none',
  });
  document.body.appendChild(img);
  img
    .animate(
      [
        { transform: 'translate(0,0) rotate(0deg) scale(.5)', opacity: 0 },
        {
          transform: `translate(${dx * 0.15}px, ${dy * 0.15 - 30}px) rotate(-14deg) scale(1.1)`,
          opacity: 1,
          offset: 0.2,
        },
        {
          transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 90}px) rotate(8deg) scale(1.2)`,
          opacity: 1,
          offset: 0.6,
        },
        { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(1.6)`, opacity: 0 },
      ],
      { duration: 780, easing: 'cubic-bezier(.3,.6,.35,1)' },
    )
    .finished.catch(() => {})
    .finally(() => img.remove());
}

/**
 * Tunggu sampai `el` terlihat di kanvas (penggulir bertanda `data-kanvas`) DAN guliran sudah
 * berhenti, supaya animasi masuk berjalan setelah kanvas selesai bergeser ke halaman itu.
 * Resolve `true` bila terlihat, `false` bila batas waktu habis (mis. halaman di luar layar).
 */
export function tungguTerlihat(el, { batas = 2600, signal } = {}) {
  if (!el || kurangiGerakan()) return Promise.resolve(true);
  const akar = el.closest('[data-kanvas]');
  return new Promise((resolve) => {
    let terlihat = false;
    let selesai = false;
    let timerDiam = null;
    let timerBatas = null;
    let obs = null;
    const akhiri = (hasil) => {
      if (selesai) return;
      selesai = true;
      obs?.disconnect();
      akar?.removeEventListener('scroll', cek);
      clearTimeout(timerDiam);
      clearTimeout(timerBatas);
      resolve(hasil);
    };
    // Dianggap "diam" bila 140 ms tanpa peristiwa gulir
    function cek() {
      clearTimeout(timerDiam);
      timerDiam = setTimeout(() => terlihat && akhiri(true), 140);
    }
    obs = new IntersectionObserver(
      ([e]) => {
        terlihat = e.intersectionRatio >= 0.35 || e.intersectionRect.height >= 220;
        if (terlihat) cek();
      },
      { root: akar, threshold: [0, 0.2, 0.35, 0.5, 0.75, 1] },
    );
    obs.observe(el);
    akar?.addEventListener('scroll', cek, { passive: true });
    timerBatas = setTimeout(() => akhiri(false), batas);
    signal?.addEventListener('abort', () => akhiri(false));
  });
}

/** Selisih rotasi terpendek (derajat): 270→0 = +90, 0→270 = -90, 0→180 = 180. */
export function selisihRotasi(lama, baru) {
  const d = ((((baru - lama) % 360) + 540) % 360) - 180;
  return d === -180 ? 180 : d;
}

const KURVA_PUTAR = 'cubic-bezier(.2,.8,.2,1)';

/**
 * Catat posisi layar (top) setiap anak kanvas sebelum tata letak berubah, untuk FLIP di
 * `putarHalus`. `el` = elemen mana pun di dalam kanvas (`data-kanvas`).
 */
export function catatPosisi(el) {
  const akar = el?.closest('[data-kanvas]');
  const peta = new Map();
  if (akar) for (const anak of akar.children) peta.set(anak, anak.getBoundingClientRect().top);
  return peta;
}

const DURASI_PUTAR = 460;

/**
 * Halaman di kanvas berputar halus dari orientasi lama ke baru (teknik FLIP):
 *  - gambar baru (sudah diputar) dimulai dari posisi & ukuran tampilan lama (`kotakLama`), lalu
 *    berputar ke tempatnya — pusatnya dihitung dari posisi layar sebenarnya;
 *  - SEMUA halaman lain di kanvas (di atas maupun di bawah) yang bergeser karena tinggi berubah
 *    — termasuk saat posisi gulir terpotong di dekat dasar kanvas — meluncur dari posisi lama
 *    (`posisiLama` dari `catatPosisi`) ke posisi barunya, jadi tidak ada yang "melompat".
 * Geseran memakai `composite: 'add'` agar rotasi beberapa halaman sekaligus tidak saling menimpa.
 */
export function putarHalus({ el, kotakLama, delta, posisiLama }) {
  if (!el?.animate || !kotakLama || !delta || kurangiGerakan()) return;
  const baru = el.getBoundingClientRect();
  if (!baru.width || !baru.height) return;
  const opsi = { duration: DURASI_PUTAR, easing: KURVA_PUTAR };

  const tegakLurus = Math.abs(delta) === 90;
  const skala = kotakLama.width / (tegakLurus ? baru.height : baru.width);
  const geserX = kotakLama.left + kotakLama.width / 2 - (baru.left + baru.width / 2);
  const geserY = kotakLama.top + kotakLama.height / 2 - (baru.top + baru.height / 2);
  el.animate(
    [
      {
        transform: `translate(${geserX}px, ${geserY}px) rotate(${-delta}deg) scale(${skala})`,
      },
      { transform: 'none' },
    ],
    opsi,
  );

  if (!posisiLama) return;
  const bungkus = el.closest('[data-halaman]');
  posisiLama.forEach((topLama, anak) => {
    if (!anak.isConnected) return;
    const dy = topLama - anak.getBoundingClientRect().top;
    if (Math.abs(dy) < 0.5) return;
    // Halaman yang diputar: hanya bilah judulnya yang digeser (badannya sudah ikut di atas)
    const sasaran = anak === bungkus ? anak.firstElementChild : anak;
    sasaran?.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
      ...opsi,
      composite: 'add',
    });
  });
}

/** Gambar mini (panel Urutan) berputar halus `delta` derajat ke orientasi barunya. */
export function putarMini(el, delta) {
  if (!el?.animate || !delta || kurangiGerakan()) return;
  el.animate([{ transform: `rotate(${-delta}deg)` }, { transform: 'none' }], {
    duration: 380,
    easing: KURVA_PUTAR,
  });
}

/**
 * Halaman baru di kanvas "tercetak": tirai (warna kanvas) menyusut dari atas ke bawah mengikuti
 * garis pemindai emas, dan kartu sedikit memantul seperti kertas mendarat. `jeda` (ms) memberi
 * waktu salinan halaman yang terbang untuk mendarat dulu. Resolve saat selesai.
 */
export function ungkapHalaman({ kartu, tirai, garis, jeda = 0, durasi = 760 }) {
  if (!kartu?.animate || kurangiGerakan()) return Promise.resolve();
  const tinggi = kartu.offsetHeight || 400;
  const opsi = {
    duration: durasi,
    delay: jeda,
    easing: 'cubic-bezier(.45,.05,.35,1)',
    fill: 'forwards',
  };
  kartu.animate(
    [
      { transform: 'scale(.97)' },
      { transform: 'scale(1.015)', offset: 0.55 },
      { transform: 'none' },
    ],
    { duration: 420, delay: jeda, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
  const animasi = [];
  if (tirai)
    animasi.push(tirai.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], opsi));
  if (garis) {
    animasi.push(
      garis.animate(
        [
          { transform: 'translateY(0)', opacity: 1 },
          { transform: `translateY(${tinggi}px)`, opacity: 1, offset: 0.9 },
          { transform: `translateY(${tinggi}px)`, opacity: 0 },
        ],
        opsi,
      ),
    );
  }
  return Promise.all(animasi.map((x) => x.finished.catch(() => {})));
}

// ─── Hapus: "snap Thanos" merah ───────────────────────────────────────────────

const MERAH = ['#A62D2D', '#E05252', '#F19191', '#7A1F1F'];
const acak = (a, b) => a + Math.random() * (b - a);

/**
 * Hancurkan satu elemen menjadi kepingan yang terbang ke kanan atas (kiri → kanan, seperti
 * jentikan jari Thanos). `gambar` (img) → kepingan memuat potongan gambar halaman itu berona
 * merah; tanpa gambar → debu merah. Elemen di luar layar dilewati. Resolve saat selesai.
 */
function hancurkan(el, gambar) {
  const sumber = gambar || el;
  const r = sumber.getBoundingClientRect();
  if (!r.width || !r.height || r.bottom < 0 || r.top > window.innerHeight) return Promise.resolve();

  const wadah = document.createElement('div');
  wadah.setAttribute('aria-hidden', 'true');
  Object.assign(wadah.style, {
    position: 'fixed',
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    zIndex: '960',
    pointerEvents: 'none',
  });
  document.body.appendChild(wadah);

  // 1. Kilatan merah + getar singkat
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(-2px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 160, easing: 'linear' },
  );
  const kilat = document.createElement('div');
  Object.assign(kilat.style, {
    position: 'absolute',
    inset: '0',
    background: 'rgba(224,82,82,.45)',
    borderRadius: '6px',
  });
  wadah.appendChild(kilat);
  kilat.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], {
    duration: 420,
    fill: 'forwards',
  });

  // 2. Kepingan (grid) → lepas dari kiri ke kanan
  const ukuran = gambar ? Math.max(14, r.width / 16) : Math.max(5, r.width / 28);
  const kol = Math.min(gambar ? 18 : 30, Math.max(6, Math.round(r.width / ukuran)));
  const bar = Math.min(gambar ? 26 : 10, Math.max(3, Math.round(r.height / (r.width / kol))));
  const lw = r.width / kol;
  const lh = r.height / bar;
  const url = gambar?.currentSrc || gambar?.src;
  const animasi = [];

  for (let y = 0; y < bar; y++) {
    for (let x = 0; x < kol; x++) {
      const k = document.createElement('div');
      const gaya = {
        position: 'absolute',
        left: `${x * lw}px`,
        top: `${y * lh}px`,
        width: `${lw + 0.5}px`,
        height: `${lh + 0.5}px`,
      };
      if (url) {
        gaya.backgroundImage = `linear-gradient(rgba(166,45,45,.38), rgba(166,45,45,.38)), url("${url}")`;
        gaya.backgroundSize = `${r.width}px ${r.height}px`;
        gaya.backgroundPosition = `${-x * lw}px ${-y * lh}px`;
      } else {
        gaya.background = MERAH[(x + y) % MERAH.length];
        gaya.borderRadius = '1px';
        gaya.opacity = String(acak(0.55, 1));
      }
      Object.assign(k.style, gaya);
      wadah.appendChild(k);
      const dx = acak(30, 150);
      const dy = -acak(20, 110);
      const rot = acak(-80, 80);
      animasi.push(
        k.animate(
          [
            { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: url ? 1 : 0 },
            {
              transform: `translate(${dx * 0.2}px, ${dy * 0.2}px) rotate(${rot * 0.3}deg) scale(.92)`,
              opacity: 1,
              offset: 0.22,
            },
            { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(.15)`, opacity: 0 },
          ],
          {
            duration: acak(620, 960),
            delay: 140 + (x / kol) * 440 + acak(0, 140),
            easing: 'cubic-bezier(.3,.1,.6,1)',
            fill: 'both',
          },
        ),
      );
    }
  }

  // 3. Elemen asli: kepingan bergambar menggantikannya seketika; kartu (debu) memudar bertahap
  el.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: url ? 1 : 520,
    delay: url ? 140 : 160,
    easing: 'ease-in',
    fill: 'forwards',
  });

  return Promise.all(animasi.map((a) => a.finished.catch(() => {}))).then(() => wadah.remove());
}

/** Elemen tampilan halaman `ids`: halaman di kanvas & kartu di panel Urutan. */
function elemenHalaman(ids) {
  const els = [];
  for (const id of ids) {
    const sel = CSS.escape(id);
    els.push(...document.querySelectorAll(`[data-kanvas] [data-halaman][data-id="${sel}"]`));
    els.push(...document.querySelectorAll(`li[data-urutan-id="${sel}"]`));
  }
  return els;
}

/**
 * Hapus halaman `ids` dengan animasi "snap Thanos" merah: halaman di kanvas pecah menjadi
 * kepingan bergambar, kartunya menjadi debu, lalu data dihapus (`ubah`, sinkron lewat flushSync)
 * dan halaman/kartu lain merapat halus (FLIP) tanpa melompat.
 */
export async function snapThanos(ids, ubah) {
  const els = kurangiGerakan() ? [] : elemenHalaman(ids);
  if (!els.length) {
    ubah();
    return;
  }
  await Promise.all(
    els.map((el) => hancurkan(el, el.matches('[data-halaman]') ? el.querySelector('img') : null)),
  );

  const wadah = new Set(els.map((el) => el.parentElement).filter(Boolean));
  const posisi = new Map();
  wadah.forEach((w) =>
    [...w.children].forEach((anak) => posisi.set(anak, anak.getBoundingClientRect().top)),
  );
  flushSync(() => ubah());
  posisi.forEach((top, anak) => {
    if (!anak.isConnected) return;
    const dy = top - anak.getBoundingClientRect().top;
    if (Math.abs(dy) < 0.5) return;
    anak.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
      duration: 380,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      composite: 'add',
    });
  });
}
