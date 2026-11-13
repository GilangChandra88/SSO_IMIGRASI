import { useMemo, useState } from 'react';
import { showToast } from '@/utils/toastStore';
import { usePantauBersama } from '@/utils/usePantauBersama';

/**
 * Daftar terbaru-dulu: halaman pertama lewat listener, berikutnya dimuat saat diminta.
 * `ambilBerikut(dibuatPada)` mengambil halaman setelah baris terakhir.
 */
export function useDaftarBerhalaman(kunci, kueriPertama, ambilBerikut, ukuran, pesan) {
  const { data, memuat } = usePantauBersama(kunci, kueriPertama, { pesan });
  const [tambahan, setTambahan] = useState([]);
  const [habis, setHabis] = useState(false);
  const [memuatLagi, setMemuatLagi] = useState(false);

  const daftar = useMemo(() => {
    const ada = new Set((data || []).map((m) => m.id));
    return [...(data || []), ...tambahan.filter((m) => !ada.has(m.id))];
  }, [data, tambahan]);

  const muatLagi = async () => {
    setMemuatLagi(true);
    try {
      const baru = await ambilBerikut(daftar[daftar.length - 1].dibuatPada);
      setTambahan((t) => [...t, ...baru]);
      if (baru.length < ukuran) setHabis(true);
    } catch {
      showToast('Tidak punya akses atau gagal memuat.', 'error');
    } finally {
      setMemuatLagi(false);
    }
  };

  return { daftar, memuat, memuatLagi, adaLagi: !habis && (data || []).length >= ukuran, muatLagi };
}
