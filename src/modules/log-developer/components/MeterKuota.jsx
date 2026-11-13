import { K } from '../ui/kelas';
import { angka } from '../ui/format';

const PERSEN = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

/** Bilah pemakaian terhadap jatah gratis: biru, kuning di ≥80%, merah bila terlampaui. */
export default function MeterKuota({ label, pakai, batas, satuan = '', ket }) {
  const persen = batas > 0 ? (pakai * 100) / batas : 0;
  const isi = persen >= 100 ? K.meterIsiBahaya : persen >= 80 ? K.meterIsiAwas : K.meterIsiBaik;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className={K.judulBaris}>{label}</span>
        <span
          className={persen >= 100 ? K.lencanaBahaya : persen >= 80 ? K.lencanaPeringatan : K.redup}
        >
          {batas > 0 ? `${PERSEN.format(persen)}%` : 'tanpa jatah gratis'}
        </span>
      </div>
      <progress
        className={`${K.meterLintas} ${isi}`}
        value={Math.min(100, persen)}
        max={100}
        aria-label={`${label} ${PERSEN.format(persen)}%`}
      />
      <p className={`${K.redup} mt-1`}>
        {angka(pakai)}
        {satuan} {batas > 0 ? `dari ${angka(batas)}${satuan} gratis` : ''}
        {ket ? ` · ${ket}` : ''}
      </p>
    </div>
  );
}
