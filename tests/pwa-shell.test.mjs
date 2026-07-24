import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";

import { createDefaultState } from "../data.js";
import { setRelatedExercisesInState, validateState } from "../storage.js";
import {
  exerciseReferenceMarkup,
  exerciseSearchUrls,
  exerciseVideoSearchMarkup,
} from "../ui/exercise-reference.js";
import { filteredExercises } from "../ui/library.js";
import { pickerListMarkup, programMarkup, programsListMarkup } from "../ui/program.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readStyles = () => ["styles/base.css", "styles/components.css", "styles/views.css"].map(read).join("\n");
const readUi = () => ["ui/shared.js", "ui/workout.js", "ui/exercise-reference.js", "ui/program.js", "ui/library.js", "ui/log-settings.js"].map(read).join("\n");
const fontAssets = [
  "fonts/barlow-500-latin.woff2",
  "fonts/barlow-600-latin.woff2",
  "fonts/barlow-700-latin.woff2",
  "fonts/barlow-condensed-500-latin.woff2",
  "fonts/barlow-condensed-600-latin.woff2",
  "fonts/ibm-plex-mono-500-latin.woff2",
  "fonts/ibm-plex-mono-600-latin.woff2",
  "fonts/ibm-plex-mono-700-latin.woff2",
];

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
  assert.match(html, /<script type="module" src="app\.js\?v=37"><\/script>/);
  assert.match(html, /rel="apple-touch-icon"[^>]+app-icon-180\.png/);
  assert.doesNotMatch(html, /\sonclick=/);
});

test("offline shell lists every production module and icon", () => {
  const worker = read("sw.js");
  for (const asset of ["index.html", "styles.css", "styles/base.css", "styles/components.css", "styles/views.css", ...fontAssets, "data.js", "storage.js", "ui/shared.js", "ui/workout.js", "ui/exercise-reference.js", "ui/program.js", "ui/library.js", "ui/log-settings.js", "app.js", "manifest.json", "icons/app-icon.svg", "icons/app-icon-180.png", "icons/app-icon-192.png", "icons/app-icon-512.png"]) {
    assert.match(worker, new RegExp(asset.replaceAll(".", "\\.")));
  }
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /gym-schedule-v37/);
  assert.match(worker, /styles\.css\?v=37/);
  assert.match(worker, /app\.js\?v=37/);
});

test("Ironworks fonts are self-hosted and available to the offline shell", () => {
  const html = read("index.html");
  const base = read("styles/base.css");
  const worker = read("sw.js");

  assert.doesNotMatch(html + base, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  for (const asset of fontAssets) {
    assert.equal(existsSync(new URL(`../${asset}`, import.meta.url)), true, asset);
    assert.match(base, new RegExp(asset.split("/").at(-1).replaceAll(".", "\\.")));
    assert.match(worker, new RegExp(asset.replaceAll(".", "\\.")));
  }
  for (const family of ["Barlow", "Barlow Condensed", "IBM Plex Mono"]) {
    assert.match(base, new RegExp(`font-family: "${family}"`));
  }
  assert.equal((base.match(/font-display: swap;/g) || []).length, fontAssets.length);
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
  const styles = read("styles.css");
  const ui = readUi();
  const worker = read("sw.js");
  const version = worker.match(/gym-schedule-v(\d+)/)?.[1];
  assert.ok(version);
  for (const asset of ["styles.css", "app.js", "manifest.json"]) {
    assert.match(html, new RegExp(`${asset.replaceAll(".", "\\.")}\\?v=${version}`));
  }
  assert.match(app, new RegExp(`data\\.js\\?v=${version}`));
  assert.match(app, new RegExp(`storage\\.js\\?v=${version}`));
  assert.match(storage, new RegExp(`data\\.js\\?v=${version}`));
  for (const asset of ["ui/shared.js", "ui/workout.js", "ui/exercise-reference.js", "ui/program.js", "ui/library.js", "ui/log-settings.js"]) {
    assert.match(app, new RegExp(`${asset.replaceAll(".", "\\.")}\\?v=${version}`));
  }
  for (const asset of ["styles/base.css", "styles/components.css", "styles/views.css"]) {
    assert.match(styles, new RegExp(`${asset.replaceAll(".", "\\.")}\\?v=${version}`));
  }
  assert.match(ui, new RegExp(`(?:data|storage)\\.js\\?v=${version}`));
  assert.match(ui, new RegExp(`shared\\.js\\?v=${version}`));
  for (const asset of ["styles.css", "styles/base.css", "styles/components.css", "styles/views.css", "data.js", "storage.js", "ui/shared.js", "ui/workout.js", "ui/exercise-reference.js", "ui/program.js", "ui/library.js", "ui/log-settings.js", "app.js", "manifest.json"]) {
    assert.match(worker, new RegExp(`${asset.replaceAll(".", "\\.")}\\?v=${version}`));
  }
});

test("the behavior-neutral source split keeps render modules pure and CSS order explicit", () => {
  const app = read("app.js");
  const stylesheet = read("styles.css");
  const base = read("styles/base.css");
  const components = read("styles/components.css");
  const views = read("styles/views.css");
  const modulePaths = ["ui/shared.js", "ui/workout.js", "ui/exercise-reference.js", "ui/program.js", "ui/library.js", "ui/log-settings.js"];

  assert.deepEqual(
    [...stylesheet.matchAll(/@import url\("(.+?\.css)\?v=37"\);/g)].map((match) => match[1]),
    ["./styles/base.css", "./styles/components.css", "./styles/views.css"],
  );
  for (const path of modulePaths) {
    const source = read(path);
    assert.doesNotMatch(source, /\b(?:document|window|localStorage|sessionStorage)\b/, path);
  }
  assert.match(app, /workoutMarkup\(/);
  assert.match(app, /programMarkup\(/);
  assert.match(app, /libraryMarkup\(/);
  assert.match(app, /calendarMarkup\(/);
  assert.match(base, /\.app-shell\s*\{/);
  assert.doesNotMatch(base, /\.(?:icon-button|program-page-bar|library-controls|calendar-grid|dialog-form|toast)\b/);
  for (const selector of ["icon-button", "dialog-form", "confirm-dialog", "toast"]) {
    assert.match(components, new RegExp(`\\.${selector}\\b`));
  }
  assert.doesNotMatch(components, /\.(?:program-page-bar|library-controls|calendar-grid|settings-section)\b/);
  for (const selector of ["program-page-bar", "library-controls", "calendar-grid", "settings-section"]) {
    assert.match(views, new RegExp(`\\.${selector}\\b`));
  }
  assert.doesNotMatch(views, /\.(?:icon-button|dialog-form|confirm-dialog|toast)\b/);
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.dependencies, undefined);
  assert.equal(packageJson.devDependencies, undefined);
});

test("compact phone rows keep their explicit one-dimensional layout", () => {
  const css = readStyles();
  for (const selector of ["workout-row", "program-row", "library-row"]) {
    assert.match(css, new RegExp(`\\.${selector}\\s*\\{[^}]*display:\\s*flex;`));
  }
  assert.match(css, /\.row-main\s*\{[^}]*display:\s*grid;/);
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important;/);
});

test("removed legacy CSS classes stay absent", () => {
  const css = readStyles();
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
    "header-complete",
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
  const css = readStyles();
  assert.match(css, /\.app-shell\s*\{[^}]*height:\s*100dvh;/);
  assert.match(css, /#appMain\s*\{[^}]*overflow-y:\s*auto;/);
  assert.match(css, /#appMain\s*\{[^}]*-webkit-overflow-scrolling:\s*touch;/);
});

test("core exercise references and program controls remain reachable", () => {
  const html = read("index.html");
  const app = read("app.js");
  const ui = readUi();
  for (const id of ["exerciseDetailDialog", "exerciseDetailContent", "exerciseVideoDialog", "exerciseVideoContent", "exercisePrimaryTarget1", "exercisePrimaryTarget2", "secondaryTargetOptions", "exerciseMovement", "exerciseEquipmentOptions", "exercisePurpose", "purposeFilterSelect"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(ui, /data-action="open-workout-exercise"/);
  assert.match(ui, /data-action="open-workout-video"/);
  assert.match(ui, /data-action="edit-master-exercise"/);
  assert.match(ui, /data-action="view-alternative"/);
  assert.match(html, /id="moveRoutineEarlierButton"/);
  assert.match(ui, /data-action="open-picker"/);
  assert.match(ui, /data-action="edit-entry"/);
  assert.match(app, /ENTRY_HOLD_DELAY/);
  assert.match(app, /reorderRoutineEntry/);
  assert.match(app, /touchmove/);
  assert.match(app, /addEventListener\("selectstart"/);
  assert.match(app, /getSelection\(\)\?\.removeAllRanges\(\)/);
  assert.match(readStyles(), /\.program-row \*\s*\{[^}]*-webkit-user-select:\s*none;/);
  assert.doesNotMatch(app, /toggle-program-edit/);
});

test("entry roles and per-day entry checks remain separate from exercise details", () => {
  const html = read("index.html");
  const app = read("app.js");
  const ui = readUi();
  const css = readStyles();

  assert.match(html, /id="entryRole"/);
  assert.match(html, /data-entry-role="main"[^>]+aria-pressed="true"/);
  assert.match(html, /data-entry-role="optional"[^>]+aria-pressed="false"/);
  assert.doesNotMatch(html, /id="headerCompleteButton"/);
  assert.match(ui, /data-action="toggle-entry-check"/);
  assert.match(ui, /data-action="open-workout-exercise"/);
  assert.match(ui, /data-action="open-workout-video"/);
  assert.match(app, /toggleEntryCheckForDate/);
  assert.match(app, /setDayInState/);
  assert.match(app, /updateRoutineEntryInState/);
  assert.match(app, /addRoutineEntryInState/);
  assert.match(app, /removeRoutineEntryFromState/);
  assert.match(css, /\.workout-check,\s*\n\.workout-video\s*\{[^}]*width:\s*44px;/);
  assert.match(css, /\.workout-check,\s*\n\.workout-video\s*\{[^}]*min-height:\s*60px;/);
  assert.match(ui, /workout-check-number/);
});

test("Ironworks Workout keeps its compact action structure and five-item navigation", () => {
  const html = read("index.html");
  const app = read("app.js");
  const workout = read("ui/workout.js");
  const shared = read("ui/shared.js");
  const css = readStyles();

  assert.equal((html.match(/<button[^>]+data-view="/g) || []).length, 4);
  assert.match(html, /<button type="button" id="settingsButton"[^>]*>[\s\S]*?<span>Settings<\/span>/);
  assert.match(css, /\.bottom-nav\s*\{[^}]*grid-template-columns:\s*repeat\(5,/);
  assert.match(app, /document\.body\.dataset\.currentView = currentView/);
  assert.match(css, /body\[data-current-view="workout"\] \.topbar,[\s\S]*?display:\s*none;/);
  assert.match(css, /\.workout-programbar\s*\{[^}]*env\(safe-area-inset-top\)/);

  for (const selector of [
    "workout-programbar",
    "workout-section-label",
    "workout-check-mark",
    "workout-row",
    "workout-video",
  ]) {
    assert.match(workout, new RegExp(`class="${selector}`));
  }
  assert.match(shared, /class="routine-tabs/);
  assert.match(workout, /routineTabsMarkup\(routines, routine\?\.id\)/);
  assert.match(workout, /class="workout-program-empty"/);
  assert.match(workout, /label: "Main"/);
  assert.match(workout, /label: "Optional"/);
  assert.match(workout, /data-action="toggle-entry-check"/);
  assert.match(workout, /data-action="open-workout-exercise"/);
  assert.match(workout, /data-action="open-workout-video"/);
  assert.match(workout, /data-prescription="\$\{escapeHtml\(prescription\)\}"/);
  assert.match(workout, /data-view-link="routines"/);
  assert.match(workout, /youtube\.com\/watch\?v=/);
  assert.doesNotMatch(workout, /workout-section-heading|workout-chevron/);
});

test("Ironworks exercise reference keeps classification, relationships, searches, and editing separate", () => {
  const css = readStyles();
  const state = createDefaultState();
  const exercise = structuredClone(state.exercises.find((item) => item.id === "low-incline-dumbbell-press"));
  const relatedExercises = [
    { relation: "harder", exercise: { id: "hard", name: "Hard press" } },
    { relation: "similar", exercise: { id: "same", name: "Similar press" } },
    { relation: "easier", exercise: { id: "easy", name: "Easy press" } },
  ];
  exercise.videoId = "abcdefghijk";
  exercise.instructions = "Control the bottom.";

  const reference = exerciseReferenceMarkup({
    exercise,
    prescription: "4 × 6–8",
    relatedExercises,
  });
  assert.match(reference, /Routine prescription/);
  assert.match(reference, /4 × 6–8/);
  assert.match(reference, /Primary targets/);
  assert.match(reference, /Secondary involvement/);
  for (const fact of ["Purpose", "Laterality", "Support", "Challenge"]) assert.match(reference, new RegExp(fact));
  assert.match(reference, /Watch linked video/);
  assert.match(reference, /Search YouTube/);
  assert.match(reference, /Search alternatives/);
  assert.equal((reference.match(/target="_blank"/g) || []).length, 3);
  assert.ok(reference.indexOf(">Easier<") < reference.indexOf(">Similar<"));
  assert.ok(reference.indexOf(">Similar<") < reference.indexOf(">Harder<"));
  assert.match(reference, /Control the bottom\./);
  assert.match(reference, /data-action="edit-master-exercise"/);

  exercise.videoId = "";
  const videoSearch = exerciseVideoSearchMarkup(exercise);
  assert.match(videoSearch, /No video linked/);
  assert.match(videoSearch, /Search YouTube/);
  assert.match(videoSearch, /Search alternatives/);
  assert.equal((videoSearch.match(/target="_blank"/g) || []).length, 2);
  assert.match(videoSearch, /data-action="edit-master-exercise"/);

  const urls = exerciseSearchUrls("Low incline dumbbell press");
  assert.match(urls.youtube, /^https:\/\/www\.youtube\.com\/results\?search_query=/);
  assert.match(urls.alternatives, /^https:\/\/www\.google\.com\/search\?q=/);
  assert.match(css, /\.reference-dialog\s*\{[^}]*height:\s*min\(84dvh,/);
  assert.match(css, /\.reference-sheet-scroll\s*\{[^}]*overflow-y:\s*auto;/);
  assert.match(css, /\.reference-sheet-actions\s*\{[^}]*env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.reference-video-link\s*\{[^}]*min-height:\s*44px;/);
  assert.match(css, /\.reference-search-actions a\s*\{[^}]*min-height:\s*44px;/);
});

test("Program management is reachable and routine views are scoped to the active program", () => {
  const html = read("index.html");
  const app = read("app.js");
  const ui = readUi();
  const css = readStyles();
  const state = createDefaultState();
  const list = programsListMarkup(state);

  for (const id of [
    "programsDialog",
    "programsList",
    "programDialog",
    "programForm",
    "programName",
    "programStartMode",
    "programStartModeOptions",
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
    assert.match(`${app}\n${ui}`, new RegExp(`data-action="${action}"`));
  }

  assert.match(app, /function getActiveProgram\(/);
  assert.match(app, /function getProgramRoutines\(/);
  assert.match(app, /getProgramRoutines\(state/);
  assert.match(app, /createProgramInState/);
  assert.match(app, /duplicateProgramInState/);
  assert.match(app, /renameProgramInState/);
  assert.match(app, /removeProgramFromState/);
  assert.match(app, /programDialogFocusReturn/);
  assert.match(app, /main\.querySelector\("\.program-page-manage"\)/);
  assert.match(ui, /class="program-page-bar"/);
  assert.match(ui, /data-action="open-programs"/);
  assert.match(list, /class="program-choice-select"[^>]+data-action="select-program"/);
  assert.match(list, /class="program-choice-edit"[^>]+data-action="edit-program"/);
  assert.match(list, /program-active-dot/);
  assert.match(list, /· active/);
  assert.doesNotMatch(app, /class="program-choice-row"/);
  assert.match(html, /data-action="choose-program-start-mode" data-mode="empty"/);
  assert.match(html, /data-action="choose-program-start-mode" data-mode="duplicate"/);
  assert.match(html, /id="programForm"[^>]+novalidate/);
  assert.match(html, /id="confirmCancel"/);
  assert.match(css, /\.program-page-bar/);
  assert.match(css, /\.program-choice-edit\s*\{[^}]*width:\s*44px;[^}]*min-height:\s*44px;/);
  assert.match(css, /\.programs-list\s*\{[^}]*align-content:\s*start;[^}]*overflow-y:\s*auto;/);
  assert.match(css, /\.segment button\s*\{[^}]*min-height:\s*44px;/);
  assert.match(css, /\.confirm-dialog\[data-variant="program-delete"\]/);
});

test("Ironworks Program keeps routine navigation and management in their intended surfaces", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = readStyles();
  const state = createDefaultState();
  const program = state.programs.find((item) => item.id === state.settings.activeProgramId);
  const routineById = new Map(state.routines.map((routine) => [routine.id, routine]));
  const routines = program.routineIds.map((id) => routineById.get(id));
  const routine = routines[0];
  const markup = programMarkup({
    state,
    program,
    routines,
    routine,
    exerciseById: (current, id) => current.exercises.find((exercise) => exercise.id === id),
  });

  assert.match(markup, /class="program-appbar"/);
  assert.match(markup, /data-action="new-routine">\+ Add routine/);
  assert.match(markup, /class="routine-tabs"/);
  assert.match(markup, /class="program-viewbar"/);
  assert.match(markup, new RegExp(`data-action="edit-routine" data-id="${routine.id}"`));
  assert.doesNotMatch(markup, /data-action="move-routine-up"|data-action="move-routine-down"/);
  assert.doesNotMatch(markup, /class="program-heading"/);

  for (const id of [
    "routineDialog",
    "routineForm",
    "routineName",
    "routineGroup",
    "routineGroupOptions",
    "routineStatus",
    "routineStatusOptions",
    "routineEditActions",
    "moveRoutineEarlierButton",
    "moveRoutineLaterButton",
    "deleteRoutineButton",
    "routineFormError",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="routineForm"[^>]+novalidate/);
  assert.match(html, /data-routine-group="gym"/);
  assert.match(html, /data-routine-group="home"/);
  assert.match(html, /data-routine-status="required"/);
  assert.match(html, /data-routine-status="optional"/);
  assert.match(app, /function setRoutineOption\(/);
  assert.match(app, /function updateRoutineMoveButtons\(/);
  assert.match(app, /"routine-delete"/);
  assert.match(app, /routineDialogFocusReturn/);
  assert.match(app, /main\.querySelector\("\.routine-tab\[aria-pressed='true'\]"\)[\s\S]*?main\.querySelector\("\.program-empty-state \[data-action='new-routine'\]"\)/);
  assert.match(css, /body\[data-current-view="routines"\] \.topbar/);
  assert.match(css, /\.program-appbar\s*\{[^}]*env\(safe-area-inset-top\)/);
  assert.match(css, /\.program-view-edit\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/);
  assert.match(css, /\.routine-dialog \.dialog-header h2\s*\{[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/);
  assert.match(css, /\.confirm-dialog\[data-variant="routine-delete"\]/);

  const emptyProgram = { id: "empty", name: "Empty", routineIds: [] };
  const emptyProgramMarkup = programMarkup({
    state: { ...state, programs: [emptyProgram], routines: [], settings: { ...state.settings, activeProgramId: "empty", activeRoutineId: "" } },
    program: emptyProgram,
    routines: [],
    routine: null,
    exerciseById: () => null,
  });
  assert.match(emptyProgramMarkup, /No routines yet/);
  assert.match(emptyProgramMarkup, /data-action="new-routine">Add routine/);
  assert.doesNotMatch(emptyProgramMarkup, /\+ Add routine/);

  const noProgramMarkup = programMarkup({
    state: { ...state, programs: [], routines: [], settings: { ...state.settings, activeProgramId: "", activeRoutineId: "" } },
    program: null,
    routines: [],
    routine: null,
    exerciseById: () => null,
  });
  assert.match(noProgramMarkup, /No programs yet/);
  assert.match(noProgramMarkup, /data-action="new-program">Add program/);
});

test("Program picker and entry editor keep Library and routine data separate", () => {
  const html = read("index.html");
  const app = read("app.js");
  const programUi = read("ui/program.js");
  const css = readStyles();
  const state = createDefaultState();
  const exercise = state.exercises[0];
  const list = pickerListMarkup([exercise], new Set([exercise.id]));
  const empty = pickerListMarkup([], new Set());

  for (const id of [
    "pickerDialog",
    "pickerRoutineContext",
    "pickerSearch",
    "pickerResultCount",
    "pickerList",
    "pickerFormError",
    "entryDialog",
    "entryRoutineContext",
    "entryPrescriptionLabel",
    "entryPrescription",
    "entryRole",
    "entryRoleOptions",
    "entryFormNote",
    "moveEntryEarlierButton",
    "moveEntryLaterButton",
    "removeEntryButton",
    "entryFormError",
    "entrySaveButton",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="entryForm"[^>]+novalidate/);
  assert.match(html, /placeholder="Exercise, target, or movement"/);
  assert.match(html, /data-entry-role="main"/);
  assert.match(html, /data-entry-role="optional"/);
  assert.match(list, /class="picker-item"/);
  assert.match(list, /Add again/);
  assert.match(list, new RegExp(exercise.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(list, /data-action="pick-exercise"/);
  assert.match(empty, /No matching exercises/);
  assert.match(empty, /name, target, or movement/);
  assert.doesNotMatch(app, /class="picker-item"/);
  assert.match(programUi, /export function pickerListMarkup/);
  assert.match(app, /function setEntryRole\(/);
  assert.match(app, /addRoutineEntryInState/);
  assert.match(app, /role: "main"/);
  assert.match(app, /master exercise stays in the Library/);
  assert.match(app, /"entry-remove"/);
  assert.match(css, /\.picker-sheet \.picker-list\s*\{[^}]*overflow-y:\s*auto;/);
  assert.match(css, /\.entry-sheet-scroll\s*\{[^}]*overflow-y:\s*auto;/);
  assert.match(css, /\.picker-item\s*\{[^}]*min-height:\s*60px;/);
  assert.match(css, /\.confirm-dialog\[data-variant="entry-remove"\]/);
});

test("Ironworks Program groups entries by role and keeps reorder targets section-relative", () => {
  const app = read("app.js");
  const storage = read("storage.js");
  const css = readStyles();
  const state = createDefaultState();
  const program = state.programs.find((item) => item.id === state.settings.activeProgramId);
  const routine = state.routines.find((item) => item.id === program.routineIds[0]);
  routine.entries[1].role = "optional";
  routine.entries[3].role = "optional";
  const routines = program.routineIds.map((id) => state.routines.find((item) => item.id === id));
  const markup = programMarkup({
    state,
    program,
    routines,
    routine,
    exerciseById: (current, id) => current.exercises.find((exercise) => exercise.id === id),
  });
  const mainIds = routine.entries.filter((entry) => entry.role === "main").map((entry) => entry.id);
  const optionalIds = routine.entries.filter((entry) => entry.role === "optional").map((entry) => entry.id);
  const rowIds = [...markup.matchAll(/class="program-row"[^>]+data-id="([^"]+)"/g)].map((match) => match[1]);
  const numbers = [...markup.matchAll(/class="row-number">(\d+)</g)].map((match) => Number(match[1]));

  assert.match(markup, /class="program-section" data-entry-role="main"[\s\S]*class="program-section-label">Main/);
  assert.match(markup, /class="program-section" data-entry-role="optional"[\s\S]*class="program-section-label">Optional/);
  assert.match(markup, /class="program-list" data-entry-role="main"/);
  assert.match(markup, /class="program-list" data-entry-role="optional"/);
  assert.deepEqual(rowIds, [...mainIds, ...optionalIds]);
  assert.deepEqual(numbers, routine.entries.map((_, index) => index + 1));
  assert.doesNotMatch(markup, /Optional · Rehab| · Main| · Optional/);
  assert.match(app, /const targetRoleIndex = \[\.\.\.drag\.list\.children\]\.indexOf\(drag\.placeholder\)/);
  assert.match(app, /reorderRoutineEntryWithinRole/);
  assert.doesNotMatch(app, /reorderRoutineEntry\(state, routine\.id, drag\.entryId, targetIndex\)/);
  assert.match(storage, /function reorderEntryWithinRole\(/);
  assert.match(storage, /export function reorderRoutineEntryWithinRole\(/);
  assert.match(app, /const ENTRY_HOLD_DELAY = 340;/);
  assert.match(app, /const ENTRY_HOLD_TOLERANCE = 10;/);
  assert.match(css, /\.program-section-label\s*\{[^}]*min-height:\s*30px;/);
  assert.match(css, /\.program-row\s*\{[^}]*min-height:\s*62px;/);
  assert.match(css, /\.program-row-placeholder\s*\{[^}]*min-height:\s*62px;/);
});

test("exercise editing requires the essential classification without a legacy UI state", () => {
  const html = read("index.html");
  const app = read("app.js");
  const library = read("ui/library.js");
  assert.match(html, /id="exercisePrimaryTarget1"[^>]+required/);
  assert.match(html, /id="exerciseMovement"[^>]+required/);
  assert.match(html, /id="exercisePurpose"[^>]+required/);
  assert.doesNotMatch(html, />Not set<\/option>/);
  assert.match(app, /EXERCISE_TARGETS\.some\(\(option\) => option\.id === target\)/);
  assert.match(app, /MOVEMENT_PATTERNS\.some\(\(option\) => option\.id === movementPattern\)/);
  assert.match(app, /EXERCISE_EQUIPMENT\.some\(\(option\) => option\.id === value\)/);
  assert.match(app, /EXERCISE_PURPOSES\.some\(\(option\) => option\.id === purpose\)/);
  assert.match(library, /targetScope === "primary" \? exercise\.primaryTargets : exerciseTargets\(exercise\)/);
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
  const exercises = [
    { id: "primary", name: "Primary", primaryTargets: ["glute-max"], secondaryTargets: [], movementPattern: "hip-hinge", purpose: "mobility" },
    { id: "secondary", name: "Secondary", primaryTargets: ["quads"], secondaryTargets: ["glute-max"], movementPattern: "squat", purpose: "rehab" },
    { id: "other", name: "Other", primaryTargets: ["lats"], secondaryTargets: [], movementPattern: "vertical-pull", purpose: "mobility" },
  ];

  const filter = (query, target, purpose, targetScope = "primary") => filteredExercises(
    { exercises },
    { query, target, purpose, targetScope },
  ).map((exercise) => exercise.id);
  assert.deepEqual(filter("", "glute-max", "All"), ["primary"]);
  assert.deepEqual(filter("", "glute-max", "All", "combined"), ["primary", "secondary"]);
  assert.deepEqual(filter("", "All", "mobility"), ["other", "primary"]);
  assert.deepEqual(filter("", "glute-max", "mobility"), ["primary"]);
  assert.deepEqual(filter("mobility", "All", "All"), ["other", "primary"]);
});

test("failed modal actions have compact in-dialog alert targets", () => {
  const html = read("index.html");
  const app = read("app.js");
  const log = read("ui/log-settings.js");
  const css = readStyles();
  for (const id of ["exerciseFormError", "programsFormError", "programFormError", "routineFormError", "pickerFormError", "entryFormError", "settingsFormError"]) {
    assert.match(html, new RegExp(`id="${id}"[^>]+role="alert"[^>]+data-dialog-error`));
  }
  assert.match(log, /id="dayFormError" role="alert" data-dialog-error/);
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
