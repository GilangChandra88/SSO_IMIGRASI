import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { catatSesi } from '@/utils/jejakKlien';

const DETAK_MS = 4 * 60000;
const DIAM_MS = 5 * 60000;
const PERISTIWA = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

/**
 * Detak sesi untuk Log Developer: siapa sedang online, halaman yang dibuka, mulai/masuk.
 * Detak dikirim tiap 4 menit HANYA bila tab terlihat dan pengguna berinteraksi dalam 5 menit
 * terakhir (hemat penulisan; pengguna yang diam dianggap tidak aktif). Tidak menampilkan apa pun.
 */
export default function PantauSesi() {
  const { currentUser, statusAkun } = useAuth();
  const { pathname } = useLocation();
  const aktif = !!currentUser && statusAkun === 'aktif';
  const sudahMulai = useRef(false);
  const interaksi = useRef(0);

  useEffect(() => {
    if (!aktif) {
      sudahMulai.current = false;
      return undefined;
    }
    if (!sudahMulai.current) {
      sudahMulai.current = true;
      catatSesi('mulai', pathname);
      return undefined;
    }
    const t = setTimeout(() => catatSesi('halaman', pathname), 800);
    return () => clearTimeout(t);
  }, [aktif, pathname]);

  useEffect(() => {
    if (!aktif) return undefined;
    interaksi.current = Date.now();
    const tandai = () => {
      interaksi.current = Date.now();
    };
    const saatTerlihat = () => {
      if (document.visibilityState === 'visible') catatSesi('detak');
    };
    PERISTIWA.forEach((p) => window.addEventListener(p, tandai, { passive: true }));
    document.addEventListener('visibilitychange', saatTerlihat);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - interaksi.current < DIAM_MS) {
        catatSesi('detak');
      }
    }, DETAK_MS);
    return () => {
      clearInterval(id);
      PERISTIWA.forEach((p) => window.removeEventListener(p, tandai));
      document.removeEventListener('visibilitychange', saatTerlihat);
    };
  }, [aktif]);

  return null;
}
