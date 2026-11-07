# References

Design and content background. Nothing here is loaded by the app.

## UI concepts (`ui-concepts/`)

Static HTML mock-ups of the "Ironworks" design the app follows. Open them in a browser.

| File | What it shows |
| --- | --- |
| `ironworks.html` | Workout screen and the base component style |
| `ironworks-program.html` | Program management and routine editing |
| `ironworks-classification.html` | Library, filters, exercise reference and editor |
| `ironworks-log-settings.html` | Log, day editor and Settings |
| `ironworks-pplppl7.html` | Routine blocks, notes, exercise choices and their editors |
| `ironworks-logging.html` | Idea, not built: per-set logging and progress |
| `ironworks-setlog-flow.html` | Idea, not built: compact set-log flow (expand a row, fill sets, drop sets) |
| `ironworks-flows.css` | Styles shared by the Program and Log/Settings concepts |

## Starting program content

- `source-material/pplppl7-glute-specialization.txt` — the owner's original program text, kept verbatim.
- `data/pplppl7-manifest.json` — the reviewed, normalized version of that program and the exercise library. The app's starting data in `js/seed.js` was built from it; the two are no longer kept in sync automatically.
- `pplppl7-data-study.md` and `exercise-classification-study.md` — how names, notes, blocks, choices and exercise classifications were decided.
