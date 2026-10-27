/**
 * Penanda "captcha ulang tahun sedang tampil", supaya popup ucapan (dipasang global di App)
 * menunggu sampai captcha selesai.
 */
import { useSyncExternalStore } from 'react';

let aktif = false;
const pelanggan = new Set();

export function setKejutanAktif(v) {
  aktif = v;
  pelanggan.forEach((fn) => fn());
}

const langgan = (fn) => {
  pelanggan.add(fn);
  return () => pelanggan.delete(fn);
};

export const useKejutanAktif = () => useSyncExternalStore(langgan, () => aktif);
