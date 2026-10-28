/**
 * Pembungkus onSnapshot yang wajib dipakai kode baru (CLAUDE.md 7.1 "Membaca data"):
 * penolakan rules atau galat jaringan tidak pernah ditelan diam-diam — pemanggil diberi tahu
 * lewat onGalat (mis. untuk mematikan loading) dan pengguna melihat toast.
 */
import { onSnapshot } from 'firebase/firestore';
import { showToast } from './toastStore';

const PESAN_BAWAAN = 'Tidak punya akses atau gagal memuat data.';

/**
 * @param {import('firebase/firestore').Query | import('firebase/firestore').DocumentReference} sumber
 * @param {(snap) => void} onData
 * @param {{ onGalat?: (err) => void, pesan?: string, diam?: boolean }} [opsi]
 *   diam: true untuk data pelengkap yang tidak perlu toast (galat tetap diteruskan ke onGalat)
 * @returns {() => void} fungsi berhenti mendengarkan
 */
export function pantau(sumber, onData, { onGalat, pesan = PESAN_BAWAAN, diam = false } = {}) {
  return onSnapshot(sumber, onData, (err) => {
    if (!diam) {
      showToast(
        err?.code === 'permission-denied'
          ? 'Anda tidak punya akses ke data ini.'
          : err?.code === 'failed-precondition'
            ? 'Data belum bisa dimuat: indeks database belum dipasang. Hubungi pemilik proyek.'
            : pesan,
        'error',
      );
    }
    onGalat?.(err);
  });
}

/** Dokumen snapshot kueri → [{ id, ...data }]. */
export const daftarDokumen = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
