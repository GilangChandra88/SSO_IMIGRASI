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
