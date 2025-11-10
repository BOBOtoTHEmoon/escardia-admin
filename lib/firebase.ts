import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAx6FT5goGyA4QJfA-WEKZbIe_XR7UkvHI",
  authDomain: "escardia-9dc88.firebaseapp.com",
  projectId: "escardia-9dc88",
  storageBucket: "escardia-9dc88.firebasestorage.app",
  messagingSenderId: "301555552169",
  appId: "1:301555552169:web:d13e3ef6e1d0750c4e26f7"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
