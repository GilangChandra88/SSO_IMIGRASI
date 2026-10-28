import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Konfigurasi dibaca dari .env / .env.local (lihat .env.example). Jangan menulis nilainya di kode.
const env = import.meta.env;

if (!env.VITE_FIREBASE_API_KEY) {
  throw new Error(
    'Konfigurasi Firebase belum diisi. Salin .env.example menjadi .env.local, isi nilainya, lalu jalankan ulang "npm run dev".',
  );
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** Region Cloud Functions; sama dengan Firestore & Storage (docs/skema-database.md §1). */
export const REGION_FUNCTIONS = 'asia-southeast2';

const pakaiEmulator = env.DEV && env.VITE_FIREBASE_EMULATOR === 'true';

export const app = initializeApp(firebaseConfig);

// App Check (reCAPTCHA Enterprise) harus dipasang sebelum layanan lain dipakai. Tanpa kunci situs
// (mis. saat memakai Emulator) App Check dilewati; di produksi kunci wajib diisi dan penegakan
// diaktifkan di Console (docs/rencana-pembersihan-firebase.md langkah A7).
if (env.VITE_FIREBASE_APPCHECK_SITE_KEY && !pakaiEmulator) {
  if (env.DEV && env.VITE_FIREBASE_APPCHECK_DEBUG === 'true') {
    // Token debug untuk localhost; daftarkan token yang tercetak di Console App Check.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(env.VITE_FIREBASE_APPCHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
// Database (default) — satu-satunya database Firestore proyek.
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, REGION_FUNCTIONS);

if (pakaiEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
