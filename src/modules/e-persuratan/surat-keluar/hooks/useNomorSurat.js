import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

/** Langganan satu query/dokumen Firestore. */
function useSnapshot(buatRef, olah) {
  const [state, setState] = useState({ data: null, loading: true });
  useEffect(() => {
    const unsub = onSnapshot(
      buatRef(),
      (snap) => setState({ data: olah(snap), loading: false }),
      () => setState((s) => ({ ...s, loading: false })),
    );
    return unsub;
    // ref & pengolah konstan per pemanggil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

const daftarDok = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

/** Node hierarki kode surat (koleksi `nomor surat kanim`). */
export function useKodeSurat() {
  const { data, loading } = useSnapshot(() => collection(db, 'nomor surat kanim'), daftarDok);
  return { nodes: data || [], loading };
}

/** Nomor urut terakhir (`settings/nomor_surat.lastNumber`), dipakai bersama SuratForm. */
export function useNomorTerakhir() {
  const { data, loading } = useSnapshot(
    () => doc(db, 'settings', 'nomor_surat'),
    (snap) => (snap.exists() ? Number(snap.data().lastNumber) || 0 : 0),
  );
  return { lastNumber: data || 0, loading };
}

/** Nomor surat yang diminta lewat form "Tambah Nomor Surat" (`surat_dokumen`, sumber register). */
export function useRegisterNomor() {
  const { data, loading } = useSnapshot(
    () => query(collection(db, 'surat_dokumen'), where('sumber', '==', 'register')),
    daftarDok,
  );
  const rows = useMemo(
    () =>
      [...(data || [])].sort(
        (a, b) =>
          (b.nomorUrut || 0) - (a.nomorUrut || 0) ||
          String(b.createdAt || '').localeCompare(a.createdAt || ''),
      ),
    [data],
  );
  return { rows, loading };
}

/** Riwayat surat dari SuratForm (`surat_perintah` + `surat_dokumen` bernomor), terbaru di atas. */
export function useRiwayatSurat() {
  const sp = useSnapshot(() => collection(db, 'surat_perintah'), daftarDok);
  const dok = useSnapshot(() => collection(db, 'surat_dokumen'), daftarDok);
  const rows = useMemo(() => {
    const semua = [
      ...(sp.data || []),
      ...(dok.data || []).filter((d) => d.nomor && d.sumber !== 'register'),
    ];
    return semua.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [sp.data, dok.data]);
  return { rows, loading: sp.loading || dok.loading };
}
