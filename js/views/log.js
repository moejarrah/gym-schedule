// Log screen: the month calendar, the recent-history list, and the day editor
// sheet (#dayDialog) that sets a date's completed routines and note and shows
// the sets logged that day.
//
// History outlives programs: a session can still name a routine that has since
// been deleted. Those days count as completed and the editor lists them as
// "Deleted routine" so they can be kept or unmarked.

import { mainElement, onStart, registerActions, registerView, render, store } from "../context.js";
import { $, $$, chevronIcon, closeDialog, escapeHtml, formatDate, openDialog, report } from "../dom.js";
import { activeProgram, dateFromKey, exerciseById, localDateKey, programRoutines, routineById, routineProgram, sessionFor, setDay } from "../model.js";
import { locationLabel, setChipsMarkup } from "./shared.js";

const LONG_DATE = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
const RECENT_LIMIT = 8;

const monthStart = (date, offset = 0) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const calendar = { month: monthStart(new Date()) };

const deletedLabel = (count) => (count === 1 ? "Deleted routine" : `${count} deleted routines`);

// ---------- calendar and recent list ----------

function calendarMarkup(state) {
  const year = calendar.month.getFullYear();
  const month = calendar.month.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = localDateKey();
  const cells = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(`<span class="log-calendar-blank" aria-hidden="true"></span>`);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = localDateKey(date);
    const session = state.sessions[key];
    const completedCount = session?.routineIds.length || 0;
    const loggedCount = Object.keys(session?.logs || {}).length;
    const trained = Boolean(completedCount || loggedCount);
    const hasNote = Boolean(session?.note);
    const isToday = key === todayKey;
    const labelParts = [
      formatDate(date, LONG_DATE),
      isToday ? "today" : "",
      completedCount ? `${completedCount} completed ${completedCount === 1 ? "routine" : "routines"}` : "",
      loggedCount ? `sets logged for ${loggedCount} ${loggedCount === 1 ? "exercise" : "exercises"}` : "",
      hasNote ? "note recorded" : "",
    ].filter(Boolean);
    cells.push(`<button class="log-calendar-day ${trained ? "has-completion" : ""} ${hasNote ? "has-note" : ""} ${isToday ? "is-today" : ""}" type="button" data-action="open-day" data-date="${key}" aria-label="${escapeHtml(labelParts.join(", "))}"${isToday ? ` aria-current="date"` : ""}>
      <span>${day}</span><span class="log-calendar-markers" aria-hidden="true">${trained ? `<i class="completion-marker"></i>` : ""}${hasNote ? `<i class="note-marker"></i>` : ""}</span>
    </button>`);
  }
  const trailingBlanks = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingBlanks; index += 1) {
    cells.push(`<span class="log-calendar-blank" aria-hidden="true"></span>`);
  }

  return `<section class="page log-page">
    <div class="log-monthbar">
      <strong>${escapeHtml(formatDate(calendar.month, { month: "long", year: "numeric" }))}</strong>
      <button class="icon-button" type="button" data-action="previous-month" aria-label="Previous month">${chevronIcon("left")}</button>
      <button class="icon-button" type="button" data-action="next-month" aria-label="Next month">${chevronIcon("right")}</button>
    </div>
    <div class="log-weekdays" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div>
    <div class="log-calendar">${cells.join("")}</div>
    <div class="log-section-label">Recent</div>
    ${recentSessionsMarkup(state)}
  </section>`;
}

function recentSessionsMarkup(state) {
  const recentKeys = Object.keys(state.sessions).sort((a, b) => b.localeCompare(a)).slice(0, RECENT_LIMIT);
  if (!recentKeys.length) {
    return `<div class="log-recent-empty"><strong>No history yet</strong><span>Completed routines and day notes will appear here.</span></div>`;
  }
  return `<div class="log-recent-list">${recentKeys.map((dateKey) => recentRowMarkup(state, dateKey)).join("")}</div>`;
}

function recentRowMarkup(state, dateKey) {
  const session = state.sessions[dateKey];
  const routines = session.routineIds.map((id) => routineById(state, id)).filter(Boolean);
  const deletedCount = session.routineIds.length - routines.length;
  const programs = [...new Set(routines.map((routine) => routineProgram(state, routine.id)))];
  const names = routines.map((routine) => routine.name);
  if (deletedCount) names.push(deletedLabel(deletedCount));
  const loggedCount = Object.keys(session.logs).length;
  const title = names.length ? names.join(" · ") : loggedCount ? "Logged sets" : session.note ? "Note only" : "Saved workout checks";
  const context = [
    programs.map((program) => program.name).join(" · "),
    loggedCount ? `${loggedCount} ${loggedCount === 1 ? "exercise" : "exercises"} logged` : "",
    session.note ? "Note added" : "",
    programs.some((program) => program.id !== state.settings.activeProgramId) ? "Inactive program" : "",
  ].filter(Boolean);
  const summary = context.join(" · ") || (deletedCount ? "No longer in any program" : "No completed routines");
  const date = dateFromKey(dateKey);
  const fullDate = formatDate(date, LONG_DATE);
  const shortDate = formatDate(date, { day: "numeric", month: "short" });
  const accessibleContext = context.length ? `. ${context.join(". ")}` : "";
  return `<button class="log-recent-row" type="button" data-action="open-day" data-date="${dateKey}" aria-label="Open ${escapeHtml(fullDate)}. ${escapeHtml(title)}${escapeHtml(accessibleContext)}">
    <span class="log-recent-date">${escapeHtml(shortDate)}</span>
    <span class="log-recent-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(summary)}</small></span>
    <span class="log-recent-chevron" aria-hidden="true">${chevronIcon("right")}</span>
  </button>`;
}

function changeCalendarMonth(offset, action) {
  calendar.month = monthStart(calendar.month, offset);
  render();
  const main = mainElement();
  main.scrollTop = 0;
  $(`[data-action="${action}"]`, main).focus();
}

// ---------- day editor ----------

function checkRowMarkup({ routineId, checked, name, context }) {
  return `<label class="day-check-row">
    <input type="checkbox" name="routine" value="${escapeHtml(routineId)}" ${checked ? "checked" : ""}>
    <span class="day-check-box" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>
    <span class="day-check-copy"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(context)}</small></span>
  </label>`;
}

function routineRowMarkup(state, session, routine, inactive = false) {
  const selected = session.routineIds.includes(routine.id);
  const checkedIds = new Set(session.checkedEntryIdsByRoutine[routine.id] || []);
  const mainIds = routine.entries.filter((entry) => entry.role === "main").map((entry) => entry.id);
  const checkedMain = mainIds.filter((id) => checkedIds.has(id)).length;
  const completion = selected && mainIds.length ? `${checkedMain}/${mainIds.length} main` : "";
  const context = [routineProgram(state, routine.id).name, locationLabel(routine.group), inactive ? "Inactive" : "", completion].filter(Boolean).join(" · ");
  return checkRowMarkup({ routineId: routine.id, checked: selected, name: routine.name, context });
}

function routineSectionMarkup(heading, rows) {
  return `<section class="day-routine-section"><p class="form-label">${escapeHtml(heading)}</p><div class="day-check-list">${rows.join("")}</div></section>`;
}

// What was lifted that day, one exercise per row (by the name it had when logged if
// it has since been deleted). Read-only: sets are logged from Workout.
function loggedSetsMarkup(state, session) {
  const logs = Object.values(session.logs);
  if (!logs.length) return "";
  const rows = logs.map((log) => `<div class="day-log-row">
    <strong>${escapeHtml(exerciseById(state, log.exerciseId)?.name || log.exerciseName)}</strong>
    <span class="set-chips">${setChipsMarkup(log.sets, { timed: log.unit === "sec" })}</span>
  </div>`).join("");
  return `<section class="day-routine-section"><p class="form-label">Logged sets</p><div class="day-log-list">${rows}</div></section>`;
}

function dayEditorMarkup(state, dateKey) {
  const session = sessionFor(state, dateKey);
  const program = activeProgram(state);
  const activeRoutines = programRoutines(state, program);
  const activeIds = new Set(activeRoutines.map((routine) => routine.id));
  const recordedIds = session.routineIds.filter((id) => !activeIds.has(id));
  const otherRoutines = recordedIds.map((id) => routineById(state, id)).filter(Boolean);
  const deletedIds = recordedIds.filter((id) => !routineById(state, id));

  return `<div class="day-sheet">
    <header class="dialog-header day-sheet-header">
      <div><h2 id="dayDialogTitle">${escapeHtml(formatDate(dateFromKey(dateKey), { weekday: "long", month: "long", day: "numeric" }))}</h2><p>Workout history</p></div>
      <button class="icon-button" type="button" data-close-dialog="dayDialog" aria-label="Close day editor">×</button>
    </header>
    <form id="dayForm" class="day-form" data-date="${dateKey}">
      <div class="day-sheet-scroll">
        ${program ? routineSectionMarkup("Completed routines", activeRoutines.length
          ? activeRoutines.map((routine) => routineRowMarkup(state, session, routine))
          : [`<p class="muted-copy">This program has no routines yet.</p>`]) : ""}
        ${otherRoutines.length ? routineSectionMarkup(program ? "Already recorded from another program" : "Recorded routines",
          otherRoutines.map((routine) => routineRowMarkup(state, session, routine, Boolean(program)))) : ""}
        ${deletedIds.length ? routineSectionMarkup("Deleted routines",
          deletedIds.map((routineId) => checkRowMarkup({ routineId, checked: true, name: "Deleted routine", context: "No longer in any program" }))) : ""}
        ${!program && !recordedIds.length ? `<p class="muted-copy">Add a program before logging a routine completion.</p>` : ""}
        ${loggedSetsMarkup(state, session)}
        <label class="field day-note-field"><span>Note</span><textarea id="dayNote" rows="4" maxlength="500" placeholder="Optional note">${escapeHtml(session.note)}</textarea></label>
        <p class="form-error" id="dayFormError" role="alert" aria-live="polite" data-dialog-error></p>
      </div>
      <footer class="day-sheet-actions"><button class="button primary full" type="submit">Save day</button></footer>
    </form>
  </div>`;
}

function openDayEditor(dateKey, opener) {
  $("#dayDialogContent").innerHTML = dayEditorMarkup(store.getState(), dateKey);
  const sameKind = opener.classList.contains("log-recent-row") ? ".log-recent-row" : ".log-calendar-day";
  openDialog("#dayDialog", {
    returnFocus: opener,
    // Saving re-renders the screen: land on the same date's new button, preferring the
    // list it was opened from, or the calendar when a cleared day left the list.
    fallbackFocus: () => $(`${sameKind}[data-date="${dateKey}"]`, mainElement())
      || $(`[data-action="open-day"][data-date="${dateKey}"]`, mainElement())
      || mainElement(),
    focus: '[data-close-dialog="dayDialog"]',
  });
}

function saveDay(form) {
  const routineIds = $$('input[name="routine"]:checked', form).map((input) => input.value);
  const note = $("#dayNote", form).value.trim();
  const result = store.update((draft) => setDay(draft, form.dataset.date, routineIds, note));
  if (!report(result, "Day updated.")) return;
  closeDialog("#dayDialog");
  render();
}

registerView("calendar", {
  render(state, main) {
    main.innerHTML = calendarMarkup(state);
  },
  header: () => ["Log", "Month and recent history"],
});

registerActions({
  "previous-month": (button) => changeCalendarMonth(-1, button.dataset.action),
  "next-month": (button) => changeCalendarMonth(1, button.dataset.action),
  "open-day": (button) => openDayEditor(button.dataset.date, button),
});

onStart(() => {
  $("#dayDialog").addEventListener("submit", (event) => {
    event.preventDefault();
    saveDay(event.target);
  });
});
