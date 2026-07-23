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

## Product hierarchy

```text
Program
└── Ordered routines / workout days
    └── Ordered routine entries
        └── Reference one global master exercise
```

- A **program** is a complete training block, such as the current PPL cycle with its rehab, mobility, and home days.
- A **routine** is one workout day, such as Push A. A routine belongs to exactly one program.
- A **routine entry** places one master exercise in one routine and owns that routine-specific prescription and Main/Optional role.
- A **master exercise** lives once in the global Library and may be referenced by entries in many programs.
- Several programs may be saved, but exactly one is active when any program exists. Switching programs changes the routines shown in Workout and Program; it never changes the global Library or past sessions.
- If the selected routine is not in the newly active program, select that program’s first routine; an empty program has no selected routine.

## User-action contract

Every redesign or navigation change must keep these actions clearly reachable. Before implementation, record the old path and intended new path for every affected action.

### Workout

- See and switch the active program.
- Select any routine.
- See the routine's ordered exercise list and routine-specific prescriptions.
- Open an exercise reference without entering edit mode.
- In the exercise reference, see ordered targets, classification, notes/cues, related exercises, and the routine prescription.
- Open a related exercise's reference.
- Watch the linked exercise video when one exists.
- Deliberately enter the master exercise editor from the reference.
- Check or uncheck entries for today; routine completion follows the Main-entry rule.
- Open Program through a clear `Manage program` path.

### Program

- See and switch the active program.
- Create an empty program or duplicate an existing one; rename or delete a program with confirmation. Deletion removes that program’s routines and history but never its global master exercises.
- Select any routine.
- Add a routine; edit its name, gym/home location, and required/optional status; delete it with confirmation.
- Reorder routines.
- Search the library and add an exercise to the selected routine.
- Open a routine entry to change only that entry's prescription and Main/Optional role.
- Hold and drag a routine entry to any position; earlier/later controls remain available as a non-drag fallback.
- Remove an entry from the routine without deleting its master exercise.

### Library

- Browse and search reusable master exercises by name, target, or movement.
- Filter by target using either `Primary only` or `Primary + secondary`, and combine it with movement, equipment, or purpose when useful.
- Open exercise details before editing.
- Add, edit, duplicate, and delete a master exercise.
- Maintain name, default prescription, one or two ordered primary targets, meaningful secondary involvement, movement, equipment, purpose, notes/cues, optional YouTube reference, and related exercises.
- Deleting a master exercise clearly warns that its routine entries will also be removed.

### Log

- Move between calendar months.
- See which dates have completed routines or a note.
- Open any date, select completed routines, edit its note, and save it.
- Clearing all entry checks, completions, and the note removes that empty day record.

### Settings

- Switch light and dark themes.
- Export all app data as a compatible backup.
- Import a compatible backup with explicit replacement confirmation and visible failure messages.
- Restore starting data with explicit confirmation.
- Read the owner-provided training rules.

## Data meaning

- A program owns its editable name and ordered `routineIds`; that list is the only source of routine membership and ordering.
- A routine owns its name, gym/home location, required/optional status, and ordered entries.
- A routine entry references a master exercise and owns its prescription plus its Main/Optional role for that routine.
- A master exercise owns stable classification, default prescription, notes, video, and related-exercise links. Editing its name never changes its ID.
- Duplicating a program creates new program, routine, and entry IDs while reusing the same global master-exercise IDs.
- A dated session owns completed routine IDs, checked entry IDs grouped by routine, and one optional note. Weekly and calendar summaries are derived from sessions.
- Deleting an entry or routine cleans its saved checks. Switching programs never rewrites sessions.
- `Rest` is not a routine placeholder. A day without a recorded workout is simply a day without a completion.

### Completion meaning

- In Workout, Main entries determine routine completion. A routine auto-completes only when it has at least one Main entry and every Main entry is checked for that date; unchecking any Main entry removes that completion.
- Empty routines and routines containing only Optional entries never auto-complete. They may still be marked complete deliberately in Log.
- Optional entries can be checked and saved but never block routine completion.
- An exercise with Rehab purpose is not automatically Optional. Entry role is chosen independently in each routine.
- Tapping an entry’s number/check control changes completion. Tapping the rest of the row opens the exercise reference.
- Log is an explicit history editor: marking a routine complete adds its routine ID and checks its current Main entries; unmarking it removes the routine ID and clears that routine’s saved entry checks for the date.
- Migrated routine-only completions remain valid historical facts even when they have no entry-check detail. Migration must not invent old checks, and later routine edits must not recalculate past completion.

### Classification meaning

- Primary targets are ordered: one or two are allowed, and item 1 is the dominant target shown in compact rows.
- Secondary targets record meaningful involvement, not every stabilizer. A target cannot be both primary and secondary.
- Movement pattern has one controlled value; equipment has one or more controlled values.
- Purpose is Strength, Mobility, or Rehab. Purpose describes why an exercise exists, not which body part it trains.
- Style, laterality, support, emphasis, and typical challenge are optional. Uncertain optional facts stay blank.
- Push, Pull, Legs, Glutes, Core, Arms, Forearms, Neck, and Full body are derived browse groups, not manually edited classification.
- Related exercises use one relationship list: Similar means an alternative, while Easier and Harder provide progression.
- Search and filters use OR within one filter group and AND across different groups. `Primary only` is the default target scope; `Primary + secondary` broadens it without changing saved data.
- Sets, reps, tempo, pauses, partial range, and routine-specific setup belong to the routine entry, not master classification.

## Design and accessibility principles

- Put the current workout and next useful action first.
- Optimize for one-handed use between sets and efficient use of a narrow screen.
- Preserve history visibly and predictably; keep editing and recovery paths easy to trust.
- Use comfortable touch targets, readable contrast and type, clear non-color cues, reduced-motion support, and basic keyboard/screen-reader semantics.
- Add structure only when it makes future changes safer.
