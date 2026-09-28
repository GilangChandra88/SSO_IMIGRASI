import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
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
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userData,
    isSuperAdmin: userRole === 'Super Admin',
    isAdmin: userRole === 'Admin' || userRole === 'Super Admin',
    isDark,
    toggleDarkMode,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
