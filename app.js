import { EXERCISE_CATEGORIES, MUSCLE_GROUPS, RULES } from "./data.js?v=24";
import {
  createBackup,
  createStore,
  localDateKey,
  makeId,
  moveItem,
  moveRoutineEntry,
  reorderRoutineEntry,
  parseImportedState,
  removeExerciseFromState,
  removeRoutineFromState,
  toggleRoutineForDate,
} from "./storage.js?v=24";

const store = createStore();
const main = document.querySelector("#appMain");
const viewTitle = document.querySelector("#viewTitle");
const viewMetaLine = document.querySelector("#viewMetaLine");
const headerCompleteButton = document.querySelector("#headerCompleteButton");
const toast = document.querySelector("#toast");

let currentView = "workout";
let exerciseQuery = "";
let exerciseMuscle = "All";
let exerciseMuscleScope = "primary";
let exerciseCategory = "All";
let filterDraftScope = "primary";
let pickerQuery = "";
let pendingAlternativeIds = [];
let alternativeDraftIds = [];
let alternativesQuery = "";
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let toastTimer;
let confirmResolver;
let entryDrag = null;
let suppressEntryClickUntil = 0;

const ENTRY_HOLD_DELAY = 340;
const ENTRY_HOLD_TOLERANCE = 10;

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

function activeDialogError() {
  const openDialogs = [...document.querySelectorAll("dialog[open]")];
  for (let index = openDialogs.length - 1; index >= 0; index -= 1) {
    const error = openDialogs[index].querySelector("[data-dialog-error]");
    if (error) return error;
  }
  return null;
}

function showActionError(message) {
  const error = activeDialogError();
  if (!error) {
    showToast(message);
    return;
  }
  error.textContent = message;
  error.scrollIntoView({ block: "nearest" });
}

function clearActionError() {
  const error = activeDialogError();
  if (error) error.textContent = "";
}

function saveResult(result, successMessage) {
  if (!result.ok) {
    showActionError(result.error || "Changes could not be saved.");
    return false;
  }
  clearActionError();
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

function exerciseTargets(exercise) {
  return [...(exercise?.primaryMuscles || []), ...(exercise?.secondaryMuscles || [])];
}

function exerciseSearchTerms(exercise) {
  return [...exerciseTargets(exercise), ...(exercise?.categories || [])];
}

function targetSummary(exercise) {
  const primary = exercise?.primaryMuscles?.join(" / ") || "No primary target";
  const secondary = exercise?.secondaryMuscles?.join(" / ");
  return secondary ? `${primary} · Also ${secondary}` : primary;
}

function classificationSummary(exercise) {
  return [targetSummary(exercise), ...(exercise?.categories || [])].join(" · ");
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
  const canComplete = currentView === "workout" && routine;
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
      <div class="workout-section-heading">
        <h2>Exercises</h2>
        <button class="text-button" type="button" data-view-link="routines">Manage program</button>
      </div>
      ${routine.entries.length ? `<div class="workout-list">${routine.entries.map((entry, index) => {
        const exercise = exerciseById(state, entry.exerciseId);
        return `<article class="workout-item">
          <button class="workout-row" type="button" data-action="open-workout-exercise" data-id="${escapeHtml(exercise?.id || "")}" data-prescription="${escapeHtml(entry.prescription)}" aria-label="View ${escapeHtml(exercise?.name || "exercise")} details">
            <span class="row-number">${index + 1}</span>
            <span class="row-main"><span class="row-title">${escapeHtml(exercise?.name || "Missing exercise")}</span><span class="row-meta">${escapeHtml(entry.prescription || exercise?.defaultPrescription || "No prescription")}</span></span>
            <span class="workout-chevron" aria-hidden="true">${chevronIcon("right")}</span>
          </button>
        </article>`;
      }).join("")}</div>` : `<div class="empty-state compact-empty"><h3>No exercises yet</h3><p>Open Program to add exercises.</p></div>`}
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
  if (!routine) return;
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
  const primary = exercise.primaryMuscles || [];
  const secondary = exercise.secondaryMuscles || [];
  muscleList.innerHTML = `${primary.length ? `<p><strong>Primary</strong> ${primary.map(escapeHtml).join(" · ")}</p>` : ""}${secondary.length ? `<p><strong>Secondary</strong> ${secondary.map(escapeHtml).join(" · ")}</p>` : ""}`;
  document.querySelector("#detailTargetsSection").hidden = !primary.length && !secondary.length;
  const categories = exercise.categories || [];
  document.querySelector("#detailCategories").textContent = categories.join(" · ");
  document.querySelector("#detailCategoriesSection").hidden = !categories.length;
  const instructions = document.querySelector("#detailInstructions");
  instructions.textContent = exercise.instructions || "No notes added yet.";
  instructions.classList.toggle("muted-copy", !exercise.instructions);
  const alternatives = (exercise.alternativeExerciseIds || []).map((id) => exerciseById(state, id)).filter(Boolean);
  const alternativesTarget = document.querySelector("#detailAlternatives");
  alternativesTarget.innerHTML = alternatives.length
    ? `<div class="alternative-links">${alternatives.map((alternative) => `<button type="button" data-action="view-alternative" data-id="${escapeHtml(alternative.id)}">${escapeHtml(alternative.name)}<span aria-hidden="true">›</span></button>`).join("")}</div>`
    : `<p class="muted-copy">No alternatives linked.</p>`;
  const video = document.querySelector("#detailVideo");
  video.hidden = !exercise.videoId;
  document.querySelector("#detailVideoEmpty").hidden = Boolean(exercise.videoId);
  if (exercise.videoId) video.href = `https://www.youtube.com/watch?v=${exercise.videoId}`;
  else video.removeAttribute("href");
  document.querySelector("#detailEditExercise").dataset.exerciseId = exercise.id;
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
  const routines = state.routines;
  document.querySelector("#dayDialogContent").innerHTML = `
    <header class="dialog-header">
      <div><p class="dialog-kicker">Workout history</p><h2 id="dayDialogTitle">${escapeHtml(formatDate(date, { weekday: "long", month: "long", day: "numeric" }))}</h2></div>
      <button class="icon-button" type="button" data-close-dialog="dayDialog" aria-label="Close day editor">×</button>
    </header>
    <form id="dayForm" class="day-form" data-date="${dateKey}">
      <fieldset class="field-group"><legend>Completed routines</legend>
        <div class="day-routines">${routines.length ? routines.map((routine) => `<label class="check-option"><input type="checkbox" name="routine" value="${escapeHtml(routine.id)}" ${session.routineIds.includes(routine.id) ? "checked" : ""}><span><strong>${escapeHtml(routine.name)}</strong><small>${escapeHtml(routine.group)}</small></span></label>`).join("") : `<p class="muted-copy">Add a routine before logging a completion.</p>`}</div>
      </fieldset>
      <label class="field">Note<textarea id="dayNote" rows="4" maxlength="500" placeholder="Optional note">${escapeHtml(session.note)}</textarea></label>
      <p class="form-error" id="dayFormError" role="alert" data-dialog-error></p>
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
  const activeFilters = [];
  if (exerciseMuscle !== "All") activeFilters.push(`${exerciseMuscle} · ${exerciseMuscleScope === "primary" ? "Primary" : "Any"}`);
  if (exerciseCategory !== "All") activeFilters.push(exerciseCategory);
  const filterLabel = activeFilters.length ? activeFilters.join(" + ") : "Filter";
  main.innerHTML = `<section class="page">
    <div class="compact-toolbar library-toolbar">
      <span class="result-count" id="exerciseResultCount"></span>
      <button class="button primary compact-button" type="button" data-action="new-exercise">Add exercise</button>
    </div>
    <div class="library-controls">
      <label class="search-field"><span class="visually-hidden">Search exercises</span><input id="exerciseSearch" type="search" value="${escapeHtml(exerciseQuery)}" autocomplete="off" placeholder="Search exercises"></label>
      <button class="button secondary filter-button" type="button" data-action="open-exercise-filter" aria-label="Filter exercises, currently ${escapeHtml(filterLabel)}">${escapeHtml(filterLabel)}</button>
    </div>
    <div id="exerciseList"></div>
  </section>`;
  renderExerciseRows(state);
}

function filteredExercises(state, query = exerciseQuery, muscle = exerciseMuscle, category = exerciseCategory) {
  const needle = query.trim().toLowerCase();
  return state.exercises
    .filter((exercise) => muscle === "All" || (exerciseMuscleScope === "primary" ? exercise.primaryMuscles : exerciseTargets(exercise)).includes(muscle))
    .filter((exercise) => category === "All" || exercise.categories.includes(category))
    .filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle) || exerciseSearchTerms(exercise).some((item) => item.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderExerciseRows(state) {
  const target = document.querySelector("#exerciseList");
  if (!target) return;
  const exercises = filteredExercises(state);
  if (!exercises.length) {
    document.querySelector("#exerciseResultCount").textContent = "0 results";
    target.innerHTML = `<div class="empty-state compact-empty"><h3>No matching exercises</h3><p>Change the search or filters, or add a new exercise.</p><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div>`;
    return;
  }
  document.querySelector("#exerciseResultCount").textContent = `${exercises.length} ${exercises.length === 1 ? "result" : "results"}`;
  target.innerHTML = `<div class="library-list">${exercises.map((exercise) => `
    <button class="library-row" type="button" data-action="view-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="View ${escapeHtml(exercise.name)} details">
      <span class="row-main"><span class="row-title">${escapeHtml(exercise.name)}</span><span class="row-meta">${escapeHtml(exercise.defaultPrescription || "No prescription")} · ${escapeHtml(classificationSummary(exercise))}</span></span>
      <span class="workout-chevron" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`).join("")}</div>`;
}

function openExerciseFilter() {
  filterDraftScope = exerciseMuscleScope;
  const muscleSelect = document.querySelector("#muscleFilterSelect");
  muscleSelect.innerHTML = ["All", ...MUSCLE_GROUPS].map((muscle) => `<option value="${escapeHtml(muscle)}">${escapeHtml(muscle === "All" ? "All muscles" : muscle)}</option>`).join("");
  muscleSelect.value = exerciseMuscle;
  const categorySelect = document.querySelector("#categoryFilterSelect");
  categorySelect.innerHTML = ["All", ...EXERCISE_CATEGORIES].map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category === "All" ? "All categories" : category)}</option>`).join("");
  categorySelect.value = exerciseCategory;
  document.querySelectorAll('#muscleScopeOptions [data-scope]').forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scope === filterDraftScope));
  });
  document.querySelector("#exerciseFilterDialog").showModal();
}

function renderRoutines(state) {
  const routine = getActiveRoutine(state);
  main.innerHTML = `<section class="page">
    <div class="compact-toolbar">
      <span class="toolbar-label">Manage routines</span>
      <button class="button primary compact-button" type="button" data-action="new-routine">Add routine</button>
    </div>
    ${routineTabs(state, routine?.id)}
    ${routine ? `
      <div class="program-heading">
        <div>
          <h2>${escapeHtml(routine.name)}</h2>
          <p>${routine.group === "home" ? "Home" : "Gym"} · ${routine.status} · ${routine.entries.length} ${routine.entries.length === 1 ? "exercise" : "exercises"}</p>
        </div>
        <div class="row-actions">
          <button class="mini-button" type="button" data-action="move-routine-up" data-id="${escapeHtml(routine.id)}" aria-label="Move routine earlier" ${state.routines.indexOf(routine) === 0 ? "disabled" : ""}>${upIcon()}</button>
          <button class="mini-button" type="button" data-action="move-routine-down" data-id="${escapeHtml(routine.id)}" aria-label="Move routine later" ${state.routines.indexOf(routine) === state.routines.length - 1 ? "disabled" : ""}>${downIcon()}</button>
          <button class="mini-button" type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}" aria-label="Edit ${escapeHtml(routine.name)}">${editIcon()}</button>
        </div>
      </div>
      ${renderRoutineEntries(state, routine)}
      <button class="add-row-button" type="button" data-action="open-picker">+ Add exercise</button>
    ` : `<div class="list-panel"><div class="empty-state"><h3>No routines yet</h3><p>Add your first routine, then fill it from the exercise library.</p><button class="button primary" type="button" data-action="new-routine">Add routine</button></div></div>`}
  </section>`;
}

function renderRoutineEntries(state, routine) {
  if (!routine.entries.length) {
    return `<div class="empty-state compact-empty"><h3>No exercises yet</h3><p>Use Add exercise below to build this routine.</p></div>`;
  }
  return `<div class="program-list">${routine.entries.map((entry, index) => {
    const exercise = exerciseById(state, entry.exerciseId);
    const content = `<span class="row-number">${index + 1}</span>
      <span class="row-main"><span class="row-title">${escapeHtml(exercise?.name || "Missing exercise")}</span><span class="row-meta">${escapeHtml(entry.prescription || exercise?.defaultPrescription || "No prescription")}</span></span>
      <span class="drag-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8"/></svg></span>`;
    return `<button class="program-row" type="button" data-action="edit-entry" data-id="${escapeHtml(entry.id)}" aria-label="${escapeHtml(exercise?.name || "Exercise")}. Tap to edit. Hold and drag to reorder.">${content}</button>`;
  }).join("")}</div>`;
}

function entryDragPoint(event) {
  if (event.type.startsWith("touch")) {
    const touches = [...Array.from(event.touches), ...Array.from(event.changedTouches)];
    return touches.find((touch) => touch.identifier === entryDrag?.pointerId) || null;
  }
  return { clientX: event.clientX, clientY: event.clientY };
}

function slideEntryRows(rows, mutate) {
  const previous = new Map(rows.map((row) => [row, row.getBoundingClientRect()]));
  mutate();
  for (const row of rows) {
    row.style.transition = "none";
    row.style.transform = "";
  }
  const moved = [];
  for (const row of rows) {
    const delta = previous.get(row).top - row.getBoundingClientRect().top;
    if (!delta) continue;
    row.style.transform = `translateY(${delta}px)`;
    moved.push(row);
  }
  if (!moved.length) return;
  void moved[0].offsetHeight;
  for (const row of moved) {
    row.style.transition = "transform 160ms ease";
    row.style.transform = "translateY(0)";
  }
}

function updateEntryDropTarget(clientY) {
  if (!entryDrag?.active || entryDrag.settling) return;
  const rows = [...entryDrag.list.querySelectorAll(".program-row")];
  const before = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  slideEntryRows(rows, () => {
    if (before) entryDrag.list.insertBefore(entryDrag.placeholder, before);
    else entryDrag.list.append(entryDrag.placeholder);
  });
}

function runEntryDragAutoScroll() {
  if (!entryDrag?.active) return;
  const bounds = main.getBoundingClientRect();
  const edge = 56;
  const distanceFromTop = entryDrag.clientY - bounds.top;
  const distanceFromBottom = bounds.bottom - entryDrag.clientY;
  let amount = 0;
  if (distanceFromTop < edge) amount = -Math.ceil((edge - Math.max(0, distanceFromTop)) / 5);
  else if (distanceFromBottom < edge) amount = Math.ceil((edge - Math.max(0, distanceFromBottom)) / 5);
  if (amount) {
    main.scrollTop += amount;
    updateEntryDropTarget(entryDrag.clientY);
  }
  entryDrag.autoScrollFrame = requestAnimationFrame(runEntryDragAutoScroll);
}

function activateEntryDrag() {
  if (!entryDrag) return;
  if (!entryDrag.row.isConnected || !entryDrag.list || currentView !== "routines") {
    entryDrag = null;
    return;
  }
  const bounds = entryDrag.row.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.className = "program-row-placeholder";
  placeholder.style.height = `${bounds.height}px`;
  entryDrag.originIndex = [...entryDrag.list.children].indexOf(entryDrag.row);
  entryDrag.row.before(placeholder);
  entryDrag.placeholder = placeholder;
  entryDrag.active = true;
  window.getSelection()?.removeAllRanges();
  entryDrag.row.classList.add("is-dragging");
  entryDrag.row.style.left = `${bounds.left}px`;
  entryDrag.row.style.top = `${bounds.top}px`;
  entryDrag.row.style.width = `${bounds.width}px`;
  entryDrag.row.style.height = `${bounds.height}px`;
  document.body.append(entryDrag.row);
  document.body.classList.add("entry-drag-active");
  entryDrag.liftPending = true;
  entryDrag.row.style.transition = "transform 140ms ease, box-shadow 140ms ease";
  entryDrag.row.style.transform = "translate3d(0, 0, 0) scale(1)";
  void entryDrag.row.offsetHeight;
  entryDrag.row.style.transform = "translate3d(0, 0, 0) scale(1.015)";
  entryDrag.autoScrollFrame = requestAnimationFrame(runEntryDragAutoScroll);
}

function startEntryDrag(row, clientX, clientY, pointerId) {
  if (entryDrag || !row) return;
  const routine = getActiveRoutine(store.getState());
  entryDrag = {
    row,
    list: row.closest(".program-list"),
    entryId: row.dataset.id,
    routineId: routine?.id || "",
    pointerId,
    startX: clientX,
    startY: clientY,
    clientY,
    active: false,
    placeholder: null,
    autoScrollFrame: 0,
    originIndex: -1,
    liftPending: false,
    settling: false,
  };
  entryDrag.timer = window.setTimeout(activateEntryDrag, ENTRY_HOLD_DELAY);
}

function moveEntryDrag(event) {
  if (!entryDrag || entryDrag.settling) return;
  const point = entryDragPoint(event);
  if (!point) return;
  const distance = Math.hypot(point.clientX - entryDrag.startX, point.clientY - entryDrag.startY);
  if (!entryDrag.active && distance > ENTRY_HOLD_TOLERANCE) {
    clearTimeout(entryDrag.timer);
    entryDrag = null;
    return;
  }
  if (!entryDrag.active) return;
  event.preventDefault();
  if (entryDrag.liftPending) {
    entryDrag.liftPending = false;
    entryDrag.row.style.transition = "";
  }
  entryDrag.clientY = point.clientY;
  entryDrag.row.style.transform = `translate3d(0, ${point.clientY - entryDrag.startY}px, 0) scale(1.015)`;
  updateEntryDropTarget(point.clientY);
}

function restoreEntryDragOrigin(drag) {
  const rows = [...drag.list.querySelectorAll(".program-row")];
  const ref = rows[drag.originIndex] || null;
  slideEntryRows(rows, () => {
    if (ref) drag.list.insertBefore(drag.placeholder, ref);
    else drag.list.append(drag.placeholder);
  });
}

function settleEntryDrag(drag, done) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    done();
    return;
  }
  const target = drag.placeholder.getBoundingClientRect();
  drag.row.style.transition = "left 140ms ease, top 140ms ease, transform 140ms ease, box-shadow 140ms ease";
  drag.row.style.left = `${target.left}px`;
  drag.row.style.top = `${target.top}px`;
  drag.row.style.transform = "translate3d(0, 0, 0) scale(1)";
  window.setTimeout(done, 150);
}

function finishEntryDrag(savePosition) {
  if (!entryDrag || entryDrag.settling) return;
  clearTimeout(entryDrag.timer);
  const drag = entryDrag;
  if (!drag.active) {
    entryDrag = null;
    return;
  }

  drag.settling = true;
  cancelAnimationFrame(drag.autoScrollFrame);
  suppressEntryClickUntil = performance.now() + 600;
  if (!savePosition) restoreEntryDragOrigin(drag);
  settleEntryDrag(drag, () => {
    entryDrag = null;
    completeEntryDrag(drag, savePosition);
  });
}

function completeEntryDrag(drag, savePosition) {
  const targetIndex = [...drag.list.children].indexOf(drag.placeholder);
  drag.placeholder.replaceWith(drag.row);
  drag.row.classList.remove("is-dragging");
  drag.row.removeAttribute("style");
  document.body.classList.remove("entry-drag-active");

  if (!savePosition) {
    render();
    return;
  }
  const state = store.getState();
  const routine = state.routines.find((item) => item.id === drag.routineId);
  const sourceIndex = routine?.entries.findIndex((entry) => entry.id === drag.entryId) ?? -1;
  if (!routine || sourceIndex < 0 || sourceIndex === targetIndex) return;
  const result = store.replace(reorderRoutineEntry(state, routine.id, drag.entryId, targetIndex));
  saveResult(result, "Exercise moved.");
  render();
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
  const primarySelect = document.querySelector("#exercisePrimaryMuscle");
  primarySelect.innerHTML = `<option value="" disabled>Choose primary muscle</option>${MUSCLE_GROUPS.map((muscle) => `<option value="${escapeHtml(muscle)}">${escapeHtml(muscle)}</option>`).join("")}`;
  primarySelect.value = source?.primaryMuscles?.[0] || "";
  document.querySelector("#secondaryMuscleOptions").innerHTML = MUSCLE_GROUPS.map((muscle) => `
    <label class="check-option"><input type="checkbox" name="secondaryMuscles" value="${escapeHtml(muscle)}" ${source?.secondaryMuscles?.includes(muscle) ? "checked" : ""} ${primarySelect.value === muscle ? "disabled" : ""}>${escapeHtml(muscle)}</label>`).join("");
  document.querySelector("#exerciseCategoryOptions").innerHTML = EXERCISE_CATEGORIES.map((category) => `
    <label class="check-option"><input type="checkbox" name="exerciseCategories" value="${escapeHtml(category)}" ${source?.categories?.includes(category) ? "checked" : ""}>${escapeHtml(category)}</label>`).join("");
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
    .filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle) || exerciseSearchTerms(exercise).some((term) => term.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name));
  document.querySelector("#alternativesList").innerHTML = exercises.length ? exercises.map((exercise) => `
    <label class="check-option alternative-option"><input type="checkbox" value="${escapeHtml(exercise.id)}" ${alternativeDraftIds.includes(exercise.id) ? "checked" : ""}><span><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(classificationSummary(exercise))}</small></span></label>`).join("") : `<p class="muted-copy">No matching exercises.</p>`;
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
  const primaryMuscle = document.querySelector("#exercisePrimaryMuscle").value;
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
  if (!MUSCLE_GROUPS.includes(primaryMuscle)) {
    error.textContent = "Choose one primary muscle.";
    return false;
  }
  if (videoId === null) {
    error.textContent = "Paste a YouTube link or its 11-character video ID.";
    return false;
  }
  const exercise = {
    id: id || makeId("exercise"),
    name,
    primaryMuscles: [primaryMuscle],
    secondaryMuscles: [...document.querySelectorAll('#secondaryMuscleOptions input:checked')].map((input) => input.value).filter((muscle) => muscle !== primaryMuscle),
    categories: [...document.querySelectorAll('#exerciseCategoryOptions input:checked')].map((input) => input.value),
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
  const prescription = document.querySelector("#entryPrescription").value.trim();
  const result = store.replace(moveRoutineEntry(store.getState(), activeId, id, direction, prescription));
  if (!saveResult(result, "Exercise moved.")) return false;
  document.querySelector("#entryDialog").close();
  render();
  return true;
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
  document.querySelector("#entryFormError").textContent = "";
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
  document.querySelector("#pickerFormError").textContent = "";
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
    .filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle) || exerciseSearchTerms(exercise).some((term) => term.toLowerCase().includes(needle)))
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
  document.querySelector("#settingsFormError").textContent = "";
  document.querySelector("#rulesContent").innerHTML = RULES.map(([title, items]) => `
    <section class="rule-section"><h3>${escapeHtml(title)}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`).join("");
  document.querySelector("#settingsDialog").showModal();
}

function exportData() {
  try {
    const blob = new Blob([JSON.stringify(createBackup(store.getState()), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gym-schedule-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    clearActionError();
  } catch (_) {
    showActionError("App data could not be exported.");
  }
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
    showActionError(error.message || "This file could not be imported.");
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
  else if (action === "view-exercise") openExerciseDetails(id);
  else if (action === "open-exercise-filter") openExerciseFilter();
  else if (action === "new-routine") openRoutineEditor();
  else if (action === "edit-routine") openRoutineEditor(id);
  else if (action === "select-routine") selectRoutine(id);
  else if (action === "move-routine-up") moveRoutine(id, -1);
  else if (action === "move-routine-down") moveRoutine(id, 1);
  else if (action === "edit-entry") {
    if (performance.now() < suppressEntryClickUntil) return;
    openEntryEditor(id);
  }
  else if (action === "open-picker") openPicker();
  else if (action === "open-workout-exercise") openExerciseDetails(id, button.dataset.prescription || "");
  else if (action === "view-alternative") openExerciseDetails(id);
  else if (action === "toggle-today") toggleToday();
  else if (action === "previous-month") changeCalendarMonth(-1);
  else if (action === "next-month") changeCalendarMonth(1);
  else if (action === "open-day") openDayEditor(button.dataset.date);
});

main.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  const row = event.target.closest('.program-row[data-action="edit-entry"]');
  if (!row) return;
  const touch = event.touches[0];
  startEntryDrag(row, touch.clientX, touch.clientY, touch.identifier);
}, { passive: true });

main.addEventListener("selectstart", (event) => {
  if (event.target.closest?.(".program-row")) event.preventDefault();
});

window.addEventListener("touchmove", moveEntryDrag, { passive: false });
window.addEventListener("touchend", (event) => {
  if (!entryDrag || !Array.from(event.changedTouches).some((touch) => touch.identifier === entryDrag.pointerId)) return;
  if (entryDrag.active) event.preventDefault();
  finishEntryDrag(true);
}, { passive: false });
window.addEventListener("touchcancel", () => finishEntryDrag(false));

main.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;
  const row = event.target.closest('.program-row[data-action="edit-entry"]');
  if (row) startEntryDrag(row, event.clientX, event.clientY, event.pointerId);
});
window.addEventListener("pointermove", (event) => {
  if (event.pointerType === "mouse" && event.pointerId === entryDrag?.pointerId) moveEntryDrag(event);
});
window.addEventListener("pointerup", (event) => {
  if (event.pointerType === "mouse" && event.pointerId === entryDrag?.pointerId) finishEntryDrag(true);
});
window.addEventListener("pointercancel", (event) => {
  if (event.pointerId === entryDrag?.pointerId) finishEntryDrag(false);
});
document.addEventListener("contextmenu", (event) => {
  if (entryDrag?.active && event.target.closest(".program-row")) event.preventDefault();
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

document.querySelector("#applyExerciseFilterButton").addEventListener("click", () => {
  exerciseMuscle = document.querySelector("#muscleFilterSelect").value;
  exerciseMuscleScope = filterDraftScope;
  exerciseCategory = document.querySelector("#categoryFilterSelect").value;
  document.querySelector("#exerciseFilterDialog").close();
  renderExercises(store.getState());
});

document.querySelector("#muscleScopeOptions").addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="choose-muscle-scope"]');
  if (!button) return;
  filterDraftScope = button.dataset.scope;
  document.querySelectorAll('#muscleScopeOptions [data-scope]').forEach((option) => {
    option.setAttribute("aria-pressed", String(option === button));
  });
});

document.querySelector("#pickerSearch").addEventListener("input", (event) => {
  pickerQuery = event.target.value;
  renderPickerList();
});

document.querySelector("#chooseAlternativesButton").addEventListener("click", openAlternativesPicker);
document.querySelector("#exercisePrimaryMuscle").addEventListener("change", (event) => {
  document.querySelectorAll('#secondaryMuscleOptions input').forEach((input) => {
    if (input.value === event.target.value) input.checked = false;
    input.disabled = input.value === event.target.value;
  });
});
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

document.querySelector("#exerciseDetailDialog").addEventListener("click", (event) => {
  const alternative = event.target.closest('[data-action="view-alternative"]');
  if (alternative) {
    document.querySelector("#exerciseDetailDialog").close();
    openExerciseDetails(alternative.dataset.id);
  }
});

document.querySelector("#detailEditExercise").addEventListener("click", (event) => {
  const id = event.currentTarget.dataset.exerciseId;
  document.querySelector("#exerciseDetailDialog").close();
  openExerciseEditor(id);
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
  moveEntry(id, -1);
});
document.querySelector("#moveEntryLaterButton").addEventListener("click", () => {
  const id = document.querySelector("#entryId").value;
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
    .register("sw.js?v=24", { updateViaCache: "none" })
    .then((registration) => registration.update())
    .catch(() => showToast("Offline mode could not be started."));
}

applyTheme(store.getState().settings.theme || "light");
if (store.getLastError()) showToast(store.getLastError());
render();
