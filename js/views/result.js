// The result: a page of the Workout tab that shows how a finished workout went. It is
// pushed in after Finish, and again from the round page's "How it went"; its bottom
// button Done goes back to the round page (to Log for a workout logged for a past day),
// as does a drag from the left edge. Built from saved data only: what it shows is the
// workout and day held in `shown`, which a reload forgets (the app then opens on the
// round page). It is a title, then a stack of cards, each only when it has something to
// say: Summary, New bests, the round, Against last time, Not done, Next time, and the
// actions (continue, back up, delete this workout). Inside a card every line is the same
// grid: the name at the left (an exercise's setup on a meta line under it), the value at
// the right, a chevron when the line opens something.

import { navigate, pauseTaps, registerActions, registerView, store } from "../context.js";
import { chevronIcon, confirmAction, escapeHtml, plural, report, toast } from "../dom.js";
import { activeWorkout, backupAge, dayExtras, deleteWorkout, exerciseById, localDateKey, nextWorkout, roundRecord, roundReopenedBy, roundSummary, routineById, workoutName, workoutStanding } from "../model.js";
import { workoutComparison } from "../progress.js";
import { daysBetween, durationText, movementMarkup, roundName, setupText, shortDate } from "./shared.js";

// The finished workout shown: its routine and its day.
const shown = { routineId: "", dateKey: "" };

const isFinished = (state, { routineId, dateKey } = shown) => Boolean(state.sessions[dateKey]?.routineIds.includes(routineId));
const isPastDay = () => shown.dateKey !== localDateKey();

// ---------- reading the workout ----------

// Each exercise logged in it against its session before, in the order of its slots
// (the routine's, then the day's extras).
function compared(state, routineId, dateKey) {
  const { slots } = workoutStanding(state, routineId, dateKey);
  const prescriptionOf = (slotId, exerciseId) => slots.find((slot) => slot.id === slotId)?.choices.find((choice) => choice.exerciseId === exerciseId)?.prescription || "";
  const order = (item) => {
    const index = slots.findIndex((slot) => slot.id === item.slotId);
    return index < 0 ? slots.length : index;
  };
  return workoutComparison(state, routineId, dateKey, prescriptionOf)
    .map((item) => ({ ...item, exercise: exerciseById(state, item.exerciseId) }))
    .sort((a, b) => order(a) - order(b));
}

// The tally: how many exercises went up, stayed the same and went down against their
// last session, or null when nothing could be compared (nothing logged, or all first time).
function tally(items) {
  const count = (kind) => items.filter((item) => item.kind === kind).length;
  return items.some((item) => item.kind !== "first") ? { up: count("up"), same: count("same"), down: count("down") } : null;
}

// "▲ 4 · = 3 · ▼ 1", the result's counters as one line, or "" when nothing could be compared.
export const tallyText = (items) => {
  const counts = tally(items);
  return counts ? `▲ ${counts.up} · = ${counts.same} · ▼ ${counts.down}` : "";
};

// The tally of a finished workout, for the round page's "How it went" line.
export const workoutTally = (state, routineId, dateKey) => tallyText(compared(state, routineId, dateKey));

// ---------- words ----------

// One set as the result names it: "37.5 kg × 10", "12 reps", "45 sec", "10 kg × 45 sec".
function setText(set, unit) {
  const amount = unit === "sec" ? `${set.reps} sec` : set.kg === null ? `${set.reps} ${set.reps === 1 ? "rep" : "reps"}` : String(set.reps);
  return set.kg === null ? amount : `${set.kg} kg × ${amount}`;
}

// "A", "A and B", "A, B and C".
const listText = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

// ---------- the pieces every card is built from ----------

// A card: its small label (and a count at its right), then its lines.
const card = (label, body, count = "") => `<section class="result-card" aria-label="${label}">
    <h2 class="label result-card-label"><span>${label}</span>${count === "" ? "" : `<span>${count}</span>`}</h2>
    ${body}
  </section>`;

// An exercise at the left of a line: its movement, its setup on the meta line under it
// (kept, empty, when it has none, so every exercise line has the same two lines).
const exerciseCell = (exercise, savedName) => `<span class="result-name">
    <span class="truncate">${movementMarkup(exercise, savedName)}</span>
    <small class="truncate">${(exercise && escapeHtml(setupText(exercise))) || "&nbsp;"}</small>
  </span>`;

// What a line says at its right: a value, and a meta line under it when every line of the card has one.
const valueCell = (value, meta = "", extra = "") => `<span class="result-value ${extra}"><strong>${value}</strong>${meta ? `<small>${meta}</small>` : ""}</span>`;

const chev = (direction = "right") => `<span class="chev" aria-hidden="true">${chevronIcon(direction)}</span>`;

// A line: a plain one, or one button that opens something (with a chevron).
const line = (inner, attributes = "") => (attributes
  ? `<button class="result-line" type="button" ${attributes}>${inner}${chev()}</button>`
  : `<div class="result-line">${inner}</div>`);

// A labelled line: a muted label at the left, its value at the right.
const pair = (label, value, extra = "") => line(`<span class="result-label">${label}</span>${valueCell(value, "", extra)}`);

// A row opening an exercise's history.
const historyLine = (item, value, spoken) => line(`${exerciseCell(item.exercise, item.name)}${value}`, `data-action="view-history" data-id="${escapeHtml(item.exerciseId)}" aria-label="${escapeHtml(`${item.name}, ${spoken}. Open its history`)}"`);

// Lines that fold away behind one more line ("Same · 3 exercises", "Show 3 more").
const folded = (key, summary, body) => `<details class="result-fold" data-keep-open="result-${key}">
    <summary class="result-line">${summary}${chev("down")}</summary>
    ${body}
  </details>`;

// ---------- the cards ----------

function headMarkup(record, dateKey) {
  return `<header class="round-head result-head">
    <div class="round-title"><h1>${escapeHtml(record.name || "Workout")} done</h1></div>
    <p class="round-facts"><span>${escapeHtml(shortDate(dateKey))} · saved to your log</span></p>
  </header>`;
}

// Three facts side by side (time, sets, exercises), then Progress: how many exercises went
// up, stayed the same and went down against their last session (and when that was).
function summaryMarkup(state, record, items, routineId, dateKey) {
  const standing = workoutStanding(state, routineId, dateKey);
  // A routine deleted since: only how many exercises were logged can still be told.
  const exercises = standing.counted.length ? [`${standing.done} of ${standing.counted.length}`, "exercises"] : [String(standing.exercises), standing.exercises === 1 ? "exercise" : "exercises"];
  const cells = [
    [record.minutes ? durationText(record.minutes) : "—", record.minutes ? "time" : "not timed"],
    [String(standing.sets), standing.sets === 1 ? "set" : "sets"],
    exercises,
  ];
  const counts = tally(items);
  const days = new Set(items.filter((item) => item.previous).map((item) => item.previous));
  const against = days.size === 1 ? shortDate([...days][0]) : "last time";
  const counter = (sign, number, kind = "") => `<span class="${number ? kind : "is-zero"}">${sign} ${number}</span>`;
  const compare = !items.length ? valueCell("No sets logged", "", "is-quiet")
    : !counts ? valueCell("First time for all", "", "is-quiet")
      : `<span class="result-counts" role="img" aria-label="${counts.up} up, ${counts.same} same, ${counts.down} down">${counter("▲", counts.up, "up")}${counter("=", counts.same)}${counter("▼", counts.down, "down")}</span>`;
  return card("Summary", `<div class="result-cells">${cells.map(([value, label]) => `<p><strong>${escapeHtml(value)}</strong><small>${escapeHtml(label)}</small></p>`).join("")}</div>
    ${line(`<span class="result-name"><span class="result-label">Progress</span>${counts ? `<small>against ${escapeHtml(against)}</small>` : ""}</span>${compare}`)}`);
}

function bestsMarkup(items) {
  const bests = items.filter((item) => item.best);
  if (!bests.length) return "";
  return card("New bests", bests.map((item) => {
    const now = setText(item.best.set, item.unit);
    const before = setText(item.best.before, item.unit);
    return historyLine(item, valueCell(escapeHtml(now), `was ${escapeHtml(before)}`), `new best ${now}, before ${before}`);
  }).join(""), bests.length);
}

// Where the round it was filed in stands: its bar, how many are done and what is next.
// One that completed its round says so, with the days it took.
function roundMarkup(state, record, routineId, dateKey) {
  const tag = record.round ? { number: record.round, block: record.block || 1 } : null;
  const round = tag && roundRecord(state, tag);
  if (!round) return "";
  const summary = roundSummary(state);
  const next = summary.counting ? nextWorkout(state) : null;
  const last = round.workouts.at(-1);
  const completed = !round.open && round.ended === "complete" && last?.dateKey === dateKey && last.routineId === routineId;
  const segments = round.open ? summary.required.map((routine) => summary.done.has(routine.id)) : Array.from({ length: round.required }, (_, index) => index < round.done);
  const lines = [
    record.guest ? pair("Extra from", escapeHtml(record.program || "another program")) : "",
    record.guest || record.optional ? pair("Counts", "toward nothing") : "",
    pair("Workouts", `${round.done} of ${round.required} done`),
    completed ? pair("Took", plural(daysBetween(round.from, round.to) + 1, "day")) : "",
    !round.open && !completed ? pair("Round", round.ended === "complete" ? "complete" : "ended") : "",
    (round.open || completed) && next ? pair("Next", escapeHtml(next.name)) : "",
  ];
  return card(`${escapeHtml(roundName(tag))}${completed ? " complete" : ""}`, `<div class="round-bar result-bar" aria-hidden="true">${segments.map((done) => `<i${done ? ` class="is-done"` : ""}></i>`).join("")}</div>
    ${lines.join("")}`);
}

// Up and Down as rows with the change, each opening the exercise's history (a best is
// listed once, under New bests); Same and First time folded behind one line each.
function changesMarkup(items) {
  const changed = ["up", "down"].flatMap((kind) => items.filter((item) => item.kind === kind && !item.best))
    .map((item) => historyLine(item, valueCell(escapeHtml(item.text), "", item.kind), `${item.kind} ${item.text.slice(2)}`)).join("");
  const fold = (kind, label) => {
    const list = items.filter((item) => item.kind === kind && !item.best);
    if (!list.length) return "";
    return folded(kind, `<span class="result-label">${label}</span>${valueCell(plural(list.length, "exercise"))}`, list.map((item) => line(exerciseCell(item.exercise, item.name))).join(""));
  };
  const body = `${changed}${fold("same", "Same")}${fold("first", "First time")}`;
  return body ? card("Against last time", body) : "";
}

// What wasn't done, in three groups: the main exercises neither marked done nor logged,
// then the Optional ones, then the ones added for the day. The card is labelled for its
// first group ("Not done", counting main exercises only; "Optional, not done" or "Added
// today, not done" when no main one is left) and each later group has a small label of
// its own. More than five rows: four, and "Show N more". Not told for a workout whose
// routine has been deleted since.
function notDoneMarkup(state, routineId, dateKey) {
  const { slots, isDone } = workoutStanding(state, routineId, dateKey);
  const left = slots.filter((slot) => !isDone(slot));
  const groups = [
    ["Not done", "Not done", left.filter((slot) => slot.role === "main")],
    ["Optional", "Optional, not done", left.filter((slot) => slot.role !== "main" && !slot.extra)],
    ["Added today", "Added today, not done", left.filter((slot) => slot.extra)],
  ].filter(([, , list]) => list.length);
  if (!groups.length) return "";
  const row = (slot) => line(exerciseCell(exerciseById(state, slot.choices[0]?.exerciseId), "Missing exercise"));
  const pieces = groups.flatMap(([label, , list], index) => [...(index ? [`<h3 class="label result-sublabel"><span>${label}</span><span>${list.length}</span></h3>`] : []), ...list.map(row)]);
  const rows = (list) => list.filter((piece) => !piece.startsWith("<h3")).length;
  let body = pieces.join("");
  if (left.length > 5) {
    let cut = 0;
    while (rows(pieces.slice(0, cut)) < 4) cut += 1;
    const more = left.length - 4;
    body = `${pieces.slice(0, cut).join("")}${folded("not-done", `<span class="result-label result-link"><span>Show ${more} more</span><span>Show fewer</span></span>`, pieces.slice(cut).join(""))}`;
  }
  const [, title, first] = groups[0];
  return card(title, body, first.length);
}

// Next time: add weight where every set reached the top of the rep range today.
function nextTimeMarkup(items) {
  const heavier = items.filter((item) => item.addWeight);
  if (!heavier.length) return "";
  return card("Next time", heavier.map((item) => line(`${exerciseCell(item.exercise, item.name)}${valueCell("Add weight", `all sets hit ${item.addWeight}`)}`)).join(""));
}

// The way back in (for a workout finished today, while none runs), the backup when one
// is due, and deleting this workout.
function actionsMarkup(state, routineId, dateKey) {
  const routine = routineById(state, routineId);
  const age = backupAge(state);
  const lines = [
    routine && dateKey === localDateKey() && !activeWorkout(state)
      ? line(`<span class="result-label is-link">Continue ${escapeHtml(routine.name)}</span>`, `data-action="round-reopen" data-id="${escapeHtml(routineId)}" aria-label="Not finished? Continue ${escapeHtml(routine.name)}"`) : "",
    age === null || age > 14
      ? line(`<span class="result-label is-link">Back up your data</span>${valueCell(age === null ? "none yet" : `last ${age} days ago`, "", "is-quiet")}`, `data-view="settings" aria-label="Back up your data: ${age === null ? "no backup yet" : `the last one was ${age} days ago`}. Open Settings"`) : "",
    line(`<span class="result-label is-danger">Delete this workout</span>`, `data-action="result-delete"`),
  ];
  return card("More", lines.join(""));
}

function markup(state) {
  const { routineId, dateKey } = shown;
  const record = state.sessions[dateKey].workouts?.[routineId] || {};
  const items = compared(state, routineId, dateKey);
  return `<section class="page result-page">
    ${headMarkup(record, dateKey)}
    <div class="result-cards">
      ${summaryMarkup(state, record, items, routineId, dateKey)}
      ${bestsMarkup(items)}
      ${roundMarkup(state, record, routineId, dateKey)}
      ${changesMarkup(items)}
      ${notDoneMarkup(state, routineId, dateKey)}
      ${nextTimeMarkup(items)}
      ${actionsMarkup(state, routineId, dateKey)}
    </div>
  </section>`;
}

// ---------- deleting it ----------

// Asks, saying exactly what goes (and which round opens again), then deletes the workout
// and goes back to the round page (to Log for a past day).
async function deleteShown() {
  const state = store.getState();
  const { routineId, dateKey } = shown;
  if (!isFinished(state)) return;
  const name = workoutName(state, dateKey, routineId);
  // Every set goes, warm-ups too.
  const sets = Object.values(state.sessions[dateKey].logs).filter((log) => log.routineId === routineId).reduce((count, log) => count + log.sets.length, 0);
  const what = [
    sets ? plural(sets, "set") : "",
    state.sessions[dateKey].checkedEntryIdsByRoutine?.[routineId]?.length ? "done marks" : "",
    dayExtras(state, dateKey, routineId).length ? "exercises added for the day" : "",
  ].filter(Boolean);
  const gone = what.length ? `Its ${listText(what)} ${what.join() === "1 set" ? "is" : "are"} deleted.` : "It leaves your log.";
  const reopen = roundReopenedBy(state, dateKey, routineId);
  const confirmed = await confirmAction({
    title: `Delete ${name} from ${shortDate(dateKey)}?`,
    message: `${gone}${reopen ? ` ${roundName(reopen)} opens again.` : ""} This can't be undone.`,
    confirmLabel: "Delete workout",
    cancelLabel: "Keep it",
    variant: "workout-delete",
  });
  if (!confirmed) return;
  const past = isPastDay();
  if (!report(store.update((draft) => deleteWorkout(draft, dateKey, routineId)), "Workout deleted.")) return;
  navigate(past ? "calendar" : "round", { motion: past ? "" : "pop" });
  pauseTaps();
}

// ---------- screen ----------

// Shows the result of a finished workout, as a deeper page of the Workout tab.
export function showResult(routineId, dateKey) {
  if (!isFinished(store.getState(), { routineId, dateKey })) {
    toast("That workout is no longer in the Log.");
    return;
  }
  Object.assign(shown, { routineId, dateKey });
  navigate("result", { motion: "push" });
}

registerView("result", {
  markup,
  tab: "round",
  dock: () => `<button class="button primary" type="button" data-action="result-done"><span>Done</span></button>`,
  // Gone from the Log (another backup imported, the day unticked, the workout reopened or deleted).
  unavailable: (state) => !isFinished(state),
  backTo: () => (isPastDay() ? "calendar" : ""),
});

registerActions({
  "open-result": (button) => showResult(button.dataset.id, button.dataset.date),
  "result-done": () => navigate(isPastDay() ? "calendar" : "round", { motion: isPastDay() ? "" : "pop" }),
  "result-delete": deleteShown,
});
