// Routine entry editing (opened from Program): the entry editor with its draft of
// exercise choices, role, block, note, Earlier/Later and remove; the choice
// editor; and the Library picker, which adds a new entry to a block or a choice
// to the entry being edited.

import { registerActions, render, store } from "../context.js";
import { $, chevronIcon, clearError, closeDialog, confirmAction, escapeHtml, openDialog, plural, report, segmentValue, setSegment, showError } from "../dom.js";
import { activeRoutine, activeWorkout, addEntry, addExtra, dayExtras, entryNumber, exerciseById, moveEntryInBlock, removeEntry, routineById, updateEntry } from "../model.js";
import { searchExercises } from "../search.js";
import { label } from "../vocab.js";
import { entryPresentation } from "./shared.js";

// The entry being edited. Its choices are a draft until Save; choiceIndex is the
// choice open in the choice editor.
const entryEditor = { routineId: "", entryId: "", choices: [], choiceIndex: -1 };
// What the picker adds: a new Main entry to blockId ("entry"), a choice to the entry
// draft ("choice"), or an exercise to the workout in progress, for that day only ("extra").
const picker = { mode: "entry", blockId: "" };

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
    return `<button class="row tall" type="button" data-action="pick-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="${unavailable ? `${escapeHtml(exercise.name)} is already added` : `${exists ? "Add another" : "Add"} ${escapeHtml(exercise.name)}${mode === "extra" ? " for today" : " to this routine"}`}" ${unavailable ? "disabled" : ""}>
      <span class="row-main"><strong class="row-title truncate">${escapeHtml(exercise.name)}</strong><small class="row-meta truncate">${escapeHtml(details)}</small></span>
      <span class="row-action">${unavailable ? "Added" : exists ? "Add again" : "Add"}</span>
    </button>`;
  }).join("");
}

function entryChoicesEditorMarkup(choices, state) {
  if (!choices.length) {
    return `<div class="row row-main"><strong class="row-title">No exercise choices</strong><span class="row-meta">Add at least one choice before saving this entry.</span></div>`;
  }
  return choices.map((choice, index) => {
    const name = exerciseById(state, choice.exerciseId)?.name || "Missing exercise";
    const prescription = choice.prescription || "No prescription";
    return `<div class="row" data-choice-index="${index}">
      <span class="row-number">${index + 1}</span>
      <span class="row-main"><strong class="row-title">${escapeHtml(name)}</strong><small class="row-meta">${escapeHtml(prescription)}</small></span>
      ${index === 0 ? `<span class="label accent">Preferred</span>` : `<button class="icon-button sm" type="button" data-action="prefer-entry-choice" data-index="${index}" aria-label="Make ${escapeHtml(name)} preferred">↑</button>`}
      <button class="icon-button sm" type="button" data-action="edit-entry-choice" data-index="${index}" aria-label="Edit ${escapeHtml(name)} choice">${chevronIcon("right")}</button>
      <button class="icon-button sm" type="button" data-action="remove-entry-choice" data-index="${index}" aria-label="Remove ${escapeHtml(name)} choice">×</button>
    </div>`;
  }).join("");
}

// ---------- entry editor ----------

function renderChoiceDraft() {
  const state = store.getState();
  $("#entryChoicesList").innerHTML = entryChoicesEditorMarkup(entryEditor.choices, state);
  $("#entryExerciseName").textContent = entryPresentation({ choices: entryEditor.choices }, state).title;
}

// The entry's position among the entries of blockId. Saving an entry into
// another block puts it last there (see model.updateEntry).
function positionInBlock(routine, entryId, blockId) {
  const blockEntries = routine.entries.filter((item) => item.blockId === blockId);
  const index = blockEntries.findIndex((item) => item.id === entryId);
  return index < 0 ? { index: blockEntries.length, count: blockEntries.length + 1 } : { index, count: blockEntries.length };
}

function updateEntryMoveButtons() {
  const routine = routineById(store.getState(), entryEditor.routineId);
  const { index, count } = positionInBlock(routine, entryEditor.entryId, $("#entryBlock").value);
  $("#moveEntryEarlierButton").disabled = index <= 0;
  $("#moveEntryLaterButton").disabled = index >= count - 1;
}

export function openEntryEditor(entryId) {
  const state = store.getState();
  const routine = activeRoutine(state);
  const entry = routine.entries.find((item) => item.id === entryId);
  Object.assign(entryEditor, { routineId: routine.id, entryId, choices: structuredClone(entry.choices), choiceIndex: -1 });

  $("#entryRoutineContext").textContent = `${routine.name} entry · slot ${entryNumber(routine, entryId)}`;
  const blockSelect = $("#entryBlock");
  blockSelect.innerHTML = routine.blocks.map((block) => `<option value="${escapeHtml(block.id)}">${escapeHtml(block.name.trim() || "Untitled block")}</option>`).join("");
  blockSelect.value = entry.blockId;
  $("#entryNote").value = entry.note;
  $("#entryFormNote").textContent = `Choices, role, block, and note change only the ${routine.name} entry. The master exercises stay unchanged.`;
  $("#removeEntryButton").firstChild.textContent = `Remove from ${routine.name} `;
  setSegment("#entryRoleOptions", entry.role);
  updateEntryMoveButtons();
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

// Earlier/Later saves the draft and moves the entry inside its (possibly new) block.
function moveEntry(direction) {
  const { routineId, entryId } = entryEditor;
  const changes = entryChanges();
  const result = store.update((draft) => {
    updateEntry(draft, routineId, entryId, changes);
    const { index } = positionInBlock(routineById(draft, routineId), entryId, changes.blockId);
    moveEntryInBlock(draft, routineId, entryId, index + direction);
  });
  if (report(result, "Exercise moved.")) {
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

function preferChoice(index) {
  const [choice] = entryEditor.choices.splice(index, 1);
  entryEditor.choices.unshift(choice);
  renderChoiceDraft();
}

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
  $("#moveEntryChoiceEarlierButton").disabled = index <= 0;
  $("#moveEntryChoiceLaterButton").disabled = index >= count - 1;
}

function openChoiceEditor(index) {
  const choice = entryEditor.choices[index];
  entryEditor.choiceIndex = index;
  $("#entryChoiceDialogTitle").textContent = exerciseById(store.getState(), choice.exerciseId).name;
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
  const used = picker.mode === "choice"
    ? entryEditor.choices
    : picker.mode === "extra"
      ? dayExtras(state, workout.dateKey, workout.routineId)
      : activeRoutine(state).entries.flatMap((entry) => entry.choices);
  const exercises = searchExercises(state.exercises, $("#pickerSearch").value);
  $("#pickerResultCount").textContent = plural(exercises.length, "exercise");
  $("#pickerList").innerHTML = pickerListMarkup(exercises, new Set(used.map((choice) => choice.exerciseId)), picker.mode);
}

export function openPicker({ blockId = "", mode }) {
  const routine = activeRoutine(store.getState());
  Object.assign(picker, { mode, blockId });
  const block = routine.blocks.find((item) => item.id === blockId);
  $("#pickerRoutineContext").textContent = mode === "choice"
    ? `${routine.name} entry · add choice from Library`
    : mode === "extra"
      ? `${routine.name} · today only · Library`
      : `${routine.name} · ${block.name.trim() || "Untitled block"} · Library`;
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
  const routineId = activeRoutine(state).id;
  const { blockId } = picker;
  const result = store.update((draft) => addEntry(draft, routineId, { exerciseId, blockId, prescription: exercise.defaultPrescription }));
  if (report(result, "Exercise added to routine.")) {
    closeDialog("#pickerDialog");
    render();
  }
}

// ---------- listeners ----------

registerActions({
  "save-entry": saveEntry,
  "move-entry": (button) => moveEntry(Number(button.dataset.by)),
  "remove-entry": removeEntryFromRoutine,
  // Buttons in the entry editor's list of choices carry the choice's index.
  "add-entry-choice": () => openPicker({ mode: "choice" }),
  "edit-entry-choice": (button) => openChoiceEditor(Number(button.dataset.index)),
  "prefer-entry-choice": (button) => preferChoice(Number(button.dataset.index)),
  "remove-entry-choice": (button) => removeChoice(Number(button.dataset.index)),
  // The choice editor's buttons act on the choice it has open.
  "save-open-choice": saveChoice,
  "prefer-open-choice": () => moveChoice(0),
  "move-open-choice": (button) => moveChoice(entryEditor.choiceIndex + Number(button.dataset.by)),
  "remove-open-choice": () => removeChoice(entryEditor.choiceIndex),
  "pick-exercise": (button) => pickExercise(button.dataset.id),
});

$("#entryBlock").addEventListener("change", updateEntryMoveButtons);
$("#pickerSearch").addEventListener("input", renderPickerList);
