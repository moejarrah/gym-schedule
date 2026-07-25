import test from "node:test";
import assert from "node:assert/strict";
import {
  EXERCISE_PURPOSES,
  MOVEMENT_PATTERNS,
  REVIEWED_EXERCISE_IDS,
  classificationLabel,
  createDefaultState,
} from "../data.js";
import {
  STORAGE_KEY,
  addRoutineBlockInState,
  addRoutineEntryInState,
  addRoutineToProgram,
  createBackup,
  createProgramInState,
  createStore,
  duplicateProgramInState,
  exerciseDeletionImpact,
  localDateKey,
  moveItem,
  moveRoutineEntry,
  removeProgramFromState,
  removeRoutineBlockInState,
  reorderRoutineEntryWithinBlock,
  reorderRoutineBlockInState,
  reorderRoutineInProgram,
  parseImportedState,
  removeExerciseFromState,
  removeRoutineFromState,
  removeRoutineEntryFromState,
  renameProgramInState,
  setActiveProgramInState,
  setActiveRoutineInState,
  setDayInState,
  setRelatedExercisesInState,
  toggleEntryCheckForDate,
  toggleRoutineForDate,
  upsertExerciseInState,
  updateProgramInState,
  updateRoutineInState,
  updateRoutineBlockInState,
  updateRoutineEntryInState,
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

function emptyRoutine(id, name, group = "home", status = "required") {
  return {
    id,
    name,
    group,
    status,
    note: "",
    blocks: [{ id: `${id}-block`, name: "" }],
    entries: [],
  };
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

test("default exercise and entry identities stay stable when names change", () => {
  const state = createDefaultState();
  const exercise = state.exercises.find((item) => item.id === "low-incline-dumbbell-press");
  const routine = state.routines.find((item) => item.id === "push-a-glutes");
  const entry = routine.entries.find((item) => item.choices.some((choice) => choice.exerciseId === exercise.id));
  const entryOrder = routine.entries.map((item) => item.id);

  exercise.name = "Renamed incline press";

  assert.equal(exercise.id, "low-incline-dumbbell-press");
  assert.equal(entry.id, "push-a-glutes-entry-001");
  assert.equal(entry.choices[0].exerciseId, exercise.id);
  assert.deepEqual(routine.entries.map((item) => item.id), entryOrder);
});

test("starting data uses the complete current schema and all references resolve", () => {
  const state = createDefaultState();
  assert.equal(validateState(state), true);
  assert.equal(state.version, 9);
  assert.equal(state.programs.length, 1);
  assert.equal(state.programs[0].id, "pplppl7-glute-specialization");
  assert.equal(state.programs[0].name, "PPLPPL 7 — Glute Specialization");
  assert.match(state.programs[0].note, /Day 7 — Rest: no gym resistance training\./);
  assert.deepEqual(state.programs[0].routineIds, state.routines.map((routine) => routine.id));
  assert.equal(state.exercises.length, 177);
  assert.equal(state.routines.length, 10);
  assert.equal(state.routines.reduce((count, routine) => count + routine.blocks.length, 0), 24);
  assert.equal(state.routines.reduce((count, routine) => count + routine.entries.length, 0), 156);
  assert.equal(state.routines.reduce((count, routine) => (
    count + routine.entries.reduce((choiceCount, entry) => choiceCount + entry.choices.length, 0)
  ), 0), 184);
  assert.equal(state.exercises.reduce((count, exercise) => count + exercise.aliases.length, 0), 31);
  assert.equal(state.exercises.reduce((count, exercise) => count + exercise.relatedExercises.length, 0), 66);
  assert.equal(new Set(state.exercises.map((exercise) => exercise.id)).size, state.exercises.length);
  assert.equal(state.exercises.every((exercise) => Array.isArray(exercise.aliases)), true);
  const exerciseIds = new Set(state.exercises.map((exercise) => exercise.id));
  for (const routine of state.routines) {
    const blockIds = new Set(routine.blocks.map((block) => block.id));
    for (const entry of routine.entries) {
      assert.equal(blockIds.has(entry.blockId), true);
      assert.equal(["main", "optional"].includes(entry.role), true);
      assert.equal(entry.choices.length > 0, true);
      assert.equal(entry.choices.every((choice) => exerciseIds.has(choice.exerciseId) && choice.prescription.trim()), true);
      assert.equal(Object.hasOwn(entry, "exerciseId"), false);
      assert.equal(Object.hasOwn(entry, "prescription"), false);
    }
  }
  const homeBase = state.routines.find((routine) => routine.id === "home-base");
  assert.equal(homeBase.blocks.length, 7);
  assert.equal(homeBase.entries.length, 52);
  assert.equal(homeBase.entries.every((entry) => entry.role === "optional"), true);
  const programmedExerciseIds = new Set(state.routines.flatMap((routine) => (
    routine.entries.flatMap((entry) => entry.choices.map((choice) => choice.exerciseId))
  )));
  assert.equal(state.exercises.filter((exercise) => !programmedExerciseIds.has(exercise.id)).length, 25);
  assert.equal(state.routines.some((routine) => /^rest$/i.test(routine.name)), false);
  assert.equal(new Set(REVIEWED_EXERCISE_IDS).size, 177);
});

test("older development schemas are rejected and stored data resets without mutation", () => {
  const old = createDefaultState();
  old.version = 8;
  assert.equal(validateState(old), false);
  assert.throws(() => parseImportedState(JSON.stringify(old)), /not compatible/);

  const storage = new MemoryStorage();
  const raw = JSON.stringify(old);
  storage.setItem(STORAGE_KEY, raw);
  const store = createStore(storage);
  assert.deepEqual(store.getState(), createDefaultState());
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  assert.match(store.getLastError(), /defaults are open/i);
  assert.equal([...storage.values.keys()].some((key) => key.startsWith(`${STORAGE_KEY}:recovery:`)), true);
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

  const duplicateCanonicalAlias = createDefaultState();
  duplicateCanonicalAlias.exercises[0].aliases = ["Machine—chest press"];
  assert.equal(validateState(duplicateCanonicalAlias), false);

  const duplicateAlias = createDefaultState();
  duplicateAlias.exercises[0].aliases = ["Incline DB press"];
  duplicateAlias.exercises[1].aliases = ["incline-db press"];
  assert.equal(validateState(duplicateAlias), false);

  const missingAliases = createDefaultState();
  delete missingAliases.exercises[0].aliases;
  assert.equal(validateState(missingAliases), false);

  const invalidRoutine = createDefaultState();
  invalidRoutine.routines[0].status = "sometimes";
  assert.equal(validateState(invalidRoutine), false);

  const missingRoutineNote = createDefaultState();
  delete missingRoutineNote.routines[0].note;
  assert.equal(validateState(missingRoutineNote), false);

  const noBlocks = createDefaultState();
  noBlocks.routines[0].blocks = [];
  assert.equal(validateState(noBlocks), false);

  const danglingBlock = createDefaultState();
  danglingBlock.routines[0].entries[0].blockId = "missing";
  assert.equal(validateState(danglingBlock), false);

  const noChoices = createDefaultState();
  noChoices.routines[0].entries[0].choices = [];
  assert.equal(validateState(noChoices), false);

  const emptyChoicePrescription = createDefaultState();
  emptyChoicePrescription.routines[0].entries[0].choices[0].prescription = " ";
  assert.equal(validateState(emptyChoicePrescription), false);

  const duplicateChoice = createDefaultState();
  duplicateChoice.routines[0].entries[0].choices.push({ ...duplicateChoice.routines[0].entries[0].choices[0] });
  assert.equal(validateState(duplicateChoice), false);

  const legacyEntryTruth = createDefaultState();
  legacyEntryTruth.routines[0].entries[0].exerciseId = legacyEntryTruth.routines[0].entries[0].choices[0].exerciseId;
  assert.equal(validateState(legacyEntryTruth), false);

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

  const missingProgramNote = createDefaultState();
  delete missingProgramNote.programs[0].note;
  assert.equal(validateState(missingProgramNote), false);

  const invalidActiveProgram = createDefaultState();
  invalidActiveProgram.settings.activeProgramId = "missing";
  assert.equal(validateState(invalidActiveProgram), false);

  const crossProgramSelection = createDefaultState();
  const secondProgram = createProgramInState(crossProgramSelection, "Second");
  secondProgram.settings.activeProgramId = crossProgramSelection.programs[0].id;
  secondProgram.settings.activeRoutineId = "";
  assert.equal(validateState(secondProgram), false);

  const invalidRole = createDefaultState();
  invalidRole.routines[0].entries[0].role = "sometimes";
  assert.equal(validateState(invalidRole), false);

  const missingChecks = createDefaultState();
  missingChecks.sessions["2026-07-17"] = { routineIds: ["push-a-glutes"], note: "" };
  assert.equal(validateState(missingChecks), false);

  const crossRoutineCheck = createDefaultState();
  crossRoutineCheck.sessions["2026-07-17"] = {
    routineIds: [],
    checkedEntryIdsByRoutine: { "push-a-glutes": [crossRoutineCheck.routines[1].entries[0].id] },
    note: "",
  };
  assert.equal(validateState(crossRoutineCheck), false);

  const duplicateCheck = createDefaultState();
  const entryId = duplicateCheck.routines[0].entries[0].id;
  duplicateCheck.sessions["2026-07-17"] = {
    routineIds: [],
    checkedEntryIdsByRoutine: { "push-a-glutes": [entryId, entryId] },
    note: "",
  };
  assert.equal(validateState(duplicateCheck), false);

  const invalidDate = createDefaultState();
  invalidDate.sessions["2026-02-31"] = { routineIds: ["push-a-glutes"], checkedEntryIdsByRoutine: {}, note: "" };
  assert.equal(validateState(invalidDate), false);

  const invalidRelated = createDefaultState();
  invalidRelated.exercises[0].relatedExercises = [{ exerciseId: "missing", relation: "similar" }];
  assert.equal(validateState(invalidRelated), false);

  const selfRelated = createDefaultState();
  selfRelated.exercises[0].relatedExercises = [{ exerciseId: selfRelated.exercises[0].id, relation: "similar" }];
  assert.equal(validateState(selfRelated), false);

  const duplicateRelated = createDefaultState();
  const relatedSource = duplicateRelated.exercises.find((exercise) => exercise.relatedExercises.length);
  const related = relatedSource.relatedExercises[0];
  relatedSource.relatedExercises.push({ ...related });
  assert.equal(validateState(duplicateRelated), false);

  const missingInverse = createDefaultState();
  const sourceWithRelation = missingInverse.exercises.find((exercise) => exercise.relatedExercises.length);
  const targetId = sourceWithRelation.relatedExercises[0].exerciseId;
  const counterpart = missingInverse.exercises.find((exercise) => exercise.id === targetId);
  counterpart.relatedExercises = counterpart.relatedExercises.filter((item) => item.exerciseId !== sourceWithRelation.id);
  assert.equal(validateState(missingInverse), false);
});

test("deleting an exercise removes every routine reference", () => {
  let state = createDefaultState();
  const exerciseId = "rope-pushdown";
  const removedEntries = state.routines.flatMap((routine) => (
    routine.entries
      .filter((entry) => entry.choices.length === 1 && entry.choices[0].exerciseId === exerciseId)
      .map((entry) => [routine.id, entry.id])
  ));
  state.sessions["2026-07-17"] = {
    routineIds: ["push-a-glutes"],
    checkedEntryIdsByRoutine: Object.fromEntries(removedEntries.map(([routineId, id]) => [routineId, [id]])),
    note: "Keep",
  };
  state = setRelatedExercisesInState(state, state.exercises[0].id, [{ exerciseId, relation: "similar" }]);
  assert.ok(state.routines.some((routine) => routine.entries.some((entry) => entry.choices.some((choice) => choice.exerciseId === exerciseId))));
  const next = removeExerciseFromState(state, exerciseId);
  assert.equal(next.exercises.some((exercise) => exercise.id === exerciseId), false);
  assert.equal(next.routines.some((routine) => routine.entries.some((entry) => entry.choices.some((choice) => choice.exerciseId === exerciseId))), false);
  assert.equal(next.exercises.some((exercise) => exercise.relatedExercises.some((related) => related.exerciseId === exerciseId)), false);
  assert.deepEqual(next.sessions["2026-07-17"], {
    routineIds: ["push-a-glutes"],
    checkedEntryIdsByRoutine: {},
    note: "Keep",
  });
  assert.equal(validateState(next), true);
});

test("exercise deletion promotes remaining choices and cleans checks only for an empty slot", () => {
  const state = createDefaultState();
  const routine = state.routines[0];
  const entry = routine.entries[0];
  const preferredId = entry.choices[0].exerciseId;
  const alternateId = routine.entries[1].choices[0].exerciseId;
  entry.choices.push({ exerciseId: alternateId, prescription: "2 × 10–12" });
  state.sessions["2026-07-17"] = {
    routineIds: [],
    checkedEntryIdsByRoutine: { [routine.id]: [entry.id] },
    note: "",
  };

  const promoted = removeExerciseFromState(state, preferredId);
  const keptEntry = promoted.routines[0].entries.find((item) => item.id === entry.id);
  assert.deepEqual(keptEntry.choices, [{ exerciseId: alternateId, prescription: "2 × 10–12" }]);
  assert.deepEqual(promoted.sessions["2026-07-17"].checkedEntryIdsByRoutine[routine.id], [entry.id]);
  assert.equal(validateState(promoted), true);

  const removed = removeExerciseFromState(promoted, alternateId);
  assert.equal(removed.routines[0].entries.some((item) => item.id === entry.id), false);
  assert.equal(removed.sessions["2026-07-17"], undefined);
  assert.equal(validateState(removed), true);
});

test("exercise deletion impact truthfully partitions zero, one, and several programmed uses", () => {
  let state = createDefaultState();
  const source = structuredClone(state.exercises[0]);
  const exerciseId = "deletion-impact-exercise";
  state.exercises.push({
    ...source,
    id: exerciseId,
    name: "Deletion impact exercise",
    aliases: [],
    relatedExercises: [],
  });
  assert.deepEqual(exerciseDeletionImpact(state, exerciseId), {
    programmedUses: 0,
    alternativeChoicesRemoved: 0,
    preferredChoicesPromoted: 0,
    slotsDeleted: 0,
    relatedLinksRemoved: 0,
  });

  const routine = state.routines[0];
  const [promotionEntry, alternativeEntry, deletedEntry] = routine.entries.slice(0, 3);
  promotionEntry.choices = [
    { exerciseId, prescription: "3 × 8" },
    promotionEntry.choices[0],
  ];
  assert.deepEqual(exerciseDeletionImpact(state, exerciseId), {
    programmedUses: 1,
    alternativeChoicesRemoved: 0,
    preferredChoicesPromoted: 1,
    slotsDeleted: 0,
    relatedLinksRemoved: 0,
  });

  alternativeEntry.choices.push({ exerciseId, prescription: "2 × 12" });
  deletedEntry.choices = [{ exerciseId, prescription: "1 × 20" }];
  state = setRelatedExercisesInState(state, exerciseId, [{ exerciseId: state.exercises[1].id, relation: "similar" }]);
  state.sessions["2026-07-25"] = {
    routineIds: [],
    checkedEntryIdsByRoutine: {
      [routine.id]: [promotionEntry.id, alternativeEntry.id, deletedEntry.id],
    },
    note: "Preserve this note",
  };
  assert.deepEqual(exerciseDeletionImpact(state, exerciseId), {
    programmedUses: 3,
    alternativeChoicesRemoved: 1,
    preferredChoicesPromoted: 1,
    slotsDeleted: 1,
    relatedLinksRemoved: 1,
  });

  const removed = removeExerciseFromState(state, exerciseId);
  const nextRoutine = removed.routines.find((item) => item.id === routine.id);
  assert.equal(nextRoutine.entries.find((entry) => entry.id === promotionEntry.id).choices[0].exerciseId, promotionEntry.choices[1].exerciseId);
  assert.equal(nextRoutine.entries.find((entry) => entry.id === alternativeEntry.id).choices.some((choice) => choice.exerciseId === exerciseId), false);
  assert.equal(nextRoutine.entries.some((entry) => entry.id === deletedEntry.id), false);
  assert.deepEqual(removed.sessions["2026-07-25"], {
    routineIds: [],
    checkedEntryIdsByRoutine: {
      [routine.id]: [promotionEntry.id, alternativeEntry.id],
    },
    note: "Preserve this note",
  });
  assert.equal(removed.exercises.some((exercise) => exercise.relatedExercises.some((related) => related.exerciseId === exerciseId)), false);
  assert.equal(validateState(removed), true);
});

test("related exercise updates maintain inverse direction and reject invalid links", () => {
  const state = createDefaultState();
  const sourceId = "rope-pushdown";
  const targetId = "cable-crunch";
  const next = setRelatedExercisesInState(state, sourceId, [{ exerciseId: targetId, relation: "harder" }]);
  assert.deepEqual(next.exercises.find((exercise) => exercise.id === sourceId).relatedExercises, [{ exerciseId: targetId, relation: "harder" }]);
  assert.deepEqual(next.exercises.find((exercise) => exercise.id === targetId).relatedExercises, [{ exerciseId: sourceId, relation: "easier" }]);
  assert.equal(validateState(next), true);

  const changed = setRelatedExercisesInState(next, sourceId, [{ exerciseId: targetId, relation: "similar" }]);
  assert.deepEqual(changed.exercises.find((exercise) => exercise.id === sourceId).relatedExercises, [{ exerciseId: targetId, relation: "similar" }]);
  assert.deepEqual(changed.exercises.find((exercise) => exercise.id === targetId).relatedExercises, [{ exerciseId: sourceId, relation: "similar" }]);
  const removed = setRelatedExercisesInState(changed, sourceId, []);
  assert.deepEqual(removed.exercises.find((exercise) => exercise.id === sourceId).relatedExercises, []);
  assert.deepEqual(removed.exercises.find((exercise) => exercise.id === targetId).relatedExercises, []);
  assert.equal(validateState(removed), true);

  assert.deepEqual(setRelatedExercisesInState(state, sourceId, [{ exerciseId: sourceId, relation: "similar" }]), state);
  assert.deepEqual(setRelatedExercisesInState(state, sourceId, [{ exerciseId: "missing", relation: "similar" }]), state);
  assert.deepEqual(setRelatedExercisesInState(state, sourceId, [{ exerciseId: targetId, relation: "sidegrade" }]), state);
});

test("routine blocks are ordered, editable, and removable only while empty", () => {
  const state = createDefaultState();
  state.routines[0].blocks[0].entryIds = state.routines[0].entries.map((entry) => entry.id).reverse();
  assert.equal(validateState(state), false);
  delete state.routines[0].blocks[0].entryIds;

  const routine = state.routines[0];
  const added = addRoutineBlockInState(state, routine.id, "Accessories");
  const newBlock = added.routines[0].blocks.at(-1);
  assert.equal(newBlock.name, "Accessories");

  const renamed = updateRoutineBlockInState(added, routine.id, newBlock.id, "Optional coverage");
  assert.equal(renamed.routines[0].blocks.at(-1).name, "Optional coverage");
  const reordered = reorderRoutineBlockInState(renamed, routine.id, newBlock.id, 0);
  assert.equal(reordered.routines[0].blocks[0].id, newBlock.id);

  const populated = updateRoutineEntryInState(reordered, routine.id, routine.entries[0].id, { blockId: newBlock.id });
  assert.deepEqual(removeRoutineBlockInState(populated, routine.id, newBlock.id), populated);
  const emptied = updateRoutineEntryInState(populated, routine.id, routine.entries[0].id, { blockId: routine.blocks[0].id });
  const removed = removeRoutineBlockInState(emptied, routine.id, newBlock.id);
  assert.equal(removed.routines[0].blocks.some((block) => block.id === newBlock.id), false);
  assert.deepEqual(removeRoutineBlockInState(removed, routine.id, routine.blocks[0].id), removed);
  assert.equal(validateState(removed), true);
});

test("moveItem reorders within bounds and ignores invalid moves", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 0, -1), ["a", "b", "c"]);
});

test("moving a routine entry saves its scoped fields and position together within its block", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const state = store.getState();
  const routine = state.routines[0];
  const entry = routine.entries[1];
  const previousEntryId = routine.entries[0].id;
  const master = state.exercises.find((exercise) => exercise.id === entry.choices[0].exerciseId);
  const masterPrescription = master.defaultPrescription;
  const addedChoice = routine.entries[2].choices[0];
  const choices = [
    { ...addedChoice, prescription: "2 × 12-15" },
    { ...entry.choices[0], prescription: "4 × 6-8" },
  ];

  const next = moveRoutineEntry(state, routine.id, entry.id, -1, {
    choices,
    role: "optional",
    note: "Local setup.",
    blockId: routine.blocks[0].id,
  });
  assert.equal(next.routines[0].entries[0].id, entry.id);
  assert.deepEqual(next.routines[0].entries[0].choices, choices);
  assert.equal(next.routines[0].entries[1].id, previousEntryId);
  assert.equal(next.routines[0].entries[0].role, "optional");
  assert.equal(next.routines[0].entries[0].note, "Local setup.");
  assert.equal(next.exercises.find((exercise) => exercise.id === entry.choices[0].exerciseId).defaultPrescription, masterPrescription);
  assert.notDeepEqual(next, state);
  assert.equal(validateState(next), true);

  assert.equal(store.replace(next).ok, true);
  const reloaded = createStore(storage).getState();
  assert.equal(reloaded.routines[0].entries[0].id, entry.id);
  assert.deepEqual(reloaded.routines[0].entries[0].choices, choices);
  assert.equal(reloaded.exercises.find((exercise) => exercise.id === entry.choices[0].exerciseId).defaultPrescription, masterPrescription);

  const duplicateChoice = { ...choices[0], prescription: "Different duplicate" };
  assert.deepEqual(moveRoutineEntry(state, routine.id, entry.id, -1, {
    choices: [choices[0], duplicateChoice],
    role: "optional",
  }), state);
  assert.deepEqual(moveRoutineEntry(state, routine.id, entry.id, -1, {
    choices: [{ ...choices[0], prescription: "" }],
    role: "optional",
  }), state);
});

test("adding a routine entry permits duplicate exercises with fresh entry IDs", () => {
  const state = createDefaultState();
  const routine = state.routines[0];
  const exercise = structuredClone(state.exercises.find((item) => item.id === "low-incline-dumbbell-press"));
  const first = {
    id: "runtime-entry-a",
    choices: [{ exerciseId: exercise.id, prescription: exercise.defaultPrescription }],
    blockId: routine.blocks[0].id,
    note: "",
    role: "main",
  };
  const second = { ...first, id: "runtime-entry-b" };
  const withFirst = addRoutineEntryInState(state, routine.id, first);
  const withSecond = addRoutineEntryInState(withFirst, routine.id, second);
  const added = withSecond.routines[0].entries.filter((entry) => [first.id, second.id].includes(entry.id));

  assert.deepEqual(added.map((entry) => entry.id), ["runtime-entry-a", "runtime-entry-b"]);
  assert.deepEqual(added.map((entry) => entry.choices[0].exerciseId), [exercise.id, exercise.id]);
  assert.deepEqual(added.map((entry) => entry.role), ["main", "main"]);
  assert.deepEqual(withSecond.exercises.find((item) => item.id === exercise.id), exercise);
  assert.deepEqual(addRoutineEntryInState(withSecond, routine.id, second), withSecond);
  assert.equal(validateState(withSecond), true);
});

test("a failed atomic entry move leaves stored state unchanged", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const before = store.getState();
  const routine = before.routines[0];
  const entry = routine.entries[1];
  const moved = moveRoutineEntry(before, routine.id, entry.id, -1, { prescription: "5 × 5" });

  storage.failWrites = true;
  const result = store.replace(moved);
  assert.equal(result.ok, false);
  assert.deepEqual(store.getState(), before);
});

test("a routine entry can move directly across roles within its block", () => {
  const state = createDefaultState();
  const routine = state.routines[0];
  const entry = routine.entries[0];
  routine.entries[1].role = "optional";
  const blockIds = routine.entries.filter((item) => item.blockId === entry.blockId).map((item) => item.id);
  const next = reorderRoutineEntryWithinBlock(state, routine.id, entry.id, blockIds.length - 1);
  const reorderedRoutine = next.routines[0];

  assert.deepEqual(
    reorderedRoutine.entries.filter((item) => item.blockId === entry.blockId).map((item) => item.id),
    [...blockIds.slice(1), entry.id],
  );
  assert.equal(reorderedRoutine.entries.find((item) => item.id === routine.entries[1].id).role, "optional");
  assert.notDeepEqual(next, state);
  assert.equal(validateState(next), true);

  assert.deepEqual(reorderRoutineEntryWithinBlock(state, routine.id, entry.id, -1), state);
  assert.deepEqual(reorderRoutineEntryWithinBlock(state, routine.id, entry.id, blockIds.length), state);
});

test("a failed direct reorder leaves the stored routine unchanged", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const before = store.getState();
  const routine = before.routines[0];
  const moved = reorderRoutineEntryWithinBlock(before, routine.id, routine.entries[0].id, routine.entries.length - 1);

  storage.failWrites = true;
  assert.equal(store.replace(moved).ok, false);
  assert.deepEqual(store.getState(), before);
});

test("block-scoped moves preserve other blocks and master data", () => {
  const state = createDefaultState();
  const routine = state.routines[0];
  routine.entries[1].role = "optional";
  routine.entries[3].role = "optional";
  routine.blocks.push({ id: "second-block", name: "Second" });
  routine.entries.at(-1).blockId = "second-block";
  const entry = routine.entries[7];
  const currentBlockBefore = routine.entries.filter((item) => item.blockId === entry.blockId).map((item) => item.id);
  const otherBlockBefore = routine.entries.filter((item) => item.blockId !== entry.blockId).map((item) => item.id);
  const mastersBefore = structuredClone(state.exercises);
  const next = moveRoutineEntry(state, routine.id, entry.id, 1, {
    prescription: "Runtime prescription",
    role: "main",
  });
  const nextRoutine = next.routines[0];

  assert.deepEqual(
    nextRoutine.entries.filter((item) => item.blockId === entry.blockId).map((item) => item.id),
    [currentBlockBefore[0], currentBlockBefore[2], currentBlockBefore[1], ...currentBlockBefore.slice(3)],
  );
  assert.deepEqual(
    nextRoutine.entries.filter((item) => item.blockId !== entry.blockId).map((item) => item.id),
    otherBlockBefore,
  );
  assert.equal(nextRoutine.entries.find((item) => item.id === entry.id).choices[0].prescription, "Runtime prescription");
  assert.deepEqual(next.exercises, mastersBefore);
  assert.equal(validateState(next), true);
});

test("changing entry role preserves source order, history, and master data", () => {
  const state = createDefaultState();
  const routine = state.routines[0];
  routine.entries[1].role = "optional";
  routine.entries[3].role = "optional";
  state.sessions["2026-07-17"] = {
    routineIds: [routine.id],
    checkedEntryIdsByRoutine: { [routine.id]: [routine.entries[0].id] },
    note: "Keep history",
  };
  const changed = routine.entries[0];
  const remainingMainIds = routine.entries.filter((item) => item.role === "main" && item.id !== changed.id).map((item) => item.id);
  const optionalIds = routine.entries.filter((item) => item.role === "optional").map((item) => item.id);
  const historyBefore = structuredClone(state.sessions);
  const mastersBefore = structuredClone(state.exercises);
  const next = updateRoutineEntryInState(state, routine.id, changed.id, { prescription: "4 × 6", role: "optional" });
  const nextRoutine = next.routines[0];

  assert.deepEqual(nextRoutine.entries.filter((item) => item.role === "main").map((item) => item.id), remainingMainIds);
  assert.deepEqual(nextRoutine.entries.filter((item) => item.role === "optional").map((item) => item.id), [changed.id, ...optionalIds]);
  assert.equal(nextRoutine.entries.find((item) => item.id === changed.id).choices[0].prescription, "4 × 6");
  assert.deepEqual(next.sessions, historyBefore);
  assert.deepEqual(next.exercises, mastersBefore);
  assert.equal(validateState(next), true);
});

test("all-Optional and one-item blocks use the same bounded reorder rules", () => {
  const state = createDefaultState();
  const routine = state.routines[0];
  routine.entries = routine.entries.slice(0, 3).map((entry) => ({ ...entry, role: "optional" }));
  const ids = routine.entries.map((entry) => entry.id);
  const moved = reorderRoutineEntryWithinBlock(state, routine.id, ids[1], 0);

  assert.deepEqual(moved.routines[0].entries.map((entry) => entry.id), [ids[1], ids[0], ids[2]]);
  const one = structuredClone(state);
  one.routines[0].entries = [one.routines[0].entries[0]];
  assert.deepEqual(reorderRoutineEntryWithinBlock(one, one.routines[0].id, one.routines[0].entries[0].id, 1), one);
  assert.equal(validateState(moved), true);
  assert.equal(validateState(one), true);
});

test("entry checks derive completion from Main entries while Optional checks stay independent", () => {
  const state = createDefaultState();
  const dateKey = localDateKey(new Date(2026, 6, 17));
  const routine = state.routines.find((item) => item.id === "push-a-glutes");
  const optionalEntry = routine.entries.at(-1);
  let next = updateRoutineEntryInState(state, routine.id, optionalEntry.id, { role: "optional" });
  next = toggleEntryCheckForDate(next, routine.id, optionalEntry.id, dateKey);
  assert.deepEqual(next.sessions[dateKey].routineIds, []);
  assert.deepEqual(next.sessions[dateKey].checkedEntryIdsByRoutine[routine.id], [optionalEntry.id]);

  const mainEntries = routine.entries.slice(0, -1);
  for (const entry of mainEntries) next = toggleEntryCheckForDate(next, routine.id, entry.id, dateKey);
  assert.deepEqual(next.sessions[dateKey].routineIds, [routine.id]);

  next = toggleEntryCheckForDate(next, routine.id, optionalEntry.id, dateKey);
  assert.deepEqual(next.sessions[dateKey].routineIds, [routine.id]);
  next = toggleEntryCheckForDate(next, routine.id, mainEntries[0].id, dateKey);
  assert.deepEqual(next.sessions[dateKey].routineIds, []);
  assert.equal(validateState(next), true);
});

test("Home Base and empty routines never auto-complete but Log may complete them deliberately", () => {
  const dateKey = "2026-07-17";
  let state = createDefaultState();
  const routine = state.routines.find((item) => item.id === "home-base");
  state = toggleEntryCheckForDate(state, routine.id, routine.entries[0].id, dateKey);
  assert.deepEqual(state.sessions[dateKey].routineIds, []);

  const logged = setDayInState(state, dateKey, [routine.id], "");
  assert.deepEqual(logged.sessions[dateKey].routineIds, [routine.id]);
  const removed = setDayInState(logged, dateKey, [], "");
  assert.equal(removed.sessions[dateKey], undefined);

  const empty = structuredClone(state);
  empty.routines.find((item) => item.id === routine.id).entries = [];
  empty.sessions = {};
  assert.deepEqual(toggleEntryCheckForDate(empty, routine.id, "missing", dateKey), empty);
  const completedEmpty = setDayInState(empty, dateKey, [routine.id], "");
  assert.deepEqual(completedEmpty.sessions[dateKey].routineIds, [routine.id]);
});

test("Log completion checks current Main entries without inventing checks for existing history", () => {
  const dateKey = "2026-07-17";
  const state = createDefaultState();
  const routine = state.routines.find((item) => item.id === "push-a-glutes");
  state.sessions[dateKey] = { routineIds: [], checkedEntryIdsByRoutine: { [routine.id]: [routine.entries.at(-1).id] }, note: "" };
  state.routines.find((item) => item.id === routine.id).entries.at(-1).role = "optional";

  const completed = setDayInState(state, dateKey, [routine.id], "");
  assert.deepEqual(
    new Set(completed.sessions[dateKey].checkedEntryIdsByRoutine[routine.id]),
    new Set([
      ...routine.entries.filter((entry) => entry.role === "main").map((entry) => entry.id),
      routine.entries.at(-1).id,
    ]),
  );
  const unchanged = setDayInState({
    ...completed,
    sessions: { [dateKey]: { routineIds: [routine.id], checkedEntryIdsByRoutine: {}, note: "Existing" } },
  }, dateKey, [routine.id], "Existing");
  assert.deepEqual(unchanged.sessions[dateKey].checkedEntryIdsByRoutine, {});

  const unmarked = setDayInState(completed, dateKey, [], "Keep note");
  assert.deepEqual(unmarked.sessions[dateKey], { routineIds: [], checkedEntryIdsByRoutine: {}, note: "Keep note" });
});

test("entry role edits preserve historical completion and checks", () => {
  const state = toggleRoutineForDate(createDefaultState(), "push-a-glutes", "2026-07-17");
  const routine = state.routines.find((item) => item.id === "push-a-glutes");
  const history = structuredClone(state.sessions);
  const next = updateRoutineEntryInState(state, routine.id, routine.entries[0].id, { prescription: "4 × 6", role: "optional" });
  const changed = next.routines.find((item) => item.id === routine.id).entries.find((entry) => entry.id === routine.entries[0].id);
  assert.equal(changed.id, routine.entries[0].id);
  assert.equal(changed.role, "optional");
  assert.deepEqual(next.sessions, history);
  assert.equal(validateState(next), true);
});

test("entry choices, block assignment, and multiline notes update atomically", () => {
  const state = createDefaultState();
  const routine = state.routines[0];
  const withBlock = addRoutineBlockInState(state, routine.id, "Alternatives");
  const blockId = withBlock.routines[0].blocks.at(-1).id;
  const originalEntry = withBlock.routines[0].entries[0];
  const alternateId = withBlock.routines[0].entries[1].choices[0].exerciseId;
  const choices = [
    { ...originalEntry.choices[0], prescription: "3 × 6–8" },
    { exerciseId: alternateId, prescription: "2 × 10–12" },
  ];
  const next = updateRoutineEntryInState(withBlock, routine.id, originalEntry.id, {
    choices,
    blockId,
    note: "Use the first option normally.\nChoose the second when needed.",
  });
  const changed = next.routines[0].entries[0];
  assert.deepEqual(changed.choices, choices);
  assert.equal(changed.blockId, blockId);
  assert.match(changed.note, /\n/);
  assert.equal(validateState(next), true);

  assert.deepEqual(updateRoutineEntryInState(next, routine.id, originalEntry.id, {
    choices: [choices[0], choices[0]],
  }), next);
  assert.deepEqual(updateRoutineEntryInState(next, routine.id, originalEntry.id, {
    blockId: "missing",
  }), next);
});

test("routine completion helper remains reversible and synchronizes Main checks", () => {
  const state = createDefaultState();
  const dateKey = "2026-07-17";
  const routine = state.routines.find((item) => item.id === "push-a-glutes");
  const completed = toggleRoutineForDate(state, routine.id, dateKey);
  assert.deepEqual(completed.sessions[dateKey].routineIds, [routine.id]);
  assert.deepEqual(
    completed.sessions[dateKey].checkedEntryIdsByRoutine[routine.id],
    routine.entries.filter((entry) => entry.role === "main").map((entry) => entry.id),
  );
  const removed = toggleRoutineForDate(completed, routine.id, dateKey);
  assert.equal(removed.sessions[dateKey], undefined);
});

test("deleting a routine cleans history and selects a valid fallback", () => {
  const state = toggleRoutineForDate(createDefaultState(), "push-a-glutes", "2026-07-17");
  const next = removeRoutineFromState(state, "push-a-glutes");
  assert.equal(next.sessions["2026-07-17"], undefined);
  assert.notEqual(next.settings.activeRoutineId, "push-a-glutes");
  assert.equal(next.programs[0].routineIds.includes("push-a-glutes"), false);
  assert.equal(next.routines.some((routine) => routine.id === next.settings.activeRoutineId), true);
  assert.equal(validateState(next), true);
});

test("deleting a routine entry removes only its checks and preserves recorded completion", () => {
  const state = toggleRoutineForDate(createDefaultState(), "push-a-glutes", "2026-07-17");
  const routine = state.routines.find((item) => item.id === "push-a-glutes");
  const [removed, kept] = routine.entries;
  const next = removeRoutineEntryFromState(state, routine.id, removed.id);

  assert.equal(next.routines.find((item) => item.id === routine.id).entries.some((entry) => entry.id === removed.id), false);
  assert.equal(next.sessions["2026-07-17"].routineIds.includes(routine.id), true);
  assert.equal(next.sessions["2026-07-17"].checkedEntryIdsByRoutine[routine.id].includes(removed.id), false);
  assert.equal(next.sessions["2026-07-17"].checkedEntryIdsByRoutine[routine.id].includes(kept.id), true);
  assert.equal(validateState(next), true);
});

test("Program CRUD keeps stable membership and active selection", () => {
  const original = createDefaultState();
  const created = createProgramInState(original, "Travel");
  const travel = created.programs.at(-1);
  assert.equal(travel.name, "Travel");
  assert.equal(travel.note, "");
  assert.deepEqual(travel.routineIds, []);
  assert.equal(created.settings.activeProgramId, travel.id);
  assert.equal(created.settings.activeRoutineId, "");

  const renamed = renameProgramInState(created, travel.id, "Travel / Home");
  assert.equal(renamed.programs.at(-1).name, "Travel / Home");
  const noted = updateProgramInState(renamed, travel.id, { note: "Travel rules\nSecond line." });
  assert.equal(noted.programs.at(-1).note, "Travel rules\nSecond line.");
  assert.equal(original.programs.length, 1);

  const removed = removeProgramFromState(noted, travel.id);
  assert.equal(removed.programs.length, 1);
  assert.equal(removed.settings.activeProgramId, original.programs[0].id);
  assert.equal(removed.settings.activeRoutineId, original.programs[0].routineIds[0]);
  assert.equal(validateState(removed), true);
});

test("adding and ordering a routine updates only its owning program", () => {
  const state = createProgramInState(createDefaultState(), "Travel");
  const travel = state.programs.at(-1);
  const first = emptyRoutine("hotel-a", "Hotel A");
  const second = emptyRoutine("hotel-b", "Hotel B", "home", "optional");
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

test("routine selection and field updates stay inside storage helpers", () => {
  const initial = createDefaultState();
  const selected = setActiveRoutineInState(initial, "home-base");
  assert.equal(selected.settings.activeProgramId, initial.settings.activeProgramId);
  assert.equal(selected.settings.activeRoutineId, "home-base");
  assert.equal(initial.settings.activeRoutineId, "push-a-glutes");

  const updated = updateRoutineInState(selected, "home-base", {
    name: "Daily home",
    group: "gym",
    status: "optional",
    note: "Morning instructions\nSecond line.",
  });
  const routine = updated.routines.find((item) => item.id === "home-base");
  assert.equal(routine.name, "Daily home");
  assert.equal(routine.group, "gym");
  assert.equal(routine.status, "optional");
  assert.equal(routine.note, "Morning instructions\nSecond line.");
  assert.equal(validateState(updated), true);
});

test("switching programs repairs routine selection without changing history", () => {
  const completed = toggleRoutineForDate(createDefaultState(), "push-a-glutes", "2026-07-17");
  const withTravel = createProgramInState(completed, "Travel");
  const travel = withTravel.programs.at(-1);
  const withRoutine = addRoutineToProgram(withTravel, travel.id, emptyRoutine("hotel", "Hotel"));
  const history = structuredClone(withRoutine.sessions);
  const switchedHome = setActiveProgramInState(withRoutine, withRoutine.programs[0].id);
  assert.equal(switchedHome.settings.activeRoutineId, "push-a-glutes");
  assert.deepEqual(switchedHome.sessions, history);
  const switchedTravel = setActiveProgramInState(switchedHome, travel.id);
  assert.equal(switchedTravel.settings.activeRoutineId, "hotel");
  assert.deepEqual(switchedTravel.sessions, history);
});

test("duplicating a program creates new owned IDs, reuses exercises, and copies no history", () => {
  let completed = toggleRoutineForDate(createDefaultState(), "push-a-glutes", "2026-07-17");
  completed.programs[0].note = "Weekly rules";
  completed.routines[0].note = "Routine note";
  completed.routines[0].entries[0].note = "Entry note";
  completed = addRoutineBlockInState(completed, completed.routines[0].id, "Second block");
  completed = updateRoutineEntryInState(completed, completed.routines[0].id, completed.routines[0].entries[0].id, {
    blockId: completed.routines[0].blocks.at(-1).id,
    choices: [
      completed.routines[0].entries[0].choices[0],
      {
        exerciseId: completed.routines[0].entries[1].choices[0].exerciseId,
        prescription: "2 × 10",
      },
    ],
  });
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
  assert.equal(copiedProgram.note, source.note);
  assert.equal(copiedRoutines[0].note, originalRoutines[0].note);
  assert.equal(copiedRoutines[0].entries[0].note, originalRoutines[0].entries[0].note);
  assert.deepEqual(
    copiedRoutines.map((routine) => routine.entries.map((entry) => entry.choices)),
    originalRoutines.map((routine) => routine.entries.map((entry) => entry.choices)),
  );
  const originalBlockIds = new Set(originalRoutines.flatMap((routine) => routine.blocks.map((block) => block.id)));
  const copiedBlockIds = copiedRoutines.flatMap((routine) => routine.blocks.map((block) => block.id));
  assert.equal(copiedBlockIds.every((id) => !originalBlockIds.has(id)), true);
  assert.equal(
    copiedRoutines.every((routine) => routine.entries.every((entry) => routine.blocks.some((block) => block.id === entry.blockId))),
    true,
  );
  assert.deepEqual(
    copiedRoutines.map((routine) => routine.entries.map((entry) => entry.choices[0].exerciseId)),
    originalRoutines.map((routine) => routine.entries.map((entry) => entry.choices[0].exerciseId)),
  );
  assert.deepEqual(
    copiedRoutines.map((routine) => ({
      name: routine.name,
      group: routine.group,
      status: routine.status,
      prescriptions: routine.entries.map((entry) => entry.choices[0].prescription),
    })),
    originalRoutines.map((routine) => ({
      name: routine.name,
      group: routine.group,
      status: routine.status,
      prescriptions: routine.entries.map((entry) => entry.choices[0].prescription),
    })),
  );
  assert.deepEqual(duplicate.sessions, completed.sessions);
  assert.equal(duplicate.settings.activeProgramId, copiedProgram.id);
  assert.equal(validateState(duplicate), true);
});

test("deleting a program removes only its routines and their history", () => {
  let state = createProgramInState(createDefaultState(), "Travel");
  const travel = state.programs.at(-1);
  state = addRoutineToProgram(state, travel.id, emptyRoutine("hotel", "Hotel"));
  const pushEntryId = state.routines.find((routine) => routine.id === "push-a-glutes").entries[0].id;
  state.sessions["2026-07-15"] = {
    routineIds: ["push-a-glutes", "hotel"],
    checkedEntryIdsByRoutine: { "push-a-glutes": [pushEntryId] },
    note: "Mixed",
  };
  state.sessions["2026-07-16"] = { routineIds: ["hotel"], checkedEntryIdsByRoutine: {}, note: "" };

  const next = removeProgramFromState(state, travel.id);
  assert.equal(next.routines.some((routine) => routine.id === "hotel"), false);
  assert.deepEqual(next.sessions["2026-07-15"], {
    routineIds: ["push-a-glutes"],
    checkedEntryIdsByRoutine: { "push-a-glutes": [pushEntryId] },
    note: "Mixed",
  });
  assert.equal(next.sessions["2026-07-16"], undefined);
  assert.equal(next.exercises.length, state.exercises.length);
  assert.equal(validateState(next), true);
});

test("deleting the last program leaves a valid empty app and preserves standalone notes", () => {
  const state = createDefaultState();
  state.sessions["2026-07-15"] = {
    routineIds: ["push-a-glutes"],
    checkedEntryIdsByRoutine: { "push-a-glutes": [state.routines[0].entries[0].id] },
    note: "Keep this note",
  };
  const next = removeProgramFromState(state, state.programs[0].id);
  assert.deepEqual(next.programs, []);
  assert.deepEqual(next.routines, []);
  assert.equal(next.settings.activeProgramId, "");
  assert.equal(next.settings.activeRoutineId, "");
  assert.deepEqual(next.sessions["2026-07-15"], {
    routineIds: [],
    checkedEntryIdsByRoutine: {},
    note: "Keep this note",
  });
  assert.equal(next.exercises.length, state.exercises.length);
  assert.equal(validateState(next), true);
});

test("deleting the active routine in an otherwise empty program does not select another program", () => {
  let state = createProgramInState(createDefaultState(), "Travel");
  const travel = state.programs.at(-1);
  state = addRoutineToProgram(state, travel.id, emptyRoutine("hotel", "Hotel"));
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

test("failed entry-check writes leave stored and in-memory state unchanged", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const before = store.getState();
  const next = toggleEntryCheckForDate(before, "push-a-glutes", before.routines[0].entries[0].id, "2026-07-17");
  storage.failWrites = true;
  assert.equal(store.replace(next).ok, false);
  assert.deepEqual(store.getState(), before);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), before);
});

test("imports are validated completely before replacement", () => {
  const state = createDefaultState();
  const imported = parseImportedState(JSON.stringify(createBackup(state)));
  assert.deepEqual(imported, state);

  const oldEnvelope = createBackup(state);
  oldEnvelope.schemaVersion -= 1;
  assert.throws(() => parseImportedState(JSON.stringify(oldEnvelope)), /not compatible/i);

  state.exercises[0].primaryTargets = [null];
  assert.throws(
    () => parseImportedState(JSON.stringify(createBackup(state))),
    /not compatible/i,
  );
});

test("the complete current shape survives save, reload, backup import, and reset", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  let state = store.getState();
  state.exercises[0].aliases = ["Incline DB press"];
  state.programs[0].note = "Weekly rules\nSecond line.";
  state.routines[0].note = "Routine note\nSecond line.";
  state = addRoutineBlockInState(state, state.routines[0].id, "Optional coverage");
  const routine = state.routines[0];
  state = updateRoutineEntryInState(state, routine.id, routine.entries[0].id, {
    blockId: routine.blocks.at(-1).id,
    note: "Scoped note\nSecond line.",
    choices: [
      routine.entries[0].choices[0],
      {
        exerciseId: routine.entries[1].choices[0].exerciseId,
        prescription: "2 × 10–12",
      },
    ],
  });

  assert.equal(store.replace(state).ok, true);
  const reloaded = createStore(storage).getState();
  assert.deepEqual(reloaded, state);
  assert.deepEqual(parseImportedState(JSON.stringify(createBackup(reloaded))), state);
  assert.equal(store.reset().ok, true);
  assert.deepEqual(store.getState(), createDefaultState());
});

test("Restore starting data is atomic when its device write fails", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const edited = store.getState();
  edited.programs[0].name = "Keep this edited program";
  edited.sessions["2026-07-17"] = {
    routineIds: [],
    checkedEntryIdsByRoutine: {},
    note: "Keep this history",
  };
  assert.equal(store.replace(edited).ok, true);
  const storedBefore = storage.getItem(STORAGE_KEY);

  storage.failWrites = true;
  const failed = store.reset();
  assert.equal(failed.ok, false);
  assert.deepEqual(store.getState(), edited);
  assert.equal(storage.getItem(STORAGE_KEY), storedBefore);

  storage.failWrites = false;
  assert.equal(store.reset().ok, true);
  assert.deepEqual(store.getState(), createDefaultState());
});

test("a failed write rolls back blocks, choices, aliases, and scoped notes together", () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  const before = store.getState();
  let next = addRoutineBlockInState(before, before.routines[0].id, "Second block");
  next.exercises[0].aliases = ["Incline DB press"];
  next.programs[0].note = "Program note";
  next.routines[0].note = "Routine note";
  next = updateRoutineEntryInState(next, next.routines[0].id, next.routines[0].entries[0].id, {
    blockId: next.routines[0].blocks.at(-1).id,
    note: "Entry note",
    choices: [
      next.routines[0].entries[0].choices[0],
      {
        exerciseId: next.routines[0].entries[1].choices[0].exerciseId,
        prescription: "2 × 10",
      },
    ],
  });
  storage.failWrites = true;
  assert.equal(store.replace(next).ok, false);
  assert.deepEqual(store.getState(), before);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), before);
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

test("master exercise upserts atomically preserve identity, routine references, and reciprocal relationships", () => {
  const state = createDefaultState();
  const source = state.exercises.find((exercise) => exercise.id === "low-incline-dumbbell-press");
  const related = state.exercises.find((exercise) => exercise.id === "scaption-raise");
  const routinesBefore = structuredClone(state.routines);
  const sessionsBefore = structuredClone(state.sessions);
  const edited = {
    ...source,
    name: "Low incline dumbbell press",
    aliases: ["Owner incline press"],
    primaryTargets: ["chest", "front-delts"],
    secondaryTargets: ["triceps"],
    movementPattern: "horizontal-press",
    equipment: ["dumbbells", "bench"],
    purpose: "strength",
    style: "compound",
    laterality: "bilateral",
    support: "supported",
    emphases: ["upper-chest"],
    typicalChallenge: "lengthened-bottom",
    defaultPrescription: "3 × 8–10",
    videoId: "abcdefghijk",
    instructions: "Keep the shoulder blades set.",
  };
  const next = upsertExerciseInState(state, edited, [{ exerciseId: related.id, relation: "harder" }]);
  assert.notStrictEqual(next, state);
  assert.equal(validateState(next), true);
  assert.deepEqual(next.exercises.find((exercise) => exercise.id === source.id), {
    ...edited,
    relatedExercises: [{ exerciseId: related.id, relation: "harder" }],
  });
  assert.ok(next.exercises.find((exercise) => exercise.id === related.id).relatedExercises
    .some((item) => item.exerciseId === source.id && item.relation === "easier"));
  assert.deepEqual(next.routines, routinesBefore);
  assert.deepEqual(next.sessions, sessionsBefore);

  const duplicate = {
    ...edited,
    id: "exercise-copy",
    name: "Low incline dumbbell press copy",
    aliases: [],
    relatedExercises: [],
  };
  const duplicated = upsertExerciseInState(next, duplicate, [{ exerciseId: related.id, relation: "similar" }]);
  assert.equal(validateState(duplicated), true);
  assert.ok(duplicated.exercises.some((exercise) => exercise.id === duplicate.id));
  assert.equal(duplicated.routines.flatMap((routine) => routine.entries)
    .some((entry) => entry.choices.some((choice) => choice.exerciseId === duplicate.id)), false);
  assert.deepEqual(duplicated.routines, routinesBefore);

  const storage = new MemoryStorage();
  const store = createStore(storage);
  assert.equal(store.replace(duplicated).ok, true);
  const reloaded = createStore(storage).getState();
  assert.deepEqual(reloaded, duplicated);
  assert.deepEqual(parseImportedState(JSON.stringify(createBackup(reloaded))), duplicated);

  assert.strictEqual(upsertExerciseInState(state, { ...edited, primaryTargets: [] }), state);
  assert.strictEqual(upsertExerciseInState(state, { ...edited, aliases: [related.name] }), state);
  assert.strictEqual(upsertExerciseInState(state, edited, [{ exerciseId: source.id, relation: "similar" }]), state);
});

test("programs survive save, reload, export, and import", () => {
  let state = createProgramInState(createDefaultState(), "Travel");
  const travel = state.programs.at(-1);
  state = addRoutineToProgram(state, travel.id, emptyRoutine("hotel", "Hotel"));
  state = setActiveProgramInState(state, travel.id);
  const pushEntryId = state.routines.find((routine) => routine.id === "push-a-glutes").entries[0].id;
  state.sessions["2026-07-17"] = {
    routineIds: ["push-a-glutes"],
    checkedEntryIdsByRoutine: { "push-a-glutes": [pushEntryId] },
    note: "Old program",
  };

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
  const malformedCurrent = createDefaultState();
  malformedCurrent.exercises[0].aliases = [malformedCurrent.exercises[1].name];
  assert.throws(() => parseImportedState(JSON.stringify(malformedCurrent)), /not compatible/i);
});
