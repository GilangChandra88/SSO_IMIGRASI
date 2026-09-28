import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';

// Konfigurasi dibaca dari file .env (lihat .env.example). Jangan menulis nilainya langsung di kode.
const env = import.meta.env;

if (!env.VITE_FIREBASE_API_KEY) {
  throw new Error(
    'Konfigurasi Firebase belum diisi. Salin .env.example menjadi .env, isi nilainya, lalu jalankan ulang "npm run dev".',
  );
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Primary App for normal usage
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, env.VITE_FIREBASE_DATABASE_ID || 'imigrasi');

// Secondary App for creating users without logging out the primary user
export const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
export const secondaryAuth = getAuth(secondaryApp);

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
