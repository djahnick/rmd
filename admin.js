import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const elEmail = document.getElementById("email");
const elPassword = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");

const calendarIdEl = document.getElementById("calendarId");
const startDateEl = document.getElementById("startDate");
const daysCountEl = document.getElementById("daysCount");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const resetOpenedBtn = document.getElementById("resetOpenedBtn");
const saveStatus = document.getElementById("saveStatus");

function setStatus(msg) {
  saveStatus.textContent = msg;
}

function getCalendarRef() {
  const id = (calendarIdEl.value || "").trim();
  if (!id) throw new Error("calendarId manquant (ex: ramadan-djahnick-2026)");
  return doc(db, "calendars", id);
}

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, elEmail.value.trim(), elPassword.value);
    setStatus("✅ Connecté.");
  } catch (e) {
    setStatus("❌ Login failed: " + (e?.message || e));
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    setStatus("Déconnecté.");
  } catch (e) {
    setStatus("❌ Logout failed: " + (e?.message || e));
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    authStatus.textContent = `Connecté: ${user.email}`;
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    authStatus.textContent = "Non connecté";
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
});

loadBtn.addEventListener("click", async () => {
  try {
    const ref = getCalendarRef();
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      setStatus("⚠️ Doc inexistant. Clique Enregistrer pour le créer.");
      return;
    }

    const data = snap.data();
    startDateEl.value = data.startDate || "";
    daysCountEl.value = String(data.daysCount || 30);
    setStatus("✅ Chargé depuis Firestore.");
  } catch (e) {
    setStatus("❌ Load failed: " + (e?.message || e));
  }
});

saveBtn.addEventListener("click", async () => {
  try {
    const ref = getCalendarRef();
    const startDate = startDateEl.value;
    const daysCount = Number(daysCountEl.value || 30);

    if (!startDate) throw new Error("startDate manquant (choisis une date).");
    if (![29, 30].includes(daysCount)) throw new Error("daysCount doit être 29 ou 30.");

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        startDate,
        daysCount,
        openedDays: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setStatus("✅ Créé + enregistré.");
    } else {
      await updateDoc(ref, {
        startDate,
        daysCount,
        updatedAt: serverTimestamp()
      });
      setStatus("✅ Enregistré (update).");
    }
  } catch (e) {
    setStatus("❌ Save failed: " + (e?.message || e));
  }
});

resetOpenedBtn.addEventListener("click", async () => {
  try {
    const ref = getCalendarRef();
    await updateDoc(ref, { openedDays: [], updatedAt: serverTimestamp() });
    setStatus("✅ openedDays reset.");
  } catch (e) {
    setStatus("❌ Reset failed: " + (e?.message || e));
  }
});
