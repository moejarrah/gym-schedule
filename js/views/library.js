// Library screen: the searchable list of master exercises with quick groups,
// target scope and the filter sheet. Search and filters last for the session only.

import { mainElement, onStart, registerActions, registerView, render, store } from "../context.js";
import { $, $$, chevronIcon, closeDialog, escapeHtml, openDialog, plural } from "../dom.js";
import { activeLibraryFilterCount, availableBrowseGroups, createLibraryFilters, filteredExercises } from "../search.js";
import { CHALLENGES, EMPHASES, EQUIPMENT, LATERALITIES, MOVEMENTS, PURPOSES, STYLES, TARGETS, label } from "../vocab.js";
import { openExerciseEditor } from "./exercise-editor.js";
import { openExerciseReference } from "./reference.js";

const library = {
  query: "",
  filters: createLibraryFilters(),
  draft: createLibraryFilters(), // the filter sheet's changes until "Show N exercises"
  scroller: null, // reused across renders so the list keeps its scroll position
};

// ---------- markup ----------

function rowTargetSummary(exercise) {
  return exercise.primaryTargets.map(label).join(" · ") || "Needs classification";
}

function libraryRowsMarkup(exercises, { libraryEmpty = false } = {}) {
  if (libraryEmpty) {
    return `<div class="empty-state library-empty"><h3>Library is empty</h3><p>Add a reusable master exercise to get started.</p><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div>`;
  }
  if (!exercises.length) {
    return `<div class="empty-state library-empty"><h3>No matching exercises</h3><p>Change the search or filters, or add a new exercise.</p><div class="library-empty-actions"><button class="button secondary" type="button" data-action="clear-library-filters">Clear filters</button><button class="button primary" type="button" data-action="new-exercise">Add exercise</button></div></div>`;
  }
  return `<div class="library-list">${exercises.map((exercise) => {
    const decisionContext = exercise.purpose === "strength"
      ? `<span>${escapeHtml(label(exercise.movementPattern))}</span>`
      : `<span class="library-purpose">${escapeHtml(label(exercise.purpose))}</span>`;
    return `
    <button class="library-row" type="button" data-action="view-exercise" data-id="${escapeHtml(exercise.id)}" aria-label="View ${escapeHtml(exercise.name)} details">
      <span class="library-row-copy"><span class="library-row-name">${escapeHtml(exercise.name)}</span><span class="library-row-meta"><span class="library-row-rx">${escapeHtml(exercise.defaultPrescription || "No prescription")}</span><span>${escapeHtml(rowTargetSummary(exercise))}</span>${decisionContext}</span></span>
      <span class="library-row-chevron" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`;
  }).join("")}</div>`;
}

function quickGroupMarkup(groups, selectedId) {
  return [{ id: "all", label: "All" }, ...groups].map((group) => `<button class="library-chip" type="button" data-action="select-library-quick-group" data-id="${escapeHtml(group.id)}" aria-pressed="${group.id === selectedId}">${escapeHtml(group.label)}</button>`).join("");
}

function libraryPageShellMarkup(resultCount) {
  return `<section class="page library-page">
    <header class="library-appbar">
      <div class="library-app-title">Library <span id="libraryAppCount">${resultCount}</span></div>
      <button class="icon-button library-add-button" type="button" data-action="new-exercise" aria-label="Add exercise">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </header>
  </section>`;
}

function libraryScrollContentMarkup({ query, filters, exercises, totalCount, browseGroups }) {
  const activeCount = activeLibraryFilterCount(filters);
  return `
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
      <div class="library-result-head"><span id="exerciseResultCount">${plural(exercises.length, "exercise")}</span><button type="button" data-action="toggle-library-target-scope">${filters.targetScope === "primary" ? "Primary only" : "Primary + secondary"}</button></div>
    ` : ""}
    <div id="exerciseList">${libraryRowsMarkup(exercises, { libraryEmpty: totalCount === 0 })}</div>
  `;
}

function filterOptionButtons(group, options, selected) {
  return `<div class="library-filter-options" data-filter-options="${escapeHtml(group)}">${options.map((option) => `
    <button class="library-chip" type="button" data-filter-group="${escapeHtml(group)}" data-filter-value="${escapeHtml(option.id)}" aria-pressed="${selected.includes(option.id)}">${escapeHtml(option.label)}</button>`).join("")}
  </div>`;
}

function exerciseFilterContentMarkup(filters) {
  return `
    <p class="library-filter-label">Target matching</p>
    <div class="segment library-filter-scope" role="group" aria-label="Target matching">
      <button type="button" data-filter-scope="primary" aria-pressed="${filters.targetScope === "primary"}">Primary only</button>
      <button type="button" data-filter-scope="all" aria-pressed="${filters.targetScope === "all"}">Primary + secondary</button>
    </div>
    <p class="library-filter-label">Targets</p>
    ${filterOptionButtons("targets", TARGETS, filters.targets)}
    <p class="library-filter-label">Movement</p>
    ${filterOptionButtons("movements", MOVEMENTS, filters.movements)}
    <p class="library-filter-label">Equipment</p>
    ${filterOptionButtons("equipment", EQUIPMENT, filters.equipment)}
    <p class="library-filter-label">Purpose</p>
    ${filterOptionButtons("purposes", PURPOSES, filters.purposes)}
    <details class="library-more-filters">
      <summary><strong>More filters</strong><span>Style · side · emphasis · challenge</span></summary>
      <p class="library-filter-label">Style</p>
      ${filterOptionButtons("styles", STYLES, filters.styles)}
      <p class="library-filter-label">Laterality</p>
      ${filterOptionButtons("lateralities", LATERALITIES, filters.lateralities)}
      <p class="library-filter-label">Emphasis</p>
      ${filterOptionButtons("emphases", EMPHASES, filters.emphases)}
      <p class="library-filter-label">Typical challenge</p>
      ${filterOptionButtons("challenges", CHALLENGES, filters.challenges)}
    </details>`;
}

// ---------- screen ----------

const visibleExercises = (state, filters = library.filters) => filteredExercises(state, { query: library.query, ...filters });

function renderLibrary(state, main) {
  const { scroller } = library;
  const scrollTop = scroller.scrollTop;
  const exercises = visibleExercises(state);
  main.innerHTML = libraryPageShellMarkup(exercises.length);
  scroller.innerHTML = libraryScrollContentMarkup({
    query: library.query,
    filters: library.filters,
    exercises,
    totalCount: state.exercises.length,
    browseGroups: availableBrowseGroups(state, library.filters.targetScope),
  });
  $(".library-page", main).append(scroller);
  scroller.scrollTop = scrollTop;
}

// Typing only replaces the rows and counts, so the search field keeps focus.
function renderRows(state) {
  const exercises = visibleExercises(state);
  $("#libraryAppCount").textContent = String(exercises.length);
  $("#exerciseResultCount").textContent = plural(exercises.length, "exercise");
  $("#exerciseList").innerHTML = libraryRowsMarkup(exercises);
}

// Re-renders the screen, then focuses the re-rendered control the user just used.
function renderAndFocus(selector) {
  render();
  requestAnimationFrame(() => $(selector, mainElement())?.focus());
}

// ---------- filter sheet ----------

function updateFilterCount() {
  const count = visibleExercises(store.getState(), library.draft).length;
  $("#applyExerciseFilterButton").textContent = `Show ${plural(count, "exercise")}`;
}

function renderFilterDraft() {
  const content = $("#exerciseFilterContent");
  content.innerHTML = exerciseFilterContentMarkup(library.draft);
  content.scrollTop = 0;
  updateFilterCount();
}

function openFilter(button) {
  library.draft = structuredClone(library.filters);
  renderFilterDraft();
  openDialog("#exerciseFilterDialog", {
    returnFocus: button,
    // Applying re-renders the screen, so focus the new Filter button.
    fallbackFocus: () => $(".library-filter-button", mainElement()),
  });
}

function toggleFilterOption(option) {
  const { filterGroup: group, filterValue: value } = option.dataset;
  const selected = library.draft[group];
  library.draft[group] = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
  // Choosing targets in the sheet replaces the quick group.
  if (group === "targets") library.draft.quickGroup = "all";
  option.setAttribute("aria-pressed", String(!selected.includes(value)));
}

onStart(() => {
  library.scroller = document.createElement("div");
  library.scroller.className = "library-scroll";
  library.scroller.addEventListener("input", (event) => {
    library.query = event.target.value;
    renderRows(store.getState());
  });

  $("#exerciseFilterContent").addEventListener("click", (event) => {
    const scope = event.target.closest("[data-filter-scope]");
    const option = event.target.closest("[data-filter-group]");
    if (scope) {
      library.draft.targetScope = scope.dataset.filterScope;
      for (const button of $$("[data-filter-scope]")) button.setAttribute("aria-pressed", String(button === scope));
    } else if (option) {
      toggleFilterOption(option);
    } else {
      return;
    }
    updateFilterCount();
  });

  $("#clearExerciseFilterButton").addEventListener("click", () => {
    library.draft = createLibraryFilters();
    renderFilterDraft();
  });

  $("#applyExerciseFilterButton").addEventListener("click", () => {
    library.filters = structuredClone(library.draft);
    closeDialog("#exerciseFilterDialog");
    render();
  });
});

registerView("exercises", { render: renderLibrary });

registerActions({
  "new-exercise": (button) => openExerciseEditor({ returnFocus: button }),
  "view-exercise": (button) => openExerciseReference(button.dataset.id),
  "open-exercise-filter": (button) => openFilter(button),
  "select-library-quick-group": (button) => {
    library.filters.quickGroup = button.dataset.id;
    library.filters.targets = [];
    renderAndFocus(`[data-action="select-library-quick-group"][data-id="${CSS.escape(button.dataset.id)}"]`);
  },
  "toggle-library-target-scope": () => {
    library.filters.targetScope = library.filters.targetScope === "primary" ? "all" : "primary";
    renderAndFocus('[data-action="toggle-library-target-scope"]');
  },
  "clear-library-filters": () => {
    library.query = "";
    library.filters = createLibraryFilters();
    renderAndFocus("#exerciseSearch");
  },
});
