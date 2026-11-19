// The rules that decide what ends up in the owner's history: completion, set
// logging, and what deleting things keeps. Every change runs through a real store
// (fake storage) on the sample program, so each test also proves the result saves.

import test from "node:test";
import assert from "node:assert/strict";
import {
  activeWorkout,
  addExtra,
  duplicateProgram,
  entryLog,
  exerciseById,
  exerciseDeletionImpact,
  exerciseHistory,
  finishStaleWorkout,
  finishWorkout,
  isEntryChecked,
  isTimedPrescription,
  moveEntryInBlock,
  orderedEntries,
  plannedSetCount,
  removeEntry,
  removeExercise,
  removeExtra,
  removeProgram,
  removeRoutine,
  routineById,
  saveEntrySets,
  saveExercise,
  setActiveProgram,
  setDay,
  setEntryChecked,
  startWorkout,
  updateEntry,
  usualExtras,
} from "../js/model.js";
import { PAST_DAY } from "./sample.mjs";
import { freshStore, refuse, save } from "./support.mjs";

const DAY = "2026-11-04";
const day = (state, dateKey = DAY) => state.sessions[dateKey];
const done = (store, routineId, entryId, value = true) => save(store, (draft) => setEntryChecked(draft, routineId, entryId, value, DAY));
const logSets = (store, entryId, exerciseId, sets, routineId = "day-a") => save(store, (draft) => saveEntrySets(draft, { routineId, entryId, exerciseId, sets, dateKey: DAY }));

test("a workout runs from Start to Finish; finishing files the routine in that day's Log with whatever was done", () => {
  const stored = freshStore();
  const { store } = stored;
  save(store, (draft) => startWorkout(draft, "day-a", DAY, 1000));
  assert.deepEqual(activeWorkout(store.getState()), { routineId: "day-a", dateKey: DAY, startedAt: 1000 });
  refuse(stored, (draft) => startWorkout(draft, "day-b", DAY), "Finish the workout in progress first.");
  done(store, "day-a", "a2");
  done(store, "day-a", "a3");
  done(store, "day-a", "a3", false);
  assert.deepEqual(day(store.getState()), { routineIds: [], checkedEntryIdsByRoutine: { "day-a": ["a2"] }, note: "", logs: {}, extras: {} }, "doing slots doesn't complete anything");
  save(store, finishWorkout);
  assert.deepEqual([day(store.getState()).routineIds, activeWorkout(store.getState())], [["day-a"], null]);
  // Starting it again the same day reopens it.
  save(store, (draft) => startWorkout(draft, "day-a", DAY));
  assert.deepEqual([day(store.getState()).routineIds, isEntryChecked(store.getState(), DAY, "day-a", "a2")], [[], true]);
});

test("a workout left open is filed the next day, but not while it's still running past midnight", () => {
  const { store } = freshStore();
  const hour = 60 * 60 * 1000;
  save(store, (draft) => startWorkout(draft, "day-b", DAY, 0));
  save(store, (draft) => assert.equal(finishStaleWorkout(draft, DAY, 20 * hour), "", "same day"));
  save(store, (draft) => assert.equal(finishStaleWorkout(draft, "2026-11-05", 2 * hour), "", "an hour past midnight"));
  save(store, (draft) => assert.equal(finishStaleWorkout(draft, "2026-11-05", 13 * hour), "Day B"));
  assert.deepEqual([day(store.getState()).routineIds, activeWorkout(store.getState())], [["day-b"], null]);
});

test("an exercise added for today is logged like a slot, stays out of the program, and is offered again next time", () => {
  const stored = freshStore();
  const { store } = stored;
  assert.deepEqual(usualExtras(store.getState(), "day-a", DAY).map((item) => [item.exercise.name, item.count]), [["Ab-wheel rollout", 1]]);
  refuse(stored, (draft) => addExtra(draft, "squat"), "Start the workout first.");
  save(store, (draft) => startWorkout(draft, "day-a", DAY));
  const id = save(store, (draft) => addExtra(draft, "ab-wheel"));
  refuse(stored, (draft) => addExtra(draft, "ab-wheel"), "That exercise is already added today.");
  logSets(store, id, "ab-wheel", [{ kg: "", reps: "10" }]);
  done(store, "day-a", id);
  const state = store.getState();
  assert.equal(entryLog(state, DAY, id).exerciseName, "Ab-wheel rollout");
  assert.deepEqual(usualExtras(state, "day-a", DAY), [], "already added today");
  assert.deepEqual(usualExtras(state, "day-a", "2026-11-06").map((item) => item.count), [2]);
  assert.deepEqual(usualExtras(state, "day-a", "2026-12-20"), [], "more than four weeks ago");
  assert.equal(routineById(state, "day-a").entries.length, 4);
  assert.deepEqual(exerciseHistory(state, "ab-wheel").map((item) => item.dateKey), [DAY]);

  save(store, (draft) => removeExtra(draft, "day-a", id, DAY));
  assert.equal(day(store.getState()), undefined);
});

test("Log: marking a routine ticks its Main slots, unmarking clears them, and an emptied day is removed", () => {
  const { store } = freshStore();
  save(store, (draft) => setDay(draft, DAY, ["day-b"], "Legs felt heavy"));
  assert.deepEqual(day(store.getState()), { routineIds: ["day-b"], checkedEntryIdsByRoutine: { "day-b": ["b1", "b2"] }, note: "Legs felt heavy", logs: {}, extras: {} });
  save(store, (draft) => setDay(draft, DAY, [], ""));
  assert.equal(day(store.getState()), undefined);
  // A day with logged sets stays even with no routine and no note.
  save(store, (draft) => setDay(draft, PAST_DAY, [], ""));
  assert.deepEqual(Object.keys(day(store.getState(), PAST_DAY).logs), ["a2", "a4"]);
});

test("ticked sets are saved with weight, reps and drops; an empty list removes the log", () => {
  const { store } = freshStore();
  logSets(store, "a2", "bench-press", [{ kg: "62,5", reps: "8", drops: [{ kg: "50", reps: "6" }] }, { kg: "", reps: "12" }]);
  assert.deepEqual(entryLog(store.getState(), DAY, "a2"), {
    routineId: "day-a",
    exerciseId: "bench-press",
    exerciseName: "Bench press",
    unit: "reps",
    sets: [{ kg: 62.5, reps: 8, drops: [{ kg: 50, reps: 6 }] }, { kg: null, reps: 12, drops: [] }],
  });
  assert.equal(isEntryChecked(store.getState(), DAY, "day-a", "a2"), false, "logging sets doesn't mark the slot done");
  logSets(store, "a2", "bench-press", []);
  assert.equal(day(store.getState()), undefined);
});

test("bad set values are refused and nothing is saved", () => {
  const stored = freshStore();
  const attempt = (sets) => (draft) => saveEntrySets(draft, { routineId: "day-a", entryId: "a2", exerciseId: "bench-press", sets, dateKey: DAY });
  refuse(stored, attempt([{ kg: "heavy", reps: "8" }]), "Enter a weight between 0 and 1000 kg.");
  refuse(stored, attempt([{ kg: "60", reps: "" }]), "Enter whole reps for each set.");
  refuse(stored, attempt([{ kg: "60", reps: "7.5" }]), "Enter whole reps for each set.");
  refuse(stored, (draft) => saveEntrySets(draft, { routineId: "day-a", entryId: "a2", exerciseId: "squat", sets: [], dateKey: DAY }), "That exercise isn't a choice in this slot any more.");
});

test("a timed prescription is logged in seconds, fixed when saved", () => {
  const { store } = freshStore();
  logSets(store, "a1", "plank", [{ kg: "", reps: "45" }]);
  save(store, (draft) => updateEntry(draft, "day-a", "a1", { choices: [{ exerciseId: "plank", prescription: "2 × 10" }] }));
  assert.equal(entryLog(store.getState(), DAY, "a1").unit, "sec");

  assert.deepEqual(["3 × 8–12", "1–2 × 15–25/side", "2 sets of 10", "AMRAP"].map(plannedSetCount), [3, 2, 2, 1]);
  assert.deepEqual(["2 × 15–30 sec/side", "5 × 8–10-sec holds", "2 rounds · 30–60 sec", "2 × 8–12 with 3-sec holds", "3 × 8 (2s pause)", "3 × 8"].map(isTimedPrescription), [true, true, true, false, false, false]);
});

test("exercise history comes from any routine, newest first, and can leave out today", () => {
  const { store } = freshStore();
  save(store, (draft) => updateEntry(draft, "day-b", "b2", { choices: [{ exerciseId: "pull-up", prescription: "3 × 6–10" }, { exerciseId: "bench-press", prescription: "3 × 8" }] }));
  logSets(store, "b2", "bench-press", [{ kg: "65", reps: "5" }], "day-b");
  const history = exerciseHistory(store.getState(), "bench-press");
  assert.deepEqual(history.map((item) => [item.dateKey, item.routineId, item.sets.length]), [[DAY, "day-b", 1], [PAST_DAY, "day-a", 3]]);
  assert.deepEqual(exerciseHistory(store.getState(), "bench-press", { beforeDateKey: DAY, limit: 3 }).map((item) => item.dateKey), [PAST_DAY]);
});

test("swapping a slot's exercise keeps the sets already logged today in the old exercise's history", () => {
  const { store } = freshStore();
  logSets(store, "a2", "bench-press", [{ kg: "60", reps: "10" }]);
  save(store, (draft) => updateEntry(draft, "day-a", "a2", { choices: [{ exerciseId: "squat", prescription: "3 × 5" }] }));
  assert.equal(entryLog(store.getState(), DAY, "a2"), null, "the slot starts empty");
  logSets(store, "a2", "squat", [{ kg: "100", reps: "5" }]);
  const state = store.getState();
  assert.equal(entryLog(state, DAY, "a2").exerciseId, "squat");
  assert.deepEqual(exerciseHistory(state, "bench-press").map((item) => item.dateKey), [DAY, PAST_DAY]);
});

test("deleting a slot, routine, program or exercise keeps past completions and logged sets, and drops only done marks", () => {
  const { store } = freshStore();
  const past = () => day(store.getState(), PAST_DAY);

  save(store, (draft) => removeEntry(draft, "day-a", "a4"));
  assert.deepEqual(past().checkedEntryIdsByRoutine, { "day-a": ["a2", "a3"] });
  assert.deepEqual(Object.keys(past().logs), ["a2", "a4"]);

  save(store, (draft) => removeExercise(draft, "bench-press"));
  assert.equal(past().logs.a2.exerciseName, "Bench press", "its sets stay under the name it had");
  assert.deepEqual(exerciseById(store.getState(), "push-up").relatedExercises, [], "links to it go");
  assert.equal(routineById(store.getState(), "day-a").entries.some((entry) => entry.id === "a2"), false, "a slot with no choice left goes");

  save(store, (draft) => removeRoutine(draft, "day-a"));
  assert.deepEqual([past().routineIds, past().checkedEntryIdsByRoutine, Object.keys(past().logs)], [["day-a"], {}, ["a2", "a4"]]);
  assert.equal(store.getState().settings.activeRoutineId, "day-b");

  save(store, (draft) => removeProgram(draft, "sample"));
  const state = store.getState();
  assert.deepEqual([state.programs, state.routines, state.settings.activeProgramId, state.settings.activeRoutineId], [[], [], "", ""]);
  assert.deepEqual([past().routineIds, past().note], [["day-a"], "Good session."]);
});

test("deleting an exercise removes it from choices, promotes the next choice, and the summary says so first", () => {
  const { store } = freshStore();
  assert.deepEqual(exerciseDeletionImpact(store.getState(), "incline-press"), { programmedUses: 1, alternativeChoicesRemoved: 0, preferredChoicesPromoted: 1, slotsDeleted: 0, relatedLinksRemoved: 0 });
  assert.deepEqual(exerciseDeletionImpact(store.getState(), "bench-press"), { programmedUses: 1, alternativeChoicesRemoved: 0, preferredChoicesPromoted: 0, slotsDeleted: 1, relatedLinksRemoved: 1 });
  save(store, (draft) => removeExercise(draft, "incline-press"));
  assert.deepEqual(routineById(store.getState(), "day-a").entries.find((entry) => entry.id === "a3").choices, [{ exerciseId: "cable-fly", prescription: "2 × 12–15" }]);
});

test("saving an exercise keeps related links in step on both sides and refuses a name that's taken", () => {
  const stored = freshStore();
  const { store } = stored;
  const cableFly = structuredClone(exerciseById(store.getState(), "cable-fly"));
  save(store, (draft) => saveExercise(draft, cableFly, [{ exerciseId: "bench-press", relation: "easier" }]));
  assert.deepEqual(exerciseById(store.getState(), "bench-press").relatedExercises, [{ exerciseId: "push-up", relation: "easier" }, { exerciseId: "cable-fly", relation: "harder" }]);
  save(store, (draft) => saveExercise(draft, cableFly, []));
  assert.deepEqual(exerciseById(store.getState(), "bench-press").relatedExercises, [{ exerciseId: "push-up", relation: "easier" }]);
  refuse(stored, (draft) => saveExercise(draft, { ...cableFly, name: "flat-bench" }, []), "An exercise with this name already exists.");
  refuse(stored, (draft) => saveExercise(draft, { ...cableFly, aliases: ["Push up"] }, []), "An alias is already used by another exercise.");
});

test("duplicating a program copies its routines under new IDs and leaves the original and the history alone", () => {
  const { store } = freshStore();
  const before = structuredClone(store.getState());
  const id = save(store, (draft) => duplicateProgram(draft, "sample", { name: "Copy", note: "" }));
  const state = store.getState();
  const copy = state.programs.find((program) => program.id === id);
  const copies = copy.routineIds.map((routineId) => routineById(state, routineId));
  assert.deepEqual(copies.map((routine) => [routine.name, routine.entries.length]), [["Day A", 4], ["Day B", 2]]);
  const originalIds = new Set(before.routines.flatMap((routine) => [routine.id, ...routine.blocks.map((block) => block.id), ...routine.entries.map((entry) => entry.id)]));
  assert.ok(copies.flatMap((routine) => [routine.id, ...routine.blocks.map((block) => block.id), ...routine.entries.map((entry) => entry.id)]).every((newId) => !originalIds.has(newId)));
  assert.deepEqual(state.routines.slice(0, 2), before.routines);
  assert.deepEqual(state.sessions, before.sessions);
  assert.deepEqual([state.settings.activeProgramId, state.settings.activeRoutineId], [id, copy.routineIds[0]]);
  save(store, (draft) => setActiveProgram(draft, "sample"));
  assert.equal(store.getState().settings.activeRoutineId, "day-a");
});

test("slots reorder inside their block, and changing block moves a slot to the end of the new one", () => {
  const { store } = freshStore();
  const order = () => orderedEntries(routineById(store.getState(), "day-a")).map((entry) => entry.id);
  save(store, (draft) => moveEntryInBlock(draft, "day-a", "a4", 0));
  assert.deepEqual(order(), ["a1", "a4", "a2", "a3"]);
  save(store, (draft) => updateEntry(draft, "day-a", "a4", { blockId: "a-warm", role: "optional" }));
  assert.deepEqual(order(), ["a1", "a4", "a2", "a3"]);
  save(store, (draft) => updateEntry(draft, "day-a", "a2", { blockId: "a-warm" }));
  assert.deepEqual(order(), ["a1", "a4", "a2", "a3"]);
  save(store, (draft) => moveEntryInBlock(draft, "day-a", "a2", 0));
  assert.deepEqual(order(), ["a2", "a1", "a4", "a3"]);
});
