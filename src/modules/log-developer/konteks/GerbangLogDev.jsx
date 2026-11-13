import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/utils/toastStore';
import { bacaLog, perluKunciUlang } from '../services/logDev';
import LayarKunci from '../components/LayarKunci';
import { KonteksLogDev } from './konteks';

const DIAM_MS = 10 * 60000;
const PERISTIWA = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

/**
 * Gerbang Log Developer (tampilan; penjaga sebenarnya di Function):
 * - hanya Super Admin asli (mode "lihat sebagai" tidak mengubah ini);
 * - wajib mengetik ulang kata sandi untuk membuka, berlaku 30 menit sejak itu;
 * - terkunci lagi bila tidak ada interaksi 10 menit atau server meminta kata sandi ulang.
 * Data log hanya ada di memori komponen; saat terkunci semua halaman dilepas (datanya hilang).
 */
export default function GerbangLogDev({ children }) {
  const { isRealSuperAdmin } = useAuth();
  const [terkunciPada, setTerkunciPada] = useState(0);
  const terbuka = terkunciPada > 0;

  const kunci = useCallback((pesan) => {
    setTerkunciPada(0);
    if (pesan) showToast(pesan);
  }, []);

  // Kunci otomatis saat batas 30 menit habis
  useEffect(() => {
    if (!terbuka) return undefined;
    const t = setTimeout(
      () => kunci('Sesi Log Developer habis. Ketik ulang kata sandi.'),
      Math.max(0, terkunciPada - Date.now()),
    );
    return () => clearTimeout(t);
  }, [terbuka, terkunciPada, kunci]);

  // Kunci otomatis saat tidak ada interaksi 10 menit
  useEffect(() => {
    if (!terbuka) return undefined;
    let terakhir = Date.now();
    const tandai = () => {
      terakhir = Date.now();
    };
    PERISTIWA.forEach((p) => window.addEventListener(p, tandai, { passive: true }));
    const id = setInterval(() => {
      if (Date.now() - terakhir > DIAM_MS)
        kunci('Log Developer dikunci karena tidak ada aktivitas.');
    }, 30000);
    return () => {
      clearInterval(id);
      PERISTIWA.forEach((p) => window.removeEventListener(p, tandai));
    };
  }, [terbuka, kunci]);

  const baca = useCallback(
    async (tampilan, opsi = {}) => {
      try {
        return await bacaLog({ tampilan, ...opsi });
      } catch (err) {
        if (perluKunciUlang(err)) kunci('Ketik ulang kata sandi untuk melanjutkan.');
        throw err;
      }
    },
    [kunci],
  );

  const nilai = useMemo(() => ({ baca, kunci, terkunciPada }), [baca, kunci, terkunciPada]);

  if (!isRealSuperAdmin) return <Navigate to="/" replace />;
  if (!terbuka) return <LayarKunci onTerbuka={setTerkunciPada} />;
  return <KonteksLogDev.Provider value={nilai}>{children}</KonteksLogDev.Provider>;
}
