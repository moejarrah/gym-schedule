import { MUSCLE_GROUPS, RULES } from "./data.js?v=15";
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
} from "./storage.js?v=15";

const store = createStore();
const main = document.querySelector("#appMain");
const viewTitle = document.querySelector("#viewTitle");
const viewMetaLine = document.querySelector("#viewMetaLine");
const headerCompleteButton = document.querySelector("#headerCompleteButton");
const toast = document.querySelector("#toast");

let currentView = "workout";
let exerciseQuery = "";
let exerciseMuscle = "All";
let pickerQuery = "";
let expandedWorkoutEntryId = "";
let pendingAlternativeIds = [];
let alternativeDraftIds = [];
let alternativesQuery = "";
let programEditing = false;
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let toastTimer;
let confirmResolver;

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
        aria-label="${escapeHtml(routine.name)}, ${routine.group === "home" ? "Home" : "Gym"}" aria-pressed="${routine.id === selectedId}" data-action="select-routine" data-id="${escapeHtml(routine.id)}">
        <span class="routine-dot" aria-hidden="true"></span>${escapeHtml(routine.name)}
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
  const paths = {
    left: "m14 7-5 5 5 5",
    right: "m10 7 5 5-5 5",
    up: "m7 14 5-5 5 5",
    down: "m7 10 5 5 5-5",
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[direction] || paths.right}"/></svg>`;
}

function render() {
  const state = store.getState();
  document.querySelectorAll(".bottom-nav [data-view]").forEach((button) => {
    if (button.dataset.view === currentView) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  if (currentView === "routines") renderRoutines(state);
  else if (currentView === "exercises") renderExercises(state);
  else if (currentView === "calendar") renderCalendar(state);
  else renderWorkout(state);
  updateHeader(state);
}

function updateHeader(state) {
  const routine = getActiveRoutine(state);
  const todayCompleted = Boolean(routine && state.sessions[localDateKey()]?.routineIds.includes(routine.id));
  const labels = {
    routines: ["Program", `${state.routines.length} ${state.routines.length === 1 ? "routine" : "routines"}`],
    exercises: ["Library", `${state.exercises.length} ${state.exercises.length === 1 ? "exercise" : "exercises"}`],
    calendar: ["Log", "Tap a day to edit"],
  };
  const [title, meta] = currentView === "workout"
    ? [routine?.name || "Workout", routine ? `${routine.group === "home" ? "Home" : "Gym"} · ${routine.entries.length} ${routine.entries.length === 1 ? "exercise" : "exercises"} · ${routine.status}` : "No routine selected"]
    : labels[currentView];
  viewTitle.textContent = title;
  viewMetaLine.textContent = meta;
  const canComplete = currentView === "workout" && routine && routine.status !== "rest";
  headerCompleteButton.hidden = !canComplete;
  headerCompleteButton.setAttribute("aria-pressed", String(todayCompleted));
  headerCompleteButton.setAttribute("aria-label", todayCompleted ? `Remove ${routine?.name} completion for today` : `Mark ${routine?.name} completed today`);
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function renderWorkout(state) {
  const routine = getActiveRoutine(state);
  main.innerHTML = `<section class="page">
    ${routineTabs(state, routine?.id)}
    ${routine ? `
      ${routine.status === "rest" ? `<div class="empty-state compact-empty"><h3>Recovery day</h3><p>${routine.entries.length ? `${routine.entries.length} ${routine.entries.length === 1 ? "exercise is" : "exercises are"} stored but inactive. Change this routine’s status in Program to use ${routine.entries.length === 1 ? "it" : "them"} again.` : "Take the day off or choose another routine."}</p><button class="button secondary" type="button" data-view-link="routines">Open Program</button></div>` : `
      <div class="workout-section-heading">
        <h2>Exercises</h2>
        <button class="text-button" type="button" data-view-link="routines">Edit routine</button>
      </div>
      ${routine.entries.length ? `<div class="workout-list">${routine.entries.map((entry, index) => {
        const exercise = exerciseById(state, entry.exerciseId);
        const expanded = expandedWorkoutEntryId === entry.id;
        const alternatives = (exercise?.alternativeExerciseIds || []).map((id) => exerciseById(state, id)).filter(Boolean);
        return `<article class="workout-item ${expanded ? "is-expanded" : ""}">
          <button class="workout-row" type="button" data-action="toggle-workout-entry" data-id="${escapeHtml(entry.id)}" aria-expanded="${expanded}">
            <span class="row-number">${index + 1}</span>
            <span class="row-main"><span class="row-title">${escapeHtml(exercise?.name || "Missing exercise")}</span><span class="row-meta">${escapeHtml(entry.prescription || exercise?.defaultPrescription || "No prescription")}</span></span>
            <span class="workout-chevron" aria-hidden="true">${chevronIcon(expanded ? "up" : "down")}</span>
          </button>
          ${expanded && exercise ? renderWorkoutDetails(exercise, alternatives) : ""}
        </article>`;
      }).join("")}</div>` : `<div class="empty-state compact-empty"><h3>No exercises yet</h3><p>Open Program to add exercises.</p></div>`}
      `}
    ` : `<div class="empty-state"><h3>No routines yet</h3><p>Create a routine, then add exercises from your library.</p><button class="button primary" type="button" data-action="new-routine">Add routine</button></div>`}
  </section>`;
}

function renderWorkoutDetails(exercise, alternatives) {
  return `<div class="workout-details">
    ${exercise.muscles.length ? `<p class="detail-muscles">${exercise.muscles.map(escapeHtml).join(" · ")}</p>` : ""}
    <section><h3>Notes</h3><p class="${exercise.instructions ? "" : "muted-copy"}">${escapeHtml(exercise.instructions || "No notes added.")}</p></section>
    <section><h3>Alternatives</h3>${alternatives.length
      ? `<div class="alternative-links">${alternatives.map((alternative) => `<button type="button" data-action="view-alternative" data-id="${escapeHtml(alternative.id)}">${escapeHtml(alternative.name)}<span aria-hidden="true">›</span></button>`).join("")}</div>`
      : `<p class="muted-copy">No alternatives linked.</p>`}
    </section>
    <div class="detail-actions">
      ${exercise.videoId ? `<a class="button secondary" href="https://www.youtube.com/watch?v=${encodeURIComponent(exercise.videoId)}" target="_blank" rel="noopener noreferrer">Open video</a>` : ""}
      <button class="button secondary" type="button" data-action="edit-workout-exercise" data-id="${escapeHtml(exercise.id)}">Edit exercise</button>
    </div>
  </div>`;
}

function renderCalendar(state) {
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
  main.innerHTML = `<section class="page">
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

function toggleToday() {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  if (!routine || routine.status === "rest") return;
  const wasCompleted = Boolean(state.sessions[localDateKey()]?.routineIds.includes(routine.id));
  const result = store.replace(toggleRoutineForDate(state, routine.id));
  if (saveResult(result, wasCompleted ? "Completion removed." : `${routine.name} completed.`)) render();
}

function openExerciseDetails(exerciseId, prescription = "") {
  const state = store.getState();
  const exercise = exerciseById(state, exerciseId);
  if (!exercise) return;
  document.querySelector("#detailExerciseName").textContent = exercise.name;
  document.querySelector("#detailPrescription").textContent = prescription || exercise.defaultPrescription || "No prescription";
  const muscleList = document.querySelector("#detailMuscles");
  muscleList.innerHTML = exercise.muscles.map((muscle) => `<span class="tag">${escapeHtml(muscle)}</span>`).join("");
  muscleList.hidden = !exercise.muscles.length;
  const instructions = document.querySelector("#detailInstructions");
  instructions.textContent = exercise.instructions || "No notes added yet.";
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
  main.innerHTML = `<section class="page">
    <div class="compact-toolbar library-toolbar">
      <span class="result-count" id="exerciseResultCount"></span>
      <button class="button primary compact-button" type="button" data-action="new-exercise">Add exercise</button>
    </div>
    <div class="library-controls">
      <label class="search-field"><span class="visually-hidden">Search exercises</span><input id="exerciseSearch" type="search" value="${escapeHtml(exerciseQuery)}" autocomplete="off" placeholder="Search exercises"></label>
      <button class="button secondary filter-button" type="button" data-action="open-muscle-filter" aria-label="Filter exercises by muscle, currently ${escapeHtml(exerciseMuscle)}">${exerciseMuscle === "All" ? "Filter" : escapeHtml(exerciseMuscle)}</button>
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
    document.querySelector("#exerciseResultCount").textContent = "0 results";
    target.innerHTML = `<div class="empty-state compact-empty"><h3>No matching exercises</h3><p>Change the search or muscle filter, or add a new exercise.</p><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div>`;
    return;
  }
  document.querySelector("#exerciseResultCount").textContent = `${exercises.length} ${exercises.length === 1 ? "result" : "results"}`;
  target.innerHTML = `<div class="library-list">${exercises.map((exercise) => `
    <button class="library-row" type="button" data-action="edit-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="Edit ${escapeHtml(exercise.name)}">
      <span class="row-main"><span class="row-title">${escapeHtml(exercise.name)}</span><span class="row-meta">${escapeHtml(exercise.defaultPrescription || "No prescription")}${exercise.muscles.length ? ` · ${escapeHtml(exercise.muscles.slice(0, 2).join(" / "))}` : ""}</span></span>
      <span class="workout-chevron" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`).join("")}</div>`;
}

function openMuscleFilter() {
  document.querySelector("#muscleFilterList").innerHTML = ["All", ...MUSCLE_GROUPS].map((muscle) => `
    <button class="filter-option" type="button" data-action="choose-muscle-filter" data-muscle="${escapeHtml(muscle)}" aria-pressed="${muscle === exerciseMuscle}"><span>${escapeHtml(muscle === "All" ? "All muscles" : muscle)}</span>${muscle === exerciseMuscle ? `<span aria-hidden="true">✓</span>` : ""}</button>`).join("");
  document.querySelector("#muscleFilterDialog").showModal();
}

function renderRoutines(state) {
  const routine = getActiveRoutine(state);
  main.innerHTML = `<section class="page">
    <div class="compact-toolbar">
      <button class="text-button" type="button" data-action="toggle-program-edit" aria-pressed="${programEditing}">${programEditing ? "Done" : "Edit"}</button>
      <button class="button primary compact-button" type="button" data-action="new-routine">Add routine</button>
    </div>
    ${routineTabs(state, routine?.id)}
    ${routine ? `
      <div class="program-heading">
        <div>
          <h2>${escapeHtml(routine.name)}</h2>
          <p>${routine.group === "home" ? "Home" : "Gym"} · ${routine.status} · ${routine.entries.length} ${routine.status === "rest" ? "stored" : ""} ${routine.entries.length === 1 ? "exercise" : "exercises"}</p>
        </div>
        ${programEditing ? `<div class="row-actions">
          <button class="mini-button" type="button" data-action="move-routine-up" data-id="${escapeHtml(routine.id)}" aria-label="Move routine earlier" ${state.routines.indexOf(routine) === 0 ? "disabled" : ""}>${upIcon()}</button>
          <button class="mini-button" type="button" data-action="move-routine-down" data-id="${escapeHtml(routine.id)}" aria-label="Move routine later" ${state.routines.indexOf(routine) === state.routines.length - 1 ? "disabled" : ""}>${downIcon()}</button>
          <button class="mini-button" type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}" aria-label="Edit ${escapeHtml(routine.name)}">${editIcon()}</button>
        </div>` : ""}
      </div>
      ${routine.status === "rest" ? `<div class="rest-notice"><strong>Exercises are inactive</strong><span>${routine.entries.length ? `They remain stored and return if you change the routine status.${programEditing ? " You can still edit or remove them below." : ""}` : "This routine has no stored exercises."}</span></div>` : ""}
      ${routine.status !== "rest" || programEditing ? renderRoutineEntries(state, routine) : ""}
      ${programEditing && routine.status !== "rest" ? `<button class="add-row-button" type="button" data-action="open-picker">+ Add exercise</button>` : ""}
    ` : `<div class="list-panel"><div class="empty-state"><h3>No routines yet</h3><p>Add your first routine, then fill it from the exercise library.</p><button class="button primary" type="button" data-action="new-routine">Add routine</button></div></div>`}
  </section>`;
}

function renderRoutineEntries(state, routine) {
  if (!routine.entries.length) {
    return routine.status === "rest" ? "" : `<div class="empty-state compact-empty"><h3>No exercises yet</h3><p>${programEditing ? "Use Add exercise below to build this routine." : "Choose Edit to build this routine."}</p></div>`;
  }
  return `<div class="program-list">${routine.entries.map((entry, index) => {
    const exercise = exerciseById(state, entry.exerciseId);
    const content = `<span class="row-number">${index + 1}</span>
      <span class="row-main"><span class="row-title">${escapeHtml(exercise?.name || "Missing exercise")}</span><span class="row-meta">${escapeHtml(entry.prescription || exercise?.defaultPrescription || "No prescription")}</span></span>
      ${programEditing ? `<span class="edit-hint">Edit</span><span class="workout-chevron" aria-hidden="true">${chevronIcon("right")}</span>` : ""}`;
    return programEditing ? `<button class="program-row" type="button" data-action="edit-entry" data-id="${escapeHtml(entry.id)}" aria-label="Edit ${escapeHtml(exercise?.name || "exercise")}">${content}</button>` : `<div class="program-row">${content}</div>`;
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
  document.querySelector("#duplicateExerciseButton").hidden = !editing;
  pendingAlternativeIds = [...(source?.alternativeExerciseIds || [])];
  updateAlternativesCount();
  document.querySelector("#muscleOptions").innerHTML = MUSCLE_GROUPS.map((muscle) => `
    <label class="check-option"><input type="checkbox" name="muscles" value="${escapeHtml(muscle)}" ${source?.muscles.includes(muscle) ? "checked" : ""}>${escapeHtml(muscle)}</label>`).join("");
  document.querySelector("#exerciseDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#exerciseName").focus());
}

function updateAlternativesCount() {
  const count = pendingAlternativeIds.length;
  document.querySelector("#alternativesCount").textContent = count ? `${count} linked` : "None linked";
}

function openAlternativesPicker() {
  alternativesQuery = "";
  alternativeDraftIds = [...pendingAlternativeIds];
  document.querySelector("#alternativesSearch").value = "";
  renderAlternativesList();
  document.querySelector("#alternativesDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#alternativesSearch").focus());
}

function renderAlternativesList() {
  const state = store.getState();
  const editingId = document.querySelector("#exerciseId").value;
  const needle = alternativesQuery.trim().toLowerCase();
  const exercises = state.exercises
    .filter((exercise) => exercise.id !== editingId)
    .filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle) || exercise.muscles.some((muscle) => muscle.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name));
  document.querySelector("#alternativesList").innerHTML = exercises.length ? exercises.map((exercise) => `
    <label class="check-option alternative-option"><input type="checkbox" value="${escapeHtml(exercise.id)}" ${alternativeDraftIds.includes(exercise.id) ? "checked" : ""}><span><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(exercise.muscles.join(" · ") || "No muscle group")}</small></span></label>`).join("") : `<p class="muted-copy">No matching exercises.</p>`;
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
    alternativeExerciseIds: [...new Set(pendingAlternativeIds)].filter((alternativeId) => alternativeId !== id && state.exercises.some((item) => item.id === alternativeId)),
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
  expandedWorkoutEntryId = "";
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
  if (saveResult(result, "Exercise removed from routine.")) {
    if (document.querySelector("#entryDialog").open) document.querySelector("#entryDialog").close();
    render();
  }
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
  const index = routine.entries.indexOf(entry);
  document.querySelector("#moveEntryEarlierButton").disabled = index === 0;
  document.querySelector("#moveEntryLaterButton").disabled = index === routine.entries.length - 1;
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
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#111411" : "#f4f5f3";
  document.querySelector("#settingsThemeValue").textContent = theme === "dark" ? "Dark" : "Light";
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
  const { action, id } = button.dataset;
  if (action === "new-exercise") openExerciseEditor();
  else if (action === "edit-exercise") openExerciseEditor(id);
  else if (action === "open-muscle-filter") openMuscleFilter();
  else if (action === "new-routine") openRoutineEditor();
  else if (action === "toggle-program-edit") { programEditing = !programEditing; render(); }
  else if (action === "edit-routine") openRoutineEditor(id);
  else if (action === "select-routine") selectRoutine(id);
  else if (action === "move-routine-up") moveRoutine(id, -1);
  else if (action === "move-routine-down") moveRoutine(id, 1);
  else if (action === "edit-entry") openEntryEditor(id);
  else if (action === "open-picker") openPicker();
  else if (action === "toggle-workout-entry") {
    expandedWorkoutEntryId = expandedWorkoutEntryId === id ? "" : id;
    render();
    requestAnimationFrame(() => [...main.querySelectorAll('[data-action="toggle-workout-entry"]')].find((row) => row.dataset.id === id)?.focus({ preventScroll: true }));
  }
  else if (action === "view-alternative") openExerciseDetails(id);
  else if (action === "edit-workout-exercise") openExerciseEditor(id);
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

document.querySelector("#muscleFilterList").addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="choose-muscle-filter"]');
  if (!button) return;
  exerciseMuscle = button.dataset.muscle;
  document.querySelector("#muscleFilterDialog").close();
  renderExercises(store.getState());
});

document.querySelector("#pickerSearch").addEventListener("input", (event) => {
  pickerQuery = event.target.value;
  renderPickerList();
});

document.querySelector("#chooseAlternativesButton").addEventListener("click", openAlternativesPicker);
document.querySelector("#alternativesSearch").addEventListener("input", (event) => {
  alternativesQuery = event.target.value;
  renderAlternativesList();
});
document.querySelector("#alternativesList").addEventListener("change", (event) => {
  if (event.target.type !== "checkbox") return;
  if (event.target.checked) alternativeDraftIds = [...new Set([...alternativeDraftIds, event.target.value])];
  else alternativeDraftIds = alternativeDraftIds.filter((id) => id !== event.target.value);
});
document.querySelector("#saveAlternativesButton").addEventListener("click", () => {
  pendingAlternativeIds = [...alternativeDraftIds];
  updateAlternativesCount();
  document.querySelector("#alternativesDialog").close();
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

document.querySelector("#moveEntryEarlierButton").addEventListener("click", () => {
  const id = document.querySelector("#entryId").value;
  document.querySelector("#entryDialog").close();
  moveEntry(id, -1);
});
document.querySelector("#moveEntryLaterButton").addEventListener("click", () => {
  const id = document.querySelector("#entryId").value;
  document.querySelector("#entryDialog").close();
  moveEntry(id, 1);
});
document.querySelector("#removeEntryButton").addEventListener("click", () => removeEntry(document.querySelector("#entryId").value));

document.querySelector("#deleteExerciseButton").addEventListener("click", () => deleteExercise(document.querySelector("#exerciseId").value));
document.querySelector("#duplicateExerciseButton").addEventListener("click", () => {
  const id = document.querySelector("#exerciseId").value;
  document.querySelector("#exerciseDialog").close();
  openExerciseEditor(id, true);
});
document.querySelector("#deleteRoutineButton").addEventListener("click", () => deleteRoutine(document.querySelector("#routineId").value));
headerCompleteButton.addEventListener("click", toggleToday);
document.querySelector("#settingsThemeButton").addEventListener("click", toggleTheme);
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
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !refreshing) {
      refreshing = true;
      location.reload();
    }
  });
  navigator.serviceWorker
    .register("sw.js?v=15", { updateViaCache: "none" })
    .then((registration) => registration.update())
    .catch(() => showToast("Offline mode could not be started."));
}

applyTheme(store.getState().settings.theme || "light");
if (store.getLastError()) showToast(store.getLastError());
render();
