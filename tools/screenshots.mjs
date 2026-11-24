#!/usr/bin/env node
// Capture deterministic screenshots of every primary view and reachable dialog/sheet.
//
//   node tools/screenshots.mjs <outDir>          (APP_ROOT=/abs/path serves another checkout)
//   SHOTS=result node tools/screenshots.mjs <outDir>   only the shots whose name contains "result"
//
// Matrix: 393×852 and 320×700, light and dark, deviceScaleFactor 1, isMobile/hasTouch.
// Determinism: fresh browser context per size/theme, Date fixed at 2026-11-04 10:00 (UTC context
// time zone, en-US locale), every shot starts from one of the saved states below, freshly
// reloaded (so on the round page, or on the workout in progress), animations disabled, caret
// hidden. File names are stable: `<width>-<theme>-<name>.png`, e.g. 393-dark-round.png,
// 320-light-dialog-entry-editor.png. Re-running produces the same names for name-by-name diffing.
// Navigation, Settings and the wait after a tap that changes the bottom button come from
// tests/e2e/helpers.mjs.
//
// The saved states a shot can start from (its third item; "started" when left out):
//   first     the starting data: nothing counted yet
//   empty     no program at all
//   started   made by tapping through the app (seedThroughApp): Push A started from the round
//             page (counting starts with it) and running with two exercises logged and done,
//             a Log day with a completion and a note, a note-only day
//   break, round, running, finishing, completing, done, complete
//             the same made-up history (historyState, built here with the app's own
//             js/model.js) stopped at seven moments: back after eight weeks away; a round
//             under way; its next workout running; the same with every main exercise done;
//             the round's last workout running with every main exercise done; that
//             workout finished today; the round completed today

import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import * as model from "../js/model.js";
import { createDefaultState, stateProblem } from "../js/store.js";
import {
  STORAGE_KEY,
  backToRound,
  bottomButton,
  closeSettings,
  escapeRegExp,
  expect,
  goToView,
  launchBrowser,
  openSettings,
  roundSettles,
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
const TRICEPS = "Overhead triceps extension (cable) or Skull crusher (cable, behind head) or Skull crusher (EZ bar, behind head)"; // a slot of Push B with three choices

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
    // `top`: every set of the first exercise reaches the top of its rep range ("add weight").
    const lift = (dateKey, routineId, slots, { top = false } = {}) => {
      times[routineId] = (times[routineId] || 0) + 1;
      model.orderedEntries(model.routineById(state, routineId)).slice(0, slots).forEach((entry, index) => {
        const [{ exerciseId, prescription }] = entry.choices;
        const kg = String(20 + index * 12.5 + times[routineId] * 2.5);
        const range = /[×x]\s*(\d+)(?:\s*[–-]\s*(\d+))?/.exec(prescription);
        const most = top && index === 0 && range ? Number(range[2] || range[1]) : 0;
        const sets = Array.from({ length: model.plannedSetCount(prescription) }, (_, set) => ({ kg, reps: String(most || 10 - set), drops: [] }));
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
    if (stage === "complete" || stage === "completing") did(["2026-11-01", "push-b", 59], ["2026-11-03", "pull-b", 63]);
    // A workout in progress: Push B, or Legs B, the last of the round ("completing").
    if (stage === "running" || stage === "finishing" || stage === "completing") {
      const routineId = stage === "completing" ? "legs-b" : "push-b";
      model.startWorkout(state, routineId, TODAY, FIXED_TIME - 34 * 60000);
      const main = model.orderedEntries(model.routineById(state, routineId)).filter((entry) => entry.role === "main").length;
      lift(TODAY, routineId, stage === "running" ? 2 : main, { top: stage === "completing" });
    }
    // Push B running with every kind of logged sets: two weights (after a warm-up), a drop
    // set, a per-side weight, an assisted one, reps only, and seconds (an exercise added
    // for today); three main exercises and the optional ones not done.
    if (stage === "variety") {
      model.startWorkout(state, "push-b", TODAY, FIXED_TIME - 41 * 60000);
      model.exerciseById(state, "incline-chest-press-machine").weightMode = "per-side";
      model.exerciseById(state, "hanging-knee-raise").weightMode = "assistance";
      const extra = model.addExtra(state, "90-90-lean");
      const set = (kg, reps, more = {}) => ({ kg, reps, drops: [], ...more });
      for (const [entryId, exerciseId, sets] of [
        ["push-b-01", "machine-overhead-press", [set("20", "12", { warmup: true }), set("40", "10"), set("42.5", "8"), set("42.5", "8")]],
        ["push-b-02", "flat-dumbbell-press", [set("30", "10", { drops: [{ kg: "20", reps: "8" }] }), set("30", "9")]],
        ["push-b-03", "incline-chest-press-machine", [set("25", "10"), set("25", "10")]],
        ["push-b-07", "hanging-knee-raise", [set("-20", "12"), set("-20", "10")]],
        ["push-b-08", "ab-wheel-rollout", [set("", "10"), set("", "8")]],
        [extra, "90-90-lean", [set("", "30"), set("", "25")]],
      ]) model.saveEntrySets(state, { routineId: "push-b", entryId, exerciseId, sets, note: "", dateKey: TODAY });
    }
    if (stage === "done") did([TODAY, "push-b", 62]);
    if (stage === "complete") did([TODAY, "legs-b", 66]);

    const problem = stateProblem(state);
    if (problem) throw new Error(`The "${stage}" state is not a valid saved state: ${problem}`);
    return state;
  });
}

// No program at all (the round page says so and offers the ways in).
function emptyState(theme) {
  const state = createDefaultState();
  Object.assign(state, { programs: [], routines: [], sessions: {} });
  Object.assign(state.settings, { theme, activeProgramId: "", activeRoutineId: "", activeWorkout: null });
  const problem = stateProblem(state);
  if (problem) throw new Error(`The "empty" state is not a valid saved state: ${problem}`);
  return state;
}

function builtStates(theme) {
  const states = { first: createDefaultState(), empty: emptyState(theme) };
  states.first.settings.theme = theme;
  for (const stage of ["break", "round", "running", "finishing", "completing", "done", "complete", "variety"]) states[stage] = historyState(theme, stage);
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

// One of the round page's sheets, opened from a row under its list.
async function openRoundSheet(page, row, title = row) {
  await button(main(page), startsWith(row)).click();
  return shown(dialog(page, title));
}

async function openAllRounds(page) {
  await tapOnRound(page, button(main(page), startsWith("Rounds and blocks")));
  await shown(main(page).getByRole("heading", { name: "Rounds and blocks" }));
}

// One round's page, from All rounds: openRound(page, "Round 5").
async function openRound(page, name) {
  await openAllRounds(page);
  await button(main(page), startsWith(`${name},`)).click();
  await shown(button(main(page), "Back to Rounds and blocks"));
}

// Opens a row of the round page in place.
async function openRoundRow(page, routine) {
  await tapOnRound(page, button(main(page), startsWith(`${routine}, `)));
}

// From the workout in progress (where the app opens) back to the round page.
async function roundPage(page) {
  await tapOnRound(page, backToRound(page));
  await shown(button(main(page), "Settings"));
}

// Starts a workout from the round page's bottom button.
async function startFromRound(page, routine) {
  await roundSettles(page);
  // A round not begun yet is begun first (Home's "Begin round N").
  const begin = bottomButton(page, /^Begin round \d+$/);
  if (await begin.isVisible()) await tapOnRound(page, begin);
  if (!(await bottomButton(page, `Start ${routine}`).isVisible())) await tapOnRound(page, button(main(page), startsWith(`${routine}, `)));
  await tapOnRound(page, bottomButton(page, `Start ${routine}`));
  await shown(backToRound(page));
}

// Opens a slot of the workout in place, unless it is open already (a name or a RegExp).
async function openSlot(page, name) {
  const row = button(main(page), typeof name === "string" ? `View ${name} details` : name);
  if ((await row.getAttribute("aria-expanded")) !== "true") await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
}

// Finish (top right) asks first: "Finish" ("Finish anyway" when nothing was logged), then
// the result page.
async function finishTo(page, routine, { nothingLogged = false } = {}) {
  await button(main(page), `Finish ${routine}`).click();
  if (nothingLogged) await button(dialog(page, "Nothing is logged"), "Finish anyway").click();
  else await button(dialog(page, `Finish ${routine}?`), "Finish").click();
  await shown(main(page).getByRole("heading", { name: `${routine} done` }));
  await roundSettles(page);
}

// Logs one set of a slot of the workout in progress and closes its sheet.
async function logOneSet(page, title, kg, reps) {
  await button(main(page), new RegExp(`^Log sets for ${escapeRegExp(title)}`)).click();
  const sheet = await shown(page.locator("#logDialog"));
  await sheet.getByLabel("Weight for set 1, kg").fill(kg);
  await sheet.getByLabel("Reps for set 1").fill(reps);
  await sheet.getByRole("button", { name: "Set 1 done", exact: true }).click();
  await sheet.getByRole("button", { name: "Close", exact: true }).first().click();
  await expect(sheet).toBeHidden();
}

// Scrolls the workout's list to its end.
const toEnd = (page) => button(main(page), /^(Cancel workout|Close again)$/).scrollIntoViewIfNeeded();

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

// [name, steps, saved state]. Every shot starts from its saved state, freshly reloaded: on
// the round page, or on the workout when one is in progress.
const SHOTS = [
  // ---- The round page (the Workout tab's first page) ----
  // Home before anything is counted: the round laid out, "Begin round 1".
  ["home-first-time", async () => {}, "first"],
  // Begun: the training day with nothing done yet.
  ["home-begun", async (page) => { await tapOnRound(page, bottomButton(page, "Begin round 1")); }, "first"],
  // A training day, the round across two calendar weeks.
  ["home", async () => {}, "round"],
  // Another workout picked: the lifts to beat, today's square and the bottom button follow.
  ["home-picked", async (page) => { await openRoundRow(page, "Legs B"); }, "round"],
  ["home-running", async (page) => { await roundPage(page); }, "running"],
  ["home-done-today", async () => {}, "done"],
  // The round completed today, whole, and the next one laid out.
  ["home-complete", async () => {}, "complete"],
  ["home-welcome-back", async () => {}, "break"],
  ["home-welcome-back-restart", async (page) => {
    await main(page).getByRole("button", { name: "Round 1 · block 2" }).click();
    await shown(main(page).getByRole("heading", { level: 1, name: "Round 1 · block 2" }));
  }, "break"],
  ["home-no-program", async () => {}, "empty"],
  ["round-all", async (page) => { await openAllRounds(page); }, "round"],
  // A complete round with an extra workout; then one that ended early, with what was not done.
  ["round-one", async (page) => { await openRound(page, "Round 2 · block 2"); }, "round"],
  ["round-one-ended-early", async (page) => { await openRound(page, "Round 5"); }, "round"],
  ["dialog-round-guest", async (page) => { await openRoundSheet(page, "A workout from another program"); }, "round"],
  // Following another program: from Program, "Follow <name>".
  ["dialog-round-follow-confirm", async (page) => {
    const programs = await openPrograms(page);
    await button(programs, startsWith(OTHER_PROGRAM)).click();
    await button(main(page), `Follow ${OTHER_PROGRAM}`).click();
    await shown(dialog(page, `Follow ${OTHER_PROGRAM}?`));
  }, "round"],
  // Before counting: "Already on a later round? Set it".
  ["dialog-round-number", async (page) => { await openRoundSheet(page, "Already on a later round?", "Change round number"); }, "first"],

  // ---- The workout in progress ----
  ["workout-running", async () => {}],
  // A done slot opened: its sets of today.
  ["workout-running-slot-open", async (page) => { await openSlot(page, "Low-incline press (dumbbell)"); }],
  // With history: "Last time" in the open slot, kg on every weight.
  ["workout-running-history", async () => {}, "running"],
  // The end of the list: Add exercise, You sometimes add, Cancel workout.
  ["workout-running-end", async (page) => { await toEnd(page); }, "running"],
  // Every main exercise done: the bottom button finishes.
  ["workout-finishing", async (page) => { await toEnd(page); }, "finishing"],
  // A slot with one alternative, swapped to it for today.
  ["workout-swapped", async (page) => {
    await openSlot(page, "Pec deck (machine) or Chest fly (cable)");
    await tapOnRound(page, button(main(page), /^Swap to .+ for today$/));
  }],
  ["workout-running-extra", async (page) => {
    const sheet = await openRoundSheet(page, "A workout from another program");
    await button(sheet, `Start Full body A from ${OTHER_PROGRAM}`).click();
    await shown(backToRound(page));
  }, "round"],
  // The bar of the workout in progress on other pages.
  ["running-bar-program", async (page) => { await goToView(page, "Program"); }, "running"],
  ["running-bar-library", async (page) => { await goToView(page, "Library"); }, "running"],

  // ---- Workout sheets ----
  ["dialog-exercise-reference", async (page) => {
    // A Pull A slot, so the reference shows its "For this routine" note.
    await goToView(page, "Program");
    await routineTab(page, "Pull A").click();
    await button(main(page), "Show Lat pulldown (machine, overhand) details").click();
    await button(main(page), "Open exercise page for Lat pulldown (machine, overhand)").click();
    await shown(dialog(page, "Lat pulldown (machine, overhand)"));
  }, "first"],
  ["dialog-exercise-reference-related", async (page) => {
    await openSlot(page, "Low-incline press (dumbbell)");
    await button(main(page), "Open exercise page for Low-incline press (dumbbell)").click();
    await button(dialog(page, "Low-incline press (dumbbell)"), /^Alternative Chest press/).click();
    await shown(dialog(page, "Chest press (machine)"));
  }],
  ["dialog-log", async (page) => {
    await button(main(page), "Log sets for Chest press (plate-loaded) or Chest press (machine)").click();
    await page.locator("#logDialog").getByLabel("Weight for set 1, kg").fill("50");
    await page.locator("#logDialog").getByLabel("Reps for set 1").fill("10");
    await page.locator("#logDialog").getByRole("button", { name: "Set 1 done", exact: true }).click();
    await page.locator("#logDialog").getByRole("button", { name: "Drop set" }).click();
    await shown(page.locator("#logDialog"));
  }],
  // With last time's sets in the table.
  ["dialog-log-last-time", async (page) => {
    await button(main(page), /^Log sets for Incline chest press \(machine\)/).click();
    await shown(page.locator("#logDialog"));
  }, "running"],
  ["dialog-history", async (page) => {
    await openSlot(page, "Chest press (plate-loaded) or Chest press (machine)");
    await button(main(page), "Open exercise page for Chest press (plate-loaded)").click();
    await page.locator("#exerciseDetailDialog").getByRole("button", { name: "History" }).click();
    await shown(page.locator("#historyDialog"));
  }],
  // The open slot's "Last time" line opens the same sheet, here with ten weeks in it.
  ["dialog-history-last-time", async (page) => {
    await button(main(page), /^Last time .*Open history of Incline chest press \(machine\)$/).click();
    await shown(page.locator("#historyDialog"));
  }, "running"],
  // A slot with several alternatives: "Swap to" opens its choices, where one is used today.
  ["dialog-choice-sheet", async (page) => {
    await openSlot(page, TRICEPS);
    await button(main(page), `Open exercise choices for ${TRICEPS}`).click();
    await shown(dialog(page, "Exercise choices"));
  }, "running"],
  ["dialog-choice-reference", async (page) => {
    await openSlot(page, TRICEPS);
    await button(main(page), `Open exercise choices for ${TRICEPS}`).click();
    await button(dialog(page, "Exercise choices"), "Open reference for Skull crusher (EZ bar, behind head)").click();
    await shown(dialog(page, "Skull crusher (EZ bar, behind head)"));
  }, "running"],
  ["dialog-video-search", async (page) => {
    await openSlot(page, "Low-incline press (dumbbell)");
    await button(main(page), "Find a video for preferred choice Low-incline press (dumbbell)").click();
    await shown(dialog(page, "Low-incline press (dumbbell)"));
  }],
  ["dialog-picker-extra", async (page) => {
    await button(main(page), "Add exercise for today").click();
    await shown(dialog(page, "Add exercise"));
  }],
  // Finish always asks, saying where the workout stands.
  ["dialog-finish", async (page) => {
    await button(main(page), "Finish Push B").click();
    await shown(dialog(page, "Finish Push B?"));
  }, "running"],
  // Sets logged but nothing marked done: the question counts as the header does.
  ["dialog-finish-sets-not-done", async (page) => {
    await openRoundRow(page, "Push B");
    await startFromRound(page, "Push B");
    await logOneSet(page, "Overhead press (machine)", "30", "10");
    await button(main(page), "Finish Push B").click();
    await shown(dialog(page, "Finish Push B?"));
  }, "round"],
  // With nothing logged: back to the workout, finish anyway, or cancel it.
  ["dialog-finish-nothing-logged", async (page) => {
    await openRoundRow(page, "Push B");
    await startFromRound(page, "Push B");
    await button(main(page), "Finish Push B").click();
    await shown(dialog(page, "Nothing is logged"));
  }, "round"],

  // ---- The result, after Finish ----
  ["result", async (page) => { await finishTo(page, "Push B"); }, "running"],
  // The end of the page: the actions, Delete this workout last.
  ["result-end", async (page) => {
    await finishTo(page, "Push B");
    await button(main(page), "Delete this workout").scrollIntoViewIfNeeded();
  }, "running"],
  // The last workout of the round: the round is complete.
  ["result-round-complete", async (page) => { await finishTo(page, "Legs B"); }, "completing"],
  ["result-nothing-logged", async (page) => {
    await openRoundRow(page, "Push B");
    await startFromRound(page, "Push B");
    await finishTo(page, "Push B", { nothingLogged: true });
  }, "round"],
  // A workout from another program: it counts toward nothing.
  ["result-extra", async (page) => {
    const sheet = await openRoundSheet(page, "A workout from another program");
    await tapOnRound(page, button(sheet, `Start Full body A from ${OTHER_PROGRAM}`));
    await shown(backToRound(page));
    await finishTo(page, "Full body A", { nothingLogged: true });
  }, "round"],
  // One set of one exercise logged, the rest not done.
  ["result-one-set", async (page) => {
    await openRoundRow(page, "Push B");
    await startFromRound(page, "Push B");
    await logOneSet(page, "Overhead press (machine)", "30", "10");
    await finishTo(page, "Push B");
  }, "round"],
  // An exercise added for today and not done: listed under "Added today".
  ["result-added-today", async (page) => {
    await button(main(page), "Add exercise for today").click();
    await button(dialog(page, "Add exercise"), /^Add .+ for today$/).first().click();
    await expect(dialog(page, "Add exercise")).toBeHidden();
    await finishTo(page, "Push B");
    await button(main(page), "Delete this workout").scrollIntoViewIfNeeded();
  }, "finishing"],
  // Every kind of logged sets: two weights, a drop set, per side, assisted, reps only, seconds.
  ["result-sets-kinds", async (page) => { await finishTo(page, "Push B"); }, "variety"],
  // The optional ones skipped, opened at the end of the Not done card.
  ["result-optional-open", async (page) => {
    await finishTo(page, "Push B");
    await main(page).getByText(/optional ones skipped$/).click();
    await expect(main(page).getByText("Neck lateral flexion")).toBeVisible();
  }, "variety"],
  // Every main exercise done (only optional ones left), several new bests.
  ["result-all-done", async (page) => { await finishTo(page, "Push B"); }, "finishing"],
  ["dialog-confirm-delete-workout", async (page) => {
    await finishTo(page, "Push B");
    await button(main(page), "Delete this workout").click();
    await shown(dialog(page, "Delete Push B from Wed, Nov 4?"));
  }, "running"],
  // Opened again from the round page's "How it went".
  ["result-again", async (page) => {
    await button(main(page), "Full result of Push B").click();
    await shown(main(page).getByRole("heading", { name: "Push B done" }));
  }, "done"],
  ["dialog-confirm-cancel-workout", async (page) => {
    await button(main(page), "Cancel workout").click();
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
  // Saving a setup another exercise already has: the message names it and the ways forward.
  ["dialog-exercise-editor-clash", async (page) => {
    const editor = await openMasterEditor(page, "Hip abduction (cable)");
    await button(editor, /^Equipment/).click();
    const picker = await shown(dialog(page, "Equipment"));
    await button(picker, /^Cable/).click();
    await button(picker, /^Machine/).click();
    await button(picker, "Done").click();
    await expect(picker).toBeHidden();
    await button(editor, "Save exercise").click();
    await expect(editor.getByRole("alert")).toContainText("already exists");
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

  // ---- Settings (the gear on the round page) ----
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
  // The round page's bottom button starts Push A (and the count with it).
  await startFromRound(page, PUSH_A);
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
    localStorage.clear(); // what the phone remembers besides the saved data goes too
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
    for (const [name, run, state = "started"] of SHOTS.filter(([name]) => name.includes(process.env.SHOTS || ""))) {
      const file = `${width}-${theme}-${name}.png`;
      try {
        await resetTo(page, states[state]);
        await run(page, { backupPath });
        await settle(page);
        const whole = name.startsWith("result") || name.startsWith("home");
        if (whole) await page.addStyleTag({ content: "html, body, .app-shell { height: auto !important; overflow: visible !important; } #appMain { overflow: visible !important; padding-bottom: 8px !important; } .dock, .bottom-nav { position: relative !important; inset: auto !important; }" });
        await page.screenshot({ path: path.join(outDir, file), animations: "disabled", caret: "hide", scale: "css", fullPage: whole });
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
