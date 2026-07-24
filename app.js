import {
  EXERCISE_EQUIPMENT,
  EXERCISE_PURPOSES,
  EXERCISE_TARGETS,
  MOVEMENT_PATTERNS,
  RULES,
} from "./data.js?v=37";
import {
  addRoutineEntryInState,
  addRoutineToProgram,
  createBackup,
  createProgramInState,
  createStore,
  duplicateProgramInState,
  localDateKey,
  makeId,
  moveRoutineEntry,
  reorderRoutineInProgram,
  reorderRoutineEntryWithinRole,
  parseImportedState,
  removeExerciseFromState,
  removeProgramFromState,
  removeRoutineEntryFromState,
  removeRoutineFromState,
  renameProgramInState,
  setActiveProgramInState,
  setActiveRoutineInState,
  setDayInState,
  setRelatedExercisesInState,
  toggleEntryCheckForDate,
  updateRoutineInState,
  updateRoutineEntryInState,
} from "./storage.js?v=37";
import {
  classificationSummary,
  exerciseSearchTerms,
  exerciseTargets,
  filteredExercises,
  libraryMarkup,
  libraryRowsMarkup,
} from "./ui/library.js?v=37";
import {
  calendarMarkup,
  dayEditorMarkup,
  rulesMarkup,
} from "./ui/log-settings.js?v=37";
import {
  escapeHtml,
} from "./ui/shared.js?v=37";
import {
  pickerListMarkup,
  programMarkup,
  programsListMarkup,
} from "./ui/program.js?v=37";
import {
  exerciseReferenceMarkup,
  exerciseVideoSearchMarkup,
} from "./ui/exercise-reference.js?v=37";
import {
  workoutMarkup,
} from "./ui/workout.js?v=37";

const store = createStore();
const main = document.querySelector("#appMain");
const viewTitle = document.querySelector("#viewTitle");
const viewMetaLine = document.querySelector("#viewMetaLine");
const toast = document.querySelector("#toast");

let currentView = "workout";
let exerciseQuery = "";
let exerciseTarget = "All";
let exerciseTargetScope = "primary";
let exercisePurpose = "All";
let filterDraftScope = "primary";
let pickerQuery = "";
let pendingRelatedExercises = [];
let relatedDraftExercises = [];
let alternativesQuery = "";
let exerciseEditorSourceId = "";
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let toastTimer;
let confirmResolver;
let entryDrag = null;
let suppressEntryClickUntil = 0;
let programDialogFocusReturn = null;
let routineDialogFocusReturn = null;
let entryDialogFocusReturn = null;
let pickerDialogFocusReturn = null;

const ENTRY_HOLD_DELAY = 340;
const ENTRY_HOLD_TOLERANCE = 10;

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

function getActiveProgram(state = store.getState()) {
  return state.programs.find((program) => program.id === state.settings.activeProgramId) || null;
}

function getProgramRoutines(state, program = getActiveProgram(state)) {
  if (!program) return [];
  const routineById = new Map(state.routines.map((routine) => [routine.id, routine]));
  return program.routineIds.map((id) => routineById.get(id)).filter(Boolean);
}

function getRoutineProgram(state, routineId) {
  return state.programs.find((program) => program.routineIds.includes(routineId)) || null;
}

function getActiveRoutine(state = store.getState()) {
  return getProgramRoutines(state).find((routine) => routine.id === state.settings.activeRoutineId) || null;
}

function exerciseById(state, id) {
  return state.exercises.find((exercise) => exercise.id === id);
}

function render() {
  const state = store.getState();
  document.body.dataset.currentView = currentView;
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
  const program = getActiveProgram(state);
  const routine = getActiveRoutine(state);
  const programRoutineCount = program?.routineIds.length || 0;
  const labels = {
    routines: ["Program", program ? `Manage ${programRoutineCount} ${programRoutineCount === 1 ? "routine" : "routines"}` : "No program selected"],
    exercises: ["Library", `${state.exercises.length} ${state.exercises.length === 1 ? "exercise" : "exercises"}`],
    calendar: ["Log", "Tap a day to edit"],
  };
  const [title, meta] = currentView === "workout"
    ? [routine?.name || "Workout", routine ? `${routine.group === "home" ? "Home" : "Gym"} · ${routine.entries.length} ${routine.entries.length === 1 ? "exercise" : "exercises"} · ${routine.status}` : program ? `${program.name} · No routine selected` : "No program selected"]
    : labels[currentView];
  viewTitle.textContent = title;
  viewMetaLine.textContent = meta;
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function renderWorkout(state) {
  const program = getActiveProgram(state);
  const routines = getProgramRoutines(state, program);
  const routine = getActiveRoutine(state);
  main.innerHTML = workoutMarkup({
    state,
    program,
    routines,
    routine,
    todayKey: localDateKey(),
    exerciseById,
  });
}

function renderCalendar(state) {
  main.innerHTML = calendarMarkup(state, calendarMonth, formatDate);
}

function toggleEntryCheck(routineId, entryId) {
  const state = store.getState();
  const checked = state.sessions[localDateKey()]?.checkedEntryIdsByRoutine?.[routineId]?.includes(entryId);
  const result = store.replace(toggleEntryCheckForDate(state, routineId, entryId));
  if (saveResult(result, checked ? "Exercise unchecked." : "Exercise checked.")) render();
}

function openExerciseDetails(exerciseId, prescription = "") {
  const state = store.getState();
  const exercise = exerciseById(state, exerciseId);
  if (!exercise) return;
  const relatedExercises = (exercise.relatedExercises || []).map((related) => ({
    ...related,
    exercise: exerciseById(state, related.exerciseId),
  })).filter((related) => related.exercise);
  document.querySelector("#exerciseDetailContent").innerHTML = exerciseReferenceMarkup({
    exercise,
    prescription,
    relatedExercises,
  });
  const dialog = document.querySelector("#exerciseDetailDialog");
  if (!dialog.open) dialog.showModal();
  else requestAnimationFrame(() => dialog.querySelector(".reference-sheet-head .icon-button")?.focus());
}

function openExerciseVideoSearch(exerciseId) {
  const exercise = exerciseById(store.getState(), exerciseId);
  if (!exercise) return;
  document.querySelector("#exerciseVideoContent").innerHTML = exerciseVideoSearchMarkup(exercise);
  document.querySelector("#exerciseVideoDialog").showModal();
}

function changeCalendarMonth(offset) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
  render();
}

function openDayEditor(dateKey) {
  const state = store.getState();
  const session = state.sessions[dateKey] || { routineIds: [], checkedEntryIdsByRoutine: {}, note: "" };
  const date = dateFromKey(dateKey);
  document.querySelector("#dayDialogContent").innerHTML = dayEditorMarkup({
    state,
    session,
    dateKey,
    date,
    formatDate,
    getRoutineProgram,
  });
  document.querySelector("#dayDialog").showModal();
}

function saveDay(form) {
  const dateKey = form.dataset.date;
  const routineIds = [...form.querySelectorAll('input[name="routine"]:checked')].map((input) => input.value);
  const note = form.querySelector("#dayNote").value.trim();
  const result = store.replace(setDayInState(store.getState(), dateKey, routineIds, note));
  if (!saveResult(result, "Day updated.")) return;
  document.querySelector("#dayDialog").close();
  render();
}

function renderExercises(state) {
  const exercises = currentFilteredExercises(state);
  main.innerHTML = libraryMarkup({
    query: exerciseQuery,
    target: exerciseTarget,
    targetScope: exerciseTargetScope,
    purpose: exercisePurpose,
    exercises,
  });
}

function currentFilteredExercises(state) {
  return filteredExercises(state, {
    query: exerciseQuery,
    target: exerciseTarget,
    targetScope: exerciseTargetScope,
    purpose: exercisePurpose,
  });
}

function renderExerciseRows(state) {
  const target = document.querySelector("#exerciseList");
  if (!target) return;
  const exercises = currentFilteredExercises(state);
  document.querySelector("#exerciseResultCount").textContent = `${exercises.length} ${exercises.length === 1 ? "result" : "results"}`;
  target.innerHTML = libraryRowsMarkup(exercises);
}

function openExerciseFilter() {
  filterDraftScope = exerciseTargetScope;
  const targetSelect = document.querySelector("#targetFilterSelect");
  targetSelect.innerHTML = `<option value="All">All targets</option>${EXERCISE_TARGETS.map((target) => `<option value="${escapeHtml(target.id)}">${escapeHtml(target.label)}</option>`).join("")}`;
  targetSelect.value = exerciseTarget;
  const purposeSelect = document.querySelector("#purposeFilterSelect");
  purposeSelect.innerHTML = `<option value="All">All purposes</option>${EXERCISE_PURPOSES.map((purpose) => `<option value="${escapeHtml(purpose.id)}">${escapeHtml(purpose.label)}</option>`).join("")}`;
  purposeSelect.value = exercisePurpose;
  document.querySelectorAll('#muscleScopeOptions [data-scope]').forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scope === filterDraftScope));
  });
  document.querySelector("#exerciseFilterDialog").showModal();
}

function renderRoutines(state) {
  const program = getActiveProgram(state);
  const routines = getProgramRoutines(state, program);
  const routine = getActiveRoutine(state);
  main.innerHTML = programMarkup({
    state,
    program,
    routines,
    routine,
    exerciseById,
  });
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
  const targetRoleIndex = [...drag.list.children].indexOf(drag.placeholder);
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
  const entry = routine?.entries.find((item) => item.id === drag.entryId);
  const sourceRoleIndex = routine?.entries
    .filter((item) => item.role === entry?.role)
    .findIndex((item) => item.id === drag.entryId) ?? -1;
  if (!routine || !entry || sourceRoleIndex < 0 || sourceRoleIndex === targetRoleIndex) return;
  const result = store.replace(reorderRoutineEntryWithinRole(state, routine.id, drag.entryId, targetRoleIndex));
  saveResult(result, "Exercise moved.");
  render();
}

function openExerciseEditor(exerciseId = "", duplicate = false) {
  const state = store.getState();
  const source = exerciseId ? exerciseById(state, exerciseId) : null;
  const editing = source && !duplicate;
  exerciseEditorSourceId = source?.id || "";
  document.querySelector("#exerciseDialogTitle").textContent = editing ? "Edit exercise" : duplicate ? "Duplicate exercise" : "Add exercise";
  document.querySelector("#exerciseId").value = editing ? source.id : "";
  document.querySelector("#exerciseName").value = source ? `${source.name}${duplicate ? " copy" : ""}` : "";
  document.querySelector("#exercisePrescription").value = source?.defaultPrescription || "";
  document.querySelector("#exerciseVideo").value = source?.videoId || "";
  document.querySelector("#exerciseInstructions").value = source?.instructions || "";
  document.querySelector("#exerciseFormError").textContent = "";
  document.querySelector("#deleteExerciseButton").hidden = !editing;
  document.querySelector("#duplicateExerciseButton").hidden = !editing;
  pendingRelatedExercises = (source?.relatedExercises || []).map((related) => ({ ...related }));
  updateAlternativesCount();
  const targetOptions = EXERCISE_TARGETS.map((target) => `<option value="${escapeHtml(target.id)}">${escapeHtml(target.label)}</option>`).join("");
  const primaryTarget1 = document.querySelector("#exercisePrimaryTarget1");
  const primaryTarget2 = document.querySelector("#exercisePrimaryTarget2");
  primaryTarget1.innerHTML = `<option value="" disabled>Choose dominant target</option>${targetOptions}`;
  primaryTarget2.innerHTML = `<option value="">No second primary target</option>${targetOptions}`;
  primaryTarget1.value = source?.primaryTargets?.[0] || "";
  primaryTarget2.value = source?.primaryTargets?.[1] || "";
  document.querySelector("#secondaryTargetOptions").innerHTML = EXERCISE_TARGETS.map((target) => `
    <label class="check-option"><input type="checkbox" name="secondaryTargets" value="${escapeHtml(target.id)}" ${source?.secondaryTargets?.includes(target.id) ? "checked" : ""}>${escapeHtml(target.label)}</label>`).join("");
  const movement = document.querySelector("#exerciseMovement");
  movement.innerHTML = `<option value="" disabled>Choose movement</option>${MOVEMENT_PATTERNS.map((value) => `<option value="${escapeHtml(value.id)}">${escapeHtml(value.label)}</option>`).join("")}`;
  movement.value = source?.movementPattern || "";
  const purpose = document.querySelector("#exercisePurpose");
  purpose.innerHTML = `<option value="" disabled>Choose purpose</option>${EXERCISE_PURPOSES.map((value) => `<option value="${escapeHtml(value.id)}">${escapeHtml(value.label)}</option>`).join("")}`;
  purpose.value = source?.purpose || "";
  document.querySelector("#exerciseEquipmentOptions").innerHTML = EXERCISE_EQUIPMENT.map((value) => `
    <label class="check-option"><input type="checkbox" name="exerciseEquipment" value="${escapeHtml(value.id)}" ${source?.equipment?.includes(value.id) ? "checked" : ""}>${escapeHtml(value.label)}</label>`).join("");
  syncExerciseTargetOptions();
  document.querySelector("#exerciseDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#exerciseName").focus());
}

function syncExerciseTargetOptions() {
  const primaryTarget1 = document.querySelector("#exercisePrimaryTarget1");
  const primaryTarget2 = document.querySelector("#exercisePrimaryTarget2");
  if (primaryTarget1.value && primaryTarget1.value === primaryTarget2.value) primaryTarget2.value = "";
  const selected = new Set([primaryTarget1.value, primaryTarget2.value].filter(Boolean));
  for (const option of primaryTarget1.options) option.disabled = Boolean(option.value && option.value === primaryTarget2.value);
  for (const option of primaryTarget2.options) option.disabled = Boolean(option.value && option.value === primaryTarget1.value);
  document.querySelectorAll('#secondaryTargetOptions input').forEach((input) => {
    if (selected.has(input.value)) input.checked = false;
    input.disabled = selected.has(input.value);
  });
}

function updateAlternativesCount() {
  const count = pendingRelatedExercises.length;
  document.querySelector("#alternativesCount").textContent = count ? `${count} linked` : "None linked";
}

function openAlternativesPicker() {
  alternativesQuery = "";
  relatedDraftExercises = pendingRelatedExercises.map((related) => ({ ...related }));
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
    <label class="check-option alternative-option"><input type="checkbox" value="${escapeHtml(exercise.id)}" ${relatedDraftExercises.some((related) => related.exerciseId === exercise.id) ? "checked" : ""}><span><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(classificationSummary(exercise))}</small></span></label>`).join("") : `<p class="muted-copy">No matching exercises.</p>`;
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
  const source = state.exercises.find((exercise) => exercise.id === (id || exerciseEditorSourceId));
  const name = document.querySelector("#exerciseName").value.trim();
  const primaryTargets = [
    document.querySelector("#exercisePrimaryTarget1").value,
    document.querySelector("#exercisePrimaryTarget2").value,
  ].filter(Boolean);
  const movementPattern = document.querySelector("#exerciseMovement").value;
  const purpose = document.querySelector("#exercisePurpose").value;
  const equipment = [...document.querySelectorAll('#exerciseEquipmentOptions input:checked')].map((input) => input.value);
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
  if (!primaryTargets.length || primaryTargets.some((target) => !EXERCISE_TARGETS.some((option) => option.id === target))) {
    error.textContent = "Choose a dominant target.";
    return false;
  }
  if (!MOVEMENT_PATTERNS.some((option) => option.id === movementPattern)) {
    error.textContent = "Choose a movement.";
    return false;
  }
  if (!equipment.length || equipment.some((value) => !EXERCISE_EQUIPMENT.some((option) => option.id === value))) {
    error.textContent = "Choose at least one equipment option.";
    return false;
  }
  if (!EXERCISE_PURPOSES.some((option) => option.id === purpose)) {
    error.textContent = "Choose a purpose.";
    return false;
  }
  if (videoId === null) {
    error.textContent = "Paste a YouTube link or its 11-character video ID.";
    return false;
  }
  const exerciseId = id || makeId("exercise");
  const exercise = {
    ...(source || {
      style: "",
      laterality: "",
      support: "",
      emphases: [],
      typicalChallenge: "",
      relatedExercises: [],
    }),
    id: exerciseId,
    name,
    primaryTargets,
    secondaryTargets: [...document.querySelectorAll('#secondaryTargetOptions input:checked')].map((input) => input.value).filter((target) => !primaryTargets.includes(target)),
    movementPattern,
    equipment,
    purpose,
    defaultPrescription: document.querySelector("#exercisePrescription").value.trim(),
    videoId,
    instructions: document.querySelector("#exerciseInstructions").value.trim(),
  };
  const result = store.update((next) => {
    if (id) next.exercises = next.exercises.map((item) => item.id === id ? exercise : item);
    else next.exercises.push(exercise);
    return setRelatedExercisesInState(
      next,
      exerciseId,
      pendingRelatedExercises.filter((related) => (
        related.exerciseId !== exerciseId
        && next.exercises.some((item) => item.id === related.exerciseId)
      )),
    );
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

function renderProgramsList() {
  document.querySelector("#programsList").innerHTML = programsListMarkup(store.getState());
}

function openPrograms() {
  renderProgramsList();
  document.querySelector("#programsFormError").textContent = "";
  document.querySelector("#programsDialog").showModal();
}

function setProgramStartMode(mode) {
  const resolvedMode = mode === "duplicate" ? "duplicate" : "empty";
  document.querySelector("#programStartMode").value = resolvedMode;
  document.querySelectorAll('#programStartModeOptions [data-mode]').forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === resolvedMode));
  });
  syncProgramStartMode();
}

function syncProgramStartMode() {
  const mode = document.querySelector("#programStartMode").value;
  const sourceField = document.querySelector("#programDuplicateSourceField");
  const source = document.querySelector("#programDuplicateSource");
  source.disabled = mode !== "duplicate";
  sourceField.classList.toggle("is-disabled", source.disabled);
}

function openProgramEditor(id = "", duplicateSourceId = "") {
  const state = store.getState();
  const program = id ? state.programs.find((item) => item.id === id) : null;
  const duplicateSource = duplicateSourceId ? state.programs.find((item) => item.id === duplicateSourceId) : null;
  if (id && !program) return;
  programDialogFocusReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const programsDialog = document.querySelector("#programsDialog");
  if (programsDialog.open) programsDialog.close();
  const programDialog = document.querySelector("#programDialog");
  if (programDialog.open) {
    programDialog.dataset.skipFocusReturn = "true";
    programDialog.close();
  }

  const sourceSelect = document.querySelector("#programDuplicateSource");
  sourceSelect.innerHTML = state.programs.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  const duplicateButton = document.querySelector('#programStartModeOptions [data-mode="duplicate"]');
  duplicateButton.disabled = !state.programs.length;

  document.querySelector("#programDialogTitle").textContent = program ? "Edit program" : "Add program";
  document.querySelector("#programDialogSubtitle").hidden = Boolean(program);
  document.querySelector("#programId").value = program?.id || "";
  document.querySelector("#programName").value = program?.name || (duplicateSource ? `${duplicateSource.name} copy` : "");
  document.querySelector("#programCreateFields").hidden = Boolean(program);
  document.querySelector("#programEditActions").hidden = !program;
  document.querySelector("#programCancelButton").hidden = Boolean(program);
  document.querySelector("#programSaveButton").textContent = program ? "Save changes" : "Create program";
  document.querySelector("#programFormError").textContent = "";
  if (state.programs.length) sourceSelect.value = duplicateSource?.id || state.settings.activeProgramId || state.programs[0].id;
  setProgramStartMode(duplicateSource ? "duplicate" : "empty");
  programDialog.classList.toggle("compact-dialog", Boolean(program));
  programDialog.showModal();
  requestAnimationFrame(() => document.querySelector("#programName").focus());
}

function saveProgram() {
  const state = store.getState();
  const id = document.querySelector("#programId").value;
  const name = document.querySelector("#programName").value.trim();
  const error = document.querySelector("#programFormError");
  if (!name) {
    error.textContent = "Enter a program name.";
    return false;
  }
  const duplicateName = state.programs.find((program) => program.id !== id && program.name.toLowerCase() === name.toLowerCase());
  if (duplicateName) {
    error.textContent = "A program with this name already exists.";
    return false;
  }

  let next;
  if (id) {
    next = renameProgramInState(state, id, name);
  } else if (document.querySelector("#programStartMode").value === "duplicate") {
    const sourceId = document.querySelector("#programDuplicateSource").value;
    if (!state.programs.some((program) => program.id === sourceId)) {
      error.textContent = "Choose a program to duplicate.";
      return false;
    }
    next = duplicateProgramInState(state, sourceId, name);
  } else {
    next = createProgramInState(state, name);
  }

  const result = store.replace(next);
  const successMessage = id ? "Program renamed." : "Program created.";
  if (!saveResult(result, successMessage)) return false;
  document.querySelector("#programDialog").close();
  render();
  main.scrollTop = 0;
  return true;
}

function selectProgram(id) {
  const state = store.getState();
  if (!state.programs.some((program) => program.id === id)) return;
  const result = store.replace(setActiveProgramInState(state, id));
  if (!saveResult(result, "Program selected.")) return;
  document.querySelector("#programsDialog").close();
  render();
  main.scrollTop = 0;
}

async function deleteProgram(id) {
  const state = store.getState();
  const program = state.programs.find((item) => item.id === id);
  if (!program) return;
  const count = program.routineIds.length;
  const editor = document.querySelector("#programDialog");
  const returnToEditor = editor.open;
  if (returnToEditor) {
    editor.dataset.skipFocusReturn = "true";
    editor.close();
  }
  const confirmed = await confirmAction(
    `Delete ${program.name}?`,
    `This removes ${count} ${count === 1 ? "routine" : "routines"} and their completion history. Master exercises stay in the Library.`,
    "Delete program",
    "Keep program",
    "program-delete",
  );
  if (!confirmed) {
    if (returnToEditor) openProgramEditor(id);
    return;
  }
  const result = store.replace(removeProgramFromState(state, id));
  if (!result.ok) {
    if (returnToEditor) openProgramEditor(id);
    saveResult(result);
    return;
  }
  saveResult(result, "Program deleted.");
  render();
  main.scrollTop = 0;
}

function openRoutineEditor(id = "", focusReturn = document.activeElement) {
  const state = store.getState();
  if (!getActiveProgram(state)) {
    openProgramEditor();
    return;
  }
  const routine = state.routines.find((item) => item.id === id);
  const dialog = document.querySelector("#routineDialog");
  routineDialogFocusReturn = focusReturn;
  document.querySelector("#routineDialogTitle").textContent = routine ? `Edit ${routine.name}` : "Add routine";
  document.querySelector("#routineId").value = routine?.id || "";
  document.querySelector("#routineName").value = routine?.name || "";
  setRoutineOption("group", routine?.group || "gym");
  setRoutineOption("status", routine?.status || "required");
  document.querySelector("#routineFormError").textContent = "";
  document.querySelector("#routineEditActions").hidden = !routine;
  updateRoutineMoveButtons(routine?.id || "");
  dialog.classList.toggle("compact-dialog", !routine);
  dialog.showModal();
  requestAnimationFrame(() => document.querySelector("#routineName").focus());
}

function setRoutineOption(kind, value) {
  const input = document.querySelector(`#routine${kind === "group" ? "Group" : "Status"}`);
  const options = document.querySelector(`#routine${kind === "group" ? "Group" : "Status"}Options`);
  input.value = value;
  options.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset[`routine${kind[0].toUpperCase()}${kind.slice(1)}`] === value));
  });
}

function updateRoutineMoveButtons(id) {
  const state = store.getState();
  const program = getRoutineProgram(state, id);
  const index = program?.routineIds.indexOf(id) ?? -1;
  document.querySelector("#moveRoutineEarlierButton").disabled = index <= 0;
  document.querySelector("#moveRoutineLaterButton").disabled = index < 0 || index === program.routineIds.length - 1;
}

function saveRoutine() {
  const state = store.getState();
  const activeProgram = getActiveProgram(state);
  const id = document.querySelector("#routineId").value;
  const name = document.querySelector("#routineName").value.trim();
  const error = document.querySelector("#routineFormError");
  if (!name) {
    error.textContent = "Enter a routine name.";
    return false;
  }
  const owner = id ? getRoutineProgram(state, id) : activeProgram;
  const duplicate = getProgramRoutines(state, owner).find((routine) => routine.id !== id && routine.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    error.textContent = "A routine with this name already exists.";
    return false;
  }
  const routineId = id || makeId("routine");
  const result = store.update((next) => {
    if (id) {
      return updateRoutineInState(next, id, {
        name,
        group: document.querySelector("#routineGroup").value,
        status: document.querySelector("#routineStatus").value,
      });
    }
    const withRoutine = addRoutineToProgram(next, next.settings.activeProgramId, {
      id: routineId,
      name,
      group: document.querySelector("#routineGroup").value,
      status: document.querySelector("#routineStatus").value,
      entries: [],
    });
    return setActiveRoutineInState(withRoutine, routineId);
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
  const editor = document.querySelector("#routineDialog");
  const returnToEditor = editor.open;
  const focusReturn = routineDialogFocusReturn;
  if (returnToEditor) {
    editor.dataset.skipFocusReturn = "true";
    editor.close();
  }
  const confirmed = await confirmAction(
    `Delete ${routine.name}?`,
    "This removes the routine and its completion history. Master exercises stay in the Library.",
    "Delete routine",
    "Keep routine",
    "routine-delete",
  );
  if (!confirmed) {
    if (returnToEditor) openRoutineEditor(id, focusReturn);
    return;
  }
  const result = store.replace(removeRoutineFromState(state, id));
  if (!result.ok) {
    if (returnToEditor) openRoutineEditor(id, focusReturn);
    saveResult(result);
    return;
  }
  saveResult(result, "Routine deleted.");
  render();
  setTimeout(() => {
    const target = main.querySelector(".routine-tab[aria-pressed='true']")
      || main.querySelector(".program-empty-state [data-action='new-routine']")
      || main.querySelector(".program-page-manage");
    target?.focus({ preventScroll: true });
  }, 0);
}

function selectRoutine(id) {
  const result = store.replace(setActiveRoutineInState(store.getState(), id));
  if (saveResult(result)) render();
}

function moveRoutine(id, direction) {
  const state = store.getState();
  const program = state.programs.find((item) => item.routineIds.includes(id));
  const index = program?.routineIds.indexOf(id) ?? -1;
  const result = store.replace(reorderRoutineInProgram(state, program?.id, id, index + direction));
  if (!saveResult(result, "Routine moved.")) return false;
  render();
  updateRoutineMoveButtons(id);
  return true;
}

function moveEntry(id, direction) {
  const activeId = store.getState().settings.activeRoutineId;
  const prescription = document.querySelector("#entryPrescription").value.trim();
  const role = document.querySelector("#entryRole").value;
  const result = store.replace(moveRoutineEntry(store.getState(), activeId, id, direction, prescription, role));
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
    `Remove ${exercise?.name || "exercise"}?`,
    `This removes only the ${routine.name} entry. The master exercise stays in the Library.`,
    "Remove entry",
    "Keep entry",
    "entry-remove",
  );
  if (!confirmed) return;
  const activeId = store.getState().settings.activeRoutineId;
  const result = store.replace(removeRoutineEntryFromState(store.getState(), activeId, id));
  if (!saveResult(result, "Exercise removed from routine.")) return;
  if (document.querySelector("#entryDialog").open) document.querySelector("#entryDialog").close();
  render();
}

function openEntryEditor(id) {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  const entry = routine?.entries.find((item) => item.id === id);
  const exercise = entry ? exerciseById(state, entry.exerciseId) : null;
  if (!entry || !exercise) return;
  entryDialogFocusReturn = document.activeElement;
  document.querySelector("#entryId").value = entry.id;
  document.querySelector("#entryExerciseName").textContent = exercise.name;
  document.querySelector("#entryRoutineContext").textContent = `${routine.name} entry`;
  document.querySelector("#entryPrescriptionLabel").textContent = `Prescription for ${routine.name}`;
  document.querySelector("#entryPrescription").value = entry.prescription || exercise.defaultPrescription || "";
  document.querySelector("#entryFormNote").textContent = `This changes only the ${routine.name} entry. The master exercise and its default prescription stay unchanged.`;
  document.querySelector("#removeEntryButton").firstChild.textContent = `Remove from ${routine.name} `;
  setEntryRole(entry.role);
  document.querySelector("#entryFormError").textContent = "";
  document.querySelector("#entryDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#entryPrescription").focus());
}

function setEntryRole(role) {
  document.querySelector("#entryRole").value = role;
  document.querySelectorAll("#entryRoleOptions [data-entry-role]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.entryRole === role));
  });
  const state = store.getState();
  const routine = getActiveRoutine(state);
  const entryId = document.querySelector("#entryId").value;
  const entry = routine?.entries.find((item) => item.id === entryId);
  if (!entry) return;
  const roleEntries = routine.entries.filter((item) => item.role === role);
  const roleIndex = role === entry.role
    ? roleEntries.findIndex((item) => item.id === entryId)
    : roleEntries.length;
  const roleCount = roleEntries.length + (role === entry.role ? 0 : 1);
  document.querySelector("#moveEntryEarlierButton").disabled = roleIndex <= 0;
  document.querySelector("#moveEntryLaterButton").disabled = roleIndex >= roleCount - 1;
}

function saveEntry() {
  const id = document.querySelector("#entryId").value;
  const prescription = document.querySelector("#entryPrescription").value.trim();
  const role = document.querySelector("#entryRole").value;
  const activeId = store.getState().settings.activeRoutineId;
  const result = store.replace(updateRoutineEntryInState(store.getState(), activeId, id, { prescription, role }));
  if (!saveResult(result, "Routine entry updated.")) return false;
  document.querySelector("#entryDialog").close();
  render();
  return true;
}

function openPicker() {
  const routine = getActiveRoutine(store.getState());
  if (!routine) return;
  pickerDialogFocusReturn = document.activeElement;
  pickerQuery = "";
  document.querySelector("#pickerSearch").value = "";
  document.querySelector("#pickerRoutineContext").textContent = `${routine.name} · Library`;
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
  document.querySelector("#pickerResultCount").textContent = `${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"}`;
  document.querySelector("#pickerList").innerHTML = pickerListMarkup(exercises, existing);
}

function pickExercise(exerciseId) {
  const state = store.getState();
  const activeId = state.settings.activeRoutineId;
  const exercise = exerciseById(state, exerciseId);
  if (!exercise) return;
  const entry = {
    id: makeId("entry"),
    exerciseId,
    prescription: exercise.defaultPrescription || "",
    role: "main",
  };
  const result = store.replace(addRoutineEntryInState(state, activeId, entry));
  if (!saveResult(result, "Exercise added to routine.")) return;
  document.querySelector("#pickerDialog").close();
  render();
}

function confirmAction(title, message, buttonLabel, cancelLabel = "Keep it", variant = "") {
  document.querySelector("#confirmTitle").textContent = title;
  document.querySelector("#confirmMessage").textContent = message;
  document.querySelector("#confirmAction").textContent = buttonLabel;
  document.querySelector("#confirmCancel").textContent = cancelLabel;
  const dialog = document.querySelector("#confirmDialog");
  dialog.dataset.variant = variant;
  dialog.returnValue = "cancel";
  dialog.showModal();
  return new Promise((resolve) => { confirmResolver = resolve; });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#0f1114" : "#f3f4f5";
  document.querySelector("#settingsThemeValue").textContent = theme === "dark" ? "Dark" : "Light";
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  const result = store.update((state) => { state.settings.theme = nextTheme; });
  if (saveResult(result)) applyTheme(nextTheme);
}

function openSettings() {
  document.querySelector("#settingsFormError").textContent = "";
  document.querySelector("#rulesContent").innerHTML = rulesMarkup(RULES);
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
  else if (action === "open-programs") openPrograms();
  else if (action === "new-program") openProgramEditor();
  else if (action === "edit-program") openProgramEditor(id);
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
  else if (action === "toggle-entry-check") toggleEntryCheck(button.dataset.routineId, id);
  else if (action === "open-workout-exercise") openExerciseDetails(id, button.dataset.prescription || "");
  else if (action === "open-workout-video") openExerciseVideoSearch(id);
  else if (action === "view-alternative") openExerciseDetails(id);
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

document.querySelector("#programsList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "select-program") selectProgram(button.dataset.id);
  else if (button.dataset.action === "edit-program") openProgramEditor(button.dataset.id);
});

document.querySelector("#newProgramButton").addEventListener("click", () => openProgramEditor());
document.querySelector("#programStartModeOptions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (button && !button.disabled) setProgramStartMode(button.dataset.mode);
});

document.querySelector("#routineGroupOptions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-routine-group]");
  if (button) setRoutineOption("group", button.dataset.routineGroup);
});

document.querySelector("#routineStatusOptions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-routine-status]");
  if (button) setRoutineOption("status", button.dataset.routineStatus);
});

document.querySelector("#entryRoleOptions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-entry-role]");
  if (button) setEntryRole(button.dataset.entryRole);
});

document.querySelector("#applyExerciseFilterButton").addEventListener("click", () => {
  exerciseTarget = document.querySelector("#targetFilterSelect").value;
  exerciseTargetScope = filterDraftScope;
  exercisePurpose = document.querySelector("#purposeFilterSelect").value;
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
for (const selectId of ["exercisePrimaryTarget1", "exercisePrimaryTarget2"]) {
  document.querySelector(`#${selectId}`).addEventListener("change", syncExerciseTargetOptions);
}
document.querySelector("#alternativesSearch").addEventListener("input", (event) => {
  alternativesQuery = event.target.value;
  renderAlternativesList();
});
document.querySelector("#alternativesList").addEventListener("change", (event) => {
  if (event.target.type !== "checkbox") return;
  if (event.target.checked && !relatedDraftExercises.some((related) => related.exerciseId === event.target.value)) {
    relatedDraftExercises.push({ exerciseId: event.target.value, relation: "similar" });
  } else if (!event.target.checked) {
    relatedDraftExercises = relatedDraftExercises.filter((related) => related.exerciseId !== event.target.value);
  }
});
document.querySelector("#saveAlternativesButton").addEventListener("click", () => {
  pendingRelatedExercises = relatedDraftExercises.map((related) => ({ ...related }));
  updateAlternativesCount();
  document.querySelector("#alternativesDialog").close();
});

document.querySelector("#exerciseDetailDialog").addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "view-alternative") openExerciseDetails(action.dataset.id);
  else if (action.dataset.action === "edit-master-exercise") {
    document.querySelector("#exerciseDetailDialog").close();
    openExerciseEditor(action.dataset.id);
  }
});

document.querySelector("#exerciseVideoDialog").addEventListener("click", (event) => {
  const action = event.target.closest('[data-action="edit-master-exercise"]');
  if (!action) return;
  document.querySelector("#exerciseVideoDialog").close();
  openExerciseEditor(action.dataset.id);
});

document.querySelector("#dayDialog").addEventListener("submit", (event) => {
  if (event.target.id !== "dayForm") return;
  event.preventDefault();
  saveDay(event.target);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-close-dialog]");
  if (!button) return;
  const dialog = document.querySelector(`#${button.dataset.closeDialog}`);
  if (dialog?.open) dialog.close();
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

document.querySelector("#programForm").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  saveProgram();
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
document.querySelector("#moveRoutineEarlierButton").addEventListener("click", () => {
  moveRoutine(document.querySelector("#routineId").value, -1);
});
document.querySelector("#moveRoutineLaterButton").addEventListener("click", () => {
  moveRoutine(document.querySelector("#routineId").value, 1);
});

document.querySelector("#deleteExerciseButton").addEventListener("click", () => deleteExercise(document.querySelector("#exerciseId").value));
document.querySelector("#duplicateExerciseButton").addEventListener("click", () => {
  const id = document.querySelector("#exerciseId").value;
  document.querySelector("#exerciseDialog").close();
  openExerciseEditor(id, true);
});
document.querySelector("#deleteRoutineButton").addEventListener("click", () => deleteRoutine(document.querySelector("#routineId").value));
document.querySelector("#duplicateProgramButton").addEventListener("click", () => {
  const id = document.querySelector("#programId").value;
  openProgramEditor("", id);
});
document.querySelector("#deleteProgramButton").addEventListener("click", () => deleteProgram(document.querySelector("#programId").value));
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
  delete event.target.dataset.variant;
});

document.querySelector("#programDialog").addEventListener("close", (event) => {
  if (event.target.dataset.skipFocusReturn) {
    delete event.target.dataset.skipFocusReturn;
    return;
  }
  requestAnimationFrame(() => {
    const storedTarget = programDialogFocusReturn;
    const storedDialog = storedTarget?.closest?.("dialog");
    const fallback = currentView === "routines"
      ? main.querySelector(".program-page-manage")
      : currentView === "workout"
        ? main.querySelector(".workout-program-pick, [data-action='new-program']")
        : main;
    const target = storedTarget?.isConnected && (!storedDialog || storedDialog.open)
      ? storedTarget
      : fallback;
    target?.focus?.({ preventScroll: true });
    programDialogFocusReturn = null;
  });
});

document.querySelector("#routineDialog").addEventListener("close", (event) => {
  if (event.target.dataset.skipFocusReturn) {
    delete event.target.dataset.skipFocusReturn;
    return;
  }
  const editedRoutineId = event.target.querySelector("#routineId")?.value || "";
  requestAnimationFrame(() => {
    const storedTarget = routineDialogFocusReturn;
    const fallback = currentView === "routines"
      ? editedRoutineId
        ? [...main.querySelectorAll(".program-view-edit")].find((button) => button.dataset.id === editedRoutineId)
        : main.querySelector(".program-app-action, [data-action='new-routine'], .program-page-manage")
      : main;
    const target = storedTarget !== main && storedTarget?.isConnected && main.contains(storedTarget)
      ? storedTarget
      : fallback;
    target?.focus?.({ preventScroll: true });
    routineDialogFocusReturn = null;
  });
});

document.querySelector("#entryDialog").addEventListener("close", (event) => {
  const editedEntryId = event.target.querySelector("#entryId")?.value || "";
  setTimeout(() => {
    const storedTarget = entryDialogFocusReturn;
    const fallback = currentView === "routines"
      ? [...main.querySelectorAll(".program-row")].find((button) => button.dataset.id === editedEntryId)
        || main.querySelector(".add-row-button")
        || main.querySelector(".program-view-edit")
      : main;
    const target = storedTarget !== main && storedTarget?.isConnected && main.contains(storedTarget)
      ? storedTarget
      : fallback;
    target?.focus?.({ preventScroll: true });
    entryDialogFocusReturn = null;
  }, 0);
});

document.querySelector("#pickerDialog").addEventListener("close", () => {
  requestAnimationFrame(() => {
    const storedTarget = pickerDialogFocusReturn;
    const fallback = currentView === "routines"
      ? main.querySelector(".add-row-button, .program-empty-state [data-action='open-picker']")
      : main;
    const target = storedTarget !== main && storedTarget?.isConnected && main.contains(storedTarget)
      ? storedTarget
      : fallback;
    target?.focus?.({ preventScroll: true });
    pickerDialogFocusReturn = null;
  });
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
    .register("sw.js?v=37", { updateViaCache: "none" })
    .then((registration) => registration.update())
    .catch(() => showToast("Offline mode could not be started."));
}

applyTheme(store.getState().settings.theme || "light");
if (store.getLastError()) showToast(store.getLastError());
render();
