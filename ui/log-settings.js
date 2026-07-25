import { localDateKey } from "../storage.js?v=44";
import { chevronIcon, escapeHtml } from "./shared.js?v=44";

export function calendarMarkup(state, calendarMonth, formatDate) {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let index = 0; index < firstWeekday; index += 1) cells.push(`<span class="calendar-blank" aria-hidden="true"></span>`);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = localDateKey(new Date(year, month, day));
    const session = state.sessions[key];
    const count = session?.routineIds.length || 0;
    const hasNote = Boolean(session?.note);
    const label = formatDate(new Date(year, month, day), { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    cells.push(`<button class="calendar-day ${key === localDateKey() ? "today" : ""} ${count ? "has-session" : ""} ${hasNote ? "has-note" : ""}" type="button" data-action="open-day" data-date="${key}" aria-label="${escapeHtml(label)}${count ? `, ${count} completed` : ""}${hasNote ? ", has note" : ""}"><span>${day}</span>${count ? `<span class="day-count">${count}</span>` : hasNote ? `<span class="day-note" aria-hidden="true">•</span>` : ""}</button>`);
  }
  return `<section class="page">
    <div class="calendar-header">
      <button class="icon-button" type="button" data-action="previous-month" aria-label="Previous month">${chevronIcon("left")}</button>
      <h2>${escapeHtml(formatDate(calendarMonth, { month: "long", year: "numeric" }))}</h2>
      <button class="icon-button" type="button" data-action="next-month" aria-label="Next month">${chevronIcon("right")}</button>
    </div>
    <div class="weekday-row" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div>
    <div class="calendar-grid">${cells.join("")}</div>
    <p class="calendar-help">Tap a date to log routines or add a note.</p>
  </section>`;
}

export function dayEditorMarkup({
  state,
  session,
  dateKey,
  date,
  formatDate,
  getRoutineProgram,
}) {
  const routines = state.routines;
  return `
    <header class="dialog-header">
      <div><p class="dialog-kicker">Workout history</p><h2 id="dayDialogTitle">${escapeHtml(formatDate(date, { weekday: "long", month: "long", day: "numeric" }))}</h2></div>
      <button class="icon-button" type="button" data-close-dialog="dayDialog" aria-label="Close day editor">×</button>
    </header>
    <form id="dayForm" class="day-form" data-date="${dateKey}">
      <fieldset class="field-group"><legend>Completed routines</legend>
        <div class="day-routines">${routines.length ? routines.map((routine) => {
          const program = getRoutineProgram(state, routine.id);
          return `<label class="check-option"><input type="checkbox" name="routine" value="${escapeHtml(routine.id)}" ${session.routineIds.includes(routine.id) ? "checked" : ""}><span><strong>${escapeHtml(routine.name)}</strong><small>${escapeHtml(program?.name || "Program")} · ${escapeHtml(routine.group)}</small></span></label>`;
        }).join("") : `<p class="muted-copy">Add a routine before logging a completion.</p>`}</div>
      </fieldset>
      <label class="field">Note<textarea id="dayNote" rows="4" maxlength="500" placeholder="Optional note">${escapeHtml(session.note)}</textarea></label>
      <p class="form-error" id="dayFormError" role="alert" data-dialog-error></p>
      <div class="dialog-actions"><button class="button primary" type="submit">Save day</button></div>
    </form>`;
}

export function rulesMarkup(rules) {
  return rules.map(([title, items]) => `
    <section class="rule-section"><h3>${escapeHtml(title)}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`).join("");
}
