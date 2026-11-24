// Progress: how sets are compared, an exercise's sessions and bests, and the Log's
// overview. All on the sample program with a few made-up weeks of history added here.

import test from "node:test";
import assert from "node:assert/strict";
import { bestSet, compareSets, exerciseMode, exerciseProgress, isNewBest, overview, repsToAddWeight, setScore, targetHint, workingSets, workoutComparison } from "../js/progress.js";
import { sampleState } from "./sample.mjs";

const TODAY = "2026-11-19"; // a Thursday; its week starts Monday 16 November

const set = (kg, reps, extra = {}) => ({ kg, reps, drops: [], ...extra });

// Adds a log to a day; `finished` also files the routine as a finished workout.
function log(state, dateKey, slotId, routineId, exerciseId, sets, { unit = "reps", note, finished = true } = {}) {
  const session = state.sessions[dateKey] ||= { routineIds: [], checkedEntryIdsByRoutine: {}, note: "", logs: {}, extras: {}, workouts: {} };
  session.logs[slotId] = { routineId, exerciseId, exerciseName: exerciseId, unit, sets, ...(note ? { note } : {}) };
  if (finished && !session.routineIds.includes(routineId)) {
    session.routineIds.push(routineId);
    session.workouts[routineId] = { name: routineId === "day-a" ? "Day A" : "Day B", program: "Sample program", minutes: null };
  }
}

// Bench press climbs, squat stands still, pull-ups go from assisted to bodyweight,
// planks are timed. The sample's own day (2 November: bench 60 × 10) stays.
function history() {
  const state = sampleState();
  log(state, "2026-10-12", "a2", "day-a", "bench-press", [set(40, 10, { warmup: true }), set(55, 10), set(55, 9)]);
  log(state, "2026-10-26", "a2", "day-a", "bench-press", [set(57.5, 10), set(57.5, 8)], { note: "Shoulder fine." });
  log(state, "2026-11-09", "a2", "day-a", "bench-press", [set(60, 9), set(60, 8)]);
  log(state, "2026-11-16", "a2", "day-a", "bench-press", [set(62.5, 10), set(62.5, 9, { drops: [{ kg: 50, reps: 8 }] })]);
  for (const day of ["2026-10-14", "2026-10-21", "2026-10-28", "2026-11-04", "2026-11-11"]) {
    log(state, day, "b1", "day-b", "squat", [set(80, 5), set(80, 5), set(80, 5)]);
  }
  log(state, "2026-10-14", "b2", "day-b", "pull-up", [set(-20, 6)]);
  log(state, "2026-10-21", "b2", "day-b", "pull-up", [set(-10, 5)]);
  log(state, "2026-11-11", "b2", "day-b", "pull-up", [set(null, 4)]);
  log(state, "2026-11-17", "a1", "day-a", "plank", [set(null, 40), set(null, 35)], { unit: "sec" });
  return state;
}

test("Sets are compared by estimated 1-rep max with weight, and by load then reps without", () => {
  const sets = [set(100, 5, { warmup: true }), set(60, 10), set(62.5, 8), set(70, 1, { drops: [{ kg: 200, reps: 20 }] })];
  assert.equal(workingSets(sets).length, 3);
  assert.equal(setScore(set(60, 10), "weight"), 80);
  assert.equal(setScore(set(null, 12), "weight"), 0);
  assert.equal(bestSet(sets, "weight"), sets[1], "warm-ups and drops never count");
  assert.equal(bestSet([set(50, 5, { warmup: true })], "weight"), null);

  const assisted = [set(-20, 12), set(-10, 3), set(-10, 5)];
  assert.equal(bestSet(assisted, "reps"), assisted[2], "less assistance wins before reps");
  assert.ok(setScore(set(null, 1), "reps") > setScore(set(-5, 30), "reps"));
  assert.ok(setScore(set(5, 1), "reps") > setScore(set(null, 30), "reps"));

  assert.equal(exerciseMode([{ unit: "reps", sets: [set(null, 10), set(20, 5, { warmup: true })] }]), "reps");
  assert.equal(exerciseMode([{ unit: "reps", sets: [set(null, 10)] }, { unit: "reps", sets: [set(5, 8)] }]), "weight");
  assert.equal(exerciseMode([{ unit: "sec", sets: [set(10, 30)] }]), "reps", "timed work has no 1-rep max");
});

test("Two sessions compare as up, down or same, in kg, reps or seconds", () => {
  assert.deepEqual(compareSets([set(62.5, 8)], [set(60, 8)], "weight", "reps"), { kind: "up", text: "▲ 2.5 kg" });
  assert.deepEqual(compareSets([set(60, 7)], [set(60, 8)], "weight", "reps"), { kind: "down", text: "▼ 1 rep" });
  assert.deepEqual(compareSets([set(60, 12)], [set(62.5, 8)], "weight", "reps"), { kind: "up", text: "▲ 4 reps" }, "lighter but stronger");
  assert.deepEqual(compareSets([set(60, 8), set(50, 8)], [set(20, 5, { warmup: true }), set(60, 8)], "weight", "reps"), { kind: "same", text: "Same" });
  assert.deepEqual(compareSets([set(-10, 5)], [set(-20, 6)], "reps", "reps"), { kind: "up", text: "▲ 10 kg" });
  assert.deepEqual(compareSets([set(null, 45)], [set(null, 40)], "reps", "sec"), { kind: "up", text: "▲ 5 sec" });
});

test("An exercise's progress: sessions oldest first, new bests, volume and bests", () => {
  const progress = exerciseProgress(history(), "bench-press");
  assert.equal(progress.mode, "weight");
  assert.equal(progress.unit, "reps");
  assert.deepEqual(progress.sessions.map((item) => item.dateKey), ["2026-10-12", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"]);
  assert.deepEqual(progress.sessions.map((item) => item.isBest), [false, true, true, false, true], "the first session is never a best");
  assert.deepEqual(progress.sessions.map((item) => item.best.kg), [55, 57.5, 60, 60, 62.5]);
  assert.equal(progress.sessions[0].volume, 55 * 19, "warm-ups add no volume");
  assert.equal(progress.sessions[4].volume, 62.5 * 19 + 50 * 8, "drops do");
  assert.equal(progress.sessions[1].note, "Shoulder fine.");
  assert.equal(progress.sessions[2].routineName, "Day A");
  assert.deepEqual(progress.bests.top, { set: set(62.5, 10), dateKey: "2026-11-16" });
  assert.deepEqual(progress.bests.repsAtWeight, [
    { kg: 62.5, reps: 10, dateKey: "2026-11-16" },
    { kg: 60, reps: 10, dateKey: "2026-11-02" },
    { kg: 57.5, reps: 10, dateKey: "2026-10-26" },
    { kg: 55, reps: 10, dateKey: "2026-10-12" },
  ]);

  const pullUps = exerciseProgress(history(), "pull-up");
  assert.equal(pullUps.mode, "reps");
  assert.deepEqual(pullUps.sessions.map((item) => item.isBest), [false, true, true]);
  assert.equal(pullUps.sessions[0].volume, 0);
  assert.deepEqual(pullUps.bests.repsAtWeight, []);

  assert.equal(exerciseProgress(history(), "plank").unit, "sec");
  assert.deepEqual(exerciseProgress(history(), "cable-fly"), { mode: "reps", unit: "reps", sessions: [], bests: { top: null, repsAtWeight: [] } });
});

test("The hint says what beats last time", () => {
  assert.equal(targetHint([], "3 × 6–10", "weight", "reps"), "");
  assert.equal(targetHint([set(40, 10, { warmup: true })], "3 × 6–10", "weight", "reps"), "");
  assert.equal(targetHint([set(40, 5, { warmup: true }), set(60, 10), set(60, 10)], "3 × 6–10", "weight", "reps"), "All sets hit 10. Add weight.");
  assert.equal(targetHint([set(60, 10), set(60, 9)], "3 × 6–10", "weight", "reps"), "To beat it: one more rep on any set.");
  assert.equal(targetHint([set(80, 5)], "As heavy as feels right", "weight", "reps"), "To beat it: one more rep on any set.");
  assert.equal(targetHint([set(null, 15)], "2 × 15", "reps", "reps"), "To beat it: one more rep on any set.");
  assert.equal(targetHint([set(null, 30)], "2 × 30 sec", "reps", "sec"), "To beat it: a few more seconds on any set.");
});

test("Add weight once every working set reached the top of the rep range, with weight", () => {
  assert.equal(repsToAddWeight([set(60, 12), set(60, 12), set(40, 5, { warmup: true })], "3 × 8–12", "weight", "reps"), 12);
  assert.equal(repsToAddWeight([set(60, 12), set(60, 11)], "3 × 8–12", "weight", "reps"), 0);
  assert.equal(repsToAddWeight([set(null, 15)], "2 × 15", "reps", "reps"), 0);
  assert.equal(repsToAddWeight([set(10, 45)], "2 × 30–45 sec", "weight", "sec"), 0);
  assert.equal(repsToAddWeight([set(60, 12)], "", "weight", "reps"), 0);
});

test("A workout's result: each exercise against its own session before, its best with the one it beat", () => {
  const state = history();
  log(state, "2026-11-16", "a4", "day-a", "push-up", [set(null, 15)]);
  log(state, "2026-11-16", "x9", "day-a", "ab-wheel", [set(null, 10)]);
  const items = workoutComparison(state, "day-a", "2026-11-16");
  const pick = ({ slotId, kind, text, previous, best }) => ({ slotId, kind, text, previous, best });
  assert.deepEqual(items.map(pick), [
    { slotId: "a2", kind: "up", text: "▲ 2.5 kg", previous: "2026-11-09", best: { set: set(62.5, 10), before: set(60, 10) } },
    { slotId: "a4", kind: "same", text: "Same", previous: "2026-11-02", best: null },
    { slotId: "x9", kind: "first", text: "First time", previous: "", best: null },
  ]);
  assert.deepEqual(workoutComparison(state, "day-b", "2026-11-16"), [], "nothing logged in it that day");
});

test("A set is a new best only when it beats every earlier session", () => {
  const state = history();
  assert.equal(isNewBest(state, "bench-press", set(62.5, 11), TODAY), true);
  assert.equal(isNewBest(state, "bench-press", set(62.5, 10), TODAY), false, "equalling the best isn't beating it");
  assert.equal(isNewBest(state, "bench-press", set(100, 10, { warmup: true }), TODAY), false);
  assert.equal(isNewBest(state, "bench-press", set(60, 10), "2026-11-02"), true, "only days before the given one count");
  assert.equal(isNewBest(state, "bench-press", set(60, 10), "2026-10-12"), false, "nothing earlier to beat");
  assert.equal(isNewBest(state, "pull-up", set(null, 5), TODAY), true);
  assert.equal(isNewBest(state, "pull-up", set(-5, 12), TODAY), false);
});

test("The overview counts the week, the month's bests, who is improving or stalled, and sets per muscle", () => {
  const state = history();
  const result = overview(state, TODAY);
  // This week: Day A on Monday 16th and Tuesday 17th. The four weeks before: 19 Oct – 15 Nov.
  assert.equal(result.thisWeek, 2);
  assert.equal(result.perWeek, 1.8, "seven workouts over four weeks");
  assert.equal(result.bestsThisMonth, 3, "bench press on the 2nd and 16th, pull-up on the 11th");
  assert.deepEqual(result.improving.map((item) => [item.exercise.id, item.percent]), [["bench-press", 14]]);
  assert.deepEqual(result.stalled.map((item) => [item.exercise.id, item.since]), [["squat", "2026-10-14"]]);
  // Bench press: 2 working sets for chest, half each for triceps. Plank: 2 for abs.
  assert.deepEqual(result.muscles, [{ target: "chest", sets: 2 }, { target: "abs", sets: 2 }, { target: "triceps", sets: 1 }]);

  // An exercise that has left the Library, or the active program, isn't reported.
  state.exercises = state.exercises.filter((exercise) => exercise.id !== "bench-press");
  state.routines.find((routine) => routine.id === "day-b").entries = [];
  const later = overview(state, TODAY);
  assert.deepEqual(later.improving, []);
  assert.deepEqual(later.stalled, []);
  assert.equal(later.bestsThisMonth, 1);

  assert.deepEqual(overview({ ...sampleState(), sessions: {} }, TODAY), { thisWeek: 0, perWeek: 0, bestsThisMonth: 0, improving: [], stalled: [], muscles: [] });
});
