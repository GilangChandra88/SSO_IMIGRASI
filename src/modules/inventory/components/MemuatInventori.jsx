import { T } from '@/utils/uiTokens';
import { K } from '../ui/kelas';
import KepalaHalaman from './KepalaHalaman';

/** Kerangka halaman selama data Firestore pertama kali dimuat. */
export default function MemuatInventori({ judul }) {
  return (
    <div className={K.halaman}>
      <KepalaHalaman judul={judul} />
      <div className={`${K.kartu} p-6 flex flex-col gap-3`} role="status" aria-label="Memuat data">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-9 rounded-lg animate-pulse ${T.surface2}`} />
        ))}
      </div>
    </div>
  );
}
