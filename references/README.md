# Approved References

Nothing in this directory is loaded by the deployed PWA.

- `ui-concepts/ironworks.html` is the preserved Workout and component-system concept.
- `ui-concepts/ironworks-classification.html` covers Library, reference, filters, and exercise editing.
- `ui-concepts/ironworks-program.html` covers Program management and routine editing.
- `ui-concepts/ironworks-log-settings.html` covers Log, day editing, and Settings.
- `ui-concepts/ironworks-logging.html` is a preserved exploratory per-set logging and progress concept; it is not current production direction.
- `ui-concepts/ironworks-pplppl7.html` is the approved extension for named routine blocks, scoped notes, programmed choices, the embedded Optional slot, Home Base, and related editors.
- `ui-concepts/ironworks-flows.css` is shared only by the Program and Log/Settings concepts.
- `ui-concepts/club-card.html` and `ui-concepts/signal.html` are comparison companions linked from the preserved base concept; they are not production direction.
- `exercise-classification-study.md` records the approved vocabulary, rationale, and workbook boundary.
- `pplppl7-data-study.md` records the approved canonical naming, note ownership, routine-block, programmed-choice, manifest, and evidence rules for the owner-provided replacement program.
- `source-material/pplppl7-glute-specialization.txt` preserves the owner-provided source verbatim for the manifest audit.
- `data/pplppl7-manifest.json` is the tracked normalized, owner-approved manifest covering identities, program mapping, classifications, relationships, and the bounded external Library expansion.

The PPLPPL 7 concept’s layout and interaction direction are approved. Its illustrative exercise names and `New 6` notes must be replaced by the owner-reviewed manifest rather than copied verbatim into production.

Slices 10E-A through 10E-D produced the tracked `data/pplppl7-manifest.json` as the durable reviewed source for one seed program and one shared Library. PPLPPL 7 is not the app name or a separate Library: the production app remains Gym Schedule, supports any number of programs, and keeps one global exercise catalog that may contain valid exercises unused by the seed program.

The old ignored workbook under `artifacts/exports/` is unused and non-authoritative. A fresh review workbook may be generated from the approved manifest only if the owner asks; no workbook is required to build, validate, or hand off the app.

Run `node tools/validate-pplppl7-manifest.mjs --decisions` to verify the source checksum, identity catalog, complete program mapping, and zero pending owner decisions. `npm run check` includes the same validation without printing the decision list.

Rejected and superseded concepts are kept in Git history, not beside the approved sources.
