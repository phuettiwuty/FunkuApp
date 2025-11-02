// src/firebase/config.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCmltuTY5cp0NuVxEeAuayMakt-6-Df_-4",
  authDomain: "funku-37818.firebaseapp.com",
  projectId: "funku-37818",
  storageBucket: "funku-37818.appspot.com",
  messagingSenderId: "988424483273",
  appId: "1:988424483273:web:81010edc7608038dfc3818"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth (คงโค้ดเดิมของคุณไว้)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);     // <<== เพิ่มบรรทัดนี้

export { app, auth, db, storage };
