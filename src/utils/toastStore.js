/**
 * Toast e-Persuratan (pengganti ToastContext purwarupa). Disimpan di tingkat modul JS supaya
 * notifikasi tetap tampil setelah berpindah halaman (mis. dari form ke Daftar LPJ).
 * Tampilkan dengan <ToastViewport /> di halaman.
 */
import { useSyncExternalStore } from 'react';

let items = [];
const KELUAR_MS = 300; // samakan dengan durasi transisi keluar di ToastViewport
let nextId = 0;
const subscribers = new Set();

const emit = () => subscribers.forEach((fn) => fn());

/** showToast('Draft tersimpan.') atau showToast('Gagal menyimpan.', 'error') */
export function showToast(msg, tipe = 'sukses') {
  const id = ++nextId;
  items = [...items, { id, msg, tipe, keluar: false }];
  emit();
  const lama = tipe === 'error' ? 4500 : 2600;
  // Tandai "keluar" dulu agar ToastViewport sempat menganimasikannya memudar, lalu buang
  setTimeout(() => {
    items = items.map((t) => (t.id === id ? { ...t, keluar: true } : t));
    emit();
  }, lama - KELUAR_MS);
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, lama);
}

function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export const useToastItems = () => useSyncExternalStore(subscribe, () => items);

/** Hook agar pemanggilan sama seperti purwarupa: const showToast = useToast(); */
export const useToast = () => showToast;
