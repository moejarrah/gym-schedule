// Routine entry editing (opened from Program): the entry editor with its draft of
// exercise choices, role, block, note, Earlier/Later and remove; the choice
// editor; and the Library picker, which adds a new entry to a block or a choice
// to the entry being edited.

import { mainElement, onStart, render, store } from "../context.js";
import { $, bindSegment, chevronIcon, clearError, closeDialog, confirmAction, escapeHtml, openDialog, plural, report, segmentValue, setSegment, showError } from "../dom.js";
import { activeRoutine, addEntry, entryNumber, exerciseById, moveEntryInBlock, removeEntry, routineById, updateEntry } from "../model.js";
import { searchExercises } from "../search.js";
import { label } from "../vocab.js";
import { entryPresentation } from "./shared.js";

// The entry being edited. Its choices are a draft until Save; choiceIndex is the
// choice open in the choice editor.
const entryEditor = { routineId: "", entryId: "", choices: [], choiceIndex: -1 };
// What the picker adds: a new Main entry to blockId ("entry") or a choice to the entry draft ("choice").
const picker = { mode: "entry", blockId: "" };

// ---------- markup ----------

function pickerListMarkup(exercises, existingExerciseIds, mode) {
  if (!exercises.length) {
    return `<div class="picker-empty"><h3>No matching exercises</h3><p>Try another name, target, or movement.</p></div>`;
  }

  return exercises.map((exercise) => {
    const prescription = exercise.defaultPrescription || "No default prescription";
    const details = [prescription, label(exercise.primaryTargets[0]), label(exercise.movementPattern)].filter(Boolean).join(" · ");
    const exists = existingExerciseIds.has(exercise.id);
    const unavailable = mode === "choice" && exists;
    return `<button class="picker-item" type="button" data-action="pick-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="${unavailable ? `${escapeHtml(exercise.name)} is already a choice` : `${exists ? "Add another" : "Add"} ${escapeHtml(exercise.name)} to this routine`}" ${unavailable ? "disabled" : ""}>
      <span class="picker-item-copy"><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(details)}</small></span>
      <span class="picker-item-action">${unavailable ? "Added" : exists ? "Add again" : "Add"}</span>
    </button>`;
  }).join("");
}

function entryChoicesEditorMarkup(choices, state) {
  if (!choices.length) {
    return `<div class="entry-choice-empty"><strong>No exercise choices</strong><span>Add at least one choice before saving this entry.</span></div>`;
  }
  return choices.map((choice, index) => {
    const name = exerciseById(state, choice.exerciseId)?.name || "Missing exercise";
    const prescription = choice.prescription || "No prescription";
    return `<div class="entry-choice-edit-row" data-choice-index="${index}">
      <span class="entry-choice-number">${index + 1}</span>
      <span class="entry-choice-copy"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(prescription)}</small></span>
      ${index === 0 ? `<span class="choice-preferred-tag">Preferred</span>` : `<button class="entry-choice-mini" type="button" data-action="prefer-entry-choice" data-index="${index}" aria-label="Make ${escapeHtml(name)} preferred">↑</button>`}
      <button class="entry-choice-mini" type="button" data-action="edit-entry-choice" data-index="${index}" aria-label="Edit ${escapeHtml(name)} choice">${chevronIcon("right")}</button>
      <button class="entry-choice-mini" type="button" data-action="remove-entry-choice" data-index="${index}" aria-label="Remove ${escapeHtml(name)} choice">×</button>
    </div>`;
  }).join("");
}

// ---------- entry editor ----------

function entryFocusFallback() {
  const main = mainElement();
  return $(`.program-row[data-id="${CSS.escape(entryEditor.entryId)}"]`, main)
    || $(".add-row-button", main)
    || $(".program-view-edit", main)
    || main;
}

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

export function openEntryEditor(entryId, returnFocus = document.activeElement) {
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
  openDialog("#entryDialog", { returnFocus, fallbackFocus: entryFocusFallback, focus: "#addEntryChoiceButton" });
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
  $('#entryChoicesList [data-action="edit-entry-choice"][data-index="0"]').focus();
}

function removeChoice(index) {
  entryEditor.choices.splice(index, 1);
  renderChoiceDraft();
  closeDialog("#entryChoiceDialog", { restoreFocus: false });
  $("#addEntryChoiceButton").focus();
}

function updateChoiceEditor() {
  const index = entryEditor.choiceIndex;
  const count = entryEditor.choices.length;
  $("#entryChoiceDialogSubtitle").textContent = `${index + 1} of ${count}${index === 0 ? " · Preferred" : ""}`;
  $("#preferEntryChoiceButton").disabled = index <= 0;
  $("#moveEntryChoiceEarlierButton").disabled = index <= 0;
  $("#moveEntryChoiceLaterButton").disabled = index >= count - 1;
}

function openChoiceEditor(index, returnFocus) {
  const choice = entryEditor.choices[index];
  entryEditor.choiceIndex = index;
  $("#entryChoiceDialogTitle").textContent = exerciseById(store.getState(), choice.exerciseId).name;
  $("#entryChoicePrescription").value = choice.prescription;
  $("#entryChoiceFormError").textContent = "";
  updateChoiceEditor();
  openDialog("#entryChoiceDialog", {
    returnFocus,
    fallbackFocus: () => $(`#entryChoicesList [data-action="edit-entry-choice"][data-index="${entryEditor.choiceIndex}"]`) || $("#addEntryChoiceButton"),
    focus: "#entryChoicePrescription",
  });
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

function pickerFocusFallback() {
  if (picker.mode === "choice") return $("#addEntryChoiceButton");
  const main = mainElement();
  return $(`.add-row-button[data-block-id="${CSS.escape(picker.blockId)}"]`, main) || main;
}

function renderPickerList() {
  const state = store.getState();
  const used = picker.mode === "choice"
    ? entryEditor.choices
    : activeRoutine(state).entries.flatMap((entry) => entry.choices);
  const exercises = searchExercises(state.exercises, $("#pickerSearch").value);
  $("#pickerResultCount").textContent = plural(exercises.length, "exercise");
  $("#pickerList").innerHTML = pickerListMarkup(exercises, new Set(used.map((choice) => choice.exerciseId)), picker.mode);
}

export function openPicker({ blockId = "", mode, returnFocus = document.activeElement }) {
  const routine = activeRoutine(store.getState());
  Object.assign(picker, { mode, blockId });
  const block = routine.blocks.find((item) => item.id === blockId);
  $("#pickerRoutineContext").textContent = mode === "choice"
    ? `${routine.name} entry · add choice from Library`
    : `${routine.name} · ${block.name.trim() || "Untitled block"} · Library`;
  $("#pickerSearch").value = "";
  $("#pickerFormError").textContent = "";
  renderPickerList();
  openDialog("#pickerDialog", { returnFocus, fallbackFocus: pickerFocusFallback, focus: "#pickerSearch" });
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

onStart(() => {
  $("#entryForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveEntry();
  });
  bindSegment("#entryRoleOptions");
  $("#entryBlock").addEventListener("change", updateEntryMoveButtons);
  $("#moveEntryEarlierButton").addEventListener("click", () => moveEntry(-1));
  $("#moveEntryLaterButton").addEventListener("click", () => moveEntry(1));
  $("#removeEntryButton").addEventListener("click", removeEntryFromRoutine);
  $("#addEntryChoiceButton").addEventListener("click", (event) => openPicker({ mode: "choice", returnFocus: event.currentTarget }));

  $("#entryChoicesList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action][data-index]");
    if (!button) return;
    const index = Number(button.dataset.index);
    if (button.dataset.action === "edit-entry-choice") openChoiceEditor(index, button);
    else if (button.dataset.action === "prefer-entry-choice") preferChoice(index);
    else if (button.dataset.action === "remove-entry-choice") removeChoice(index);
  });

  $("#entryChoiceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveChoice();
  });
  $("#preferEntryChoiceButton").addEventListener("click", () => moveChoice(0));
  $("#moveEntryChoiceEarlierButton").addEventListener("click", () => moveChoice(entryEditor.choiceIndex - 1));
  $("#moveEntryChoiceLaterButton").addEventListener("click", () => moveChoice(entryEditor.choiceIndex + 1));
  $("#removeEntryChoiceButton").addEventListener("click", () => removeChoice(entryEditor.choiceIndex));

  $("#pickerSearch").addEventListener("input", renderPickerList);
  $("#pickerList").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="pick-exercise"]');
    if (button) pickExercise(button.dataset.id);
  });
});
