# Current Handoff

Updated: 2026-07-20

This file is the short current truth for resuming work. Replace stale details instead of appending a work log.

## Deployed baseline

- **Branch:** `main`; use the latest `git log -1` entry as the exact revision.
- **Service-worker cache:** version 24 is published from `main`.
- **Current candidate:** version 24 contains the verified data/UI slices, repository organization, direct hold-and-drag routine ordering, and the iOS text-selection fix.
- **Stored-data schema:** version 5 under `gymAppStateV1`, with migrations from versions 1–4.
- **Architecture:** build-free vanilla HTML, CSS, and JavaScript; no production dependencies or backend.
- **Target device:** iPhone 15 Pro, iOS 17.x, Safari and Add to Home Screen.

## Accepted product direction

- Workout, Program, Library, and Log have distinct roles defined in `PRODUCT.md`.
- Exercise reference content includes targets, notes/cues, alternatives, and an optional video.
- Master exercise editing is separate from routine-entry prescription/order editing.
- Muscle filtering distinguishes primary targets from primary-plus-secondary involvement.
- Exercise categories are separate from muscles. The current categories are `Mobility`, `Rehab`, and `Full Body`; one optional category filter can be combined with a muscle filter.
- Routines and their entries can be added, edited, removed, and reordered. `Rest` is not a placeholder routine.
- The interface should be compact, functional, and good-looking without grids, decorative waste, or space-heavy completion controls.

## Active slice

- **Goal:** reorder exercises directly in Program with an iPhone-friendly hold-and-drag gesture.
- **Acceptance:** tap still edits; hold visibly lifts without selecting text; drag selects any position and edge-scrolls; release persists; ordinary scrolling, cancel, and failed-save behavior remain safe; fallback buttons remain available.
- **Out of scope:** routine-tab drag ordering, Library ordering, a drag dependency, storage migration, or broader Program redesign.
- **Status:** Version 23 drag behavior is device verified except for its reproduced text-selection defect. Version 24 fixes that defect and is repo verified; device recheck is pending.

## Current repository state

- `UI-003`, `DATA-001`, `CSS-001`, and `DATA-002` are implemented, verified, committed, and published.
- The strict one-primary model is active; there is no legacy target-review state or special UI/filter branch.
- Exercise categories remain the deliberately small owner vocabulary: `Mobility`, `Rehab`, and `Full Body`; speculative categories are deferred.
- The repository organization is committed and published on `main`.
- Repository documents now live in `docs/`; `AGENTS.md` and `README.md` remain at the root for immediate discovery.
- `tools/iphone-preview.html` is the local interactive iPhone-shaped preview and is intentionally not a production source.
- Design concepts live under `references/`; local archives and generated test output live under ignored `artifacts/` subfolders.
- `UI-004` version 24 keeps the working version-23 drag behavior and adds explicit iOS text-selection suppression without changing stored-data shape.

## Last repository validation

- Version 24 passes all 40 tests, manifest parsing, JavaScript/service-worker syntax, synchronized offline assets, served-source checks, and `git diff --check`.
- Coverage includes migrations from versions 1–4, strict muscle/category validation, import/export/reload, atomic routine-entry ordering, failed-write rollback, active-dialog errors, cache isolation, and production-shell invariants.
- The relocated iPhone preview loads the app with live refresh. Earlier runtime checks passed at 320 × 700 and 393 × 852 in both themes with long lists and dialogs.
- A fresh verifier found the drag touch/scroll split, tap suppression, arbitrary index mapping, rollback, cancellation, fallback controls, and cache synchronization clean.
- The owner confirmed version-23 drag ordering on the target iPhone and reported simultaneous text highlighting. Version 24 adds WebKit selection suppression, a `selectstart` guard, and selection clearing on lift; device confirmation of that fix remains pending.

## Owner/device verification pending

Before more UI redesign, check both Safari and the installed PWA on the iPhone:

1. Confirm Workout, Program, Library, and Log each scroll independently with long content.
2. Open an exercise from Workout and Library; confirm Targets, Notes, Alternatives, Watch video, and Edit exercise are reachable.
3. Add/edit/reorder/delete a test routine. In Program, tap an entry to edit it, scroll the list normally, then hold-drag an entry from first to last and back; confirm the order survives relaunch. Also check the earlier/later fallback and remove one entry.
4. Add/edit an exercise and confirm a primary muscle is required, categories are separate, `Primary only` differs from `Primary + secondary`, and a muscle plus category filter combines correctly.
5. Mark/unmark today, edit a Log date and note, switch both themes, relaunch, and test offline.
6. Confirm Safari and standalone both received version 24 and render correctly with nothing under the notch, home indicator, or bottom navigation. Their locally stored routines and history may differ because iOS can keep separate storage containers.

## Next safest action

Let the owner reopen version 24 and confirm hold-and-drag no longer highlights text. `PWA-002` and `PWA-003` remain explicitly deferred; do not start either automatically.
