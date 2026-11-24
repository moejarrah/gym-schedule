# What the app does

## Purpose

One person uses this app on their phone during gym and home workouts. It makes the current routine quick to follow between sets, keeps exercise references close at hand, makes programs easy to change, and keeps a simple workout history, all without an account or internet connection.

Success means: usable one-handed between sets, saved data you can trust, and code simple enough to keep changing.

Character: practical, calm, athletic. No social feeds, streak pressure, dense analytics, onboarding, decoration or gamification.

## Screens

- **Workout** (the first tab, the app's home) — the round page: which round the owner is on, the round's workouts as one list with one open, and one bottom button that starts (or reopens) the open one. The workout in progress is a page of this tab, pushed in from the round page; so are Rounds and blocks, a block, one round, and Settings (from the gear).
- **Program** — look up any program's routines and exercises; "Edit" turns it into the editor for programs, routines and their exercise slots. Following another program starts here.
- **Library** — find and maintain the shared master exercises.
- **Log** — review and edit dated history and notes, see the sets logged each day, and see progress: the week, new bests, what's getting stronger or stalled.
- **Settings** (from the gear on the round page) — theme, how an exercise's version shows, backups, restore, training rules, app version.

## How the data is organized

```text
Program
└── Routines (workout days), in order
    └── Blocks, in order
        └── Entries (exercise slots), in order
            └── Choices: one or more master exercises, each with its own prescription
```

- A **program** is a training block (e.g. PPL 9, the starting program). Several can be saved; exactly one is followed whenever any exist (the one the rounds count through). The Program tab can show any of them without changing that. Following another program never changes the Library or past history; see "Following a program, and blocks".
- A **routine** is one workout day (e.g. Push A); the app calls it a "workout" everywhere the owner reads it. It belongs to one program and has a name, Gym/Home location, Required/Optional status, a note and ordered blocks.
- An **entry** is one tickable slot in a routine. It has ordered choices (the first is preferred), each with a non-blank prescription, plus its block, a programming note and a Main/Optional role. Its title is the choice names joined with "or".
- A **master exercise** lives once in the Library and can be used by entries in any program. It has a name (the movement), a setup (see Library below), aliases, a default prescription, one or two ordered primary targets, secondary targets, a movement, equipment, a purpose (Strength, Mobility or Rehab), optional style/laterality/support/emphasis/challenge, notes and cues, an optional YouTube video, and related exercises (Easier, Alternative, Harder). Editing the name never changes its identity.
- A **day** in the history holds the routines finished that day, the slots marked done per routine, the sets logged per slot, any exercises added to a routine for that day only, and an optional note. Calendar and recent-history views are derived from days. A day with nothing in it isn't stored; "Rest" is just a day without a finished workout.
- A **logged set** has a weight in kg (blank when no weight is used) and whole reps, plus any drop sets done straight after it, each with its own weight and reps. A log records which choice of the slot was done, the exercise's name, and whether it was counted in reps or seconds (seconds when the prescription's amount after "×" is in seconds, e.g. "2 × 30 sec", or it has no "×" and gives seconds, e.g. "2 rounds · 30–60 sec"), fixed when it's saved. History is per master exercise, from any routine.

## Rounds, blocks and calendar weeks

Words: a **workout** is one routine done on a day. "3 of 6 workouts done" is always written with its unit; a bare "3 of 6" appears only in the rows of Rounds and blocks, where the row is about a round's workouts.

### The counts

- The **calendar week** is the ISO week of the date, Monday to Sunday, always with its own year where a year is shown ("2026 · week 47"; January 1–3 can belong to the year before; 2026 has 53 weeks).
- A **round** is one pass through the Required workouts of the program being followed, in any order and over as many days as it takes. There is **one round count for the owner's training**, not one per program. Each round records the program it followed.
- A **block** is a fresh start of the count (round 1 again): after a long break, or when the owner chooses it while changing program. The block number is shown only from block 2 on ("Round 1 · block 2").
- Counting starts at round 1 with the first workout started. Before that the round page offers "Already on a later round? Set it", which opens Change round number to start the count at another number.

### What counts in a round

- A finished workout of the followed program counts once, however often it is repeated. An Optional workout of that program is listed in the round but is never asked for and never counted.
- A workout from **another program** done for the day ("A workout from another program") is an **extra**: listed in the round with its program's name, counted toward nothing, and it changes no number. It runs like any workout, its header naming its program; the followed program is unchanged before, during and after, everywhere in the app.
- A cancelled workout was never part of a round. A reopened workout stays in the round it was first filed in. A workout logged or marked for a past day joins the round that was open on that date (never a round that opened later). On the day one round closed and the next opened, it joins the closed one, unless the open round already has a workout on that day.
- A **deleted** workout (its result page, "Delete this workout") leaves the round it was filed in: an open round shows one fewer done; an extra or an Optional workout changes no number. A closed round keeps its recorded numbers, with one exception: when the most recently closed round was complete and needed the deleted workout to be (no other workout of that routine counted in it), and nothing has been done yet in the round opened after it (same block and program, and no reopened workout running), that round opens again with its number, block and program, from the earlier of the day of its first workout left and the deleted workout's day. So a workout finished by mistake and deleted leaves no completed round behind. Counting never stops: deleting the first workout ever leaves round 1 open with nothing in it.

### How a round ends

- **Complete**: every Required workout of its program has been done in it. The next round opens by itself.
- **Ended early**: the owner taps "End round N now" (confirmation names what is left undone). It is with Change round number on Rounds and blocks.
- **By a change of program**: following a different program ends an open round that already has workouts in it; a round with nothing in it simply follows the new program instead.
- **By a break**: see below.
- A closed round is recorded with its number, block, program name, how many workouts it asked for, how many of them were done, and how it ended. Those never change afterwards, whatever is done to the program (renamed, edited, deleted) or to its days in Log. Only its list of workouts can still change, when a past day inside it is logged or unmarked or one of its workouts is deleted (and the round just completed can open again; see "What counts in a round").
- Round numbers never repeat inside a block: a number already used can't be picked, and after a round renumbered to below earlier ones, the next round takes the first number not used yet.
- Deleting the followed program counts as a change of program; deleting the only program ends the count (the history stays), and it can't be done while a workout runs.

### Following a program, and blocks

- **Looking at a program and following it are separate.** The Program tab can show any program without changing which one is followed.
- "Follow <program>" (Program tab, when looking at another program) opens one sheet that says exactly what will happen, as labelled lines, with these choices: carry the count on (the open round ends here if it has workouts; the next round follows the new program), **start a new block** with the new program (round 1 of the next block), or back out ("Finish round N first" / "Cancel").
- A new block can also be started from "Change round number".
- It can't be done while a workout is running.

### Coming back after a break

- After three weeks or more with no workout, the round page shows a short "Welcome back" block above the list: how long it has been and how the last round was left ("8 weeks since Tue 22 Sep. Round 6 ended there, with 2 of 6 workouts done."), then a two-way switch, "This is [Round 7] / Round 1 · block 2". The header already shows the round the switch picks. Nothing waits on it: Start applies the answer in the same save as the start (carrying on closes a round left unfinished, "ended by the break"; the other answer opens a new block). Starting an extra applies the switch the same way; "Log a workout for this day" for today carries on. The break is recorded only by a start, never by opening the app or by logging a past day, and cancelling that workout takes the answer back (the Welcome back block returns).

### The tabs

Bottom navigation: **Workout · Program · Library · Log**. The Workout tab is the round page and the pages pushed in from it (the workout in progress, a workout's result, Rounds and blocks, a block, one round, Settings), each with a back link (the result: its bottom button Done); the tab stays marked while they show.

**What the app opens on**: the workout in progress when there is one (also after iOS reloads the app); otherwise the round page. Tapping the Workout tab from another tab while a workout runs opens that workout; tapping it on the workout scrolls the list to the top.

**The bottom button** sits above the tab bar on the round page and on the workout, always in the same place, and always names the next thing to do: "Start Push B", "Do Push A again today", "Reopen Push B", "Go to Program"; on the workout "Log sets · <exercise>", then "Finish workout". When what it does changes under the finger, it ignores taps for a moment.

**The running bar**: while a workout runs, every other page (the round page, Rounds and blocks, Program, Library, Log, Settings) shows one filled bar above the tab bar instead of the bottom button: "Push B in progress" with its minutes, and "3 of 8 done · next: Chest fly" with "Back →". The whole bar is one button that goes to the workout.

**The round page**
- Header: "Following <program>" and the gear; "Round N" (with the block from block 2 on) and "Week W"; a bar with one segment per Required workout; "X of Y workouts done" at one end and "started <date>" (or "not started yet") at the other.
- Above the list, only when there is news: before anything is counted, one sentence ("A round is one pass through these six workouts, in any order, over as many days as it takes."); back after a long break, the Welcome back block (see above); on the day a round is completed, a row "Round 3 complete · 6 of 6 workouts done · 6 days ›" that opens that round's page.
- The list: every Required workout of the followed program in order (ticked with its date once done in the round, "Next" on the next one), then its Optional workouts (tagged, never asked for), then extras done in the round, tagged with their program and opening their day. **Exactly one row is open**, its lines under it; tapping another row opens that one instead (the open one stays open). By itself the open row is the workout in progress, otherwise the one finished today, otherwise Next.
- "Next" is the first Required workout not done in the open round, leaving out one finished today (so there is never a Start that can't start). After a long break it is the first one of the new round.
- A row not done yet shows "Exercises: 8, plus 3 optional ›" (opens that workout on Program), "Usually: about 60 min" (the middle of its last five timed workouts, when it was ever timed) and "Last done" (or "Never"); the bottom button is **Start <name>**. A row done earlier in the round shows "Done: <date> · <minutes> ›" (opens that day) and "In round N: counts once"; the button is **Do <name> again today** (quiet). The row finished today shows Time, Logged ("20 sets, 8 exercises"), New bests, "Counted in" when it completed an earlier round, and "How it went: ▲ 4 · = 3 · ▼ 1 ›" (the result's counters: up, same, down) (its result page again); the button is **Reopen <name>** (quiet).
- While a workout runs its row is open, tagged "In progress", with "Started: 10:42, 34 min ago" and "Exercises: 3 of 8 done"; the other rows are quiet and can't be tapped; the running bar is at the bottom. An extra or a workout for a past day has a row of its own under the list while it runs.
- Under the list: "A workout from another program ›" (when another program has workouts; not while one runs), "Rounds and blocks · N earlier ›" (once counting has started), and before anything was done "Already on a later round? Set it ›".
- With no program, or a program with no Required workouts, the page says so, with "Import a backup ›" and "Restore the starting program ›" (as in Settings), and the bottom button is "Go to Program".
- **Rounds and blocks**: under the title, "End round N now" (when something is done in the open round) and "Change round number"; neither shows while a workout runs. Then every round grouped by block, newest first. Each block starts with a heading row, shown for block 1 too: "Block N", then "since <date>" while it is open or its dates once closed, and how many rounds it has; it opens the block's page. Under it its rounds, one row each: the round number (outlined in the accent colour for the open round); the program with its dates and its calendar weeks, a line each; "X of Y" workouts with how it ended (in progress, complete, ended early, ended by break, program changed). A break of three weeks or more is one quiet line ("7 weeks off") between two rounds or two blocks.
- **One block**: back to Rounds and blocks; "Block N" with its calendar weeks; a bar with one segment per round (filled when complete, faintly filled when it ended another way, empty while open); how many rounds (and which is open) and since when, or when it ended. Then labelled lines, each only when it has something to say: Programs (in the order followed), Rounds (how many and how they ended), Workouts (done, plus extras), Dates, Lasted (days, and while open "so far" and which week of the block), Calendar weeks, Training time, New bests, Started (after a break of three weeks or more, with a new program). Then its rounds as in the list. Nothing about a block is saved apart from its number on the rounds and workouts; all of this is worked out from them.
- **One round**: the same header as the round page, its back link returning to where it was opened from (the block's page, Rounds and blocks, or the round page for the "Round N complete" row), then labelled lines in this order: Program, Workouts, Dates, Took, Calendar weeks, Training time, New bests; then its workouts (extras and optional ones tagged), each opening its day; then what was not done.

**The workout in progress**
- A page of the Workout tab: "‹ Round N" at its top left goes back to the round page (the workout keeps running; there is no drag from the left edge here, where the number boxes are), and **Finish** is always at its top right. Then the workout's name with its stopwatch ("34 min"; "for <date>" for a past day; nothing for a reopened one), for an extra a line naming its program, a bar with one segment per main exercise, and "3 of 8 exercises done" with "3 optional".
- The quiet list with one exercise open, then "Add exercise for today", "You sometimes add", and last "Cancel workout" ("Close again" for a reopened one).
- There is no preview of a workout before it starts: what is in it is on Program.
- The screen stays on while a workout runs and the app is in front (asked again each time the app comes back; where the phone can't, it locks as usual).

**The result**
- A page of the Workout tab, pushed in right after Finish, and again from the round page's "How it went ›" on the row finished today. Its bottom button **Done** goes back to the round page (to Log for a workout logged for a past day), and so does a drag from the left edge. It is built from saved data only; after a reload the app opens on the round page.
- Once a workout is filed, what was logged is what was done: on the result, a main exercise counts as done when it was marked done or has sets logged (while the workout runs, only its done mark counts; see "Completion rules").
- "<workout> done" and "<date> · saved to your log", then a stack of cards, each with its small label inside at the top and only when it has something to say. Every line of a card is the same grid: the name at the left (an exercise's movement, with its setup on a meta line under it), the value at the right, a › when it opens something.
  - **Summary**: three facts side by side, "34 min · time" ("— · not timed"), "14 · sets", "5 of 8 · exercises"; then **Progress**: "▲ 3 · = 1 · ▼ 1" "against <date>" ("against last time" when the exercises' last sessions were on different days), or "No sets logged" / "First time for all".
  - **New bests** (with their count): each exercise with the set that did it and "was <the best it beat>"; it opens the exercise's history.
  - **The round** it was filed in ("Round 3 · block 2"; "Round 3 · block 2 complete" when this workout completed it): its bar, then lines: for an extra "Extra from: <program>", for an extra or an Optional workout "Counts: toward nothing"; "Workouts: 4 of 6 done"; "Took: 9 days" when it completed the round; "Next: Pull B".
  - **Against last time**: Up, then Down, as rows with the change ("▲ 1 rep", "▼ 2.5 kg"), each opening the exercise's history (a best is listed once, under New bests); then "Same: 3 exercises" and "First time: 4 exercises", each opening in place to list them.
  - **Not done** (counting main exercises only): the main exercises neither marked done nor logged, then the Optional ones under a small "Optional" label and the exercises added for the day under "Added today", each with its count. With no main exercise left the card is labelled for what it holds ("Optional, not done · 3", "Added today, not done · 1"). More than five rows: the first four and "Show N more".
  - **Next time**: each exercise where every set reached the top of its rep range: "Add weight", "all sets hit 12".
  - **More**: "Continue <workout> ›" (reopens it; for a workout finished today, while none runs), "Back up your data ›" (to Settings; when there is no backup or the last one is over two weeks old), and "Delete this workout" in the danger colour.
- **Delete this workout** asks first, saying what goes: "Delete Push B from Wed, Nov 4?", "Its 14 sets, done marks and exercises added for the day are deleted." (and "Round 3 opens again." when it does; see "What counts in a round"), "This can't be undone.", with "Keep it" or "Delete workout". The workout leaves that day's Log as if it had never been done (a day left with nothing goes; its note stays), and the app goes back to the round page (to Log for a workout of a past day) with "Workout deleted.". It can't be done while that workout is in progress, nor while the workout in progress is one whose start answered a long break.
- Each exercise is compared with its own session before that day, by the rule under "How sets compare". A workout whose routine or exercises were deleted since shows the names saved with the day.

**Program**
- For looking things up first, changing second. The header is the program's name (tap to look at another; a dot marks the one being followed) and "Edit"; when the program shown isn't the followed one, a line says which is and offers "Follow <name>". Then the routine tabs, one line ("N exercises" and "last done <date>"), and the routine as the same quiet list as Workout: tapping an exercise unfolds its labelled lines (including "Last time", which opens its history) and the buttons History, Details, Video. Under the list, "Program rules" folds out the program's own note. Nothing can be changed in this mode.
- "Edit" turns the same screen into the editor: rows show their prescription and a drag handle, tapping a row opens its editor, "+ Add exercise" appears under each block, and one line under the tabs holds "Edit <workout>" (its name, notes and blocks), "+ Workout" and "Program rules". "Done" returns to viewing.

**Log**
- The calendar starts on Monday with the week number at the start of each row. Recent days are a plain list; a day's second line names its round ("Round 6 · 62 min"). Rounds as such are on the Workout tab.

## Completion rules

- A **workout** runs from Start (the round page's bottom button) to Finish, one at a time. The workout belongs to the day it was started on, even when it runs past midnight. One left open from an earlier day for over 12 hours is finished as it stands the next time the app is opened. Cancel workout makes it as if it never happened: its sets, done marks and added exercises go (it asks first once anything was logged).
- A slot is done only when "Exercise done" is tapped in its logging sheet (logging sets alone doesn't mark it done). Done with no sets logged asks first ("Mark done anyway" or "Log sets"). "Not done" undoes it and closes the sheet.
- A routine is completed for a day when its workout is finished, with whatever was done. Finish (top right, any time) and the bottom button's "Finish workout" (once every main exercise is done) always ask first: "Finish Push B?", where it stands in the header's own numbers ("5 of 8 exercises done · 14 sets logged.", done meaning marked done) and, when main exercises have nothing at all (no done mark, no sets), "Not started: Chest fly, Lateral raise and 2 more.", with "Keep going" (back to the workout, nothing changes) or "Finish": the workout is filed in Log and its result page comes in (see "The result"); its Done returns to the round page. When nothing at all was logged or marked done the question is "Nothing is logged", with three answers: "Back to workout", "Finish anyway" (files it as it is) and "Cancel workout" (deletes it, as Cancel workout does). Escape answers as "Keep going" / "Back to workout" does; a second tap right after an answer lands nowhere. A reopened workout asks the same "Finish …?" question (it can't be cancelled; "Close again" closes it as finished without asking). Doing slots never completes a routine by itself. Starting the same routine again that day reopens the workout ("Reopen" on the round page). A workout left open from an earlier day (and started more than 12 hours ago) is filed as it stands the next time the app is opened, with a message.
- A multi-choice entry is one slot: done applies to the slot, and its logged sets record which choice was done.
- Rehab exercises aren't automatically Optional; the role is set per entry.
- On the workout, tapping the number box opens the logging sheet; tapping the rest of the row unfolds the exercise in place (its labelled lines, "Last time" opening the history, "Swap to", and one row of Details │ Video │ History). The bottom button logs the open exercise.
- In Log, marking a routine complete for a date also ticks its Main entries; unmarking it clears that routine's ticks for the date.
- Deleting a routine or program keeps its past completions and logged sets in the history (under the name it had when finished, or "Deleted workout" for older days that kept no name) but drops its done marks. Removing an entry drops only its done marks; its logged sets stay in the exercise's history. Deleting a master exercise keeps its logged sets in Log under the name it had. If a slot's exercise is swapped in Program after sets were logged today, those sets stay in that exercise's history and the slot starts empty.
- A workout's sets belong to the day the workout was started on. Sets fixed from Log belong to the day opened there.

## Actions that must keep working

### Workout
- The workout's list is quiet: each slot is its number, its movement (with "+1" when it has alternatives) and the prescription of the choice it shows at the end of the row; once sets are logged the end shows them, every weight with its unit ("60 kg × 10, 9 · 62.5 kg × 8 +1 drop"; without weight "15, 13 reps"; timed "45, 40 sec") and a done slot is greyed. One slot at a time is open in place (no box: a stronger number and an arrow), its facts unfolding under it as labelled lines, always in this order and only when there is something to say: Sets × reps, Equipment, Attachment, Grip, Grip width, Detail, Weight, Today, Last time ("17.5 kg × 14, 12" and its date; it opens the history), Note, Swap to; then one row of three: Details (the exercise page) │ Video │ History. Opening and closing unfolds and folds; nothing snaps. The first slot not done is open by itself (none once every main exercise is done) and the next opens when it is done; tapping a row opens that one instead, and tapping the open row closes it. The number box still opens the logging sheet directly.
- "Swap to" on a slot with one alternative swaps the slot to it for today: the row, its lines and the logging sheet are about that choice (the program's preferred choice doesn't change); the line then offers the way back. Once sets are saved, swapping moves them, after asking. With several alternatives the line opens the choices sheet, where "Use today" picks one.
- On Program, pick a routine by tapping its tab, or swipe left or right anywhere on the list to go to the next or previous one: the list follows the finger, and on release slides away as the next routine slides in beside it, or settles back if it was not pulled far. A swipe that starts on something that scrolls sideways itself, such as the tabs, only scrolls it. The workout has no routine tabs: which workout to do is chosen on the round page.
- See the routine note, its blocks and numbered slots with prescriptions and note previews.
- From an open slot, "Details" opens the exercise's reference; on Program the alternatives line (on the workout "Swap to" with several alternatives) opens a sheet listing each choice with its own reference and video buttons.
- In the reference, see the routine prescription and entry note separately from the master's targets, classification, notes, related exercises and video; open a related exercise; go to the master editor.
- Log today's sets from a slot's number (or the bottom button): the sheet shows the exercise's last 3 sessions (date, routine, every set and drop), one row per planned set (from the prescription's set count) with last time's set beside it ("17.5 kg × 14"), and grey suggestions that a tick takes when the fields are empty. Tap last time's set to copy it. Ticking saves straight away and a tick takes the grey value shown in an empty field; unticking a set takes it and its drops out of the log, and ticking it again brings the drops back; Enter in a field ticks its row (on a hardware keyboard). Add sets, and chain any number of drop sets under the set ticked last with "Drop set after set N" (always under the table, next to "Set"), and remove any drop with its × (a saved drop is taken out of the log). Switch which choice a multi-choice slot is logging. "Exercise done" marks the slot done, and it or Close also save rows that were typed but not marked done; Not done undoes it and closes the sheet; the × in the sheet's header closes it without saving rows that were typed but not ticked. There is no rest timer.
- See the workout's logged sets at the end of each slot's row, with drops counted, and as small boxes on the open slot's "Today" line. A block whose slots are all Optional has a dashed outline; slot numbers run on through it.
- Add an exercise for today only: "Add exercise for today" opens the Library, and "You sometimes add" lists what was added to this routine in the last four weeks, most often first, with a + to add it again. Added exercises are numbered after the routine's slots, logged the same way, show in Log and in the exercise's history, and never change the program. One with nothing done can be removed from its logging sheet.
- In the logging sheet: under "Last 3 times" a line says what beats last time (one more rep, or add weight once every set reached the top of the prescription's rep range), and last time's exercise note shows there. Tapping a set's number marks it as a warm-up ("W"); warm-ups never count towards bests or progress. A ticked set that beats every earlier session is marked "Best". Once a set is ticked, a note for the exercise can be typed; it is saved with the sets. Correcting a ticked set and tapping its tick keeps it ticked. Switching choice with sets ticked asks before moving them; removing an added exercise with sets ticked asks first.
- After Finish (which asks first), the result page (see "The result"): the summary with the tally against last time, new bests with what they beat, the round, up, down and same, what wasn't done, what to do next time, the way back in, the backup reminder, and deleting the workout. It opens again from the round page ("How it went ›") for a workout finished today. A workout's duration is saved with it (not when it ran over five hours, was left open overnight, or was logged for a past day).
- A reopened workout shows "Close again" in place of Cancel workout: it closes as finished and deletes nothing. A routine or program can't be deleted while its workout is in progress, and Log can't tick or untick that routine for that day. A workout in progress is what the app opens on and what the Workout tab leads to, and the running bar leads to it from every other page.
- Open an exercise's progress from the logging sheet, its reference or Log's Progress view: how many sessions since when; a chart of the last 20 sessions with a dot on each one that set a new best, and above it the latest number with its change since the first session; a switch for what the chart shows (Strength: the estimated 1-rep max, marked rough above 12 reps; Best set; Volume: kg × reps; only the ones that apply, so bodyweight and timed exercises get the best set alone); the bests (best set, and the most reps at each of the five heaviest weights); and every session newest first with its routine, a "Best" tag when it beat every earlier session, its sets (warm-ups tagged "W"), its change from the session before and that day's exercise note.
- How sets compare: warm-up sets and drops never count. With weight, the best set is the one with the highest estimated 1-rep max (weight × (1 + reps ÷ 30)). Without weight (bodyweight, assisted, timed), less assistance or more added load wins first, then reps or seconds.
- See when the routine was last finished, or that it's in progress or finished today.

### Program

- Look at any program (the header's name opens the Programs sheet) without changing which one is followed; "Follow <name>" does that, through the sheet described under Rounds. Create an empty program or a duplicate (new routine/block/entry IDs, same Library exercises); neither becomes the followed program by being made. Edit its name and note ("Program rules" in edit mode); delete it after confirmation (its routines go; Library exercises stay).
- View mode is the default and changes nothing: the routine as a quiet list, each exercise unfolding in place with its labelled lines, "Last time", its note, its alternatives, and History, Details, Video. "Edit" switches to the editor below; "Done" switches back.
- Read the routine's note in a compact disclosure.
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
- Reopen any of the eight most recent days from the list under the calendar. A finished routine goes by the name it had that day; its second line names its round, the workout's duration when it was timed, and its program when that isn't the followed one.
- Progress: this week's finished workouts (weeks start Monday), the average per week over the four weeks before, and the new bests this month; "Getting stronger", up to five exercises with three or more sessions in the last 42 days whose best set rose from the first of them to the last, with the percentage; "Stalled", up to five exercises of the followed program trained in the last 42 days whose last four sessions set no new best, with the date of the last one; "Sets per muscle this week", where a working set counts 1 for each primary target of its exercise and 0.5 for each secondary one. A row opens the exercise's progress. Sections with nothing in them are left out.
- Open any date: mark routines from the followed program as completed and edit the note, and see the sets logged that day; tapping a logged exercise opens its logging sheet to fix the sets (when its slot is still in the program), and its × removes that exercise's sets from the day after a confirmation. Past routines from other programs are shown and labelled; deleted ones go by the name they had when finished, labelled "Deleted workout". A timed workout shows its duration. Clearing the routines and note removes the day unless it has logged sets.
- Forgot to log a workout: in a past (or today's) date, "Log a workout for this day" starts that routine's workout for that date. It runs like any other workout, without a stopwatch for a past day. What was typed in the day sheet is kept when a logged exercise is removed or opened from it. Future dates can't be marked.

### Settings

- Open Settings from the gear on the round page; "‹ Round" leaves it.
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
- A page with a back link at its top (Rounds and blocks, a block, one round, Settings) also goes back by dragging from the left edge of the screen. The workout in progress doesn't: its number boxes sit where that drag starts.
- Current workout and the next useful action first; one-handed use on a narrow screen; the next action is the bottom button, in the same place on every page that has one. Lean: nothing on screen that doesn't help during a workout.
- Weights are always written with their unit: "37.5 kg × 10, 9, 8".
- History is preserved and predictable; editing and recovery are easy to trust. Editors keep their drafts until you save or close them (tapping outside doesn't discard them; Enter saves).
- Comfortable tap targets, readable contrast and type, cues that don't rely on color alone, reduced-motion support, basic keyboard and screen-reader semantics.
