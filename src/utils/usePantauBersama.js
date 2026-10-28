/**
 * Listener Firestore yang dipakai bersama (CLAUDE.md 7.1: data yang dipakai banyak halaman dibaca
 * satu kali lewat provider bersama). Satu `kunci` = satu onSnapshot, berapa pun komponen yang
 * memakainya. Setelah pemakai terakhir pergi, listener ditahan `tahanMs` supaya pindah halaman
 * tidak memicu baca ulang; `Infinity` = selama halaman terbuka (data kecil yang jarang berubah).
 * Logout memuat ulang halaman (keluarAkun), sehingga semua listener dan datanya ikut hilang.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { daftarDokumen, pantau } from './pantau';

const KOSONG = Object.freeze({ data: null, memuat: false, galat: null });
const MEMUAT = Object.freeze({ data: null, memuat: true, galat: null });

/** kunci → { keadaan, pemakai: Set, berhenti, timer, ...opsi } */
const entri = new Map();

/** Snapshot kueri → [{ id, ...data }]; snapshot dokumen → { id, ...data } atau null. */
const ubahBawaan = (snap) =>
  snap.docs ? daftarDokumen(snap) : snap.exists() ? { id: snap.id, ...snap.data() } : null;

function beritahuSemua(e) {
  e.pemakai.forEach((f) => f());
}

function mulai(e) {
  e.keadaan = { data: e.keadaan.data, memuat: true, galat: null };
  e.berhenti = pantau(
    e.buatSumber(),
    (snap) => {
      e.keadaan = { data: e.ubah(snap), memuat: false, galat: null };
      beritahuSemua(e);
    },
    {
      pesan: e.pesan,
      diam: e.diam,
      onGalat: (err) => {
        e.berhenti = null; // Firestore menghentikan listener setelah galat; pemakai baru memulai ulang
        e.keadaan = { data: e.keadaan.data, memuat: false, galat: err };
        beritahuSemua(e);
      },
    },
  );
}

function hentikan(kunci, e) {
  clearTimeout(e.timer);
  e.berhenti?.();
  entri.delete(kunci);
}

/**
 * Hentikan listener bersama berkunci `awalan` atau `awalan:…`, mis. sebelum dokumennya dihapus
 * (listener dokumen yang terhapus ditolak rules dan akan memunculkan toast galat).
 */
export function hentikanPantau(awalan) {
  [...entri.entries()].forEach(([kunci, e]) => {
    if (kunci === awalan || kunci.startsWith(`${awalan}:`)) {
      hentikan(kunci, e);
      e.keadaan = KOSONG;
      beritahuSemua(e);
    }
  });
}

/**
 * @param {string|null} kunci  identitas kueri; null = belum siap (mis. belum login / tahun belum dipilih)
 * @param {() => import('firebase/firestore').Query | import('firebase/firestore').DocumentReference} buatSumber
 *   dipanggil saat listener dibuat; harus menghasilkan kueri yang sama untuk kunci yang sama
 * @param {{ ubah?: (snap) => any, tahanMs?: number, pesan?: string, diam?: boolean }} [opsi]
 * @returns {{ data: any, memuat: boolean, galat: Error|null }}
 */
export function usePantauBersama(
  kunci,
  buatSumber,
  { ubah = ubahBawaan, tahanMs = 60_000, pesan, diam = false } = {},
) {
  const subscribe = useCallback(
    (beritahu) => {
      if (!kunci) return () => {};
      let e = entri.get(kunci);
      if (!e) {
        e = { keadaan: MEMUAT, pemakai: new Set(), berhenti: null, timer: null };
        Object.assign(e, { buatSumber, ubah, tahanMs, pesan, diam });
        entri.set(kunci, e);
      }
      clearTimeout(e.timer);
      e.pemakai.add(beritahu);
      if (!e.berhenti) mulai(e);
      return () => {
        e.pemakai.delete(beritahu);
        if (e.pemakai.size === 0 && Number.isFinite(e.tahanMs)) {
          e.timer = setTimeout(() => hentikan(kunci, e), e.tahanMs);
        }
      };
    },
    // buatSumber & opsi dibaca sekali saat listener untuk kunci ini dibuat
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kunci],
  );
  const ambil = () => (kunci ? (entri.get(kunci)?.keadaan ?? MEMUAT) : KOSONG);
  return useSyncExternalStore(subscribe, ambil);
}
