# Current Handoff

Updated: 2026-07-19

This file is the short current truth for resuming work. Replace stale details instead of appending a work log.

## Deployed baseline

- **Branch:** `main`; use the latest `git log -1` entry as the exact revision.
- **Service-worker cache:** `gym-schedule-v17`.
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

- **Goal:** complete `PWA-001` by isolating service-worker cache cleanup to gym-owned caches.
- **Acceptance:** an update removes obsolete `gym-schedule-*` caches while preserving unrelated caches; the current app shell and offline fallback still work; focused and full checks pass.
- **Out of scope:** update-reload behavior, offline error wording, UI, data, dependencies, and every other backlog item.
- **Status:** Repo verified.
- **Remaining:** Physical iPhone update confirmation.

## Work in progress

- `PWA-001` changes only gym-owned cache cleanup, synchronized version references, and focused tests. UI and stored-data behavior are unchanged.
- `_preview.html` is a local, untracked interactive iPhone-shaped preview and is intentionally not a production source.
- Other untracked templates, screenshots, archives, and references belong to the owner and must remain untouched unless requested.

## Last repository validation

- Version 17 passed `npm run check` with 24 tests, including an executable service-worker activation test proving unrelated caches survive.
- Manifest parsing, JavaScript/service-worker syntax, synchronized shell references, HTTP asset/MIME checks, and `git diff --check` passed.
- Firefox rendered the app from the version 17 service-worker cache with the local server stopped.
- A fresh verifier independently reported `PWA-001` clean. These checks do not establish physical iPhone update behavior.

## Owner/device verification pending

Before more UI redesign, check both Safari and the installed PWA on the iPhone:

1. Confirm Workout, Program, Library, and Log each scroll independently with long content.
2. Open an exercise from Workout and Library; confirm Targets, Notes, Alternatives, Watch video, and Edit exercise are reachable.
3. Add/edit/reorder/delete a test routine and add/edit/reorder/remove one routine entry.
4. Search Library and compare `Primary only` with `Primary + secondary` muscle filtering.
5. Mark/unmark today, edit a Log date and note, switch both themes, relaunch, and test offline.
6. Confirm Safari and standalone both receive the version 17 UI/assets and render correctly with nothing under the notch, home indicator, or bottom navigation. Their locally stored routines and history may differ because iOS can keep separate storage containers.

## Next safest action

Wait for the owner to choose `UI-002` (preserve prescription edits while reordering) as the next implementation slice. Do not start it automatically.
