/**
 * Animasi perpindahan halaman e-Persuratan (lihat aturan animasi di CLAUDE.md §5).
 * Web Animations API, hanya `transform`/`opacity`; dilewati bila "kurangi gerakan" aktif.
 */
import { kurangiGerakan } from '@/utils/animasi';

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
  if (!wadah || !isi?.animate || kurangiGerakan()) return null;
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
