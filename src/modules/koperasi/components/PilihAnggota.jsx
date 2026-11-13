import { K } from '../ui/kelas';

/**
 * Pilihan anggota. `umum` = tambahkan pilihan "UMUM" (nilai '') di paling atas.
 * anggota: [{ id, nomor, nama }].
 */
export default function PilihAnggota({ anggota, nilai, onUbah, label = 'Anggota', umum = false }) {
  return (
    <label>
      <span className={K.label}>{label}</span>
      <select className={K.masukan} value={nilai} onChange={(e) => onUbah(e.target.value)}>
        {umum ? (
          <option value="">UMUM (bukan anggota)</option>
        ) : (
          <option value="">Pilih anggota…</option>
        )}
        {anggota.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nomor} · {a.nama}
          </option>
        ))}
      </select>
    </label>
  );
}
