// Workout and Round: previewing a workout, logging sets from a slot's number, a whole
// workout from Start to the Log, the exercise reference and history, a slot with two
// choices; and the round count: counting rounds, following a different program, and a
// workout from another program.

import assert from "node:assert/strict";
import { PAST_DAY, sampleState } from "../sample.mjs";
import { TODAY, TOMORROW, dialog, escapeRegExp, expect, expectView, goToView, main, nextDay, readState, roundRow, startButton, suite, tapOnRound } from "./helpers.mjs";

const { appTest } = suite({ saved: sampleState() });

const TWO_CHOICES = "Incline dumbbell press (dumbbell) or Cable fly (cable)";

// A slot's number box (it opens the logging sheet) and the rest of its row.
const numberOf = (page, title) => main(page).getByRole("button", { name: new RegExp(`^Log sets for ${escapeRegExp(title)}(, |$)`) });
const rowOf = (page, title) => main(page).getByRole("button", { name: `View ${title} details`, exact: true });
const choicesRow = (page) => main(page).getByRole("button", { name: `Open exercise choices for ${TWO_CHOICES}`, exact: true });
const logSheet = (page) => page.getByRole("dialog").filter({ has: page.getByRole("region", { name: "Last 3 times" }) });
const tick = (sheet, name) => sheet.getByRole("button", { name: `${name} done`, exact: true });
const done = (sheet) => sheet.getByRole("button", { name: "Exercise done", exact: true });
const todaySaved = async (page) => (await readState(page)).sessions[TODAY];

// "Round 3" at the top of the Round tab ("Round 1 · block 2" from the second block on).
const roundTitle = (page, name) => main(page).getByRole("heading", { level: 1, name, exact: true });
// A done row of "Workouts in this round" (it opens its day).
const doneRow = (page, name) => main(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}, done .+\\. Open that day\\.$`) });
// A row of the Round tab's "More" list (some end with a small note, as "All rounds 1 earlier").
const more = (page, name) => main(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}`) });
// The Round tab's card starts the workout it names at once, on Workout.
const startFromRound = async (page, routine) => {
  await tapOnRound(page, main(page).getByRole("button", { name: `Start ${routine}`, exact: true }));
  await expectView(page, "Workout");
};
// Finish workout, its summary, then its result; closing the result returns to the Round tab.
const finish = async (page) => {
  await main(page).getByRole("button", { name: "Finish workout" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Finish", exact: true }).click();
  await tapOnRound(page, page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }));
  await expectView(page, "Round");
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

appTest("Workout previews the selected workout's numbered slots, and the workout picked on Round is kept", async ({ page }) => {
  await goToView(page, "Workout");
  await expect(startButton(page, "Day A")).toBeVisible();
  await expect(main(page)).toContainText("Start light.");
  for (const [title, number] of [["Plank", "1"], ["Bench press (barbell)", "2"], [TWO_CHOICES, "3"], ["Push-up", "4"]]) {
    await expect(numberOf(page, title)).toHaveText(number);
  }
  await expect(rowOf(page, "Plank")).toContainText("2 × 30 sec");
  await expect(rowOf(page, "Bench press (barbell)")).toContainText("3 × 8–12");
  // A quiet row: the movement and the sets of the choice it shows. Tapping it opens the rest in place.
  await expect(rowOf(page, TWO_CHOICES)).toContainText("3 × 10");
  await expect(main(page)).not.toContainText("Pick by how the shoulder feels.");
  await rowOf(page, TWO_CHOICES).click();
  await expect(rowOf(page, TWO_CHOICES)).toHaveAttribute("aria-expanded", "true");
  await expect(main(page)).toContainText("Pick by how the shoulder feels.");
  await expect(choicesRow(page)).toContainText("Cable fly");
  await rowOf(page, TWO_CHOICES).click();
  await expect(main(page)).not.toContainText("Pick by how the shoulder feels.");

  // Another workout is picked on the Round tab: its row opens it on Workout, ready to start.
  await goToView(page, "Round");
  await tapOnRound(page, roundRow(page, "Day B"));
  await expectView(page, "Workout");
  await expect(startButton(page, "Day B")).toBeVisible();
  await expect(numberOf(page, "Squat (barbell)")).toHaveText("1");
  await expect(numberOf(page, "Pull-up")).toHaveText("2");
  await expect(numberOf(page, "Bench press (barbell)")).toHaveCount(0);

  await page.reload();
  await goToView(page, "Workout");
  await expect(startButton(page, "Day B")).toBeVisible();
  await expect(rowOf(page, "Squat (barbell)")).toContainText("3 × 5");
  assert.equal((await readState(page)).settings.activeRoutineId, "day-b");
});

appTest("Logging: a tick takes last time's set, typed sets and a drop are saved, and Done shows them on Workout", async ({ page }) => {
  await goToView(page, "Workout");
  // Nothing is logged before the workout is started.
  await numberOf(page, "Bench press (barbell)").click();
  await expect(page.getByText("Start the workout first.")).toBeVisible();
  // Start begins it at once; Cancel (after a confirmation) leaves nothing behind and returns to Round.
  await startButton(page, "Day A").click();
  await expect(main(page)).toContainText("Round 1 · in progress");
  await expect(main(page)).toContainText("0 min");
  // A tap on Cancel straight after Start is ignored (a double-tap on Start lands there), so retry.
  await expect(async () => {
    await main(page).getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog(page, "Cancel Day A?")).toBeVisible({ timeout: 400 });
  }).toPass();
  await dialog(page, "Cancel Day A?").getByRole("button", { name: "Cancel workout" }).click();
  await expectView(page, "Round");
  assert.equal((await readState(page)).settings.activeWorkout, null);
  assert.equal((await todaySaved(page)), undefined, "a cancelled workout leaves no day behind");

  // The Round tab's card starts the next workout too.
  await startFromRound(page, "Day A");
  await numberOf(page, "Bench press (barbell)").click();
  const sheet = logSheet(page);
  await expect(sheet.getByRole("heading", { name: "Bench press (barbell)" })).toBeVisible();
  await expect(sheet.getByRole("region", { name: "Last 3 times" })).toContainText("Day A");

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
  await expect(rowOf(page, "Bench press (barbell)")).toContainText("60 × 10 · 62.5 × 8 +1 drop");

  // Opened again, the app is on Round, whose card leads back to the workout in progress.
  await page.reload();
  await main(page).getByRole("button", { name: "Go to workout" }).click();
  await expect(numberOf(page, "Bench press (barbell)")).toHaveAccessibleName("Log sets for Bench press (barbell), done");
  await expect(rowOf(page, "Bench press (barbell)")).toContainText("62.5 × 8");
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

appTest("A workout: Done and Not done on slots, an exercise added for today, and Finish files it in the Log", async ({ page }) => {
  await goToView(page, "Workout");
  await startButton(page, "Day A").click();
  // Done with no sets asks first.
  await numberOf(page, "Bench press (barbell)").click();
  await done(logSheet(page)).click();
  const confirm = dialog(page, "No sets logged");
  await expect(confirm).toContainText("Mark Bench press (barbell) done anyway?");
  await confirm.getByRole("button", { name: "Mark done anyway" }).click();
  await expect(numberOf(page, "Bench press (barbell)")).toHaveAccessibleName("Log sets for Bench press (barbell), done");

  await numberOf(page, "Push-up").click();
  await tick(logSheet(page), "Set 1").click();
  await done(logSheet(page)).click();
  await numberOf(page, "Push-up").click();
  await logSheet(page).getByRole("button", { name: "Not done" }).click();
  await expect(logSheet(page)).toBeHidden(); // Not done closes the sheet
  await expect(numberOf(page, "Push-up")).toHaveAccessibleName("Log sets for Push-up, 1 set logged");

  // "You sometimes add" offers what was added to this routine before; it joins today's list.
  await main(page).getByRole("button", { name: "Add Ab-wheel rollout for today" }).click();
  await expect(numberOf(page, "Ab-wheel rollout")).toHaveText("5");
  await expect(main(page).getByRole("button", { name: "Add Ab-wheel rollout for today" })).toHaveCount(0);
  await main(page).getByRole("button", { name: "Add exercise for today" }).click();
  await dialog(page, "Add exercise").getByRole("button", { name: "Add Squat (barbell) for today" }).click();
  await expect(numberOf(page, "Squat (barbell)")).toHaveText("6");
  assert.equal((await readState(page)).routines[0].entries.length, 4, "the program isn't changed");

  // Finish shows what's in each group, then files the workout.
  assert.deepEqual((await todaySaved(page)).routineIds, []);
  await main(page).getByRole("button", { name: "Finish workout" }).click();
  const summary = dialog(page, "Finish Day A?");
  await expect(summary.getByText("Done", { exact: true })).toBeVisible();
  await summary.getByText("Started, not marked done").click();
  await expect(summary).toContainText("Push-up");
  await summary.getByRole("button", { name: "Finish", exact: true }).click();
  // The result: what was done, against last time. Closing it returns to the Round tab.
  const result = dialog(page, "Day A finished");
  await expect(result).toContainText("Push-up");
  await result.getByRole("button", { name: "Close", exact: true }).click();
  await expectView(page, "Round");
  await expect(main(page)).toContainText("Done today");
  await expect(doneRow(page, "Day A")).toBeVisible();
  const saved = await readState(page);
  assert.deepEqual([saved.sessions[TODAY].routineIds, saved.sessions[TODAY].checkedEntryIdsByRoutine, saved.settings.activeWorkout], [["day-a"], { "day-a": ["a2"] }, null]);
  // Starting it started the count at round 1, and Workout has moved on to the round's next workout.
  assert.deepEqual(saved.sessions[TODAY].workouts, { "day-a": { name: "Day A", program: "Sample program", minutes: 1, round: 1, block: 1 } });
  assert.equal(saved.settings.activeRoutineId, "day-b");

  await goToView(page, "Log");
  await expect(main(page).getByRole("button", { name: /^Wednesday, November 4, 2026, today, 1 finished workout/ })).toBeVisible();
  // A recent day's second line starts with its round.
  await expect(main(page).getByRole("button", { name: /^Open Wednesday, November 4, 2026\. Day A\. Round 1\./ })).toContainText(/Round 1 · /);
});

appTest("A slot's row opens in place: Last time opens the history, Details the reference, and History there shows the past session", async ({ page }) => {
  // Both sheets are titled with the exercise's name, so they're told apart by their close buttons.
  const reference = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close exercise reference" }) });
  const history = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close history" }) });

  await goToView(page, "Workout");
  await rowOf(page, "Bench press (barbell)").click();
  // The open slot's "Last time" line is a link to the exercise's history.
  const lastTime = main(page).getByRole("button", { name: /^Last time .*Open history of Bench press \(barbell\)$/ });
  await expect(lastTime).toContainText("60 × 10, 9 · 57.5 × 8 +1 drop");
  await lastTime.click();
  await expect(history.getByRole("heading", { name: "Bench press (barbell)" })).toBeVisible();
  await history.getByRole("button", { name: "Close history" }).click();
  await expect(history).toBeHidden();

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
  assert.deepEqual(await readState(page), sampleState(), "looking things up changes nothing");
});

appTest("A two-choice slot lists both choices, logs the one you did, and the Log day shows its sets", async ({ page }) => {
  await goToView(page, "Workout");
  await rowOf(page, TWO_CHOICES).click();
  await choicesRow(page).click();
  const choices = dialog(page, "Exercise choices");
  await expect(choices.getByRole("button", { name: "Open reference for Incline dumbbell press (dumbbell)" })).toContainText("3 × 10");
  await expect(choices.getByRole("button", { name: "Open reference for Cable fly (cable)" })).toContainText("2 × 12–15");
  await expect(choices).toContainText("Pick by how the shoulder feels.");
  await choices.getByRole("button", { name: "Close exercise choices" }).click();
  await expect(choices).toBeHidden();

  await startButton(page, "Day A").click();
  await numberOf(page, TWO_CHOICES).click();
  const sheet = logSheet(page);
  await expect(sheet.getByRole("heading", { name: "Incline dumbbell press (dumbbell)" })).toBeVisible();
  await sheet.getByRole("group", { name: "Exercise you're doing" }).getByRole("button", { name: "Cable fly (cable)" }).click();
  await expect(sheet.getByRole("heading", { name: "Cable fly (cable)" })).toBeVisible();
  await sheet.getByLabel("Weight for set 1, kg", { exact: true }).fill("20");
  await sheet.getByLabel("Reps for set 1", { exact: true }).fill("12");
  await tick(sheet, "Set 1").click();
  await done(sheet).click();
  await expect(sheet).toBeHidden();
  await expect(rowOf(page, TWO_CHOICES)).toContainText("20 × 12");

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

appTest("Rounds: pick the round you're on, a round takes every workout once and the next opens by itself, and one can be ended early", async ({ page }) => {
  // A closed round as it is saved: its program's name then, how many workouts it asked for and how many were done.
  const closedRound = (number, done, ended) => ({ number, block: 1, program: "Sample program", programId: "sample", required: 2, done, ended });

  // The first time, the Round tab asks which round this is; nothing is counted until then.
  await expect(main(page)).toContainText("Following Sample program");
  await expect(main(page)).toContainText("not counting yet");
  await main(page).getByRole("button", { name: "One round more" }).click();
  await main(page).getByRole("button", { name: "One round more" }).click();
  await expect(roundTitle(page, "Round 3")).toBeVisible();
  await tapOnRound(page, main(page).getByRole("button", { name: "Start counting" }));
  await expect(main(page)).toContainText("Next workout");
  await expect(main(page)).toContainText("0 of 2 workouts done");
  assert.deepEqual((await readState(page)).settings.round, { number: 3, block: 1, programId: "sample", since: TODAY });

  // The card starts the next workout; finishing it returns here with the round one further.
  await startFromRound(page, "Day A");
  await expect(main(page)).toContainText("Round 3 · in progress");
  await finish(page);
  await expect(roundTitle(page, "Round 3")).toBeVisible();
  await expect(main(page)).toContainText("1 of 2 workouts done");
  await expect(doneRow(page, "Day A")).toBeVisible();

  // The other workout, opened from the round's list. Doing it completes the round, and the next one opens.
  await tapOnRound(page, roundRow(page, "Day B"));
  await expect(main(page)).toContainText("Round 3 · next workout");
  await startButton(page, "Day B").click();
  await finish(page);
  await expect(roundTitle(page, "Round 4")).toBeVisible();
  await expect(main(page)).toContainText("Round complete");
  await expect(main(page)).toContainText("0 of 2 workouts done");
  let saved = await readState(page);
  assert.deepEqual(saved.settings.roundLog, [closedRound(3, 2, "complete")]);
  assert.deepEqual(saved.settings.round, { number: 4, block: 1, programId: "sample", since: TODAY });
  assert.deepEqual([saved.sessions[TODAY].workouts["day-a"].round, saved.sessions[TODAY].workouts["day-b"].round], [3, 3]);

  // A workout reopened later stays in the round it was filed in.
  await goToView(page, "Workout");
  await main(page).getByRole("button", { name: "Reopen today's workout" }).click();
  // A tap straight after Reopen is ignored (as after Start), so retry.
  await expect(async () => {
    await main(page).getByRole("button", { name: "Close again" }).click();
    await expect(main(page).getByRole("button", { name: "Close again" })).toBeHidden({ timeout: 400 });
  }).toPass();
  saved = await readState(page);
  assert.deepEqual([saved.sessions[TODAY].routineIds, saved.sessions[TODAY].workouts["day-a"].round, saved.settings.round.number], [["day-b", "day-a"], 3, 4]);

  // All rounds lists the closed round with its program and what was done in it.
  await tapOnRound(page, more(page, "All rounds"));
  await expect(main(page).getByRole("heading", { name: "All rounds" })).toBeVisible();
  const closed = main(page).getByRole("button", { name: /^Round 3, Sample program, .*\. 2 of 2 workouts, complete\. Open the round\.$/ });
  await expect(closed).toContainText("Sample program");
  await expect(closed).toContainText("2 of 2");
  await expect(main(page).getByRole("button", { name: /^Round 4, Sample program, .*\. 0 of 2 workouts, in progress\. Open the round\.$/ })).toBeVisible();
  await tapOnRound(page, main(page).getByRole("button", { name: "Back to Round" }));
  await expect(roundTitle(page, "Round 4")).toBeVisible();

  // The next day: one workout into round 4, the round is ended where it stands.
  await nextDay(page);
  await startFromRound(page, "Day A");
  await expect(main(page)).toContainText("Round 4 · in progress");
  await finish(page);
  await expect(main(page)).toContainText("1 of 2 workouts done");
  await more(page, "End round 4 now").click();
  const confirm = dialog(page, "End round 4 now?");
  await expect(confirm).toContainText("Day B is left undone.");
  await confirm.getByRole("button", { name: "End round" }).click();
  await expect(page.getByRole("status")).toHaveText("Round 4 ended.");
  await expect(roundTitle(page, "Round 5")).toBeVisible();
  await expect(main(page)).toContainText("0 of 2 workouts done");
  saved = await readState(page);
  assert.deepEqual(saved.settings.roundLog, [closedRound(3, 2, "complete"), closedRound(4, 1, "early")]);
  assert.deepEqual(saved.settings.round, { number: 5, block: 1, programId: "sample", since: TOMORROW });
  assert.equal(saved.sessions[TOMORROW].workouts["day-a"].round, 4);
});

appTest("Following a different program as a new block ends the open round and starts round 1 of block 2", { saved: twoPrograms() }, async ({ page }) => {
  await expect(main(page)).toContainText("Following Sample program");
  await expect(roundTitle(page, "Round 5")).toBeVisible();
  await expect(main(page)).toContainText("1 of 2 workouts done");

  // More › Follow a different program: pick it, then the sheet says what will happen.
  await more(page, "Follow a different program").click();
  await dialog(page, "Follow a different program").getByRole("button", { name: /^Block 2/ }).click();
  const follow = dialog(page, "Follow Block 2?");
  await expect(follow).toContainText("Ends here, with 1 of 2 workouts done");
  await expect(follow.getByRole("button", { name: "End round 5 and follow Block 2" })).toBeVisible();
  await tapOnRound(page, follow.getByRole("button", { name: "Start a new block with Block 2" }));
  await expect(follow).toBeHidden();

  await expect(main(page)).toContainText("Following Block 2");
  await expect(roundTitle(page, "Round 1 · block 2")).toBeVisible();
  await expect(main(page)).toContainText("0 of 1 workout done");
  await expect(roundRow(page, "Day X")).toBeVisible();
  const saved = await readState(page);
  assert.deepEqual(saved.settings.round, { number: 1, block: 2, programId: "block-2", since: TODAY });
  assert.deepEqual(saved.settings.roundLog, [{ number: 5, block: 1, program: "Sample program", programId: "sample", required: 2, done: 1, ended: "switch" }]);
  assert.deepEqual([saved.settings.activeProgramId, saved.settings.activeRoutineId], ["block-2", "day-x"]);
  assert.deepEqual(saved.sessions, twoPrograms().sessions, "past rounds and workouts stay as they are");
});

appTest("A workout from another program is listed in the round as an extra and changes no count", { saved: twoPrograms() }, async ({ page }) => {
  await more(page, "A workout from another program").click();
  const sheet = dialog(page, "A workout from another program");
  await expect(sheet).toContainText("You keep following Sample program.");
  await tapOnRound(page, sheet.getByRole("button", { name: "Start Day X from Block 2" }));
  await expectView(page, "Workout");
  await expect(main(page)).toContainText("Round 5 · extra workout · Block 2");
  await expect(numberOf(page, "Squat (barbell)")).toHaveText("1");

  // While it runs, the program followed and the round's count are what they were.
  await goToView(page, "Round");
  await expect(main(page)).toContainText("Following Sample program");
  await expect(main(page)).toContainText("1 of 2 workouts done");
  await main(page).getByRole("button", { name: "Go to workout" }).click();
  await finish(page);

  // Going to the workout from the card changes nothing about what is followed.
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
