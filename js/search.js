// Exercise search and Library filters (pure functions, shared by Library,
// the add-exercise picker and the related-exercise editor).

import { normalizedName } from "./store.js";
import { BROWSE_GROUPS, label } from "./vocab.js";

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

// Everything a search can match besides the name: aliases and classification labels.
export function exerciseSearchTerms(exercise) {
  return [
    ...(exercise?.aliases || []),
    ...[
      ...exerciseTargets(exercise),
      exercise?.movementPattern,
      ...(exercise?.equipment || []),
      exercise?.purpose,
      exercise?.style,
      exercise?.laterality,
      ...(exercise?.emphases || []),
      exercise?.typicalChallenge,
    ].filter(Boolean).map(label),
  ];
}

// Punctuation- and case-insensitive: "ab wheel" matches "Ab-wheel rollout".
export function matchesSearch(exercise, query) {
  const needle = normalizedName(query);
  if (!needle) return true;
  return [exercise.name, ...exerciseSearchTerms(exercise)].some((value) => normalizedName(value).includes(needle));
}

export function searchExercises(exercises, query) {
  return exercises.filter((exercise) => matchesSearch(exercise, query)).sort((a, b) => a.name.localeCompare(b.name));
}

function targetsForScope(exercise, targetScope) {
  return targetScope === "primary" ? exercise.primaryTargets : exerciseTargets(exercise);
}

function matchesBrowseGroup(exercise, groupId, targetScope) {
  if (!groupId || groupId === "all") return true;
  const group = BROWSE_GROUPS.find((item) => item.id === groupId);
  if (!group) return false;
  const targets = targetsForScope(exercise, targetScope);
  return group.targetIds.some((id) => targets.includes(id)) || group.movementIds.includes(exercise.movementPattern);
}

const anyOf = (values, selected) => !selected.length || selected.some((value) => values.includes(value));
const oneOf = (value, selected) => !selected.length || selected.includes(value);

// OR inside one filter group, AND across groups. Selected targets replace the quick group.
export function filteredExercises(state, { query = "", ...provided } = {}) {
  const filters = { ...createLibraryFilters(), ...provided };
  return searchExercises(state.exercises.filter((exercise) => (
    (filters.targets.length ? anyOf(targetsForScope(exercise, filters.targetScope), filters.targets) : matchesBrowseGroup(exercise, filters.quickGroup, filters.targetScope))
    && oneOf(exercise.movementPattern, filters.movements)
    && anyOf(exercise.equipment, filters.equipment)
    && oneOf(exercise.purpose, filters.purposes)
    && oneOf(exercise.style, filters.styles)
    && oneOf(exercise.laterality, filters.lateralities)
    && anyOf(exercise.emphases, filters.emphases)
    && oneOf(exercise.typicalChallenge, filters.challenges)
  )), query);
}

export function activeLibraryFilterCount(filters) {
  return [
    filters.quickGroup !== "all" || filters.targets.length > 0,
    filters.targetScope !== "primary",
    ...["movements", "equipment", "purposes", "styles", "lateralities", "emphases", "challenges"].map((key) => filters[key].length > 0),
  ].filter(Boolean).length;
}

// Browse groups that contain at least one exercise.
export function availableBrowseGroups(state, targetScope = "primary") {
  return BROWSE_GROUPS.filter((group) => state.exercises.some((exercise) => matchesBrowseGroup(exercise, group.id, targetScope)));
}
