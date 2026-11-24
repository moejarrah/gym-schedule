// The result: a page of the Workout tab that shows how a finished workout went. It is
// pushed in after Finish, and again from the round page's "How it went"; its bottom
// button Done goes back to the round page (to Log for a workout logged for a past day),
// as does a drag from the left edge. Built from saved data only: what it shows is the
// workout and day held in `shown`, which a reload forgets (the app then opens on the
// round page). Top to bottom: done and saved; the tally against last time; new bests
// with what they beat; where the round stands; up, down, same; what to do next time;
// what wasn't done; the way back in; the backup reminder.

import { navigate, registerActions, registerView, store } from "../context.js";
import { chevronIcon, escapeHtml, plural, toast } from "../dom.js";
import { activeWorkout, backupAge, dayExtras, exerciseById, findSlot, fullName, isEntryChecked, localDateKey, nextWorkout, orderedEntries, roundRecord, roundSummary, routineById } from "../model.js";
import { workoutComparison } from "../progress.js";
import { daysBetween, durationText, exerciseMarkup, roundName, shortDate, workoutsDone } from "./shared.js";

// The finished workout shown: its routine and its day.
const shown = { routineId: "", dateKey: "" };

const isFinished = (state, { routineId, dateKey } = shown) => Boolean(state.sessions[dateKey]?.routineIds.includes(routineId));
const isPastDay = () => shown.dateKey !== localDateKey();

// ---------- reading the workout ----------

// Its slots in the order the workout shows them: the routine's, then the day's extras.
function slotsOf(state, routineId, dateKey) {
  const routine = routineById(state, routineId);
  if (!routine) return [];
  return [...orderedEntries(routine), ...dayExtras(state, dateKey, routineId).map((extra) => findSlot(state, routineId, extra.id, dateKey))];
}

// Each exercise logged in it against its session before, in the order of its slots.
function compared(state, routineId, dateKey) {
  const slots = slotsOf(state, routineId, dateKey);
  const prescriptionOf = (slotId, exerciseId) => slots.find((slot) => slot.id === slotId)?.choices.find((choice) => choice.exerciseId === exerciseId)?.prescription || "";
  const order = (item) => {
    const index = slots.findIndex((slot) => slot.id === item.slotId);
    return index < 0 ? slots.length : index;
  };
  return workoutComparison(state, routineId, dateKey, prescriptionOf)
    .map((item) => ({ ...item, exercise: exerciseById(state, item.exerciseId) }))
    .sort((a, b) => order(a) - order(b));
}

// The tally: [count, word] for up, same and down (and how many were done for the first
// time), or [] when nothing could be compared.
function tallyParts(items) {
  const count = (kind) => items.filter((item) => item.kind === kind).length;
  if (!items.some((item) => item.kind !== "first")) return [];
  return [[count("up"), "up"], [count("same"), "same"], [count("down"), "down"], [count("first"), "first time"]].filter(([number, word]) => number || word !== "first time");
}

// "4 up · 3 same · 1 down", or "" when nothing could be compared.
export const tallyText = (items) => tallyParts(items).map((part) => part.join(" ")).join(" · ");

// The tally of a finished workout, for the round page's "How it went" line.
export const workoutTally = (state, routineId, dateKey) => tallyText(compared(state, routineId, dateKey));

// ---------- words ----------

const nameOf = (item) => (item.exercise ? fullName(item.exercise) : item.name);
const names = (items) => items.map((item) => escapeHtml(nameOf(item))).join(", ");

// One set as the result names it: "37.5 kg × 10", "12 reps", "45 sec", "10 kg × 45 sec".
function setText(set, unit) {
  const amount = unit === "sec" ? `${set.reps} sec` : set.kg === null ? `${set.reps} ${set.reps === 1 ? "rep" : "reps"}` : String(set.reps);
  return set.kg === null ? amount : `${set.kg} kg × ${amount}`;
}

const section = (label, body, extra = "") => `<section class="result-part ${extra}"><div class="label section-label"><span>${label}</span></div>${body}</section>`;

// A row that opens the exercise's history: its name, then what is said about it.
const historyRow = (item, end, spoken, extra = "") => `<button class="row ${extra}" type="button" data-action="view-history" data-id="${escapeHtml(item.exerciseId)}" aria-label="${escapeHtml(`${nameOf(item)}, ${spoken}. Open its history`)}">
    <span class="row-main"><span class="row-title">${exerciseMarkup(item.exercise, item.name)}</span></span>
    ${end}
    <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
  </button>`;

// ---------- the parts ----------

function headMarkup(record, dateKey) {
  return `<header class="round-head result-head">
    <div class="round-title">
      <h1>${escapeHtml(record.name || "Workout")} done</h1>
      ${record.minutes ? `<span>${durationText(record.minutes)}</span>` : ""}
    </div>
    <p class="round-facts"><span>${escapeHtml(shortDate(dateKey))} · saved to your log</span></p>
  </header>`;
}

// How it went in one line, against the day before (each exercise's own last session).
function tallyMarkup(items) {
  if (!items.length) return `<p class="hint result-tally">No sets were logged.</p>`;
  const parts = tallyParts(items);
  if (!parts.length) return `<p class="hint result-tally">First time for every exercise: nothing to compare with yet.</p>`;
  const days = new Set(items.filter((item) => item.previous).map((item) => item.previous));
  const against = days.size === 1 ? shortDate([...days][0]) : "last time";
  return `<div class="result-tally">
    <p class="result-score">${parts.map(([number, word]) => `<span class="nowrap${number && (word === "up" || word === "down") ? ` ${word}` : ""}">${number} ${word}</span>`).join(" · ")}</p>
    <p class="hint">against ${escapeHtml(against)}</p>
  </div>`;
}

function bestsMarkup(items) {
  const bests = items.filter((item) => item.best);
  if (!bests.length) return "";
  return section("New bests", bests.map((item) => {
    const now = setText(item.best.set, item.unit);
    const before = setText(item.best.before, item.unit);
    return historyRow(item, `<span class="result-set"><strong>${escapeHtml(now)}</strong><small>before ${escapeHtml(before)}</small></span>`, `new best ${now}, before ${before}`, "result-best");
  }).join(""));
}

// Where the round it was filed in stands: its bar, how many are done and what is next.
// One that completed its round says so, with the days it took and how the next starts.
function roundMarkup(state, record, routineId, dateKey) {
  const tag = record.round ? { number: record.round, block: record.block || 1 } : null;
  const round = tag && roundRecord(state, tag);
  if (!round) return "";
  const summary = roundSummary(state);
  const next = summary.counting ? nextWorkout(state) : null;
  const last = round.workouts.at(-1);
  const completed = !round.open && round.ended === "complete" && last?.dateKey === dateKey && last.routineId === routineId;
  const segments = round.open ? summary.required.map((routine) => summary.done.has(routine.id)) : Array.from({ length: round.required }, (_, index) => index < round.done);
  const left = workoutsDone(round.done, round.required);
  let right = round.open ? (next ? `next: ${next.name}` : "") : round.ended === "complete" ? "complete" : "ended";
  // Completed by this workout: the days it took, then how the next round starts.
  let then = "";
  if (completed) {
    right = `in ${plural(daysBetween(round.from, round.to) + 1, "day")}`;
    then = !next ? "" : summary.workouts.length ? `Next: ${next.name}` : `${roundName(summary)} starts with ${next.name}`;
  }
  const note = record.guest ? `An extra from ${record.program || "another program"}: it counts toward nothing.`
    : record.optional ? "An optional workout: it counts toward nothing." : "";
  return section(`${escapeHtml(roundName(tag))}${completed ? " complete" : ""}`, `<div class="result-round">
    ${note ? `<p class="hint">${escapeHtml(note)}</p>` : ""}
    <div class="round-bar" aria-hidden="true">${segments.map((done) => `<i${done ? ` class="is-done"` : ""}></i>`).join("")}</div>
    <p class="round-facts"><span>${escapeHtml(left)}</span><span>${escapeHtml(right)}</span></p>
    ${then ? `<p class="round-facts">${escapeHtml(then)}</p>` : ""}
  </div>`);
}

// Up and Down as rows, each opening the exercise's history; Same (and First time) as one
// line of names. A new best is listed once, under New bests.
function changesMarkup(items) {
  const rows = (kind) => items.filter((item) => item.kind === kind && !item.best).map((item) => historyRow(item, `<em class="history-change ${kind}">${escapeHtml(item.text)}</em>`, `${kind} ${item.text.slice(2)}`, "compact")).join("");
  const line = (kind) => names(items.filter((item) => item.kind === kind));
  return [
    ["Up", rows("up")],
    ["Down", rows("down")],
    ["Same", line("same") && `<p class="result-text">${line("same")}</p>`],
    ["First time", line("first") && `<p class="result-text">${line("first")}</p>`],
  ].filter(([, body]) => body).map(([label, body]) => section(label, body)).join("");
}

// Next time: add weight where every set reached the top of the rep range today.
function nextTimeMarkup(items) {
  const heavier = items.filter((item) => item.addWeight);
  if (!heavier.length) return "";
  const list = heavier.map((item) => `${escapeHtml(nameOf(item))} <em>(all sets hit ${item.addWeight})</em>`).join(", ");
  return section("Next time", `<p class="result-text"><strong>Add weight</strong> on ${list}</p>`);
}

// What wasn't done: the main exercises neither marked done nor logged, then the optional
// ones. Not told for a workout whose routine has been deleted since.
function notDoneMarkup(state, routineId, dateKey) {
  const session = state.sessions[dateKey];
  const left = slotsOf(state, routineId, dateKey).filter((slot) => !isEntryChecked(state, dateKey, routineId, slot.id) && session.logs[slot.id]?.routineId !== routineId);
  const named = (slots) => slots.map((slot) => fullName(exerciseById(state, slot.choices[0]?.exerciseId))).filter(Boolean).map(escapeHtml).join(", ");
  const main = named(left.filter((slot) => slot.role === "main"));
  const optional = named(left.filter((slot) => slot.role !== "main"));
  if (!main && !optional) return "";
  return section("Not done", `<p class="result-text">${main ? `${main}${optional ? ` <em>(optional: ${optional})</em>` : ""}` : `<em>Optional: ${optional}</em>`}</p>`);
}

// The way back in, for a workout finished today, while none runs.
function continueMarkup(state, routineId, dateKey) {
  const routine = routineById(state, routineId);
  if (!routine || dateKey !== localDateKey() || activeWorkout(state)) return "";
  return `<section class="result-part result-foot">
    <button class="row compact" type="button" data-action="round-reopen" data-id="${escapeHtml(routineId)}" aria-label="Not finished? Continue ${escapeHtml(routine.name)}">
      <span class="row-main"><span class="row-title"><em>Not finished?</em> Continue ${escapeHtml(routine.name)}</span></span>
      <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
    </button>
  </section>`;
}

function backupMarkup(state) {
  const age = backupAge(state);
  if (age !== null && age <= 14) return "";
  return `<p class="hint result-note">${age === null ? "No backup yet." : `Last backup was ${age} days ago.`} Export one in Settings.</p>`;
}

function markup(state) {
  const { routineId, dateKey } = shown;
  const record = state.sessions[dateKey].workouts?.[routineId] || {};
  const items = compared(state, routineId, dateKey);
  return `<section class="page result-page">
    ${headMarkup(record, dateKey)}
    ${tallyMarkup(items)}
    ${bestsMarkup(items)}
    ${roundMarkup(state, record, routineId, dateKey)}
    ${changesMarkup(items)}
    ${nextTimeMarkup(items)}
    ${notDoneMarkup(state, routineId, dateKey)}
    ${continueMarkup(state, routineId, dateKey)}
    ${backupMarkup(state)}
  </section>`;
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
  // Gone from the Log (another backup imported, the day unticked, the workout reopened).
  unavailable: (state) => !isFinished(state),
  backTo: () => (isPastDay() ? "calendar" : ""),
});

registerActions({
  "open-result": (button) => showResult(button.dataset.id, button.dataset.date),
  "result-done": () => navigate(isPastDay() ? "calendar" : "round", { motion: isPastDay() ? "" : "pop" }),
});
