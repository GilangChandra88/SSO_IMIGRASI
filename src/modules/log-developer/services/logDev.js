/**
 * Pemanggil Function Log Developer (functions/src/logdev.js). Modul ini TIDAK membaca Firestore
 * langsung: rules menolak semua koleksi jejak sistem untuk browser, termasuk Super Admin.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

const fn = (nama) => async (data) => (await httpsCallable(functions, nama)(data)).data;

/** { tampilan, saring, setelah, ukuran } → { daftar?, habis?, nama, server, ... }. */
export const bacaLog = fn('bacaLogDev');
export const bukaKunci = fn('bukaKunciLogDev');
export const tinjauAnomali = fn('tinjauAnomali');
export const tinjauGalat = fn('tinjauGalat');
export const aturAmbang = fn('aturAmbangLogDev');
export const aturTarif = fn('aturTarifLogDev');
export const jalankanPemeriksaan = fn('jalankanPemeriksaan');

/** Galat dari server yang berarti kata sandi harus diketik ulang. */
export const perluKunciUlang = (err) => err?.message === 'KUNCI_ULANG';
