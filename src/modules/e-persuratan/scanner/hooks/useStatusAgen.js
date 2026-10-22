import { useCallback, useEffect, useRef, useState } from 'react';
import { cekStatus } from '../services/agenScanner';
import { VERSI_AGEN_TERBARU, versiLebihLama } from '../data/agen';

const JEDA_OFFLINE = 5000; // cek lebih sering selama agen belum terhubung
const JEDA_ONLINE = 30000;
const JEDA_MENUNGGU = 1500; // setelah pengguna mengunduh / menyalakan agen
const LAMA_MENUNGGU = 3 * 60 * 1000;
const KUNCI_TERPASANG = 'scanner.agenTerpasang';

function bacaTerpasang() {
  try {
    return localStorage.getItem(KUNCI_TERPASANG) === '1';
  } catch {
    return false;
  }
}

/**
 * Pantau Agen Scanner. `status`: 'memeriksa' | 'terhubung' | 'terputus' | 'ditolak'.
 * `info` = jawaban /status agen; `pesan` = alasan bila ditolak.
 * `pernahTerpasang` = agen pernah tersambung di browser ini (tawarkan "Nyalakan" alih-alih "Pasang").
 * `perluPembaruan` = versi agen lebih lama dari VERSI_AGEN_TERBARU.
 * `tunggu()` = pemeriksaan dipercepat (setelah klik Unduh/Nyalakan); `baruSiap` true sekali saat
 * agen tersambung dalam masa tunggu itu (untuk perayaan).
 */
export function useStatusAgen() {
  const [state, setState] = useState({ status: 'memeriksa', info: null, pesan: '' });
  const [pernahTerpasang, setPernahTerpasang] = useState(bacaTerpasang);
  const [menunggu, setMenunggu] = useState(false);
  const [baruSiap, setBaruSiap] = useState(false);
  const timer = useRef(null);
  const aktif = useRef(true);
  const menungguSampai = useRef(0);

  const periksa = useCallback(async () => {
    clearTimeout(timer.current);
    const ctrl = new AbortController();
    const batas = setTimeout(() => ctrl.abort(), 2500);
    let berikut;
    try {
      const info = await cekStatus(ctrl.signal);
      berikut = { status: 'terhubung', info, pesan: '' };
    } catch (err) {
      // 403 = agen hidup tetapi alamat web ini belum diizinkan (agen versi lama)
      berikut =
        err?.status === 403
          ? { status: 'ditolak', info: null, pesan: err.message }
          : { status: 'terputus', info: null, pesan: '' };
    } finally {
      clearTimeout(batas);
    }
    if (!aktif.current) return;

    const sedangMenunggu = Date.now() < menungguSampai.current;
    if (berikut.status === 'terhubung') {
      try {
        localStorage.setItem(KUNCI_TERPASANG, '1');
      } catch {
        /* penyimpanan browser tidak tersedia */
      }
      setPernahTerpasang(true);
      const sudahBaru = !versiLebihLama(berikut.info?.versi, VERSI_AGEN_TERBARU);
      if (sedangMenunggu && sudahBaru) {
        menungguSampai.current = 0;
        setMenunggu(false);
        setBaruSiap(true);
      }
    } else if (!sedangMenunggu) {
      setMenunggu(false);
    }
    setState(berikut);

    const lanjut = Date.now() < menungguSampai.current;
    timer.current = setTimeout(
      periksa,
      lanjut ? JEDA_MENUNGGU : berikut.status === 'terhubung' ? JEDA_ONLINE : JEDA_OFFLINE,
    );
  }, []);

  const tunggu = useCallback(() => {
    menungguSampai.current = Date.now() + LAMA_MENUNGGU;
    setMenunggu(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(periksa, JEDA_MENUNGGU);
  }, [periksa]);

  const tandaiSiapDilihat = useCallback(() => setBaruSiap(false), []);

  useEffect(() => {
    aktif.current = true;
    periksa();
    return () => {
      aktif.current = false;
      clearTimeout(timer.current);
    };
  }, [periksa]);

  const perluPembaruan =
    state.status === 'terhubung' && versiLebihLama(state.info?.versi, VERSI_AGEN_TERBARU);

  return {
    ...state,
    periksa,
    pernahTerpasang,
    perluPembaruan,
    menunggu,
    tunggu,
    baruSiap,
    tandaiSiapDilihat,
  };
}
