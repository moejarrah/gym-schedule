# To do

## Check on the iPhone

Things a desktop browser can't fully confirm:

- [ ] Export opens the share sheet and "Save to Files" produces a working backup.
- [ ] Tapping a text field in an editor doesn't zoom the page.
- [ ] Pressing Go/Enter on the keyboard in an editor saves.
- [ ] After an update, the installed app reloads once and shows the new version in Settings.
- [ ] Logging sheet: the number keypad appears for weight and reps, and the sheet stays usable with the keyboard open. (The iPhone number keypad has no Return key, so a set is ticked with its tick button.)
- [ ] The redesign on the phone: nothing hides under the notch or the home bar, and sheets' rounded corners and the bottom navigation look right in both themes.

## Next

- **Cleanup (agreed with the owner, November 2026).** Keep every feature: multiple programs, Home routines, the Library and its classifications, filters, the exercise editor, related exercises, videos, training rules, backups. Clean up how it's built:
  1. **Tests get their own small sample program** instead of the owner's starting data (`js/seed.js`), so changing the owner's program never breaks tests. Swapping PPLPPL 7 for PPL 9 meant rewriting about 40 browser tests.
  2. **Rewrite the styling from scratch** for the current design (`docs/DESIGN.md`). The rounded redesign was layered on top of the earlier square design, so `styles/` is about 4,600 lines with old, overridden and unused rules. Same look, much less CSS, one system of tokens.
  3. **Simplify how screens redraw.** Each screen rebuilds its HTML and then puts focus back by hand (`.focus()` calls across `js/views/`), which is fiddly and caused focus rings around tapped buttons on iPhone. Stay framework-free and without a build step.
- **Training rules**: the rules in Settings are still PPLPPL 7's (12-week progression, pain rule, and a rule about home versions of rehab work, whose home routines are gone). The owner hasn't said whether they still apply to PPL 9.
- **Week numbers** in history ("Week 6 · Sat 31 Oct"). Undecided: how a week is counted (from a program start date? the first workout?). The owner will decide; until then history shows dates only.

## Decided against (for now)

- A rest timer. The owner doesn't want one.

## Maybe later

- Store routine names in history so deleted routines show their name instead of "Deleted routine".
- From the design boards (`references/redesign/`), not built and not asked for yet: Library rows showing the last logged set ("last 15 × 12"), and Program as a plain list of routines instead of tabs.
