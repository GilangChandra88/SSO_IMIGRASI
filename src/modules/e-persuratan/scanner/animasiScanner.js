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

// ─── Hapus: gaya Daftar LPJ (animasiHapus) ───────────────────────────────────
// Glitch merah singkat → garis pemindai merah menyapu kiri → kanan, elemen lenyap di belakangnya
// sambil luruh menjadi debu piksel merah → celah menutup halus (FLIP). Sama dengan hapus berkas
// di Daftar LPJ, disesuaikan untuk halaman kanvas & kartu panel Urutan. Ringan untuk hapus
// massal: hanya elemen TERLIHAT, maksimal MAKS_DISAPU yang disapu, debu total dibatasi.

const MAKS_DISAPU = 6;
const JATAH_DEBU = 120; // total butir debu untuk satu kali hapus
const DEBU = ['bg-[#A62D2D]', 'bg-[#E05252]', 'bg-[#F19191]'];

const terlihat = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
};

const buatEl = (kelas) => {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.className = `pointer-events-none ${kelas}`;
  return el;
};

/** Satu butir debu piksel merah yang lepas pada `lepas` ms, terbawa ke kanan atas. */
function debu(x, y, lepas, i, lama) {
  const p = buatEl(
    `${DEBU[i % DEBU.length]} ${i % 4 ? 'w-[3px] h-[3px]' : 'w-[4px] h-[4px] rounded-[1px]'}`,
  );
  Object.assign(p.style, { position: 'fixed', left: `${x}px`, top: `${y}px`, zIndex: '1100' });
  document.body.appendChild(p);
  const dx = 24 + Math.random() * 110;
  const dy = -(6 + Math.random() * 60) + (Math.random() < 0.25 ? 40 : 0);
  p.animate(
    [
      { transform: 'translate(0,0) scale(.6)', opacity: 0 },
      { transform: 'translate(3px,-2px) scale(1.15)', opacity: 1, offset: 0.12 },
      { transform: `translate(${dx}px,${dy}px) scale(.3)`, opacity: 0 },
    ],
    {
      duration: lama + Math.random() * 220,
      delay: lepas,
      easing: 'cubic-bezier(.25,.6,.4,1)',
      fill: 'backwards',
    },
  )
    .finished.catch(() => {})
    .finally(() => p.remove());
}

/**
 * Sapuan hapus untuk satu elemen. Lapisan (rona, penutup, garis) dipasang `fixed` di body tepat
 * di atas elemen; penutup berwarna latar di belakang elemen (kanvas / panel) sehingga elemen
 * tampak lenyap di belakang garis. Resolve saat sapuan selesai.
 */
async function sapuHapus(el, { glitchMs, leburMs, jatahDebu }) {
  const r = el.getBoundingClientRect();
  const diKanvas = el.matches('[data-halaman]');
  // Jendela = bagian area gulir yang tampak (kanvas / daftar Urutan): lapisan dipotong di sini
  // supaya elemen yang sebagian tergulir keluar tidak menyembul menutupi judul/kartu lain
  const gulir = el.closest(diKanvas ? '[data-kanvas]' : 'ul') || el.parentElement;
  const g = gulir.getBoundingClientRect();
  const atas = Math.max(r.top, g.top);
  const bawah = Math.min(r.bottom, g.bottom);
  const jendela = buatEl('overflow-hidden');
  Object.assign(jendela.style, {
    position: 'fixed',
    left: `${g.left}px`,
    top: `${g.top}px`,
    width: `${g.width}px`,
    height: `${g.height}px`,
    zIndex: '960',
  });
  const lapis = buatEl(`absolute overflow-hidden ${diKanvas ? '' : 'rounded-[10px]'}`);
  Object.assign(lapis.style, {
    left: `${r.left - g.left}px`,
    top: `${r.top - g.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });
  jendela.appendChild(lapis);
  const rona = buatEl(
    'absolute inset-0 opacity-0 bg-[rgba(166,45,45,.14)] dark:bg-[rgba(241,145,145,.16)]',
  );
  const penutup = buatEl(
    `absolute inset-0 origin-left ${diKanvas ? 'bg-[#F3F5F8] dark:bg-[#16243A]' : 'bg-white dark:bg-[#111D2E]'}`,
  );
  const garis = buatEl(
    'absolute top-0 bottom-0 left-0 w-[2px] bg-[#E05252] shadow-[0_0_14px_3px_rgba(224,82,82,.85)] opacity-0',
  );
  garis.appendChild(
    buatEl(
      'absolute top-0 bottom-0 right-full w-20 bg-gradient-to-l from-[rgba(224,82,82,.3)] to-transparent',
    ),
  );
  penutup.style.transform = 'scaleX(0)';
  lapis.append(rona, penutup, garis);
  document.body.appendChild(jendela);

  try {
    // (1) Glitch merah: rona berkedip + getar kecil
    rona.animate(
      [
        { opacity: 0 },
        { opacity: 1, offset: 0.25 },
        { opacity: 0.4, offset: 0.5 },
        { opacity: 1, offset: 0.75 },
        { opacity: 0.6 },
      ],
      { duration: glitchMs, easing: 'steps(4, end)', fill: 'forwards' },
    );
    await el
      .animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-3px)', offset: 0.2 },
          { transform: 'translateX(3px)', offset: 0.45 },
          { transform: 'translateX(-2px)', offset: 0.7 },
          { transform: 'translateX(0)' },
        ],
        { duration: glitchMs, easing: 'steps(5, end)' },
      )
      .finished.catch(() => {});

    // (2) Luruh kiri → kanan di belakang garis pemindai
    const sapu = { duration: leburMs, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' };
    const animPenutup = penutup.animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      sapu,
    );
    garis.animate(
      [
        { transform: 'translateX(0)', opacity: 1 },
        { transform: `translateX(${r.width}px)`, opacity: 1, offset: 0.92 },
        { transform: `translateX(${r.width}px)`, opacity: 0 },
      ],
      sapu,
    );
    for (let i = 0; i < jatahDebu; i++) {
      const fx = Math.random();
      const x = r.left + fx * r.width;
      // Debu hanya dari bagian elemen yang tampak
      const y = atas + 4 + Math.random() * Math.max(bawah - atas - 8, 1);
      debu(x, y, fx * leburMs, i, Math.max(420, leburMs * 0.75));
    }
    await animPenutup.finished.catch(() => {});
    // Elemen asli tetap tersembunyi sampai datanya dihapus (tidak berkedip muncul lagi)
    el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'forwards' });
  } finally {
    jendela.remove();
  }
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
 * Hapus halaman `ids` dengan animasi gaya Daftar LPJ, lalu data dihapus (`ubah`, sinkron lewat
 * flushSync) dan halaman/kartu lain merapat halus (FLIP) tanpa melompat.
 */
export async function animasiHapusHalaman(ids, ubah) {
  const semua = kurangiGerakan() ? [] : elemenHalaman(ids).filter(terlihat);
  if (!semua.length) {
    ubah();
    return;
  }
  // Halaman kanvas diprioritaskan untuk disapu, lalu kartu; sisanya cukup memudar cepat
  const urut = [
    ...semua.filter((el) => el.matches('[data-halaman]')),
    ...semua.filter((el) => !el.matches('[data-halaman]')),
  ];
  const disapu = urut.slice(0, MAKS_DISAPU);
  const dipudar = urut.slice(MAKS_DISAPU);
  const sedikit = disapu.length <= 2;
  const opsi = {
    glitchMs: sedikit ? 220 : 160,
    leburMs: sedikit ? 820 : 520,
    jatahDebu: Math.max(10, Math.floor(JATAH_DEBU / disapu.length)),
  };

  const tunggu = disapu.map((el) => sapuHapus(el, opsi));
  dipudar.forEach((el) =>
    tunggu.push(
      el
        .animate(
          [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateX(12px)' },
          ],
          { duration: 220, easing: 'ease-in', fill: 'forwards' },
        )
        .finished.catch(() => {}),
    ),
  );
  await Promise.all(tunggu);

  // (3) Celah menutup: catat posisi, hapus data, lalu sisa elemen meluncur ke tempat barunya
  const wadah = new Set(semua.map((el) => el.parentElement).filter(Boolean));
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
