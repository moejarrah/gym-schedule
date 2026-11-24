// Changing the plan: routines and their slots in Program (which opens for looking and
// turns into the editor with "Edit"), the list of programs, the Library's exercises,
// and how every editor treats a draft.

import assert from "node:assert/strict";
import { PAST_DAY, sampleState } from "../sample.mjs";
import { dialog, expect, goToView, main, programPicker, readState, routineTab, suite, tapOnRound } from "./helpers.mjs";

const { appTest } = suite({ saved: sampleState() });

const nameField = (sheet) => sheet.getByRole("textbox", { name: "Name", exact: true });
// Program's "Edit" (its name says which program) turns the screen into the editor; "Done" turns it back.
const editProgram = (page, name) => main(page).getByRole("button", { name: `Edit ${name}`, exact: true });
const doneEditing = (page) => main(page).getByRole("button", { name: "Done editing", exact: true });

appTest("Program: look first, then Edit: add a workout, add an exercise from the Library, edit its slot, remove it, delete the workout", async ({ page }) => {
  await goToView(page, "Program");
  // Looking comes first: a row unfolds its details in place, and nothing can be changed until "Edit".
  await main(page).getByRole("button", { name: "Show Bench press (barbell) details", exact: true }).click();
  await expect(main(page).getByRole("button", { name: "Hide Bench press (barbell) details", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(main(page).getByRole("button", { name: "Add a workout" })).toHaveCount(0);
  await editProgram(page, "Sample program").click();
  await expect(main(page).getByRole("button", { name: /^Bench press \(barbell\)\. Tap to edit\./ })).toBeVisible();

  await main(page).getByRole("button", { name: "Add a workout" }).click();
  const newRoutine = dialog(page, "Add workout");
  await nameField(newRoutine).fill("Day C");
  await newRoutine.getByRole("button", { name: "Save workout" }).click();
  await expect(routineTab(page, "Day C")).toHaveAttribute("aria-pressed", "true");

  await main(page).getByRole("button", { name: "Add exercise to this block" }).click();
  const picker = dialog(page, "Add exercise");
  await picker.getByRole("searchbox", { name: "Search exercises" }).fill("squat");
  await picker.getByRole("button", { name: "Add Squat (barbell) to this workout" }).click();
  const slot = main(page).getByRole("button", { name: /^Squat \(barbell\)\. Tap to edit\./ });
  await expect(slot).toContainText("3 × 5"); // the Library's default prescription

  // The slot editor and its choice editor are both titled "Squat".
  const slotEditor = page.getByRole("dialog").filter({ has: page.getByRole("region", { name: "Choices — first is preferred" }) });
  const choiceEditor = page.getByRole("dialog").filter({ has: page.getByRole("textbox", { name: "Prescription for this choice" }) });
  await slot.click();
  await slotEditor.getByRole("button", { name: "Edit Squat (barbell) choice" }).click();
  await choiceEditor.getByRole("textbox", { name: "Prescription for this choice" }).fill("5 × 5");
  await choiceEditor.getByRole("button", { name: "Save choice" }).click();
  await slotEditor.getByRole("group", { name: "Slot role" }).getByRole("button", { name: "Optional" }).click();
  await slotEditor.getByRole("button", { name: "Save entry" }).click();
  await expect(slot).toContainText("5 × 5");
  const dayC = (state) => state.routines.find((routine) => routine.name === "Day C");
  const [entry] = dayC(await readState(page)).entries;
  assert.deepEqual({ choices: entry.choices, role: entry.role }, { choices: [{ exerciseId: "squat", prescription: "5 × 5" }], role: "optional" });

  await slot.click();
  await slotEditor.getByRole("button", { name: "Remove from Day C" }).click();
  await tapOnRound(page, dialog(page, "Remove Squat (barbell)?").getByRole("button", { name: "Remove entry" })); // taps rest after an answer
  await expect(slot).toHaveCount(0);
  let saved = await readState(page);
  assert.deepEqual(dayC(saved).entries, []);
  assert.ok(saved.exercises.some((exercise) => exercise.id === "squat"), "the Library keeps the exercise");

  await main(page).getByRole("button", { name: "Edit Day C: rename, notes, blocks" }).click();
  await dialog(page, "Edit Day C").getByRole("button", { name: "Delete workout" }).click();
  await tapOnRound(page, dialog(page, "Delete Day C?").getByRole("button", { name: "Delete workout" })); // taps rest after an answer
  await expect(routineTab(page, "Day C")).toHaveCount(0);
  await expect(routineTab(page, "Day A")).toHaveAttribute("aria-pressed", "true");
  await doneEditing(page).click();
  await expect(editProgram(page, "Sample program")).toBeVisible();
  // Everything is as it was, and none of it touched what the round page proposes.
  assert.deepEqual(await readState(page), sampleState());
});

appTest("Programs: create one, look at the other again, duplicate, delete; the program followed stays the same", async ({ page }) => {
  const programs = dialog(page, "Programs");
  const newProgram = dialog(page, "Add program");
  const programEditor = dialog(page, "Edit program");
  // The header button says which program is on screen, and whether it is the one being followed.
  const followed = "the one you're following";

  await goToView(page, "Program");
  await expect(programPicker(page, "Sample program")).toHaveAccessibleName(new RegExp(`, ${followed}$`));
  await programPicker(page, "Sample program").click();
  await programs.getByRole("button", { name: "Add program" }).click();
  await nameField(newProgram).fill("Block 2");
  await newProgram.getByRole("button", { name: "Create program" }).click();
  // The new program is the one on screen, but making it isn't following it.
  await expect(programPicker(page, "Block 2")).not.toHaveAccessibleName(new RegExp(followed));
  await expect(main(page)).toContainText("No workouts yet");
  await expect(main(page)).toContainText("You're following Sample program");
  assert.deepEqual((await readState(page)).settings, sampleState().settings);

  // Choosing a program in the sheet only changes what Program shows.
  await programPicker(page, "Block 2").click();
  await programs.getByRole("button", { name: /^Sample program/ }).click();
  await expect(programPicker(page, "Sample program")).toBeVisible();
  await expect(routineTab(page, "Day A")).toHaveAttribute("aria-pressed", "true");

  await programPicker(page, "Sample program").click();
  await programs.getByRole("button", { name: "Edit Sample program", exact: true }).click();
  await programEditor.getByRole("button", { name: "Duplicate program" }).click();
  await expect(nameField(newProgram)).toHaveValue("Sample program copy");
  await newProgram.getByRole("button", { name: "Create program" }).click();
  await expect(programPicker(page, "Sample program copy")).not.toHaveAccessibleName(new RegExp(followed));
  await expect(routineTab(page, "Day A")).toHaveAttribute("aria-pressed", "true");
  let saved = await readState(page);
  assert.deepEqual(saved.programs.map((program) => program.name), ["Sample program", "Block 2", "Sample program copy"]);
  const copies = saved.programs[2].routineIds.map((id) => saved.routines.find((routine) => routine.id === id));
  assert.equal(new Set(saved.routines.map((routine) => routine.id)).size, 4, "the copy has routines of its own");
  // Same slots on the same Library exercises.
  const slots = (routines) => routines.map((routine) => [routine.name, routine.entries.map((entry) => entry.choices)]);
  assert.deepEqual(slots(copies), slots(sampleState().routines));
  assert.deepEqual(saved.exercises, sampleState().exercises);

  await programPicker(page, "Sample program copy").click();
  await programs.getByRole("button", { name: "Edit Sample program copy", exact: true }).click();
  await programEditor.getByRole("button", { name: "Delete program" }).click();
  await tapOnRound(page, dialog(page, "Delete Sample program copy?").getByRole("button", { name: "Delete program" })); // taps rest after an answer
  await expect(programPicker(page, "Sample program")).toBeVisible();
  saved = await readState(page);
  assert.deepEqual(saved.programs.map((program) => program.name), ["Sample program", "Block 2"]);
  assert.deepEqual(saved.routines, sampleState().routines);
  assert.deepEqual(saved.sessions, sampleState().sessions, "history is untouched");
  assert.deepEqual(saved.settings, sampleState().settings, "Sample program is still the one followed");
});

appTest("Library: search and browse, add an exercise, edit it, and delete one that's in use", async ({ page }) => {
  await goToView(page, "Library");
  const rows = main(page).getByRole("button", { name: /^View .+ details$/ });
  const rowOf = (name) => main(page).getByRole("button", { name: `View ${name} details`, exact: true });
  const search = main(page).getByRole("searchbox", { name: "Search exercises" });
  await expect(rows).toHaveCount(sampleState().exercises.length);
  await search.fill("ab wheel");
  await expect(rowOf("Ab-wheel rollout")).toBeVisible();
  await expect(rows).toHaveCount(1);
  await search.fill("");
  await main(page).getByRole("button", { name: "Legs", exact: true }).click();
  await expect(rowOf("Squat (barbell)")).toBeVisible();
  await expect(rowOf("Bench press (barbell)")).toHaveCount(0);
  await main(page).getByRole("button", { name: "All", exact: true }).click();
  await expect(rowOf("Bench press (barbell)")).toBeVisible();

  await main(page).getByRole("button", { name: "Add exercise" }).click();
  const adding = dialog(page, "Add exercise");
  await adding.getByRole("textbox", { name: /^Name/ }).fill("Face pull");
  await adding.getByRole("textbox", { name: "Default prescription" }).fill("3 × 15");
  await adding.getByLabel(/^Primary target/).selectOption({ label: "Rear delts" });
  await adding.getByLabel(/^Movement/).selectOption({ label: "Horizontal pull" });
  await adding.getByRole("button", { name: /^Equipment/ }).click();
  await dialog(page, "Equipment").getByRole("button", { name: "Cable" }).click();
  await dialog(page, "Equipment").getByRole("button", { name: "Done", exact: true }).click();
  await adding.getByLabel(/^Purpose/).selectOption({ label: "Strength" });
  await adding.getByRole("button", { name: "Save exercise" }).click();
  await expect(rowOf("Face pull (cable)")).toBeVisible();
  const added = (await readState(page)).exercises.find((exercise) => exercise.name === "Face pull");
  assert.deepEqual(
    [added.primaryTargets, added.movementPattern, added.equipment, added.purpose, added.defaultPrescription],
    [["rear-delts"], "horizontal-pull", ["cable"], "strength", "3 × 15"],
  );

  const editing = dialog(page, "Edit exercise");
  await rowOf("Face pull (cable)").click();
  await dialog(page, "Face pull (cable)").getByRole("button", { name: "Edit exercise" }).click();
  await editing.getByRole("textbox", { name: /^Name/ }).fill("Cable face pull");
  await editing.getByRole("button", { name: "Save exercise" }).click();
  await expect(rowOf("Cable face pull (cable)")).toBeVisible();
  assert.deepEqual((await readState(page)).exercises.find((exercise) => exercise.id === added.id), { ...added, name: "Cable face pull" });

  // Push-up fills a slot of Day A, is linked from Bench press, and has sets in the history.
  await rowOf("Push-up").click();
  await dialog(page, "Push-up").getByRole("button", { name: "Edit exercise" }).click();
  await editing.getByRole("button", { name: "Delete exercise" }).click();
  const confirmation = dialog(page, "Delete exercise");
  await expect(confirmation).toContainText("Programmed use: 1 slot.");
  await expect(confirmation).toContainText("1 slot deleted with any saved checks.");
  await expect(confirmation).toContainText("Related links removed: 1.");
  await tapOnRound(page, confirmation.getByRole("button", { name: "Delete exercise" })); // taps rest after an answer
  await expect(rowOf("Push-up")).toHaveCount(0);
  const saved = await readState(page);
  assert.deepEqual(saved.routines[0].entries.map((entry) => entry.id), ["a1", "a2", "a3"]);
  assert.deepEqual(saved.exercises.find((exercise) => exercise.id === "bench-press").relatedExercises, []);
  assert.deepEqual(saved.sessions[PAST_DAY].logs, sampleState().sessions[PAST_DAY].logs, "its logged sets stay in the history");
});

// Taps the dimmed area beside a sheet. Returns false when the sheet leaves none to tap.
async function tapBackdrop(page, sheet) {
  const box = await sheet.boundingBox();
  const { width, height } = page.viewportSize();
  const above = box.y;
  const below = height - (box.y + box.height);
  if (Math.max(above, below) < 8) return false;
  await page.mouse.click(width / 2, above >= below ? above / 2 : height - below / 2);
  return true;
}

appTest("Editors: a tap outside keeps the editor and its draft, and Enter in a field saves", async ({ page }) => {
  // A read-only sheet does close on a tap outside, which shows the tap lands where it should.
  await goToView(page, "Program");
  await programPicker(page, "Sample program").click();
  const programs = dialog(page, "Programs");
  await expect(programs).toBeVisible();
  if (await tapBackdrop(page, programs)) await expect(programs).toBeHidden();
  else await programs.getByRole("button", { name: "Close programs" }).click();

  await editProgram(page, "Sample program").click();
  await main(page).getByRole("button", { name: "Add a workout" }).click();
  const editor = dialog(page, "Add workout");
  await nameField(editor).fill("Day C");
  await tapBackdrop(page, editor);
  await expect(editor).toBeVisible();
  await expect(nameField(editor)).toHaveValue("Day C");
  assert.deepEqual(await readState(page), sampleState(), "nothing is saved yet");

  await nameField(editor).press("Enter");
  await expect(editor).toBeHidden();
  await expect(routineTab(page, "Day C")).toHaveAttribute("aria-pressed", "true");
  assert.deepEqual((await readState(page)).routines.map((routine) => routine.name), ["Day A", "Day B", "Day C"]);
});
