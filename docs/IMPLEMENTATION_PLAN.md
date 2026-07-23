# Gym App Implementation Plan

Status: approved
Implementation: Slice 6.5 repo verified; Slices 0–6 approved

## Goal

Build the owner-approved Ironworks interface around two real product expansions:

1. Multiple saved programs, with one active program.
2. Practical exercise classification across the existing 77 exercises.

Keep the app build-free, local-first, phone-first, and maintainable. Do not add a framework, backend, account, cloud sync, analytics, or a biomechanics database.

## Sources of truth

Production UI must reproduce, not reinterpret:

- `references/ui-concepts/ironworks.html`
  - Workout density, routine tabs, number/check controls, Main/Optional sections, sheets, related exercises, and video behavior.
- `references/ui-concepts/ironworks-classification.html`
  - Library, filters, exercise reference, editor, and two external actions.
- `references/ui-concepts/ironworks-program.html`
  - Program selection/management, routine editing, entry editing, and empty/error states.
- `references/ui-concepts/ironworks-log-settings.html`
  - Log, day editing, Settings, data actions, training rules, and empty/error states.
- `references/exercise-classification-study.md`
  - Exercise fields, vocabularies, filtering, and workbook process.

`docs/PRODUCT.md` is authoritative for product terminology and behavior. In particular, its Program → routine → entry hierarchy supersedes the preserved base template's older “program boundary” annotation; keep the approved reference template untouched.

Accepted direction:

- Dark-first charcoal/bone palette with a complete light theme.
- Cobalt only for selection, state, and primary actions.
- Barlow labels, Barlow Condensed headings, IBM Plex Mono prescriptions.
- Compact rows, minimal chrome, and focused sheets.
- One-handed use at 320 px and 393 px widths.

Missing Program, Log, Settings, empty, and error states must extend this exact component system.

## Product hierarchy

```text
Program
└── Workout days / routines
    └── Ordered routine entries
        └── Global master exercises
```

- The current Push/Pull/Legs cycle plus rehab, mobility, and home days is one program.
- Push A is a routine/day, not a program.
- Several programs may be saved; exactly one is active.
- Switching programs changes the routines shown in Workout and Program.
- The Library is global across every program.
- Duplicating a program creates new program, routine, and entry IDs while reusing master exercise IDs.
- Switching programs never removes old programs or history.

Bottom navigation remains Workout, Program, Library, Log, Settings. Program selection lives inside Workout/Program, not in a new tab.

## Target data model

State remains plain JSON in localStorage:

```js
{
  version,
  programs,
  routines,
  exercises,
  sessions,
  settings
}
```

### Programs and routines

```js
program = {
  id,
  name,
  routineIds
}

routine = {
  id,
  name,
  group,  // gym | home
  status, // required | optional
  entries: [{
    id,
    exerciseId,
    prescription,
    role // main | optional
  }]
}
```

Rules:

- `routineIds` is the only program-to-routine relationship and controls order.
- A routine belongs to exactly one program.
- Main entries determine routine completion.
- Optional entries may be completed but never block routine completion.
- Rehab is an exercise purpose, not automatically an entry role.

Settings gain:

```js
{
  activeProgramId,
  activeRoutineId,
  theme
}
```

Switching programs selects its first routine when the current routine does not belong to it. Remembering a separate last routine for every program is deferred unless actual use needs it.

### Sessions and entry checks

```js
session = {
  routineIds,
  checkedEntryIdsByRoutine,
  note
}
```

- Tapping the number/check control toggles that entry for the date.
- Tapping the row opens the exercise reference.
- Checking every Main entry adds the routine ID to `routineIds`.
- Unchecking a Main entry removes it.
- Optional checks persist but do not affect completion.
- Removing entries/routines cleans their checks.
- Switching programs does not alter sessions.

### Exercises

Controlled vocabularies use stable IDs and friendly labels.

```js
exercise = {
  id,
  name,
  defaultPrescription,
  primaryTargets,
  secondaryTargets,
  movementPattern,
  equipment,
  purpose,
  style,
  laterality,
  support,
  emphases,
  typicalChallenge,
  instructions,
  videoId,
  relatedExercises
}
```

Rules:

- One or two ordered primary targets; item 1 is dominant.
- Primary and secondary targets cannot overlap.
- One movement pattern and one or more equipment values.
- Purpose is Strength, Mobility, or Rehab.
- Style, laterality, support, emphasis, and challenge are optional.
- Uncertain fields remain blank.
- Push, Pull, Legs, Glutes, Core, Arms, Forearms, Neck, and Full body are derived browse groups.
- Prescription, tempo, pauses, and partial range remain routine-entry concerns.

One related-exercise system covers alternatives and progression:

```js
relatedExercises: [
  { exerciseId, relation: "easier" | "similar" | "harder" }
]
```

- Similar is an alternative.
- Easier/Harder form progression.
- Inverse links are maintained in one storage helper.
- Self-links, duplicates, and missing IDs are rejected.
- Deleting an exercise removes incoming links.

## Exercise-data workflow

Classify in the workbook before requiring new fields in the app:

1. Add the approved fields to the existing exercise workbook.
2. Preserve IDs, names, prescriptions, current targets, notes, videos, and alternatives.
3. Classify a representative set: press, pull, squat, hinge, isolation, core, carry, mobility, and rehab.
4. Owner reviews the sample and vocabulary.
5. Classify all 77 exercises.
6. Validate required values, overlap, vocabulary IDs, and related links.
7. Convert the reviewed workbook to seed data.

Do not invent uncertain data or add stabilizers, percentages, joint models, or automatic web classifications.

## UI behavior

### Workout

- Show only routines from the active program.
- Use Ironworks horizontal routine tabs.
- Use Main and Optional sections with continuous numbering.
- Tap number/check to complete; tap row for reference.
- Reference retains prescription, targets, classification, notes, and related exercises.
- Two external actions:
  - Watch linked video or search YouTube.
  - Search alternatives.
- Searches use normal encoded URLs, not an API.
- `Edit exercise` remains explicit and separate from viewing.

### Program

- Compact active-program selector.
- Program management sheet: create empty, duplicate, rename, delete.
- Routine tabs and routine add/edit/delete/reorder.
- Add exercises from the global Library.
- Routine entry editing changes prescription and Main/Optional role only.
- Hold-drag remains the primary reorder interaction.
- Earlier/later buttons remain the accessible fallback.
- Removing an entry never deletes its master exercise.

### Library

- Compact rows: name, prescription, dominant target, movement, and purpose only when useful.
- Search plus quick target chips.
- Primary only or Primary + secondary.
- Normal filters: target, movement, equipment, purpose.
- More filters: style, laterality, emphasis, challenge.
- OR within a filter group; AND across groups.
- Reference opens before editing.
- Master editor separates required classification from optional fields.
- Add, duplicate, edit, and delete remain available.

### Log

- Keep month navigation, date indicators, completions, and notes.
- Past dates can contain routines from inactive programs.
- Existing history remains readable while its program exists.

### Settings

- Keep theme, export, import, restore, and training rules.
- Use Ironworks rows and sheets, not a dashboard.

## Lean code organization

No framework or build step.

### JavaScript

The current `app.js` is 1,530 lines. Split rendering only:

```text
app.js
ui/
├── shared.js
├── workout-program.js
├── library.js
└── log-settings.js
```

- `app.js`: state, navigation, event delegation, dialogs, saves, and drag lifecycle.
- `ui/shared.js`: escaping, icons, and common presentation helpers.
- Other UI files: pure markup/render helpers for their named views.
- `storage.js`: validation, migrations, immutable mutations, import/export.
- `data.js`: controlled vocabularies and seed data.

Do not add classes, a component engine, router, state library, or dependency injection.

### CSS

The current stylesheet is 1,546 lines. Split by ownership:

```text
styles/
├── base.css
├── components.css
└── views.css
```

- `base.css`: fonts, tokens, reset, shell, safe areas, typography, themes.
- `components.css`: buttons, tabs, rows, fields, chips, sheets, dialogs.
- `views.css`: view-specific layout only.

Delete replaced CSS as each screen lands. Do not retain parallel legacy styling.

Self-host and service-worker-cache a few WOFF2 files for Barlow, Barlow Condensed, and IBM Plex Mono. Use `font-display: swap` and system fallbacks. The installed PWA must not rely on Google Fonts.

## Implementation slices

### 0. Stabilize the current baseline

- Re-run checks for the existing uncommitted smooth drag patch.
- Confirm device behavior if still pending.
- Commit it independently before migrations or redesign.

Gate: existing 40 checks, drag, cancel, settle, auto-scroll, tap-to-edit, fallback controls, and reduced motion pass with no schema change.

### 1. Complete missing Ironworks templates

Create separate concepts for:

- Program selector and management.
- Create, duplicate, rename, delete.
- Routine and routine-entry editing.
- Empty program/routine and failed-save states.
- Log and day editor.
- Settings.

Gate: owner approves both themes at 320/393 widths and every product action has a visible path. Existing templates remain untouched.

### 2. Lock contract and fixtures

- Update `docs/PRODUCT.md` with Program → routine → entry meaning.
- Record completion and classification meaning.
- Add representative fixtures: no program, several programs, empty routines, long names, and cross-program history.
- Update handoff truth.

Gate: documentation contains no Program/routine terminology conflict; no production behavior changes.

### 3. Program schema migration

- Add programs and `activeProgramId`.
- Migrate every existing routine into one program.
- Preserve routine IDs, sessions, and import/export.
- Add program CRUD, membership, ordering, and active-selection helpers.

Tests: all supported migrations, malformed data, selection repair, CRUD, duplication IDs, ordering, rollback, import/export, and history while switching.

Gate: current data opens unchanged inside one program; fresh storage verifier finds no data-loss issue.

### 4. Program management

- Implement selector, create empty, duplicate, rename, delete.
- Filter Workout/Program to the active program.
- Preserve historical routines in Log.

Action map before implementation:

| Action | Before Slice 4 | Slice 4 path |
| --- | --- | --- |
| See or switch the active program | No UI path | Compact selector at the top of Workout and Program → choose a saved program |
| Create an empty program | No UI path | Program selector → Add program → Empty |
| Duplicate a program | No UI path | Program selector → Add program → Duplicate, or Edit program → Duplicate |
| Rename a program | No UI path | Program selector → Edit program → Save changes |
| Delete a program | No UI path | Program selector → Edit program → Delete program → confirmation |
| Browse routines | Global routine tabs | Active program's ordered routine tabs only |
| Recover from no programs or an empty program | No Program-specific state | Direct Add program or Add routine action in the relevant empty state |
| Review inactive-program history | Log lists every routine without Program context | Log keeps every saved program's routines and labels their Program |

Gate: switching persists, duplication uses new program/routine/entry IDs, exercise IDs are reused, and empty-program recovery is clear.

### 5. Classify the workbook

- Add approved columns.
- Classify the representative set.
- Owner approves vocabulary.
- Classify and validate all 77.

Outcome:

- `artifacts/exports/Gym App Data.xlsx` contains all 77 classified exercises, the exact controlled lookup lists, and 38 reciprocal related-exercise rows.
- Existing IDs, names, prescriptions, notes/cues, and video IDs are preserved.
- The classification study records the locked vocabulary and workbook role.
- Production app sources and stored-data schema remain unchanged by this slice.

Gate: required data is complete, uncertainty is blank, and no app code changes.

### 6. Exercise schema migration

- Add classification fields and controlled validation.
- Migrate current targets/categories without inventing data.
- Load reviewed seed classifications.
- Add related-link inverse and cleanup helpers.
- Preserve IDs, routine entries, notes, videos, and prescriptions.

Reviewed built-ins must be complete. A legacy custom exercise may load with blank new fields; new or edited exercises must complete essential fields.

Outcome:

- Stored-data schema 7 uses stable classification IDs with friendly rendered labels.
- All 77 reviewed built-ins load the workbook classification; 38 directed reciprocal related-exercise links are seeded.
- Backward migrations from versions 1–6 preserve stable IDs, routine references, prescriptions, notes/cues, videos, programs, and history.
- Exact legacy custom targets migrate only when they map without ambiguity; uncertain new classification stays blank instead of being guessed.
- Strict validation enforces controlled values, target ordering/exclusion, complete reviewed built-ins, and valid reciprocal relationships.
- One storage helper maintains Easier/Harder inverses and Similar reciprocity; exercise deletion removes incoming links.
- The existing Library, reference sheet, filters, and editor have only the compatibility UI needed to read and maintain schema 7. The full Ironworks classification UI remains Slice 11.
- Offline production assets are synchronized at cache 28.

Gate: migration, target ordering/exclusion, vocabularies, related links, deletion, rollback, import/export, and reload tests pass; fresh storage verifier passes.

### 6.5 Stabilize the verified foundation

- Give every default routine seed explicit stable entry and master-exercise IDs; never derive identity from display text or list position.
- Reconcile the Slice 7 role migration with the product contract.
- Require one fresh bounded verifier after every slice.
- Separate behavior-neutral code organization from the Ironworks visual foundation.
- Correct handoff and source-of-truth wording before the next schema change.

Gate: changing seed display text or order cannot change exercise or entry IDs; all existing checks pass; a fresh verifier finds no plan, architecture, data, UI, or offline regression. Create one checkpoint commit before Slice 7.

### 7. Entry roles and completion migration

- Add Main/Optional roles.
- Seed existing entries as Main. Only an explicit owner-reviewed entry-ID map may start selected entries as Optional; never infer entry role from exercise purpose.
- Add dated entry checks and derived routine completion.
- Preserve existing routine-level completions.
- Put entry-check toggles, Log completion changes, role/check reconciliation, and deletion cleanup behind atomic storage helpers.
- Clean checks when an entry, exercise, routine, or program is removed. Role changes must not rewrite past completion.

Gate: checks survive reload/date changes; Optional-only and empty routines do not auto-complete; Log mark/unmark stays synchronized; removals clean checks; role changes do not rewrite history; old history remains; import/export and failed writes stay safe; fresh storage verifier passes.

### 8A. Behavior-neutral code organization

- Extract the approved few plain render modules from `app.js`.
- Split the existing stylesheet into base, components, and views by ownership.
- Preserve current markup, behavior, visuals, data, cache behavior, and action paths.
- Add no framework, component runtime, classes, router, state library, or production dependency.

Gate: the diff is mechanical and behavior-neutral; existing automated, runtime, phone-width, theme, drag, dialog, and offline checks remain at parity; a fresh verifier passes.

### 8B. Ironworks foundation

- Self-host fonts.
- Implement tokens, themes, shell, nav, tabs, rows, fields, chips, sheets, and buttons.
- Add every new source/font asset to the service-worker list.
- Update architecture documentation when the split lands.

Gate: shared controls match templates in both themes at 320×700 and 393×852; scrolling, focus, reduced motion, safe areas, and offline fonts work; a fresh verifier passes.

### 9. Workout

- Implement active-program tabs, Main/Optional rows, checks, video, reference, related exercises, notes, and editor path.

Gate: Main completion semantics work, today’s checks survive reload, long routines scroll, no accidental editing, and target-iPhone verification passes.

### 10. Program

- Implement accepted program/routine management UI.
- Integrate entry editor, Library search, hold-drag, fallback controls, and removal.

Gate: drag behavior survives new markup, entry/master editing remain distinct, failures are visible, runtime/device checks pass, and a fresh UI verifier passes.

### 11. Library

- Implement compact rows, search, combined filters, reference, master editor, related editor, duplicate, and delete.

Gate: filters obey OR-within/AND-across, routine execution stays out of the master editor, deletion warns about affected entries, and a fresh UI verifier passes.

### 12. Log and Settings

- Apply Ironworks to calendar/day editor and Settings.
- Keep cross-program history, notes, theme, export/import, restore, and rules.

Gate: no history or data-portability regression; both views match the accepted system.

### 13. Consolidate and release

- Remove superseded markup, CSS, helpers, and compatibility branches.
- Review module/component ownership.
- Update service-worker cache/version and all current docs.
- Run full automated, runtime, offline, and import/export checks.
- Run a fresh final verifier.
- Owner verifies Safari and installed PWA.
- Commit and push after acceptance.

Gate: no legacy UI path remains, every product action is reachable, all checks pass, and device verification is confirmed.

## Verification cadence

After JavaScript/schema changes:

```bash
node -e 'import("node:fs").then(f=>{JSON.parse(f.readFileSync("manifest.json","utf8"));console.log("manifest ok")})'
npm run check
git diff --check
```

After UI changes:

- 320 × 700 and 393 × 852.
- Dark and light.
- Long-list and sheet scrolling.
- Focus, safe areas, reduced motion.
- Empty, populated, and failed-save states.

After migrations:

- Save/reload.
- Every supported prior version.
- Export/import.
- Delete/cleanup.
- Failed-write rollback.
- Stable IDs and history.

Review gates:

- Run one fresh bounded verifier after every slice before owner assessment or the next slice.
- Focus storage verifiers on migrations/invariants after Slices 3, 6, and 7.
- Focus UI verifiers on action reachability and phone behavior after Slices 8B, 9, 10, 11, and 12.
- Run a fresh comprehensive final verifier before release.
- Target-iPhone checks after Workout, Program drag integration, and before release.

## Explicit exclusions

- Backend, account, cloud sync, analytics.
- Framework, bundler, TypeScript conversion, CSS framework.
- Automatic programming, scheduling engine, or recommendations.
- Stabilizers, percentages, joint-angle models, or web-generated classification.
- Generic variant-property engine.
- Social features, streaks, gamification, dense analytics.
- Unreproduced service-worker lifecycle edge cases.

## Definition of done

- Several programs can be saved with one active.
- The current routines migrate into one program.
- All 77 exercises use the approved classification.
- All five views match Ironworks while preserving required actions.
- Video, notes, related exercises, prescriptions, drag reorder, themes, history, import/export, and offline behavior work.
- Automated, runtime, verifier, and target-iPhone checks pass.

No production implementation begins until the owner confirms this plan.
