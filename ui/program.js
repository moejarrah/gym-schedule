import {
  chevronIcon,
  downIcon,
  editIcon,
  entryPresentation,
  escapeHtml,
  routineTabsMarkup,
} from "./shared.js?v=46";
import { classificationLabel } from "../data.js?v=46";

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

export function programsListMarkup(state) {
  if (!state.programs.length) {
    return `<div class="empty-state compact-empty"><h3>No programs yet</h3><p>Add one to organize your workout days.</p></div>`;
  }

  return state.programs.map((program) => {
    const active = program.id === state.settings.activeProgramId;
    const routineCount = program.routineIds.length;
    return `<div class="program-choice-row">
      <button class="program-choice-select" type="button" data-action="select-program" data-id="${escapeHtml(program.id)}" aria-pressed="${active}">
        <span class="${active ? "program-active-dot" : "program-active-slot"}" aria-hidden="true"></span>
        <span class="program-choice-copy">
          <strong>${escapeHtml(program.name)}</strong>
          <small>${routineCount} ${routineCount === 1 ? "routine" : "routines"}${active ? " · active" : ""}</small>
        </span>
      </button>
      <button class="program-choice-edit" type="button" data-action="edit-program" data-id="${escapeHtml(program.id)}" aria-label="Edit ${escapeHtml(program.name)}">
        ${chevronIcon("right")}
      </button>
    </div>`;
  }).join("");
}

export function pickerListMarkup(exercises, existingExerciseIds = new Set(), { mode = "entry" } = {}) {
  if (!exercises.length) {
    return `<div class="picker-empty"><h3>No matching exercises</h3><p>Try another name, target, or movement.</p></div>`;
  }

  return exercises.map((exercise) => {
    const prescription = exercise.defaultPrescription || "No default prescription";
    const target = classificationLabel(exercise.primaryTargets?.[0]);
    const movement = classificationLabel(exercise.movementPattern);
    const details = [prescription, target, movement].filter(Boolean).join(" · ");
    const exists = existingExerciseIds.has(exercise.id);
    const unavailable = mode === "choice" && exists;
    return `<button class="picker-item" type="button" data-action="pick-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="${unavailable ? `${escapeHtml(exercise.name)} is already a choice` : `${exists ? "Add another" : "Add"} ${escapeHtml(exercise.name)} to this routine`}" ${unavailable ? "disabled" : ""}>
      <span class="picker-item-copy"><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(details)}</small></span>
      <span class="picker-item-action">${unavailable ? "Added" : exists ? "Add again" : "Add"}</span>
    </button>`;
  }).join("");
}

export function entryChoicesEditorMarkup(choices, state, exerciseById) {
  if (!choices.length) {
    return `<div class="entry-choice-empty"><strong>No exercise choices</strong><span>Add at least one choice before saving this entry.</span></div>`;
  }
  return choices.map((choice, index) => {
    const exercise = exerciseById(state, choice.exerciseId);
    const name = exercise?.name || "Missing exercise";
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

export function routineBlocksEditorMarkup(blocks, entries = []) {
  return blocks.map((block, index) => {
    const count = entries.filter((entry) => entry.blockId === block.id).length;
    const label = block.name.trim() || "Untitled block";
    return `<div class="routine-block-row" data-block-id="${escapeHtml(block.id)}">
      <span class="routine-block-grip" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8"/></svg></span>
      <button class="routine-block-edit" type="button" data-action="edit-routine-block" data-id="${escapeHtml(block.id)}" aria-label="Edit ${escapeHtml(label)}. Hold and drag to reorder.">
        <strong>${escapeHtml(label)}</strong>
        <small>${count} ${count === 1 ? "entry" : "entries"} · ${index + 1} of ${blocks.length}</small>
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

function routineEntriesMarkup(state, routine, exerciseById) {
  let displayIndex = 0;
  return `<div class="program-entries">${routine.blocks.map((block) => {
    const entries = routine.entries.filter((entry) => entry.blockId === block.id);
    const name = block.name.trim();
    const optionalOnly = entries.length > 0 && entries.every((entry) => entry.role === "optional");
    const mixedRoles = entries.some((entry) => entry.role === "optional") && !optionalOnly;
    const showLabel = name || optionalOnly || routine.blocks.length > 1;
    const rows = entries.map((entry) => {
      const presentation = entryPresentation(entry, state, exerciseById);
      displayIndex += 1;
      const note = entry.note.trim();
      const content = `<span class="row-number">${displayIndex}</span>
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

export function programMarkup({
  state,
  program,
  routines,
  routine,
  exerciseById,
}) {
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
          <span>${routine.group === "home" ? "Home" : "Gym"} · ${routine.status === "optional" ? "Optional" : "Required"} · ${routine.entries.length} ${routine.entries.length === 1 ? "slot" : "slots"} · ${routine.blocks.length} ${routine.blocks.length === 1 ? "block" : "blocks"}</span>
        </div>
        <button class="program-view-edit" type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}" aria-label="Edit ${escapeHtml(routine.name)}">${editIcon()}</button>
      </div>
      ${routineEntriesMarkup(state, routine, exerciseById)}
    ` : `<div class="program-empty-state"><h2>No routines yet</h2><p>Add the first workout day to this program. Exercises will still come from your shared Library.</p><button class="button primary" type="button" data-action="new-routine">Add routine</button></div>`}
  </section>`;
}
