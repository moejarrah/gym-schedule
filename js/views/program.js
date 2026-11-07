// Program screen ("routines"): the active program's page with routine tabs and
// entry rows (hold-drag to reorder inside a block), the programs sheet (also
// opened from Workout), and the program, routine and block editors. Entry
// editing and the Library picker live in entry-editor.js.

import { mainElement, onStart, registerActions, registerView, render, runAction, store } from "../context.js";
import {
  $,
  $$,
  chevronIcon,
  closeDialog,
  confirmAction,
  downIcon,
  editIcon,
  enableHoldDrag,
  escapeHtml,
  openDialog,
  plural,
  report,
  showError,
} from "../dom.js";
import {
  activeProgram,
  activeRoutine,
  addRoutine,
  createProgram,
  duplicateProgram,
  makeId,
  moveEntryInBlock,
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
import { entryPresentation, revealSelectedTab, routineTabsMarkup } from "./shared.js";

// The program open in the program editor ("" while adding one).
const programEditor = { id: "" };
// The routine open in the routine editor ("" while adding one). Its blocks are
// edited as a draft and only saved with the routine; blockId is the block open
// in the block editor; drag is the blocks list's hold-drag handle.
const routineEditor = { id: "", blocks: [], blockId: "", drag: null };

// ---------- markup ----------

function programAppBarMarkup(program, routines) {
  return `<header class="program-appbar">
    <h1>Program</h1>
    ${program && routines.length ? `<button class="program-app-action" type="button" data-action="new-routine">+ Add routine</button>` : ""}
  </header>`;
}

function programBarMarkup(program) {
  const name = program?.name || "No program";
  return `<div class="program-page-bar">
    <button class="program-page-pick" type="button" data-action="open-programs" aria-label="${program ? `Choose active program, currently ${escapeHtml(name)}` : "Open programs"}">
      <span>Active</span>
      <strong>${escapeHtml(name)}</strong>
      ${downIcon()}
    </button>
    <button class="program-page-manage" type="button" data-action="open-programs" aria-label="Manage programs">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>`;
}

function programsListMarkup(state) {
  if (!state.programs.length) {
    return `<div class="empty-state compact-empty"><h3>No programs yet</h3><p>Add one to organize your workout days.</p></div>`;
  }

  return state.programs.map((program) => {
    const active = program.id === state.settings.activeProgramId;
    return `<div class="program-choice-row">
      <button class="program-choice-select" type="button" data-action="select-program" data-id="${escapeHtml(program.id)}" aria-pressed="${active}">
        <span class="${active ? "program-active-dot" : "program-active-slot"}" aria-hidden="true"></span>
        <span class="program-choice-copy">
          <strong>${escapeHtml(program.name)}</strong>
          <small>${plural(program.routineIds.length, "routine")}${active ? " · active" : ""}</small>
        </span>
      </button>
      <button class="program-choice-edit" type="button" data-action="edit-program" data-id="${escapeHtml(program.id)}" aria-label="Edit ${escapeHtml(program.name)}">
        ${chevronIcon("right")}
      </button>
    </div>`;
  }).join("");
}

function routineBlocksEditorMarkup(blocks, entries) {
  return blocks.map((block, index) => {
    const count = entries.filter((entry) => entry.blockId === block.id).length;
    const name = block.name.trim() || "Untitled block";
    return `<div class="routine-block-row" data-block-id="${escapeHtml(block.id)}">
      <span class="routine-block-grip" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8"/></svg></span>
      <button class="routine-block-edit" type="button" data-action="edit-routine-block" data-id="${escapeHtml(block.id)}" aria-label="Edit ${escapeHtml(name)}. Hold and drag to reorder.">
        <strong>${escapeHtml(name)}</strong>
        <small>${plural(count, "entry", "entries")} · ${index + 1} of ${blocks.length}</small>
      </button>
      <span class="routine-block-chevron" aria-hidden="true">${chevronIcon("right")}</span>
    </div>`;
  }).join("");
}

function programNoteMarkup(note) {
  if (!note.trim()) return "";
  const preview = note.split(/\r?\n/).find((line) => line.trim()) || note;
  return `<details class="program-note-disclosure">
    <summary>
      <span class="program-note-copy"><strong>Weekly layout &amp; rules</strong><small>${escapeHtml(preview)}</small></span>
      ${chevronIcon("right")}
    </summary>
    <p>${escapeHtml(note)}</p>
  </details>`;
}

function routineNoteMarkup(note) {
  if (!note.trim()) return "";
  return `<details class="program-routine-note">
    <summary><span>${escapeHtml(note.trim())}</span>${chevronIcon("down")}</summary>
    <p>${escapeHtml(note)}</p>
  </details>`;
}

function routineEntriesMarkup(state, routine) {
  let number = 0;
  return `<div class="program-entries">${routine.blocks.map((block) => {
    const entries = routine.entries.filter((entry) => entry.blockId === block.id);
    const name = block.name.trim();
    const optionalOnly = entries.length > 0 && entries.every((entry) => entry.role === "optional");
    const mixedRoles = entries.some((entry) => entry.role === "optional") && !optionalOnly;
    const showLabel = name || optionalOnly || routine.blocks.length > 1;
    const rows = entries.map((entry) => {
      const presentation = entryPresentation(entry, state);
      number += 1;
      const note = entry.note.trim();
      const content = `<span class="row-number">${number}</span>
        <span class="row-main">
          <span class="row-title">${escapeHtml(presentation.title)}</span>
          <span class="row-meta">${escapeHtml(presentation.prescription)}${mixedRoles && entry.role === "optional" ? `<span class="entry-role-tag">Optional</span>` : ""}</span>
          ${note ? `<span class="entry-note-preview">${escapeHtml(note)}</span>` : ""}
        </span>
        <span class="drag-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8"/></svg></span>`;
      return `<button class="program-row" type="button" data-action="edit-entry" data-id="${escapeHtml(entry.id)}" data-block-id="${escapeHtml(block.id)}" aria-label="${escapeHtml(presentation.title)}. Tap to edit. Hold and drag to reorder within ${escapeHtml(name || "this block")}.">${content}</button>`;
    }).join("");
    return `<section class="program-section" data-block-id="${escapeHtml(block.id)}">
      ${showLabel ? `<div class="program-section-label"><span>${escapeHtml(name)}</span>${optionalOnly ? `<span class="program-block-role">Optional</span>` : ""}</div>` : ""}
      <div class="program-list" data-block-id="${escapeHtml(block.id)}">${rows}</div>
      ${!entries.length ? `<p class="program-block-empty">No exercises in ${escapeHtml(name || "this block")}.</p>` : ""}
      <button class="add-row-button" type="button" data-action="open-picker" data-block-id="${escapeHtml(block.id)}">+ Add exercise</button>
    </section>`;
  }).join("")}</div>`;
}

function programMarkup(state) {
  const program = activeProgram(state);
  const routines = programRoutines(state, program);
  const routine = activeRoutine(state);
  return `<section class="page program-page">
    ${programAppBarMarkup(program, routines)}
    ${programBarMarkup(program)}
    ${program ? programNoteMarkup(program.note) : ""}
    ${routineTabsMarkup(routines, routine?.id)}
    ${routine ? routineNoteMarkup(routine.note) : ""}
    ${!program ? `<div class="program-empty-state"><h2>No programs yet</h2><p>Create a program, then add its workout days.</p><button class="button primary" type="button" data-action="new-program">Add program</button></div>` : routine ? `
      <div class="program-viewbar">
        <div class="program-viewbar-copy">
          <strong>${escapeHtml(routine.name)}</strong>
          <span>${routine.group === "home" ? "Home" : "Gym"} · ${routine.status === "optional" ? "Optional" : "Required"} · ${plural(routine.entries.length, "slot")} · ${plural(routine.blocks.length, "block")}</span>
        </div>
        <button class="program-view-edit" type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}" aria-label="Edit ${escapeHtml(routine.name)}">${editIcon()}</button>
      </div>
      ${routineEntriesMarkup(state, routine)}
    ` : `<div class="program-empty-state"><h2>No routines yet</h2><p>Add the first workout day to this program. Exercises will still come from your shared Library.</p><button class="button primary" type="button" data-action="new-routine">Add routine</button></div>`}
  </section>`;
}

// ---------- programs sheet and program editor ----------

// Where focus goes when the element that opened a program dialog was re-rendered away.
function programFocusFallback() {
  const main = mainElement();
  return $(".program-page-manage, .workout-program-pick, [data-action='new-program']", main) || main;
}

function openPrograms(returnFocus) {
  $("#programsList").innerHTML = programsListMarkup(store.getState());
  $("#programsFormError").textContent = "";
  openDialog("#programsDialog", { returnFocus, fallbackFocus: programFocusFallback });
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
  $("#programStartMode").value = mode;
  for (const button of $$("#programStartModeOptions [data-mode]")) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
  }
  const source = $("#programDuplicateSource");
  source.disabled = mode !== "duplicate";
  $("#programDuplicateSourceField").classList.toggle("is-disabled", source.disabled);
}

// Opens the editor for a program, or for a new one (empty, or a copy of duplicateSourceId).
function openProgramEditor(id = "", { duplicateSourceId = "", returnFocus = document.activeElement } = {}) {
  const state = store.getState();
  const program = state.programs.find((item) => item.id === id) || null;
  const source = state.programs.find((item) => item.id === duplicateSourceId) || null;
  closeDialog("#programsDialog", { restoreFocus: false });
  // "Duplicate program" reopens this editor as a new program.
  closeDialog("#programDialog", { restoreFocus: false });
  programEditor.id = program?.id || "";

  const sourceSelect = $("#programDuplicateSource");
  sourceSelect.innerHTML = state.programs.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  if (state.programs.length) sourceSelect.value = source?.id || state.settings.activeProgramId || state.programs[0].id;
  $('#programStartModeOptions [data-mode="duplicate"]').disabled = !state.programs.length;
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

  const dialog = $("#programDialog");
  dialog.classList.toggle("compact-dialog", Boolean(program));
  openDialog(dialog, { returnFocus, fallbackFocus: programFocusFallback, focus: "#programName" });
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
  const sourceId = $("#programStartMode").value === "duplicate" ? $("#programDuplicateSource").value : "";
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
  // The confirmation replaces the editor; keeping the program brings the editor back.
  closeDialog("#programDialog", { restoreFocus: false });
  const confirmed = await confirmAction({
    title: `Delete ${program.name}?`,
    message: `This removes ${plural(program.routineIds.length, "routine")} and their saved checks. Past completions stay in Log, and master exercises stay in the Library.`,
    confirmLabel: "Delete program",
    cancelLabel: "Keep program",
    variant: "program-delete",
  });
  if (!confirmed) {
    openProgramEditor(id, { returnFocus: null });
    return;
  }
  const result = store.update((draft) => removeProgram(draft, id));
  if (!result.ok) {
    openProgramEditor(id, { returnFocus: null });
    report(result);
    return;
  }
  report(result, "Program deleted.");
  render();
  mainElement().scrollTop = 0;
  programFocusFallback().focus({ preventScroll: true });
}

// ---------- routine editor ----------

function routineFocusFallback() {
  const main = mainElement();
  const edit = routineEditor.id && $(`.program-view-edit[data-id="${CSS.escape(routineEditor.id)}"]`, main);
  return edit || $(".program-app-action, [data-action='new-routine'], .program-page-manage", main) || main;
}

function setRoutineOption(kind, value) {
  const key = kind === "group" ? "Group" : "Status";
  $(`#routine${key}`).value = value;
  for (const button of $$(`#routine${key}Options button`)) {
    button.setAttribute("aria-pressed", String(button.dataset[`routine${key}`] === value));
  }
}

function updateRoutineMoveButtons() {
  const program = routineProgram(store.getState(), routineEditor.id);
  const index = program?.routineIds.indexOf(routineEditor.id) ?? -1;
  $("#moveRoutineEarlierButton").disabled = index <= 0;
  $("#moveRoutineLaterButton").disabled = index < 0 || index === program.routineIds.length - 1;
}

function openRoutineEditor(id = "", returnFocus = document.activeElement) {
  const routine = routineById(store.getState(), id);
  routineEditor.id = routine?.id || "";
  routineEditor.blocks = structuredClone(routine?.blocks || [{ id: makeId("block"), name: "" }]);
  $("#routineDialogTitle").textContent = routine ? `Edit ${routine.name}` : "Add routine";
  $("#routineName").value = routine?.name || "";
  $("#routineNote").value = routine?.note || "";
  setRoutineOption("group", routine?.group || "gym");
  setRoutineOption("status", routine?.status || "required");
  $("#routineFormError").textContent = "";
  $("#routineEditActions").hidden = !routine;
  updateRoutineMoveButtons();
  renderBlocksEditor();
  openDialog("#routineDialog", {
    returnFocus,
    fallbackFocus: routineFocusFallback,
    focus: "#routineName",
    onClose: () => routineEditor.drag.cancel(),
  });
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
    group: $("#routineGroup").value,
    status: $("#routineStatus").value,
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
  // The confirmation replaces the editor; keeping the routine brings the editor back.
  closeDialog("#routineDialog", { restoreFocus: false });
  const confirmed = await confirmAction({
    title: `Delete ${routine.name}?`,
    message: "This removes the routine and its saved checks. Past completions stay in Log, and master exercises stay in the Library.",
    confirmLabel: "Delete routine",
    cancelLabel: "Keep routine",
    variant: "routine-delete",
  });
  if (!confirmed) {
    openRoutineEditor(id, null);
    return;
  }
  const result = store.update((draft) => removeRoutine(draft, id));
  if (!result.ok) {
    openRoutineEditor(id, null);
    report(result);
    return;
  }
  report(result, "Routine deleted.");
  render();
  const main = mainElement();
  const target = $(".routine-tab[aria-pressed='true']", main)
    || $(".program-empty-state [data-action='new-routine']", main)
    || $(".program-page-manage", main);
  target.focus({ preventScroll: true });
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

function blockEditButton(blockId) {
  return $(`#routineBlocksList .routine-block-edit[data-id="${CSS.escape(blockId)}"]`);
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
  const index = blocks.findIndex((block) => block.id === blockId);
  $("#moveBlockEarlierButton").disabled = index <= 0;
  $("#moveBlockLaterButton").disabled = index === blocks.length - 1;
  $("#deleteBlockButton").disabled = blocks.length <= 1 || savedBlockEntryCount(blockId) > 0;
}

function openBlockEditor(blockId, returnFocus) {
  routineEditor.blockId = blockId;
  $("#routineBlockName").value = editedBlock().name;
  $("#routineBlockDialogSubtitle").textContent = plural(savedBlockEntryCount(blockId), "entry", "entries");
  $("#routineBlockFormError").textContent = "";
  updateBlockButtons();
  openDialog("#routineBlockDialog", {
    returnFocus,
    fallbackFocus: () => blockEditButton(routineEditor.blockId) || $("#addRoutineBlockButton"),
    focus: "#routineBlockName",
  });
}

function syncBlockName() {
  editedBlock().name = $("#routineBlockName").value;
}

function moveBlockBy(direction) {
  syncBlockName();
  const index = routineEditor.blocks.findIndex((block) => block.id === routineEditor.blockId);
  moveBlockDraft(routineEditor.blockId, index + direction);
  updateBlockButtons();
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
  openBlockEditor(block.id, blockEditButton(block.id));
}

// ---------- registration ----------

registerView("routines", {
  render(state, main) {
    main.innerHTML = programMarkup(state);
    revealSelectedTab(main);
  },
});

registerActions({
  "open-programs": (button) => openPrograms(button),
  "select-program": (button) => selectProgram(button.dataset.id),
  "new-program": (button) => openProgramEditor("", { returnFocus: button }),
  "edit-program": (button) => openProgramEditor(button.dataset.id, { returnFocus: button }),
  "new-routine": (button) => openRoutineEditor("", button),
  "edit-routine": (button) => openRoutineEditor(button.dataset.id, button),
  "edit-entry": (button) => openEntryEditor(button.dataset.id, button),
  "open-picker": (button) => openPicker({ blockId: button.dataset.blockId, mode: "entry", returnFocus: button }),
});

onStart(() => {
  const main = mainElement();
  enableHoldDrag(main, {
    rowSelector: ".program-row",
    listSelector: ".program-list",
    placeholderClass: "program-row-placeholder",
    activeBodyClass: "entry-drag-active",
    scroller: mainElement,
    onDrop(row, toIndex) {
      const routineId = store.getState().settings.activeRoutineId;
      const result = store.update((draft) => moveEntryInBlock(draft, routineId, row.dataset.id, toIndex));
      report(result, "Exercise moved.");
      render();
    },
  });

  // The programs sheet's rows use the same actions as the page.
  $("#programsList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button) runAction(button.dataset.action, button, event);
  });
  $("#newProgramButton").addEventListener("click", (event) => openProgramEditor("", { returnFocus: event.currentTarget }));
  $("#programStartModeOptions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (button && !button.disabled) setProgramStartMode(button.dataset.mode);
  });
  $("#programForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveProgram();
  });
  $("#duplicateProgramButton").addEventListener("click", () => openProgramEditor("", { duplicateSourceId: programEditor.id }));
  $("#deleteProgramButton").addEventListener("click", deleteProgram);

  $("#routineGroupOptions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-routine-group]");
    if (button) setRoutineOption("group", button.dataset.routineGroup);
  });
  $("#routineStatusOptions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-routine-status]");
    if (button) setRoutineOption("status", button.dataset.routineStatus);
  });
  $("#routineForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveRoutine();
  });
  $("#moveRoutineEarlierButton").addEventListener("click", () => moveRoutineBy(-1));
  $("#moveRoutineLaterButton").addEventListener("click", () => moveRoutineBy(1));
  $("#deleteRoutineButton").addEventListener("click", deleteRoutine);

  const blocksList = $("#routineBlocksList");
  routineEditor.drag = enableHoldDrag(blocksList, {
    rowSelector: ".routine-block-row",
    listSelector: ".routine-block-list",
    placeholderClass: "routine-block-placeholder",
    activeBodyClass: "routine-block-drag-active",
    scroller: () => $(".routine-sheet-scroll"),
    onDrop: (row, toIndex) => moveBlockDraft(row.dataset.blockId, toIndex),
  });
  blocksList.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit-routine-block"]');
    if (button) openBlockEditor(button.dataset.id, button);
  });
  $("#addRoutineBlockButton").addEventListener("click", addBlock);
  $("#routineBlockForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveBlock();
  });
  $("#moveBlockEarlierButton").addEventListener("click", () => moveBlockBy(-1));
  $("#moveBlockLaterButton").addEventListener("click", () => moveBlockBy(1));
  $("#deleteBlockButton").addEventListener("click", deleteBlock);
});
