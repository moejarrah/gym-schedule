import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";

import { createDefaultState } from "../data.js";
import { setRelatedExercisesInState, validateState } from "../storage.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("manifest describes an installable portrait app with a real icon asset", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.id, "./");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait");
  assert.ok(manifest.icons.length);
  for (const icon of manifest.icons) {
    assert.equal(icon.type, "image/png");
    assert.equal(existsSync(new URL(`../${icon.src}`, import.meta.url)), true);
  }
});

test("HTML keeps zoom enabled and uses external production assets", () => {
  const html = read("index.html");
  const viewport = html.match(/<meta name="viewport" content="([^"]+)">/)?.[1] || "";
  assert.match(viewport, /viewport-fit=cover/);
  assert.doesNotMatch(viewport, /user-scalable=no|maximum-scale=1/);
  assert.match(html, /<script type="module" src="app\.js\?v=28"><\/script>/);
  assert.match(html, /rel="apple-touch-icon"[^>]+app-icon-180\.png/);
  assert.doesNotMatch(html, /\sonclick=/);
});

test("offline shell lists every production module and icon", () => {
  const worker = read("sw.js");
  for (const asset of ["index.html", "styles.css", "data.js", "storage.js", "app.js", "manifest.json", "icons/app-icon.svg", "icons/app-icon-180.png", "icons/app-icon-192.png", "icons/app-icon-512.png"]) {
    assert.match(worker, new RegExp(asset.replaceAll(".", "\\.")));
  }
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /gym-schedule-v28/);
  assert.match(worker, /styles\.css\?v=28/);
  assert.match(worker, /app\.js\?v=28/);
});

test("activation removes only stale caches owned by the gym app", async () => {
  const worker = read("sw.js");
  const current = worker.match(/const CACHE = "([^"]+)"/)?.[1];
  assert.ok(current);
  const handlers = {};
  const deleted = [];
  let claimed = false;
  runInNewContext(worker, {
    caches: {
      keys: async () => [current, "gym-schedule-v15", "bmi-rewrite-v8", "another-app-cache"],
      delete: async (key) => { deleted.push(key); },
    },
    self: {
      addEventListener: (type, handler) => { handlers[type] = handler; },
      skipWaiting: () => {},
      clients: { claim: async () => { claimed = true; } },
    },
  });

  let completion;
  handlers.activate({ waitUntil: (promise) => { completion = promise; } });
  await completion;
  assert.deepEqual(deleted, ["gym-schedule-v15"]);
  assert.equal(claimed, true);
});

test("versioned browser assets stay in sync across the PWA shell", () => {
  const html = read("index.html");
  const app = read("app.js");
  const storage = read("storage.js");
  const worker = read("sw.js");
  const version = worker.match(/gym-schedule-v(\d+)/)?.[1];
  assert.ok(version);
  for (const asset of ["styles.css", "app.js", "manifest.json"]) {
    assert.match(html, new RegExp(`${asset.replaceAll(".", "\\.")}\\?v=${version}`));
  }
  assert.match(app, new RegExp(`data\\.js\\?v=${version}`));
  assert.match(app, new RegExp(`storage\\.js\\?v=${version}`));
  assert.match(storage, new RegExp(`data\\.js\\?v=${version}`));
  for (const asset of ["styles.css", "data.js", "storage.js", "app.js", "manifest.json"]) {
    assert.match(worker, new RegExp(`${asset.replaceAll(".", "\\.")}\\?v=${version}`));
  }
});

test("compact phone rows keep their explicit one-dimensional layout", () => {
  const css = read("styles.css");
  for (const selector of ["workout-row", "program-row", "library-row"]) {
    assert.match(css, new RegExp(`\\.${selector}\\s*\\{[^}]*display:\\s*flex;`));
  }
  assert.match(css, /\.row-main\s*\{[^}]*display:\s*grid;/);
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important;/);
});

test("removed legacy CSS classes stay absent", () => {
  const css = read("styles.css");
  const classes = [...new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((match) => match[1]))];
  const removedLegacyClasses = [
    "calendar-summary",
    "compact-actions",
    "completed",
    "completion-count",
    "detail-actions",
    "detail-muscles",
    "disclosure",
    "drag-mark",
    "entry-actions",
    "eyebrow",
    "filter-chip",
    "filter-chips",
    "home-action",
    "is-expanded",
    "list-row",
    "page-toolbar",
    "rest-notice",
    "routine-entry-content",
    "routine-entry-row",
    "routine-heading",
    "section-heading",
    "status-line",
    "status-pill",
    "sticky-action",
    "tag",
    "tags",
    "today-summary",
    "workout-details",
  ];

  assert.deepEqual(removedLegacyClasses.filter((name) => classes.includes(name)), []);
});

test("the iPhone shell constrains the app and leaves the main view scrollable", () => {
  const css = read("styles.css");
  assert.match(css, /\.app-shell\s*\{[^}]*height:\s*100dvh;/);
  assert.match(css, /#appMain\s*\{[^}]*overflow-y:\s*auto;/);
  assert.match(css, /#appMain\s*\{[^}]*-webkit-overflow-scrolling:\s*touch;/);
});

test("core exercise references and program controls remain reachable", () => {
  const html = read("index.html");
  const app = read("app.js");
  for (const id of ["detailVideo", "detailAlternatives", "detailEditExercise", "detailCategories", "exercisePrimaryTarget1", "exercisePrimaryTarget2", "secondaryTargetOptions", "exerciseMovement", "exerciseEquipmentOptions", "exercisePurpose", "purposeFilterSelect"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /data-action="open-workout-exercise"/);
  assert.match(app, /data-action="move-routine-up"/);
  assert.match(app, /data-action="open-picker"/);
  assert.match(app, /data-action="edit-entry"/);
  assert.match(app, /ENTRY_HOLD_DELAY/);
  assert.match(app, /reorderRoutineEntry/);
  assert.match(app, /touchmove/);
  assert.match(app, /addEventListener\("selectstart"/);
  assert.match(app, /getSelection\(\)\?\.removeAllRanges\(\)/);
  assert.match(read("styles.css"), /\.program-row \*\s*\{[^}]*-webkit-user-select:\s*none;/);
  assert.doesNotMatch(app, /toggle-program-edit/);
});

test("Program management is reachable and routine views are scoped to the active program", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = read("styles.css");

  for (const id of [
    "programsDialog",
    "programsList",
    "programDialog",
    "programForm",
    "programName",
    "programStartMode",
    "programDuplicateSource",
    "programFormError",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  for (const action of [
    "open-programs",
    "select-program",
    "edit-program",
    "new-program",
  ]) {
    assert.match(app, new RegExp(`data-action="${action}"`));
  }

  assert.match(app, /function getActiveProgram\(/);
  assert.match(app, /function getProgramRoutines\(/);
  assert.match(app, /getProgramRoutines\(state,\s*getActiveProgram\(state\)\)/);
  assert.match(app, /createProgramInState/);
  assert.match(app, /duplicateProgramInState/);
  assert.match(app, /renameProgramInState/);
  assert.match(app, /removeProgramFromState/);
  assert.match(css, /\.program-switcher/);
});

test("exercise editing requires the essential classification without a legacy UI state", () => {
  const html = read("index.html");
  const app = read("app.js");
  assert.match(html, /id="exercisePrimaryTarget1"[^>]+required/);
  assert.match(html, /id="exerciseMovement"[^>]+required/);
  assert.match(html, /id="exercisePurpose"[^>]+required/);
  assert.doesNotMatch(html, />Not set<\/option>/);
  assert.match(app, /EXERCISE_TARGETS\.some\(\(option\) => option\.id === target\)/);
  assert.match(app, /MOVEMENT_PATTERNS\.some\(\(option\) => option\.id === movementPattern\)/);
  assert.match(app, /EXERCISE_EQUIPMENT\.some\(\(option\) => option\.id === value\)/);
  assert.match(app, /EXERCISE_PURPOSES\.some\(\(option\) => option\.id === purpose\)/);
  assert.match(app, /exerciseTargetScope === "primary" \? exercise\.primaryTargets : exerciseTargets\(exercise\)/);
});

test("exercise save executes add, edit, duplicate, essential classification, and required-target paths", () => {
  const app = read("app.js");
  const start = app.indexOf("function youtubeId(");
  const end = app.indexOf("async function deleteExercise(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const source = app.slice(start, end);
  const targets = ["chest", "lats", "front-delts", "triceps", "glute-max", "hamstrings"].map((id) => ({ id }));
  const movements = ["horizontal-press", "hip-thrust-bridge"].map((id) => ({ id }));
  const equipmentValues = ["dumbbells", "bench", "cable"].map((id) => ({ id }));
  const purposes = ["strength", "mobility", "rehab"].map((id) => ({ id }));

  function runSave(state, values, secondaryTargets = [], equipment = [], pendingRelatedExercises = []) {
    const error = { textContent: "" };
    let updateCalls = 0;
    let closeCalls = 0;
    let renderCalls = 0;
    const elements = {
      "#exerciseId": { value: values.id || "" },
      "#exerciseName": { value: values.name || "" },
      "#exercisePrimaryTarget1": { value: values.primaryTarget1 || "" },
      "#exercisePrimaryTarget2": { value: values.primaryTarget2 || "" },
      "#exerciseMovement": { value: values.movement || "" },
      "#exercisePurpose": { value: values.purpose || "" },
      "#exerciseVideo": { value: values.video || "" },
      "#exerciseFormError": error,
      "#exercisePrescription": { value: values.prescription || "" },
      "#exerciseInstructions": { value: values.instructions || "" },
      "#exerciseDialog": { close: () => { closeCalls += 1; } },
    };
    const context = {
      EXERCISE_TARGETS: targets,
      MOVEMENT_PATTERNS: movements,
      EXERCISE_EQUIPMENT: equipmentValues,
      EXERCISE_PURPOSES: purposes,
      pendingRelatedExercises,
      exerciseEditorSourceId: values.sourceId || "",
      makeId: () => "exercise-new",
      setRelatedExercisesInState,
      render: () => { renderCalls += 1; },
      saveResult: (result) => result.ok,
      document: {
        querySelector: (selector) => {
          assert.ok(elements[selector], `unexpected selector: ${selector}`);
          return elements[selector];
        },
        querySelectorAll: (selector) => {
          if (selector === '#secondaryTargetOptions input:checked') return secondaryTargets.map((value) => ({ value }));
          if (selector === '#exerciseEquipmentOptions input:checked') return equipment.map((value) => ({ value }));
          assert.fail(`unexpected selector: ${selector}`);
        },
      },
      store: {
        getState: () => state,
        update: (mutator) => {
          updateCalls += 1;
          const next = structuredClone(state);
          const candidate = mutator(next) || next;
          if (!validateState(candidate)) return { ok: false };
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, candidate);
          return { ok: true };
        },
      },
    };
    runInNewContext(`${source}\nthis.result = saveExercise();`, context);
    return { result: context.result, error: error.textContent, updateCalls, closeCalls, renderCalls };
  }

  const addedState = createDefaultState();
  const added = runSave(addedState, {
    name: "Hip extension",
    primaryTarget1: "glute-max",
    movement: "hip-thrust-bridge",
    purpose: "rehab",
    prescription: "3 × 10",
  }, ["hamstrings"], ["cable"]);
  assert.equal(added.result, true);
  const addedExercise = addedState.exercises.find((exercise) => exercise.id === "exercise-new");
  assert.deepEqual(Array.from(addedExercise.primaryTargets), ["glute-max"]);
  assert.deepEqual(Array.from(addedExercise.secondaryTargets), ["hamstrings"]);
  assert.deepEqual(Array.from(addedExercise.equipment), ["cable"]);
  assert.equal(addedExercise.purpose, "rehab");

  const editedState = createDefaultState();
  const editedId = editedState.exercises[0].id;
  const editedName = editedState.exercises[0].name;
  const existingRelated = structuredClone(editedState.exercises[0].relatedExercises);
  const edited = runSave(editedState, {
    id: editedId,
    sourceId: editedId,
    name: editedName,
    primaryTarget1: "lats",
    movement: "horizontal-press",
    purpose: "mobility",
  }, ["front-delts"], ["dumbbells", "bench"], existingRelated);
  assert.equal(edited.result, true);
  assert.deepEqual(Array.from(editedState.exercises[0].primaryTargets), ["lats"]);
  assert.deepEqual(Array.from(editedState.exercises[0].secondaryTargets), ["front-delts"]);
  assert.equal(editedState.exercises[0].purpose, "mobility");
  assert.deepEqual(editedState.exercises[0].relatedExercises, existingRelated);

  const duplicateState = createDefaultState();
  const original = structuredClone(duplicateState.exercises[0]);
  const duplicated = runSave(duplicateState, {
    sourceId: original.id,
    name: `${original.name} copy`,
    primaryTarget1: "chest",
    movement: "horizontal-press",
    purpose: "strength",
  }, ["triceps"], ["dumbbells", "bench"], original.relatedExercises);
  assert.equal(duplicated.result, true);
  assert.deepEqual(duplicateState.exercises[0], original);
  const duplicate = duplicateState.exercises.find((exercise) => exercise.id === "exercise-new");
  assert.deepEqual(Array.from(duplicate.primaryTargets), ["chest"]);
  assert.equal(duplicate.purpose, "strength");
  assert.deepEqual(duplicate.relatedExercises, original.relatedExercises);

  const blockedState = createDefaultState();
  const blocked = runSave(blockedState, { name: "Missing target" });
  assert.equal(blocked.result, false);
  assert.equal(blocked.error, "Choose a dominant target.");
  assert.equal(blocked.updateCalls, 0);
  assert.equal(blocked.closeCalls, 0);
  assert.equal(blocked.renderCalls, 0);
});

test("target scope and purpose filters remain distinct and combine with AND", () => {
  const app = read("app.js");
  const start = app.indexOf("function filteredExercises(");
  const end = app.indexOf("function renderExerciseRows(", start);
  const context = {
    exerciseTargetScope: "primary",
    exerciseTargets: (exercise) => [...exercise.primaryTargets, ...exercise.secondaryTargets],
    exerciseSearchTerms: (exercise) => [...exercise.primaryTargets, ...exercise.secondaryTargets, exercise.movementPattern, exercise.purpose],
  };
  runInNewContext(`${app.slice(start, end)}\nthis.filteredExercises = filteredExercises;`, context);
  const exercises = [
    { id: "primary", name: "Primary", primaryTargets: ["glute-max"], secondaryTargets: [], movementPattern: "hip-hinge", purpose: "mobility" },
    { id: "secondary", name: "Secondary", primaryTargets: ["quads"], secondaryTargets: ["glute-max"], movementPattern: "squat", purpose: "rehab" },
    { id: "other", name: "Other", primaryTargets: ["lats"], secondaryTargets: [], movementPattern: "vertical-pull", purpose: "mobility" },
  ];

  assert.deepEqual(context.filteredExercises({ exercises }, "", "glute-max", "All").map((exercise) => exercise.id), ["primary"]);
  context.exerciseTargetScope = "combined";
  assert.deepEqual(context.filteredExercises({ exercises }, "", "glute-max", "All").map((exercise) => exercise.id), ["primary", "secondary"]);
  assert.deepEqual(context.filteredExercises({ exercises }, "", "All", "mobility").map((exercise) => exercise.id), ["other", "primary"]);
  assert.deepEqual(context.filteredExercises({ exercises }, "", "glute-max", "mobility").map((exercise) => exercise.id), ["primary"]);
  assert.deepEqual(context.filteredExercises({ exercises }, "mobility", "All", "All").map((exercise) => exercise.id), ["other", "primary"]);
});

test("failed modal actions have compact in-dialog alert targets", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = read("styles.css");
  for (const id of ["exerciseFormError", "programsFormError", "programFormError", "routineFormError", "pickerFormError", "entryFormError", "settingsFormError"]) {
    assert.match(html, new RegExp(`id="${id}"[^>]+role="alert"[^>]+data-dialog-error`));
  }
  assert.match(app, /id="dayFormError" role="alert" data-dialog-error/);
  assert.match(app, /function activeDialogError\(\)/);
  assert.match(app, /error\.scrollIntoView\(\{ block: "nearest" \}\)/);
  assert.match(app, /showActionError\(result\.error \|\| "Changes could not be saved\."\)/);
  assert.match(app, /showActionError\(error\.message \|\| "This file could not be imported\."\)/);
  assert.match(app, /showActionError\("App data could not be exported\."\)/);
  assert.match(css, /\.form-error:empty\s*\{[^}]*display:\s*none;/);
});

test("action feedback executes against the active dialog and clears stale errors", () => {
  const app = read("app.js");
  const start = app.indexOf("function activeDialogError()");
  const end = app.indexOf("function getActiveRoutine(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const toasts = [];
  const underlyingError = { textContent: "old error", scrolls: 0, scrollIntoView() { this.scrolls += 1; } };
  const activeError = { textContent: "", scrolls: 0, scrollIntoView() { this.scrolls += 1; } };
  const dialogs = [
    { querySelector: () => underlyingError },
    { querySelector: () => null },
  ];
  const context = {
    document: { querySelectorAll: () => dialogs },
    showToast: (message) => toasts.push(message),
  };
  runInNewContext(`${app.slice(start, end)}\nthis.feedback = { activeDialogError, showActionError, clearActionError, saveResult };`, context);

  context.feedback.showActionError("Save failed.");
  assert.equal(underlyingError.textContent, "Save failed.");
  assert.equal(underlyingError.scrolls, 1);
  assert.deepEqual(toasts, []);

  dialogs.push({ querySelector: () => activeError });
  context.feedback.showActionError("Top dialog failed.");
  assert.equal(activeError.textContent, "Top dialog failed.");
  assert.equal(activeError.scrolls, 1);
  assert.equal(underlyingError.textContent, "Save failed.");

  assert.equal(context.feedback.saveResult({ ok: true }, "Saved."), true);
  assert.equal(activeError.textContent, "");
  assert.deepEqual(toasts, ["Saved."]);

  dialogs.length = 0;
  assert.equal(context.feedback.saveResult({ ok: false, error: "No space." }), false);
  assert.deepEqual(toasts, ["Saved.", "No space."]);
});

test("successful export clears a previous settings error", () => {
  const app = read("app.js");
  const exportBody = app.slice(app.indexOf("function exportData()"), app.indexOf("async function importData("));
  assert.match(exportBody, /link\.click\(\);[\s\S]*clearActionError\(\);[\s\S]*catch/);
});
