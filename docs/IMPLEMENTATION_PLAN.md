# Ironworks Implementation Plan

Status: Slices 7–11D owner/device verified and released; Slices 12A–12B planned and deliberately deferred; Slice 13 repository/runtime and fresh-verifier gates complete with device verification pending
Current checkpoint: Local schema 9/cache 46 current-state consolidation and retrospective hardening
Next action: publish cache 46 for owner device verification

## Goal

Deliver the owner-approved Ironworks interface in bounded slices without changing the product hierarchy or introducing unnecessary architecture. The current-scope release completes the accepted Workout, Program, and Library work through Slice 11D while preserving the functional Log/Settings foundation; the fully specified Ironworks Log/Settings work remains deliberately deferred. The durable behavior contract lives in `PRODUCT.md`; the work method and verification gates live in `WORKFLOW.md`.

## Approved sources

- `references/ui-concepts/ironworks.html`: Workout density and base component direction.
- `references/ui-concepts/ironworks-classification.html`: Library, filters, reference, relationships, and master editor.
- `references/ui-concepts/ironworks-program.html`: Program management.
- `references/ui-concepts/ironworks-log-settings.html`: Log, day editor, Settings, and failure states.
- `references/ui-concepts/ironworks-pplppl7.html`: approved PPLPPL 7 blocks, embedded Optional slot, programmed choices, scoped notes, Home Base, and editor extensions.
- `references/ui-concepts/ironworks-flows.css`: shared reference-only Program and Log/Settings styles.
- `references/exercise-classification-study.md`: approved classification vocabulary.
- `references/pplppl7-data-study.md`: approved replacement-program identity, naming, note, routine-block, programmed-choice, and evidence contract.

Production should reproduce the approved dark-first charcoal/bone system, cobalt state/action color, compact rows, focused sheets, and self-hosted typography at 320 px and 393 px. For PPLPPL 7 flows, reproduce `references/ui-concepts/ironworks-pplppl7.html` rather than inventing a parallel presentation. `PRODUCT.md` and the reviewed content manifest override stale illustrative copy preserved inside a reference.

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
- Schema 9 already introduced master aliases, scoped notes, routine blocks, and programmed entry choices in one deliberate development reset. Later UI slices use that shape without a migration ladder.

## Completed checkpoint

The Ironworks foundation, Workout execution, reference/video flows, Program management, blocks, scoped notes, programmed choices, Library browse/editing/relationships, and the reviewed PPLPPL 7 seed are complete through Slice 11D. Exact revision, schema/cache, and verification truth belong in `HANDOFF_STATUS.md`; detailed history belongs in Git.

## Current and remaining sequence

Each implementation slice stops after complete repository/runtime checks, a fresh bounded verifier, and owner assessment.

1. **Slice 10G — Routine blocks and scoped notes** — owner/device verified
2. **Slice 10H — Programmed exercise choices** — owner/device verified
3. **Slice 11A — Library browse and filters** — owner/device verified
4. **Slice 11B — Master exercise editor** — owner/device verified
5. **Slice 11C — Relationships and deletion** — owner/device verified
6. **Slice 11D — Replacement Library and program seed** — owner/device verified and released
7. **Slice 12A — Log and day editor** — implementation-ready specification; deliberately deferred
8. **Slice 12B — Settings and current-format data portability** — implementation-ready specification; deliberately deferred
9. **Slice 13 — Current-state consolidation and release** — repository/runtime and fresh-verifier gates complete; device verification pending

Deferring Slice 12 leaves the current functional Log, day editor, Settings, theme, export/import, restore, and training-rule paths in production. Slice 13 may consolidate and release that accepted current scope, but it does not certify the deferred Ironworks Log/Settings presentation as complete. If Slice 12 resumes later, its implementation and release gates run after the current Slice 13 checkpoint.

## Replacement-program design brief

### Outcome

Install the owner-provided `PPLPPL 7 — Glute Specialization` as the main reviewed program while keeping one non-redundant global Library. Preserve the source’s named blocks, order, Main/Optional meaning, programmed choices, bracketed instructions, capitalization, punctuation, prescriptions, and notes without turning contextual overlap into fake classification.

PPLPPL 7 is one program, not the product architecture or app identity. Gym Schedule remains program-agnostic: future programs use the same editors, routine-entry model, and global Library without a new schema or program-specific code.

The phone interface remains the approved restrained Ironworks system. New information is shown through compact typographic hierarchy and plain-text notes, not cards, dashboards, badges grids, or a scheduling engine.

### Fixed ownership

- Master exercise: canonical name, aliases, classification, stable cues, video, and global relationships.
- Program: weekly layout and rules shared by several routines.
- Routine: name, Gym/Home, Required/Optional status, routine note, and ordered blocks.
- Routine block: stable ID, editable name, and position inside one routine.
- Routine entry: ordered programmed choices with per-choice prescriptions, Main/Optional role, block, and programming note. The first choice is preferred.
- Session: completion and checks only. Notes, blocks, and exercise choices do not create a second history model.

`routine.entries` remains the only entry-order source. A block owns no entry-ID list; `entry.blockId` supplies membership, and rendering walks ordered blocks while preserving the order of matching entries in `routine.entries`.

The content manifest was reviewed in 10E-A through 10E-D. The complete schema shape was introduced once in 10F; later slices activate its UI and content without additional schema bumps.

### Implementation ownership

- `storage.js` owns validation, ID remapping, atomic save/delete behavior, and cleanup for blocks and programmed choices.
- `data.js` owns controlled vocabularies and, in 11D, the independent canonical Library/program seed.
- Existing `ui/workout.js`, `ui/program.js`, and `ui/exercise-reference.js` own pure markup for blocks, note previews, and choice presentation.
- `app.js` coordinates transient editor/sheet state, events, focus, and calls into storage; it does not duplicate schema mutation rules or absorb large markup templates.
- Tests exercise storage rules and pure render/filter behavior outside the DOM where practical. Do not add a generic model layer, form engine, or new module merely to reduce line counts.

### Ordering and visibility

- Block order preserves the written source. Entry order is preserved inside each block.
- Role remains completion metadata and never silently moves an entry. Optional entries may remain at the exact source position.
- A block containing only Optional entries shows one clear Optional cue in its heading. A mixed block labels the individual Optional row.
- Numbering remains continuous through the displayed routine order.
- Drag and Earlier/Later operate only within the current block. Block or role changes are deliberate editor actions.
- Entries with programming notes show a restrained one- or two-line preview in Workout and Program. Full text appears under `For this routine` in the reference and in the entry editor.
- Master notes remain separately labelled `Exercise notes`.

### Approved PPLPPL 7 visual contract

The new concept extends production Ironworks; it does not reopen the shell, navigation, palette, typography, or established row design.

- Workout uses the production program bar, routine tabs, numbered check control, row/reference action, and separate video action.
- Routine blocks are compact typographic dividers, not cards. They preserve source order and continuous numbering.
- A mixed block leaves an Optional entry in place and adds a plain text `Optional` cue on that row.
- Entry notes add at most two muted lines only where they exist. Full text appears under `For this routine` in the shared reference.
- Home Base pins its short choice-menu explanation under the routine tabs, then renders seven scrollable blocks with one Optional cue per block.
- A multi-choice slot retains one numbered check. Its sheet pairs each canonical choice with its own prescription, reference path, and separate video action.
- Program extends its current sheets with program/routine notes, block management, Role, block assignment, programming note, and ordered choices.
- Weekly rules live behind one compact Program disclosure and are not repeated in Workout.

Displayed numbers are derived from current visible order, not stored source labels. The Legs B Optional quad slot therefore becomes display position 4, and the later source rows shift by one. This is intentional: raw source numbers remain audit metadata in the tracked manifest and workbook view.

Before the concept becomes production truth, apply these behavior-preserving corrections:

- Replace all illustrative `New 6` copy with the reviewed `Also programmed in` or `Related work elsewhere` wording from the data study.
- Use canonical derived choice names; shorthand such as `Cable or side-lying external rotation` is not final manifest text.
- Give tabs, close buttons, grips, choice controls, and editor actions at least 44 × 44 CSS-pixel hit areas without enlarging the visual chrome unnecessarily.
- In an Exercise Choices sheet, reference and video are separate actions. Do not put both meanings inside one button.
- Choice ordering must support exact Earlier/Later movement as well as making a choice preferred. Block ordering keeps its existing accessible fallback.
- Block management must support the template’s hold-drag interaction plus Earlier/Later fallback. It must preserve block membership, avoid text selection, split hold from scrolling, and retain 44 px targets at both supported widths.
- The Bulgarian-split-squat/reverse-lunge alternative is a programmed choice. The 45° glute-biased back-extension rotation remains a note-only instruction on Romanian deadlift; do not add a second choice or invent a prescription.
- Verify the approved layouts in both themes. The concept author reported dark-theme checks at both widths; production still requires the full light/dark gate.

### Prospective product-action map

`PRODUCT.md` remains the contract for the app that exists today. Each behavior slice must update the affected rows below in `PRODUCT.md` before its implementation is called complete.

| User action | Current path | Planned path |
| --- | --- | --- |
| Read shared program rules | One compact disclosure in Program; routine-specific views are not cluttered with repeated weekly rules | Unchanged |
| Follow written routine structure | Named blocks and entries remain in stored order; Optional is stated without moving the row | Unchanged |
| Mark work complete | Check one master-backed entry | Check one routine slot, regardless of how many programmed choices it offers |
| Open exercise guidance | One-choice row opens its master reference with the shared routine-entry note kept separate from master notes | One-choice row remains direct; multi-choice row first opens `Exercise choices`; a selected choice opens that master with its choice prescription and shared entry note |
| Watch a video | Row uses its single master link/search | One-choice video is unchanged; a multi-choice row’s trailing video uses the preferred choice, while the sheet exposes a separate video action for every choice |
| Reorder an entry | Hold-drag or Earlier/Later within one routine block; Main and Optional can cross without changing role | Unchanged |
| Edit routine programming | Entry editor changes prescription, Role, block, and note | Add ordered exercise/prescription choices |
| Compare global exercises | Easier/Similar/Harder in the reference | Easier/Alternative/Harder; stored `similar` remains reciprocal |
| Delete a master | Referencing entries are deleted | That choice is removed; the next choice becomes preferred, and the slot/checks are deleted only when no choice remains |

### Durable content workflow

- `references/source-material/pplppl7-glute-specialization.txt` is the tracked verbatim owner source.
- `references/data/pplppl7-manifest.json` is the tracked normalized review result and later seed input.
- The old ignored `artifacts/exports/Gym App Data.xlsx` is unused and is never an implementation input. Generate a fresh workbook from the manifest only if the owner asks for one.
- The manifest catalog is the reviewed deduplicated union of the owner source and the Stage-A inventory of the existing 77 masters. Every prior master is retained, cleanly renamed, merged, split, or retired; obsolete compound records and redundant placeholders do not survive merely because they existed.
- Stage-A `currentMasters` records lineage only. Runtime receives one canonical master catalog, not current/new/workbook stores.

### Completed content review (10E-A–10E-D)

The source inventory, canonical identities, program/editorial mapping, classifications, relationships, and bounded external expansion are owner-approved. Their durable truth is the tracked raw source, validated manifest, two reference studies, and Git history—not a repeated completed-slice diary here.

Do not reopen those decisions unless the owner changes the program or records a confirmed content issue.

### 10F. Replacement-program data contract

**Status:** Owner/device verified. Schema 9 and cache 38 implement this contract with schema-shaped development defaults.

**Goal:** define and test the complete current development shape before adding new UI or source content.

**Shape:**

- Master exercises gain optional unique aliases.
- Programs gain a plain-text note.
- Routines gain a plain-text note and at least one ordered block `{ id, name }`; an untitled block is valid.
- Entries replace singular `exerciseId` and `prescription` with one ordered non-empty `choices` list of `{ exerciseId, prescription }`, plus `blockId` and a plain-text programming note. The first choice is preferred; no legacy singular fields remain as parallel truth.
- Stable IDs and current-format export/import remain. Older schemas and old import formats are disposable.

**Storage rules:**

- Program duplication creates fresh program, routine, block, and entry IDs while reusing canonical master IDs.
- Every entry block resolves inside its routine; choice exercise IDs resolve to unique masters inside the slot and every choice has its own valid routine prescription.
- `routine.entries` remains the only entry-order source. Blocks contain no entry IDs, and block assignment never rewrites a second ordering structure.
- Exercise deletion removes matching choices. If the first choice is deleted, the next item becomes preferred; remove the entry and its checks only when no choice remains.
- Removing a block is allowed only when empty. Removing a routine/program keeps the established history cleanup.
- Notes are safe plain text and preserve line breaks. They never affect completion.

**Acceptance:**

- Validation rejects case/punctuation-normalized canonical-name or alias collisions across the Library, dangling blocks, duplicate/missing choices, and malformed notes.
- Duplicate, delete, save/reload, reset, current-format export/import, and failed-write rollback cover the new fields.
- Every existing singular-entry reader, renderer, picker, editor, reorder helper, deletion path, completion calculation, fixture, and import/export path is adapted in this slice. One-choice entries preserve the current UI through their first choice.
- Representative fixtures cover one untitled block, several named blocks, a mixed Main/Optional block, a multi-choice entry with unequal prescriptions, and the long Home Base shape before UI slices begin.
- Existing production UI remains truthful after the development reset with empty notes, one untitled block, and one choice per entry.
- This slice performs the first deliberate development reset to schema-shaped current defaults for UI work. Slice 11D performs the second deliberate reset when `Restore starting data` installs the final approved seed. Neither requires a backward migration.

**Out of scope:** UI redesign, source-program import, classification expansion, or relationship inference.

### 10G. Routine blocks and scoped notes

**Status:** owner/device verified after repository/runtime verification with cache 39 and 71 passing checks.

**Goal:** make the new structure readable and editable in Workout, Program, entry references, and existing management sheets.

**Visible behavior:**

- Workout and Program render named blocks in their stored order.
- Role is visibly distinct from block. Rename the current entry-editor `Section` label to `Role`, then add a separate `Routine block` field.
- Program shows its shared weekly rules in one compact disclosure; Workout does not repeat those rules above every routine.
- Routine notes appear in a compact disclosure below routine navigation. Home Base must pin its short choice-menu note below the routine tabs and outside the long-list scroller.
- Entry-note previews appear only when an actionable local note exists; they do not make unaffected rows taller.
- The reference shows the exact full entry note in `For this routine`, separate from global exercise notes.

**Authoring:**

- Program editor maintains the program note.
- Routine editor maintains the routine note and opens block management.
- Block management supports add, rename, hold-drag reorder, Earlier/Later fallback, and delete-empty.
- Every routine always retains at least one block.
- Add-exercise actions are block-scoped. Entry editor changes block, role, prescription, and programming note.
- Drag and Earlier/Later stay within the current block. Changing block or role never happens as a drag side effect.

**Acceptance:**

- Untitled, empty, long-name, Main-only, Optional-only, mixed-role, and several-block routines render correctly.
- Optional rows preserve their written position and never block Main completion.
- Note-only edits do not alter checks or history.
- Hold-drag block reordering does not select text, preserves membership, separates hold from scrolling, and has 44 px targets. Long notes, long blocks, failed saves, focus return, and long-list scrolling pass at both phone widths and themes.
- Existing tap/reference/video actions remain distinct.

**Out of scope:** programmed alternative UI, new Library content, relationship changes, or scheduling.

### 10H. Programmed exercise choices

**Status:** owner/device verified after repository/runtime verification with cache 40 and 72 passing checks.

**Goal:** represent source lines such as `leg press or Smith squat` as one routine slot referencing several canonical Library masters.

**Interaction:**

- The first exercise is preferred; the remaining programmed choices follow in reviewed order.
- Row titles are derived from current canonical names joined by lowercase `or`.
- When all choices share a prescription, the row shows it once. When prescriptions differ, the row preserves their order and the choice sheet pairs each exercise with its prescription.
- Number/check completes the routine slot, not an individual master.
- A one-choice row keeps the existing direct reference and video behavior.
- A multi-choice row body opens a compact `Exercise choices` sheet. Its trailing video action opens/searches the preferred choice directly. Each sheet choice has a separate reference action and video action; its reference receives that choice’s prescription plus the shared routine-entry note.
- Reference and video remain separate 44 px actions inside the choice sheet.
- Choice editing preserves the concept’s compact list but provides exact Earlier/Later ordering; the first item is preferred.
- Routine-entry notes retain instructions such as `Alternatively`, `Rotate with`, and `Do not perform both`.
- A failed choice save keeps the sheet open with its complete draft order, prescriptions, and visible error; stored choices and saved checks remain unchanged.

**Acceptance:**

- Renaming a master updates every derived choice title without rewriting routine data.
- No exercise ID appears twice in one slot and no choice has a missing prescription.
- Removing a non-first choice preserves the slot. Deleting the first choice promotes the next item; deleting the final choice removes only that slot and its checks.
- Program duplication preserves choice order while generating fresh entry IDs.
- Search, focus, long choice names, one/many/empty-choice failure states, reload, offline startup, and current-format round trips pass.

**Out of scope:** recording which choice was performed, automatic choice rotation, recommendation logic, or global relationship editing.

## Slice 11 design brief

### Outcome

Reproduce the approved Library, filter sheet, and master-editor surfaces from `references/ui-concepts/ironworks-classification.html`. This is a production-ready phone flow for one owner maintaining a reviewed and expanding reusable catalog, not a dashboard or database administration screen.

The primary action is finding the right master exercise quickly and opening its completed reference before deliberately choosing to edit. The visual lane is the existing restrained Ironworks system: dark-first in a gym environment, compact typography and rows, cobalt only for selection and primary actions, and the same light theme already used elsewhere.

### Fixed interaction model

- The Library page scrolls inside the existing app shell; the search and filter controls remain at the top of its content.
- A row always opens the completed exercise reference from Slice 9B. It never enters edit mode directly.
- Search and quick target chips apply immediately.
- The filter sheet edits a draft. Closing cancels it; `Clear` resets the draft; `Show N exercises` applies it.
- Filter groups use OR within a group and AND across groups. Target matching defaults to `Primary only`; `Primary + secondary` deliberately broadens it.
- Filter state is temporary UI state. It is not stored or exported.
- The master editor is a full-height focused sheet with a fixed save footer. Its fields edit the global master exercise only.
- Routine-specific prescription, role, tempo, pauses, and execution choices remain in Program entries.
- Current exercise references, video/search behavior, programs, routines, checks, sessions, and the 10F data shape remain unchanged.

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
| Maintain relationships | Checkbox picker that can only add Similar links | Searchable relationship editor with Easier, Alternative, and Harder choices |
| Delete a master exercise | Current editor footer button and confirmation | Deliberate danger action with an exact programmed-use and cleanup summary |

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

**Status:** owner/device verified after repository/runtime verification with cache 41 and 72 passing checks.

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
- Search must match canonical name, aliases, target, or movement and ignore harmless punctuation differences; retaining the existing additional classification matches is acceptable.
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

**Status:** owner/device verified after repository/runtime verification with cache 42 and 74 passing checks.

**Goal:** reproduce the approved full-height master editor and make all current master fields maintainable through one atomic save path.

**Editor structure:**

- Add, Edit, and Duplicate modes have explicit titles and share the same field order.
- Canonical name, optional aliases, and default prescription lead.
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

- Canonical-name and alias uniqueness, required primary target, movement, equipment, purpose, target exclusion, and YouTube parsing remain enforced.
- Every optional current-schema field can be set and cleared.
- The minimal reviewed vocabulary adds broad Neck and Feet/toes targets plus Neck movement and Foot/toe control patterns; it adds no anatomy hierarchy.
- Add, edit, and duplicate survive save/reload/export/current-format import.
- Existing relationship values remain unchanged unless deliberately edited.
- Routine-entry prescriptions and roles never appear in or change through this editor.

**Out of scope:** relationship-picker redesign, deletion behavior changes, schema changes, old-version compatibility, or reference redesign.

### 11C. Relationships and deletion

**Status:** owner/device verified with cache 43 and 77 passing checks.

**Goal:** finish master-data maintenance with a clear relationship editor and trustworthy destructive flow.

**Relationship editor:**

- Opens from the master editor and searches all other master exercises by name or classification.
- Existing links appear first. Each link has one explicit Easier, Alternative, or Harder value relative to the exercise being edited and a remove action.
- Adding a result creates an Alternative draft by default; the owner may change it before saving. The stable internal relation ID remains `similar`.
- Self-links, duplicate links, and missing exercise IDs remain impossible.
- `Done` updates only the unsaved exercise draft. Closing cancels relationship-sheet changes; saving the master exercise atomically applies reciprocal inverse links.

**Deletion:**

- Delete remains inside Edit mode only.
- Confirmation names the exercise, reports its exact programmed use count, and distinguishes alternatives that will be removed, preferred choices that will be promoted, and slots that will be deleted.
- The storage helper removes the master and incoming relationships. Programmed choices drop that ID; the next item becomes first/preferred, and only a slot with no remaining choice is removed with its checks.
- Failure leaves the editor and all stored data unchanged with a visible error.

**Acceptance:**

- Easier/Harder inversion and Alternative reciprocity survive save, reload, export, and current-format import.
- Changing or removing a relationship updates both sides exactly once.
- Duplicate mode cannot accidentally modify the source exercise.
- Delete with zero, one, or several routine references reports truthfully and cleans only the intended data.
- Reference rows immediately reflect saved relationship changes.

**Out of scope:** automatic alternatives, progression recommendations, relationship families, exercise percentages, Program changes, or a schema change.

### 11D. Replacement Library and program seed

**Status:** owner/device verified and released with cache 44 and 78 passing checks.

**Goal:** install the approved manifest as the new development starting state without duplicating masters or retaining unfinished legacy seed data.

**Data behavior:**

- Seed only the manifest’s approved canonical `masters` catalog independently of routine membership so valid unused masters remain available. Stage-A lineage and raw-source records never enter runtime state.
- Install one `PPLPPL 7 — Glute Specialization` program containing the six ordered gym routines, three reusable Home Morning routines, and one optional-only Home Base routine. Add no Rest routine.
- This is the sole restored starting program, not a schema special case. Future owner-created or client programs reuse the same global Library and generic Program/Routine/Entry model.
- Reproduce approved program/routine notes, block order, entry order, Main/Optional roles, prescriptions, entry notes, and programmed-choice order exactly.
- Home Base contains its seven named blocks and all 52 Optional entries. It never auto-completes.
- Relationships remain global Library facts; routine choices remain local entry facts.

**Development reset:**

- Replace the schema-shaped development defaults from 10F and provide one deliberate `Restore starting data` path to load the approved seed. This is the second and final planned pre-release data reset.
- Do not add a migration from the current development catalog or preserve old seed IDs merely for compatibility.
- Current-format save/reload and export/import remain required after the reset.

**Acceptance:**

- Every program, routine, block, entry, choice, alias, and relationship resolves to one stable canonical record.
- The final `PRODUCT.md` hierarchy and data definitions describe ordered one-or-more exercise choices per routine entry and still make clear that masters remain global.
- Renaming a master updates all routine titles derived from it; editing a routine entry never mutates the master.
- Main completion, Optional checks, multiple routines on one date, delete/promotion cleanup, duplicate/remap behavior, and current-format round trips remain correct.
- Library and Program match the approved manifest at both phone widths and themes; long Home Base and Library lists scroll correctly.
- Manifest, cache, syntax, dependency, automated, runtime, offline, and fresh-verifier checks pass before owner device verification.

**Out of scope:** migration from older development schemas, scheduler/pairing logic, recording which alternative was performed, or new UI beyond the approved slices.

## Slice 12 design brief

### Outcome

Finish the existing functional Log and Settings flows in the approved Ironworks presentation without changing their local-first meaning. `references/ui-concepts/ironworks-log-settings.html` supplies the visual and interaction direction; `PRODUCT.md` controls completion, history, reset, and data-replacement behavior.

Slice 12 is deliberately deferred after specification. Until it resumes, the current calendar, day editor, Settings dialog, theme switch, backup import/export, restore, and training-rule paths remain supported production behavior.

### Shared data and architecture boundary

- Keep schema 9 and the existing session shape: one local date key owns completed routine IDs, checked entry IDs grouped by routine, and one optional note.
- Do not add historical snapshots, copied routine/program names, analytics records, performed-choice tracking, scheduling state, or migrations.
- Past sessions may reference routines in any still-saved program. Switching the active program never rewrites history.
- `storage.js` continues to own session mutation, empty-day removal, validation, current-format backup parsing, atomic replacement, and failed-write behavior.
- `ui/log-settings.js` owns pure Log, day-editor, Settings, import-sheet, and rules markup. `app.js` owns transient month, editor/file state, focus, events, and store calls.
- Extend the production Ironworks shell and existing CSS modules. Add no dependency, router, generic settings system, data layer, or app-wide refactor.

### 12A. Log and day editor

**Status:** implementation-ready specification; deliberately deferred.

**Goal:** make dated workout history quick to scan and safe to edit while preserving current completion and check semantics.

**Product-action map:**

| User action | Current path | Planned path |
| --- | --- | --- |
| Move between months | Log header arrows around the month | Compact month bar with separate 44 px Previous/Next actions |
| Identify recorded dates | Calendar count or note marker | Ironworks date states for completion, note, both, and today, with complete accessible labels |
| Open a date | Tap a calendar date | Unchanged; any in-month date opens the focused day sheet |
| Reopen recent history | Calendar only | Up to eight most recent stored dates below the month, each opening the same day sheet |
| Mark routines complete | One undifferentiated list of every saved routine | Active-program routines first; already-recorded routines from other saved programs in a separate inactive-program section |
| Edit a day note | Day-dialog textarea | Unchanged field in the focused day sheet |
| Clear a day | Uncheck routines, clear note, save | Unchanged; an empty session record is removed atomically |

**Log view:**

- The month remains primary. Previous and Next change one local calendar month at a time without changing the selected workout routine or active program.
- Each in-month date is one 44 px button. Today uses `aria-current="date"`. Completion, note, and combined states remain distinguishable without color and are fully stated in the accessible name.
- Dates outside the current month are blank rather than actionable. Month length and first-weekday alignment use local calendar dates and do not pass through UTC parsing.
- `Recent` shows up to eight nonempty stored sessions ordered by date key descending, regardless of the displayed month. A row names its completed routines, current owning program context, note presence, and inactive-program context where applicable; it never invents a historical prescription or snapshot.
- An empty history keeps the month usable and shows a restrained empty Recent state. This slice adds no totals, charts, streaks, heatmaps, goals, or recommendations.

**Day editor:**

- The sheet title states the full local date and `Workout history`.
- Active-program routines appear in stored program order. A routine from another saved program appears only when it is already recorded on that date, under `Already recorded from another program`, with its owning program named.
- With no active program, the editor still preserves and exposes any routines already recorded for that date. It does not offer unrelated inactive routines as new completions.
- Marking a previously incomplete routine uses the existing `setDayInState` rule: add its routine ID and check its current Main entries. Empty and Optional-only routines can be deliberately marked complete.
- Unmarking a completed routine removes its routine ID and all saved entry checks for that routine on that date. Leaving an already-completed routine selected never synthesizes missing checks or rewrites its saved checks.
- The note remains optional plain text with the current 500-character limit. Cancel changes nothing. Save is one atomic state write; a failure keeps the complete draft open, reports that nothing changed, and preserves stored history.
- Saving no completed routines, no entry checks, and a blank note removes the date record. Note-only and Optional-check-only records remain valid and visible.

**Acceptance:**

- Focused tests cover month boundaries, leap February, local date keys, completion-only, note-only, combined markers, recent ordering/limit, and accessible date labels.
- Day-editor tests cover zero/one/several completions, active and recorded inactive programs, multiple programs on one date, empty and Optional-only routines, note-only records, preserved existing checks, unmark cleanup, blank-day deletion, cancel, save failure, reload, and current-format round trips.
- Runtime checks cover both phone sizes and themes, long routine and Recent lists, independent sheet/page scrolling, 44 px targets, visible focus and focus return, keyboard/textarea behavior, safe areas, reduced motion, browser errors, and offline startup.
- Workout checks and routine completion remain unchanged after editing the same date through Log.

**Risks:** local-date drift at month boundaries, misleading historical context after current program edits, accidental cleanup of saved checks, long translated date/routine text, failed-write drafts, and nested scroll/focus behavior.

**Out of scope:** session-schema changes, historical snapshots, adding inactive-program routines to a day, editing individual entry checks in Log, performed-choice recording, scheduling, analytics, streaks, goals, or Workout redesign.

### 12B. Settings and current-format data portability

**Status:** implementation-ready specification; deliberately deferred.

**Goal:** give appearance, backup/restore, and owner training rules one trustworthy Settings home with explicit replacement scope and visible failure evidence.

**Product-action map:**

| User action | Current path | Planned path |
| --- | --- | --- |
| Open Settings | Bottom-nav button opens one tall dialog | Bottom-nav Settings view in the production shell |
| Switch theme | Theme row toggles light/dark | Ironworks Appearance row with the current theme visible |
| Export data | Settings dialog button starts a JSON download | Data row exports the same complete current-format backup |
| Import data | File picker, then generic confirmation; errors return to Settings | File picker followed by one focused import sheet containing scope, filename, confirmation, and any failure |
| Restore starting data | Generic confirmation | Explicit destructive confirmation naming programs, exercises, and history |
| Read training rules | Inline disclosure | Focused scrollable Training rules sheet |

**Settings view:**

- Settings becomes a normal top-level view selected by the existing fifth bottom-navigation action. It uses the same app bar, page scrolling, focus placement, and safe-area behavior as the other primary views.
- Rows are grouped under Appearance, Data, Training, and About. About states only that the app is local-first/offline ready; it adds no profile, version service, account, subscription, or cloud surface.
- Theme remains the stored `light`/`dark` setting. The row shows the current value, applies the document and theme-color change immediately after a successful write, and leaves the old theme active after a failed write.
- Training rules render the owner-provided `RULES` content exactly as stored in a focused sheet. They remain reference text, not medical reinterpretation or automated programming.

**Export and import:**

- Export uses `createBackup` and includes the complete current schema-9 state. The existing dated JSON filename remains. Success clears stale errors; blob/download failure produces a visible error and changes no app data.
- Import begins with the native JSON file picker. After selection, one sheet shows the exact filename and states that importing replaces every program, exercise, history record, selection, and appearance setting contained in app data.
- `Choose another` reopens the picker and clears the prior file-specific error. Selecting the same file again remains possible.
- `Import data` is the explicit replacement confirmation. The file is read, parsed, completely validated, and written through the existing storage boundary before success is reported.
- Invalid JSON, wrong schema/envelope, invalid current data, file-read failure, or storage-write failure remains in the same sheet with a plain `Nothing was changed` message. The sheet retains the selected filename and offers another choice.
- A successful import closes the sheet, applies the imported theme and selections, rerenders every view, and remains valid after reload. Cancel or close changes nothing.

**Restore:**

- Restore uses one explicit destructive confirmation stating that it replaces programs, exercises, and history with the reviewed starting state.
- Restore preserves the currently selected light/dark appearance because appearance is outside the stated replacement scope. It resets active program/routine selection to the seed’s valid defaults.
- A failed restore keeps current state and theme unchanged and reports failure without closing the focused flow. A successful restore rerenders all views and survives reload.

**Acceptance:**

- Current-format export/import round trips the exact schema-9 state, including aliases, relationships, blocks, choices, scoped notes, sessions, selections, and theme.
- Tests cover export failure, canceled picker/import/restore, repeat same-file selection, invalid and old-schema files, valid parse followed by write failure, success, imported theme application, restore theme preservation, and no false success.
- Runtime checks cover both phone sizes and themes, all Settings rows and sheets, long rules, filenames and errors, independent scrolling, safe-area footers, file-input focus return, 44 px actions, visible focus, reduced motion, browser errors, and offline startup.
- Installed-PWA checks confirm export/download behavior and file selection/import on the target iPhone; these remain device-pending until the owner verifies them.

**Risks:** irreversible local replacement, misleading success after failed writes, repeated file-input selection, iOS download/file-picker behavior, imported theme application, focus loss across native file UI, and stale service-worker assets.

**Out of scope:** new backup formats, old-schema compatibility, migrations, partial/selective import, merge import, automatic backups, cloud sync, accounts, encryption, analytics, configurable rules, or changes to the approved starting seed.

## Slice 13. Current-state consolidation and release

**Status:** repository/runtime and fresh-verifier gates complete with cache 46 and 80 passing checks; owner device verification pending.

**Goal:** reduce confirmed superseded implementation residue and certify the currently accepted Slices 7–11D product without implementing deferred Slice 12 behavior.

**Allowed work:**

- Trace production HTML, CSS, JavaScript, service-worker assets, and tests before removal. Delete only markup, selectors, helpers, compatibility branches, or assertions proven unreachable or superseded in the current schema-9 app.
- Review module ownership and real duplication. Keep `app.js` as coordinator unless a small extraction isolates stateful logic, removes repeated pure markup, or materially improves tests; line count alone is not a reason to split it.
- Preserve the current functional Log/day editor and Settings/theme/export/import/restore/rules paths. Their future Ironworks redesign is deferred work, not dead code.
- Remove no reference, manifest, source-material, or validator artifact that remains part of the approved content audit trail.
- Synchronize production query versions, service-worker cache contents/name, manifest references, and tests if any production asset changes.
- Update only status or architecture documentation whose current truth changes.

**Acceptance:**

- Final diff contains no behavior redesign, schema change, migration, dependency, seed-content change, broad formatting churn, or deferred Slice 12 implementation.
- All existing product actions remain reachable. Current schema-9 data, sessions, completion, restore, and exact current-format export/import survive save and reload.
- Manifest parsing/validation, focused checks, the full dependency-free suite, syntax checks, cache assertions, and `git diff --check` pass.
- Runtime regression covers every primary view at 320 × 700 and 393 × 852 in both themes, long-list and dialog scrolling, focus, safe areas, reduced motion, browser errors, and cache-updated offline startup.
- A fresh bounded verifier checks removals, regressions, data loss, accessibility, scope, and stale cache/version references. Confirmed findings are fixed and rechecked.
- The owner verifies Safari and installed-PWA behavior before the current-scope release is marked device verified.

**Risks:** deleting code that deferred Log/Settings still uses, obscuring behavior through over-extraction, invalidating cached imports, accidental formatting churn, and mistaking unsupported old-schema logic for current-format recovery behavior.

**Out of scope:** Slice 12A/12B UI, new features, visual polish, program content edits, schema/storage redesign, framework conversion, new dependencies, speculative service-worker lifecycle work, or cleanup justified only by preference.

If Slice 12 resumes after this release, its own implementation gates run from the specifications above and end with another bounded consolidation/release audit of whatever it changes.

Release only after the owner confirms Safari and installed-PWA behavior on the target iPhone.

## Explicit exclusions

- Backend, accounts, cloud sync, analytics, or internet-facing security work.
- Framework, bundler, TypeScript conversion, CSS framework, or generic component engine.
- Automatic programming, recommendations, scheduling engine, or dense analytics.
- Biomechanics percentages, stabilizer databases, joint models, or web-generated classification.
- Social features, streaks, gamification, or decorative dashboard content.
- Unreproduced service-worker lifecycle edge cases.
