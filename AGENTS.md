# Working on Gym Schedule

A personal workout app for one person, used on an iPhone 15 Pro as an installed home-screen app. It runs fully offline; all data lives in the phone's browser storage. Plain HTML, CSS and JavaScript modules: no build step, no framework, no backend.

## Before changing anything

- `docs/PRODUCT.md` says what the app does. Every action listed there must keep working unless the owner asks otherwise; update the file when behaviour changes.
- `docs/TODO.md` holds planned work. The owner's newest request decides scope.
- Each module starts with a comment saying what it owns. Read it before editing.

## Code map

| Path | Owns |
| --- | --- |
| `index.html` | Page shell, bottom navigation, every `<dialog>` |
| `js/app.js` | Startup: loads the screens, navigation, service-worker registration |
| `js/context.js` | The one `store`, screen and action registration, `render()`, `navigate()` |
| `js/store.js` | Saved-data schema, validation, migrations, load/save, backups |
| `js/model.js` | Reading data (selectors) and changing it (mutators) |
| `js/search.js` | Exercise search and Library filters |
| `js/vocab.js` | Fixed lists: targets, movements, equipment, … |
| `js/seed.js` | Starting data (first launch and "Restore starting data") |
| `js/dom.js` | DOM helpers: escaping, toasts, dialogs, confirmations, hold-to-drag |
| `js/views/*.js` | One file per screen or editor, each with its markup and handlers |
| `styles/` | `base.css` (tokens, layout), `components.css`, `views.css` |
| `sw.js` | Offline cache; its file list and version are stamped by `npm run check` |
| `tests/` | Unit tests (`*.test.mjs`) and browser tests (`e2e/`) |
| `tools/` | Check, preview server, screenshots and visual diff |
| `references/` | Design mock-ups and the starting program's source; not loaded by the app |

## Rules

- **Saved data is the owner's real history.** Never reset or discard it. To change the saved shape: bump `SCHEMA_VERSION`, add a migration in `js/store.js`, and add a test that loads data from the previous version (see `tests/fixtures/`). Backups from older versions must keep importing.
- Vocabulary IDs in `js/vocab.js` are stored in saved data. Labels can change; IDs change only with a migration.
- Change data only through `store.update((draft) => mutator(draft, …))` with functions from `js/model.js`, and show the result with `report()`. Never report success after a failed save.
- Workout content, notes and training rules are the owner's own words. Don't rewrite them.
- Keep it simple. No framework, bundler, backend, accounts, analytics or production dependency without asking. Dev-only tools (Playwright) are fine. Add an abstraction only when it removes real duplication. Delete dead code.
- Phone UI: works at 320 px wide; tap targets at least 44 × 44 px; form fields at least 16 px text (smaller makes iOS zoom in); light and dark themes; safe areas; pinch zoom stays on.
- Editors don't close on a backdrop tap (only read-only sheets marked `data-dismissable` do), and Enter in a field saves.

## Checks

- `npm run check` — stamps `sw.js`, syntax-checks every script, runs the unit tests. Run it before every commit and commit the stamped `sw.js`.
- `npm run e2e` — browser tests of every screen (one-time setup: `npm install` and `npx playwright install chromium`).
- `npm run preview` — serves the app at `http://127.0.0.1:4173/`. `npm run preview -- --lan` also prints an address a phone on the same Wi-Fi can open.
- For UI changes, look at the result at 393 × 852 and 320 × 700 in both themes (`npm run screenshots -- <folder>` captures every screen and dialog; `tools/visual-diff.mjs` compares two runs).

## Releasing

Pushing to `main` publishes the app on GitHub Pages. Installed apps download the new version the next time they're opened and reload once. Publish only after `npm run check` and `npm run e2e` pass; an unstamped `sw.js` means phones never see the update.

## Working style

Make one change at a time, in small commits with clear messages. Keep docs current; don't write status diaries, since Git has the history.
