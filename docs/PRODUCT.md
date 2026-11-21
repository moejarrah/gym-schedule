# What the app does

## Purpose

One person uses this app on their phone during gym and home workouts. It makes the current routine quick to follow between sets, keeps exercise references close at hand, makes programs easy to change, and keeps a simple workout history, all without an account or internet connection.

Success means: usable one-handed between sets, saved data you can trust, and code simple enough to keep changing.

Character: practical, calm, athletic. No social feeds, streak pressure, dense analytics, onboarding, decoration or gamification.

## Screens

- **Workout** — follow the selected routine and log today's sets. Program editing lives elsewhere.
- **Program** — create and organize programs, routines and their exercise slots.
- **Library** — find and maintain the shared master exercises.
- **Log** — review and edit dated history and notes, see the sets logged each day, and see progress: the week, new bests, what's getting stronger or stalled.
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
- A **master exercise** lives once in the Library and can be used by entries in any program. It has a name (the movement), a setup (see Library below), aliases, a default prescription, one or two ordered primary targets, secondary targets, a movement, equipment, a purpose (Strength, Mobility or Rehab), optional style/laterality/support/emphasis/challenge, notes and cues, an optional YouTube video, and related exercises (Easier, Alternative, Harder). Editing the name never changes its identity.
- A **day** in the history holds the routines finished that day, the slots marked done per routine, the sets logged per slot, any exercises added to a routine for that day only, and an optional note. Calendar and recent-history views are derived from days. A day with nothing in it isn't stored; "Rest" is just a day without a finished workout.
- A **logged set** has a weight in kg (blank when no weight is used) and whole reps, plus any drop sets done straight after it, each with its own weight and reps. A log records which choice of the slot was done, the exercise's name, and whether it was counted in reps or seconds (seconds when the prescription's amount after "×" is in seconds, e.g. "2 × 30 sec", or it has no "×" and gives seconds, e.g. "2 rounds · 30–60 sec"), fixed when it's saved. History is per master exercise, from any routine.

## Completion rules

- A **workout** runs from "Start workout" to "Finish workout" on Workout, one at a time. Until it's started, the routine's list is read-only and shows no progress; tapping a number says to start first. The workout belongs to the day it was started on, even past midnight. Start is above the list. While the workout runs, the top shows a stopwatch in whole minutes since Start, and Cancel, which after a confirmation deletes everything logged in that workout (sets, done marks, added exercises).
- A slot is done only when "Exercise done" is tapped in its logging sheet (logging sets alone doesn't mark it done). Done with no sets logged asks first ("Mark done anyway" or "Log sets"). "Not done" undoes it and closes the sheet.
- A routine is completed for a day when its workout is finished, with whatever was done: finishing shows a summary (Done, Started but not marked done, Not touched; each opens to list its exercises and sets), then files it in Log. Doing slots never completes a routine by itself, and Main or Optional makes no difference to finishing. Starting the same routine again that day reopens the workout. A workout left open from an earlier day (and started more than 12 hours ago) is filed as it stands the next time the app is opened, with a message.
- A multi-choice entry is one slot: done applies to the slot, and its logged sets record which choice was done.
- Rehab exercises aren't automatically Optional; the role is set per entry.
- On Workout, tapping the number box opens the logging sheet; tapping the rest of the row opens the exercise reference (or the choices sheet).
- In Log, marking a routine complete for a date also ticks its Main entries; unmarking it clears that routine's ticks for the date.
- Deleting a routine or program keeps its past completions and logged sets in the history (under the name it had when finished, or "Deleted routine" for older days that kept no name) but drops its done marks. Removing an entry drops only its done marks; its logged sets stay in the exercise's history. Deleting a master exercise keeps its logged sets in Log under the name it had. If a slot's exercise is swapped in Program after sets were logged today, those sets stay in that exercise's history and the slot starts empty.
- A workout's sets belong to the day the workout was started on. Sets fixed from Log belong to the day opened there.

## Actions that must keep working

### Workout
- The Workout list is quiet: each slot is its number, its movement (with "+1" when it has alternatives) and its sets at the end of the row; once sets are logged the end shows them ("60 × 10, 9 · 62.5 × 8 +1 drop") and a done slot is greyed. One slot at a time is open in place, outlined, showing its setup, what the weight means, today's sets, last time, the owner's note, the alternatives ("Or do", which opens the choices sheet), and the buttons Log sets (while a workout runs), Exercise page and Video. While a workout runs the first slot not done is open by itself and the next opens when it is done; tapping a row opens that one instead, and tapping the open row closes it. The number box still opens the logging sheet directly.
- Pick a routine by tapping its tab, or swipe left or right anywhere on the list to go to the next or previous one (also on Program): the list follows the finger, and on release slides away as the next routine slides in beside it, or settles back if it was not pulled far. A swipe that starts on something that scrolls sideways itself, such as the tabs, only scrolls it.

- See and switch the active program. The same bar holds the workout's control: "Start workout" (or "Reopen" when it was finished today, or "Go to …" when another routine's workout is running), and while a workout runs its stopwatch and Cancel. A routine's tab shows a dot while its workout runs and a tick once it was finished today.
- Select any routine (the selected tab stays visible in the tab strip).
- See the routine note, its blocks and numbered slots with prescriptions and note previews.
- Open a one-choice slot's reference directly. A multi-choice slot opens a sheet listing each choice with its own reference and video buttons.
- In the reference, see the routine prescription and entry note separately from the master's targets, classification, notes, related exercises and video; open a related exercise; go to the master editor.
- Log today's sets from a slot's number: the sheet shows the exercise's last 3 sessions (date, routine, every set and drop), one row per planned set (from the prescription's set count) with last time's set beside it, and grey suggestions that a tick takes when the fields are empty. Tap last time's set to copy it. Ticking saves straight away and a tick takes the grey value shown in an empty field; unticking a set takes it and its drops out of the log, and ticking it again brings the drops back; Enter in a field ticks its row (on a hardware keyboard). Add sets, and chain any number of drop sets under the set ticked last with "Drop set after set N" (always under the table, next to "Set"), and remove any drop with its × (a saved drop is taken out of the log). Switch which choice a multi-choice slot is logging. "Exercise done" marks the slot done, and it or Close also save rows that were typed but not marked done; Not done undoes it and closes the sheet; the × in the sheet's header closes it without saving rows that were typed but not ticked. There is no rest timer.
- See the workout's logged sets as small boxes under each slot's name, with drops counted. A block whose slots are all Optional has a dashed outline; slot numbers run on through it.
- Add an exercise for today only: "Add exercise for today" opens the Library, and "You sometimes add" lists what was added to this routine in the last four weeks, most often first, with a + to add it again. Added exercises are numbered after the routine's slots, logged the same way, show in Log and in the exercise's history, and never change the program. One with nothing done can be removed from its logging sheet.
- In the logging sheet: under "Last 3 times" a line says what beats last time (one more rep, or add weight once every set reached the top of the prescription's rep range), and last time's exercise note shows there. Tapping a set's number marks it as a warm-up ("W"); warm-ups never count towards bests or progress. A ticked set that beats every earlier session is marked "Best". Once a set is ticked, a note for the exercise can be typed; it is saved with the sets. Correcting a ticked set and tapping its tick keeps it ticked. Switching choice with sets ticked asks before moving them; removing an added exercise with sets ticked asks first.
- After Finish, the summary becomes the result: duration, exercises and sets done, new bests, and each logged exercise against its session before (▲, ▼ or Same), plus a reminder when there is no backup or the last one is over two weeks old. A workout's duration is saved with it (not when it ran over five hours, was left open overnight, or was logged for a past day).
- A reopened workout shows "Close again" in place of Cancel: it closes as finished and deletes nothing. A routine or program can't be deleted while its workout is in progress, and Log can't tick or untick that routine for that day. A workout in progress can always be reached from Workout, whatever program or routine is showing.
- Open an exercise's progress from the logging sheet, its reference or Log's Progress view: how many sessions since when; a chart of the last 20 sessions with a dot on each one that set a new best, and above it the latest number with its change since the first session; a switch for what the chart shows (Strength: the estimated 1-rep max, marked rough above 12 reps; Best set; Volume: kg × reps; only the ones that apply, so bodyweight and timed exercises get the best set alone); the bests (best set, and the most reps at each of the five heaviest weights); and every session newest first with its routine, a "Best" tag when it beat every earlier session, its sets (warm-ups tagged "W"), its change from the session before and that day's exercise note.
- How sets compare: warm-up sets and drops never count. With weight, the best set is the one with the highest estimated 1-rep max (weight × (1 + reps ÷ 30)). Without weight (bodyweight, assisted, timed), less assistance or more added load wins first, then reps or seconds.
- See when the routine was last finished, or that it's in progress or finished today.

### Program

- See and switch the active program. Create an empty program or a duplicate (new routine/block/entry IDs, same Library exercises). Edit its name and note; delete it after confirmation (its routines go; Library exercises stay).
- Read the program note in a compact disclosure.
- Add a routine; edit its name, location, status, note and blocks; move it earlier or later; delete it after confirmation.
- Add, rename, reorder (hold and drag) and delete blocks. Only empty blocks can be deleted. A block without a name is shown as "Main" wherever blocks are listed.
- Search the Library and add an exercise to a chosen block (it starts as a Main entry with the exercise's default prescription).
- Edit an entry: add or remove choices, edit each choice's prescription, reorder choices, make one preferred, change role, block (the entry moves to the end of the new block) and note.
- Reorder entries by hold and drag, inside their block or into another block. Dropped into another block, an entry lands where it was dropped and takes that block's role: Optional among Optional entries (or in an empty block named optional), Main among Main ones. Main and Optional entries can still be mixed with the Role switch in the entry editor.
- Replace an entry's exercise: tap the exercise's name in the entry editor and pick another from the Library. The prescription and the slot's place stay. Hold and drag the choices to reorder them; the first is the preferred one. The › on a choice edits its prescription.
- Remove an entry without deleting its master exercise.

### Library

- **An exercise is a movement plus a setup.** The name is the movement as lifters say it ("Lat pulldown", "Chest press", "Incline bench press"; angle and position stay in the name). The setup has its own boxes, each optional except equipment: equipment (several allowed; the one that loads the exercise is the main one and the only one shown on rows: Smith machine, plate-loaded, machine, EZ bar, barbell, dumbbell, kettlebell, cable or band, in that order of precedence), attachment, grip, grip width, a free-text detail ("high to low", "upright"), sides, and what the logged weight is (the whole load, per side, per dumbbell, assistance). Two exercises may share a name as long as their setups differ; the editor refuses an exact repeat. Each stays its own exercise with its own logs and history.
- An exercise is drawn the same way everywhere (`exerciseMarkup` and `entryPresentation` in `js/views/shared.js`; nothing else builds names): the movement, then its setup in grey. Settings → Exercise version shows the equipment as a word in that grey text or as a coloured letter in front of the name (B barbell, E EZ bar, D dumbbell, K kettlebell, C cable, M machine, P plate-loaded, S Smith machine; a band stays a word). The equipment word is left out when the name already says it ("Cable crunch"). In a slot with several choices each exercise carries its own setup; two versions of one movement show its name once. On Program and in pickers a row is: line 1 the exercise or exercises, line 2 the prescription, line 3 the owner's note. Where one plain string is needed (labels read aloud, confirmations, the name saved with logged sets, web searches) it is `fullName`: "Lat pulldown (machine, overhand)".
- In the Library a movement with several versions is named once with its versions under it (inside its muscle group). The exercise page and the editor show the setup as one block in the same order. The logging sheet says what the weight is when it isn't the whole load ("kg per side", "kg per dumbbell", "enter assistance as minus kg").
- Search by name, alias, target, movement or other classification; punctuation and case don't matter ("ab wheel" finds "Ab-wheel rollout"). The same search is used when adding exercises to routines and linking related exercises.
- The list is grouped by the muscle each exercise mainly trains (its first primary target), each group outlined with its name and count; inside a group it is alphabetical. Search and filters keep the grouping.
- Browse groups (Push, Pull, Legs, Glutes, Core, Arms, Forearms, Neck, Full body, …), derived from targets and movements. Target scope "Primary only" (default) or "Primary + secondary".
- Filter by targets, movement, equipment, purpose and the optional classifications: OR within a group, AND across groups.
- Open an exercise's reference before editing. Add, edit, duplicate and delete master exercises. Deleting shows how many slots use it, which choices are removed or promoted, which slots disappear and how many related links go.

### Log

- Move between months; see which dates have completions, logged sets or notes.
- Switch between Calendar and Progress at the top (Calendar each time the app is opened).
- Reopen any of the eight most recent days from the list under the calendar. A finished routine goes by the name it had that day, with the workout's duration when it was timed.
- Progress: this week's finished workouts (weeks start Monday), the average per week over the four weeks before, and the new bests this month; "Getting stronger", up to five exercises with three or more sessions in the last 42 days whose best set rose from the first of them to the last, with the percentage; "Stalled", up to five exercises of the active program trained in the last 42 days whose last four sessions set no new best, with the date of the last one; "Sets per muscle this week", where a working set counts 1 for each primary target of its exercise and 0.5 for each secondary one. A row opens the exercise's progress. Sections with nothing in them are left out.
- Open any date: mark routines from the active program as completed and edit the note, and see the sets logged that day; tapping a logged exercise opens its logging sheet to fix the sets (when its slot is still in the program), and its × removes that exercise's sets from the day after a confirmation. Past routines from other programs are shown and labelled; deleted ones go by the name they had when finished, labelled "Deleted routine". A timed workout shows its duration. Clearing the routines and note removes the day unless it has logged sets.
- Forgot to log a workout: in a past (or today's) date, "Log a workout for this day" starts that routine's workout for that date. It runs on Workout like any other, without a stopwatch. What was typed in the day sheet is kept when a logged exercise is removed or opened from it. Future dates can't be marked.

### Settings

- Switch light and dark theme.
- Export all data as a backup file (on iPhone through the share sheet, e.g. Save to Files). Settings shows when the last backup was exported.
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

- A sheet closes with its ×, or by pulling it down from its top (or from anywhere once its content is scrolled to the top). Pulling down does what × does.
- Current workout and the next useful action first; one-handed use on a narrow screen. Lean: nothing on screen that doesn't help during a workout.
- History is preserved and predictable; editing and recovery are easy to trust. Editors keep their drafts until you save or close them (tapping outside doesn't discard them; Enter saves).
- Comfortable tap targets, readable contrast and type, cues that don't rely on color alone, reduced-motion support, basic keyboard and screen-reader semantics.
