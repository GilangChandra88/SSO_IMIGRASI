import { useEffect, useState } from 'react';
import { FaCircleNotch } from 'react-icons/fa';

/**
 * Penanda memuat saat kode sebuah aplikasi baru diunduh (Suspense di App.jsx). Baru tampil
 * setelah 250 ms, sehingga pemuatan yang cepat tidak berkedip.
 */
export default function MemuatHalaman() {
  const [tampil, setTampil] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTampil(true), 250);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="min-h-[100dvh] grid place-items-center bg-slate-50 dark:bg-slate-950"
      role="status"
      aria-live="polite"
    >
      {tampil && (
        <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:starting:opacity-0">
          <FaCircleNotch className="motion-safe:animate-spin" size={16} />
          Memuat aplikasi…
        </span>
      )}
    </div>
  );
}
