// Every change runs through a real store (fake storage), so each test also
// proves the result passes validation and is saved.

import test from "node:test";
import assert from "node:assert/strict";
import {
  addEntry,
  createProgram,
  duplicateProgram,
  entryNumber,
  exerciseById,
  entryLog,
  exerciseDeletionImpact,
  exerciseHistory,
  isEntryChecked,
  isTimedPrescription,
  moveEntryInBlock,
  moveRoutine,
  orderedEntries,
  plannedSetCount,
  programRoutines,
  removeEntry,
  removeExercise,
  removeProgram,
  removeRoutine,
  routineById,
  saveExercise,
  setActiveProgram,
  setActiveRoutine,
  saveEntrySets,
  setDay,
  setEntryChecked,
  updateEntry,
  updateRoutine,
} from "../js/model.js";
import { freshStore, refuse, save, withStore } from "./support.mjs";

const DAY = "2026-10-05";
const PROGRAM = "pplppl7-glute-specialization";
const PUSH = "push-a-glutes";

const day = (state, dateKey = DAY) => state.sessions[dateKey];
const checks = (state, routineId, dateKey = DAY) => day(state, dateKey)?.checkedEntryIdsByRoutine[routineId] || [];
const mainIds = (routine) => routine.entries.filter((entry) => entry.role === "main").map((entry) => entry.id);
const entryIds = (routine) => orderedEntries(routine).map((entry) => entry.id.replace(`${routine.id}-entry-`, ""));
const active = (state) => [state.settings.activeProgramId, state.settings.activeRoutineId];
const linksOf = (state, id) => exerciseById(state, id).relatedExercises;

const NEW_ID = "test-band-row";
const newExercise = (overrides = {}) => ({
  id: NEW_ID,
  name: "Test band row",
  aliases: [],
  primaryTargets: ["upper-mid-back"],
  secondaryTargets: [],
  movementPattern: "horizontal-pull",
  equipment: ["band"],
  purpose: "strength",
  style: "",
  laterality: "",
  support: "",
  emphases: [],
  typicalChallenge: "",
  defaultPrescription: "",
  instructions: "",
  videoId: "",
  relatedExercises: [],
  ...overrides,
});

test("a routine completes when every Main entry is checked, and Optional entries never block it", () => {
  const { store } = freshStore();
  const pull = routineById(store.getState(), "pull-a");
  const toggle = (entryId) => {
    const done = !isEntryChecked(store.getState(), DAY, "pull-a", entryId);
    save(store, (s) => setEntryChecked(s, "pull-a", entryId, done, DAY));
    return done;
  };

  // Entry 001 offers two exercises but is one slot, so one check.
  assert.equal(pull.entries[0].choices.length, 2);
  assert.equal(toggle("pull-a-entry-001"), true);
  assert.deepEqual(checks(store.getState(), "pull-a"), ["pull-a-entry-001"]);

  mainIds(pull).slice(1).forEach(toggle);
  assert.deepEqual(day(store.getState()).routineIds, ["pull-a"]);

  toggle("pull-a-entry-009");
  toggle("pull-a-entry-009");
  assert.deepEqual(day(store.getState()).routineIds, ["pull-a"], "Optional checks don't affect completion");

  assert.equal(toggle("pull-a-entry-003"), false);
  assert.deepEqual(day(store.getState()).routineIds, []);
  assert.equal(isEntryChecked(store.getState(), DAY, "pull-a", "pull-a-entry-003"), false);
});

test("a routine with only Optional entries never completes from checks, but stays complete once marked in the Log", () => {
  const { store } = freshStore();
  save(store, (s) => {
    for (const entry of routineById(s, "home-base").entries) setEntryChecked(s, "home-base", entry.id, true, DAY);
  });
  assert.equal(checks(store.getState(), "home-base").length, routineById(store.getState(), "home-base").entries.length);
  assert.deepEqual(day(store.getState()).routineIds, []);

  save(store, (s) => setDay(s, DAY, ["home-base"], ""));
  save(store, (s) => setEntryChecked(s, "home-base", "home-base-entry-001", false, DAY));
  assert.deepEqual(day(store.getState()).routineIds, ["home-base"]);
});

test("setDay checks Main entries of newly marked routines, clears checks of unmarked ones, and deletes an empty day", () => {
  const { store } = freshStore();
  const push = routineById(store.getState(), PUSH);
  save(store, (s) => setEntryChecked(s, PUSH, "push-a-glutes-entry-011", true, DAY));

  save(store, (s) => setDay(s, DAY, [PUSH, "home-base"], "Good day"));
  assert.deepEqual(day(store.getState()), {
    routineIds: [PUSH, "home-base"],
    checkedEntryIdsByRoutine: { [PUSH]: ["push-a-glutes-entry-011", ...mainIds(push)] },
    note: "Good day",
    logs: {},
  });

  save(store, (s) => setDay(s, DAY, ["home-base"], "Good day"));
  assert.deepEqual(day(store.getState()), { routineIds: ["home-base"], checkedEntryIdsByRoutine: {}, note: "Good day", logs: {} });

  save(store, (s) => setDay(s, DAY, [], ""));
  assert.equal(day(store.getState()), undefined);
});

test("deleting a routine keeps it in past completions but drops its checks", () => {
  const { store } = freshStore();
  save(store, (s) => setDay(s, DAY, [PUSH, "pull-a"], "Both"));
  save(store, (s) => setEntryChecked(s, PUSH, "push-a-glutes-entry-001", true, "2026-10-06"));

  save(store, (s) => removeRoutine(s, PUSH));
  const state = store.getState();
  assert.deepEqual(day(state).routineIds, [PUSH, "pull-a"]);
  assert.deepEqual(Object.keys(day(state).checkedEntryIdsByRoutine), ["pull-a"]);
  assert.equal(day(state, "2026-10-06"), undefined, "a day with only that routine's checks is gone");
  assert.deepEqual(active(state), [PROGRAM, "pull-a"]);
});

test("deleting a program keeps its routines in past completions but drops their checks and its routines", () => {
  const { store } = freshStore();
  const copyId = save(store, (s) => duplicateProgram(s, PROGRAM, { name: "Copy" }));
  const [first] = store.getState().programs.find((program) => program.id === copyId).routineIds;
  save(store, (s) => setDay(s, DAY, [first], ""));

  save(store, (s) => removeProgram(s, copyId));
  const state = store.getState();
  assert.deepEqual(day(state), { routineIds: [first], checkedEntryIdsByRoutine: {}, note: "", logs: {} });
  assert.equal(routineById(state, first), null);
  assert.deepEqual(active(state), [PROGRAM, PUSH]);
});

test("deleting the last program leaves a valid empty app with history kept", () => {
  const { state } = withStore((s) => {
    setDay(s, DAY, [PUSH], "Kept");
    removeProgram(s, PROGRAM);
  });
  assert.deepEqual([state.programs, state.routines, active(state)], [[], [], ["", ""]]);
  assert.deepEqual(day(state), { routineIds: [PUSH], checkedEntryIdsByRoutine: {}, note: "Kept", logs: {} });
});

test("removing an entry drops its checks and keeps the recorded completion", () => {
  const { state } = withStore((s) => {
    setDay(s, DAY, [PUSH], "");
    removeEntry(s, PUSH, "push-a-glutes-entry-001");
  });
  assert.equal(checks(state, PUSH).includes("push-a-glutes-entry-001"), false);
  assert.equal(checks(state, PUSH).length, 9);
  assert.deepEqual(day(state).routineIds, [PUSH]);
});

test("deleting an exercise promotes, removes or deletes its choices exactly as the impact summary says", () => {
  const { store } = freshStore();
  save(store, (s) => {
    const choices = (n) => routineById(s, PUSH).entries[n].choices;
    saveExercise(s, newExercise(), [{ exerciseId: "rope-pushdown", relation: "similar" }]);
    updateEntry(s, PUSH, "push-a-glutes-entry-001", { choices: [{ exerciseId: NEW_ID, prescription: "3 × 8" }, ...choices(0)] });
    updateEntry(s, PUSH, "push-a-glutes-entry-002", { choices: [...choices(1), { exerciseId: NEW_ID, prescription: "2 × 12" }] });
    updateEntry(s, PUSH, "push-a-glutes-entry-003", { choices: [{ exerciseId: NEW_ID, prescription: "1 × 20" }] });
    setDay(s, DAY, [PUSH], "Keep this note");
  });
  const before = store.getState();
  assert.deepEqual(exerciseDeletionImpact(before, NEW_ID), {
    programmedUses: 3,
    alternativeChoicesRemoved: 1,
    preferredChoicesPromoted: 1,
    slotsDeleted: 1,
    relatedLinksRemoved: 1,
  });

  save(store, (s) => removeExercise(s, NEW_ID));
  const after = store.getState();
  const [was, now] = [routineById(before, PUSH), routineById(after, PUSH)];
  assert.deepEqual(now.entries[0].choices, was.entries[0].choices.slice(1), "next choice promoted");
  assert.deepEqual(now.entries[1].choices, was.entries[1].choices.slice(0, -1), "alternative removed");
  assert.equal(now.entries.some((entry) => entry.id === "push-a-glutes-entry-003"), false, "single-choice slot deleted");
  assert.deepEqual(checks(after, PUSH), mainIds(was).filter((id) => id !== "push-a-glutes-entry-003"));
  assert.deepEqual(day(after).routineIds, [PUSH]);
  assert.equal(day(after).note, "Keep this note");
  assert.deepEqual(linksOf(after, "rope-pushdown"), []);
  assert.equal(exerciseById(after, NEW_ID), null);
});

test("saving an exercise keeps the reverse related links in sync", () => {
  const { store } = freshStore();
  save(store, (s) => saveExercise(s, newExercise(), [
    { exerciseId: "rope-pushdown", relation: "harder" },
    { exerciseId: "cable-crunch", relation: "similar" },
  ]));
  let state = store.getState();
  assert.deepEqual(linksOf(state, "rope-pushdown"), [{ exerciseId: NEW_ID, relation: "easier" }]);
  assert.deepEqual(linksOf(state, "cable-crunch"), [{ exerciseId: NEW_ID, relation: "similar" }]);

  save(store, (s) => saveExercise(s, newExercise({ name: "Renamed band row" }), [{ exerciseId: "rope-pushdown", relation: "easier" }]));
  state = store.getState();
  assert.deepEqual(linksOf(state, NEW_ID), [{ exerciseId: "rope-pushdown", relation: "easier" }]);
  assert.deepEqual(linksOf(state, "rope-pushdown"), [{ exerciseId: NEW_ID, relation: "harder" }]);
  assert.deepEqual(linksOf(state, "cable-crunch"), []);

  save(store, (s) => saveExercise(s, newExercise(), []));
  assert.deepEqual(linksOf(store.getState(), "rope-pushdown"), []);
});

test("saving an exercise rejects names and aliases that clash", () => {
  const { store } = freshStore();
  const attempt = (overrides) => (s) => saveExercise(s, newExercise(overrides), []);
  refuse(store, attempt({ name: "ab wheel rollout" }), "An exercise with this name already exists.");
  refuse(store, attempt({ aliases: ["wall angels"] }), "An alias is already used by another exercise.");
  refuse(store, attempt({ aliases: ["Test-band row"] }), "The name and aliases must each be unique.");
});

test("duplicating a program copies its routines with fresh ids and the same exercises", () => {
  const { store } = freshStore();
  const source = store.getState();
  const copyId = save(store, (s) => duplicateProgram(s, PROGRAM, { name: "  Travel copy " }));
  const state = store.getState();
  const copy = state.programs.find((program) => program.id === copyId);
  const [originals, copies] = [programRoutines(source, source.programs[0]), programRoutines(state, copy)];

  const ownIds = (routines) => routines.flatMap((routine) => [routine.id, ...routine.blocks.map((b) => b.id), ...routine.entries.map((e) => e.id)]);
  const originalIds = new Set(ownIds(originals));
  assert.equal(ownIds(copies).some((id) => originalIds.has(id)), false);

  const withoutIds = (routine) => ({
    ...routine,
    id: null,
    blocks: routine.blocks.map((block) => block.name),
    entries: routine.entries.map((entry) => ({ ...entry, id: null, blockId: routine.blocks.findIndex((block) => block.id === entry.blockId) })),
  });
  assert.deepEqual(copies.map(withoutIds), originals.map(withoutIds));
  assert.deepEqual([copy.name, copy.note], ["Travel copy", source.programs[0].note]);
  assert.deepEqual(active(state), [copyId, copies[0].id]);
  assert.deepEqual(state.exercises, source.exercises);
});

test("routine blocks can be renamed, reordered and deleted only when empty", () => {
  const { store } = freshStore();
  const [work, glute, accessories, rehab] = routineById(store.getState(), PUSH).blocks;
  save(store, (s) => updateRoutine(s, PUSH, { blocks: [{ ...rehab, name: "Rehab first" }, work, glute, accessories, { id: "spare", name: "Spare" }] }));
  const routine = routineById(store.getState(), PUSH);
  assert.deepEqual(routine.blocks.map((block) => block.name), ["Rehab first", work.name, glute.name, accessories.name, "Spare"]);
  assert.deepEqual(entryIds(routine).slice(0, 4), ["011", "012", "013", "001"]);

  save(store, (s) => updateRoutine(s, PUSH, { blocks: routine.blocks.slice(0, -1) }));
  assert.equal(routineById(store.getState(), PUSH).blocks.length, 4);
  refuse(store, (s) => updateRoutine(s, PUSH, { blocks: routine.blocks.slice(1, -1) }), "Move a block's exercises before deleting it.");
  refuse(store, (s) => updateRoutine(s, PUSH, { blocks: [] }), "A routine needs at least one block.");
});

test("moveRoutine reorders routines inside their program", () => {
  const { store } = freshStore();
  const before = store.getState().programs[0].routineIds;
  save(store, (s) => moveRoutine(s, "home-base", 0));
  assert.deepEqual(store.getState().programs[0].routineIds, ["home-base", ...before.filter((id) => id !== "home-base")]);
});

test("moveEntryInBlock reorders within the block only and ignores out-of-range moves", () => {
  const { store } = freshStore();
  save(store, (s) => moveEntryInBlock(s, PUSH, "push-a-glutes-entry-010", 0));
  const moved = ["001", "002", "003", "004", "005", "006", "010", "007", "008", "009", "011", "012", "013"];
  assert.deepEqual(entryIds(routineById(store.getState(), PUSH)), moved);
  save(store, (s) => moveEntryInBlock(s, PUSH, "push-a-glutes-entry-010", 4));
  assert.deepEqual(entryIds(routineById(store.getState(), PUSH)), moved);
});

test("updateEntry can move an entry to the end of another block and rejects bad changes", () => {
  const { store } = freshStore();
  save(store, (s) => updateEntry(s, PUSH, "push-a-glutes-entry-001", { blockId: "push-a-glute-block", role: "optional", note: "Moved\nhere" }));
  const routine = routineById(store.getState(), PUSH);
  const entry = routine.entries.find((item) => item.id === "push-a-glutes-entry-001");
  assert.deepEqual([entry.blockId, entry.role, entry.note], ["push-a-glute-block", "optional", "Moved\nhere"]);
  assert.equal(entryNumber(routine, entry.id), 6);

  refuse(store, (s) => updateEntry(s, PUSH, entry.id, { blockId: "nope" }), "That block no longer exists.");
  const twice = [...entry.choices, { ...entry.choices[0], prescription: "1 × 5" }];
  refuse(store, (s) => updateEntry(s, PUSH, entry.id, { choices: twice }), "Each exercise can be a choice only once.");
});

test("addEntry needs a prescription and adds a Main entry at the end of the block", () => {
  const { store } = freshStore();
  const fields = { exerciseId: "rope-pushdown", blockId: "push-a-glute-block" };
  refuse(store, (s) => addEntry(s, PUSH, { ...fields, prescription: "   " }), "Add a prescription to every exercise choice.");

  const id = save(store, (s) => addEntry(s, PUSH, { ...fields, prescription: " 3 × 10 " }));
  const routine = routineById(store.getState(), PUSH);
  assert.deepEqual(routine.entries.find((entry) => entry.id === id), {
    id,
    choices: [{ exerciseId: "rope-pushdown", prescription: "3 × 10" }],
    blockId: "push-a-glute-block",
    note: "",
    role: "main",
  });
  assert.equal(entryNumber(routine, id), 7);
});

test("switching programs keeps a valid active routine and repairs an invalid one", () => {
  const { store } = freshStore();
  const travel = save(store, (s) => createProgram(s, { name: "Travel" }));
  assert.deepEqual(active(store.getState()), [travel, ""]);

  save(store, (s) => setActiveProgram(s, PROGRAM));
  assert.deepEqual(active(store.getState()), [PROGRAM, PUSH]);
  save(store, (s) => setActiveRoutine(s, "legs-a"));
  save(store, (s) => setActiveProgram(s, PROGRAM));
  assert.deepEqual(active(store.getState()), [PROGRAM, "legs-a"]);
  save(store, (s) => setActiveProgram(s, travel));
  assert.deepEqual(active(store.getState()), [travel, ""]);
});

// ---------- set logging ----------

const CHEST = "push-a-glutes-entry-003";
const chestExercise = (state) => routineById(state, PUSH).entries.find((entry) => entry.id === CHEST).choices[0].exerciseId;
const logSets = (store, dateKey, sets, entryId = CHEST, routineId = PUSH) => save(store, (s) => {
  const exerciseId = routineById(s, routineId).entries.find((entry) => entry.id === entryId).choices[0].exerciseId;
  saveEntrySets(s, { routineId, entryId, exerciseId, sets, dateKey });
});

test("ticked sets are saved with weight, reps and drop chains, and cleaned up", () => {
  const { store } = freshStore();
  logSets(store, DAY, [
    { kg: "50", reps: "10" },
    { kg: "47,5", reps: 9, drops: [{ kg: 40, reps: "8" }, { kg: "32.5", reps: 7 }] },
    { kg: "", reps: "12" },
  ]);
  const log = entryLog(store.getState(), DAY, CHEST);
  assert.deepEqual(log, {
    routineId: PUSH,
    exerciseId: chestExercise(store.getState()),
    exerciseName: "Machine chest press",
    unit: "reps",
    sets: [
      { kg: 50, reps: 10, drops: [] },
      { kg: 47.5, reps: 9, drops: [{ kg: 40, reps: 8 }, { kg: 32.5, reps: 7 }] },
      { kg: null, reps: 12, drops: [] },
    ],
  });
  assert.equal(isEntryChecked(store.getState(), DAY, PUSH, CHEST), false, "logging doesn't mark the exercise done; Done does");

  logSets(store, DAY, []);
  assert.equal(day(store.getState()), undefined, "removing the only log removes the empty day");
});

test("bad set values are refused with a clear message", () => {
  const { store } = freshStore();
  const exerciseId = chestExercise(store.getState());
  const attempt = (sets) => (s) => saveEntrySets(s, { routineId: PUSH, entryId: CHEST, exerciseId, sets, dateKey: DAY });
  refuse(store, attempt([{ kg: "50", reps: "" }]), "Enter whole reps for each set.");
  refuse(store, attempt([{ kg: "50", reps: "8.5" }]), "Enter whole reps for each set.");
  refuse(store, attempt([{ kg: "heavy", reps: "8" }]), "Enter a weight between 0 and 1000 kg.");
  refuse(store, (s) => saveEntrySets(s, { routineId: PUSH, entryId: CHEST, exerciseId: "deadlift", sets: [{ kg: 1, reps: 1 }], dateKey: DAY }), "That exercise isn't a choice in this slot any more.");
});

test("Done marks the exercise done for the day and the logged sets stay", () => {
  const { store } = freshStore();
  logSets(store, DAY, [{ kg: 50, reps: 10 }]);
  save(store, (s) => setEntryChecked(s, PUSH, CHEST, true, DAY));
  assert.equal(isEntryChecked(store.getState(), DAY, PUSH, CHEST), true);
  save(store, (s) => setEntryChecked(s, PUSH, CHEST, false, DAY));
  assert.equal(isEntryChecked(store.getState(), DAY, PUSH, CHEST), false);
  assert.equal(entryLog(store.getState(), DAY, CHEST).sets.length, 1);
});

test("exercise history comes from any routine, newest first, and can leave out today", () => {
  const { store } = freshStore();
  const state = store.getState();
  const exerciseId = chestExercise(state);
  // The same master exercise in another routine.
  const other = state.routines.find((routine) => routine.id !== PUSH);
  const otherEntryId = save(store, (s) => addEntry(s, other.id, { exerciseId, blockId: other.blocks[0].id, prescription: "2 × 8–12" }));
  logSets(store, "2026-10-01", [{ kg: 45, reps: 10 }]);
  logSets(store, "2026-10-03", [{ kg: 47.5, reps: 10 }], otherEntryId, other.id);
  logSets(store, DAY, [{ kg: 50, reps: 9 }]);

  const all = exerciseHistory(store.getState(), exerciseId);
  assert.deepEqual(all.map((item) => [item.dateKey, item.routineId, item.sets[0].kg]), [
    [DAY, PUSH, 50],
    ["2026-10-03", other.id, 47.5],
    ["2026-10-01", PUSH, 45],
  ]);
  const before = exerciseHistory(store.getState(), exerciseId, { beforeDateKey: DAY, limit: 1 });
  assert.deepEqual(before.map((item) => item.dateKey), ["2026-10-03"]);
});

test("logged sets survive deleting their slot, routine or exercise", () => {
  const { store } = freshStore();
  const exerciseId = chestExercise(store.getState());
  logSets(store, DAY, [{ kg: 50, reps: 10 }]);
  save(store, (s) => removeEntry(s, PUSH, CHEST));
  assert.equal(exerciseHistory(store.getState(), exerciseId).length, 1, "removing the slot keeps the history");
  assert.equal(entryLog(store.getState(), DAY, CHEST), null, "but it's no longer today's log of a slot");
  save(store, (s) => removeRoutine(s, PUSH));
  assert.equal(exerciseHistory(store.getState(), exerciseId).length, 1, "deleting the routine keeps the history");
  save(store, (s) => removeExercise(s, exerciseId));
  const [kept] = Object.values(day(store.getState()).logs);
  assert.equal(kept.exerciseName, "Machine chest press", "deleting the exercise keeps its sets under its name");
});

test("sets logged for an exercise that left the slot stay in history when the slot logs its new choice", () => {
  const { store } = freshStore();
  const oldId = chestExercise(store.getState());
  logSets(store, DAY, [{ kg: 50, reps: 10 }]);
  const newId = store.getState().exercises.find((exercise) => exercise.id !== oldId).id;
  save(store, (s) => updateEntry(s, PUSH, CHEST, { choices: [{ exerciseId: newId, prescription: "3 × 10" }] }));
  assert.equal(entryLog(store.getState(), DAY, CHEST), null, "the old exercise's sets aren't shown as the new choice's");
  logSets(store, DAY, [{ kg: 20, reps: 12 }]);
  assert.equal(entryLog(store.getState(), DAY, CHEST).exerciseId, newId);
  assert.equal(exerciseHistory(store.getState(), oldId)[0].sets[0].kg, 50, "the earlier sets are still in the old exercise's history");
  assert.equal(Object.keys(day(store.getState()).logs).length, 2);

  // Swapping back and forth again keeps every earlier log.
  save(store, (s) => updateEntry(s, PUSH, CHEST, { choices: [{ exerciseId: oldId, prescription: "3 × 10" }] }));
  logSets(store, DAY, [{ kg: 55, reps: 8 }]);
  save(store, (s) => updateEntry(s, PUSH, CHEST, { choices: [{ exerciseId: newId, prescription: "3 × 10" }] }));
  logSets(store, DAY, [{ kg: 22.5, reps: 12 }]);
  assert.deepEqual(exerciseHistory(store.getState(), oldId).map((item) => item.sets[0].kg).sort(), [50, 55]);
});

test("the unit is saved with the sets: seconds for a timed prescription", () => {
  const { store } = freshStore();
  const state = store.getState();
  const routine = state.routines.find((item) => item.entries.some((entry) => isTimedPrescription(entry.choices[0].prescription)));
  const entry = routine.entries.find((item) => isTimedPrescription(item.choices[0].prescription));
  logSets(store, DAY, [{ kg: "", reps: 30 }], entry.id, routine.id);
  assert.equal(entryLog(store.getState(), DAY, entry.id).unit, "sec");
});

test("a prescription says how many set rows to show and whether it's timed", () => {
  assert.deepEqual(["3 × 8–12", "1–2 × 15–25/side", "2 × 15–30 sec/side", "AMRAP"].map(plannedSetCount), [3, 2, 2, 1]);
  assert.deepEqual(
    ["3 × 8–12", "2 × 15–30 sec/side", "3 × 45s", "5 × 8–10-sec holds", "3 × 8 (2s pause)", "3 x 10 @ 3s tempo",
      "2 × 8–12 with 3-sec holds", "2 rounds/side · 30–60 sec", "Max hold 30s"].map(isTimedPrescription),
    [false, true, true, true, false, false, false, true, true],
  );
});
