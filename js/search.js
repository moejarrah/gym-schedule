// Exercise search and Library filters (pure functions, shared by Library,
// the add-exercise picker and the related-exercise editor).

import { byFullName, fullName, normalizedName } from "./model.js";
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

function exerciseTargets(exercise) {
  return [...(exercise?.primaryTargets || []), ...(exercise?.secondaryTargets || [])];
}

// Everything a search can match besides the name: aliases and classification labels.
function exerciseSearchTerms(exercise) {
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
function matchesSearch(exercise, query) {
  const needle = normalizedName(query);
  if (!needle) return true;
  // The name with its setup counts as one term ("Lat pulldown (machine, overhand)", plus
  // "grip" so "overhand grip" still works); otherwise every word must be found somewhere.
  const terms = [`${fullName(exercise)}${exercise.grip || exercise.width ? " grip" : ""}`, ...exerciseSearchTerms(exercise)].map(normalizedName);
  if (terms.some((term) => term.includes(needle))) return true;
  const words = query.split(/[\s(),·]+/).map(normalizedName).filter(Boolean);
  return words.length > 1 && words.every((word) => terms.some((term) => term.includes(word)));
}

export function searchExercises(exercises, query) {
  return exercises.filter((exercise) => matchesSearch(exercise, query)).sort(byFullName);
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
