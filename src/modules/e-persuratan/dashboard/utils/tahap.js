/** Tahap berkas yang sedang dikerjakan Keuangan (berurutan); Draft & sesudah Arsip tidak termasuk. */
export const TAHAP_PROSES = ['verif', 'sakti', 'transfer', 'arsip'];

/** Tahap sesudah arsip selesai: menunggu DRPP atau sudah masuk DRPP (`lpj_ringkas.tahap`). */
export const TAHAP_DIARSIP = ['drpp', 'selesai'];
