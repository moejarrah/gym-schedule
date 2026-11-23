// Program screen ("routines"). It is for looking things up first and changing
// second, and looking is separate from following: the screen keeps its own note of
// which program and routine it shows (`shown`, not saved) and never changes the
// program being followed or the routine selected on Workout.
// - View mode: the routine as the quiet list Workout draws, one slot open in place.
// - Edit mode ("Edit" … "Done"): the same list as an editor, with hold-drag to reorder.
// Also here: the programs sheet and the program, routine and block editors. Entry
// editing and the Library picker live in entry-editor.js.

import { mainElement, registerActions, registerView, render, scrollToTop, store } from "../context.js";
import {
  $,
  chevronIcon,
  closeDialog,
  confirmAction,
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
  addRoutine,
  createProgram,
  duplicateProgram,
  entryNumber,
  exerciseHistory,
  lastFinished,
  makeId,
  moveEntry,
  moveRoutine,
  programRoutines,
  removeProgram,
  removeRoutine,
  roundProgram,
  routineById,
  routineProgram,
  updateProgram,
  updateRoutine,
} from "../model.js";
import { openEntryEditor, openPicker } from "./entry-editor.js";
import { alternativeNames, entryPresentation, exerciseFactLines, movementMarkup, revealSelectedTab, routineTabsMarkup, saysOptional, setsSummary, shortDate, slotMotion, videoUrl } from "./shared.js";

// What the screen shows. `programId` is "" while it simply shows the program being
// followed; `routineId` falls back to the program's first routine; `slotId` is the
// slot open in view mode ("" = none).
const shown = { programId: "", routineId: "", slotId: "", editing: false };
// The program open in the program editor ("" while adding one).
const programEditor = { id: "" };
// The routine open in the routine editor ("" while adding one). Its blocks are
// edited as a draft and only saved with the routine; blockId is the block open
// in the block editor.
const routineEditor = { id: "", blocks: [], blockId: "" };

// The program and routine on screen, and the program being followed. What `shown`
// points at may be gone (deleted, or replaced by an imported backup): it is repaired
// here. The followed program is kept as "", so the screen follows a later change of it.
function looking(state) {
  const followed = roundProgram(state);
  const program = state.programs.find((item) => item.id === shown.programId) || followed || state.programs[0] || null;
  shown.programId = program && program.id !== followed?.id ? program.id : "";
  const routines = programRoutines(state, program);
  const routine = routines.find((item) => item.id === shown.routineId) || routines[0] || null;
  if (routine?.id !== shown.routineId) Object.assign(shown, { routineId: routine?.id || "", slotId: "" });
  return { program, routines, routine, followed };
}

// Shows another program, from its first routine.
function show(programId) {
  Object.assign(shown, { programId, routineId: "", slotId: "" });
}

// ---------- markup ----------

const gripIcon = `<span class="grip" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8"/></svg></span>`;

// The header: the program's name (a dot before it when it is the one being followed)
// opens the programs sheet; Edit turns the screen into the editor and Done turns it
// back. A program with no routines has nothing to switch: its screen offers the first one.
function headMarkup(program, followed, hasRoutines) {
  if (!program) return `<header class="appbar program-head"><h1 class="title">No program</h1></header>`;
  const name = escapeHtml(program.name);
  const isFollowed = program.id === followed?.id;
  return `<header class="appbar program-head">
    <h1 class="title">
      <button class="bar-pick tap" type="button" data-action="open-programs" aria-label="Look at another program, showing ${name}${isFollowed ? ", the one you're following" : ""}">
        ${isFollowed ? `<i class="dot is-on" aria-hidden="true"></i>` : ""}
        <strong class="truncate">${name}</strong>
        ${chevronIcon("down")}
      </button>
    </h1>
    ${hasRoutines ? `<button class="program-mode ${shown.editing ? "is-editing" : ""}" type="button" data-action="toggle-program-edit" aria-label="${shown.editing ? "Done editing" : `Edit ${name}`}"><span>${shown.editing ? "Done" : "Edit"}</span></button>` : ""}
  </header>
  ${isFollowed || !followed ? "" : `<div class="program-line">
    <span class="truncate">You're following ${escapeHtml(followed.name)}</span>
    <button class="link-button" type="button" data-action="follow-program" data-id="${escapeHtml(program.id)}"><span class="truncate">Follow ${name}</span></button>
  </div>`}`;
}

// The routine tabs; in edit mode "+ Workout" ends the strip.
function tabsMarkup(routines, routine) {
  const tabs = routineTabsMarkup(routines, routine?.id, null, "view-routine");
  if (!tabs || !shown.editing) return tabs;
  return `${tabs.slice(0, tabs.lastIndexOf("</div>"))}<button class="link-button tab-add" type="button" data-action="new-routine" aria-label="Add a workout">+ Workout</button></div>`;
}

// One line under the tabs. Viewing: a fact at each end. Editing: the two things that
// aren't on the list itself.
function routineLineMarkup(state, program, routine) {
  if (shown.editing) {
    return `<div class="program-line is-ruled">
      <button class="link-button" type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}" aria-label="Edit ${escapeHtml(routine.name)}: rename, notes, blocks">Rename, notes, blocks</button>
      <button class="link-button" type="button" data-action="edit-program" data-id="${escapeHtml(program.id)}">Program rules</button>
    </div>`;
  }
  const last = lastFinished(state, routine.id, "9999-12-31");
  return `<div class="program-line is-ruled">
    <span>${plural(routine.entries.length, "exercise")}</span>
    <span>${last ? `last done ${escapeHtml(shortDate(last))}` : "not done yet"}</span>
  </div>`;
}

function routineNoteMarkup(note) {
  if (!note.trim()) return "";
  return `<details class="note" data-keep-open="routine-note">
    <summary><span class="hint clamp-2">${escapeHtml(note.trim())}</span>${chevronIcon("down")}</summary>
    <p class="hint">${escapeHtml(note)}</p>
  </details>`;
}

// View mode. One slot, drawn as Workout draws it: its number, its movement ("+1" when
// it has alternatives) and its prescription at the end. The open one unfolds its
// labelled lines and the buttons that look things up. Nothing here changes anything.
function slotMarkup(state, routine, entry, showOptionalRole) {
  const { choices, preferred, title, prescription } = entryPresentation(entry, state);
  const others = choices.slice(1);
  const open = shown.slotId === entry.id;
  const toggle = `data-action="toggle-program-slot" data-id="${escapeHtml(entry.id)}"`;
  const row = `<article class="row split tap slot ${open ? "is-open" : ""}">
    <span class="icon-button" ${toggle} aria-hidden="true"><span class="tickbox"><span>${entryNumber(routine, entry.id)}</span></span></span>
    <button class="row-body" type="button" ${toggle} aria-expanded="${open}" aria-label="${open ? "Hide" : "Show"} ${escapeHtml(title)} details">
      <span class="row-main"><span class="row-title">${movementMarkup(preferred?.exercise)}${others.length ? ` <span class="version">+${others.length}</span>` : ""}${showOptionalRole ? ` <span class="label tag">Optional</span>` : ""}</span></span>
      ${open ? chevronIcon("up") : `<span class="slot-end">${escapeHtml(entry.choices[0]?.prescription ? prescription : "")}</span>`}
    </button>
  </article>`;
  if (!open) return row;

  const exercise = preferred?.exercise;
  const exerciseId = escapeHtml(exercise?.id || "");
  const last = exercise ? exerciseHistory(state, exercise.id, { limit: 1 })[0] : null;
  const data = `data-routine-id="${escapeHtml(routine.id)}" data-entry-id="${escapeHtml(entry.id)}"`;
  // One labelled line per fact, always in this order; a line with nothing to say is left out.
  const line = (name, value) => (value ? `<div class="slot-line"><span>${name}</span><span>${value}</span></div>` : "");
  const video = exercise?.videoId
    ? `<a class="button" href="${videoUrl(exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for ${escapeHtml(preferred.name)}">Video</a>`
    : `<button class="button" type="button" data-action="open-workout-video" data-id="${exerciseId}" aria-label="Find a video for ${escapeHtml(preferred?.name)}">Video</button>`;
  return `<div class="slot-open" data-open-slot>
    ${row}
    <div class="slot-detail" data-slot="${escapeHtml(entry.id)}">
      ${exerciseFactLines(exercise, preferred?.prescription).map(([name, value]) => line(name, value)).join("")}
      ${line("Last time", last ? `<span class="slot-last"><span>${escapeHtml(setsSummary(last))}</span><span>${escapeHtml(shortDate(last.dateKey))}</span></span>` : "")}
      ${line("Note", escapeHtml(entry.note.trim()))}
      ${line(others.length > 1 ? "Alternatives" : "Alternative", others.length ? `<button class="link-button" type="button" data-action="open-entry-choices" ${data} aria-label="Open exercise choices for ${escapeHtml(title)}">${alternativeNames(others, exercise).map(escapeHtml).join(", ")}${chevronIcon("right")}</button>` : "")}
      <div class="actions">
        <button class="button" type="button" data-action="view-history" data-id="${exerciseId}" aria-label="History of ${escapeHtml(preferred?.name)}">History</button>
        <button class="button" type="button" data-action="open-workout-exercise" data-id="${exerciseId}" ${data} data-prescription="${escapeHtml(preferred?.prescription)}" aria-label="Open exercise page for ${escapeHtml(preferred?.name)}">Details</button>
        ${video}
      </div>
    </div>
  </div>`;
}

// Edit mode. One slot as the editor draws it: every choice named, the prescription
// under it, then the note, and a grip. Tapping opens its editor; holding drags it.
function editRowMarkup(state, entry, number, blockName, showOptionalRole) {
  const { title, titleMarkup, prescription } = entryPresentation(entry, state);
  const note = entry.note.trim();
  return `<button class="row split slot drag-row" type="button" data-action="edit-entry" data-id="${escapeHtml(entry.id)}" aria-label="${escapeHtml(title)}. Tap to edit. Hold and drag to reorder within ${escapeHtml(blockName || "this block")}.">
    <span class="icon-button"><span class="tickbox"><span data-number>${number}</span></span></span>
    <span class="row-main">
      <span class="row-title">${titleMarkup}</span>
      <span class="row-meta">${escapeHtml(prescription)}${showOptionalRole ? `<span class="label tag">Optional</span>` : ""}</span>
      ${note ? `<span class="row-meta clamp-2 faint">${escapeHtml(note)}</span>` : ""}
    </span>
    ${gripIcon}
  </button>`;
}

// The routine's blocks in both modes. A block whose entries are all Optional is
// outlined and says so once in its label (unless its name already does); in a mixed
// block each Optional entry carries its own tag.
function listMarkup(state, routine) {
  return routine.blocks.map((block) => {
    const name = block.name.trim();
    const entries = routine.entries.filter((entry) => entry.blockId === block.id);
    // An empty block with no name has nothing to show until it can be added to.
    if (!entries.length && !name && !shown.editing) return "";
    const optionalOnly = entries.length > 0 && entries.every((entry) => entry.role === "optional");
    const tagged = (entry) => !optionalOnly && entry.role === "optional";
    const blockId = escapeHtml(block.id);
    return `<section class="${optionalOnly ? "workout-group" : ""}" data-block-id="${blockId}">
      ${name || optionalOnly ? `<div class="label section-label"><span>${escapeHtml(name)}</span>${optionalOnly && !saysOptional(name) ? `<span>Optional</span>` : ""}</div>` : ""}
      ${shown.editing ? `<div class="drag-list" data-block-id="${blockId}">${entries.map((entry) => editRowMarkup(state, entry, entryNumber(routine, entry.id), name, tagged(entry))).join("")}</div>
        ${entries.length ? "" : `<p class="hint">No exercises in ${escapeHtml(name || "this block")}.</p>`}
        <button class="row compact link-button" type="button" data-action="open-picker" data-block-id="${blockId}" aria-label="Add exercise to ${escapeHtml(name || "this block")}">+ Add exercise</button>`
      : entries.map((entry) => slotMarkup(state, routine, entry, tagged(entry))).join("")}
    </section>`;
  }).join("");
}

function programMarkup(state) {
  const { program, routines, routine, followed } = looking(state);
  const body = !program
    ? `<div class="empty"><h2>No programs yet</h2><p>Create a program, then add its workout days.</p><button class="button primary" type="button" data-action="new-program">Add program</button></div>`
    : !routine
      ? `<div class="empty"><h2>No workouts yet</h2><p>Add the first workout day to ${escapeHtml(program.name)}. Its exercises come from your Library.</p><button class="button primary" type="button" data-action="new-routine">Add workout</button></div>`
      : `${routineLineMarkup(state, program, routine)}
        <div class="scroll program-list" data-program-list data-keep-scroll="program-${escapeHtml(routine.id)}">
          ${routineNoteMarkup(routine.note)}
          ${listMarkup(state, routine)}
          ${routine.entries.length || shown.editing ? "" : `<p class="hint">No exercises yet. Tap Edit to add some.</p>`}
        </div>`;
  return `<section class="page fills">
    ${headMarkup(program, followed, routines.length > 0)}
    ${tabsMarkup(routines, routine)}
    ${body}
  </section>`;
}

// The programs sheet: a dot and "Following" mark the program being followed; the ›
// opens a program's editor.
function programsListMarkup(state) {
  if (!state.programs.length) {
    return `<div class="empty"><h3>No programs yet</h3><p>Add one to organize your workout days.</p></div>`;
  }
  const { program: showing, followed } = looking(state);
  return state.programs.map((program) => {
    const isFollowed = program.id === followed?.id;
    return `<div class="row split tall">
      <button class="row-body" type="button" data-action="select-program" data-id="${escapeHtml(program.id)}" aria-pressed="${program.id === showing?.id}">
        <span class="dot ${isFollowed ? "is-on" : ""}" aria-hidden="true"></span>
        <span class="row-main">
          <strong class="row-title truncate">${escapeHtml(program.name)}</strong>
          <small class="row-meta truncate">${plural(program.routineIds.length, "workout")}</small>
        </span>
        <span class="label accent" style="visibility: ${isFollowed ? "visible" : "hidden"}">Following</span>
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
      ${gripIcon}
      <button class="row-main" type="button" data-action="edit-routine-block" data-id="${escapeHtml(block.id)}" aria-label="Edit ${escapeHtml(name)}. Hold and drag to reorder.">
        <strong class="row-title truncate">${escapeHtml(name)}</strong>
        <small class="row-meta truncate">${plural(count, "entry", "entries")} · ${index + 1} of ${blocks.length}</small>
      </button>
      <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
    </div>`;
  }).join("");
}

// ---------- the open slot ----------

const motion = slotMotion();

// ---------- looking around ----------

function viewRoutine(id) {
  // The routine already showing isn't redrawn: its tab goes back to the top.
  if (id === shown.routineId) {
    scrollToTop();
    return;
  }
  Object.assign(shown, { routineId: id, slotId: "" });
  render({ entering: "routine" });
}

function toggleEditing() {
  Object.assign(shown, { editing: !shown.editing, slotId: "" });
  render({ entering: "routine" });
}

// Another program's tabs start at their first routine.
function renderProgram() {
  render();
  if (document.body.dataset.currentView === "routines") mainElement().querySelector('[data-keep-scroll="routine-tabs"]')?.scrollTo({ left: 0 });
}

// ---------- programs sheet and program editor ----------

function openPrograms() {
  $("#programsList").innerHTML = programsListMarkup(store.getState());
  $("#programsFormError").textContent = "";
  openDialog("#programsDialog");
}

// Choosing a program only changes what this screen shows.
function selectProgram(id) {
  closeDialog("#programsDialog");
  if (id === looking(store.getState()).program?.id) return;
  show(id);
  shown.editing = false;
  renderProgram();
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
  if (state.programs.length) sourceSelect.value = source?.id || looking(state).program.id;
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
  let createdId = "";
  const result = store.update((draft) => {
    if (id) updateProgram(draft, id, { name, note });
    else createdId = sourceId ? duplicateProgram(draft, sourceId, { name, note }) : createProgram(draft, { name, note });
  });
  if (!report(result, id ? "Program updated." : "Program created.")) return;
  closeDialog("#programDialog");
  if (!createdId) {
    render();
    return;
  }
  // The new program is the one to look at; it isn't followed until the owner says so.
  show(createdId);
  shown.editing = false;
  renderProgram();
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
  renderProgram();
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
  // A new routine joins the program on screen.
  const owner = id ? routineProgram(state, id) : looking(state).program;
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
  let addedId = "";
  const result = store.update((draft) => {
    if (id) updateRoutine(draft, id, fields);
    else addedId = addRoutine(draft, owner.id, fields);
  });
  if (!report(result, id ? "Routine updated." : "Routine added.")) return;
  closeDialog("#routineDialog");
  // A new routine opens ready for its exercises.
  if (addedId) Object.assign(shown, { routineId: addedId, slotId: "", editing: true });
  render();
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
  openDialog("#routineBlockDialog", {
    // Closed without saving: a block that was only just added goes again.
    onClose() {
      if (!routineEditor.newBlockId) return;
      routineEditor.blocks = routineEditor.blocks.filter((block) => block.id !== routineEditor.newBlockId);
      routineEditor.newBlockId = "";
      renderBlocksEditor();
    },
  });
}

function syncBlockName() {
  editedBlock().name = $("#routineBlockName").value;
}

function saveBlock() {
  routineEditor.newBlockId = "";
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
  routineEditor.newBlockId = block.id;
  renderBlocksEditor();
  openBlockEditor(block.id);
}

// ---------- registration ----------

registerView("routines", { markup: programMarkup, afterDraw(root) { revealSelectedTab(root); motion.unfold(shown.routineId); } });

registerActions({
  "open-programs": openPrograms,
  "select-program": (button) => selectProgram(button.dataset.id),
  "new-program": () => openProgramEditor(),
  "edit-program": (button) => openProgramEditor(button.dataset.id),
  "set-program-start-mode": (button) => setProgramStartMode(button.dataset.value),
  "save-program": saveProgram,
  "duplicate-program": () => openProgramEditor("", programEditor.id),
  "delete-program": deleteProgram,

  "view-routine": (button) => viewRoutine(button.dataset.id),
  "toggle-program-edit": toggleEditing,
  // Opens a slot in place, or closes the one that's open.
  "toggle-program-slot": (element) => {
    shown.slotId = shown.slotId === element.dataset.id ? "" : element.dataset.id;
    motion.fold(() => render());
  },

  "new-routine": () => openRoutineEditor(),
  "edit-routine": (button) => openRoutineEditor(button.dataset.id),
  "save-routine": saveRoutine,
  "move-routine": (button) => moveRoutineBy(Number(button.dataset.by)),
  "delete-routine": deleteRoutine,

  "add-routine-block": addBlock,
  "edit-routine-block": (button) => openBlockEditor(button.dataset.id),
  "save-routine-block": saveBlock,
  "delete-routine-block": deleteBlock,

  "edit-entry": (button) => openEntryEditor(shown.routineId, button.dataset.id),
  "open-picker": (button) => openPicker({ routineId: shown.routineId, blockId: button.dataset.blockId, mode: "entry" }),
});

// Hold and drag: entries on the page, inside their block or into another (only the
// editor's rows can be dragged, so only in edit mode), and blocks in the routine editor.
const DRAG = { rowSelector: ".drag-row", listSelector: ".drag-list", placeholderClass: "drag-placeholder", activeBodyClass: "drag-active" };
enableHoldDrag(mainElement(), {
  ...DRAG,
  scroller: () => mainElement().querySelector("[data-program-list]"),
  acrossLists: true,
  // While a row is dragged the numbers already show the order dropping here would give.
  onPlace(row) {
    let number = 0;
    for (const item of mainElement().querySelectorAll(`${DRAG.rowSelector}, .${DRAG.placeholderClass}`)) {
      number += 1;
      (item.matches(DRAG.rowSelector) ? item : row).querySelector("[data-number]").textContent = number;
    }
  },
  onDrop(row, toIndex, list) {
    const routineId = shown.routineId;
    const result = store.update((draft) => moveEntry(draft, routineId, row.dataset.id, list.dataset.blockId, toIndex));
    report(result, "Exercise moved.");
    render();
  },
});
const blocksDrag = enableHoldDrag($("#routineBlocksList"), {
  ...DRAG,
  scroller: () => $("#routineDialog .sheet-body"),
  onDrop: (row, toIndex) => moveBlockDraft(row.dataset.blockId, toIndex),
});
