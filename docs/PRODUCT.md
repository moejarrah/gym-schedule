# What the app does

## Purpose

One person uses this app on their phone during gym and home workouts. It makes the current routine quick to follow between sets, keeps exercise references close at hand, makes programs easy to change, and keeps a simple workout history, all without an account or internet connection.

Success means: usable one-handed between sets, saved data you can trust, and code simple enough to keep changing.

Character: practical, calm, athletic. No social feeds, streak pressure, dense analytics, onboarding, decoration or gamification.

## Screens

- **Workout** — follow the selected routine and log today's sets. Program editing lives elsewhere.
- **Program** — create and organize programs, routines and their exercise slots.
- **Library** — find and maintain the shared master exercises.
- **Log** — review and edit dated history and notes, and see the sets logged each day.
- **Settings** — theme, backups, restore, training rules, app version.

## How the data is organized

```text
Program
└── Routines (workout days), in order
    └── Blocks, in order
        └── Entries (exercise slots), in order
            └── Choices: one or more master exercises, each with its own prescription
```

- A **program** is a training block (e.g. PPL 9, the starting program). Several can be saved; exactly one is active whenever any exist. Switching programs changes Workout and Program, never the Library or past history. If the selected routine isn't in the newly active program, its first routine is selected.
- A **routine** is one workout day (e.g. Push A). It belongs to one program and has a name, Gym/Home location, Required/Optional status, a note and ordered blocks.
- An **entry** is one tickable slot in a routine. It has ordered choices (the first is preferred), each with a non-blank prescription, plus its block, a programming note and a Main/Optional role. Its title is the choice names joined with "or".
- A **master exercise** lives once in the Library and can be used by entries in any program. It has a name, aliases, a default prescription, one or two ordered primary targets, secondary targets, a movement, equipment, a purpose (Strength, Mobility or Rehab), optional style/laterality/support/emphasis/challenge, notes and cues, an optional YouTube video, and related exercises (Easier, Alternative, Harder). Editing the name never changes its identity.
- A **day** in the history holds the routines finished that day, the slots marked done per routine, the sets logged per slot, any exercises added to a routine for that day only, and an optional note. Calendar and recent-history views are derived from days. A day with nothing in it isn't stored; "Rest" is just a day without a finished workout.
- A **logged set** has a weight in kg (blank when no weight is used) and whole reps, plus any drop sets done straight after it, each with its own weight and reps. A log records which choice of the slot was done, the exercise's name, and whether it was counted in reps or seconds (seconds when the prescription's amount after "×" is in seconds, e.g. "2 × 30 sec", or it has no "×" and gives seconds, e.g. "2 rounds · 30–60 sec"), fixed when it's saved. History is per master exercise, from any routine.

## Completion rules

- A **workout** runs from "Start workout" to "Finish workout" on Workout, one at a time. Until it's started, the routine's list is read-only and shows no progress; tapping a number says to start first. The workout belongs to the day it was started on, even past midnight.
- A slot is done only when Done is tapped in its logging sheet (logging sets alone doesn't mark it done). Done with no sets logged asks first ("Mark done anyway" or "Log sets"). "Not done" undoes it and closes the sheet.
- A routine is completed for a day when its workout is finished, with whatever was done: finishing shows a summary (Done, Started but not marked done, Not touched; each opens to list its exercises and sets), then files it in Log. Doing slots never completes a routine by itself, and Main or Optional makes no difference to finishing. Starting the same routine again that day reopens the workout. A workout left open from an earlier day (and started more than 12 hours ago) is filed as it stands the next time the app is opened, with a message.
- A multi-choice entry is one slot: done applies to the slot, and its logged sets record which choice was done.
- Rehab exercises aren't automatically Optional; the role is set per entry.
- On Workout, tapping the number box opens the logging sheet; tapping the rest of the row opens the exercise reference (or the choices sheet).
- In Log, marking a routine complete for a date also ticks its Main entries; unmarking it clears that routine's ticks for the date.
- Deleting a routine or program keeps its past completions and logged sets in the history (shown as "Deleted routine" when the routine is gone) but drops its done marks. Removing an entry drops only its done marks; its logged sets stay in the exercise's history. Deleting a master exercise keeps its logged sets in Log under the name it had. If a slot's exercise is swapped in Program after sets were logged today, those sets stay in that exercise's history and the slot starts empty.
- A workout's sets belong to the day the workout was started on. Sets fixed from Log belong to the day opened there.

## Actions that must keep working

### Workout

- See and switch the active program; open Program through "Manage program".
- Select any routine (the selected tab stays visible in the tab strip).
- See the routine note, its blocks and numbered slots with prescriptions and note previews.
- Open a one-choice slot's reference directly. A multi-choice slot opens a sheet listing each choice with its own reference and video buttons.
- In the reference, see the routine prescription and entry note separately from the master's targets, classification, notes, related exercises and video; open a related exercise; go to the master editor.
- Log today's sets from a slot's number: the sheet shows the exercise's last 3 sessions (date, routine, every set and drop), one row per planned set (from the prescription's set count) with last time's set beside it, and grey suggestions that a tick takes when the fields are empty. Tap last time's set to copy it. Ticking saves straight away and a tick takes the grey value shown in an empty field; unticking a set takes it and its drops out of the log, and ticking it again brings the drops back; Enter in a field ticks its row (on a hardware keyboard). Add sets, chain any number of drop sets under the set just ticked, and remove any drop with its × (a saved drop is taken out of the log). Switch which choice a multi-choice slot is logging. Done marks the slot done, and Done or Close also save rows that were typed but not ticked; Not done undoes it and closes the sheet; the × in the sheet's header closes it without saving rows that were typed but not ticked. There is no rest timer.
- See the workout's logged sets as small boxes under each slot's name, with drops counted. A block whose slots are all Optional has a dashed outline; slot numbers run on through it.
- Add an exercise for today only: "Add exercise for today" opens the Library, and "You sometimes add" lists what was added to this routine in the last four weeks, most often first, with a + to add it again. Added exercises are numbered after the routine's slots, logged the same way, show in Log and in the exercise's history, and never change the program. One with nothing done can be removed from its logging sheet.
- Open an exercise's full history from the logging sheet or its reference: best set, heaviest weight, change since the first session, a small trend of the top set's weight, and every session with its change from the one before.
- See when the routine was last finished, or that it's in progress or finished today.

### Program

- See and switch the active program. Create an empty program or a duplicate (new routine/block/entry IDs, same Library exercises). Edit its name and note; delete it after confirmation (its routines go; Library exercises stay).
- Read the program note in a compact disclosure.
- Add a routine; edit its name, location, status, note and blocks; move it earlier or later; delete it after confirmation.
- Add, rename, reorder (hold-drag or Earlier/Later) and delete blocks. Only empty blocks can be deleted.
- Search the Library and add an exercise to a chosen block (it starts as a Main entry with the exercise's default prescription).
- Edit an entry: add or remove choices, edit each choice's prescription, reorder choices, make one preferred, change role, block (the entry moves to the end of the new block) and note.
- Reorder entries within their block by hold-drag or Earlier/Later. Main and Optional entries can be mixed in any order.
- Remove an entry without deleting its master exercise.

### Library

- Search by name, alias, target, movement or other classification; punctuation and case don't matter ("ab wheel" finds "Ab-wheel rollout"). The same search is used when adding exercises to routines and linking related exercises.
- Browse groups (Push, Pull, Legs, Glutes, Core, Arms, Forearms, Neck, Full body, …), derived from targets and movements. Target scope "Primary only" (default) or "Primary + secondary".
- Filter by targets, movement, equipment, purpose and the optional classifications: OR within a group, AND across groups.
- Open an exercise's reference before editing. Add, edit, duplicate and delete master exercises. Deleting shows how many slots use it, which choices are removed or promoted, which slots disappear and how many related links go.

### Log

- Move between months; see which dates have completions, logged sets or notes.
- Reopen any of the eight most recent days from the list under the calendar.
- Open any date: mark routines from the active program as completed and edit the note, and see the sets logged that day; tapping a logged exercise opens its logging sheet to fix the sets. Past routines from other programs are shown and labelled; deleted ones are labelled "Deleted routine". Clearing the routines and note removes the day unless it has logged sets.

### Settings

- Switch light and dark theme.
- Export all data as a backup file (on iPhone through the share sheet, e.g. Save to Files).
- Import a backup after confirming that it replaces everything. Backups from older app versions are upgraded. Errors are shown and change nothing.
- Restore the starting program after confirmation (the theme is kept).
- Read and edit the training rules (progression, pain rule, …).
- If saved data ever can't be read (damaged, or saved by a newer version of the app), it is left exactly as it is: the starting program opens, nothing is saved, and the unreadable data can be downloaded. Only importing a backup or restoring the starting data replaces it.
- See the installed app version.

## Exercise classification

- Primary targets are ordered (one or two); the first is the dominant target shown in rows. A target can't be both primary and secondary. Secondary targets record meaningful involvement, not every stabilizer.
- One movement; one or more equipment items; purpose describes why the exercise exists, not the body part.
- Optional facts stay blank when uncertain. Sets, reps, tempo and setup belong to the routine entry, not the master exercise.

## Design principles

How the app looks (colours, type, shapes, components) is in `docs/DESIGN.md`.

- Current workout and the next useful action first; one-handed use on a narrow screen. Lean: nothing on screen that doesn't help during a workout.
- History is preserved and predictable; editing and recovery are easy to trust. Editors keep their drafts until you save or close them (tapping outside doesn't discard them; Enter saves).
- Comfortable tap targets, readable contrast and type, cues that don't rely on color alone, reduced-motion support, basic keyboard and screen-reader semantics.
