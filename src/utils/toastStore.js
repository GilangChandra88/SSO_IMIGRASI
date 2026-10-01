/**
 * Toast e-Persuratan (pengganti ToastContext purwarupa). Disimpan di tingkat modul JS supaya
 * notifikasi tetap tampil setelah berpindah halaman (mis. dari form ke Daftar LPJ).
 * Tampilkan dengan <ToastViewport /> di halaman.
 */
import { useSyncExternalStore } from 'react';

let items = [];
let nextId = 0;
const subscribers = new Set();

const emit = () => subscribers.forEach((fn) => fn());

/** showToast('Draft tersimpan.') atau showToast('Gagal menyimpan.', 'error') */
export function showToast(msg, tipe = 'sukses') {
  const id = ++nextId;
  items = [...items, { id, msg, tipe }];
  emit();
  setTimeout(
    () => {
      items = items.filter((t) => t.id !== id);
      emit();
    },
    tipe === 'error' ? 4500 : 2600,
  );
}

function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export const useToastItems = () => useSyncExternalStore(subscribe, () => items);

/** Hook agar pemanggilan sama seperti purwarupa: const showToast = useToast(); */
export const useToast = () => showToast;
