import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { KOLEKSI } from '@/config/koleksi';
import { pantau } from '@/utils/pantau';
import { keluarAkun } from '@/utils/keluarAkun';
import { PERAN, PILIHAN_LIHAT_SEBAGAI, labelPeran, peranDariKlaim } from '@/utils/peran';

/**
 * Identitas & peran pengguna. Peran HANYA dibaca dari custom claims token login
 * ({ peran, aktif, pegawaiId, wajibGantiSandi }) yang ditulis Cloud Function — tidak pernah dari
 * dokumen yang bisa ditulis klien (docs/rencana-keamanan-efisiensi-firebase.md K2, K3, K18).
 * Pengecekan di sini hanya untuk tampilan; penjaga sebenarnya adalah rules & Functions.
 *
 * statusAkun: 'memuat' | 'keluar' | 'belumTerdaftar' (login tanpa claim aktif) | 'aktif'
 */
const AuthContext = createContext({});

// Mode "lihat sebagai" Super Admin disimpan per tab; login ulang kembali ke Super Admin
const VIEW_AS_KEY = 'viewAsRole';
const bacaViewAs = () => {
  try {
    const v = sessionStorage.getItem(VIEW_AS_KEY);
    return PILIHAN_LIHAT_SEBAGAI.includes(v) ? v : null;
  } catch {
    return null;
  }
};

const terapkanTema = (gelap) => document.documentElement.classList.toggle('dark', !!gelap);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [klaim, setKlaim] = useState(null);
  const [statusAkun, setStatusAkun] = useState('memuat');
  const [userData, setUserData] = useState(null);
  const [viewAsRole, setViewAsRoleState] = useState(bacaViewAs);
  const klaimRef = useRef(null);

  const [isDark, setIsDark] = useState(() => {
    let simpan = null;
    try {
      simpan = localStorage.getItem('darkMode');
    } catch {
      // penyimpanan lokal tidak tersedia
    }
    const gelap = simpan === 'true' || document.documentElement.classList.contains('dark');
    terapkanTema(gelap);
    return gelap;
  });

  const ubahTema = (gelap) => {
    setIsDark(gelap);
    terapkanTema(gelap);
    try {
      localStorage.setItem('darkMode', String(gelap));
    } catch {
      // abaikan
    }
  };

  const toggleDarkMode = async () => {
    const gelap = !isDark;
    ubahTema(gelap);
    if (currentUser && statusAkun === 'aktif') {
      try {
        await setDoc(doc(db, KOLEKSI.penggunaPreferensi, currentUser.uid), {
          modeGelap: gelap,
          diubahPada: serverTimestamp(),
        });
      } catch {
        // preferensi tampilan bukan data penting; cukup tersimpan di browser ini
      }
    }
  };

  /** Ambil ulang token (mis. setelah peran diubah atau kata sandi diganti) agar claims terbaru. */
  const segarkanToken = async () => {
    if (auth.currentUser) await auth.currentUser.getIdToken(true);
  };

  // 1) Token login → claims
  useEffect(() => {
    return onIdTokenChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        klaimRef.current = null;
        setKlaim(null);
        setUserData(null);
        setStatusAkun('keluar');
        setViewAsRole(null);
        return;
      }
      try {
        const { claims } = await user.getIdTokenResult();
        klaimRef.current = claims;
        setKlaim(claims);
        setStatusAkun(
          claims.aktif === true && typeof claims.pegawaiId === 'string'
            ? 'aktif'
            : 'belumTerdaftar',
        );
      } catch {
        setKlaim(null);
        setStatusAkun('belumTerdaftar');
      }
    });
  }, []);

  // 2) Dokumen pegawai sendiri: data tampilan + sinyal bila peran/status diubah admin
  const pegawaiId = statusAkun === 'aktif' ? klaim?.pegawaiId : null;
  useEffect(() => {
    if (!pegawaiId) return undefined;
    return pantau(
      doc(db, KOLEKSI.pegawai, pegawaiId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setUserData({ id: snap.id, ...data });
        if (data.aktif === false) {
          keluarAkun();
          return;
        }
        const peranToken = peranDariKlaim(klaimRef.current).join(',');
        const peranDok = peranDariKlaim({ peran: data.peran }).join(',');
        if (peranToken !== peranDok) segarkanToken().catch(() => {});
      },
      { diam: true },
    );
  }, [pegawaiId]);

  // 3) Preferensi mode gelap milik akun ini
  const uid = statusAkun === 'aktif' ? currentUser?.uid : null;
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, KOLEKSI.penggunaPreferensi, uid))
      .then((snap) => {
        if (snap.exists() && typeof snap.data().modeGelap === 'boolean')
          ubahTema(snap.data().modeGelap);
      })
      .catch(() => {});
  }, [uid]);

  /**
   * Super Admin dapat menjelajahi aplikasi sebagai peran lain (tampilan mengikuti peran itu) tanpa
   * kehilangan peran aslinya. null = kembali ke peran asli. Hanya tampilan: rules & Functions tetap
   * memakai peran asli, jadi mode ini BUKAN alat uji keamanan.
   */
  function setViewAsRole(role) {
    const v = PILIHAN_LIHAT_SEBAGAI.includes(role) && role !== PERAN.superadmin ? role : null;
    setViewAsRoleState(v);
    try {
      if (v) sessionStorage.setItem(VIEW_AS_KEY, v);
      else sessionStorage.removeItem(VIEW_AS_KEY);
    } catch {
      // penyimpanan sesi tidak tersedia: mode hanya berlaku sampai halaman dimuat ulang
    }
  }

  const peranAsli = statusAkun === 'aktif' ? peranDariKlaim(klaim) : [];
  const isRealSuperAdmin = peranAsli.includes(PERAN.superadmin);
  // Peran efektif yang dipakai tampilan ("lihat sebagai" = satu peran saja)
  const peran =
    isRealSuperAdmin && viewAsRole ? (viewAsRole === 'pegawai' ? [] : [viewAsRole]) : peranAsli;
  const isSuperAdmin = peran.includes(PERAN.superadmin);
  // Super Admin selalu memiliki hak semua peran khusus
  const punyaPeran = (r) => isSuperAdmin || peran.includes(r);

  const value = {
    currentUser,
    statusAkun,
    wajibGantiSandi: statusAkun === 'aktif' && klaim?.wajibGantiSandi === true,
    segarkanToken,
    peran,
    punyaPeran,
    // Teks peran efektif untuk tampilan, mis. "Keuangan, Umum"
    userRole: labelPeran(peran),
    realRole: statusAkun === 'aktif' ? labelPeran(peranAsli) : null,
    isRealSuperAdmin,
    viewAsRole: isRealSuperAdmin ? viewAsRole : null,
    setViewAsRole,
    roles: PILIHAN_LIHAT_SEBAGAI,
    // ID dokumen pegawai milik akun ini (dari claims), tersedia sebelum userData termuat
    pegawaiId,
    userData,
    isSuperAdmin,
    isKeuangan: punyaPeran(PERAN.keuangan),
    isKepegawaian: punyaPeran(PERAN.kepegawaian),
    isUmum: punyaPeran(PERAN.umum),
    isDark,
    toggleDarkMode,
  };

  return (
    <AuthContext.Provider value={value}>{statusAkun !== 'memuat' && children}</AuthContext.Provider>
  );
}
