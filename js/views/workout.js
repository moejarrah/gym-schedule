// Workout screen: the active-program bar, the routine tabs (whose "select-routine"
// action also serves the Program screen's identical strip) and the selected
// routine's list. A workout runs from "Start workout" to "Finish workout": while
// it runs, a slot's number opens its logging sheet, its sets show under its name,
// and exercises can be added for that day only. Also here: the finish summary
// and the exercise-choices sheet of multi-choice slots.

import { afterRender, registerActions, registerView, render, scrollToTop, store } from "../context.js";
import { $, chevronIcon, closeDialog, confirmAction, escapeHtml, openDialog, playIcon, plural, redraw, report, toast } from "../dom.js";
import {
  activeProgram,
  activeRoutine,
  activeWorkout,
  addExtra,
  backupAge,
  cancelWorkout,
  exerciseHistory,
  dayExtras,
  entryLog,
  entryNumber,
  findSlot,
  finishWorkout,
  isEntryChecked,
  localDateKey,
  orderedEntries,
  programRoutines,
  routineById,
  setActiveRoutine,
  startWorkout,
  usualExtras,
} from "../model.js";
import { compareSets, exerciseMode, exerciseProgress } from "../progress.js";
import { openPicker } from "./entry-editor.js";
import { openLogger } from "./logger.js";
import { openExerciseReference, openExerciseVideo } from "./reference.js";
import { entryPresentation, revealSelectedTab, routineTabsMarkup, saysOptional, setChipsMarkup, shortDate, videoUrl } from "./shared.js";

// When Start was last tapped (page time), to ignore a double-tap landing on Cancel.
let startedTapAt = -Infinity;

// The routine slot shown in the open choices sheet.
const choicesSheet = { routineId: "", entryId: "" };

const plusIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;

// ---------- markup ----------

function programBarMarkup(state, program, routine) {
  if (!program) {
    return `<div class="bar">
      <div class="bar-pick"><span class="label tag active">Active</span><strong>No program</strong></div>
    </div>`;
  }
  return `<div class="bar workout-bar">
    <button class="bar-pick tap" type="button" data-action="open-programs" aria-label="Choose active program, currently ${escapeHtml(program.name)}">
      <span class="label tag active">Active</span>
      <strong class="truncate">${escapeHtml(program.name)}</strong>
      ${chevronIcon("down")}
    </button>
    ${routine ? workoutControlMarkup(state, routine) : ""}
  </div>`;
}

function workoutControlMarkup(state, routine) {
  const { dateKey, other } = workoutView(state, routine);
  const todayKey = localDateKey();
  if (dateKey) {
    const workout = activeWorkout(state);
    const clock = workout.reopened ? "" : workout.backdated || dateKey !== todayKey
      ? `<span class="workout-clock">for ${escapeHtml(shortDate(dateKey))}</span>`
      : `<span class="workout-clock" data-elapsed>${elapsedText(workout.startedAt)}</span>`;
    return `<span class="visually-hidden">${escapeHtml(routine.name)} in progress</span>
      <button class="button text" type="button" data-action="cancel-workout">${workout.reopened ? "Close again" : "Cancel"}</button>${clock}`;
  }
  if (other) return `<button class="button" type="button" data-action="select-routine" data-id="${escapeHtml(other.id)}" aria-label="Go to ${escapeHtml(other.name)}, in progress">Go to ${escapeHtml(other.name)}</button>`;
  const finishedToday = Boolean(state.sessions[todayKey]?.routineIds.includes(routine.id));
  return `${finishedToday ? `<span class="visually-hidden">Finished today</span>` : ""}
    <button class="button primary" type="button" data-action="start-workout" data-id="${escapeHtml(routine.id)}"${finishedToday ? ` aria-label="Reopen today's workout"` : ""}>${finishedToday ? "Reopen" : "Start workout"}</button>`;
}

// A dot on the tab of the routine in progress, a tick on the ones finished today.
function tabMarks(state, routines) {
  const todayKey = localDateKey();
  const marks = {};
  for (const routine of routines) if (state.sessions[todayKey]?.routineIds.includes(routine.id)) marks[routine.id] = "done";
  if (activeWorkout(state)) marks[activeWorkout(state).routineId] = "running";
  return marks;
}

function routineNoteMarkup(note) {
  if (!note.trim()) return "";
  return `<details class="note" data-keep-open="routine-note">
    <summary><span class="hint clamp-2">${escapeHtml(note.trim())}</span>${chevronIcon("down")}</summary>
    <p class="hint">${escapeHtml(note)}</p>
  </details>`;
}

function emptyStateMarkup(program, routine) {
  if (!program) {
    return `<div class="empty"><h3>No programs yet</h3><p>Add a program to organize your workout days.</p><button class="button primary" type="button" data-action="new-program">Add program</button></div>`;
  }
  if (!routine) {
    return `<div class="empty"><h3>No routines yet</h3><p>Add the first workout day to ${escapeHtml(program.name)} in Program.</p><button class="button primary" type="button" data-view="routines">Manage program</button></div>`;
  }
  if (!routine.entries.length) {
    return `<div class="empty"><h3>No exercises yet</h3><p>Open Program to add exercises.</p><button class="button" type="button" data-view="routines">Manage program</button></div>`;
  }
  return "";
}

// What the screen is showing for a routine: `dateKey` is the day of its workout in
// progress ("" when it isn't running), `other` the routine of a workout in
// progress elsewhere.
function workoutView(state, routine) {
  const workout = activeWorkout(state);
  const running = workout?.routineId === routine.id;
  return { dateKey: running ? workout.dateKey : "", other: !running && workout ? routineById(state, workout.routineId) : null };
}

// The list keeps its scroll position while the same routine is shown, so ticking
// a slot doesn't jump; another routine starts at its first exercise.
function pageMarkup(state) {
  const program = activeProgram(state);
  const routine = activeRoutine(state);
  return `<section class="page fills">
    ${programBarMarkup(state, program, routine)}
    ${routineTabsMarkup(programRoutines(state, program), routine?.id, tabMarks(state, programRoutines(state, program)))}
    ${routine ? routineNoteMarkup(routine.note) : ""}
    ${emptyStateMarkup(program, routine)}
    ${!routine && activeWorkout(state) ? `<div class="workout-actions"><button class="button" type="button" data-action="select-routine" data-id="${escapeHtml(activeWorkout(state).routineId)}">Go to ${escapeHtml(routineById(state, activeWorkout(state).routineId).name)}, in progress</button></div>` : ""}
    ${routine?.entries.length || activeWorkout(state)?.routineId === routine?.id && routine ? `<div class="scroll" data-keep-scroll="workout-${escapeHtml(routine.id)}">${listMarkup(state, routine)}</div>` : ""}
  </section>`;
}

function listMarkup(state, routine) {
  const { dateKey } = workoutView(state, routine);
  const todayKey = localDateKey();
  const extras = dateKey ? dayExtras(state, dateKey, routine.id) : [];
  const usual = usualExtras(state, routine.id, dateKey || todayKey);
  const action = dateKey
    ? `<div class="workout-actions">
        <button class="button text" type="button" data-action="pick-extra">${plusIcon}Add exercise for today</button>
        <button class="button primary" type="button" data-action="review-workout">Finish workout</button>
      </div>`
    : "";
  const firstExtraNumber = orderedEntries(routine).length + 1;
  return `
    ${routine.blocks.map((block) => blockMarkup(state, routine, block, dateKey)).join("")}
    ${extras.length ? `<section>
      <div class="label section-label"><span>Added today</span></div>
      ${extras.map((extra, index) => slotMarkup(state, routine, findSlot(state, routine.id, extra.id, dateKey), firstExtraNumber + index, dateKey)).join("")}
    </section>` : ""}
    ${usual.length ? `<section class="workout-group">
      <div class="label section-label"><span>You sometimes add</span></div>
      ${usual.map(({ exercise, count }) => `<div class="row split">
        <span class="row-body"><span class="row-main"><span class="row-line"><span class="row-title">${escapeHtml(exercise.name)}</span><span class="row-meta">${count === 1 ? "once" : `${count} times`} in 4 weeks</span></span></span></span>
        <button class="icon-button" type="button" data-action="add-extra" data-id="${escapeHtml(exercise.id)}" aria-label="Add ${escapeHtml(exercise.name)} for today">${plusIcon}</button>
      </div>`).join("")}
    </section>` : ""}
    ${action}`;
}

// The stopwatch: whole minutes since Start ("34 min", "1 h 05 min").
function elapsedText(startedAt) {
  const minutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

setInterval(() => {
  const workout = activeWorkout(store.getState());
  const label = $("[data-elapsed]");
  if (workout && label) label.textContent = elapsedText(workout.startedAt);
}, 10000);

// Today's sets as small boxes; drops are counted rather than shown.
function loggedSetsMarkup(log) {
  if (!log) return "";
  const drops = log.sets.reduce((count, set) => count + set.drops.length, 0);
  return `<span class="set-chips">${setChipsMarkup(log.sets, { timed: log.unit === "sec", drops: false })}${drops ? `<span class="row-meta">+ ${drops} drop${drops === 1 ? "" : "s"}</span>` : ""}</span>`;
}

// One row: a slot of the routine, or an exercise added for the day. Outside a
// workout (no dateKey) it shows no progress.
function slotMarkup(state, routine, slot, number, dateKey, showOptionalRole = false) {
  const { preferred, title: name, prescription } = entryPresentation(slot, state);
  const exerciseId = preferred.exercise.id;
  const note = slot.note.trim();
  const multiChoice = slot.choices.length > 1;
  const checked = Boolean(dateKey) && isEntryChecked(state, dateKey, routine.id, slot.id);
  const log = dateKey ? entryLog(state, dateKey, slot.id) : null;
  const status = checked ? ", done" : log ? `, ${plural(log.sets.length, "set")} logged` : "";
  const videoControl = preferred.exercise.videoId
    ? `<a class="icon-button is-linked" href="${videoUrl(preferred.exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for preferred choice ${escapeHtml(preferred.name)}"><span class="play">${playIcon()}</span></a>`
    : `<button class="icon-button" type="button" data-action="open-workout-video" data-id="${escapeHtml(exerciseId)}" aria-label="Find a video for preferred choice ${escapeHtml(preferred.name)}"><span class="play">${playIcon()}</span></button>`;

  return `<article class="row split tap ${checked ? "is-done" : ""} ${log ? "has-sets" : ""}">
    <button class="icon-button" type="button" data-action="open-logger" data-routine-id="${escapeHtml(routine.id)}" data-id="${escapeHtml(slot.id)}" aria-label="Log sets for ${escapeHtml(name)}${status}">
      <span class="tickbox" aria-hidden="true">
        <span>${number}</span>
        <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
      </span>
    </button>
    <button class="row-body" type="button" data-action="${multiChoice ? "open-entry-choices" : "open-workout-exercise"}" data-id="${escapeHtml(exerciseId)}" data-entry-id="${escapeHtml(slot.id)}" data-routine-id="${escapeHtml(routine.id)}" data-prescription="${escapeHtml(prescription)}" aria-label="${multiChoice ? `Open exercise choices for ${escapeHtml(name)}` : `View ${escapeHtml(name)} details`}">
      <span class="row-main">
        <span class="row-line"><span class="row-title">${escapeHtml(name)}</span><span class="row-meta">${escapeHtml(slot.choices[0].prescription ? prescription : "")}${showOptionalRole ? `<span class="label tag">Optional</span>` : ""}</span></span>
        ${loggedSetsMarkup(log)}
        ${note ? `<span class="row-meta clamp-2 faint">${escapeHtml(note)}</span>` : ""}
      </span>
    </button>
    ${videoControl}
  </article>`;
}

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

function entryChoicesMarkup(state, routine, entry) {
  const rows = entryPresentation(entry, state).choices.map((item, index) => {
    const video = item.exercise.videoId
      ? `<a class="icon-button is-linked" href="${videoUrl(item.exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for ${escapeHtml(item.name)}"><span class="play">${playIcon()}</span></a>`
      : `<button class="icon-button" type="button" data-action="open-choice-video" data-index="${index}" aria-label="Find a video for ${escapeHtml(item.name)}"><span class="play">${playIcon()}</span></button>`;
    return `<div class="row split">
      <button class="row-body" type="button" data-action="open-choice-reference" data-index="${index}" aria-label="Open reference for ${escapeHtml(item.name)}">
        <span class="row-main"><span class="row-title">${escapeHtml(item.name)}</span><span class="row-meta">${escapeHtml(item.prescription)}</span></span>
        ${index === 0 ? `<span class="label accent">Preferred</span>` : ""}
        ${chevronIcon("right")}
      </button>
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
      <p class="hint">${entry.note.trim() ? `${escapeHtml(entry.note)}\n\n` : ""}Log it from the slot's number on Workout, where you pick which choice you did.</p>
    </div>
  </div>`;
}

// The finish summary: every slot of the workout in one of three groups, each
// opening to show what's in it.
function finishMarkup(state) {
  const { routineId, dateKey } = activeWorkout(state);
  const routine = routineById(state, routineId);
  const slots = [...orderedEntries(routine), ...dayExtras(state, dateKey, routineId).map((extra) => findSlot(state, routineId, extra.id, dateKey))];
  const groups = { Done: [], "Started, not marked done": [], "Not touched": [] };
  for (const slot of slots) {
    const log = entryLog(state, dateKey, slot.id);
    const name = isEntryChecked(state, dateKey, routineId, slot.id) ? "Done" : log ? "Started, not marked done" : "Not touched";
    groups[name].push({ title: entryPresentation(slot, state).title, log });
  }
  const groupMarkup = ([name, items]) => `<details class="finish-group" data-keep-open="${name}">
    <summary><span>${name}</span><strong>${items.length}</strong>${chevronIcon("down")}</summary>
    ${items.map(({ title, log }) => `<div class="row-main">
      <span class="row-title">${escapeHtml(log ? log.exerciseName : title)}</span>
      ${log ? `<span class="set-chips">${setChipsMarkup(log.sets, { timed: log.unit === "sec" })}</span>` : `<span class="row-meta">${name === "Done" ? "No sets logged" : ""}</span>`}
    </div>`).join("") || `<p class="hint">None.</p>`}
  </details>`;
  return `<div class="sheet-panel">
    <header class="sheet-head">
      <div><h2 id="finishTitle">Finish ${escapeHtml(routine.name)}?</h2><p>It goes into the Log for ${escapeHtml(shortDate(dateKey))}.</p></div>
      <button class="icon-button" type="button" data-close-dialog="finishDialog" aria-label="Close summary">×</button>
    </header>
    <div class="sheet-body stack tight">${Object.entries(groups).map(groupMarkup).join("")}</div>
    <footer class="actions">
      <button class="button text" type="button" data-close-dialog="finishDialog">Keep going</button>
      <button class="button primary" type="button" data-action="finish-workout">Finish</button>
    </footer>
  </div>`;
}

// After Finish: duration, what was done, and each logged exercise against its
// session before this one.
function resultMarkup(state, routineId, dateKey) {
  const session = state.sessions[dateKey];
  const record = session.workouts[routineId];
  const logs = Object.values(session.logs).filter((log) => log.routineId === routineId);
  const sets = logs.reduce((count, log) => count + log.sets.filter((set) => !set.warmup).length, 0);
  let bests = 0;
  const rows = logs.map((log) => {
    const progress = exerciseProgress(state, log.exerciseId);
    if (progress.sessions.find((item) => item.dateKey === dateKey)?.isBest) bests += 1;
    const before = exerciseHistory(state, log.exerciseId, { beforeDateKey: dateKey, limit: 1 })[0];
    const change = before ? compareSets(log.sets, before.sets, exerciseMode(progress.sessions), log.unit) : { kind: "same", text: "First time" };
    return `<div class="row"><span class="row-title">${escapeHtml(log.exerciseName)}</span><em class="history-change ${change.kind}">${escapeHtml(change.text)}</em></div>`;
  }).join("");
  const facts = [record?.minutes ? `${record.minutes} min` : "", plural(logs.length, "exercise"), plural(sets, "set"), bests ? plural(bests, "new best", "new bests") : ""].filter(Boolean).join(" · ");
  const age = backupAge(state);
  return `<div class="sheet-panel">
    <header class="sheet-head">
      <div><h2 id="finishTitle">${escapeHtml(record?.name || "Workout")} finished</h2><p>${escapeHtml(facts)}</p></div>
      <button class="icon-button" type="button" data-close-dialog="finishDialog" aria-label="Close summary">×</button>
    </header>
    <div class="sheet-body">
      ${rows ? `<p class="label">Against last time</p>${rows}` : `<p class="hint">No sets were logged.</p>`}
      ${age === null || age > 14 ? `<p class="hint">${age === null ? "No backup yet." : `Last backup was ${age} days ago.`} Export one in Settings.</p>` : ""}
    </div>
    <footer class="actions"><button class="button" type="button" data-close-dialog="finishDialog">Close</button><span></span></footer>
  </div>`;
}

// ---------- screen ----------

registerView("workout", { markup: pageMarkup, afterDraw: revealSelectedTab });

// A one-choice row opens its exercise's reference in the context of this slot.
function openRowReference(button) {
  const { id, routineId, entryId, prescription } = button.dataset;
  const routine = routineById(store.getState(), routineId);
  const entry = routine.entries.find((item) => item.id === entryId);
  openExerciseReference(id, { prescription, routineName: routine.name, routineNote: entry?.note || "" });
}

// Logging and adding exercises need a workout in progress on the routine shown.
function runningWorkout() {
  const state = store.getState();
  const workout = activeWorkout(state);
  if (workout?.routineId === activeRoutine(state)?.id) return workout;
  toast(workout ? `${routineById(state, workout.routineId).name} is in progress. Finish it first.` : "Start the workout first.");
  return null;
}

registerActions({
  "select-routine": (button) => {
    // The routine already showing isn't redrawn: its tab goes back to the top.
    if (button.dataset.id === store.getState().settings.activeRoutineId) {
      scrollToTop();
      return;
    }
    const result = store.update((draft) => setActiveRoutine(draft, button.dataset.id));
    if (report(result)) render({ entering: "routine" });
  },
  "start-workout": (button) => {
    const result = store.update((draft) => startWorkout(draft, button.dataset.id));
    startedTapAt = performance.now();
    if (report(result)) render();
  },
  "cancel-workout": async () => {
    const { routineId, reopened } = activeWorkout(store.getState());
    // The second tap of a double-tap on Start lands here; it isn't a wish to cancel.
    if (performance.now() - startedTapAt < 500) return;
    // A reopened workout just closes again; nothing is deleted.
    if (reopened) {
      if (report(store.update(cancelWorkout))) render();
      return;
    }
    const confirmed = await confirmAction({
      title: `Cancel ${routineById(store.getState(), routineId).name}?`,
      message: "Everything logged in this workout is deleted: its sets, done marks and added exercises. This can't be undone.",
      confirmLabel: "Cancel workout",
      cancelLabel: "Keep going",
    });
    if (confirmed && report(store.update(cancelWorkout), "Workout cancelled.")) render();
  },
  "review-workout": () => {
    redraw("#finishContent", finishMarkup(store.getState()));
    openDialog("#finishDialog");
  },
  // Finishing swaps the summary for the result: how it went against last time.
  "finish-workout": () => {
    const { routineId, dateKey } = activeWorkout(store.getState());
    if (!report(store.update((draft) => finishWorkout(draft)))) return;
    redraw("#finishContent", resultMarkup(store.getState(), routineId, dateKey));
    render();
  },
  "pick-extra": () => {
    if (runningWorkout()) openPicker({ mode: "extra" });
  },
  "add-extra": (button) => {
    if (!runningWorkout()) return;
    const result = store.update((draft) => addExtra(draft, button.dataset.id));
    if (report(result)) render();
  },
  "open-logger": (button) => {
    const workout = runningWorkout();
    if (workout) openLogger(button.dataset.routineId, button.dataset.id, workout.dateKey);
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
  if (!dialog.open) return;
  const current = sheetEntry(state);
  if (!current || current.entry.choices.length < 2) closeDialog(dialog);
  else redraw("#entryChoicesContent", entryChoicesMarkup(state, current.routine, current.entry));
}

afterRender(refreshEntryChoices);
