import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const daring = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

/**
 * Simpan otomatis isian form: `tandai()` dipanggil setiap ada perubahan, lalu `simpan()` dijalankan
 * setelah pengguna berhenti mengetik `jeda` ms.
 * Saat offline Firestore tidak menolak penulisan, tetapi mengantrekannya sampai koneksi kembali;
 * karena itu status `luring` dibaca dari browser (offline/online) dan status `gagal` dipasang bila
 * simpanan belum dikonfirmasi server dalam `batasMs` (atau memang gagal).
 * @param {() => Promise<boolean>} simpan  menyimpan isian terbaru; true bila berhasil
 * @returns {{ status: 'tersimpan'|'menyimpan'|'luring'|'gagal', tandai, bersih, simpanSekarang }}
 */
export function useSimpanOtomatis(simpan, { jeda = 1200, batasMs = 8000 } = {}) {
  const [status, setStatus] = useState(() => (daring() ? 'tersimpan' : 'luring'));
  const simpanRef = useRef(simpan);
  useLayoutEffect(() => {
    simpanRef.current = simpan;
  });
  const kotor = useRef(false); // ada perubahan yang belum dikirim
  const menunggu = useRef(0); // jumlah simpanan yang belum dikonfirmasi server
  const urut = useRef(0);
  const timer = useRef(null);

  const jalankan = useCallback(async () => {
    clearTimeout(timer.current);
    if (!kotor.current) return;
    if (!daring()) {
      setStatus('luring');
      return;
    }
    kotor.current = false;
    const ke = ++urut.current;
    menunggu.current++;
    setStatus('menyimpan');
    const lambat = setTimeout(() => {
      if (urut.current === ke) setStatus('gagal');
    }, batasMs);
    let ok = false;
    try {
      ok = await simpanRef.current();
    } catch {
      ok = false;
    }
    clearTimeout(lambat);
    menunggu.current--;
    if (!ok) kotor.current = true; // dicoba lagi pada perubahan berikutnya / saat online
    if (urut.current === ke) setStatus(ok ? 'tersimpan' : daring() ? 'gagal' : 'luring');
  }, [batasMs]);

  /** Ada perubahan: jadwalkan simpan setelah jeda. */
  const tandai = useCallback(() => {
    kotor.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(jalankan, jeda);
  }, [jalankan, jeda]);

  /** Isian baru saja disimpan lewat jalur lain (Kembali ke Detail / Selesai): batalkan jadwal. */
  const bersih = useCallback(() => {
    kotor.current = false;
    clearTimeout(timer.current);
  }, []);

  /** Simpan sekarang tanpa menunggu jeda (tombol "Coba simpan lagi"). */
  const simpanSekarang = useCallback(() => {
    kotor.current = true;
    jalankan();
  }, [jalankan]);

  useEffect(() => {
    const onOffline = () => setStatus('luring');
    const onOnline = () => {
      if (kotor.current) jalankan();
      else if (menunggu.current === 0) setStatus('tersimpan');
      else setStatus('menyimpan'); // antrean Firestore sedang dikirim ulang
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [jalankan]);

  // Keluar dari form (mis. lewat menu) sebelum jeda habis: simpan yang tersisa
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (kotor.current) simpanRef.current()?.catch?.(() => {});
    },
    [],
  );

  return { status, tandai, bersih, simpanSekarang };
}
