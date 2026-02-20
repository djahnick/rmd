import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const PARIS_TZ = "Europe/Paris";
const DEFAULT_ID = "ramadan-1447";

function parisYMD(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date); // YYYY-MM-DD
}
function parseYMD(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function diffDays(aYMD, bYMD) {
  const a = parseYMD(aYMD);
  const b = parseYMD(bYMD);
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}
function getCalendarId() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("id") || DEFAULT_ID).trim();
}

// local storage (per calendar id)
function key(id) { return `ramadan_opened_${id}`; }
function getOpened(id) {
  try { return JSON.parse(localStorage.getItem(key(id)) || "[]"); }
  catch { return []; }
}
function setOpened(id, arr) {
  localStorage.setItem(key(id), JSON.stringify(arr));
}

/* =======================
   UI (safe refs)
======================= */
const subtitle = document.getElementById("subtitle");
const beforePanel = document.getElementById("beforePanel");
const calendarPanel = document.getElementById("calendarPanel");
const countdown = document.getElementById("countdown");
const dayInfo = document.getElementById("dayInfo");
const progressText = document.getElementById("progressText");
const progressBarFill = document.getElementById("progressBarFill");
const goTodayBtn = document.getElementById("goTodayBtn");
const grid = document.getElementById("grid");

// modal
const modal = document.getElementById("modal");
const backdrop = document.getElementById("backdrop");
const closeBtn = document.getElementById("closeBtn");
const mTitle = document.getElementById("mTitle");
const mStatus = document.getElementById("mStatus");
const mVerse = document.getElementById("mVerse");
const mRef = document.getElementById("mRef");
const duaText = document.getElementById("duaText");
const duaRef = document.getElementById("duaRef");
const mAction = document.getElementById("mAction");
const noteBlock = document.getElementById("noteBlock");
const mNote = document.getElementById("mNote");

function closeModal() { modal?.classList.add("hidden"); }
backdrop?.addEventListener("click", closeModal);
closeBtn?.addEventListener("click", closeModal);

function statusMeta(state) {
  if (state === "opened") return { text: "✅ Ouvert", cls: "pill opened" };
  if (state === "today") return { text: "✨ Aujourd’hui", cls: "pill today" };
  if (state === "openable") return { text: "📩 Accessible", cls: "pill openable" };
  return { text: "🔒 Bloqué", cls: "pill locked" };
}

function cardClass(state) {
  if (state === "opened") return "day is-opened";
  if (state === "openable") return "day is-openable";
  if (state === "today") return "day is-today";
  return "day is-locked";
}

function buttonMeta(state) {
  if (state === "locked") return { text: "Reviens plus tard", cls: "btn secondary", disabled: true };
  if (state === "opened") return { text: "Relire", cls: "btn primary", disabled: false };
  return { text: "Ouvrir", cls: "btn primary", disabled: false }; // today/openable
}

function openModal(day, content, state) {
  mTitle.textContent = `Jour ${day}`;
  const sm = statusMeta(state);
  if (mStatus) {
    mStatus.className = sm.cls + " pill-soft";
    mStatus.textContent = sm.text;
  }

  mVerse.textContent = (content?.verseFr || content?.verseText || "").trim();
  mRef.textContent = content?.verseRef || "";

  duaText.textContent = content?.duaText || "";
  duaRef.textContent = content?.duaRef || "";

  mAction.textContent = content?.goodDeedText || "";

  const note = (content?.note || "").trim();
  if (note) {
    noteBlock.style.display = "block";
    mNote.textContent = note;
  } else {
    noteBlock.style.display = "none";
    mNote.textContent = "";
  }

  modal?.classList.remove("hidden");
}

function scrollToToday(dayIndex, daysCount) {
  const safeDay = Math.min(Math.max(dayIndex, 1), daysCount);
  const el = document.querySelector(`[data-day="${safeDay}"]`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* =======================
   Main
======================= */
(async function main() {
  const id = getCalendarId();
  if (subtitle) subtitle.textContent = `Lien: ${id}`;

  const snap = await getDoc(doc(db, "calendars", id));
  if (!snap.exists()) {
    if (beforePanel) beforePanel.style.display = "block";
    if (calendarPanel) calendarPanel.style.display = "none";
    if (countdown) countdown.textContent = "Calendrier introuvable. Vérifie l’ID du lien.";
    return;
  }

  const data = snap.data();
  const startDate = data.startDate;
  const daysCount = Number(data.daysCount || 30);
  const daysContent = Array.isArray(data.daysContent) ? data.daysContent : [];
  const byDay = new Map(daysContent.map((x) => [Number(x.day), x]));

  if (!startDate) {
    if (beforePanel) beforePanel.style.display = "block";
    if (calendarPanel) calendarPanel.style.display = "none";
    if (countdown) countdown.textContent = "startDate manquant (admin).";
    return;
  }

  const today = parisYMD(new Date());
  const dayIndex = diffDays(startDate, today) + 1; // startDate=>1
  const opened = getOpened(id);

  // Avant Ramadan
  if (dayIndex < 1) {
    if (beforePanel) beforePanel.style.display = "block";
    if (calendarPanel) calendarPanel.style.display = "none";
    const daysLeft = diffDays(today, startDate);
    if (countdown) {
      countdown.textContent =
        daysLeft === 1
          ? "Il reste 1 jour avant le Ramadan."
          : `Il reste ${daysLeft} jours avant le Ramadan.`;
    }
    return;
  }

  // Pendant / Après
  if (beforePanel) beforePanel.style.display = "none";
  if (calendarPanel) calendarPanel.style.display = "block";

  const safeDay = Math.min(Math.max(dayIndex, 1), daysCount);
  if (dayInfo) dayInfo.textContent = dayIndex > daysCount ? "Après Ramadan" : `Aujourd’hui: Jour ${safeDay}`;

  const pct = Math.min(100, Math.round((opened.length / daysCount) * 100));
  if (progressText) progressText.textContent = `${opened.length}/${daysCount} ouverts`;
  if (progressBarFill) progressBarFill.style.width = `${pct}%`;

  // bouton "aller à aujourd'hui"
  if (goTodayBtn) {
    const show = dayIndex >= 1 && dayIndex <= daysCount;
    goTodayBtn.style.display = show ? "inline-flex" : "none";
    goTodayBtn.onclick = () => scrollToToday(dayIndex, daysCount);
  }

  if (!grid) return;
  grid.innerHTML = "";

  for (let d = 1; d <= daysCount; d++) {
    const isFuture = dayIndex <= daysCount && d > dayIndex;
    const isOpened = opened.includes(d);

    let state = "locked";
    if (isFuture) state = "locked";
    else if (isOpened) state = "opened";
    else if (d === dayIndex && dayIndex <= daysCount) state = "today";
    else state = "openable"; // rattrapage / après

    const div = document.createElement("div");
    div.className = cardClass(state);
    div.dataset.day = String(d);

    // Header
    const header = document.createElement("div");
    header.className = "dayHeader";

    const titleWrap = document.createElement("div");
    titleWrap.className = "dayTitle";

    const moon = document.createElement("span");
    moon.className = "moon";
    moon.textContent = "🌙";

    const titleText = document.createElement("div");
    titleText.className = "dayTitleText";
    titleText.textContent = `Jour ${d}`;

    titleWrap.appendChild(moon);
    titleWrap.appendChild(titleText);

    const sm = statusMeta(state);
    const pill = document.createElement("span");
    pill.className = sm.cls;
    pill.textContent = sm.text;

    header.appendChild(titleWrap);
    header.appendChild(pill);

    // Button
    const bm = buttonMeta(state);
    const btn = document.createElement("button");
    btn.className = bm.cls;
    btn.textContent = bm.text;
    btn.disabled = bm.disabled;

    btn.addEventListener("click", () => {
      if (state === "locked") return;

      const content = byDay.get(d) || {
        verseFr: "Contenu non défini",
        verseRef: "",
        duaText: "",
        duaRef: "",
        goodDeedText: "",
        note: "",
      };

      openModal(d, content, state);

      if (!opened.includes(d)) {
        opened.push(d);
        setOpened(id, opened);

        // UI update
        const newPct = Math.min(100, Math.round((opened.length / daysCount) * 100));
        if (progressText) progressText.textContent = `${opened.length}/${daysCount} ouverts`;
        if (progressBarFill) progressBarFill.style.width = `${newPct}%`;

        // switch state to opened visually
        const nsm = statusMeta("opened");
        pill.className = nsm.cls;
        pill.textContent = nsm.text;
        div.className = cardClass("opened");
        btn.textContent = "Relire";
      }
    });

    div.appendChild(header);
    div.appendChild(btn);
    grid.appendChild(div);
  }
})();