import { K } from '../ui/kelas';

/** Isi daftar: memuat / kosong / baris + tombol "Muat lagi". */
export default function DaftarKosong({
  memuat,
  jumlah,
  habis,
  onMuatLagi,
  pesan = 'Belum ada catatan.',
}) {
  if (memuat && !jumlah) return <p className={K.kosong}>Memuat…</p>;
  if (!jumlah) return <p className={K.kosong}>{pesan}</p>;
  if (habis) return null;
  return (
    <div className="p-3 text-center">
      <button type="button" className={K.tombolKecil} onClick={onMuatLagi} disabled={memuat}>
        {memuat ? 'Memuat…' : 'Muat lagi'}
      </button>
    </div>
  );
}
