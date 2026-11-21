// What protects saved workouts: loading, saving, upgrading old versions, backups,
// and never writing over data the app couldn't read.

import test from "node:test";
import assert from "node:assert/strict";
import { SCHEMA_VERSION, STORAGE_KEY, createBackup, createDefaultState, createStore, parseBackup, stateProblem } from "../js/store.js";
import { SEED } from "../js/seed.js";
import { fullName } from "../js/model.js";
import { sampleState } from "./sample.mjs";
import { fakeStorage, freshStore, refuse, save } from "./support.mjs";

const quiet = (t) => t.mock.method(console, "error", () => {});
const setTheme = (draft) => { draft.settings.theme = "light"; };

// Saved by the version-9 app, before training rules (v10), set logs (v11) and the
// switch to PPL 9 (v12). The days are the shapes the owner's phone had: a completed
// routine with a note, done marks only, a note only, and two routines in one day.
const V9 = {
  version: 9,
  exercises: [],
  routines: [],
  programs: [],
  sessions: {
    "2026-10-05": { routineIds: ["push-a-glutes"], checkedEntryIdsByRoutine: { "push-a-glutes": ["push-a-glutes-entry-001"] }, note: "Felt strong.\nShoulder fine." },
    "2026-10-06": { routineIds: [], checkedEntryIdsByRoutine: { "pull-a": ["pull-a-entry-001"] }, note: "" },
    "2026-10-07": { routineIds: [], checkedEntryIdsByRoutine: {}, note: "Rest day, knee sore." },
    "2026-10-09": { routineIds: ["legs-a", "legs-morning"], checkedEntryIdsByRoutine: { "legs-a": ["legs-a-entry-001"] }, note: "Double day." },
  },
  settings: { activeProgramId: "pplppl7-glute-specialization", activeRoutineId: "pull-a", theme: "dark" },
};
const V9_UPGRADED = {
  version: SCHEMA_VERSION,
  exercises: SEED.exercises,
  routines: SEED.routines,
  programs: SEED.programs,
  sessions: {
    "2026-10-05": { routineIds: ["push-a-glutes"], checkedEntryIdsByRoutine: {}, note: "Felt strong.\nShoulder fine.", logs: {}, extras: {}, workouts: {} },
    "2026-10-07": { routineIds: [], checkedEntryIdsByRoutine: {}, note: "Rest day, knee sore.", logs: {}, extras: {}, workouts: {} },
    "2026-10-09": { routineIds: ["legs-a", "legs-morning"], checkedEntryIdsByRoutine: {}, note: "Double day.", logs: {}, extras: {}, workouts: { "legs-a": { name: "Legs A", program: "PPL 9", minutes: null } } },
  },
  settings: { activeProgramId: "ppl-9", activeRoutineId: "push-a", theme: "dark", trainingRules: SEED.settings.trainingRules, activeWorkout: null, lastBackupAt: 0 },
};

test("the starting data and the test sample are valid", () => {
  assert.equal(SEED.version, SCHEMA_VERSION);
  assert.equal(stateProblem(createDefaultState()), "");
  assert.equal(stateProblem(sampleState()), "");
});

test("first launch saves the starting data", () => {
  const storage = fakeStorage();
  const store = createStore(storage);
  assert.deepEqual(store.getState(), createDefaultState());
  assert.deepEqual(storage.saved(), createDefaultState());
  assert.equal(store.getLastError(), "");
});

test("saved data loads unchanged and isn't rewritten", () => {
  const { store, storage } = freshStore();
  assert.deepEqual(store.getState(), sampleState());
  assert.equal(storage.writes, 0);
});

test("a change is saved and is there after a reload", () => {
  const { store, storage } = freshStore();
  save(store, (draft) => { draft.sessions["2026-11-03"] = { routineIds: [], checkedEntryIdsByRoutine: {}, note: "Two lines\nof notes", logs: {}, extras: {}, workouts: {} }; });
  const reloaded = createStore(storage).getState();
  assert.equal(reloaded.sessions["2026-11-03"].note, "Two lines\nof notes");
  assert.deepEqual(reloaded.sessions["2026-11-02"], sampleState().sessions["2026-11-02"]);
});

test("data saved by version 9 upgrades: days, notes and theme stay; the library and program become PPL 9's", () => {
  const { store, storage } = freshStore(V9);
  assert.deepEqual(store.getState(), V9_UPGRADED);
  assert.deepEqual(storage.saved(), V9_UPGRADED);
  assert.equal(store.getLastError(), "");
});

test("data saved by version 11 keeps its logged sets through the upgrade", () => {
  const log = { routineId: "push-a-glutes", exerciseId: "machine-chest-press", exerciseName: "Machine chest press", unit: "reps", sets: [{ kg: 50, reps: 10, drops: [{ kg: 40, reps: 8 }] }] };
  const v11 = structuredClone({ ...V9_UPGRADED, version: 11 });
  v11.sessions["2026-10-06"] = { routineIds: [], checkedEntryIdsByRoutine: { "pull-a": ["pull-a-entry-001"] }, note: "", logs: { "push-a-glutes-entry-003": log } };
  const state = freshStore(v11).store.getState();
  assert.deepEqual(state.sessions["2026-10-06"], { routineIds: [], checkedEntryIdsByRoutine: {}, note: "", logs: { "push-a-glutes-entry-003": log }, extras: {}, workouts: {} });
});

test("a backup imports back exactly, and a version-9 backup is upgraded", () => {
  const backup = JSON.stringify(createBackup(sampleState()));
  assert.deepEqual(parseBackup(backup), sampleState());
  assert.deepEqual(parseBackup(JSON.stringify({ schemaVersion: 9, exportedAt: "2026-10-10T08:00:00.000Z", data: V9 })), V9_UPGRADED);
});

test("files that aren't usable backups are refused with a clear message", () => {
  const notBackup = { message: "This file isn't a Gym Schedule backup." };
  assert.throws(() => parseBackup("not json at all"), notBackup);
  assert.throws(() => parseBackup("[1, 2]"), notBackup);
  assert.throws(() => parseBackup(JSON.stringify(sampleState())), notBackup);
  assert.throws(() => parseBackup(JSON.stringify({ data: { ...sampleState(), version: SCHEMA_VERSION + 1 } })), { message: /newer version/ });
  const broken = createBackup(sampleState());
  broken.data.routines[0].entries[0].choices = [];
  assert.throws(() => parseBackup(JSON.stringify(broken)), { message: "This backup couldn't be read by this version of the app." });
});

test("saved data the app can't read is left exactly as it is until an import or restore replaces it", async (t) => {
  quiet(t);
  const unreadable = {
    "broken JSON": "{\"version\": 12, \"exer",
    "saved by a newer version": JSON.stringify({ ...sampleState(), version: SCHEMA_VERSION + 1 }),
    "a version with no upgrade path": JSON.stringify({ ...V9, version: 8 }),
    "a missing part": JSON.stringify({ ...sampleState(), routines: undefined }),
  };
  for (const [name, raw] of Object.entries(unreadable)) {
    await t.test(name, () => {
      const storage = fakeStorage({ [STORAGE_KEY]: raw });
      const store = createStore(storage);
      assert.deepEqual(store.getState(), createDefaultState(), "the starting program opens");
      assert.match(store.getLastError(), /nothing will be saved/);
      assert.equal(store.recoveryData(), raw, "Settings can offer it as a download");
      assert.equal(store.update(setTheme).ok, false);
      assert.equal(storage.raw(), raw);
      assert.equal(storage.writes, 0);

      assert.equal(store.replace(sampleState()).ok, true);
      assert.equal(store.update(setTheme).ok, true);
      assert.equal(store.recoveryData(), "");
    });
  }
});

test("content the app doesn't police still loads: an unknown equipment ID, a done mark for a deleted slot", () => {
  const state = sampleState();
  state.exercises[0].equipment = ["sled"];
  state.sessions["2026-11-02"].checkedEntryIdsByRoutine["day-a"].push("gone");
  const { store } = freshStore(state);
  assert.equal(store.getLastError(), "");
  assert.deepEqual(store.getState(), state);
});

test("a failed write reports the error and changes nothing", () => {
  const stored = freshStore();
  stored.storage.failWrites = true;
  refuse(stored, setTheme, "Changes couldn't be saved on this device. Nothing changed.");
  assert.equal(stored.store.replace(createDefaultState()).ok, false);
  assert.deepEqual(stored.store.getState(), sampleState());
});

test("an update that throws, or would break the data's shape, saves nothing", (t) => {
  quiet(t);
  const stored = freshStore();
  refuse(stored, (draft) => {
    draft.programs[0].name = "Half done";
    throw new Error("Choose a program first.");
  }, "Choose a program first.");
  refuse(stored, (draft) => { draft.routines[0].entries[0].blockId = "nope"; }, "That change couldn't be saved.");
  refuse(stored, (draft) => { draft.routines[0].entries[1].choices[0].exerciseId = "nope"; }, "That change couldn't be saved.");
  refuse(stored, (draft) => { draft.sessions["2026-11-02"].logs.a2.sets[0].reps = "ten"; }, "That change couldn't be saved.");
  assert.equal(stored.storage.writes, 0);
});

test("the Library tidy-up reaches a saved Library: old names change, the owner's own renames and the program stay", () => {
  // A Library as version 14 had it: one old name, one the owner renamed, one new exercise not there yet.
  const v14 = structuredClone({ ...createDefaultState(), version: 14 });
  const find = (state, id) => state.exercises.find((exercise) => exercise.id === id);
  Object.assign(find(v14, "adductor-machine"), { name: "Adductor machine", aliases: [], relatedExercises: [] });
  for (const exercise of v14.exercises) exercise.relatedExercises = exercise.relatedExercises.filter((related) => related.exerciseId !== "adductor-machine");
  Object.assign(find(v14, "flat-dumbbell-press"), { name: "My dumbbell press", aliases: [] });
  v14.exercises = v14.exercises.filter((exercise) => exercise.id !== "plank");
  for (const exercise of v14.exercises) exercise.relatedExercises = exercise.relatedExercises.filter((related) => related.exerciseId !== "plank");
  v14.sessions["2026-11-10"] = { routineIds: ["push-a"], checkedEntryIdsByRoutine: {}, note: "Kept", logs: {}, extras: {}, workouts: { "push-a": { name: "Push A", program: "PPL 9", minutes: 50 } } };

  const { store } = freshStore(v14);
  const state = store.getState();
  assert.equal(store.getLastError(), "");
  assert.deepEqual([find(state, "adductor-machine").name, find(state, "adductor-machine").aliases], ["Hip adduction", ["Adductor machine"]]);
  assert.ok(find(state, "adductor-machine").relatedExercises.some((related) => related.exerciseId === "short-lever-copenhagen-plank" && related.relation === "easier"));
  assert.equal(find(state, "flat-dumbbell-press").name, "My dumbbell press", "a name the owner chose is left alone");
  assert.equal(find(state, "plank").name, "Plank");
  assert.deepEqual([state.routines, state.programs, state.sessions], [v14.routines, v14.programs, v14.sessions]);
});

test("plate-loaded and Smith machines get their own equipment on upgrade; an exercise the owner re-equipped is left alone", () => {
  const v16 = structuredClone({ ...createDefaultState(), version: 16 });
  const find = (state, id) => state.exercises.find((exercise) => exercise.id === id);
  find(v16, "hack-squat").equipment = ["machine"];
  find(v16, "smith-hip-thrust").equipment = ["machine", "bench"];
  find(v16, "leg-press").equipment = ["cable"];

  const { store } = freshStore(v16);
  const state = store.getState();
  assert.equal(store.getLastError(), "");
  assert.deepEqual(find(state, "hack-squat").equipment, ["plate-loaded"]);
  assert.deepEqual(find(state, "smith-hip-thrust").equipment, ["smith-machine", "bench"]);
  assert.deepEqual(find(state, "leg-press").equipment, ["cable"]);
  assert.deepEqual([state.routines, state.sessions], [v16.routines, v16.sessions]);
});

test("the version leaves an exercise's name for its own boxes on upgrade; a name the owner changed is kept", () => {
  const v17 = structuredClone({ ...createDefaultState(), version: 17 });
  const find = (state, id) => state.exercises.find((exercise) => exercise.id === id);
  const old = (id, name, equipment) => {
    const exercise = find(v17, id);
    for (const field of ["attachment", "grip", "width", "detail", "weightMode"]) delete exercise[field];
    Object.assign(exercise, { name, ...(equipment ? { equipment } : {}) });
  };
  old("pronated-grip-lat-pulldown", "Lat pulldown (overhand grip)");
  old("bar-triceps-pushdown", "Triceps pushdown (straight bar)");
  old("behind-the-head-ez-bar-skull-crusher", "Skull crusher (EZ bar, behind head)", ["barbell", "bench"]);
  old("flat-dumbbell-press", "My dumbbell press");
  v17.sessions["2026-11-10"] = { routineIds: [], checkedEntryIdsByRoutine: {}, note: "", extras: {}, workouts: {}, logs: { x: { routineId: "push-a", exerciseId: "bar-triceps-pushdown", exerciseName: "Triceps pushdown (straight bar)", unit: "reps", sets: [{ kg: 30, reps: 12, drops: [] }] } } };

  const { store } = freshStore(v17);
  const state = store.getState();
  assert.equal(store.getLastError(), "");
  const setup = ({ name, equipment, attachment, grip, width, detail, weightMode }) => ({ name, equipment, attachment, grip, width, detail, weightMode });
  assert.deepEqual(setup(find(state, "pronated-grip-lat-pulldown")), { name: "Lat pulldown", equipment: ["machine"], attachment: "", grip: "overhand", width: "", detail: "", weightMode: "" });
  assert.deepEqual(setup(find(state, "bar-triceps-pushdown")), { name: "Triceps pushdown", equipment: ["cable"], attachment: "straight-bar", grip: "", width: "", detail: "", weightMode: "" });
  assert.deepEqual(setup(find(state, "behind-the-head-ez-bar-skull-crusher")), { name: "Skull crusher", equipment: ["ez-bar", "bench"], attachment: "", grip: "", width: "", detail: "behind head", weightMode: "" });
  assert.deepEqual(setup(find(state, "flat-dumbbell-press")), { name: "My dumbbell press", equipment: ["dumbbells", "bench"], attachment: "", grip: "", width: "", detail: "", weightMode: "per-dumbbell" });
  const names = state.exercises.map(fullName);
  assert.equal(new Set(names).size, names.length, "every exercise can still be told apart");
  assert.deepEqual([state.routines, state.sessions], [v17.routines, v17.sessions]);
});

test("after the upgrade a plate-loaded exercise is logged per side, a dumbbell one per dumbbell, and no alias equals another exercise's full name", () => {
  const v17 = structuredClone({ ...createDefaultState(), version: 17 });
  const find = (state, id) => state.exercises.find((exercise) => exercise.id === id);
  for (const exercise of v17.exercises) for (const field of ["attachment", "grip", "width", "detail", "weightMode"]) delete exercise[field];
  find(v17, "smith-squat").name = "Squat (Smith machine)";
  find(v17, "leg-press").aliases.push("Squat (Smith machine)");

  const state = freshStore(v17).store.getState();
  assert.deepEqual(["leg-press", "chest-supported-t-bar-row", "flat-dumbbell-press", "barbell-bench-press"].map((id) => find(state, id).weightMode), ["per-side", "", "per-dumbbell", ""]);
  assert.equal(fullName(find(state, "smith-squat")), "Squat (Smith machine)");
  assert.ok(!find(state, "leg-press").aliases.includes("Squat (Smith machine)"));
});
