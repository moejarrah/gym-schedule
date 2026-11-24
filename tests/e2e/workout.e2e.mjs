// The Workout tab: the round page (one list, one row open, the bottom button acting on
// it), a workout from Start to the Log, logging sets from a slot's number, the exercise
// reference and history, swapping a slot to its alternative, leaving a running workout
// and coming back with the running bar; and the round count: setting the round, a round
// completed, following a different program, and a workout from another program.

import assert from "node:assert/strict";
import { PAST_DAY, sampleState } from "../sample.mjs";
import { TODAY, backToRound, bottomButton, dialog, escapeRegExp, expect, expectView, goToView, main, nextDay, programPicker, readState, roundRow, roundSettles, routineTab, runningBar, startButton, suite, tapOnRound } from "./helpers.mjs";

const { appTest } = suite({ saved: sampleState() });

const TWO_CHOICES = "Incline dumbbell press (dumbbell) or Cable fly (cable)";

// A slot's number box (it opens the logging sheet) and the rest of its row.
const numberOf = (page, title) => main(page).getByRole("button", { name: new RegExp(`^Log sets for ${escapeRegExp(title)}(, |$)`) });
const rowOf = (page, title) => main(page).getByRole("button", { name: `View ${title} details`, exact: true });
const logSheet = (page) => page.getByRole("dialog").filter({ has: page.getByRole("region", { name: "Last 3 times" }) });
const tick = (sheet, name) => sheet.getByRole("button", { name: `${name} done`, exact: true });
const done = (sheet) => sheet.getByRole("button", { name: "Exercise done", exact: true });
const todaySaved = async (page) => (await readState(page)).sessions[TODAY];

// "Round 3" at the top of the round page ("Round 1 · block 2" from the second block on).
const roundTitle = (page, name) => main(page).getByRole("heading", { level: 1, name, exact: true });
// A row of the round page, by what it says ("Day A, done today", "Day B, not done, next").
const row = (page, name) => main(page).getByRole("button", { name, exact: true });
// A done row that opens its day: an extra, listed with its program's name.
const doneRow = (page, name) => main(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}, done .+\\. Open that day\\.$`) });
// The round page's bottom button starts the workout of the open row, on the workout page.
// (The bottom button may just have changed: it ignores taps for a moment then.)
const start = async (page, routine) => {
  await expect(startButton(page, routine)).toBeVisible();
  await roundSettles(page);
  await tapOnRound(page, startButton(page, routine));
  await expect(backToRound(page)).toBeVisible();
};
// The result page after Finish ("Day A done"); its bottom button Done returns to the round
// page (it ignores taps for a moment after it took the place of Finish workout).
const resultTitle = (page, routine) => main(page).getByRole("heading", { level: 1, name: `${routine} done`, exact: true });
const closeResult = async (page) => {
  await expect(main(page).getByRole("heading", { level: 1, name: / done$/ })).toBeVisible();
  await roundSettles(page);
  await tapOnRound(page, bottomButton(page, "Done"));
  await expect(main(page).getByRole("button", { name: "Settings", exact: true })).toBeVisible();
};
// Finish (top right) always asks first; its answer "Finish" ("Finish anyway" when nothing
// is logged) files the workout and shows its result.
// A card of the result page, by its label ("Exercises · 2", "Not done · 1", "More").
const card = (page, label) => main(page).getByRole("region", { name: label, exact: true });
const finishQuestion = (page, routine) => dialog(page, `Finish ${routine}?`);
const finishTo = async (page, routine, { nothingLogged = false } = {}) => {
  await main(page).getByRole("button", { name: `Finish ${routine}`, exact: true }).click();
  if (nothingLogged) await dialog(page, "Nothing is logged").getByRole("button", { name: "Finish anyway" }).click();
  else await finishQuestion(page, routine).getByRole("button", { name: "Finish", exact: true }).click();
  await expect(resultTitle(page, routine)).toBeVisible();
  await roundSettles(page); // taps rest for a moment after the answer
};
const finish = async (page, routine, options) => {
  await finishTo(page, routine, options);
  await closeResult(page);
};

// The sample once rounds are being counted, with a second program to turn to:
// round 5 is open with Day A done in it on PAST_DAY, and Block 2 has one workout, Day X.
function twoPrograms() {
  const state = sampleState();
  state.routines.push({
    id: "day-x",
    name: "Day X",
    group: "gym",
    status: "required",
    note: "",
    blocks: [{ id: "x-main", name: "" }],
    entries: [{ id: "x1", blockId: "x-main", choices: [{ exerciseId: "squat", prescription: "5 × 5" }], note: "", role: "main" }],
  });
  state.programs.push({ id: "block-2", name: "Block 2", note: "", routineIds: ["day-x"] });
  Object.assign(state.sessions[PAST_DAY].workouts["day-a"], { round: 5, block: 1 });
  state.settings.round = { number: 5, block: 1, programId: "sample", since: PAST_DAY };
  return state;
}

appTest("The round page lists the round's workouts with one open, and the bottom button starts the open one", async ({ page }) => {
  await expectView(page, "Workout");
  await expect(main(page)).toContainText("A round is one pass through these two workouts, in any order, over as many days as it takes.");
  await expect(main(page)).toContainText("not started yet");
  // The next workout is open by itself, with its lines.
  const dayA = row(page, "Day A, not done, next");
  await expect(dayA).toHaveAttribute("aria-expanded", "true");
  await expect(main(page).getByRole("button", { name: /^Exercises of Day A: 3, plus 1 optional\./ })).toBeVisible();
  await expect(main(page)).toContainText("about 50 min");
  await expect(main(page)).toContainText("Mon, Nov 2");
  await expect(startButton(page, "Day A")).toBeVisible();

  // Another row opens in place, and the bottom button follows it; the open row stays open.
  await tapOnRound(page, roundRow(page, "Day B"));
  await expect(row(page, "Day B, not done")).toHaveAttribute("aria-expanded", "true");
  await expect(dayA).toHaveAttribute("aria-expanded", "false");
  await expect(startButton(page, "Day B")).toBeVisible();
  await expect(main(page)).toContainText("Never");
  await tapOnRound(page, row(page, "Day B, not done"));
  await expect(row(page, "Day B, not done")).toHaveAttribute("aria-expanded", "true");

  // Its exercises are on the Program tab.
  await main(page).getByRole("button", { name: /^Exercises of Day B: 2\./ }).click();
  await expectView(page, "Program");
  await expect(routineTab(page, "Day B")).toHaveAttribute("aria-pressed", "true");
  assert.deepEqual(await readState(page), sampleState(), "looking changes nothing");
});

appTest("Logging: Start opens the workout, a tick takes last time's set, typed sets and a drop are saved, and a reload opens on the workout", async ({ page }) => {
  // Finish with nothing logged offers to cancel instead; Cancel workout with nothing
  // logged asks nothing. Either way nothing is left behind.
  await start(page, "Day A");
  await expect(main(page)).toContainText("0 of 3 exercises done");
  await expect(main(page)).toContainText("1 optional");
  await expect(main(page)).toContainText("0 min");
  await main(page).getByRole("button", { name: "Finish Day A" }).click();
  await dialog(page, "Nothing is logged").getByRole("button", { name: "Cancel workout" }).click();
  await expect(startButton(page, "Day A")).toBeVisible();
  assert.equal((await readState(page)).settings.activeWorkout, null);
  await start(page, "Day A");
  await main(page).getByRole("button", { name: "Cancel workout" }).click();
  await expect(startButton(page, "Day A")).toBeVisible();
  assert.equal((await todaySaved(page)), undefined, "a cancelled workout leaves no day behind");

  await start(page, "Day A");
  // The bottom button logs the open exercise (the Optional warm-up first).
  await expect(bottomButton(page, "Log sets for Plank")).toBeVisible();
  await numberOf(page, "Bench press (barbell)").click();
  const sheet = logSheet(page);
  await expect(sheet.getByRole("heading", { name: "Bench press (barbell)" })).toBeVisible();
  await expect(sheet.getByRole("region", { name: "Last 3 times" })).toContainText("Day A");
  // Last time's set, with its unit.
  await expect(sheet.getByRole("button", { name: "60 kg × 10, copy last time to set 1" })).toBeVisible();

  // Set 1 is empty: its tick takes the grey values from last time (60 kg × 10).
  const weight1 = sheet.getByLabel("Weight for set 1, kg", { exact: true });
  await expect(weight1).toHaveAttribute("placeholder", "60");
  await tick(sheet, "Set 1").click();
  await expect(tick(sheet, "Set 1")).toHaveAttribute("aria-pressed", "true");
  await expect(weight1).toHaveValue("60");
  await expect(sheet.getByLabel("Reps for set 1", { exact: true })).toHaveValue("10");

  // Set 2 is typed, with a decimal comma as the phone's keypad gives it.
  await sheet.getByLabel("Weight for set 2, kg", { exact: true }).fill("62,5");
  await sheet.getByLabel("Reps for set 2", { exact: true }).fill("8");
  await tick(sheet, "Set 2").click();
  await expect(sheet.getByLabel("Weight for set 2, kg", { exact: true })).toHaveValue("62.5");

  // Correcting a ticked set and tapping its tick keeps it ticked, with the new value saved.
  await weight1.fill("61");
  await tick(sheet, "Set 1").click();
  await expect(tick(sheet, "Set 1")).toHaveAttribute("aria-pressed", "true");
  assert.equal((await todaySaved(page)).logs.a2.sets[0].kg, 61);
  await weight1.fill("60");
  await tick(sheet, "Set 1").click();
  await expect(tick(sheet, "Set 1")).toHaveAttribute("aria-pressed", "true");

  await sheet.getByRole("button", { name: "Drop set" }).click();
  await sheet.getByLabel("Weight for drop 1 after set 2, kg", { exact: true }).fill("50");
  await sheet.getByLabel("Reps for drop 1 after set 2", { exact: true }).fill("6");
  await tick(sheet, "Drop 1 after set 2").click();
  await expect(tick(sheet, "Drop 1 after set 2")).toHaveAttribute("aria-pressed", "true");

  await done(sheet).click();
  await expect(sheet).toBeHidden();
  await expect(numberOf(page, "Bench press (barbell)")).toHaveAccessibleName("Log sets for Bench press (barbell), done");
  // The row ends with the sets, every weight with its unit.
  await expect(rowOf(page, "Bench press (barbell)")).toContainText("60 kg × 10 · 62.5 kg × 8 +1 drop");
  await expect(main(page)).toContainText("1 of 3 exercises done");

  // Opened again, the app opens on the workout in progress.
  await page.reload();
  await expect(backToRound(page)).toBeVisible();
  await expectView(page, "Workout");
  await expect(numberOf(page, "Bench press (barbell)")).toHaveAccessibleName("Log sets for Bench press (barbell), done");
  assert.deepEqual(await todaySaved(page), {
    routineIds: [],
    checkedEntryIdsByRoutine: { "day-a": ["a2"] },
    note: "",
    logs: {
      a2: {
        routineId: "day-a",
        exerciseId: "bench-press",
        exerciseName: "Bench press (barbell)",
        unit: "reps",
        sets: [{ kg: 60, reps: 10, drops: [] }, { kg: 62.5, reps: 8, drops: [{ kg: 50, reps: 6 }] }],
      },
    },
    extras: {},
    workouts: {},
  });
});

appTest("A workout: Done and Not done on slots, an exercise added for today, and Finish asks, then files it", async ({ page }) => {
  await start(page, "Day A");
  // Done with no sets asks first.
  await numberOf(page, "Bench press (barbell)").click();
  await done(logSheet(page)).click();
  const confirm = dialog(page, "No sets logged");
  await expect(confirm).toContainText("Mark Bench press (barbell) done anyway?");
  await tapOnRound(page, confirm.getByRole("button", { name: "Mark done anyway" })); // taps rest after an answer
  await expect(numberOf(page, "Bench press (barbell)")).toHaveAccessibleName("Log sets for Bench press (barbell), done");

  await numberOf(page, "Push-up").click();
  await tick(logSheet(page), "Set 1").click();
  await done(logSheet(page)).click();
  await numberOf(page, "Push-up").click();
  await logSheet(page).getByRole("button", { name: "Not done" }).click();
  await expect(logSheet(page)).toBeHidden(); // Not done closes the sheet
  await expect(numberOf(page, "Push-up")).toHaveAccessibleName("Log sets for Push-up, 1 set logged");
  await expect(rowOf(page, "Push-up")).toContainText("15 reps");

  // "You sometimes add" offers what was added to this routine before; it joins today's list.
  await main(page).getByRole("button", { name: "Add Ab-wheel rollout for today" }).click();
  await expect(numberOf(page, "Ab-wheel rollout")).toHaveText("5");
  await expect(main(page).getByRole("button", { name: "Add Ab-wheel rollout for today" })).toHaveCount(0);
  await main(page).getByRole("button", { name: "Add exercise for today" }).click();
  await dialog(page, "Add exercise").getByRole("button", { name: "Add Squat (barbell) for today" }).click();
  await expect(numberOf(page, "Squat (barbell)")).toHaveText("6");
  assert.equal((await readState(page)).routines[0].entries.length, 4, "the program isn't changed");

  // Finish asks first, saying where the workout stands; Keep going changes nothing.
  assert.deepEqual((await todaySaved(page)).routineIds, []);
  await main(page).getByRole("button", { name: "Finish Day A" }).click();
  const question = finishQuestion(page, "Day A");
  // In the header's own numbers: Push-up has a set but isn't marked done.
  await expect(main(page)).toContainText("1 of 3 exercises done");
  await expect(question).toContainText("1 of 3 exercises done · 1 set logged.");
  await expect(question).toContainText("Not started: Incline dumbbell press (dumbbell).");
  await question.getByRole("button", { name: "Keep going" }).click();
  await expect(question).toBeHidden();
  assert.equal((await readState(page)).settings.activeWorkout.routineId, "day-a");
  await roundSettles(page); // a second tap right after an answer lands nowhere
  // Finish: the result shows, against last time.
  await finishTo(page, "Day A");
  await expect(card(page, "Exercises · 2")).toContainText("= 1 vs last");
  // Done returns to the round page, where today's workout is open and can be reopened.
  await closeResult(page);
  await expectView(page, "Workout");
  await expect(row(page, "Day A, done today")).toHaveAttribute("aria-expanded", "true");
  await expect(main(page)).toContainText("1 set, 1 exercise");
  await expect(row(page, "Day B, not done, next")).toBeVisible();
  await expect(bottomButton(page, "Reopen Day A")).toBeVisible();
  const saved = await readState(page);
  assert.deepEqual([saved.sessions[TODAY].routineIds, saved.sessions[TODAY].checkedEntryIdsByRoutine, saved.settings.activeWorkout], [["day-a"], { "day-a": ["a2"] }, null]);
  // Starting it started the count at round 1.
  assert.deepEqual(saved.sessions[TODAY].workouts, { "day-a": { name: "Day A", program: "Sample program", minutes: 1, round: 1, block: 1 } });

  // "How it went" shows the result again.
  await tapOnRound(page, main(page).getByRole("button", { name: "How Day A went" }));
  await expect(resultTitle(page, "Day A")).toBeVisible();
  await closeResult(page);

  await goToView(page, "Log");
  await expect(main(page).getByRole("button", { name: /^Wednesday, November 4, 2026, today, 1 finished workout/ })).toBeVisible();
  // A recent day's second line starts with its round.
  await expect(main(page).getByRole("button", { name: /^Open Wednesday, November 4, 2026\. Day A\. Round 1\./ })).toContainText(/Round 1 · /);
});

appTest("The result: the header sums it up, every exercise with its sets and change, what was not done, and How it went opens it again", async ({ page }) => {
  await start(page, "Day A");
  // Bench press beats last time's 60 kg × 10; push-up does what it did then.
  await numberOf(page, "Bench press (barbell)").click();
  await logSheet(page).getByLabel("Weight for set 1, kg", { exact: true }).fill("62.5");
  await logSheet(page).getByLabel("Reps for set 1", { exact: true }).fill("10");
  await tick(logSheet(page), "Set 1").click();
  await done(logSheet(page)).click();
  await numberOf(page, "Push-up").click();
  await tick(logSheet(page), "Set 1").click();
  await done(logSheet(page)).click();
  await expect(logSheet(page)).toBeHidden();

  await finishTo(page, "Day A");
  // The header sums it up; nothing about the round.
  await expect(main(page)).toContainText("Wed, Nov 4");
  await expect(main(page)).toContainText("2 of 3 exercises");
  await expect(main(page)).toContainText("1 min · 2 sets");
  await expect(main(page)).not.toContainText("Round 1");
  // Every exercise done, with its sets and its change against last time; the best is tagged.
  const exercises = card(page, "Exercises · 2");
  await expect(exercises).toContainText("▲ 1 vs last");
  const best = exercises.getByRole("button", { name: "Bench press (barbell): 62.5 kg × 10; up 2.5 kg; new best. Open its history" });
  await expect(best).toContainText("Best");
  await expect(best).toContainText("▲ 2.5");
  await expect(exercises.getByRole("button", { name: "Push-up: 15 reps; same as last time. Open its history" })).toBeVisible();
  // Not done: the main exercise skipped; the optional one opens from the line under it.
  const notDone = card(page, "Not done · 1");
  await expect(notDone).toContainText("Incline dumbbell press");
  await expect(notDone.getByText("Plank")).toBeHidden();
  await notDone.getByText("1 optional one skipped").click();
  await expect(notDone.getByText("Plank")).toBeVisible();
  await expect(card(page, "More").getByRole("button", { name: "Not finished? Continue Day A" })).toBeVisible();
  // A best opens the exercise's history.
  await best.click();
  const history = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close history" }) });
  await expect(history.getByRole("heading", { name: "Bench press (barbell)" })).toBeVisible();
  await history.getByRole("button", { name: "Close history" }).click();
  await expect(history).toBeHidden();

  // Done: the round page, where "How it went" says the tally and opens the result again.
  await closeResult(page);
  const again = main(page).getByRole("button", { name: "How Day A went" });
  await expect(again).toContainText("▲ 1");
  await tapOnRound(page, again);
  await expect(resultTitle(page, "Day A")).toBeVisible();
  await expect(best).toBeVisible();
  await closeResult(page);
  await expect(bottomButton(page, "Reopen Day A")).toBeVisible();
});

appTest("Finish with nothing logged has three answers: back to the workout, finish anyway, or cancel it", async ({ page }) => {
  await start(page, "Day A");
  const before = await readState(page);
  const question = dialog(page, "Nothing is logged");
  await main(page).getByRole("button", { name: "Finish Day A" }).click();
  await expect(question).toContainText("Day A has no sets and nothing marked done.");
  await question.getByRole("button", { name: "Back to workout" }).click();
  await expect(question).toBeHidden();
  await expect(backToRound(page)).toBeVisible();
  assert.deepEqual(await readState(page), before, "nothing changes");
  // Escape does the same.
  await roundSettles(page);
  await main(page).getByRole("button", { name: "Finish Day A" }).click();
  await expect(question.getByRole("button", { name: "Cancel workout" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(question).toBeHidden();
  assert.deepEqual(await readState(page), before);
  // Finish anyway files it as it is (Cancel workout: see "Logging").
  await roundSettles(page);
  await finishTo(page, "Day A", { nothingLogged: true });
  assert.deepEqual((await todaySaved(page)).routineIds, ["day-a"]);
});

appTest("A finished workout is deleted from its result page after a confirmation; the round page and Log no longer show it", async ({ page }) => {
  await start(page, "Day A");
  await numberOf(page, "Push-up").click();
  await tick(logSheet(page), "Set 1").click();
  await done(logSheet(page)).click();
  await expect(logSheet(page)).toBeHidden();
  await finishTo(page, "Day A");

  const deleteButton = card(page, "More").getByRole("button", { name: "Delete this workout" });
  const confirm = dialog(page, "Delete Day A from Wed, Nov 4?");
  await deleteButton.click();
  await expect(confirm).toContainText("Its 1 set and done marks are deleted. This can't be undone.");
  await tapOnRound(page, confirm.getByRole("button", { name: "Keep it" }));
  await expect(confirm).toBeHidden();
  await expect(resultTitle(page, "Day A")).toBeVisible();
  assert.deepEqual((await todaySaved(page)).routineIds, ["day-a"], "kept");

  await deleteButton.click();
  await tapOnRound(page, confirm.getByRole("button", { name: "Delete workout" }));
  await expect(page.getByText("Workout deleted.")).toBeVisible();
  // Back on the round page, as if it had never been done; counting stays started.
  await expect(row(page, "Day A, not done, next")).toBeVisible();
  await expect(main(page)).toContainText("0 of 2 workouts done");
  await expect(startButton(page, "Day A")).toBeVisible();
  const saved = await readState(page);
  assert.equal(saved.sessions[TODAY], undefined);
  assert.deepEqual(saved.settings.round, { number: 1, block: 1, programId: "sample", since: TODAY });

  await roundSettles(page);
  await goToView(page, "Log");
  await expect(main(page).getByRole("button", { name: /^Wednesday, November 4, 2026, today/ })).toBeVisible();
  await expect(main(page).getByRole("button", { name: /^Wednesday, November 4, 2026, today, 1 finished workout/ })).toHaveCount(0);
  await expect(main(page).getByRole("button", { name: /^Open Wednesday, November 4, 2026/ })).toHaveCount(0);
});

appTest("Leaving a workout in progress: the running bar shows on every other page and brings it back", async ({ page }) => {
  await tapOnRound(page, roundRow(page, "Day B"));
  await start(page, "Day B");
  await goToView(page, "Program");
  await expect(runningBar(page)).toHaveAccessibleName("Day B in progress, 0 of 2 done. Back to the workout");
  await expect(runningBar(page)).toContainText("next: Squat");
  await roundSettles(page); // the bar has just taken the bottom button's place
  await runningBar(page).click();
  await expect(backToRound(page)).toBeVisible();
  await expectView(page, "Workout");
  await expect(runningBar(page)).toHaveCount(0);

  // Back to the round page: the workout's row says so, the others are quiet, the bar is at the bottom.
  await tapOnRound(page, backToRound(page));
  await expect(main(page)).toContainText("In progress");
  await expect(main(page)).toContainText("0 of 2 done");
  await expect(roundRow(page, "Day A")).toHaveCount(0);
  await expect(runningBar(page)).toBeVisible();
  // The Workout tab leads to the workout, from here and from another tab.
  await goToView(page, "Workout");
  await expect(backToRound(page)).toBeVisible();
  await goToView(page, "Log");
  await expect(runningBar(page)).toBeVisible();
  await goToView(page, "Workout");
  await expect(backToRound(page)).toBeVisible();
  assert.equal((await readState(page)).settings.activeWorkout.routineId, "day-b");
});

appTest("A slot's row opens in place: Last time opens the history, Details the reference, and History there shows the past session", async ({ page }) => {
  // Both sheets are titled with the exercise's name, so they're told apart by their close buttons.
  const reference = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close exercise reference" }) });
  const history = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close history" }) });

  await start(page, "Day A");
  const before = await readState(page);
  await rowOf(page, "Bench press (barbell)").click();
  // The open slot's "Last time" line is a link to the exercise's history.
  const lastTime = main(page).getByRole("button", { name: /^Last time .*Open history of Bench press \(barbell\)$/ });
  await expect(lastTime).toContainText("60 kg × 10, 9 · 57.5 kg × 8 +1 drop");
  await lastTime.click();
  await expect(history.getByRole("heading", { name: "Bench press (barbell)" })).toBeVisible();
  await history.getByRole("button", { name: "Close history" }).click();
  await expect(history).toBeHidden();

  // Details, Video and History share one row.
  await main(page).getByRole("button", { name: "History of Bench press (barbell)", exact: true }).click();
  await expect(history.getByRole("heading", { name: "Bench press (barbell)" })).toBeVisible();
  await history.getByRole("button", { name: "Close history" }).click();
  await main(page).getByRole("button", { name: "Open exercise page for Bench press (barbell)" }).click();
  await expect(reference.getByRole("heading", { name: "Bench press (barbell)" })).toBeVisible();
  await expect(reference).toContainText("In this workout");
  await expect(reference).toContainText("3 × 8–12");
  await expect(reference).toContainText("Feet planted.");
  await expect(reference.getByRole("button", { name: "Easier Push-up" })).toBeVisible();

  await reference.getByRole("button", { name: "History" }).click();
  await expect(history.getByRole("heading", { name: "Bench press (barbell)" })).toBeVisible();
  await expect(history).toContainText("1 session");
  await expect(history).toContainText("60 kg × 10"); // the best set
  const sessions = history.getByRole("region", { name: "Sessions" });
  await expect(sessions).toContainText("Day A");
  await expect(sessions).toContainText(/57\.5\s*kg\s*×\s*8/);
  await expect(sessions).toContainText(/Drop\s*45\s*kg\s*×\s*6/);

  await history.getByRole("button", { name: "Close history" }).click();
  await expect(history).toBeHidden();
  await expect(reference).toBeVisible();
  assert.deepEqual(await readState(page), before, "looking things up changes nothing");
});

appTest("A two-choice slot swaps to its alternative for today, logs it, and the Log day shows its sets", async ({ page }) => {
  // On Program, the choices sheet lists both.
  await goToView(page, "Program");
  await main(page).getByRole("button", { name: `Show ${TWO_CHOICES} details` }).click();
  await main(page).getByRole("button", { name: `Open exercise choices for ${TWO_CHOICES}` }).click();
  const choices = dialog(page, "Exercise choices");
  await expect(choices.getByRole("button", { name: "Open reference for Incline dumbbell press (dumbbell)" })).toContainText("3 × 10");
  await expect(choices.getByRole("button", { name: "Open reference for Cable fly (cable)" })).toContainText("2 × 12–15");
  await expect(choices).toContainText("Pick by how the shoulder feels.");
  await choices.getByRole("button", { name: "Close exercise choices" }).click();
  await expect(choices).toBeHidden();

  await goToView(page, "Workout");
  await start(page, "Day A");
  await rowOf(page, TWO_CHOICES).click();
  await expect(rowOf(page, TWO_CHOICES)).toHaveAttribute("aria-expanded", "true");
  await expect(main(page)).toContainText("Pick by how the shoulder feels.");
  // "Swap to": the slot shows the other choice for today; nothing is saved yet.
  await tapOnRound(page, main(page).getByRole("button", { name: "Swap to Cable fly (cable) for today" }));
  await expect(main(page)).toContainText("2 × 12–15");
  await expect(main(page).getByRole("button", { name: "Swap to Incline dumbbell press (dumbbell) for today" })).toBeVisible();
  await expect(bottomButton(page, "Log sets for Cable fly (cable)")).toBeVisible();
  assert.equal((await todaySaved(page)), undefined);
  // A reload (iOS reloads an app left in the background) keeps the swap and the open slot.
  await page.reload();
  await expect(backToRound(page)).toBeVisible();
  await expect(rowOf(page, TWO_CHOICES)).toHaveAttribute("aria-expanded", "true");
  await expect(main(page).getByRole("button", { name: "Swap to Incline dumbbell press (dumbbell) for today" })).toBeVisible();
  await expect(bottomButton(page, "Log sets for Cable fly (cable)")).toBeVisible();

  await tapOnRound(page, bottomButton(page, "Log sets for Cable fly (cable)"));
  const sheet = logSheet(page);
  await expect(sheet.getByRole("heading", { name: "Cable fly (cable)" })).toBeVisible();
  await sheet.getByLabel("Weight for set 1, kg", { exact: true }).fill("20");
  await sheet.getByLabel("Reps for set 1", { exact: true }).fill("12");
  await tick(sheet, "Set 1").click();
  await done(sheet).click();
  await expect(sheet).toBeHidden();
  await expect(rowOf(page, TWO_CHOICES)).toContainText("20 kg × 12");

  // Swapping back once sets are saved asks before moving them.
  await rowOf(page, TWO_CHOICES).click();
  await main(page).getByRole("button", { name: "Swap to Incline dumbbell press (dumbbell) for today" }).click();
  await tapOnRound(page, dialog(page, "Switch to Incline dumbbell press (dumbbell)?").getByRole("button", { name: "Keep as it is" }));
  await logSheet(page).getByRole("button", { name: "Close", exact: true }).first().click();

  const saved = await readState(page);
  assert.deepEqual(saved.sessions[TODAY].logs, {
    a3: { routineId: "day-a", exerciseId: "cable-fly", exerciseName: "Cable fly (cable)", unit: "reps", sets: [{ kg: 20, reps: 12, drops: [] }] },
  });
  assert.deepEqual(saved.sessions[PAST_DAY], sampleState().sessions[PAST_DAY], "the earlier day is untouched");

  await goToView(page, "Log");
  await main(page).getByRole("button", { name: /^Wednesday, November 4, 2026/ }).click();
  const day = dialog(page, "Wednesday, November 4");
  await expect(day).toContainText("Logged sets");
  await expect(day).toContainText("Cable fly");
  await expect(day).toContainText(/20\s*kg\s*×\s*12/);
});

appTest("Rounds: set the round you're on, a round takes every workout once and the next opens by itself", async ({ page }) => {
  // A closed round as it is saved: its program's name then, how many workouts it asked for and how many were done.
  const closedRound = (number, done, ended) => ({ number, block: 1, program: "Sample program", programId: "sample", required: 2, done, ended });

  // Before anything is counted, the round can be set; Start would otherwise begin at round 1.
  await expect(main(page)).toContainText("Following Sample program");
  await expect(roundTitle(page, "Round 1")).toBeVisible();
  await main(page).getByRole("button", { name: "Already on a later round? Set it" }).click();
  const sheet = dialog(page, "Change round number");
  await sheet.getByRole("button", { name: "One round more" }).click();
  await sheet.getByRole("button", { name: "One round more" }).click();
  await tapOnRound(page, sheet.getByRole("button", { name: "Save round number" }));
  await expect(roundTitle(page, "Round 3")).toBeVisible();
  await expect(main(page)).toContainText("0 of 2 workouts done");
  assert.deepEqual((await readState(page)).settings.round, { number: 3, block: 1, programId: "sample", since: TODAY });

  // Start, then finish with nothing logged (it asks once): the round is one further.
  await start(page, "Day A");
  await finish(page, "Day A", { nothingLogged: true });
  await expect(roundTitle(page, "Round 3")).toBeVisible();
  await expect(main(page)).toContainText("1 of 2 workouts done");
  await expect(row(page, "Day A, done today")).toHaveAttribute("aria-expanded", "true");

  // The other workout completes the round, and the next one opens.
  await tapOnRound(page, roundRow(page, "Day B"));
  await start(page, "Day B");
  await finish(page, "Day B", { nothingLogged: true });
  await expect(roundTitle(page, "Round 4")).toBeVisible();
  await expect(main(page).getByRole("button", { name: "Round 3 complete, 2 of 2 in 1 day. Open the round." })).toBeVisible();
  await expect(main(page)).toContainText("0 of 2 workouts done");
  let saved = await readState(page);
  assert.deepEqual(saved.settings.roundLog, [closedRound(3, 2, "complete")]);
  assert.deepEqual(saved.settings.round, { number: 4, block: 1, programId: "sample", since: TODAY });
  assert.deepEqual([saved.sessions[TODAY].workouts["day-a"].round, saved.sessions[TODAY].workouts["day-b"].round], [3, 3]);

  // Today's last workout is open; reopened, it stays in the round it was filed in.
  await expect(main(page)).toContainText("Round 3");
  await roundSettles(page);
  await tapOnRound(page, bottomButton(page, "Reopen Day B"));
  await tapOnRound(page, main(page).getByRole("button", { name: "Close again" }));
  await expect(bottomButton(page, "Reopen Day B")).toBeVisible();
  saved = await readState(page);
  assert.deepEqual([saved.sessions[TODAY].routineIds, saved.sessions[TODAY].workouts["day-b"].round, saved.settings.round.number], [["day-a", "day-b"], 3, 4]);

  // Rounds and blocks lists the closed round with its program and what was done in it.
  await tapOnRound(page, main(page).getByRole("button", { name: /^Rounds and blocks/ }));
  const closed = main(page).getByRole("button", { name: /^Round 3, Sample program, .*\. 2 of 2 workouts, complete\. Open the round\.$/ });
  await expect(closed).toContainText("2 of 2");
  await expect(main(page).getByRole("button", { name: /^Round 4, Sample program, .*\. 0 of 2 workouts, in progress\. Open the round\.$/ })).toBeVisible();
  await tapOnRound(page, main(page).getByRole("button", { name: "Back to Round" }));
  await expect(roundTitle(page, "Round 4")).toBeVisible();

  // The next day, round 4 starts with Day A.
  await nextDay(page);
  await expect(row(page, "Day A, not done, next")).toHaveAttribute("aria-expanded", "true");
  await expect(main(page).getByRole("button", { name: /^Round 3 complete/ })).toHaveCount(0);
});

appTest("Following a different program as a new block ends the open round and starts round 1 of block 2", { saved: twoPrograms() }, async ({ page }) => {
  await expect(main(page)).toContainText("Following Sample program");
  await expect(roundTitle(page, "Round 5")).toBeVisible();
  await expect(main(page)).toContainText("1 of 2 workouts done");

  // On Program: look at the other program, then "Follow Block 2" says what will happen.
  await goToView(page, "Program");
  await programPicker(page, "Sample program").click();
  await dialog(page, "Programs").getByRole("button", { name: /^Block 2/ }).click();
  await main(page).getByRole("button", { name: "Follow Block 2" }).click();
  const follow = dialog(page, "Follow Block 2?");
  await expect(follow).toContainText("Ends here, with 1 of 2 workouts done");
  await expect(follow.getByRole("button", { name: "End round 5 and follow Block 2" })).toBeVisible();
  await follow.getByRole("button", { name: "Start a new block with Block 2" }).click();
  await expect(follow).toBeHidden();

  await goToView(page, "Workout");
  await expect(main(page)).toContainText("Following Block 2");
  await expect(roundTitle(page, "Round 1 · block 2")).toBeVisible();
  await expect(main(page)).toContainText("0 of 1 workout done");
  await expect(startButton(page, "Day X")).toBeVisible();
  const saved = await readState(page);
  assert.deepEqual(saved.settings.round, { number: 1, block: 2, programId: "block-2", since: TODAY });
  assert.deepEqual(saved.settings.roundLog, [{ number: 5, block: 1, program: "Sample program", programId: "sample", required: 2, done: 1, ended: "switch" }]);
  assert.deepEqual([saved.settings.activeProgramId, saved.settings.activeRoutineId], ["block-2", "day-x"]);
  assert.deepEqual(saved.sessions, twoPrograms().sessions, "past rounds and workouts stay as they are");
});

appTest("A workout from another program is listed in the round as an extra and changes no count", { saved: twoPrograms() }, async ({ page }) => {
  await main(page).getByRole("button", { name: "A workout from another program" }).click();
  const sheet = dialog(page, "A workout from another program");
  await expect(sheet).toContainText("You keep following Sample program.");
  await tapOnRound(page, sheet.getByRole("button", { name: "Start Day X from Block 2" }));
  await expect(backToRound(page)).toBeVisible();
  await expect(main(page)).toContainText("Extra · Block 2");
  await expect(numberOf(page, "Squat (barbell)")).toHaveText("1");

  // While it runs, the program followed and the round's count are what they were.
  await tapOnRound(page, backToRound(page));
  await expect(main(page)).toContainText("Following Sample program");
  await expect(main(page)).toContainText("1 of 2 workouts done");
  await expect(main(page)).toContainText("In progress");
  await roundSettles(page);
  await runningBar(page).click();
  await finish(page, "Day X", { nothingLogged: true });

  await expect(main(page)).toContainText("Following Sample program");
  await expect(roundTitle(page, "Round 5")).toBeVisible();
  await expect(main(page)).toContainText("1 of 2 workouts done");
  // Listed with the round's workouts, tagged with its program's name.
  await expect(doneRow(page, "Day X, Block 2")).toBeVisible();
  await expect(roundRow(page, "Day B")).toBeVisible();
  const saved = await readState(page);
  assert.deepEqual(saved.sessions[TODAY].workouts, { "day-x": { name: "Day X", program: "Block 2", minutes: 1, round: 5, block: 1, guest: true } });
  assert.deepEqual(saved.settings.round, twoPrograms().settings.round);
  assert.equal(saved.settings.roundLog, undefined, "no round was closed");
  assert.equal(saved.settings.activeProgramId, "sample");
  assert.equal(saved.settings.activeWorkout, null);
});
