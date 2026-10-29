/**
 * Data berkas LPJ lewat listener bersama (satu listener per sumber, berapa pun komponen yang
 * menampilkannya). Kunci `lpj_berkas:{id}…` dihentikan bersama oleh hapusBerkas.
 */

import { useEffect, useRef, useState } from 'react';
import { LIMIT_KUERI } from '@/utils/batas';
import { showToast } from '@/utils/toastStore';
import { usePantauBersama } from '@/utils/usePantauBersama';
import {
  ambilRingkas,
  ambilRingkasBerikutnya,
  hitungRingkas,
  hitungTahapLpj,
  kueriBukti,
  kueriRingkas,
  kueriRiwayat,
  refBerkas,
  refKeuangan,
} from '../services/berkasDb';
import { kueriDrpp } from '../services/keuanganDb';

const LANJUTAN_KOSONG = { kunci: null, baris: [], habis: false, memuat: false };

/**
 * Daftar ringkas berkas (`lpj_ringkas`): 50 terbaru mengikuti listener, halaman berikutnya
 * lewat `muatLagi` (startAfter, tanpa listener).
 * @param {{ uid: string, semua?: boolean, tahunAnggaran: number, tahap?: string }} opsi
 *   semua = Keuangan/Super Admin; selain itu hanya berkas yang mencantumkan pengguna;
 *   tahap = saring satu tahap, atau beberapa tahap (array)
 */
export function useDaftarBerkas({ uid, semua = false, tahunAnggaran, tahap = '' }) {
  const tahapKunci = Array.isArray(tahap) ? tahap.join('+') : tahap;
  const kunci =
    uid && tahunAnggaran
      ? `lpj_ringkas:${semua ? 'semua' : uid}:${tahapKunci}:${tahunAnggaran}`
      : null;
  const { data, memuat, galat } = usePantauBersama(
    kunci,
    () => kueriRingkas({ uid, semua, tahunAnggaran, tahap }),
    { tahanMs: 5 * 60_000, pesan: 'Gagal memuat daftar berkas LPJ.' },
  );
  const [lanjutan, setLanjutan] = useState(LANJUTAN_KOSONG);
  const tambahan = lanjutan.kunci === kunci ? lanjutan : LANJUTAN_KOSONG;
  const pertama = data || [];
  // Halaman pertama bisa bergeser saat berkas baru masuk: buang duplikat dari halaman lanjutan
  const adaDiPertama = new Set(pertama.map((b) => b.id));
  const berkas = [...pertama, ...tambahan.baris.filter((b) => !adaDiPertama.has(b.id))];

  const muatLagi = async () => {
    const terakhir = berkas[berkas.length - 1];
    if (!terakhir?.dibuatPada) return;
    setLanjutan({ ...tambahan, kunci, memuat: true });
    try {
      const baru = await ambilRingkasBerikutnya(
        { uid, semua, tahunAnggaran, tahap },
        terakhir.dibuatPada,
      );
      setLanjutan({
        kunci,
        baris: [...tambahan.baris, ...baru],
        habis: baru.length < LIMIT_KUERI.halaman,
        memuat: false,
      });
    } catch {
      showToast('Tidak punya akses atau gagal memuat data berikutnya.', 'error');
      setLanjutan({ ...tambahan, kunci, memuat: false });
    }
  };

  return {
    berkas,
    memuat,
    galat,
    bisaLagi: pertama.length === LIMIT_KUERI.halaman && !tambahan.habis,
    memuatLagi: tambahan.memuat,
    muatLagi,
  };
}

/**
 * Jumlah berkas per tahap (Keuangan) lewat kueri hitung — tanpa mengunduh berkasnya. Dihitung
 * ulang saat `segar` berubah (mis. isi tab aktif berubah setelah berkas pindah tahap).
 * @returns {Record<string, number>}  nilai 50 = "50 atau lebih" (batas limit rules)
 */
export function useJumlahTahap({ tahunAnggaran, daftarTahap, segar = '' }) {
  const [jumlah, setJumlah] = useState({});
  const kunci = daftarTahap.join(',');
  useEffect(() => {
    if (!tahunAnggaran) return undefined;
    let aktif = true;
    Promise.all(
      kunci
        .split(',')
        .map((tahap) =>
          hitungRingkas({ semua: true, tahunAnggaran, tahap }).then((n) => [tahap, n]),
        ),
    ).then(
      (pasangan) => aktif && setJumlah(Object.fromEntries(pasangan)),
      () => aktif && showToast('Jumlah berkas per tahap gagal dimuat.', 'error'),
    );
    return () => {
      aktif = false;
    };
  }, [tahunAnggaran, kunci, segar]);
  return jumlah;
}

/**
 * Jumlah berkas per tahap & per jenis satu tahun anggaran (Dashboard Keuangan) lewat Function
 * `hitungTahapLpj` — tepat berapa pun banyaknya berkas. Dihitung ulang saat `segar` berubah.
 * Nonaktif (tanpa panggilan) bila `aktif` false.
 * @returns {{ rekap: { tahap: Record<string, number>, jenis: object } | null, galat: boolean }}
 */
export function useRekapTahap({ tahunAnggaran, aktif = true, segar = 0 }) {
  const [hasil, setHasil] = useState({ rekap: null, galat: false });
  useEffect(() => {
    if (!aktif || !tahunAnggaran) return undefined;
    let hidup = true;
    hitungTahapLpj(tahunAnggaran).then(
      (rekap) => hidup && setHasil({ rekap, galat: false }),
      () => {
        if (!hidup) return;
        setHasil((h) => ({ ...h, galat: true }));
        showToast('Tidak punya akses atau gagal memuat jumlah berkas per tahap.', 'error');
      },
    );
    return () => {
      hidup = false;
    };
  }, [tahunAnggaran, aktif, segar]);
  return hasil;
}

/**
 * Ringkasan beberapa berkas per ID, sekali baca tanpa listener — untuk berkas yang tidak ada di
 * daftar termuat (mis. anggota DRPP lama). ID yang sudah diminta tidak dibaca ulang.
 * @param {string[]} ids
 * @returns {Record<string, object|null>}  null = tidak ada / tidak bisa dibaca
 */
export function useRingkasPerId(ids) {
  const [hasil, setHasil] = useState({});
  const diminta = useRef(new Set());
  const kunci = [...new Set(ids)].sort().join(',');
  useEffect(() => {
    const baru = (kunci ? kunci.split(',') : []).filter((id) => !diminta.current.has(id));
    if (!baru.length) return;
    baru.forEach((id) => diminta.current.add(id));
    Promise.all(
      baru.map((id) =>
        ambilRingkas(id).then(
          (r) => [id, r, false],
          () => [id, null, true],
        ),
      ),
    ).then((pasangan) => {
      if (pasangan.some(([, , gagal]) => gagal)) {
        showToast(
          'Sebagian berkas tidak dapat dimuat (tidak punya akses atau gagal memuat).',
          'error',
        );
      }
      setHasil((h) => ({ ...h, ...Object.fromEntries(pasangan.map(([id, r]) => [id, r])) }));
    });
  }, [kunci]);
  return hasil;
}

/** Satu berkas (`lpj_berkas/{id}`); null bila tidak ada. */
export function useBerkas(id) {
  const { data, memuat, galat } = usePantauBersama(
    id ? `lpj_berkas:${id}` : null,
    () => refBerkas(id),
    { pesan: 'Gagal memuat berkas.' },
  );
  return { berkas: data, memuat, galat };
}

/** Tahap Keuangan berkas (`keuangan/status`); null bila Keuangan belum memulai. */
export function useKeuanganBerkas(id) {
  const { data, memuat, galat } = usePantauBersama(
    id ? `lpj_berkas:${id}:keuangan` : null,
    () => refKeuangan(id),
    { pesan: 'Gagal memuat status keuangan berkas.' },
  );
  return { keuangan: data, memuat, galat };
}

/** Bukti pengeluaran berkas (subkoleksi `bukti`). */
export function useBuktiBerkas(id) {
  const { data, memuat, galat } = usePantauBersama(
    id ? `lpj_berkas:${id}:bukti` : null,
    () => kueriBukti(id),
    { pesan: 'Gagal memuat bukti pengeluaran.' },
  );
  return { bukti: data || [], memuat, galat };
}

/**
 * DRPP satu tahun anggaran (`lpj_drpp`, ≤50): semua (Keuangan/Super Admin) atau yang memuat
 * berkas pengguna. Diurutkan terbaru dulu.
 */
export function useDaftarDrpp({ uid, semua = false, tahunAnggaran }) {
  const { data, memuat, galat } = usePantauBersama(
    uid && tahunAnggaran ? `lpj_drpp:${semua ? 'semua' : uid}:${tahunAnggaran}` : null,
    () => kueriDrpp({ uid, semua, tahunAnggaran }),
    { tahanMs: 5 * 60_000, pesan: 'Gagal memuat data DRPP.' },
  );
  const list = (data || [])
    .slice()
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || b.id.localeCompare(a.id));
  return { list, memuat, galat };
}

/** Riwayat aktivitas berkas (subkoleksi `riwayat`, ditulis Function), terbaru dulu. */
export function useRiwayatBerkas(id) {
  const { data, memuat, galat } = usePantauBersama(
    id ? `lpj_berkas:${id}:riwayat` : null,
    () => kueriRiwayat(id),
    { pesan: 'Gagal memuat riwayat berkas.' },
  );
  return { riwayat: data || [], memuat, galat };
}
