import { useCallback, useEffect, useRef, useState } from 'react';
import { cekStatus } from '../services/agenScanner';

const JEDA_OFFLINE = 5000; // cek lebih sering selama agen belum terhubung
const JEDA_ONLINE = 30000;

/**
 * Pantau Agen Scanner. `status`: 'memeriksa' | 'terhubung' | 'terputus' | 'ditolak'.
 * `info` = jawaban /status agen; `pesan` = alasan bila ditolak.
 */
export function useStatusAgen() {
  const [state, setState] = useState({ status: 'memeriksa', info: null, pesan: '' });
  const timer = useRef(null);
  const aktif = useRef(true);

  const periksa = useCallback(async () => {
    clearTimeout(timer.current);
    const ctrl = new AbortController();
    const batas = setTimeout(() => ctrl.abort(), 2500);
    let berikut;
    try {
      const info = await cekStatus(ctrl.signal);
      berikut = { status: 'terhubung', info, pesan: '' };
    } catch (err) {
      // 403 = agen hidup tetapi alamat web ini belum didaftarkan di agen.json
      berikut =
        err?.status === 403
          ? { status: 'ditolak', info: null, pesan: err.message }
          : { status: 'terputus', info: null, pesan: '' };
    } finally {
      clearTimeout(batas);
    }
    if (!aktif.current) return;
    setState(berikut);
    timer.current = setTimeout(
      periksa,
      berikut.status === 'terhubung' ? JEDA_ONLINE : JEDA_OFFLINE,
    );
  }, []);

  useEffect(() => {
    aktif.current = true;
    periksa();
    return () => {
      aktif.current = false;
      clearTimeout(timer.current);
    };
  }, [periksa]);

  return { ...state, periksa };
}
