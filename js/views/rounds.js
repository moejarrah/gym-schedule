// Rounds on Workout: the round line under the program bar, and the one sheet
// (#roundDialog) that is, in turn, the panel shown when Start workout is tapped, the
// "Welcome back" question after a long break, the list for doing a different workout
// today, and the round's own page. What a round is: js/model.js, "rounds and calendar weeks".

import { registerActions, render, store } from "../context.js";
import { $, chevronIcon, closeDialog, escapeHtml, openDialog, redraw, report } from "../dom.js";
import {
  activeProgram,
  activeWorkout,
  answerBreak,
  calendarWeek,
  dateFromKey,
  endRound,
  lastFinished,
  localDateKey,
  longBreak,
  programRoutines,
  openRound,
  roundProgram,
  roundSummary,
  routineById,
  setActiveRoutine,
  setRoundNumber,
  startGuestWorkout,
  startWorkout,
} from "../model.js";
import { roundName, shortDate, weeksText } from "./shared.js";

// What the sheet is showing: "start" (for routineId), "break", "pick" or "round".
// `number` is the round number being chosen with the − and + buttons.
const sheet = { mode: "", routineId: "", number: 1, editing: false };

const tickIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
const longDate = (dateKey) => dateFromKey(dateKey).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const dayText = (dateKey) => `${dateFromKey(dateKey).toLocaleDateString("en-US", { weekday: "short" })} ${dateFromKey(dateKey).getDate()}`;

const doneText = (summary) => `${summary.required.length - summary.remaining.length} of ${summary.required.length} done`;

function agoText(dateKey, todayKey) {
  if (!dateKey) return "Never";
  const days = Math.round((dateFromKey(todayKey) - dateFromKey(dateKey)) / 86400000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

// The quiet line under the program bar: where the round stands, and the calendar week.
export function roundLineMarkup(state, program) {
  if (!program) return "";
  const summary = roundSummary(state);
  const counts = summary.required.length > 0 && summary.counting;
  const text = [counts ? roundName(summary) : "", counts ? doneText(summary) : "", `Week ${calendarWeek(localDateKey()).week}`].filter(Boolean).join(" · ");
  if (!summary.required.length) return `<p class="round-line">${escapeHtml(text)}</p>`;
  return `<button class="round-line tap" type="button" data-action="open-round" aria-label="${escapeHtml(text)}. Open the round.">
    <span>${escapeHtml(text)}</span>${chevronIcon("right")}
  </button>`;
}

// ---------- the sheet ----------

const line = (name, value) => (value ? `<div class="slot-line"><span>${name}</span><span>${value}</span></div>` : "");
const head = (kicker, title, under = "") => `<header class="sheet-head">
    <div><p class="label">${escapeHtml(kicker)}</p><h2 id="roundTitle">${escapeHtml(title)}</h2>${under ? `<p>${escapeHtml(under)}</p>` : ""}</div>
    <button class="icon-button" type="button" data-close-dialog="roundDialog" aria-label="Close">×</button>
  </header>`;

// The round number with − and +, for the first Start and for "Change round number".
const stepperMarkup = () => `<span class="round-stepper">
    <button class="icon-button" type="button" data-action="round-step" data-step="-1" aria-label="One round fewer" ${sheet.number <= 1 ? "disabled" : ""}>−</button>
    <strong aria-live="polite">Round ${sheet.number}</strong>
    <button class="icon-button" type="button" data-action="round-step" data-step="1" aria-label="One round more">+</button>
  </span>`;

function startMarkup(state) {
  const routine = routineById(state, sheet.routineId);
  const program = activeProgram(state);
  const summary = roundSummary(state);
  const todayKey = localDateKey();
  return `<div class="sheet-panel">
    ${head(longDate(todayKey), routine.name, program.name)}
    <div class="sheet-body">
      ${line("Calendar", escapeHtml(weeksText(todayKey)))}
      ${summary.required.length ? line("Round", summary.counting ? escapeHtml(roundName(summary).replace("Round ", "")) : stepperMarkup()) : ""}
      ${summary.counting || !summary.required.length ? "" : `<p class="hint">Which round of ${escapeHtml(program.name)} are you on? One round is every routine once, however many days that takes. Leave it at 1 if you're just starting.</p>`}
      ${summary.required.length ? line("This round", escapeHtml(doneText(summary))) : ""}
      ${summary.required.length ? line("Still to do", escapeHtml(summary.remaining.map((item) => item.name).join(", ") || "Nothing")) : ""}
      ${line(`Last ${escapeHtml(routine.name)}`, escapeHtml(agoText(lastFinished(state, routine.id, todayKey), todayKey)))}
    </div>
    <footer class="actions stacked">
      <button class="button primary" type="button" data-action="confirm-start">Start ${escapeHtml(routine.name)}</button>
      <button class="link-button" type="button" data-action="pick-workout">Do a different workout today</button>
    </footer>
  </div>`;
}

function breakMarkup(state) {
  const program = activeProgram(state);
  const found = longBreak(state);
  const next = found.open ? found.lastRound + 1 : openRound(state).number;
  return `<div class="sheet-panel">
    ${head(program.name, "Welcome back")}
    <div class="sheet-body">
      <p class="hint">Your last workout was ${found.weeks} weeks ago, on ${escapeHtml(shortDate(found.lastDay))}. ${found.lastRound >= 1 ? `You were on round ${found.lastRound}.` : ""}</p>
      <p class="hint">Starting again makes this block ${openRound(state).block + 1} of your training. Your history stays either way.</p>
    </div>
    <footer class="actions stacked">
      <button class="button primary" type="button" data-action="answer-break" data-restart="">Carry on with round ${next}</button>
      <button class="button" type="button" data-action="answer-break" data-restart="yes">Start again at round 1</button>
    </footer>
  </div>`;
}

function pickMarkup(state) {
  const home = activeProgram(state);
  const summary = roundSummary(state);
  const doneOn = new Map(summary.workouts.filter((item) => !item.guest).map((item) => [item.routineId, item.dateKey]));
  const row = (routine, done) => `<button class="row" type="button" data-action="start-picked" data-id="${escapeHtml(routine.id)}" aria-label="Start ${escapeHtml(routine.name)}${done ? ", done this round" : ""}">
      <span class="row-main"><strong class="row-title">${escapeHtml(routine.name)}</strong></span>
      ${done ? `<span class="row-meta">done ${escapeHtml(dayText(done))}</span>` : ""}
      <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`;
  const others = state.programs.filter((program) => program !== home && program.routineIds.length);
  return `<div class="sheet-panel">
    ${head(longDate(localDateKey()), "Today's workout")}
    <div class="sheet-body">
      <p class="label label-row">${escapeHtml(home.name)} · ${escapeHtml(roundName(summary).toLowerCase())}</p>
      ${programRoutines(state, home).map((routine) => row(routine, doneOn.get(routine.id) || "")).join("")}
      ${others.map((program) => `<p class="label label-row">${escapeHtml(program.name)}</p>
        ${programRoutines(state, program).map((routine) => row(routine, "")).join("")}`).join("")}
      ${others.length ? `<p class="hint">A routine from another program is done for today only. ${escapeHtml(home.name)} stays your program.</p>` : ""}
    </div>
  </div>`;
}

function roundMarkup(state) {
  const program = roundProgram(state);
  const summary = roundSummary(state);
  const todayKey = localDateKey();
  const workouts = summary.workouts.map((item) => `<div class="row compact">
      <span class="tickbox is-ticked" aria-hidden="true">${tickIcon}</span>
      <span class="row-main"><strong class="row-title">${escapeHtml(item.name)}</strong></span>
      ${item.guest ? `<span class="label tag">${escapeHtml(item.program)}</span>` : ""}
      <span class="row-meta">${escapeHtml(dayText(item.dateKey))}${item.minutes ? ` · ${item.minutes} min` : ""}</span>
    </div>`).join("");
  return `<div class="sheet-panel">
    ${head(program.name, roundName(summary))}
    <div class="sheet-body">
      ${sheet.editing ? `${line("Round", stepperMarkup())}<p class="hint">Workouts already in this round move with it.</p>` : ""}
      ${line("Started", summary.started ? escapeHtml(longDate(summary.started)) : "Not started yet")}
      ${line("Calendar", escapeHtml(weeksText(summary.started || todayKey, todayKey)))}
      ${line("Routines", escapeHtml(doneText(summary)))}
      ${workouts ? `<p class="label label-row">Done in this round</p>${workouts}` : ""}
      ${summary.remaining.length ? `<p class="label label-row">Not done</p><p class="hint">${escapeHtml(summary.remaining.map((item) => item.name).join(", "))}</p>` : ""}
    </div>
    <footer class="actions stacked">
      ${sheet.editing ? `<button class="button primary" type="button" data-action="save-round-number">Save round number</button>`
    : `${summary.workouts.length ? `<button class="button" type="button" data-action="end-round">End round ${summary.number} now</button>` : ""}
      <button class="link-button" type="button" data-action="edit-round-number">Change round number</button>`}
    </footer>
  </div>`;
}

const MARKUP = { start: startMarkup, break: breakMarkup, pick: pickMarkup, round: roundMarkup };
const draw = () => redraw("#roundContent", MARKUP[sheet.mode](store.getState()));

function show(mode, changes = {}) {
  Object.assign(sheet, { mode, editing: false }, changes);
  draw();
  if (!$("#roundDialog").open) openDialog("#roundDialog");
}

// Start workout was tapped: the panel that says where things stand, before the clock runs.
// After three weeks or more away it asks the break question first, once.
export function openStartPanel(routineId) {
  const state = store.getState();
  const program = activeProgram(state);
  show(longBreak(state) ? "break" : "start", { routineId, number: openRound(state)?.number || 1 });
}

function begin(start) {
  if (activeWorkout(store.getState())) return;
  const result = store.update(start);
  if (!report(result)) return;
  closeDialog("#roundDialog");
  render();
}

registerActions({
  "open-round": () => show("round", { number: roundSummary(store.getState()).number }),
  "round-step": (button) => {
    sheet.number = Math.min(999, Math.max(1, sheet.number + Number(button.dataset.step)));
    draw();
    const again = $(`#roundContent [data-step="${button.dataset.step}"]`);
    (again?.disabled ? $("#roundContent [data-step='1']") : again)?.focus();
  },
  "confirm-start": () => begin((draft) => {
    if (!openRound(draft)) setRoundNumber(draft, sheet.number);
    startWorkout(draft, sheet.routineId);
  }),
  "answer-break": (button) => {
    const result = store.update((draft) => answerBreak(draft, Boolean(button.dataset.restart)));
    if (!report(result)) return;
    render();
    show("start", { number: roundSummary(store.getState()).number });
  },
  "pick-workout": () => show("pick"),
  // A routine of the active program just becomes today's routine; one from another
  // program is a guest for today.
  "start-picked": (button) => begin((draft) => {
    if (!openRound(draft)) setRoundNumber(draft, sheet.number);
    if (activeProgram(draft).routineIds.includes(button.dataset.id)) {
      setActiveRoutine(draft, button.dataset.id);
      startWorkout(draft, button.dataset.id);
    } else startGuestWorkout(draft, button.dataset.id);
  }),
  "end-round": () => {
    const result = store.update((draft) => endRound(draft));
    if (!report(result, "Round ended.")) return;
    render();
    show("round", { number: roundSummary(store.getState()).number });
  },
  "edit-round-number": () => {
    sheet.editing = true;
    draw();
  },
  "save-round-number": () => {
    const result = store.update((draft) => setRoundNumber(draft, sheet.number));
    if (!report(result)) return;
    render();
    show("round");
  },
});
