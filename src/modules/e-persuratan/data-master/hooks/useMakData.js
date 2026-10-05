import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

/** Langganan koleksi Firestore; mengembalikan { data, loading, error }. */
function useKoleksi(buatQuery) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    const unsub = onSnapshot(
      buatQuery(),
      (snap) =>
        setState({
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          loading: false,
          error: null,
        }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
    return unsub;
    // buatQuery konstan per pemanggil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

/** Node pohon MAK (koleksi `MAK`). */
export const useMakNodes = () => useKoleksi(() => collection(db, 'MAK'));

/** Riwayat realisasi (koleksi `MAK_History`), terbaru di atas. */
export function useMakHistory() {
  const state = useKoleksi(() => collection(db, 'MAK_History'));
  const data = useMemo(
    () =>
      [...state.data].sort((a, b) => String(b.createdAt || '').localeCompare(a.createdAt || '')),
    [state.data],
  );
  return { ...state, data };
}
