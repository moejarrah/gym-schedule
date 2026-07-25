import {
  EXERCISE_BROWSE_GROUPS,
  EXERCISE_CHALLENGES,
  EXERCISE_EMPHASES,
  EXERCISE_EQUIPMENT,
  EXERCISE_LATERALITIES,
  EXERCISE_PURPOSES,
  EXERCISE_STYLES,
  EXERCISE_TARGETS,
  MOVEMENT_PATTERNS,
  RELATED_EXERCISE_RELATIONS,
  classificationLabel,
} from "../data.js?v=44";
import { chevronIcon, escapeHtml } from "./shared.js?v=44";

export function createLibraryFilters() {
  return {
    quickGroup: "all",
    targetScope: "primary",
    targets: [],
    movements: [],
    equipment: [],
    purposes: [],
    styles: [],
    lateralities: [],
    emphases: [],
    challenges: [],
  };
}

export function exerciseTargets(exercise) {
  return [...(exercise?.primaryTargets || []), ...(exercise?.secondaryTargets || [])];
}

export function exerciseSearchTerms(exercise) {
  return [
    ...(exercise?.aliases || []),
    ...exerciseTargets(exercise),
    exercise?.movementPattern,
    ...(exercise?.equipment || []),
    exercise?.purpose,
    exercise?.style,
    exercise?.laterality,
    ...(exercise?.emphases || []),
    exercise?.typicalChallenge,
  ].filter(Boolean).map(classificationLabel);
}

export function normalizedExerciseSearch(value = "") {
  return (String(value).normalize("NFKD").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join("");
}

function targetSummary(exercise) {
  const primary = exercise?.primaryTargets?.map(classificationLabel).join(" / ") || "Needs classification";
  const secondary = exercise?.secondaryTargets?.map(classificationLabel).join(" / ");
  return secondary ? `${primary} · Also ${secondary}` : primary;
}

export function classificationSummary(exercise) {
  return [targetSummary(exercise), classificationLabel(exercise?.movementPattern), classificationLabel(exercise?.purpose)].filter(Boolean).join(" · ");
}

function targetsForScope(exercise, targetScope) {
  return targetScope === "primary" ? exercise.primaryTargets : exerciseTargets(exercise);
}

function matchesBrowseGroup(exercise, groupId, targetScope) {
  if (!groupId || groupId === "all") return true;
  const group = EXERCISE_BROWSE_GROUPS.find((item) => item.id === groupId);
  if (!group) return false;
  const targets = targetsForScope(exercise, targetScope);
  return group.targetIds.some((id) => targets.includes(id))
    || group.movementIds.includes(exercise.movementPattern);
}

function matchesSelected(values, selected) {
  return !selected.length || selected.some((value) => values.includes(value));
}

function matchesSelectedValue(value, selected) {
  return !selected.length || selected.includes(value);
}

export function filteredExercises(state, { query = "", ...providedFilters } = {}) {
  const filters = { ...createLibraryFilters(), ...providedFilters };
  const needle = normalizedExerciseSearch(query);
  return state.exercises
    .filter((exercise) => !filters.targets.length || matchesSelected(targetsForScope(exercise, filters.targetScope), filters.targets))
    .filter((exercise) => filters.targets.length || matchesBrowseGroup(exercise, filters.quickGroup, filters.targetScope))
    .filter((exercise) => matchesSelectedValue(exercise.movementPattern, filters.movements))
    .filter((exercise) => matchesSelected(exercise.equipment || [], filters.equipment))
    .filter((exercise) => matchesSelectedValue(exercise.purpose, filters.purposes))
    .filter((exercise) => matchesSelectedValue(exercise.style, filters.styles))
    .filter((exercise) => matchesSelectedValue(exercise.laterality, filters.lateralities))
    .filter((exercise) => matchesSelected(exercise.emphases || [], filters.emphases))
    .filter((exercise) => matchesSelectedValue(exercise.typicalChallenge, filters.challenges))
    .filter((exercise) => {
      if (!needle) return true;
      return [exercise.name, ...exerciseSearchTerms(exercise)]
        .some((value) => normalizedExerciseSearch(value).includes(needle));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function activeLibraryFilterCount(filters) {
  return [
    filters.quickGroup !== "all" || filters.targets.length > 0,
    filters.targetScope !== "primary",
    filters.movements.length > 0,
    filters.equipment.length > 0,
    filters.purposes.length > 0,
    filters.styles.length > 0,
    filters.lateralities.length > 0,
    filters.emphases.length > 0,
    filters.challenges.length > 0,
  ].filter(Boolean).length;
}

export function availableLibraryBrowseGroups(state, targetScope = "primary") {
  return EXERCISE_BROWSE_GROUPS.filter((group) => (
    state.exercises.some((exercise) => matchesBrowseGroup(exercise, group.id, targetScope))
  ));
}

function rowTargetSummary(exercise) {
  return exercise.primaryTargets.map(classificationLabel).join(" · ") || "Needs classification";
}

export function libraryRowsMarkup(exercises, { libraryEmpty = false } = {}) {
  if (libraryEmpty) {
    return `<div class="empty-state library-empty"><h3>Library is empty</h3><p>Add a reusable master exercise to get started.</p><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div>`;
  }
  if (!exercises.length) {
    return `<div class="empty-state library-empty"><h3>No matching exercises</h3><p>Change the search or filters, or add a new exercise.</p><div class="library-empty-actions"><button class="button secondary" type="button" data-action="clear-library-filters">Clear filters</button><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div></div>`;
  }
  return `<div class="library-list">${exercises.map((exercise) => {
    const purpose = classificationLabel(exercise.purpose);
    const decisionContext = exercise.purpose === "strength"
      ? `<span>${escapeHtml(classificationLabel(exercise.movementPattern))}</span>`
      : `<span class="library-purpose">${escapeHtml(purpose)}</span>`;
    return `
    <button class="library-row" type="button" data-action="view-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="View ${escapeHtml(exercise.name)} details">
      <span class="library-row-copy"><span class="library-row-name">${escapeHtml(exercise.name)}</span><span class="library-row-meta"><span class="library-row-rx">${escapeHtml(exercise.defaultPrescription || "No prescription")}</span><span>${escapeHtml(rowTargetSummary(exercise))}</span>${decisionContext}</span></span>
      <span class="library-row-chevron" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`;
  }).join("")}</div>`;
}

function quickGroupMarkup(groups, selectedId) {
  return [
    { id: "all", label: "All" },
    ...groups,
  ].map((group) => `<button class="library-chip" type="button" data-action="select-library-quick-group" data-id="${escapeHtml(group.id)}" aria-pressed="${group.id === selectedId}">${escapeHtml(group.label)}</button>`).join("");
}

export function libraryMarkup({
  query,
  filters,
  exercises,
  totalCount,
  browseGroups,
}) {
  const resultCount = exercises.length;
  const activeCount = activeLibraryFilterCount(filters);
  const countLabel = `${resultCount} ${resultCount === 1 ? "exercise" : "exercises"}`;
  return `<section class="page library-page">
    <header class="library-appbar">
      <div class="library-app-title">Library <span id="libraryAppCount">${resultCount}</span></div>
      <button class="icon-button library-add-button" type="button" data-action="new-exercise" aria-label="Add exercise">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </header>
    <div class="library-scroll">
      ${totalCount ? `
        <label class="library-search">
          <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <span class="visually-hidden">Search exercises</span>
          <input id="exerciseSearch" type="search" value="${escapeHtml(query)}" autocomplete="off" placeholder="Exercise, target, or movement">
        </label>
        <div class="library-quickbar">
          <div class="library-quick-scroll" aria-label="Quick target filters">${quickGroupMarkup(browseGroups, filters.quickGroup)}</div>
          <button class="library-filter-button" type="button" data-action="open-exercise-filter" aria-label="Filter exercises${activeCount ? `, ${activeCount} active ${activeCount === 1 ? "group" : "groups"}` : ""}">Filter${activeCount ? ` <b>${activeCount}</b>` : ""}</button>
        </div>
        <div class="library-result-head"><span id="exerciseResultCount">${countLabel}</span><button type="button" data-action="toggle-library-target-scope">${filters.targetScope === "primary" ? "Primary only" : "Primary + secondary"}</button></div>
      ` : ""}
      <div id="exerciseList">${libraryRowsMarkup(exercises, { libraryEmpty: totalCount === 0 })}</div>
    </div>
  </section>`;
}

function filterOptionButtons(group, options, selected) {
  return `<div class="library-filter-options" data-filter-options="${escapeHtml(group)}">${options.map((option) => `
    <button class="library-chip" type="button" data-filter-group="${escapeHtml(group)}" data-filter-value="${escapeHtml(option.id)}" aria-pressed="${selected.includes(option.id)}">${escapeHtml(option.label)}</button>`).join("")}
  </div>`;
}

export function exerciseFilterContentMarkup(filters) {
  return `
    <p class="library-filter-label">Target matching</p>
    <div class="segment library-filter-scope" role="group" aria-label="Target matching">
      <button type="button" data-filter-scope="primary" aria-pressed="${filters.targetScope === "primary"}">Primary only</button>
      <button type="button" data-filter-scope="all" aria-pressed="${filters.targetScope === "all"}">Primary + secondary</button>
    </div>
    <p class="library-filter-label">Targets</p>
    ${filterOptionButtons("targets", EXERCISE_TARGETS, filters.targets)}
    <p class="library-filter-label">Movement</p>
    ${filterOptionButtons("movements", MOVEMENT_PATTERNS, filters.movements)}
    <p class="library-filter-label">Equipment</p>
    ${filterOptionButtons("equipment", EXERCISE_EQUIPMENT, filters.equipment)}
    <p class="library-filter-label">Purpose</p>
    ${filterOptionButtons("purposes", EXERCISE_PURPOSES, filters.purposes)}
    <details class="library-more-filters">
      <summary><strong>More filters</strong><span>Style · side · emphasis · challenge</span></summary>
      <p class="library-filter-label">Style</p>
      ${filterOptionButtons("styles", EXERCISE_STYLES, filters.styles)}
      <p class="library-filter-label">Laterality</p>
      ${filterOptionButtons("lateralities", EXERCISE_LATERALITIES, filters.lateralities)}
      <p class="library-filter-label">Emphasis</p>
      ${filterOptionButtons("emphases", EXERCISE_EMPHASES, filters.emphases)}
      <p class="library-filter-label">Typical challenge</p>
      ${filterOptionButtons("challenges", EXERCISE_CHALLENGES, filters.challenges)}
    </details>`;
}

export function classificationOptionPickerMarkup({
  options,
  selected = [],
  excluded = [],
}) {
  const selectedIds = new Set(selected);
  const excludedIds = new Set(excluded);
  return options.map((option) => {
    const isSelected = selectedIds.has(option.id);
    const isExcluded = excludedIds.has(option.id);
    return `<button class="classification-option" type="button" data-classification-value="${escapeHtml(option.id)}" aria-pressed="${isSelected}" ${isExcluded ? "disabled" : ""}>
      <span>${escapeHtml(option.label)}</span>
      <span class="classification-option-state">${isExcluded ? "Primary target" : isSelected ? "Selected" : ""}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>
    </button>`;
  }).join("");
}

function relationshipLabel(relation) {
  return relation === "similar" ? "Alternative" : classificationLabel(relation);
}

export function relationshipEditorMarkup({
  linkedExercises = [],
  availableExercises = [],
  query = "",
}) {
  const linkedMarkup = linkedExercises.length ? linkedExercises.map(({ exercise, relation }) => `
    <article class="relationship-linked-row" data-related-id="${escapeHtml(exercise.id)}">
      <div class="relationship-row-copy">
        <strong>${escapeHtml(exercise.name)}</strong>
        <small>${escapeHtml(classificationSummary(exercise))}</small>
      </div>
      <label class="relationship-relation">
        <span class="visually-hidden">Relationship to ${escapeHtml(exercise.name)}</span>
        <select data-related-relation="${escapeHtml(exercise.id)}" aria-label="Relationship to ${escapeHtml(exercise.name)}">
          ${RELATED_EXERCISE_RELATIONS.map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === relation ? "selected" : ""}>${escapeHtml(relationshipLabel(option.id))}</option>`).join("")}
        </select>
      </label>
      <button class="relationship-remove" type="button" data-remove-related="${escapeHtml(exercise.id)}" aria-label="Remove relationship to ${escapeHtml(exercise.name)}">Remove</button>
    </article>`).join("") : `<p class="relationship-empty">No related exercises yet.</p>`;
  const availableMarkup = availableExercises.length ? availableExercises.map((exercise) => `
    <button class="relationship-result" type="button" data-add-related="${escapeHtml(exercise.id)}">
      <span class="relationship-row-copy">
        <strong>${escapeHtml(exercise.name)}</strong>
        <small>${escapeHtml(classificationSummary(exercise))}</small>
      </span>
      <span aria-hidden="true">Add</span>
    </button>`).join("") : `<p class="relationship-empty">${query.trim() ? "No matching exercises." : "Every available exercise is already linked."}</p>`;
  return `
    <section class="relationship-group" aria-labelledby="linkedRelationshipsHeading">
      <div class="relationship-group-head"><h3 id="linkedRelationshipsHeading">Linked</h3><span>${linkedExercises.length}</span></div>
      ${linkedMarkup}
    </section>
    <section class="relationship-group" aria-labelledby="availableRelationshipsHeading">
      <div class="relationship-group-head"><h3 id="availableRelationshipsHeading">Add relationship</h3><span>${availableExercises.length}</span></div>
      ${availableMarkup}
    </section>`;
}
