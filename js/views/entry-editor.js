// Routine entry editing (opened from Program): the entry editor with its draft of
// exercise choices, role, block, note, Earlier/Later and remove; the choice
// editor; and the Library picker, which adds a new entry to a block or a choice
// to the entry being edited. The caller says which routine: Program edits the
// routine it is showing, which need not be the one selected on Workout.

import { registerActions, render, store } from "../context.js";
import { $, chevronIcon, clearError, closeDialog, confirmAction, enableHoldDrag, escapeHtml, openDialog, plural, report, segmentValue, setSegment, showError } from "../dom.js";
import { activeWorkout, addEntry, addExtra, dayExtras, entryNumber, exerciseById, fullName, removeEntry, routineById, updateEntry } from "../model.js";
import { searchExercises } from "../search.js";
import { label } from "../vocab.js";
import { entryPresentation, exerciseMarkup } from "./shared.js";

// The entry being edited. Its choices are a draft until Save; choiceIndex is the
// choice open in the choice editor.
const entryEditor = { routineId: "", entryId: "", choices: [], choiceIndex: -1 };
// What the picker adds: a new Main entry to blockId of routineId ("entry"), a choice
// to the entry draft ("choice"), an exercise to the workout in progress, for that day
// only ("extra"), or swaps the exercise of the choice open in the choice editor ("replace").
const picker = { mode: "entry", routineId: "", blockId: "" };

// ---------- markup ----------

function pickerListMarkup(exercises, existingExerciseIds, mode) {
  if (!exercises.length) {
    return `<div class="empty"><h3>No matching exercises</h3><p>Try another name, target, or movement.</p></div>`;
  }

  return exercises.map((exercise) => {
    const prescription = exercise.defaultPrescription || "No default prescription";
    const details = [prescription, label(exercise.primaryTargets[0]), label(exercise.movementPattern)].filter(Boolean).join(" · ");
    const exists = existingExerciseIds.has(exercise.id);
    const unavailable = mode !== "entry" && exists;
    return `<button class="row tall" type="button" data-action="pick-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="${unavailable ? `${escapeHtml(fullName(exercise))} is already added` : `${exists ? "Add another" : "Add"} ${escapeHtml(fullName(exercise))}${mode === "extra" ? " for today" : mode === "replace" ? " instead" : mode === "choice" ? " as a choice" : " to this routine"}`}" ${unavailable ? "disabled" : ""}>
      <span class="row-main"><strong class="row-title">${exerciseMarkup(exercise)}</strong><small class="row-meta truncate">${escapeHtml(details)}</small></span>
      <span class="row-action">${unavailable ? "Added" : exists ? "Add again" : "Add"}</span>
    </button>`;
  }).join("");
}

function entryChoicesEditorMarkup(choices, state) {
  if (!choices.length) {
    return `<div class="row row-main"><strong class="row-title">No exercise choices</strong><span class="row-meta">Add at least one choice before saving this entry.</span></div>`;
  }
  return choices.map((choice, index) => {
    const exercise = exerciseById(state, choice.exerciseId);
    const name = fullName(exercise);
    const prescription = choice.prescription || "No prescription";
    return `<div class="row drag-row" data-choice-index="${index}">
      <span class="row-number">${index + 1}</span>
      <button class="row-body" type="button" data-action="replace-entry-choice" data-index="${index}" aria-label="Replace ${escapeHtml(name)} with another exercise. Hold and drag to reorder.">
        <span class="row-main"><strong class="row-title">${exerciseMarkup(exercise)}</strong><small class="row-meta">${escapeHtml(prescription)}<span class="label accent" data-preferred style="visibility: ${index === 0 ? "visible" : "hidden"}">Preferred</span></small></span>
      </button>
      <button class="icon-button sm" type="button" data-action="edit-entry-choice" data-index="${index}" aria-label="Edit ${escapeHtml(name)} choice">${chevronIcon("right")}</button>
      <button class="icon-button sm" type="button" data-action="remove-entry-choice" data-index="${index}" aria-label="Remove ${escapeHtml(name)} choice">×</button>
    </div>`;
  }).join("");
}

// ---------- entry editor ----------

function renderChoiceDraft() {
  const state = store.getState();
  $("#entryChoicesList").innerHTML = entryChoicesEditorMarkup(entryEditor.choices, state);
  $("#entryExerciseName").innerHTML = entryPresentation({ choices: entryEditor.choices }, state).titleMarkup;
}

export function openEntryEditor(routineId, entryId) {
  const state = store.getState();
  const routine = routineById(state, routineId);
  const entry = routine?.entries.find((item) => item.id === entryId);
  if (!entry) return;
  Object.assign(entryEditor, { routineId: routine.id, entryId, choices: structuredClone(entry.choices), choiceIndex: -1 });

  $("#entryRoutineContext").textContent = `${routine.name} entry · slot ${entryNumber(routine, entryId)}`;
  const blockSelect = $("#entryBlock");
  blockSelect.innerHTML = routine.blocks.map((block) => `<option value="${escapeHtml(block.id)}">${escapeHtml(block.name.trim() || "Main")}</option>`).join("");
  blockSelect.value = entry.blockId;
  $("#entryNote").value = entry.note;
  $("#entryFormNote").textContent = `Choices, role, block, and note change only the ${routine.name} entry. The master exercises stay unchanged.`;
  $("#removeEntryButton").firstChild.textContent = `Remove from ${routine.name} `;
  setSegment("#entryRoleOptions", entry.role);
  renderChoiceDraft();
  $("#entryFormError").textContent = "";
  openDialog("#entryDialog");
}

function entryChanges() {
  return { choices: entryEditor.choices, role: segmentValue("#entryRoleOptions"), blockId: $("#entryBlock").value, note: $("#entryNote").value };
}

function saveEntry() {
  const { routineId, entryId } = entryEditor;
  const changes = entryChanges();
  const result = store.update((draft) => updateEntry(draft, routineId, entryId, changes));
  if (report(result, "Routine entry updated.")) {
    closeDialog("#entryDialog");
    render();
  }
}

async function removeEntryFromRoutine() {
  const state = store.getState();
  const routine = routineById(state, entryEditor.routineId);
  const entry = routine.entries.find((item) => item.id === entryEditor.entryId);
  const confirmed = await confirmAction({
    title: `Remove ${entryPresentation(entry, state).title}?`,
    message: `This removes only the ${routine.name} entry. The master exercise stays in the Library.`,
    confirmLabel: "Remove entry",
    cancelLabel: "Keep entry",
    variant: "entry-remove",
  });
  if (!confirmed) return;
  const result = store.update((draft) => removeEntry(draft, routine.id, entry.id));
  if (report(result, "Exercise removed from routine.")) {
    closeDialog("#entryDialog");
    render();
  }
}

// ---------- choices (draft) ----------

function removeChoice(index) {
  entryEditor.choices.splice(index, 1);
  renderChoiceDraft();
  closeDialog("#entryChoiceDialog");
}

function updateChoiceEditor() {
  const index = entryEditor.choiceIndex;
  const count = entryEditor.choices.length;
  $("#entryChoiceDialogSubtitle").textContent = `${index + 1} of ${count}${index === 0 ? " · Preferred" : ""}`;
  $("#preferEntryChoiceButton").disabled = index <= 0;
}

function openChoiceEditor(index) {
  const choice = entryEditor.choices[index];
  entryEditor.choiceIndex = index;
  $("#entryChoiceDialogTitle").innerHTML = exerciseMarkup(exerciseById(store.getState(), choice.exerciseId));
  $("#entryChoicePrescription").value = choice.prescription;
  $("#entryChoiceFormError").textContent = "";
  updateChoiceEditor();
  openDialog("#entryChoiceDialog");
}

// Copies the choice editor's prescription into the draft; false when it's blank.
function syncChoicePrescription() {
  const input = $("#entryChoicePrescription");
  const prescription = input.value.trim();
  if (!prescription) {
    showError("Enter a prescription for this choice.");
    input.focus();
    return false;
  }
  entryEditor.choices[entryEditor.choiceIndex].prescription = prescription;
  clearError();
  return true;
}

function moveChoice(toIndex) {
  if (!syncChoicePrescription()) return;
  const [choice] = entryEditor.choices.splice(entryEditor.choiceIndex, 1);
  entryEditor.choices.splice(toIndex, 0, choice);
  entryEditor.choiceIndex = toIndex;
  renderChoiceDraft();
  updateChoiceEditor();
}

function saveChoice() {
  if (!syncChoicePrescription()) return;
  renderChoiceDraft();
  closeDialog("#entryChoiceDialog");
}

// ---------- picker ----------

function renderPickerList() {
  const state = store.getState();
  const workout = activeWorkout(state);
  const used = picker.mode === "choice" || picker.mode === "replace"
    ? entryEditor.choices
    : picker.mode === "extra"
      ? dayExtras(state, workout.dateKey, workout.routineId)
      : routineById(state, picker.routineId).entries.flatMap((entry) => entry.choices);
  const exercises = searchExercises(state.exercises, $("#pickerSearch").value);
  $("#pickerResultCount").textContent = plural(exercises.length, "exercise");
  $("#pickerList").innerHTML = pickerListMarkup(exercises, new Set(used.map((choice) => choice.exerciseId)), picker.mode);
}

// `routineId` and `blockId` say where a new entry goes ("entry"). The other modes know
// their routine: the entry being edited, or the workout in progress ("extra").
export function openPicker({ routineId = "", blockId = "", mode }) {
  const state = store.getState();
  const routine = routineById(state, mode === "entry" ? routineId : mode === "extra" ? activeWorkout(state)?.routineId : entryEditor.routineId);
  if (!routine) return;
  Object.assign(picker, { mode, routineId: routine.id, blockId });
  const block = routine.blocks.find((item) => item.id === blockId);
  $("#pickerRoutineContext").textContent = mode === "choice"
    ? `${routine.name} entry · add choice from Library`
    : mode === "replace"
      ? `Replace ${fullName(exerciseById(state, entryEditor.choices[entryEditor.choiceIndex].exerciseId))}`
      : mode === "extra"
      ? `${routine.name} · today only · Library`
      : `${routine.name} · ${block.name.trim() || "Main"} · Library`;
  $("#pickerSearch").value = "";
  $("#pickerFormError").textContent = "";
  renderPickerList();
  openDialog("#pickerDialog");
}

function pickExercise(exerciseId) {
  const state = store.getState();
  const exercise = exerciseById(state, exerciseId);
  if (picker.mode === "choice") {
    entryEditor.choices.push({ exerciseId, prescription: exercise.defaultPrescription });
    renderChoiceDraft();
    closeDialog("#pickerDialog");
    return;
  }
  if (picker.mode === "replace") {
    // The prescription stays: it was written for this slot.
    entryEditor.choices[entryEditor.choiceIndex].exerciseId = exerciseId;
    $("#entryChoiceDialogTitle").innerHTML = exerciseMarkup(exercise);
    renderChoiceDraft();
    closeDialog("#pickerDialog");
    return;
  }
  if (picker.mode === "extra") {
    if (report(store.update((draft) => addExtra(draft, exerciseId)))) {
      closeDialog("#pickerDialog");
      render();
    }
    return;
  }
  if (!exercise.defaultPrescription.trim()) {
    showError("Add a default prescription to this Library exercise before creating a new routine slot.");
    return;
  }
  const { routineId, blockId } = picker;
  const result = store.update((draft) => addEntry(draft, routineId, { exerciseId, blockId, prescription: exercise.defaultPrescription }));
  if (report(result, "Exercise added to routine.")) {
    closeDialog("#pickerDialog");
    render();
  }
}

// ---------- listeners ----------

registerActions({
  "save-entry": saveEntry,
  "remove-entry": removeEntryFromRoutine,
  // Buttons in the entry editor's list of choices carry the choice's index.
  "add-entry-choice": () => openPicker({ mode: "choice" }),
  "edit-entry-choice": (button) => openChoiceEditor(Number(button.dataset.index)),
  "replace-entry-choice": (button) => {
    entryEditor.choiceIndex = Number(button.dataset.index);
    openPicker({ mode: "replace" });
  },
  "remove-entry-choice": (button) => removeChoice(Number(button.dataset.index)),
  // The choice editor's buttons act on the choice it has open.
  "save-open-choice": saveChoice,
  "prefer-open-choice": () => moveChoice(0),
  "remove-open-choice": () => removeChoice(entryEditor.choiceIndex),
  "replace-open-choice": () => openPicker({ mode: "replace" }),
  "pick-exercise": (button) => pickExercise(button.dataset.id),
});

$("#pickerSearch").addEventListener("input", () => {
  renderPickerList();
  for (let area = $("#pickerList"); area && area.tagName !== "DIALOG"; area = area.parentElement) area.scrollTop = 0;
});

// While a choice is dragged, the title, the numbers and the Preferred tag already
// show the order dropping here would give, so nothing jumps on release.
function previewChoiceOrder(row, toIndex) {
  const order = [...entryEditor.choices];
  order.splice(toIndex, 0, ...order.splice(Number(row.dataset.choiceIndex), 1));
  $("#entryExerciseName").innerHTML = entryPresentation({ choices: order }, store.getState()).titleMarkup;
  const rows = [...$("#entryChoicesList").querySelectorAll(".drag-row")];
  rows.splice(toIndex, 0, row);
  rows.forEach((item, index) => {
    item.querySelector(".row-number").textContent = index + 1;
    item.querySelector("[data-preferred]").style.visibility = index === 0 ? "visible" : "hidden";
  });
}

// Hold and drag a choice to reorder; the first is the preferred one.
enableHoldDrag($("#entryChoicesList"), {
  rowSelector: ".drag-row",
  listSelector: ".drag-list",
  placeholderClass: "drag-placeholder",
  activeBodyClass: "drag-active",
  scroller: () => $("#entryDialog .sheet-body"),
  onPlace: previewChoiceOrder,
  onDrop(row, toIndex) {
    const [choice] = entryEditor.choices.splice(Number(row.dataset.choiceIndex), 1);
    entryEditor.choices.splice(toIndex, 0, choice);
    renderChoiceDraft();
  },
});
