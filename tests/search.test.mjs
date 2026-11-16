import test from "node:test";
import assert from "node:assert/strict";
import { filteredExercises, searchExercises } from "../js/search.js";
import { sampleState } from "./sample.mjs";

const library = sampleState();
const names = (exercises) => exercises.map((item) => item.name);
const filtered = (filters) => names(filteredExercises(library, filters));

test("search ignores punctuation and case, and matches aliases and classification", () => {
  assert.deepEqual(names(searchExercises(library.exercises, "ab wheel")), ["Ab-wheel rollout"]);
  assert.deepEqual(names(searchExercises(library.exercises, "FLAT-bench")), ["Bench press"]);
  assert.deepEqual(names(searchExercises(library.exercises, "pull-up bar")), ["Pull-up"]);
  assert.equal(searchExercises(library.exercises, "  ").length, library.exercises.length);
});

test("filters are OR inside one group and AND across groups; targets are primary-only unless widened", () => {
  assert.deepEqual(filtered({ equipment: ["cable", "bodyweight"] }), ["Cable fly", "Push-up"]);
  assert.deepEqual(filtered({ equipment: ["cable", "bodyweight"], movements: ["fly"] }), ["Cable fly"]);
  assert.deepEqual(filtered({ equipment: ["barbell"], query: "press" }), ["Bench press"]);
  assert.deepEqual(filtered({ targets: ["biceps"] }), []);
  assert.deepEqual(filtered({ targets: ["biceps"], targetScope: "all" }), ["Pull-up"]);
  assert.deepEqual(filtered({ quickGroup: "core" }), ["Ab-wheel rollout", "Plank"]);
  assert.deepEqual(filtered({ quickGroup: "core", targets: ["lats"] }), ["Pull-up"], "chosen targets replace the quick group");
});
