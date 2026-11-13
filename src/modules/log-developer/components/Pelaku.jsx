import { K } from '../ui/kelas';
import { perangkat } from '../ui/format';

/**
 * Identitas pelaku: nama pegawai (dari pegawai_ringkas) atau e-mail/uid, plus IP & perangkat.
 * `nama` = peta uid → nama dari Function.
 */
export default function Pelaku({ uid, email, ip, alat, nama = {}, ringkas = false }) {
  const label = (uid && nama[uid]) || email || uid || 'Tanpa login';
  return (
    <span className="min-w-0">
      <span className={`${K.judulBaris} block`}>{label}</span>
      {!ringkas && (email || ip || alat) && (
        <span className={`${K.redup} block break-all`}>
          {[uid && nama[uid] ? email : '', ip, alat ? perangkat(alat) : '']
            .filter(Boolean)
            .join(' · ')}
        </span>
      )}
    </span>
  );
}
