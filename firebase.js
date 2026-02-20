import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZPegjeWmi3TS5-TdrHm7onAbi76nclnU",
  authDomain: "ramadan-calendar-2026.firebaseapp.com",
  projectId: "ramadan-calendar-2026",
  storageBucket: "ramadan-calendar-2026.firebasestorage.app",
  messagingSenderId: "555215340324",
  appId: "1:555215340324:web:2caa7780e4d5bf7f0769b1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
