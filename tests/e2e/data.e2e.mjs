// Saved data: the history in Log, backups, theme and restore in Settings, saved data
// the app can't read, and opening the app with no connection.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDefaultState } from "../../js/store.js";
import { sampleState } from "../sample.mjs";
import { closeSettings, dialog, expect, goToView, main, openSettings, programPicker, readState, readStoredText, roundRow, startButton, suite, tapOnRound } from "./helpers.mjs";

const { appTest } = suite({ saved: sampleState() });

// The owner's real starting program (js/seed.js): what a first launch and "Restore starting data" open.
const starting = createDefaultState();
const startingProgram = starting.programs.find((program) => program.id === starting.settings.activeProgramId);
const startingRoutines = startingProgram.routineIds.map((id) => starting.routines.find((routine) => routine.id === id));
// The workout the round page proposes first, and another one it lists (a round lists the Required ones).
const firstRoutine = startingRoutines.find((routine) => routine.status !== "optional");
const otherRoutine = startingRoutines.find((routine) => routine !== firstRoutine && routine.status !== "optional");

async function download(page, button) {
  const [file] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return { name: file.suggestedFilename(), text: await readFile(await file.path(), "utf8") };
}

async function importFile(page, name, text) {
  const settings = await openSettings(page);
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), settings.getByRole("button", { name: "Import app data" }).click()]);
  await chooser.setFiles({ name, mimeType: "application/json", buffer: Buffer.from(text) });
}

appTest("Log: a routine and a note marked on a date show in Recent and are kept", async ({ page }) => {
  await goToView(page, "Log");
  await main(page).getByRole("button", { name: "Tuesday, November 3, 2026", exact: true }).click();
  const day = dialog(page, "Tuesday, November 3");
  const completed = (routine) => day.getByRole("checkbox", { name: new RegExp(`^${routine}\\b`) });
  await day.getByText("Day B", { exact: true }).first().click();
  await expect(completed("Day B")).toBeChecked();
  await day.getByRole("textbox", { name: "Note" }).fill("Easy day");
  await day.getByRole("button", { name: "Save day" }).click();
  await expect(day).toBeHidden();
  const recent = main(page).getByRole("button", { name: "Open Tuesday, November 3, 2026. Day B. Note added", exact: true });
  await expect(recent).toBeVisible();
  await expect(main(page).getByRole("button", { name: "Tuesday, November 3, 2026, 1 finished workout, note recorded", exact: true })).toBeVisible();

  await page.reload();
  await goToView(page, "Log");
  await recent.click();
  await expect(completed("Day B")).toBeChecked();
  await expect(completed("Day A")).not.toBeChecked();
  await expect(day.getByRole("textbox", { name: "Note" })).toHaveValue("Easy day");
  // Marking the routine also ticks its Main slots.
  assert.deepEqual((await readState(page)).sessions, {
    ...sampleState().sessions,
    "2026-11-03": { routineIds: ["day-b"], checkedEntryIdsByRoutine: { "day-b": ["b1", "b2"] }, note: "Easy day", logs: {}, extras: {}, workouts: { "day-b": { name: "Day B", program: "Sample program", minutes: null } } },
  });
});

appTest("Backup: an exported file brings everything back, and a file that isn't a backup changes nothing", async ({ page }) => {
  await importFile(page, "notes.json", "{ not json");
  await expect(page.getByText("This file isn't a Gym Schedule backup.")).toBeVisible();
  assert.deepEqual(await readState(page), sampleState());

  const settings = await openSettings(page);
  const backup = await download(page, settings.getByRole("button", { name: "Export app data" }));
  assert.equal(backup.name, "gym-schedule-2026-11-04.json");
  assert.deepEqual(JSON.parse(backup.text).data, sampleState());

  // Lose the program and its routines.
  await goToView(page, "Program");
  await programPicker(page, "Sample program").click();
  await dialog(page, "Programs").getByRole("button", { name: "Edit Sample program", exact: true }).click();
  await dialog(page, "Edit program").getByRole("button", { name: "Delete program" }).click();
  await tapOnRound(page, dialog(page, "Delete Sample program?").getByRole("button", { name: "Delete program" })); // taps rest after an answer
  await expect(main(page)).toContainText("No programs yet");
  assert.deepEqual((await readState(page)).routines, []);

  await importFile(page, backup.name, backup.text);
  await tapOnRound(page, dialog(page, "Import app data").getByRole("button", { name: "Import data" })); // taps rest after an answer
  await expect(page.getByRole("status")).toHaveText("App data imported.");
  assert.deepEqual(await readState(page), sampleState());
  await closeSettings(page);
  await expect(main(page)).toContainText("Following Sample program");
  await expect(startButton(page, "Day A")).toBeVisible();
});

appTest("Settings: the theme is kept across a reload, and Restore starting data brings the starting program back", async ({ page }) => {
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  let settings = await openSettings(page);
  await expect(settings.getByRole("button", { name: /^Theme/ })).toHaveAccessibleName("Theme Dark");
  const dark = await background();
  await settings.getByRole("button", { name: /^Theme/ }).click();
  await expect(settings.getByRole("button", { name: /^Theme/ })).toHaveAccessibleName("Theme Light");
  await expect.poll(background, "the page changes colour with the theme").not.toBe(dark);
  const light = await background();

  await page.reload();
  settings = await openSettings(page);
  await expect(settings.getByRole("button", { name: /^Theme/ })).toHaveAccessibleName("Theme Light");
  await expect.poll(background).toBe(light);
  assert.equal((await readState(page)).settings.theme, "light");

  await settings.getByRole("button", { name: "Restore starting data" }).click();
  await tapOnRound(page, dialog(page, "Restore starting data").getByRole("button", { name: "Restore data" })); // taps rest after an answer
  await expect(page.getByRole("status")).toHaveText("Starting data restored.");
  // Everything is the starting data again, except the theme and the training rules.
  const { theme, trainingRules } = { ...sampleState().settings, theme: "light" };
  assert.deepEqual(await readState(page), { ...starting, settings: { ...starting.settings, theme, trainingRules } });
  await closeSettings(page);
  await expect(main(page)).toContainText(`Following ${startingProgram.name}`);
  await expect(startButton(page, firstRoutine.name)).toBeVisible();
});

appTest("Saved data the app can't read is left exactly as it is", { saved: "{broken", allowConsole: [/Saved data couldn't be read/] }, async ({ page }) => {
  await expect(page.getByRole("status")).toContainText("nothing will be saved");
  await expect(main(page)).toContainText(`Following ${startingProgram.name}`);

  // Tapping around saves nothing: another workout opens on the round page, and that is all.
  await tapOnRound(page, roundRow(page, otherRoutine.name));
  await expect(startButton(page, otherRoutine.name)).toBeVisible();
  const settings = await openSettings(page);
  await settings.getByRole("button", { name: /^Theme/ }).click();
  await expect(settings).toContainText("Saved data couldn't be read");
  const unreadable = await download(page, settings.getByRole("button", { name: "Download unreadable data" }));
  assert.equal(unreadable.text, "{broken");
  assert.equal(await readStoredText(page), "{broken");
});

appTest("A first launch opens the starting program, and the app then opens with no connection", {
  saved: null,
  serviceWorker: true,
  ownServer: true,
  allowConsole: [/ERR_CONNECTION_REFUSED|ERR_INTERNET_DISCONNECTED|Failed to fetch|Failed to load resource|fetching the script/i],
}, async ({ page, server }) => {
  await expect(main(page)).toContainText(`Following ${startingProgram.name}`);
  assert.deepEqual(await readState(page), starting);

  // The offline copy is ready once its service worker controls the page.
  await page.evaluate(() => new Promise((resolve) => {
    if (navigator.serviceWorker.controller) resolve();
    else navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
  }));
  await server.close();
  await assert.rejects(fetch(server.url), "the server is gone");
  await page.reload();
  await expect(main(page)).toContainText(`Following ${startingProgram.name}`);
  await tapOnRound(page, roundRow(page, otherRoutine.name));
  await expect(startButton(page, otherRoutine.name)).toBeVisible();
  await expect(page.getByRole("status")).not.toContainText("Offline mode");
  assert.deepEqual(await readState(page), starting);
});
