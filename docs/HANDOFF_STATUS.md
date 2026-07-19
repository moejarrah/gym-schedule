# Current Handoff

Updated: 2026-07-20

This file is the short current truth for resuming work. Replace stale details instead of appending a work log.

## Deployed baseline

- **Branch:** `main`; use the latest `git log -1` entry as the exact revision.
- **Service-worker cache:** version 24 is published from `main`.
- **Current release:** version 24 contains the verified data/UI slices, repository organization, direct hold-and-drag routine ordering, and the iOS text-selection fix.
- **Stored-data schema:** version 5 under `gymAppStateV1`, with migrations from versions 1–4.
- **Architecture:** build-free vanilla HTML, CSS, and JavaScript; no production dependencies or backend.
- **Target device:** iPhone 15 Pro, iOS 17.x, Safari and Add to Home Screen.

## Active work

- **Status:** None. Version 24 is device verified and released.

## Current repository state

- The strict one-primary model is active; there is no legacy target-review state or special UI/filter branch.
- Exercise categories remain the deliberately small owner vocabulary: `Mobility`, `Rehab`, and `Full Body`; no additional categories are planned.
- The repository organization is committed and published on `main`.
- Repository documents now live in `docs/`; `AGENTS.md` and `README.md` remain at the root for immediate discovery.
- `tools/iphone-preview.html` is the local interactive iPhone-shaped preview and is intentionally not a production source.
- Design concepts live under `references/`; local archives and generated test output live under ignored `artifacts/` subfolders.
- Version 24 reorders routine exercises by hold-drag without highlighting text and does not change stored-data shape.

## Last repository validation

- Version 24 passes all 40 tests, manifest parsing, JavaScript/service-worker syntax, synchronized offline assets, served-source checks, and `git diff --check`.
- Coverage includes migrations from versions 1–4, strict muscle/category validation, import/export/reload, atomic routine-entry ordering, failed-write rollback, active-dialog errors, cache isolation, and production-shell invariants.
- The relocated iPhone preview loads the app with live refresh. Earlier runtime checks passed at 320 × 700 and 393 × 852 in both themes with long lists and dialogs.
- A fresh verifier found the drag touch/scroll split, tap suppression, arbitrary index mapping, rollback, cancellation, fallback controls, and cache synchronization clean.
- The owner completed the version-24 checklist on the target iPhone and confirmed Safari and Add to Home Screen behavior is good.

## Next safest action

Wait for the owner's next requested change. Do not infer work from old commits or chat history.
