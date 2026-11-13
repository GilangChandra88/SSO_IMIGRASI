import { K } from '../ui/kelas';
import { nilaiTeks } from '../ui/format';

/** Pasangan kunci–nilai (rincian anomali, potret sistem). */
export function TabelKV({ isi }) {
  const baris = Object.entries(isi || {});
  if (!baris.length) return <p className={K.redup}>Tidak ada rincian.</p>;
  return (
    <dl className={K.kv}>
      {baris.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className={K.kvKunci}>{k}</dt>
          <dd className={K.kvNilai}>{nilaiTeks(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Selisih perubahan: field · lama (merah) → baru (hijau). */
export function TabelSelisih({ perubahan, lebih = 0 }) {
  const baris = Object.entries(perubahan || {});
  if (!baris.length) return <p className={K.redup}>Tidak ada field yang berubah.</p>;
  return (
    <div className="flex flex-col gap-2">
      {baris.map(([k, v]) => (
        <div key={k} className={`${K.kartu} !p-3`}>
          <p className={`${K.mono} font-bold mb-1`}>{k}</p>
          <p className={K.lama}>− {nilaiTeks(v?.lama)}</p>
          <p className={K.baru}>+ {nilaiTeks(v?.baru)}</p>
        </div>
      ))}
      {lebih > 0 && <p className={K.redup}>…dan {lebih} field lain.</p>}
    </div>
  );
}
