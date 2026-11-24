# To do

## Check on the iPhone

Things a desktop browser can't fully confirm:

- [ ] Export opens the share sheet and "Save to Files" produces a working backup.
- [ ] Tapping a text field in an editor doesn't zoom the page.
- [ ] Pressing Go/Enter on the keyboard in an editor saves.
- [ ] After an update, the installed app reloads once and shows the new version in Settings.
- [ ] Logging sheet: the number keypad appears for weight and reps, and the sheet stays usable with the keyboard open. (The iPhone number keypad has no Return key, so a set is ticked with its tick button.) Sheets don't resize for the keyboard; iOS scrolls the field being typed in into view.
- [ ] Nothing hides under the notch or the home bar, and sheets' rounded corners and the bottom navigation look right in both themes.
- [ ] Opening an editor doesn't bring up the keyboard by itself, and no focus ring shows around a button after a tap.
- [ ] The screen stays on during a workout (installed apps can since iOS 18.4), also after switching to another app and back; and a screen left on in a pocket doesn't log sets by itself.
- [ ] The bottom button and the running bar sit right above the tab bar, clear of the home bar, in both themes.

## Next

- **Training rules**: the rules in Settings are still PPLPPL 7's (12-week progression, pain rule, and a rule about home versions of rehab work, whose home routines are gone). The owner hasn't said whether they still apply to PPL 9.

## Decided against (for now)

- A rest timer. The owner doesn't want one.
- Home's day squares are narrower than the 44 px tap target (about 38 px at 393, 29 px at 320; 54 px tall) by design: the round's calendar needs seven columns in a card. Every square that opens something is a button.

## Later, when the owner asks

- **Themes**: the owner liked three of the looks shown in November 2026 ("2 - 3 - 5", most likely Ink, Volt and Sand; not confirmed) and may want them as a choice in Settings. Compactness stays: no size grows.
- **Logging sheet redesign**: put off by the owner, who didn't like the first sketches. It must keep the chart, drop sets and everything listed in `docs/PRODUCT.md`.
- **A calmer focus border for text fields, selects and pickers** in forms: today a 3 px accent ring. Two options were mocked in November 2026: the field's own border in the accent colour only, or that plus a faint accent tint of the field. The owner put it off. Buttons keep their keyboard focus rings.
- **Profiles and programs for clients**: brainstormed only. Each person has the app on their own phone; a client may edit their program, and updating a program must never touch their logs.

## Maybe later

- A "last backup: N days ago" line in Settings. Backups are the only protection if the home-screen app is deleted. Suggested in the November 2026 review; the owner hasn't asked for it.
- From the design boards (`references/redesign/`), not built and not asked for yet: Library rows showing the last logged set ("last 15 × 12"), and Program as a plain list of routines instead of tabs.
- Saved data is one piece in the phone's browser storage (about 5 MB allowed; the Library is about 0.1 MB and a workout day about 3 KB), rewritten on every save. That is years of room. If it ever gets close, keep history apart from the Library and program.
