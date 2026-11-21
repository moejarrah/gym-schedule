// Exercise reference sheets: the read-only reference for a master exercise
// (optionally showing a routine slot's prescription and note) and the
// "find a video" sheet. Both hand over to the master exercise editor; the
// reference also opens the exercise's logged history.

import { registerActions, store } from "../context.js";
import { $, closeDialog, escapeHtml, fresh, openDialog, playIcon } from "../dom.js";
import { exerciseById } from "../model.js";
import { RELATIONS, label } from "../vocab.js";
import { openExerciseEditor } from "./exercise-editor.js";
import { openExerciseHistory } from "./history.js";
import { videoUrl } from "./shared.js";

const RELATION_ORDER = RELATIONS.map((relation) => relation.id);

// ---------- markup ----------

function externalIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>`;
}

function exerciseSearchUrls(exerciseName) {
  return {
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} exercise`)}`,
    alternatives: `https://www.google.com/search?q=${encodeURIComponent(`${exerciseName} exercise alternatives`)}`,
  };
}

function searchActionsMarkup(exercise) {
  const urls = exerciseSearchUrls(exercise.name);
  return `<div class="actions">
    <a class="button" href="${urls.youtube}" target="_blank" rel="noopener noreferrer">Search YouTube${externalIcon()}</a>
    <a class="button" href="${urls.alternatives}" target="_blank" rel="noopener noreferrer">Search alternatives${externalIcon()}</a>
  </div>`;
}

function linkedVideoMarkup(exercise) {
  if (!exercise.videoId) return "";
  return `<a class="row compact card tinted is-linked reference-video" href="${videoUrl(exercise.videoId)}" target="_blank" rel="noopener noreferrer">
    <span class="play">${playIcon()}</span>
    <strong class="row-main row-title">Watch linked video</strong>
    ${externalIcon()}
  </a>`;
}

// Emphases qualify the dominant (first) primary target.
function targetRowsMarkup(targets, emphases = []) {
  return targets.map((target, index) => {
    const emphasis = index === 0 && emphases.length
      ? `<em> · ${escapeHtml(emphases.map(label).join(", "))}</em>`
      : "";
    return `<div class="row compact">
      <span class="row-number">${index + 1}</span>
      <strong class="row-title">${escapeHtml(label(target))}${emphasis}</strong>
    </div>`;
  }).join("");
}

function targetGroupsMarkup(exercise) {
  const secondary = exercise.secondaryTargets;
  return `<div class="reference-group">
    <p class="label">Primary targets</p>${targetRowsMarkup(exercise.primaryTargets, exercise.emphases)}
    ${secondary.length ? `<p class="label">Secondary involvement</p>${targetRowsMarkup(secondary)}` : ""}
  </div>`;
}

function factsMarkup(exercise) {
  const facts = [
    ["Purpose", exercise.purpose],
    ["Laterality", exercise.laterality],
    ["Support", exercise.support],
    ["Challenge", exercise.typicalChallenge],
  ].filter(([, value]) => value);
  return `<div class="reference-group">${facts.map(([name, value]) => `
    <div class="row compact"><span class="label">${name}</span><strong class="row-title">${escapeHtml(label(value))}</strong></div>`).join("")}
  </div>`;
}

function relationshipsMarkup(state, exercise) {
  const related = exercise.relatedExercises
    .map(({ relation, exerciseId }) => ({ relation, exercise: exerciseById(state, exerciseId) }))
    .sort((a, b) => RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation) || a.exercise.name.localeCompare(b.exercise.name));
  return `<div class="reference-group">
    <div class="label label-row">Alternatives and progressions</div>
    ${related.length ? related.map(({ relation, exercise: other }) => `
      <button class="row compact" type="button" data-action="view-alternative" data-id="${escapeHtml(other.id)}">
        <span class="row-meta">${escapeHtml(label(relation))}</span>
        <strong class="row-title">${escapeHtml(other.name)}</strong>
      </button>`).join("") : `<p class="hint">None linked yet.</p>`}
  </div>`;
}

function referenceMarkup(state, exercise, { prescription, routineName, routineNote }) {
  const contextLabel = prescription ? "Routine prescription" : "Default prescription";
  const shownPrescription = prescription || exercise.defaultPrescription || "No prescription";
  const meta = [exercise.movementPattern, ...exercise.equipment, exercise.style].filter(Boolean).map(label).join(" · ");
  const notes = exercise.instructions || "No notes added yet.";

  return `<article class="sheet-panel">
    <header class="sheet-head">
      <div><h2 id="detailExerciseName">${escapeHtml(exercise.name)}</h2><small>${contextLabel}</small></div>
      <button class="icon-button" data-close-dialog="exerciseDetailDialog" aria-label="Close exercise reference" type="button">×</button>
    </header>
    <div class="sheet-body">
      <p class="reference-prescription">${escapeHtml(shownPrescription)}</p>
      <p class="hint">${escapeHtml(meta)}</p>
      ${routineNote.trim() ? `<section class="reference-group">
        <p class="label">For this routine${routineName ? ` — ${escapeHtml(routineName)}` : ""}</p>
        <p class="reference-note">${escapeHtml(routineNote)}</p>
      </section>` : ""}
      ${targetGroupsMarkup(exercise)}
      ${factsMarkup(exercise)}
      ${linkedVideoMarkup(exercise)}
      ${searchActionsMarkup(exercise)}
      ${relationshipsMarkup(state, exercise)}
      <section class="reference-group">
        <p class="label">Exercise notes</p>
        <p class="reference-note ${exercise.instructions ? "" : "is-empty"}">${escapeHtml(notes)}</p>
      </section>
    </div>
    <footer class="actions">
      <button class="button" type="button" data-action="view-history" data-id="${escapeHtml(exercise.id)}">History</button>
      <button class="button" type="button" data-action="edit-master-exercise" data-id="${escapeHtml(exercise.id)}">Edit exercise</button>
    </footer>
  </article>`;
}

function videoSearchMarkup(exercise) {
  return `<article class="sheet-panel">
    <header class="sheet-head">
      <div><h2 id="videoExerciseName">${escapeHtml(exercise.name)}</h2><small>Exercise video</small></div>
      <button class="icon-button" data-close-dialog="exerciseVideoDialog" aria-label="Close video search" type="button">×</button>
    </header>
    <div class="sheet-body">
      <p class="hint">No video linked</p>
      <p class="label">Find one</p>
      ${searchActionsMarkup(exercise)}
    </div>
    <footer class="actions">
      <button class="button" type="button" data-action="edit-master-exercise" data-id="${escapeHtml(exercise.id)}">Edit exercise</button>
    </footer>
  </article>`;
}

// ---------- sheets ----------

// Opens the reference for a master exercise. From a routine slot, pass the
// choice's prescription and the routine's name and entry note. Called while the
// reference is open (a related exercise), it replaces the sheet's content.
export function openExerciseReference(exerciseId, { prescription = "", routineName = "", routineNote = "" } = {}) {
  const state = store.getState();
  $("#exerciseDetailContent").innerHTML = referenceMarkup(state, exerciseById(state, exerciseId), { prescription, routineName, routineNote });
  openDialog("#exerciseDetailDialog");
}

// Opens the "find a video" sheet for an exercise without a linked video.
export function openExerciseVideo(exerciseId) {
  $("#exerciseVideoContent").innerHTML = videoSearchMarkup(exerciseById(store.getState(), exerciseId));
  openDialog("#exerciseVideoDialog");
}

registerActions({
  "view-alternative": (button) => {
    openExerciseReference(button.dataset.id);
    fresh("#exerciseDetailContent");
  },
  "view-history": (button) => openExerciseHistory(button.dataset.id),
  // The editor takes over from the sheet (the reference or the video sheet).
  "edit-master-exercise": (button) => {
    closeDialog(button.closest("dialog"));
    openExerciseEditor({ exerciseId: button.dataset.id });
  },
});
