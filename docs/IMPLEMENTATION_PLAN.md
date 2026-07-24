# Ironworks Implementation Plan

Status: planning Slice 11
Current checkpoint: Slices 7–10 owner verified
Next decision: approve the detailed Library slice boundaries before implementation

## Goal

Finish the owner-approved Ironworks interface without changing the product hierarchy or introducing unnecessary architecture. The durable behavior contract lives in `PRODUCT.md`; the work method and verification gates live in `WORKFLOW.md`.

## Approved sources

- `references/ui-concepts/ironworks.html`: Workout density and base component direction.
- `references/ui-concepts/ironworks-classification.html`: Library, filters, reference, relationships, and master editor.
- `references/ui-concepts/ironworks-program.html`: Program management.
- `references/ui-concepts/ironworks-log-settings.html`: Log, day editor, Settings, and failure states.
- `references/ui-concepts/ironworks-flows.css`: shared reference-only Program and Log/Settings styles.
- `references/exercise-classification-study.md`: approved classification vocabulary.

Production should reproduce the approved dark-first charcoal/bone system, cobalt state/action color, compact rows, focused sheets, and self-hosted typography at 320 px and 393 px. `PRODUCT.md` overrides older terminology preserved in a reference.

## Architecture boundary

- Build-free vanilla HTML, CSS, and JavaScript.
- `app.js` coordinates state, navigation, events, dialogs, saves, and drag behavior.
- `ui/` contains pure view markup helpers.
- `storage.js` owns current-schema validation, mutations, and current-format import/export.
- `data.js` owns controlled vocabularies and seed data.
- `styles.css` imports base, reusable components, then view-specific styles.
- Do not add a framework, bundler, router, generic controller layer, backend, account, sync, analytics, or production dependency.
- Do not split `app.js` for line count alone. Reassess ownership during final consolidation after the remaining views exist.
- Pre-release data from older schemas is disposable. Do not add backward migrations unless the owner explicitly asks.

## Completed checkpoint

The Ironworks foundation, Workout execution, reference/video flows, Program management, Library picker, routine-entry editor, and grouped role-scoped reorder are complete through Slice 10. Exact revision, schema/cache, and verification truth belong in `HANDOFF_STATUS.md`; detailed history belongs in Git.

## Remaining sequence

Each implementation slice stops after complete repository/runtime checks, a fresh bounded verifier, and owner assessment.

1. **Slice 11A — Library browse and filters**
2. **Slice 11B — Master exercise editing and relationships**
3. **Slice 12A — Log and day editor**
4. **Slice 12B — Settings and current-format data portability**
5. **Slice 13 — Consolidate and release**

Slice 11 must be planned in detail before implementation. It must preserve every Library action in `PRODUCT.md`, reuse the completed exercise-reference flow, and keep routine-entry fields out of master-exercise editing.

Slice 13 removes confirmed superseded markup, CSS, helpers, old-schema compatibility branches, and their tests. It also reviews module ownership, synchronizes cache/version references, and performs the complete automated, runtime, offline, current-format import/export, and fresh-verifier pass.

Release only after the owner confirms Safari and installed-PWA behavior on the target iPhone.

## Explicit exclusions

- Backend, accounts, cloud sync, analytics, or internet-facing security work.
- Framework, bundler, TypeScript conversion, CSS framework, or generic component engine.
- Automatic programming, recommendations, scheduling engine, or dense analytics.
- Biomechanics percentages, stabilizer databases, joint models, or web-generated classification.
- Social features, streaks, gamification, or decorative dashboard content.
- Unreproduced service-worker lifecycle edge cases.
