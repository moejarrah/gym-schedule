// Set logging: the logging sheet opened from a slot's number, suggestions from last
// time, drop chains, Done, today's sets on Workout, the exercise history sheet,
// multi-choice slots, and the sets shown on the Log day.

import assert from "node:assert/strict";
import { createDefaultState } from "../../js/store.js";
import { routineById, saveEntrySets } from "../../js/model.js";
import { STORAGE_KEY, expect, goToView, suite } from "./helpers.mjs";

const { appTest } = suite();

const PUSH = "push-a-glutes";
const CHEST = "push-a-glutes-entry-003";
const TODAY_KEY = "2026-11-04";

// Four earlier sessions of Machine chest press (the oldest falls outside "Last 3 times").
function stateWithHistory() {
  const state = createDefaultState();
  const entry = routineById(state, PUSH).entries.find((item) => item.id === CHEST);
  const log = (dateKey, sets) => saveEntrySets(state, { routineId: PUSH, entryId: CHEST, exerciseId: entry.choices[0].exerciseId, sets, dateKey });
  log("2026-10-07", [{ kg: 42.5, reps: 10 }]);
  log("2026-10-14", [{ kg: 45, reps: 10 }, { kg: 45, reps: 9 }]);
  log("2026-10-21", [{ kg: 47.5, reps: 10 }, { kg: 47.5, reps: 8 }]);
  log("2026-10-28", [{ kg: 50, reps: 10 }, { kg: 47.5, reps: 9, drops: [{ kg: 40, reps: 8 }] }]);
  return state;
}

// Saved data to start from, set once so reloads keep what the test changed.
const startWith = (state) => [`if (!localStorage.getItem(${JSON.stringify(STORAGE_KEY)})) localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(state))});`];

const main = (page) => page.getByRole("main");
const numberButton = (page, title) => main(page).getByRole("button", { name: new RegExp(`^Log sets for ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(, .*)?$`) });
const sheetOf = (page) => page.locator("#logDialog");
const savedLog = (page, entryId) => page.evaluate(([key, day, id]) => JSON.parse(localStorage.getItem(key)).sessions[day]?.logs[id] || null, [STORAGE_KEY, TODAY_KEY, entryId]);

appTest("logging: last 3 times, suggested values, drop chains, and Done shows the sets on Workout", { initScripts: startWith(stateWithHistory()) }, async ({ page, reload }) => {
  await numberButton(page, "Machine chest press").click();
  const sheet = sheetOf(page);
  await expect(sheet.getByRole("heading", { name: "Machine chest press" })).toBeVisible();

  // The last three sessions, newest first; the fourth is left out.
  const history = sheet.getByRole("region", { name: "Last 3 times" });
  await expect(history.locator(".log-history-row")).toHaveCount(3);
  await expect(history.locator(".log-history-row").first()).toContainText("Oct 28");
  await expect(history.locator(".log-history-row").first()).toContainText(/Drop\s*40\s*kg\s*×\s*8/);
  await expect(history).not.toContainText("Oct 7");

  // One row per planned set (2 × 8–12), with last time's values in grey.
  await expect(sheet.getByRole("button", { name: /^Set \d done$/ })).toHaveCount(2);
  await expect(sheet.getByLabel("Weight for set 1, kg")).toHaveAttribute("placeholder", "50");
  await expect(sheet.getByLabel("Reps for set 2")).toHaveAttribute("placeholder", "9");
  await expect(sheet.getByRole("button", { name: "50 × 10, copy last time to set 1" })).toBeVisible();

  // Ticking an empty row takes the suggestion; Enter in a field ticks its row.
  await sheet.getByRole("button", { name: "Set 1 done", exact: true }).click();
  await expect(sheet.getByRole("button", { name: "Set 1 done", exact: true })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByLabel("Weight for set 2, kg").fill("52,5");
  await sheet.getByLabel("Reps for set 2").fill("8");
  await sheet.getByLabel("Reps for set 2").press("Enter");
  await expect(sheet.getByLabel("Weight for set 2, kg")).toHaveValue("52.5");

  // Drops chain under the set just ticked, as many as wanted. Last time had a drop
  // here, so it's the suggestion; a drop beyond last time's suggests ~80% of the one before.
  await sheet.getByRole("button", { name: "Drop set" }).click();
  await expect(sheet.getByLabel("Weight for drop 1 after set 2, kg")).toHaveAttribute("placeholder", "40");
  await sheet.getByRole("button", { name: "Drop 1 after set 2 done" }).click();
  await sheet.getByRole("button", { name: "Another drop" }).click();
  await expect(sheet.getByLabel("Weight for drop 2 after set 2, kg")).toHaveAttribute("placeholder", "32.5");
  await sheet.getByLabel("Weight for drop 2 after set 2, kg").fill("30");
  await sheet.getByLabel("Reps for drop 2 after set 2").fill("6");

  // Done also saves the typed but unticked drop, and marks the exercise done.
  await sheet.getByRole("button", { name: "Done", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(numberButton(page, "Machine chest press")).toHaveAccessibleName("Log sets for Machine chest press, done");
  const sets = main(page).locator(".workout-item", { has: page.getByRole("button", { name: /^Log sets for Machine chest press/ }) }).locator(".workout-sets");
  await expect(sets).toContainText(/50\s*kg\s*×\s*10/);
  await expect(sets).toContainText("+ 2 drops");

  await reload();
  await expect(numberButton(page, "Machine chest press")).toHaveAccessibleName(/, done$/);
  assert.deepEqual((await savedLog(page, CHEST)).sets, [
    { kg: 50, reps: 10, drops: [] },
    { kg: 52.5, reps: 8, drops: [{ kg: 40, reps: 8 }, { kg: 30, reps: 6 }] },
  ]);
});

appTest("logging: a tick needs reps, unticking a set removes it with its drops, and closing doesn't mark it done", async ({ page }) => {
  await numberButton(page, "Low-incline dumbbell press").click();
  const sheet = sheetOf(page);
  await expect(sheet.getByRole("region", { name: "Last 3 times" })).toContainText("No sets logged for this exercise yet.");
  await expect(sheet.getByRole("button", { name: /^Set \d done$/ })).toHaveCount(3);

  await sheet.getByRole("button", { name: "Set 1 done", exact: true }).click();
  await expect(sheet.getByRole("alert")).toHaveText("Enter whole reps for each set.");
  await expect(sheet.getByRole("button", { name: "Set 1 done", exact: true })).toHaveAttribute("aria-pressed", "false");

  await sheet.getByLabel("Weight for set 1, kg").fill("20");
  await sheet.getByLabel("Reps for set 1").fill("10");
  await sheet.getByRole("button", { name: "Set 1 done", exact: true }).click();
  await expect(sheet.locator("[data-dialog-error]")).toBeEmpty();
  await sheet.getByRole("button", { name: "Drop set" }).click();
  await sheet.getByRole("button", { name: "Drop 1 after set 1 done" }).click();
  assert.deepEqual((await savedLog(page, "push-a-glutes-entry-001")).sets, [{ kg: 20, reps: 10, drops: [{ kg: 15, reps: 10 }] }]);

  // Unticking the set takes its drop out of the log; ticking it again brings the drop back.
  await sheet.getByRole("button", { name: "Set 1 done", exact: true }).click();
  assert.equal(await savedLog(page, "push-a-glutes-entry-001"), null);
  await expect(sheet.getByRole("button", { name: "Drop 1 after set 1 done" })).toHaveAttribute("aria-pressed", "false");
  await sheet.getByRole("button", { name: "Set 1 done", exact: true }).click();
  assert.deepEqual((await savedLog(page, "push-a-glutes-entry-001")).sets, [{ kg: 20, reps: 10, drops: [{ kg: 15, reps: 10 }] }]);
  await sheet.getByRole("button", { name: "Set 1 done", exact: true }).click();

  await sheet.getByRole("button", { name: "Close", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(numberButton(page, "Low-incline dumbbell press")).not.toHaveAccessibleName(/, done$/);
});

appTest("logging: the history sheet lists every session with the best set and changes, from the reference too", { initScripts: startWith(stateWithHistory()) }, async ({ page }) => {
  await main(page).getByRole("button", { name: "View Machine chest press details" }).click();
  await page.locator("#exerciseDetailDialog").getByRole("button", { name: "History" }).click();
  const history = page.locator("#historyDialog");
  await expect(history.getByRole("heading", { name: "Machine chest press" })).toBeVisible();
  await expect(history.getByText("4 sessions")).toBeVisible();
  await expect(history.locator(".history-session")).toHaveCount(4);
  await expect(history.locator(".history-stat").nth(0)).toContainText("50 kg × 10");
  await expect(history.locator(".history-stat").nth(1)).toContainText("50 kg");
  await expect(history.locator(".history-stat").nth(2)).toContainText("▲ 7.5 kg");
  await expect(history.locator(".history-session").first()).toContainText("▲ 2.5 kg");
  await expect(history.getByRole("img", { name: /^Top set weight from 42.5 kg/ })).toBeVisible();
  await history.getByRole("button", { name: "Close history" }).click();
  await expect(history).toBeHidden();
});

appTest("logging: a multi-choice slot logs the choice you did, and the Log day shows the sets", async ({ page }) => {
  await main(page).getByRole("button", { name: /^Pull A, / }).click();
  const title = "Neutral-grip pull-up or Assisted neutral-grip pull-up";
  await numberButton(page, title).click();
  const sheet = sheetOf(page);
  const choices = sheet.getByRole("group", { name: "Exercise you're doing" });
  await choices.getByRole("button", { name: "Assisted neutral-grip pull-up" }).click();
  await expect(sheet.getByRole("heading", { name: "Assisted neutral-grip pull-up" })).toBeVisible();
  await sheet.getByLabel("Reps for set 1").fill("8");
  await sheet.getByRole("button", { name: "Set 1 done", exact: true }).click();
  await sheet.getByRole("button", { name: "Done", exact: true }).click();
  const log = await savedLog(page, "pull-a-entry-001");
  assert.equal(log.sets[0].kg, null, "no weight typed: a bodyweight set");
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  const choice = routineById(state, "pull-a").entries.find((entry) => entry.id === "pull-a-entry-001").choices[1];
  assert.equal(log.exerciseId, choice.exerciseId);

  await goToView(page, "Log");
  await main(page).getByRole("button", { name: /^Wednesday, November 4, 2026/ }).click();
  const day = page.locator("#dayDialog");
  await expect(day.getByText("Logged sets")).toBeVisible();
  await expect(day.locator(".day-log-row")).toContainText("Assisted neutral-grip pull-up");
  await expect(day.locator(".day-log-row")).toContainText(/8\s*reps/);
});

appTest("logging: once done, the sheet's Close also saves rows typed in but not ticked", async ({ page }) => {
  await numberButton(page, "Machine overhead press").click();
  const sheet = sheetOf(page);
  await sheet.getByLabel("Weight for set 1, kg").fill("35");
  await sheet.getByLabel("Reps for set 1").fill("12");
  await sheet.getByRole("button", { name: "Done", exact: true }).click();
  await numberButton(page, "Machine overhead press").click();
  await expect(sheet.getByRole("button", { name: "Set 1 done", exact: true })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByLabel("Reps for set 2").fill("10");
  await sheet.locator(".log-actions").getByRole("button", { name: "Close", exact: true }).click();
  await expect(sheet).toBeHidden();
  assert.deepEqual((await savedLog(page, "push-a-glutes-entry-002")).sets, [{ kg: 35, reps: 12, drops: [] }, { kg: 35, reps: 10, drops: [] }]);
});

appTest("logging: a set unticked before Done stays out of the log", async ({ page }) => {
  await numberButton(page, "Machine overhead press").click();
  const sheet = sheetOf(page);
  for (const [index, kg, reps] of [[1, "35", "12"], [2, "35", "10"]]) {
    await sheet.getByLabel(`Weight for set ${index}, kg`).fill(kg);
    await sheet.getByLabel(`Reps for set ${index}`).fill(reps);
    await sheet.getByRole("button", { name: `Set ${index} done`, exact: true }).click();
  }
  await sheet.getByRole("button", { name: "Drop set" }).click();
  await sheet.getByRole("button", { name: "Drop 1 after set 2 done" }).click();
  await sheet.getByRole("button", { name: "Set 2 done", exact: true }).click();
  await sheet.getByRole("button", { name: "Done", exact: true }).click();
  assert.deepEqual((await savedLog(page, "push-a-glutes-entry-002")).sets, [{ kg: 35, reps: 12, drops: [] }]);
});
