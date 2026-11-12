# References

Design and content background. Nothing here is loaded by the app.

## Design boards (`redesign/`)

The current design, agreed with the owner in November 2026: `workout.png`, `logging-sheet.png`, `history.png`, `log.png`, `library.png` and `program.png`, all in the dark theme at iPhone width. `docs/DESIGN.md` describes the system and lists where the app differs from these boards.

## Earlier UI concepts (`ui-concepts/`)

Static HTML mock-ups of the earlier square "Ironworks" design, kept as history; the app no longer looks like this. The two logging ideas were replaced by the logging sheet in `redesign/`. Open them in a browser.

| File | What it shows |
| --- | --- |
| `ironworks.html` | Workout screen and the base component style |
| `ironworks-program.html` | Program management and routine editing |
| `ironworks-classification.html` | Library, filters, exercise reference and editor |
| `ironworks-log-settings.html` | Log, day editor and Settings |
| `ironworks-pplppl7.html` | Routine blocks, notes, exercise choices and their editors |
| `ironworks-logging.html` | Earlier idea for per-set logging and progress |
| `ironworks-setlog-flow.html` | Earlier idea for a compact set-log flow (expand a row, fill sets, drop sets) |
| `ironworks-flows.css` | Styles shared by the Program and Log/Settings concepts |

## Starting program content

- `source-material/pplppl7-glute-specialization.txt` — the owner's original program text, kept verbatim.
- `data/pplppl7-manifest.json` — the reviewed, normalized version of that program and the exercise library. The app's starting data in `js/seed.js` was built from it; the two are no longer kept in sync automatically.
- `pplppl7-data-study.md` and `exercise-classification-study.md` — how names, notes, blocks, choices and exercise classifications were decided.
