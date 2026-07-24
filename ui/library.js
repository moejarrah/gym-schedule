import { classificationLabel } from "../data.js?v=37";
import { chevronIcon, escapeHtml } from "./shared.js?v=37";

export function exerciseTargets(exercise) {
  return [...(exercise?.primaryTargets || []), ...(exercise?.secondaryTargets || [])];
}

export function exerciseSearchTerms(exercise) {
  return [
    ...exerciseTargets(exercise),
    exercise?.movementPattern,
    ...(exercise?.equipment || []),
    exercise?.purpose,
    exercise?.style,
    exercise?.laterality,
    ...(exercise?.emphases || []),
  ].filter(Boolean).map(classificationLabel);
}

function targetSummary(exercise) {
  const primary = exercise?.primaryTargets?.map(classificationLabel).join(" / ") || "Needs classification";
  const secondary = exercise?.secondaryTargets?.map(classificationLabel).join(" / ");
  return secondary ? `${primary} · Also ${secondary}` : primary;
}

export function classificationSummary(exercise) {
  return [targetSummary(exercise), classificationLabel(exercise?.movementPattern), classificationLabel(exercise?.purpose)].filter(Boolean).join(" · ");
}

export function filteredExercises(state, {
  query,
  target,
  targetScope,
  purpose,
}) {
  const needle = query.trim().toLowerCase();
  return state.exercises
    .filter((exercise) => target === "All" || (targetScope === "primary" ? exercise.primaryTargets : exerciseTargets(exercise)).includes(target))
    .filter((exercise) => purpose === "All" || exercise.purpose === purpose)
    .filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle) || exerciseSearchTerms(exercise).some((item) => item.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function libraryRowsMarkup(exercises) {
  if (!exercises.length) {
    return `<div class="empty-state compact-empty"><h3>No matching exercises</h3><p>Change the search or filters, or add a new exercise.</p><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div>`;
  }
  return `<div class="library-list">${exercises.map((exercise) => `
    <button class="library-row" type="button" data-action="view-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="View ${escapeHtml(exercise.name)} details">
      <span class="row-main"><span class="row-title">${escapeHtml(exercise.name)}</span><span class="row-meta">${escapeHtml(exercise.defaultPrescription || "No prescription")} · ${escapeHtml(classificationSummary(exercise))}</span></span>
      <span class="workout-chevron" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`).join("")}</div>`;
}

export function libraryMarkup({
  query,
  target,
  targetScope,
  purpose,
  exercises,
}) {
  const resultCount = exercises.length;
  const activeFilters = [];
  if (target !== "All") activeFilters.push(`${classificationLabel(target)} · ${targetScope === "primary" ? "Primary" : "Any"}`);
  if (purpose !== "All") activeFilters.push(classificationLabel(purpose));
  const filterLabel = activeFilters.length ? activeFilters.join(" + ") : "Filter";
  return `<section class="page">
    <div class="compact-toolbar library-toolbar">
      <span class="result-count" id="exerciseResultCount">${resultCount} ${resultCount === 1 ? "result" : "results"}</span>
      <button class="button primary compact-button" type="button" data-action="new-exercise">Add exercise</button>
    </div>
    <div class="library-controls">
      <label class="search-field"><span class="visually-hidden">Search exercises</span><input id="exerciseSearch" type="search" value="${escapeHtml(query)}" autocomplete="off" placeholder="Search exercises"></label>
      <button class="button secondary filter-button" type="button" data-action="open-exercise-filter" aria-label="Filter exercises, currently ${escapeHtml(filterLabel)}">${escapeHtml(filterLabel)}</button>
    </div>
    <div id="exerciseList">${libraryRowsMarkup(exercises)}</div>
  </section>`;
}
