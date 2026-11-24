// Markup pieces used by more than one screen.

import { chevronIcon, escapeHtml, formatDate } from "../dom.js";
import { mainElement, store } from "../context.js";
import { calendarWeek, dateFromKey, exerciseById, exerciseLabels, fullName, mainEquipment, setupWords } from "../model.js";
import { label } from "../vocab.js";

export const locationLabel = (group) => (group === "home" ? "Home" : "Gym");

export const videoUrl = (videoId) => `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

// ---------- drawing an exercise ----------
// Everywhere an exercise is named it is drawn the same way: the movement, with
// its setup beside it. Settings → Exercise version picks how the equipment shows:
// as a word in the grey setup ("Lat pulldown  Machine · Overhand") or as a
// coloured letter in front of the name. The rest of the setup is always grey text.

const TAGS = {
  "smith-machine": ["Smith machine", "S"], "plate-loaded": ["Plate-loaded", "P"], machine: ["Machine", "M"], "ez-bar": ["EZ bar", "E"], barbell: ["Barbell", "B"],
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
  const said = tag && exercise.name.toLowerCase().includes(tag[0].toLowerCase());
  const equipment = tag && !said && !(lettersOn() && tag[1]) ? [tag[0]] : [];
  return [...equipment, ...setupWords(exercise).map(capitalised)].join(" · ");
}

// The letter never ends a line on its own: it stays with the first word of the name.
function lettered(exercise, name, letters = letterMarkup(exercise)) {
  if (!letters) return escapeHtml(name);
  const [first, ...rest] = name.split(" ");
  return `<span class="nowrap">${letters}${escapeHtml(first)}</span>${rest.length ? ` ${escapeHtml(rest.join(" "))}` : ""}`;
}

const piece = (word) => (word.length <= 22 ? `<span class="nowrap">${escapeHtml(word)}</span>` : escapeHtml(word));
const setupMarkup = (text) => (text ? ` <span class="version">${text.split(" · ").map(piece).join(" · ")}</span>` : "");

// One exercise: [letter] Name setup. A deleted exercise shows the name its sets were saved under.
export function exerciseMarkup(exercise, savedName = "Missing exercise") {
  if (!exercise) return escapeHtml(savedName);
  return `${lettered(exercise, exercise.name)}${setupMarkup(setupText(exercise))}`;
}

// A quiet row names only the movement (with its letter, if that's the setting).
export const movementMarkup = (exercise, savedName = "Missing exercise") => (exercise ? lettered(exercise, exercise.name) : escapeHtml(savedName));

// Logged sets in one short line, every weight with its unit: "60 kg × 10, 9, 8",
// "30 kg × 9 · 32.5 kg × 8 +1 drop", "15, 13 reps", "45, 40 sec", "10 kg × 45 sec".
// An assisted set keeps its minus ("-20 kg × 8").
export function setsSummary({ sets, unit }) {
  const working = sets.some((set) => !set.warmup) ? sets.filter((set) => !set.warmup) : sets;
  const groups = [];
  for (const set of working) {
    if (groups.at(-1)?.kg === set.kg) groups.at(-1).reps.push(set.reps);
    else groups.push({ kg: set.kg, reps: [set.reps] });
  }
  const drops = sets.reduce((count, set) => count + set.drops.length, 0);
  const amount = (kg, reps) => `${reps.join(", ")}${unit === "sec" ? " sec" : kg === null ? " reps" : ""}`;
  const text = groups.map(({ kg, reps }) => (kg === null ? amount(kg, reps) : `${formatKg(kg)} kg × ${amount(kg, reps)}`)).join(" · ");
  return `${text}${drops ? ` +${drops} drop${drops === 1 ? "" : "s"}` : ""}`;
}

// One version under its movement's name in the Library: the setup alone, equipment spelled out.
export function versionMarkup(exercise) {
  const rest = setupWords(exercise).map(capitalised);
  const tag = TAGS[mainEquipment(exercise)];
  const words = [lettersOn() && tag?.[1] && rest.length ? "" : tag?.[0], ...rest].filter(Boolean);
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
      : choices.map((item) => item.markup).join(` <span class="version">or</span>&nbsp;`) || "No exercise choices",
    prescription: shared ? prescriptions[0] : prescriptions.join(" or "),
  };
}

// ---------- the open slot ----------

// How a slot's alternatives are named in its open lines: by movement, or, when that
// alone wouldn't tell one from the exercise shown or from another alternative, with
// what sets it apart ("Chest press · Machine").
export function alternativeNames(items, shownExercise) {
  const repeated = (name) => name === shownExercise?.name || items.filter((item) => item.exercise?.name === name).length > 1;
  return items.map((item) => {
    if (!item.exercise) return item.name;
    const setup = [label(mainEquipment(item.exercise)), ...setupWords(item.exercise)].filter(Boolean).join(" · ");
    return repeated(item.exercise.name) && setup ? `${item.exercise.name} · ${setup}` : item.exercise.name;
  });
}

// The open slot's lines unfold and fold; nothing snaps. A screen that shows slots keeps
// one of these: `unfold(routineId)` after each draw (if a different slot is open than at
// the last draw of this routine, it unfolds) and `fold(then)` before a redraw that closes it.
export function slotMotion() {
  const UNFOLD = { duration: 220, easing: "cubic-bezier(0.22, 0.8, 0.26, 1)" };
  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const openDetail = () => mainElement().querySelector("[data-open-slot] > [data-slot]");
  let last = { routineId: "", slotId: "" };
  return {
    unfold(routineId) {
      const detail = openDetail();
      const drawn = { routineId, slotId: detail?.dataset.slot || "" };
      const changed = drawn.routineId === last.routineId && drawn.slotId && drawn.slotId !== last.slotId;
      last = drawn;
      if (!changed || calm()) return;
      const height = detail.offsetHeight;
      detail.style.overflow = "hidden";
      detail.animate([{ height: "0px", paddingBottom: "0px", opacity: 0 }, { height: `${height}px`, opacity: 1 }], UNFOLD).onfinish = () => { detail.style.overflow = ""; };
    },
    fold(then) {
      const detail = openDetail();
      if (!detail || calm()) return then();
      detail.style.overflow = "hidden";
      detail.animate([{ height: `${detail.offsetHeight}px`, opacity: 1 }, { height: "0px", paddingBottom: "0px", opacity: 0 }], { ...UNFOLD, duration: 170, fill: "forwards" }).onfinish = then;
    },
  };
}

// ---------- rounds ----------

// "Round 6", or "Round 1 · block 2" once there is more than one block.
export const roundName = ({ number, block }) => `Round ${number}${block > 1 ? ` · block ${block}` : ""}`;

// Always with its unit: a bare "3 of 6" is never shown.
export const workoutsDone = (done, required) => `${done} of ${required} ${required === 1 ? "workout" : "workouts"} done`;
export const durationText = (minutes) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`);
export const daysBetween = (fromKey, toKey) => Math.round((dateFromKey(toKey) - dateFromKey(fromKey)) / 86400000);

// "2026 · week 47", or "2026 · weeks 47–48" for a stretch of days.
export function weeksText(fromKey, toKey = fromKey) {
  const from = calendarWeek(fromKey);
  const to = calendarWeek(toKey);
  if (from.year === to.year && from.week === to.week) return `${from.year} · week ${from.week}`;
  return from.year === to.year ? `${from.year} · weeks ${from.week}–${to.week}` : `${from.year} week ${from.week} – ${to.year} week ${to.week}`;
}

// ---------- an exercise's facts ----------

// The labelled lines every open exercise starts with, in their fixed order:
// [label, escaped value] pairs; a fact with nothing to say is left out.
export function exerciseFactLines(exercise, prescription) {
  const word = (id) => (id ? escapeHtml(label(id)) : "");
  const detail = exercise?.detail ? escapeHtml(exercise.detail.charAt(0).toUpperCase() + exercise.detail.slice(1)) : "";
  return [
    ["Sets × reps", escapeHtml(prescription || "")],
    ["Equipment", word(mainEquipment(exercise)) || word(exercise?.equipment?.[0])],
    ["Attachment", word(exercise?.attachment)],
    ["Grip", word(exercise?.grip)],
    ["Grip width", word(exercise?.width)],
    ["Detail", detail],
    ["Weight", word(exercise?.weightMode)],
  ].filter(([, value]) => value);
}

// A block name like "Optional glute block" already says its entries are optional.
export function saysOptional(blockName) {
  return /\boptional\b/i.test(blockName);
}

// An open slot's facts (Workout and Program draw them alike). One labelled line per
// fact; a line with nothing to say is left out.
export const slotLine = (name, value) => (value ? `<div class="slot-line"><span>${name}</span><span>${value}</span></div>` : "");
// A line that opens something is one button: its value in the accent colour, then an arrow.
export const slotLinkLine = (name, value, attributes) => (value ? `<button class="slot-line" type="button" ${attributes}><span>${name}</span><span class="slot-link">${value}</span>${chevronIcon("right")}</button>` : "");

// `action`: the action a tab runs.
export function routineTabsMarkup(routines, selectedId, action) {
  if (!routines.length) return "";
  return `<div class="routine-tabs scroll-x" aria-label="Choose a workout" data-keep-scroll="routine-tabs">
    ${routines.map((routine) => `
      <button class="routine-tab" type="button"
        aria-label="${escapeHtml(routine.name)}, ${locationLabel(routine.group)}" aria-pressed="${routine.id === selectedId}" data-action="${action}" data-id="${escapeHtml(routine.id)}">
        ${escapeHtml(routine.name)}
      </button>`).join("")}
  </div>`;
}

// Keeps the selected routine tab visible after the tab strip is re-rendered.
// Swiping sideways on a screen with routine tabs goes to the next or previous
// routine, as iPhone pages do: what is under the tabs follows the finger, and on
// release either slides away while the next routine slides in beside it, or
// settles back. Not from inside something that scrolls sideways itself (the tabs,
// a chip row), not while a row is being dragged, not on a pinch.
export function enableRoutineSwipe(main) {
  const SLIDE = { duration: 260, easing: "cubic-bezier(0.22, 0.8, 0.26, 1)" };
  const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // What moves: everything under the tabs.
  const panes = () => {
    const tabs = main.querySelector(".routine-tabs");
    return tabs ? [...tabs.parentElement.children].slice([...tabs.parentElement.children].indexOf(tabs) + 1) : [];
  };
  const neighbour = (step) => {
    const tabs = [...main.querySelectorAll(".routine-tab")];
    return tabs[tabs.findIndex((tab) => tab.getAttribute("aria-pressed") === "true") + step] || null;
  };
  const shift = (items, x) => { for (const item of items) item.style.transform = x ? `translateX(${x}px)` : ""; };
  let touch = null;

  main.addEventListener("touchstart", (event) => {
    const blocked = event.touches.length !== 1 || event.target.closest?.(".scroll-x") || !main.querySelector(".routine-tabs");
    touch = blocked ? null : { x: event.touches[0].clientX, y: event.touches[0].clientY, at: performance.now(), dx: 0, sideways: false, items: [] };
  }, { passive: true });

  main.addEventListener("touchmove", (event) => {
    if (!touch) return;
    if (event.touches.length !== 1 || main.querySelector(".is-dragging")) {
      shift(touch.items, 0);
      touch = null;
      return;
    }
    const dx = event.touches[0].clientX - touch.x;
    const dy = event.touches[0].clientY - touch.y;
    if (!touch.sideways) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      // The first clear movement decides: up and down is the list's own scrolling.
      if (Math.abs(dx) <= Math.abs(dy) * 1.2) {
        touch = null;
        return;
      }
      touch.sideways = true;
      touch.items = panes();
    }
    event.preventDefault(); // the list doesn't also scroll up or down
    // Pulling past the first or last routine resists.
    touch.dx = neighbour(dx < 0 ? 1 : -1) ? dx : dx * 0.25;
    shift(touch.items, touch.dx);
  }, { passive: false });

  const settle = (items, from) => {
    shift(items, 0);
    if (!still()) for (const item of items) item.animate([{ transform: `translateX(${from}px)` }, { transform: "none" }], SLIDE);
  };

  main.addEventListener("touchend", () => {
    const ended = touch;
    touch = null;
    if (!ended?.sideways) return;
    const step = ended.dx < 0 ? 1 : -1;
    const target = neighbour(step);
    const flick = Math.abs(ended.dx) > 30 && performance.now() - ended.at < 250;
    if (!target || (Math.abs(ended.dx) < main.clientWidth * 0.28 && !flick)) {
      settle(ended.items, ended.dx);
      return;
    }
    // The routine being left stays on screen as a copy that slides away.
    const width = main.clientWidth;
    const boxes = ended.items.map((item) => item.getBoundingClientRect());
    const scrolls = [];
    const ghost = document.createElement("div");
    ghost.className = "swipe-ghost";
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, { top: `${boxes[0]?.top || 0}px`, height: `${(boxes.at(-1)?.bottom || 0) - (boxes[0]?.top || 0)}px` });
    ended.items.forEach((item, index) => {
      const copy = item.cloneNode(true);
      copy.style.transform = "";
      copy.style.height = `${boxes[index].height}px`;
      copy.style.flex = "none";
      ghost.append(copy);
      // Where each list was scrolled to; set once the copy is on the page.
      for (const [from, to] of [[item, copy], [item.querySelector(".scroll"), copy.querySelector(".scroll")]]) if (from?.scrollTop) scrolls.push([to, from.scrollTop]);
    });
    target.click();
    // After the redraw, which replaces everything inside the screen.
    if (still()) return;
    main.append(ghost);
    for (const [copy, top] of scrolls) copy.scrollTop = top;
    main.classList.remove("is-switching"); // it slides in; it doesn't also fade
    for (const item of panes()) item.animate([{ transform: `translateX(${ended.dx + step * width}px)` }, { transform: "none" }], SLIDE);
    ghost.animate([{ transform: `translateX(${ended.dx}px)` }, { transform: `translateX(${-step * width}px)` }], SLIDE).onfinish = () => ghost.remove();
  }, { passive: true });

  main.addEventListener("touchcancel", () => {
    if (touch) shift(touch.items, 0);
    touch = null;
  }, { passive: true });
}

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
