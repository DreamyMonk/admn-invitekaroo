// Modular Firebase client — production backend for the host dashboard.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Values come from .env.local / Vercel env vars, falling back to the project's
// (public, safe-to-expose) web config so the app also works without env set.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDiNPye-Epm46F1diUxL8nftiL_QSKVe6U",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "invitekaroo-823b3.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "invitekaroo-823b3",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "invitekaroo-823b3.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "934224948749",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:934224948749:web:897b42548e44fcd70c6f44",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-9B21GCLN5D",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
