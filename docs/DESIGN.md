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
- The week labels ("Week 6") were left out because how weeks are counted is undecided (see `docs/TODO.md`).
- The rest-timer note under the logging sheet was left out because the owner doesn't want a timer.
- Program keeps its routine tabs and inline editing instead of the board's list of routines.
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
| `--accent-fill`, `--accent-press` | Filled accent: primary buttons (and their pressed state), done tick boxes, today in the calendar |
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

Lists (exercise rows, Library, Program, pickers) stay flat rows, not one card per row: on a screen they run edge to edge with a soft inset divider between them, in a sheet each has a rule underneath. Cards are for grouped content: the routine note, the calendar, recent workouts, settings sections, the "Last 3 times" box, history stats and sessions.

## Components

The shared classes are in `styles/components.css`, each with a comment saying what it is.

- **Rows** (`.row`): 56px; 44px for one-line rows (`.compact`), 64px for the Library, picker and recent-workout rows (`.tall`). A title (`.row-title`) over a meta line (`.row-meta`).
- **Tick box** (`.tickbox`, 30px): an empty outline; filled accent with a tick when done. On Workout it holds the slot's number, with an accent outline when sets are logged but the slot isn't done. Done rows aren't greyed out.
- **Play button** (`.play`): a 30px circle outline. It is filled accent when the exercise has its own video, and an outline when it opens a YouTube search.
- **Pills and segments**: an outline when off. When on, they're filled with the text colour and the label in the page colour.
- **Buttons** (`.button`): 48px tall. Primary uses `--accent-fill`, the plain one `--surface-2`, danger the danger pair. Accent text alone (`.link-button`) for "+ Add exercise" and the like.
- **Sheets** (`.sheet`): a grab handle, title and × at the top, one scrolling area, and the main action fixed at the bottom. At most 84% of the screen tall; the exercise editor is full screen.
- **Logging sheet rows**: a saved row is tinted. A set and its drops sit together in one rounded group. The weight stays next to its "kg".

## Layout

- Screens and sheets use 20px side padding (`--gutter`), and cards sit 16px from the edge (`--space-4`).
- Tap targets are at least 44 × 44px (`--tap`), even when the visible shape is smaller (a 30px tick box sits in a 44px button).
- Focus rings are for keyboard use only. After a tap, buttons and links show none (iPhone Safari drew one around whatever was just tapped); text fields always show theirs. `js/app.js` tracks which input was used last.
- Layouts must work at 320px wide. Check both themes at 393 × 852 and 320 × 700 with `npm run screenshots -- <folder>`, and compare against the boards above.
