// Workout: following a routine, logging sets from a slot's number, completing the
// routine, the exercise reference and history, and a slot with two choices.

import assert from "node:assert/strict";
import { PAST_DAY, sampleState } from "../sample.mjs";
import { TODAY, dialog, escapeRegExp, expect, goToView, main, programPicker, readState, routineTab, suite } from "./helpers.mjs";

const { appTest } = suite({ saved: sampleState() });

const TWO_CHOICES = "Incline dumbbell press or Cable fly";

// A slot's number box (it opens the logging sheet) and the rest of its row.
const numberOf = (page, title) => main(page).getByRole("button", { name: new RegExp(`^Log sets for ${escapeRegExp(title)}(, |$)`) });
const rowOf = (page, title) => main(page).getByRole("button", { name: `View ${title} details`, exact: true });
const choicesRow = (page) => main(page).getByRole("button", { name: `Open exercise choices for ${TWO_CHOICES}`, exact: true });
const logSheet = (page) => page.getByRole("dialog").filter({ has: page.getByRole("region", { name: "Last 3 times" }) });
const tick = (sheet, name) => sheet.getByRole("button", { name: `${name} done`, exact: true });
const done = (sheet) => sheet.getByRole("button", { name: "Done", exact: true });
const todaySaved = async (page) => (await readState(page)).sessions[TODAY];

appTest("Workout shows the selected routine's numbered slots, and the routine you pick is kept", async ({ page }) => {
  await expect(programPicker(page, "Sample program")).toBeVisible();
  await expect(routineTab(page, "Day A")).toHaveAttribute("aria-pressed", "true");
  await expect(main(page)).toContainText("Start light.");
  for (const [title, number] of [["Plank", "1"], ["Bench press", "2"], [TWO_CHOICES, "3"], ["Push-up", "4"]]) {
    await expect(numberOf(page, title)).toHaveText(number);
  }
  await expect(rowOf(page, "Plank")).toContainText("2 × 30 sec");
  await expect(rowOf(page, "Bench press")).toContainText("3 × 8–12");
  await expect(choicesRow(page)).toContainText("3 × 10 or 2 × 12–15");
  await expect(choicesRow(page)).toContainText("Pick by how the shoulder feels.");

  await routineTab(page, "Day B").click();
  await expect(routineTab(page, "Day B")).toHaveAttribute("aria-pressed", "true");
  await expect(numberOf(page, "Squat")).toHaveText("1");
  await expect(numberOf(page, "Pull-up")).toHaveText("2");
  await expect(numberOf(page, "Bench press")).toHaveCount(0);

  await page.reload();
  await expect(routineTab(page, "Day B")).toHaveAttribute("aria-pressed", "true");
  await expect(rowOf(page, "Squat")).toContainText("3 × 5");
  assert.equal((await readState(page)).settings.activeRoutineId, "day-b");
});

appTest("Logging: a tick takes last time's set, typed sets and a drop are saved, and Done shows them on Workout", async ({ page }) => {
  await numberOf(page, "Bench press").click();
  const sheet = logSheet(page);
  await expect(sheet.getByRole("heading", { name: "Bench press" })).toBeVisible();
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

  await sheet.getByRole("button", { name: "Drop set" }).click();
  await sheet.getByLabel("Weight for drop 1 after set 2, kg", { exact: true }).fill("50");
  await sheet.getByLabel("Reps for drop 1 after set 2", { exact: true }).fill("6");
  await tick(sheet, "Drop 1 after set 2").click();
  await expect(tick(sheet, "Drop 1 after set 2")).toHaveAttribute("aria-pressed", "true");

  await done(sheet).click();
  await expect(sheet).toBeHidden();
  await expect(numberOf(page, "Bench press")).toHaveAccessibleName("Log sets for Bench press, done");
  await expect(rowOf(page, "Bench press")).toContainText(/60\s*kg\s*×\s*10/);
  await expect(rowOf(page, "Bench press")).toContainText(/62\.5\s*kg\s*×\s*8/);
  await expect(rowOf(page, "Bench press")).toContainText("+ 1 drop");

  await page.reload();
  await expect(numberOf(page, "Bench press")).toHaveAccessibleName("Log sets for Bench press, done");
  await expect(rowOf(page, "Bench press")).toContainText(/62\.5\s*kg\s*×\s*8/);
  assert.deepEqual(await todaySaved(page), {
    routineIds: [],
    checkedEntryIdsByRoutine: { "day-a": ["a2"] },
    note: "",
    logs: {
      a2: {
        routineId: "day-a",
        exerciseId: "bench-press",
        exerciseName: "Bench press",
        unit: "reps",
        sets: [{ kg: 60, reps: 10, drops: [] }, { kg: 62.5, reps: 8, drops: [{ kg: 50, reps: 6 }] }],
      },
    },
  });
});

appTest("Done on every Main slot completes the routine for today, and Not done undoes it", async ({ page }) => {
  for (const title of ["Bench press", TWO_CHOICES, "Push-up"]) {
    await numberOf(page, title).click();
    await done(logSheet(page)).click();
    await expect(numberOf(page, title)).toHaveAccessibleName(`Log sets for ${title}, done`);
  }
  // The Optional warm-up slot was left alone and doesn't hold the routine back.
  assert.deepEqual(await todaySaved(page), { routineIds: ["day-a"], checkedEntryIdsByRoutine: { "day-a": ["a2", "a3", "a4"] }, note: "", logs: {} });
  await goToView(page, "Log");
  await expect(main(page).getByRole("button", { name: "Wednesday, November 4, 2026, today, 1 completed routine", exact: true })).toBeVisible();
  await expect(main(page).getByRole("button", { name: "Open Wednesday, November 4, 2026. Day A. Sample program", exact: true })).toBeVisible();

  await goToView(page, "Workout");
  await numberOf(page, "Push-up").click();
  const sheet = logSheet(page);
  await sheet.getByRole("button", { name: "Not done" }).click();
  await expect(sheet).toBeHidden(); // Not done closes the sheet
  await expect(numberOf(page, "Push-up")).toHaveAccessibleName("Log sets for Push-up");
  assert.deepEqual(await todaySaved(page), { routineIds: [], checkedEntryIdsByRoutine: { "day-a": ["a2", "a3"] }, note: "", logs: {} });

  // Finish workout counts the day with only part of it done; Not finished takes it back.
  await main(page).getByRole("button", { name: "Finish workout" }).click();
  assert.deepEqual(await todaySaved(page), { routineIds: ["day-a"], checkedEntryIdsByRoutine: { "day-a": ["a2", "a3"] }, note: "", logs: {} });
  await goToView(page, "Log");
  await expect(main(page).getByRole("button", { name: "Wednesday, November 4, 2026, today, 1 completed routine", exact: true })).toBeVisible();
  await goToView(page, "Workout");
  await main(page).getByRole("button", { name: "Not finished" }).click();
  assert.deepEqual(await todaySaved(page), { routineIds: [], checkedEntryIdsByRoutine: { "day-a": ["a2", "a3"] }, note: "", logs: {} });
});

appTest("A slot's row opens the exercise reference, and History there shows the past session", async ({ page }) => {
  // Both sheets are titled with the exercise's name, so they're told apart by their close buttons.
  const reference = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close exercise reference" }) });
  const history = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close history" }) });

  await rowOf(page, "Bench press").click();
  await expect(reference.getByRole("heading", { name: "Bench press" })).toBeVisible();
  await expect(reference).toContainText("Routine prescription");
  await expect(reference).toContainText("3 × 8–12");
  await expect(reference).toContainText("Feet planted.");
  await expect(reference.getByRole("button", { name: "Easier Push-up" })).toBeVisible();

  await reference.getByRole("button", { name: "History" }).click();
  await expect(history.getByRole("heading", { name: "Bench press" })).toBeVisible();
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
  await choicesRow(page).click();
  const choices = dialog(page, "Exercise choices");
  await expect(choices.getByRole("button", { name: "Open reference for Incline dumbbell press" })).toContainText("3 × 10");
  await expect(choices.getByRole("button", { name: "Open reference for Cable fly" })).toContainText("2 × 12–15");
  await expect(choices).toContainText("Pick by how the shoulder feels.");
  await choices.getByRole("button", { name: "Close exercise choices" }).click();
  await expect(choices).toBeHidden();

  await numberOf(page, TWO_CHOICES).click();
  const sheet = logSheet(page);
  await expect(sheet.getByRole("heading", { name: "Incline dumbbell press" })).toBeVisible();
  await sheet.getByRole("group", { name: "Exercise you're doing" }).getByRole("button", { name: "Cable fly" }).click();
  await expect(sheet.getByRole("heading", { name: "Cable fly" })).toBeVisible();
  await sheet.getByLabel("Weight for set 1, kg", { exact: true }).fill("20");
  await sheet.getByLabel("Reps for set 1", { exact: true }).fill("12");
  await tick(sheet, "Set 1").click();
  await done(sheet).click();
  await expect(sheet).toBeHidden();
  await expect(choicesRow(page)).toContainText(/20\s*kg\s*×\s*12/);

  const saved = await readState(page);
  assert.deepEqual(saved.sessions[TODAY].logs, {
    a3: { routineId: "day-a", exerciseId: "cable-fly", exerciseName: "Cable fly", unit: "reps", sets: [{ kg: 20, reps: 12, drops: [] }] },
  });
  assert.deepEqual(saved.sessions[PAST_DAY], sampleState().sessions[PAST_DAY], "the earlier day is untouched");

  await goToView(page, "Log");
  await main(page).getByRole("button", { name: /^Wednesday, November 4, 2026/ }).click();
  const day = dialog(page, "Wednesday, November 4");
  await expect(day).toContainText("Logged sets");
  await expect(day).toContainText("Cable fly");
  await expect(day).toContainText(/20\s*kg\s*×\s*12/);
});
