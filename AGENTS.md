# Gym App Working Agreement

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

- Treat existing localStorage data as valuable user data. Never clear, rename, or change the shape of stored data without a backward-compatible migration.
- Before a storage migration, preserve import/export compatibility and tell the user to export a backup.
- Use stable IDs for persistent records. Display names are editable text, not identifiers.
- Keep one source of truth for each fact. Derive calendar summaries and progress from completion/session records instead of maintaining duplicate stores.
- Surface failed saves or imports. Do not report success after a failed storage write.
- Workout content, pain rules, and rehabilitation instructions are user-owned data. Do not rewrite or medically reinterpret them unless explicitly requested.

## Change discipline

- Make the smallest complete change that solves the request. Avoid unrelated refactors, redesigns, formatting churn, and speculative features.
- Before a redesign, inventory every existing user action and confirm each remains clearly reachable afterward. Visual simplification must not hide or remove behavior.
- Preserve offline behavior, installability, light/dark themes, and current user data.
- Do not broaden work into authentication or internet-facing security unless requested. Local data-loss prevention remains in scope.
- Do not silently change workout meaning, progression rules, completion semantics, or calendar history.
- Ask before adding a production dependency or changing the architecture boundary above.

## Phone UI

- Design for the narrowest supported phone first, including 320 px width and standalone safe areas.
- Interactive targets should be at least 44 by 44 CSS pixels. Keep pinch zoom enabled and text comfortably readable.
- Verify light and dark themes, visible focus, reduced motion, and status cues that do not rely on color alone.
- Use familiar controls and plain language. Avoid decorative UI, gamification, dense dashboards, and unnecessary animation.

## Validation

- Serve locally with `python3 -m http.server 4173` and test from `http://127.0.0.1:4173/`.
- After JavaScript or manifest changes, run:

  ```bash
  node -e 'import("node:fs").then(f=>{JSON.parse(f.readFileSync("manifest.json","utf8"));console.log("manifest ok")})'
  npm run check
  ```

- Manually exercise every changed flow. For storage work, test save, reload, undo/delete, export, import, and migration from existing data as applicable.
- For UI work, check 320 px width, the actual target phone when available, both themes, keyboard focus, and no content hidden behind fixed navigation or safe areas.
- Runtime-check long-list scrolling plus every changed sheet/dialog at phone dimensions; static CSS inspection alone is not enough.
- When cached production assets change, verify the service-worker update and offline fallback behavior.
- If tests are added, prefer Node's built-in `node:test`; do not add a test framework without a demonstrated need.

## Definition of done

- The requested behavior works, existing stored data remains readable, and unrelated behavior is unchanged.
- Relevant checks pass, changed flows were exercised, and any untested device-only behavior is stated clearly.
- The final handoff lists changed files, validation performed, and remaining risks or follow-ups.

## Maintaining this file

- Keep `AGENTS.md` short and specific. It is an operating contract, not an architecture document or roadmap.
- Add a rule only for a recurring mistake, a non-obvious repository constraint, or an exact verification command.
- Remove stale rules. Do not duplicate rules already enforced mechanically by tests or tooling.
- Use `PRODUCT.md` for product intent and `AUDIT.md` for the current improvement backlog; read the relevant section only when the task needs it.
