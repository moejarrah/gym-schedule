import {
  chevronIcon,
  downIcon,
  editIcon,
  escapeHtml,
  routineTabsMarkup,
} from "./shared.js?v=37";
import { classificationLabel } from "../data.js?v=37";

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

export function pickerListMarkup(exercises, existingExerciseIds = new Set()) {
  if (!exercises.length) {
    return `<div class="picker-empty"><h3>No matching exercises</h3><p>Try another name, target, or movement.</p></div>`;
  }

  return exercises.map((exercise) => {
    const prescription = exercise.defaultPrescription || "No default prescription";
    const target = classificationLabel(exercise.primaryTargets?.[0]);
    const movement = classificationLabel(exercise.movementPattern);
    const details = [prescription, target, movement].filter(Boolean).join(" · ");
    const exists = existingExerciseIds.has(exercise.id);
    return `<button class="picker-item" type="button" data-action="pick-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="${exists ? "Add another" : "Add"} ${escapeHtml(exercise.name)} to this routine">
      <span class="picker-item-copy"><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(details)}</small></span>
      <span class="picker-item-action">${exists ? "Add again" : "Add"}</span>
    </button>`;
  }).join("");
}

function routineEntriesMarkup(state, routine, exerciseById) {
  if (!routine.entries.length) {
    return `<div class="program-empty-state"><h2>No exercises yet</h2><p>Add exercises from the shared Library to build this routine.</p><button class="button primary" type="button" data-action="open-picker">Add exercise</button></div>`;
  }
  const mainEntries = routine.entries.filter((entry) => entry.role !== "optional");
  const optionalEntries = routine.entries.filter((entry) => entry.role === "optional");
  const sectionMarkup = (label, role, entries, startIndex) => {
    if (!entries.length) return "";
    return `<section class="program-section" data-entry-role="${role}">
      <div class="program-section-label">${label}</div>
      <div class="program-list" data-entry-role="${role}">${entries.map((entry, index) => {
    const exercise = exerciseById(state, entry.exerciseId);
    const content = `<span class="row-number">${startIndex + index + 1}</span>
      <span class="row-main"><span class="row-title">${escapeHtml(exercise?.name || "Missing exercise")}</span><span class="row-meta">${escapeHtml(entry.prescription || exercise?.defaultPrescription || "No prescription")}</span></span>
      <span class="drag-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8"/></svg></span>`;
    return `<button class="program-row" type="button" data-action="edit-entry" data-id="${escapeHtml(entry.id)}" aria-label="${escapeHtml(exercise?.name || "Exercise")}. Tap to edit. Hold and drag to reorder.">${content}</button>`;
      }).join("")}</div>
    </section>`;
  };
  return `<div class="program-entries">
    ${sectionMarkup("Main", "main", mainEntries, 0)}
    ${sectionMarkup("Optional", "optional", optionalEntries, mainEntries.length)}
  </div>`;
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
    ${routineTabsMarkup(routines, routine?.id)}
    ${!program ? `<div class="program-empty-state"><h2>No programs yet</h2><p>Create a program, then add its workout days.</p><button class="button primary" type="button" data-action="new-program">Add program</button></div>` : routine ? `
      <div class="program-viewbar">
        <div class="program-viewbar-copy">
          <strong>${escapeHtml(routine.name)}</strong>
          <span>${routine.group === "home" ? "Home" : "Gym"} · ${routine.status === "optional" ? "Optional" : "Required"} · ${routine.entries.length} ${routine.entries.length === 1 ? "exercise" : "exercises"}</span>
        </div>
        <button class="program-view-edit" type="button" data-action="edit-routine" data-id="${escapeHtml(routine.id)}" aria-label="Edit ${escapeHtml(routine.name)}">${editIcon()}</button>
      </div>
      ${routineEntriesMarkup(state, routine, exerciseById)}
      ${routine.entries.length ? `<button class="add-row-button" type="button" data-action="open-picker">+ Add exercise</button>` : ""}
    ` : `<div class="program-empty-state"><h2>No routines yet</h2><p>Add the first workout day to this program. Exercises will still come from your shared Library.</p><button class="button primary" type="button" data-action="new-routine">Add routine</button></div>`}
  </section>`;
}
