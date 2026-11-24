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

test("the coach's edits reach a saved program; a slot the owner changed himself is left as he had it", () => {
  // The program as version 18 had it, where it matters, plus one slot the owner had changed.
  const v18 = structuredClone({ ...createDefaultState(), version: 18 });
  const routine = (state, id) => state.routines.find((item) => item.id === id);
  const slot = (state, routineId, id) => routine(state, routineId).entries.find((item) => item.id === id);
  const ids = (entry) => entry.choices.map((choice) => choice.exerciseId);
  v18.exercises = v18.exercises.filter((exercise) => exercise.id !== "isolateral-chest-press");
  for (const exercise of v18.exercises) exercise.relatedExercises = exercise.relatedExercises.filter((related) => related.exerciseId !== "isolateral-chest-press");
  slot(v18, "push-a", "push-a-02").choices = [{ exerciseId: "machine-chest-press", prescription: "2 × 8–12" }];
  Object.assign(slot(v18, "push-a", "push-a-05"), { choices: [{ exerciseId: "scaption-raise", prescription: "3 × 12–20" }], note: "" });
  routine(v18, "push-a").entries = routine(v18, "push-a").entries.filter((entry) => entry.id !== "push-a-lateral-raise");
  Object.assign(slot(v18, "push-a", "push-a-13"), { blockId: "push-a-optional-coverage-rehab", role: "optional", note: "" });
  routine(v18, "legs-b").entries = routine(v18, "legs-b").entries.filter((entry) => entry.id !== "legs-b-leg-extension");
  slot(v18, "legs-b", "legs-b-05").choices = [{ exerciseId: "lying-leg-curl", prescription: "2 × 10–15" }];
  slot(v18, "legs-b", "legs-b-08").choices = [{ exerciseId: "leg-extension", prescription: "5 × 5" }]; // the owner's own change

  const { store } = freshStore(v18);
  const state = store.getState();
  assert.equal(store.getLastError(), "");
  assert.deepEqual(ids(slot(state, "push-a", "push-a-02")), ["isolateral-chest-press", "machine-chest-press"]);
  const press = state.exercises.find((exercise) => exercise.id === "isolateral-chest-press");
  assert.deepEqual([fullName(press), press.weightMode], ["Chest press (plate-loaded)", "per-side"]);
  assert.deepEqual(slot(state, "push-a", "push-a-05"), { ...slot(v18, "push-a", "push-a-05"), choices: [{ exerciseId: "scaption-raise", prescription: "2 × 12–20" }], note: "Light, rehab, not to failure" });
  const main = routine(state, "push-a").entries.filter((entry) => entry.blockId === "push-a-main").map((entry) => entry.id);
  assert.deepEqual(main.slice(4, 8), ["push-a-05", "push-a-lateral-raise", "push-a-13", "push-a-06"], "lateral raise, then external rotation, after the scaption raise");
  assert.deepEqual([slot(state, "push-a", "push-a-13").role, slot(state, "push-a", "push-a-13").note], ["main", "Light, controlled"]);
  assert.deepEqual(slot(state, "legs-b", "legs-b-05").choices, [{ exerciseId: "lying-leg-curl", prescription: "3 × 10–15" }]);
  assert.deepEqual(ids(slot(state, "legs-b", "legs-b-leg-extension")), ["leg-extension"]);
  assert.deepEqual(slot(state, "legs-b", "legs-b-08").choices, [{ exerciseId: "leg-extension", prescription: "5 × 5" }], "left as the owner had it");
  assert.deepEqual(routine(state, "legs-a"), routine(v18, "legs-a"), "already edited: nothing is done twice");
});

test("on upgrade Pull A's row slot prefers the T-bar row, unless the owner had changed its choices", () => {
  const slot = (state) => state.routines.find((routine) => routine.id === "pull-a").entries.find((entry) => entry.id === "pull-a-02");
  const ids = (state) => slot(state).choices.map((choice) => choice.exerciseId);
  const v19 = structuredClone({ ...createDefaultState(), version: 19 });
  slot(v19).choices.reverse();
  assert.deepEqual(ids(v19), ["chest-supported-row", "chest-supported-t-bar-row"]);
  assert.deepEqual(ids(freshStore(v19).store.getState()), ["chest-supported-t-bar-row", "chest-supported-row"]);

  const changed = structuredClone(v19);
  slot(changed).choices = [slot(changed).choices[0]];
  assert.deepEqual(ids(freshStore(changed).store.getState()), ["chest-supported-row"]);
});

test("the round, its history and the workouts' round tags are saved, loaded and backed up; a malformed round is refused", () => {
  const state = sampleState();
  state.settings.round = { number: 6, block: 2, programId: "sample", since: "2026-11-01", breakAnswered: "2026-10-12" };
  state.settings.roundLog = [{ number: 5, block: 2, program: "Sample program", programId: "sample", required: 2, done: 2, ended: "complete" }];
  state.settings.activeWorkout = { routineId: "day-a", dateKey: "2026-11-04", startedAt: 1, guest: true, breakUndo: { round: { number: 4, block: 2, programId: "sample", since: "2026-09-01" }, logged: 0 } };
  Object.assign(state.sessions[Object.keys(state.sessions)[0]].workouts["day-a"], { round: 5, block: 2, guest: true });
  assert.equal(stateProblem(state), "");
  const { store } = freshStore(state);
  assert.equal(store.getLastError(), "");
  assert.deepEqual(store.getState(), state);
  assert.deepEqual(parseBackup(JSON.stringify(createBackup(store.getState()))), state);

  for (const round of [{ number: 0, block: 1, programId: "sample" }, { number: 2, programId: "sample" }, { number: 6, block: 1, programId: "gone" }, null]) {
    assert.equal(stateProblem({ ...state, settings: { ...state.settings, round } }), "round");
  }
  assert.equal(stateProblem({ ...state, settings: { ...state.settings, roundLog: [{ number: 1, block: 1 }] } }), "round history");
  assert.equal(stateProblem({ ...state, settings: { ...state.settings, activeWorkout: { ...state.settings.activeWorkout, breakUndo: { round: null, logged: 0 } } } }), "workout in progress: break");
});

test("upgrading from one round count per program: the followed program's count carries on, other programs' round tags go", () => {
  const v20 = { ...sampleState(), version: 20 };
  v20.programs.push({ id: "other", name: "Other", note: "", routineIds: [] });
  v20.settings.rounds = { sample: { number: 6, block: 2, since: "2026-11-01" }, other: { number: 3, block: 1 } };
  const day = Object.keys(v20.sessions)[0];
  Object.assign(v20.sessions[day].workouts["day-a"], { round: 6, block: 2, roundOf: "sample" });
  v20.sessions["2026-10-20"] = { ...structuredClone(v20.sessions[day]), logs: {}, extras: {}, note: "", workouts: { "day-a": { name: "Day A", program: "Other", minutes: 40, round: 3, block: 1, roundOf: "other", guest: true } } };

  // An earlier round of the followed program: it was never recorded as a round.
  v20.sessions["2026-10-28"] = { ...structuredClone(v20.sessions[day]), logs: {}, extras: {}, note: "", workouts: { "day-a": { name: "Day A", program: "Sample program", minutes: 35, round: 5, block: 2, roundOf: "sample" } } };

  const { store } = freshStore(v20);
  const state = store.getState();
  assert.equal(store.getLastError(), "");
  assert.deepEqual(state.settings.round, { number: 6, block: 2, programId: "sample", since: "2026-11-01" });
  assert.deepEqual(state.sessions["2026-10-28"].workouts["day-a"], { name: "Day A", program: "Sample program", minutes: 35 });
  assert.equal(state.settings.rounds, undefined);
  assert.deepEqual(state.sessions[day].workouts["day-a"], { ...sampleState().sessions[day].workouts["day-a"], round: 6, block: 2 });
  assert.deepEqual(state.sessions["2026-10-20"].workouts["day-a"], { name: "Day A", program: "Other", minutes: 40 });
  assert.deepEqual(state.sessions[day].logs, sampleState().sessions[day].logs, "logged sets are untouched");
});
