import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const email = document.getElementById("email");
const password = document.getElementById("password");
const login = document.getElementById("login");
const status = document.getElementById("status");

const calendarId = document.getElementById("calendarId");
const startDate = document.getElementById("startDate");
const daysCount = document.getElementById("daysCount");
const loadBtn = document.getElementById("load");
const saveBtn = document.getElementById("save");
const calStatus = document.getElementById("calStatus");

const json = document.getElementById("json");
const saveJson = document.getElementById("saveJson");
const exportJson = document.getElementById("exportJson");
const jsonStatus = document.getElementById("jsonStatus");

function ref() {
  const id = (calendarId.value || "").trim();
  if (!id) throw new Error("calendarId manquant");
  return doc(db, "calendars", id);
}

onAuthStateChanged(auth, (user) => {
  status.textContent = user ? `Connecté: ${user.email}` : "Non connecté";
});

login.onclick = async () => {
  await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
};

loadBtn.onclick = async () => {
  try {
    const snap = await getDoc(ref());
    if (!snap.exists()) { calStatus.textContent = "Doc introuvable (crée-le avec Enregistrer)."; return; }
    const data = snap.data();
    startDate.value = data.startDate || "";
    daysCount.value = String(data.daysCount || 30);
    calStatus.textContent = "Chargé.";
    const dc = Array.isArray(data.daysContent) ? data.daysContent : [];
    json.value = dc.length ? JSON.stringify(dc, null, 2) : "";
    jsonStatus.textContent = dc.length ? `daysContent: ${dc.length} items` : "daysContent vide";
  } catch (e) {
    calStatus.textContent = "Erreur: " + (e?.message || e);
  }
};

saveBtn.onclick = async () => {
  try {
    const id = (calendarId.value || "").trim();
    if (!id) throw new Error("calendarId manquant");
    if (!startDate.value) throw new Error("startDate manquant");
    const dc = Number(daysCount.value || 30);
    if (![29,30].includes(dc)) throw new Error("daysCount doit être 29 ou 30");

    // MERGE => ne détruit pas daysContent
    await setDoc(ref(), { startDate: startDate.value, daysCount: dc }, { merge: true });
    calStatus.textContent = "✅ Enregistré (merge).";
  } catch (e) {
    calStatus.textContent = "❌ " + (e?.message || e);
  }
};

saveJson.onclick = async () => {
  try {
    const raw = (json.value || "").trim();
    if (!raw) throw new Error("JSON vide");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error("JSON doit être un tableau");
    await updateDoc(ref(), { daysContent: arr });
    jsonStatus.textContent = `✅ JSON enregistré (${arr.length} items).`;
  } catch (e) {
    jsonStatus.textContent = "❌ " + (e?.message || e);
  }
};

exportJson.onclick = async () => {
  try {
    const snap = await getDoc(ref());
    if (!snap.exists()) throw new Error("Doc introuvable");
    const data = snap.data();
    const dc = Array.isArray(data.daysContent) ? data.daysContent : [];
    json.value = JSON.stringify(dc, null, 2);
    jsonStatus.textContent = `✅ Exporté (${dc.length} items).`;
  } catch (e) {
    jsonStatus.textContent = "❌ " + (e?.message || e);
  }
};
