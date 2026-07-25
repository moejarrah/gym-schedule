import {
  chevronIcon,
  entryPresentation,
  escapeHtml,
  routineTabsMarkup,
} from "./shared.js?v=46";

function programBar(program) {
  if (!program) {
    return `<div class="workout-programbar">
      <div class="workout-program-empty"><span>Active</span><strong>No program</strong></div>
    </div>`;
  }
  return `<div class="workout-programbar">
    <button class="workout-program-pick" type="button" data-action="open-programs" aria-label="Choose active program, currently ${escapeHtml(program.name)}">
      <span>Active</span>
      <strong>${escapeHtml(program.name)}</strong>
      ${chevronIcon("down")}
    </button>
    <button class="workout-manage-program" type="button" data-view-link="routines" aria-label="Manage ${escapeHtml(program.name)}">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>`;
}

function playIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5Z"/></svg>`;
}

function workoutEntryMarkup({
  entry,
  state,
  exerciseById,
  displayIndex,
  checked,
  routineId,
  showOptionalRole,
}) {
  const presentation = entryPresentation(entry, state, exerciseById);
  const { preferred } = presentation;
  const name = presentation.title;
  const prescription = presentation.prescription;
  const exerciseId = preferred?.exercise?.id || "";
  const note = entry.note.trim();
  const videoControl = preferred?.exercise?.videoId
    ? `<a class="workout-video is-linked" href="https://www.youtube.com/watch?v=${escapeHtml(preferred.exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for preferred choice ${escapeHtml(preferred.name)}"><span class="workout-video-mark">${playIcon()}</span></a>`
    : `<button class="workout-video" type="button" data-action="open-workout-video" data-id="${escapeHtml(exerciseId)}" aria-label="Find a video for preferred choice ${escapeHtml(preferred?.name || name)}"><span class="workout-video-mark">${playIcon()}</span></button>`;
  const rowAction = entry.choices.length > 1 ? "open-entry-choices" : "open-workout-exercise";

  return `<article class="workout-item ${checked ? "is-done" : ""}">
    <button class="workout-check" type="button" data-action="toggle-entry-check" data-routine-id="${escapeHtml(routineId)}" data-id="${escapeHtml(entry.id)}" aria-label="${checked ? "Uncheck" : "Check"} ${escapeHtml(name)} for today" aria-pressed="${checked}">
      <span class="workout-check-mark" aria-hidden="true">
        <span class="workout-check-number">${displayIndex}</span>
        <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
      </span>
    </button>
    <button class="workout-row" type="button" data-action="${rowAction}" data-id="${escapeHtml(exerciseId)}" data-entry-id="${escapeHtml(entry.id)}" data-routine-id="${escapeHtml(routineId)}" data-prescription="${escapeHtml(prescription)}" aria-label="${entry.choices.length > 1 ? `Open exercise choices for ${escapeHtml(name)}` : `View ${escapeHtml(name)} details`}">
      <span class="row-main">
        <span class="row-title">${escapeHtml(name)}</span>
        <span class="row-meta">${escapeHtml(prescription)}${showOptionalRole ? `<span class="entry-role-tag">Optional</span>` : ""}</span>
        ${note ? `<span class="entry-note-preview">${escapeHtml(note)}</span>` : ""}
      </span>
    </button>
    ${videoControl}
  </article>`;
}

function workoutBlockMarkup({
  block,
  entries,
  startIndex,
  checkedEntryIds,
  routine,
  state,
  exerciseById,
}) {
  const name = block.name.trim();
  const optionalOnly = entries.length > 0 && entries.every((entry) => entry.role === "optional");
  const mixedRoles = entries.some((entry) => entry.role === "optional") && !optionalOnly;
  if (!entries.length && !name) return "";
  return `<section class="workout-section" data-block-id="${escapeHtml(block.id)}">
    ${(name || optionalOnly) ? `<div class="workout-section-label"><span>${escapeHtml(name)}</span>${optionalOnly ? `<span class="workout-block-role">Optional</span>` : ""}</div>` : ""}
    ${entries.map((entry, index) => workoutEntryMarkup({
      entry,
      state,
      exerciseById,
      displayIndex: startIndex + index + 1,
      checked: checkedEntryIds.has(entry.id),
      routineId: routine.id,
      showOptionalRole: mixedRoles && entry.role === "optional",
    })).join("")}
  </section>`;
}

function routineNoteMarkup(note) {
  if (!note.trim()) return "";
  return `<details class="routine-note-disclosure">
    <summary><span>${escapeHtml(note.trim())}</span>${chevronIcon("down")}</summary>
    <p>${escapeHtml(note)}</p>
  </details>`;
}

export function entryChoicesMarkup({
  state,
  routine,
  entry,
  blockName,
  displayIndex,
  exerciseById,
}) {
  const presentation = entryPresentation(entry, state, exerciseById);
  const rows = presentation.choices.map((item, index) => {
    const video = item.exercise?.videoId
      ? `<a class="entry-choice-video is-linked" href="https://www.youtube.com/watch?v=${escapeHtml(item.exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for ${escapeHtml(item.name)}"><span>${playIcon()}</span></a>`
      : `<button class="entry-choice-video" type="button" data-action="open-choice-video" data-index="${index}" aria-label="Find a video for ${escapeHtml(item.name)}"><span>${playIcon()}</span></button>`;
    return `<div class="entry-choice-view-row">
      <button class="entry-choice-reference" type="button" data-action="open-choice-reference" data-index="${index}" aria-label="Open reference for ${escapeHtml(item.name)}">
        <span class="row-main"><span class="row-title">${escapeHtml(item.name)}</span><span class="row-meta">${escapeHtml(item.prescription)}</span></span>
        ${index === 0 ? `<span class="choice-preferred-tag">Preferred</span>` : ""}
        ${chevronIcon("right")}
      </button>
      ${video}
    </div>`;
  }).join("");
  const context = [displayIndex ? `Slot ${displayIndex}` : "", blockName || "", "first choice is preferred"].filter(Boolean).join(" · ");
  return `<div class="entry-choices-sheet">
    <header class="dialog-header">
      <div><h2 id="entryChoicesTitle">Exercise choices</h2><p>${escapeHtml(context)}</p></div>
      <button class="icon-button" type="button" data-close-dialog="entryChoicesDialog" aria-label="Close exercise choices">×</button>
    </header>
    <div class="entry-choices-scroll">
      ${rows}
      <p class="entry-choices-context">${entry.note.trim() ? `${escapeHtml(entry.note)}\n\n` : ""}Checking the row completes this routine slot, not an individual choice.</p>
    </div>
  </div>`;
}

export function workoutBlocksMarkup({ state, routine, todayKey, exerciseById }) {
  const checkedEntryIds = new Set(routine
    ? state.sessions[todayKey]?.checkedEntryIdsByRoutine?.[routine.id] || []
    : []);
  let displayIndex = 0;
  return routine?.blocks.map((block) => {
    const entries = routine.entries.filter((entry) => entry.blockId === block.id);
    const markup = workoutBlockMarkup({
      block,
      entries,
      startIndex: displayIndex,
      checkedEntryIds,
      routine,
      state,
      exerciseById,
    });
    displayIndex += entries.length;
    return markup;
  }).join("") || "";
}

export function workoutMarkup({
  state,
  program,
  routines,
  routine,
  todayKey,
  exerciseById,
}) {
  return `<section class="page workout-page">
    ${programBar(program)}
    ${routineTabsMarkup(routines, routine?.id)}
    ${routine ? routineNoteMarkup(routine.note) : ""}
    ${!program ? `<div class="empty-state"><h3>No programs yet</h3><p>Add a program to organize your workout days.</p><button class="button primary" type="button" data-action="new-program">Add program</button></div>` : !routine ? `<div class="empty-state"><h3>No routines yet</h3><p>Add the first workout day to ${escapeHtml(program.name)} in Program.</p><button class="button primary" type="button" data-view-link="routines">Manage program</button></div>` : !routine.entries.length ? `<div class="empty-state compact-empty"><h3>No exercises yet</h3><p>Open Program to add exercises.</p><button class="button secondary" type="button" data-view-link="routines">Manage program</button></div>` : ""}
  </section>`;
}
