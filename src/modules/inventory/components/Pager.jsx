import { T } from '@/utils/uiTokens';
import { K } from '../ui/kelas';
import { useMedia } from '../hooks/useMedia';

/**
 * Nomor halaman. Sampai `semua` halaman ditampilkan penuh; lebih banyak dipersingkat dengan "…"
 * (selalu memuat halaman pertama, halaman aktif + tetangganya, dan halaman terakhir).
 */
function daftarNomorHalaman(aktif, jumlah, semua = 10, slot = 9) {
  const rentang = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  if (jumlah <= semua) return rentang(1, jumlah);
  if (aktif <= slot - 3) return [...rentang(1, slot - 2), '…1', jumlah];
  if (aktif >= jumlah - (slot - 4)) return [1, '…1', ...rentang(jumlah - (slot - 3), jumlah)];
  const tengah = slot - 4;
  const mulai = aktif - Math.floor(tengah / 2);
  return [1, '…1', ...rentang(mulai, mulai + tengah - 1), '…2', jumlah];
}

/** semua: filter aktif, semua data cocok ditampilkan sekaligus (tanpa halaman). */
export default function Pager({
  paging,
  satuan = 'data',
  ukuran,
  onUkuran,
  semua = false,
  onPindah,
}) {
  const { halaman, jumlahHalaman, setHalaman, dari, sampai, total } = paging;
  const sempit = useMedia('(max-width: 520px)');
  const nomor = daftarNomorHalaman(halaman, jumlahHalaman, sempit ? 5 : 10, sempit ? 5 : 9);
  const ke = (n) => {
    setHalaman(n);
    if (onPindah) onPindah();
  };
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-t text-[13px] ${T.border} ${T.inkMuted}`}
    >
      <span>
        {total === 0
          ? `Tidak ada ${satuan}`
          : semua
            ? `Menampilkan semua ${total} ${satuan} sesuai filter`
            : `Menampilkan ${dari} sampai ${sampai} dari ${total} ${satuan}`}
      </span>
      {onUkuran && !semua && (
        <select
          className={`${K.ctl} h-8 w-auto text-[13px]`}
          aria-label="Jumlah data per halaman"
          value={ukuran}
          onChange={(e) => onUkuran(Number(e.target.value))}
        >
          <option value={10}>10 / halaman</option>
          <option value={25}>25 / halaman</option>
          <option value={50}>50 / halaman</option>
        </select>
      )}
      {!semua && jumlahHalaman > 1 && (
        <nav
          className="basis-full flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 pt-0.5"
          aria-label="Halaman data"
        >
          <button
            className={`${K.btnKecil} min-w-8`}
            type="button"
            disabled={halaman <= 1}
            onClick={() => ke(halaman - 1)}
            aria-label="Halaman sebelumnya"
          >
            <span aria-hidden="true">‹</span>
            <span className="max-[520px]:hidden">Sebelumnya</span>
          </button>
          {nomor.map((n) =>
            typeof n === 'string' ? (
              <span key={n} className="min-w-5 text-center font-semibold" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={n}
                className={`${n === halaman ? K.btnKecilUtama : K.btnKecil} min-w-8 px-2`}
                type="button"
                aria-label={`Halaman ${n}`}
                aria-current={n === halaman ? 'page' : undefined}
                onClick={() => ke(n)}
              >
                {n}
              </button>
            ),
          )}
          <button
            className={`${K.btnKecil} min-w-8`}
            type="button"
            disabled={halaman >= jumlahHalaman}
            onClick={() => ke(halaman + 1)}
            aria-label="Halaman berikutnya"
          >
            <span className="max-[520px]:hidden">Berikutnya</span>
            <span aria-hidden="true">›</span>
          </button>
        </nav>
      )}
    </div>
  );
}
