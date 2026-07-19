# Current Handoff

Updated: 2026-07-19

This file is the short current truth for resuming work. Replace stale details instead of appending a work log.

## Deployed baseline

- **Branch:** `main`; use the latest `git log -1` entry as the exact revision.
- **Service-worker cache:** `gym-schedule-v18`.
- **Stored-data schema:** version 3 under `gymAppStateV1`, with migrations from versions 1 and 2.
- **Architecture:** build-free vanilla HTML, CSS, and JavaScript; no production dependencies or backend.
- **Target device:** iPhone 15 Pro, iOS 17.x, Safari and Add to Home Screen.

## Accepted product direction

- Workout, Program, Library, and Log have distinct roles defined in `PRODUCT.md`.
- Exercise reference content includes targets, notes/cues, alternatives, and an optional video.
- Master exercise editing is separate from routine-entry prescription/order editing.
- Muscle filtering distinguishes primary targets from primary-plus-secondary involvement.
- Routines and their entries can be added, edited, removed, and reordered. `Rest` is not a placeholder routine.
- The interface should be compact, functional, and good-looking without grids, decorative waste, or space-heavy completion controls.

## Active slice

- **Goal:** complete `UI-002` by preserving routine-entry prescription edits when moving the entry earlier or later.
- **Acceptance:** the edited prescription and new position persist together in one write; a failed write leaves the editor and typed text intact; the master exercise remains unchanged.
- **Out of scope:** dialog error presentation, other editors, UI redesign, data-schema changes, dependencies, and every other backlog item.
- **Status:** Repo verified.
- **Remaining:** Physical iPhone interaction confirmation.

## Work in progress

- `UI-002` changes only routine-entry reorder persistence, focused state tests, and synchronized cache references.
- `_preview.html` is a local, untracked interactive iPhone-shaped preview and is intentionally not a production source.
- Other untracked templates, screenshots, archives, and references belong to the owner and must remain untouched unless requested.

## Last repository validation

- Version 18 passed `npm run check` with 26 tests, including atomic prescription-plus-reorder persistence, reload, master isolation, failed writes, and the service-worker cache-isolation test.
- Manifest parsing, JavaScript/service-worker syntax, synchronized shell references, HTTP asset/MIME checks, and `git diff --check` passed.
- Firefox rendered the unchanged layout at 320 × 700 and 393 × 852.
- A fresh verifier independently reported the `UI-002` production patch clean. Scripted modal interaction and physical iPhone behavior were not available, so device interaction remains pending.

## Owner/device verification pending

Before more UI redesign, check both Safari and the installed PWA on the iPhone:

1. Confirm Workout, Program, Library, and Log each scroll independently with long content.
2. Open an exercise from Workout and Library; confirm Targets, Notes, Alternatives, Watch video, and Edit exercise are reachable.
3. Add/edit/reorder/delete a test routine and add/edit/reorder/remove one routine entry.
4. Search Library and compare `Primary only` with `Primary + secondary` muscle filtering.
5. Mark/unmark today, edit a Log date and note, switch both themes, relaunch, and test offline.
6. Confirm Safari and standalone both receive the version 18 UI/assets and render correctly with nothing under the notch, home indicator, or bottom navigation. Their locally stored routines and history may differ because iOS can keep separate storage containers.

## Next safest action

Wait for the owner to choose `UI-003` (make failures visible inside modal dialogs) as the next implementation slice. Do not start it automatically.
