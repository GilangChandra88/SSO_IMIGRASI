/**
 * usePegawaiList — daftar pegawai untuk dipilih saat membuat paket LPJ.
 */

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export function usePegawaiList() {
  const [pegawai, setPegawai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getDocs(collection(db, 'pegawai'))
      .then((snap) => {
        if (!active) return;
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.nama)
          .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
        setPegawai(list);
      })
      .catch((err) => {
        console.error('Gagal memuat pegawai:', err);
        if (active) setError('Gagal memuat daftar pegawai. Coba muat ulang halaman.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { pegawai, loading, error };
}
