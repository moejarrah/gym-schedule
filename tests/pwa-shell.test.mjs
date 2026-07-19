import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";

import { createDefaultState } from "../data.js";
import { validateState } from "../storage.js";

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
  assert.match(html, /<script type="module" src="app\.js\?v=23"><\/script>/);
  assert.match(html, /rel="apple-touch-icon"[^>]+app-icon-180\.png/);
  assert.doesNotMatch(html, /\sonclick=/);
});

test("offline shell lists every production module and icon", () => {
  const worker = read("sw.js");
  for (const asset of ["index.html", "styles.css", "data.js", "storage.js", "app.js", "manifest.json", "icons/app-icon.svg", "icons/app-icon-180.png", "icons/app-icon-192.png", "icons/app-icon-512.png"]) {
    assert.match(worker, new RegExp(asset.replaceAll(".", "\\.")));
  }
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /gym-schedule-v23/);
  assert.match(worker, /styles\.css\?v=23/);
  assert.match(worker, /app\.js\?v=23/);
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
  for (const id of ["detailVideo", "detailAlternatives", "detailEditExercise", "detailCategories", "exercisePrimaryMuscle", "secondaryMuscleOptions", "exerciseCategoryOptions", "categoryFilterSelect"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /data-action="open-workout-exercise"/);
  assert.match(app, /data-action="move-routine-up"/);
  assert.match(app, /data-action="open-picker"/);
  assert.match(app, /data-action="edit-entry"/);
  assert.match(app, /ENTRY_HOLD_DELAY/);
  assert.match(app, /reorderRoutineEntry/);
  assert.match(app, /touchmove/);
  assert.doesNotMatch(app, /toggle-program-edit/);
});

test("exercise editing requires one supported primary target without a legacy UI state", () => {
  const html = read("index.html");
  const app = read("app.js");
  assert.match(html, /id="exercisePrimaryMuscle"[^>]+required/);
  assert.doesNotMatch(html, />Not set<\/option>/);
  assert.match(app, /if \(!MUSCLE_GROUPS\.includes\(primaryMuscle\)\)/);
  assert.match(app, /primaryMuscles: \[primaryMuscle\]/);
  assert.match(app, /exerciseMuscleScope === "primary" \? exercise\.primaryMuscles : exerciseTargets\(exercise\)/);
});

test("exercise save executes add, edit, duplicate, categories, and required-primary paths", () => {
  const app = read("app.js");
  const start = app.indexOf("function youtubeId(");
  const end = app.indexOf("async function deleteExercise(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const source = app.slice(start, end);
  const muscles = ["Chest", "Back", "Shoulders", "Triceps", "Glutes", "Hamstrings"];

  function runSave(state, values, secondaryMuscles = [], categories = []) {
    const error = { textContent: "" };
    let updateCalls = 0;
    let closeCalls = 0;
    let renderCalls = 0;
    const elements = {
      "#exerciseId": { value: values.id || "" },
      "#exerciseName": { value: values.name || "" },
      "#exercisePrimaryMuscle": { value: values.primaryMuscle || "" },
      "#exerciseVideo": { value: values.video || "" },
      "#exerciseFormError": error,
      "#exercisePrescription": { value: values.prescription || "" },
      "#exerciseInstructions": { value: values.instructions || "" },
      "#exerciseDialog": { close: () => { closeCalls += 1; } },
    };
    const context = {
      MUSCLE_GROUPS: muscles,
      pendingAlternativeIds: [],
      makeId: () => "exercise-new",
      render: () => { renderCalls += 1; },
      saveResult: (result) => result.ok,
      document: {
        querySelector: (selector) => {
          assert.ok(elements[selector], `unexpected selector: ${selector}`);
          return elements[selector];
        },
        querySelectorAll: (selector) => {
          if (selector === '#secondaryMuscleOptions input:checked') return secondaryMuscles.map((value) => ({ value }));
          if (selector === '#exerciseCategoryOptions input:checked') return categories.map((value) => ({ value }));
          assert.fail(`unexpected selector: ${selector}`);
        },
      },
      store: {
        getState: () => state,
        update: (mutator) => {
          updateCalls += 1;
          const next = structuredClone(state);
          mutator(next);
          if (!validateState(next)) return { ok: false };
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, next);
          return { ok: true };
        },
      },
    };
    runInNewContext(`${source}\nthis.result = saveExercise();`, context);
    return { result: context.result, error: error.textContent, updateCalls, closeCalls, renderCalls };
  }

  const addedState = createDefaultState();
  const added = runSave(addedState, { name: "Hip extension", primaryMuscle: "Glutes", prescription: "3 × 10" }, ["Hamstrings"], ["Rehab"]);
  assert.equal(added.result, true);
  const addedExercise = addedState.exercises.find((exercise) => exercise.id === "exercise-new");
  assert.deepEqual(Array.from(addedExercise.primaryMuscles), ["Glutes"]);
  assert.deepEqual(Array.from(addedExercise.secondaryMuscles), ["Hamstrings"]);
  assert.deepEqual(Array.from(addedExercise.categories), ["Rehab"]);

  const editedState = createDefaultState();
  const editedId = editedState.exercises[0].id;
  const editedName = editedState.exercises[0].name;
  const edited = runSave(editedState, { id: editedId, name: editedName, primaryMuscle: "Back" }, ["Shoulders"], ["Mobility"]);
  assert.equal(edited.result, true);
  assert.deepEqual(Array.from(editedState.exercises[0].primaryMuscles), ["Back"]);
  assert.deepEqual(Array.from(editedState.exercises[0].secondaryMuscles), ["Shoulders"]);
  assert.deepEqual(Array.from(editedState.exercises[0].categories), ["Mobility"]);

  const duplicateState = createDefaultState();
  const original = structuredClone(duplicateState.exercises[0]);
  const duplicated = runSave(duplicateState, { name: `${original.name} copy`, primaryMuscle: "Back" }, ["Shoulders"], ["Full Body"]);
  assert.equal(duplicated.result, true);
  assert.deepEqual(duplicateState.exercises[0], original);
  const duplicate = duplicateState.exercises.find((exercise) => exercise.id === "exercise-new");
  assert.deepEqual(Array.from(duplicate.primaryMuscles), ["Back"]);
  assert.deepEqual(Array.from(duplicate.categories), ["Full Body"]);

  const blockedState = createDefaultState();
  const blocked = runSave(blockedState, { name: "Missing target" });
  assert.equal(blocked.result, false);
  assert.equal(blocked.error, "Choose one primary muscle.");
  assert.equal(blocked.updateCalls, 0);
  assert.equal(blocked.closeCalls, 0);
  assert.equal(blocked.renderCalls, 0);
});

test("muscle scope and category filters remain distinct and combine with AND", () => {
  const app = read("app.js");
  const start = app.indexOf("function filteredExercises(");
  const end = app.indexOf("function renderExerciseRows(", start);
  const context = {
    exerciseMuscleScope: "primary",
    exerciseTargets: (exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles],
    exerciseSearchTerms: (exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles, ...exercise.categories],
  };
  runInNewContext(`${app.slice(start, end)}\nthis.filteredExercises = filteredExercises;`, context);
  const exercises = [
    { id: "primary", name: "Primary", primaryMuscles: ["Glutes"], secondaryMuscles: [], categories: ["Mobility"] },
    { id: "secondary", name: "Secondary", primaryMuscles: ["Quads"], secondaryMuscles: ["Glutes"], categories: ["Rehab"] },
    { id: "other", name: "Other", primaryMuscles: ["Back"], secondaryMuscles: [], categories: ["Mobility"] },
  ];

  assert.deepEqual(context.filteredExercises({ exercises }, "", "Glutes", "All").map((exercise) => exercise.id), ["primary"]);
  context.exerciseMuscleScope = "combined";
  assert.deepEqual(context.filteredExercises({ exercises }, "", "Glutes", "All").map((exercise) => exercise.id), ["primary", "secondary"]);
  assert.deepEqual(context.filteredExercises({ exercises }, "", "All", "Mobility").map((exercise) => exercise.id), ["other", "primary"]);
  assert.deepEqual(context.filteredExercises({ exercises }, "", "Glutes", "Mobility").map((exercise) => exercise.id), ["primary"]);
  assert.deepEqual(context.filteredExercises({ exercises }, "mobility", "All", "All").map((exercise) => exercise.id), ["other", "primary"]);
});

test("failed modal actions have compact in-dialog alert targets", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = read("styles.css");
  for (const id of ["exerciseFormError", "routineFormError", "pickerFormError", "entryFormError", "settingsFormError"]) {
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
