import {
  EXERCISE_CHALLENGES,
  EXERCISE_EMPHASES,
  EXERCISE_EQUIPMENT,
  EXERCISE_LATERALITIES,
  EXERCISE_PURPOSES,
  EXERCISE_STYLES,
  EXERCISE_SUPPORTS,
  EXERCISE_TARGETS,
  MOVEMENT_PATTERNS,
  RULES,
  classificationLabel,
} from "./data.js?v=44";
import {
  addRoutineEntryInState,
  addRoutineToProgram,
  createBackup,
  createProgramInState,
  createStore,
  duplicateProgramInState,
  exerciseDeletionImpact,
  localDateKey,
  makeId,
  moveRoutineEntry,
  reorderRoutineInProgram,
  reorderRoutineEntryWithinBlock,
  parseImportedState,
  removeExerciseFromState,
  removeProgramFromState,
  removeRoutineEntryFromState,
  removeRoutineFromState,
  setActiveProgramInState,
  setActiveRoutineInState,
  setDayInState,
  toggleEntryCheckForDate,
  upsertExerciseInState,
  updateProgramInState,
  updateRoutineInState,
  updateRoutineEntryInState,
} from "./storage.js?v=44";
import {
  availableLibraryBrowseGroups,
  classificationOptionPickerMarkup,
  classificationSummary,
  createLibraryFilters,
  exerciseFilterContentMarkup,
  exerciseSearchTerms,
  filteredExercises,
  libraryMarkup,
  libraryRowsMarkup,
  normalizedExerciseSearch,
  relationshipEditorMarkup,
} from "./ui/library.js?v=44";
import {
  calendarMarkup,
  dayEditorMarkup,
  rulesMarkup,
} from "./ui/log-settings.js?v=44";
import {
  entryPresentation,
  escapeHtml,
} from "./ui/shared.js?v=44";
import {
  entryChoicesEditorMarkup,
  pickerListMarkup,
  programMarkup,
  programsListMarkup,
  routineBlocksEditorMarkup,
} from "./ui/program.js?v=44";
import {
  exerciseReferenceMarkup,
  exerciseVideoSearchMarkup,
} from "./ui/exercise-reference.js?v=44";
import {
  entryChoicesMarkup,
  workoutMarkup,
} from "./ui/workout.js?v=44";

const store = createStore();
const main = document.querySelector("#appMain");
const viewTitle = document.querySelector("#viewTitle");
const viewMetaLine = document.querySelector("#viewMetaLine");
const toast = document.querySelector("#toast");

let currentView = "workout";
let exerciseQuery = "";
let exerciseFilters = createLibraryFilters();
let exerciseFilterDraft = createLibraryFilters();
let exerciseFilterFocusReturn = null;
let pickerQuery = "";
let pickerBlockId = "";
let pickerMode = "entry";
let pendingRelatedExercises = [];
let relatedDraftExercises = [];
let alternativesQuery = "";
let exerciseEditorSourceId = "";
let exerciseEditorMode = "add";
let exerciseEditorSelections = { secondaryTargets: [], equipment: [], emphases: [] };
let exerciseEditorFocusReturn = null;
let exerciseEditorReturnId = "";
let classificationPickerKind = "";
let classificationPickerDraft = [];
let classificationPickerFocusReturn = null;
let alternativesFocusReturn = null;
let exerciseNestedDialogVersion = 0;
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let toastTimer;
let confirmResolver;
let entryDrag = null;
let routineBlockDrag = null;
let routineBlockDraft = [];
let entryChoiceDraft = [];
let entryChoiceEditIndex = -1;
let suppressEntryClickUntil = 0;
let suppressRoutineBlockClickUntil = 0;
let programDialogFocusReturn = null;
let routineDialogFocusReturn = null;
let entryDialogFocusReturn = null;
let pickerDialogFocusReturn = null;
let routineBlockDialogFocusReturn = null;
let entryChoiceDialogFocusReturn = null;
let entryChoicesDialogFocusReturn = null;

const ENTRY_HOLD_DELAY = 340;
const ENTRY_HOLD_TOLERANCE = 10;
const BLOCK_HOLD_DELAY = 340;
const BLOCK_HOLD_TOLERANCE = 10;

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
    ? [routine?.name || "Workout", routine ? `${routine.group === "home" ? "Home" : "Gym"} · ${routine.entries.length} ${routine.entries.length === 1 ? "slot" : "slots"} · ${routine.status}` : program ? `${program.name} · No routine selected` : "No program selected"]
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

function routineEntryDisplayIndex(routine, entryId) {
  let index = 0;
  for (const block of routine.blocks) {
    for (const entry of routine.entries.filter((item) => item.blockId === block.id)) {
      index += 1;
      if (entry.id === entryId) return index;
    }
  }
  return 0;
}

function openExerciseDetails(exerciseId, prescription = "", routineContext = null) {
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
    routineName: routineContext?.name || "",
    routineNote: routineContext?.note || "",
  });
  const dialog = document.querySelector("#exerciseDetailDialog");
  if (!dialog.open) dialog.showModal();
  else requestAnimationFrame(() => dialog.querySelector(".reference-sheet-head .icon-button")?.focus());
}

function openEntryChoices(routineId, entryId, focusReturn = document.activeElement) {
  const state = store.getState();
  const routine = state.routines.find((item) => item.id === routineId);
  const entry = routine?.entries.find((item) => item.id === entryId);
  if (!routine || !entry || entry.choices.length < 2) return;
  const block = routine.blocks.find((item) => item.id === entry.blockId);
  entryChoicesDialogFocusReturn = focusReturn instanceof HTMLElement ? focusReturn : null;
  const dialog = document.querySelector("#entryChoicesDialog");
  dialog.dataset.routineId = routine.id;
  dialog.dataset.entryId = entry.id;
  document.querySelector("#entryChoicesContent").innerHTML = entryChoicesMarkup({
    state,
    routine,
    entry,
    blockName: block?.name.trim() || "",
    displayIndex: routineEntryDisplayIndex(routine, entry.id),
    exerciseById,
  });
  dialog.showModal();
}

function refreshOpenEntryChoices() {
  const dialog = document.querySelector("#entryChoicesDialog");
  if (!dialog.open) return;
  const state = store.getState();
  const routine = state.routines.find((item) => item.id === dialog.dataset.routineId);
  const entry = routine?.entries.find((item) => item.id === dialog.dataset.entryId);
  if (!routine || !entry || entry.choices.length < 2) {
    dialog.close();
    return;
  }
  const activeChoiceAction = document.activeElement?.closest?.("#entryChoicesContent [data-action][data-index]");
  const focusAction = activeChoiceAction?.dataset.action || "";
  const focusIndex = activeChoiceAction?.dataset.index || "";
  const block = routine.blocks.find((item) => item.id === entry.blockId);
  document.querySelector("#entryChoicesContent").innerHTML = entryChoicesMarkup({
    state,
    routine,
    entry,
    blockName: block?.name.trim() || "",
    displayIndex: routineEntryDisplayIndex(routine, entry.id),
    exerciseById,
  });
  requestAnimationFrame(() => {
    const target = focusAction
      ? document.querySelector(`#entryChoicesContent [data-action="${focusAction}"][data-index="${focusIndex}"]`)
      : null;
    (target || document.querySelector('#entryChoicesContent [data-close-dialog="entryChoicesDialog"]'))?.focus();
  });
}

function choiceContext(routineId, entryId, index) {
  const state = store.getState();
  const routine = state.routines.find((item) => item.id === routineId);
  const entry = routine?.entries.find((item) => item.id === entryId);
  const choice = entry?.choices[index];
  if (!routine || !entry || !choice) return null;
  return { state, routine, entry, choice };
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
    filters: exerciseFilters,
    exercises,
    totalCount: state.exercises.length,
    browseGroups: availableLibraryBrowseGroups(state, exerciseFilters.targetScope),
  });
}

function currentFilteredExercises(state) {
  return filteredExercises(state, {
    query: exerciseQuery,
    ...exerciseFilters,
  });
}

function renderExerciseRows(state) {
  const target = document.querySelector("#exerciseList");
  if (!target) return;
  const exercises = currentFilteredExercises(state);
  const countLabel = `${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"}`;
  document.querySelector("#libraryAppCount").textContent = String(exercises.length);
  document.querySelector("#exerciseResultCount").textContent = countLabel;
  target.innerHTML = libraryRowsMarkup(exercises);
}

function openExerciseFilter() {
  exerciseFilterFocusReturn = document.activeElement;
  exerciseFilterDraft = structuredClone(exerciseFilters);
  renderExerciseFilterDraft();
  document.querySelector("#exerciseFilterDialog").showModal();
}

function renderExerciseFilterDraft({ preserveScroll = false } = {}) {
  const scroll = document.querySelector("#exerciseFilterContent");
  const scrollTop = preserveScroll ? scroll.scrollTop : 0;
  scroll.innerHTML = exerciseFilterContentMarkup(exerciseFilterDraft);
  scroll.scrollTop = scrollTop;
  const count = filteredExercises(store.getState(), {
    query: exerciseQuery,
    ...exerciseFilterDraft,
  }).length;
  document.querySelector("#applyExerciseFilterButton").textContent = `Show ${count} ${count === 1 ? "exercise" : "exercises"}`;
}

function clearLibraryFilters() {
  exerciseQuery = "";
  exerciseFilters = createLibraryFilters();
  renderExercises(store.getState());
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
  const targetBlockIndex = [...drag.list.children].indexOf(drag.placeholder);
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
  const sourceBlockIndex = routine?.entries
    .filter((item) => item.blockId === entry?.blockId)
    .findIndex((item) => item.id === drag.entryId) ?? -1;
  if (!routine || !entry || sourceBlockIndex < 0 || sourceBlockIndex === targetBlockIndex) return;
  const result = store.replace(reorderRoutineEntryWithinBlock(state, routine.id, drag.entryId, targetBlockIndex));
  saveResult(result, "Exercise moved.");
  render();
}

function setExerciseSelectOptions(selector, options, emptyLabel, value = "", required = false) {
  const select = document.querySelector(selector);
  select.innerHTML = `<option value="" ${required ? "disabled" : ""}>${escapeHtml(emptyLabel)}</option>${options.map((option) => (
    `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`
  )).join("")}`;
  select.value = value;
}

function exerciseEditorSelectionSummary(values, emptyLabel) {
  return values.length ? values.map(classificationLabel).join(" · ") : emptyLabel;
}

function updateExerciseEditorSummaries() {
  document.querySelector("#secondaryTargetsSummary").textContent = exerciseEditorSelectionSummary(
    exerciseEditorSelections.secondaryTargets,
    "None selected",
  );
  document.querySelector("#exerciseEquipmentSummary").textContent = exerciseEditorSelectionSummary(
    exerciseEditorSelections.equipment,
    "Choose at least one",
  );
  document.querySelector("#exerciseEmphasesSummary").textContent = exerciseEditorSelectionSummary(
    exerciseEditorSelections.emphases,
    "Not classified",
  );
  const optionalCount = [
    document.querySelector("#exerciseStyle").value,
    document.querySelector("#exerciseLaterality").value,
    document.querySelector("#exerciseSupport").value,
    document.querySelector("#exerciseChallenge").value,
    ...exerciseEditorSelections.emphases,
  ].filter(Boolean).length;
  document.querySelector("#optionalClassificationSummary").textContent = optionalCount
    ? `${optionalCount} classified`
    : "Style · side · support · emphasis · challenge";
}

function showExerciseEditorError(message, target) {
  const error = document.querySelector("#exerciseFormError");
  error.textContent = message;
  error.scrollIntoView({ block: "nearest" });
  target?.scrollIntoView?.({ block: "center" });
  target?.focus?.({ preventScroll: true });
}

function openExerciseEditor(exerciseId = "", duplicate = false, focusReturn = null) {
  const state = store.getState();
  const source = exerciseId ? exerciseById(state, exerciseId) : null;
  const editing = source && !duplicate;
  exerciseEditorMode = editing ? "edit" : duplicate ? "duplicate" : "add";
  exerciseEditorSourceId = source?.id || "";
  exerciseEditorReturnId = source?.id || "";
  exerciseEditorFocusReturn = focusReturn || document.activeElement;
  document.querySelector("#exerciseDialogTitle").textContent = editing ? "Edit exercise" : duplicate ? "Duplicate exercise" : "Add exercise";
  document.querySelector("#exerciseId").value = editing ? source.id : "";
  document.querySelector("#exerciseName").value = source ? `${source.name}${duplicate ? " copy" : ""}` : "";
  document.querySelector("#exerciseAliases").value = editing ? (source.aliases || []).join("\n") : "";
  document.querySelector("#exercisePrescription").value = source?.defaultPrescription || "";
  document.querySelector("#exerciseVideo").value = source?.videoId || "";
  document.querySelector("#exerciseInstructions").value = source?.instructions || "";
  document.querySelector("#exerciseFormError").textContent = "";
  document.querySelector("#exerciseOptionalClassification").open = false;
  document.querySelector("#exerciseSecondaryActions").hidden = !editing;
  document.querySelector("#deleteExerciseButton").hidden = !editing;
  document.querySelector("#duplicateExerciseButton").hidden = !editing;
  pendingRelatedExercises = (source?.relatedExercises || []).map((related) => ({ ...related }));
  updateAlternativesCount();
  setExerciseSelectOptions("#exercisePrimaryTarget1", EXERCISE_TARGETS, "Choose dominant target", source?.primaryTargets?.[0] || "", true);
  setExerciseSelectOptions("#exercisePrimaryTarget2", EXERCISE_TARGETS, "No second primary target", source?.primaryTargets?.[1] || "");
  setExerciseSelectOptions("#exerciseMovement", MOVEMENT_PATTERNS, "Choose movement", source?.movementPattern || "", true);
  setExerciseSelectOptions("#exercisePurpose", EXERCISE_PURPOSES, "Choose purpose", source?.purpose || "", true);
  setExerciseSelectOptions("#exerciseStyle", EXERCISE_STYLES, "Not classified", source?.style || "");
  setExerciseSelectOptions("#exerciseLaterality", EXERCISE_LATERALITIES, "Not classified", source?.laterality || "");
  setExerciseSelectOptions("#exerciseSupport", EXERCISE_SUPPORTS, "Not classified", source?.support || "");
  setExerciseSelectOptions("#exerciseChallenge", EXERCISE_CHALLENGES, "Not classified", source?.typicalChallenge || "");
  exerciseEditorSelections = {
    secondaryTargets: [...(source?.secondaryTargets || [])],
    equipment: [...(source?.equipment || [])],
    emphases: [...(source?.emphases || [])],
  };
  syncExerciseTargetOptions();
  updateExerciseEditorSummaries();
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
  exerciseEditorSelections.secondaryTargets = exerciseEditorSelections.secondaryTargets.filter((target) => !selected.has(target));
  updateExerciseEditorSummaries();
}

function classificationPickerConfig(kind) {
  if (kind === "secondaryTargets") {
    return {
      title: "Secondary involvement",
      hint: "Choose any targets involved beyond the ordered primary targets.",
      options: EXERCISE_TARGETS,
      excluded: [
        document.querySelector("#exercisePrimaryTarget1").value,
        document.querySelector("#exercisePrimaryTarget2").value,
      ].filter(Boolean),
    };
  }
  if (kind === "equipment") {
    return {
      title: "Equipment",
      hint: "Choose every item normally needed for this exercise.",
      options: EXERCISE_EQUIPMENT,
      excluded: [],
    };
  }
  if (kind === "emphases") {
    return {
      title: "Emphasis",
      hint: "Optional. Leave clear when no stable emphasis applies.",
      options: EXERCISE_EMPHASES,
      excluded: [],
    };
  }
  return null;
}

function renderClassificationPicker() {
  const config = classificationPickerConfig(classificationPickerKind);
  if (!config) return;
  document.querySelector("#classificationPickerOptions").innerHTML = classificationOptionPickerMarkup({
    options: config.options,
    selected: classificationPickerDraft,
    excluded: config.excluded,
  });
}

function openClassificationPicker(kind, focusReturn) {
  const config = classificationPickerConfig(kind);
  if (!config) return;
  classificationPickerKind = kind;
  classificationPickerDraft = [...exerciseEditorSelections[kind]];
  classificationPickerFocusReturn = focusReturn || document.activeElement;
  document.querySelector("#classificationPickerTitle").textContent = config.title;
  document.querySelector("#classificationPickerHint").textContent = config.hint;
  renderClassificationPicker();
  const dialog = document.querySelector("#classificationPickerDialog");
  dialog.dataset.focusVersion = String(++exerciseNestedDialogVersion);
  dialog.showModal();
  requestAnimationFrame(() => (
    document.querySelector("#classificationPickerOptions button:not(:disabled)")
    || document.querySelector("#saveClassificationPickerButton")
  )?.focus());
}

function updateAlternativesCount() {
  const count = pendingRelatedExercises.length;
  document.querySelector("#alternativesCount").textContent = count ? `${count} linked` : "None linked";
}

function openAlternativesPicker() {
  alternativesFocusReturn = document.querySelector("#chooseAlternativesButton");
  alternativesQuery = "";
  relatedDraftExercises = pendingRelatedExercises.map((related) => ({ ...related }));
  document.querySelector("#alternativesSearch").value = "";
  renderAlternativesList();
  const dialog = document.querySelector("#alternativesDialog");
  dialog.dataset.focusVersion = String(++exerciseNestedDialogVersion);
  dialog.showModal();
  requestAnimationFrame(() => document.querySelector("#alternativesSearch").focus());
}

function renderAlternativesList() {
  const state = store.getState();
  const editingId = document.querySelector("#exerciseId").value;
  const exerciseIds = new Set(state.exercises.map((exercise) => exercise.id));
  const seen = new Set();
  relatedDraftExercises = relatedDraftExercises.filter((related) => {
    if (
      related.exerciseId === editingId
      || !exerciseIds.has(related.exerciseId)
      || !["easier", "similar", "harder"].includes(related.relation)
      || seen.has(related.exerciseId)
    ) return false;
    seen.add(related.exerciseId);
    return true;
  });
  const linkedExercises = relatedDraftExercises.map((related) => ({
    ...related,
    exercise: exerciseById(state, related.exerciseId),
  }));
  const linkedIds = new Set(relatedDraftExercises.map((related) => related.exerciseId));
  const needle = normalizedExerciseSearch(alternativesQuery);
  const availableExercises = state.exercises
    .filter((exercise) => exercise.id !== editingId && !linkedIds.has(exercise.id))
    .filter((exercise) => !needle || normalizedExerciseSearch([
      exercise.name,
      ...exerciseSearchTerms(exercise),
    ].join(" ")).includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name));
  document.querySelector("#alternativesList").innerHTML = relationshipEditorMarkup({
    linkedExercises,
    availableExercises,
    query: alternativesQuery,
  });
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
  const aliases = document.querySelector("#exerciseAliases").value
    .split(/\r?\n/)
    .map((alias) => alias.trim())
    .filter(Boolean);
  const primaryTargets = [
    document.querySelector("#exercisePrimaryTarget1").value,
    document.querySelector("#exercisePrimaryTarget2").value,
  ].filter(Boolean);
  const movementPattern = document.querySelector("#exerciseMovement").value;
  const purpose = document.querySelector("#exercisePurpose").value;
  const equipment = [...exerciseEditorSelections.equipment];
  const videoId = youtubeId(document.querySelector("#exerciseVideo").value);
  const nameField = document.querySelector("#exerciseName");
  const aliasesField = document.querySelector("#exerciseAliases");
  if (!name) {
    showExerciseEditorError("Enter an exercise name.", nameField);
    return false;
  }
  const identities = [name, ...aliases];
  const normalizedIdentities = identities.map(normalizedExerciseSearch);
  if (normalizedIdentities.some((identity) => !identity) || new Set(normalizedIdentities).size !== normalizedIdentities.length) {
    showExerciseEditorError("The name and aliases must each be unique.", aliases.length ? aliasesField : nameField);
    return false;
  }
  const otherIdentities = new Set(state.exercises
    .filter((exercise) => exercise.id !== id)
    .flatMap((exercise) => [exercise.name, ...(exercise.aliases || [])])
    .map(normalizedExerciseSearch));
  const conflictingIndex = normalizedIdentities.findIndex((identity) => otherIdentities.has(identity));
  if (conflictingIndex >= 0) {
    showExerciseEditorError(
      conflictingIndex ? "An alias is already used by another exercise." : "An exercise with this name already exists.",
      conflictingIndex ? aliasesField : nameField,
    );
    return false;
  }
  if (!primaryTargets.length || primaryTargets.some((target) => !EXERCISE_TARGETS.some((option) => option.id === target))) {
    showExerciseEditorError("Choose a dominant target.", document.querySelector("#exercisePrimaryTarget1"));
    return false;
  }
  if (!MOVEMENT_PATTERNS.some((option) => option.id === movementPattern)) {
    showExerciseEditorError("Choose a movement.", document.querySelector("#exerciseMovement"));
    return false;
  }
  if (!equipment.length || equipment.some((value) => !EXERCISE_EQUIPMENT.some((option) => option.id === value))) {
    showExerciseEditorError("Choose at least one equipment option.", document.querySelector("#chooseEquipmentButton"));
    return false;
  }
  if (!EXERCISE_PURPOSES.some((option) => option.id === purpose)) {
    showExerciseEditorError("Choose a purpose.", document.querySelector("#exercisePurpose"));
    return false;
  }
  if (videoId === null) {
    showExerciseEditorError("Paste a YouTube link or its 11-character video ID.", document.querySelector("#exerciseVideo"));
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
    aliases,
    primaryTargets,
    secondaryTargets: exerciseEditorSelections.secondaryTargets.filter((target) => !primaryTargets.includes(target)),
    movementPattern,
    equipment,
    purpose,
    style: document.querySelector("#exerciseStyle").value,
    laterality: document.querySelector("#exerciseLaterality").value,
    support: document.querySelector("#exerciseSupport").value,
    emphases: [...exerciseEditorSelections.emphases],
    typicalChallenge: document.querySelector("#exerciseChallenge").value,
    defaultPrescription: document.querySelector("#exercisePrescription").value.trim(),
    videoId,
    instructions: document.querySelector("#exerciseInstructions").value.trim(),
  };
  const relatedExercises = pendingRelatedExercises.filter((related) => (
    related.exerciseId !== exerciseId
    && state.exercises.some((item) => item.id === related.exerciseId)
  ));
  const next = upsertExerciseInState(state, exercise, relatedExercises);
  if (next === state) {
    showExerciseEditorError("Exercise details could not be saved.", document.querySelector("#exerciseFormError"));
    return false;
  }
  const result = store.replace(next);
  const successMessage = exerciseEditorMode === "edit" ? "Exercise updated." : exerciseEditorMode === "duplicate" ? "Exercise duplicated." : "Exercise added.";
  if (!saveResult(result, successMessage)) return false;
  exerciseEditorReturnId = exerciseId;
  document.querySelector("#exerciseDialog").close();
  refreshOpenEntryChoices();
  render();
  return true;
}

function exerciseDeletionMessage(exercise, impact) {
  const routineCleanup = impact.programmedUses
    ? `Routine cleanup: ${impact.alternativeChoicesRemoved} alternative ${impact.alternativeChoicesRemoved === 1 ? "choice" : "choices"} removed; ${impact.preferredChoicesPromoted} next ${impact.preferredChoicesPromoted === 1 ? "choice" : "choices"} promoted; ${impact.slotsDeleted} ${impact.slotsDeleted === 1 ? "slot" : "slots"} deleted with any saved checks.`
    : "No routine choices, slots, or saved checks will change.";
  return [
    `Delete “${exercise.name}”?`,
    `Programmed use: ${impact.programmedUses} ${impact.programmedUses === 1 ? "slot" : "slots"}.`,
    routineCleanup,
    `Related links removed: ${impact.relatedLinksRemoved}. This cannot be undone.`,
  ].join(" ");
}

async function deleteExercise(id) {
  const state = store.getState();
  const exercise = exerciseById(state, id);
  const impact = exerciseDeletionImpact(state, id);
  if (!exercise || !impact) return;
  const message = exerciseDeletionMessage(exercise, impact);
  const confirmed = await confirmAction("Delete exercise", message, "Delete exercise", "Keep exercise", "exercise-delete");
  if (!confirmed) return;
  const result = store.replace(removeExerciseFromState(state, id));
  if (saveResult(result, "Exercise deleted.")) {
    document.querySelector("#exerciseDialog").close();
    refreshOpenEntryChoices();
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
  document.querySelector("#programNote").value = program?.note || duplicateSource?.note || "";
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
  const note = document.querySelector("#programNote").value;
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
    next = updateProgramInState(state, id, { name, note });
  } else if (document.querySelector("#programStartMode").value === "duplicate") {
    const sourceId = document.querySelector("#programDuplicateSource").value;
    if (!state.programs.some((program) => program.id === sourceId)) {
      error.textContent = "Choose a program to duplicate.";
      return false;
    }
    next = duplicateProgramInState(state, sourceId, name);
    next = updateProgramInState(next, next.settings.activeProgramId, { name, note });
  } else {
    next = createProgramInState(state, name);
    next = updateProgramInState(next, next.settings.activeProgramId, { name, note });
  }

  const result = store.replace(next);
  const successMessage = id ? "Program updated." : "Program created.";
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
  document.querySelector("#routineNote").value = routine?.note || "";
  routineBlockDraft = structuredClone(routine?.blocks || [{ id: makeId("block"), name: "" }]);
  setRoutineOption("group", routine?.group || "gym");
  setRoutineOption("status", routine?.status || "required");
  document.querySelector("#routineFormError").textContent = "";
  document.querySelector("#routineEditActions").hidden = !routine;
  updateRoutineMoveButtons(routine?.id || "");
  renderRoutineBlocksEditor();
  dialog.classList.remove("compact-dialog");
  dialog.showModal();
  requestAnimationFrame(() => document.querySelector("#routineName").focus());
}

function renderRoutineBlocksEditor() {
  const state = store.getState();
  const routine = state.routines.find((item) => item.id === document.querySelector("#routineId").value);
  document.querySelector("#routineBlocksList").innerHTML = routineBlocksEditorMarkup(routineBlockDraft, routine?.entries || []);
}

function routineBlockEntryCount(blockId) {
  const routine = store.getState().routines.find((item) => item.id === document.querySelector("#routineId").value);
  return routine?.entries.filter((entry) => entry.blockId === blockId).length || 0;
}

function openRoutineBlockEditor(blockId, focusReturn = document.activeElement) {
  const block = routineBlockDraft.find((item) => item.id === blockId);
  if (!block) return;
  routineBlockDialogFocusReturn = focusReturn instanceof HTMLElement ? focusReturn : null;
  document.querySelector("#routineBlockId").value = block.id;
  document.querySelector("#routineBlockName").value = block.name;
  document.querySelector("#routineBlockDialogSubtitle").textContent = `${routineBlockEntryCount(block.id)} ${routineBlockEntryCount(block.id) === 1 ? "entry" : "entries"}`;
  document.querySelector("#routineBlockFormError").textContent = "";
  updateRoutineBlockMoveButtons();
  const dialog = document.querySelector("#routineBlockDialog");
  dialog.showModal();
  requestAnimationFrame(() => document.querySelector("#routineBlockName").focus());
}

function syncRoutineBlockNameDraft() {
  const id = document.querySelector("#routineBlockId").value;
  const block = routineBlockDraft.find((item) => item.id === id);
  if (block) block.name = document.querySelector("#routineBlockName").value;
}

function updateRoutineBlockMoveButtons() {
  const id = document.querySelector("#routineBlockId").value;
  const index = routineBlockDraft.findIndex((block) => block.id === id);
  document.querySelector("#moveBlockEarlierButton").disabled = index <= 0;
  document.querySelector("#moveBlockLaterButton").disabled = index < 0 || index === routineBlockDraft.length - 1;
  document.querySelector("#deleteBlockButton").disabled = routineBlockDraft.length <= 1 || routineBlockEntryCount(id) > 0;
}

function moveRoutineBlockDraft(direction) {
  syncRoutineBlockNameDraft();
  const id = document.querySelector("#routineBlockId").value;
  const index = routineBlockDraft.findIndex((block) => block.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= routineBlockDraft.length) return;
  const [block] = routineBlockDraft.splice(index, 1);
  routineBlockDraft.splice(target, 0, block);
  renderRoutineBlocksEditor();
  updateRoutineBlockMoveButtons();
}

function saveRoutineBlockDraft() {
  syncRoutineBlockNameDraft();
  renderRoutineBlocksEditor();
  document.querySelector("#routineBlockDialog").close();
}

function deleteRoutineBlockDraft() {
  const id = document.querySelector("#routineBlockId").value;
  if (routineBlockDraft.length <= 1 || routineBlockEntryCount(id) > 0) return;
  routineBlockDraft = routineBlockDraft.filter((block) => block.id !== id);
  renderRoutineBlocksEditor();
  document.querySelector("#routineBlockDialog").close();
}

function addRoutineBlockDraft() {
  const block = { id: makeId("block"), name: "" };
  routineBlockDraft.push(block);
  renderRoutineBlocksEditor();
  const row = document.querySelector(`#routineBlocksList .routine-block-row[data-block-id="${CSS.escape(block.id)}"]`);
  openRoutineBlockEditor(block.id, row);
}

function routineBlockDragPoint(event) {
  if (event.type.startsWith("touch")) {
    const touches = [...Array.from(event.touches), ...Array.from(event.changedTouches)];
    return touches.find((touch) => touch.identifier === routineBlockDrag?.pointerId) || null;
  }
  return { clientX: event.clientX, clientY: event.clientY };
}

function activateRoutineBlockDrag() {
  if (!routineBlockDrag) return;
  if (!routineBlockDrag.row.isConnected || !routineBlockDrag.list || !document.querySelector("#routineDialog").open) {
    routineBlockDrag = null;
    return;
  }
  const bounds = routineBlockDrag.row.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.className = "routine-block-placeholder";
  placeholder.style.height = `${bounds.height}px`;
  routineBlockDrag.row.before(placeholder);
  routineBlockDrag.placeholder = placeholder;
  routineBlockDrag.active = true;
  window.getSelection()?.removeAllRanges();
  routineBlockDrag.row.classList.add("is-dragging");
  routineBlockDrag.row.style.left = `${bounds.left}px`;
  routineBlockDrag.row.style.top = `${bounds.top}px`;
  routineBlockDrag.row.style.width = `${bounds.width}px`;
  routineBlockDrag.row.style.height = `${bounds.height}px`;
  document.body.append(routineBlockDrag.row);
  document.body.classList.add("routine-block-drag-active");
}

function startRoutineBlockDrag(row, clientX, clientY, pointerId) {
  if (routineBlockDrag || !row) return;
  routineBlockDrag = {
    row,
    list: row.closest(".routine-block-list"),
    blockId: row.dataset.blockId,
    pointerId,
    startX: clientX,
    startY: clientY,
    active: false,
    placeholder: null,
  };
  routineBlockDrag.timer = window.setTimeout(activateRoutineBlockDrag, BLOCK_HOLD_DELAY);
}

function moveRoutineBlockDrag(event) {
  if (!routineBlockDrag) return;
  const point = routineBlockDragPoint(event);
  if (!point) return;
  const distance = Math.hypot(point.clientX - routineBlockDrag.startX, point.clientY - routineBlockDrag.startY);
  if (!routineBlockDrag.active && distance > BLOCK_HOLD_TOLERANCE) {
    clearTimeout(routineBlockDrag.timer);
    routineBlockDrag = null;
    return;
  }
  if (!routineBlockDrag.active) return;
  event.preventDefault();
  routineBlockDrag.row.style.transform = `translate3d(0, ${point.clientY - routineBlockDrag.startY}px, 0) scale(1.015)`;
  const rows = [...routineBlockDrag.list.querySelectorAll(".routine-block-row")];
  const before = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return point.clientY < rect.top + rect.height / 2;
  });
  if (before) routineBlockDrag.list.insertBefore(routineBlockDrag.placeholder, before);
  else routineBlockDrag.list.append(routineBlockDrag.placeholder);
  const scroll = document.querySelector(".routine-sheet-scroll");
  const bounds = scroll.getBoundingClientRect();
  if (point.clientY < bounds.top + 48) scroll.scrollTop -= 10;
  else if (point.clientY > bounds.bottom - 48) scroll.scrollTop += 10;
}

function finishRoutineBlockDrag(savePosition) {
  if (!routineBlockDrag) return;
  clearTimeout(routineBlockDrag.timer);
  const drag = routineBlockDrag;
  routineBlockDrag = null;
  if (!drag.active) return;
  const targetIndex = [...drag.list.children].indexOf(drag.placeholder);
  drag.placeholder.replaceWith(drag.row);
  drag.row.classList.remove("is-dragging");
  drag.row.removeAttribute("style");
  document.body.classList.remove("routine-block-drag-active");
  suppressRoutineBlockClickUntil = performance.now() + 600;
  if (savePosition) {
    const sourceIndex = routineBlockDraft.findIndex((block) => block.id === drag.blockId);
    if (sourceIndex >= 0 && targetIndex >= 0 && targetIndex < routineBlockDraft.length) {
      const [block] = routineBlockDraft.splice(sourceIndex, 1);
      routineBlockDraft.splice(targetIndex, 0, block);
    }
  }
  renderRoutineBlocksEditor();
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
        note: document.querySelector("#routineNote").value,
        blocks: routineBlockDraft,
      });
    }
    const withRoutine = addRoutineToProgram(next, next.settings.activeProgramId, {
      id: routineId,
      name,
      group: document.querySelector("#routineGroup").value,
      status: document.querySelector("#routineStatus").value,
      note: document.querySelector("#routineNote").value,
      blocks: routineBlockDraft,
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
  if (!entryChoiceDraft.length) {
    document.querySelector("#entryFormError").textContent = "Add at least one exercise choice.";
    document.querySelector("#entryFormError").scrollIntoView({ block: "nearest" });
    return false;
  }
  if (entryChoiceDraft.some((choice) => !choice.prescription.trim())) {
    document.querySelector("#entryFormError").textContent = "Add a prescription to every exercise choice.";
    document.querySelector("#entryFormError").scrollIntoView({ block: "nearest" });
    return false;
  }
  const state = store.getState();
  const activeId = state.settings.activeRoutineId;
  const result = store.replace(moveRoutineEntry(state, activeId, id, direction, {
    choices: entryChoiceDraft,
    role: document.querySelector("#entryRole").value,
    blockId: document.querySelector("#entryBlock").value,
    note: document.querySelector("#entryNote").value,
  }));
  if (!saveResult(result, "Exercise moved.")) return false;
  document.querySelector("#entryDialog").close();
  render();
  return true;
}

async function removeEntry(id) {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  const entry = routine?.entries.find((item) => item.id === id);
  if (!entry) return;
  const title = entryPresentation(entry, state, exerciseById).title;
  const confirmed = await confirmAction(
    `Remove ${title}?`,
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

function renderEntryChoiceDraft() {
  const state = store.getState();
  document.querySelector("#entryChoicesList").innerHTML = entryChoicesEditorMarkup(entryChoiceDraft, state, exerciseById);
  const title = entryPresentation({ choices: entryChoiceDraft }, state, exerciseById).title;
  document.querySelector("#entryExerciseName").textContent = title;
}

function openEntryChoiceEditor(index, focusReturn = document.activeElement) {
  const choice = entryChoiceDraft[index];
  const exercise = choice ? exerciseById(store.getState(), choice.exerciseId) : null;
  if (!choice || !exercise) return;
  entryChoiceEditIndex = index;
  entryChoiceDialogFocusReturn = focusReturn instanceof HTMLElement ? focusReturn : null;
  document.querySelector("#entryChoiceIndex").value = String(index);
  document.querySelector("#entryChoiceDialogTitle").textContent = exercise.name;
  document.querySelector("#entryChoiceDialogSubtitle").textContent = `${index + 1} of ${entryChoiceDraft.length}${index === 0 ? " · Preferred" : ""}`;
  document.querySelector("#entryChoicePrescription").value = choice.prescription;
  document.querySelector("#entryChoiceFormError").textContent = "";
  updateEntryChoiceButtons();
  document.querySelector("#entryChoiceDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#entryChoicePrescription").focus());
}

function syncEntryChoicePrescription() {
  if (!entryChoiceDraft[entryChoiceEditIndex]) return false;
  const input = document.querySelector("#entryChoicePrescription");
  const prescription = input.value.trim();
  if (!prescription) {
    document.querySelector("#entryChoiceFormError").textContent = "Enter a prescription for this choice.";
    input.focus();
    return false;
  }
  entryChoiceDraft[entryChoiceEditIndex].prescription = prescription;
  document.querySelector("#entryChoiceFormError").textContent = "";
  return true;
}

function updateEntryChoiceButtons() {
  const index = entryChoiceEditIndex;
  document.querySelector("#preferEntryChoiceButton").disabled = index <= 0;
  document.querySelector("#moveEntryChoiceEarlierButton").disabled = index <= 0;
  document.querySelector("#moveEntryChoiceLaterButton").disabled = index < 0 || index >= entryChoiceDraft.length - 1;
}

function moveEntryChoiceDraft(targetIndex) {
  if (!syncEntryChoicePrescription()) return;
  const sourceIndex = entryChoiceEditIndex;
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= entryChoiceDraft.length || sourceIndex === targetIndex) return;
  const [choice] = entryChoiceDraft.splice(sourceIndex, 1);
  entryChoiceDraft.splice(targetIndex, 0, choice);
  entryChoiceEditIndex = targetIndex;
  document.querySelector("#entryChoiceIndex").value = String(targetIndex);
  document.querySelector("#entryChoiceDialogSubtitle").textContent = `${targetIndex + 1} of ${entryChoiceDraft.length}${targetIndex === 0 ? " · Preferred" : ""}`;
  renderEntryChoiceDraft();
  updateEntryChoiceButtons();
}

function preferEntryChoice(index) {
  if (index <= 0 || index >= entryChoiceDraft.length) return;
  const [choice] = entryChoiceDraft.splice(index, 1);
  entryChoiceDraft.unshift(choice);
  renderEntryChoiceDraft();
  requestAnimationFrame(() => document.querySelector('#entryChoicesList [data-action="edit-entry-choice"][data-index="0"]')?.focus());
}

function removeEntryChoice(index = entryChoiceEditIndex) {
  if (index < 0 || index >= entryChoiceDraft.length) return;
  entryChoiceDraft.splice(index, 1);
  renderEntryChoiceDraft();
  if (document.querySelector("#entryChoiceDialog").open) document.querySelector("#entryChoiceDialog").close();
  requestAnimationFrame(() => document.querySelector("#addEntryChoiceButton")?.focus());
}

function saveEntryChoiceDraft() {
  if (!syncEntryChoicePrescription()) return false;
  renderEntryChoiceDraft();
  document.querySelector("#entryChoiceDialog").close();
  return true;
}

function openEntryEditor(id) {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  const entry = routine?.entries.find((item) => item.id === id);
  if (!entry) return;
  entryDialogFocusReturn = document.activeElement;
  entryChoiceDraft = structuredClone(entry.choices);
  document.querySelector("#entryId").value = entry.id;
  document.querySelector("#entryRoutineContext").textContent = `${routine.name} entry · slot ${routineEntryDisplayIndex(routine, entry.id)}`;
  document.querySelector("#entryBlock").innerHTML = routine.blocks.map((block) => `<option value="${escapeHtml(block.id)}">${escapeHtml(block.name.trim() || "Untitled block")}</option>`).join("");
  document.querySelector("#entryBlock").value = entry.blockId;
  document.querySelector("#entryNote").value = entry.note;
  document.querySelector("#entryFormNote").textContent = `Choices, role, block, and note change only the ${routine.name} entry. The master exercises stay unchanged.`;
  document.querySelector("#removeEntryButton").firstChild.textContent = `Remove from ${routine.name} `;
  setEntryRole(entry.role);
  renderEntryChoiceDraft();
  document.querySelector("#entryFormError").textContent = "";
  document.querySelector("#entryDialog").showModal();
  requestAnimationFrame(() => document.querySelector('#entryChoicesList [data-action="edit-entry-choice"], #addEntryChoiceButton')?.focus());
}

function setEntryRole(role) {
  document.querySelector("#entryRole").value = role;
  document.querySelectorAll("#entryRoleOptions [data-entry-role]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.entryRole === role));
  });
  updateEntryMoveButtons();
}

function updateEntryMoveButtons() {
  const routine = getActiveRoutine(store.getState());
  const entryId = document.querySelector("#entryId").value;
  const blockId = document.querySelector("#entryBlock").value;
  if (!routine || !blockId) return;
  const blockEntries = routine.entries.filter((item) => (
    item.id === entryId ? true : item.blockId === blockId
  ));
  const blockIndex = blockEntries.findIndex((item) => item.id === entryId);
  document.querySelector("#moveEntryEarlierButton").disabled = blockIndex <= 0;
  document.querySelector("#moveEntryLaterButton").disabled = blockIndex < 0 || blockIndex >= blockEntries.length - 1;
}

function saveEntry() {
  const id = document.querySelector("#entryId").value;
  const role = document.querySelector("#entryRole").value;
  const blockId = document.querySelector("#entryBlock").value;
  const note = document.querySelector("#entryNote").value;
  if (!entryChoiceDraft.length) {
    document.querySelector("#entryFormError").textContent = "Add at least one exercise choice.";
    document.querySelector("#entryFormError").scrollIntoView({ block: "nearest" });
    return false;
  }
  if (entryChoiceDraft.some((choice) => !choice.prescription.trim())) {
    document.querySelector("#entryFormError").textContent = "Add a prescription to every exercise choice.";
    document.querySelector("#entryFormError").scrollIntoView({ block: "nearest" });
    return false;
  }
  const activeId = store.getState().settings.activeRoutineId;
  const result = store.replace(updateRoutineEntryInState(store.getState(), activeId, id, {
    choices: entryChoiceDraft,
    role,
    blockId,
    note,
  }));
  if (!saveResult(result, "Routine entry updated.")) return false;
  document.querySelector("#entryDialog").close();
  render();
  return true;
}

function openPicker(blockId = "", mode = "entry") {
  const routine = getActiveRoutine(store.getState());
  if (!routine) return;
  const block = routine.blocks.find((item) => item.id === blockId) || routine.blocks[0];
  if (!block) return;
  pickerDialogFocusReturn = document.activeElement;
  pickerMode = mode;
  pickerBlockId = block.id;
  pickerQuery = "";
  document.querySelector("#pickerSearch").value = "";
  document.querySelector("#pickerRoutineContext").textContent = mode === "choice"
    ? `${routine.name} entry · add choice from Library`
    : `${routine.name} · ${block.name.trim() || "Untitled block"} · Library`;
  document.querySelector("#pickerFormError").textContent = "";
  renderPickerList();
  document.querySelector("#pickerDialog").showModal();
  requestAnimationFrame(() => document.querySelector("#pickerSearch").focus());
}

function renderPickerList() {
  const state = store.getState();
  const routine = getActiveRoutine(state);
  const existing = new Set(pickerMode === "choice"
    ? entryChoiceDraft.map((choice) => choice.exerciseId)
    : routine?.entries.flatMap((entry) => entry.choices.map((choice) => choice.exerciseId)));
  const needle = pickerQuery.trim().toLowerCase();
  const exercises = state.exercises
    .filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle) || exerciseSearchTerms(exercise).some((term) => term.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name));
  document.querySelector("#pickerResultCount").textContent = `${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"}`;
  document.querySelector("#pickerList").innerHTML = pickerListMarkup(exercises, existing, { mode: pickerMode });
}

function pickExercise(exerciseId) {
  const state = store.getState();
  const activeId = state.settings.activeRoutineId;
  const exercise = exerciseById(state, exerciseId);
  if (!exercise) return;
  if (pickerMode === "choice") {
    if (entryChoiceDraft.some((choice) => choice.exerciseId === exerciseId)) return;
    entryChoiceDraft.push({ exerciseId, prescription: exercise.defaultPrescription || "" });
    renderEntryChoiceDraft();
    document.querySelector("#pickerDialog").close();
    return;
  }
  if (!exercise.defaultPrescription.trim()) {
    document.querySelector("#pickerFormError").textContent = "Add a default prescription to this Library exercise before creating a new routine slot.";
    return;
  }
  const entry = {
    id: makeId("entry"),
    choices: [{ exerciseId, prescription: exercise.defaultPrescription || "" }],
    blockId: pickerBlockId,
    note: "",
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
  if (action === "new-exercise") openExerciseEditor("", false, button);
  else if (action === "view-exercise") openExerciseDetails(id);
  else if (action === "open-exercise-filter") openExerciseFilter();
  else if (action === "select-library-quick-group") {
    exerciseFilters.quickGroup = id || "all";
    exerciseFilters.targets = [];
    renderExercises(store.getState());
    requestAnimationFrame(() => main.querySelector(`[data-action="select-library-quick-group"][data-id="${CSS.escape(exerciseFilters.quickGroup)}"]`)?.focus());
  }
  else if (action === "toggle-library-target-scope") {
    exerciseFilters.targetScope = exerciseFilters.targetScope === "primary" ? "all" : "primary";
    renderExercises(store.getState());
    requestAnimationFrame(() => main.querySelector('[data-action="toggle-library-target-scope"]')?.focus());
  }
  else if (action === "clear-library-filters") {
    clearLibraryFilters();
    requestAnimationFrame(() => document.querySelector("#exerciseSearch")?.focus());
  }
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
  else if (action === "open-picker") openPicker(button.dataset.blockId || "");
  else if (action === "toggle-entry-check") toggleEntryCheck(button.dataset.routineId, id);
  else if (action === "open-entry-choices") openEntryChoices(button.dataset.routineId, button.dataset.entryId, button);
  else if (action === "open-workout-exercise") {
    const state = store.getState();
    const routine = state.routines.find((item) => item.id === button.dataset.routineId);
    const entry = routine?.entries.find((item) => item.id === button.dataset.entryId);
    openExerciseDetails(id, button.dataset.prescription || "", {
      name: routine?.name || "",
      note: entry?.note || "",
    });
  }
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
  if (routineBlockDrag?.active && event.target.closest(".routine-block-row")) event.preventDefault();
});

const routineBlocksList = document.querySelector("#routineBlocksList");
routineBlocksList.addEventListener("click", (event) => {
  if (performance.now() < suppressRoutineBlockClickUntil) return;
  const button = event.target.closest('[data-action="edit-routine-block"]');
  if (button) openRoutineBlockEditor(button.dataset.id, button);
});
routineBlocksList.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  const row = event.target.closest(".routine-block-row");
  if (!row) return;
  const touch = event.touches[0];
  startRoutineBlockDrag(row, touch.clientX, touch.clientY, touch.identifier);
}, { passive: true });
routineBlocksList.addEventListener("selectstart", (event) => {
  if (event.target.closest(".routine-block-row")) event.preventDefault();
});
routineBlocksList.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;
  const row = event.target.closest(".routine-block-row");
  if (row) startRoutineBlockDrag(row, event.clientX, event.clientY, event.pointerId);
});
window.addEventListener("touchmove", moveRoutineBlockDrag, { passive: false });
window.addEventListener("touchend", (event) => {
  if (!routineBlockDrag || !Array.from(event.changedTouches).some((touch) => touch.identifier === routineBlockDrag.pointerId)) return;
  if (routineBlockDrag.active) event.preventDefault();
  finishRoutineBlockDrag(true);
}, { passive: false });
window.addEventListener("touchcancel", () => finishRoutineBlockDrag(false));
window.addEventListener("pointermove", (event) => {
  if (event.pointerType === "mouse" && event.pointerId === routineBlockDrag?.pointerId) moveRoutineBlockDrag(event);
});
window.addEventListener("pointerup", (event) => {
  if (event.pointerType === "mouse" && event.pointerId === routineBlockDrag?.pointerId) finishRoutineBlockDrag(true);
});
window.addEventListener("pointercancel", (event) => {
  if (event.pointerId === routineBlockDrag?.pointerId) finishRoutineBlockDrag(false);
});

document.querySelector("#entryChoicesList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action][data-index]");
  if (!button) return;
  const index = Number(button.dataset.index);
  if (!Number.isInteger(index)) return;
  if (button.dataset.action === "edit-entry-choice") openEntryChoiceEditor(index, button);
  else if (button.dataset.action === "prefer-entry-choice") preferEntryChoice(index);
  else if (button.dataset.action === "remove-entry-choice") removeEntryChoice(index);
});

document.querySelector("#entryChoicesContent").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action][data-index]");
  if (!button) return;
  const dialog = document.querySelector("#entryChoicesDialog");
  const context = choiceContext(dialog.dataset.routineId, dialog.dataset.entryId, Number(button.dataset.index));
  if (!context) return;
  if (button.dataset.action === "open-choice-reference") {
    openExerciseDetails(context.choice.exerciseId, context.choice.prescription, {
      name: context.routine.name,
      note: context.entry.note,
    });
  } else if (button.dataset.action === "open-choice-video") {
    openExerciseVideoSearch(context.choice.exerciseId);
  }
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
document.querySelector("#entryBlock").addEventListener("change", updateEntryMoveButtons);
document.querySelector("#addRoutineBlockButton").addEventListener("click", addRoutineBlockDraft);
document.querySelector("#addEntryChoiceButton").addEventListener("click", () => openPicker(document.querySelector("#entryBlock").value, "choice"));
document.querySelector("#preferEntryChoiceButton").addEventListener("click", () => moveEntryChoiceDraft(0));
document.querySelector("#moveEntryChoiceEarlierButton").addEventListener("click", () => moveEntryChoiceDraft(entryChoiceEditIndex - 1));
document.querySelector("#moveEntryChoiceLaterButton").addEventListener("click", () => moveEntryChoiceDraft(entryChoiceEditIndex + 1));
document.querySelector("#removeEntryChoiceButton").addEventListener("click", () => removeEntryChoice());

document.querySelector("#applyExerciseFilterButton").addEventListener("click", () => {
  exerciseFilters = structuredClone(exerciseFilterDraft);
  document.querySelector("#exerciseFilterDialog").close();
  renderExercises(store.getState());
});

document.querySelector("#clearExerciseFilterButton").addEventListener("click", () => {
  exerciseFilterDraft = createLibraryFilters();
  renderExerciseFilterDraft();
});

document.querySelector("#exerciseFilterContent").addEventListener("click", (event) => {
  const scope = event.target.closest("[data-filter-scope]");
  if (scope) {
    exerciseFilterDraft.targetScope = scope.dataset.filterScope;
    document.querySelectorAll("[data-filter-scope]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button === scope));
    });
  }
  const option = event.target.closest("[data-filter-group][data-filter-value]");
  if (option) {
    const { filterGroup: group, filterValue: value } = option.dataset;
    const selected = exerciseFilterDraft[group];
    if (!Array.isArray(selected)) return;
    exerciseFilterDraft[group] = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    if (group === "targets") exerciseFilterDraft.quickGroup = "all";
    option.setAttribute("aria-pressed", String(!selected.includes(value)));
  }
  if (!scope && !option) return;
  const count = filteredExercises(store.getState(), {
    query: exerciseQuery,
    ...exerciseFilterDraft,
  }).length;
  document.querySelector("#applyExerciseFilterButton").textContent = `Show ${count} ${count === 1 ? "exercise" : "exercises"}`;
});

document.querySelector("#pickerSearch").addEventListener("input", (event) => {
  pickerQuery = event.target.value;
  renderPickerList();
});

document.querySelector("#chooseAlternativesButton").addEventListener("click", openAlternativesPicker);
for (const selectId of ["exercisePrimaryTarget1", "exercisePrimaryTarget2"]) {
  document.querySelector(`#${selectId}`).addEventListener("change", syncExerciseTargetOptions);
}
for (const selectId of ["exerciseStyle", "exerciseLaterality", "exerciseSupport", "exerciseChallenge"]) {
  document.querySelector(`#${selectId}`).addEventListener("change", updateExerciseEditorSummaries);
}
document.querySelector("#exerciseForm").addEventListener("click", (event) => {
  const button = event.target.closest("[data-classification-picker]");
  if (button) openClassificationPicker(button.dataset.classificationPicker, button);
});
document.querySelector("#classificationPickerOptions").addEventListener("click", (event) => {
  const option = event.target.closest("[data-classification-value]");
  if (!option || option.disabled) return;
  const value = option.dataset.classificationValue;
  classificationPickerDraft = classificationPickerDraft.includes(value)
    ? classificationPickerDraft.filter((item) => item !== value)
    : [...classificationPickerDraft, value];
  renderClassificationPicker();
  document.querySelector(`[data-classification-value="${CSS.escape(value)}"]`)?.focus();
});
document.querySelector("#clearClassificationPickerButton").addEventListener("click", () => {
  classificationPickerDraft = [];
  renderClassificationPicker();
  document.querySelector("#clearClassificationPickerButton").focus();
});
document.querySelector("#cancelClassificationPickerButton").addEventListener("click", () => {
  document.querySelector("#classificationPickerDialog").close();
});
document.querySelector("#saveClassificationPickerButton").addEventListener("click", () => {
  const config = classificationPickerConfig(classificationPickerKind);
  if (!config) return;
  const allowed = new Set(config.options.map((option) => option.id));
  const excluded = new Set(config.excluded);
  exerciseEditorSelections[classificationPickerKind] = classificationPickerDraft.filter((value) => (
    allowed.has(value) && !excluded.has(value)
  ));
  updateExerciseEditorSummaries();
  document.querySelector("#classificationPickerDialog").close();
});
document.querySelector("#alternativesSearch").addEventListener("input", (event) => {
  alternativesQuery = event.target.value;
  renderAlternativesList();
});
document.querySelector("#alternativesList").addEventListener("click", (event) => {
  const add = event.target.closest("[data-add-related]");
  if (add && !relatedDraftExercises.some((related) => related.exerciseId === add.dataset.addRelated)) {
    relatedDraftExercises.push({ exerciseId: add.dataset.addRelated, relation: "similar" });
    renderAlternativesList();
    document.querySelector(`[data-related-relation="${CSS.escape(add.dataset.addRelated)}"]`)?.focus();
    return;
  }
  const remove = event.target.closest("[data-remove-related]");
  if (!remove) return;
  const exerciseId = remove.dataset.removeRelated;
  relatedDraftExercises = relatedDraftExercises.filter((related) => related.exerciseId !== exerciseId);
  renderAlternativesList();
  (
    document.querySelector(`[data-add-related="${CSS.escape(exerciseId)}"]`)
    || document.querySelector("#alternativesSearch")
  )?.focus();
});
document.querySelector("#alternativesList").addEventListener("change", (event) => {
  const exerciseId = event.target.dataset.relatedRelation;
  if (!exerciseId || !["easier", "similar", "harder"].includes(event.target.value)) return;
  relatedDraftExercises = relatedDraftExercises.map((related) => (
    related.exerciseId === exerciseId ? { ...related, relation: event.target.value } : related
  ));
});
document.querySelector("#cancelAlternativesButton").addEventListener("click", () => {
  document.querySelector("#alternativesDialog").close();
});
document.querySelector("#saveAlternativesButton").addEventListener("click", () => {
  const state = store.getState();
  const editingId = document.querySelector("#exerciseId").value;
  const validIds = new Set(state.exercises.map((exercise) => exercise.id));
  pendingRelatedExercises = relatedDraftExercises
    .filter((related) => (
      related.exerciseId !== editingId
      && validIds.has(related.exerciseId)
      && ["easier", "similar", "harder"].includes(related.relation)
    ))
    .map((related) => ({ ...related }));
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
  event.preventDefault();
  if (event.submitter?.value === "save") saveExercise();
});

document.querySelector("#routineForm").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  saveRoutine();
});

document.querySelector("#routineBlockForm").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  saveRoutineBlockDraft();
});

document.querySelector("#entryChoiceForm").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  saveEntryChoiceDraft();
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
document.querySelector("#moveBlockEarlierButton").addEventListener("click", () => moveRoutineBlockDraft(-1));
document.querySelector("#moveBlockLaterButton").addEventListener("click", () => moveRoutineBlockDraft(1));
document.querySelector("#deleteBlockButton").addEventListener("click", deleteRoutineBlockDraft);

document.querySelector("#deleteExerciseButton").addEventListener("click", () => deleteExercise(document.querySelector("#exerciseId").value));
document.querySelector("#duplicateExerciseButton").addEventListener("click", () => {
  const id = document.querySelector("#exerciseId").value;
  const dialog = document.querySelector("#exerciseDialog");
  const focusReturn = exerciseEditorFocusReturn;
  dialog.dataset.skipFocusReturn = "true";
  dialog.close();
  openExerciseEditor(id, true, focusReturn);
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

document.querySelector("#exerciseFilterDialog").addEventListener("close", () => {
  requestAnimationFrame(() => {
    const target = exerciseFilterFocusReturn?.isConnected
      ? exerciseFilterFocusReturn
      : main.querySelector(".library-filter-button, .library-add-button");
    target?.focus?.({ preventScroll: true });
    exerciseFilterFocusReturn = null;
  });
});

document.querySelector("#exerciseDialog").addEventListener("close", (event) => {
  if (event.target.dataset.skipFocusReturn) {
    delete event.target.dataset.skipFocusReturn;
    return;
  }
  requestAnimationFrame(() => {
    const storedTarget = exerciseEditorFocusReturn;
    const storedDialog = storedTarget?.closest?.("dialog");
    const libraryRow = exerciseEditorReturnId
      ? main.querySelector(`.library-row[data-id="${CSS.escape(exerciseEditorReturnId)}"]`)
      : null;
    const fallback = libraryRow || main.querySelector(".library-add-button") || main;
    const target = storedTarget?.isConnected && (!storedDialog || storedDialog.open)
      ? storedTarget
      : fallback;
    target?.focus?.({ preventScroll: true });
    exerciseEditorFocusReturn = null;
    exerciseEditorReturnId = "";
  });
});

document.querySelector("#classificationPickerDialog").addEventListener("close", (event) => {
  const focusVersion = Number(event.target.dataset.focusVersion);
  requestAnimationFrame(() => {
    const target = classificationPickerFocusReturn?.isConnected
      ? classificationPickerFocusReturn
      : document.querySelector(`[data-classification-picker="${CSS.escape(classificationPickerKind)}"]`);
    if (focusVersion === exerciseNestedDialogVersion) target?.focus?.({ preventScroll: true });
    classificationPickerFocusReturn = null;
    classificationPickerKind = "";
    classificationPickerDraft = [];
  });
});

document.querySelector("#alternativesDialog").addEventListener("close", (event) => {
  const focusVersion = Number(event.target.dataset.focusVersion);
  requestAnimationFrame(() => {
    const target = alternativesFocusReturn?.isConnected
      ? alternativesFocusReturn
      : document.querySelector("#chooseAlternativesButton");
    if (focusVersion === exerciseNestedDialogVersion) target?.focus?.({ preventScroll: true });
    alternativesFocusReturn = null;
    alternativesQuery = "";
    relatedDraftExercises = [];
  });
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
  if (routineBlockDrag) finishRoutineBlockDrag(false);
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
    routineBlockDraft = [];
  });
});

document.querySelector("#routineBlockDialog").addEventListener("close", () => {
  requestAnimationFrame(() => {
    const id = document.querySelector("#routineBlockId").value;
    const fallback = [...document.querySelectorAll("#routineBlocksList .routine-block-edit")]
      .find((button) => button.dataset.id === id)
      || document.querySelector("#addRoutineBlockButton");
    const target = routineBlockDialogFocusReturn?.isConnected
      ? routineBlockDialogFocusReturn
      : fallback;
    target?.focus?.({ preventScroll: true });
    routineBlockDialogFocusReturn = null;
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
    entryChoiceDraft = [];
  }, 0);
});

document.querySelector("#pickerDialog").addEventListener("close", () => {
  requestAnimationFrame(() => {
    const storedTarget = pickerDialogFocusReturn;
    const storedDialog = storedTarget?.closest?.("dialog");
    const fallback = currentView === "routines"
      ? pickerMode === "choice"
        ? document.querySelector("#addEntryChoiceButton")
        : main.querySelector(".add-row-button, .program-empty-state [data-action='open-picker']")
      : main;
    const target = storedTarget?.isConnected && (!storedDialog || storedDialog.open)
      ? storedTarget
      : fallback;
    target?.focus?.({ preventScroll: true });
    pickerDialogFocusReturn = null;
    pickerBlockId = "";
    pickerMode = "entry";
  });
});

document.querySelector("#entryChoiceDialog").addEventListener("close", () => {
  requestAnimationFrame(() => {
    const fallback = [...document.querySelectorAll('#entryChoicesList [data-action="edit-entry-choice"]')]
      .find((button) => Number(button.dataset.index) === entryChoiceEditIndex)
      || document.querySelector("#addEntryChoiceButton");
    const target = entryChoiceDialogFocusReturn?.isConnected && document.querySelector("#entryDialog").open
      ? entryChoiceDialogFocusReturn
      : fallback;
    target?.focus?.({ preventScroll: true });
    entryChoiceDialogFocusReturn = null;
    entryChoiceEditIndex = -1;
  });
});

document.querySelector("#entryChoicesDialog").addEventListener("close", () => {
  requestAnimationFrame(() => {
    const target = entryChoicesDialogFocusReturn?.isConnected
      ? entryChoicesDialogFocusReturn
      : main;
    target?.focus?.({ preventScroll: true });
    entryChoicesDialogFocusReturn = null;
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
    .register("sw.js?v=44", { updateViaCache: "none" })
    .then((registration) => registration.update())
    .catch(() => showToast("Offline mode could not be started."));
}

applyTheme(store.getState().settings.theme || "light");
if (store.getLastError()) showToast(store.getLastError());
render();
