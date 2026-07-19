# Gym App

A build-free, local-first workout PWA designed for personal use on iPhone.

## Repository layout

- Root HTML, CSS, and JavaScript files are the deployable app.
- `icons/` contains installable PWA icons.
- `tests/` contains dependency-free Node tests.
- `docs/` contains the product contract, workflow, backlog, and current handoff.
- `tools/iphone-preview.html` provides the local interactive phone frame.
- `references/` contains non-production UI concepts and generated design references.
- `artifacts/` holds ignored local archives and generated test output.

## Commands

```bash
npm run preview
npm run check
```

Open the app at `http://127.0.0.1:4173/` or the phone preview at `http://127.0.0.1:4173/tools/iphone-preview.html`.
