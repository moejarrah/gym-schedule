// Workout screen: one workout. Until it is started, the selected routine as a
// read-only preview with Start; from Start to "Finish workout" the running one,
// whatever else is selected: a slot's number opens its logging sheet, its sets show
// at the end of its row, and exercises can be added for that day only. Also here:
// the finish summary and the exercise-choices sheet of multi-choice slots. The round,
// which workout is next and the choice of program are the Round tab's.

import { afterRender, navigate, registerActions, registerView, render, store } from "../context.js";
import { $, chevronIcon, closeDialog, confirmAction, escapeHtml, openDialog, playIcon, plural, redraw, report, toast } from "../dom.js";
import { activeProgram, activeRoutine, activeWorkout, addExtra, backupAge, cancelWorkout, dayExtras, entryLog, entryNumber, exerciseById, exerciseHistory, findSlot, finishWorkout, fullName, isEntryChecked, lastFinished, localDateKey, longBreak, openRound, orderedEntries, roundSummary, routineById, routineProgram, setRoundNumber, startWorkout, usualExtras } from "../model.js";
import { compareSets, exerciseMode, exerciseProgress } from "../progress.js";
import { openPicker } from "./entry-editor.js";
import { openLogger } from "./logger.js";
import { openExerciseReference, openExerciseVideo } from "./reference.js";
import { alternativeNames, entryPresentation, exerciseFactLines, exerciseMarkup, movementMarkup, roundName, saysOptional, setChipsMarkup, setsSummary, shortDate, slotMotion, videoUrl } from "./shared.js";

// When Start was last tapped (page time), to ignore a double-tap landing on Cancel.
let startedTapAt = -Infinity;

// The routine slot shown in the open choices sheet.
const choicesSheet = { routineId: "", entryId: "" };

const plusIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;

// The routine on screen: the one whose workout is running, otherwise the selected one.
const shownRoutine = (state) => (activeWorkout(state) ? routineById(state, activeWorkout(state).routineId) : activeRoutine(state));

// The day of the workout in progress; "" while the screen is a preview.
const workoutDay = (state) => activeWorkout(state)?.dateKey || "";

// ---------- markup ----------

// The header: what this workout is to the round, over its name; at the right its one
// control (Start or Reopen; while it runs, Cancel and the stopwatch). Under it one
// line with a fact at each end.
function headMarkup(state, routine) {
  const workout = activeWorkout(state);
  const todayKey = localDateKey();
  const summary = roundSummary(state);
  const open = summary.counting ? summary : null;
  // What today's Log keeps of this routine when it was already finished today.
  const record = !workout && state.sessions[todayKey]?.routineIds.includes(routine.id) ? state.sessions[todayKey].workouts[routine.id] || {} : null;
  // A round is named only when it is known: a reopened workout stays in the round it was
  // filed in, and one logged for a past day joins the round that was open on that day.
  const filed = (tag) => (tag?.round ? { number: tag.round, block: tag.block || 1 } : null);
  const [round, what] = workout
    ? [workout.reopened ? filed(workout.reopened) : workout.backdated ? null : open, workout.home ? `extra workout · ${routineProgram(state, routine.id).name}` : "in progress"]
    : record
      ? [filed(record), "done today"]
      : [open, summary.remaining[0]?.id === routine.id ? "next workout" : "workout"];
  const eyebrow = round ? `${roundName(round)} · ${what}` : what.charAt(0).toUpperCase() + what.slice(1);
  const last = record ? todayKey : lastFinished(state, routine.id, workout?.dateKey || todayKey);
  return `<header class="workout-head ${workout?.home ? "is-guest" : ""}">
      <p class="label truncate">${escapeHtml(eyebrow)}</p>
      <h2 class="bar-title truncate">${escapeHtml(routine.name)}</h2>
      <div class="workout-control">${controlMarkup(workout, routine, Boolean(record))}</div>
    </header>
    <div class="label-row workout-facts">
      <span>${plural(daySlots(state, routine, workoutDay(state)).length, "exercise")}</span>
      <span>${last ? `last done ${escapeHtml(shortDate(last))}` : "not done yet"}</span>
    </div>`;
}

function controlMarkup(workout, routine, doneToday) {
  if (workout) {
    const clock = workout.reopened ? "" : workout.backdated || workout.dateKey !== localDateKey()
      ? `<span class="workout-clock">for ${escapeHtml(shortDate(workout.dateKey))}</span>`
      : `<span class="workout-clock" data-elapsed>${elapsedText(workout.startedAt)}</span>`;
    return `<button class="button text" type="button" data-action="cancel-workout">${workout.reopened ? "Close again" : "Cancel"}</button>${clock}`;
  }
  return `<button class="button primary" type="button" data-action="start-workout" data-id="${escapeHtml(routine.id)}" aria-label="${doneToday ? "Reopen today's workout" : `Start ${escapeHtml(routine.name)}`}">${doneToday ? "Reopen" : "Start"}</button>`;
}

function routineNoteMarkup(note) {
  if (!note.trim()) return "";
  return `<details class="note" data-keep-open="routine-note">
    <summary><span class="hint clamp-2">${escapeHtml(note.trim())}</span>${chevronIcon("down")}</summary>
    <p class="hint">${escapeHtml(note)}</p>
  </details>`;
}

// Nothing to show or do here yet: the way on is the Program tab.
function emptyMarkup(title, text, look = "primary") {
  return `<div class="empty"><h3>${title}</h3><p>${text}</p><button class="button ${look}" type="button" data-view="routines">Go to Program</button></div>`;
}

// The list keeps its scroll position while the same routine is shown, so ticking
// a slot doesn't jump; another routine starts at its first exercise.
function pageMarkup(state) {
  const program = activeProgram(state);
  const routine = shownRoutine(state);
  if (!routine) {
    return `<section class="page fills">${program
      ? emptyMarkup("No workout selected", `${escapeHtml(program.name)} has no workouts yet. Add the first one in Program.`)
      : emptyMarkup("No program yet", "Add a program and its workouts in Program.")}</section>`;
  }
  return `<section class="page fills">
    ${headMarkup(state, routine)}
    ${routineNoteMarkup(routine.note)}
    ${routine.entries.length || activeWorkout(state)
      ? `<div class="scroll" data-keep-scroll="workout-${escapeHtml(routine.id)}">${listMarkup(state, routine)}</div>`
      : emptyMarkup("No exercises yet", "Add this workout's exercises in Program.", "")}
  </section>`;
}

function listMarkup(state, routine) {
  const dateKey = workoutDay(state);
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
        <span class="row-body"><span class="row-main"><span class="row-title">${exerciseMarkup(exercise)}</span><span class="row-meta">${count === 1 ? "once" : `${count} times`} in 4 weeks</span></span></span>
        <button class="icon-button" type="button" data-action="add-extra" data-id="${escapeHtml(exercise.id)}" aria-label="Add ${escapeHtml(fullName(exercise))} for today">${plusIcon}</button>
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

// ---------- a slot ----------
// The list is quiet: a slot is its number, its movement and its sets. One slot at a
// time is open, showing the rest (setup, last time, note, alternatives) in place.
// While a workout runs the app opens the first slot not done yet; tapping a row
// opens that one instead, and tapping the open one closes it.

// The owner's own choice: { routineId, slotId ("" = none open), wasDone, doneIds }.
// It ends with the workout.
let chosen = null;

const daySlots = (state, routine, dateKey) => [
  ...orderedEntries(routine),
  ...(dateKey ? dayExtras(state, dateKey, routine.id).map((extra) => findSlot(state, routine.id, extra.id, dateKey)) : []),
];

function openSlotId(state, routine, dateKey) {
  const done = (slotId) => Boolean(dateKey) && isEntryChecked(state, dateKey, routine.id, slotId);
  const slots = daySlots(state, routine, dateKey);
  // The choice stands until the chosen slot gets done; then the next one opens by itself.
  if (chosen?.routineId === routine.id && (chosen.slotId === "" || slots.some((slot) => slot.id === chosen.slotId)) && (chosen.slotId === "" ? !slots.some((slot) => done(slot.id) && !chosen.doneIds.includes(slot.id)) : done(chosen.slotId) === chosen.wasDone)) return chosen.slotId;
  return dateKey ? slots.find((slot) => !done(slot.id))?.id || "" : "";
}

// One slot of the routine, or an exercise added for the day. Outside a workout
// (no dateKey) it shows no progress and can't be logged.
function slotMarkup(state, routine, slot, number, dateKey, showOptionalRole = false) {
  const { choices, preferred, title: name, prescription } = entryPresentation(slot, state);
  const checked = Boolean(dateKey) && isEntryChecked(state, dateKey, routine.id, slot.id);
  const log = dateKey ? entryLog(state, dateKey, slot.id) : null;
  // What was logged today is the exercise the slot shows; otherwise its preferred choice.
  const shown = choices.find((item) => item.exercise && item.exercise.id === log?.exerciseId) || preferred;
  const others = choices.filter((item) => item !== shown);
  const status = checked ? ", done" : log ? `, ${plural(log.sets.length, "set")} logged` : "";
  const open = openSlotId(state, routine, dateKey) === slot.id;
  const data = `data-routine-id="${escapeHtml(routine.id)}" data-entry-id="${escapeHtml(slot.id)}"`;
  const end = log ? setsSummary(log) : checked ? "Done" : slot.choices[0].prescription ? prescription : "";
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
  const last = exercise ? exerciseHistory(state, exercise.id, { beforeDateKey: dateKey || localDateKey(), limit: 1 })[0] : null;
  const note = slot.note.trim();
  // One labelled line per fact, always in this order; a line with nothing to say is left out.
  const line = (name, value) => (value ? `<div class="slot-line"><span>${name}</span><span>${value}</span></div>` : "");
  // A line that opens something is one button: its value in the accent colour, then an arrow.
  const linkLine = (name, value, attributes) => (value ? `<button class="slot-line" type="button" ${attributes}><span>${name}</span><span class="slot-link">${value}</span>${chevronIcon("right")}</button>` : "");
  const video = exercise?.videoId
    ? `<a class="button" href="${videoUrl(exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for preferred choice ${escapeHtml(shown.name)}">Video</a>`
    : `<button class="button" type="button" data-action="open-workout-video" data-id="${escapeHtml(exercise?.id || "")}" aria-label="Find a video for preferred choice ${escapeHtml(shown.name)}">Video</button>`;
  return `<div class="slot-open" data-open-slot>
    ${row}
    <div class="slot-detail" data-slot="${escapeHtml(slot.id)}">
      ${exerciseFactLines(exercise, shown.prescription).map(([name, value]) => line(name, value)).join("")}
      ${line("Today", log ? `<span class="set-chips">${setChipsMarkup(log.sets, { timed: log.unit === "sec" })}</span>` : "")}
      ${linkLine("Last time", last ? `${escapeHtml(setsSummary(last))}<small>${escapeHtml(shortDate(last.dateKey))}</small>` : "", `data-action="view-history" data-id="${escapeHtml(exercise?.id || "")}" aria-label="Last time ${last ? escapeHtml(`${setsSummary(last)}, ${shortDate(last.dateKey)}`) : ""}. Open history of ${escapeHtml(shown.name)}"`)}
      ${line("Note", escapeHtml(note))}
      ${linkLine(others.length > 1 ? "Alternatives" : "Alternative", alternativeNames(others, exercise).map(escapeHtml).join(", "), `data-action="open-entry-choices" ${data} aria-label="Open exercise choices for ${escapeHtml(name)}"`)}
      <div class="actions">
        ${dateKey ? `<button class="button primary" type="button" data-action="open-logger" data-routine-id="${escapeHtml(routine.id)}" data-id="${escapeHtml(slot.id)}">Log sets</button>` : ""}
        <button class="button" type="button" data-action="open-workout-exercise" data-id="${escapeHtml(exercise?.id || "")}" ${data} data-prescription="${escapeHtml(shown.prescription)}" aria-label="Open exercise page for ${escapeHtml(shown.name)}">Details</button>
        ${video}
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

function entryChoicesMarkup(state, routine, entry) {
  const rows = entryPresentation(entry, state).choices.map((item, index) => {
    const video = item.exercise.videoId
      ? `<a class="icon-button is-linked" href="${videoUrl(item.exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for ${escapeHtml(item.name)}"><span class="play">${playIcon()}</span></a>`
      : `<button class="icon-button" type="button" data-action="open-choice-video" data-index="${index}" aria-label="Find a video for ${escapeHtml(item.name)}"><span class="play">${playIcon()}</span></button>`;
    return `<div class="row split">
      <button class="row-body" type="button" data-action="open-choice-reference" data-index="${index}" aria-label="Open reference for ${escapeHtml(item.name)}">
        <span class="row-main"><span class="row-title">${item.markup}</span><span class="row-meta">${escapeHtml(item.prescription)}</span></span>
        <span class="label accent" style="visibility: ${index === 0 ? "visible" : "hidden"}">Preferred</span>
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
    groups[name].push({ title: entryPresentation(slot, state).titleMarkup, log });
  }
  const groupMarkup = ([name, items]) => `<details class="finish-group" data-keep-open="${name}">
    <summary><span>${name}</span><strong>${items.length}</strong>${chevronIcon("down")}</summary>
    ${items.map(({ title, log }) => `<div class="row-main">
      <span class="row-title">${log ? exerciseMarkup(exerciseById(state, log.exerciseId), log.exerciseName) : title}</span>
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
    return `<div class="row"><span class="row-title">${exerciseMarkup(exerciseById(state, log.exerciseId), log.exerciseName)}</span><em class="history-change ${change.kind}">${escapeHtml(change.text)}</em></div>`;
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

registerView("workout", { markup: pageMarkup, afterDraw() { motion.unfold(shownRoutine(store.getState())?.id || ""); } });

// A one-choice row opens its exercise's reference in the context of this slot.
function openRowReference(button) {
  const { id, routineId, entryId, prescription } = button.dataset;
  const routine = routineById(store.getState(), routineId);
  const entry = routine.entries.find((item) => item.id === entryId);
  openExerciseReference(id, { prescription, routineName: routine.name, routineNote: entry?.note || "" });
}

// Logging and adding exercises need a workout in progress.
function runningWorkout() {
  const workout = activeWorkout(store.getState());
  if (!workout) toast("Start the workout first.");
  return workout;
}

// A workout that was cancelled or closed again hands back to the Round tab.
function backToRound() {
  chosen = null;
  render();
  navigate("round");
}

registerActions({
  // Start begins the workout at once. Reopening today's finished workout is no new start:
  // it changes nothing about the round.
  "start-workout": (button) => {
    const { id } = button.dataset;
    const state = store.getState();
    const reopening = Boolean(state.sessions[localDateKey()]?.routineIds.includes(id));
    // After three weeks away the Round tab asks how to carry on, before anything starts.
    if (!reopening && longBreak(state)) {
      navigate("round");
      return;
    }
    const result = store.update((draft) => {
      if (!reopening && !openRound(draft)) setRoundNumber(draft, 1);
      startWorkout(draft, id);
    });
    startedTapAt = performance.now();
    // A slot closed while this was a preview doesn't keep the first exercise shut.
    if (chosen?.slotId === "") chosen = null;
    if (report(result)) render();
  },
  "cancel-workout": async () => {
    const { routineId, reopened } = activeWorkout(store.getState());
    // The second tap of a double-tap on Start lands here; it isn't a wish to cancel.
    if (performance.now() - startedTapAt < 500) return;
    // A reopened workout just closes again; nothing is deleted.
    if (reopened) {
      if (report(store.update(cancelWorkout))) backToRound();
      return;
    }
    const confirmed = await confirmAction({
      title: `Cancel ${routineById(store.getState(), routineId).name}?`,
      message: "Everything logged in this workout is deleted: its sets, done marks and added exercises. This can't be undone.",
      confirmLabel: "Cancel workout",
      cancelLabel: "Keep going",
    });
    if (confirmed && report(store.update(cancelWorkout), "Workout cancelled.")) backToRound();
  },
  "review-workout": () => {
    redraw("#finishContent", finishMarkup(store.getState()));
    openDialog("#finishDialog");
  },
  // Finishing swaps the summary for the result: how it went against last time. Closing
  // the result, however it is closed, returns to the Round tab.
  "finish-workout": () => {
    const { routineId, dateKey } = activeWorkout(store.getState());
    if (!report(store.update((draft) => finishWorkout(draft)))) return;
    redraw("#finishContent", resultMarkup(store.getState(), routineId, dateKey));
    openDialog("#finishDialog", { onClose: () => navigate("round") });
    chosen = null;
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
  // Opens a slot in place, or closes the one that's open.
  "toggle-slot": (button) => {
    const state = store.getState();
    const routine = shownRoutine(state);
    const dateKey = workoutDay(state);
    const done = (slotId) => Boolean(dateKey) && isEntryChecked(state, dateKey, routine.id, slotId);
    const slotId = button.getAttribute("aria-expanded") === "true" ? "" : button.dataset.entryId;
    chosen = { routineId: routine.id, slotId, wasDone: slotId ? done(slotId) : false, doneIds: daySlots(state, routine, dateKey).filter((slot) => done(slot.id)).map((slot) => slot.id) };
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
  if (!dialog.open) return;
  const current = sheetEntry(state);
  if (!current || current.entry.choices.length < 2) closeDialog(dialog);
  else redraw("#entryChoicesContent", entryChoicesMarkup(state, current.routine, current.entry));
}

afterRender(refreshEntryChoices);
