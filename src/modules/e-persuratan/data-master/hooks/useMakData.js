import { useState } from 'react';
import { LIMIT_KUERI } from '@/utils/batas';
import { showToast } from '@/utils/toastStore';
import { usePantauBersama } from '@/utils/usePantauBersama';
import { ambilRealisasiBerikutnya, kueriRealisasi } from '../services/makDb';

// Rekap realisasi dipakai juga verifikasi LPJ: satu listener bersama di tingkat e-Persuratan
export { useRekapMak } from '../../useRekapMak';

const LANJUTAN_KOSONG = { kunci: null, baris: [], habis: false, memuat: false };

/**
 * Realisasi (`mak_realisasi`) satu tahun anggaran (+ bulan), terbaru dulu. Halaman pertama
 * mengikuti listener; halaman berikutnya dimuat lewat `muatLagi` (startAfter).
 * @returns {{ realisasi: object[], memuat: boolean, bisaLagi: boolean, memuatLagi: boolean,
 *   muatLagi: () => Promise<void>, ubahBaris: (id: string, patch: object) => void }}
 */
export function useRealisasi({ tahunAnggaran, bulan = 0 }) {
  const kunci = Number.isInteger(tahunAnggaran) ? `mak_realisasi:${tahunAnggaran}:${bulan}` : null;
  const { data, memuat } = usePantauBersama(kunci, () => kueriRealisasi({ tahunAnggaran, bulan }), {
    pesan: 'Gagal memuat history MAK.',
  });
  const [lanjutan, setLanjutan] = useState(LANJUTAN_KOSONG);
  const tambahan = lanjutan.kunci === kunci ? lanjutan : LANJUTAN_KOSONG;
  const pertama = data || [];
  const realisasi = [...pertama, ...tambahan.baris];

  const muatLagi = async () => {
    const terakhir = realisasi[realisasi.length - 1];
    if (!terakhir?.dibuatPada) return;
    setLanjutan({ ...tambahan, kunci, memuat: true });
    try {
      const baru = await ambilRealisasiBerikutnya({ tahunAnggaran, bulan }, terakhir.dibuatPada);
      setLanjutan({
        kunci,
        baris: [...tambahan.baris, ...baru],
        habis: baru.length < LIMIT_KUERI.realisasi,
        memuat: false,
      });
    } catch {
      showToast('Tidak punya akses atau gagal memuat data berikutnya.', 'error');
      setLanjutan({ ...tambahan, kunci, memuat: false });
    }
  };

  /** Perbarui satu baris halaman lanjutan (halaman pertama sudah mengikuti listener). */
  const ubahBaris = (id, patch) =>
    setLanjutan((l) =>
      l.kunci === kunci
        ? { ...l, baris: l.baris.map((b) => (b.id === id ? { ...b, ...patch } : b)) }
        : l,
    );

  return {
    realisasi,
    memuat,
    bisaLagi: pertama.length === LIMIT_KUERI.realisasi && !tambahan.habis,
    memuatLagi: tambahan.memuat,
    muatLagi,
    ubahBaris,
  };
}
