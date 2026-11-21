// Rounds (one pass through a program, over however many days) and calendar weeks.
// Run with `npm test`.

import test from "node:test";
import assert from "node:assert/strict";
import {
  addRoutine,
  answerBreak,
  calendarWeek,
  cancelWorkout,
  createProgram,
  endRound,
  finishWorkout,
  longBreak,
  roundCounter,
  roundSummary,
  setDay,
  setRoundNumber,
  startGuestWorkout,
  startWorkout,
  updateRoutine,
} from "../js/model.js";
import { freshStore, refuse, save } from "./support.mjs";

// Does one whole workout of a routine on a day.
const train = (store, routineId, dateKey) => save(store, (draft) => {
  startWorkout(draft, routineId, dateKey, 0);
  finishWorkout(draft, { now: 30 * 60000 });
});
const names = (summary) => summary.workouts.map((item) => `${item.dateKey.slice(5)} ${item.name}${item.guest ? " (guest)" : ""}`);
const filed = (store, dateKey, routineId) => store.getState().sessions[dateKey].workouts[routineId];

test("the calendar week is the ISO week with its own year, Monday first", () => {
  assert.deepEqual(calendarWeek("2026-11-21"), { year: 2026, week: 47 });
  assert.deepEqual(calendarWeek("2026-11-22"), { year: 2026, week: 47 }, "Sunday ends the week");
  assert.deepEqual(calendarWeek("2026-11-23"), { year: 2026, week: 48 }, "Monday starts the next");
  assert.deepEqual(calendarWeek("2025-12-29"), { year: 2026, week: 1 }, "late December can belong to next year's week 1");
  assert.deepEqual(calendarWeek("2026-12-31"), { year: 2026, week: 53 }, "2026 has 53 weeks");
  assert.deepEqual(calendarWeek("2027-01-03"), { year: 2026, week: 53 }, "early January can belong to last year's last week");
  assert.deepEqual(calendarWeek("2027-01-04"), { year: 2027, week: 1 });
});

test("a round runs over as many days as it takes and ends when every routine is done, in any order", () => {
  const { store } = freshStore();
  assert.equal(roundSummary(store.getState()).counting, false, "nothing is counted until the owner says which round he's on");
  save(store, (draft) => setRoundNumber(draft, "sample", 6));

  train(store, "day-b", "2026-11-16"); // the last routine first
  let round = roundSummary(store.getState());
  assert.deepEqual([round.number, names(round), round.remaining.map((routine) => routine.id)], [6, ["11-16 Day B"], ["day-a"]]);
  assert.deepEqual(filed(store, "2026-11-16", "day-b"), { name: "Day B", program: "Sample program", minutes: 30, round: 6, block: 1, roundOf: "sample" });

  train(store, "day-b", "2026-11-18"); // the same routine again counts once
  assert.deepEqual(roundSummary(store.getState()).remaining.map((routine) => routine.id), ["day-a"]);

  train(store, "day-a", "2026-11-25"); // nine days after it started: the round is complete
  round = roundSummary(store.getState());
  assert.deepEqual([round.number, round.workouts.length, round.remaining.length], [7, 0, 2], "round 7 opens, empty");
  assert.equal(filed(store, "2026-11-25", "day-a").round, 6);
});

test("reopening a workout or logging a past day never opens, closes or renumbers a round", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, "sample", 3));
  train(store, "day-a", "2026-11-16");
  train(store, "day-b", "2026-11-17"); // round 3 is complete; round 4 is open
  train(store, "day-a", "2026-11-20"); // round 4

  train(store, "day-b", "2026-11-17"); // reopened and finished again
  assert.equal(filed(store, "2026-11-17", "day-b").round, 3, "it stays in the round it was first filed in");
  assert.equal(roundCounter(store.getState(), "sample").number, 4);

  save(store, (draft) => setDay(draft, "2026-11-18", ["day-a"], "")); // marked afterwards in the Log
  assert.equal(filed(store, "2026-11-18", "day-a").round, 4, "a past day after round 3's last workout belongs to round 4");
  assert.equal(roundCounter(store.getState(), "sample").number, 4);
  save(store, (draft) => setDay(draft, "2026-11-10", ["day-b"], "")); // before any round: it has none
  assert.equal(filed(store, "2026-11-10", "day-b").round, undefined);

  save(store, (draft) => {
    startWorkout(draft, "day-b", "2026-11-21", 0);
    cancelWorkout(draft);
  });
  assert.deepEqual(names(roundSummary(store.getState())), ["11-18 Day A", "11-20 Day A"], "a cancelled workout was never part of the round");

  // A past day that completes the open round closes it, like a live workout would.
  save(store, (draft) => setDay(draft, "2026-11-19", ["day-b"], ""));
  assert.deepEqual([filed(store, "2026-11-19", "day-b").round, roundCounter(store.getState(), "sample").number], [4, 5]);
});

test("a routine from another program is filed in the round as a guest, counts toward nothing, and the program comes back", () => {
  const { store } = freshStore();
  const fullBody = save(store, (draft) => {
    const programId = createProgram(draft, { name: "Full body" });
    return addRoutine(draft, programId, { name: "Full body A", group: "gym", status: "required", note: "", blocks: [{ id: "fb-main", name: "" }] });
  });
  save(store, (draft) => {
    draft.settings.activeProgramId = "sample";
    draft.settings.activeRoutineId = "day-b";
    setRoundNumber(draft, "sample", 6);
  });
  train(store, "day-a", "2026-11-16");

  save(store, (draft) => startGuestWorkout(draft, fullBody, "2026-11-19", 0));
  assert.equal(store.getState().settings.activeProgramId, routineProgramId(store, fullBody), "while it runs, its own program shows");
  save(store, (draft) => finishWorkout(draft, { now: 40 * 60000 }));

  const state = store.getState();
  assert.deepEqual([state.settings.activeProgramId, state.settings.activeRoutineId], ["sample", "day-b"], "back where it was");
  const round = roundSummary(state);
  assert.deepEqual(names(round), ["11-16 Day A", "11-19 Full body A (guest)"]);
  assert.deepEqual([round.number, round.remaining.map((routine) => routine.id)], [6, ["day-b"]], "still 1 of 2 done");

  save(store, (draft) => endRound(draft, "sample")); // "call it a week"
  assert.deepEqual([roundSummary(store.getState()).number, roundSummary(store.getState()).workouts.length], [7, 0]);
  refuse({ store, storage: freshStorageOf(store) }, (draft) => endRound(draft, "sample"), "Nothing is done in this round yet.");
});

test("a round number already in the history can't be taken, so two rounds never merge; a routine made optional can complete a round", () => {
  const stored = freshStore();
  const { store } = stored;
  save(store, (draft) => setRoundNumber(draft, "sample", 6));
  train(store, "day-a", "2026-11-16");
  train(store, "day-b", "2026-11-17"); // round 6 done
  train(store, "day-a", "2026-11-18"); // round 7 open
  const before = JSON.stringify(store.getState());
  assert.deepEqual(store.update((draft) => setRoundNumber(draft, "sample", 6)), { ok: false, error: "Round 6 is already in your history. Pick another number." });
  assert.equal(JSON.stringify(store.getState()), before);
  save(store, (draft) => setRoundNumber(draft, "sample", 9));
  assert.deepEqual([filed(store, "2026-11-16", "day-a").round, filed(store, "2026-11-18", "day-a").round], [6, 9], "only the open round moved");

  save(store, (draft) => updateRoutine(draft, "day-b", { status: "optional" }));
  assert.equal(roundCounter(store.getState(), "sample").number, 9, "one required routine left: nothing to count, the round stays as it is");
});

test("changing the round number takes the open round's workouts with it; after a long break the owner chooses once", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, "sample", 1));
  train(store, "day-a", "2026-12-01");
  save(store, (draft) => setRoundNumber(draft, "sample", 14));
  assert.equal(filed(store, "2026-12-01", "day-a").round, 14);

  assert.equal(longBreak(store.getState(), "sample", "2026-12-17"), null, "sixteen days isn't a break");
  assert.deepEqual(longBreak(store.getState(), "sample", "2027-02-02"), { lastDay: "2026-12-01", weeks: 9, lastRound: 14, open: true });

  const carriedOn = freshStore(store.getState()).store;
  save(carriedOn, (draft) => answerBreak(draft, "sample", false, "2027-02-02"));
  assert.deepEqual([roundSummary(carriedOn.getState()).number, roundSummary(carriedOn.getState()).block], [15, 1], "carry on: the unfinished round is closed");
  assert.equal(longBreak(carriedOn.getState(), "sample", "2027-02-02"), null, "asked once");
  // A day marked inside the break afterwards changes the last workout day; that is no new break.
  save(carriedOn, (draft) => { draft.sessions["2027-01-05"] = structuredClone(draft.sessions["2026-12-01"]); });
  assert.equal(longBreak(carriedOn.getState(), "sample", "2027-02-02"), null, "and not again for a day marked inside the break");

  save(store, (draft) => answerBreak(draft, "sample", true, "2027-02-02"));
  assert.deepEqual([roundSummary(store.getState()).number, roundSummary(store.getState()).block], [1, 2], "start again: round 1 of block 2");
  train(store, "day-a", "2027-02-02");
  assert.deepEqual([filed(store, "2027-02-02", "day-a").round, filed(store, "2027-02-02", "day-a").block], [1, 2]);
  assert.equal(filed(store, "2026-12-01", "day-a").block, 1, "the first block's workouts are untouched");
});

function routineProgramId(store, routineId) {
  return store.getState().programs.find((program) => program.routineIds.includes(routineId)).id;
}

// refuse() compares the stored text before and after; this gives it the store's own storage.
function freshStorageOf(store) {
  const raw = JSON.stringify(store.getState());
  return { raw: () => raw };
}

test("a day marked for before the round opened doesn't count toward it", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, "sample", 6)); // the round opens today
  save(store, (draft) => setDay(draft, "2026-10-01", ["day-b"], ""));
  assert.equal(filed(store, "2026-10-01", "day-b").round, undefined);
  assert.deepEqual(roundSummary(store.getState()).remaining.map((routine) => routine.id), ["day-a", "day-b"]);
});
