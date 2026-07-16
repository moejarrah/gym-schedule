import { MUSCLE_GROUPS, RULES } from "./data.js";
import {
  createBackup,
  createStore,
  localDateKey,
  makeId,
  moveItem,
  parseImportedState,
  removeExerciseFromState,
  removeRoutineFromState,
  toggleRoutineForDate,
} from "./storage.js";

const store = createStore();
const main = document.querySelector("#appMain");
const viewTitle = document.querySelector("#viewTitle");
const viewKicker = document.querySelector("#viewKicker");
const toast = document.querySelector("#toast");

let currentView = "workout";
let exerciseQuery = "";
let exerciseMuscle = "All";
let pickerQuery = "";
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let toastTimer;
let confirmResolver;

const viewMeta = {
  workout: ["Gym Schedule", "Workout"],
  routines: ["Build your week", "Routines"],
  exercises: ["Reusable library", "Exercises"],
  calendar: ["Completion history", "Calendar"],
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function saveResult(result, successMessage) {
  if (!result.ok) {
    showToast(result.error || "Changes could not be saved.");
    return false;
  }
  if (successMessage) showToast(successMessage);
  return true;
}

function getActiveRoutine(state = store.getState()) {
  return state.routines.find((routine) => routine.id === state.settings.activeRoutineId) || state.routines[0] || null;
}

function routineTabs(state, selectedId) {
  if (!state.routines.length) return "";
  return `<div class="routine-tabs" aria-label="Choose a routine">
    ${state.routines.map((routine) => `
      <button class="routine-tab ${routine.group === "home" ? "home" : ""}" type="button"
        aria-pressed="${routine.id === selectedId}" data-action="select-routine" data-id="${escapeHtml(routine.id)}">
        ${escapeHtml(routine.name)}
      </button>`).join("")}
  </div>`;
}

function exerciseById(state, id) {
  return state.exercises.find((exercise) => exercise.id === id);
}

function editIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 20 4.2-1 10.6-10.6a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z"/><path d="m14.5 7.1 2.8 2.8"/></svg>`;
}

function upIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 14 5-5 5 5"/></svg>`;
}

function downIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg>`;
}

function chevronIcon(direction) {
  return direction === "left"
    ? `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m14 7-5 5 5 5"/></svg>`
    : `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m10 7 5 5-5 5"/></svg>`;
}

function removeIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
}

function render() {
  const state = store.getState();
  const meta = viewMeta[currentView];
  viewKicker.textContent = meta[0];
  viewTitle.textContent = meta[1];
  document.querySelectorAll(".bottom-nav [data-view]").forEach((button) => {
    if (button.dataset.view === currentView) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  if (currentView === "routines") renderRoutines(state);
  else if (currentView === "exercises") renderExercises(state);
  else if (currentView === "calendar") renderCalendar(state);
  else renderWorkout(state);
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function weekStats(state) {
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  let completions = 0;
  let activeDays = 0;
  for (const [key, session] of Object.entries(state.sessions)) {
    const date = dateFromKey(key);
    if (date >= start && date <= end && session.routineIds.length) {
      activeDays += 1;
      completions += session.routineIds.length;
    }
  }
  return { completions, activeDays };
}

function renderWorkout(state) {
  const routine = getActiveRoutine(state);
  const todayKey = localDateKey();
  const completedToday = routine ? state.sessions[todayKey]?.routineIds.includes(routine.id) : false;
  const stats = weekStats(state);
  main.innerHTML = `<section class="page">
    <div class="today-summary">
      <div><p class="eyebrow">${escapeHtml(formatDate(new Date(), { weekday: "long", month: "short", day: "numeric" }))}</p><p><strong>${stats.completions}</strong> completed this week across ${stats.activeDays} ${stats.activeDays === 1 ? "day" : "days"}</p></div>
      ${state.sessions[todayKey]?.routineIds.length ? `<span class="completion-count">${state.sessions[todayKey].routineIds.length} today</span>` : ""}
    </div>
    ${routineTabs(state, routine?.id)}
    ${routine ? `
      <div class="routine-heading">
        <div>
          <h2>${escapeHtml(routine.name)}</h2>
          <div class="status-line"><span class="status-pill ${routine.group}">${escapeHtml(routine.group)}</span><span class="status-pill">${escapeHtml(routine.status)}</span></div>
        </div>
        <button class="button secondary" type="button" data-view-link="routines">Edit routine</button>
      </div>
      ${routine.entries.length ? `<div class="list-panel">${routine.entries.map((entry, index) => {
        const exercise = exerciseById(state, entry.exerciseId);
        return `<button class="list-row workout-row" type="button" data-action="view-workout-exercise" data-id="${escapeHtml(entry.id)}"><span class="row-number">${index + 1}</span><span class="row-main"><span class="row-title">${escapeHtml(exercise?.name || "Missing exercise")}</span><span class="row-meta">${escapeHtml(entry.prescription || exercise?.defaultPrescription || "No prescription")}</span></span><span class="disclosure" aria-hidden="true">›</span></button>`;
      }).join("")}</div>` : `<div class="list-panel"><div class="empty-state"><h3>${routine.status === "rest" ? "Recovery day" : "No exercises yet"}</h3><p>${routine.status === "rest" ? "Take the day off or choose another routine." : "Open Routines to add exercises."}</p></div></div>`}
      ${routine.status !== "rest" ? `<div class="sticky-action"><button class="button ${completedToday ? "completed" : "primary"} full" type="button" data-action="toggle-today" aria-pressed="${completedToday}">${completedToday ? "Completed today ✓" : "Mark completed today"}</button></div>` : ""}
    ` : `<div class="empty-state"><h3>No routines yet</h3><p>Create a routine, then add exercises from your library.</p><button class="button primary" type="button" data-action="new-routine">Add routine</button></div>`}
  </section>`;
}

function renderCalendar(state) {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let index = 0; index < firstWeekday; index += 1) cells.push(`<span class="calendar-blank" aria-hidden="true"></span>`);
  let monthCompletions = 0;
  let activeDays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = localDateKey(new Date(year, month, day));
    const session = state.sessions[key];
    const count = session?.routineIds.length || 0;
    const hasNote = Boolean(session?.note);
    if (count) {
      monthCompletions += count;
      activeDays += 1;
    }
    const label = formatDate(new Date(year, month, day), { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    cells.push(`<button class="calendar-day ${key === localDateKey() ? "today" : ""} ${count ? "has-session" : ""} ${hasNote ? "has-note" : ""}" type="button" data-action="open-day" data-date="${key}" aria-label="${escapeHtml(label)}${count ? `, ${count} completed` : ""}${hasNote ? ", has note" : ""}"><span>${day}</span>${count ? `<span class="day-count">${count}</span>` : hasNote ? `<span class="day-note" aria-hidden="true">•</span>` : ""}</button>`);
  }
  main.innerHTML = `<section class="page">
    <div class="calendar-header">
      <button class="icon-button" type="button" data-action="previous-month" aria-label="Previous month">${chevronIcon("left")}</button>
      <div><p class="eyebrow">History</p><h2>${escapeHtml(formatDate(calendarMonth, { month: "long", year: "numeric" }))}</h2></div>
      <button class="icon-button" type="button" data-action="next-month" aria-label="Next month">${chevronIcon("right")}</button>
    </div>
    <div class="calendar-summary"><p><strong>${monthCompletions}</strong> completions</p><p><strong>${activeDays}</strong> active ${activeDays === 1 ? "day" : "days"}</p></div>
    <div class="weekday-row" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div>
    <div class="calendar-grid">${cells.join("")}</div>
    <p class="calendar-help">Tap a date to log routines or add a note.</p>
  </section>`;
}

function toggleToday() {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  if (!routine || routine.status === "rest") return;
  const wasCompleted = Boolean(state.sessions[localDateKey()]?.routineIds.includes(routine.id));
  const result = store.replace(toggleRoutineForDate(state, routine.id));
  if (saveResult(result, wasCompleted ? "Completion removed." : `${routine.name} completed.`)) render();
}

function openWorkoutExercise(entryId) {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  const entry = routine?.entries.find((item) => item.id === entryId);
  const exercise = entry ? exerciseById(state, entry.exerciseId) : null;
  if (!entry || !exercise) return;
  document.querySelector("#detailExerciseName").textContent = exercise.name;
  document.querySelector("#detailPrescription").textContent = entry.prescription || exercise.defaultPrescription || "No prescription";
  const muscleList = document.querySelector("#detailMuscles");
  muscleList.innerHTML = exercise.muscles.map((muscle) => `<span class="tag">${escapeHtml(muscle)}</span>`).join("");
  muscleList.hidden = !exercise.muscles.length;
  const instructions = document.querySelector("#detailInstructions");
  instructions.textContent = exercise.instructions || "No instructions added yet.";
  instructions.classList.toggle("muted-copy", !exercise.instructions);
  const video = document.querySelector("#detailVideo");
  video.hidden = !exercise.videoId;
  if (exercise.videoId) video.href = `https://www.youtube.com/watch?v=${exercise.videoId}`;
  else video.removeAttribute("href");
  document.querySelector("#exerciseDetailDialog").showModal();
}

function changeCalendarMonth(offset) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
  render();
}

function openDayEditor(dateKey) {
  const state = store.getState();
  const session = state.sessions[dateKey] || { routineIds: [], note: "" };
  const date = dateFromKey(dateKey);
  const routines = state.routines.filter((routine) => routine.status !== "rest" || session.routineIds.includes(routine.id));
  document.querySelector("#dayDialogContent").innerHTML = `
    <header class="dialog-header">
      <div><p class="dialog-kicker">Workout history</p><h2 id="dayDialogTitle">${escapeHtml(formatDate(date, { weekday: "long", month: "long", day: "numeric" }))}</h2></div>
      <button class="icon-button" type="button" data-close-dialog="dayDialog" aria-label="Close day editor">×</button>
    </header>
    <form id="dayForm" class="day-form" data-date="${dateKey}">
      <fieldset class="field-group"><legend>Completed routines</legend>
        <div class="day-routines">${routines.length ? routines.map((routine) => `<label class="check-option"><input type="checkbox" name="routine" value="${escapeHtml(routine.id)}" ${session.routineIds.includes(routine.id) ? "checked" : ""}><span><strong>${escapeHtml(routine.name)}</strong><small>${escapeHtml(routine.group)}${routine.status === "rest" ? " · now rest" : ""}</small></span></label>`).join("") : `<p class="muted-copy">Add a routine before logging a completion.</p>`}</div>
      </fieldset>
      <label class="field">Note<textarea id="dayNote" rows="4" maxlength="500" placeholder="Optional note">${escapeHtml(session.note)}</textarea></label>
      <div class="dialog-actions"><button class="button primary" type="submit">Save day</button></div>
    </form>`;
  document.querySelector("#dayDialog").showModal();
}

function saveDay(form) {
  const dateKey = form.dataset.date;
  const routineIds = [...form.querySelectorAll('input[name="routine"]:checked')].map((input) => input.value);
  const note = form.querySelector("#dayNote").value.trim();
  const result = store.update((state) => {
    if (!routineIds.length && !note) delete state.sessions[dateKey];
    else state.sessions[dateKey] = { routineIds, note };
  });
  if (!saveResult(result, "Day updated.")) return;
  document.querySelector("#dayDialog").close();
  render();
}

function renderExercises(state) {
  const muscles = ["All", ...MUSCLE_GROUPS];
  main.innerHTML = `<section class="page">
    <div class="page-toolbar">
      <div><h2>Exercise library</h2><p>${state.exercises.length} reusable exercises</p></div>
      <button class="button primary" type="button" data-action="new-exercise">Add exercise</button>
    </div>
    <label class="search-field">Search exercises<input id="exerciseSearch" type="search" value="${escapeHtml(exerciseQuery)}" autocomplete="off" placeholder="Name or muscle"></label>
    <div class="filter-chips" aria-label="Filter by muscle">
      ${muscles.map((muscle) => `<button class="filter-chip" type="button" aria-pressed="${muscle === exerciseMuscle}" data-action="filter-muscle" data-muscle="${escapeHtml(muscle)}">${escapeHtml(muscle)}</button>`).join("")}
    </div>
    <div id="exerciseList"></div>
  </section>`;
  renderExerciseRows(state);
}

function filteredExercises(state, query = exerciseQuery, muscle = exerciseMuscle) {
  const needle = query.trim().toLowerCase();
  return state.exercises
    .filter((exercise) => muscle === "All" || exercise.muscles.includes(muscle))
    .filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle) || exercise.muscles.some((item) => item.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderExerciseRows(state) {
  const target = document.querySelector("#exerciseList");
  if (!target) return;
  const exercises = filteredExercises(state);
  if (!exercises.length) {
    target.innerHTML = `<div class="list-panel"><div class="empty-state"><h3>No matching exercises</h3><p>Change the search or muscle filter, or add a new exercise.</p><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div></div>`;
    return;
  }
  target.innerHTML = `<div class="list-panel">${exercises.map((exercise) => `
    <div class="list-row">
      <div class="row-main">
        <p class="row-title">${escapeHtml(exercise.name)}</p>
        <p class="row-meta">${escapeHtml(exercise.defaultPrescription || "No default prescription")}</p>
        ${exercise.muscles.length ? `<div class="tags">${exercise.muscles.map((muscle) => `<span class="tag">${escapeHtml(muscle)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="row-actions">
        <button class="mini-button" type="button" data-action="duplicate-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="Duplicate ${escapeHtml(exercise.name)}" title="Duplicate exercise">⧉</button>
        <button class="mini-button" type="button" data-action="edit-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="Edit ${escapeHtml(exercise.name)}">${editIcon()}</button>
      </div>
    </div>`).join("")}</div>`;
}

function renderRoutines(state) {
  const routine = getActiveRoutine(state);
  main.innerHTML = `<section class="page">
    <div class="page-toolbar">
      <div><h2>Your routines</h2><p>Add, reorder, and change workout days</p></div>
      <button class="button primary" type="button" data-action="new-routine">Add routine</button>
    </div>
    ${routineTabs(state, routine?.id)}
    ${routine ? `
      <div class="routine-heading">
        <div>
          <h2>${escapeHtml(routine.name)}</h2>
          <div class="status-line"><span class="status-pill ${routine.group}">${escapeHtml(routine.group)}</span><span class="status-pill">${escapeHtml(routine.status)}</span></div>
        </div>
        <div class="row-actions">
          <button class="mini-button" type="button" data-action="move-routine-up" data-id="${escapeHtml(routine.id)}" aria-label="Move routine earlier" ${state.routines.indexOf(routine) === 0 ? "disabled" : ""}>${upIcon()}</button>
          <button class="mini-button" type="button" data-action="move-routine-down" data-id="${escapeHtml(routine.id)}" aria-label="Move routine later" ${state.routines.indexOf(routine) === state.routines.length - 1 ? "disabled" : ""}>${downIcon()}</button>
          <button class="mini-button" type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}" aria-label="Edit ${escapeHtml(routine.name)}">${editIcon()}</button>
        </div>
      </div>
      ${renderRoutineEntries(state, routine)}
      ${routine.status !== "rest" ? `<div class="sticky-action"><button class="button primary full" type="button" data-action="open-picker">Add exercise</button></div>` : `<div class="empty-state"><p>Rest routines do not need exercises. Change its status if you want to add some.</p></div>`}
    ` : `<div class="list-panel"><div class="empty-state"><h3>No routines yet</h3><p>Add your first routine, then fill it from the exercise library.</p><button class="button primary" type="button" data-action="new-routine">Add routine</button></div></div>`}
  </section>`;
}

function renderRoutineEntries(state, routine) {
  if (!routine.entries.length) {
    return `<div class="list-panel"><div class="empty-state"><h3>${routine.status === "rest" ? "Rest day" : "No exercises yet"}</h3><p>${routine.status === "rest" ? "This routine is intentionally empty." : "Add exercises from your library to build this routine."}</p></div></div>`;
  }
  return `<div class="list-panel">${routine.entries.map((entry, index) => {
    const exercise = exerciseById(state, entry.exerciseId);
    return `<div class="list-row routine-entry-row">
      <span class="row-number">${index + 1}</span>
      <div class="routine-entry-content">
        <div class="row-main"><p class="row-title">${escapeHtml(exercise?.name || "Missing exercise")}</p><p class="row-meta">${escapeHtml(entry.prescription || exercise?.defaultPrescription || "No prescription")}</p></div>
        <div class="entry-actions" aria-label="Actions for ${escapeHtml(exercise?.name || "exercise")}">
          <button class="mini-button" type="button" data-action="move-entry-up" data-id="${escapeHtml(entry.id)}" aria-label="Move up" ${index === 0 ? "disabled" : ""}>${upIcon()}</button>
          <button class="mini-button" type="button" data-action="move-entry-down" data-id="${escapeHtml(entry.id)}" aria-label="Move down" ${index === routine.entries.length - 1 ? "disabled" : ""}>${downIcon()}</button>
          <button class="mini-button" type="button" data-action="edit-entry" data-id="${escapeHtml(entry.id)}" aria-label="Edit prescription">${editIcon()}</button>
          <button class="mini-button danger-text" type="button" data-action="remove-entry" data-id="${escapeHtml(entry.id)}" aria-label="Remove from routine">${removeIcon()}</button>
        </div>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function openExerciseEditor(exerciseId = "", duplicate = false) {
  const state = store.getState();
  const source = exerciseId ? exerciseById(state, exerciseId) : null;
  const editing = source && !duplicate;
  document.querySelector("#exerciseDialogTitle").textContent = editing ? "Edit exercise" : duplicate ? "Duplicate exercise" : "Add exercise";
  document.querySelector("#exerciseId").value = editing ? source.id : "";
  document.querySelector("#exerciseName").value = source ? `${source.name}${duplicate ? " copy" : ""}` : "";
  document.querySelector("#exercisePrescription").value = source?.defaultPrescription || "";
  document.querySelector("#exerciseVideo").value = source?.videoId || "";
  document.querySelector("#exerciseInstructions").value = source?.instructions || "";
  document.querySelector("#exerciseFormError").textContent = "";
  document.querySelector("#deleteExerciseButton").hidden = !editing;
  document.querySelector("#muscleOptions").innerHTML = MUSCLE_GROUPS.map((muscle) => `
    <label class="check-option"><input type="checkbox" name="muscles" value="${escapeHtml(muscle)}" ${source?.muscles.includes(muscle) ? "checked" : ""}>${escapeHtml(muscle)}</label>`).join("");
  document.querySelector("#exerciseDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#exerciseName").focus());
}

function youtubeId(value) {
  if (!value.trim()) return "";
  const match = value.trim().match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  const id = match?.[1] || value.trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
}

function saveExercise() {
  const state = store.getState();
  const id = document.querySelector("#exerciseId").value;
  const name = document.querySelector("#exerciseName").value.trim();
  const videoId = youtubeId(document.querySelector("#exerciseVideo").value);
  const error = document.querySelector("#exerciseFormError");
  if (!name) {
    error.textContent = "Enter an exercise name.";
    return false;
  }
  const duplicate = state.exercises.find((exercise) => exercise.id !== id && exercise.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    error.textContent = "An exercise with this name already exists.";
    return false;
  }
  if (videoId === null) {
    error.textContent = "Paste a YouTube link or its 11-character video ID.";
    return false;
  }
  const exercise = {
    id: id || makeId("exercise"),
    name,
    muscles: [...document.querySelectorAll('#muscleOptions input:checked')].map((input) => input.value),
    defaultPrescription: document.querySelector("#exercisePrescription").value.trim(),
    videoId,
    instructions: document.querySelector("#exerciseInstructions").value.trim(),
  };
  const result = store.update((next) => {
    if (id) next.exercises = next.exercises.map((item) => item.id === id ? exercise : item);
    else next.exercises.push(exercise);
  });
  if (!saveResult(result, id ? "Exercise updated." : "Exercise added.")) return false;
  document.querySelector("#exerciseDialog").close();
  render();
  return true;
}

async function deleteExercise(id) {
  const state = store.getState();
  const exercise = exerciseById(state, id);
  if (!exercise) return;
  const referenceCount = state.routines.reduce((sum, routine) => sum + routine.entries.filter((entry) => entry.exerciseId === id).length, 0);
  const message = referenceCount
    ? `Delete “${exercise.name}”? It will also be removed from ${referenceCount} routine ${referenceCount === 1 ? "entry" : "entries"}.`
    : `Delete “${exercise.name}” from the library?`;
  const confirmed = await confirmAction("Delete exercise", message, "Delete exercise");
  if (!confirmed) return;
  const result = store.replace(removeExerciseFromState(state, id));
  if (saveResult(result, "Exercise deleted.")) {
    document.querySelector("#exerciseDialog").close();
    render();
  }
}

function openRoutineEditor(id = "") {
  const state = store.getState();
  const routine = state.routines.find((item) => item.id === id);
  document.querySelector("#routineDialogTitle").textContent = routine ? "Edit routine" : "Add routine";
  document.querySelector("#routineId").value = routine?.id || "";
  document.querySelector("#routineName").value = routine?.name || "";
  document.querySelector("#routineGroup").value = routine?.group || "gym";
  document.querySelector("#routineStatus").value = routine?.status || "required";
  document.querySelector("#routineFormError").textContent = "";
  document.querySelector("#deleteRoutineButton").hidden = !routine;
  document.querySelector("#routineDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#routineName").focus());
}

function saveRoutine() {
  const state = store.getState();
  const id = document.querySelector("#routineId").value;
  const name = document.querySelector("#routineName").value.trim();
  const error = document.querySelector("#routineFormError");
  if (!name) {
    error.textContent = "Enter a routine name.";
    return false;
  }
  const duplicate = state.routines.find((routine) => routine.id !== id && routine.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    error.textContent = "A routine with this name already exists.";
    return false;
  }
  const routineId = id || makeId("routine");
  const result = store.update((next) => {
    if (id) {
      next.routines = next.routines.map((routine) => routine.id === id ? {
        ...routine,
        name,
        group: document.querySelector("#routineGroup").value,
        status: document.querySelector("#routineStatus").value,
      } : routine);
    } else {
      next.routines.push({
        id: routineId,
        name,
        group: document.querySelector("#routineGroup").value,
        status: document.querySelector("#routineStatus").value,
        entries: [],
      });
      next.settings.activeRoutineId = routineId;
    }
  });
  if (!saveResult(result, id ? "Routine updated." : "Routine added.")) return false;
  document.querySelector("#routineDialog").close();
  render();
  return true;
}

async function deleteRoutine(id) {
  const state = store.getState();
  const routine = state.routines.find((item) => item.id === id);
  if (!routine) return;
  const confirmed = await confirmAction("Delete routine", `Delete “${routine.name}”? Exercises stay in the library, but its completion history will be removed.`, "Delete routine");
  if (!confirmed) return;
  const result = store.replace(removeRoutineFromState(state, id));
  if (saveResult(result, "Routine deleted.")) {
    document.querySelector("#routineDialog").close();
    render();
  }
}

function selectRoutine(id) {
  const result = store.update((state) => { state.settings.activeRoutineId = id; });
  if (saveResult(result)) render();
}

function moveRoutine(id, direction) {
  const result = store.update((state) => {
    const index = state.routines.findIndex((routine) => routine.id === id);
    state.routines = moveItem(state.routines, index, direction);
  });
  if (saveResult(result)) render();
}

function moveEntry(id, direction) {
  const activeId = store.getState().settings.activeRoutineId;
  const result = store.update((state) => {
    const routine = state.routines.find((item) => item.id === activeId);
    const index = routine?.entries.findIndex((entry) => entry.id === id) ?? -1;
    if (routine) routine.entries = moveItem(routine.entries, index, direction);
  });
  if (saveResult(result)) render();
}

async function removeEntry(id) {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  const entry = routine?.entries.find((item) => item.id === id);
  const exercise = entry ? exerciseById(state, entry.exerciseId) : null;
  if (!entry) return;
  const confirmed = await confirmAction(
    "Remove exercise",
    `Remove “${exercise?.name || "this exercise"}” from ${routine.name}? It will stay in the exercise library.`,
    "Remove",
  );
  if (!confirmed) return;
  const activeId = store.getState().settings.activeRoutineId;
  const result = store.update((state) => {
    const routine = state.routines.find((item) => item.id === activeId);
    if (routine) routine.entries = routine.entries.filter((entry) => entry.id !== id);
  });
  if (saveResult(result, "Exercise removed from routine.")) render();
}

function openEntryEditor(id) {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  const entry = routine?.entries.find((item) => item.id === id);
  const exercise = entry ? exerciseById(state, entry.exerciseId) : null;
  if (!entry || !exercise) return;
  document.querySelector("#entryId").value = entry.id;
  document.querySelector("#entryExerciseName").textContent = exercise.name;
  document.querySelector("#entryPrescription").value = entry.prescription || exercise.defaultPrescription || "";
  document.querySelector("#entryDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#entryPrescription").focus());
}

function saveEntry() {
  const id = document.querySelector("#entryId").value;
  const prescription = document.querySelector("#entryPrescription").value.trim();
  const activeId = store.getState().settings.activeRoutineId;
  const result = store.update((state) => {
    const routine = state.routines.find((item) => item.id === activeId);
    const entry = routine?.entries.find((item) => item.id === id);
    if (entry) entry.prescription = prescription;
  });
  if (!saveResult(result, "Prescription updated.")) return false;
  document.querySelector("#entryDialog").close();
  render();
  return true;
}

function openPicker() {
  pickerQuery = "";
  document.querySelector("#pickerSearch").value = "";
  renderPickerList();
  document.querySelector("#pickerDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#pickerSearch").focus());
}

function renderPickerList() {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  const existing = new Set(routine?.entries.map((entry) => entry.exerciseId));
  const needle = pickerQuery.trim().toLowerCase();
  const exercises = state.exercises
    .filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle) || exercise.muscles.some((muscle) => muscle.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const target = document.querySelector("#pickerList");
  target.innerHTML = exercises.length ? exercises.map((exercise) => `
    <button class="picker-item" type="button" data-action="pick-exercise" data-id="${escapeHtml(exercise.id)}">
      <span><strong>${escapeHtml(exercise.name)}</strong><span class="row-meta">${escapeHtml(exercise.defaultPrescription || "No default prescription")}</span></span>
      <span>${existing.has(exercise.id) ? "Add again" : "Add"}</span>
    </button>`).join("") : `<div class="empty-state"><h3>No matching exercises</h3><p>Add a new exercise from the library first.</p></div>`;
}

function pickExercise(exerciseId) {
  const activeId = store.getState().settings.activeRoutineId;
  const result = store.update((state) => {
    const routine = state.routines.find((item) => item.id === activeId);
    const exercise = exerciseById(state, exerciseId);
    if (routine && exercise) routine.entries.push({ id: makeId("entry"), exerciseId, prescription: exercise.defaultPrescription || "" });
  });
  if (!saveResult(result, "Exercise added to routine.")) return;
  document.querySelector("#pickerDialog").close();
  render();
}

function confirmAction(title, message, buttonLabel) {
  document.querySelector("#confirmTitle").textContent = title;
  document.querySelector("#confirmMessage").textContent = message;
  document.querySelector("#confirmAction").textContent = buttonLabel;
  const dialog = document.querySelector("#confirmDialog");
  dialog.returnValue = "cancel";
  dialog.showModal();
  return new Promise((resolve) => { confirmResolver = resolve; });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#0f0f1a" : "#f5f6fa";
  const button = document.querySelector("#themeButton");
  button.setAttribute("aria-label", theme === "dark" ? "Use light theme" : "Use dark theme");
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  const result = store.update((state) => { state.settings.theme = nextTheme; });
  if (saveResult(result)) applyTheme(nextTheme);
}

function openSettings() {
  document.querySelector("#rulesContent").innerHTML = RULES.map(([title, items]) => `
    <section class="rule-section"><h3>${escapeHtml(title)}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`).join("");
  document.querySelector("#settingsDialog").showModal();
}

function exportData() {
  const blob = new Blob([JSON.stringify(createBackup(store.getState()), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gym-schedule-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importData(file) {
  try {
    const next = parseImportedState(await file.text());
    const confirmed = await confirmAction("Import app data", "Replace the routines, exercises, and history currently stored on this device?", "Import data");
    if (!confirmed) return;
    if (saveResult(store.replace(next), "App data imported.")) {
      applyTheme(next.settings.theme || "light");
      document.querySelector("#settingsDialog").close();
      render();
    }
  } catch (error) {
    showToast(error.message || "This file could not be imported.");
  }
}

async function resetData() {
  const confirmed = await confirmAction("Restore starting data", "Replace all current routines, exercises, and history with the starting program?", "Restore data");
  if (!confirmed) return;
  if (saveResult(store.reset(), "Starting data restored.")) {
    applyTheme(store.getState().settings.theme);
    document.querySelector("#settingsDialog").close();
    render();
  }
}

document.querySelector(".bottom-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  currentView = button.dataset.view;
  render();
  main.scrollTop = 0;
  main.focus({ preventScroll: true });
});

main.addEventListener("click", (event) => {
  const link = event.target.closest("[data-view-link]");
  if (link) {
    currentView = link.dataset.viewLink;
    render();
    main.scrollTop = 0;
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id, muscle } = button.dataset;
  if (action === "new-exercise") openExerciseEditor();
  else if (action === "edit-exercise") openExerciseEditor(id);
  else if (action === "duplicate-exercise") openExerciseEditor(id, true);
  else if (action === "filter-muscle") { exerciseMuscle = muscle; renderExercises(store.getState()); }
  else if (action === "new-routine") openRoutineEditor();
  else if (action === "edit-routine") openRoutineEditor(id);
  else if (action === "select-routine") selectRoutine(id);
  else if (action === "move-routine-up") moveRoutine(id, -1);
  else if (action === "move-routine-down") moveRoutine(id, 1);
  else if (action === "move-entry-up") moveEntry(id, -1);
  else if (action === "move-entry-down") moveEntry(id, 1);
  else if (action === "edit-entry") openEntryEditor(id);
  else if (action === "remove-entry") removeEntry(id);
  else if (action === "open-picker") openPicker();
  else if (action === "view-workout-exercise") openWorkoutExercise(id);
  else if (action === "toggle-today") toggleToday();
  else if (action === "previous-month") changeCalendarMonth(-1);
  else if (action === "next-month") changeCalendarMonth(1);
  else if (action === "open-day") openDayEditor(button.dataset.date);
});

main.addEventListener("input", (event) => {
  if (event.target.id !== "exerciseSearch") return;
  exerciseQuery = event.target.value;
  renderExerciseRows(store.getState());
});

document.querySelector("#pickerList").addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="pick-exercise"]');
  if (button) pickExercise(button.dataset.id);
});

document.querySelector("#pickerSearch").addEventListener("input", (event) => {
  pickerQuery = event.target.value;
  renderPickerList();
});

document.querySelector("#dayDialog").addEventListener("click", (event) => {
  if (event.target.closest('[data-close-dialog="dayDialog"]')) document.querySelector("#dayDialog").close();
});

document.querySelector("#dayDialog").addEventListener("submit", (event) => {
  if (event.target.id !== "dayForm") return;
  event.preventDefault();
  saveDay(event.target);
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(`#${button.dataset.closeDialog}`).close());
});

document.querySelector("#exerciseForm").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  saveExercise();
});

document.querySelector("#routineForm").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  saveRoutine();
});

document.querySelector("#entryForm").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  saveEntry();
});

document.querySelector("#deleteExerciseButton").addEventListener("click", () => deleteExercise(document.querySelector("#exerciseId").value));
document.querySelector("#deleteRoutineButton").addEventListener("click", () => deleteRoutine(document.querySelector("#routineId").value));
document.querySelector("#themeButton").addEventListener("click", toggleTheme);
document.querySelector("#settingsButton").addEventListener("click", openSettings);
document.querySelector("#exportButton").addEventListener("click", exportData);
document.querySelector("#importButton").addEventListener("click", () => document.querySelector("#importFile").click());
document.querySelector("#importFile").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importData(file);
  event.target.value = "";
});
document.querySelector("#resetButton").addEventListener("click", resetData);

document.querySelector("#confirmDialog").addEventListener("close", (event) => {
  confirmResolver?.(event.target.returnValue === "confirm");
  confirmResolver = null;
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close("cancel");
  });
});

window.addEventListener("storage", (event) => {
  if (event.key === "gymAppStateV1") location.reload();
});

if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) showToast("App update ready. Reopen the app when convenient.");
  });
  navigator.serviceWorker.register("sw.js").catch(() => showToast("Offline mode could not be started."));
}

applyTheme(store.getState().settings.theme || "light");
if (store.getLastError()) showToast(store.getLastError());
render();
