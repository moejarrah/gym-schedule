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

test("a movement's name plus its setup finds that version", async () => {
  const { fullName } = await import("../js/model.js");
  const version = (id, name, equipment, setup = {}) => ({ ...library.exercises[0], id, name, aliases: [], equipment, attachment: "", grip: "", width: "", detail: "", weightMode: "", ...setup });
  const exercises = [
    version("a", "Lat pulldown", ["machine"], { grip: "neutral" }),
    version("b", "Lat pulldown", ["machine"], { grip: "overhand", aliases: ["Pronated-grip lat pulldown"] }),
    version("c", "Romanian deadlift", ["dumbbells"]),
    version("d", "Romanian deadlift", ["barbell"]),
    version("e", "Chest fly", ["cable"], { detail: "high to low" }),
  ];
  const found = (query) => searchExercises(exercises, query).map(fullName);
  assert.deepEqual(found("lat pulldown neutral"), ["Lat pulldown (machine, neutral)"]);
  assert.deepEqual(found("pulldown overhand grip"), ["Lat pulldown (machine, overhand)"]);
  assert.deepEqual(found("romanian deadlift dumbbell"), ["Romanian deadlift (dumbbell)"]);
  assert.deepEqual(found("Lat pulldown (machine, overhand)"), ["Lat pulldown (machine, overhand)"]);
  assert.deepEqual(found("Pronated-grip lat pulldown"), ["Lat pulldown (machine, overhand)"], "a name it used to have");
  assert.deepEqual(found("fly high to low"), ["Chest fly (cable, high to low)"]);
  assert.deepEqual(found("romanian"), ["Romanian deadlift (barbell)", "Romanian deadlift (dumbbell)"], "versions sort together, by setup");
});
