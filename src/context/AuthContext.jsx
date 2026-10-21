import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext({});

/** Peran yang tersedia (nilai persis, lihat CLAUDE.md). */
const ROLES = ['Super Admin', 'Admin', 'Pegawai'];

// Mode "lihat sebagai" Super Admin disimpan per tab; login ulang kembali ke Super Admin
const VIEW_AS_KEY = 'viewAsRole';
const bacaViewAs = () => {
  try {
    const v = sessionStorage.getItem(VIEW_AS_KEY);
    return ROLES.includes(v) ? v : null;
  } catch {
    return null;
  }
};

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  // Peran asli dari dokumen pegawai (tidak pernah diubah oleh mode "lihat sebagai")
  const [userRole, setUserRole] = useState(null);
  const [viewAsRole, setViewAsRoleState] = useState(bacaViewAs);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dark Mode State
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    const isCurrentlyDark = saved === 'true' || document.documentElement.classList.contains('dark');
    if (isCurrentlyDark) document.documentElement.classList.add('dark');
    return isCurrentlyDark;
  });

  const applyTheme = (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleDarkMode = async () => {
    const newDark = !isDark;
    setIsDark(newDark);
    applyTheme(newDark);
    localStorage.setItem('darkMode', String(newDark));

    // Save to Firestore if logged in
    if (currentUser && currentUser.email) {
      try {
        const settingsRef = doc(db, 'userSettings', currentUser.email);
        await setDoc(settingsRef, { darkMode: newDark }, { merge: true });
      } catch (error) {
        console.error('Error saving dark mode setting:', error);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch User Settings (Dark Mode)
        try {
          const settingsRef = doc(db, 'userSettings', user.email);
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            const darkPref = settingsSnap.data().darkMode;
            setIsDark(darkPref);
            applyTheme(darkPref);
            localStorage.setItem('darkMode', String(darkPref));
          }
        } catch (err) {
          console.error('Error fetching settings:', err);
        }

        if (user.email && user.email.toLowerCase() === 'bakmiekt@gmail.com') {
          setUserRole('Super Admin');
          setUserData({ nama: 'Master Admin', email: user.email });
        } else {
          try {
            const q = query(collection(db, 'pegawai'), where('email', '==', user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const data = querySnapshot.docs[0].data();
              setUserRole(data.role || 'Pegawai');
              setUserData({ ...data, id: querySnapshot.docs[0].id });
            } else {
              setUserRole('Pegawai');
              setUserData({ email: user.email });
            }
          } catch (error) {
            console.error('Error fetching user role:', error);
            setUserRole('Pegawai');
          }
        }
      } else {
        setUserRole(null);
        setUserData(null);
        setViewAsRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  /**
   * Super Admin dapat menjelajahi aplikasi sebagai peran lain (tampilan & aksi mengikuti peran
   * itu) tanpa kehilangan peran aslinya. null = kembali ke peran asli. Hanya di sisi klien.
   */
  function setViewAsRole(role) {
    const v = ROLES.includes(role) && role !== 'Super Admin' ? role : null;
    setViewAsRoleState(v);
    try {
      if (v) sessionStorage.setItem(VIEW_AS_KEY, v);
      else sessionStorage.removeItem(VIEW_AS_KEY);
    } catch {
      // penyimpanan sesi tidak tersedia: mode hanya berlaku sampai halaman dimuat ulang
    }
  }

  const isRealSuperAdmin = userRole === 'Super Admin';
  // Peran efektif yang dipakai seluruh aplikasi
  const role = isRealSuperAdmin && viewAsRole ? viewAsRole : userRole;

  const value = {
    currentUser,
    userRole: role,
    realRole: userRole,
    isRealSuperAdmin,
    viewAsRole: isRealSuperAdmin ? viewAsRole : null,
    setViewAsRole,
    roles: ROLES,
    userData,
    isSuperAdmin: role === 'Super Admin',
    isAdmin: role === 'Admin' || role === 'Super Admin',
    isDark,
    toggleDarkMode,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
