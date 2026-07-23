# Current Handoff

Updated: 2026-07-24

This file is the short current truth for resuming work. Replace stale details instead of appending a work log.

## Deployed baseline

- **Published revision:** `origin/main` at `df1f690`.
- **Local committed baseline:** use the latest `main` commit from `git log -1`; it is ahead of the published revision.
- **Service-worker cache:** version 24 is published from `origin/main`.
- **Current release:** version 24 contains the verified data/UI slices, repository organization, direct hold-and-drag routine ordering, and the iOS text-selection fix.
- **Stored-data schema:** version 5 under `gymAppStateV1`, with migrations from versions 1–4.
- **Architecture:** build-free vanilla HTML, CSS, and JavaScript; no production dependencies or backend.
- **Target device:** iPhone 15 Pro, iOS 17.x, Safari and Add to Home Screen.

## Active work

- **Status:** Slice 6.5 is repo verified and forms the local recovery checkpoint before Slice 7. The schema remains version 7; no Slice 7 role or completion behavior has started.
- **Verification:** 63 automated checks pass. A fresh read-only verifier reported no findings after checking stable seed identity, default-data equivalence, plan corrections, served assets, offline cache, and cumulative Slice 0–6 behavior.
- **Device status:** Slice 6 Safari and installed-PWA verification is pending on the target iPhone. Earlier version-24 behavior remains owner-confirmed.

## Current repository state

- The deployed app remains schema version 5/cache version 24. The local verified checkpoint is schema version 7/cache version 28 with backward migrations from versions 1–6.
- Schema version 6 adds Program ownership and selection. Schema version 7 adds the reviewed exercise classification and reciprocal related-exercise model.
- `artifacts/exports/Gym App Data.xlsx` is the local friendly-label source workbook: 77 classified exercises and 38 directed reciprocal related-exercise rows. Its non-classification sheets remain an earlier editable export snapshot.
- `references/exercise-classification-study.md` records the finalized vocabulary and workbook boundary.
- The repository organization is committed and published on `main`.
- Repository documents now live in `docs/`; `AGENTS.md` and `README.md` remain at the root for immediate discovery.
- `tools/iphone-preview.html` is the local interactive iPhone-shaped preview and is intentionally not a production source.
- Design concepts live under `references/`; local archives and generated test output live under ignored `artifacts/` subfolders.
- The smooth-reorder patch is committed locally at `9a57f1c`; it is not in the currently published `origin/main` revision.
- `references/ui-concepts/ironworks-program.html` and `ironworks-log-settings.html` are the owner-approved Slice 1 extensions; `ironworks-flows.css` contains their shared reference-only styles.
- Slice 2 fixtures live under `tests/fixtures/` and are never loaded by the production app.
- Default routine seeds now store explicit entry and master-exercise IDs; display-name or list-order changes cannot alter identity.

## Last repository validation

- The current checkpoint passes all 63 tests, manifest parsing, JavaScript/service-worker syntax, synchronized offline assets, served-source checks, and `git diff --check`.
- Coverage includes migrations from versions 1–6, strict stable-ID classification validation, reviewed seed completeness, custom-value uncertainty, reciprocal related links, deletion cleanup, Program ownership/selection/CRUD/duplication/deletion, cross-program history, failed migration and CRUD writes, import/export/reload, atomic routine-entry ordering, active-dialog errors, cache isolation, and production-shell invariants.
- The relocated iPhone preview loads the app with live refresh. Earlier runtime checks passed at 320 × 700 and 393 × 852 in both themes with long lists and dialogs.
- Runtime checks cover FLIP movement, animated settle, cancellation, reduced motion, edge autoscroll, fallback controls, narrow layouts, frozen mouse-drop targeting, and saving against the drag-origin routine during a routine switch.
- The owner completed the version-24 checklist on the target iPhone and confirmed Safari and Add to Home Screen behavior is good.
- Slice 1 reference runtime checks cover both themes and target widths, populated and empty programs/routines, program/routine/entry management, Log/day editing, import failure, Settings, and training rules.
- Slice 3 browser checks cover real localStorage migration, current routine creation and ordering, persisted reload, and narrow-phone geometry.
- Slice 4 browser checks cover complete Program management, active-program routine scoping, duplicate-ID and shared-exercise integrity, deletion/history cleanup, inactive-program Log labels, no-program recovery, write-failure rollback, and offline startup from cache v27.
- The fresh Slice 4 verifier independently passed 56/56 checks and runtime checks at 320 × 700 and 393 × 852 in both themes, with no findings.
- Slice 6 browser checks cover real version-6 localStorage migration, stable IDs and friendly labels, classification search/filters/detail/editor, reciprocal related links, add/delete cleanup, persisted reload, export/import, failed writes, 320 × 700 and 393 × 852 in both themes, scrolling, touch targets, and offline startup from cache v28.
- Slice 6.5 verification proves all 77 exercise IDs and 84 entry IDs survive seed display-name and order changes; default data remains equivalent, 38 directed relationships remain intact, and no schema, cache, UI, or dependency change landed.

## Next safest action

Owner assesses the verified checkpoint. Start Slice 7 only after approval, using Main as the migration default and atomic storage helpers for checks, Log completion, role reconciliation, and cleanup.
