# Current Handoff

Updated: 2026-07-24

This is the current recovery truth. Completed implementation and verification history belongs in Git.

## Baseline

| State | Revision | Schema | Cache | Verification |
| --- | --- | ---: | ---: | --- |
| Published `origin/main` | `df1f690` | 5 | 24 | Earlier owner-accepted release |
| Local `main` | `HEAD` — `Plan PPLPPL 7 implementation slices` | 8 | 37 | Slices 7–10 owner device verified; PPLPPL 7 changes are planning/reference only |

The owner verified the completed Workout, reference/video, Program-management, Library-picker, entry-editor, and grouped reorder flows on the target iPhone in Safari and the installed PWA.

## Current product state

- Workout is the compact execution view. Number/check, reference, and linked/unlinked video actions are distinct.
- Program manages multiple programs, their routines, and routine entries. Program and routine CRUD, duplicate, reorder, confirmation, and failure paths are implemented.
- Program entries are grouped Main then Optional with continuous numbering. Hold-drag and Earlier/Later remain within the current role; the entry editor deliberately changes role.
- The Library picker searches shared master exercises. Adding an exercise creates a routine-specific entry without changing the master.
- The exercise reference shows ordered targets, classification, routine/default prescription, notes, linked video, two external searches, and Easier/Similar/Harder relationships.
- Main-entry checks drive automatic completion. Optional checks persist without blocking completion. Log remains the explicit history editor.

## Architecture and data

- Build-free vanilla HTML, CSS, and JavaScript; no backend or production dependencies.
- `app.js` coordinates state, navigation, events, dialogs, saves, and drag behavior. Pure view markup lives in `ui/`.
- `storage.js` owns validation and persistent mutations. `data.js` owns controlled vocabularies and seed data.
- `styles.css` imports `styles/base.css`, `styles/components.css`, and `styles/views.css`.
- Barlow, Barlow Condensed, and IBM Plex Mono are self-hosted under `fonts/` and cached offline.
- Current storage is schema 8 under `gymAppStateV1`; production cache is 37.
- Pre-release data from older schema versions is disposable. Future development should support the current schema and current-format import/export without adding backward migrations unless the owner explicitly asks.

## Verification

- Manifest parsing and `git diff --check` pass.
- All 86 dependency-free checks pass.
- Changed flows were runtime-checked at 320 × 700 and 393 × 852, in both themes, including scrolling, focus, safe areas, failure rollback, persistence, and offline startup.
- Fresh bounded verifiers found no remaining correctness, regression, data-loss, accessibility, or plan-adherence issues in Slices 7–10.
- The owner confirmed the completed checkpoint on the target iPhone in Safari and the installed PWA.
- The tracked PPLPPL 7 raw source matches the supplied attachment byte-for-byte. The production manifest parses, `git diff --check` passes, and all 86 checks still pass.
- Fresh architecture, UI-contract, and documentation reviewers found no remaining material blocker in the PPLPPL 7 pre-start plan.

## Approved next direction

- `references/ui-concepts/ironworks-pplppl7.html` is the exact visual/interaction reference for named blocks, embedded Optional rows, programmed choices, scoped notes, Home Base, and their editors.
- The owner-provided program is preserved verbatim at `references/source-material/pplppl7-glute-specialization.txt`; the future tracked manifest, not the ignored workbook, will be the durable normalized data truth.
- Data review is split into bounded Slices 10E-A identity inventory, 10E-B program/editorial mapping, and 10E-C classification/integrity sign-off before schema or UI work.
- The next schema will replace singular entry exercise/prescription fields with ordered choices and will use `routine.entries` as its only entry-order source.
- Two pre-release resets are intentional: schema-shaped development defaults in 10F, then the final approved Library/program seed in 11D. No older-development-data migration is required.

## Next action

Begin Slice 10E-A only when the owner explicitly says to start it. Do not start schema, production UI, or content-normalization work as part of this planning checkpoint.
