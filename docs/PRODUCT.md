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
    └── Ordered routine blocks
        └── Ordered routine entries
            └── Reference one or more global master exercises
```

- A **program** is a complete training block, such as the current PPL cycle with its rehab, mobility, and home days.
- A **routine** is one workout day, such as Push A. A routine belongs to exactly one program.
- A **routine entry** is one completable slot in a routine. It owns an ordered non-empty list of master-exercise choices with nonblank per-choice prescriptions, plus its block, programming note, and Main/Optional role. The first choice is preferred.
- A **master exercise** lives once in the global Library and may be referenced by entries in many programs.
- Several programs may be saved, but exactly one is active when any program exists. Switching programs changes the routines shown in Workout and Program; it never changes the global Library or past sessions.
- If the selected routine is not in the newly active program, select that program’s first routine; an empty program has no selected routine.

## User-action contract

Every redesign or navigation change must keep these actions clearly reachable. Before implementation, record the old path and intended new path for every affected action.

### Workout

- See and switch the active program.
- Select any routine.
- See the routine's ordered blocks and exercise slots, with continuous numbering, canonical choice names, routine-specific prescriptions, and compact programming-note previews.
- Read a nonempty routine note below the routine tabs without losing the independently scrolling exercise list.
- Open a one-choice slot's exercise reference directly without entering edit mode. A multi-choice slot first opens a compact choice sheet; each choice has separate reference and video actions, and the first choice is preferred.
- In the exercise reference, see the selected choice's routine prescription and the shared routine-entry note separately from the master exercise's ordered targets, classification, notes/cues, and related exercises.
- Open a related exercise's reference.
- Watch the linked exercise video when one exists. A multi-choice row's trailing video uses the preferred choice, while its choice sheet exposes a video action for every choice.
- Deliberately enter the master exercise editor from the reference.
- Check or uncheck entries for today; routine completion follows the Main-entry rule.
- Open Program through a clear `Manage program` path.

### Program

- See and switch the active program.
- Create an empty program or duplicate an existing one; edit its name and shared program note; delete it with confirmation. Deletion removes that program’s routines and history but never its global master exercises.
- Read shared program rules through one compact disclosure.
- Select any routine.
- Add a routine; edit its name, gym/home location, required/optional status, routine note, and ordered blocks; delete it with confirmation.
- Reorder routines.
- Add, rename, reorder, and delete empty routine blocks. Hold-drag and Earlier/Later are equivalent ordering paths; populated blocks cannot be deleted.
- Search the Library and add an exercise to a deliberate block in the selected routine.
- Open a routine entry to add or remove Library-backed choices, edit each choice's prescription, reorder choices with Earlier/Later, make any choice preferred, and change only that entry's Main/Optional role, block assignment, and programming note.
- Hold and drag a routine entry to any position within its current block; Earlier/Later controls remain available as a non-drag fallback. Main and Optional entries may cross while retaining their roles because role controls completion, not display order. Change block deliberately in the entry editor.
- Remove an entry from the routine without deleting its master exercise.

### Library

- Browse and search reusable master exercises by name, target, or movement.
- Filter by target using either `Primary only` or `Primary + secondary`, and combine it with movement, equipment, or purpose when useful.
- Open exercise details before editing.
- Add, edit, duplicate, and delete a master exercise.
- Maintain canonical name, aliases, default prescription, one or two ordered primary targets, meaningful secondary involvement, movement, equipment, purpose, optional style/laterality/support/emphasis/challenge, notes/cues, optional YouTube reference, and related exercises.
- Deleting a master exercise clearly reports its programmed uses, relationship cleanup, alternative removals, next-choice promotions, and slots that will be deleted with their saved checks. Each matching choice is removed; a routine slot is removed only when no choice remains.

### Log

- Move between calendar months.
- See which dates have completed routines or a note.
- Reopen any of the eight most recent nonempty dates from the list below the calendar.
- Open any date, select completed routines from the active program in stored order, edit its note, and save it.
- A past date also exposes routines already recorded from another saved program, clearly labeled as inactive. It does not offer new completions from inactive programs.
- Clearing all entry checks, completions, and the note removes that empty day record.

### Settings

- Switch light and dark themes.
- Export all app data as a compatible backup.
- Import a compatible backup with explicit replacement confirmation and visible failure messages.
- Restore starting data with explicit confirmation.
- Read the owner-provided training rules.

## Data meaning

- A program owns its editable name, note, and ordered `routineIds`; that list is the only source of routine membership and ordering.
- A routine owns its name, gym/home location, required/optional status, note, ordered blocks, and ordered entries. Blocks contain no entry-ID list; each entry stores its block ID.
- A routine entry owns ordered `{ exerciseId, prescription }` choices, block ID, programming note, and Main/Optional role. Its displayed title is derived from current canonical master names joined by lowercase `or`; the first choice is preferred. `routine.entries` remains the only source of entry order; role never regroups or silently moves entries.
- A master exercise owns stable aliases, classification, default prescription, notes, video, and related-exercise links. Editing its name never changes its ID.
- Duplicating a program creates new program, routine, block, and entry IDs while reusing the same global master-exercise IDs.
- A dated session owns completed routine IDs, checked entry IDs grouped by routine, and one optional note. Weekly and calendar summaries are derived from sessions.
- Deleting an entry or routine cleans its saved checks. Deleting a master removes that choice, promotes the next choice when needed, and deletes the slot and checks only when no choice remains. Switching programs never rewrites sessions.
- `Rest` is not a routine placeholder. A day without a recorded workout is simply a day without a completion.

### Completion meaning

- In Workout, Main entries determine routine completion. A routine auto-completes only when it has at least one Main entry and every Main entry is checked for that date; unchecking any Main entry removes that completion.
- Empty routines and routines containing only Optional entries never auto-complete. They may still be marked complete deliberately in Log.
- Optional entries can be checked and saved but never block routine completion.
- A multi-choice entry still has one check and one completion meaning. Checking it records the routine slot, not which exercise choice was performed.
- An exercise with Rehab purpose is not automatically Optional. Entry role is chosen independently in each routine.
- Tapping an entry’s number/check control changes completion. Tapping the rest of the row opens the exercise reference.
- Log is an explicit history editor: marking a routine complete adds its routine ID and checks its current Main entries; unmarking it removes the routine ID and clears that routine’s saved entry checks for the date.

### Classification meaning

- Primary targets are ordered: one or two are allowed, and item 1 is the dominant target shown in compact rows.
- Secondary targets record meaningful involvement, not every stabilizer. A target cannot be both primary and secondary.
- Movement pattern has one controlled value; equipment has one or more controlled values.
- Purpose is Strength, Mobility, or Rehab. Purpose describes why an exercise exists, not which body part it trains.
- Style, laterality, support, emphasis, and typical challenge are optional. Uncertain optional facts stay blank.
- Push, Pull, Legs, Glutes, Core, Arms, Forearms, Neck, and Full body are derived browse groups, not manually edited classification.
- Related exercises use one relationship list: Alternative is stored with the stable `similar` ID, while Easier and Harder provide progression.
- Search and filters use OR within one filter group and AND across different groups. `Primary only` is the default target scope; `Primary + secondary` broadens it without changing saved data.
- Sets, reps, tempo, pauses, partial range, and routine-specific setup belong to the routine entry, not master classification.

## Design and accessibility principles

- Put the current workout and next useful action first.
- Optimize for one-handed use between sets and efficient use of a narrow screen.
- Preserve history visibly and predictably; keep editing and recovery paths easy to trust.
- Use comfortable touch targets, readable contrast and type, clear non-color cues, reduced-motion support, and basic keyboard/screen-reader semantics.
- Add structure only when it makes future changes safer.
