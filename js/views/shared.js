// Markup pieces used by more than one screen.

import { escapeHtml, formatDate } from "../dom.js";
import { store } from "../context.js";
import { dateFromKey, exerciseById, exerciseLabels, fullName, mainEquipment, setupWords } from "../model.js";

export const locationLabel = (group) => (group === "home" ? "Home" : "Gym");

export const videoUrl = (videoId) => `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

// ---------- drawing an exercise ----------
// Everywhere an exercise is named it is drawn the same way: the movement, with
// its setup beside it. Settings → Exercise version picks how the equipment shows:
// as a word in the grey setup ("Lat pulldown  Machine · Overhand") or as a
// coloured letter in front of the name. The rest of the setup is always grey text.

const TAGS = {
  "smith-machine": ["Smith", "S"], "plate-loaded": ["Plate-loaded", "P"], machine: ["Machine", "M"], "ez-bar": ["EZ bar", "E"], barbell: ["Barbell", "B"],
  dumbbells: ["Dumbbell", "D"], kettlebell: ["Kettlebell", "K"], cable: ["Cable", "C"], band: ["Band", ""],
};
const capitalised = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const lettersOn = () => exerciseLabels(store.getState()) === "letter";

function letterMarkup(exercise) {
  const equipment = mainEquipment(exercise);
  const letter = lettersOn() ? TAGS[equipment]?.[1] : "";
  return letter ? `<span class="kind kind-${equipment}" aria-hidden="true">${letter}</span>` : "";
}

// The grey words after the name: the equipment (unless its letter is shown), then the rest.
function setupText(exercise) {
  const tag = TAGS[mainEquipment(exercise)];
  const equipment = tag && !(lettersOn() && tag[1]) ? [tag[0]] : [];
  return [...equipment, ...setupWords(exercise).map(capitalised)].join(" · ");
}

// The letter never ends a line on its own: it stays with the first word of the name.
function lettered(exercise, name, letters = letterMarkup(exercise)) {
  if (!letters) return escapeHtml(name);
  const [first, ...rest] = name.split(" ");
  return `<span class="nowrap">${letters}${escapeHtml(first)}</span>${rest.length ? ` ${escapeHtml(rest.join(" "))}` : ""}`;
}

const setupMarkup = (text) => (text ? ` <span class="version">${escapeHtml(text)}</span>` : "");

// One exercise: [letter] Name setup. A deleted exercise shows the name its sets were saved under.
export function exerciseMarkup(exercise, savedName = "Missing exercise") {
  if (!exercise) return escapeHtml(savedName);
  return `${lettered(exercise, exercise.name)}${setupMarkup(setupText(exercise))}`;
}

// One version under its movement's name in the Library: the setup alone, equipment spelled out.
export function versionMarkup(exercise) {
  const words = [TAGS[mainEquipment(exercise)]?.[0], ...setupWords(exercise).map(capitalised)].filter(Boolean);
  return lettered(exercise, words.join(" · ") || "No equipment");
}

// What the number in the weight box means, when it isn't the whole load.
export function weightWords(exercise) {
  return { "per-side": "kg per side", "per-dumbbell": "kg per dumbbell", assistance: "enter assistance as minus kg" }[exercise?.weightMode] || "";
}

// Display data for a routine entry: its choices, a plain title (for labels read
// aloud), the title as markup, and one prescription line ("3 × 8" or "3 × 8 or 2 × 12").
export function entryPresentation(entry, state) {
  const choices = entry.choices.map((choice) => {
    const exercise = exerciseById(state, choice.exerciseId);
    return { choice, exercise, name: fullName(exercise), markup: exerciseMarkup(exercise), prescription: choice.prescription || "No prescription" };
  });
  const prescriptions = choices.map((item) => item.prescription);
  const shared = prescriptions.length > 0 && prescriptions.every((prescription) => prescription === prescriptions[0]);
  // Two versions of one movement ("Hip thrust", barbell or Smith) show its name once.
  const sameMovement = choices.length > 1 && choices.every((item) => item.exercise && item.exercise.name === choices[0].exercise.name);
  // …unless one of them would be left with nothing to tell it apart.
  const setups = sameMovement ? choices.map((item) => setupText(item.exercise)) : [];
  const letters = sameMovement ? choices.map((item) => letterMarkup(item.exercise)) : [];
  const together = sameMovement && (setups.every(Boolean) || (!setups.some(Boolean) && letters.every(Boolean) && new Set(letters).size === letters.length));
  return {
    choices,
    preferred: choices[0] || null,
    title: choices.map((item) => item.name).join(" or ") || "No exercise choices",
    titleMarkup: together
      ? `${lettered(null, choices[0].exercise.name, letters.join(""))}${setupMarkup(setups.filter(Boolean).join(" or "))}`
      : choices.map((item) => item.markup).join(` <span class="version">or</span> `) || "No exercise choices",
    prescription: shared ? prescriptions[0] : prescriptions.join(" or "),
  };
}

// A block name like "Optional glute block" already says its entries are optional.
export function saysOptional(blockName) {
  return /\boptional\b/i.test(blockName);
}

// `marks`: { routineId: "running" | "done" } puts a dot or a tick on a tab (Workout).
export function routineTabsMarkup(routines, selectedId, marks = null) {
  if (!routines.length) return "";
  return `<div class="routine-tabs scroll-x" aria-label="Choose a routine" data-keep-scroll="routine-tabs">
    ${routines.map((routine) => `
      <button class="routine-tab" type="button"
        aria-label="${escapeHtml(routine.name)}, ${locationLabel(routine.group)}${marks?.[routine.id] === "running" ? ", in progress" : marks?.[routine.id] === "done" ? ", finished today" : ""}" aria-pressed="${routine.id === selectedId}" data-action="select-routine" data-id="${escapeHtml(routine.id)}">
        ${escapeHtml(routine.name)}${marks ? `<i class="tab-mark ${marks[routine.id] ? `is-${marks[routine.id]}` : ""}" aria-hidden="true"></i>` : ""}
      </button>`).join("")}
  </div>`;
}

// Keeps the selected routine tab visible after the tab strip is re-rendered.
export function revealSelectedTab(root) {
  const tab = root.querySelector(".routine-tab[aria-pressed='true']");
  const strip = tab?.closest(".routine-tabs");
  if (!tab || !strip) return;
  const stripBox = strip.getBoundingClientRect();
  const tabBox = tab.getBoundingClientRect();
  const margin = Math.ceil(strip.clientWidth * 0.12); // the strip's fade-out edge (12%, see .scroll-x)
  // Glides there; a strip that jumped sideways under the finger read as a glitch.
  if (tabBox.left < stripBox.left) strip.scrollBy({ left: -(stripBox.left - tabBox.left + margin), behavior: "smooth" });
  else if (tabBox.right > stripBox.right) strip.scrollBy({ left: tabBox.right - stripBox.right + margin, behavior: "smooth" });
}

// ---------- logged sets ----------

export const formatKg = (kg) => (kg === null || kg === undefined ? "" : String(kg));

// A short date for history rows: "Sat 31 Oct", with the year when it isn't this year.
export function shortDate(dateKey) {
  const date = dateFromKey(dateKey);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return formatDate(date, { weekday: "short", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

// Plain text for one lift: "50 kg × 10", "12 reps" without weight, "45 s" when timed.
export function liftText(lift, timed = false) {
  const amount = timed ? `${lift.reps} s` : (lift.kg === null ? `${lift.reps} reps` : String(lift.reps));
  return lift.kg === null ? amount : `${formatKg(lift.kg)} kg × ${amount}`;
}

function liftChip(lift, timed, kind = "") {
  const amount = timed ? `${lift.reps}<small>s</small>` : (lift.kg === null ? `${lift.reps}<small>reps</small>` : String(lift.reps));
  const weight = lift.kg === null ? "" : `${escapeHtml(formatKg(lift.kg))}<small>kg</small><span class="set-chip-x">×</span>`;
  const tag = kind === "is-drop" ? `<span class="label accent set-chip-tag">Drop</span>`
    : kind === "is-warmup" ? `<span class="label set-chip-tag">W<span class="visually-hidden">arm-up</span></span>` : "";
  return `<span class="set-chip ${kind}">${tag}${weight}${amount}</span>`;
}

// Small boxes for logged sets, each followed by its drops as outlined boxes.
// A warm-up set is tagged "W".
export function setChipsMarkup(sets, { timed = false, drops = true } = {}) {
  return sets.map((set) => [liftChip(set, timed, set.warmup ? "is-warmup" : ""), ...(drops ? set.drops.map((drop) => liftChip(drop, timed, "is-drop")) : [])].join("")).join("");
}
