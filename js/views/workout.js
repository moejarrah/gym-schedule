// The workout in progress: a page of the Workout tab, pushed in from the round page and
// left by its back link ("‹ Round 3") while the workout keeps running (no drag from the
// edge: the number boxes sit there). From Start to Finish: the header says how far it is
// (a bar with one segment per main exercise); a slot's number opens its logging sheet,
// its sets show at the end of its row, one slot at a time is open, and exercises can be
// added for that day only. The bottom button logs the open exercise, then finishes.
// Finish is always at the top right, and always asks first.
// Also here: the bar of the workout in progress that every other page shows, the
// exercise-choices sheet, swapping a slot to another of its choices for today, and keeping the screen on.

import { afterRender, navigate, pauseTaps, registerActions, registerView, render, store } from "../context.js";
import { $, $$, chevronIcon, closeDialog, confirmAction, escapeHtml, fresh, openDialog, playIcon, plural, redraw, report } from "../dom.js";
import { activeWorkout, addExtra, cancelWorkout, dayExtras, entryLog, entryNumber, exerciseHistory, findSlot, finishWorkout, fullName, isEntryChecked, orderedEntries, roundSummary, routineById, routineProgram, usualExtras, workoutHasWork, workoutProgress, workoutStanding } from "../model.js";
import { openPicker } from "./entry-editor.js";
import { openLogger } from "./logger.js";
import { openExerciseReference, openExerciseVideo } from "./reference.js";
import { showResult } from "./result.js";
import { alternativeNames, entryPresentation, exerciseFactLines, exerciseMarkup, movementMarkup, saysOptional, setChipsMarkup, setsSummary, shortDate, slotLine, slotLinkLine, slotMotion, videoUrl } from "./shared.js";

// The routine slot shown in the open choices sheet.
const choicesSheet = { routineId: "", entryId: "" };

const plusIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;

// What the screen remembers about the workout in progress, forgotten when it ends:
// `chosen`, the owner's own choice of open slot ({ slotId ("" = none open), wasDone,
// doneIds }); `swaps`, the choice a slot was swapped to for today (slot id → exercise
// id) until a set of it is saved (the saved log then records which choice was done).
// It is kept on the phone under its own key, outside the saved data, so that a reload
// (iOS reloads an app left in the background) doesn't lose it; anything stale or
// unreadable there is ignored.
const memory = { key: "", chosen: null, swaps: {} };
const MEMORY_KEY = "gymAppWorkoutScreenV1";
function storedMemory(key) {
  try {
    const { key: savedKey, chosen, swaps } = JSON.parse(localStorage.getItem(MEMORY_KEY)) || {};
    const isChosen = chosen === null || (typeof chosen?.slotId === "string" && typeof chosen.wasDone === "boolean" && Array.isArray(chosen.doneIds));
    const isSwaps = swaps && typeof swaps === "object" && !Array.isArray(swaps) && Object.values(swaps).every((id) => typeof id === "string");
    if (savedKey === key && isChosen && isSwaps) return { chosen, swaps };
  } catch (_) { /* unreadable: start afresh */ }
  return {};
}
function keepMemory() {
  try {
    if (memory.key) localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    else localStorage.removeItem(MEMORY_KEY);
  } catch (_) { /* storage full or blocked: it lasts until a reload */ }
}
function remember(workout) {
  const key = workout ? `${workout.routineId} ${workout.dateKey} ${workout.startedAt}` : "";
  if (key === memory.key) return memory;
  Object.assign(memory, { key, chosen: null, swaps: {} }, key ? storedMemory(key) : {});
  if (!key) keepMemory();
  return memory;
}
// Forgotten once the workout is finished or cancelled.
afterRender((state) => { if (!activeWorkout(state)) remember(null); });

// The stopwatch: whole minutes since Start ("34 min", "1 h 05 min").
function elapsedText(startedAt) {
  const minutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

// What stands where the stopwatch is: the minutes; "for <date>" for a workout logged for
// a past day; nothing for a reopened one.
function clockMarkup(workout) {
  if (workout.reopened) return "";
  if (workout.backdated) return `<span>for ${escapeHtml(shortDate(workout.dateKey))}</span>`;
  return `<span data-elapsed>${elapsedText(workout.startedAt)}</span>`;
}

// The exercise a slot shows: the choice logged today, else the one it was swapped to
// for today, else its preferred choice.
function shownChoice(state, slot, dateKey, { choices, preferred } = entryPresentation(slot, state)) {
  const log = entryLog(state, dateKey, slot.id);
  const swapped = memory.swaps[slot.id];
  return choices.find((item) => item.exercise && item.exercise.id === log?.exerciseId)
    || choices.find((item) => item.exercise && item.exercise.id === swapped)
    || preferred;
}

// ---------- markup ----------

// The header: the way back and Finish; the workout's name with its stopwatch; for an
// extra, its program; a bar with a segment per main exercise; how many are done.
function headMarkup(state, workout, progress) {
  const { routine, counted, done, optional, isDone } = progress;
  const round = `Round ${roundSummary(state).number}`;
  return `<header class="round-head workout-head">
    <div class="round-top">
      <button class="link-button" type="button" data-action="workout-back" aria-label="Back to ${round}">${chevronIcon("left")}${round}</button>
      <button class="program-mode" type="button" data-action="finish-workout" aria-label="Finish ${escapeHtml(routine.name)}"><span>Finish</span></button>
    </div>
    <div class="round-title">
      <h1 class="truncate">${escapeHtml(routine.name)}</h1>
      ${clockMarkup(workout)}
    </div>
    ${workout.guest ? `<p class="label">Extra · ${escapeHtml(routineProgram(state, routine.id)?.name || "")}</p>` : ""}
    <div class="round-bar" aria-hidden="true">${counted.map((slot) => `<i${isDone(slot) ? ` class="is-done"` : ""}></i>`).join("")}</div>
    <p class="round-facts"><span>${done} of ${plural(counted.length, "exercise")} done</span><span>${optional ? `${optional} optional` : ""}</span></p>
  </header>`;
}

function routineNoteMarkup(note) {
  if (!note.trim()) return "";
  return `<details class="note" data-keep-open="routine-note">
    <summary><span class="hint clamp-2">${escapeHtml(note.trim())}</span>${chevronIcon("down")}</summary>
    <p class="hint">${escapeHtml(note)}</p>
  </details>`;
}

// The list keeps its scroll position while the same workout is shown, so ticking a
// slot doesn't jump.
function pageMarkup(state) {
  const workout = activeWorkout(state);
  remember(workout);
  const progress = workoutProgress(state, workout);
  const { routine } = progress;
  return `<section class="page fills">
    ${headMarkup(state, workout, progress)}
    ${routineNoteMarkup(routine.note)}
    <div class="scroll" data-keep-scroll="workout-${escapeHtml(routine.id)}">${listMarkup(state, routine, workout)}</div>
  </section>`;
}

// The blocks, what was added for today, then the way to add more and, last of all, the
// way out without filing it.
function listMarkup(state, routine, workout) {
  const { dateKey } = workout;
  const extras = dayExtras(state, dateKey, routine.id);
  const usual = usualExtras(state, routine.id, dateKey);
  const firstExtraNumber = orderedEntries(routine).length + 1;
  return `
    ${routine.blocks.map((block) => blockMarkup(state, routine, block, dateKey)).join("")}
    ${extras.length ? `<section>
      <div class="label section-label"><span>Added today</span></div>
      ${extras.map((extra, index) => slotMarkup(state, routine, findSlot(state, routine.id, extra.id, dateKey), firstExtraNumber + index, dateKey)).join("")}
    </section>` : ""}
    <div class="workout-actions">
      <button class="button text" type="button" data-action="pick-extra">${plusIcon}Add exercise for today</button>
    </div>
    ${usual.length ? `<section class="workout-group">
      <div class="label section-label"><span>You sometimes add</span></div>
      ${usual.map(({ exercise, count }) => `<div class="row split">
        <span class="row-body"><span class="row-main"><span class="row-title">${exerciseMarkup(exercise)}</span><span class="row-meta">${count === 1 ? "once" : `${count} times`} in 4 weeks</span></span></span>
        <button class="icon-button" type="button" data-action="add-extra" data-id="${escapeHtml(exercise.id)}" aria-label="Add ${escapeHtml(fullName(exercise))} for today">${plusIcon}</button>
      </div>`).join("")}
    </section>` : ""}
    <div class="workout-end">
      <button class="button text" type="button" data-action="cancel-workout">${workout.reopened ? "Close again" : "Cancel workout"}</button>
    </div>`;
}

// ---------- a slot ----------
// The list is quiet: a slot is its number, its movement and its sets. One slot at a
// time is open, showing the rest (setup, last time, note, the choice to swap to) in
// place. The first slot not done is open by itself (none once every main exercise is
// done); tapping a row opens that one instead, and tapping the open one closes it.

function openSlotId(state, routine, dateKey) {
  const progress = workoutProgress(state);
  const { slots, isDone } = progress;
  const { chosen } = memory;
  // The choice stands until the chosen slot gets done; then the next one opens by itself.
  if (chosen && (chosen.slotId === "" || slots.some((slot) => slot.id === chosen.slotId)) && (chosen.slotId === "" ? !slots.some((slot) => isDone(slot) && !chosen.doneIds.includes(slot.id)) : isDone({ id: chosen.slotId }) === chosen.wasDone)) return chosen.slotId;
  return progress.next?.id || "";
}

// One slot of the routine, or an exercise added for the day.
function slotMarkup(state, routine, slot, number, dateKey, showOptionalRole = false) {
  const presentation = entryPresentation(slot, state);
  const { choices, title: name } = presentation;
  const checked = isEntryChecked(state, dateKey, routine.id, slot.id);
  const log = entryLog(state, dateKey, slot.id);
  const shown = shownChoice(state, slot, dateKey, presentation);
  const others = choices.filter((item) => item !== shown);
  const status = checked ? ", done" : log ? `, ${plural(log.sets.length, "set")} logged` : "";
  const open = openSlotId(state, routine, dateKey) === slot.id;
  const data = `data-routine-id="${escapeHtml(routine.id)}" data-entry-id="${escapeHtml(slot.id)}"`;
  // The row ends with what was logged, or with the shown choice's own prescription.
  const end = log ? setsSummary(log) : checked ? "Done" : shown.choice?.prescription || "";
  const row = `<article class="row split tap slot ${checked ? "is-done" : ""} ${log ? "has-sets" : ""} ${open ? "is-open" : ""}">
    <button class="icon-button" type="button" data-action="open-logger" data-routine-id="${escapeHtml(routine.id)}" data-id="${escapeHtml(slot.id)}" aria-label="Log sets for ${escapeHtml(name)}${status}">
      <span class="tickbox" aria-hidden="true">
        <span>${number}</span>
        <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
      </span>
    </button>
    <button class="row-body" type="button" data-action="toggle-slot" ${data} aria-expanded="${open}" aria-label="View ${escapeHtml(name)} details">
      <span class="row-main"><span class="row-title">${movementMarkup(shown.exercise)}${others.length ? ` <span class="version">+${others.length}</span>` : ""}${showOptionalRole ? ` <span class="label tag">Optional</span>` : ""}</span></span>
      ${open ? chevronIcon("up") : `<span class="slot-end ${log || checked ? "is-result" : ""}">${escapeHtml(end)}</span>`}
    </button>
  </article>`;
  if (!open) return row;

  const exercise = shown.exercise;
  const last = exercise ? exerciseHistory(state, exercise.id, { beforeDateKey: dateKey, limit: 1 })[0] : null;
  const note = slot.note.trim();
  const id = escapeHtml(exercise?.id || "");
  // One alternative: the line swaps to it. Several: it opens the choices, to pick one.
  const swapNames = alternativeNames(others, exercise).map(escapeHtml).join(", ");
  const swap = others.length === 1
    ? slotLinkLine("Swap to", swapNames, `data-action="swap-choice" ${data} data-exercise-id="${escapeHtml(others[0].exercise?.id || "")}" aria-label="Swap to ${escapeHtml(others[0].name)} for today"`)
    : slotLinkLine("Swap to", swapNames, `data-action="open-entry-choices" ${data} aria-label="Open exercise choices for ${escapeHtml(name)}"`);
  const video = exercise?.videoId
    ? `<a href="${videoUrl(exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for preferred choice ${escapeHtml(shown.name)}">Video</a>`
    : `<button type="button" data-action="open-workout-video" data-id="${id}" aria-label="Find a video for preferred choice ${escapeHtml(shown.name)}">Video</button>`;
  return `<div class="slot-open" data-open-slot>
    ${row}
    <div class="slot-detail" data-slot="${escapeHtml(slot.id)}">
      ${exerciseFactLines(exercise, shown.prescription).map(([label, value]) => slotLine(label, value)).join("")}
      ${slotLine("Today", log ? `<span class="set-chips">${setChipsMarkup(log.sets, { timed: log.unit === "sec" })}</span>` : "")}
      ${slotLinkLine("Last time", last ? `${escapeHtml(setsSummary(last))}<small>${escapeHtml(shortDate(last.dateKey))}</small>` : "", `data-action="view-history" data-id="${id}" aria-label="Last time ${last ? escapeHtml(`${setsSummary(last)}, ${shortDate(last.dateKey)}`) : ""}. Open history of ${escapeHtml(shown.name)}"`)}
      ${slotLine("Note", escapeHtml(note))}
      ${swap}
      <div class="slot-tools">
        <button type="button" data-action="open-workout-exercise" data-id="${id}" ${data} data-prescription="${escapeHtml(shown.prescription)}" aria-label="Open exercise page for ${escapeHtml(shown.name)}">Details</button>
        ${video}
        <button type="button" data-action="view-history" data-id="${id}" aria-label="History of ${escapeHtml(shown.name)}">History</button>
      </div>
    </div>
  </div>`;
}

const motion = slotMotion();

// A block whose entries are all Optional is outlined and says so once in its
// label (unless its name already does, as in "Optional glute block"); in a mixed
// block each Optional entry carries its own tag.
function blockMarkup(state, routine, block, dateKey) {
  const name = block.name.trim();
  const entries = routine.entries.filter((entry) => entry.blockId === block.id);
  if (!entries.length && !name) return "";
  const optionalOnly = entries.length > 0 && entries.every((entry) => entry.role === "optional");
  const mixedRoles = !optionalOnly && entries.some((entry) => entry.role === "optional");
  return `<section class="${optionalOnly ? "workout-group" : ""}" data-block-id="${escapeHtml(block.id)}">
    ${(name || optionalOnly) ? `<div class="label section-label"><span>${escapeHtml(name)}</span>${optionalOnly && !saysOptional(name) ? `<span>Optional</span>` : ""}</div>` : ""}
    ${entries.map((entry) => slotMarkup(state, routine, entry, entryNumber(routine, entry.id), dateKey, mixedRoles && entry.role === "optional")).join("")}
  </section>`;
}

// While a workout runs, the sheet also lets one choice be picked for today.
function entryChoicesMarkup(state, routine, entry) {
  const workout = activeWorkout(state);
  const running = workout?.routineId === routine.id;
  const shownId = running ? shownChoice(state, entry, workout.dateKey).exercise?.id : "";
  const rows = entryPresentation(entry, state).choices.map((item, index) => {
    const video = item.exercise.videoId
      ? `<a class="icon-button is-linked" href="${videoUrl(item.exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for ${escapeHtml(item.name)}"><span class="play">${playIcon()}</span></a>`
      : `<button class="icon-button" type="button" data-action="open-choice-video" data-index="${index}" aria-label="Find a video for ${escapeHtml(item.name)}"><span class="play">${playIcon()}</span></button>`;
    // "Use today" keeps its place on every row; on the choice already shown it is "Today".
    const use = !running ? "" : item.exercise.id === shownId
      ? `<span class="row-action choice-use is-current">Today</span>`
      : `<button class="link-button choice-use" type="button" data-action="swap-choice" data-routine-id="${escapeHtml(routine.id)}" data-entry-id="${escapeHtml(entry.id)}" data-exercise-id="${escapeHtml(item.exercise.id)}" aria-label="Use ${escapeHtml(item.name)} today">Use today</button>`;
    return `<div class="row split">
      <button class="row-body" type="button" data-action="open-choice-reference" data-index="${index}" aria-label="Open reference for ${escapeHtml(item.name)}">
        <span class="row-main"><span class="row-title">${item.markup}</span><span class="row-meta">${escapeHtml(item.prescription)}</span></span>
        <span class="label accent" style="visibility: ${index === 0 ? "visible" : "hidden"}">Preferred</span>
        ${running ? "" : chevronIcon("right")}
      </button>
      ${use}
      ${video}
    </div>`;
  }).join("");
  const blockName = routine.blocks.find((block) => block.id === entry.blockId).name.trim();
  const context = [`Slot ${entryNumber(routine, entry.id)}`, blockName, "first choice is preferred"].filter(Boolean).join(" · ");
  return `<div class="sheet-panel">
    <header class="sheet-head">
      <div><h2 id="entryChoicesTitle">Exercise choices</h2><p>${escapeHtml(context)}</p></div>
      <button class="icon-button" type="button" data-close-dialog="entryChoicesDialog" aria-label="Close exercise choices">×</button>
    </header>
    <div class="sheet-body">
      ${rows}
      ${entry.note.trim() ? `<p class="hint">${escapeHtml(entry.note)}</p>` : ""}
    </div>
  </div>`;
}

// ---------- the bottom button and the bar ----------

// What the bottom button does: log the open exercise (or the next one, when none is
// open), or finish once every main exercise is done and the owner hasn't opened another.
function dockTarget(state) {
  const workout = activeWorkout(state);
  const progress = workoutProgress(state, workout);
  if (!progress) return null;
  const openId = openSlotId(state, progress.routine, workout.dateKey);
  const open = progress.slots.find((slot) => slot.id === openId);
  const picked = open && memory.chosen?.slotId === openId && !progress.isDone(open);
  if (!progress.next && !picked) return null;
  return { workout, slot: open || progress.next };
}

function dockMarkup(state) {
  remember(activeWorkout(state));
  const target = dockTarget(state);
  if (!target) return `<button class="button primary" type="button" data-action="finish-workout"><span>Finish workout</span></button>`;
  const { workout, slot } = target;
  const shown = shownChoice(state, slot, workout.dateKey);
  return `<button class="button primary" type="button" data-action="open-logger" data-routine-id="${escapeHtml(workout.routineId)}" data-id="${escapeHtml(slot.id)}" aria-label="Log sets for ${escapeHtml(shown.name)}"><span>Log sets · ${movementMarkup(shown.exercise)}</span></button>`;
}

// On every other page: the workout in progress as one filled bar that takes him back.
function bannerMarkup(state) {
  const workout = activeWorkout(state);
  const progress = workoutProgress(state, workout);
  if (!progress) return "";
  remember(workout);
  const { routine, counted, done, next } = progress;
  const shown = next ? shownChoice(state, next, workout.dateKey) : null;
  const clock = workout.reopened ? "Reopened" : workout.backdated ? `for ${shortDate(workout.dateKey)}` : elapsedText(workout.startedAt);
  return `<button class="dock-bar" type="button" data-action="workout-resume" aria-label="${escapeHtml(routine.name)} in progress, ${done} of ${counted.length} done. Back to the workout">
    <span><span>${escapeHtml(routine.name)} in progress</span><span${workout.reopened || workout.backdated ? "" : " data-elapsed"}>${escapeHtml(clock)}</span></span>
    <span><span>${done} of ${counted.length} done${shown ? ` · next: ${movementMarkup(shown.exercise)}` : ""}</span><span>Back →</span></span>
  </button>`;
}

// The minutes keep up without redrawing anything else.
setInterval(() => {
  const workout = activeWorkout(store.getState());
  if (!workout) return;
  for (const label of $$("[data-elapsed]")) label.textContent = elapsedText(workout.startedAt);
}, 10000);

// ---------- keeping the screen on ----------

// While a workout runs and the app is in front, the phone doesn't lock. The phone lets go
// whenever the app is hidden, so it is asked again each time the app comes back.
const awake = { lock: null, asking: false };
async function keepAwake() {
  const wanted = Boolean(activeWorkout(store.getState())) && document.visibilityState === "visible";
  if (!wanted) {
    awake.lock?.release().catch(() => {});
    awake.lock = null;
    return;
  }
  if (awake.lock || awake.asking || !navigator.wakeLock) return;
  awake.asking = true;
  try {
    const lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => { if (awake.lock === lock) awake.lock = null; });
    awake.lock = lock;
    if (!activeWorkout(store.getState())) keepAwake();
  } catch (_) { /* not allowed or not supported: the phone locks as usual */ }
  awake.asking = false;
}
afterRender(keepAwake);
document.addEventListener("visibilitychange", keepAwake);

// ---------- screen ----------

registerView("workout", {
  markup: pageMarkup,
  tab: "round",
  dock: dockMarkup,
  banner: bannerMarkup,
  unavailable: (state) => !activeWorkout(state),
  back: () => null,
  afterDraw() { motion.unfold(activeWorkout(store.getState())?.routineId || ""); },
});

// A one-choice row opens its exercise's reference in the context of this slot.
function openRowReference(button) {
  const { id, routineId, entryId, prescription } = button.dataset;
  const routine = routineById(store.getState(), routineId);
  const entry = routine.entries.find((item) => item.id === entryId);
  openExerciseReference(id, { prescription, routineName: routine.name, routineNote: entry?.note || "" });
}

// A workout that was cancelled or closed again hands back to the round page (which
// ignores taps for a moment: a double tap would land on one of its controls).
const backToRound = () => {
  navigate("round", { motion: "pop" });
  pauseTaps();
};

// "A and B", "A, B and C", "A, B and 3 more".
function namesText(names) {
  const shown = names.length > 3 ? [...names.slice(0, 2), `${names.length - 2} more`] : names;
  return shown.length < 2 ? shown.join("") : `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`;
}

// Where the workout stands, for the Finish question, in the header's own numbers and words
// (done = marked done): "5 of 8 exercises done · 14 sets logged." and, when main exercises
// have nothing at all (no done mark, no sets), "Not started: Chest fly, Lateral raise and 2 more."
function standingText(state, workout) {
  const { counted, done } = workoutProgress(state, workout);
  const { isDone, sets } = workoutStanding(state, workout.routineId, workout.dateKey);
  const untouched = counted.filter((slot) => !isDone(slot)).map((slot) => fullName(shownChoice(state, slot, workout.dateKey).exercise));
  const first = `${done} of ${plural(counted.length, "exercise")} done · ${sets ? plural(sets, "set") : "no sets"} logged.`;
  return untouched.length ? `${first}\nNot started: ${namesText(untouched)}.` : first;
}

// Finish always asks first. Its answers: keep going, or finish, which files the workout as
// it stands and pushes in its result (js/views/result.js). With nothing logged or marked
// done the question has a third answer, to cancel the workout instead. A second tap right
// after the answer lands nowhere (pauseTaps).
async function finish() {
  const state = store.getState();
  const workout = activeWorkout(state);
  if (!workout) return;
  const { routineId, dateKey } = workout;
  const name = routineById(state, routineId).name;
  const empty = !workout.reopened && !workoutHasWork(state, workout);
  const answer = await confirmAction(empty ? {
    title: "Nothing is logged",
    message: `${name} has no sets and nothing marked done. Finish it anyway, or cancel it?`,
    confirmLabel: "Finish anyway",
    cancelLabel: "Back to workout",
    extraLabel: "Cancel workout",
    danger: false,
    answer: true,
  } : {
    title: `Finish ${name}?`,
    message: standingText(state, workout),
    confirmLabel: "Finish",
    cancelLabel: "Keep going",
    danger: false,
    answer: true,
  });
  pauseTaps();
  if (activeWorkout(store.getState())?.startedAt !== workout.startedAt) return;
  if (answer === "extra") {
    if (report(store.update(cancelWorkout), "Workout cancelled.")) backToRound();
    return;
  }
  if (answer !== "confirm" || !report(store.update((draft) => finishWorkout(draft)))) return;
  showResult(routineId, dateKey);
}

// Today, the slot shows another of its choices. Once sets are saved the swap moves them,
// so it goes through the logging sheet, which asks first.
function swapTo(button) {
  const { entryId, exerciseId } = button.dataset;
  const workout = activeWorkout(store.getState());
  if (!workout) return;
  closeDialog("#entryChoicesDialog");
  if (entryLog(store.getState(), workout.dateKey, entryId)) {
    openLogger(workout.routineId, entryId, workout.dateKey, { exerciseId });
    return;
  }
  memory.swaps[entryId] = exerciseId;
  keepMemory();
  render();
  fresh(`[data-slot="${CSS.escape(entryId)}"]`);
}

registerActions({
  "workout-back": backToRound,
  "workout-resume": () => navigate("workout", { motion: "push" }),
  // With nothing logged it simply goes; otherwise it asks first. A reopened workout
  // just closes again; nothing is deleted.
  "cancel-workout": async () => {
    const state = store.getState();
    const workout = activeWorkout(state);
    if (!workout) return;
    if (!workout.reopened && workoutHasWork(state, workout)) {
      const confirmed = await confirmAction({
        title: `Cancel ${routineById(state, workout.routineId).name}?`,
        message: "Everything logged in this workout is deleted: its sets, done marks and added exercises. This can't be undone.",
        confirmLabel: "Cancel workout",
        cancelLabel: "Keep going",
      });
      if (!confirmed) return;
    }
    if (report(store.update(cancelWorkout), workout.reopened ? "" : "Workout cancelled.")) backToRound();
  },
  "finish-workout": finish,
  "pick-extra": () => {
    if (activeWorkout(store.getState())) openPicker({ mode: "extra" });
  },
  "add-extra": (button) => {
    const result = store.update((draft) => addExtra(draft, button.dataset.id));
    if (report(result)) render();
  },
  "open-logger": (button) => {
    const workout = activeWorkout(store.getState());
    // A swap for today opens the sheet on that choice; once sets are saved, they decide.
    const swapped = entryLog(store.getState(), workout?.dateKey, button.dataset.id) ? "" : memory.swaps[button.dataset.id];
    if (workout) openLogger(button.dataset.routineId, button.dataset.id, workout.dateKey, { exerciseId: swapped });
  },
  "swap-choice": swapTo,
  // Opens a slot in place, or closes the one that's open.
  "toggle-slot": (button) => {
    const state = store.getState();
    const progress = workoutProgress(state);
    if (!progress) return;
    const slotId = button.getAttribute("aria-expanded") === "true" ? "" : button.dataset.entryId;
    memory.chosen = { slotId, wasDone: slotId ? progress.isDone({ id: slotId }) : false, doneIds: progress.slots.filter(progress.isDone).map((slot) => slot.id) };
    keepMemory();
    motion.fold(() => render());
  },
  "open-entry-choices": openEntryChoices,
  "open-workout-exercise": openRowReference,
  "open-workout-video": (button) => openExerciseVideo(button.dataset.id),
  "open-choice-reference": (button) => {
    const { routine, entry } = sheetEntry(store.getState());
    const choice = entry.choices[Number(button.dataset.index)];
    openExerciseReference(choice.exerciseId, { prescription: choice.prescription, routineName: routine.name, routineNote: entry.note });
  },
  "open-choice-video": (button) => {
    const { entry } = sheetEntry(store.getState());
    openExerciseVideo(entry.choices[Number(button.dataset.index)].exerciseId);
  },
});

// ---------- exercise choices sheet ----------

function sheetEntry(state) {
  const routine = routineById(state, choicesSheet.routineId);
  const entry = routine?.entries.find((item) => item.id === choicesSheet.entryId);
  return entry ? { routine, entry } : null;
}

function openEntryChoices(button) {
  const { routineId, entryId } = button.dataset;
  Object.assign(choicesSheet, { routineId, entryId });
  const state = store.getState();
  const { routine, entry } = sheetEntry(state);
  redraw("#entryChoicesContent", entryChoicesMarkup(state, routine, entry));
  openDialog("#entryChoicesDialog");
}

// Data can change under the open sheet (an exercise edited or deleted from one of
// its references): show the new names, or close it when there's nothing left to choose.
function refreshEntryChoices(state) {
  const dialog = $("#entryChoicesDialog");
  if (!dialog.open || "closing" in dialog.dataset) return;
  const current = sheetEntry(state);
  if (!current || current.entry.choices.length < 2) closeDialog(dialog);
  else redraw("#entryChoicesContent", entryChoicesMarkup(state, current.routine, current.entry));
}

afterRender(refreshEntryChoices);
