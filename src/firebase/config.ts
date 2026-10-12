import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBy_k45pxZWFjNObKogead1G3fkO4qzAuU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'battleship-13526.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'battleship-13526',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'battleship-13526.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '882537462886',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:882537462886:web:9d98d307321754d3e881a7',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-N2LEVZ3FJF',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY'
);

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | undefined;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);

  // Safely initialize analytics if supported in the current environment
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export { app, auth, db, analytics };
