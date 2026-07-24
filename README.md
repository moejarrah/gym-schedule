# Gym App

A build-free, local-first workout PWA designed for personal use on iPhone.

## Taking over

1. Read `AGENTS.md` for repository rules and boundaries.
2. Read `docs/HANDOFF_STATUS.md` for the deployed version, active slice, verification state, and next action.
3. Use `docs/PRODUCT.md` for behavior and `docs/IMPLEMENTATION_PLAN.md` for the approved remaining slices.
4. Read `docs/AUDIT.md` only when it lists a current owner-confirmed issue.

The live app is published from `main` at `https://moejarrah.github.io/gym-schedule/`.

## Repository layout

- Root HTML, CSS, and JavaScript files plus `styles/` and `ui/` are the deployable app.
- `fonts/` contains the self-hosted Ironworks typefaces used offline.
- `icons/` contains installable PWA icons.
- `tests/` contains dependency-free Node tests.
- `docs/` contains the product contract, implementation plan, workflow, current handoff, and open issues.
- `tools/iphone-preview.html` provides the local interactive phone frame.
- `references/` contains the approved non-production Ironworks concepts and classification reference.
- `artifacts/` holds ignored local archives and generated test output.

## Commands

```bash
npm run preview
npm run check
```

Open the app at `http://127.0.0.1:4173/` or the phone preview at `http://127.0.0.1:4173/tools/iphone-preview.html`.
