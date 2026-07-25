import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";

import { EXERCISE_BROWSE_GROUPS, createDefaultState } from "../data.js";
import { upsertExerciseInState, validateState } from "../storage.js";
import {
  exerciseReferenceMarkup,
  exerciseSearchUrls,
  exerciseVideoSearchMarkup,
} from "../ui/exercise-reference.js";
import {
  activeLibraryFilterCount,
  availableLibraryBrowseGroups,
  classificationOptionPickerMarkup,
  createLibraryFilters,
  exerciseFilterContentMarkup,
  filteredExercises,
  libraryPageShellMarkup,
  libraryRowsMarkup,
  libraryScrollContentMarkup,
  relationshipEditorMarkup,
} from "../ui/library.js";
import {
  entryChoicesEditorMarkup,
  pickerListMarkup,
  programMarkup,
  programsListMarkup,
  routineBlocksEditorMarkup,
} from "../ui/program.js";
import { entryChoicesMarkup, workoutBlocksMarkup, workoutMarkup } from "../ui/workout.js";
import { entryPresentation } from "../ui/shared.js";

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
  assert.match(html, /<script type="module" src="app\.js\?v=46"><\/script>/);
  assert.match(html, /rel="apple-touch-icon"[^>]+app-icon-180\.png/);
  assert.match(html, /<h1 id="viewTitle">Workout<\/h1>/);
  assert.match(html, /<p id="viewMetaLine">Loading saved data<\/p>/);
  assert.doesNotMatch(html, /<h1 id="viewTitle">Push A<\/h1>|Gym · 6 exercises · required/);
  assert.doesNotMatch(html, /\sonclick=/);
});

test("only the approved Log and Settings concept remains tracked", () => {
  assert.equal(existsSync(new URL("../references/ui-concepts/ironworks-log-settings.html", import.meta.url)), true);
  assert.equal(existsSync(new URL("../references/ui-concepts/ironworks-logging.html", import.meta.url)), false);
});

test("offline shell lists every production module and icon", () => {
  const worker = read("sw.js");
  for (const asset of ["index.html", "styles.css", "styles/base.css", "styles/components.css", "styles/views.css", ...fontAssets, "data.js", "storage.js", "ui/shared.js", "ui/workout.js", "ui/exercise-reference.js", "ui/program.js", "ui/library.js", "ui/log-settings.js", "app.js", "manifest.json", "icons/app-icon.svg", "icons/app-icon-180.png", "icons/app-icon-192.png", "icons/app-icon-512.png"]) {
    assert.match(worker, new RegExp(asset.replaceAll(".", "\\.")));
  }
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /gym-schedule-v46/);
  assert.match(worker, /styles\.css\?v=46/);
  assert.match(worker, /app\.js\?v=46/);
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
    [...stylesheet.matchAll(/@import url\("(.+?\.css)\?v=46"\);/g)].map((match) => match[1]),
    ["./styles/base.css", "./styles/components.css", "./styles/views.css"],
  );
  for (const path of modulePaths) {
    const source = read(path);
    assert.doesNotMatch(source, /\b(?:document|window|localStorage|sessionStorage)\b/, path);
  }
  assert.match(app, /workoutMarkup\(/);
  assert.match(app, /programMarkup\(/);
  assert.match(app, /libraryPageShellMarkup\(/);
  assert.match(app, /calendarMarkup\(/);
  assert.match(base, /\.app-shell\s*\{/);
  assert.doesNotMatch(base, /\.(?:icon-button|program-page-bar|library-page|calendar-grid|dialog-form|toast)\b/);
  for (const selector of ["icon-button", "dialog-form", "confirm-dialog", "toast"]) {
    assert.match(components, new RegExp(`\\.${selector}\\b`));
  }
  assert.doesNotMatch(components, /\.(?:program-page-bar|library-page|calendar-grid|settings-section)\b/);
  for (const selector of ["program-page-bar", "library-page", "calendar-grid", "settings-section"]) {
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

test("small action and status text use AA-safe color tokens", () => {
  const base = read("styles/base.css");
  const components = read("styles/components.css");
  const views = read("styles/views.css");

  assert.match(base, /--accent-fill: #3b5bdb;/);
  assert.match(base, /--accent-on-soft: #314dc1;/);
  assert.match(base, /--rehab: #765000;/);
  assert.match(base, /:root\[data-theme="dark"\][\s\S]*--accent-fill: #4266e4;/);
  assert.match(base, /:root\[data-theme="dark"\][\s\S]*--accent-on-soft: #8299ff;/);
  assert.match(components, /\.button\.primary\s*\{[^}]*background:\s*var\(--accent-fill\);[^}]*color:\s*#fff;/);
  assert.match(views, /\.library-chip\[aria-pressed="true"\]\s*\{[^}]*color:\s*var\(--accent-on-soft\);/);
  assert.match(views, /\.library-filter-button b\s*\{[^}]*background:\s*var\(--accent-fill\);[^}]*color:\s*#fff;/);
  assert.match(views, /\.day-count\s*\{[^}]*background:\s*var\(--accent-fill\);[^}]*color:\s*#fff;/);
});

test("removed legacy CSS classes stay absent", () => {
  const css = readStyles();
  const classes = [...new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((match) => match[1]))];
  const removedLegacyClasses = [
    "alternative-links",
    "alternative-option",
    "calendar-summary",
    "check-grid",
    "compact-actions",
    "compact-button",
    "compact-toolbar",
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
    "field-row",
    "header-complete",
    "home-action",
    "is-expanded",
    "list-panel",
    "list-row",
    "mini-button",
    "page-toolbar",
    "rest-notice",
    "routine-entry-content",
    "routine-entry-row",
    "routine-heading",
    "row-actions",
    "scope-options",
    "search-field",
    "section-heading",
    "status-line",
    "status-pill",
    "sticky-action",
    "tag",
    "tags",
    "today-summary",
    "toolbar-label",
    "topbar-actions",
    "workout-chevron",
    "workout-details",
  ];

  assert.deepEqual(removedLegacyClasses.filter((name) => classes.includes(name)), []);
});

test("the iPhone shell constrains the app and leaves the main view scrollable", () => {
  const css = readStyles();
  assert.match(css, /\.app-shell\s*\{[^}]*height:\s*100dvh;/);
  assert.match(css, /\.topbar\s*\{[^}]*grid-row:\s*1;/);
  assert.match(css, /#appMain\s*\{[^}]*grid-row:\s*2;/);
  assert.match(css, /#appMain\s*\{[^}]*overflow-y:\s*auto;/);
  assert.match(css, /#appMain\s*\{[^}]*-webkit-overflow-scrolling:\s*touch;/);
});

test("core exercise references and program controls remain reachable", () => {
  const html = read("index.html");
  const app = read("app.js");
  const ui = readUi();
  for (const id of ["exerciseDetailDialog", "exerciseDetailContent", "exerciseVideoDialog", "exerciseVideoContent", "exercisePrimaryTarget1", "exercisePrimaryTarget2", "chooseSecondaryTargetsButton", "exerciseMovement", "chooseEquipmentButton", "exercisePurpose", "exerciseStyle", "exerciseLaterality", "exerciseSupport", "chooseEmphasesButton", "exerciseChallenge", "classificationPickerDialog", "exerciseFilterContent", "clearExerciseFilterButton", "applyExerciseFilterButton"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(ui, /open-workout-exercise/);
  assert.match(ui, /open-entry-choices/);
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
  assert.match(ui, /open-workout-exercise/);
  assert.match(ui, /open-entry-choices/);
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
  assert.match(workout, /routine\?\.blocks\.map/);
  assert.match(workout, /entry\.blockId === block\.id/);
  assert.match(workout, /class="routine-note-disclosure"/);
  assert.match(workout, /class="entry-note-preview"/);
  assert.match(workout, /class="entry-role-tag">Optional/);
  assert.match(workout, /data-action="toggle-entry-check"/);
  assert.match(workout, /open-workout-exercise/);
  assert.match(workout, /open-entry-choices/);
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
    routineName: "Push A",
    routineNote: "Pause at the bottom.",
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
  assert.ok(reference.indexOf(">Easier<") < reference.indexOf(">Alternative<"));
  assert.ok(reference.indexOf(">Alternative<") < reference.indexOf(">Harder<"));
  assert.match(reference, /Control the bottom\./);
  assert.match(reference, /For this routine — Push A/);
  assert.match(reference, /Pause at the bottom\./);
  assert.match(reference, /Exercise notes/);
  assert.ok(reference.indexOf("For this routine") < reference.indexOf("Exercise notes"));
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
  assert.match(app, /updateProgramInState/);
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

  const emptyProgram = { id: "empty", name: "Empty", note: "", routineIds: [] };
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
    "entryChoicesEditorLabel",
    "entryChoicesList",
    "addEntryChoiceButton",
    "entryChoiceDialog",
    "entryChoicePrescription",
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

test("Ironworks Program renders stored blocks and keeps reorder targets block-relative", () => {
  const app = read("app.js");
  const storage = read("storage.js");
  const css = readStyles();
  const state = createDefaultState();
  const program = state.programs.find((item) => item.id === state.settings.activeProgramId);
  const routine = state.routines.find((item) => item.id === program.routineIds[0]);
  routine.blocks = [
    { id: "main-work", name: "Main work" },
    { id: "optional-work", name: "Optional coverage" },
  ];
  routine.entries.forEach((entry, index) => {
    entry.blockId = index === 1 || index === 4 ? "optional-work" : "main-work";
    entry.role = index === 1 || index === 3 || index === 4 ? "optional" : "main";
  });
  const routines = program.routineIds.map((id) => state.routines.find((item) => item.id === id));
  const markup = programMarkup({
    state,
    program,
    routines,
    routine,
    exerciseById: (current, id) => current.exercises.find((exercise) => exercise.id === id),
  });
  const mainBlockIds = routine.entries.filter((entry) => entry.blockId === "main-work").map((entry) => entry.id);
  const optionalBlockIds = routine.entries.filter((entry) => entry.blockId === "optional-work").map((entry) => entry.id);
  const rowIds = [...markup.matchAll(/class="program-row"[^>]+data-id="([^"]+)"/g)].map((match) => match[1]);
  const numbers = [...markup.matchAll(/class="row-number">(\d+)</g)].map((match) => Number(match[1]));

  assert.match(markup, /data-block-id="main-work"[\s\S]*Main work/);
  assert.match(markup, /data-block-id="optional-work"[\s\S]*Optional coverage/);
  assert.match(markup, /class="program-list" data-block-id="main-work"/);
  assert.match(markup, /class="program-list" data-block-id="optional-work"/);
  assert.deepEqual(rowIds, [...mainBlockIds, ...optionalBlockIds]);
  assert.deepEqual(numbers, routine.entries.map((_, index) => index + 1));
  assert.match(markup, /class="entry-role-tag">Optional/);
  assert.match(markup, /class="program-block-role">Optional/);
  assert.match(app, /const targetBlockIndex = \[\.\.\.drag\.list\.children\]\.indexOf\(drag\.placeholder\)/);
  assert.match(app, /reorderRoutineEntryWithinBlock/);
  assert.match(storage, /function reorderEntryWithinBlock\(/);
  assert.match(storage, /export function reorderRoutineEntryWithinBlock\(/);
  assert.match(app, /const ENTRY_HOLD_DELAY = 340;/);
  assert.match(app, /const ENTRY_HOLD_TOLERANCE = 10;/);
  assert.match(css, /\.program-section-label\s*\{[^}]*min-height:\s*30px;/);
  assert.match(css, /\.program-row\s*\{[^}]*min-height:\s*62px;/);
  assert.match(css, /\.program-row-placeholder\s*\{[^}]*min-height:\s*62px;/);
});

test("Slice 10G exposes scoped notes and complete block authoring", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = readStyles();
  const state = createDefaultState();
  const program = state.programs[0];
  const routine = state.routines.find((item) => item.id === program.routineIds[0]);
  const routines = program.routineIds.map((id) => state.routines.find((item) => item.id === id));
  program.note = "Weekly layout\nKeep one rest day.";
  routine.note = "Choice menu: choose only what you need.";
  routine.blocks = [
    { id: "first-block", name: "Upper-body work" },
    { id: "second-block", name: "Optional coverage" },
  ];
  routine.entries.forEach((entry, index) => {
    entry.blockId = index < 3 ? "first-block" : "second-block";
    entry.role = index === 1 || index >= 3 ? "optional" : "main";
    entry.note = index === 2 ? "Pause for two seconds." : "";
  });

  const workoutShell = workoutMarkup({
    state,
    program,
    routines,
    routine,
    todayKey: "2026-07-25",
    exerciseById: (current, id) => current.exercises.find((exercise) => exercise.id === id),
  });
  const workoutBlocks = workoutBlocksMarkup({
    state,
    routine,
    todayKey: "2026-07-25",
    exerciseById: (current, id) => current.exercises.find((exercise) => exercise.id === id),
  });
  const programView = programMarkup({
    state,
    program,
    routines,
    routine,
    exerciseById: (current, id) => current.exercises.find((exercise) => exercise.id === id),
  });
  const blockEditor = routineBlocksEditorMarkup(routine.blocks, routine.entries);

  assert.match(workoutShell, /Choice menu/);
  assert.ok(workoutBlocks.indexOf("Upper-body work") < workoutBlocks.indexOf("Optional coverage"));
  assert.equal((workoutBlocks.match(/entry-note-preview/g) || []).length, 1);
  assert.match(workoutBlocks, /Pause for two seconds\./);
  assert.match(workoutBlocks, /entry-role-tag">Optional/);
  assert.match(workoutBlocks, /workout-block-role">Optional/);

  assert.match(programView, /Weekly layout &amp; rules/);
  assert.match(programView, /program-routine-note/);
  assert.equal((programView.match(/data-action="open-picker"/g) || []).length, 2);
  assert.match(programView, /data-block-id="first-block"/);
  assert.match(programView, /data-block-id="second-block"/);
  assert.match(blockEditor, /Upper-body work/);
  assert.match(blockEditor, /3 entries/);
  assert.match(blockEditor, /Optional coverage/);

  for (const id of [
    "programNote",
    "routineNote",
    "routineBlocksList",
    "addRoutineBlockButton",
    "routineBlockDialog",
    "routineBlockName",
    "moveBlockEarlierButton",
    "moveBlockLaterButton",
    "deleteBlockButton",
    "entryBlock",
    "entryNote",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, />Role<\/span>/);
  assert.doesNotMatch(html, />Section<\/span>/);
  assert.match(app, /const BLOCK_HOLD_DELAY = 340;/);
  assert.match(app, /const BLOCK_HOLD_TOLERANCE = 10;/);
  assert.match(app, /pickerBlockId/);
  assert.match(app, /routineBlockDraft/);
  assert.match(css, /\.routine-block-grip,[\s\S]*?width:\s*44px;/);
  assert.match(css, /\.routine-note-disclosure summary,[\s\S]*?min-height:\s*44px;/);
  assert.match(css, /\.entry-note-preview\s*\{[^}]*-webkit-line-clamp:\s*2;/);
});

test("Slice 10H renders and edits programmed choices without changing slot completion", () => {
  const html = read("index.html");
  const app = read("app.js");
  const storage = read("storage.js");
  const css = readStyles();
  const state = createDefaultState();
  const program = state.programs[0];
  const routine = state.routines.find((item) => item.id === program.routineIds[0]);
  const entry = routine.entries[0];
  const secondChoice = routine.entries[1].choices[0];
  entry.choices = [entry.choices[0], { ...secondChoice }];
  entry.note = "Rotate these choices by week.";
  const routines = program.routineIds.map((id) => state.routines.find((item) => item.id === id));
  const exerciseById = (current, id) => current.exercises.find((exercise) => exercise.id === id);

  const presentation = entryPresentation(entry, state, exerciseById);
  assert.equal(presentation.title, "Low-incline dumbbell press or Machine overhead press");
  assert.equal(presentation.prescription, "3 × 6–10 or 2 × 8–12");
  assert.equal(presentation.preferred.choice.exerciseId, entry.choices[0].exerciseId);

  const workoutShell = workoutMarkup({
    state,
    program,
    routines,
    routine,
    todayKey: "2026-07-25",
    exerciseById,
  });
  const workoutBlocks = workoutBlocksMarkup({
    state,
    routine,
    todayKey: "2026-07-25",
    exerciseById,
  });
  const programView = programMarkup({ state, program, routines, routine, exerciseById });
  const sheet = entryChoicesMarkup({
    state,
    routine,
    entry,
    blockName: "Upper-body work",
    displayIndex: 1,
    exerciseById,
  });
  const editor = entryChoicesEditorMarkup(entry.choices, state, exerciseById);
  const emptyEditor = entryChoicesEditorMarkup([], state, exerciseById);
  const choicePicker = pickerListMarkup(
    entry.choices.map((choice) => exerciseById(state, choice.exerciseId)),
    new Set([entry.choices[0].exerciseId]),
    { mode: "choice" },
  );

  assert.match(workoutBlocks, /data-action="open-entry-choices"/);
  assert.match(workoutBlocks, /data-action="open-workout-exercise"/);
  assert.match(workoutBlocks, /Low-incline dumbbell press or Machine overhead press/);
  assert.match(workoutBlocks, /3 × 6–10 or 2 × 8–12/);
  assert.match(workoutBlocks, /data-action="toggle-entry-check"[^>]+data-id="push-a-glutes-entry-001"/);
  assert.match(programView, /Low-incline dumbbell press or Machine overhead press/);
  assert.match(programView, /3 × 6–10 or 2 × 8–12/);

  assert.equal((sheet.match(/data-action="open-choice-reference"/g) || []).length, 2);
  assert.equal((sheet.match(/data-action="open-choice-video"/g) || []).length, 2);
  assert.match(sheet, /choice-preferred-tag">Preferred/);
  assert.match(sheet, /Rotate these choices by week/);
  assert.match(sheet, /completes this routine slot, not an individual choice/);
  assert.match(editor, /data-action="prefer-entry-choice"/);
  assert.equal((editor.match(/data-action="edit-entry-choice"/g) || []).length, 2);
  assert.equal((editor.match(/data-action="remove-entry-choice"/g) || []).length, 2);
  assert.match(emptyEditor, /Add at least one choice before saving/);
  assert.match(choicePicker, /already a choice" disabled/);
  assert.match(choicePicker, /picker-item-action">Added/);

  const sharedEntry = structuredClone(entry);
  sharedEntry.choices[1].prescription = sharedEntry.choices[0].prescription;
  const shared = entryPresentation(sharedEntry, state, exerciseById);
  assert.equal(shared.prescription, sharedEntry.choices[0].prescription);
  const emptyPrescriptionEntry = structuredClone(entry);
  emptyPrescriptionEntry.choices[0].prescription = "";
  assert.match(entryPresentation(emptyPrescriptionEntry, state, exerciseById).prescription, /^No prescription or /);
  const renamedMaster = state.exercises.find((exercise) => exercise.id === entry.choices[0].exerciseId);
  renamedMaster.name = "Renamed preferred press";
  assert.match(entryPresentation(entry, state, exerciseById).title, /^Renamed preferred press or /);
  assert.equal(entry.choices[0].exerciseId, renamedMaster.id);

  for (const id of [
    "entryChoicesDialog",
    "entryChoicesContent",
    "entryChoiceDialog",
    "entryChoiceForm",
    "entryChoicePrescription",
    "preferEntryChoiceButton",
    "moveEntryChoiceEarlierButton",
    "moveEntryChoiceLaterButton",
    "removeEntryChoiceButton",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /id="entryChoicePrescription" required/);
  assert.match(app, /choices: entryChoiceDraft/);
  assert.match(app, /function openEntryChoices\(/);
  assert.match(app, /function refreshOpenEntryChoices\(/);
  assert.equal((app.match(/refreshOpenEntryChoices\(\);/g) || []).length, 2);
  assert.match(app, /function moveEntryChoiceDraft\(/);
  assert.match(app, /Add at least one exercise choice/);
  assert.match(app, /Add a prescription to every exercise choice/);
  assert.match(app, /Enter a prescription for this choice/);
  assert.match(app, /Add a default prescription to this Library exercise/);
  assert.match(storage, /Object\.hasOwn\(updates, "choices"\)/);
  assert.match(css, /\.entry-choice-video\s*\{[^}]*width:\s*44px;/);
  assert.match(css, /\.entry-choice-mini\s*\{[^}]*width:\s*44px;/);
  assert.doesNotMatch(`${html}\n${app}`, /performedChoice|selectedChoice|choiceHistory/);
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

test("Slice 11B exposes the complete master editor and one accessible scoped picker", () => {
  const html = read("index.html");
  const app = read("app.js");
  const data = read("data.js");
  const css = readStyles();
  const editor = html.slice(html.indexOf('<dialog id="exerciseDialog"'), html.indexOf('<dialog id="exerciseFilterDialog"'));
  for (const id of [
    "exerciseAliases",
    "exercisePrescription",
    "exercisePrimaryTarget1",
    "exercisePrimaryTarget2",
    "chooseSecondaryTargetsButton",
    "exerciseMovement",
    "chooseEquipmentButton",
    "exercisePurpose",
    "exerciseStyle",
    "exerciseLaterality",
    "exerciseSupport",
    "chooseEmphasesButton",
    "exerciseChallenge",
    "exerciseVideo",
    "exerciseInstructions",
    "chooseAlternativesButton",
    "duplicateExerciseButton",
    "deleteExerciseButton",
  ]) assert.match(editor, new RegExp(`id="${id}"`));
  assert.match(editor, /class="exercise-editor-footer"/);
  assert.match(editor, /Routine execution stays in Program/);
  assert.doesNotMatch(editor, /entryRole|entryPrescription|routine prescription/i);
  assert.match(html, /id="classificationPickerDialog"/);
  assert.match(app, /upsertExerciseInState\(state, exercise, relatedExercises\)/);
  assert.match(app, /normalizedExerciseSearch/);
  assert.match(app, /exerciseEditorMode === "duplicate"/);
  assert.match(css, /\.exercise-editor-dialog\s*\{[^}]*height:\s*100dvh;/);
  assert.match(css, /\.exercise-editor-scroll\s*\{[^}]*overflow:\s*auto;/);
  assert.match(css, /\.exercise-editor-footer\s*\{[^}]*safe-area-inset-bottom/);
  for (const label of ["Neck", "Feet/toes", "Neck movement", "Foot/toe control", "Hip extension", "Shrug"]) {
    assert.match(data, new RegExp(`"${label.replace("/", "\\/")}"`));
  }

  const picker = classificationOptionPickerMarkup({
    options: [{ id: "chest", label: "Chest" }, { id: "triceps", label: "Triceps" }],
    selected: ["triceps"],
    excluded: ["chest"],
  });
  assert.match(picker, /data-classification-value="chest" aria-pressed="false" disabled/);
  assert.match(picker, /Primary target/);
  assert.match(picker, /data-classification-value="triceps" aria-pressed="true"/);
  assert.match(picker, /Selected/);
});

test("Slice 11C exposes linked-first relationship editing and exact deletion impact", () => {
  const html = read("index.html");
  const app = read("app.js");
  const storage = read("storage.js");
  const css = readStyles();
  for (const id of [
    "alternativesDialog",
    "alternativesDialogHint",
    "alternativesSearch",
    "alternativesList",
    "cancelAlternativesButton",
    "saveAlternativesButton",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /Changes stay in this draft until you save the master exercise/);
  assert.match(app, /relation:\s*"similar"/);
  assert.match(app, /data-add-related/);
  assert.match(app, /data-remove-related/);
  assert.match(app, /data-related-relation/);
  assert.match(app, /exerciseDeletionImpact\(state, id\)/);
  assert.match(app, /Programmed use:/);
  assert.match(app, /alternative.*removed/);
  assert.match(app, /choices.*promoted/);
  assert.match(app, /slots.*deleted with any saved checks/);
  assert.match(app, /Related links removed:/);
  assert.match(storage, /alternativeChoicesRemoved/);
  assert.match(storage, /preferredChoicesPromoted/);
  assert.match(storage, /slotsDeleted/);
  assert.match(css, /\.relationship-list\s*\{[^}]*overflow:\s*auto;/);
  assert.match(css, /\.relationship-relation select\s*\{[^}]*min-height:\s*44px;/);
  assert.match(css, /\.relationship-remove\s*\{[^}]*min-height:\s*44px;/);
  assert.match(css, /\.confirm-dialog\[data-variant="exercise-delete"\]/);

  const linked = {
    exercise: {
      id: "linked",
      name: "Linked <press>",
      primaryTargets: ["chest"],
      secondaryTargets: [],
      movementPattern: "horizontal-press",
      purpose: "strength",
    },
    relation: "similar",
  };
  const available = {
    id: "available",
    name: "Available row",
    primaryTargets: ["triceps"],
    secondaryTargets: [],
    movementPattern: "elbow-extension",
    purpose: "strength",
  };
  const markup = relationshipEditorMarkup({
    linkedExercises: [linked],
    availableExercises: [available],
  });
  assert.ok(markup.indexOf("Linked &lt;press&gt;") < markup.indexOf("Available row"));
  assert.match(markup, /value="similar" selected>Alternative/);
  assert.match(markup, /data-remove-related="linked"/);
  assert.match(markup, /data-add-related="available"/);
  assert.doesNotMatch(markup, /Linked <press>/);

  const messageStart = app.indexOf("function exerciseDeletionMessage(");
  const messageEnd = app.indexOf("async function deleteExercise(", messageStart);
  const messageSource = app.slice(messageStart, messageEnd);
  const context = {};
  runInNewContext(`${messageSource}
    this.zero = exerciseDeletionMessage({ name: "Unused" }, {
      programmedUses: 0,
      alternativeChoicesRemoved: 0,
      preferredChoicesPromoted: 0,
      slotsDeleted: 0,
      relatedLinksRemoved: 2,
    });
    this.mixed = exerciseDeletionMessage({ name: "Mixed" }, {
      programmedUses: 3,
      alternativeChoicesRemoved: 1,
      preferredChoicesPromoted: 1,
      slotsDeleted: 1,
      relatedLinksRemoved: 1,
    });`, context);
  assert.match(context.zero, /Programmed use: 0 slots/);
  assert.match(context.zero, /No routine choices, slots, or saved checks will change/);
  assert.match(context.zero, /Related links removed: 2/);
  assert.match(context.mixed, /Programmed use: 3 slots/);
  assert.match(context.mixed, /1 alternative choice removed; 1 next choice promoted; 1 slot deleted/);
});

test("a failed exercise deletion write keeps the editor and stored state intact", async () => {
  const app = read("app.js");
  const start = app.indexOf("function exerciseDeletionMessage(");
  const end = app.indexOf("function renderProgramsList(", start);
  const source = app.slice(start, end);
  const state = createDefaultState();
  const before = structuredClone(state);
  const exerciseId = state.exercises[0].id;
  let confirmation;
  let replaceCalls = 0;
  let closeCalls = 0;
  let renderCalls = 0;
  const context = {
    exerciseById: (candidate, id) => candidate.exercises.find((exercise) => exercise.id === id),
    exerciseDeletionImpact: (candidate, id) => {
      const exercise = candidate.exercises.find((item) => item.id === id);
      return {
        programmedUses: candidate.routines.flatMap((routine) => routine.entries)
          .filter((entry) => entry.choices.some((choice) => choice.exerciseId === id)).length,
        alternativeChoicesRemoved: 0,
        preferredChoicesPromoted: 0,
        slotsDeleted: 1,
        relatedLinksRemoved: exercise.relatedExercises.length,
      };
    },
    confirmAction: async (...args) => {
      confirmation = args;
      return true;
    },
    removeExerciseFromState: () => before,
    saveResult: (result) => result.ok,
    refreshOpenEntryChoices: () => {},
    render: () => { renderCalls += 1; },
    document: {
      querySelector: () => ({ close: () => { closeCalls += 1; } }),
    },
    store: {
      getState: () => state,
      replace: () => {
        replaceCalls += 1;
        return { ok: false };
      },
    },
  };
  runInNewContext(`${source}
    this.promise = deleteExercise(${JSON.stringify(exerciseId)});`, context);
  await context.promise;
  assert.equal(replaceCalls, 1);
  assert.equal(closeCalls, 0);
  assert.equal(renderCalls, 0);
  assert.deepEqual(state, before);
  assert.equal(confirmation[0], "Delete exercise");
  assert.equal(confirmation[2], "Delete exercise");
  assert.equal(confirmation[3], "Keep exercise");
  assert.equal(confirmation[4], "exercise-delete");
});

test("exercise save executes atomic add, edit, duplicate, optional classification, and required-target paths", () => {
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

  function runSave(state, values, selections = {}, pendingRelatedExercises = []) {
    let error = "";
    let replaceCalls = 0;
    let closeCalls = 0;
    let renderCalls = 0;
    const elements = {
      "#exerciseId": { value: values.id || "" },
      "#exerciseName": { value: values.name || "" },
      "#exerciseAliases": { value: values.aliases || "" },
      "#exercisePrimaryTarget1": { value: values.primaryTarget1 || "" },
      "#exercisePrimaryTarget2": { value: values.primaryTarget2 || "" },
      "#exerciseMovement": { value: values.movement || "" },
      "#exercisePurpose": { value: values.purpose || "" },
      "#exerciseStyle": { value: values.style || "" },
      "#exerciseLaterality": { value: values.laterality || "" },
      "#exerciseSupport": { value: values.support || "" },
      "#exerciseChallenge": { value: values.challenge || "" },
      "#exerciseVideo": { value: values.video || "" },
      "#exerciseFormError": {},
      "#exercisePrescription": { value: values.prescription || "" },
      "#exerciseInstructions": { value: values.instructions || "" },
      "#chooseEquipmentButton": {},
      "#exerciseDialog": { close: () => { closeCalls += 1; } },
    };
    const context = {
      EXERCISE_TARGETS: targets,
      MOVEMENT_PATTERNS: movements,
      EXERCISE_EQUIPMENT: equipmentValues,
      EXERCISE_PURPOSES: purposes,
      normalizedExerciseSearch: (value) => (String(value).normalize("NFKD").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join(""),
      pendingRelatedExercises,
      exerciseEditorSourceId: values.sourceId || "",
      exerciseEditorMode: values.mode || (values.id ? "edit" : values.sourceId ? "duplicate" : "add"),
      exerciseEditorReturnId: "",
      exerciseEditorSelections: {
        secondaryTargets: selections.secondaryTargets || [],
        equipment: selections.equipment || [],
        emphases: selections.emphases || [],
      },
      makeId: () => "exercise-new",
      upsertExerciseInState,
      render: () => { renderCalls += 1; },
      refreshOpenEntryChoices: () => {},
      saveResult: (result) => result.ok,
      showExerciseEditorError: (message) => { error = message; },
      document: {
        querySelector: (selector) => {
          assert.ok(elements[selector], `unexpected selector: ${selector}`);
          return elements[selector];
        },
      },
      store: {
        getState: () => state,
        replace: (candidate) => {
          replaceCalls += 1;
          if (values.failWrite) return { ok: false };
          if (!validateState(candidate)) return { ok: false };
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, candidate);
          return { ok: true };
        },
      },
    };
    runInNewContext(`${source}\nthis.result = saveExercise();`, context);
    return { result: context.result, error, replaceCalls, closeCalls, renderCalls };
  }

  const addedState = createDefaultState();
  const added = runSave(addedState, {
    name: "Hip extension",
    primaryTarget1: "glute-max",
    movement: "hip-thrust-bridge",
    purpose: "rehab",
    prescription: "3 × 10",
    aliases: "Hip cable extension\nStanding hip extension",
    style: "isolation",
    laterality: "unilateral",
    support: "supported",
    challenge: "shortened-top",
  }, {
    secondaryTargets: ["hamstrings"],
    equipment: ["cable"],
    emphases: ["glute-bias"],
  });
  assert.equal(added.result, true);
  const addedExercise = addedState.exercises.find((exercise) => exercise.id === "exercise-new");
  assert.deepEqual(Array.from(addedExercise.primaryTargets), ["glute-max"]);
  assert.deepEqual(Array.from(addedExercise.secondaryTargets), ["hamstrings"]);
  assert.deepEqual(Array.from(addedExercise.equipment), ["cable"]);
  assert.equal(addedExercise.purpose, "rehab");
  assert.deepEqual(Array.from(addedExercise.aliases), ["Hip cable extension", "Standing hip extension"]);
  assert.deepEqual(Array.from(addedExercise.emphases), ["glute-bias"]);
  assert.equal(addedExercise.typicalChallenge, "shortened-top");

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
  }, {
    secondaryTargets: ["front-delts"],
    equipment: ["dumbbells", "bench"],
  }, existingRelated);
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
  }, {
    secondaryTargets: ["triceps"],
    equipment: ["dumbbells", "bench"],
  }, original.relatedExercises);
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
  assert.equal(blocked.replaceCalls, 0);
  assert.equal(blocked.closeCalls, 0);
  assert.equal(blocked.renderCalls, 0);

  const collisionState = createDefaultState();
  const collision = runSave(collisionState, {
    name: "Unique exercise",
    aliases: collisionState.exercises[0].name,
  });
  assert.equal(collision.result, false);
  assert.equal(collision.error, "An alias is already used by another exercise.");
  assert.equal(collision.replaceCalls, 0);

  const failedState = createDefaultState();
  const failedBefore = structuredClone(failedState);
  const failed = runSave(failedState, {
    name: "Unsaved exercise",
    primaryTarget1: "chest",
    movement: "horizontal-press",
    purpose: "strength",
    failWrite: true,
  }, {
    equipment: ["dumbbells"],
  });
  assert.equal(failed.result, false);
  assert.equal(failed.replaceCalls, 1);
  assert.equal(failed.closeCalls, 0);
  assert.equal(failed.renderCalls, 0);
  assert.deepEqual(failedState, failedBefore);
});

test("Slice 11A composes normalized Library search, quick groups, and faceted filters", () => {
  const css = readStyles();
  const exercises = [
    {
      id: "press",
      name: "Low-incline dumbbell press",
      aliases: ["Incline DB press"],
      defaultPrescription: "3 × 8–12",
      primaryTargets: ["chest"],
      secondaryTargets: ["triceps"],
      movementPattern: "horizontal-press",
      equipment: ["dumbbells", "bench"],
      purpose: "strength",
      style: "compound",
      laterality: "bilateral",
      emphases: ["upper-chest"],
      typicalChallenge: "lengthened-bottom",
    },
    {
      id: "row",
      name: "One-arm cable row",
      aliases: [],
      defaultPrescription: "3 × 10",
      primaryTargets: ["upper-mid-back", "lats"],
      secondaryTargets: ["chest"],
      movementPattern: "horizontal-pull",
      equipment: ["cable"],
      purpose: "strength",
      style: "compound",
      laterality: "unilateral",
      emphases: [],
      typicalChallenge: "middle",
    },
    {
      id: "hinge",
      name: "Romanian deadlift",
      aliases: ["RDL"],
      defaultPrescription: "3 × 6–10",
      primaryTargets: ["hamstrings", "glute-max"],
      secondaryTargets: ["adductors"],
      movementPattern: "hip-hinge",
      equipment: ["barbell", "dumbbells"],
      purpose: "strength",
      style: "compound",
      laterality: "bilateral",
      emphases: ["glute-bias"],
      typicalChallenge: "lengthened-bottom",
    },
    {
      id: "mobility",
      name: "90/90 hip switches",
      aliases: [],
      defaultPrescription: "1 × 8",
      primaryTargets: ["glute-med-min"],
      secondaryTargets: ["adductors"],
      movementPattern: "hip-rotation",
      equipment: ["none"],
      purpose: "mobility",
      style: "mobility-control",
      laterality: "alternating",
      emphases: [],
      typicalChallenge: "variable",
    },
    {
      id: "rehab",
      name: "Cable external rotation",
      aliases: [],
      defaultPrescription: "2 × 15",
      primaryTargets: ["rotator-cuff"],
      secondaryTargets: ["rear-delts"],
      movementPattern: "shoulder-rotation",
      equipment: ["cable"],
      purpose: "rehab",
      style: "isolation",
      laterality: "unilateral",
      emphases: [],
      typicalChallenge: "variable",
    },
  ];
  const state = { exercises };
  const ids = (query = "", updates = {}) => filteredExercises(state, {
    query,
    ...createLibraryFilters(),
    ...updates,
  }).map((exercise) => exercise.id);

  assert.deepEqual(ids("incline-db"), ["press"]);
  assert.deepEqual(ids("90 90"), ["mobility"]);
  assert.deepEqual(ids("hip/hinge"), ["hinge"]);
  assert.deepEqual(ids("", { quickGroup: "back" }), ["row"]);
  assert.deepEqual(ids("", { quickGroup: "push" }), ["press"]);
  assert.deepEqual(ids("", { targets: ["chest"] }), ["press"]);
  assert.deepEqual(ids("", { targets: ["chest"], targetScope: "all" }), ["press", "row"]);
  assert.deepEqual(ids("", { targets: ["chest", "glute-max"] }), ["press", "hinge"]);
  assert.deepEqual(ids("", {
    targets: ["glute-max"],
    movements: ["hip-hinge", "squat"],
    equipment: ["barbell", "cable"],
    purposes: ["strength"],
    styles: ["compound"],
    lateralities: ["bilateral"],
    emphases: ["glute-bias"],
    challenges: ["lengthened-bottom"],
  }), ["hinge"]);
  assert.deepEqual(ids("", { equipment: ["cable", "dumbbells"], purposes: ["rehab"] }), ["rehab"]);

  const filters = {
    ...createLibraryFilters(),
    targetScope: "all",
    targets: ["chest", "glute-max"],
    movements: ["hip-hinge", "squat"],
    equipment: ["barbell", "cable"],
  };
  assert.equal(activeLibraryFilterCount(filters), 4);
  assert.equal(activeLibraryFilterCount(createLibraryFilters()), 0);

  const groups = availableLibraryBrowseGroups(state).map((group) => group.id);
  assert.ok(groups.includes("chest"));
  assert.ok(groups.includes("back"));
  assert.ok(groups.includes("push"));
  assert.ok(!groups.includes("neck"));
  assert.ok(EXERCISE_BROWSE_GROUPS.some((group) => group.id === "neck"));

  const rows = libraryRowsMarkup(exercises);
  assert.match(rows, /Hamstrings · Glute max/);
  assert.match(rows, /Hip hinge/);
  assert.match(rows, /library-purpose">Mobility/);
  assert.match(rows, /library-purpose">Rehab/);
  assert.doesNotMatch(rows.slice(rows.indexOf("Cable external rotation")), /Shoulder rotation/);
  assert.match(libraryRowsMarkup([], { libraryEmpty: true }), /Library is empty[\s\S]*data-action="new-exercise"/);
  assert.match(libraryRowsMarkup([]), /No matching exercises[\s\S]*data-action="clear-library-filters"[\s\S]*data-action="new-exercise"/);

  const page = libraryPageShellMarkup({ resultCount: 1 })
    + `<div class="library-scroll">${libraryScrollContentMarkup({
      query: "row",
      filters,
      exercises: [exercises[1]],
      totalCount: exercises.length,
      browseGroups: availableLibraryBrowseGroups(state),
    })}</div></section>`;
  assert.match(page, /library-app-title">Library <span id="libraryAppCount">1/);
  assert.match(read("app.js"), /libraryPageShellMarkup\(\{ resultCount: exercises\.length \}\)/);
  assert.match(page, /placeholder="Exercise, target, or movement"/);
  assert.match(page, /data-action="select-library-quick-group"/);
  assert.match(page, /data-action="toggle-library-target-scope"/);
  assert.match(page, /Filter <b>4<\/b>/);
  assert.match(page, /data-action="view-exercise"/);
  assert.doesNotMatch(page, /data-action="edit-master-exercise"/);
  assert.match(css, /\.library-search:focus-within\s*\{[^}]*outline:\s*3px solid var\(--focus\);/);

  const sheet = exerciseFilterContentMarkup(filters);
  for (const group of ["targets", "movements", "equipment", "purposes", "styles", "lateralities", "emphases", "challenges"]) {
    assert.match(sheet, new RegExp(`data-filter-group="${group}"`));
  }
  assert.match(sheet, /library-more-filters/);
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
