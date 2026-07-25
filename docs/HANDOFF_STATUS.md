# Current Handoff

Updated: 2026-07-25

Read this file first after an interruption, compaction, or handoff. It records only current recovery truth; completed implementation history belongs in Git.

## Snapshot

| State | Revision | Schema | Cache | Verification |
| --- | --- | ---: | ---: | --- |
| Published `origin/main` | `df1f690` | 5 | 24 | Earlier owner-accepted release |
| Local `main` | `96ee1d4` plus uncommitted Slices 10E–11D | 9 | 44 | Slices 10G–11C owner/device verified; Slice 11D repository/runtime verified and device verification pending |

The cumulative uncommitted working tree is intentional. It contains the approved PPLPPL 7 manifest work, the Slice 10F schema implementation, Slice 10G routine blocks/scoped notes, Slice 10H programmed-choice UI, Slice 11A Library browse/filters, Slice 11B master editor, Slice 11C relationships/deletion, and the Slice 11D replacement seed. Do not discard, partially revert, or split it without first reviewing the full diff. No commit has been requested yet.

`docs/AUDIT.md` has no confirmed open issue.

## Current product and architecture

- Workout is the compact execution view; Program owns program/routine/entry management; Library owns reusable masters; Log owns dated history.
- The build-free app uses vanilla HTML, CSS, and JavaScript with no backend or production dependency.
- `app.js` coordinates state, events, dialogs, and drag behavior. Pure view markup is in `ui/`.
- `storage.js` owns schema validation and persistent mutations. `data.js` owns controlled vocabularies and the approved restored starting seed.
- `styles.css` imports the three plain CSS modules under `styles/`; local fonts and the app shell are cached for offline use.
- Current storage is schema 9 under `gymAppStateV1`.
- Schema 9 supports aliases, scoped program/routine/entry notes, ordered routine blocks, and ordered non-empty exercise choices with per-choice prescriptions.
- Slice 10G activates generic routine blocks and program/routine/entry notes in Workout, Program, references, and the existing editors. Entry ordering is block-scoped and independent of Main/Optional role.
- Slice 10H activates canonical derived choice titles, compact Workout choice sheets, one-slot completion, and ordered per-choice authoring in the existing Program entry editor. Choice prescriptions are required local entry data and never fall back silently to master defaults.
- Slice 11A activates the Ironworks Library app bar, normalized search, result-bearing derived browse groups, direct primary/combined target scope, compact reference-opening rows, and a session-only draft filter sheet. It does not change stored exercises or the existing master editor/reference flows.
- Slice 11B activates the full-height Add/Edit/Duplicate master editor, aliases, every essential and optional classification field, focused controlled-value pickers, safe-area-aware fixed save actions, and one atomic exercise/relationship upsert. It preserves stable edit IDs, routine references, current relationship values, and Program-owned execution fields.
- Slice 11C activates linked-first searchable relationship editing with explicit Easier/Alternative/Harder direction, removal, draft cancellation, and atomic reciprocal saves. Exercise deletion now reports exact programmed-use and cleanup categories before preserving or removing choices, slots, checks, and incoming links through the existing storage boundary.
- Slice 11D installs the metadata-free approved manifest projection as the sole restored starting state: 177 canonical masters, one generic PPLPPL 7 program, ten ordered routines, 24 blocks, 156 entries, and 184 choices. Existing valid schema-9 device data remains unchanged until the user deliberately chooses `Restore starting data`.
- Older pre-release schemas and import envelopes are deliberately unsupported. Current-schema saves and current-format backups remain protected.

## Approved replacement content

- The untouched owner source is `references/source-material/pplppl7-glute-specialization.txt`.
- `references/data/pplppl7-manifest.json` is the sole normalized content source. It is owner-approved with no pending identity, program, expansion, classification, or relationship decision.
- The validated manifest contains 177 canonical masters, 31 aliases, 33 relationships, one program, ten routines, 24 blocks, 156 entries, and 184 choices.
- `references/ui-concepts/ironworks-pplppl7.html` is the exact interaction/visual reference for blocks, scoped notes, choices, Home Base, and their editors.
- The old workbook under `artifacts/exports/` is ignored and non-authoritative.

## Verification truth

- Manifest parsing, the approved PPLPPL 7 manifest validator, and `git diff --check` pass.
- All 78 dependency-free checks pass.
- Slice 10G was runtime-checked at 320 × 700 and 393 × 852 in both themes. Evidence covers named/mixed/empty blocks, continuous numbering, scoped-note display/editing, block-scoped add, Earlier/Later and hold-drag reorder, preserved roles/history, dialog scrolling/focus return, safe viewport geometry, browser-error monitoring, and cache-39 offline startup.
- A fresh read-only Slice 10G verifier found no confirmed issue, then rechecked the final integrated state with 71 passing checks and a clean diff.
- Slice 10H was runtime-checked at 320 × 700 and 393 × 852 in both themes. Evidence covers derived titles/prescriptions, one-slot checks, direct one-choice references, separate per-choice reference/video actions, add/remove/promote/Earlier/Later/prescription editing, duplicate and blank-prescription guards, atomic save failure, reload, long scrolling, focus return, safe viewport geometry, browser-error monitoring, and cache-40 offline startup.
- A fresh read-only Slice 10H verifier found stale-sheet and blank-prescription integrity defects plus a follow-on refresh-focus defect. All three were corrected and replayed through their exact runtime paths; the final verifier recheck found no remaining confirmed issue.
- Slice 11A was runtime-checked at 320 × 700 and 393 × 852 in both themes. Evidence covers punctuation-tolerant search, result-bearing quick groups, primary/combined target scope, composed faceted filters, group-count badges, draft Clear/cancel/apply, distinct empty/no-result recovery, reference/add paths, session-only state, independent and horizontal scrolling, fixed filter footer, 44 px controls, safe viewport geometry, browser-error monitoring, and cache-41 offline startup.
- A fresh read-only Slice 11A verifier found one missing Library-search keyboard focus indicator. The focus state and regression assertion were added; the same verifier rechecked both phone sizes/themes and confirmed the issue resolved with no regression.
- Slice 11B was runtime-checked at 320 × 700 and 393 × 852 in both themes. Evidence covers explicit Add/Edit/Duplicate modes, required and YouTube errors with retained drafts and focused fields, aliases, essential and optional classification set/clear, primary/secondary exclusion, equipment/emphasis pickers, unchanged and reciprocal relationships, fresh duplicates with no routine use, independent scrolling, fixed safe-area footer, keyboard-visible focus, focus return, browser-error monitoring, and cache-42 offline startup.
- A fresh read-only Slice 11B verifier found no confirmed correctness, regression, data-integrity, accessibility, scope, cache, or acceptance issue in the final integrated state.
- Slice 11C was runtime-checked at 320 × 700 and 393 × 852 in both themes. Evidence covers linked-first long-list scrolling, normalized name/classification search, Alternative defaults, Easier/Alternative/Harder changes, remove, nested Cancel, draft-only Done, master Save/cancel, reciprocal reference refresh, duplicate isolation, zero/one/several-use deletion summaries, injected write failure, mixed alternative/promotion/slot cleanup, preserved checks/history, safe areas, focus return, reduced motion, browser-error monitoring, and cache-43 offline startup.
- A fresh read-only Slice 11C verifier found no confirmed correctness, regression, data-integrity, accessibility, scope, cache, or acceptance issue in the final integrated state.
- Slice 11D was runtime-checked at 320 × 700 and 393 × 852 in both themes. Evidence covers the exact manifest-derived counts and order, absence of review/source metadata, preservation of current schema-9 data until Restore, restore cancel/success/injected-write-failure paths, all ten routine tabs, Home Base’s pinned note/seven blocks/52 Optional entries, no Optional auto-completion, programmed choices, complete Program and Library lists, unused-master search, independent and horizontal scrolling, visible focus, safe viewport geometry, browser-error monitoring, and cache-44 offline startup.
- A fresh read-only Slice 11D verifier independently reproduced the exact metadata-free manifest projection and found no confirmed correctness, regression, data-integrity, accessibility, scope, cache, or acceptance issue.
- The owner verified Slices 7–11C on the target iPhone in Safari and the installed PWA.
- The owner confirmed schema 9/cache 38 on the target iPhone. Slice 10F is device verified and accepted.
- Slice 11D Safari and installed-PWA verification is pending on the target iPhone.

## Next action

Owner device-verifies Slice 11D on the target iPhone and assesses the Slice 12A specification. Do not start Log/day-editor implementation without explicit approval.
