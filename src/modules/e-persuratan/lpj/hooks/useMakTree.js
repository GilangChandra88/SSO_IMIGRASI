/**
 * useMakTree — pohon MAK (koleksi `MAK`, diatur di MAK Setup) untuk dropdown bertingkat
 * dan daftar Item per Akun.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export function useMakTree() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getDocs(collection(db, 'MAK'))
      .then((snap) => {
        if (active) setNodes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch((err) => {
        console.error('Gagal memuat MAK:', err);
        if (active) setError('Gagal memuat data MAK.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  return { nodes, byId, loading, error };
}
