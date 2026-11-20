import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Paste your Firebase console > Project settings > Your apps > Web app config here
const app = getApps().length ? getApp() : initializeApp({
  apiKey: 'AIzaSyBP-OQQmX-iSRLV3mUhIyClzy1QUQHKWow',
  authDomain: 'ece-confessions.firebaseapp.com',
  projectId: 'ece-confessions',
  storageBucket: 'ece-confessions.firebasestorage.app',
  messagingSenderId: '281163944207',
  appId: '1:281163944207:web:b410f0d850d68e0dafae7a',
});

export const db = getFirestore(app);
let a;
try { a = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
catch (e) { a = getAuth(app); } // already initialised (fast refresh)
export const auth = a;
