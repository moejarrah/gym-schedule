# Active Improvement Backlog

This file contains only open or deferred work. It is not permission to start every item. The active slice is chosen with the owner and recorded in `HANDOFF_STATUS.md`.

Status values: `Open`, `Planned`, `In progress`, `Repo verified`, `Device verified`, `Deferred`.

## UI-001 — Accept version 16 on the target iPhone

- **Status:** Repo verified
- **Priority:** P0 before more UI redesign
- **Evidence:** Automated checks and local review passed, and version 16 restored the paths the owner reported missing. Safari and installed-PWA behavior have not been confirmed after those repairs.
- **Risk:** Scrolling, safe areas, dialogs, cached assets, or feature discovery may differ on iOS 17.x from the desktop preview.
- **Acceptance:** On iPhone 15 Pro, both Safari and Add-to-Home-Screen modes receive the version 16 UI/assets; all four tabs and sheets scroll and render safely; and the owner can complete every action in `PRODUCT.md` without mixed master-exercise/routine-entry editing. The two modes may hold different local data.
- **Next action:** Owner runs the short device checklist in `HANDOFF_STATUS.md` and reports screenshots or exact failures. Turn each failed action into one narrow issue.

## DATA-001 — Require one primary muscle for every exercise

- **Status:** Open
- **Priority:** P1
- **Evidence:** `PRODUCT.md` defines one dominant target, but the editor offers `Not set`, saving can produce an empty `primaryMuscles` array, and validation currently accepts it.
- **Risk:** `Primary only` filtering can omit uncategorized exercises and weaken the intended distinction between direct targeting and secondary involvement.
- **Acceptance:** New and edited exercises require exactly one primary muscle; secondary choices exclude it; existing empty-primary records are handled without data loss; imports and migrations remain compatible.
- **Next action:** Plan a storage-sensitive slice covering editor validation, state validation/migration behavior, import compatibility, and focused tests before changing production code.

## DX-001 — Decide whether browser automation is worth adding

- **Status:** Deferred
- **Priority:** P2
- **Evidence:** Current tests cover state and static shell invariants but cannot prove actual scrolling, dialog interaction, or Safari-versus-standalone rendering.
- **Risk:** UI regressions depend heavily on manual checks. Adding tooling now could overengineer a small build-free app.
- **Acceptance:** Add dev-only automation only if the same class of runtime regression recurs and the owner approves the tooling tradeoff.
- **Next action:** Keep manual runtime and device gates. Revisit only after demonstrated repeated need.

## Adding an item

Use a stable ID and include `Status`, `Priority`, `Evidence`, `Risk`, observable `Acceptance`, and one `Next action`. Keep optional polish out of the current patch. Remove completed entries after device acceptance; durable product truth belongs in `PRODUCT.md`, not here.
