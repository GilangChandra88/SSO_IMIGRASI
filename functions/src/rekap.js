/**
 * Rekap realisasi anggaran per tahun (`mak_rekap/{tahunAnggaran}`, docs/skema-database.md §5.3):
 * `item.{itemNodeId}.real.{bulan}` dan `item.{itemNodeId}.total` (bilangan bulat rupiah).
 *
 * Rekap diubah di transaksi/batch yang SAMA dengan perubahan mak_realisasi (selesaikanSpby,
 * hapusBerkas, batalkanRealisasi, pulihkanRealisasi) dengan increment: angka tidak bisa menyimpang
 * dari realisasinya dan dokumen rekap tidak perlu dibaca dulu. Pagu tidak disalin ke sini
 * (sumbernya mak_node). Berkas ini bukan Function, jadi tidak ikut diekspor index.js.
 */

const { FieldValue, db, KOLEKSI } = require('./umum');

/**
 * @param {FirebaseFirestore.Transaction | FirebaseFirestore.WriteBatch} tulis
 * @param {Array<{ tahunAnggaran: number, itemNodeId: string, bulan: number, jumlah: number }>} baris
 *   jumlah bertanda: positif saat realisasi aktif, negatif saat dibatalkan
 */
function ubahRekap(tulis, baris) {
  const perTahun = new Map();
  baris.forEach(({ tahunAnggaran, itemNodeId, bulan, jumlah }) => {
    if (!Number.isInteger(jumlah) || !jumlah) return;
    if (!perTahun.has(tahunAnggaran)) perTahun.set(tahunAnggaran, {});
    const item = perTahun.get(tahunAnggaran);
    const e = item[itemNodeId] || (item[itemNodeId] = { real: {}, total: 0 });
    e.real[bulan] = (e.real[bulan] || 0) + jumlah;
    e.total += jumlah;
  });
  perTahun.forEach((item, tahunAnggaran) => {
    const data = { tahunAnggaran, item: {}, diubahPada: FieldValue.serverTimestamp() };
    Object.entries(item).forEach(([id, e]) => {
      data.item[id] = {
        total: FieldValue.increment(e.total),
        real: Object.fromEntries(
          Object.entries(e.real).map(([bulan, j]) => [bulan, FieldValue.increment(j)]),
        ),
      };
    });
    tulis.set(db.collection(KOLEKSI.makRekap).doc(String(tahunAnggaran)), data, { merge: true });
  });
}

module.exports = { ubahRekap };
