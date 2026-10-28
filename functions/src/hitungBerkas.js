/**
 * Hitungan dari isi berkas LPJ yang dipakai beberapa Function (lpj.js & drpp.js). Bukan
 * Function, jadi tidak ikut diekspor index.js.
 */

const perjadin = (d) => d.jenis === 'perjadin';
const transaksiDari = (d) => (perjadin(d) ? d.lpj?.transaksi : d.spby?.transaksi) || [];

/** Total transaksi setelah koreksi Keuangan (`verifikasi.koreksi[itemAsli].jumlah`). */
function totalVerifikasiDari(d, k) {
  const perItem = {};
  transaksiDari(d).forEach((t) => {
    if (Number.isInteger(t?.jumlah)) perItem[t.itemNodeId] = (perItem[t.itemNodeId] || 0) + t.jumlah;
  });
  const koreksi = k?.verifikasi?.koreksi || {};
  return Object.entries(perItem).reduce(
    (s, [id, j]) => s + (Number.isInteger(koreksi[id]?.jumlah) ? koreksi[id].jumlah : j),
    0,
  );
}

/** Isi `lpj_drpp.masuk.{berkasId}` untuk berkas yang sudah masuk DRPP. */
const masukDrppDari = (d, k) => ({ nomorLpj: d.nomorLpj || '', total: totalVerifikasiDari(d, k) });

module.exports = { perjadin, transaksiDari, totalVerifikasiDari, masukDrppDari };
