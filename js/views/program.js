// Program screen ("routines"): the active program's page with routine tabs and
// entry rows (hold-drag to reorder inside a block), the programs sheet (also
// opened from Workout), and the program, routine and block editors. Entry
// editing and the Library picker live in entry-editor.js.

import { mainElement, registerActions, registerView, render, store } from "../context.js";
import {
  $,
  chevronIcon,
  closeDialog,
  confirmAction,
  editIcon,
  enableHoldDrag,
  escapeHtml,
  openDialog,
  plural,
  report,
  segmentValue,
  setSegment,
  showError,
} from "../dom.js";
import {
  activeProgram,
  activeRoutine,
  addRoutine,
  createProgram,
  duplicateProgram,
  makeId,
  moveEntry,
  moveRoutine,
  programRoutines,
  removeProgram,
  removeRoutine,
  routineById,
  routineProgram,
  setActiveProgram,
  updateProgram,
  updateRoutine,
} from "../model.js";
import { openEntryEditor, openPicker } from "./entry-editor.js";
import { entryPresentation, locationLabel, revealSelectedTab, routineTabsMarkup, saysOptional } from "./shared.js";

// The program open in the program editor ("" while adding one).
const programEditor = { id: "" };
// The routine open in the routine editor ("" while adding one). Its blocks are
// edited as a draft and only saved with the routine; blockId is the block open
// in the block editor.
const routineEditor = { id: "", blocks: [], blockId: "" };

// ---------- markup ----------

function programAppBarMarkup(program, routines) {
  return `<header class="appbar">
    <h1 class="title">Program</h1>
    ${program && routines.length ? `<button class="button" type="button" data-action="new-routine">+ Add routine</button>` : ""}
  </header>`;
}

function programBarMarkup(program) {
  const name = program?.name || "No program";
  return `<div class="bar">
    <button class="bar-pick tap" type="button" data-action="open-programs" aria-label="${program ? `Choose active program, currently ${escapeHtml(name)}` : "Open programs"}">
      <span class="label tag active">Active</span>
      <strong class="truncate">${escapeHtml(name)}</strong>
      ${chevronIcon("down")}
    </button>
    <button class="icon-button" type="button" data-action="open-programs" aria-label="Manage programs">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>`;
}

function programsListMarkup(state) {
  if (!state.programs.length) {
    return `<div class="empty"><h3>No programs yet</h3><p>Add one to organize your workout days.</p></div>`;
  }

  return state.programs.map((program) => {
    const active = program.id === state.settings.activeProgramId;
    return `<div class="row split tall">
      <button class="row-body" type="button" data-action="select-program" data-id="${escapeHtml(program.id)}" aria-pressed="${active}">
        <span class="dot" aria-hidden="true"></span>
        <span class="row-main">
          <strong class="row-title truncate">${escapeHtml(program.name)}</strong>
          <small class="row-meta truncate">${plural(program.routineIds.length, "routine")}${active ? " · active" : ""}</small>
        </span>
      </button>
      <button class="icon-button sm" type="button" data-action="edit-program" data-id="${escapeHtml(program.id)}" aria-label="Edit ${escapeHtml(program.name)}">
        ${chevronIcon("right")}
      </button>
    </div>`;
  }).join("");
}

function routineBlocksEditorMarkup(blocks, entries) {
  return blocks.map((block, index) => {
    const count = entries.filter((entry) => entry.blockId === block.id).length;
    const name = block.name.trim() || "Main";
    return `<div class="row split drag-row" data-block-id="${escapeHtml(block.id)}">
      <span class="grip" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8"/></svg></span>
      <button class="row-main" type="button" data-action="edit-routine-block" data-id="${escapeHtml(block.id)}" aria-label="Edit ${escapeHtml(name)}. Hold and drag to reorder.">
        <strong class="row-title truncate">${escapeHtml(name)}</strong>
        <small class="row-meta truncate">${plural(count, "entry", "entries")} · ${index + 1} of ${blocks.length}</small>
      </button>
      <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
    </div>`;
  }).join("");
}

function programNoteMarkup(note) {
  if (!note.trim()) return "";
  const preview = note.split(/\r?\n/).find((line) => line.trim()) || note;
  return `<details class="note program-note">
    <summary>
      <span class="row-main"><strong class="row-title truncate">Weekly layout &amp; rules</strong><small class="row-meta truncate">${escapeHtml(preview)}</small></span>
      ${chevronIcon("right")}
    </summary>
    <p class="hint">${escapeHtml(note)}</p>
  </details>`;
}

function routineNoteMarkup(note) {
  if (!note.trim()) return "";
  return `<details class="note">
    <summary><span class="hint clamp-2">${escapeHtml(note.trim())}</span>${chevronIcon("down")}</summary>
    <p class="hint">${escapeHtml(note)}</p>
  </details>`;
}

function routineEntriesMarkup(state, routine) {
  let number = 0;
  return `<div>${routine.blocks.map((block) => {
    const entries = routine.entries.filter((entry) => entry.blockId === block.id);
    const name = block.name.trim();
    const optionalOnly = entries.length > 0 && entries.every((entry) => entry.role === "optional");
    const mixedRoles = entries.some((entry) => entry.role === "optional") && !optionalOnly;
    // An unnamed block has no label; "+ Add exercise" already ends the block above it.
    const showLabel = name || optionalOnly;
    const rows = entries.map((entry) => {
      const presentation = entryPresentation(entry, state);
      number += 1;
      const note = entry.note.trim();
      const content = `<span class="row-number">${number}</span>
        <span class="row-main">
          <span class="row-title">${escapeHtml(presentation.title)}</span>
          <span class="row-meta">${escapeHtml(presentation.prescription)}${mixedRoles && entry.role === "optional" ? `<span class="label tag">Optional</span>` : ""}</span>
          ${note ? `<span class="row-meta clamp-2 faint">${escapeHtml(note)}</span>` : ""}
        </span>
        <span class="grip" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8"/></svg></span>`;
      return `<button class="row drag-row" type="button" data-action="edit-entry" data-id="${escapeHtml(entry.id)}" data-block-id="${escapeHtml(block.id)}" aria-label="${escapeHtml(presentation.title)}. Tap to edit. Hold and drag to reorder within ${escapeHtml(name || "this block")}.">${content}</button>`;
    }).join("");
    return `<section data-block-id="${escapeHtml(block.id)}">
      ${showLabel ? `<div class="label section-label"><span>${escapeHtml(name)}</span>${optionalOnly && !saysOptional(name) ? `<span>Optional</span>` : ""}</div>` : ""}
      <div class="drag-list" data-block-id="${escapeHtml(block.id)}">${rows}</div>
      ${!entries.length ? `<p class="hint">No exercises in ${escapeHtml(name || "this block")}.</p>` : ""}
      <button class="row compact link-button" type="button" data-action="open-picker" data-block-id="${escapeHtml(block.id)}">+ Add exercise</button>
    </section>`;
  }).join("")}</div>`;
}

function programMarkup(state) {
  const program = activeProgram(state);
  const routines = programRoutines(state, program);
  const routine = activeRoutine(state);
  return `<section class="page">
    ${programAppBarMarkup(program, routines)}
    ${programBarMarkup(program)}
    ${program ? programNoteMarkup(program.note) : ""}
    ${routineTabsMarkup(routines, routine?.id)}
    ${routine ? routineNoteMarkup(routine.note) : ""}
    ${!program ? `<div class="empty"><h2>No programs yet</h2><p>Create a program, then add its workout days.</p><button class="button primary" type="button" data-action="new-program">Add program</button></div>` : routine ? `
      <div class="bar">
        <div class="row-main">
          <strong class="bar-title truncate">${escapeHtml(routine.name)}</strong>
          <span class="row-meta truncate">${locationLabel(routine.group)} · ${routine.status === "optional" ? "Optional" : "Required"} · ${plural(routine.entries.length, "slot")} · ${plural(routine.blocks.length, "block")}</span>
        </div>
        <button class="icon-button" type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}" aria-label="Edit ${escapeHtml(routine.name)}">${editIcon()}</button>
      </div>
      ${routineEntriesMarkup(state, routine)}
    ` : `<div class="empty"><h2>No routines yet</h2><p>Add the first workout day to this program. Exercises will still come from your shared Library.</p><button class="button primary" type="button" data-action="new-routine">Add routine</button></div>`}
  </section>`;
}

// ---------- programs sheet and program editor ----------

function openPrograms() {
  $("#programsList").innerHTML = programsListMarkup(store.getState());
  $("#programsFormError").textContent = "";
  openDialog("#programsDialog");
}

function selectProgram(id) {
  const result = store.update((draft) => setActiveProgram(draft, id));
  if (report(result, "Program selected.")) {
    closeDialog("#programsDialog");
    render();
    mainElement().scrollTop = 0;
  }
}

function setProgramStartMode(mode) {
  setSegment("#programStartModeOptions", mode);
  const source = $("#programDuplicateSource");
  source.disabled = mode !== "duplicate";
  $("#programDuplicateSourceField").classList.toggle("is-disabled", source.disabled);
}

// Opens the editor for a program, or for a new one (empty, or a copy of duplicateSourceId).
function openProgramEditor(id = "", duplicateSourceId = "") {
  const state = store.getState();
  const program = state.programs.find((item) => item.id === id) || null;
  const source = state.programs.find((item) => item.id === duplicateSourceId) || null;
  closeDialog("#programsDialog");
  // "Duplicate program" reopens this editor as a new program.
  closeDialog("#programDialog");
  programEditor.id = program?.id || "";

  const sourceSelect = $("#programDuplicateSource");
  sourceSelect.innerHTML = state.programs.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  if (state.programs.length) sourceSelect.value = source?.id || state.settings.activeProgramId || state.programs[0].id;
  $('#programStartModeOptions [data-value="duplicate"]').disabled = !state.programs.length;
  setProgramStartMode(source ? "duplicate" : "empty");

  $("#programDialogTitle").textContent = program ? "Edit program" : "Add program";
  $("#programDialogSubtitle").hidden = Boolean(program);
  $("#programName").value = program?.name || (source ? `${source.name} copy` : "");
  $("#programNote").value = program?.note || source?.note || "";
  $("#programCreateFields").hidden = Boolean(program);
  $("#programEditActions").hidden = !program;
  $("#programCancelButton").hidden = Boolean(program);
  $("#programSaveButton").textContent = program ? "Save changes" : "Create program";
  $("#programFormError").textContent = "";

  openDialog("#programDialog");
}

function saveProgram() {
  const state = store.getState();
  const { id } = programEditor;
  const name = $("#programName").value.trim();
  const note = $("#programNote").value;
  if (!name) {
    showError("Enter a program name.");
    return;
  }
  if (state.programs.some((program) => program.id !== id && program.name.toLowerCase() === name.toLowerCase())) {
    showError("A program with this name already exists.");
    return;
  }
  const sourceId = segmentValue("#programStartModeOptions") === "duplicate" ? $("#programDuplicateSource").value : "";
  const result = store.update((draft) => {
    if (id) updateProgram(draft, id, { name, note });
    else if (sourceId) duplicateProgram(draft, sourceId, { name, note });
    else createProgram(draft, { name, note });
  });
  if (report(result, id ? "Program updated." : "Program created.")) {
    closeDialog("#programDialog");
    render();
    mainElement().scrollTop = 0;
  }
}

async function deleteProgram() {
  const { id } = programEditor;
  const program = store.getState().programs.find((item) => item.id === id);
  // The confirmation opens over the editor, so "Keep program" returns to the unsaved draft.
  const confirmed = await confirmAction({
    title: `Delete ${program.name}?`,
    message: `This removes ${plural(program.routineIds.length, "routine")} and their saved checks. Past completions stay in Log, and master exercises stay in the Library.`,
    confirmLabel: "Delete program",
    cancelLabel: "Keep program",
    variant: "program-delete",
  });
  if (!confirmed) return;
  const result = store.update((draft) => removeProgram(draft, id));
  if (!report(result, "Program deleted.")) return;
  closeDialog("#programDialog");
  render();
  mainElement().scrollTop = 0;
}

// ---------- routine editor ----------

function updateRoutineMoveButtons() {
  const program = routineProgram(store.getState(), routineEditor.id);
  const index = program?.routineIds.indexOf(routineEditor.id) ?? -1;
  $("#moveRoutineEarlierButton").disabled = index <= 0;
  $("#moveRoutineLaterButton").disabled = index < 0 || index === program.routineIds.length - 1;
}

function openRoutineEditor(id = "") {
  const routine = routineById(store.getState(), id);
  routineEditor.id = routine?.id || "";
  routineEditor.blocks = structuredClone(routine?.blocks || [{ id: makeId("block"), name: "" }]);
  $("#routineDialogTitle").textContent = routine ? `Edit ${routine.name}` : "Add routine";
  $("#routineName").value = routine?.name || "";
  $("#routineNote").value = routine?.note || "";
  setSegment("#routineGroupOptions", routine?.group || "gym");
  setSegment("#routineStatusOptions", routine?.status || "required");
  $("#routineFormError").textContent = "";
  $("#routineEditActions").hidden = !routine;
  updateRoutineMoveButtons();
  renderBlocksEditor();
  openDialog("#routineDialog", { onClose: () => blocksDrag.cancel() });
}

// Moves the saved routine right away, like the old app; the rest of the draft stays unsaved.
function moveRoutineBy(direction) {
  const { id } = routineEditor;
  const result = store.update((draft) => moveRoutine(draft, id, routineProgram(draft, id).routineIds.indexOf(id) + direction));
  if (report(result, "Routine moved.")) {
    render();
    updateRoutineMoveButtons();
  }
}

function saveRoutine() {
  const state = store.getState();
  const { id } = routineEditor;
  const name = $("#routineName").value.trim();
  if (!name) {
    showError("Enter a routine name.");
    return;
  }
  const owner = id ? routineProgram(state, id) : activeProgram(state);
  if (programRoutines(state, owner).some((routine) => routine.id !== id && routine.name.toLowerCase() === name.toLowerCase())) {
    showError("A routine with this name already exists.");
    return;
  }
  const fields = {
    name,
    group: segmentValue("#routineGroupOptions"),
    status: segmentValue("#routineStatusOptions"),
    note: $("#routineNote").value,
    blocks: routineEditor.blocks,
  };
  const result = store.update((draft) => {
    if (id) updateRoutine(draft, id, fields);
    else addRoutine(draft, owner.id, fields);
  });
  if (report(result, id ? "Routine updated." : "Routine added.")) {
    closeDialog("#routineDialog");
    render();
  }
}

async function deleteRoutine() {
  const { id } = routineEditor;
  const routine = routineById(store.getState(), id);
  // The confirmation opens over the editor, so "Keep routine" returns to the unsaved draft.
  const confirmed = await confirmAction({
    title: `Delete ${routine.name}?`,
    message: "This removes the routine and its saved checks. Past completions stay in Log, and master exercises stay in the Library.",
    confirmLabel: "Delete routine",
    cancelLabel: "Keep routine",
    variant: "routine-delete",
  });
  if (!confirmed) return;
  const result = store.update((draft) => removeRoutine(draft, id));
  if (!report(result, "Routine deleted.")) return;
  closeDialog("#routineDialog");
  render();
}

// ---------- routine blocks (draft) ----------

function savedBlockEntryCount(blockId) {
  const routine = routineById(store.getState(), routineEditor.id);
  return routine?.entries.filter((entry) => entry.blockId === blockId).length || 0;
}

function renderBlocksEditor() {
  const routine = routineById(store.getState(), routineEditor.id);
  $("#routineBlocksList").innerHTML = routineBlocksEditorMarkup(routineEditor.blocks, routine?.entries || []);
}

function moveBlockDraft(blockId, toIndex) {
  const { blocks } = routineEditor;
  const [block] = blocks.splice(blocks.findIndex((item) => item.id === blockId), 1);
  blocks.splice(toIndex, 0, block);
  renderBlocksEditor();
}

function editedBlock() {
  return routineEditor.blocks.find((block) => block.id === routineEditor.blockId);
}

function updateBlockButtons() {
  const { blocks, blockId } = routineEditor;
  $("#deleteBlockButton").disabled = blocks.length <= 1 || savedBlockEntryCount(blockId) > 0;
}

function openBlockEditor(blockId) {
  routineEditor.blockId = blockId;
  $("#routineBlockName").value = editedBlock().name;
  $("#routineBlockDialogSubtitle").textContent = plural(savedBlockEntryCount(blockId), "entry", "entries");
  $("#routineBlockFormError").textContent = "";
  updateBlockButtons();
  openDialog("#routineBlockDialog");
}

function syncBlockName() {
  editedBlock().name = $("#routineBlockName").value;
}

function saveBlock() {
  syncBlockName();
  renderBlocksEditor();
  closeDialog("#routineBlockDialog");
}

function deleteBlock() {
  routineEditor.blocks = routineEditor.blocks.filter((block) => block.id !== routineEditor.blockId);
  renderBlocksEditor();
  closeDialog("#routineBlockDialog");
}

function addBlock() {
  const block = { id: makeId("block"), name: "" };
  routineEditor.blocks.push(block);
  renderBlocksEditor();
  openBlockEditor(block.id);
}

// ---------- registration ----------

registerView("routines", { markup: programMarkup, afterDraw: revealSelectedTab });

registerActions({
  "open-programs": openPrograms,
  "select-program": (button) => selectProgram(button.dataset.id),
  "new-program": () => openProgramEditor(),
  "edit-program": (button) => openProgramEditor(button.dataset.id),
  "set-program-start-mode": (button) => setProgramStartMode(button.dataset.value),
  "save-program": saveProgram,
  "duplicate-program": () => openProgramEditor("", programEditor.id),
  "delete-program": deleteProgram,

  "new-routine": () => openRoutineEditor(),
  "edit-routine": (button) => openRoutineEditor(button.dataset.id),
  "save-routine": saveRoutine,
  "move-routine": (button) => moveRoutineBy(Number(button.dataset.by)),
  "delete-routine": deleteRoutine,

  "add-routine-block": addBlock,
  "edit-routine-block": (button) => openBlockEditor(button.dataset.id),
  "save-routine-block": saveBlock,
  "delete-routine-block": deleteBlock,

  "edit-entry": (button) => openEntryEditor(button.dataset.id),
  "open-picker": (button) => openPicker({ blockId: button.dataset.blockId, mode: "entry" }),
});

// Hold and drag: entries inside their block on the page, blocks in the routine editor.
enableHoldDrag(mainElement(), {
  rowSelector: ".drag-row",
  listSelector: ".drag-list",
  placeholderClass: "drag-placeholder",
  activeBodyClass: "drag-active",
  scroller: mainElement,
  acrossLists: true,
  onDrop(row, toIndex, list) {
    const routineId = store.getState().settings.activeRoutineId;
    const result = store.update((draft) => moveEntry(draft, routineId, row.dataset.id, list.dataset.blockId, toIndex));
    report(result, "Exercise moved.");
    render();
  },
});
const blocksDrag = enableHoldDrag($("#routineBlocksList"), {
  rowSelector: ".drag-row",
  listSelector: ".drag-list",
  placeholderClass: "drag-placeholder",
  activeBodyClass: "drag-active",
  scroller: () => $("#routineDialog .sheet-body"),
  onDrop: (row, toIndex) => moveBlockDraft(row.dataset.blockId, toIndex),
});
