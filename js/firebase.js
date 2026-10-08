// Satu-satunya file yang mengimpor Firebase SDK dari CDN.
// Versi dipatok (10.14.1). Kalau mau ganti versi, ubah di sini DAN di sw.js (FIREBASE_BASE).
import { firebaseConfig } from "../config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Cache lokal permanen (IndexedDB): data tetap tampil & bisa diinput saat offline,
// lalu otomatis tersinkron begitu internet kembali.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
export {
  collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
