import { localDateKey } from "../storage.js?v=50";
import { chevronIcon, escapeHtml } from "./shared.js?v=50";

function routineProgram(state, routineId) {
  return state.programs.find((program) => program.routineIds.includes(routineId)) || null;
}

function routineById(state, routineId) {
  return state.routines.find((routine) => routine.id === routineId) || null;
}

function groupLabel(group) {
  return group === "home" ? "Home" : "Gym";
}

function sessionDateLabel(dateKey, formatDate, options) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return formatDate(new Date(year, month - 1, day), options);
}

function recentSessionsMarkup(state, formatDate) {
  const activeProgramId = state.settings.activeProgramId;
  const recentKeys = Object.keys(state.sessions).sort((a, b) => b.localeCompare(a)).slice(0, 8);
  if (!recentKeys.length) {
    return `<div class="log-recent-empty"><strong>No history yet</strong><span>Completed routines and day notes will appear here.</span></div>`;
  }

  return `<div class="log-recent-list">${recentKeys.map((dateKey) => {
    const session = state.sessions[dateKey];
    const routines = session.routineIds.map((id) => routineById(state, id)).filter(Boolean);
    const programs = [...new Map(routines.map((routine) => {
      const program = routineProgram(state, routine.id);
      return program ? [program.id, program] : null;
    }).filter(Boolean)).values()];
    const hasInactiveProgram = programs.some((program) => program.id !== activeProgramId);
    const title = routines.length
      ? routines.map((routine) => routine.name).join(" · ")
      : session.note
        ? "Note only"
        : "Saved workout checks";
    const context = [
      programs.map((program) => program.name).join(" · "),
      session.note ? "Note added" : "",
      hasInactiveProgram ? "Inactive program" : "",
    ].filter(Boolean);
    const fullDate = sessionDateLabel(dateKey, formatDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const shortDate = sessionDateLabel(dateKey, formatDate, { day: "numeric", month: "short" });
    const accessibleContext = context.length ? `. ${context.join(". ")}` : "";
    return `<button class="log-recent-row" type="button" data-action="open-day" data-date="${dateKey}" aria-label="Open ${escapeHtml(fullDate)}. ${escapeHtml(title)}${escapeHtml(accessibleContext)}">
      <span class="log-recent-date">${escapeHtml(shortDate)}</span>
      <span class="log-recent-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(context.join(" · ") || "No completed routines")}</small></span>
      <span class="log-recent-chevron" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`;
  }).join("")}</div>`;
}

export function calendarMarkup(state, calendarMonth, formatDate) {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(`<span class="log-calendar-blank" aria-hidden="true"></span>`);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = localDateKey(date);
    const session = state.sessions[key];
    const completedCount = session?.routineIds.length || 0;
    const hasNote = Boolean(session?.note);
    const isToday = key === localDateKey();
    const labelParts = [
      formatDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      isToday ? "today" : "",
      completedCount ? `${completedCount} completed ${completedCount === 1 ? "routine" : "routines"}` : "",
      hasNote ? "note recorded" : "",
    ].filter(Boolean);
    cells.push(`<button class="log-calendar-day ${completedCount ? "has-completion" : ""} ${hasNote ? "has-note" : ""} ${isToday ? "is-today" : ""}" type="button" data-action="open-day" data-date="${key}" aria-label="${escapeHtml(labelParts.join(", "))}"${isToday ? ` aria-current="date"` : ""}>
      <span>${day}</span><span class="log-calendar-markers" aria-hidden="true">${completedCount ? `<i class="completion-marker"></i>` : ""}${hasNote ? `<i class="note-marker"></i>` : ""}</span>
    </button>`);
  }
  const trailingBlanks = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingBlanks; index += 1) {
    cells.push(`<span class="log-calendar-blank" aria-hidden="true"></span>`);
  }

  return `<section class="page log-page">
    <div class="log-monthbar">
      <strong>${escapeHtml(formatDate(calendarMonth, { month: "long", year: "numeric" }))}</strong>
      <button class="icon-button" type="button" data-action="previous-month" aria-label="Previous month">${chevronIcon("left")}</button>
      <button class="icon-button" type="button" data-action="next-month" aria-label="Next month">${chevronIcon("right")}</button>
    </div>
    <div class="log-weekdays" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div>
    <div class="log-calendar">${cells.join("")}</div>
    <div class="log-section-label">Recent</div>
    ${recentSessionsMarkup(state, formatDate)}
  </section>`;
}

function dayRoutineRow({ state, session, routine, getRoutineProgram, inactive = false }) {
  const program = getRoutineProgram(state, routine.id);
  const selected = session.routineIds.includes(routine.id);
  const checkedIds = new Set(session.checkedEntryIdsByRoutine[routine.id] || []);
  const mainIds = routine.entries.filter((entry) => entry.role === "main").map((entry) => entry.id);
  const checkedMain = mainIds.filter((id) => checkedIds.has(id)).length;
  const completion = selected && mainIds.length ? `${checkedMain}/${mainIds.length} main` : "";
  const context = [program?.name || "Program", groupLabel(routine.group), inactive ? "Inactive" : "", completion].filter(Boolean).join(" · ");
  return `<label class="day-check-row">
    <input type="checkbox" name="routine" value="${escapeHtml(routine.id)}" ${selected ? "checked" : ""}>
    <span class="day-check-box" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>
    <span class="day-check-copy"><strong>${escapeHtml(routine.name)}</strong><small>${escapeHtml(context)}</small></span>
  </label>`;
}

export function dayEditorMarkup({ state, session, dateKey, date, formatDate, getRoutineProgram }) {
  const activeProgram = state.programs.find((program) => program.id === state.settings.activeProgramId) || null;
  const activeRoutines = activeProgram
    ? activeProgram.routineIds.map((id) => routineById(state, id)).filter(Boolean)
    : [];
  const activeRoutineIds = new Set(activeRoutines.map((routine) => routine.id));
  const recordedOtherRoutines = session.routineIds
    .filter((id) => !activeRoutineIds.has(id))
    .map((id) => routineById(state, id))
    .filter(Boolean);
  const otherHeading = activeProgram ? "Already recorded from another program" : "Recorded routines";

  return `<div class="day-sheet">
    <header class="dialog-header day-sheet-header">
      <div><h2 id="dayDialogTitle">${escapeHtml(formatDate(date, { weekday: "long", month: "long", day: "numeric" }))}</h2><p>Workout history</p></div>
      <button class="icon-button" type="button" data-close-dialog="dayDialog" aria-label="Close day editor">×</button>
    </header>
    <form id="dayForm" class="day-form" data-date="${dateKey}">
      <div class="day-sheet-scroll">
        ${activeProgram ? `<section class="day-routine-section"><p class="form-label">Completed routines</p><div class="day-check-list">${activeRoutines.length
          ? activeRoutines.map((routine) => dayRoutineRow({ state, session, routine, getRoutineProgram })).join("")
          : `<p class="muted-copy">This program has no routines yet.</p>`}</div></section>` : ""}
        ${recordedOtherRoutines.length ? `<section class="day-routine-section"><p class="form-label">${otherHeading}</p><div class="day-check-list">${recordedOtherRoutines.map((routine) => dayRoutineRow({ state, session, routine, getRoutineProgram, inactive: Boolean(activeProgram) })).join("")}</div></section>` : ""}
        ${!activeProgram && !recordedOtherRoutines.length ? `<p class="muted-copy">Add a program before logging a routine completion.</p>` : ""}
        <label class="field day-note-field"><span>Note</span><textarea id="dayNote" rows="4" maxlength="500" placeholder="Optional note">${escapeHtml(session.note)}</textarea></label>
        <p class="form-error" id="dayFormError" role="alert" aria-live="polite" data-dialog-error></p>
      </div>
      <footer class="day-sheet-actions"><button class="button primary full" type="submit">Save day</button></footer>
    </form>
  </div>`;
}

export function rulesMarkup(rules) {
  return rules.map(([title, items]) => `
    <section class="rule-section"><h3>${escapeHtml(title)}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`).join("");
}
