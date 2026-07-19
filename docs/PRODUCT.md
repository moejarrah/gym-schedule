# Product Contract

## Purpose

One person uses this local-first PWA on their phone during gym and home workouts. The app should make the current routine quick to follow, keep exercise references close at hand, make the program easy to change, and retain lightweight workout history without an account or online service.

Success means the app is immediately usable between sets, saved data is dependable on the device, and the code remains simple enough to expand safely.

## Product character

Practical, focused, calm, and athletic. Avoid social feeds, competitive streak pressure, dense analytics, subscription-style onboarding, decorative marketing UI, gamification, and space-wasting chrome.

## Navigation roles

- **Workout** is for following the selected routine. It is the consumption view, not the program editor.
- **Program** is for creating and organizing routines and their exercise entries.
- **Library** is for finding and maintaining reusable master exercises.
- **Log** is for reviewing and editing dated completion history and notes.
- **Settings** is global appearance, data portability, reset, and training-rule reference.

These roles must remain visibly distinct even when they share the same underlying data.

## User-action contract

Every redesign or navigation change must keep these actions clearly reachable. Before implementation, record the old path and intended new path for every affected action.

### Workout

- Select any routine.
- See the routine's ordered exercise list and routine-specific prescriptions.
- Open an exercise reference without entering edit mode.
- In the exercise reference, see primary targets, secondary involvement, notes/cues, linked alternatives, and the routine prescription.
- Open a linked alternative's reference.
- Watch the linked exercise video when one exists.
- Deliberately enter the master exercise editor from the reference.
- Mark or unmark the selected routine completed today.
- Open Program through a clear `Manage program` path.

### Program

- Select any routine.
- Add a routine; edit its name, gym/home location, and required/optional status; delete it with confirmation.
- Reorder routines.
- Search the library and add an exercise to the selected routine.
- Open a routine entry to change only that entry's prescription.
- Hold and drag a routine entry to any position; earlier/later controls remain available as a non-drag fallback.
- Remove an entry from the routine without deleting its master exercise.

### Library

- Browse and search reusable master exercises by name, muscle, or category.
- Filter by muscle using either `Primary only` or `Primary + secondary` involvement, and optionally combine it with one category.
- Open exercise details before editing.
- Add, edit, duplicate, and delete a master exercise.
- Maintain name, default prescription, one primary muscle, secondary involvement, optional categories, notes/cues, optional YouTube reference, and linked alternatives.
- Deleting a master exercise clearly warns that its routine entries will also be removed.

### Log

- Move between calendar months.
- See which dates have completed routines or a note.
- Open any date, select completed routines, edit its note, and save it.
- Clearing all completions and the note removes that empty day record.

### Settings

- Switch light and dark themes.
- Export all app data as a compatible backup.
- Import a compatible backup with explicit replacement confirmation and visible failure messages.
- Restore starting data with explicit confirmation.
- Read the owner-provided training rules.

## Data meaning

- A master exercise owns its name, default prescription, primary/secondary targets, optional categories, notes, video, and alternatives.
- A routine entry references a master exercise and may override only the prescription for that routine.
- A routine owns its name, location, status, order, and ordered entries.
- A dated session owns completed routine IDs and one optional note. Weekly and calendar summaries are derived from sessions.
- Primary muscle means the intended target. Secondary involvement means the muscle participates but is not the exercise's main target.
- Categories describe exercise purpose or scope without pretending to be muscles. The current supported categories are `Mobility`, `Rehab`, and `Full Body`.
- `Rest` is not a routine placeholder. A day without a recorded workout is simply a day without a completion.

## Design and accessibility principles

- Put the current workout and next useful action first.
- Optimize for one-handed use between sets and efficient use of a narrow screen.
- Preserve history visibly and predictably; keep editing and recovery paths easy to trust.
- Use comfortable touch targets, readable contrast and type, clear non-color cues, reduced-motion support, and basic keyboard/screen-reader semantics.
- Add structure only when it makes future changes safer.
