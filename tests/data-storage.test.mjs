import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultState } from "../data.js";
import {
  STORAGE_KEY,
  createStore,
  localDateKey,
  moveItem,
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

test("starting data is valid and all routine references resolve", () => {
  const state = createDefaultState();
  assert.equal(validateState(state), true);
  assert.equal(new Set(state.exercises.map((exercise) => exercise.id)).size, state.exercises.length);
  assert.equal(new Set(state.routines.map((routine) => routine.id)).size, state.routines.length);
  const exerciseIds = new Set(state.exercises.map((exercise) => exercise.id));
  for (const routine of state.routines) {
    for (const entry of routine.entries) assert.equal(exerciseIds.has(entry.exerciseId), true);
  }
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
  invalidMuscle.exercises[0].muscles = [42];
  assert.equal(validateState(invalidMuscle), false);

  const duplicateEntry = createDefaultState();
  duplicateEntry.routines[0].entries[1].id = duplicateEntry.routines[0].entries[0].id;
  assert.equal(validateState(duplicateEntry), false);

  const invalidRoutine = createDefaultState();
  invalidRoutine.routines[0].status = "sometimes";
  assert.equal(validateState(invalidRoutine), false);

  const invalidDate = createDefaultState();
  invalidDate.sessions["2026-02-31"] = { routineIds: ["push-a"], note: "" };
  assert.equal(validateState(invalidDate), false);
});

test("deleting an exercise removes every routine reference", () => {
  const state = createDefaultState();
  const exerciseId = "rope-pushdown";
  assert.ok(state.routines.some((routine) => routine.entries.some((entry) => entry.exerciseId === exerciseId)));
  const next = removeExerciseFromState(state, exerciseId);
  assert.equal(next.exercises.some((exercise) => exercise.id === exerciseId), false);
  assert.equal(next.routines.some((routine) => routine.entries.some((entry) => entry.exerciseId === exerciseId)), false);
  assert.equal(validateState(next), true);
});

test("moveItem reorders within bounds and ignores invalid moves", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 0, -1), ["a", "b", "c"]);
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

  state.exercises[0].muscles = [null];
  assert.throws(
    () => parseImportedState(JSON.stringify({ schemaVersion: 1, data: state })),
    /not compatible/i,
  );
});
