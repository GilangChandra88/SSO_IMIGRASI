import { K } from '../ui/kelas';
import { rupiah } from '../ui/format';

/** Pilihan rekening kas/bank aktif beserta saldonya. kas: [{ id, nama, saldo }]. */
export default function PilihKas({ kas, nilai, onUbah, label = 'Kas', kecuali }) {
  const pilihan = kas.filter((k) => k.id !== kecuali);
  return (
    <label>
      <span className={K.label}>{label}</span>
      <select className={K.masukan} value={nilai} onChange={(e) => onUbah(e.target.value)}>
        <option value="">Pilih kas…</option>
        {pilihan.map((k) => (
          <option key={k.id} value={k.id}>
            {k.nama} ({rupiah(k.saldo)})
          </option>
        ))}
      </select>
      {!kas.length && (
        <span className={K.pesanGalat}>
          Belum ada rekening kas/bank. Tambahkan di Pembukuan › Kas & Bank.
        </span>
      )}
    </label>
  );
}
