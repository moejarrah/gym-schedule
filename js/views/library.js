// Library screen: the searchable list of master exercises with quick groups,
// target scope and the filter sheet. Search and filters last for the session only.

import { mainElement, registerActions, registerView, render, store } from "../context.js";
import { $, $$, chevronIcon, closeDialog, escapeHtml, fresh, openDialog, plural, redraw } from "../dom.js";
import { activeLibraryFilterCount, availableBrowseGroups, createLibraryFilters, filteredExercises } from "../search.js";
import { CHALLENGES, EMPHASES, EQUIPMENT, LATERALITIES, MOVEMENTS, PURPOSES, STYLES, TARGETS, label } from "../vocab.js";
import { openExerciseEditor } from "./exercise-editor.js";
import { openExerciseReference } from "./reference.js";
import { exerciseLabel, nameMarkup } from "./shared.js";

const library = {
  query: "",
  filters: createLibraryFilters(),
  draft: createLibraryFilters(), // the filter sheet's changes until "Show N exercises"
};

// ---------- markup ----------

function rowTargetSummary(exercise) {
  return exercise.primaryTargets.map(label).join(" · ") || "Needs classification";
}

function libraryRowsMarkup(exercises, { libraryEmpty = false } = {}) {
  if (libraryEmpty) {
    return `<div class="empty"><h3>Library is empty</h3><p>Add a reusable master exercise to get started.</p><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div>`;
  }
  if (!exercises.length) {
    return `<div class="empty"><h3>No matching exercises</h3><p>Change the search or filters, or add a new exercise.</p><div class="actions"><button class="button" type="button" data-action="clear-library-filters">Clear filters</button><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div></div>`;
  }
  // Grouped by the muscle each exercise mainly trains, in the vocabulary's order
  // (chest, back, shoulders, arms, core, legs …), alphabetical inside a group.
  const groups = TARGETS.map((target) => ({ target, items: exercises.filter((exercise) => exercise.primaryTargets[0] === target.id) })).filter((group) => group.items.length);
  const known = new Set(TARGETS.map((target) => target.id));
  const other = exercises.filter((exercise) => !known.has(exercise.primaryTargets[0]));
  if (other.length) groups.push({ target: { label: "Other" }, items: other });
  return groups.map(({ target, items }) => `<section class="workout-group is-solid" aria-label="${escapeHtml(target.label)}">
    <div class="label section-label"><span>${escapeHtml(target.label)}</span><span>${items.length}</span></div>
    ${rowsMarkup(items)}
  </section>`).join("");
}

function rowsMarkup(exercises) {
  return `<div>${exercises.map((exercise) => {
    const decisionContext = exercise.purpose === "strength"
      ? `<span>${escapeHtml(label(exercise.movementPattern))}</span>`
      : `<span class="label tag rehab">${escapeHtml(label(exercise.purpose))}</span>`;
    return `
    <button class="row tall" type="button" data-action="view-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="View ${escapeHtml(exercise.name)} details">
      <span class="row-main"><span class="row-title">${nameMarkup(exercise)}</span><span class="row-meta">${exerciseLabel(exercise).version ? `<span>${escapeHtml(exerciseLabel(exercise).version)}</span>` : ""}<span class="rx">${escapeHtml(exercise.defaultPrescription || "No prescription")}</span><span>${escapeHtml(rowTargetSummary(exercise))}</span>${decisionContext}</span></span>
      <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`;
  }).join("")}</div>`;
}

function quickGroupMarkup(groups, selectedId) {
  return [{ id: "all", label: "All" }, ...groups].map((group) => `<button class="pill" type="button" data-action="select-library-quick-group" data-id="${escapeHtml(group.id)}" aria-pressed="${group.id === selectedId}">${escapeHtml(group.label)}</button>`).join("");
}

function libraryMarkup(state) {
  const { query, filters } = library;
  const exercises = visibleExercises(state);
  const totalCount = state.exercises.length;
  const browseGroups = availableBrowseGroups(state, filters.targetScope);
  const activeCount = activeLibraryFilterCount(filters);
  return `<section class="page fills">
    <header class="appbar">
      <div class="title">Library <span id="libraryAppCount">${exercises.length}</span></div>
      <button class="icon-button filled" type="button" data-action="new-exercise" aria-label="Add exercise">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </header>
    <div class="scroll" data-keep-scroll="library">
    ${totalCount ? `
      <label class="search">
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <span class="visually-hidden">Search exercises</span>
        <input id="exerciseSearch" type="search" value="${escapeHtml(query)}" autocomplete="off" placeholder="Exercise, target, or movement">
      </label>
      <div class="library-quickbar">
        <div class="chips scroll-x" aria-label="Quick target filters" data-keep-scroll="library-groups">${quickGroupMarkup(browseGroups, filters.quickGroup)}</div>
        <button class="pill filter-button" type="button" data-action="open-exercise-filter" aria-label="Filter exercises${activeCount ? `, ${activeCount} active ${activeCount === 1 ? "group" : "groups"}` : ""}">Filter${activeCount ? ` <b>${activeCount}</b>` : ""}</button>
      </div>
      <div class="label section-label library-result-head"><span id="exerciseResultCount">${plural(exercises.length, "exercise")}</span><button class="link-button" type="button" data-action="toggle-library-target-scope">${filters.targetScope === "primary" ? "Primary only" : "Primary + secondary"}</button></div>
    ` : ""}
    <div id="exerciseList">${libraryRowsMarkup(exercises, { libraryEmpty: totalCount === 0 })}</div>
    </div>
  </section>`;
}

function filterOptionButtons(group, options, selected) {
  return `<div class="chips" data-filter-options="${escapeHtml(group)}">${options.map((option) => `
    <button class="pill" type="button" data-action="toggle-filter-option" data-filter-group="${escapeHtml(group)}" data-filter-value="${escapeHtml(option.id)}" aria-pressed="${selected.includes(option.id)}">${escapeHtml(option.label)}</button>`).join("")}
  </div>`;
}

function exerciseFilterContentMarkup(filters) {
  return `
    <p class="label">Target matching</p>
    <div class="segment" role="group" aria-label="Target matching">
      <button type="button" data-action="set-filter-scope" data-scope="primary" aria-pressed="${filters.targetScope === "primary"}">Primary only</button>
      <button type="button" data-action="set-filter-scope" data-scope="all" aria-pressed="${filters.targetScope === "all"}">Primary + secondary</button>
    </div>
    <p class="label">Targets</p>
    ${filterOptionButtons("targets", TARGETS, filters.targets)}
    <p class="label">Movement</p>
    ${filterOptionButtons("movements", MOVEMENTS, filters.movements)}
    <p class="label">Equipment</p>
    ${filterOptionButtons("equipment", EQUIPMENT, filters.equipment)}
    <p class="label">Purpose</p>
    ${filterOptionButtons("purposes", PURPOSES, filters.purposes)}
    <details class="more" data-keep-open="more-filters" ${["styles", "lateralities", "emphases", "challenges"].some((group) => filters[group].length) ? "open" : ""}>
      <summary><strong>More filters</strong><span>Style · side · emphasis · challenge</span></summary>
      <p class="label">Style</p>
      ${filterOptionButtons("styles", STYLES, filters.styles)}
      <p class="label">Laterality</p>
      ${filterOptionButtons("lateralities", LATERALITIES, filters.lateralities)}
      <p class="label">Emphasis</p>
      ${filterOptionButtons("emphases", EMPHASES, filters.emphases)}
      <p class="label">Typical challenge</p>
      ${filterOptionButtons("challenges", CHALLENGES, filters.challenges)}
    </details>`;
}

// ---------- screen ----------

const visibleExercises = (state, filters = library.filters) => filteredExercises(state, { query: library.query, ...filters });

// Typing only replaces the rows and counts, so the search field keeps the keyboard.
function renderRows(state) {
  const exercises = visibleExercises(state);
  $("#libraryAppCount").textContent = String(exercises.length);
  $("#exerciseResultCount").textContent = plural(exercises.length, "exercise");
  $("#exerciseList").innerHTML = libraryRowsMarkup(exercises);
}

// ---------- filter sheet ----------

function updateFilterCount() {
  const count = visibleExercises(store.getState(), library.draft).length;
  $("#applyExerciseFilterButton").textContent = `Show ${plural(count, "exercise")}`;
}

// `fromTop`: the sheet was just opened. A redraw while it's open keeps its place.
function renderFilterDraft(fromTop = false) {
  const content = $("#exerciseFilterContent");
  const { scrollTop } = content;
  redraw(content, exerciseFilterContentMarkup(library.draft));
  content.scrollTop = fromTop ? 0 : scrollTop;
  updateFilterCount();
}

function openFilter() {
  library.draft = structuredClone(library.filters);
  renderFilterDraft(true);
  openDialog("#exerciseFilterDialog");
}

function toggleFilterOption(option) {
  const { filterGroup: group, filterValue: value } = option.dataset;
  const selected = library.draft[group];
  library.draft[group] = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
  // Choosing targets in the sheet replaces the quick group.
  if (group === "targets") library.draft.quickGroup = "all";
  option.setAttribute("aria-pressed", String(!selected.includes(value)));
  updateFilterCount();
}

mainElement().addEventListener("input", (event) => {
  if (event.target.id !== "exerciseSearch") return;
  library.query = event.target.value;
  renderRows(store.getState());
});

registerView("exercises", { markup: libraryMarkup });

registerActions({
  "new-exercise": () => openExerciseEditor(),
  "view-exercise": (button) => openExerciseReference(button.dataset.id),
  "select-library-quick-group": (button) => {
    // The group already chosen redraws nothing.
    if (library.filters.quickGroup === button.dataset.id && !library.filters.targets.length) return;
    library.filters.quickGroup = button.dataset.id;
    library.filters.targets = [];
    render();
    fresh("#exerciseList");
  },
  "toggle-library-target-scope": () => {
    library.filters.targetScope = library.filters.targetScope === "primary" ? "all" : "primary";
    render();
    fresh("#exerciseList");
  },
  "clear-library-filters": () => {
    library.query = "";
    library.filters = createLibraryFilters();
    render();
    fresh("#exerciseList");
  },

  // The filter sheet works on a draft until "Show N exercises".
  "open-exercise-filter": openFilter,
  "set-filter-scope": (button) => {
    library.draft.targetScope = button.dataset.scope;
    for (const option of $$('[data-action="set-filter-scope"]')) option.setAttribute("aria-pressed", String(option === button));
    updateFilterCount();
  },
  "toggle-filter-option": toggleFilterOption,
  "clear-filter-draft": () => {
    library.draft = createLibraryFilters();
    renderFilterDraft();
  },
  "apply-filter-draft": () => {
    library.filters = structuredClone(library.draft);
    closeDialog("#exerciseFilterDialog");
    render();
    fresh("#exerciseList");
  },
});
