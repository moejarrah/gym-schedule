// The result: a page of the Workout tab that shows how a finished workout went. It is
// pushed in after Finish, and again from the round page's "How it went"; its bottom
// button Done goes back to the round page (to Log for a workout logged for a past day),
// as does a drag from the left edge. Built from saved data only: what it shows is the
// workout and day held in `shown`, which a reload forgets (the app then opens on the
// round page). The workout's name and day, then four cards: Summary (a bar with a segment
// per main exercise, and under it time, sets, exercises done and the tally against last
// time), Exercises (every one done, its sets and its change against last time), Not done,
// and More (continue, back up, delete this workout). Nothing about the round: the round page
// tells that.

import { navigate, pauseTaps, registerActions, registerView, store } from "../context.js";
import { chevronIcon, confirmAction, escapeHtml, plural, report, toast } from "../dom.js";
import { activeWorkout, backupAge, dayExtras, deleteWorkout, exerciseById, localDateKey, roundReopenedBy, routineById, routineProgram, workoutName, workoutStanding } from "../model.js";
import { workoutComparison } from "../progress.js";
import { label } from "../vocab.js";
import { durationText, formatKg, movementMarkup, roundName, setupText, shortDate } from "./shared.js";

// The finished workout shown: its routine and its day.
const shown = { routineId: "", dateKey: "" };

const isFinished = (state, { routineId, dateKey } = shown) => Boolean(state.sessions[dateKey]?.routineIds.includes(routineId));
const isPastDay = () => shown.dateKey !== localDateKey();

// ---------- reading the workout ----------

// Each exercise logged in it against its session before, in the order of its slots
// (the routine's, then the day's extras), with the log itself.
function compared(state, routineId, dateKey) {
  const { slots } = workoutStanding(state, routineId, dateKey);
  const order = (item) => {
    const index = slots.findIndex((slot) => slot.id === item.slotId);
    return index < 0 ? slots.length : index;
  };
  return workoutComparison(state, routineId, dateKey)
    .map((item) => ({ ...item, exercise: exerciseById(state, item.exerciseId), log: state.sessions[dateKey].logs[item.slotId] }))
    .sort((a, b) => order(a) - order(b));
}

// "▲ 3 ▼ 1" against last time (a count left out when it is zero; "= 2" when nothing went
// up or down), or "" when nothing could be compared (nothing logged, or all first time).
export function tallyText(items) {
  if (!items.some((item) => item.kind !== "first")) return "";
  const count = (kind) => items.filter((item) => item.kind === kind).length;
  const parts = [count("up") ? `▲ ${count("up")}` : "", count("down") ? `▼ ${count("down")}` : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : `= ${count("same")}`;
}

// The tally of a finished workout, for the round page's "How it went" line.
export const workoutTally = (state, routineId, dateKey) => tallyText(compared(state, routineId, dateKey));

// ---------- words ----------

// "A", "A and B", "A, B and C".
const listText = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

// The sets of a log as lines, one per weight in the order done: [weight, reps], the weight
// "42.5 kg" ("" without weight; "−20 kg" assisted), the reps "10 · 9 · 8" (seconds for
// timed work) with "+1 drop" after the sets drops followed. Warm-ups are left out unless
// they are all there is.
export function setLines(log) {
  const working = log.sets.some((set) => !set.warmup) ? log.sets.filter((set) => !set.warmup) : log.sets;
  const groups = [];
  for (const set of working) {
    if (groups.at(-1)?.kg === set.kg) groups.at(-1).sets.push(set);
    else groups.push({ kg: set.kg, sets: [set] });
  }
  return groups.map(({ kg, sets }) => {
    const drops = sets.reduce((count, set) => count + set.drops.length, 0);
    const reps = `${sets.map((set) => set.reps).join(" · ")}${drops ? ` +${drops} drop${drops === 1 ? "" : "s"}` : ""}`;
    return [kg === null ? "" : `${formatKg(kg).replace(/^-/, "−")} kg`, reps];
  });
}

// The change against last time in a few characters: "▲ 2.5" (kg), "▼ 1 rep", "new", "=".
function changeText(item) {
  if (item.kind === "first") return "new";
  if (item.kind === "same") return "=";
  return item.text.replace(/ kg$/, "");
}

// ---------- the pieces ----------

// A card: its small label, and what sits at the right of the label row.
const card = (title, body, right = "") => `<section class="result-card" aria-label="${title}">
    <h2 class="label result-card-label"><span>${title}</span>${right ? `<span>${right}</span>` : ""}</h2>
    ${body}
  </section>`;

// An exercise: its movement (with a Best tag), and under it its setup and, when the
// weight isn't the whole load, what it is ("Per side", "Assistance").
function exerciseCell(exercise, savedName, best = false) {
  const setup = exercise ? [setupText(exercise), exercise.weightMode ? label(exercise.weightMode) : ""].filter(Boolean).join(" · ") : "";
  return `<span class="result-name">
    <span class="result-title"><span class="truncate">${movementMarkup(exercise, savedName)}</span>${best ? `<span class="label tag result-best">Best</span>` : ""}</span>
    <small class="truncate">${escapeHtml(setup) || "&nbsp;"}</small>
  </span>`;
}

const chev = (direction = "right") => `<span class="chev" aria-hidden="true">${chevronIcon(direction)}</span>`;

// ---------- the parts ----------

// The header is the summary: the name and day, a bar with a segment per main exercise
// (filled when marked done or with sets logged), how many were done, its time and sets.
// The summary card: a bar with a segment per main exercise (filled when marked done or with sets
// logged), and under it, sharing its width, four small cells: time, sets, exercises done
// and the tally against last time.
function summaryMarkup(state, record, items, routineId, dateKey) {
  const { counted, isDone, sets, exercises } = workoutStanding(state, routineId, dateKey);
  const tally = escapeHtml(tallyText(items)).replace(/▲ \d+/, (match) => `<span class="up">${match}</span>`).replace(/▼ \d+/, (match) => `<span class="down">${match}</span>`);
  const cells = [
    [record.minutes ? escapeHtml(durationText(record.minutes)) : "–", "time"],
    [String(sets), sets === 1 ? "set" : "sets"],
    [counted.length ? `${counted.filter(isDone).length} of ${counted.length}` : String(exercises), "exercises"],
    [tally || "–", "vs last"],
  ];
  return `<section class="result-card result-summary" aria-label="Summary">
    ${counted.length ? `<div class="round-bar" aria-hidden="true">${counted.map((slot) => `<i${isDone(slot) ? ` class="is-done"` : ""}></i>`).join("")}</div>` : ""}
    <div class="result-cells">${cells.map(([value, name]) => `<p><strong>${value}</strong><small>${name}</small></p>`).join("")}</div>
  </section>`;
}

// The title: the workout's name and, at the right, its day.
const headMarkup = (record, dateKey) => `<header class="round-head result-head">
    <div class="round-title"><h1>${escapeHtml(record.name || "Workout")} done</h1><span>${escapeHtml(shortDate(dateKey))}</span></div>
  </header>`;

// The right side of an exercise's line: one weight over its reps; several weights, one
// line each with its reps beside it; without weight the reps over "reps" (or "sec").
function setsMarkup(item) {
  const lines = setLines(item.log);
  const unit = item.unit === "sec" ? "sec" : "reps";
  if (lines.length === 1) {
    const [weight, reps] = lines[0];
    return `<span class="result-sets"><strong>${weight || reps}</strong><small>${weight ? `${reps}${item.unit === "sec" ? " sec" : ""}` : unit}</small></span>`;
  }
  return `<span class="result-sets is-several">${lines.map(([weight, reps]) => `<span><strong>${weight || `${reps} ${unit}`}</strong>${weight ? `<small>${reps}${item.unit === "sec" ? " sec" : ""}</small>` : ""}</span>`).join("")}</span>`;
}

// Every exercise done, in the workout's order: logged ones with their sets and their
// change against last time, opening the exercise's history; ones marked done without
// sets say so. The label row ends with the tally against last time.
function exercisesMarkup(state, items, routineId, dateKey) {
  const { slots } = workoutStanding(state, routineId, dateKey);
  const logged = new Set(items.map((item) => item.slotId));
  const checked = state.sessions[dateKey].checkedEntryIdsByRoutine?.[routineId] || [];
  const marked = slots.filter((slot) => !logged.has(slot.id) && checked.includes(slot.id));
  const rows = items.map((item) => {
    const said = setLines(item.log).map(([weight, reps]) => (weight ? `${weight} × ${reps}` : `${reps} ${item.unit === "sec" ? "sec" : "reps"}`)).join(", ");
    const change = item.kind === "first" ? "first time" : item.kind === "same" ? "same as last time" : item.text.replace("▲", "up").replace("▼", "down");
    return `<button class="result-line result-exercise" type="button" data-action="view-history" data-id="${escapeHtml(item.exerciseId)}" aria-label="${escapeHtml(`${item.name}: ${said}; ${change}${item.best ? "; new best" : ""}. Open its history`)}">
      ${exerciseCell(item.exercise, item.name, Boolean(item.best))}${setsMarkup(item)}<span class="result-change ${item.kind === "up" || item.kind === "down" ? item.kind : ""}">${escapeHtml(changeText(item))}</span>${chev()}
    </button>`;
  });
  const markedRows = marked.map((slot) => `<div class="result-line result-exercise">${exerciseCell(exerciseById(state, slot.choices[0]?.exerciseId), "Missing exercise")}<span class="result-sets"><strong>Done</strong><small>no sets</small></span></div>`);
  const count = rows.length + markedRows.length;
  if (!count) return "";
  return card(`Exercises · ${count}`, [...rows, ...markedRows].join(""));
}

// What wasn't done: the main exercises (and the ones added for the day) neither marked
// done nor logged, one line each with the setup at the right; then the optional ones
// behind one line that opens them at the end of the card. With only optional ones left,
// that line is a card of its own.
function notDoneMarkup(state, routineId, dateKey) {
  const { slots, isDone } = workoutStanding(state, routineId, dateKey);
  const left = slots.filter((slot) => !isDone(slot));
  const main = left.filter((slot) => slot.role === "main" || slot.extra);
  const optional = left.filter((slot) => slot.role !== "main" && !slot.extra);
  const row = (slot) => {
    const exercise = exerciseById(state, slot.choices[0]?.exerciseId);
    return `<div class="result-line result-left"><span class="truncate">${movementMarkup(exercise, "Missing exercise")}</span><span class="result-value is-quiet"><strong>${exercise ? escapeHtml(setupText(exercise)) : ""}</strong></span></div>`;
  };
  const skipped = optional.length ? `<details class="result-fold" data-keep-open="result-optional">
      <summary class="result-line result-left"><span class="result-label result-quiet">${plural(optional.length, "optional one", "optional ones")} skipped</span>${chev("down")}</summary>
      ${optional.map(row).join("")}
    </details>` : "";
  if (main.length) return card(`Not done · ${main.length}`, `${main.map(row).join("")}${skipped}`);
  return skipped ? `<section class="result-card result-slim" aria-label="Optional ones skipped">${skipped}</section>` : "";
}

// The way back in (for a workout finished today, while none runs), the backup when one
// is due, and deleting this workout.
function actionsMarkup(state, routineId, dateKey) {
  const routine = routineById(state, routineId);
  const age = backupAge(state);
  const line = (inner, attributes) => `<button class="result-line" type="button" ${attributes}>${inner}${chev()}</button>`;
  const lines = [
    routine && dateKey === localDateKey() && !activeWorkout(state)
      ? line(`<span class="result-label is-link">Continue ${escapeHtml(routine.name)}</span>`, `data-action="round-reopen" data-id="${escapeHtml(routineId)}" aria-label="Not finished? Continue ${escapeHtml(routine.name)}"`) : "",
    age === null || age > 14
      ? line(`<span class="result-label is-link">Back up your data</span><span class="result-value is-quiet"><strong>${age === null ? "none yet" : `last ${age} days ago`}</strong></span>`, `data-view="settings" aria-label="Back up your data: ${age === null ? "no backup yet" : `the last one was ${age} days ago`}. Open Settings"`) : "",
    // A workout of the followed program from another day can be done again today.
    routine && dateKey !== localDateKey() && !activeWorkout(state) && routineProgram(state, routineId)?.id === state.settings.activeProgramId
      ? line(`<span class="result-label is-link">Do ${escapeHtml(routine.name)} again today</span>`, `data-action="round-start" data-id="${escapeHtml(routineId)}"`) : "",
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
      ${exercisesMarkup(state, items, routineId, dateKey)}
      ${notDoneMarkup(state, routineId, dateKey)}
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
