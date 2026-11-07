// End-to-end flow tests for docs/PRODUCT.md "User-action contract" and "Completion meaning".
// Run:  node --test 'tests/e2e/*.e2e.mjs'        (APP_ROOT=/abs/path to serve another checkout)
//
// Each test gets a fresh browser context (clean localStorage) at 393×852 (isMobile, hasTouch),
// a clock installed at Wednesday 2026-11-04 10:00 UTC, and fails on any console error or page error.
//
// ---------------------------------------------------------------------------------------------
// NON-VISIBLE SELECTORS THESE TESTS DEPEND ON (keep stable through the rewrite)
// ---------------------------------------------------------------------------------------------
//  - `<main>` landmark (#appMain) wraps the current screen: tests scope with getByRole("main").
//  - localStorage key "gymAppStateV1" (helpers.readState) is read only to assert that an imported
//    backup replaced the stored state and that export content matches what is stored.
//  - `document.documentElement.dataset.theme` ("dark"/"light") is read for the theme test.
//  - Settings is reached only through helpers.openSettings()/settingsScope() — today that is the
//    <dialog> named "Settings"; adapt those two helpers when Settings becomes a screen.
//  - Import uses the browser file chooser opened by the "Import app data" button (no #importFile).
//  - helpers.waitForApp waits for #appMain to have children (and, if present, #viewMetaLine to stop
//    reading "Loading saved data").
//  - Structural (no CSS classes): the Workout exercise-list scroller is the nearest scrollable
//    ancestor of a row; the Log order test reads each day-editor checkbox's `<label>` → `<strong>`
//    routine name. Day-editor checkboxes are toggled with { force: true } because the styled box
//    overlays the native input (the click lands on the label).
// No CSS layout classes are used as selectors.
// ---------------------------------------------------------------------------------------------

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  expect,
  exactly,
  startsWith,
  escapeRegExp,
  goToView,
  navButton,
  closeSettings,
  openSettings,
  readState,
  settingsScope,
  suite,
  toast,
} from "./helpers.mjs";

const { appTest } = suite();
const { describe } = test;

const PROGRAM = "PPLPPL 7 — Glute Specialization";
const PUSH_A = "Push A + Glutes";
const PUSH_A_MAIN = [
  "Low-incline dumbbell press",
  "Machine overhead press",
  "Machine chest press",
  "Single-leg hip thrust",
  "Standing cable hip abduction",
  "Cable kickback",
  "Dumbbell scaption raise",
  "Rope triceps pushdown",
  "Cable crunch",
  "Neck flexion",
];
const PUSH_A_OPTIONAL = [
  "Cable serratus punch or Push-up plus",
  "Cable shoulder external rotation or Side-lying dumbbell shoulder external rotation",
  "Cable shoulder internal rotation",
];
const TODAY = "Wednesday, November 4, 2026";

// ---- small locator helpers (visible hooks only) ----------------------------------------------

const mainArea = (page) => page.getByRole("main");
// Dialog names are matched exactly so e.g. "Push-up plus" never also matches "Cable serratus punch or Push-up plus".
const dialog = (page, name) => page.getByRole("dialog", { name, exact: typeof name === "string" });
const routineTab = (page, name) => mainArea(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}, (Gym|Home)$`) });
const routineTabs = (page) => mainArea(page).getByRole("button", { name: /, (Gym|Home)$/ });
const checkButton = (page, title) => mainArea(page).getByRole("button", { name: new RegExp(`^(Check|Uncheck) ${escapeRegExp(title)} for today$`) });
const programRow = (page, title) => mainArea(page).getByRole("button", { name: startsWith(`${title}. Tap to edit.`) });
const programRows = (page) => mainArea(page).getByRole("button", { name: /\. Tap to edit\. / });
const calendarDay = (page, fullDate) => mainArea(page).getByRole("button", { name: startsWith(fullDate) });
const recentRows = (page) => mainArea(page).getByRole("button", { name: /^Open / });
const libraryRow = (page, name) => mainArea(page).getByRole("button", { name: exactly(`View ${name} details`) });
const libraryRows = (page) => mainArea(page).getByRole("button", { name: /^View .* details$/ });
const libraryCount = (page) => mainArea(page).getByText(/^\d+ exercises?$/);
const activeProgramButton = (page) => mainArea(page).getByRole("button", { name: /^Choose active program/ });

async function setChecked(page, title, checked) {
  const button = checkButton(page, title);
  if ((await button.getAttribute("aria-pressed")) !== String(checked)) await button.click();
  await expect(checkButton(page, title)).toHaveAttribute("aria-pressed", String(checked));
}

async function todayLabel(page) {
  await goToView(page, "Log");
  const label = await calendarDay(page, TODAY).getAttribute("aria-label");
  await goToView(page, "Workout");
  return label;
}

async function openProgramsFromProgram(page) {
  await goToView(page, "Program");
  await mainArea(page).getByRole("button", { name: "Manage programs" }).click();
  const programs = dialog(page, "Programs");
  await expect(programs).toBeVisible();
  return programs;
}

async function openRoutineEditor(page, routineName) {
  await goToView(page, "Program");
  await routineTab(page, routineName).click();
  await mainArea(page).getByRole("button", { name: exactly(`Edit ${routineName}`) }).click();
  const editor = dialog(page, `Edit ${routineName}`);
  await expect(editor).toBeVisible();
  return editor;
}

// The entry editor's accessible name is the entry's derived title, which changes while editing,
// so it is located by its stable "Choices — first is preferred" section.
const entryEditor = (page) => page.getByRole("dialog").filter({ has: page.getByRole("region", { name: "Choices — first is preferred" }) });

async function openEntryEditor(page, title) {
  await programRow(page, title).click();
  const editor = entryEditor(page);
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAccessibleName(title);
  return editor;
}

async function confirm(page, title, buttonName) {
  const confirmation = dialog(page, title);
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: buttonName, exact: true }).click();
  await expect(confirmation).toBeHidden();
}

async function saveDay(page, fullDate, { routines = {}, note } = {}) {
  await goToView(page, "Log");
  await calendarDay(page, fullDate).click();
  const day = dialog(page, fullDate.replace(/, \d{4}$/, ""));
  await expect(day).toBeVisible();
  for (const [name, checked] of Object.entries(routines)) {
    // The styled box overlays the native checkbox, so the click goes through the label (force).
    await day.getByRole("checkbox", { name: startsWith(`${name} `) }).setChecked(checked, { force: true });
  }
  if (note !== undefined) await day.getByRole("textbox", { name: "Note" }).fill(note);
  await day.getByRole("button", { name: "Save day" }).click();
  await expect(day).toBeHidden();
}

// =============================================================================================
describe("Workout", () => {
  appTest("workout: shows the active program, ordered blocks, continuous numbering and the Manage program path", async ({ page }) => {
    await expect(activeProgramButton(page)).toHaveAccessibleName(`Choose active program, currently ${PROGRAM}`);
    await expect(routineTab(page, PUSH_A)).toHaveAttribute("aria-pressed", "true");
    await expect(routineTabs(page)).toHaveCount(10);
    // Block labels in order, and numbering continues across blocks (slot 4 opens the Glute block).
    const main = mainArea(page);
    for (const label of ["Upper-body work", "Glute block", "Upper-body accessories", "Optional coverage · Rehab"]) {
      await expect(main.getByText(label, { exact: true })).toBeVisible();
    }
    const glute = await main.getByText("Glute block", { exact: true }).boundingBox();
    const upper = await main.getByText("Upper-body work", { exact: true }).boundingBox();
    assert.ok(upper.y < glute.y, "Upper-body work is above Glute block");
    await expect(checkButton(page, "Single-leg hip thrust")).toHaveText("4");
    await expect(checkButton(page, PUSH_A_OPTIONAL[0])).toHaveText("11");
    // Routine prescription and compact programming-note preview are on the row.
    await expect(main.getByRole("button", { name: "View Cable kickback details" })).toContainText("2 × 12–20/leg");
    await expect(main.getByRole("button", { name: "View Cable kickback details" })).toContainText("Alternate straight-back");
    // Manage program path.
    await main.getByRole("button", { name: `Manage ${PROGRAM}` }).click();
    await expect(mainArea(page).getByRole("heading", { name: "Program", level: 1 })).toBeVisible();
    await expect(navButton(page, "Program")).toHaveAttribute("aria-current", "page");
  });

  appTest("workout: select any routine; selection persists after reload; routine note sits above an independently scrolling list", async ({ page, reload }) => {
    await routineTab(page, "Legs morning").click();
    await expect(routineTab(page, "Legs morning")).toHaveAttribute("aria-pressed", "true");
    await expect(routineTab(page, PUSH_A)).toHaveAttribute("aria-pressed", "false");
    await expect(mainArea(page).getByRole("button", { name: "View Modified McGill curl-up details" })).toBeVisible();
    await reload();
    await expect(routineTab(page, "Legs morning")).toHaveAttribute("aria-pressed", "true");

    await routineTab(page, "Home Base").click();
    const note = mainArea(page).getByText(/^Choice menu: choose only what you need/).first();
    await expect(note).toBeVisible();
    const before = await note.boundingBox();
    // The exercise list scrolls on its own; the note stays put.
    const firstRow = mainArea(page).getByRole("button", { name: /^View .* details$/ }).first();
    const scrolled = await firstRow.evaluate((row) => {
      let node = row.parentElement;
      while (node && node !== document.body) {
        const { overflowY } = getComputedStyle(node);
        if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
          node.scrollTop = 600;
          return { tag: node.tagName, scrollTop: node.scrollTop, isMain: node.id === "appMain" };
        }
        node = node.parentElement;
      }
      return null;
    });
    assert.ok(scrolled, "found a scrollable exercise list");
    assert.ok(scrolled.scrollTop > 0, "exercise list scrolled");
    const after = await note.boundingBox();
    assert.equal(Math.round(after.y), Math.round(before.y), "routine note did not move while the list scrolled");
  });

  appTest("workout: check and uncheck entries for today; checks persist after reload", async ({ page, reload }) => {
    await setChecked(page, "Low-incline dumbbell press", true);
    await expect(toast(page)).toHaveText("Exercise checked.");
    await setChecked(page, "Machine chest press", true);
    await setChecked(page, "Machine chest press", false);
    await expect(toast(page)).toHaveText("Exercise unchecked.");
    await reload();
    await expect(checkButton(page, "Low-incline dumbbell press")).toHaveAttribute("aria-pressed", "true");
    await expect(checkButton(page, "Low-incline dumbbell press")).toHaveAccessibleName("Uncheck Low-incline dumbbell press for today");
    await expect(checkButton(page, "Machine chest press")).toHaveAttribute("aria-pressed", "false");
    // A partially checked day is saved but is not a completion.
    await goToView(page, "Log");
    await expect(calendarDay(page, TODAY)).not.toHaveAccessibleName(/completed/);
    await expect(recentRows(page)).toHaveCount(1);
    await expect(recentRows(page).first()).toContainText("Saved workout checks");
  });

  appTest("workout: routine auto-completes only when every Main entry is checked; Optional never blocks", async ({ page }) => {
    for (const title of PUSH_A_MAIN.slice(0, -1)) await setChecked(page, title, true);
    assert.doesNotMatch(await todayLabel(page), /completed/, "9 of 10 Main entries is not complete");

    await setChecked(page, PUSH_A_MAIN.at(-1), true);
    assert.match(await todayLabel(page), /1 completed routine/, "all Main checked completes the routine with Optional unchecked");

    await setChecked(page, PUSH_A_OPTIONAL[0], true);
    await setChecked(page, PUSH_A_OPTIONAL[0], false);
    assert.match(await todayLabel(page), /1 completed routine/, "Optional checks never change completion");

    // The day editor shows the completion as Main progress.
    await goToView(page, "Log");
    await calendarDay(page, TODAY).click();
    const day = dialog(page, "Wednesday, November 4");
    await expect(day.getByRole("checkbox", { name: startsWith(`${PUSH_A} `) })).toBeChecked();
    await expect(day.getByRole("checkbox", { name: startsWith(`${PUSH_A} `) })).toHaveAccessibleName(/10\/10 main/);
    await day.getByRole("button", { name: "Close day editor" }).click();
    await goToView(page, "Workout");

    await setChecked(page, "Machine overhead press", false);
    assert.doesNotMatch(await todayLabel(page), /completed/, "unchecking a Main entry removes the completion");
  });

  appTest("workout: Optional-only routines never auto-complete but their checks are saved", async ({ page }) => {
    await routineTab(page, "Home Base").click();
    const first = mainArea(page).getByRole("button", { name: /^Check .* for today$/ }).first();
    const name = (await first.getAttribute("aria-label")).replace(/^Check | for today$/g, "");
    await first.click();
    await expect(checkButton(page, name)).toHaveAttribute("aria-pressed", "true");
    await goToView(page, "Log");
    await expect(calendarDay(page, TODAY)).not.toHaveAccessibleName(/completed/);
    await expect(recentRows(page).first()).toContainText("Saved workout checks");
  });

  appTest("workout: one-choice row opens its reference with routine prescription and routine note separate from master facts", async ({ page }) => {
    await mainArea(page).getByRole("button", { name: "View Cable kickback details" }).click();
    const reference = dialog(page, "Cable kickback");
    await expect(reference).toBeVisible();
    await expect(reference.getByText("Routine prescription", { exact: true })).toBeVisible();
    await expect(reference.getByText("2 × 12–20/leg", { exact: true })).toBeVisible();
    await expect(reference.getByText(`For this routine — ${PUSH_A}`)).toBeVisible();
    await expect(reference.getByText(/^Alternate straight-back and high\/kneeling/)).toBeVisible();
    await expect(reference.getByText("Primary targets", { exact: true })).toBeVisible();
    await expect(reference.getByText("Exercise notes", { exact: true })).toBeVisible();
    await expect(reference.getByRole("link", { name: "Search YouTube" })).toHaveAttribute("href", /youtube\.com\/results/);
    await reference.getByRole("button", { name: "Close exercise reference" }).click();
    await expect(reference).toBeHidden();
    // Tapping the row did not change completion.
    await expect(checkButton(page, "Cable kickback")).toHaveAttribute("aria-pressed", "false");
  });

  appTest("workout: related exercise reference and deliberate master-editor entry from a reference", async ({ page }) => {
    await mainArea(page).getByRole("button", { name: "View Low-incline dumbbell press details" }).click();
    const reference = dialog(page, "Low-incline dumbbell press");
    await expect(reference.getByText("3 × 6–10", { exact: true })).toBeVisible();
    await reference.getByRole("button", { name: "Alternative Machine chest press" }).click();
    const related = dialog(page, "Machine chest press");
    await expect(related).toBeVisible();
    await expect(related.getByText("Default prescription", { exact: true })).toBeVisible();
    await related.getByRole("button", { name: "Edit exercise" }).click();
    const editor = dialog(page, "Edit exercise");
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("textbox", { name: /^Name/ })).toHaveValue("Machine chest press");
    await editor.getByRole("button", { name: "Close exercise editor" }).click();
    await expect(editor).toBeHidden();
  });

  appTest("workout: multi-choice slot opens a choice sheet with per-choice reference and video; trailing video uses the preferred choice", async ({ page }) => {
    const title = PUSH_A_OPTIONAL[0];
    await mainArea(page).getByRole("button", { name: `Open exercise choices for ${title}` }).click();
    const sheet = dialog(page, "Exercise choices");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(/first choice is preferred/)).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Open reference for Cable serratus punch" })).toContainText("Preferred");
    await expect(sheet.getByRole("button", { name: "Open reference for Push-up plus" })).not.toContainText("Preferred");

    await sheet.getByRole("button", { name: "Open reference for Push-up plus" }).click();
    const reference = dialog(page, "Push-up plus");
    await expect(reference.getByText("Routine prescription", { exact: true })).toBeVisible();
    await expect(reference.getByText("2 × 12–20", { exact: true })).toBeVisible();
    await reference.getByRole("button", { name: "Close exercise reference" }).click();

    await sheet.getByRole("button", { name: "Find a video for Push-up plus" }).click();
    const video = dialog(page, "Push-up plus");
    await expect(video.getByText("No video linked")).toBeVisible();
    await video.getByRole("button", { name: "Close video search" }).click();
    await sheet.getByRole("button", { name: "Close exercise choices" }).click();
    await expect(sheet).toBeHidden();

    await mainArea(page).getByRole("button", { name: "Find a video for preferred choice Cable serratus punch" }).click();
    await expect(dialog(page, "Cable serratus punch").getByText("Exercise video")).toBeVisible();
  });

  appTest("workout: a linked master video becomes a Watch action on the row and in the reference", async ({ page }) => {
    await mainArea(page).getByRole("button", { name: "View Low-incline dumbbell press details" }).click();
    await dialog(page, "Low-incline dumbbell press").getByRole("button", { name: "Edit exercise" }).click();
    const editor = dialog(page, "Edit exercise");
    await editor.getByRole("textbox", { name: "YouTube link or video ID" }).fill("https://youtu.be/dQw4w9WgXcQ");
    await editor.getByRole("button", { name: "Save exercise" }).click();
    await expect(editor).toBeHidden();
    await expect(toast(page)).toHaveText("Exercise updated.");
    const watch = mainArea(page).getByRole("link", { name: "Watch video for preferred choice Low-incline dumbbell press" });
    await expect(watch).toHaveAttribute("href", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await mainArea(page).getByRole("button", { name: "View Low-incline dumbbell press details" }).click();
    await expect(dialog(page, "Low-incline dumbbell press").getByRole("link", { name: "Watch linked video" }))
      .toHaveAttribute("href", /dQw4w9WgXcQ/);
  });

  appTest("workout: switch the active program; an empty program offers Manage program; a new program selects its first routine", async ({ page }) => {
    await routineTab(page, "Legs A").click();
    await activeProgramButton(page).click();
    const programs = dialog(page, "Programs");
    await expect(programs.getByRole("button", { name: startsWith(`${PROGRAM} 10 routines`) })).toHaveAttribute("aria-pressed", "true");
    await programs.getByRole("button", { name: "Add program" }).click();
    const add = dialog(page, "Add program");
    await add.getByRole("textbox", { name: "Name" }).fill("Travel");
    await add.getByRole("button", { name: "Create program" }).click();
    await expect(add).toBeHidden();
    await expect(activeProgramButton(page)).toHaveAccessibleName("Choose active program, currently Travel");
    await expect(mainArea(page).getByRole("heading", { name: "No routines yet" })).toBeVisible();
    await expect(routineTabs(page)).toHaveCount(0);

    // Switch back from Workout: Legs A is not in Travel, so the program's first routine is selected.
    await activeProgramButton(page).click();
    await dialog(page, "Programs").getByRole("button", { name: startsWith(`${PROGRAM} 10 routines`) }).click();
    await expect(toast(page)).toHaveText("Program selected.");
    await expect(activeProgramButton(page)).toHaveAccessibleName(`Choose active program, currently ${PROGRAM}`);
    await expect(routineTab(page, PUSH_A)).toHaveAttribute("aria-pressed", "true");

    // Empty-program Manage program path.
    await activeProgramButton(page).click();
    await dialog(page, "Programs").getByRole("button", { name: startsWith("Travel 0 routines") }).click();
    await mainArea(page).getByRole("button", { name: "Manage program" }).click();
    await expect(mainArea(page).getByRole("heading", { name: "Program", level: 1 })).toBeVisible();
    await expect(mainArea(page).getByRole("button", { name: "Add routine", exact: true })).toBeVisible();
  });
});

// =============================================================================================
describe("Program", () => {
  appTest("program: create an empty program, rename it, edit its note, and delete it with its routines and history", async ({ page, reload }) => {
    let programs = await openProgramsFromProgram(page);
    await programs.getByRole("button", { name: "Add program" }).click();
    const add = dialog(page, "Add program");
    await expect(add.getByRole("button", { name: "Empty" })).toHaveAttribute("aria-pressed", "true");
    await add.getByRole("textbox", { name: "Name" }).fill("Travel block");
    await add.getByRole("textbox", { name: "Program note" }).fill("Hotel gym only");
    await add.getByRole("button", { name: "Create program" }).click();
    await expect(toast(page)).toHaveText("Program created.");
    await expect(activeProgramButton(page)).toHaveAccessibleName("Choose active program, currently Travel block");
    await expect(mainArea(page).getByRole("heading", { name: "No routines yet" })).toBeVisible();

    // Give it a routine with an exercise and a completion so deletion has something to remove.
    await mainArea(page).getByRole("button", { name: "Add routine", exact: true }).click();
    const routine = dialog(page, "Add routine");
    await routine.getByRole("textbox", { name: "Name" }).fill("Hotel day");
    await routine.getByRole("button", { name: "Save routine" }).click();
    await mainArea(page).getByRole("button", { name: "+ Add exercise" }).click();
    const picker = dialog(page, "Add exercise");
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill("Wall angel");
    await picker.getByRole("button", { name: "Add Wall angel to this routine" }).click();
    await expect(picker).toBeHidden();
    await goToView(page, "Workout");
    await setChecked(page, "Wall angel", true);
    assert.match(await todayLabel(page), /1 completed routine/);

    // Rename + note.
    programs = await openProgramsFromProgram(page);
    await programs.getByRole("button", { name: "Edit Travel block" }).click();
    const edit = dialog(page, "Edit program");
    await edit.getByRole("textbox", { name: "Name" }).fill("Travel block v2");
    await edit.getByRole("textbox", { name: "Program note" }).fill("Hotel gym only\nBands in the suitcase");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(toast(page)).toHaveText("Program updated.");
    await reload();
    await goToView(page, "Program");
    await expect(activeProgramButton(page)).toHaveAccessibleName("Choose active program, currently Travel block v2");
    await mainArea(page).getByText("Weekly layout & rules").click();
    await expect(mainArea(page).getByText(/Bands in the suitcase/)).toBeVisible();

    // Delete: cancel keeps it, confirm removes it, its routines and its history; masters stay.
    programs = await openProgramsFromProgram(page);
    await programs.getByRole("button", { name: "Edit Travel block v2" }).click();
    await dialog(page, "Edit program").getByRole("button", { name: "Delete program" }).click();
    await expect(dialog(page, "Delete Travel block v2?").getByText(/removes 1 routine and their completion history/)).toBeVisible();
    await confirm(page, "Delete Travel block v2?", "Keep program");
    await expect(dialog(page, "Edit program")).toBeVisible();
    await dialog(page, "Edit program").getByRole("button", { name: "Delete program" }).click();
    await confirm(page, "Delete Travel block v2?", "Delete program");
    await expect(toast(page)).toHaveText("Program deleted.");
    await expect(activeProgramButton(page)).toHaveAccessibleName(`Choose active program, currently ${PROGRAM}`);
    await goToView(page, "Log");
    await expect(calendarDay(page, TODAY)).not.toHaveAccessibleName(/completed/);
    await expect(mainArea(page).getByText("No history yet")).toBeVisible();
    await goToView(page, "Library");
    await expect(libraryRow(page, "Wall angel")).toBeVisible();
    await expect(libraryCount(page)).toHaveText("177 exercises");
  });

  appTest("program: duplicate a program (new routine IDs, shared Library) and switch between them", async ({ page }) => {
    let programs = await openProgramsFromProgram(page);
    await programs.getByRole("button", { name: `Edit ${PROGRAM}` }).click();
    await dialog(page, "Edit program").getByRole("button", { name: "Duplicate program" }).click();
    const add = dialog(page, "Add program");
    await expect(add.getByRole("textbox", { name: "Name" })).toHaveValue(`${PROGRAM} copy`);
    await expect(add.getByRole("button", { name: "Duplicate" })).toHaveAttribute("aria-pressed", "true");
    await expect(add.getByRole("combobox", { name: "Duplicate from" })).toBeEnabled();
    await add.getByRole("button", { name: "Create program" }).click();
    await expect(toast(page)).toHaveText("Program created.");
    await expect(activeProgramButton(page)).toHaveAccessibleName(`Choose active program, currently ${PROGRAM} copy`);
    await expect(routineTabs(page)).toHaveCount(10);

    // Editing the copy leaves the original untouched.
    const editor = await openRoutineEditor(page, PUSH_A);
    await editor.getByRole("textbox", { name: "Name" }).fill("Push A copy");
    await editor.getByRole("button", { name: "Save routine" }).click();
    await expect(routineTab(page, "Push A copy")).toBeVisible();

    programs = await openProgramsFromProgram(page);
    await expect(programs.getByRole("button", { name: /routines/ })).toHaveCount(2);
    await programs.getByRole("button", { name: startsWith(`${PROGRAM} 10 routines`) }).click();
    await expect(activeProgramButton(page)).toHaveAccessibleName(`Choose active program, currently ${PROGRAM}`);
    await expect(routineTab(page, PUSH_A)).toBeVisible();
    await expect(routineTab(page, "Push A copy")).toHaveCount(0);
    await goToView(page, "Library");
    await expect(libraryCount(page)).toHaveText("177 exercises");
  });

  appTest("program: shared program rules are readable through one disclosure", async ({ page }) => {
    await goToView(page, "Program");
    const rules = mainArea(page).getByText("Weekly layout & rules");
    await expect(rules).toBeVisible();
    await expect(mainArea(page).getByText(/Day 7 — Rest/)).toBeHidden();
    await rules.click();
    await expect(mainArea(page).getByText(/Day 7 — Rest/)).toBeVisible();
  });

  appTest("program: select a routine; add one with location, status and note; edit it; delete it with confirmation", async ({ page, reload }) => {
    await goToView(page, "Program");
    await routineTab(page, "Legs B").click();
    await expect(routineTab(page, "Legs B")).toHaveAttribute("aria-pressed", "true");
    await expect(mainArea(page).getByRole("button", { name: "Edit Legs B", exact: true })).toBeVisible();

    await mainArea(page).getByRole("button", { name: "+ Add routine" }).click();
    const add = dialog(page, "Add routine");
    await add.getByRole("textbox", { name: "Name" }).fill("Mobility day");
    await add.getByRole("group", { name: "Routine location" }).getByRole("button", { name: "Home" }).click();
    await add.getByRole("group", { name: "Routine status" }).getByRole("button", { name: "Optional" }).click();
    await add.getByRole("textbox", { name: "Routine note" }).fill("Keep it easy");
    await add.getByRole("button", { name: "Save routine" }).click();
    await expect(toast(page)).toHaveText("Routine added.");
    await expect(routineTab(page, "Mobility day")).toHaveAccessibleName("Mobility day, Home");
    await expect(routineTab(page, "Mobility day")).toHaveAttribute("aria-pressed", "true");
    await expect(mainArea(page).getByText("Home · Optional · 0 slots · 1 block")).toBeVisible();
    await expect(mainArea(page).getByText("Keep it easy").first()).toBeVisible();

    const edit = await openRoutineEditor(page, "Mobility day");
    await expect(edit.getByRole("group", { name: "Routine location" }).getByRole("button", { name: "Home" })).toHaveAttribute("aria-pressed", "true");
    await edit.getByRole("textbox", { name: "Name" }).fill("Mobility");
    await edit.getByRole("group", { name: "Routine location" }).getByRole("button", { name: "Gym" }).click();
    await edit.getByRole("group", { name: "Routine status" }).getByRole("button", { name: "Required" }).click();
    await edit.getByRole("textbox", { name: "Routine note" }).fill("Before cardio");
    await edit.getByRole("button", { name: "Save routine" }).click();
    await expect(toast(page)).toHaveText("Routine updated.");
    await reload();
    await goToView(page, "Program");
    await expect(routineTab(page, "Mobility")).toHaveAccessibleName("Mobility, Gym");
    await expect(mainArea(page).getByText("Gym · Required · 0 slots · 1 block")).toBeVisible();
    await expect(mainArea(page).getByText("Before cardio").first()).toBeVisible();
    await goToView(page, "Workout");
    await expect(routineTab(page, "Mobility")).toHaveAttribute("aria-pressed", "true");
    await expect(mainArea(page).getByRole("heading", { name: "No exercises yet" })).toBeVisible();

    const del = await openRoutineEditor(page, "Mobility");
    await del.getByRole("button", { name: "Delete routine" }).click();
    await confirm(page, "Delete Mobility?", "Keep routine");
    await expect(dialog(page, "Edit Mobility")).toBeVisible();
    await dialog(page, "Edit Mobility").getByRole("button", { name: "Delete routine" }).click();
    await confirm(page, "Delete Mobility?", "Delete routine");
    await expect(toast(page)).toHaveText("Routine deleted.");
    await expect(routineTab(page, "Mobility")).toHaveCount(0);
    await expect(routineTabs(page)).toHaveCount(10);
  });

  appTest("program: reorder routines with Move earlier / Move later", async ({ page, reload }) => {
    const editor = await openRoutineEditor(page, "Pull A");
    await editor.getByRole("button", { name: "Move routine earlier" }).click();
    await expect(toast(page)).toHaveText("Routine moved.");
    await expect(editor.getByRole("button", { name: "Move routine earlier" })).toBeDisabled();
    await editor.getByRole("button", { name: "Close routine editor" }).click();
    await expect(routineTabs(page).nth(0)).toHaveAccessibleName("Pull A, Gym");
    await expect(routineTabs(page).nth(1)).toHaveAccessibleName(`${PUSH_A}, Gym`);
    await reload();
    await goToView(page, "Workout");
    await expect(routineTabs(page).nth(0)).toHaveAccessibleName("Pull A, Gym");

    const again = await openRoutineEditor(page, "Pull A");
    await again.getByRole("button", { name: "Move routine later" }).click();
    await again.getByRole("button", { name: "Move routine later" }).click();
    await again.getByRole("button", { name: "Close routine editor" }).click();
    await expect(routineTabs(page).nth(0)).toHaveAccessibleName(`${PUSH_A}, Gym`);
    await expect(routineTabs(page).nth(1)).toHaveAccessibleName("Legs A, Gym");
    await expect(routineTabs(page).nth(2)).toHaveAccessibleName("Pull A, Gym");
  });

  appTest("program: add, rename, reorder and delete empty blocks; populated blocks cannot be deleted", async ({ page, reload }) => {
    let editor = await openRoutineEditor(page, PUSH_A);
    await editor.getByRole("button", { name: "+ Add block" }).click();
    let block = dialog(page, "Edit block");
    await expect(block.getByText("0 entries")).toBeVisible();
    await block.getByRole("textbox", { name: "Name" }).fill("Finisher");
    await block.getByRole("button", { name: "Move block earlier" }).click();
    await block.getByRole("button", { name: "Save block" }).click();
    await expect(block).toBeHidden();
    await expect(editor.getByRole("button", { name: startsWith("Edit Finisher.") })).toContainText("0 entries · 4 of 5");

    await editor.getByRole("button", { name: startsWith("Edit Glute block.") }).click();
    block = dialog(page, "Edit block");
    await block.getByRole("textbox", { name: "Name" }).fill("Glute focus");
    await block.getByRole("button", { name: "Save block" }).click();
    await expect(editor.getByRole("button", { name: startsWith("Edit Glute focus.") })).toContainText("3 entries · 2 of 5");

    await editor.getByRole("button", { name: startsWith("Edit Upper-body work.") }).click();
    block = dialog(page, "Edit block");
    await expect(block.getByRole("button", { name: "Delete empty block" })).toBeDisabled();
    await block.getByRole("button", { name: "Close block editor" }).click();
    await editor.getByRole("button", { name: "Save routine" }).click();
    await expect(toast(page)).toHaveText("Routine updated.");

    await reload();
    await goToView(page, "Program");
    const main = mainArea(page);
    await expect(main.getByText("No exercises in Finisher.")).toBeVisible();
    await expect(main.getByText("Glute focus", { exact: true })).toBeVisible();
    const finisherY = (await main.getByText("Finisher", { exact: true }).boundingBox()).y;
    const accessoriesY = (await main.getByText("Upper-body accessories", { exact: true }).boundingBox()).y;
    const optionalY = (await main.getByText("Optional coverage · Rehab", { exact: true }).boundingBox()).y;
    assert.ok(accessoriesY < finisherY && finisherY < optionalY, "Finisher sits between Upper-body accessories and Optional coverage");
    await goToView(page, "Workout");
    await expect(mainArea(page).getByText("Glute focus", { exact: true })).toBeVisible();

    editor = await openRoutineEditor(page, PUSH_A);
    await editor.getByRole("button", { name: startsWith("Edit Finisher.") }).click();
    await dialog(page, "Edit block").getByRole("button", { name: "Delete empty block" }).click();
    await expect(dialog(page, "Edit block")).toBeHidden();
    await expect(editor.getByRole("button", { name: startsWith("Edit Finisher.") })).toHaveCount(0);
    await editor.getByRole("button", { name: "Save routine" }).click();
    await expect(mainArea(page).getByText("No exercises in Finisher.")).toHaveCount(0);
    await expect(mainArea(page).getByText("Gym · Required · 13 slots · 4 blocks")).toBeVisible();
  });

  appTest("program: search the Library and add an exercise to a deliberate block", async ({ page, reload }) => {
    await goToView(page, "Program");
    // The second "+ Add exercise" belongs to the second block; the picker names the block it targets.
    await mainArea(page).getByRole("button", { name: "+ Add exercise" }).nth(1).click();
    const picker = dialog(page, "Add exercise");
    await expect(picker.getByText(`${PUSH_A} · Glute block · Library`)).toBeVisible();
    await expect(picker.getByText("177 exercises")).toBeVisible();
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill("barbell hip");
    await expect(picker.getByText("1 exercise", { exact: true })).toBeVisible();
    await picker.getByRole("button", { name: "Add Barbell hip thrust to this routine" }).click();
    await expect(picker).toBeHidden();
    await expect(toast(page)).toHaveText("Exercise added to routine.");
    await expect(programRow(page, "Barbell hip thrust")).toHaveAccessibleName(/within Glute block\.$/);
    await expect(programRow(page, "Barbell hip thrust")).toContainText("7");
    await expect(programRow(page, "Dumbbell scaption raise")).toContainText("8");

    // A master without a default prescription cannot become a new slot.
    await mainArea(page).getByRole("button", { name: "+ Add exercise" }).nth(0).click();
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill("45° glute");
    await picker.getByRole("button", { name: "Add 45° glute-biased back extension to this routine" }).click();
    await expect(picker.getByRole("alert")).toHaveText(/Add a default prescription/);
    await picker.getByRole("button", { name: "Close exercise picker" }).click();

    await reload();
    await goToView(page, "Workout");
    await expect(checkButton(page, "Barbell hip thrust")).toHaveText("7");
    await expect(mainArea(page).getByRole("button", { name: "View Barbell hip thrust details" })).toContainText("3 × 6–10");
  });

  appTest("program: entry editor adds/removes/reorders choices, edits a prescription, makes a choice preferred, and changes role, block and note", async ({ page, reload }) => {
    await goToView(page, "Program");
    const editor = await openEntryEditor(page, "Cable serratus punch or Push-up plus");
    await expect(editor.getByRole("group", { name: "Routine entry role" }).getByRole("button", { name: "Optional" })).toHaveAttribute("aria-pressed", "true");

    // Add a Library-backed choice.
    await editor.getByRole("button", { name: "+ Add choice" }).click();
    const picker = dialog(page, "Add exercise");
    await expect(picker.getByText(`${PUSH_A} entry · add choice from Library`)).toBeVisible();
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill("push-up");
    await expect(picker.getByRole("button", { name: "Push-up plus is already a choice" })).toBeDisabled();
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill("wall angel");
    await picker.getByRole("button", { name: "Add Wall angel to this routine" }).click();
    await expect(picker).toBeHidden();
    const entryTitle = (title) => expect(editor).toHaveAccessibleName(title);
    await entryTitle("Cable serratus punch or Push-up plus or Wall angel");

    // Edit its prescription and move it earlier from the choice editor.
    await editor.getByRole("button", { name: "Edit Wall angel choice" }).click();
    let choice = dialog(page, "Wall angel");
    await expect(choice.getByText("3 of 3")).toBeVisible();
    await choice.getByRole("textbox", { name: "Prescription for this choice" }).fill("1 × 10");
    await choice.getByRole("button", { name: "Move choice earlier" }).click();
    await expect(choice.getByText("2 of 3")).toBeVisible();
    await choice.getByRole("button", { name: "Save choice" }).click();
    await entryTitle("Cable serratus punch or Wall angel or Push-up plus");

    // Make a choice preferred from the row, then remove one.
    await editor.getByRole("button", { name: "Make Push-up plus preferred" }).click();
    await entryTitle("Push-up plus or Cable serratus punch or Wall angel");
    await editor.getByRole("button", { name: "Remove Cable serratus punch choice" }).click();
    await entryTitle("Push-up plus or Wall angel");

    // Make preferred from the choice editor, and Move choice later.
    await editor.getByRole("button", { name: "Edit Wall angel choice" }).click();
    choice = dialog(page, "Wall angel");
    await choice.getByRole("button", { name: "Make preferred" }).click();
    await expect(choice.getByText("1 of 2 · Preferred")).toBeVisible();
    await choice.getByRole("button", { name: "Move choice later" }).click();
    await expect(choice.getByText("2 of 2")).toBeVisible();
    await choice.getByRole("button", { name: "Move choice earlier" }).click();
    await choice.getByRole("button", { name: "Save choice" }).click();
    await entryTitle("Wall angel or Push-up plus");

    // Role, block, note.
    await editor.getByRole("group", { name: "Routine entry role" }).getByRole("button", { name: "Main" }).click();
    await editor.getByRole("combobox", { name: "Routine block" }).selectOption({ label: "Upper-body accessories" });
    await editor.getByRole("textbox", { name: "Programming note — for this routine only" }).fill("Slow and controlled");
    await editor.getByRole("button", { name: "Save entry" }).click();
    await expect(editor).toBeHidden();
    await expect(toast(page)).toHaveText("Routine entry updated.");

    const row = programRow(page, "Wall angel or Push-up plus");
    await expect(row).toHaveAccessibleName(/within Upper-body accessories\.$/);
    await expect(row).toContainText("1 × 10 or 2 × 12–20");
    await expect(row).toContainText("Slow and controlled");

    await reload();
    await goToView(page, "Workout");
    await mainArea(page).getByRole("button", { name: "Open exercise choices for Wall angel or Push-up plus" }).click();
    const sheet = dialog(page, "Exercise choices");
    await expect(sheet.getByRole("button", { name: "Open reference for Wall angel" })).toContainText("Preferred");
    await expect(sheet.getByRole("button", { name: "Open reference for Wall angel" })).toContainText("1 × 10");
    await expect(sheet.getByText(/Slow and controlled/)).toBeVisible();
    await sheet.getByRole("button", { name: "Close exercise choices" }).click();
    // Now Main: Push A needs it for completion.
    for (const title of PUSH_A_MAIN) await setChecked(page, title, true);
    assert.doesNotMatch(await todayLabel(page), /completed/, "the entry changed to Main now blocks completion");
    await setChecked(page, "Wall angel or Push-up plus", true);
    assert.match(await todayLabel(page), /1 completed routine/);
  });

  appTest("program: reorder entries within a block with Move earlier / Move later", async ({ page, reload }) => {
    await goToView(page, "Program");
    let editor = await openEntryEditor(page, "Low-incline dumbbell press");
    await expect(editor.getByRole("button", { name: "Move earlier" })).toBeDisabled();
    await editor.getByRole("button", { name: "Close entry editor" }).click();

    editor = await openEntryEditor(page, "Machine overhead press");
    await editor.getByRole("button", { name: "Move earlier" }).click();
    await expect(editor).toBeHidden();
    await expect(toast(page)).toHaveText("Exercise moved.");
    await expect(programRows(page).nth(0)).toHaveAccessibleName(startsWith("Machine overhead press."));
    await expect(programRows(page).nth(0)).toContainText("1");

    editor = await openEntryEditor(page, "Low-incline dumbbell press");
    await editor.getByRole("button", { name: "Move later" }).click();
    await expect(editor).toBeHidden();
    await reload();
    await goToView(page, "Program");
    await expect(programRows(page).nth(0)).toHaveAccessibleName(startsWith("Machine overhead press."));
    await expect(programRows(page).nth(1)).toHaveAccessibleName(startsWith("Machine chest press."));
    await expect(programRows(page).nth(2)).toHaveAccessibleName(startsWith("Low-incline dumbbell press."));
    // Moving within a block never crosses into the next block.
    editor = await openEntryEditor(page, "Low-incline dumbbell press");
    await expect(editor.getByRole("button", { name: "Move later" })).toBeDisabled();
  });

  appTest("program: remove an entry from the routine without deleting its master exercise", async ({ page }) => {
    await goToView(page, "Program");
    const editor = await openEntryEditor(page, "Neck flexion");
    await editor.getByRole("button", { name: `Remove from ${PUSH_A}` }).click();
    await expect(dialog(page, "Remove Neck flexion?").getByText(`This removes only the ${PUSH_A} entry.`, { exact: false })).toBeVisible();
    await confirm(page, "Remove Neck flexion?", "Keep entry");
    await expect(programRow(page, "Neck flexion")).toHaveCount(1);
    await editor.getByRole("button", { name: `Remove from ${PUSH_A}` }).click();
    await confirm(page, "Remove Neck flexion?", "Remove entry");
    await expect(toast(page)).toHaveText("Exercise removed from routine.");
    await expect(programRow(page, "Neck flexion")).toHaveCount(0);
    await expect(mainArea(page).getByText("Gym · Required · 12 slots · 4 blocks")).toBeVisible();
    await goToView(page, "Library");
    await expect(libraryRow(page, "Neck flexion")).toBeVisible();
  });
});

// =============================================================================================
describe("Library", () => {
  appTest("library: search by name, alias, target and movement with punctuation-tolerant matching", async ({ page }) => {
    await goToView(page, "Library");
    await expect(libraryCount(page)).toHaveText("177 exercises");
    const search = mainArea(page).getByRole("searchbox", { name: "Search exercises" });
    for (const query of ["ab wheel", "abwheel", "AB-WHEEL"]) {
      await search.fill(query);
      await expect(libraryRows(page)).toHaveCount(1);
      await expect(libraryRow(page, "Ab-wheel rollout")).toBeVisible();
    }
    await search.fill("captains chair");
    await expect(libraryRow(page, "Captain’s-chair knee raise")).toBeVisible();
    await search.fill("wall angels"); // alias "Wall Angels"
    await expect(libraryRow(page, "Wall angel")).toBeVisible();
    await search.fill("hip hinge"); // movement
    await expect(libraryCount(page)).toHaveText("5 exercises");
    await search.fill("glute med"); // target
    await expect(libraryRow(page, "Clamshell")).toBeVisible();
    await search.fill("zzzz no match");
    await expect(mainArea(page).getByRole("heading", { name: "No matching exercises" })).toBeVisible();
    await mainArea(page).getByRole("button", { name: "Clear filters" }).click();
    await expect(libraryCount(page)).toHaveText("177 exercises");
  });

  appTest("library: quick groups and the Primary only / Primary + secondary target scope", async ({ page }) => {
    await goToView(page, "Library");
    const main = mainArea(page);
    await main.getByRole("button", { name: "Forearms", exact: true }).click();
    await expect(main.getByRole("button", { name: "Forearms", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(main.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(libraryCount(page)).toHaveText("9 exercises");
    await main.getByRole("button", { name: "Primary only" }).click();
    await expect(main.getByRole("button", { name: "Primary + secondary" })).toBeVisible();
    await expect(libraryCount(page)).toHaveText("12 exercises");
    await main.getByRole("button", { name: "Primary + secondary" }).click();
    await expect(libraryCount(page)).toHaveText("9 exercises");
    await main.getByRole("button", { name: "All", exact: true }).click();
    await expect(libraryCount(page)).toHaveText("177 exercises");
  });

  appTest("library: filters combine OR within a group and AND across groups, with apply and clear", async ({ page }) => {
    await goToView(page, "Library");
    await mainArea(page).getByRole("button", { name: "Filter exercises" }).click();
    const filter = dialog(page, "Filter exercises");
    await expect(filter.getByRole("group", { name: "Target matching" }).getByRole("button", { name: "Primary only" })).toHaveAttribute("aria-pressed", "true");
    await filter.getByRole("button", { name: "Rehab", exact: true }).click();
    await expect(filter.getByRole("button", { name: "Show 44 exercises" })).toBeVisible();
    await filter.getByRole("button", { name: "Band", exact: true }).click();
    await expect(filter.getByRole("button", { name: "Show 9 exercises" })).toBeVisible();
    await filter.getByRole("button", { name: "Cable", exact: true }).click();
    await filter.getByRole("button", { name: "Show 21 exercises" }).click();
    await expect(filter).toBeHidden();
    await expect(libraryCount(page)).toHaveText("21 exercises");
    await expect(mainArea(page).getByRole("button", { name: "Filter exercises, 2 active groups" })).toBeVisible();

    // Closing without applying keeps the applied filters.
    await mainArea(page).getByRole("button", { name: /^Filter exercises/ }).click();
    await filter.getByRole("button", { name: "Strength", exact: true }).click();
    await filter.getByRole("button", { name: "Close exercise filter" }).click();
    await expect(libraryCount(page)).toHaveText("21 exercises");

    await mainArea(page).getByRole("button", { name: /^Filter exercises/ }).click();
    await filter.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(filter.getByRole("button", { name: "Rehab", exact: true })).toHaveAttribute("aria-pressed", "false");
    await filter.getByRole("button", { name: "Show 177 exercises" }).click();
    await expect(libraryCount(page)).toHaveText("177 exercises");
    await expect(mainArea(page).getByRole("button", { name: "Filter exercises", exact: true })).toBeVisible();
  });

  appTest("library: open details before editing; add a master exercise with validation; it persists", async ({ page, reload }) => {
    await goToView(page, "Library");
    await libraryRow(page, "Clamshell").click();
    const reference = dialog(page, "Clamshell");
    await expect(reference.getByText("Default prescription", { exact: true })).toBeVisible();
    await reference.getByRole("button", { name: "Close exercise reference" }).click();

    await mainArea(page).getByRole("button", { name: "Add exercise" }).click();
    const editor = dialog(page, "Add exercise");
    await editor.getByRole("button", { name: "Save exercise" }).click();
    await expect(editor.getByRole("alert")).toHaveText("Enter an exercise name.");
    await editor.getByRole("textbox", { name: /^Name/ }).fill("Sled push");
    await editor.getByRole("textbox", { name: /^Aliases/ }).fill("Prowler push");
    await editor.getByRole("textbox", { name: "Default prescription" }).fill("4 × 20 m");
    await editor.getByRole("button", { name: "Save exercise" }).click();
    await expect(editor.getByRole("alert")).toHaveText("Choose a dominant target.");
    await editor.getByRole("combobox", { name: /Dominant target/ }).selectOption({ label: "Quads" });
    await editor.getByRole("combobox", { name: /Second primary target/ }).selectOption({ label: "Glute max" });
    await editor.getByRole("button", { name: /^Secondary involvement/ }).click();
    const secondary = dialog(page, "Secondary involvement");
    await expect(secondary.getByRole("button", { name: /^Quads/ })).toBeDisabled();
    await secondary.getByRole("button", { name: "Calves" }).click();
    await secondary.getByRole("button", { name: "Done" }).click();
    await expect(editor.getByRole("button", { name: /^Secondary involvement/ })).toContainText("Calves");
    await editor.getByRole("combobox", { name: /^Movement/ }).selectOption({ label: "Squat" });
    await editor.getByRole("button", { name: /^Equipment/ }).click();
    const equipment = dialog(page, "Equipment");
    await equipment.getByRole("button", { name: "Other" }).click();
    await equipment.getByRole("button", { name: "Done" }).click();
    await editor.getByRole("combobox", { name: /^Purpose/ }).selectOption({ label: "Strength" });
    await editor.getByText("Optional classification").click();
    await editor.getByRole("combobox", { name: "Style" }).selectOption({ label: "Compound" });
    await editor.getByRole("textbox", { name: "Notes and cues" }).fill("Drive through the floor.");
    await editor.getByRole("button", { name: "Save exercise" }).click();
    await expect(editor).toBeHidden();
    await expect(toast(page)).toHaveText("Exercise added.");
    await expect(libraryCount(page)).toHaveText("178 exercises");

    await reload();
    await goToView(page, "Library");
    await mainArea(page).getByRole("searchbox", { name: "Search exercises" }).fill("prowler");
    await libraryRow(page, "Sled push").click();
    const saved = dialog(page, "Sled push");
    await expect(saved.getByText("4 × 20 m", { exact: true })).toBeVisible();
    await expect(saved.getByText("Squat · Other · Compound")).toBeVisible();
    await expect(saved.getByText("Drive through the floor.")).toBeVisible();
    await expect(saved.getByText("Calves", { exact: true })).toBeVisible();
  });

  appTest("library: edit a master's relationships (reciprocal) and aliases", async ({ page, reload }) => {
    await goToView(page, "Library");
    await libraryRow(page, "Ab-wheel rollout").click();
    await dialog(page, "Ab-wheel rollout").getByRole("button", { name: "Edit exercise" }).click();
    const editor = dialog(page, "Edit exercise");
    await editor.getByRole("textbox", { name: /^Aliases/ }).fill("Rollout wheel");
    await editor.getByRole("button", { name: /^Related exercises/ }).click();
    const related = dialog(page, "Related exercises");
    await related.getByRole("searchbox", { name: "Search exercises" }).fill("plank");
    await related.getByRole("button", { name: startsWith("Long-lever plank") }).click();
    await related.getByRole("button", { name: startsWith("Side plank Obliques") }).click();
    await related.getByRole("combobox", { name: "Relationship to Long-lever plank" }).selectOption({ label: "Harder" });
    await related.getByRole("button", { name: "Remove relationship to Side plank" }).click();
    await expect(related.getByRole("region", { name: "Linked" }).getByRole("article")).toHaveCount(1);
    await related.getByRole("button", { name: "Done" }).click();
    await expect(editor.getByRole("button", { name: /^Related exercises/ })).toContainText("1 linked");
    await editor.getByRole("button", { name: "Save exercise" }).click();
    await expect(toast(page)).toHaveText("Exercise updated.");

    await reload();
    await goToView(page, "Library");
    await mainArea(page).getByRole("searchbox", { name: "Search exercises" }).fill("rollout wheel");
    await libraryRow(page, "Ab-wheel rollout").click();
    const reference = dialog(page, "Ab-wheel rollout");
    await reference.getByRole("button", { name: "Harder Long-lever plank" }).click();
    await expect(dialog(page, "Long-lever plank").getByRole("button", { name: "Easier Ab-wheel rollout" })).toBeVisible();
  });

  appTest("library: duplicate a master exercise", async ({ page }) => {
    await goToView(page, "Library");
    await libraryRow(page, "Clamshell").click();
    await dialog(page, "Clamshell").getByRole("button", { name: "Edit exercise" }).click();
    await dialog(page, "Edit exercise").getByRole("button", { name: "Duplicate exercise" }).click();
    const duplicate = dialog(page, "Duplicate exercise");
    await expect(duplicate.getByRole("textbox", { name: /^Name/ })).toHaveValue("Clamshell copy");
    await duplicate.getByRole("textbox", { name: /^Name/ }).fill("Banded clamshell");
    await duplicate.getByRole("button", { name: "Save exercise" }).click();
    await expect(toast(page)).toHaveText("Exercise duplicated.");
    await expect(libraryCount(page)).toHaveText("178 exercises");
    await expect(libraryRow(page, "Banded clamshell")).toBeVisible();
    await expect(libraryRow(page, "Clamshell")).toBeVisible();
  });

  appTest("library: delete a master exercise with a deletion impact summary; its single-choice slot and saved checks go", async ({ page }) => {
    // Impact summary for a preferred choice in a two-choice slot (kept).
    await goToView(page, "Library");
    await libraryRow(page, "Ab-wheel rollout").click();
    await dialog(page, "Ab-wheel rollout").getByRole("button", { name: "Edit exercise" }).click();
    await dialog(page, "Edit exercise").getByRole("button", { name: "Delete exercise" }).click();
    const summary = dialog(page, "Delete exercise");
    await expect(summary).toContainText("Programmed use: 1 slot.");
    await expect(summary).toContainText("0 alternative choices removed; 1 next choice promoted; 0 slots deleted");
    await confirm(page, "Delete exercise", "Keep exercise");
    await dialog(page, "Edit exercise").getByRole("button", { name: "Close exercise editor" }).click();
    await expect(libraryRow(page, "Ab-wheel rollout")).toBeVisible();

    // Delete a master that is the only choice of a slot that has a saved check today.
    await goToView(page, "Workout");
    await setChecked(page, "Neck flexion", true);
    await goToView(page, "Library");
    await libraryRow(page, "Neck flexion").click();
    await dialog(page, "Neck flexion").getByRole("button", { name: "Edit exercise" }).click();
    await dialog(page, "Edit exercise").getByRole("button", { name: "Delete exercise" }).click();
    await expect(summary).toContainText("Delete “Neck flexion”?");
    await expect(summary).toContainText("1 slot deleted with any saved checks");
    await expect(summary).toContainText(/Related links removed: \d+/);
    await confirm(page, "Delete exercise", "Delete exercise");
    await expect(toast(page)).toHaveText("Exercise deleted.");
    await expect(libraryRow(page, "Neck flexion")).toHaveCount(0);
    await expect(libraryCount(page)).toHaveText("176 exercises");
    await goToView(page, "Program");
    await expect(mainArea(page).getByText("Gym · Required · 12 slots · 4 blocks")).toBeVisible();
    await goToView(page, "Log");
    await expect(mainArea(page).getByText("No history yet")).toBeVisible();
  });
});

// =============================================================================================
describe("Log", () => {
  appTest("log: move between calendar months", async ({ page }) => {
    await goToView(page, "Log");
    const main = mainArea(page);
    await expect(main.getByText("November 2026", { exact: true })).toBeVisible();
    await expect(calendarDay(page, TODAY)).toHaveAccessibleName(`${TODAY}, today`);
    await main.getByRole("button", { name: "Previous month" }).click();
    await expect(main.getByText("October 2026", { exact: true })).toBeVisible();
    await expect(calendarDay(page, "Saturday, October 31, 2026")).toBeVisible();
    await main.getByRole("button", { name: "Next month" }).click();
    await main.getByRole("button", { name: "Next month" }).click();
    await expect(main.getByText("December 2026", { exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: /^\w+day, December \d+, 2026/ })).toHaveCount(31);
  });

  appTest("log: open a date, mark routines and a note, save, reopen from Recent; persists after reload", async ({ page, reload }) => {
    await saveDay(page, "Monday, November 2, 2026", { routines: { "Pull A": true }, note: "Felt strong" });
    await expect(toast(page)).toHaveText("Day updated.");
    await expect(calendarDay(page, "Monday, November 2, 2026")).toHaveAccessibleName("Monday, November 2, 2026, 1 completed routine, note recorded");
    await reload();
    await goToView(page, "Log");
    await expect(recentRows(page)).toHaveCount(1);
    await expect(recentRows(page).first()).toContainText("Pull A");
    await expect(recentRows(page).first()).toContainText("Note added");
    await recentRows(page).first().click();
    const day = dialog(page, "Monday, November 2");
    await expect(day.getByRole("checkbox", { name: startsWith("Pull A ") })).toBeChecked();
    await expect(day.getByRole("checkbox", { name: startsWith("Pull A ") })).toHaveAccessibleName(/8\/8 main/);
    await expect(day.getByRole("textbox", { name: "Note" })).toHaveValue("Felt strong");
    // Active-program routines are listed in stored order.
    const names = await day.getByRole("checkbox").evaluateAll((boxes) => boxes.map((box) => box.closest("label").querySelector("strong").textContent));
    assert.deepEqual(names, [PUSH_A, "Pull A", "Legs A", "Push B", "Pull B", "Legs B", "Home Base", "Push morning", "Pull morning", "Legs morning"]);
  });

  appTest("log: marking today checks current Main entries; unmarking clears that routine's checks", async ({ page }) => {
    await saveDay(page, TODAY, { routines: { "Pull A": true } });
    await goToView(page, "Workout");
    await routineTab(page, "Pull A").click();
    await expect(checkButton(page, "Neutral-grip pull-up or Assisted neutral-grip pull-up")).toHaveAttribute("aria-pressed", "true");
    await expect(checkButton(page, "Pallof press")).toHaveAttribute("aria-pressed", "true");
    await expect(checkButton(page, "Radial deviation")).toHaveAttribute("aria-pressed", "false");
    await setChecked(page, "Radial deviation", true);

    await saveDay(page, TODAY, { routines: { "Pull A": false } });
    await goToView(page, "Workout");
    await expect(checkButton(page, "Pallof press")).toHaveAttribute("aria-pressed", "false");
    await expect(checkButton(page, "Radial deviation")).toHaveAttribute("aria-pressed", "false");
  });

  appTest("log: clearing all completions, checks and the note removes the day record", async ({ page }) => {
    await saveDay(page, "Tuesday, November 3, 2026", { routines: { "Legs A": true }, note: "Short session" });
    await expect(recentRows(page)).toHaveCount(1);
    await saveDay(page, "Tuesday, November 3, 2026", { routines: { "Legs A": false }, note: "" });
    await expect(mainArea(page).getByText("No history yet")).toBeVisible();
    await expect(calendarDay(page, "Tuesday, November 3, 2026")).toHaveAccessibleName("Tuesday, November 3, 2026");
  });

  appTest("log: Recent lists the eight most recent nonempty dates", async ({ page }) => {
    for (let day = 1; day <= 9; day += 1) {
      const date = new Date(Date.UTC(2026, 9, 20 + day));
      const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
      if (day === 1) {
        await goToView(page, "Log");
        await mainArea(page).getByRole("button", { name: "Previous month" }).click();
      }
      await calendarDay(page, label).click();
      const editor = dialog(page, label.replace(/, \d{4}$/, ""));
      await editor.getByRole("textbox", { name: "Note" }).fill(`Note ${day}`);
      await editor.getByRole("button", { name: "Save day" }).click();
      await expect(editor).toBeHidden();
    }
    await expect(recentRows(page)).toHaveCount(8);
    await expect(recentRows(page).first()).toHaveAccessibleName(startsWith("Open Thursday, October 29, 2026. Note only"));
    await expect(recentRows(page).last()).toHaveAccessibleName(startsWith("Open Thursday, October 22, 2026."));
  });

  appTest("log: a past date shows routines recorded from another program as inactive, without offering new inactive completions", async ({ page }) => {
    await saveDay(page, "Monday, November 2, 2026", { routines: { "Pull A": true } });
    // Duplicate the program so a different program becomes active.
    const programs = await openProgramsFromProgram(page);
    await programs.getByRole("button", { name: `Edit ${PROGRAM}` }).click();
    await dialog(page, "Edit program").getByRole("button", { name: "Duplicate program" }).click();
    await dialog(page, "Add program").getByRole("button", { name: "Create program" }).click();
    await expect(toast(page)).toHaveText("Program created.");

    await goToView(page, "Log");
    await calendarDay(page, "Monday, November 2, 2026").click();
    const day = dialog(page, "Monday, November 2");
    await expect(day.getByText("Already recorded from another program")).toBeVisible();
    const inactive = day.getByRole("checkbox", { name: /Inactive/ });
    await expect(inactive).toHaveCount(1);
    await expect(inactive).toBeChecked();
    await expect(inactive).toHaveAccessibleName(startsWith(`Pull A ${PROGRAM} · Gym · Inactive`));
    // The active (copied) program's routines are offered, unchecked, with no other inactive routines.
    await expect(day.getByRole("checkbox", { name: startsWith(`Pull A ${PROGRAM} copy`) })).not.toBeChecked();
    await expect(day.getByRole("checkbox")).toHaveCount(11);
  });
});

// =============================================================================================
describe("Settings", () => {
  appTest("settings: theme toggle persists after reload", async ({ page, reload }) => {
    let settings = await openSettings(page);
    await expect(settings.getByRole("button", { name: /^Theme/ })).toHaveAccessibleName("Theme Light");
    await settings.getByRole("button", { name: /^Theme/ }).click();
    await expect(settings.getByRole("button", { name: /^Theme/ })).toHaveAccessibleName("Theme Dark");
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
    await reload();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
    settings = await openSettings(page);
    await expect(settings.getByRole("button", { name: /^Theme/ })).toHaveAccessibleName("Theme Dark");
    await settings.getByRole("button", { name: /^Theme/ }).click();
    await expect(settings.getByRole("button", { name: /^Theme/ })).toHaveAccessibleName("Theme Light");
    await reload();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");
  });

  appTest("settings: export downloads a JSON backup with schemaVersion and data", async ({ page }) => {
    await saveDay(page, "Monday, November 2, 2026", { note: "Exported note" });
    const settings = await openSettings(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      settings.getByRole("button", { name: "Export app data" }).click(),
    ]);
    assert.match(download.suggestedFilename(), /^gym-schedule-\d{4}-\d{2}-\d{2}\.json$/);
    const backup = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(typeof backup.schemaVersion, "number");
    assert.ok(backup.data && typeof backup.data === "object", "backup has data");
    assert.equal(backup.data.sessions["2026-11-02"].note, "Exported note");
    assert.equal(backup.data.programs[0].name, PROGRAM);
    assert.equal(backup.data.exercises.length, 177);
    assert.deepEqual(backup.data, await readState(page), "backup data equals the stored state");
    await expect(settings.getByText("App data could not be exported.")).toHaveCount(0);
  });

  appTest("settings: import replaces state only after confirmation; garbage shows a visible error", async ({ page }) => {
    await saveDay(page, "Monday, November 2, 2026", { note: "Before export" });
    let settings = await openSettings(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      settings.getByRole("button", { name: "Export app data" }).click(),
    ]);
    const backupPath = await download.path();
    const exported = JSON.parse(await readFile(backupPath, "utf8"));
    await closeSettings(page);

    // Change state after the export.
    await saveDay(page, "Monday, November 2, 2026", { note: "After export" });
    await goToView(page, "Program");
    await mainArea(page).getByRole("button", { name: "+ Add routine" }).click();
    await dialog(page, "Add routine").getByRole("textbox", { name: "Name" }).fill("Extra day");
    await dialog(page, "Add routine").getByRole("button", { name: "Save routine" }).click();
    await expect(routineTab(page, "Extra day")).toBeVisible();

    const importFile = async (files) => {
      settings = await openSettings(page);
      const [chooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        settings.getByRole("button", { name: "Import app data" }).click(),
      ]);
      await chooser.setFiles(files);
    };

    // Cancel keeps current state.
    await importFile(backupPath);
    await expect(dialog(page, "Import app data").getByText(/Replace the routines, exercises, and history/)).toBeVisible();
    await confirm(page, "Import app data", "Keep it");
    assert.equal((await readState(page)).sessions["2026-11-02"].note, "After export");

    // Garbage is rejected with a visible message and nothing changes.
    await closeSettings(page);
    await importFile({ name: "garbage.json", mimeType: "application/json", buffer: Buffer.from("{ not json") });
    await expect(settingsScopeAlert(page)).toHaveText("This backup is not compatible with this version of the app.");
    await expect(dialog(page, "Import app data")).toBeHidden();
    await closeSettings(page);
    await importFile({ name: "wrong.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, data: {} })) });
    await expect(settingsScopeAlert(page)).toHaveText("This backup is not compatible with this version of the app.");
    assert.equal((await readState(page)).sessions["2026-11-02"].note, "After export");
    await closeSettings(page);

    // Confirmed import replaces everything.
    await importFile(backupPath);
    await confirm(page, "Import app data", "Import data");
    await expect(toast(page)).toHaveText("App data imported.");
    assert.deepEqual(await readState(page), exported.data);
    await goToView(page, "Program");
    await expect(routineTab(page, "Extra day")).toHaveCount(0);
    await goToView(page, "Log");
    await calendarDay(page, "Monday, November 2, 2026").click();
    await expect(dialog(page, "Monday, November 2").getByRole("textbox", { name: "Note" })).toHaveValue("Before export");
  });

  appTest("settings: restore starting data requires confirmation", async ({ page }) => {
    const programs = await openProgramsFromProgram(page);
    await programs.getByRole("button", { name: `Edit ${PROGRAM}` }).click();
    await dialog(page, "Edit program").getByRole("textbox", { name: "Name" }).fill("My edited program");
    await dialog(page, "Edit program").getByRole("button", { name: "Save changes" }).click();
    await expect(activeProgramButton(page)).toHaveAccessibleName("Choose active program, currently My edited program");

    let settings = await openSettings(page);
    await settings.getByRole("button", { name: "Restore starting data" }).click();
    await expect(dialog(page, "Restore starting data").getByText(/Replace all current routines, exercises, and history/)).toBeVisible();
    await confirm(page, "Restore starting data", "Keep it");
    await closeSettings(page);
    await expect(activeProgramButton(page)).toHaveAccessibleName("Choose active program, currently My edited program");

    settings = await openSettings(page);
    await settings.getByRole("button", { name: "Restore starting data" }).click();
    await confirm(page, "Restore starting data", "Restore data");
    await expect(toast(page)).toHaveText("Starting data restored.");
    await goToView(page, "Program");
    await expect(activeProgramButton(page)).toHaveAccessibleName(`Choose active program, currently ${PROGRAM}`);
  });

  appTest("settings: owner-provided training rules are readable", async ({ page }) => {
    const settings = await openSettings(page);
    await expect(settings.getByRole("heading", { name: "Pain rule" })).toBeHidden();
    await settings.getByText("Training rules").click();
    for (const heading of ["Progression", "Pain rule", "Unilateral rule", "Duplication rule"]) {
      await expect(settings.getByRole("heading", { name: heading })).toBeVisible();
    }
  });
});

function settingsScopeAlert(page) {
  return settingsScope(page).getByRole("alert");
}
