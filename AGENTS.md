# Gym App Working Agreement

## Start here

- Read `HANDOFF_STATUS.md` before meaningful work. It is the current truth after interruptions or context loss.
- Read the relevant open items in `AUDIT.md`. It is the active backlog, not an automatic instruction to fix everything.
- Read `PRODUCT.md` before changing behavior, navigation, wording, or UI. Its user-action contract must remain reachable.
- Follow `WORKFLOW.md` for multi-file, storage-sensitive, redesign, release, or otherwise non-trivial work.
- The newest user request controls scope. Do not revive older ideas unless they remain recorded as open work.

## Product

- This is a personal, local-first phone PWA for following workouts and keeping lightweight history.
- Optimize for correctness, local data integrity, quick one-handed use, and easy maintenance.
- Keep the app build-free and understandable without specialized tooling.

## Architecture boundaries

- Production files are `index.html`, `styles.css`, `data.js`, `storage.js`, `app.js`, `manifest.json`, `icons/`, and `sw.js`. `package.json` only identifies ES modules and exposes dependency-free checks; there is no build step.
- Stay with vanilla HTML, CSS, and JavaScript. Do not add a framework, bundler, backend, account system, database, analytics, cloud sync, or production dependency unless the user explicitly asks.
- Prefer a direct change over a new abstraction. Extract a helper or module only when it removes real duplication, isolates stateful logic, or makes testing materially easier.
- If code is split, use a few plain CSS/JavaScript modules that run directly in the browser. Do not introduce a package manager solely for organization.
- `_preview.html`, `_template-*.html`, `svg/`, and `gym-app.zip` are references or artifacts, not production sources. Do not edit, deploy, or delete them unless asked.

## Data rules

- Treat existing localStorage data as valuable user data. Never clear, rename, or change stored data without a backward-compatible migration.
- Before a storage migration, preserve import/export compatibility and tell the user to export a backup.
- Use stable IDs for persistent records. Display names are editable text, not identifiers.
- Keep one source of truth for each fact. Derive calendar summaries and progress from completion/session records.
- Surface failed saves or imports. Do not report success after a failed storage write.
- Workout content, pain rules, and rehabilitation instructions are user-owned data. Do not rewrite or medically reinterpret them unless explicitly requested.

## Change discipline

- Work on one narrow slice at a time. State its goal, acceptance criteria, and meaningful exclusions before editing.
- Make the smallest complete change that solves the slice. Avoid unrelated refactors, redesigns, formatting churn, speculative edge cases, new dependencies, and optional abstractions.
- Before a redesign, map every affected action in `PRODUCT.md` from its old path to a clear new path. Visual simplification must not hide or remove behavior.
- Preserve offline behavior, installability, light/dark themes, current data, workout meaning, completion semantics, and calendar history.
- Do not broaden work into authentication or internet-facing security unless requested. Local data-loss prevention remains in scope.
- Ask before adding a production dependency or changing the architecture boundary.
- Put worthwhile out-of-scope ideas in `AUDIT.md`; do not silently add them to the active patch.

## Phone UI

- Design for the narrowest supported phone first, including 320 px width and standalone safe areas. The owner's target is iPhone 15 Pro on iOS 17.x.
- Interactive targets should be at least 44 by 44 CSS pixels. Keep pinch zoom enabled and text comfortably readable.
- Verify light and dark themes, visible focus, reduced motion, and status cues that do not rely on color alone.
- Use familiar controls and plain language. Avoid decorative UI, gamification, dense dashboards, unnecessary animation, and space-wasting headings or controls.

## Validation

- Serve locally with `npm run preview` and test from `http://127.0.0.1:4173/`. `_preview.html` is the local iPhone-shaped interactive preview.
- After JavaScript or manifest changes, run:

  ```bash
  node -e 'import("node:fs").then(f=>{JSON.parse(f.readFileSync("manifest.json","utf8"));console.log("manifest ok")})'
  npm run check
  ```

- Manually exercise every changed flow. For storage work, test save, reload, undo/delete, export, import, and migration as applicable.
- For UI work, runtime-check 320 × 700 and 393 × 852, both themes, long-list scrolling, keyboard focus, safe areas, and every changed dialog/action. Static inspection is insufficient.
- Actual Safari and installed-PWA behavior must be labeled `Device verification pending` until the owner checks it on the target iPhone.
- When cached production assets change, update and verify the service-worker cache and offline fallback.
- If tests are added, prefer Node's built-in `node:test`; do not add a test framework without demonstrated need.

## Agents and review

- Use subagents only for concrete, bounded, independent exploration or verification when requested or when the task genuinely benefits. Prefer read-only assignments.
- Do not let multiple agents edit overlapping files. The main agent owns scope, decisions, integration, final checks, and status docs.
- Verifiers report only correctness, regression, data-loss, accessibility, and unmet-requirement issues. Optional polish belongs in `AUDIT.md`.

## Definition of done

- The acceptance criteria pass, existing data remains readable, every affected product action remains reachable, and unrelated behavior is unchanged.
- Relevant automated and runtime checks pass. Device-only behavior is reported honestly and is not called done early.
- Review the final diff, update only the docs whose truth changed, and report changed files, evidence, and remaining risks.

## Maintaining these instructions

- Keep this file short, practical, and stable. Add a rule only for a recurring mistake, non-obvious repository constraint, or exact verification command.
- Put product meaning in `PRODUCT.md`, work procedure in `WORKFLOW.md`, current state in `HANDOFF_STATUS.md`, and open work in `AUDIT.md`.
- Remove stale rules. Do not duplicate rules already enforced mechanically.
