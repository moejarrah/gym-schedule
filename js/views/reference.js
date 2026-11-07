// Exercise reference sheets: the read-only reference for a master exercise
// (optionally showing a routine slot's prescription and note) and the
// "find a video" sheet. Both hand over to the master exercise editor; the
// reference also opens the exercise's logged history.

import { onStart, store } from "../context.js";
import { $, closeDialog, escapeHtml, openDialog, playIcon } from "../dom.js";
import { exerciseById } from "../model.js";
import { RELATIONS, label } from "../vocab.js";
import { openExerciseEditor } from "./exercise-editor.js";
import { openExerciseHistory } from "./history.js";
import { videoUrl } from "./shared.js";

// What opened each sheet, so the exercise editor can return focus there.
const openers = { reference: null, video: null };

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
  return `<div class="reference-search-actions">
    <a href="${urls.youtube}" target="_blank" rel="noopener noreferrer">Search YouTube${externalIcon()}</a>
    <a href="${urls.alternatives}" target="_blank" rel="noopener noreferrer">Search alternatives${externalIcon()}</a>
  </div>`;
}

function linkedVideoMarkup(exercise) {
  if (!exercise.videoId) return "";
  return `<a class="reference-video-link" href="${videoUrl(exercise.videoId)}" target="_blank" rel="noopener noreferrer">
    <span class="reference-video-mark">${playIcon()}</span>
    <strong>Watch linked video</strong>
    ${externalIcon()}
  </a>`;
}

// Emphases qualify the dominant (first) primary target.
function targetRowsMarkup(targets, emphases = []) {
  return targets.map((target, index) => {
    const emphasis = index === 0 && emphases.length
      ? `<em> · ${escapeHtml(emphases.map(label).join(", "))}</em>`
      : "";
    return `<div class="reference-target-row">
      <span>${index + 1}</span>
      <strong>${escapeHtml(label(target))}${emphasis}</strong>
    </div>`;
  }).join("");
}

function targetGroupsMarkup(exercise) {
  const secondary = exercise.secondaryTargets;
  return `<div class="reference-target-groups">
    <p class="reference-group-label">Primary targets</p>${targetRowsMarkup(exercise.primaryTargets, exercise.emphases)}
    ${secondary.length ? `<p class="reference-group-label">Secondary involvement</p>${targetRowsMarkup(secondary)}` : ""}
  </div>`;
}

function factsMarkup(exercise) {
  const facts = [
    ["Purpose", exercise.purpose],
    ["Laterality", exercise.laterality],
    ["Support", exercise.support],
    ["Challenge", exercise.typicalChallenge],
  ].filter(([, value]) => value);
  return `<div class="reference-facts">${facts.map(([name, value]) => `
    <div class="reference-fact"><span>${name}</span><strong>${escapeHtml(label(value))}</strong></div>`).join("")}
  </div>`;
}

function relationshipsMarkup(state, exercise) {
  const related = exercise.relatedExercises
    .map(({ relation, exerciseId }) => ({ relation, exercise: exerciseById(state, exerciseId) }))
    .sort((a, b) => RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation) || a.exercise.name.localeCompare(b.exercise.name));
  return `<div class="reference-ladder">
    <div class="reference-ladder-head">Related exercises <span>alternative + progression</span></div>
    ${related.length ? related.map(({ relation, exercise: other }) => `
      <button class="reference-ladder-row" type="button" data-action="view-alternative" data-id="${escapeHtml(other.id)}">
        <span>${escapeHtml(label(relation))}</span>
        <strong>${escapeHtml(other.name)}</strong>
      </button>`).join("") : `<p class="reference-empty">No related exercises linked.</p>`}
  </div>`;
}

function referenceMarkup(state, exercise, { prescription, routineName, routineNote }) {
  const contextLabel = prescription ? "Routine prescription" : "Default prescription";
  const shownPrescription = prescription || exercise.defaultPrescription || "No prescription";
  const meta = [exercise.movementPattern, ...exercise.equipment, exercise.style].filter(Boolean).map(label).join(" · ");
  const notes = exercise.instructions || "No notes added yet.";

  return `<article class="reference-sheet">
    <header class="reference-sheet-head">
      <div><h2 id="detailExerciseName">${escapeHtml(exercise.name)}</h2><small>${contextLabel}</small></div>
      <button class="icon-button" data-close-dialog="exerciseDetailDialog" aria-label="Close exercise reference" type="button">×</button>
    </header>
    <div class="reference-sheet-scroll">
      <p class="reference-prescription">${escapeHtml(shownPrescription)}</p>
      <p class="reference-meta">${escapeHtml(meta)}</p>
      ${routineNote.trim() ? `<section class="reference-note-group">
        <p class="reference-group-label">For this routine${routineName ? ` — ${escapeHtml(routineName)}` : ""}</p>
        <p class="reference-context-note">${escapeHtml(routineNote)}</p>
      </section>` : ""}
      ${targetGroupsMarkup(exercise)}
      ${factsMarkup(exercise)}
      ${linkedVideoMarkup(exercise)}
      ${searchActionsMarkup(exercise)}
      ${relationshipsMarkup(state, exercise)}
      <section class="reference-note-group exercise-note-group">
        <p class="reference-group-label">Exercise notes</p>
        <p class="reference-notes ${exercise.instructions ? "" : "is-empty"}">${escapeHtml(notes)}</p>
      </section>
    </div>
    <footer class="reference-sheet-actions">
      <button class="button secondary" type="button" data-action="view-history" data-id="${escapeHtml(exercise.id)}">History</button>
      <button class="button secondary" type="button" data-action="edit-master-exercise" data-id="${escapeHtml(exercise.id)}">Edit exercise</button>
    </footer>
  </article>`;
}

function videoSearchMarkup(exercise) {
  return `<article class="reference-sheet video-search-sheet">
    <header class="reference-sheet-head">
      <div><h2 id="videoExerciseName">${escapeHtml(exercise.name)}</h2><small>Exercise video</small></div>
      <button class="icon-button" data-close-dialog="exerciseVideoDialog" aria-label="Close video search" type="button">×</button>
    </header>
    <div class="reference-sheet-scroll">
      <p class="video-search-empty">No video linked</p>
      <p class="video-search-label">Find one</p>
      ${searchActionsMarkup(exercise)}
    </div>
    <footer class="reference-sheet-actions">
      <button class="button secondary" type="button" data-action="edit-master-exercise" data-id="${escapeHtml(exercise.id)}">Edit exercise</button>
    </footer>
  </article>`;
}

// ---------- sheets ----------

// Opens the reference for a master exercise. From a routine slot, pass the
// choice's prescription and the routine's name and entry note. Called while the
// reference is open (a related exercise), it replaces the sheet's content.
export function openExerciseReference(exerciseId, { prescription = "", routineName = "", routineNote = "" } = {}) {
  const state = store.getState();
  const dialog = $("#exerciseDetailDialog");
  $("#exerciseDetailContent").innerHTML = referenceMarkup(state, exerciseById(state, exerciseId), { prescription, routineName, routineNote });
  if (dialog.open) {
    openDialog(dialog, { focus: ".reference-sheet-head .icon-button" });
    return;
  }
  openers.reference = document.activeElement;
  openDialog(dialog);
}

// Opens the "find a video" sheet for an exercise without a linked video.
export function openExerciseVideo(exerciseId) {
  $("#exerciseVideoContent").innerHTML = videoSearchMarkup(exerciseById(store.getState(), exerciseId));
  openers.video = document.activeElement;
  openDialog("#exerciseVideoDialog");
}

// The editor takes over from the sheet and returns focus to what opened the sheet.
function editExercise(dialog, exerciseId, returnFocus) {
  closeDialog(dialog, { restoreFocus: false });
  openExerciseEditor({ exerciseId, returnFocus });
}

onStart(() => {
  const referenceDialog = $("#exerciseDetailDialog");
  referenceDialog.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button?.dataset.action === "view-alternative") openExerciseReference(button.dataset.id);
    else if (button?.dataset.action === "edit-master-exercise") editExercise(referenceDialog, button.dataset.id, openers.reference);
    else if (button?.dataset.action === "view-history") openExerciseHistory(button.dataset.id, button);
  });

  const videoDialog = $("#exerciseVideoDialog");
  videoDialog.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit-master-exercise"]');
    if (button) editExercise(videoDialog, button.dataset.id, openers.video);
  });
});
