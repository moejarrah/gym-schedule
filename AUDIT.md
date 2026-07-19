# Active Improvement Backlog

Updated: 2026-07-19

This is the single ordered backlog for confirmed code and device findings. It is not permission to fix everything at once. Select one issue, record it as the active slice in `HANDOFF_STATUS.md`, implement only its acceptance criteria, verify it, then move to the next issue.

Status values: `Open`, `Planned`, `In progress`, `Repo verified`, `Device verified`, `Deferred`.

## Recommended order

| Order | ID | Priority | Summary | Why here |
| ---: | --- | --- | --- | --- |
| 1 | `PWA-001` | P1 | Isolate gym-app caches | Small correctness fix that protects other PWAs on the same origin. |
| 2 | `UI-002` | P1 | Preserve prescription edits when reordering | Direct user-data loss in a normal editing flow. |
| 3 | `UI-003` | P1 | Show failures inside open dialogs | Failed actions can currently appear to do nothing. |
| 4 | `DATA-001` | P1 | Enforce one valid primary muscle | Completes the dominant-versus-secondary model; requires careful compatibility handling. |
| 5 | `PWA-002` | P2 | Avoid update reloads during unsaved edits | Removes a smaller draft-loss window. |
| 6 | `PWA-003` | P2 | Stop false offline-startup errors | Corrects misleading feedback without changing offline behavior. |
| 7 | `UI-001` | P0 gate | Accept the repaired version on iPhone | Physical Safari/standalone verification before another redesign. |
| 8 | `CSS-001` | P2 | Remove confirmed dead CSS | Makes later UI work safer after current behavior is accepted. |
| 9 | `DATA-002` | Deferred | Separate muscles from descriptive tags | Do only when category work is selected. |
| 10 | `DATA-003` | Deferred | Make corrupt-data recovery usable | Current data is disposable, so added recovery UI is not justified yet. |
| 11 | `DX-001` | Deferred | Reconsider browser automation | Add tooling only after repeated runtime regressions demonstrate the need. |

## PWA-001 — Isolate service-worker cache cleanup

- **Status:** Repo verified
- **Priority:** P1
- **Type:** Correctness / offline isolation
- **Evidence:** Version 17 now filters activation cleanup by the `gym-schedule-` prefix. A focused test executes the real activation handler and confirms that only a stale gym cache is deleted while the current gym, BMI, and unrelated caches survive.
- **Impact:** Updating the gym app can delete another PWA's offline cache, and another app can similarly disrupt this one.
- **Acceptance:** Activation deletes only obsolete keys owned by the gym app; unrelated cache names remain untouched; the current gym cache and offline fallback continue working.
- **Implemented:** Added the `gym-schedule-` ownership prefix, bumped the synchronized shell/cache to version 17, and added executable activation regression coverage.
- **Verified:** Focused activation test passed; `npm run check` passed 24/24; manifest and diff checks passed; Firefox rendered the cached app with its local server stopped; fresh verifier reported clean. Physical iPhone update remains pending.

## UI-002 — Preserve prescription edits when moving a routine entry

- **Status:** Open
- **Priority:** P1
- **Type:** Editing correctness
- **Evidence:** The entry dialog saves prescription text only through `saveEntry()`. `Move earlier` and `Move later` close the dialog and call `moveEntry()` without persisting the current input.
- **Impact:** Typing a new prescription and then moving the exercise silently discards the typed change while still reporting a successful reorder.
- **Acceptance:** Moving an entry never loses the prescription currently visible in the editor; the reorder and prescription persist after reload.
- **Smallest fix:** Save the current prescription and reorder in one storage update, or keep the dialog open and make the unsaved state unmistakable. Prefer the single atomic update.
- **Verify:** Move earlier/later with edited text, boundary buttons, reload persistence, storage-write failure, and unchanged master-exercise prescription.

## UI-003 — Make failures visible inside modal dialogs

- **Status:** Open
- **Priority:** P1
- **Type:** Error handling / usability
- **Evidence:** The global toast is outside every `<dialog>`. Native modal dialogs render in the browser top layer, which an ordinary high `z-index` toast cannot cover.
- **Impact:** A failed save, invalid import, reset failure, or theme persistence failure can appear to do nothing while a dialog is open.
- **Acceptance:** Every failed action displays a readable message in the active dialog; success and startup messages may continue using the global toast.
- **Smallest fix:** Route failures to the active dialog's existing or focused `role="alert"` region. Do not build a notification framework.
- **Verify:** Simulated failed exercise/routine/entry saves, invalid import, reset failure, theme failure, focus/announcement behavior, and both themes.

## DATA-001 — Require exactly one valid primary muscle

- **Status:** Open
- **Priority:** P1
- **Type:** Data contract / filtering
- **Evidence:** The editor offers `Not set`; storage validation accepts zero, multiple, and unknown primary-muscle values; the editor displays and saves only the first primary value.
- **Impact:** `Primary only` filtering can omit uncategorized exercises, and imported multi-primary data can be silently simplified during editing.
- **Acceptance:** New and edited exercises require exactly one primary muscle from the supported list; secondary targets are valid supported values and exclude the primary; existing empty or malformed records are handled explicitly without silent data loss; imports remain predictably compatible.
- **Smallest fix:** Keep the existing array-shaped schema, require one valid value in UI/validation, and design one narrow compatibility path for existing version 3 records before editing production code.
- **Verify:** Empty, multiple, unknown, overlapping, migration, import, edit, filter, export, and reload cases.

## PWA-002 — Do not reload over unsaved edits during an update

- **Status:** Open
- **Priority:** P2
- **Type:** Update lifecycle / draft safety
- **Evidence:** A service-worker `controllerchange` immediately reloads when an older worker controlled the page. Activation can finish while a form or day note is open.
- **Impact:** Unsaved editor text can disappear during an otherwise successful update.
- **Acceptance:** An update never silently reloads over a dirty form. A clean idle screen may reload automatically, or the app may offer a concise `Update ready` action.
- **Smallest fix:** Track whether an editor has unsaved input and defer reload only in that case. Avoid a general draft-persistence system.
- **Verify:** Clean-screen update, dirty exercise/routine/entry/day forms, cancel/save followed by update, and stale-version recovery.

## PWA-003 — Distinguish registration failure from update-check failure

- **Status:** Open
- **Priority:** P2
- **Type:** Offline feedback
- **Evidence:** Service-worker registration and `registration.update()` share one catch that says `Offline mode could not be started.`
- **Impact:** When an existing worker already supports offline use but a network update check fails, the app can falsely claim offline mode failed.
- **Acceptance:** Registration failure remains visible; a failed update check does not claim offline support is unavailable.
- **Smallest fix:** Separate the registration and update error paths. Keep update-check failure silent unless there is an actionable state.
- **Verify:** First registration failure, existing-worker offline launch, failed update check, successful update, and offline reload.

## UI-001 — Accept the repaired app on the target iPhone

- **Status:** Repo verified
- **Priority:** P0 gate before more UI redesign
- **Type:** Device acceptance
- **Evidence:** Automated checks, local HTTP checks, and 320 × 700 / 393 × 852 headless rendering pass. Safari and installed-PWA behavior have not been confirmed after the version 16 repairs.
- **Impact:** Scrolling, safe areas, dialogs, keyboard behavior, cached assets, or feature discovery may still differ on iPhone 15 Pro running iOS 17.x.
- **Acceptance:** Safari and Add-to-Home-Screen modes receive the repaired UI/assets; all tabs and sheets scroll and render safely; and the owner can complete every action in `PRODUCT.md` without mixed master-exercise/routine-entry editing. The modes may contain different local data.
- **Next action:** After issues 1-6 are repo verified, run the device checklist in `HANDOFF_STATUS.md` and turn each exact failure into one narrow issue.

## CSS-001 — Remove confirmed unused legacy styles

- **Status:** Open
- **Priority:** P2 after device acceptance
- **Type:** Maintainability
- **Evidence:** `styles.css` is 1,662 lines. Static comparison found 26 of 126 class selectors absent from current production HTML/JavaScript, including `workout-details`, `today-summary`, `calendar-summary`, `rest-notice`, `filter-chip`, `sticky-action`, and `status-pill`.
- **Impact:** Old UI concepts make styling harder to reason about and increase the risk of accidental conflicts during future design work. They do not currently break runtime behavior.
- **Acceptance:** Confirmed unused selectors are removed with no visual or behavioral change at supported phone sizes and in both themes.
- **Smallest fix:** One behavior-neutral CSS-only cleanup after the current UI is accepted. Do not combine it with redesign or feature work.
- **Verify:** Before/after screenshots at 320 × 700 and 393 × 852, all dialogs, both themes, `npm run check`, and final selector search.

## DATA-002 — Separate anatomical muscles from descriptive tags

- **Status:** Deferred
- **Priority:** P2 when category expansion begins
- **Type:** Product model
- **Evidence:** `Mobility`, `Rehab`, and `Full Body` currently share `MUSCLE_GROUPS` with anatomical targets and can appear as primary or secondary muscles.
- **Impact:** Muscle filtering mixes what an exercise targets with what kind of exercise it is, which will become confusing as categories expand.
- **Acceptance:** Anatomical primary/secondary targets and descriptive categories have distinct meanings and filters without losing existing labels.
- **Next action:** Revisit only when the owner starts the category/library expansion. Decide the desired filter interaction before changing schema.

## DATA-003 — Make corrupt-data recovery usable from the phone

- **Status:** Deferred
- **Priority:** P3
- **Type:** Local recovery
- **Evidence:** Invalid stored data is copied to a timestamped recovery key before defaults open, but the app provides no way to discover, export, or restore that key from an iPhone. Repeated failed loads may create duplicate recovery copies.
- **Impact:** Recovery exists technically but is developer-only. Current owner data is disposable, so this is not urgent.
- **Acceptance:** If history becomes valuable, retain one clearly named recovery copy and provide a narrow export/restore path with visible status.
- **Next action:** Do nothing until the owner considers stored history valuable enough to justify recovery UI.

## DX-001 — Decide whether browser automation is worth adding

- **Status:** Deferred
- **Priority:** P3
- **Type:** Development tooling
- **Evidence:** Current tests cover data, migrations, shell/version invariants, and core control presence, but static checks cannot prove scrolling or Safari/standalone interactions.
- **Impact:** Runtime UI checks remain manual. Adding a browser stack now would increase setup and maintenance for a small dependency-free app.
- **Acceptance:** Add dev-only automation only after the same runtime regression class recurs and the owner approves the tooling tradeoff.
- **Next action:** Keep focused manual preview and physical-device gates.

## Deliberately not planned

- No framework, bundler, backend, database, account system, cloud sync, analytics, or production dependency.
- No broad `app.js` rewrite. Its roughly 942 lines remain coherent and mostly consist of small named functions.
- No IndexedDB or state library. JSON cloning and localStorage are proportionate for the current dataset.
- No immutable history redesign unless the owner later wants deleted or renamed routines preserved as historical snapshots.
- No generic notification system, draft autosave framework, or large design system to solve these localized issues.

## Adding or closing an item

New items need a stable ID, `Status`, `Priority`, concrete `Evidence`, user-facing `Impact`, observable `Acceptance`, and the smallest sensible fix or next action. Remove completed entries after device acceptance; durable product behavior belongs in `PRODUCT.md`, and finished evidence belongs in `HANDOFF_STATUS.md` only while it remains current.
