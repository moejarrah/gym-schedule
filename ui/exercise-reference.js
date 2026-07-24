import { classificationLabel } from "../data.js?v=37";
import { escapeHtml } from "./shared.js?v=37";

const RELATION_ORDER = new Map([
  ["easier", 0],
  ["similar", 1],
  ["harder", 2],
]);

function externalIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>`;
}

export function exerciseSearchUrls(exerciseName) {
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
  return `<a class="reference-video-link" href="https://www.youtube.com/watch?v=${encodeURIComponent(exercise.videoId)}" target="_blank" rel="noopener noreferrer">
    <span class="reference-video-mark"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5Z"/></svg></span>
    <strong>Watch linked video</strong>
    ${externalIcon()}
  </a>`;
}

function targetRowsMarkup(targets, emphases = []) {
  return targets.map((target, index) => {
    const emphasis = index === 0 && emphases.length
      ? `<em> · ${escapeHtml(emphases.map(classificationLabel).join(", "))}</em>`
      : "";
    return `<div class="reference-target-row">
      <span>${index + 1}</span>
      <strong>${escapeHtml(classificationLabel(target))}${emphasis}</strong>
    </div>`;
  }).join("");
}

function targetGroupsMarkup(exercise) {
  const primary = exercise.primaryTargets || [];
  const secondary = exercise.secondaryTargets || [];
  if (!primary.length && !secondary.length) return "";
  return `<div class="reference-target-groups">
    ${primary.length ? `<p class="reference-group-label">Primary targets</p>${targetRowsMarkup(primary, exercise.emphases || [])}` : ""}
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
  if (!facts.length) return "";
  return `<div class="reference-facts">${facts.map(([label, value]) => `
    <div class="reference-fact"><span>${label}</span><strong>${escapeHtml(classificationLabel(value))}</strong></div>`).join("")}
  </div>`;
}

function relationshipsMarkup(relatedExercises) {
  const related = [...relatedExercises].sort((a, b) => {
    const relationDelta = (RELATION_ORDER.get(a.relation) ?? 3) - (RELATION_ORDER.get(b.relation) ?? 3);
    return relationDelta || a.exercise.name.localeCompare(b.exercise.name);
  });
  return `<div class="reference-ladder">
    <div class="reference-ladder-head">Related exercises <span>alternative + progression</span></div>
    ${related.length ? related.map(({ relation, exercise }) => `
      <button class="reference-ladder-row" type="button" data-action="view-alternative" data-id="${escapeHtml(exercise.id)}">
        <span>${escapeHtml(classificationLabel(relation))}</span>
        <strong>${escapeHtml(exercise.name)}</strong>
      </button>`).join("") : `<p class="reference-empty">No related exercises linked.</p>`}
  </div>`;
}

export function exerciseReferenceMarkup({
  exercise,
  prescription,
  relatedExercises,
}) {
  const contextLabel = prescription ? "Routine prescription" : "Default prescription";
  const shownPrescription = prescription || exercise.defaultPrescription || "No prescription";
  const meta = [
    exercise.movementPattern,
    ...(exercise.equipment || []),
    exercise.style,
  ].filter(Boolean).map(classificationLabel).join(" · ");
  const notes = exercise.instructions || "No notes added yet.";

  return `<article class="reference-sheet">
    <header class="reference-sheet-head">
      <div><h2 id="detailExerciseName">${escapeHtml(exercise.name)}</h2><small>${contextLabel}</small></div>
      <button class="icon-button" data-close-dialog="exerciseDetailDialog" aria-label="Close exercise reference" type="button">×</button>
    </header>
    <div class="reference-sheet-scroll">
      <p class="reference-prescription">${escapeHtml(shownPrescription)}</p>
      ${meta ? `<p class="reference-meta">${escapeHtml(meta)}</p>` : ""}
      ${targetGroupsMarkup(exercise)}
      ${factsMarkup(exercise)}
      ${linkedVideoMarkup(exercise)}
      ${searchActionsMarkup(exercise)}
      ${relationshipsMarkup(relatedExercises)}
      <p class="reference-notes ${exercise.instructions ? "" : "is-empty"}">${escapeHtml(notes)}</p>
    </div>
    <footer class="reference-sheet-actions">
      <button class="button secondary" type="button" data-action="edit-master-exercise" data-id="${escapeHtml(exercise.id)}">Edit exercise</button>
    </footer>
  </article>`;
}

export function exerciseVideoSearchMarkup(exercise) {
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
