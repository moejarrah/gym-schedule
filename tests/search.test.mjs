import test from "node:test";
import assert from "node:assert/strict";
import { SEED } from "../js/seed.js";
import { availableBrowseGroups, filteredExercises, matchesSearch, searchExercises } from "../js/search.js";
import { BROWSE_GROUPS } from "../js/vocab.js";

const exercise = (name, primaryTargets, secondaryTargets, movementPattern, equipment, aliases = []) => ({
  id: name, name, aliases, primaryTargets, secondaryTargets, movementPattern, equipment, purpose: "strength", style: "", laterality: "", emphases: [], typicalChallenge: "",
});

// Small library with known overlaps: two rows, two band moves, two cable moves, two ab moves.
const LIBRARY = {
  exercises: [
    exercise("Cable row", ["upper-mid-back"], ["biceps"], "horizontal-pull", ["cable"]),
    exercise("Band row", ["lats"], [], "horizontal-pull", ["band"]),
    exercise("Band pull-apart", ["rear-delts"], ["upper-mid-back"], "scapular-control", ["band"]),
    exercise("Cable crunch", ["abs"], [], "trunk-flexion", ["cable"]),
    exercise("Ab-wheel rollout", ["abs"], ["lats"], "anti-extension", ["other"], ["Rollout"]),
  ],
};
const names = (exercises) => exercises.map((item) => item.name);
const filtered = (filters) => names(filteredExercises(LIBRARY, filters));

test("search ignores punctuation and case", () => {
  assert.deepEqual(names(searchExercises(SEED.exercises, "ab wheel")), ["Ab-wheel rollout"]);
  assert.deepEqual(names(searchExercises(LIBRARY.exercises, "BAND-PULL")), ["Band pull-apart"]);
  assert.equal(matchesSearch(LIBRARY.exercises[0], "  "), true);
});

test("search matches aliases", () => {
  const hit = SEED.exercises.find((item) => item.aliases.includes("90/90 hip switches"));
  assert.doesNotMatch(hit.name, /switches/);
  assert.ok(searchExercises(SEED.exercises, "hip switches").includes(hit));
});

test("filters are OR inside one group and AND across groups", () => {
  assert.deepEqual(filtered({ equipment: ["band", "cable"] }), ["Band pull-apart", "Band row", "Cable crunch", "Cable row"]);
  assert.deepEqual(filtered({ equipment: ["band", "cable"], movements: ["horizontal-pull"] }), ["Band row", "Cable row"]);
  assert.deepEqual(filtered({ equipment: ["band", "cable"], query: "row" }), ["Band row", "Cable row"]);
});

test("target filters match primary targets only unless the scope is widened", () => {
  assert.deepEqual(filtered({ targets: ["upper-mid-back"] }), ["Cable row"]);
  assert.deepEqual(filtered({ targets: ["upper-mid-back"], targetScope: "all" }), ["Band pull-apart", "Cable row"]);
});

test("selected targets replace the quick group", () => {
  assert.deepEqual(filtered({ quickGroup: "back" }), ["Band row", "Cable row"]);
  assert.deepEqual(filtered({ quickGroup: "back", targetScope: "all" }), ["Ab-wheel rollout", "Band pull-apart", "Band row", "Cable row"]);
  assert.deepEqual(filtered({ quickGroup: "core", targets: ["lats"] }), ["Band row"]);
});

test("only browse groups that contain an exercise are offered", () => {
  assert.deepEqual(availableBrowseGroups(LIBRARY).map((group) => group.id), ["back", "shoulders", "core", "pull"]);
  assert.deepEqual(availableBrowseGroups(LIBRARY, "all").map((group) => group.id), ["back", "shoulders", "core", "arms", "pull"]);
  const offered = new Set(availableBrowseGroups(SEED).map((group) => group.id));
  for (const group of BROWSE_GROUPS) {
    assert.equal(offered.has(group.id), filteredExercises(SEED, { quickGroup: group.id }).length > 0, group.id);
  }
});
