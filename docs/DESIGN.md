# How the app looks

The visual system, so new screens and changes stay consistent. The tokens live in `styles/base.css`. Use them instead of new colours, sizes or radii.

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
| `--accent-fill` | Filled accent: primary buttons, done number boxes, ticks, today in the calendar |
| `--accent-soft` | Tinted backgrounds: saved set rows, selected items |
| `--badge-bg`, `--badge-text` | The "Active" badge |
| `--up`, `--down` | Progress up and down in history (always paired with ▲/▼, never colour alone) |
| `--danger`, `--danger-soft` | Destructive buttons and errors |
| `--rehab` | Library purpose tags (Mobility, Rehab) and the note dot in the Log calendar |
| `--nav-bg` | Bottom navigation |

## Type

- **Barlow** (500, 600, 700) for everything, with tabular numbers. Bundled in `fonts/`.
- **Barlow Condensed** 600, uppercase with 0.1em letter spacing, only for small labels: section labels ("UPPER-BODY WORK", "LAST 3 TIMES"), dialog kickers, the "Active" badge, the "Drop" tag and bottom-nav labels.
- Screen titles: 1.75rem, weight 700, normal case ("Log", "Library").
- Sheet titles: 1.3rem, weight 700.
- Workout rows: the name at 0.94rem, weight 600, with the prescription right after it at 0.82rem in `--text-muted`. Today's sets go on the line underneath.
- Routine tabs: normal case, 0.94rem, weight 600, with a 2px accent underline on the selected tab.
- Form fields are at least 16px, or iOS zooms in. The logging sheet's fields are 17px.

## Shapes

| Token | Radius | Use |
| --- | --- | --- |
| `--radius-chip` | 7px | Set chips, small tags |
| `--radius-sm` | 9px | Number boxes, segment buttons |
| `--radius-control` | 12px | Fields, icon buttons, rows' pressed state |
| (14px) | | Buttons, search fields, cards inside sheets, set rows |
| `--radius-card` | 16px | Cards on a page (recent workouts, settings sections, history sessions) |
| `--radius-sheet` | 22px | Top corners of bottom sheets |

Some shapes are fully rounded:
- Pills (22px radius on a 44px-tall chip): Library chips, the filter button, the choice switcher in the logging sheet.
- Circles: play buttons, and today in the calendar.

Lists (exercise rows, Library, Program, pickers) stay flat rows with soft inset dividers, not one card per row. Cards are for grouped content: the routine note, the calendar, recent workouts, settings sections, the "Last 3 times" box, history stats and sessions.

## Components

- **Number box** (Workout, 30px): an empty outline when not started, an accent outline when sets are logged but the slot isn't done, filled accent with a tick when done. Done rows aren't greyed out.
- **Play button**: a 30px circle outline. It is filled accent when the exercise has its own video, and an outline when it opens a YouTube search.
- **Chips and segments**: an outline when off. When on, they're filled with the text colour and the label in the page colour.
- **Buttons**: 48px tall with a 14px radius. Primary uses `--accent-fill`, secondary `--surface-2`, danger the danger pair.
- **Sheets**: 22px top corners, a grab handle, title and × at the top, and the main action at the bottom.
- **Logging sheet rows**: a saved row is tinted. A set and its drops sit together in one rounded group. The weight stays next to its "kg".

## Layout

- Screens use 20px side padding, and cards sit 16px from the edge.
- Tap targets are at least 44 × 44px, even when the visible shape is smaller (a 30px number box sits in a 44px button).
- Layouts must work at 320px wide. Check both themes at 393 × 852 and 320 × 700 with `npm run screenshots -- <folder>`, and compare against the boards above.
