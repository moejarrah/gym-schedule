import {
  chevronIcon,
  escapeHtml,
  routineTabsMarkup,
} from "./shared.js?v=37";

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
  exercise,
  displayIndex,
  checked,
  routineId,
}) {
  const name = exercise?.name || "Missing exercise";
  const prescription = entry.prescription || exercise?.defaultPrescription || "No prescription";
  const exerciseId = exercise?.id || "";
  const videoControl = exercise?.videoId
    ? `<a class="workout-video is-linked" href="https://www.youtube.com/watch?v=${escapeHtml(exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for ${escapeHtml(name)}"><span class="workout-video-mark">${playIcon()}</span></a>`
    : `<button class="workout-video" type="button" data-action="open-workout-video" data-id="${escapeHtml(exerciseId)}" aria-label="Find a video for ${escapeHtml(name)}"><span class="workout-video-mark">${playIcon()}</span></button>`;

  return `<article class="workout-item ${checked ? "is-done" : ""}">
    <button class="workout-check" type="button" data-action="toggle-entry-check" data-routine-id="${escapeHtml(routineId)}" data-id="${escapeHtml(entry.id)}" aria-label="${checked ? "Uncheck" : "Check"} ${escapeHtml(name)} for today" aria-pressed="${checked}">
      <span class="workout-check-mark" aria-hidden="true">
        <span class="workout-check-number">${displayIndex}</span>
        <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
      </span>
    </button>
    <button class="workout-row" type="button" data-action="open-workout-exercise" data-id="${escapeHtml(exerciseId)}" data-prescription="${escapeHtml(prescription)}" aria-label="View ${escapeHtml(name)} details">
      <span class="row-main">
        <span class="row-title">${escapeHtml(name)}</span>
        <span class="row-meta">${escapeHtml(prescription)}</span>
      </span>
    </button>
    ${videoControl}
  </article>`;
}

function workoutSectionMarkup({
  label,
  entries,
  startIndex,
  checkedEntryIds,
  routine,
  state,
  exerciseById,
}) {
  if (!entries.length) return "";
  return `<div class="workout-section">
    <div class="workout-section-label">${label}</div>
    ${entries.map((entry, index) => workoutEntryMarkup({
      entry,
      exercise: exerciseById(state, entry.exerciseId),
      displayIndex: startIndex + index + 1,
      checked: checkedEntryIds.has(entry.id),
      routineId: routine.id,
    })).join("")}
  </div>`;
}

export function workoutMarkup({
  state,
  program,
  routines,
  routine,
  todayKey,
  exerciseById,
}) {
  const checkedEntryIds = new Set(routine
    ? state.sessions[todayKey]?.checkedEntryIdsByRoutine?.[routine.id] || []
    : []);
  const mainEntries = routine?.entries.filter((entry) => entry.role !== "optional") || [];
  const optionalEntries = routine?.entries.filter((entry) => entry.role === "optional") || [];

  return `<section class="page workout-page">
    ${programBar(program)}
    ${routineTabsMarkup(routines, routine?.id)}
    ${!program ? `<div class="empty-state"><h3>No programs yet</h3><p>Add a program to organize your workout days.</p><button class="button primary" type="button" data-action="new-program">Add program</button></div>` : routine ? `
      ${routine.entries.length ? `<div class="workout-rows">
        ${workoutSectionMarkup({
          label: "Main",
          entries: mainEntries,
          startIndex: 0,
          checkedEntryIds,
          routine,
          state,
          exerciseById,
        })}
        ${workoutSectionMarkup({
          label: "Optional",
          entries: optionalEntries,
          startIndex: mainEntries.length,
          checkedEntryIds,
          routine,
          state,
          exerciseById,
        })}
      </div>` : `<div class="empty-state compact-empty"><h3>No exercises yet</h3><p>Open Program to add exercises.</p><button class="button secondary" type="button" data-view-link="routines">Manage program</button></div>`}
    ` : `<div class="empty-state"><h3>No routines yet</h3><p>Add the first workout day to ${escapeHtml(program.name)} in Program.</p><button class="button primary" type="button" data-view-link="routines">Manage program</button></div>`}
  </section>`;
}
