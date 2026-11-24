# Working on Gym Schedule

A personal workout app for one person, used on an iPhone 15 Pro as an installed home-screen app. It runs fully offline; all data lives in the phone's browser storage. Plain HTML, CSS and JavaScript modules: no build step, no framework, no backend.

## Before changing anything

- `docs/PRODUCT.md` says what the app does. Every action listed there must keep working unless the owner asks otherwise; update the file when behaviour changes.
- `docs/DESIGN.md` says how it looks (tokens, type, shapes and components, and the design boards the owner agreed to in `references/redesign/`) and, under "How it behaves", how it must move and respond: nothing jumps, nothing redraws needlessly, every control says what it does. New UI follows both, and a UI change is checked against that list before it is published.
- `docs/TODO.md` holds planned work. The owner's newest request decides scope.
- Each module starts with a comment saying what it owns. Read it before editing.

## Code map

| Path | Owns |
| --- | --- |
| `index.html` | Page shell, bottom navigation, every `<dialog>` |
| `js/app.js` | Startup: loads the screens, routes every tap and form to its action (a bottom tab through `openTab`), opens on the workout in progress, service-worker registration |
| `js/context.js` | The one `store`, `registerView`, `registerActions`, `render()` (the page and the dock), `navigate()`, `openTab()`, changing page and going back |
| `js/store.js` | Saved data: schema version, upgrades from older versions, shape check, load/save, backups |
| `js/model.js` | Reading data (selectors) and changing it (mutators) |
| `js/search.js` | Exercise search and Library filters |
| `js/vocab.js` | Fixed lists: targets, movements, equipment, … |
| `js/seed.js` | Starting data (first launch and "Restore starting data"), one exercise or slot per line |
| `js/library-update.js` | What the upgrades from version 14 to 19 apply to saved data: Library renames, links and added exercises, machine kinds, moving the version out of the name into the setup fields, and the coach's edits to PPL 9 |
| `js/dom.js` | DOM helpers: escaping, toasts, `redraw`, dialogs, confirmations, hold-to-drag |
| `js/views/round.js` | The round page, the Workout tab's first page and the app's home: the round as one list with one row open and the bottom button acting on it; the pages Rounds and blocks, one block and one round; and the sheets for an extra workout, following another program and changing the round number |
| `js/views/workout.js` | The workout in progress (a page of the Workout tab), its bottom button, the running bar every other page shows, the result after Finish, the choices sheet, keeping the screen on |
| `js/views/*.js` | One file per screen or sheet, each with its markup and actions |
| `styles/` | `base.css` (tokens, element defaults, page shell), `components.css` (the shared classes every screen is built from), `views.css` (what only one screen needs) |
| `sw.js` | Offline cache; its file list and version are stamped by `npm run check` |
| `tests/` | Unit tests (`*.test.mjs`) and browser tests (`e2e/`), all on the made-up program in `tests/sample.mjs` |
| `tools/` | Check, preview server, the owner's phone preview page, screenshots and visual diff |
| `references/` | The agreed design boards, older mock-ups and the starting program's source; not loaded by the app |

## How a screen works

- A screen is one function, `markup(state)`, registered with `registerView`. `render()` redraws the current screen from the saved state, and the dock above the tab bar from the view's `dock(state)` (or another view's `banner(state)`: the running bar). A sheet fills its `<dialog>` the same way and opens it with `openDialog`.
- A page that belongs to a tab (the workout, Settings) registers `tab: "round"`; `back()` says where the drag from the left edge goes (null: nowhere), `landing(state)` where a tap on the tab really opens, `unavailable(state)` when the page has nothing to show.
- Every tap is a `data-action="name"` on the element, handled by `registerActions({ name(element, event) { … } })`. A `<form data-submit="name">` runs its action when saved (its button, or Enter in a field). There are no other click listeners.
- A handler changes data with `store.update((draft) => mutator(draft, …))` using functions from `js/model.js`, shows the result with `report()`, then calls `render()`.
- Redrawing replaces the markup. A scroll area keeps its place if it is marked `data-keep-scroll="name"`. Text being typed that must survive a redraw lives in the module's own state (see the logging sheet's rows).
- The browser handles dialog focus. Call `.focus()` only to put the cursor in a field the owner is about to type in.
- An exercise is drawn only through `exerciseMarkup` / `entryPresentation` (`js/views/shared.js`) and named in plain text only through `fullName` (`js/model.js`). Don't print `exercise.name` on its own anywhere but the editor's Name field: the same name can belong to several exercises.
- Classes are for styling and `data-*` attributes and ids are for behaviour. New markup is built from the shared classes in `styles/components.css` (each has a one-line comment) before adding a screen-specific rule. Scripts find things by class in only three places: hold-drag's `.drag-row` and `.drag-list`, a sheet's `.sheet-body`, and the routine tabs.

## Saved data at a glance

One JSON object in `localStorage` under `gymAppStateV1`. The schema version, currently 21, is set in `js/store.js`. Before every save, `stateProblem` checks that the data has the shape the screens rely on and that references point at something; it doesn't police content. Saved data the app can't read is never overwritten: the starting program opens and nothing saves until the owner imports a backup or restores the starting data. (Apart from it, `gymAppWorkoutScreenV1` keeps what the running workout's screen remembers across a reload: swaps for today and the open slot. It isn't saved data, isn't backed up, and is ignored when stale.)

- `exercises`: the Library's master exercises. `name` is the movement; the setup is `equipment` (several allowed; `mainEquipment` picks the one that loads it), `attachment`, `grip`, `width`, `detail`, `laterality` (shown as "Sides") and `weightMode`. Names repeat; `fullName(exercise)` in `js/model.js` is what tells two exercises apart, and it must stay unique.
- `programs` and `routines`: a program lists its routine IDs. A routine holds its blocks and entries, and each entry its choices (master exercise plus prescription).
- `sessions`: one per date (`YYYY-MM-DD`) with `routineIds` (routines whose workout was finished), `checkedEntryIdsByRoutine` (slots marked done), `note`, `logs` (sets logged per slot, keyed by slot ID; see `saveEntrySets` in `js/model.js`) and `extras` (exercises added to a routine for that day only; `findSlot` treats them like slots).
- Rounds: there is one round count for the owner's training. `settings.round = { number, block, programId, since }` is the open round (absent until counting starts) and `settings.roundLog` lists the closed ones with the program each followed and how it ended. Each finished workout in `sessions[date].workouts[routineId]` carries `round` and `block`, plus `guest` (a routine of another program) or `optional` when it doesn't count. See "rounds and calendar weeks" in `js/model.js` and the spec in `docs/PRODUCT.md`.
- `settings`: the followed program and the selected routine (`activeProgramId`, `activeRoutineId`: no screen reads it any more, but the shape check requires it to be a routine of the followed program, so starting and finishing keep it up; the Program tab keeps what it is *showing* in its own module state, and the round page which row is open), the theme, `exerciseLabels` ("line" or "letter": how an exercise's version shows), the training rules, and `activeWorkout` (the workout in progress: routine, the day it was started, and when, plus `guest: true` while it is a routine of another program, and `breakUndo` (`{ round, logged }`: the open round as it was and how many rounds were closed) when its start answered a long break, so that Cancel can take the answer back; or null).

## Rules

- **Saved data is the owner's real history.** Never reset or discard it. To change the saved shape: bump `SCHEMA_VERSION`, add a migration in `js/store.js`, and add one test in `tests/store.test.mjs` that loads data of the previous version. Backups from older versions must keep importing.
- Vocabulary IDs in `js/vocab.js` are stored in saved data. Labels can change; changing or removing an ID needs a migration, or saved exercises show the raw ID.
- `store.getState()` is the saved state itself. Read it; change data only inside `store.update`. Never report success after a failed save.
- Workout content, notes and training rules are the owner's own words. Don't rewrite them. The owner's program and Library live in `js/seed.js`; tests must not depend on them.
- Keep it simple. No framework, bundler, backend, accounts, analytics or production dependency without asking. Dev-only tools (Playwright) are fine. Add an abstraction only when it removes real duplication. Delete dead code.
- Phone UI: works at 320 px wide; tap targets at least 44 × 44 px; form fields at least 16 px text (smaller makes iOS zoom in); light and dark themes; safe areas; pinch zoom stays on. A weight is always written with "kg".
- Editors don't close on a backdrop tap (only read-only sheets marked `data-dismissable` do), and Enter in a field saves.

## Checks

- `npm run check` — stamps `sw.js`, syntax-checks every script, runs the unit tests (a few seconds). Run it before every commit and commit the stamped `sw.js`.
- `npm run e2e` — browser tests, one per main flow, in about 15 seconds (one-time setup: `npm install` and `npx playwright install chromium`). They find things by role, name or visible text, never by CSS class, id or `data-*` attribute; `tests/e2e/helpers.mjs` explains how. `E2E_BROWSER=webkit npm run e2e` runs them in Safari's engine, the one the iPhone uses (one-time: `npx playwright install webkit`).
- The tests protect two things: saved data (load, save, upgrade, backup, unreadable data) and one happy path per main flow. Add a test when a change puts one of those at risk, not for every detail.
- `npm run preview` — serves the app at `http://127.0.0.1:4173/`. `npm run preview -- --lan` also prints an address a phone on the same Wi-Fi can open. The owner watches changes at `/tools/iphone-preview.html`, which refreshes after every save; keep it working.
- For UI changes, look at the result at 393 × 852 and 320 × 700 in both themes (`npm run screenshots -- <folder>` captures every screen and dialog; `tools/visual-diff.mjs` compares two runs).

## Releasing

Pushing to `main` publishes the app on GitHub Pages. Installed apps download the new version the next time they're opened and reload once. Always run `npm run check` before pushing: an unstamped `sw.js` means phones never see the update. Run `npm run e2e` too unless the change is docs only; both together take well under a minute.

## Working with the owner

- **Speed of development matters more than ceremony.** It's a personal app for one person: no accounts, sync, multi-user or online-security features, no building for unlikely edge cases, and no tests, validation or process beyond what protects the owner's saved workouts and the main flows. If a rule, test or guardrail here slows work down without protecting anything real, simplify or remove it.
- The owner wants a lean, uncluttered app (see `docs/DESIGN.md`). For a bigger UI change, show the design first (mock-ups or screenshots) and build once it's agreed.
- They write casually and expect the work to be done, checked and published, not a plan to approve. Reply in plain words, say what changed, and after a release give the site: https://moejarrah.github.io/gym-schedule/.
- Decisions they've already made are recorded in `docs/TODO.md` (including what was decided against). Don't bring those back unasked.

## Working style

Make one change at a time, in small commits with clear messages. Keep docs current; don't write status diaries, since Git has the history.
