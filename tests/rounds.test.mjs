// Rounds (one pass through the followed program, over however many days), blocks and
// calendar weeks. Run with `npm test`.

import test from "node:test";
import assert from "node:assert/strict";
import {
  addExtra,
  addRoutine,
  allBlocks,
  allRounds,
  answerBreak,
  calendarWeek,
  cancelWorkout,
  createProgram,
  deleteWorkout,
  endRound,
  finishWorkout,
  followProgram,
  localDateKey,
  longBreak,
  nextWorkout,
  openRound,
  removeProgram,
  removeRoutine,
  roundRecord,
  roundSummary,
  saveEntrySets,
  setDay,
  setEntryChecked,
  setRoundNumber,
  startGuestWorkout,
  startNewBlock,
  startTodaysWorkout,
  startWorkout,
  updateProgram,
  updateRoutine,
} from "../js/model.js";
import { stateProblem } from "../js/store.js";
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
  const programId = createProgram(draft, { name });
  const ids = ["A", "B"].map((letter) => addRoutine(draft, programId, { name: `${name} ${letter}`, group: "gym", status: "required", note: "", blocks: [{ id: `${programId}-${letter}`, name: "" }] }));
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
  assert.deepEqual([store.getState().settings.activeProgramId, store.getState().settings.activeWorkout.guest], ["sample", true], "while it runs, the followed program is unchanged");
  assert.deepEqual(store.update((draft) => removeProgram(draft, "sample")), { ok: false, error: "Finish or cancel the workout in progress first." });
  save(store, (draft) => finishWorkout(draft, { now: 40 * 60000 }));

  const state = store.getState();
  assert.deepEqual([state.settings.activeProgramId, state.settings.activeRoutineId], ["sample", "day-b"], "and afterwards the next workout of the round is selected");
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

test("a round renumbered to below earlier ones never runs into them", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 5));
  train(store, "day-a", "2026-11-10");
  train(store, "day-b", "2026-11-11"); // round 5 done, round 6 open
  save(store, (draft) => setRoundNumber(draft, 4));
  train(store, "day-a", "2026-11-12");
  train(store, "day-b", "2026-11-13"); // round 4 done: the next free number is 6
  assert.deepEqual(allRounds(store.getState()).map((item) => [item.number, item.workouts.length]), [[6, 0], [4, 2], [5, 2]]);
});

test("a closed round's numbers are fixed: later changes to routines and days don't rewrite them", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 1));
  train(store, "day-a", "2026-11-10");
  save(store, (draft) => updateRoutine(draft, "day-a", { status: "optional" })); // done while Required, then made Optional
  train(store, "day-b", "2026-11-11");
  const closed = () => roundRecord(store.getState(), { number: 1, block: 1 });
  assert.deepEqual([closed().done, closed().required, closed().ended], [1, 1, "complete"], "never 2 of 1");
  save(store, (draft) => setDay(draft, "2026-11-11", [], "")); // unmarked afterwards in the Log
  assert.deepEqual([closed().done, closed().required, closed().workouts.length], [1, 1, 1]);
});

test("deleting the followed program ends a round with workouts in it; deleting the only program ends the count", () => {
  const { store } = freshStore();
  const other = secondProgram(store);
  save(store, (draft) => setRoundNumber(draft, 3));
  train(store, "day-a", "2026-11-10");
  save(store, (draft) => removeProgram(draft, "sample"));
  assert.deepEqual(allRounds(store.getState()).map((item) => [item.number, item.program, item.ended, `${item.done}/${item.required}`]), [[4, "Full body", "", "0/2"], [3, "Sample program", "switch", "1/2"]]);
  save(store, (draft) => removeProgram(draft, other.programId));
  assert.deepEqual([openRound(store.getState()), store.getState().settings.roundLog.length], [null, 1], "no program, no open round; the history stays");
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
  train(carriedOn, "day-a", "2027-02-02"); // trained on the day of the answer, then away again
  assert.equal(longBreak(carriedOn.getState(), "2027-03-02")?.weeks, 4, "the next break asks again");

  save(store, (draft) => answerBreak(draft, true, "2027-02-02"));
  assert.deepEqual([number(store), openRound(store.getState()).block], [1, 2], "start again: round 1 of block 2");
});

test("Next is the first Required workout not done in the round, leaving out one finished today", () => {
  const { store } = freshStore();
  const today = localDateKey();
  const next = () => nextWorkout(store.getState(), today)?.id || null;
  assert.equal(next(), "day-a", "before counting: the first one");
  save(store, (draft) => setRoundNumber(draft, 3));
  train(store, "day-a", today);
  assert.equal(next(), "day-b", "a workout done in the round is passed over");
  // Day B finished today completes round 3; round 4 starts with Day A, but it was done today.
  train(store, "day-b", today);
  assert.deepEqual([number(store), next()], [4, null], "both were done today: nothing to propose");
  assert.equal(nextWorkout(store.getState(), "2099-01-01")?.id, "day-a", "the next day, the round's first one again");
});

test("Start after a long break answers it in the same save, once; an extra carries on; a past day answers nothing", () => {
  const away = new Date();
  away.setDate(away.getDate() - 40);
  const lastDay = localDateKey(away);
  const setup = () => {
    const { store } = freshStore();
    save(store, (draft) => setRoundNumber(draft, 6));
    train(store, "day-a", lastDay);
    assert.ok(longBreak(store.getState()));
    return store;
  };
  const closed = (store) => store.getState().settings.roundLog || [];

  // Carry on (the default): round 6 ends at the break, the workout runs in round 7.
  let store = setup();
  save(store, (draft) => startTodaysWorkout(draft, "day-b"));
  assert.deepEqual(closed(store).map((round) => [round.number, round.ended]), [[6, "break"]]);
  assert.deepEqual([number(store), store.getState().settings.activeWorkout.routineId, store.getState().settings.activeRoutineId], [7, "day-b", "day-b"]);
  assert.equal(longBreak(store.getState()), null, "answered");
  // Cancelled: the answer goes with it, so starting again answers afresh, recorded once.
  save(store, (draft) => cancelWorkout(draft));
  save(store, (draft) => startTodaysWorkout(draft, "day-b", { restart: true }));
  assert.deepEqual([closed(store).map((round) => [round.number, round.ended]), number(store), openRound(store.getState()).block], [[[6, "break"]], 1, 2]);

  // Start again: a new block.
  store = setup();
  save(store, (draft) => startTodaysWorkout(draft, "day-a", { restart: true }));
  assert.deepEqual([closed(store).map((round) => round.ended), number(store), openRound(store.getState()).block], [["break"], 1, 2]);

  // An extra from another program answers it the same way.
  store = setup();
  const { ids } = secondProgram(store);
  save(store, (draft) => startTodaysWorkout(draft, ids[0], { guest: true }));
  assert.deepEqual([closed(store).length, number(store), store.getState().settings.activeWorkout.guest], [1, 7, true]);
  store = setup();
  const other = secondProgram(store);
  save(store, (draft) => startTodaysWorkout(draft, other.ids[0], { guest: true, restart: true }));
  assert.deepEqual([number(store), openRound(store.getState()).block, store.getState().settings.activeWorkout.guest], [1, 2, true]);

  // A workout logged for a past day leaves the question for the next Start.
  store = setup();
  save(store, (draft) => startWorkout(draft, "day-b", localDateKey(new Date(Date.now() - 86400000)), Date.now(), true));
  assert.deepEqual([closed(store).length, Boolean(longBreak(store.getState()))], [0, true]);

  // Starting before counting has begun starts it at round 1.
  const fresh = freshStore().store;
  save(fresh, (draft) => startTodaysWorkout(draft, "day-a"));
  assert.deepEqual([number(fresh), fresh.getState().settings.activeWorkout.routineId], [1, "day-a"]);
});

test("cancelling a workout whose start answered a break puts everything back as it was; finishing keeps the answer", () => {
  const away = new Date();
  away.setDate(away.getDate() - 40);
  const setup = (withOpenRound) => {
    const { store } = freshStore();
    save(store, (draft) => setRoundNumber(draft, 6));
    if (!withOpenRound) train(store, "day-b", localDateKey(new Date(away.getTime() - 86400000)));
    train(store, "day-a", localDateKey(away));
    return store;
  };
  // Round 6 left unfinished (carrying on closes it) or completed (nothing to close); each answer.
  for (const withOpenRound of [true, false]) {
    for (const restart of [false, true]) {
      const store = setup(withOpenRound);
      const before = structuredClone(store.getState());
      before.settings.activeRoutineId = "day-b"; // Start selects the routine; that stays
      save(store, (draft) => startTodaysWorkout(draft, "day-b", { restart }));
      assert.ok(store.getState().settings.activeWorkout.breakUndo);
      save(store, (draft) => cancelWorkout(draft));
      assert.deepEqual(store.getState(), before, `cancelled (${withOpenRound ? "open" : "complete"} round, ${restart ? "new block" : "carry on"})`);
      assert.ok(longBreak(store.getState()), "the round page asks again");
    }
  }
  // An extra's start is undone the same way.
  const store = setup(true);
  const { ids } = secondProgram(store);
  const before = structuredClone(store.getState());
  save(store, (draft) => startTodaysWorkout(draft, ids[0], { guest: true, restart: true }));
  save(store, (draft) => cancelWorkout(draft));
  assert.deepEqual(store.getState(), before);
  // Finished: the answer stands and the workout keeps nothing of it.
  save(store, (draft) => startTodaysWorkout(draft, "day-b", { restart: true }));
  save(store, (draft) => finishWorkout(draft));
  assert.deepEqual([number(store), openRound(store.getState()).block, longBreak(store.getState()), store.getState().settings.activeWorkout], [1, 2, null, null]);
});

test("a day marked for before the round opened doesn't count toward it", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 6)); // the round opens today
  save(store, (draft) => setDay(draft, "2026-10-01", ["day-b"], ""));
  assert.equal(filed(store, "2026-10-01", "day-b").round, undefined);
  assert.deepEqual(roundSummary(store.getState()).remaining.map((routine) => routine.id), ["day-a", "day-b"]);
});

// ---------- blocks ----------

const blockShape = (block) => ({ block: block.block, open: block.open, rounds: block.rounds.map((item) => item.number), programs: block.programs, workouts: block.workouts.length, from: block.from, to: block.to, minutes: block.minutes, endings: block.endings, gapBefore: block.gapBefore });

test("block 1 alone: its rounds newest first, the open one included", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 4));
  train(store, "day-a", "2026-11-09");
  train(store, "day-b", "2026-11-10"); // round 4 complete, round 5 open
  train(store, "day-a", "2026-11-12");
  assert.deepEqual(allBlocks(store.getState()).map(blockShape), [
    { block: 1, open: true, rounds: [5, 4], programs: ["Sample program"], workouts: 3, from: "2026-11-09", to: "2026-11-12", minutes: 90, endings: { complete: 1 }, gapBefore: 0 },
  ]);
});

test("a block that changed program lists both programs in order and how its rounds ended", () => {
  const { store } = freshStore();
  const other = secondProgram(store);
  save(store, (draft) => setRoundNumber(draft, 1));
  train(store, "day-a", "2026-11-09");
  save(store, (draft) => followProgram(draft, other.programId)); // round 1 ends with the change
  train(store, other.ids[0], "2026-11-11");
  train(store, other.ids[1], "2026-11-12"); // round 2 complete, round 3 open
  assert.deepEqual(blockShape(allBlocks(store.getState()).find((item) => item.block === 1)), { block: 1, open: true, rounds: [3, 2, 1], programs: ["Sample program", "Full body"], workouts: 3, from: "2026-11-09", to: "2026-11-12", minutes: 90, endings: { switch: 1, complete: 1 }, gapBefore: 0 });
});

test("a block started after a break: the one before is closed, and the new one says how long the gap was", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 1));
  train(store, "day-a", "2026-11-09");
  train(store, "day-b", "2026-11-10"); // round 1 complete, round 2 open with nothing in it
  save(store, (draft) => answerBreak(draft, true, "2026-12-22")); // start again: block 2
  let blocks = allBlocks(store.getState());
  assert.deepEqual(blocks.map((item) => [item.block, item.open, item.rounds.map((round) => round.number), item.from, item.to, item.gapBefore]), [
    [2, true, [1], "2026-12-22", "", 0], // nothing done yet: it starts on the day its round opened
    [1, false, [1], "2026-11-09", "2026-11-10", 0],
  ]);
  train(store, "day-a", "2026-12-23");
  blocks = allBlocks(store.getState());
  assert.deepEqual([blocks[0].from, blocks[0].to, blocks[0].gapBefore, blocks[1].endings], ["2026-12-23", "2026-12-23", 43, { complete: 1 }]);
});

// ---------- deleting a finished workout ----------

test("deleting a finished workout takes it off its day with its sets, done marks and added exercises", () => {
  const { store } = freshStore();
  save(store, (draft) => {
    setRoundNumber(draft, 2);
    startWorkout(draft, "day-a", "2026-11-16", 0);
    addExtra(draft, "ab-wheel");
    saveEntrySets(draft, { routineId: "day-a", entryId: "a2", exerciseId: "bench-press", sets: [{ kg: "60", reps: "8" }], dateKey: "2026-11-16" });
    setEntryChecked(draft, "day-a", "a2", true, "2026-11-16");
    finishWorkout(draft, { now: 30 * 60000 });
    startWorkout(draft, "day-b", "2026-11-16", 0); // another workout the same day stays
    saveEntrySets(draft, { routineId: "day-b", entryId: "b1", exerciseId: "squat", sets: [{ kg: "100", reps: "5" }], dateKey: "2026-11-16" });
    finishWorkout(draft, { now: 30 * 60000 });
  });
  assert.equal(number(store), 3, "both done: round 2 complete");
  // Nothing is done in round 3 yet, so without Day A round 2 isn't complete: it opens again.
  save(store, (draft) => deleteWorkout(draft, "2026-11-16", "day-a"));
  const day = store.getState().sessions["2026-11-16"];
  assert.deepEqual([day.routineIds, Object.keys(day.workouts), Object.keys(day.logs), day.checkedEntryIdsByRoutine, day.extras], [["day-b"], ["day-b"], ["b1"], {}, {}]);
  assert.deepEqual([number(store), names(roundSummary(store.getState())), store.getState().settings.roundLog], [2, ["11-16 Day B"], undefined]);
  assert.equal(stateProblem(store.getState()), "");

  // In an open round it simply leaves: one fewer done. A day left with nothing goes.
  save(store, (draft) => deleteWorkout(draft, "2026-11-16", "day-b"));
  const summary = roundSummary(store.getState());
  assert.deepEqual([store.getState().sessions["2026-11-16"], summary.number, summary.workouts.length, summary.counting], [undefined, 2, 0, true], "counting stays started");
  // A day with a note keeps the note.
  train(store, "day-a", "2026-11-17");
  save(store, (draft) => setDay(draft, "2026-11-17", ["day-a"], "Felt good"));
  save(store, (draft) => deleteWorkout(draft, "2026-11-17", "day-a"));
  assert.deepEqual(store.getState().sessions["2026-11-17"], { routineIds: [], checkedEntryIdsByRoutine: {}, note: "Felt good", logs: {}, extras: {}, workouts: {} });
  assert.deepEqual(store.update((draft) => deleteWorkout(draft, "2026-11-17", "day-a")), { ok: false, error: "That workout is no longer in the Log." });
});

test("a workout in progress can't be deleted, a reopened one included; closed again it can", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 1));
  train(store, "day-a", "2026-11-16");
  save(store, (draft) => startWorkout(draft, "day-a", "2026-11-16", 0)); // reopened
  assert.deepEqual(store.update((draft) => deleteWorkout(draft, "2026-11-16", "day-a")), { ok: false, error: "Finish or cancel the workout in progress first." });
  save(store, (draft) => cancelWorkout(draft)); // Close again
  assert.equal(filed(store, "2026-11-16", "day-a").round, 1);
  save(store, (draft) => deleteWorkout(draft, "2026-11-16", "day-a"));
  assert.deepEqual([store.getState().sessions["2026-11-16"], number(store)], [undefined, 1]);
  // Another workout may run meanwhile.
  train(store, "day-a", "2026-11-17");
  save(store, (draft) => startWorkout(draft, "day-b", "2026-11-18", 0));
  save(store, (draft) => deleteWorkout(draft, "2026-11-17", "day-a"));
  assert.equal(store.getState().settings.activeWorkout.routineId, "day-b");
});

test("deleting the workout that completed the last round, before anything else is done, opens that round again", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 3));
  train(store, "day-a", "2026-11-16");
  const before = structuredClone(store.getState());
  train(store, "day-b", "2026-11-18"); // completes round 3; round 4 opens
  assert.equal(number(store), 4);
  save(store, (draft) => deleteWorkout(draft, "2026-11-18", "day-b"));
  const state = store.getState();
  assert.deepEqual(state.settings.round, { ...before.settings.round, since: "2026-11-16" }, "round 3 again, from the day of its first workout");
  assert.deepEqual([state.settings.roundLog, names(roundSummary(state)), roundSummary(state).remaining.map((routine) => routine.id)], [undefined, ["11-16 Day A"], ["day-b"]]);
  assert.deepEqual(state.sessions, before.sessions);

  // Logged again for that past day it completes round 3 once more; deleted, round 3 opens again.
  save(store, (draft) => {
    startWorkout(draft, "day-b", "2026-11-18", 0, true);
    finishWorkout(draft);
  });
  assert.deepEqual([filed(store, "2026-11-18", "day-b").round, number(store)], [3, 4]);
  save(store, (draft) => deleteWorkout(draft, "2026-11-18", "day-b"));
  assert.equal(number(store), 3);
});

test("a closed round keeps its numbers when one of its workouts is deleted after something was done in the next, or when it ended another way", () => {
  const { store } = freshStore();
  save(store, (draft) => setRoundNumber(draft, 3));
  train(store, "day-a", "2026-11-16");
  train(store, "day-b", "2026-11-17"); // round 3 complete
  train(store, "day-a", "2026-11-18"); // round 4 has a workout
  const log = structuredClone(store.getState().settings.roundLog);
  save(store, (draft) => deleteWorkout(draft, "2026-11-17", "day-b"));
  const closed = roundRecord(store.getState(), { number: 3, block: 1 });
  assert.deepEqual([store.getState().settings.roundLog, closed.done, closed.required, names(closed), number(store)], [log, 2, 2, ["11-16 Day A"], 4], "its numbers stay; only its list changes");

  save(store, (draft) => endRound(draft)); // round 4 ends early, round 5 opens
  save(store, (draft) => deleteWorkout(draft, "2026-11-18", "day-a"));
  assert.deepEqual([number(store), store.getState().settings.roundLog.map((item) => [item.number, item.ended, item.done])], [5, [[3, "complete", 2], [4, "early", 1]]]);
});

test("an extra or an Optional workout counts toward nothing, so deleting it changes no number", () => {
  const { store } = freshStore();
  const other = secondProgram(store);
  save(store, (draft) => {
    setRoundNumber(draft, 1);
    updateRoutine(draft, "day-b", { status: "optional" });
  });
  train(store, "day-b", "2026-11-15"); // Optional
  save(store, (draft) => {
    startGuestWorkout(draft, other.ids[0], "2026-11-16", 0);
    finishWorkout(draft, { now: 30 * 60000 });
  });
  train(store, "day-a", "2026-11-17"); // completes round 1
  save(store, (draft) => {
    startGuestWorkout(draft, other.ids[1], "2026-11-17", 0); // an extra in round 2
    finishWorkout(draft, { now: 30 * 60000 });
  });
  for (const [dateKey, routineId] of [["2026-11-15", "day-b"], ["2026-11-16", other.ids[0]]]) {
    save(store, (draft) => deleteWorkout(draft, dateKey, routineId));
    assert.deepEqual([number(store), store.getState().settings.roundLog.length], [2, 1], `${routineId} deleted`);
  }
  assert.deepEqual(names(roundRecord(store.getState(), { number: 1, block: 1 })), ["11-17 Day A"]);
  // Round 2 holds an extra, so something was done after round 1: deleting Day A reopens nothing.
  save(store, (draft) => deleteWorkout(draft, "2026-11-17", "day-a"));
  assert.deepEqual([number(store), store.getState().settings.roundLog.length], [2, 1]);
});

test("a workout whose routine or program was deleted since can still be deleted, and reopens nothing", () => {
  const { store } = freshStore();
  const other = secondProgram(store);
  save(store, (draft) => setRoundNumber(draft, 1));
  train(store, "day-a", "2026-11-16");
  train(store, "day-b", "2026-11-17"); // round 1 complete
  save(store, (draft) => removeRoutine(draft, "day-b"));
  save(store, (draft) => deleteWorkout(draft, "2026-11-17", "day-b"));
  assert.deepEqual([store.getState().sessions["2026-11-17"], number(store)], [undefined, 2]);
  save(store, (draft) => removeProgram(draft, "sample")); // round 2 now follows the other program
  save(store, (draft) => deleteWorkout(draft, "2026-11-16", "day-a"));
  assert.deepEqual([store.getState().sessions["2026-11-16"], number(store), openRound(store.getState()).programId], [undefined, 2, other.programId]);
  assert.equal(stateProblem(store.getState()), "");
});
