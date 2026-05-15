import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Fill in your Firebase project config before running the app.
// Steps:
//   1. Go to https://console.firebase.google.com
//   2. Create project "nfl-pickems-2026"
//   3. Enable Firestore (test mode) and Anonymous Authentication
//   4. Project Settings > General > Your Apps > Add Web App
//   5. Copy the firebaseConfig object and paste it below
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB2vPsjgR2QPYbVPVh1zu68D8DEuxG3k9w",
  authDomain: "nfl-pickems-2026.firebaseapp.com",
  projectId: "nfl-pickems-2026",
  storageBucket: "nfl-pickems-2026.firebasestorage.app",
  messagingSenderId: "636807129541",
  appId: "1:636807129541:web:b628eb4aa7fdf91193c3ac",
  measurementId: "G-MEWBZ1T9PS"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
