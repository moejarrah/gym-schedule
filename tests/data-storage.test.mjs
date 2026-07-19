import test from "node:test";
import assert from "node:assert/strict";

import { EXERCISE_CATEGORIES, MUSCLE_GROUPS, createDefaultState } from "../data.js";
import {
  STORAGE_KEY,
  createBackup,
  createStore,
  localDateKey,
  migrateState,
  moveItem,
  moveRoutineEntry,
  parseImportedState,
  removeExerciseFromState,
  removeRoutineFromState,
  toggleRoutineForDate,
  validateState,
} from "../storage.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
    this.failWrites = false;
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    if (this.failWrites) throw new Error("storage full");
    this.values.set(key, String(value));
  }
}

function version2State() {
  const legacy = structuredClone(createDefaultState());
  legacy.version = 2;
  legacy.exercises = legacy.exercises.map((exercise) => {
    const { primaryMuscles, secondaryMuscles, categories, ...rest } = exercise;
    return { ...rest, muscles: [...primaryMuscles, ...secondaryMuscles, ...categories] };
  });
  legacy.routines.splice(3, 0, { id: "rest", name: "Rest", group: "gym", status: "rest", entries: [] });
  return legacy;
}

function version1State() {
  const legacy = version2State();
  legacy.version = 1;
  legacy.exercises.forEach((exercise) => delete exercise.alternativeExerciseIds);
  return legacy;
}

function version3State() {
  const legacy = version4State();
  legacy.version = 3;
  return legacy;
}

function version4State() {
  const legacy = structuredClone(createDefaultState());
  legacy.version = 4;
  legacy.exercises = legacy.exercises.map((exercise) => {
    const { categories, ...rest } = exercise;
    return { ...rest, secondaryMuscles: [...rest.secondaryMuscles, ...categories] };
  });
  return legacy;
}

test("starting data is valid and all routine references resolve", () => {
  const state = createDefaultState();
  assert.equal(validateState(state), true);
  assert.equal(new Set(state.exercises.map((exercise) => exercise.id)).size, state.exercises.length);
  assert.equal(new Set(state.routines.map((routine) => routine.id)).size, state.routines.length);
  const exerciseIds = new Set(state.exercises.map((exercise) => exercise.id));
  for (const routine of state.routines) {
    for (const entry of routine.entries) assert.equal(exerciseIds.has(entry.exerciseId), true);
  }
  assert.equal(state.routines.some((routine) => routine.id === "rest" || routine.status === "rest"), false);
  assert.equal(state.exercises.every((exercise) => Array.isArray(exercise.primaryMuscles) && Array.isArray(exercise.secondaryMuscles)), true);
  assert.equal(state.exercises.every((exercise) => Array.isArray(exercise.categories)), true);
  assert.deepEqual(EXERCISE_CATEGORIES.map((category) => [category, state.exercises.filter((exercise) => exercise.categories.includes(category)).length]), [
    ["Mobility", 17],
    ["Rehab", 20],
    ["Full Body", 1],
  ]);
  assert.equal(state.exercises.some((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles].some((value) => EXERCISE_CATEGORIES.includes(value))), false);
  assert.equal(MUSCLE_GROUPS.some((value) => EXERCISE_CATEGORIES.includes(value)), false);
});

test("version 1 data migrates targets and removes the old Rest placeholder", () => {
  const current = createDefaultState();
  const legacy = version1State();
  const migrated = migrateState(legacy);
  assert.equal(migrated.version, current.version);
  assert.deepEqual(migrated.routines, current.routines);
  assert.equal(migrated.exercises.every((exercise) => Array.isArray(exercise.alternativeExerciseIds)), true);
  assert.equal(migrated.exercises.every((exercise) => !Object.hasOwn(exercise, "muscles")), true);
  assert.deepEqual(EXERCISE_CATEGORIES.map((category) => migrated.exercises.filter((exercise) => exercise.categories.includes(category)).length), [17, 20, 1]);
  assert.equal(validateState(migrated), true);
});

test("version 2 data migrates the first muscle as primary and the rest as secondary", () => {
  const legacy = version2State();
  const sourceMuscles = [...legacy.exercises[0].muscles];
  const migrated = migrateState(legacy);
  assert.deepEqual(migrated.exercises[0].primaryMuscles, sourceMuscles.slice(0, 1));
  assert.deepEqual(migrated.exercises[0].secondaryMuscles, sourceMuscles.slice(1));
  assert.deepEqual(EXERCISE_CATEGORIES.map((category) => migrated.exercises.filter((exercise) => exercise.categories.includes(category)).length), [17, 20, 1]);
  assert.equal(migrated.routines.some((routine) => routine.id === "rest"), false);
  assert.equal(validateState(migrated), true);
});

test("version 2 migration preserves a customized former Rest routine", () => {
  const legacy = version2State();
  const rest = legacy.routines.find((routine) => routine.id === "rest");
  rest.name = "Recovery mobility";
  rest.entries.push({ id: "rest-entry-1", exerciseId: legacy.exercises[0].id, prescription: "1 × easy" });
  legacy.sessions["2026-07-16"] = { routineIds: ["rest"], note: "Kept" };
  const migrated = migrateState(legacy);
  const preserved = migrated.routines.find((routine) => routine.id === "rest");
  assert.equal(preserved.name, "Recovery mobility");
  assert.equal(preserved.status, "optional");
  assert.equal(preserved.entries.length, 1);
  assert.deepEqual(migrated.sessions["2026-07-16"], { routineIds: ["rest"], note: "Kept" });
  assert.equal(validateState(migrated), true);
});

test("versions 3 and 4 migrate descriptive targets into categories", () => {
  for (const legacy of [version3State(), version4State()]) {
    const migrated = migrateState(legacy);
    assert.equal(migrated.version, createDefaultState().version);
    assert.deepEqual(migrated.routines, legacy.routines);
    assert.deepEqual(migrated.sessions, legacy.sessions);
    assert.deepEqual(migrated.settings, legacy.settings);
    for (const [index, exercise] of legacy.exercises.entries()) {
      const { primaryMuscles: _oldPrimary, secondaryMuscles: _oldSecondary, ...unchangedBefore } = exercise;
      const { primaryMuscles: _newPrimary, secondaryMuscles: _newSecondary, categories: _categories, ...unchangedAfter } = migrated.exercises[index];
      assert.deepEqual(unchangedAfter, unchangedBefore);
    }
    assert.deepEqual(EXERCISE_CATEGORIES.map((category) => migrated.exercises.filter((exercise) => exercise.categories.includes(category)).length), [17, 20, 1]);
    assert.equal(migrated.exercises.some((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles].some((value) => EXERCISE_CATEGORIES.includes(value))), false);
    assert.equal(validateState(migrated), true);
  }
});

test("store upgrades version 1 data in place", () => {
  const storage = new MemoryStorage();
  const legacy = version1State();
  storage.setItem(STORAGE_KEY, JSON.stringify(legacy));
  const store = createStore(storage);
  assert.equal(validateState(store.getState()), true);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, createDefaultState().version);
});

test("store upgrades valid version 4 data in place", () => {
  const storage = new MemoryStorage();
  const legacy = version4State();
  storage.setItem(STORAGE_KEY, JSON.stringify(legacy));

  const state = createStore(storage).getState();
  assert.deepEqual(state.routines, legacy.routines);
  assert.deepEqual(state.exercises.find((exercise) => exercise.id === "suitcase-carry").categories, ["Full Body"]);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, createDefaultState().version);
});

test("invalid version 3 targets reset to defaults instead of creating a legacy state", () => {
  const storage = new MemoryStorage();
  const legacy = version3State();
  legacy.exercises[0].primaryMuscles = [];
  storage.setItem(STORAGE_KEY, JSON.stringify(legacy));

  const store = createStore(storage);
  assert.deepEqual(store.getState(), createDefaultState());
  assert.match(store.getLastError(), /defaults are open/i);
  assert.equal([...storage.values.keys()].some((key) => key.startsWith(`${STORAGE_KEY}:recovery:`)), true);
});

test("a version 4 descriptor-only primary resets instead of inventing a muscle", () => {
  const storage = new MemoryStorage();
  const legacy = version4State();
  legacy.exercises[0].primaryMuscles = ["Mobility"];
  legacy.exercises[0].secondaryMuscles = [];
  storage.setItem(STORAGE_KEY, JSON.stringify(legacy));

  const store = createStore(storage);
  assert.deepEqual(store.getState(), createDefaultState());
  assert.match(store.getLastError(), /defaults are open/i);
});

test("store persists valid edits", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const result = store.update((state) => {
    state.routines[0].name = "Updated routine";
  });
  assert.equal(result.ok, true);
  assert.equal(store.getState().routines[0].name, "Updated routine");
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).routines[0].name, "Updated routine");
});

test("failed writes do not pretend to update in-memory state", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const originalName = store.getState().routines[0].name;
  storage.failWrites = true;
  const result = store.update((state) => {
    state.routines[0].name = "Should not stick";
  });
  assert.equal(result.ok, false);
  assert.equal(store.getState().routines[0].name, originalName);
});

test("storage read failures open defaults and surface the problem", () => {
  const storage = {
    getItem() { throw new Error("read denied"); },
    setItem() { throw new Error("write denied"); },
  };
  const store = createStore(storage);
  assert.equal(validateState(store.getState()), true);
  assert.match(store.getLastError(), /could not be read/i);
});

test("validation rejects malformed values that would break the UI", () => {
  const invalidMuscle = createDefaultState();
  invalidMuscle.exercises[0].primaryMuscles = [42];
  assert.equal(validateState(invalidMuscle), false);

  const overlappingTargets = createDefaultState();
  overlappingTargets.exercises[0].secondaryMuscles = [...overlappingTargets.exercises[0].primaryMuscles];
  assert.equal(validateState(overlappingTargets), false);

  const missingPrimary = createDefaultState();
  missingPrimary.exercises[0].primaryMuscles = [];
  assert.equal(validateState(missingPrimary), false);

  const multiplePrimaries = createDefaultState();
  multiplePrimaries.exercises[0].primaryMuscles = ["Chest", "Back"];
  assert.equal(validateState(multiplePrimaries), false);

  const unknownPrimary = createDefaultState();
  unknownPrimary.exercises[0].primaryMuscles = ["Owner-defined target"];
  assert.equal(validateState(unknownPrimary), false);

  const unknownSecondary = createDefaultState();
  unknownSecondary.exercises[0].secondaryMuscles.push("Owner-defined target");
  assert.equal(validateState(unknownSecondary), false);

  const categoryAsMuscle = createDefaultState();
  categoryAsMuscle.exercises[0].secondaryMuscles.push("Mobility");
  assert.equal(validateState(categoryAsMuscle), false);

  const muscleAsCategory = createDefaultState();
  muscleAsCategory.exercises[0].categories = ["Chest"];
  assert.equal(validateState(muscleAsCategory), false);

  const duplicateCategory = createDefaultState();
  duplicateCategory.exercises[0].categories = ["Rehab", "Rehab"];
  assert.equal(validateState(duplicateCategory), false);

  const malformedCategories = createDefaultState();
  malformedCategories.exercises[0].categories = "Mobility";
  assert.equal(validateState(malformedCategories), false);

  const duplicateEntry = createDefaultState();
  duplicateEntry.routines[0].entries[1].id = duplicateEntry.routines[0].entries[0].id;
  assert.equal(validateState(duplicateEntry), false);

  const invalidRoutine = createDefaultState();
  invalidRoutine.routines[0].status = "sometimes";
  assert.equal(validateState(invalidRoutine), false);

  const invalidDate = createDefaultState();
  invalidDate.sessions["2026-02-31"] = { routineIds: ["push-a"], note: "" };
  assert.equal(validateState(invalidDate), false);

  const invalidAlternative = createDefaultState();
  invalidAlternative.exercises[0].alternativeExerciseIds = ["missing"];
  assert.equal(validateState(invalidAlternative), false);

  const selfAlternative = createDefaultState();
  selfAlternative.exercises[0].alternativeExerciseIds = [selfAlternative.exercises[0].id];
  assert.equal(validateState(selfAlternative), false);

  const duplicateAlternative = createDefaultState();
  const alternativeId = duplicateAlternative.exercises[1].id;
  duplicateAlternative.exercises[0].alternativeExerciseIds = [alternativeId, alternativeId];
  assert.equal(validateState(duplicateAlternative), false);
});

test("deleting an exercise removes every routine reference", () => {
  const state = createDefaultState();
  const exerciseId = "rope-pushdown";
  state.exercises[0].alternativeExerciseIds = [exerciseId];
  assert.ok(state.routines.some((routine) => routine.entries.some((entry) => entry.exerciseId === exerciseId)));
  const next = removeExerciseFromState(state, exerciseId);
  assert.equal(next.exercises.some((exercise) => exercise.id === exerciseId), false);
  assert.equal(next.routines.some((routine) => routine.entries.some((entry) => entry.exerciseId === exerciseId)), false);
  assert.equal(next.exercises.some((exercise) => exercise.alternativeExerciseIds.includes(exerciseId)), false);
  assert.equal(validateState(next), true);
});

test("moveItem reorders within bounds and ignores invalid moves", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 0, -1), ["a", "b", "c"]);
});

test("moving a routine entry saves its prescription and position together", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const state = store.getState();
  const routine = state.routines[0];
  const entry = routine.entries[1];
  const previousEntryId = routine.entries[0].id;
  const master = state.exercises.find((exercise) => exercise.id === entry.exerciseId);
  const masterPrescription = master.defaultPrescription;

  const next = moveRoutineEntry(state, routine.id, entry.id, -1, "4 × 6-8");
  assert.equal(next.routines[0].entries[0].id, entry.id);
  assert.equal(next.routines[0].entries[0].prescription, "4 × 6-8");
  assert.equal(next.routines[0].entries[1].id, previousEntryId);
  assert.equal(next.exercises.find((exercise) => exercise.id === entry.exerciseId).defaultPrescription, masterPrescription);
  assert.notDeepEqual(next, state);
  assert.equal(validateState(next), true);

  assert.equal(store.replace(next).ok, true);
  const reloaded = createStore(storage).getState();
  assert.equal(reloaded.routines[0].entries[0].id, entry.id);
  assert.equal(reloaded.routines[0].entries[0].prescription, "4 × 6-8");
  assert.equal(reloaded.exercises.find((exercise) => exercise.id === entry.exerciseId).defaultPrescription, masterPrescription);
});

test("a failed atomic entry move leaves stored state unchanged", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const before = store.getState();
  const routine = before.routines[0];
  const entry = routine.entries[1];
  const moved = moveRoutineEntry(before, routine.id, entry.id, -1, "5 × 5");

  storage.failWrites = true;
  const result = store.replace(moved);
  assert.equal(result.ok, false);
  assert.deepEqual(store.getState(), before);
});

test("completion toggles use one date session and remain reversible", () => {
  const state = createDefaultState();
  const dateKey = localDateKey(new Date(2026, 6, 17));
  const completed = toggleRoutineForDate(state, "push-a", dateKey);
  assert.deepEqual(completed.sessions[dateKey].routineIds, ["push-a"]);
  assert.equal(validateState(completed), true);
  const removed = toggleRoutineForDate(completed, "push-a", dateKey);
  assert.equal(removed.sessions[dateKey], undefined);
});

test("deleting a routine cleans history and selects a valid fallback", () => {
  const state = toggleRoutineForDate(createDefaultState(), "push-a", "2026-07-17");
  const next = removeRoutineFromState(state, "push-a");
  assert.equal(next.sessions["2026-07-17"], undefined);
  assert.notEqual(next.settings.activeRoutineId, "push-a");
  assert.equal(next.routines.some((routine) => routine.id === next.settings.activeRoutineId), true);
  assert.equal(validateState(next), true);
});

test("imports are validated completely before replacement", () => {
  const state = createDefaultState();
  const imported = parseImportedState(JSON.stringify({ schemaVersion: 1, data: state }));
  assert.deepEqual(imported, state);

  state.exercises[0].primaryMuscles = [null];
  assert.throws(
    () => parseImportedState(JSON.stringify({ schemaVersion: 1, data: state })),
    /not compatible/i,
  );
});

test("version 1 backups import through migration", () => {
  const legacy = version1State();
  const imported = parseImportedState(JSON.stringify({ schemaVersion: 1, data: legacy }));
  assert.equal(imported.version, createDefaultState().version);
  assert.equal(validateState(imported), true);
});

test("strict targets and categories survive save, reload, export, and import", () => {
  const state = createDefaultState();
  state.exercises[0].primaryMuscles = ["Chest"];
  state.exercises[0].secondaryMuscles = ["Shoulders", "Triceps"];
  state.exercises[0].categories = ["Rehab"];
  const storage = new MemoryStorage();
  const store = createStore(storage);
  assert.equal(store.replace(state).ok, true);
  const reloaded = createStore(storage).getState();
  assert.deepEqual(reloaded.exercises[0].primaryMuscles, ["Chest"]);
  assert.deepEqual(reloaded.exercises[0].secondaryMuscles, ["Shoulders", "Triceps"]);
  assert.deepEqual(reloaded.exercises[0].categories, ["Rehab"]);

  const imported = parseImportedState(JSON.stringify(createBackup(reloaded)));
  assert.deepEqual(imported.exercises[0], reloaded.exercises[0]);
  assert.equal(validateState(imported), true);
});

test("all incompatible imports use one friendly error", () => {
  assert.throws(() => parseImportedState("not json"), /not compatible/i);
  assert.throws(() => parseImportedState(JSON.stringify({ version: 99 })), /not compatible/i);
  const invalidLegacy = version3State();
  invalidLegacy.exercises[0].primaryMuscles = [];
  assert.throws(() => parseImportedState(JSON.stringify(invalidLegacy)), /not compatible/i);
});
