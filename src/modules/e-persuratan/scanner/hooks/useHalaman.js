import { useCallback, useEffect, useRef, useState } from 'react';
import { putarRotasi } from '../utils/gambar';

let urut = 0;
const idBaru = () => `hl-${Date.now().toString(36)}-${(urut++).toString(36)}`;

/**
 * Daftar halaman kerja Scanner (hanya di memori browser; hilang bila halaman ditutup).
 * Halaman: { id, blob, url, nama, sumber: 'scan'|'gambar'|'pdf', lebar, tinggi, rotasi }.
 * `url` = object URL untuk <img>; dilepas saat halaman dihapus atau komponen dilepas.
 */
export function useHalaman() {
  const [halaman, setHalaman] = useState([]);
  const [terpilih, setTerpilih] = useState(() => new Set());
  const daftarRef = useRef(halaman);

  useEffect(() => {
    daftarRef.current = halaman;
  }, [halaman]);

  useEffect(() => () => daftarRef.current.forEach((h) => URL.revokeObjectURL(h.url)), []);

  const tambah = useCallback(({ blob, nama, sumber, lebar, tinggi }) => {
    const h = {
      id: idBaru(),
      blob,
      url: URL.createObjectURL(blob),
      nama,
      sumber,
      lebar,
      tinggi,
      rotasi: 0,
    };
    setHalaman((l) => [...l, h]);
    return h.id;
  }, []);

  const hapus = useCallback((ids) => {
    const set = new Set(ids);
    daftarRef.current.filter((h) => set.has(h.id)).forEach((h) => URL.revokeObjectURL(h.url));
    setHalaman((l) => l.filter((h) => !set.has(h.id)));
    setTerpilih((s) => new Set([...s].filter((id) => !set.has(id))));
  }, []);

  const kosongkan = useCallback(() => {
    daftarRef.current.forEach((h) => URL.revokeObjectURL(h.url));
    setHalaman([]);
    setTerpilih(new Set());
  }, []);

  /** Putar halaman `ids` sebesar `delta` (+90 searah jarum jam, -90 berlawanan). */
  const putar = useCallback((ids, delta) => {
    const set = new Set(ids);
    setHalaman((l) =>
      l.map((h) => (set.has(h.id) ? { ...h, rotasi: putarRotasi(h.rotasi, delta) } : h)),
    );
  }, []);

  /** Pindahkan halaman `id` ke posisi `ke` (indeks tujuan). */
  const pindah = useCallback((id, ke) => {
    setHalaman((l) => {
      const dari = l.findIndex((h) => h.id === id);
      if (dari < 0) return l;
      const tujuan = Math.max(0, Math.min(l.length - 1, ke));
      if (dari === tujuan) return l;
      const baru = [...l];
      const [h] = baru.splice(dari, 1);
      baru.splice(tujuan, 0, h);
      return baru;
    });
  }, []);

  /**
   * Geser semua halaman `ids` satu langkah (arah -1 naik, +1 turun) sebagai blok: urutan di
   * antara halaman terpilih tetap, halaman yang sudah di ujung tidak bergerak.
   */
  const geserBanyak = useCallback((ids, arah) => {
    const set = new Set(ids);
    setHalaman((l) => {
      const baru = [...l];
      const tukar = (i, j) => ([baru[i], baru[j]] = [baru[j], baru[i]]);
      if (arah < 0) {
        for (let i = 1; i < baru.length; i++)
          if (set.has(baru[i].id) && !set.has(baru[i - 1].id)) tukar(i, i - 1);
      } else {
        for (let i = baru.length - 2; i >= 0; i--)
          if (set.has(baru[i].id) && !set.has(baru[i + 1].id)) tukar(i, i + 1);
      }
      return baru;
    });
  }, []);

  /**
   * Pindahkan halaman `ids` (urutannya dipertahankan) ke tepat sebelum halaman `sebelumId`;
   * `sebelumId` null = ke akhir, `'awal'` = ke awal.
   */
  const pindahBanyak = useCallback((ids, sebelumId) => {
    const set = new Set(ids);
    setHalaman((l) => {
      const dipindah = l.filter((h) => set.has(h.id));
      const sisa = l.filter((h) => !set.has(h.id));
      if (!dipindah.length) return l;
      let posisi = sebelumId === 'awal' ? 0 : sisa.findIndex((h) => h.id === sebelumId);
      if (posisi < 0) posisi = sisa.length;
      return [...sisa.slice(0, posisi), ...dipindah, ...sisa.slice(posisi)];
    });
  }, []);

  /** Pilih semua halaman dari `dariId` sampai `keId` (Shift+klik); `tambahkan` = gabung pilihan lama. */
  const pilihRentang = useCallback((dariId, keId, tambahkan = true) => {
    const l = daftarRef.current;
    const a = l.findIndex((h) => h.id === dariId);
    const b = l.findIndex((h) => h.id === keId);
    if (a < 0 || b < 0) return;
    const rentang = l.slice(Math.min(a, b), Math.max(a, b) + 1).map((h) => h.id);
    setTerpilih((s) => new Set([...(tambahkan ? s : []), ...rentang]));
  }, []);

  const pilih = useCallback((id) => {
    setTerpilih((s) => {
      const baru = new Set(s);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }, []);

  const pilihSemua = useCallback((semua) => {
    setTerpilih(semua ? new Set(daftarRef.current.map((h) => h.id)) : new Set());
  }, []);

  return {
    halaman,
    terpilih,
    tambah,
    hapus,
    kosongkan,
    putar,
    pindah,
    geserBanyak,
    pindahBanyak,
    pilih,
    pilihRentang,
    pilihSemua,
  };
}
