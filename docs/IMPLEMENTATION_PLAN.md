# Ironworks Implementation Plan

Status: Slice 11 proposed; awaiting owner approval
Current checkpoint: Slices 7–10 owner verified
Next decision: approve the detailed Library slice boundaries before implementation

## Goal

Finish the owner-approved Ironworks interface without changing the product hierarchy or introducing unnecessary architecture. The durable behavior contract lives in `PRODUCT.md`; the work method and verification gates live in `WORKFLOW.md`.

## Approved sources

- `references/ui-concepts/ironworks.html`: Workout density and base component direction.
- `references/ui-concepts/ironworks-classification.html`: Library, filters, reference, relationships, and master editor.
- `references/ui-concepts/ironworks-program.html`: Program management.
- `references/ui-concepts/ironworks-log-settings.html`: Log, day editor, Settings, and failure states.
- `references/ui-concepts/ironworks-flows.css`: shared reference-only Program and Log/Settings styles.
- `references/exercise-classification-study.md`: approved classification vocabulary.

Production should reproduce the approved dark-first charcoal/bone system, cobalt state/action color, compact rows, focused sheets, and self-hosted typography at 320 px and 393 px. `PRODUCT.md` overrides older terminology preserved in a reference.

## Architecture boundary

- Build-free vanilla HTML, CSS, and JavaScript.
- `app.js` coordinates state, navigation, events, dialogs, saves, and drag behavior.
- `ui/` contains pure view markup helpers.
- `storage.js` owns current-schema validation, mutations, and current-format import/export.
- `data.js` owns controlled vocabularies and seed data.
- `styles.css` imports base, reusable components, then view-specific styles.
- Do not add a framework, bundler, router, generic controller layer, backend, account, sync, analytics, or production dependency.
- Do not split `app.js` for line count alone. Reassess ownership during final consolidation after the remaining views exist.
- Pre-release data from older schemas is disposable. Do not add backward migrations unless the owner explicitly asks.

## Completed checkpoint

The Ironworks foundation, Workout execution, reference/video flows, Program management, Library picker, routine-entry editor, and grouped role-scoped reorder are complete through Slice 10. Exact revision, schema/cache, and verification truth belong in `HANDOFF_STATUS.md`; detailed history belongs in Git.

## Remaining sequence

Each implementation slice stops after complete repository/runtime checks, a fresh bounded verifier, and owner assessment.

1. **Slice 11A — Library browse and filters**
2. **Slice 11B — Master exercise editor**
3. **Slice 11C — Relationships and deletion**
4. **Slice 12A — Log and day editor**
5. **Slice 12B — Settings and current-format data portability**
6. **Slice 13 — Consolidate and release**

## Slice 11 design brief

### Outcome

Reproduce the approved Library, filter sheet, and master-editor surfaces from `ironworks-classification.html`. This is a production-ready phone flow for one owner maintaining about 77 reusable exercises, not a dashboard or database administration screen.

The primary action is finding the right master exercise quickly and opening its completed reference before deliberately choosing to edit. The visual lane is the existing restrained Ironworks system: dark-first in a gym environment, compact typography and rows, cobalt only for selection and primary actions, and the same light theme already used elsewhere.

### Fixed interaction model

- The Library page scrolls inside the existing app shell; the search and filter controls remain at the top of its content.
- A row always opens the completed exercise reference from Slice 9B. It never enters edit mode directly.
- Search and quick target chips apply immediately.
- The filter sheet edits a draft. Closing cancels it; `Clear` resets the draft; `Show N exercises` applies it.
- Filter groups use OR within a group and AND across groups. Target matching defaults to `Primary only`; `Primary + secondary` deliberately broadens it.
- Filter state is temporary UI state. It is not stored in schema 8.
- The master editor is a full-height focused sheet with a fixed save footer. Its fields edit the global master exercise only.
- Routine-specific prescription, role, tempo, pauses, and execution choices remain in Program entries.
- Current exercise references, video/search behavior, programs, routines, checks, sessions, and schema 8 remain unchanged.

### Library action map

| Product action | Current path | Final Slice 11 path |
| --- | --- | --- |
| Browse the Library | Generic result count, search/filter row, dense metadata rows | Ironworks app bar, search, quick targets, scope/result line, and compact rows |
| Search by name, target, or movement | `Search exercises` field | `Exercise, target, or movement` search field |
| Use a common target group | No direct path | Horizontal `All`, Chest, Back, Shoulders, Glutes, and other result-bearing derived target chips |
| Choose target scope | Inside the current small filter dialog | Result-line scope control and the filter-sheet segment |
| Combine filters | One target and one purpose select | Draft filter sheet for targets, movement, equipment, purpose, and progressive optional facets |
| Open details | Library row | Same row action, using the completed Ironworks reference |
| Add a master exercise | Text `Add exercise` button | 44 px plus action in the Library app bar |
| Edit a master exercise | Reference footer | Full-height Ironworks master editor |
| Duplicate a master exercise | Current editor footer button | Deliberate action inside the master editor |
| Maintain relationships | Checkbox picker that can only add Similar links | Searchable relationship editor with Easier, Similar, and Harder choices |
| Delete a master exercise | Current editor footer button and confirmation | Deliberate danger action with the exact affected routine-entry count |

### Architecture

- Keep `app.js` as coordinator for Library/filter/editor draft state, dialog transitions, focus, and saves.
- Keep pure filtering, result summaries, rows, and dynamic picker markup in `ui/library.js`.
- Add the small derived browse-group mapping to `data.js`; do not store derived groups on exercises.
- Keep static sheet/form shells in `index.html`.
- Add one tested `storage.js` upsert helper so add/edit/duplicate plus reciprocal relationships save atomically. Existing deletion cleanup remains the storage boundary.
- Use one small classification-option picker for controlled multi-value fields only where inline check grids would make the phone editor excessively long. Do not create a generic form engine.
- Add no module, dependency, router, schema change, migration, or app-wide refactor.

### Shared verification gate

Every 11 sub-slice receives one production cache bump and stops after:

- Focused tests plus the full manifest, cache, syntax, and dependency-free check suite.
- Runtime checks at 320 × 700 and 393 × 852 in both themes.
- Long-list and independent-sheet scrolling, safe areas, keyboard/focus return, 44 px targets, empty states, reduced motion where applicable, and browser-error monitoring.
- Offline startup with all changed assets.
- A fresh bounded verifier, then owner assessment before the next sub-slice.

### 11A. Library browse and filters

**Goal:** reproduce the approved Library page and filter sheet without changing stored exercises or the completed reference/editor flows.

**Visible result:**

- App bar shows `Library`, the current result count, and a 44 px add icon.
- Search uses the approved placeholder and stays separate from filters.
- A horizontal quick-target strip provides `All` plus useful derived groups that currently contain exercises. Selecting one replaces the active target selection; detailed filters may select several exact targets.
- The filter button shows a compact badge counting active filter groups, not individual selected chips. Default `Primary only` does not count; deliberately broadening to `Primary + secondary` does.
- The result line shows `N exercises` and a direct target-scope control.
- Rows show name, default prescription, ordered primary targets, and one decision-useful context value. Strength rows use movement; Mobility/Rehab rows use purpose. Full classification stays in the reference.
- Empty Library and no-results states are distinct. Both keep Add exercise reachable; no-results also offers Clear filters.

**Filter sheet:**

- Draft target scope segment: Primary only or Primary + secondary.
- Multi-select groups: targets, movement, equipment, and purpose.
- One collapsed `More filters` area: style, laterality, emphasis, and typical challenge.
- The footer contains `Clear` and a live `Show N exercises` action.
- Closing without applying leaves the active results unchanged.

**Data and logic:**

- Derived quick groups are pure mappings over controlled target/movement IDs.
- Search must match name, target, or movement; retaining the existing additional classification matches is acceptable.
- OR applies within every selected group; AND applies across populated groups and the query.
- Equipment matching means any selected equipment value.
- Filter state survives Library rerenders during the current app session but is neither persisted nor exported.

**Acceptance:**

- Primary-only and combined target results are visibly and logically different.
- Query, quick groups, exact targets, movement, equipment, purpose, and optional facets compose correctly.
- Active counts, result counts, clear/cancel/apply behavior, long controlled-value lists, and no-result recovery are correct.
- Every row opens the existing reference; no row edits directly.

**Out of scope:** editor redesign, relationship editing, exercise mutation, storage/schema changes, or changes to the completed reference.

### 11B. Master exercise editor

**Goal:** reproduce the approved full-height master editor and make all existing schema-8 master fields maintainable through one atomic save path.

**Editor structure:**

- Add, Edit, and Duplicate modes have explicit titles and share the same field order.
- Name and default prescription lead.
- Ordered primary targets show the dominant target first and support an optional second primary target.
- Secondary involvement is clearly separate and excludes selected primary targets.
- Movement, equipment, and purpose complete the essential section.
- `Optional classification` progressively reveals style, laterality, support, emphasis, and typical challenge. Blank means not classified.
- Reference fields contain the optional YouTube link/ID and stable notes/cues.
- A short note states that routine execution stays in Program.
- The fixed footer contains the primary `Save exercise` action. Duplicate and delete remain deliberate secondary actions, not competing primary buttons.

**Controlled-value interaction:**

- Use familiar native selects for single-value fields where they remain compact.
- Use one focused option-picker sheet for secondary targets, equipment, and emphasis rather than permanent checkbox grids.
- The picker supports clear selection, selected summaries, primary/secondary exclusion, cancel, and done with focus return.
- No generic schema-driven form renderer is introduced.

**Storage boundary:**

- Add one pure `upsertExerciseInState` helper that adds or replaces a master exercise and reconciles its relationship draft atomically.
- Editing preserves the exercise ID and every routine reference.
- Duplicating creates one fresh master ID, copies classification/reference/relationships, appends `copy` to the editable name, and creates no routine entries.
- Failed validation or storage writes leave the prior state and open editor intact with a visible error.

**Acceptance:**

- Name uniqueness, required primary target, movement, equipment, purpose, target exclusion, and YouTube parsing remain enforced.
- Every optional schema-8 field can be set and cleared.
- Add, edit, and duplicate survive save/reload/export/current-format import.
- Existing relationship values remain unchanged unless deliberately edited.
- Routine-entry prescriptions and roles never appear in or change through this editor.

**Out of scope:** relationship-picker redesign, deletion behavior changes, schema changes, old-version compatibility, or reference redesign.

### 11C. Relationships and deletion

**Goal:** finish master-data maintenance with a clear relationship editor and trustworthy destructive flow.

**Relationship editor:**

- Opens from the master editor and searches all other master exercises by name or classification.
- Existing links appear first. Each link has one explicit Easier, Similar, or Harder value relative to the exercise being edited and a remove action.
- Adding a result creates a Similar draft by default; the owner may change it before saving.
- Self-links, duplicate links, and missing exercise IDs remain impossible.
- `Done` updates only the unsaved exercise draft. Closing cancels relationship-sheet changes; saving the master exercise atomically applies reciprocal inverse links.

**Deletion:**

- Delete remains inside Edit mode only.
- Confirmation names the exercise and exact number of affected routine entries, and states that those entries and their saved checks will be removed.
- The storage helper removes the master exercise, every routine entry that references it, associated entry checks, and incoming relationships while preserving unrelated history and exercises.
- Failure leaves the editor and all stored data unchanged with a visible error.

**Acceptance:**

- Easier/Harder inversion and Similar reciprocity survive save, reload, export, and current-format import.
- Changing or removing a relationship updates both sides exactly once.
- Duplicate mode cannot accidentally modify the source exercise.
- Delete with zero, one, or several routine references reports truthfully and cleans only the intended data.
- Reference rows immediately reflect saved relationship changes.

**Out of scope:** automatic alternatives, progression recommendations, relationship families, exercise percentages, Program changes, or a schema change.

Slice 13 removes confirmed superseded markup, CSS, helpers, old-schema compatibility branches, and their tests. It also reviews module ownership, synchronizes cache/version references, and performs the complete automated, runtime, offline, current-format import/export, and fresh-verifier pass.

Release only after the owner confirms Safari and installed-PWA behavior on the target iPhone.

## Explicit exclusions

- Backend, accounts, cloud sync, analytics, or internet-facing security work.
- Framework, bundler, TypeScript conversion, CSS framework, or generic component engine.
- Automatic programming, recommendations, scheduling engine, or dense analytics.
- Biomechanics percentages, stabilizer databases, joint models, or web-generated classification.
- Social features, streaks, gamification, or decorative dashboard content.
- Unreproduced service-worker lifecycle edge cases.
