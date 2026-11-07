import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RECOVERY_KEY,
  SCHEMA_VERSION,
  STORAGE_KEY,
  createBackup,
  createDefaultState,
  createStore,
  parseBackup,
  stateProblem,
} from "../js/store.js";
import { SEED } from "../js/seed.js";
import { fakeStorage, freshStore, refuse, save } from "./support.mjs";

// Saved by the v9 app (built with its own code): a renamed program, a custom
// exercise used as a choice, full/partial/note-only/all-Optional/two-routine days.
const V9 = JSON.parse(readFileSync(new URL("./fixtures/v9-state.json", import.meta.url), "utf8"));
// What the migrations make of it: v10 added training rules, v11 an empty set log per day.
const V9_AS_CURRENT = {
  ...V9,
  version: SCHEMA_VERSION,
  settings: { ...V9.settings, trainingRules: SEED.settings.trainingRules },
  sessions: Object.fromEntries(Object.entries(V9.sessions).map(([dateKey, session]) => [dateKey, { ...session, logs: {} }])),
};
const V10 = { ...V9_AS_CURRENT, version: 10, sessions: V9.sessions };

const quiet = (t) => t.mock.method(console, "error", () => {});

test("the starting data is a valid current state", () => {
  assert.equal(SEED.version, SCHEMA_VERSION);
  assert.equal(stateProblem(createDefaultState()), "");
});

test("validation catches structural problems that would corrupt data", async (t) => {
  const broken = {
    "a duplicate exercise id": [/bad exercise id/, (s) => s.exercises.push({ ...s.exercises[0], name: "Copy", aliases: [] })],
    "a duplicate entry id": [/entry id/, (s) => { s.routines[1].entries[0].id = s.routines[0].entries[0].id; }],
    "a related link without its reverse": [/missing reverse link/, (s) => {
      const source = s.exercises.find((exercise) => exercise.relatedExercises.length);
      const other = s.exercises.find((exercise) => exercise.id === source.relatedExercises[0].exerciseId);
      other.relatedExercises = other.relatedExercises.filter((related) => related.exerciseId !== source.id);
    }],
    "an entry in an unknown block": [/entry push-a-glutes-entry-001$/, (s) => { s.routines[0].entries[0].blockId = "nope"; }],
    "a choice of an unknown exercise": [/choice/, (s) => { s.routines[0].entries[0].choices[0].exerciseId = "nope"; }],
    "a routine owned by two programs": [/program p2: routine/, (s) => s.programs.push({ id: "p2", name: "Two", note: "", routineIds: [s.routines[0].id] })],
    "an active routine from another program": [/active routine/, (s) => {
      const moved = s.programs[0].routineIds.pop();
      s.programs.push({ id: "p2", name: "Two", note: "", routineIds: [moved] });
      s.settings.activeRoutineId = moved;
    }],
    "a check for another routine's entry": [/checks for push-a-glutes/, (s) => {
      s.sessions["2026-10-01"] = { routineIds: [], checkedEntryIdsByRoutine: { "push-a-glutes": [s.routines[1].entries[0].id] }, note: "", logs: {} };
    }],
    "an empty session": [/empty/, (s) => { s.sessions["2026-10-01"] = { routineIds: [], checkedEntryIdsByRoutine: {}, note: "", logs: {} }; }],
    "an impossible date key": [/session 2026-02-30/, (s) => { s.sessions["2026-02-30"] = { routineIds: [], checkedEntryIdsByRoutine: {}, note: "x", logs: {} }; }],
    "a session without a set log": [/logs/, (s) => { s.sessions["2026-10-01"] = { routineIds: [], checkedEntryIdsByRoutine: {}, note: "x" }; }],
    "a log without the exercise's name": [/log e1/, (s) => {
      s.sessions["2026-10-01"] = { routineIds: [], checkedEntryIdsByRoutine: {}, note: "", logs: { e1: { routineId: "r", exerciseId: "x", unit: "reps", sets: [{ kg: 1, reps: 1, drops: [] }] } } };
    }],
    "a log with an unknown unit": [/log e1/, (s) => {
      s.sessions["2026-10-01"] = { routineIds: [], checkedEntryIdsByRoutine: {}, note: "", logs: { e1: { routineId: "r", exerciseId: "x", exerciseName: "X", unit: "lb", sets: [{ kg: 1, reps: 1, drops: [] }] } } };
    }],
    "a logged set with fractional reps": [/sets for e1/, (s) => {
      s.sessions["2026-10-01"] = { routineIds: [], checkedEntryIdsByRoutine: {}, note: "", logs: { e1: { routineId: "r", exerciseId: "x", exerciseName: "X", unit: "reps", sets: [{ kg: 1, reps: 1.5, drops: [] }] } } };
    }],
  };
  for (const [name, [problem, breakIt]] of Object.entries(broken)) {
    await t.test(name, () => {
      const state = createDefaultState();
      breakIt(state);
      assert.match(stateProblem(state), problem);
    });
  }
});

test("first run saves the starting data", () => {
  const { store, storage } = freshStore();
  assert.deepEqual(store.getState(), createDefaultState());
  assert.deepEqual(storage.saved(), createDefaultState());
  assert.equal(store.getLastError(), "");
});

test("a saved current state loads unchanged and isn't rewritten", () => {
  const { store, storage } = freshStore(V9_AS_CURRENT);
  assert.deepEqual(store.getState(), V9_AS_CURRENT);
  assert.equal(storage.writes, 0);
});

test("a v9 save migrates with all history, programs and exercises kept, and is saved as the current version", () => {
  const { store, storage } = freshStore(V9);
  assert.deepEqual(store.getState(), V9_AS_CURRENT);
  assert.deepEqual(storage.saved(), V9_AS_CURRENT);
  assert.equal(store.getLastError(), "");
});

test("a v10 save migrates to the current version with every day kept and an empty set log", () => {
  const { store, storage } = freshStore(V10);
  assert.deepEqual(store.getState(), V9_AS_CURRENT);
  assert.deepEqual(storage.saved(), V9_AS_CURRENT);
});

test("a v9 backup imports through the migration", () => {
  const backup = { schemaVersion: 9, exportedAt: "2026-10-10T08:00:00.000Z", data: V9 };
  assert.deepEqual(parseBackup(JSON.stringify(backup)), V9_AS_CURRENT);
});

test("unreadable saved data opens the starting data and keeps the original for recovery", async (t) => {
  quiet(t);
  const unreadable = {
    "broken JSON": "{\"version\": 10, \"exer",
    "an unknown future version": JSON.stringify({ ...V9_AS_CURRENT, version: SCHEMA_VERSION + 1 }),
    "a version with no migration": JSON.stringify({ ...V9, version: 8 }),
  };
  for (const [name, raw] of Object.entries(unreadable)) {
    await t.test(name, () => {
      const storage = fakeStorage({ [STORAGE_KEY]: raw });
      const store = createStore(storage);
      assert.deepEqual(store.getState(), createDefaultState());
      assert.deepEqual(storage.saved(), createDefaultState());
      assert.equal(storage.getItem(RECOVERY_KEY), raw);
      assert.equal(store.recoveryData(), raw);
      assert.match(store.getLastError(), /couldn't be read/);
    });
  }
});

test("unreadable saved data isn't overwritten when its recovery copy can't be stored", (t) => {
  quiet(t);
  const raw = "{\"version\": 10, \"exer";
  const storage = fakeStorage({ [STORAGE_KEY]: raw });
  const setItem = storage.setItem;
  storage.setItem = function (key, value) {
    if (key === RECOVERY_KEY) throw new Error("QuotaExceededError");
    setItem.call(this, key, value);
  };
  const store = createStore(storage);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  assert.equal(store.recoveryData(), raw);
  // Ordinary saves would overwrite it, so they're refused until an explicit restore or import.
  assert.equal(store.update((draft) => { draft.settings.theme = "dark"; }).ok, false);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  assert.equal(store.replace(createDefaultState()).ok, true);
  assert.equal(store.update((draft) => { draft.settings.theme = "dark"; }).ok, true);
});

test("storage that can't be read opens the starting data without writing", () => {
  const store = createStore({
    getItem: () => { throw new Error("SecurityError"); },
    setItem: () => assert.fail("should not write"),
  });
  assert.deepEqual(store.getState(), createDefaultState());
  assert.match(store.getLastError(), /couldn't be read on this device/);
});

test("a failed write reports the error and changes neither memory nor storage", () => {
  const { store, storage } = freshStore(V9_AS_CURRENT);
  storage.failWrites = true;
  refuse(store, (draft) => { draft.programs[0].name = "Lost"; }, "Changes couldn't be saved on this device. Nothing changed.");
  assert.equal(store.replace(createDefaultState()).ok, false);
  assert.deepEqual(store.getState(), V9_AS_CURRENT);
  assert.deepEqual(storage.saved(), V9_AS_CURRENT);
});

test("an update that throws returns the message and saves nothing, even after partly changing the draft", () => {
  const { store, storage } = freshStore();
  refuse(store, (draft) => {
    draft.programs[0].name = "Half done";
    throw new Error("Choose a program first.");
  }, "Choose a program first.");
  assert.equal(storage.writes, 1);
});

test("an update that would leave an invalid state is blocked", (t) => {
  quiet(t);
  const { store, storage } = freshStore();
  refuse(store, (draft) => { draft.routines[0].entries[0].blockId = "nope"; }, "That change couldn't be saved.");
  assert.equal(storage.writes, 1);
});

test("a valid update is saved and survives a reload", () => {
  const { store, storage } = freshStore();
  save(store, (draft) => { draft.programs[0].note = "Two lines\nof rules"; });
  assert.equal(createStore(storage).getState().programs[0].note, "Two lines\nof rules");
});

test("an exported backup imports back exactly", () => {
  const backup = createBackup(V9_AS_CURRENT);
  assert.equal(backup.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(parseBackup(JSON.stringify(backup)), V9_AS_CURRENT);
});

test("files that aren't usable backups give a clear error", () => {
  const notBackup = "This file isn't a Gym Schedule backup.";
  assert.throws(() => parseBackup("not json at all"), { message: notBackup });
  assert.throws(() => parseBackup(JSON.stringify(V9_AS_CURRENT)), { message: notBackup });
  assert.throws(() => parseBackup("[1, 2]"), { message: notBackup });
  const unreadable = "This backup couldn't be read by this version of the app.";
  assert.throws(() => parseBackup(JSON.stringify({ schemaVersion: 99, data: { ...V9_AS_CURRENT, version: 99 } })), { message: unreadable });
  const invalid = createBackup(V9_AS_CURRENT);
  invalid.data.routines[0].entries[0].choices = [];
  assert.throws(() => parseBackup(JSON.stringify(invalid)), { message: unreadable });
});
