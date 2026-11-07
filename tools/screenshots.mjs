#!/usr/bin/env node
// Capture deterministic screenshots of every primary view and reachable dialog/sheet.
//
//   node tools/screenshots.mjs <outDir>          (APP_ROOT=/abs/path serves another checkout)
//
// Matrix: 393×852 and 320×700, light and dark, deviceScaleFactor 1, isMobile/hasTouch.
// Determinism: fresh browser context per size/theme, Date fixed at 2026-11-04 10:00 (UTC context
// time zone, en-US locale), the same seeded state before every shot (two Workout checks today, a
// Log day with a completion and note, a note-only day), animations disabled, caret hidden.
// File names are stable: `<width>-<theme>-<name>.png`, e.g. 393-dark-workout.png,
// 320-light-dialog-entry-editor.png. Re-running produces the same names for name-by-name diffing.
// Settings is reached through tests/e2e/helpers.mjs openSettings(), the single adaptation point.

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  STORAGE_KEY,
  closeSettings,
  escapeRegExp,
  exactly,
  expect,
  goToView,
  launchBrowser,
  openSettings,
  startServer,
  startsWith,
  waitForApp,
} from "../tests/e2e/helpers.mjs";

const outDir = process.argv[2];
if (!outDir) {
  console.error("Usage: node tools/screenshots.mjs <outDir>");
  process.exit(2);
}

const SIZES = [
  { width: 393, height: 852 },
  { width: 320, height: 700 },
];
const THEMES = ["light", "dark"];
const FIXED_TIME = Date.UTC(2026, 10, 4, 10, 0, 0);
const PROGRAM = "PPLPPL 7 — Glute Specialization";
const PUSH_A = "Push A + Glutes";

const main = (page) => page.getByRole("main");
const dialog = (page, name) => page.getByRole("dialog", { name, exact: typeof name === "string" });
const routineTab = (page, name) => main(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}, (Gym|Home)$`) });
const programRow = (page, title) => main(page).getByRole("button", { name: startsWith(`${title}. Tap to edit.`) });
const entryEditor = (page) => page.getByRole("dialog").filter({ has: page.getByRole("region", { name: "Choices — first is preferred" }) });

async function shown(locator) {
  await expect(locator).toBeVisible();
  return locator;
}

async function openRoutineEditor(page, name = PUSH_A) {
  await goToView(page, "Program");
  await routineTab(page, name).click();
  await main(page).getByRole("button", { name: exactly(`Edit ${name}`) }).click();
  return shown(dialog(page, `Edit ${name}`));
}

async function openEntry(page, title = "Cable serratus punch or Push-up plus") {
  await goToView(page, "Program");
  await programRow(page, title).click();
  return shown(entryEditor(page));
}

async function openMasterEditor(page, exercise) {
  await goToView(page, "Library");
  await main(page).getByRole("button", { name: exactly(`View ${exercise} details`) }).click();
  await dialog(page, exercise).getByRole("button", { name: "Edit exercise" }).click();
  return shown(dialog(page, "Edit exercise"));
}

async function openPrograms(page) {
  await goToView(page, "Program");
  await main(page).getByRole("button", { name: "Manage programs" }).click();
  return shown(dialog(page, "Programs"));
}

async function chooseImportFile(page, files) {
  const settings = await openSettings(page);
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    settings.getByRole("button", { name: "Import app data" }).click(),
  ]);
  await chooser.setFiles(files);
}

// Every shot starts from the seeded state, freshly reloaded on the Workout view.
const SHOTS = [
  // ---- primary views ----
  ["workout", async () => {}],
  ["workout-home-base", async (page) => { await routineTab(page, "Home Base").click(); }],
  ["workout-last-tab", async (page) => { await routineTab(page, "Legs morning").click(); }],
  ["program", async (page) => { await goToView(page, "Program"); }],
  ["program-rules-open", async (page) => {
    await goToView(page, "Program");
    await main(page).getByText("Weekly layout & rules").click();
  }],
  ["library", async (page) => { await goToView(page, "Library"); }],
  ["library-search", async (page) => {
    await goToView(page, "Library");
    await main(page).getByRole("searchbox", { name: "Search exercises" }).fill("plank");
    await page.keyboard.press("Tab");
  }],
  ["library-filtered", async (page) => {
    await goToView(page, "Library");
    await main(page).getByRole("button", { name: "Core", exact: true }).click();
    await main(page).getByRole("button", { name: "Primary only" }).click();
  }],
  ["log", async (page) => { await goToView(page, "Log"); }],
  ["settings", async (page) => { await openSettings(page); }],
  ["settings-rules-open", async (page) => {
    const settings = await openSettings(page);
    await settings.getByText("Training rules").click();
  }],
  ["settings-import-error", async (page) => {
    await chooseImportFile(page, { name: "garbage.json", mimeType: "application/json", buffer: Buffer.from("{ not json") });
    await expect(page.getByText("This file isn't a Gym Schedule backup.")).toBeVisible();
  }],

  // ---- Workout sheets ----
  ["dialog-exercise-reference", async (page) => {
    await main(page).getByRole("button", { name: "View Cable kickback details" }).click();
    await shown(dialog(page, "Cable kickback"));
  }],
  ["dialog-exercise-reference-related", async (page) => {
    await main(page).getByRole("button", { name: "View Low-incline dumbbell press details" }).click();
    await dialog(page, "Low-incline dumbbell press").getByRole("button", { name: "Alternative Machine chest press" }).click();
    await shown(dialog(page, "Machine chest press"));
  }],
  ["dialog-log", async (page) => {
    await main(page).getByRole("button", { name: "Log sets for Machine chest press" }).click();
    await page.locator("#logDialog").getByLabel("Weight for set 1, kg").fill("50");
    await page.locator("#logDialog").getByLabel("Reps for set 1").fill("10");
    await page.locator("#logDialog").getByRole("button", { name: "Set 1 done", exact: true }).click();
    await page.locator("#logDialog").getByRole("button", { name: "Drop set" }).click();
    await shown(page.locator("#logDialog"));
  }],
  ["dialog-history", async (page) => {
    await main(page).getByRole("button", { name: "View Machine chest press details" }).click();
    await page.locator("#exerciseDetailDialog").getByRole("button", { name: "History" }).click();
    await shown(page.locator("#historyDialog"));
  }],
  ["dialog-choice-sheet", async (page) => {
    await main(page).getByRole("button", { name: "Open exercise choices for Cable serratus punch or Push-up plus" }).click();
    await shown(dialog(page, "Exercise choices"));
  }],
  ["dialog-choice-reference", async (page) => {
    await main(page).getByRole("button", { name: "Open exercise choices for Cable serratus punch or Push-up plus" }).click();
    await dialog(page, "Exercise choices").getByRole("button", { name: "Open reference for Push-up plus" }).click();
    await shown(dialog(page, "Push-up plus"));
  }],
  ["dialog-video-search", async (page) => {
    await main(page).getByRole("button", { name: "Find a video for preferred choice Low-incline dumbbell press" }).click();
    await shown(dialog(page, "Low-incline dumbbell press"));
  }],

  // ---- Program sheets ----
  ["dialog-programs", async (page) => { await openPrograms(page); }],
  ["dialog-program-add", async (page) => {
    const programs = await openPrograms(page);
    await programs.getByRole("button", { name: "Add program" }).click();
    await shown(dialog(page, "Add program"));
  }],
  ["dialog-program-editor", async (page) => {
    const programs = await openPrograms(page);
    await programs.getByRole("button", { name: `Edit ${PROGRAM}` }).click();
    await shown(dialog(page, "Edit program"));
  }],
  ["dialog-routine-add", async (page) => {
    await goToView(page, "Program");
    await main(page).getByRole("button", { name: "+ Add routine" }).click();
    await shown(dialog(page, "Add routine"));
  }],
  ["dialog-routine-editor", async (page) => { await openRoutineEditor(page); }],
  ["dialog-block-editor", async (page) => {
    const editor = await openRoutineEditor(page);
    await editor.getByRole("button", { name: startsWith("Edit Glute block.") }).click();
    await shown(dialog(page, "Edit block"));
  }],
  ["dialog-entry-editor", async (page) => { await openEntry(page); }],
  ["dialog-choice-editor", async (page) => {
    const editor = await openEntry(page);
    await editor.getByRole("button", { name: "Edit Push-up plus choice" }).click();
    await shown(dialog(page, "Push-up plus"));
  }],
  ["dialog-picker", async (page) => {
    await goToView(page, "Program");
    await main(page).getByRole("button", { name: "+ Add exercise" }).first().click();
    await shown(dialog(page, "Add exercise"));
  }],
  ["dialog-picker-choice", async (page) => {
    const editor = await openEntry(page);
    await editor.getByRole("button", { name: "+ Add choice" }).click();
    await shown(dialog(page, "Add exercise"));
  }],
  ["dialog-confirm-delete-program", async (page) => {
    const programs = await openPrograms(page);
    await programs.getByRole("button", { name: `Edit ${PROGRAM}` }).click();
    await dialog(page, "Edit program").getByRole("button", { name: "Delete program" }).click();
    await shown(dialog(page, `Delete ${PROGRAM}?`));
  }],
  ["dialog-confirm-delete-routine", async (page) => {
    const editor = await openRoutineEditor(page);
    await editor.getByRole("button", { name: "Delete routine" }).click();
    await shown(dialog(page, `Delete ${PUSH_A}?`));
  }],
  ["dialog-confirm-remove-entry", async (page) => {
    const editor = await openEntry(page, "Neck flexion");
    await editor.getByRole("button", { name: `Remove from ${PUSH_A}` }).click();
    await shown(dialog(page, "Remove Neck flexion?"));
  }],

  // ---- Library sheets ----
  ["dialog-filter", async (page) => {
    await goToView(page, "Library");
    await main(page).getByRole("button", { name: "Filter exercises" }).click();
    await shown(dialog(page, "Filter exercises"));
  }],
  ["dialog-exercise-editor", async (page) => { await openMasterEditor(page, "Low-incline dumbbell press"); }],
  ["dialog-exercise-editor-add", async (page) => {
    await goToView(page, "Library");
    await main(page).getByRole("button", { name: "Add exercise" }).click();
    await shown(dialog(page, "Add exercise"));
  }],
  ["dialog-classification-picker", async (page) => {
    const editor = await openMasterEditor(page, "Low-incline dumbbell press");
    await editor.getByRole("button", { name: /^Equipment/ }).click();
    await shown(dialog(page, "Equipment"));
  }],
  ["dialog-relationship-editor", async (page) => {
    const editor = await openMasterEditor(page, "Low-incline dumbbell press");
    await editor.getByRole("button", { name: /^Related exercises/ }).click();
    await shown(dialog(page, "Related exercises"));
  }],
  ["dialog-confirm-delete-exercise", async (page) => {
    const editor = await openMasterEditor(page, "Ab-wheel rollout");
    await editor.getByRole("button", { name: "Delete exercise" }).click();
    await shown(dialog(page, "Delete exercise"));
  }],

  // ---- Log ----
  ["dialog-day-editor", async (page) => {
    await goToView(page, "Log");
    await main(page).getByRole("button", { name: startsWith("Monday, November 2, 2026") }).click();
    await shown(dialog(page, "Monday, November 2"));
  }],

  // ---- Settings confirmations ----
  ["dialog-confirm-import", async (page, { backupPath }) => {
    await chooseImportFile(page, backupPath);
    await shown(dialog(page, "Import app data"));
  }],
  ["dialog-confirm-restore", async (page) => {
    const settings = await openSettings(page);
    await settings.getByRole("button", { name: "Restore starting data" }).click();
    await shown(dialog(page, "Restore starting data"));
  }],
];

async function seedState(page, theme, tempDir) {
  await page.goto(page.__appUrl);
  await waitForApp(page);
  // Two exercises logged and done on today's Push A.
  for (const [title, sets] of [["Low-incline dumbbell press", [["22.5", "10"], ["22.5", "9"], ["22.5", "8"]]], ["Machine overhead press", [["35", "12"], ["35", "10"]]]]) {
    await main(page).getByRole("button", { name: `Log sets for ${title}` }).click();
    const sheet = await shown(page.locator("#logDialog"));
    for (const [index, [kg, reps]] of sets.entries()) {
      await sheet.getByLabel(`Weight for set ${index + 1}, kg`).fill(kg);
      await sheet.getByLabel(`Reps for set ${index + 1}`).fill(reps);
    }
    await sheet.getByRole("button", { name: "Done", exact: true }).click();
    await expect(main(page).getByRole("button", { name: `Log sets for ${title}, done` })).toBeVisible();
  }
  // Log history: a completed routine with a note, and a note-only day.
  await goToView(page, "Log");
  for (const [date, title, routine, note] of [
    ["Monday, November 2, 2026", "Monday, November 2", "Pull A", "Felt strong"],
    ["Tuesday, November 3, 2026", "Tuesday, November 3", null, "Mobility only"],
  ]) {
    await main(page).getByRole("button", { name: startsWith(date) }).click();
    const day = await shown(dialog(page, title));
    if (routine) await day.getByRole("checkbox", { name: startsWith(`${routine} `) }).setChecked(true, { force: true });
    await day.getByRole("textbox", { name: "Note" }).fill(note);
    await day.getByRole("button", { name: "Save day" }).click();
    await expect(day).toBeHidden();
  }
  // Theme and an exported backup file for the import-confirmation shot.
  const settings = await openSettings(page);
  if (theme === "dark") {
    await settings.getByRole("button", { name: /^Theme/ }).click();
    await expect(settings.getByRole("button", { name: /^Theme/ })).toHaveAccessibleName("Theme Dark");
  }
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    settings.getByRole("button", { name: "Export app data" }).click(),
  ]);
  const backupPath = path.join(tempDir, `backup-${theme}-${page.viewportSize().width}.json`);
  await download.saveAs(backupPath);
  await closeSettings(page);
  const seed = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  return { seed, backupPath };
}

async function resetTo(page, seed) {
  await page.evaluate(([key, value]) => {
    sessionStorage.clear();
    localStorage.setItem(key, value);
  }, [STORAGE_KEY, seed]);
  await page.goto(page.__appUrl);
  await waitForApp(page);
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const frames = (count) => new Promise((resolve) => {
      const step = () => (count-- <= 0 ? resolve() : requestAnimationFrame(step));
      requestAnimationFrame(step);
    });
    await frames(2);
    // Let sheet-open animations finish and every open dialog reach full opacity before capture.
    await Promise.race([
      Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
    // Count frames rather than reading the clock: Date is fixed for determinism.
    for (let frame = 0; frame < 60; frame += 1) {
      const dialogs = [...document.querySelectorAll("dialog[open]")];
      if (dialogs.every((dialog) => getComputedStyle(dialog).opacity === "1")) break;
      await frames(1);
    }
    await frames(2);
  });
  await page.waitForTimeout(150);
}

async function captureCombo(browser, server, { width, height }, theme, tempDir) {
  const context = await browser.newContext({
    viewport: { width, height },
    screen: { width, height },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: theme,
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  context.setDefaultTimeout(10_000);
  const page = await context.newPage();
  page.__appUrl = server.url;
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.clock.setFixedTime(FIXED_TIME);

  const results = [];
  try {
    const { seed, backupPath } = await seedState(page, theme, tempDir);
    for (const [name, run] of SHOTS) {
      const file = `${width}-${theme}-${name}.png`;
      try {
        await resetTo(page, seed);
        await run(page, { backupPath });
        await settle(page);
        await page.screenshot({ path: path.join(outDir, file), animations: "disabled", caret: "hide", scale: "css" });
        results.push({ file, ok: true });
      } catch (error) {
        results.push({ file, ok: false, error: error.message.split("\n")[0] });
      }
    }
  } finally {
    await context.close();
  }
  return { results, errors: errors.map((text) => `${width}-${theme}: ${text}`) };
}

const started = Date.now();
await mkdir(outDir, { recursive: true });
const tempDir = path.join(os.tmpdir(), `gym-screens-${process.pid}`);
await mkdir(tempDir, { recursive: true });
const server = await startServer();
const browser = await launchBrowser();
let failed = 0;
try {
  const combos = SIZES.flatMap((size) => THEMES.map((theme) => captureCombo(browser, server, size, theme, tempDir)));
  const outcomes = await Promise.all(combos);
  for (const { results, errors } of outcomes) {
    for (const result of results) {
      if (!result.ok) {
        failed += 1;
        console.error(`FAILED ${result.file}: ${result.error}`);
      }
    }
    for (const error of errors) console.error(`browser error ${error}`);
  }
  const total = outcomes.reduce((sum, { results }) => sum + results.length, 0);
  console.log(`Wrote ${total - failed}/${total} screenshots to ${path.resolve(outDir)} in ${((Date.now() - started) / 1000).toFixed(1)}s (app root: ${process.env.APP_ROOT || "repo root"})`);
} finally {
  await browser.close();
  await server.close();
  await rm(tempDir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
