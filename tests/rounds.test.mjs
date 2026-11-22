// Rounds (one pass through the followed program, over however many days), blocks and
// calendar weeks. Run with `npm test`.

import test from "node:test";
import assert from "node:assert/strict";
import {
  addRoutine,
  allRounds,
  answerBreak,
  calendarWeek,
  cancelWorkout,
  createProgram,
  endRound,
  finishWorkout,
  followProgram,
  longBreak,
  openRound,
  roundRecord,
  roundSummary,
  setDay,
  setRoundNumber,
  startGuestWorkout,
  startNewBlock,
  startWorkout,
  updateProgram,
  updateRoutine,
} from "../js/model.js";
import { freshStore, save } from "./support.mjs";

// Does one whole workout of a routine on a day.
const train = (store, routineId, dateKey) => save(store, (draft) => {
  startWorkout(draft, routineId, dateKey, 0);
  finishWorkout(draft, { now: 30 * 60000 });
});
const names = (round) => round.workouts.map((item) => `${item.dateKey.slice(5)} ${item.name}${item.guest ? " (guest)" : ""}`);
const filed = (store, dateKey, routineId) => store.getState().sessions[dateKey].workouts[routineId];
const number = (store) => openRound(store.getState()).number;
// A second program with two routines; returns their ids.
const secondProgram = (store, name = "Full body") => save(store, (draft) => {
  const home = { ...draft.settings };
  const programId = createProgram(draft, { name });
  const ids = ["A", "B"].map((letter) => addRoutine(draft, programId, { name: `${name} ${letter}`, group: "gym", status: "required", note: "", blocks: [{ id: `${programId}-${letter}`, name: "" }] }));
  Object.assign(draft.settings, { activeProgramId: home.activeProgramId, activeRoutineId: home.activeRoutineId });
  return { programId, ids };
});

test("the calendar week is the ISO week with its own year, Monday first", () => {
  assert.deepEqual(calendarWeek("2026-11-21"), { year: 2026, week: 47 });
  assert.deepEqual(calendarWeek("2026-11-22"), { year: 2026, week: 47 }, "Sunday ends the week");
  assert.deepEqual(calendarWeek("2026-11-23"), { year: 2026, week: 48 }, "Monday starts the next");
  assert.deepEqual(calendarWeek("2025-12-29"), { year: 2026, week: 1 }, "late December can belong to next year's week 1");
  assert.deepEqual(calendarWeek("2026-12-31"), { year: 2026, week: 53 }, "2026 has 53 weeks");
  assert.deepEqual(calendarWeek("2027-01-03"), { year: 2026, week: 53 }, "early January can belong to last year's last week");
  assert.deepEqual(calendarWeek("2027-01-04"), { year: 2027, week: 1 });
});

test("a round takes every required workout once, in any order and over as many days as it takes", () => {
  const { store } = freshStore();
  assert.equal(roundSummary(store.getState()).counting, false, "nothing is counted until the owner starts");
  save(store, (draft) => setRoundNumber(draft, 6));

  train(store, "day-b", "2026-11-16"); // the last routine first
  let round = roundSummary(store.getState());
  assert.deepEqual([round.number, names(round), round.remaining.map((routine) => routine.id)], [6, ["11-16 Day B"], ["day-a"]]);
  assert.deepEqual(filed(store, "2026-11-16", "day-b"), { name: "Day B", program: "Sample program", minutes: 30, round: 6, block: 1 });

  train(store, "day-b", "2026-11-18"); // the same routine again counts once
  assert.deepEqual(roundSummary(store.getState()).remaining.map((routine) => routine.id), ["day-a"]);

  train(store, "day-a", "2026-11-25"); // nine days after it started: complete
  round = roundSummary(store.getState());
  assert.deepEqual([round.number, round.workouts.length, round.remaining.length], [7, 0, 2], "round 7 opens, empty");
  const closed = roundRecord(store.getState(), { number: 6, block: 1 });
  assert.deepEqual([closed.program, closed.ended, closed.done, closed.required, closed.from, closed.to, closed.minutes], ["Sample program", "complete", 2, 2, "2026-11-16", "2026-11-25", 90]);
  assert.deepEqual(allRounds(store.getState()).map((item) => [item.number, item.open]), [[7, true], [6, false]]);
});

test("a closed round keeps its program and its numbers when the program is renamed or edited later", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 1));
  train(store, "day-a", "2026-11-16");
  train(store, "day-b", "2026-11-17");
  save(store, (draft) => {
    updateProgram(draft, "sample", { name: "Renamed" });
    addRoutine(draft, "sample", { name: "Day C", group: "gym", status: "required", note: "", blocks: [{ id: "c-main", name: "" }] });
  });
  const closed = roundRecord(store.getState(), { number: 1, block: 1 });
  assert.deepEqual([closed.program, closed.done, closed.required], ["Sample program", 2, 2]);
  assert.equal(roundSummary(store.getState()).required.length, 3, "the open round follows the program as it is now");
});

test("reopening, cancelling and marking past days never open, close or renumber a round by mistake", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 3));
  train(store, "day-a", "2026-11-16");
  train(store, "day-b", "2026-11-17"); // round 3 complete; round 4 open
  train(store, "day-a", "2026-11-20"); // round 4

  train(store, "day-b", "2026-11-17"); // reopened and finished again
  assert.equal(filed(store, "2026-11-17", "day-b").round, 3, "it stays in the round it was first filed in");
  assert.equal(number(store), 4);

  save(store, (draft) => setDay(draft, "2026-11-18", ["day-a"], "")); // marked afterwards in the Log
  assert.equal(filed(store, "2026-11-18", "day-a").round, 4, "a day after round 3's last workout belongs to round 4");
  save(store, (draft) => setDay(draft, "2026-11-10", ["day-b"], ""));
  assert.equal(filed(store, "2026-11-10", "day-b").round, undefined, "a day from before any round has none");

  save(store, (draft) => {
    startWorkout(draft, "day-b", "2026-11-21", 0);
    cancelWorkout(draft);
  });
  assert.deepEqual(names(roundSummary(store.getState())), ["11-18 Day A", "11-20 Day A"], "a cancelled workout was never part of the round");

  save(store, (draft) => setDay(draft, "2026-11-19", ["day-b"], "")); // a past day that completes the open round closes it
  assert.deepEqual([filed(store, "2026-11-19", "day-b").round, number(store)], [4, 5]);
});

test("a workout from another program is listed in the round as a guest and changes no count", () => {
  const { store } = freshStore();
  const other = secondProgram(store);
  save(store, (draft) => setRoundNumber(draft, 6));
  train(store, "day-a", "2026-11-16");

  save(store, (draft) => startGuestWorkout(draft, other.ids[0], "2026-11-19", 0));
  assert.equal(store.getState().settings.activeProgramId, other.programId, "while it runs, its own program shows");
  assert.equal(roundSummary(store.getState()).program.id, "sample", "the round still follows the home program");
  save(store, (draft) => finishWorkout(draft, { now: 40 * 60000 }));

  const state = store.getState();
  assert.equal(state.settings.activeProgramId, "sample", "the followed program is back");
  const round = roundSummary(state);
  assert.deepEqual(names(round), ["11-16 Day A", "11-19 Full body A (guest)"]);
  assert.deepEqual([round.number, round.remaining.map((routine) => routine.id)], [6, ["day-b"]], "still 1 of 2 workouts done");

  save(store, (draft) => endRound(draft)); // ending it early
  assert.deepEqual([number(store), roundRecord(store.getState(), { number: 6, block: 1 }).ended], [7, "early"]);
  assert.deepEqual(store.update((draft) => endRound(draft)), { ok: false, error: "Nothing is done in this round yet." });
});

test("an Optional workout is listed in the round but never asked for or counted", () => {
  const { store } = freshStore();
  save(store, (draft) => {
    setRoundNumber(draft, 1);
    updateRoutine(draft, "day-b", { status: "optional" });
  });
  train(store, "day-b", "2026-11-16");
  assert.equal(filed(store, "2026-11-16", "day-b").optional, true);
  assert.equal(number(store), 1, "the optional one alone doesn't finish the round");
  train(store, "day-a", "2026-11-17");
  const closed = roundRecord(store.getState(), { number: 1, block: 1 });
  assert.deepEqual([number(store), closed.done, closed.required, closed.workouts.length], [2, 1, 1, 2]);
});

test("following a different program ends the round it interrupts; the count carries on, or starts a new block", () => {
  const carried = freshStore().store;
  const other = secondProgram(carried, "PPL 10");
  save(carried, (draft) => setRoundNumber(draft, 6));

  save(carried, (draft) => followProgram(draft, other.programId)); // nothing done yet: the round just follows the new program
  assert.deepEqual([number(carried), roundSummary(carried.getState()).program.name, allRounds(carried.getState()).length], [6, "PPL 10", 1]);
  save(carried, (draft) => followProgram(draft, "sample"));

  train(carried, "day-a", "2026-11-16");
  const midRound = JSON.stringify(carried.getState());
  save(carried, (draft) => followProgram(draft, other.programId)); // with a workout done, round 6 ends here
  const rounds = allRounds(carried.getState());
  assert.deepEqual(rounds.map((item) => [item.number, item.block, item.program, item.ended, `${item.done}/${item.required}`]), [[7, 1, "PPL 10", "", "0/2"], [6, 1, "Sample program", "switch", "1/2"]]);
  train(carried, other.ids[0], "2026-11-18");
  assert.deepEqual([filed(carried, "2026-11-18", other.ids[0]).round, filed(carried, "2026-11-18", other.ids[0]).guest], [7, undefined], "its workouts count in the new program's round");

  const fresh = freshStore(JSON.parse(midRound)).store; // the same switch, as a new block
  save(fresh, (draft) => followProgram(draft, other.programId, { newBlock: true }));
  assert.deepEqual(allRounds(fresh.getState()).map((item) => [item.number, item.block, item.program]), [[1, 2, "PPL 10"], [6, 1, "Sample program"]]);
});

test("a round number already in the history can't be taken; a new block starts the count again", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 6));
  train(store, "day-a", "2026-11-16");
  train(store, "day-b", "2026-11-17"); // round 6 done
  train(store, "day-a", "2026-11-18"); // round 7 open
  const before = JSON.stringify(store.getState());
  assert.deepEqual(store.update((draft) => setRoundNumber(draft, 6)), { ok: false, error: "Round 6 is already in your history. Pick another number." });
  assert.equal(JSON.stringify(store.getState()), before);
  save(store, (draft) => setRoundNumber(draft, 9));
  assert.deepEqual([filed(store, "2026-11-16", "day-a").round, filed(store, "2026-11-18", "day-a").round], [6, 9], "only the open round moved");

  save(store, (draft) => startNewBlock(draft, "2026-11-19"));
  assert.deepEqual(allRounds(store.getState()).map((item) => [item.number, item.block, item.ended]), [[1, 2, ""], [9, 1, "early"], [6, 1, "complete"]]);
  train(store, "day-a", "2026-11-19");
  assert.deepEqual([filed(store, "2026-11-19", "day-a").round, filed(store, "2026-11-19", "day-a").block], [1, 2]);
  save(store, (draft) => setRoundNumber(draft, 6)); // block 2 may have its own round 6
  assert.equal(number(store), 6);
});

test("after three weeks away the owner chooses once: carry on, or start again as a new block", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 14));
  train(store, "day-a", "2026-12-01");
  assert.equal(longBreak(store.getState(), "2026-12-17"), null, "sixteen days isn't a break");
  assert.deepEqual(longBreak(store.getState(), "2027-02-02"), { lastDay: "2026-12-01", weeks: 9, lastRound: 14, open: true });

  const carriedOn = freshStore(store.getState()).store;
  save(carriedOn, (draft) => answerBreak(draft, false, "2027-02-02"));
  assert.deepEqual([number(carriedOn), openRound(carriedOn.getState()).block, roundRecord(carriedOn.getState(), { number: 14, block: 1 }).ended], [15, 1, "break"]);
  assert.equal(longBreak(carriedOn.getState(), "2027-02-02"), null, "asked once");
  save(carriedOn, (draft) => { draft.sessions["2027-01-05"] = structuredClone(draft.sessions["2026-12-01"]); });
  assert.equal(longBreak(carriedOn.getState(), "2027-02-02"), null, "and not again for a day marked inside the break");

  save(store, (draft) => answerBreak(draft, true, "2027-02-02"));
  assert.deepEqual([number(store), openRound(store.getState()).block], [1, 2], "start again: round 1 of block 2");
});

test("a day marked for before the round opened doesn't count toward it", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 6)); // the round opens today
  save(store, (draft) => setDay(draft, "2026-10-01", ["day-b"], ""));
  assert.equal(filed(store, "2026-10-01", "day-b").round, undefined);
  assert.deepEqual(roundSummary(store.getState()).remaining.map((routine) => routine.id), ["day-a", "day-b"]);
});
