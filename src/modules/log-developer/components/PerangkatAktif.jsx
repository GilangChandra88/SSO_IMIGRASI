import { K } from '../ui/kelas';
import { perangkat, relatif } from '../ui/format';

const LIMA_MENIT = 5 * 60000;

/** Perangkat akun yang aktif ≤ 5 menit terakhir dan belum keluar (terbaru dulu). */
function daftarPerangkatAktif(sesi, kini) {
  return Object.values(sesi?.perangkatAktif || {})
    .filter((v) => !v.keluar && kini - (v.terakhirAktif || 0) <= LIMA_MENIT)
    .sort((a, b) => (b.terakhirAktif || 0) - (a.terakhirAktif || 0));
}

/**
 * Perangkat yang sedang aktif untuk satu akun. Lebih dari satu = lencana peringatan (satu akun
 * dipakai di beberapa perangkat sekaligus). `ringkas` = hanya lencana bila > 1.
 */
export default function PerangkatAktif({ sesi, kini, ringkas = false }) {
  const aktif = daftarPerangkatAktif(sesi, kini);
  if (aktif.length < 2 && ringkas) return null;
  if (!aktif.length) return null;
  return (
    <span className="block mt-1">
      {aktif.length > 1 && (
        <span className={K.lencanaPeringatan}>{aktif.length} perangkat aktif sekaligus</span>
      )}
      {!ringkas &&
        aktif.map((v) => (
          <span key={`${v.ip}|${v.sesiId}|${v.mulaiPada}`} className={`${K.redup} block break-all`}>
            {perangkat(v.perangkat)} · {v.ip || '-'} · {v.halaman || '-'} ·{' '}
            {relatif(v.terakhirAktif, kini)}
          </span>
        ))}
    </span>
  );
}
