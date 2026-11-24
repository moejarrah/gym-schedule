# How the app looks

The visual system, so new screens and changes stay consistent. The tokens live in `styles/base.css`. Use them instead of new colours, sizes or radii, and build new UI from the shared classes in `styles/components.css` (listed at the top of `base.css`) before writing new rules.

## Character

Lean, clean, compact, easy to use between sets. The owner dislikes clutter: no hint bubbles ("up next" was removed), no rest timer, no decoration. A row should fit on one line where it can, and the most useful action should be the obvious tap. Dark is the default theme. Light has to work just as well.

## Where the design came from

The current look was agreed with the owner in November 2026 on a design canvas. The agreed boards are saved in `references/redesign/` (dark theme, iPhone width):

| Board | Screen |
| --- | --- |
| `workout.png` | Workout: Active badge, tabs, compact rows with today's sets underneath |
| `logging-sheet.png` | The logging sheet (the "compact table" option the owner chose) |
| `history.png` | Exercise history sheet |
| `log.png` | Log: calendar card and recent workouts |
| `library.png` | Library: search, pill chips, rows |
| `program.png` | Program |

The boards show a few things that weren't built, and the app differs from them on purpose in these places:
- The boards have no round page. It came later and is the app's home, the first page of the Workout tab: the round and the calendar week are shown there (`docs/PRODUCT.md`, "Rounds, blocks and calendar weeks"), and the workout lost its program bar and routine tabs to it. The workout in progress is a page of that tab, with the round page's header (a bar of its main exercises) instead of the board's Active badge.
- There are four tabs (Workout · Program · Library · Log), and a bottom button above them on the round page and the workout (see "The dock" below).
- The rest-timer note under the logging sheet was left out because the owner doesn't want a timer.
- Program keeps its routine tabs instead of the board's list of routines. It opens as a read-only view, and "Edit" turns it into the editor.
- Library rows show the prescription, not "last 15 × 12".
- Log keeps the month switcher above the calendar.

`references/ui-concepts/` holds the earlier, square "Ironworks" design, kept only as history.

## Colour

Each token has a light and a dark value, which `:root` and `:root[data-theme="dark"]` define.

| Token | Use |
| --- | --- |
| `--bg` | Page background (dark `#0d0f12`) |
| `--surface` | Cards on the page, sheets |
| `--surface-2` | Cards inside sheets, secondary buttons, segments |
| `--field` | Number fields in the logging sheet |
| `--chip-raised` | Set chips on a `--surface-2` card |
| `--press` | Pressed state |
| `--line`, `--line-soft` | Borders, and the dividers between list rows |
| `--border-strong` | Outlines of empty number boxes, play circles, chips |
| `--text`, `--text-muted`, `--faint` | Main text, secondary text (prescriptions, meta), labels and placeholders |
| `--accent` | Accent text and links, the tab underline, focus rings |
| `--accent-fill`, `--accent-press` | Filled accent: primary buttons (and their pressed state), done tick boxes, today in the calendar, the running bar |
| `--on-accent` | Text and ticks on `--accent-fill` |
| `--accent-soft` | Tinted backgrounds: saved set rows, selected items |
| `--badge-bg`, `--badge-text` | The "Active" badge |
| `--up`, `--down` | Progress up and down in history (always paired with ▲/▼, never colour alone) |
| `--danger`, `--danger-soft` | Destructive buttons and errors |
| `--rehab`, `--rehab-soft` | Library purpose tags (Mobility, Rehab) and the note dash in the Log calendar |
| `--nav-bg` | Bottom navigation |

## Type

**Barlow** (500, 600, 700) for everything, with tabular numbers. **Barlow Condensed** 600, uppercase with 0.1em letter spacing, only for small labels (`.label`): section labels ("OPTIONAL GLUTE BLOCK", "LAST 3 TIMES"), kickers, tags, the "Active" badge and bottom-nav labels. Both are bundled in `fonts/`.

| Token | Size | Use |
| --- | --- | --- |
| `--fs-title` | 1.75rem | Screen titles, weight 700 ("Log", "Library") |
| `--fs-sheet` | 1.3rem | Sheet titles, weight 700; empty-state headings |
| `--fs-head` | 1.1rem | Sub-headings: the month, the routine's name, history stat values |
| `--fs-field` | 1rem | Form fields (16px, or iOS zooms in); the active program's name |
| `--fs-body` | 0.94rem | Body text, row names (weight 600), buttons, routine tabs |
| `--fs-small` | 0.88rem | Secondary text: paragraphs, segment choices, the number in a tick box |
| `--fs-meta` | 0.82rem | Prescriptions, meta lines, hints, set chips, section labels |
| `--fs-label` | 0.78rem | Small labels |
| `--fs-tag` | 0.75rem | Tags, units ("kg"), captions |

- Workout rows: the name, with the prescription right after it in `--text-muted`. Today's sets go on the line underneath.
- Routine tabs: normal case, weight 600, with a 2px accent underline on the selected tab.
- The logging sheet's number fields are 17px.

## Shapes

| Token | Radius | Use |
| --- | --- | --- |
| `--radius-chip` | 7px | Set chips, tags |
| `--radius-sm` | 9px | Tick and number boxes, the logging sheet's fields, segment buttons |
| `--radius-control` | 12px | Fields, icon buttons, set rows, rows' pressed state |
| `--radius-button` | 14px | Buttons, search fields, a row being dragged |
| `--radius-card` | 16px | Cards, on a screen or in a sheet |
| `--radius-sheet` | 22px | Top corners of bottom sheets; confirmations |
| `--radius-pill` | full | Pills (Library chips, the filter button, the choice switcher in the logging sheet), the grab handle |

Play buttons and today in the calendar are circles.

Lists (exercise rows, Library, Program, pickers) stay flat rows, not one card per row: on a screen they run edge to edge with a soft inset divider between them, in a sheet each has a rule underneath. Cards are for grouped content: the routine note, the calendar, recent workouts, settings sections, the "Last 3 times" box, the progress sheet's chart, bests and sessions, the Progress tiles.

## Components

The shared classes are in `styles/components.css`, each with a comment saying what it is.

- **Rows** (`.row`): 56px; 44px for one-line rows (`.compact`), 64px for the Library, picker and recent-workout rows (`.tall`). A title (`.row-title`) over a meta line (`.row-meta`).
- **Tick box** (`.tickbox`, 30px): an empty outline; filled accent with a tick when done. On Workout it holds the slot's number, with an accent outline when sets are logged but the slot isn't done. Done rows aren't greyed out.
- **Play button** (`.play`): a 30px circle outline. It is filled accent when the exercise has its own video, and an outline when it opens a YouTube search.
- **Pills and segments**: an outline when off. When on, they're filled with the text colour and the label in the page colour.
- **Buttons** (`.button`): 48px tall. Primary uses `--accent-fill`, the plain one `--surface-2`, danger the danger pair. Accent text alone (`.link-button`) for "+ Add exercise" and the like.
- **Sheets** (`.sheet`): a grab handle, title and × at the top, one scrolling area, and the main action fixed at the bottom. At most 84% of the screen tall; the exercise editor is full screen.
- **The dock** (`.dock`, drawn by `render()` in `js/context.js` from a view's `dock(state)`): pages keep their main action fixed at the bottom too. One 48px button above the tab bar, full width, one line cut with an ellipsis, always naming what it does on what ("Start Push B", "Log sets · Chest fly", "Finish workout"). Filled when it is the thing to do now, quiet (`--surface-2`) when it is merely there ("Reopen Push B", "Do Push A again today"). The page's own bottom padding makes room for it, and it doesn't move when the page changes. A workout's Finish is also at its top right, as an outlined pill (the shape of Program's Edit).
- **The running bar** (`.dock-bar`): while a workout runs, the dock of every other page holds one filled accent bar, 48px, two lines: the workout "in progress" and its minutes; how far it is ("3 of 8 done · next: Chest fly") and "Back →". The whole bar is one button.
- **The result** (`js/views/result.js`; "Result" in `styles/views.css`): the header is the summary, the running workout's own header (the name with its date at the right, a bar of the main exercises, two facts), with air under it; then a stack of cards (`.result-card`: `--surface`, `--radius-card`, 16px in from the edges, one 12px gap), each with its small label inside at the top and nothing floating between them. Every line of a card is one grid (`.result-line`) of fixed columns: the name at the left, the value with tabular figures, and the chevron's own column (empty on a line that opens nothing), so every chevron is in one vertical line and every value ends at the same right edge; a soft rule between lines, 44px for a one-line line. An exercise done (`.result-exercise`) adds a narrow column for its change: its movement (with a "Best" tag) over its setup, then the weight over the muted reps, right-aligned, then "▲ 2.5" in `--up` / "▼ 1 rep" in `--down` / "=" and "new" muted. A long name ends with an ellipsis so nothing at the right wraps under it. Four type sizes only: the title, the labels, one line size (`--fs-body`) for names and values alike, one meta size (`--fs-meta`). Colour only for up and down, links (accent) and Delete (danger). The optional exercises skipped fold behind one quiet line at the end of the Not done card. Done is the dock.
- **Labelled lines** (`.slot-line`): a muted label, then its value; a line that opens something is a button with its value in the accent colour and an arrow. The open exercise ends with one row of three equal cells (`.slot-tools`: Details │ Video │ History), 44px tall.
- Weights are written with their unit wherever they are listed: "37.5 kg × 10, 9, 8", "60 kg × 10 · 62.5 kg × 8"; without weight "15, 13 reps"; timed "45, 40 sec".
- **Logging sheet rows**: a saved row is tinted. A set and its drops sit together in one rounded group. The weight stays next to its "kg".

## Layout

- Screens and sheets use 20px side padding (`--gutter`), and cards sit 16px from the edge (`--space-4`).
- Tap targets are at least 44 × 44px (`--tap`), even when the visible shape is smaller (a 30px tick box sits in a 44px button).
- Focus rings are for keyboard use only. After a tap, buttons and links show none (iPhone Safari drew one around whatever was just tapped); text fields always show theirs. `js/app.js` tracks which input was used last.
- Layouts must work at 320px wide. Check both themes at 393 × 852 and 320 × 700 with `npm run screenshots -- <folder>`, and compare against the boards above.

## How it behaves

The owner notices every jump, flash and unclear button. Each rule below comes from a defect that was found and fixed; check a UI change against all of them before publishing it.

### Nothing moves unless the owner moved it

- An action changes the thing that was tapped, and adds or removes only the row that was asked for. Nothing else on screen changes position or size.
- Anything that shows up later has its space from the start: keep it on screen (disabled or empty) instead of making it appear. The logging sheet's note field and "Drop set" button are always there.
- Workout rows are quiet: number, movement, sets. Detail belongs in the one open slot, never on the closed rows. On Program and in pickers a row has the same three lines every time: the exercise (or the slot's choices, each with its own setup in grey), the prescription, the note.
- A long form is built one way: sections (`.form-section`) each headed by a small `.label`, and every line in a section is a `.field`, a muted label over one box, whether the box is typed in, picks from a list or opens a sheet (`.control.picker`). No bold row titles, numbered rows or one-off headings in between. The exercise editor is the model.
- A tag, count or icon that comes and goes must not change the height or wrapping of its row. Put it on a line of its own, or give it a fixed place.
- A sheet keeps one height while it is used. A sheet whose content grows is `.sheet.tall`.
- The control under the finger never moves because it was tapped. Tabs, chips and segments stay put; only what they control changes.

### Redraw only what changed

- Tapping what is already selected (a tab, a chip, a segment, the current screen) redraws nothing. On a tab it scrolls back to the top.
- A redraw keeps the owner's place: scroll areas are marked `data-keep-scroll`, typed text lives in the module's state, and anything open stays open.
- A class that starts an animation is taken off when the animation is over, or the next redraw plays it again.
- While the owner drags or types, update the few elements that change. Don't rebuild the list under them.

### Motion

- Changing page moves, and the direction says where the owner is going (`withMotion` in `js/context.js`, "Changing page" in `styles/base.css`): another tab slides in from the side it is on while the page that leaves slides off the other way, the two moving together (320 ms); a deeper page (the workout, Rounds and blocks, a block, one round, Settings) slides in from the right over the page that leaves, which gives way a little and dims, and going back reverses it. The pages wait for the new one to be drawn before they move (two frames), or the first steps are lost and the slide stutters. The bottom navigation and the dock never move; what the dock says changes as the page changes.
- A page with a back link (Rounds and blocks, a block, one round, Settings) and a workout's result also go back by a drag from the left edge of the screen (a past day's result uncovers Log), as on iPhone: it follows the finger over the page it uncovers, and leaves when let go past a third of the way or with a flick; otherwise it comes back (`enableBackSwipe` in `js/context.js`). The workout in progress doesn't (its `back()` answers null): its number boxes sit in the edge zone and its list is the most scrolled. A page changed under a sheet that is closing changes at once: the sheet is the motion.
- On the round page, opening another row folds the open one and unfolds the new one, as on the workout. A row open when the page arrives doesn't unfold.
- Content that is swapped in place (another routine's list, another month, a card that changed) fades in, 150–200 ms, without moving.
- Sheets slide up, slide down when closed, and follow the finger when pulled down. Confirmations pop in.
- A row that is added or removed may ease. A page never rises or drops: pages only move sideways.
- Everything respects Reduce Motion (the rule in `styles/base.css` turns animation off).

### Dragging

- The row lifts at the size it had, follows the finger, and settles exactly where it will stay. The gap it leaves is the row's own size.
- Rows make way once, when the finger crosses into a new gap, not on every movement.
- What the drop will change (order, numbers, a title) already shows while dragging.
- The list's scroll area doesn't scroll under the drag; it only auto-scrolls near its edges.

### Pressing, scrolling, focus

- A row presses as one piece: the whole row tints, not the text inside it.
- Behind an open sheet nothing scrolls. A list never drags the page with it.
- Focus rings on fields and full-width rows are drawn inside the element.

### Controls say what they do

- A button has a word, or an icon everyone knows (×, +, ›, a play triangle). An empty box is not a button: the set tick reads "Done" until it is.
- A button that acts on something says on what: "Drop set after set 2", "Go to Pull A".
- What can be tapped looks tappable, and what can't doesn't. A heading never promises an action its rows don't have.
- Anything that deletes logged work asks first, and says what goes.
- Finishing a workout always asks first, and says where it stands. A confirmation has two answers (the harmless one first and focused, so Enter and Escape change nothing); when there is a third, it is the dangerous one, on a line of its own under the other two (`extraLabel` in `confirmAction`, `js/dom.js`).
- One word per thing: "Remove" takes something out of a list or a day and keeps it elsewhere; "Delete" destroys it; "Cancel" abandons what's in progress; "Close" leaves a sheet.

### Rules a change can be checked against

These are mechanical: each can be checked by reading the code or measuring the screen.

- Every child of a scrolling column keeps its size (`flex-shrink: 0` on `.stack` and `.sheet-body` children). A squeezed child can shrink to nothing: the logging sheet's choice buttons once did.
- A sheet that holds a disclosure, or content swapped by a script, is `.sheet.tall`. A sheet's error line keeps its room when empty.
- A handler that selects something starts by returning when it is already selected.
- Markup is replaced with `redraw()`, not `innerHTML`, wherever there is a scroll area, an open disclosure or a focused field inside. Scroll areas carry `data-keep-scroll`; disclosures in generated markup carry `data-keep-open`.
- A redraw from inside a sheet puts the cursor back in the field it was in.
- Typing in a search field brings its results back to the top.
- A message for the owner while a sheet is open shows in that sheet (`toast()` puts it in the top dialog; errors go in the sheet's error line).
- Every button, link, summary and tick row is at least 44 × 44 px at 320 and 393 wide.
- A control that an action replaces is not replaced by a different action in the same place. Where that can't be avoided, the new one ignores taps for a moment: the dock does this by itself whenever what it says changes (a double tap on "Finish workout" never lands on the result's Done), the round page after a row opens, and the workout after the Finish question is answered.
- A mark that comes and goes (a tab's dot, "Best", "Preferred") has its room reserved on every sibling.
- Text of varying length (a number, its change, a caption) gets a line each, or a box of fixed height.
- Something being added exists only once its editor is saved, not when the editor opens.
- A control the app would refuse is shown disabled, with the reason. No message says "saved" when nothing changed.
- Every dialog closes through `closeDialog()`, so every one eases out.
- Content swapped in place fades in with `fresh()`; nothing else is used for it.

### Checking it

Looking isn't enough: these defects were found by measuring. For a change to how something moves, record where the affected elements are before the action, every frame during it, and after, and confirm that only the intended ones changed. Run the browser tests in both engines (`npm run e2e` and `E2E_BROWSER=webkit npm run e2e`).
