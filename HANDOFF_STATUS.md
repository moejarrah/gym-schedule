# Current Handoff

Updated: 2026-07-19

This file is the short current truth for resuming work. Replace stale details instead of appending a work log.

## Deployed baseline

- **Branch/commit:** `main` at `64ae64a` (`Restore workout flows and mobile scrolling`), matching `origin/main` before this documentation update.
- **Service-worker cache:** `gym-schedule-v16`.
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

- **Goal:** install a concise, professional workflow and recovery method for future work.
- **Acceptance:** stable instructions, durable product actions, current status, open backlog, resume procedure, and phone/release gates have one clear owner document each; no production behavior changes.
- **Out of scope:** UI fixes, new features, data changes, dependencies, and publishing a new PWA cache.
- **Status:** Repo verified.

## Work in progress

- Production app files are unchanged in this slice.
- `_preview.html` is a local, untracked interactive iPhone-shaped preview and is intentionally not a production source.
- Other untracked templates, screenshots, archives, and references belong to the owner and must remain untouched unless requested.

## Last repository validation

- Version 16 previously passed `npm run check` with 23 tests covering JavaScript/service-worker syntax, stored-data behavior and migrations, manifest/icon references, versioned shell references, narrow-layout selectors, viewport configuration, and presence of core feature controls.
- The version 16 repair received an independent code verifier pass.
- Those checks do not establish HTTP MIME behavior, a full accessibility audit, or physical iPhone behavior.

## Owner/device verification pending

Before more UI redesign, check both Safari and the installed PWA on the iPhone:

1. Confirm Workout, Program, Library, and Log each scroll independently with long content.
2. Open an exercise from Workout and Library; confirm Targets, Notes, Alternatives, Watch video, and Edit exercise are reachable.
3. Add/edit/reorder/delete a test routine and add/edit/reorder/remove one routine entry.
4. Search Library and compare `Primary only` with `Primary + secondary` muscle filtering.
5. Mark/unmark today, edit a Log date and note, switch both themes, relaunch, and test offline.
6. Confirm Safari and standalone both receive the version 16 UI/assets and render correctly with nothing under the notch, home indicator, or bottom navigation. Their locally stored routines and history may differ because iOS can keep separate storage containers.

## Next safest action

Wait for the owner's iPhone observations. Convert each confirmed failure into one issue and address one narrow slice at a time; do not begin another broad redesign from inference. `DATA-001` is the first known product gap, but it should not start until the owner chooses it as the active slice.
