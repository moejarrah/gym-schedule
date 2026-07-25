# Local Artifacts

This directory is not part of the deployed app.

- `legacy/` stores local historical archives.
- `exports/` stores editable local data exports such as Excel workbooks.
- `test-results/` stores generated tool output.

Exports, archive files, and test output are ignored by Git.

`exports/Gym App Data.xlsx` is an old generated review artifact. It is not read by the app, is not a source for the approved replacement data, and may be deleted without affecting the project. Generate a new workbook from the tracked manifest only if the owner later asks for one.
