import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  EXERCISE_PURPOSES,
  MOVEMENT_PATTERNS,
  REVIEWED_EXERCISE_IDS,
  classificationLabel,
  createDefaultState,
} from "../data.js";
import {
  STORAGE_KEY,
  addRoutineToProgram,
  createBackup,
  createProgramInState,
  createStore,
  duplicateProgramInState,
  localDateKey,
  migrateState,
  moveItem,
  moveRoutineEntry,
  removeProgramFromState,
  reorderRoutineEntry,
  reorderRoutineInProgram,
  parseImportedState,
  removeExerciseFromState,
  removeRoutineFromState,
  renameProgramInState,
  setActiveProgramInState,
  setRelatedExercisesInState,
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

test("controlled classification values use stable IDs with friendly labels", () => {
  assert.equal(classificationLabel("glute-max"), "Glute max");
  assert.equal(classificationLabel("horizontal-press"), "Horizontal press");
  assert.deepEqual(EXERCISE_PURPOSES.map(({ id, label }) => [id, label]), [
    ["strength", "Strength"],
    ["mobility", "Mobility"],
    ["rehab", "Rehab"],
  ]);
});

test("default exercise and entry identities stay stable when seed text or order changes", async () => {
  const source = readFileSync(new URL("../data.js", import.meta.url), "utf8");
  const originalSeed = '["push-a-1", "low-incline-dumbbell-press", "Low incline dumbbell press", "3 × 8-12"]';
  const renamedSeed = '["push-a-1", "low-incline-dumbbell-press", "Renamed incline press", "3 × 8-12"]';
  const secondSeed = '["push-a-2", "machine-chest-press", "Machine chest press", "2 × 8-12"]';
  assert.equal(source.includes(originalSeed), true);

  const changedSource = source
    .replace(originalSeed, renamedSeed)
    .replace(`${renamedSeed},\n      ${secondSeed}`, `${secondSeed},\n      ${renamedSeed}`);
  const changedModule = await import(`data:text/javascript;base64,${Buffer.from(changedSource).toString("base64")}`);
  const changedState = changedModule.createDefaultState();
  const renamedExercise = changedState.exercises.find((exercise) => exercise.id === "low-incline-dumbbell-press");
  const pushA = changedState.routines.find((routine) => routine.id === "push-a");
  assert.equal(renamedExercise?.name, "Renamed incline press");
  assert.equal(renamedExercise?.id, "low-incline-dumbbell-press");
  assert.equal(pushA?.entries.find((entry) => entry.exerciseId === "low-incline-dumbbell-press")?.id, "push-a-1");
  assert.equal(pushA?.entries.find((entry) => entry.exerciseId === "machine-chest-press")?.id, "push-a-2");
});

function version2State() {
  const legacy = version5State();
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
  const legacy = version5State();
  legacy.version = 4;
  legacy.exercises = legacy.exercises.map((exercise) => {
    const { categories, ...rest } = exercise;
    return { ...rest, secondaryMuscles: [...rest.secondaryMuscles, ...categories] };
  });
  return legacy;
}

function version5State() {
  const legacy = version6State();
  legacy.version = 5;
  delete legacy.programs;
  delete legacy.settings.activeProgramId;
  return legacy;
}

function version6State() {
  const legacy = structuredClone(createDefaultState());
  const broadTarget = new Map([
    ["chest", "Chest"],
    ["lats", "Back"], ["upper-mid-back", "Back"], ["traps", "Back"], ["spinal-erectors", "Back"],
    ["front-delts", "Shoulders"], ["side-delts", "Shoulders"], ["rear-delts", "Shoulders"], ["rotator-cuff", "Shoulders"], ["serratus", "Shoulders"],
    ["biceps", "Biceps"], ["brachialis", "Biceps"], ["brachioradialis", "Forearms"], ["triceps", "Triceps"],
    ["forearm-flexors", "Forearms"], ["forearm-extensors", "Forearms"], ["forearms", "Forearms"],
    ["abs", "Core"], ["obliques", "Core"],
    ["quads", "Quads"], ["hamstrings", "Hamstrings"], ["glute-max", "Glutes"], ["glute-med-min", "Glutes"],
    ["adductors", "Adductors"], ["hip-flexors", "Quads"], ["calves", "Calves"], ["tibialis-anterior", "Ankles"], ["ankles", "Ankles"],
  ]);
  legacy.version = 6;
  legacy.exercises = legacy.exercises.map((exercise) => {
    const {
      primaryTargets,
      secondaryTargets,
      movementPattern: _movement,
      equipment: _equipment,
      purpose,
      style: _style,
      laterality: _laterality,
      support: _support,
      emphases: _emphases,
      typicalChallenge: _challenge,
      relatedExercises: _related,
      ...rest
    } = exercise;
    const broadPrimary = [...new Set(primaryTargets.map((target) => broadTarget.get(target)).filter(Boolean))];
    const primaryMuscles = broadPrimary.slice(0, 1);
    const secondaryMuscles = [...new Set([
      ...broadPrimary.slice(1),
      ...secondaryTargets.map((target) => broadTarget.get(target)).filter(Boolean),
    ])].filter((target) => !primaryMuscles.includes(target));
    const categories = purpose === "mobility"
      ? ["Mobility"]
      : purpose === "rehab"
        ? ["Rehab"]
        : exercise.id === "suitcase-carry"
          ? ["Full Body"]
          : [];
    return { ...rest, primaryMuscles, secondaryMuscles, categories, alternativeExerciseIds: [] };
  });
  return legacy;
}

test("starting data is valid and all routine references resolve", () => {
  const state = createDefaultState();
  assert.equal(validateState(state), true);
  assert.equal(state.programs.length, 1);
  assert.deepEqual(state.programs[0].routineIds, state.routines.map((routine) => routine.id));
  assert.equal(state.settings.activeProgramId, state.programs[0].id);
  assert.equal(new Set(state.exercises.map((exercise) => exercise.id)).size, state.exercises.length);
  assert.equal(new Set(state.routines.map((routine) => routine.id)).size, state.routines.length);
  const exerciseIds = new Set(state.exercises.map((exercise) => exercise.id));
  for (const routine of state.routines) {
    for (const entry of routine.entries) assert.equal(exerciseIds.has(entry.exerciseId), true);
  }
  assert.equal(state.routines.some((routine) => routine.id === "rest" || routine.status === "rest"), false);
  assert.equal(state.exercises.every((exercise) => exercise.primaryTargets.length >= 1 && exercise.primaryTargets.length <= 2), true);
  assert.equal(state.exercises.every((exercise) => exercise.primaryTargets.every((target) => !exercise.secondaryTargets.includes(target))), true);
  assert.equal(state.exercises.every((exercise) => MOVEMENT_PATTERNS.some((option) => option.id === exercise.movementPattern) && exercise.equipment.length), true);
  assert.deepEqual(EXERCISE_PURPOSES.map((purpose) => [purpose.id, state.exercises.filter((exercise) => exercise.purpose === purpose.id).length]), [
    ["strength", 40],
    ["mobility", 17],
    ["rehab", 20],
  ]);
  assert.equal(new Set(REVIEWED_EXERCISE_IDS).size, 77);
  assert.equal(state.exercises.reduce((count, exercise) => count + exercise.relatedExercises.length, 0), 38);
});

test("version 1 data migrates targets and removes the old Rest placeholder", () => {
  const current = createDefaultState();
  const legacy = version1State();
  const migrated = migrateState(legacy);
  assert.equal(migrated.version, current.version);
  assert.deepEqual(migrated.routines, current.routines);
  assert.equal(migrated.exercises.every((exercise) => Array.isArray(exercise.relatedExercises)), true);
  assert.equal(migrated.exercises.every((exercise) => !Object.hasOwn(exercise, "muscles")), true);
  assert.deepEqual(EXERCISE_PURPOSES.map((purpose) => migrated.exercises.filter((exercise) => exercise.purpose === purpose.id).length), [40, 17, 20]);
  assert.equal(validateState(migrated), true);
});

test("version 2 data reaches the reviewed classification without retaining legacy targets", () => {
  const legacy = version2State();
  const migrated = migrateState(legacy);
  assert.deepEqual(migrated.exercises[0].primaryTargets, ["chest"]);
  assert.deepEqual(migrated.exercises[0].secondaryTargets, ["triceps", "front-delts"]);
  assert.equal(migrated.exercises.some((exercise) => Object.hasOwn(exercise, "primaryMuscles")), false);
  assert.deepEqual(EXERCISE_PURPOSES.map((purpose) => migrated.exercises.filter((exercise) => exercise.purpose === purpose.id).length), [40, 17, 20]);
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
    assert.equal(migrated.settings.activeRoutineId, legacy.settings.activeRoutineId);
    assert.equal(migrated.settings.theme, legacy.settings.theme);
    for (const [index, exercise] of legacy.exercises.entries()) {
      const after = migrated.exercises[index];
      assert.equal(after.id, exercise.id);
      assert.equal(after.name, exercise.name);
      assert.equal(after.defaultPrescription, exercise.defaultPrescription);
      assert.equal(after.instructions, exercise.instructions);
      assert.equal(after.videoId, exercise.videoId);
    }
    assert.deepEqual(EXERCISE_PURPOSES.map((purpose) => migrated.exercises.filter((exercise) => exercise.purpose === purpose.id).length), [40, 17, 20]);
    assert.equal(migrated.exercises.some((exercise) => Object.hasOwn(exercise, "categories")), false);
    assert.equal(validateState(migrated), true);
  }
});

test("version 5 data migrates every routine into one program without changing content or history", () => {
  const legacy = version5State();
  legacy.routines[0].name = "Customized Push";
  legacy.routines[0].entries[0].prescription = "4 × 6";
  legacy.sessions["2026-07-18"] = { routineIds: [legacy.routines[0].id], note: "Preserved" };

  const migrated = migrateState(legacy);
  assert.equal(migrated.version, createDefaultState().version);
  assert.deepEqual(migrated.routines, legacy.routines);
  assert.deepEqual(migrated.sessions, legacy.sessions);
  assert.deepEqual(migrated.exercises.map(({ id, name, defaultPrescription, instructions, videoId }) => ({ id, name, defaultPrescription, instructions, videoId })),
    legacy.exercises.map(({ id, name, defaultPrescription, instructions, videoId }) => ({ id, name, defaultPrescription, instructions, videoId })));
  assert.deepEqual(migrated.exercises[0].primaryTargets, ["chest"]);
  assert.deepEqual(migrated.programs[0].routineIds, legacy.routines.map((routine) => routine.id));
  assert.equal(migrated.settings.activeRoutineId, legacy.settings.activeRoutineId);
  assert.equal(migrated.settings.theme, legacy.settings.theme);
  assert.equal(migrated.settings.activeProgramId, migrated.programs[0].id);
  assert.equal(validateState(migrated), true);
});

test("version 5 migration repairs invalid routine selection and supports an empty routine list", () => {
  const invalidSelection = version5State();
  invalidSelection.settings.activeRoutineId = "missing";
  const repaired = migrateState(invalidSelection);
  assert.equal(repaired.settings.activeRoutineId, repaired.routines[0].id);

  const empty = version5State();
  empty.routines = [];
  empty.sessions = {};
  empty.settings.activeRoutineId = "missing";
  const migratedEmpty = migrateState(empty);
  assert.equal(migratedEmpty.programs.length, 1);
  assert.deepEqual(migratedEmpty.programs[0].routineIds, []);
  assert.equal(migratedEmpty.settings.activeRoutineId, "");
  assert.equal(validateState(migratedEmpty), true);
});

test("version 6 migration loads reviewed built-ins and keeps custom uncertainty blank", () => {
  const legacy = version6State();
  legacy.exercises[0].name = "My incline press";
  legacy.exercises[0].defaultPrescription = "4 × 6";
  legacy.exercises[0].instructions = "Keep this cue";
  legacy.exercises[0].videoId = "abcdefghijk";
  legacy.exercises.push({
    id: "custom-exact",
    name: "Custom exact",
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Triceps"],
    categories: ["Rehab"],
    defaultPrescription: "2 × 10",
    instructions: "Custom note",
    videoId: "",
    alternativeExerciseIds: ["machine-chest-press"],
  }, {
    id: "custom-ambiguous",
    name: "Custom ambiguous",
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Shoulders"],
    categories: [],
    defaultPrescription: "",
    instructions: "",
    videoId: "",
    alternativeExerciseIds: [],
  });

  const migrated = migrateState(legacy);
  const builtIn = migrated.exercises[0];
  assert.equal(builtIn.name, "My incline press");
  assert.equal(builtIn.defaultPrescription, "4 × 6");
  assert.equal(builtIn.instructions, "Keep this cue");
  assert.equal(builtIn.videoId, "abcdefghijk");
  assert.deepEqual(builtIn.primaryTargets, ["chest"]);
  assert.equal(builtIn.movementPattern, "horizontal-press");

  const exact = migrated.exercises.find((exercise) => exercise.id === "custom-exact");
  assert.deepEqual(exact.primaryTargets, ["chest"]);
  assert.deepEqual(exact.secondaryTargets, ["triceps"]);
  assert.equal(exact.purpose, "rehab");
  assert.equal(exact.movementPattern, "");
  assert.deepEqual(exact.equipment, []);
  assert.deepEqual(exact.relatedExercises, [{ exerciseId: "machine-chest-press", relation: "similar" }]);
  assert.ok(migrated.exercises.find((exercise) => exercise.id === "machine-chest-press").relatedExercises
    .some((related) => related.exerciseId === "custom-exact" && related.relation === "similar"));

  const ambiguous = migrated.exercises.find((exercise) => exercise.id === "custom-ambiguous");
  assert.deepEqual(ambiguous.primaryTargets, []);
  assert.deepEqual(ambiguous.secondaryTargets, []);
  assert.equal(ambiguous.purpose, "strength");
  assert.equal(validateState(migrated), true);
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
  assert.equal(state.exercises.find((exercise) => exercise.id === "suitcase-carry").purpose, "strength");
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, createDefaultState().version);
});

test("store upgrades valid version 5 data in place", () => {
  const storage = new MemoryStorage();
  const legacy = version5State();
  storage.setItem(STORAGE_KEY, JSON.stringify(legacy));

  const state = createStore(storage).getState();
  assert.deepEqual(state.routines, legacy.routines);
  assert.deepEqual(state.sessions, legacy.sessions);
  assert.equal(state.programs.length, 1);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, createDefaultState().version);
});

test("store upgrades version 6 classification in place", () => {
  const storage = new MemoryStorage();
  const legacy = version6State();
  legacy.exercises[0].name = "Preserved custom name";
  legacy.exercises[0].defaultPrescription = "5 × 5";
  storage.setItem(STORAGE_KEY, JSON.stringify(legacy));

  const state = createStore(storage).getState();
  assert.equal(state.version, createDefaultState().version);
  assert.equal(state.exercises[0].name, "Preserved custom name");
  assert.equal(state.exercises[0].defaultPrescription, "5 × 5");
  assert.deepEqual(state.exercises[0].primaryTargets, ["chest"]);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, createDefaultState().version);
});

test("a version 5 upgrade write failure keeps the original stored value intact", () => {
  const storage = new MemoryStorage();
  const legacy = version5State();
  const raw = JSON.stringify(legacy);
  storage.setItem(STORAGE_KEY, raw);
  storage.failWrites = true;

  const store = createStore(storage);
  assert.equal(store.getState().version, createDefaultState().version);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  assert.match(store.getLastError(), /upgraded for this session/i);
});

test("a version 6 upgrade write failure keeps the original stored value intact", () => {
  const storage = new MemoryStorage();
  const legacy = version6State();
  const raw = JSON.stringify(legacy);
  storage.setItem(STORAGE_KEY, raw);
  storage.failWrites = true;

  const store = createStore(storage);
  assert.equal(store.getState().version, createDefaultState().version);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  assert.match(store.getLastError(), /upgraded for this session/i);
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
  const invalidTarget = createDefaultState();
  invalidTarget.exercises[0].primaryTargets = [42];
  assert.equal(validateState(invalidTarget), false);

  const overlappingTargets = createDefaultState();
  overlappingTargets.exercises[0].secondaryTargets = [...overlappingTargets.exercises[0].primaryTargets];
  assert.equal(validateState(overlappingTargets), false);

  const missingPrimary = createDefaultState();
  missingPrimary.exercises[0].primaryTargets = [];
  assert.equal(validateState(missingPrimary), false);

  const multiplePrimaries = createDefaultState();
  multiplePrimaries.exercises[0].primaryTargets = ["chest", "lats", "triceps"];
  assert.equal(validateState(multiplePrimaries), false);

  const unknownPrimary = createDefaultState();
  unknownPrimary.exercises[0].primaryTargets = ["Owner-defined target"];
  assert.equal(validateState(unknownPrimary), false);

  const unknownSecondary = createDefaultState();
  unknownSecondary.exercises[0].secondaryTargets.push("Owner-defined target");
  assert.equal(validateState(unknownSecondary), false);

  const invalidMovement = createDefaultState();
  invalidMovement.exercises[0].movementPattern = "Diagonal-ish";
  assert.equal(validateState(invalidMovement), false);

  const invalidEquipment = createDefaultState();
  invalidEquipment.exercises[0].equipment = ["cable", "imaginary"];
  assert.equal(validateState(invalidEquipment), false);

  const duplicateEquipment = createDefaultState();
  duplicateEquipment.exercises[0].equipment = ["cable", "cable"];
  assert.equal(validateState(duplicateEquipment), false);

  const invalidPurpose = createDefaultState();
  invalidPurpose.exercises[0].purpose = "full-body";
  assert.equal(validateState(invalidPurpose), false);

  const invalidStyle = createDefaultState();
  invalidStyle.exercises[0].style = "Power";
  assert.equal(validateState(invalidStyle), false);

  const invalidEmphases = createDefaultState();
  invalidEmphases.exercises[0].emphases = ["Upper chest", "Upper chest"];
  assert.equal(validateState(invalidEmphases), false);

  const duplicateEntry = createDefaultState();
  duplicateEntry.routines[0].entries[1].id = duplicateEntry.routines[0].entries[0].id;
  assert.equal(validateState(duplicateEntry), false);

  const invalidRoutine = createDefaultState();
  invalidRoutine.routines[0].status = "sometimes";
  assert.equal(validateState(invalidRoutine), false);

  const missingProgramRoutine = createDefaultState();
  missingProgramRoutine.programs[0].routineIds[0] = "missing";
  assert.equal(validateState(missingProgramRoutine), false);

  const duplicateProgramRoutine = createDefaultState();
  duplicateProgramRoutine.programs[0].routineIds.push(duplicateProgramRoutine.programs[0].routineIds[0]);
  assert.equal(validateState(duplicateProgramRoutine), false);

  const unownedRoutine = createDefaultState();
  unownedRoutine.programs[0].routineIds.pop();
  assert.equal(validateState(unownedRoutine), false);

  const duplicateProgramId = createDefaultState();
  duplicateProgramId.programs.push({ ...duplicateProgramId.programs[0] });
  assert.equal(validateState(duplicateProgramId), false);

  const invalidActiveProgram = createDefaultState();
  invalidActiveProgram.settings.activeProgramId = "missing";
  assert.equal(validateState(invalidActiveProgram), false);

  const crossProgramSelection = createDefaultState();
  const secondProgram = createProgramInState(crossProgramSelection, "Second");
  secondProgram.settings.activeProgramId = crossProgramSelection.programs[0].id;
  secondProgram.settings.activeRoutineId = "";
  assert.equal(validateState(secondProgram), false);

  const invalidDate = createDefaultState();
  invalidDate.sessions["2026-02-31"] = { routineIds: ["push-a"], note: "" };
  assert.equal(validateState(invalidDate), false);

  const invalidRelated = createDefaultState();
  invalidRelated.exercises[0].relatedExercises = [{ exerciseId: "missing", relation: "similar" }];
  assert.equal(validateState(invalidRelated), false);

  const selfRelated = createDefaultState();
  selfRelated.exercises[0].relatedExercises = [{ exerciseId: selfRelated.exercises[0].id, relation: "similar" }];
  assert.equal(validateState(selfRelated), false);

  const duplicateRelated = createDefaultState();
  const related = duplicateRelated.exercises[0].relatedExercises[0];
  duplicateRelated.exercises[0].relatedExercises.push({ ...related });
  assert.equal(validateState(duplicateRelated), false);

  const missingInverse = createDefaultState();
  const targetId = missingInverse.exercises[0].relatedExercises[0].exerciseId;
  const counterpart = missingInverse.exercises.find((exercise) => exercise.id === targetId);
  counterpart.relatedExercises = counterpart.relatedExercises.filter((item) => item.exerciseId !== missingInverse.exercises[0].id);
  assert.equal(validateState(missingInverse), false);
});

test("deleting an exercise removes every routine reference", () => {
  let state = createDefaultState();
  const exerciseId = "rope-pushdown";
  state = setRelatedExercisesInState(state, state.exercises[0].id, [{ exerciseId, relation: "similar" }]);
  assert.ok(state.routines.some((routine) => routine.entries.some((entry) => entry.exerciseId === exerciseId)));
  const next = removeExerciseFromState(state, exerciseId);
  assert.equal(next.exercises.some((exercise) => exercise.id === exerciseId), false);
  assert.equal(next.routines.some((routine) => routine.entries.some((entry) => entry.exerciseId === exerciseId)), false);
  assert.equal(next.exercises.some((exercise) => exercise.relatedExercises.some((related) => related.exerciseId === exerciseId)), false);
  assert.equal(validateState(next), true);
});

test("related exercise updates maintain inverse direction and reject invalid links", () => {
  const state = createDefaultState();
  const sourceId = "glute-bridge";
  const targetId = "hip-thrust";
  const next = setRelatedExercisesInState(state, sourceId, [{ exerciseId: targetId, relation: "harder" }]);
  assert.deepEqual(next.exercises.find((exercise) => exercise.id === sourceId).relatedExercises, [{ exerciseId: targetId, relation: "harder" }]);
  assert.deepEqual(next.exercises.find((exercise) => exercise.id === targetId).relatedExercises, [{ exerciseId: sourceId, relation: "easier" }]);
  assert.equal(validateState(next), true);

  assert.deepEqual(setRelatedExercisesInState(state, sourceId, [{ exerciseId: sourceId, relation: "similar" }]), state);
  assert.deepEqual(setRelatedExercisesInState(state, sourceId, [{ exerciseId: "missing", relation: "similar" }]), state);
  assert.deepEqual(setRelatedExercisesInState(state, sourceId, [{ exerciseId: targetId, relation: "sidegrade" }]), state);
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

test("a routine entry can move directly to any valid position", () => {
  const state = createDefaultState();
  const routine = state.routines[0];
  const entry = routine.entries[0];
  const next = reorderRoutineEntry(state, routine.id, entry.id, routine.entries.length - 1);

  assert.equal(next.routines[0].entries.at(-1).id, entry.id);
  assert.deepEqual(next.routines[0].entries.slice(0, -1).map((item) => item.id), routine.entries.slice(1).map((item) => item.id));
  assert.notDeepEqual(next, state);
  assert.equal(validateState(next), true);

  assert.deepEqual(reorderRoutineEntry(state, routine.id, entry.id, -1), state);
  assert.deepEqual(reorderRoutineEntry(state, routine.id, entry.id, routine.entries.length), state);
});

test("a failed direct reorder leaves the stored routine unchanged", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const before = store.getState();
  const routine = before.routines[0];
  const moved = reorderRoutineEntry(before, routine.id, routine.entries[0].id, routine.entries.length - 1);

  storage.failWrites = true;
  assert.equal(store.replace(moved).ok, false);
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
  assert.equal(next.programs[0].routineIds.includes("push-a"), false);
  assert.equal(next.routines.some((routine) => routine.id === next.settings.activeRoutineId), true);
  assert.equal(validateState(next), true);
});

test("Program CRUD keeps stable membership and active selection", () => {
  const original = createDefaultState();
  const created = createProgramInState(original, "Travel");
  const travel = created.programs.at(-1);
  assert.equal(travel.name, "Travel");
  assert.deepEqual(travel.routineIds, []);
  assert.equal(created.settings.activeProgramId, travel.id);
  assert.equal(created.settings.activeRoutineId, "");

  const renamed = renameProgramInState(created, travel.id, "Travel / Home");
  assert.equal(renamed.programs.at(-1).name, "Travel / Home");
  assert.equal(original.programs.length, 1);

  const removed = removeProgramFromState(renamed, travel.id);
  assert.equal(removed.programs.length, 1);
  assert.equal(removed.settings.activeProgramId, original.programs[0].id);
  assert.equal(removed.settings.activeRoutineId, original.programs[0].routineIds[0]);
  assert.equal(validateState(removed), true);
});

test("adding and ordering a routine updates only its owning program", () => {
  const state = createProgramInState(createDefaultState(), "Travel");
  const travel = state.programs.at(-1);
  const first = { id: "hotel-a", name: "Hotel A", group: "home", status: "required", entries: [] };
  const second = { id: "hotel-b", name: "Hotel B", group: "home", status: "optional", entries: [] };
  const withFirst = addRoutineToProgram(state, travel.id, first);
  const withSecond = addRoutineToProgram(withFirst, travel.id, second);
  assert.deepEqual(withSecond.programs.at(-1).routineIds, ["hotel-a", "hotel-b"]);
  assert.equal(withSecond.settings.activeRoutineId, "hotel-a");

  const reordered = reorderRoutineInProgram(withSecond, travel.id, "hotel-b", 0);
  assert.deepEqual(reordered.programs.at(-1).routineIds, ["hotel-b", "hotel-a"]);
  assert.deepEqual(reordered.programs[0].routineIds, createDefaultState().programs[0].routineIds);
  assert.deepEqual(
    reordered.routines.map((routine) => routine.id),
    reordered.programs.flatMap((program) => program.routineIds),
  );
  assert.equal(validateState(reordered), true);
});

test("switching programs repairs routine selection without changing history", () => {
  const completed = toggleRoutineForDate(createDefaultState(), "push-a", "2026-07-17");
  const withTravel = createProgramInState(completed, "Travel");
  const travel = withTravel.programs.at(-1);
  const withRoutine = addRoutineToProgram(withTravel, travel.id, {
    id: "hotel",
    name: "Hotel",
    group: "home",
    status: "required",
    entries: [],
  });
  const history = structuredClone(withRoutine.sessions);
  const switchedHome = setActiveProgramInState(withRoutine, withRoutine.programs[0].id);
  assert.equal(switchedHome.settings.activeRoutineId, "push-a");
  assert.deepEqual(switchedHome.sessions, history);
  const switchedTravel = setActiveProgramInState(switchedHome, travel.id);
  assert.equal(switchedTravel.settings.activeRoutineId, "hotel");
  assert.deepEqual(switchedTravel.sessions, history);
});

test("duplicating a program creates new owned IDs, reuses exercises, and copies no history", () => {
  const completed = toggleRoutineForDate(createDefaultState(), "push-a", "2026-07-17");
  const source = completed.programs[0];
  const duplicate = duplicateProgramInState(completed, source.id, "PPL copy");
  const copiedProgram = duplicate.programs.at(-1);
  const copiedRoutines = copiedProgram.routineIds.map((id) => duplicate.routines.find((routine) => routine.id === id));
  const originalRoutines = source.routineIds.map((id) => completed.routines.find((routine) => routine.id === id));

  assert.notEqual(copiedProgram.id, source.id);
  assert.equal(copiedRoutines.length, originalRoutines.length);
  assert.equal(copiedRoutines.every((routine) => !source.routineIds.includes(routine.id)), true);
  assert.equal(
    copiedRoutines.flatMap((routine) => routine.entries).every((entry) => !originalRoutines.flatMap((routine) => routine.entries).some((old) => old.id === entry.id)),
    true,
  );
  assert.deepEqual(
    copiedRoutines.map((routine) => routine.entries.map((entry) => entry.exerciseId)),
    originalRoutines.map((routine) => routine.entries.map((entry) => entry.exerciseId)),
  );
  assert.deepEqual(
    copiedRoutines.map((routine) => ({
      name: routine.name,
      group: routine.group,
      status: routine.status,
      prescriptions: routine.entries.map((entry) => entry.prescription),
    })),
    originalRoutines.map((routine) => ({
      name: routine.name,
      group: routine.group,
      status: routine.status,
      prescriptions: routine.entries.map((entry) => entry.prescription),
    })),
  );
  assert.deepEqual(duplicate.sessions, completed.sessions);
  assert.equal(duplicate.settings.activeProgramId, copiedProgram.id);
  assert.equal(validateState(duplicate), true);
});

test("deleting a program removes only its routines and their history", () => {
  let state = createProgramInState(createDefaultState(), "Travel");
  const travel = state.programs.at(-1);
  state = addRoutineToProgram(state, travel.id, { id: "hotel", name: "Hotel", group: "home", status: "required", entries: [] });
  state.sessions["2026-07-15"] = { routineIds: ["push-a", "hotel"], note: "Mixed" };
  state.sessions["2026-07-16"] = { routineIds: ["hotel"], note: "" };

  const next = removeProgramFromState(state, travel.id);
  assert.equal(next.routines.some((routine) => routine.id === "hotel"), false);
  assert.deepEqual(next.sessions["2026-07-15"], { routineIds: ["push-a"], note: "Mixed" });
  assert.equal(next.sessions["2026-07-16"], undefined);
  assert.equal(next.exercises.length, state.exercises.length);
  assert.equal(validateState(next), true);
});

test("deleting the last program leaves a valid empty app and preserves standalone notes", () => {
  const state = createDefaultState();
  state.sessions["2026-07-15"] = { routineIds: ["push-a"], note: "Keep this note" };
  const next = removeProgramFromState(state, state.programs[0].id);
  assert.deepEqual(next.programs, []);
  assert.deepEqual(next.routines, []);
  assert.equal(next.settings.activeProgramId, "");
  assert.equal(next.settings.activeRoutineId, "");
  assert.deepEqual(next.sessions["2026-07-15"], { routineIds: [], note: "Keep this note" });
  assert.equal(next.exercises.length, state.exercises.length);
  assert.equal(validateState(next), true);
});

test("deleting the active routine in an otherwise empty program does not select another program", () => {
  let state = createProgramInState(createDefaultState(), "Travel");
  const travel = state.programs.at(-1);
  state = addRoutineToProgram(state, travel.id, { id: "hotel", name: "Hotel", group: "home", status: "required", entries: [] });
  const next = removeRoutineFromState(state, "hotel");
  assert.equal(next.settings.activeProgramId, travel.id);
  assert.equal(next.settings.activeRoutineId, "");
  assert.equal(validateState(next), true);
});

test("failed Program writes leave stored and in-memory state unchanged", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const before = store.getState();
  const next = createProgramInState(before, "Should fail");
  storage.failWrites = true;
  assert.equal(store.replace(next).ok, false);
  assert.deepEqual(store.getState(), before);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), before);
});

test("imports are validated completely before replacement", () => {
  const state = createDefaultState();
  const imported = parseImportedState(JSON.stringify({ schemaVersion: 1, data: state }));
  assert.deepEqual(imported, state);

  state.exercises[0].primaryTargets = [null];
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

test("version 5 backups import through Program migration", () => {
  const legacy = version5State();
  legacy.sessions["2026-07-17"] = { routineIds: ["push-a"], note: "Keep" };
  const imported = parseImportedState(JSON.stringify({ schemaVersion: 5, data: legacy }));
  assert.deepEqual(imported.routines, legacy.routines);
  assert.deepEqual(imported.sessions, legacy.sessions);
  assert.deepEqual(imported.programs[0].routineIds, legacy.routines.map((routine) => routine.id));
  assert.equal(validateState(imported), true);
});

test("version 6 backups import through classification migration", () => {
  const legacy = version6State();
  legacy.sessions["2026-07-17"] = { routineIds: ["push-a"], note: "Keep" };
  legacy.exercises[0].instructions = "Keep this cue";
  const imported = parseImportedState(JSON.stringify({ schemaVersion: 6, data: legacy }));
  assert.deepEqual(imported.routines, legacy.routines);
  assert.deepEqual(imported.programs, legacy.programs);
  assert.deepEqual(imported.sessions, legacy.sessions);
  assert.equal(imported.exercises[0].instructions, "Keep this cue");
  assert.deepEqual(imported.exercises[0].primaryTargets, ["chest"]);
  assert.equal(validateState(imported), true);
});

test("classification and related links survive save, reload, export, and import", () => {
  const state = createDefaultState();
  state.exercises[0].primaryTargets = ["chest", "front-delts"];
  state.exercises[0].secondaryTargets = ["triceps"];
  state.exercises[0].movementPattern = "horizontal-press";
  state.exercises[0].equipment = ["dumbbells", "bench"];
  state.exercises[0].purpose = "rehab";
  const storage = new MemoryStorage();
  const store = createStore(storage);
  assert.equal(store.replace(state).ok, true);
  const reloaded = createStore(storage).getState();
  assert.deepEqual(reloaded.exercises[0].primaryTargets, ["chest", "front-delts"]);
  assert.deepEqual(reloaded.exercises[0].secondaryTargets, ["triceps"]);
  assert.deepEqual(reloaded.exercises[0].equipment, ["dumbbells", "bench"]);
  assert.equal(reloaded.exercises[0].purpose, "rehab");

  const imported = parseImportedState(JSON.stringify(createBackup(reloaded)));
  assert.deepEqual(imported.exercises[0], reloaded.exercises[0]);
  assert.equal(validateState(imported), true);
});

test("programs survive save, reload, export, and import", () => {
  let state = createProgramInState(createDefaultState(), "Travel");
  const travel = state.programs.at(-1);
  state = addRoutineToProgram(state, travel.id, { id: "hotel", name: "Hotel", group: "home", status: "required", entries: [] });
  state = setActiveProgramInState(state, travel.id);
  state.sessions["2026-07-17"] = { routineIds: ["push-a"], note: "Old program" };

  const storage = new MemoryStorage();
  const store = createStore(storage);
  assert.equal(store.replace(state).ok, true);
  const reloaded = createStore(storage).getState();
  assert.deepEqual(reloaded, state);
  assert.deepEqual(parseImportedState(JSON.stringify(createBackup(reloaded))), state);
});

test("all incompatible imports use one friendly error", () => {
  assert.throws(() => parseImportedState("not json"), /not compatible/i);
  assert.throws(() => parseImportedState(JSON.stringify({ version: 99 })), /not compatible/i);
  const invalidLegacy = version3State();
  invalidLegacy.exercises[0].primaryMuscles = [];
  assert.throws(() => parseImportedState(JSON.stringify(invalidLegacy)), /not compatible/i);
});
