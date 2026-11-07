// Master exercise editor (#exerciseDialog) with its nested pickers: the
// classification picker (secondary targets, equipment, emphases) and the
// related-exercise editor. Opened from the Library and the exercise reference.
// Nested pickers edit a draft; nothing is saved until "Save exercise".

import { mainElement, onStart, render, store } from "../context.js";
import { $, closeDialog, confirmAction, escapeHtml, openDialog, plural, report, showError } from "../dom.js";
import { exerciseById, exerciseDeletionImpact, makeId, removeExercise, saveExercise as saveExerciseInState } from "../model.js";
import { searchExercises } from "../search.js";
import { normalizedName } from "../store.js";
import { CHALLENGES, EMPHASES, EQUIPMENT, LATERALITIES, MOVEMENTS, PURPOSES, RELATIONS, STYLES, SUPPORTS, TARGETS, label } from "../vocab.js";

const editor = {
  mode: "add", // "add" | "edit" | "duplicate"
  exerciseId: "", // the exercise being edited; "" while adding or duplicating
  returnId: "", // on close, this exercise's Library row gets focus if the opener was re-rendered
  selections: { secondaryTargets: [], equipment: [], emphases: [] },
  related: [], // { exerciseId, relation }, saved with the master
};

// Each nested picker works on its own copy until Done.
const picker = { kind: "", draft: [] };
const relatedEditor = { draft: [], query: "" };

// ---------- markup ----------

function classificationSummary(exercise) {
  const primary = exercise.primaryTargets.map(label).join(" / ") || "Needs classification";
  const secondary = exercise.secondaryTargets.map(label).join(" / ");
  const targets = secondary ? `${primary} · Also ${secondary}` : primary;
  return [targets, label(exercise.movementPattern), label(exercise.purpose)].filter(Boolean).join(" · ");
}

function classificationOptionPickerMarkup({ options, selected, excluded }) {
  return options.map((option) => {
    const isSelected = selected.includes(option.id);
    const isExcluded = excluded.includes(option.id);
    return `<button class="classification-option" type="button" data-classification-value="${escapeHtml(option.id)}" aria-pressed="${isSelected}" ${isExcluded ? "disabled" : ""}>
      <span>${escapeHtml(option.label)}</span>
      <span class="classification-option-state">${isExcluded ? "Primary target" : isSelected ? "Selected" : ""}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>
    </button>`;
  }).join("");
}

function relationshipEditorMarkup({ linkedExercises, availableExercises, query }) {
  const linkedMarkup = linkedExercises.length ? linkedExercises.map(({ exercise, relation }) => `
    <article class="relationship-linked-row" data-related-id="${escapeHtml(exercise.id)}">
      <div class="relationship-row-copy">
        <strong>${escapeHtml(exercise.name)}</strong>
        <small>${escapeHtml(classificationSummary(exercise))}</small>
      </div>
      <label class="relationship-relation">
        <span class="visually-hidden">Relationship to ${escapeHtml(exercise.name)}</span>
        <select data-related-relation="${escapeHtml(exercise.id)}" aria-label="Relationship to ${escapeHtml(exercise.name)}">
          ${RELATIONS.map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === relation ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
      </label>
      <button class="relationship-remove" type="button" data-remove-related="${escapeHtml(exercise.id)}" aria-label="Remove relationship to ${escapeHtml(exercise.name)}">Remove</button>
    </article>`).join("") : `<p class="relationship-empty">No related exercises yet.</p>`;
  const availableMarkup = availableExercises.length ? availableExercises.map((exercise) => `
    <button class="relationship-result" type="button" data-add-related="${escapeHtml(exercise.id)}">
      <span class="relationship-row-copy">
        <strong>${escapeHtml(exercise.name)}</strong>
        <small>${escapeHtml(classificationSummary(exercise))}</small>
      </span>
      <span aria-hidden="true">Add</span>
    </button>`).join("") : `<p class="relationship-empty">${query.trim() ? "No matching exercises." : "Every available exercise is already linked."}</p>`;
  return `
    <section class="relationship-group" aria-labelledby="linkedRelationshipsHeading">
      <div class="relationship-group-head"><h3 id="linkedRelationshipsHeading">Linked</h3><span>${linkedExercises.length}</span></div>
      ${linkedMarkup}
    </section>
    <section class="relationship-group" aria-labelledby="availableRelationshipsHeading">
      <div class="relationship-group-head"><h3 id="availableRelationshipsHeading">Add relationship</h3><span>${availableExercises.length}</span></div>
      ${availableMarkup}
    </section>`;
}

// ---------- editor form ----------

function setExerciseSelectOptions(selector, options, emptyLabel, value = "", required = false) {
  const select = $(selector);
  select.innerHTML = `<option value="" ${required ? "disabled" : ""}>${escapeHtml(emptyLabel)}</option>${options.map((option) => (
    `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`
  )).join("")}`;
  select.value = value;
}

const selectionSummary = (values, emptyLabel) => (values.length ? values.map(label).join(" · ") : emptyLabel);

function updateExerciseEditorSummaries() {
  $("#secondaryTargetsSummary").textContent = selectionSummary(editor.selections.secondaryTargets, "None selected");
  $("#exerciseEquipmentSummary").textContent = selectionSummary(editor.selections.equipment, "Choose at least one");
  $("#exerciseEmphasesSummary").textContent = selectionSummary(editor.selections.emphases, "Not classified");
  const optionalCount = [
    $("#exerciseStyle").value,
    $("#exerciseLaterality").value,
    $("#exerciseSupport").value,
    $("#exerciseChallenge").value,
    ...editor.selections.emphases,
  ].filter(Boolean).length;
  $("#optionalClassificationSummary").textContent = optionalCount ? `${optionalCount} classified` : "Style · side · support · emphasis · challenge";
}

function updateRelatedCount() {
  $("#alternativesCount").textContent = editor.related.length ? `${editor.related.length} linked` : "None linked";
}

const primaryTargetValues = () => [$("#exercisePrimaryTarget1").value, $("#exercisePrimaryTarget2").value].filter(Boolean);

// A target can't be picked twice as primary, nor be both primary and secondary.
function syncExerciseTargetOptions() {
  const first = $("#exercisePrimaryTarget1");
  const second = $("#exercisePrimaryTarget2");
  if (first.value && first.value === second.value) second.value = "";
  for (const option of first.options) option.disabled = Boolean(option.value && option.value === second.value);
  for (const option of second.options) option.disabled = Boolean(option.value && option.value === first.value);
  const primary = primaryTargetValues();
  editor.selections.secondaryTargets = editor.selections.secondaryTargets.filter((target) => !primary.includes(target));
  updateExerciseEditorSummaries();
}

function fillForm(source) {
  const editing = editor.mode === "edit";
  $("#exerciseDialogTitle").textContent = { add: "Add exercise", edit: "Edit exercise", duplicate: "Duplicate exercise" }[editor.mode];
  $("#exerciseName").value = source ? `${source.name}${editor.mode === "duplicate" ? " copy" : ""}` : "";
  $("#exerciseAliases").value = editing ? source.aliases.join("\n") : "";
  $("#exercisePrescription").value = source?.defaultPrescription || "";
  $("#exerciseVideo").value = source?.videoId || "";
  $("#exerciseInstructions").value = source?.instructions || "";
  $("#exerciseFormError").textContent = "";
  $("#exerciseOptionalClassification").open = false;
  $("#exerciseSecondaryActions").hidden = !editing;
  $("#deleteExerciseButton").hidden = !editing;
  $("#duplicateExerciseButton").hidden = !editing;
  setExerciseSelectOptions("#exercisePrimaryTarget1", TARGETS, "Choose dominant target", source?.primaryTargets[0], true);
  setExerciseSelectOptions("#exercisePrimaryTarget2", TARGETS, "No second primary target", source?.primaryTargets[1]);
  setExerciseSelectOptions("#exerciseMovement", MOVEMENTS, "Choose movement", source?.movementPattern, true);
  setExerciseSelectOptions("#exercisePurpose", PURPOSES, "Choose purpose", source?.purpose, true);
  setExerciseSelectOptions("#exerciseStyle", STYLES, "Not classified", source?.style);
  setExerciseSelectOptions("#exerciseLaterality", LATERALITIES, "Not classified", source?.laterality);
  setExerciseSelectOptions("#exerciseSupport", SUPPORTS, "Not classified", source?.support);
  setExerciseSelectOptions("#exerciseChallenge", CHALLENGES, "Not classified", source?.typicalChallenge);
  updateRelatedCount();
  syncExerciseTargetOptions();
}

// Opens the editor to add (no exerciseId), edit, or duplicate an exercise.
// Duplicating while the editor is open refills it in place, so closing it
// still returns focus to whatever opened the original editor.
export function openExerciseEditor({ exerciseId = "", duplicate = false, returnFocus } = {}) {
  const source = exerciseId ? exerciseById(store.getState(), exerciseId) : null;
  editor.mode = source ? (duplicate ? "duplicate" : "edit") : "add";
  editor.exerciseId = editor.mode === "edit" ? source.id : "";
  editor.returnId = source?.id || "";
  editor.selections = {
    secondaryTargets: [...(source?.secondaryTargets || [])],
    equipment: [...(source?.equipment || [])],
    emphases: [...(source?.emphases || [])],
  };
  editor.related = structuredClone(source?.relatedExercises || []);
  fillForm(source);
  openDialog("#exerciseDialog", {
    returnFocus,
    fallbackFocus: () => (
      (editor.returnId && $(`[data-id="${CSS.escape(editor.returnId)}"]`, mainElement()))
      || $(".library-add-button", mainElement())
      || mainElement()
    ),
    focus: "#exerciseName",
  });
  $(".exercise-editor-scroll").scrollTop = 0;
}

// ---------- saving ----------

function youtubeId(value) {
  if (!value.trim()) return "";
  const match = value.trim().match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  const id = match?.[1] || value.trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
}

function showExerciseEditorError(message, field) {
  showError(message);
  field.scrollIntoView({ block: "center" });
  field.focus({ preventScroll: true });
}

// Returns [message, field] for the first problem with the form, or null.
// The model checks names and aliases too; checking them here first keeps the
// old order of messages and puts focus on the field at fault.
function formProblem(state, { name, aliases, primaryTargets, movementPattern, equipment, purpose, videoId }) {
  const nameField = $("#exerciseName");
  const aliasesField = $("#exerciseAliases");
  if (!name) return ["Enter an exercise name.", nameField];
  const identities = [name, ...aliases].map(normalizedName);
  if (identities.some((identity) => !identity) || new Set(identities).size !== identities.length) {
    return ["The name and aliases must each be unique.", aliases.length ? aliasesField : nameField];
  }
  const taken = new Set(state.exercises
    .filter((exercise) => exercise.id !== editor.exerciseId)
    .flatMap((exercise) => [exercise.name, ...exercise.aliases])
    .map(normalizedName));
  const conflict = identities.findIndex((identity) => taken.has(identity));
  if (conflict === 0) return ["An exercise with this name already exists.", nameField];
  if (conflict > 0) return ["An alias is already used by another exercise.", aliasesField];
  if (!primaryTargets.length) return ["Choose a dominant target.", $("#exercisePrimaryTarget1")];
  if (!movementPattern) return ["Choose a movement.", $("#exerciseMovement")];
  if (!equipment.length) return ["Choose at least one equipment option.", $("#chooseEquipmentButton")];
  if (!purpose) return ["Choose a purpose.", $("#exercisePurpose")];
  if (videoId === null) return ["Paste a YouTube link or its 11-character video ID.", $("#exerciseVideo")];
  return null;
}

function saveExercise() {
  const state = store.getState();
  const fields = {
    name: $("#exerciseName").value.trim(),
    aliases: $("#exerciseAliases").value.split(/\r?\n/).map((alias) => alias.trim()).filter(Boolean),
    primaryTargets: primaryTargetValues(),
    movementPattern: $("#exerciseMovement").value,
    equipment: [...editor.selections.equipment],
    purpose: $("#exercisePurpose").value,
    videoId: youtubeId($("#exerciseVideo").value),
  };
  const problem = formProblem(state, fields);
  if (problem) {
    showExerciseEditorError(...problem);
    return;
  }
  const exercise = {
    id: editor.exerciseId || makeId("exercise"),
    ...fields,
    secondaryTargets: [...editor.selections.secondaryTargets],
    style: $("#exerciseStyle").value,
    laterality: $("#exerciseLaterality").value,
    support: $("#exerciseSupport").value,
    emphases: [...editor.selections.emphases],
    typicalChallenge: $("#exerciseChallenge").value,
    defaultPrescription: $("#exercisePrescription").value.trim(),
    instructions: $("#exerciseInstructions").value.trim(),
  };
  const result = store.update((draft) => saveExerciseInState(draft, exercise, editor.related));
  const message = { add: "Exercise added.", edit: "Exercise updated.", duplicate: "Exercise duplicated." }[editor.mode];
  if (!report(result, message)) return;
  editor.returnId = exercise.id;
  closeDialog("#exerciseDialog");
  render();
}

// ---------- deleting ----------

function exerciseDeletionMessage(exercise, impact) {
  const routineCleanup = impact.programmedUses
    ? `Routine cleanup: ${plural(impact.alternativeChoicesRemoved, "alternative choice")} removed; ${plural(impact.preferredChoicesPromoted, "next choice")} promoted; ${plural(impact.slotsDeleted, "slot")} deleted with any saved checks.`
    : "No routine choices, slots, or saved checks will change.";
  return [
    `Delete “${exercise.name}”?`,
    `Programmed use: ${plural(impact.programmedUses, "slot")}.`,
    routineCleanup,
    `Related links removed: ${impact.relatedLinksRemoved}. This cannot be undone.`,
  ].join(" ");
}

async function deleteExercise() {
  const state = store.getState();
  const exercise = exerciseById(state, editor.exerciseId);
  const message = exerciseDeletionMessage(exercise, exerciseDeletionImpact(state, exercise.id));
  const confirmed = await confirmAction({
    title: "Delete exercise",
    message,
    confirmLabel: "Delete exercise",
    cancelLabel: "Keep exercise",
    variant: "exercise-delete",
  });
  if (!confirmed) return;
  const result = store.update((draft) => removeExercise(draft, exercise.id));
  if (!report(result, "Exercise deleted.")) return;
  closeDialog("#exerciseDialog");
  render();
}

// ---------- classification picker ----------

function classificationPickerConfig(kind) {
  return {
    secondaryTargets: {
      title: "Secondary involvement",
      hint: "Choose any targets involved beyond the ordered primary targets.",
      options: TARGETS,
      excluded: primaryTargetValues(),
    },
    equipment: {
      title: "Equipment",
      hint: "Choose every item normally needed for this exercise.",
      options: EQUIPMENT,
      excluded: [],
    },
    emphases: {
      title: "Emphasis",
      hint: "Optional. Leave clear when no stable emphasis applies.",
      options: EMPHASES,
      excluded: [],
    },
  }[kind];
}

function renderClassificationPicker() {
  const { options, excluded } = classificationPickerConfig(picker.kind);
  $("#classificationPickerOptions").innerHTML = classificationOptionPickerMarkup({ options, selected: picker.draft, excluded });
}

function openClassificationPicker(button) {
  const kind = button.dataset.classificationPicker;
  const config = classificationPickerConfig(kind);
  picker.kind = kind;
  picker.draft = [...editor.selections[kind]];
  $("#classificationPickerTitle").textContent = config.title;
  $("#classificationPickerHint").textContent = config.hint;
  renderClassificationPicker();
  openDialog("#classificationPickerDialog", {
    returnFocus: button,
    focus: () => $("#classificationPickerOptions button:not(:disabled)") || $("#saveClassificationPickerButton"),
  });
}

function toggleClassificationOption(option) {
  const value = option.dataset.classificationValue;
  picker.draft = picker.draft.includes(value) ? picker.draft.filter((item) => item !== value) : [...picker.draft, value];
  renderClassificationPicker();
  $(`[data-classification-value="${CSS.escape(value)}"]`).focus();
}

// ---------- related-exercise editor ----------

function renderRelatedEditor() {
  const state = store.getState();
  const linkedIds = new Set(relatedEditor.draft.map((related) => related.exerciseId));
  const candidates = state.exercises.filter((exercise) => exercise.id !== editor.exerciseId && !linkedIds.has(exercise.id));
  $("#alternativesList").innerHTML = relationshipEditorMarkup({
    linkedExercises: relatedEditor.draft.map((related) => ({ ...related, exercise: exerciseById(state, related.exerciseId) })),
    availableExercises: searchExercises(candidates, relatedEditor.query),
    query: relatedEditor.query,
  });
}

function openRelatedEditor(button) {
  relatedEditor.draft = structuredClone(editor.related);
  relatedEditor.query = "";
  $("#alternativesSearch").value = "";
  renderRelatedEditor();
  openDialog("#alternativesDialog", { returnFocus: button, focus: "#alternativesSearch" });
}

function addRelated(exerciseId) {
  relatedEditor.draft.push({ exerciseId, relation: "similar" });
  renderRelatedEditor();
  $(`[data-related-relation="${CSS.escape(exerciseId)}"]`).focus();
}

function removeRelated(exerciseId) {
  relatedEditor.draft = relatedEditor.draft.filter((related) => related.exerciseId !== exerciseId);
  renderRelatedEditor();
  ($(`[data-add-related="${CSS.escape(exerciseId)}"]`) || $("#alternativesSearch")).focus();
}

// ---------- events ----------

onStart(() => {
  const form = $("#exerciseForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveExercise();
  });
  form.addEventListener("click", (event) => {
    const button = event.target.closest("[data-classification-picker]");
    if (button) openClassificationPicker(button);
  });
  for (const id of ["#exercisePrimaryTarget1", "#exercisePrimaryTarget2"]) $(id).addEventListener("change", syncExerciseTargetOptions);
  for (const id of ["#exerciseStyle", "#exerciseLaterality", "#exerciseSupport", "#exerciseChallenge"]) $(id).addEventListener("change", updateExerciseEditorSummaries);
  $("#chooseAlternativesButton").addEventListener("click", (event) => openRelatedEditor(event.currentTarget));
  $("#duplicateExerciseButton").addEventListener("click", () => openExerciseEditor({ exerciseId: editor.exerciseId, duplicate: true }));
  $("#deleteExerciseButton").addEventListener("click", deleteExercise);

  $("#classificationPickerOptions").addEventListener("click", (event) => {
    const option = event.target.closest("[data-classification-value]");
    if (option) toggleClassificationOption(option);
  });
  $("#clearClassificationPickerButton").addEventListener("click", (event) => {
    picker.draft = [];
    renderClassificationPicker();
    event.currentTarget.focus();
  });
  $("#cancelClassificationPickerButton").addEventListener("click", () => closeDialog("#classificationPickerDialog"));
  $("#saveClassificationPickerButton").addEventListener("click", () => {
    editor.selections[picker.kind] = [...picker.draft];
    updateExerciseEditorSummaries();
    closeDialog("#classificationPickerDialog");
  });

  $("#alternativesSearch").addEventListener("input", (event) => {
    relatedEditor.query = event.target.value;
    renderRelatedEditor();
  });
  $("#alternativesList").addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-related]");
    const remove = event.target.closest("[data-remove-related]");
    if (add) addRelated(add.dataset.addRelated);
    else if (remove) removeRelated(remove.dataset.removeRelated);
  });
  $("#alternativesList").addEventListener("change", (event) => {
    const related = relatedEditor.draft.find((item) => item.exerciseId === event.target.dataset.relatedRelation);
    related.relation = event.target.value;
  });
  $("#cancelAlternativesButton").addEventListener("click", () => closeDialog("#alternativesDialog"));
  $("#saveAlternativesButton").addEventListener("click", () => {
    editor.related = structuredClone(relatedEditor.draft);
    updateRelatedCount();
    closeDialog("#alternativesDialog");
  });
});
