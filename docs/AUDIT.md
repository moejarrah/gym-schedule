# Active Improvement Backlog

Updated: 2026-07-20

This is the single ordered backlog for confirmed code and device findings. It is not permission to fix everything at once. Select one issue, record it as the active slice in `HANDOFF_STATUS.md`, implement only its acceptance criteria, verify it, then move to the next issue.

`Repo verified` sections remain only until physical device acceptance. Do not reimplement them; the Current decisions table controls what happens next.

Status values: `Open`, `Planned`, `In progress`, `Repo verified`, `Device verified`, `Deferred`.

## Current decisions

| Order | ID | State | Summary | Why here |
| ---: | --- | --- | --- | --- |
| 1 | `UI-001` | Device acceptance | Exercise the remaining iPhone checklist | This remains the gate before another broad redesign. |
| 2 | `PWA-002` | Deferred | Avoid update reloads during unsaved edits | The owner controls deployments and does not want this complexity. |
| 3 | `PWA-003` | Deferred | Stop false offline-startup errors | Implement only if the owner reproduces and cares about it. |
| 4 | `DATA-003` | Deferred | Make corrupt-data recovery usable | Revisit only when stored history becomes valuable. |
| 5 | `DX-001` | Deferred | Reconsider browser automation | Add tooling only after repeated runtime regressions justify it. |

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

- **Status:** Repo verified
- **Priority:** P1
- **Type:** Editing correctness
- **Evidence:** Version 18 now saves the edited routine-entry prescription and new position through one validated storage write. The dialog closes and renders only after that write succeeds.
- **Impact:** The previous silent prescription-loss path is removed; a failed write leaves the dialog and typed draft intact.
- **Acceptance:** Moving an entry never loses the prescription currently visible in the editor; the reorder and prescription persist after reload.
- **Implemented:** Added a focused `moveRoutineEntry` state operation, used it for both movement controls, and kept master-exercise data outside the mutation.
- **Verified:** Earlier/later, boundary, missing-ID, reload persistence, master isolation, and failed-write paths passed; `npm run check` passed 26/26; version references, manifest, syntax, HTTP assets, and phone-sized render smoke checks passed; fresh verifier reported the production patch clean. Physical iPhone interaction remains pending.

## UI-003 — Make failures visible inside modal dialogs

- **Status:** Repo verified
- **Priority:** P1
- **Type:** Error handling / usability
- **Evidence:** Version 19 routes action failures to a `role="alert"` region in the topmost open dialog that owns one. Nested confirmations fall back to their underlying editor, and long dialogs scroll the alert into view.
- **Impact:** Failed saves, imports, exports, resets, theme changes, moves, additions, and removals now remain visible in the dialog where the action began.
- **Acceptance:** Every failed action displays a readable message in the active dialog; success and startup messages may continue using the global toast.
- **Implemented:** Added focused alert regions to persistence dialogs, one small active-dialog router with global-toast fallback, scroll-to-visible behavior, stale-error clearing, and successful-export cleanup. Empty alerts take no space.
- **Verified:** Focused execution tests passed 3/3, including nested-confirm fallback, top-dialog precedence, visible scrolling, stale-error clearing, success toast, and no-dialog fallback; `npm run check` passed 29/29; manifest, version synchronization, phone-sized render, and diff checks passed; fresh verifier reported clean. Physical iPhone interaction remains pending.

## DATA-001 — Require exactly one valid primary muscle

- **Status:** Repo verified
- **Priority:** P1
- **Type:** Data contract / filtering
- **Evidence:** Schema version 4 requires one supported primary muscle. Valid version-3 records receive only a schema-version bump; invalid old target records are rejected or reset rather than creating a second legacy exercise state.
- **Impact:** Every accepted exercise has an unambiguous dominant target, and future filter/category work does not need special handling for partially valid legacy records.
- **Acceptance:** New and edited exercises require exactly one primary muscle from the supported list; secondary targets are valid supported values and exclude the primary; existing empty or malformed records are handled explicitly without silent data loss; imports remain predictably compatible.
- **Implemented:** Kept the array-shaped schema, added a trivial valid version 3-to-4 bump, required the primary selector, enforced supported non-overlapping secondary targets, and kept the existing primary-versus-combined filter behavior without a legacy UI branch. The owner explicitly confirmed that invalid old phone data is disposable.
- **Verified:** Executable coverage passes for valid and invalid version-3 handling, empty, multiple, unknown, duplicate and overlapping targets, add, normal edit, duplicate, missing-primary blocking, filtering, save, reload, export, and import. `npm run check` passed 36/36; manifest, version synchronization, phone-sized shell, and diff checks passed; fresh re-verification confirmed the simplified production code is clean. Physical iPhone interaction remains pending.

## PWA-002 — Do not reload over unsaved edits during an update

- **Status:** Deferred
- **Priority:** P2
- **Type:** Update lifecycle / draft safety
- **Evidence:** A service-worker `controllerchange` immediately reloads when an older worker controlled the page. Activation can finish while a form or day note is open.
- **Impact:** Unsaved editor text can disappear during an otherwise successful update.
- **Acceptance:** An update never silently reloads over a dirty form. A clean idle screen may reload automatically, or the app may offer a concise `Update ready` action.
- **Smallest fix:** Track whether an editor has unsaved input and defer reload only in that case. Avoid a general draft-persistence system.
- **Verify:** Clean-screen update, dirty exercise/routine/entry/day forms, cancel/save followed by update, and stale-version recovery.
- **Decision:** Do not implement for this personal app. The owner controls deployments and can close the app before publishing.

## PWA-003 — Distinguish registration failure from update-check failure

- **Status:** Deferred
- **Priority:** P2
- **Type:** Offline feedback
- **Evidence:** Service-worker registration and `registration.update()` share one catch that says `Offline mode could not be started.`
- **Impact:** When an existing worker already supports offline use but a network update check fails, the app can falsely claim offline mode failed.
- **Acceptance:** Registration failure remains visible; a failed update check does not claim offline support is unavailable.
- **Smallest fix:** Separate the registration and update error paths. Keep update-check failure silent unless there is an actionable state.
- **Verify:** First registration failure, existing-worker offline launch, failed update check, successful update, and offline reload.
- **Decision:** Do not implement unless the owner actually encounters the misleading message and wants it changed.

## UI-001 — Accept the repaired app on the target iPhone

- **Status:** Repo verified
- **Priority:** P0 gate before more UI redesign
- **Type:** Device acceptance
- **Evidence:** Automated checks, local HTTP checks, and 320 × 700 / 393 × 852 headless rendering pass. Safari and installed-PWA behavior have not been confirmed after the version 16 repairs.
- **Impact:** Scrolling, safe areas, dialogs, keyboard behavior, cached assets, or feature discovery may still differ on iPhone 15 Pro running iOS 17.x.
- **Acceptance:** Safari and Add-to-Home-Screen modes receive the repaired UI/assets; all tabs and sheets scroll and render safely; and the owner can complete every action in `PRODUCT.md` without mixed master-exercise/routine-entry editing. The modes may contain different local data.
- **Next action:** Run the device checklist in `HANDOFF_STATUS.md` against live version 24 and turn each exact failure into one narrow issue.

## CSS-001 — Remove confirmed unused legacy styles

- **Status:** Repo verified
- **Priority:** P2 after device acceptance
- **Type:** Maintainability
- **Evidence:** The production stylesheet contained 28 class names with no live HTML or JavaScript class reference. A separate generic `gym` modifier occurred only inside two of those dead compound selectors.
- **Impact:** Old UI concepts make styling harder to reason about and increase the risk of accidental conflicts during future design work. They do not currently break runtime behavior.
- **Acceptance:** Confirmed unused selectors are removed with no visual or behavioral change at supported phone sizes and in both themes.
- **Implemented:** Removed only confirmed dead rules and dead parts of grouped selectors. `styles.css` fell from 1,666 to 1,383 physical lines and from 126 to 97 unique class tokens; no live selector was renamed or restyled. Added a focused regression check that keeps the 28 removed legacy class names out of production CSS.
- **Verified:** Final 320 × 700 and 393 × 852 renders are byte-identical to their pre-cleanup baselines. `npm run check` passed 37/37; manifest parsing, synchronized version references, and `git diff --check` passed. A fresh verifier rechecked every removed name and reported the final patch clean. Physical iPhone interaction remains pending.

## DATA-002 — Separate anatomical muscles from descriptive categories

- **Status:** Repo verified
- **Priority:** P2 when category expansion begins
- **Type:** Product model
- **Evidence:** Before version 22, `Mobility`, `Rehab`, and `Full Body` shared `MUSCLE_GROUPS` with anatomical targets and could appear as primary or secondary muscles.
- **Impact:** Muscle filtering mixes what an exercise targets with what kind of exercise it is, which will become confusing as categories expand.
- **Acceptance:** Anatomical primary/secondary targets and descriptive categories have distinct meanings and filters without losing existing labels.
- **Decision:** Use one optional multi-value `categories` field. Start with the three meanings already present in owner data: `Mobility`, `Rehab`, and `Full Body`. Do not invent or auto-assign broader categories such as Strength, Cardio, or Balance until the owner actually needs them.
- **Implemented:** Schema 5 keeps 13 practical anatomical target buckets and moves the three descriptive values into explicit exercise categories. Versions 1–4 migrate through the same extraction path. The editor, details, library rows, Library/Program/alternatives search, and compact filter sheet now treat categories independently; one optional category combines with the existing muscle filter using AND.
- **Verified:** Exact default and migrated inventories remain 17 `Mobility`, 20 `Rehab`, and 1 `Full Body`; no accepted target contains a category. Add/edit/duplicate, reload, export/import, primary-versus-combined muscle scope, category-only and combined filters, all three search surfaces, light/dark rendering, 320 × 700 and 393 × 852 dialogs/lists, long scrolling, and v22 offline reload passed. `npm run check` passes 38/38; a fresh verifier independently reported the final slice clean. Physical iPhone interaction remains pending.

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
- No broad `app.js` rewrite. Its roughly 1,150 lines remain coherent and mostly consist of small named functions.
- No IndexedDB or state library. JSON cloning and localStorage are proportionate for the current dataset.
- No immutable history redesign unless the owner later wants deleted or renamed routines preserved as historical snapshots.
- No generic notification system, draft autosave framework, or large design system to solve these localized issues.

## Adding or closing an item

New items need a stable ID, `Status`, `Priority`, concrete `Evidence`, user-facing `Impact`, observable `Acceptance`, and the smallest sensible fix or next action. Remove completed entries after device acceptance; durable product behavior belongs in `PRODUCT.md`, and finished evidence belongs in `HANDOFF_STATUS.md` only while it remains current.
