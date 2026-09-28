/**
 * useSuratDefinitions — Custom Hook
 * ===================================
 * Mengambil data definisi surat dari Firestore (surat_definitions).
 * Jika Firestore belum punya data, otomatis fallback ke registry lokal.
 *
 * Juga mengambil statistik instance per jenis surat dari surat_instances
 * untuk menampilkan load/status di node Flow diagram.
 */

import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SURAT_REGISTRY } from '@/data/surat';

/**
 * @returns {{
 *   suratList: object[],        // list surat dengan stats
 *   loading: boolean,
 *   error: string|null,
 *   syncToFirestore: () => Promise<void>,
 *   isSynced: boolean
 * }}
 */
export function useSuratDefinitions() {
  const [definitions, setDefinitions] = useState([]);
  const [instanceStats, setInstanceStats] = useState({}); // { suratId: { active, total, thisMonth } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSynced, setIsSynced] = useState(false);

  // ── Subscribe ke surat_definitions ──────────────────────────────────────────
  useEffect(() => {
    setLoading(true);

    const unsub = onSnapshot(
      collection(db, 'surat_definitions'),
      (snapshot) => {
        if (snapshot.empty) {
          setDefinitions(SURAT_REGISTRY);
          setIsSynced(false);
        } else {
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          const mergedIds = new Set(data.map((s) => s.id));
          const localOnly = SURAT_REGISTRY.filter((s) => !mergedIds.has(s.id));
          setDefinitions([...data, ...localOnly]);
          setIsSynced(true);
        }
        setLoading(false);
      },
      (err) => {
        console.error('useSuratDefinitions: definitions error:', err);
        setDefinitions(SURAT_REGISTRY);
        setError('Gagal memuat dari server, menampilkan data lokal.');
        setLoading(false);
      },
    );

    return unsub;
  }, []);

  // ── Subscribe ke surat_instances untuk statistik load ───────────────────────
  useEffect(() => {
    // Ambil instance yang dibuat dalam 30 hari terakhir
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const instanceQuery = query(
      collection(db, 'surat_instances'),
      where('createdAt', '>=', thirtyDaysAgo),
    );

    const unsub = onSnapshot(
      instanceQuery,
      (snapshot) => {
        const stats = {};

        snapshot.docs.forEach((d) => {
          const data = d.data();
          const defId = data.definitionId;
          if (!defId) return;

          if (!stats[defId]) {
            stats[defId] = { active: 0, total: 0, thisMonth: 0 };
          }

          stats[defId].total += 1;
          stats[defId].thisMonth += 1;

          if (data.status === 'pending' || data.status === 'draft') {
            stats[defId].active += 1;
          }
        });

        setInstanceStats(stats);
      },
      (err) => {
        // Instance stats bukan critical — tidak perlu error UI
        console.warn('useSuratDefinitions: instance stats error (non-critical):', err);
      },
    );

    return unsub;
  }, []);

  // ── Gabungkan definitions + stats ───────────────────────────────────────────
  const suratList = definitions.map((surat) => ({
    ...surat,
    stats: instanceStats[surat.id] || { active: 0, total: 0, thisMonth: 0 },
  }));

  // ── Sync registry lokal → Firestore ─────────────────────────────────────────
  const syncToFirestore = async () => {
    try {
      const promises = SURAT_REGISTRY.map((surat) =>
        setDoc(
          doc(db, 'surat_definitions', surat.id),
          {
            ...surat,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true },
        ),
      );
      await Promise.all(promises);
      setIsSynced(true);
    } catch (err) {
      console.error('syncToFirestore error:', err);
      throw err;
    }
  };

  return { suratList, loading, error, syncToFirestore, isSynced };
}
