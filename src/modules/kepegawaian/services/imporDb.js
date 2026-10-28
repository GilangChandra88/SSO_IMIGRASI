/**
 * Penulisan hasil impor CSV pegawai (utils/imporPegawai.js): jabatan baru dulu, lalu pegawai +
 * kontak per batch. Bila sebuah batch gagal, batch sebelumnya sudah tersimpan; impor aman diulang
 * karena pegawai dicocokkan lewat NIP (baris yang sudah sama dilewati).
 */
import { writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { idJabatanBaru, idPegawaiBaru, tulisJabatanBaru, tulisPegawai } from './pegawaiDb';

const BARIS_PER_BATCH = 150; // ≤ 2 tulis per baris (pegawai + kontak), di bawah batas 500

/**
 * @param {{ baris: object[], jabatanBaru: object[] }} rencana  hasil nilaiImpor
 * @param {(selesai: number, total: number) => void} [onKemajuan]
 * @returns {Promise<{ dibuat: number, diperbarui: number, jabatan: number }>}
 */
export async function jalankanImpor({ baris, jabatanBaru }, uid, onKemajuan) {
  const idJabatan = Object.fromEntries(
    jabatanBaru.map((j) => [`baru:${j.kunci}`, idJabatanBaru()]),
  );
  for (let i = 0; i < jabatanBaru.length; i += BARIS_PER_BATCH * 2) {
    const batch = writeBatch(db);
    jabatanBaru
      .slice(i, i + BARIS_PER_BATCH * 2)
      .forEach((j) => tulisJabatanBaru(batch, idJabatan[`baru:${j.kunci}`], j, uid));
    await batch.commit();
  }

  const tulis = baris.filter((r) => r.aksi === 'baru' || r.aksi === 'perbarui');
  let selesai = 0;
  onKemajuan?.(0, tulis.length);
  for (let i = 0; i < tulis.length; i += BARIS_PER_BATCH) {
    const batch = writeBatch(db);
    tulis.slice(i, i + BARIS_PER_BATCH).forEach((r) => {
      const data = { ...r.data, jabatanId: idJabatan[r.data.jabatanId] || r.data.jabatanId };
      tulisPegawai(batch, data, r.id || idPegawaiBaru(), uid, {
        baru: !r.id,
        kontak: r.kontak,
        kontakAda: r.kontakAda,
      });
    });
    await batch.commit();
    selesai = Math.min(tulis.length, i + BARIS_PER_BATCH);
    onKemajuan?.(selesai, tulis.length);
  }
  return {
    dibuat: tulis.filter((r) => !r.id).length,
    diperbarui: tulis.filter((r) => r.id).length,
    jabatan: jabatanBaru.length,
  };
}
