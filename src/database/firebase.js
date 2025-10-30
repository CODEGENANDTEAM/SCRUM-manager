import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// --- Firebase Configuration (REPLACE WITH YOUR ACTUAL KEYS) ---
const firebaseConfig = {
  apiKey: "AIzaSyCQ4cCIfLVrsq2g6ywD6hXaN3Ejt-Vs-H0",
  authDomain: "scrum-93033.firebaseapp.com",
  projectId: "scrum-93033",
  storageBucket: "scrum-93033.firebasestorage.app",
  messagingSenderId: "370355233221",
  appId: "1:370355233221:web:9ce250e19d28c2eecd2bac",
  measurementId: "G-TH34V54YPL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;