# Current Handoff

Updated: 2026-07-20

This file is the short current truth for resuming work. Replace stale details instead of appending a work log.

## Deployed baseline

- **Branch:** `main`; use the latest `git log -1` entry as the exact revision.
- **Service-worker cache:** `gym-schedule-v18`.
- **Committed candidate:** `gym-schedule-v22` contains repo-verified `UI-003`, `DATA-001`, `CSS-001`, and `DATA-002`; it has not been pushed or deployed.
- **Stored-data schema:** deployed version 3 under `gymAppStateV1`; the committed candidate is version 5 with migrations from versions 1–4.
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

- **Goal:** complete `DATA-002` by separating descriptive exercise categories from anatomical primary/secondary muscles.
- **Acceptance:** `Mobility`, `Rehab`, and `Full Body` survive as optional categories; they cannot be selected or filtered as muscles; categories can be edited, displayed, searched, and filtered independently; existing valid data migrates without changing routine meaning.
- **Out of scope:** inventing unused taxonomy, custom category management, redesign, routine semantics, dependencies, and every other backlog item.
- **Status:** Repo verified and committed locally; push and deployment remain pending.

## Work in progress

- `UI-003` is complete and repo verified in the worktree.
- `DATA-001` is complete and repo verified. The strict one-primary contract and trivial valid version-3 bump remain; no legacy target-review state or special UI/filter branch exists.
- `CSS-001` is complete and repo verified. It removed 283 physical stylesheet lines representing 28 dead component/state class names plus one modifier that existed only inside dead compound selectors; no live selector was renamed or restyled.
- `DATA-002` is the only active slice. Its chosen minimal vocabulary is the three categories already present in owner data: `Mobility`, `Rehab`, and `Full Body`; broader speculative categories are deferred.
- The verified slices are grouped in one local commit; it has not been pushed or deployed.
- `_preview.html` is a local, untracked interactive iPhone-shaped preview and is intentionally not a production source.
- Other untracked templates, screenshots, archives, and references belong to the owner and must remain untouched unless requested.

## Last repository validation

- The committed version 22/schema 5 candidate passes 38 tests covering exact category migration from versions 1–4, strict category/target validation, add/edit/duplicate behavior, combined filter semantics, import/export/reload, active-dialog routing, atomic entry movement, cache isolation, and the removed CSS inventory.
- Manifest parsing, JavaScript/service-worker syntax, synchronized shell references, and `git diff --check` passed.
- Phone-sized runtime flows passed for category add/edit/detail/reload, category-only and muscle-plus-category filtering, Library/Program/alternatives search, long-list and dialog scrolling, light/dark themes, 320 × 700 and 393 × 852 rendering, and v22 offline reload.
- A fresh verifier independently rechecked the schema, migrations, exact category inventory, validation, editor/detail/search/filter paths, v22 synchronization, tests, and status documents and reported `DATA-002` clean. Physical iPhone interaction remains pending.

## Owner/device verification pending

Before more UI redesign, check both Safari and the installed PWA on the iPhone:

1. Confirm Workout, Program, Library, and Log each scroll independently with long content.
2. Open an exercise from Workout and Library; confirm Targets, Notes, Alternatives, Watch video, and Edit exercise are reachable.
3. Add/edit/reorder/delete a test routine and add/edit/reorder/remove one routine entry.
4. Add/edit an exercise and confirm a primary muscle is required, categories are separate, `Primary only` differs from `Primary + secondary`, and a muscle plus category filter combines correctly.
5. Mark/unmark today, edit a Log date and note, switch both themes, relaunch, and test offline.
6. After the grouped changes are committed and deployed, confirm Safari and standalone both receive the new UI/assets and render correctly with nothing under the notch, home indicator, or bottom navigation. Their locally stored routines and history may differ because iOS can keep separate storage containers.

## Next safest action

Push and deploy the verified version 22 commit when the owner requests it, then run the iPhone checklist above. `PWA-002` and `PWA-003` remain explicitly deferred; do not start either automatically.
