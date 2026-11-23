#!/usr/bin/env node
// Capture deterministic screenshots of every primary view and reachable dialog/sheet.
//
//   node tools/screenshots.mjs <outDir>          (APP_ROOT=/abs/path serves another checkout)
//
// Matrix: 393×852 and 320×700, light and dark, deviceScaleFactor 1, isMobile/hasTouch.
// Determinism: fresh browser context per size/theme, Date fixed at 2026-11-04 10:00 (UTC context
// time zone, en-US locale), every shot starts from one of the saved states below, freshly
// reloaded (so on the Round tab), animations disabled, caret hidden.
// File names are stable: `<width>-<theme>-<name>.png`, e.g. 393-dark-round.png,
// 320-light-dialog-entry-editor.png. Re-running produces the same names for name-by-name diffing.
// Navigation, Settings and tapping on the Round tab (which pauses after a swap) come from
// tests/e2e/helpers.mjs.
//
// The saved states a shot can start from (its third item; "started" when left out):
//   first     the starting data: nothing counted yet
//   started   made by tapping through the app (seedThroughApp): counting started on the Round
//             tab, Push A running with two exercises logged and done, a Log day with a
//             completion and a note, a note-only day
//   break, round, running, done, complete
//             the same made-up history (historyState, built here with the app's own
//             js/model.js) stopped at five moments: back after eight weeks away; a round
//             under way; its next workout running; that workout finished today; the round
//             completed today

import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import * as model from "../js/model.js";
import { createDefaultState, stateProblem } from "../js/store.js";
import {
  STORAGE_KEY,
  closeSettings,
  escapeRegExp,
  expect,
  goToView,
  launchBrowser,
  openSettings,
  startServer,
  startsWith,
  tapOnRound,
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
const TODAY = "2026-11-04";
const PROGRAM = "PPL 9";
const OTHER_PROGRAM = "Full body 3×"; // the second program of the made-up history
const PUSH_A = "Push A";

// ---------- saved states ----------

// The model reads the clock (the day a round opens or ends). While history is played,
// "now" is 10:00 on the day being played: on("2026-10-05").
function withClock(play) {
  const RealDate = Date;
  let now = FIXED_TIME;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length) super(...args);
      else super(now);
    }

    static now() {
      return now;
    }
  };
  try {
    return play((dateKey) => {
      const [year, month, day] = dateKey.split("-").map(Number);
      now = new RealDate(year, month - 1, day, 10).getTime();
    });
  } finally {
    globalThis.Date = RealDate;
  }
}

// Ten weeks of made-up training, every kind of round in it. Block 1: round 4 complete,
// round 5 ended early, round 6 cut short by four weeks away. Block 2: round 1 with another
// program (ended by changing back), round 2 complete with an extra workout, round 3 under
// way: three of six done, an extra, a day note and a note-only day. `stage` says where it stops.
function historyState(theme, stage) {
  return withClock((on) => {
    const state = createDefaultState();
    state.settings.theme = theme;
    const followed = state.programs[0].id;
    const other = model.createProgram(state, { name: OTHER_PROGRAM });
    const addRoutine = (name, exercises) => {
      const blockId = `${name}-main`;
      const id = model.addRoutine(state, other, { name, group: "gym", status: "required", note: "", blocks: [{ id: blockId, name: "" }] });
      for (const exerciseId of exercises) model.addEntry(state, id, { exerciseId, blockId, prescription: model.exerciseById(state, exerciseId).defaultPrescription });
      return id;
    };
    const fullBodyA = addRoutine("Full body A", ["goblet-squat", "flat-dumbbell-press", "pronated-grip-lat-pulldown", "plank"]);
    addRoutine("Full body B", ["romanian-deadlift", "machine-overhead-press", "seated-leg-curl"]);

    // The first exercises of a workout logged and done, a little heavier each time.
    const times = {};
    const lift = (dateKey, routineId, slots) => {
      times[routineId] = (times[routineId] || 0) + 1;
      model.orderedEntries(model.routineById(state, routineId)).slice(0, slots).forEach((entry, index) => {
        const [{ exerciseId, prescription }] = entry.choices;
        const kg = String(20 + index * 12.5 + times[routineId] * 2.5);
        const sets = Array.from({ length: model.plannedSetCount(prescription) }, (_, set) => ({ kg, reps: String(10 - set), drops: [] }));
        model.saveEntrySets(state, { routineId, entryId: entry.id, exerciseId, sets, note: "", dateKey });
        model.setEntryChecked(state, routineId, entry.id, true, dateKey);
      });
    };
    // Finished workouts: [day, routine, minutes]. A routine of the other program is an extra.
    const did = (...workouts) => {
      for (const [dateKey, routineId, minutes] of workouts) {
        on(dateKey);
        const extra = model.routineProgram(state, routineId) !== model.roundProgram(state);
        (extra ? model.startGuestWorkout : model.startWorkout)(state, routineId, dateKey, 0);
        lift(dateKey, routineId, 4);
        model.finishWorkout(state, { now: minutes * 60000 });
      }
    };

    on("2026-08-17");
    model.setRoundNumber(state, 4);
    did(["2026-08-17", "push-a", 61], ["2026-08-18", "pull-a", 66], ["2026-08-20", "legs-a", 72], ["2026-08-21", "push-b", 59], ["2026-08-23", "pull-b", 63], ["2026-08-25", "legs-b", 70]);
    did(["2026-08-27", "push-a", 60], ["2026-08-28", "pull-a", 64], ["2026-08-31", "legs-a", 74], ["2026-09-02", "push-b", 57]);
    on("2026-09-04");
    model.endRound(state);
    did(["2026-09-05", "push-a", 62], ["2026-09-07", "pull-a", 65]);

    if (stage !== "break") {
      on("2026-10-05");
      model.answerBreak(state, true, "2026-10-05");
      model.followProgram(state, other);
      did(["2026-10-05", fullBodyA, 45]);
      on("2026-10-09");
      model.followProgram(state, followed);
      did(["2026-10-09", "push-a", 60], ["2026-10-10", "pull-a", 65], ["2026-10-12", "legs-a", 73], ["2026-10-14", fullBodyA, 44], ["2026-10-15", "push-b", 58], ["2026-10-17", "pull-b", 62], ["2026-10-20", "legs-b", 69]);
      did(["2026-10-27", "push-a", 58], ["2026-10-29", "pull-a", 64], ["2026-10-31", "legs-a", 71], ["2026-11-02", fullBodyA, 47]);
      on(TODAY);
      model.setDay(state, "2026-11-02", state.sessions["2026-11-02"].routineIds, "Hotel gym, lighter than usual");
      model.setDay(state, "2026-11-03", [], "Mobility only");
    }
    if (stage === "running") {
      model.startWorkout(state, "push-b", TODAY, FIXED_TIME - 34 * 60000);
      lift(TODAY, "push-b", 2);
    }
    if (stage === "done") did([TODAY, "push-b", 62]);
    if (stage === "complete") did(["2026-11-01", "push-b", 59], ["2026-11-03", "pull-b", 63], [TODAY, "legs-b", 66]);

    const problem = stateProblem(state);
    if (problem) throw new Error(`The "${stage}" state is not a valid saved state: ${problem}`);
    return state;
  });
}

function builtStates(theme) {
  const states = { first: createDefaultState() };
  states.first.settings.theme = theme;
  for (const stage of ["break", "round", "running", "done", "complete"]) states[stage] = historyState(theme, stage);
  return Object.fromEntries(Object.entries(states).map(([name, state]) => [name, JSON.stringify(state)]));
}

// ---------- finding things on screen ----------

const main = (page) => page.getByRole("main");
const dialog = (page, name) => page.getByRole("dialog", { name, exact: typeof name === "string" });
const button = (scope, name) => scope.getByRole("button", { name, exact: typeof name === "string" });
const routineTab = (page, name) => button(main(page), new RegExp(`^${escapeRegExp(name)}, (Gym|Home)$`));
const programRow = (page, title) => button(main(page), startsWith(`${title}. Tap to edit.`));
const entryEditor = (page) => page.getByRole("dialog").filter({ has: page.getByRole("region", { name: "Choices — first is preferred" }) });

async function shown(locator) {
  await expect(locator).toBeVisible();
  return locator;
}

// Scrolls the page so that this is at the top of the screen.
const toTop = (locator) => locator.evaluate((element) => element.scrollIntoView({ block: "start" }));

// One of the Round tab's sheets or confirmations, opened from its "More" row.
async function openRoundSheet(page, row, title = row) {
  await button(main(page), startsWith(row)).click();
  return shown(dialog(page, title));
}

async function openAllRounds(page) {
  await tapOnRound(page, button(main(page), startsWith("All rounds")));
  await shown(main(page).getByRole("heading", { name: "All rounds" }));
}

// One round's page, from All rounds: openRound(page, "Round 5").
async function openRound(page, name) {
  await openAllRounds(page);
  await button(main(page), startsWith(`${name},`)).click();
  await shown(button(main(page), "Back to All rounds"));
}

// The Workout tab showing a workout the round still asks for, from its row on the Round tab.
async function previewWorkout(page, routine) {
  await tapOnRound(page, button(main(page), startsWith(`${routine}, not done`)));
  await shown(button(main(page), `Start ${routine}`));
}

// Opens a Workout slot in place, unless it is open already.
async function openSlot(page, name) {
  const row = button(main(page), `View ${name} details`);
  if ((await row.getAttribute("aria-expanded")) !== "true") await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
}

async function finishWorkout(page) {
  await goToView(page, "Workout");
  await button(main(page), "Finish workout").click();
  return shown(dialog(page, /^Finish .+\?$/));
}

// Program in edit mode ("Edit" … "Done").
async function editProgram(page) {
  await goToView(page, "Program");
  await button(main(page), `Edit ${PROGRAM}`).click();
  await shown(button(main(page), "Done editing"));
}

async function openRoutineEditor(page, name = PUSH_A) {
  await editProgram(page);
  await routineTab(page, name).click();
  await button(main(page), `Edit ${name}: rename, notes, blocks`).click();
  return shown(dialog(page, `Edit ${name}`));
}

async function openEntry(page, title = "Serratus punch (cable) or Push-up plus") {
  await editProgram(page);
  await programRow(page, title).click();
  return shown(entryEditor(page));
}

async function openPrograms(page) {
  await goToView(page, "Program");
  await button(main(page), /^Look at another program/).click();
  return shown(dialog(page, "Programs"));
}

async function openMasterEditor(page, exercise) {
  await goToView(page, "Library");
  await button(main(page), `View ${exercise} details`).click();
  await button(dialog(page, exercise), "Edit exercise").click();
  return shown(dialog(page, "Edit exercise"));
}

async function chooseImportFile(page, files) {
  const settings = await openSettings(page);
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    button(settings, "Import app data").click(),
  ]);
  await chooser.setFiles(files);
}

// ---------- the shots ----------

// [name, steps, saved state]. Every shot starts from its saved state, freshly reloaded on
// the Round tab.
const SHOTS = [
  // ---- Round tab ----
  ["round-first-time", async () => {}, "first"],
  // Counting just started, with one program: the "More" rows that can't be used say why.
  ["round-more-one-program", async (page) => {
    await tapOnRound(page, button(main(page), "Start counting"));
    await button(main(page), "Change round number").scrollIntoViewIfNeeded();
  }, "first"],
  ["round", async () => {}, "round"],
  ["round-more", async (page) => { await button(main(page), "Change round number").scrollIntoViewIfNeeded(); }, "round"],
  ["round-running", async () => {}, "running"],
  ["round-done-today", async () => {}, "done"],
  ["round-complete", async () => {}, "complete"],
  ["round-welcome-back", async () => {}, "break"],
  ["round-all", async (page) => { await openAllRounds(page); }, "round"],
  // A complete round with an extra workout; then one that ended early, with what was not done.
  ["round-one", async (page) => { await openRound(page, "Round 2 · block 2"); }, "round"],
  ["round-one-ended-early", async (page) => { await openRound(page, "Round 5"); }, "round"],
  ["dialog-round-guest", async (page) => { await openRoundSheet(page, "A workout from another program"); }, "round"],
  ["dialog-round-follow", async (page) => { await openRoundSheet(page, "Follow a different program"); }, "round"],
  ["dialog-round-follow-confirm", async (page) => {
    const programs = await openRoundSheet(page, "Follow a different program");
    await button(programs, startsWith(OTHER_PROGRAM)).click();
    await shown(dialog(page, `Follow ${OTHER_PROGRAM}?`));
  }, "round"],
  ["dialog-round-number", async (page) => { await openRoundSheet(page, "Change round number"); }, "round"],
  ["dialog-confirm-end-round", async (page) => { await openRoundSheet(page, "End round 3 now", "End round 3 now?"); }, "round"],
  ["dialog-confirm-new-block", async (page) => {
    const sheet = await openRoundSheet(page, "Change round number");
    await button(sheet, "Start a new block at round 1").click();
    await shown(dialog(page, "Start block 3?"));
  }, "round"],

  // ---- Workout ----
  ["workout-preview", async (page) => { await goToView(page, "Workout"); }, "round"],
  ["workout-preview-slot-open", async (page) => {
    await goToView(page, "Workout");
    await openSlot(page, "Chest fly (cable, high to low) or Decline chest press (machine)");
  }, "round"],
  // Pull A: two named Optional blocks. A workout the round hasn't reached yet, before counting.
  ["workout-preview-pull-a", async (page) => { await previewWorkout(page, "Pull A"); }, "first"],
  ["workout-running", async (page) => { await goToView(page, "Workout"); }],
  // A done slot opened: its sets of today.
  ["workout-running-slot-open", async (page) => {
    await goToView(page, "Workout");
    await openSlot(page, "Low-incline press (dumbbell)");
  }],
  // With history: "Last time" in the open slot.
  ["workout-running-history", async (page) => { await goToView(page, "Workout"); }, "running"],
  ["workout-running-extra", async (page) => {
    const sheet = await openRoundSheet(page, "A workout from another program");
    await button(sheet, `Start Full body A from ${OTHER_PROGRAM}`).click();
    await shown(button(main(page), "Finish workout"));
  }, "round"],

  // ---- Workout sheets ----
  ["dialog-exercise-reference", async (page) => {
    // A Pull A row, so the reference shows its "For this routine" note.
    await previewWorkout(page, "Pull A");
    await openSlot(page, "Lat pulldown (machine, overhand)");
    await button(main(page), "Open exercise page for Lat pulldown (machine, overhand)").click();
    await shown(dialog(page, "Lat pulldown (machine, overhand)"));
  }, "first"],
  ["dialog-exercise-reference-related", async (page) => {
    await goToView(page, "Workout");
    await openSlot(page, "Low-incline press (dumbbell)");
    await button(main(page), "Open exercise page for Low-incline press (dumbbell)").click();
    await button(dialog(page, "Low-incline press (dumbbell)"), /^Alternative Chest press/).click();
    await shown(dialog(page, "Chest press (machine)"));
  }],
  ["dialog-log", async (page) => {
    await goToView(page, "Workout");
    await button(main(page), "Log sets for Chest press (plate-loaded) or Chest press (machine)").click();
    await page.locator("#logDialog").getByLabel("Weight for set 1, kg").fill("50");
    await page.locator("#logDialog").getByLabel("Reps for set 1").fill("10");
    await page.locator("#logDialog").getByRole("button", { name: "Set 1 done", exact: true }).click();
    await page.locator("#logDialog").getByRole("button", { name: "Drop set" }).click();
    await shown(page.locator("#logDialog"));
  }],
  ["dialog-history", async (page) => {
    await goToView(page, "Workout");
    await openSlot(page, "Chest press (plate-loaded) or Chest press (machine)");
    await button(main(page), "Open exercise page for Chest press (plate-loaded)").click();
    await page.locator("#exerciseDetailDialog").getByRole("button", { name: "History" }).click();
    await shown(page.locator("#historyDialog"));
  }],
  // The open slot's "Last time" line opens the same sheet, here with ten weeks in it.
  ["dialog-history-last-time", async (page) => {
    await goToView(page, "Workout");
    await button(main(page), /^Last time .*Open history of Incline chest press \(machine\)$/).click();
    await shown(page.locator("#historyDialog"));
  }, "running"],
  ["dialog-choice-sheet", async (page) => {
    await goToView(page, "Workout");
    await openSlot(page, "Serratus punch (cable) or Push-up plus");
    await button(main(page), "Open exercise choices for Serratus punch (cable) or Push-up plus").click();
    await shown(dialog(page, "Exercise choices"));
  }],
  ["dialog-choice-reference", async (page) => {
    await goToView(page, "Workout");
    await openSlot(page, "Serratus punch (cable) or Push-up plus");
    await button(main(page), "Open exercise choices for Serratus punch (cable) or Push-up plus").click();
    await button(dialog(page, "Exercise choices"), "Open reference for Push-up plus").click();
    await shown(dialog(page, "Push-up plus"));
  }],
  ["dialog-video-search", async (page) => {
    await goToView(page, "Workout");
    await openSlot(page, "Low-incline press (dumbbell)");
    await button(main(page), "Find a video for preferred choice Low-incline press (dumbbell)").click();
    await shown(dialog(page, "Low-incline press (dumbbell)"));
  }],
  ["dialog-picker-extra", async (page) => {
    await goToView(page, "Workout");
    await button(main(page), "Add exercise for today").click();
    await shown(dialog(page, "Add exercise"));
  }],
  ["dialog-finish", async (page) => { await finishWorkout(page); }, "running"],
  ["dialog-finish-result", async (page) => {
    const summary = await finishWorkout(page);
    await button(summary, "Finish").click();
    await shown(dialog(page, "Push B finished"));
  }, "running"],
  ["dialog-confirm-cancel-workout", async (page) => {
    await goToView(page, "Workout");
    await button(main(page), "Cancel").click();
    await shown(dialog(page, `Cancel ${PUSH_A}?`));
  }],

  // ---- Program ----
  ["program", async (page) => { await goToView(page, "Program"); }, "round"],
  ["program-slot-open", async (page) => {
    await goToView(page, "Program");
    await button(main(page), "Show Chest press (plate-loaded) or Chest press (machine) details").click();
    await shown(button(main(page), "Hide Chest press (plate-loaded) or Chest press (machine) details"));
  }, "round"],
  ["program-last-tab", async (page) => {
    await goToView(page, "Program");
    await routineTab(page, "Legs B").click();
  }, "round"],
  ["program-edit", async (page) => { await editProgram(page); }, "round"],
  // Looking at a program that isn't the one being followed.
  ["program-other", async (page) => {
    const programs = await openPrograms(page);
    await button(programs, startsWith(OTHER_PROGRAM)).click();
    await shown(button(main(page), `Follow ${OTHER_PROGRAM}`));
  }, "round"],

  // ---- Program sheets ----
  ["dialog-programs", async (page) => { await openPrograms(page); }, "round"],
  ["dialog-program-add", async (page) => {
    const programs = await openPrograms(page);
    await button(programs, "Add program").click();
    await shown(dialog(page, "Add program"));
  }],
  ["dialog-program-editor", async (page) => {
    await editProgram(page);
    await button(main(page), "Program rules").click();
    await shown(dialog(page, "Edit program"));
  }],
  ["dialog-routine-add", async (page) => {
    await editProgram(page);
    await button(main(page), "Add a workout").click();
    await shown(dialog(page, "Add workout"));
  }],
  ["dialog-routine-editor", async (page) => { await openRoutineEditor(page); }],
  ["dialog-block-editor", async (page) => {
    const editor = await openRoutineEditor(page);
    await button(editor, startsWith("Edit Optional glute block.")).click();
    await shown(dialog(page, "Edit block"));
  }],
  ["dialog-entry-editor", async (page) => { await openEntry(page); }],
  ["dialog-choice-editor", async (page) => {
    const editor = await openEntry(page);
    await button(editor, "Edit Push-up plus choice").click();
    await shown(dialog(page, "Push-up plus"));
  }],
  ["dialog-picker", async (page) => {
    await editProgram(page);
    await button(main(page), "Add exercise to this block").click();
    await shown(dialog(page, "Add exercise"));
  }],
  ["dialog-picker-choice", async (page) => {
    const editor = await openEntry(page);
    await button(editor, "+ Add choice").click();
    await shown(dialog(page, "Add exercise"));
  }],
  ["dialog-confirm-delete-program", async (page) => {
    const programs = await openPrograms(page);
    await button(programs, `Edit ${PROGRAM}`).click();
    await button(dialog(page, "Edit program"), "Delete program").click();
    await shown(dialog(page, `Delete ${PROGRAM}?`));
  }],
  ["dialog-confirm-delete-routine", async (page) => {
    const editor = await openRoutineEditor(page);
    await button(editor, "Delete workout").click();
    await shown(dialog(page, `Delete ${PUSH_A}?`));
  }],
  ["dialog-confirm-remove-entry", async (page) => {
    const editor = await openEntry(page, "Neck flexion");
    await button(editor, `Remove from ${PUSH_A}`).click();
    await shown(dialog(page, "Remove Neck flexion?"));
  }],

  // ---- Library ----
  ["library", async (page) => { await goToView(page, "Library"); }],
  ["library-search", async (page) => {
    await goToView(page, "Library");
    await main(page).getByRole("searchbox", { name: "Search exercises" }).fill("plank");
    await page.keyboard.press("Tab");
  }],
  ["library-filtered", async (page) => {
    await goToView(page, "Library");
    await button(main(page), "Core").click();
    await main(page).getByRole("button", { name: "Primary only" }).click();
  }],
  ["dialog-filter", async (page) => {
    await goToView(page, "Library");
    await main(page).getByRole("button", { name: "Filter exercises" }).click();
    await shown(dialog(page, "Filter exercises"));
  }],
  ["dialog-exercise-editor", async (page) => { await openMasterEditor(page, "Low-incline press (dumbbell)"); }],
  ["dialog-exercise-editor-add", async (page) => {
    await goToView(page, "Library");
    await main(page).getByRole("button", { name: "Add exercise" }).click();
    await shown(dialog(page, "Add exercise"));
  }],
  ["dialog-classification-picker", async (page) => {
    const editor = await openMasterEditor(page, "Low-incline press (dumbbell)");
    await button(editor, /^Equipment/).click();
    await shown(dialog(page, "Equipment"));
  }],
  ["dialog-relationship-editor", async (page) => {
    const editor = await openMasterEditor(page, "Low-incline press (dumbbell)");
    await button(editor, /^Alternatives and progressions/).click();
    await shown(dialog(page, "Alternatives and progressions"));
  }],
  ["dialog-confirm-delete-exercise", async (page) => {
    const editor = await openMasterEditor(page, "Ab-wheel rollout");
    await button(editor, "Delete exercise").click();
    await shown(dialog(page, "Delete exercise"));
  }],

  // ---- Log ----
  ["log", async (page) => { await goToView(page, "Log"); }, "round"],
  ["log-recent", async (page) => {
    await goToView(page, "Log");
    await button(main(page), startsWith("Open Tuesday, October 27, 2026")).scrollIntoViewIfNeeded();
  }, "round"],
  ["log-progress", async (page) => {
    await goToView(page, "Log");
    await button(main(page), "Progress").click();
  }, "round"],
  // A day with an extra workout, its sets and a note.
  ["dialog-day-editor", async (page) => {
    await goToView(page, "Log");
    await button(main(page), startsWith("Monday, November 2, 2026")).click();
    await shown(dialog(page, "Monday, November 2"));
  }, "round"],

  // ---- Settings (the gear on the Round tab) ----
  ["settings", async (page) => { await openSettings(page); }],
  ["settings-rules", async (page) => {
    const settings = await openSettings(page);
    await toTop(settings.getByRole("heading", { name: "Training rules" }));
  }],
  ["settings-rules-edit", async (page) => {
    const settings = await openSettings(page);
    await button(settings, "Edit training rules").click();
    await shown(button(settings, "Save rules"));
    await toTop(settings.getByRole("heading", { name: "Training rules" }));
  }],
  ["settings-import-error", async (page) => {
    await chooseImportFile(page, { name: "garbage.json", mimeType: "application/json", buffer: Buffer.from("{ not json") });
    await expect(page.getByText("This file isn't a Gym Schedule backup.")).toBeVisible();
  }],
  ["dialog-confirm-import", async (page, { backupPath }) => {
    await chooseImportFile(page, backupPath);
    await shown(dialog(page, "Import app data"));
  }],
  ["dialog-confirm-restore", async (page) => {
    const settings = await openSettings(page);
    await button(settings, "Restore starting data").click();
    await shown(dialog(page, "Restore starting data"));
  }],
];

// The "started" state, made the way the owner would: every step goes through the app.
async function seedThroughApp(page, theme, tempDir) {
  await page.goto(page.__appUrl);
  await waitForApp(page);
  // Counting starts on the Round tab's first-time card; its next card starts Push A,
  // which opens on Workout.
  await tapOnRound(page, button(main(page), "Start counting"));
  await tapOnRound(page, button(main(page), `Start ${PUSH_A}`));
  await shown(button(main(page), "Finish workout"));
  // Two exercises logged and done.
  for (const [title, sets] of [["Low-incline press (dumbbell)", [["22.5", "10"], ["22.5", "9"], ["22.5", "8"]]], ["Overhead press (machine)", [["35", "12"], ["35", "10"]]]]) {
    await button(main(page), `Log sets for ${title}`).click();
    const sheet = await shown(page.locator("#logDialog"));
    for (const [index, [kg, reps]] of sets.entries()) {
      await sheet.getByLabel(`Weight for set ${index + 1}, kg`).fill(kg);
      await sheet.getByLabel(`Reps for set ${index + 1}`).fill(reps);
    }
    await sheet.getByRole("button", { name: "Exercise done", exact: true }).click();
    await expect(button(main(page), `Log sets for ${title}, done`)).toBeVisible();
  }
  // Log history: a completed routine with a note, and a note-only day.
  await goToView(page, "Log");
  for (const [date, title, routine, note] of [
    ["Monday, November 2, 2026", "Monday, November 2", "Pull A", "Felt strong"],
    ["Tuesday, November 3, 2026", "Tuesday, November 3", null, "Mobility only"],
  ]) {
    await button(main(page), startsWith(date)).click();
    const day = await shown(dialog(page, title));
    if (routine) await day.getByRole("checkbox", { name: startsWith(`${routine} `) }).setChecked(true, { force: true });
    await day.getByRole("textbox", { name: "Note" }).fill(note);
    await button(day, "Save day").click();
    await expect(day).toBeHidden();
  }
  // Theme and an exported backup file for the import-confirmation shot.
  const settings = await openSettings(page);
  if (theme === "dark") {
    await button(settings, /^Theme/).click();
    await expect(button(settings, /^Theme/)).toHaveAccessibleName("Theme Dark");
  }
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    button(settings, "Export app data").click(),
  ]);
  const backupPath = path.join(tempDir, `backup-${theme}-${page.viewportSize().width}.json`);
  await download.saveAs(backupPath);
  await closeSettings(page);
  const started = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  return { started, backupPath };
}

async function resetTo(page, saved) {
  await page.evaluate(([key, value]) => {
    sessionStorage.clear();
    localStorage.setItem(key, value);
  }, [STORAGE_KEY, saved]);
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
    const { started, backupPath } = await seedThroughApp(page, theme, tempDir);
    const states = { ...builtStates(theme), started };
    for (const [name, run, state = "started"] of SHOTS) {
      const file = `${width}-${theme}-${name}.png`;
      try {
        await resetTo(page, states[state]);
        await run(page, { backupPath });
        await settle(page);
        await page.screenshot({ path: path.join(outDir, file), animations: "disabled", caret: "hide", scale: "css" });
        results.push({ file, ok: true });
      } catch (error) {
        results.push({ file, ok: false, error: error.message.split("\n")[0] });
      }
    }
  } catch (error) {
    // Nothing can be captured without the "started" state.
    results.push(...SHOTS.map(([name]) => ({ file: `${width}-${theme}-${name}.png`, ok: false, error: `seeding failed: ${error.message.split("\n")[0]}` })));
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
