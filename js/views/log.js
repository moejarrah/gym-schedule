// Log screen, switched between two views: Calendar (the month, the recent-history
// list) and Progress (the week's workouts, new bests, exercises getting stronger or
// stalled, sets per muscle). Also the day editor sheet (#dayDialog) that sets a
// date's completed routines and note and shows the sets logged that day.
//
// History outlives programs: a session can still name a routine that has since
// been deleted. Those days count as completed and are shown by the name the
// routine had when it was finished ("Deleted routine" when none was kept), so
// they can be kept or unmarked.

import { mainElement, navigate, registerActions, registerView, render, store } from "../context.js";
import { $, $$, chevronIcon, closeDialog, confirmAction, escapeHtml, formatDate, fresh, openDialog, redraw, report, segmentValue } from "../dom.js";
import { activeProgram, calendarWeek, dateFromKey, entryLog, exerciseById, fullName, localDateKey, programRoutines, removeDayLog, roundProgram, routineById, routineProgram, sessionFor, setDay, startTodaysWorkout, startWorkout, workoutName } from "../model.js";
import { overview } from "../progress.js";
import { label } from "../vocab.js";
import { openExerciseHistory } from "./history.js";
import { openLogger } from "./logger.js";
import { exerciseMarkup, locationLabel, roundName, setChipsMarkup, shortDate } from "./shared.js";

const LONG_DATE = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
// The first date formatted in a style is slow (the browser loads its calendar data): the
// Log's styles are made while the app is idle, so the first tap on Log doesn't wait.
(window.requestIdleCallback || setTimeout)(() => {
  for (const options of [LONG_DATE, { month: "long", year: "numeric" }, { day: "numeric", month: "short" }]) formatDate(new Date(), options);
}, { timeout: 2000 });
const RECENT_LIMIT = 8;

const monthStart = (date, offset = 0) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const calendar = { month: monthStart(new Date()) };
const log = { view: "calendar" }; // or "progress"; forgotten when the app is closed

const WEEKLY_SETS_GUIDE = 20; // a full bar in "Sets per muscle"

const deletedLabel = (count) => (count === 1 ? "Deleted workout" : `${count} deleted workouts`);
const minutesLabel = (minutes) => (typeof minutes === "number" ? `${minutes} min` : "");

function logMarkup(state) {
  const option = (value, name) => `<button type="button" data-value="${value}" aria-pressed="${log.view === value}">${name}</button>`;
  return `<section class="page log-page">
    <header class="appbar"><h1 class="title">Log</h1></header>
    <div class="segment log-switch" data-segment data-value="${log.view}" data-action="log-view" role="group" aria-label="Log shows">
      ${option("calendar", "Calendar")}${option("progress", "Progress")}
    </div>
    ${log.view === "progress" ? progressMarkup(state) : calendarMarkup(state)}
  </section>`;
}

// ---------- calendar and recent list ----------

function calendarMarkup(state) {
  const year = calendar.month.getFullYear();
  const month = calendar.month.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = localDateKey();
  const cells = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(`<span aria-hidden="true"></span>`);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = localDateKey(date);
    const session = state.sessions[key];
    const completedCount = session?.routineIds.length || 0;
    const loggedCount = Object.keys(session?.logs || {}).length;
    const trained = Boolean(completedCount || loggedCount);
    const guest = Object.values(session?.workouts || {}).some((record) => record.guest);
    const hasNote = Boolean(session?.note);
    const isToday = key === todayKey;
    const labelParts = [
      formatDate(date, LONG_DATE),
      isToday ? "today" : "",
      completedCount ? `${completedCount} finished ${completedCount === 1 ? "workout" : "workouts"}` : "",
      guest ? "from another program" : "",
      loggedCount ? `sets logged for ${loggedCount} ${loggedCount === 1 ? "exercise" : "exercises"}` : "",
      hasNote ? "note recorded" : "",
    ].filter(Boolean);
    cells.push(`<button class="log-calendar-day tap ${isToday ? "is-today" : ""}" type="button" data-action="open-day" data-date="${key}" aria-label="${escapeHtml(labelParts.join(", "))}"${isToday ? ` aria-current="date"` : ""}>
      <span>${day}</span><span class="log-calendar-markers" aria-hidden="true">${trained ? `<i class="completion-marker ${guest ? "is-guest" : ""}"></i>` : ""}${hasNote ? `<i class="note-marker"></i>` : ""}</span>
    </button>`);
  }
  const trailingBlanks = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingBlanks; index += 1) {
    cells.push(`<span aria-hidden="true"></span>`);
  }
  // Each row starts with its calendar week number.
  const rows = [];
  for (let row = 0; row * 7 < cells.length; row += 1) {
    const monday = localDateKey(new Date(year, month, 1 - firstWeekday + row * 7));
    rows.push(`<span class="log-week" aria-hidden="true">${calendarWeek(monday).week}</span>`, ...cells.slice(row * 7, row * 7 + 7));
  }

  return `<div class="bar">
      <strong class="bar-title">${escapeHtml(formatDate(calendar.month, { month: "long", year: "numeric" }))}</strong>
      <button class="icon-button" type="button" data-action="previous-month" aria-label="Previous month">${chevronIcon("left")}</button>
      <button class="icon-button" type="button" data-action="next-month" aria-label="Next month">${chevronIcon("right")}</button>
    </div>
    <div class="label log-weekdays" aria-hidden="true"><span>Wk</span>${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<span>${day}</span>`).join("")}</div>
    <div class="log-calendar">${rows.join("")}</div>
    <div class="label section-label">Recent</div>
    ${recentSessionsMarkup(state)}`;
}

function recentSessionsMarkup(state) {
  const recentKeys = Object.keys(state.sessions).sort((a, b) => b.localeCompare(a)).slice(0, RECENT_LIMIT);
  if (!recentKeys.length) {
    return `<div class="card row-main log-recent"><strong class="row-title">No history yet</strong><span class="row-meta">Finished workouts and day notes will appear here.</span></div>`;
  }
  return `<div class="stack snug log-recent">${recentKeys.map((dateKey) => recentRowMarkup(state, dateKey)).join("")}</div>`;
}

function recentRowMarkup(state, dateKey) {
  const session = state.sessions[dateKey];
  // A finished routine goes by the name it had that day.
  const routines = session.routineIds.map((id) => routineById(state, id)).filter(Boolean);
  const records = session.routineIds.map((id) => session.workouts[id]).filter(Boolean);
  const kept = session.routineIds.filter((id) => !routineById(state, id)).map((id) => session.workouts[id]).filter((record) => record?.name);
  const deletedCount = session.routineIds.length - routines.length - kept.length;
  const names = [...routines.map((routine) => workoutName(state, dateKey, routine.id)), ...kept.map((record) => record.name)];
  if (deletedCount) names.push(deletedLabel(deletedCount));
  const loggedCount = Object.keys(session.logs).length;
  const title = names.length ? names.join(" · ") : loggedCount ? "Logged sets" : session.note ? "Note only" : "Saved workout checks";
  const minutes = session.routineIds.reduce((sum, id) => sum + (session.workouts[id]?.minutes || 0), 0);
  // The second line starts with the day's round. A workout that isn't of the program
  // being followed (an extra in that round, or an older program's) also names its program.
  const programName = (id) => routineProgram(state, id)?.name || session.workouts[id]?.program || "";
  const followed = roundProgram(state)?.name;
  const context = [
    ...new Set(records.filter((record) => record.round).map((record) => roundName({ number: record.round, block: record.block || 1 }))),
    ...new Set(session.routineIds.filter((id) => session.workouts[id]?.guest || programName(id) !== followed).map(programName)),
    minutes ? minutesLabel(minutes) : "",
    loggedCount ? `${loggedCount} ${loggedCount === 1 ? "exercise" : "exercises"} logged` : "",
    session.note ? "Note added" : "",
  ].filter(Boolean);
  const summary = context.join(" · ") || (deletedCount ? "No longer in any program" : names.length ? "No sets logged" : "No finished workouts");
  const date = dateFromKey(dateKey);
  const fullDate = formatDate(date, LONG_DATE);
  const dayAndMonth = formatDate(date, { day: "numeric", month: "short" });
  const accessibleContext = context.length ? `. ${context.join(". ")}` : "";
  return `<button class="row tall card" type="button" data-action="open-day" data-date="${dateKey}" aria-label="Open ${escapeHtml(fullDate)}. ${escapeHtml(title)}${escapeHtml(accessibleContext)}">
    <span class="row-meta log-recent-date">${escapeHtml(dayAndMonth)}</span>
    <span class="row-main"><strong class="row-title">${escapeHtml(title)}</strong><small class="row-meta">${escapeHtml(summary)}</small></span>
    <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
  </button>`;
}

function changeCalendarMonth(offset) {
  calendar.month = monthStart(calendar.month, offset);
  render();
  mainElement().scrollTop = 0;
  fresh($(".log-calendar", mainElement()));
}

// ---------- progress ----------

// From the logged sets: this week against the usual, new bests, which exercises are
// moving and which aren't (each opens its progress sheet), and the week's sets per muscle.
function progressMarkup(state) {
  if (!Object.values(state.sessions).some((session) => Object.keys(session.logs).length)) {
    return `<p class="hint log-progress-empty">No sets logged yet. Log them in a workout and your progress shows here.</p>`;
  }
  const { thisWeek, perWeek, bestsThisMonth, improving, stalled, muscles } = overview(state, localDateKey());
  const tile = (name, value, unit) => `<div class="card log-tile"><span class="label">${name}</span><strong>${value}</strong><small class="row-meta">${unit}</small></div>`;
  const exerciseRow = ({ exercise }, meta, end) => `<button class="row ${meta ? "" : "compact"}" type="button" data-action="open-progress" data-id="${escapeHtml(exercise.id)}">
      <span class="row-main"><strong class="row-title">${exerciseMarkup(exercise)}</strong>${meta ? `<small class="row-meta">${escapeHtml(meta)}</small>` : ""}</span>
      ${end}<span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`;
  const section = (title, body) => `<section><div class="label section-label">${title}</div>${body}</section>`;
  const fullBar = Math.max(WEEKLY_SETS_GUIDE, ...muscles.map((muscle) => muscle.sets));
  return `<div class="log-tiles">
      ${tile("This week", thisWeek, thisWeek === 1 ? "workout" : "workouts")}
      ${tile("4-week avg", perWeek, "a week")}
      ${tile("New bests", bestsThisMonth, "this month")}
    </div>
    ${improving.length ? section("Getting stronger", improving.map((item) => exerciseRow(item, "", `<span class="row-action up">▲ ${item.percent}%</span>`)).join("")) : ""}
    ${stalled.length ? section("Stalled", stalled.slice(0, 5).map((item) => exerciseRow(item, `No best since ${shortDate(item.since)}`, "")).join("")) : ""}
    ${muscles.length ? section("Sets per muscle this week", `<p class="hint log-muscles-hint">A common guide is 10–20 a week per muscle.</p>
      <div class="log-muscles">${muscles.map((muscle) => `<span>${escapeHtml(label(muscle.target))}</span>
        <svg viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect width="${Math.round((muscle.sets / fullBar) * 100)}" height="8"/></svg>
        <strong>${muscle.sets}</strong>`).join("")}</div>`) : ""}`;
}

// ---------- day editor ----------

function checkRowMarkup({ routineId, checked, name, context, locked = false }) {
  return `<label class="row ${locked ? "is-locked" : ""}">
    <input class="visually-hidden" type="checkbox" name="routine" value="${escapeHtml(routineId)}" ${checked ? "checked" : ""} ${locked ? "disabled" : ""}>
    <span class="tickbox" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>
    <span class="row-main"><strong class="row-title">${escapeHtml(name)}</strong><small class="row-meta">${escapeHtml(context)}</small></span>
  </label>`;
}

function routineRowMarkup(state, session, routine, dateKey, inactive = false) {
  const selected = session.routineIds.includes(routine.id);
  const checkedIds = new Set(session.checkedEntryIdsByRoutine[routine.id] || []);
  const mainIds = routine.entries.filter((entry) => entry.role === "main").map((entry) => entry.id);
  const checkedMain = mainIds.filter((id) => checkedIds.has(id)).length;
  const completion = selected && mainIds.length ? `${checkedMain}/${mainIds.length} main` : "";
  const minutes = selected ? minutesLabel(session.workouts[routine.id]?.minutes) : "";
  const running = state.settings.activeWorkout?.routineId === routine.id && state.settings.activeWorkout.dateKey === dateKey;
  const context = [running ? "In progress" : "", routineProgram(state, routine.id).name, locationLabel(routine.group), inactive ? "Not followed" : "", completion, minutes].filter(Boolean).join(" · ");
  return checkRowMarkup({ routineId: routine.id, checked: selected, name: routine.name, context, locked: running || dateKey > localDateKey() });
}

// A finished routine that has since been deleted, by the name it had that day.
function deletedRowMarkup(session, routineId) {
  const record = session.workouts[routineId];
  const context = [record?.name ? "Deleted workout" : "", record?.program, minutesLabel(record?.minutes)].filter(Boolean).join(" · ");
  return checkRowMarkup({ routineId, checked: true, name: record?.name || "Deleted workout", context: context || "No longer in any program" });
}

function routineSectionMarkup(heading, rows) {
  return `<section><p class="form-label">${escapeHtml(heading)}</p><div class="ruled">${rows.join("")}</div></section>`;
}

// What was lifted that day, one exercise per row (by the name it had when logged if
// it has since been deleted). Read-only: sets are logged from Workout.
// A row opens the logging sheet to fix its sets, as long as its slot is still in
// the program; any row can be removed with its ×.
function loggedSetsMarkup(state, session, dateKey) {
  const logs = Object.entries(session.logs);
  if (!logs.length) return "";
  const rows = logs.map(([slotId, log]) => {
    const exercise = exerciseById(state, log.exerciseId);
    const name = exercise ? fullName(exercise) : log.exerciseName;
    const content = `<strong class="row-title">${exerciseMarkup(exercise, log.exerciseName)}</strong>
      <span class="set-chips">${setChipsMarkup(log.sets, { timed: log.unit === "sec" })}</span>`;
    const body = entryLog(state, dateKey, slotId)
      ? `<button class="row-body" type="button" data-action="edit-day-log" data-routine-id="${escapeHtml(log.routineId)}" data-id="${escapeHtml(slotId)}" data-date="${dateKey}" aria-label="Edit sets for ${escapeHtml(name)}"><span class="row-main">${content}</span></button>`
      : `<span class="row-body"><span class="row-main">${content}</span></span>`;
    return `<div class="row split">${body}
      <button class="icon-button" type="button" data-action="remove-day-log" data-id="${escapeHtml(slotId)}" data-date="${dateKey}" data-name="${escapeHtml(name)}" aria-label="Delete sets for ${escapeHtml(name)}">×</button>
    </div>`;
  }).join("");
  return `<section><p class="form-label">Logged sets</p><div>${rows}</div></section>`;
}

// Forgot to log a workout: start one for this day. It runs on Workout like any other.
function backfillMarkup(state, routines, dateKey) {
  if (state.settings.activeWorkout || dateKey > localDateKey() || !routines.length) return "";
  return `<section><p class="form-label">Log a workout for this day</p><div class="chips">${routines.map((routine) => (
    `<button class="pill" type="button" data-action="backfill-workout" data-id="${escapeHtml(routine.id)}" data-date="${dateKey}">${escapeHtml(routine.name)}</button>`
  )).join("")}</div></section>`;
}

// What's typed in the day sheet is saved before the sheet is redrawn or left.
function keepDayForm() {
  const form = $("#dayForm");
  const routineIds = $$('input[name="routine"]:checked', form).map((input) => input.value);
  return store.update((draft) => setDay(draft, form.dataset.date, routineIds, $("#dayNote", form).value.trim())).ok;
}

function dayEditorMarkup(state, dateKey) {
  const session = sessionFor(state, dateKey);
  const program = activeProgram(state);
  const activeRoutines = programRoutines(state, program);
  const activeIds = new Set(activeRoutines.map((routine) => routine.id));
  const recordedIds = session.routineIds.filter((id) => !activeIds.has(id));
  const otherRoutines = recordedIds.map((id) => routineById(state, id)).filter(Boolean);
  const deletedIds = recordedIds.filter((id) => !routineById(state, id));

  return `<div class="sheet-panel">
    <header class="sheet-head">
      <div><h2 id="dayDialogTitle">${escapeHtml(formatDate(dateFromKey(dateKey), { weekday: "long", month: "long", day: "numeric" }))}</h2><p>Workout history</p></div>
      <button class="icon-button" type="button" data-close-dialog="dayDialog" aria-label="Close day editor">×</button>
    </header>
    <form id="dayForm" class="contents" data-submit="save-day" data-date="${dateKey}">
      <div class="sheet-body stack" data-keep-scroll="day">
        ${program ? routineSectionMarkup("Workouts done", activeRoutines.length
          ? activeRoutines.map((routine) => routineRowMarkup(state, session, routine, dateKey))
          : [`<p class="hint">This program has no workouts yet.</p>`]) : ""}
        ${otherRoutines.length ? routineSectionMarkup(program ? "Already recorded from another program" : "Recorded workouts",
          otherRoutines.map((routine) => routineRowMarkup(state, session, routine, dateKey, Boolean(program)))) : ""}
        ${deletedIds.length ? routineSectionMarkup("Deleted workouts",
          deletedIds.map((routineId) => deletedRowMarkup(session, routineId))) : ""}
        ${!program && !recordedIds.length ? `<p class="hint">Add a program before marking a workout done.</p>` : ""}
        ${loggedSetsMarkup(state, session, dateKey)}
        ${backfillMarkup(state, activeRoutines, dateKey)}
        <label class="field"><span>Note</span><textarea class="control" id="dayNote" rows="4" maxlength="500" placeholder="Optional note">${escapeHtml(session.note)}</textarea></label>
        <p class="form-error" id="dayFormError" role="alert" aria-live="polite" data-dialog-error></p>
      </div>
      <footer class="actions">${dateKey > localDateKey() ? `<p class="hint">This day hasn't happened yet.</p>` : `<button class="button primary full" type="submit">Save day</button>`}</footer>
    </form>
  </div>`;
}

function openDayEditor(dateKey) {
  $("#dayDialogContent").innerHTML = dayEditorMarkup(store.getState(), dateKey);
  openDialog("#dayDialog");
}

function saveDay(form) {
  const routineIds = $$('input[name="routine"]:checked', form).map((input) => input.value);
  const note = $("#dayNote", form).value.trim();
  const result = store.update((draft) => setDay(draft, form.dataset.date, routineIds, note));
  if (!report(result, "Day updated.")) return;
  closeDialog("#dayDialog");
  render();
}

registerView("calendar", { markup: logMarkup });

registerActions({
  "log-view": (group) => {
    if (log.view === segmentValue(group)) return;
    log.view = segmentValue(group);
    render();
    mainElement().scrollTop = 0;
    fresh(...$$(".log-switch ~ *", mainElement()));
  },
  "open-progress": (button) => openExerciseHistory(button.dataset.id),
  "previous-month": () => changeCalendarMonth(-1),
  "next-month": () => changeCalendarMonth(1),
  "open-day": (button) => openDayEditor(button.dataset.date),
  "save-day": saveDay,
  "remove-day-log": async (button) => {
    const { id, date, name } = button.dataset;
    const confirmed = await confirmAction({
      title: `Delete ${name}'s sets?`,
      message: "Its sets for this day are deleted, and its done mark with them. This can't be undone.",
      confirmLabel: "Delete sets",
      cancelLabel: "Keep them",
    });
    if (!confirmed) return;
    keepDayForm();
    if (!report(store.update((draft) => removeDayLog(draft, date, id)), "Sets deleted.")) return;
    render();
    // The day itself goes when that was all it held.
    if (store.getState().sessions[date]) redraw("#dayDialogContent", dayEditorMarkup(store.getState(), date));
    else closeDialog("#dayDialog");
  },
  "backfill-workout": (button) => {
    const { id, date } = button.dataset;
    keepDayForm();
    // For today it is an ordinary start: counting begins with it, and after a long break
    // the round carries on (the default answer). A past day answers nothing.
    const today = date === localDateKey();
    if (!report(store.update((draft) => {
      if (today) startTodaysWorkout(draft, id);
      else startWorkout(draft, id, date, Date.now(), true);
    }))) return;
    closeDialog("#dayDialog");
    navigate("workout", { motion: "push" });
  },
  "edit-day-log": (button) => {
    keepDayForm();
    closeDialog("#dayDialog");
    openLogger(button.dataset.routineId, button.dataset.id, button.dataset.date);
  },
});
