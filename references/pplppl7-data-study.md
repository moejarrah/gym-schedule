# PPLPPL 7 Program Data Study

Status: approved planning contract. Identity, program mapping, classification, relationships, and the bounded Slice 10E-D Library expansion are owner-approved.

## Source scope

The verbatim durable source is `references/source-material/pplppl7-glute-specialization.txt`. The external attachment path used during planning is not a handoff dependency.

The owner-provided program contains:

- One program: `PPLPPL 7 — Glute Specialization`.
- Six ordered gym routines.
- Three reusable Home Morning routines for Push, Pull, and Legs days.
- One Home Base choice menu containing 52 entries in seven named groups.
- No Rest routine. An untrained day remains a day without a recorded completion.
- 155 numbered exercise occurrences and 132 unique labels as written.
- Three unnumbered programming directives that must be structured rather than left as detached prose:
  - Deficit reverse lunge as an alternative to supported Bulgarian split squat.
  - Leg press or Smith squat as a separate Optional slot immediately after step-ups.
  - 45° glute-biased back extension as a note-only rotation instruction on Romanian deadlift, retaining `Do not perform both automatically` without adding another routine choice or inventing a prescription.
- 27 candidate compound choice labels that received explicit identity review.

Only 33 of the 132 labels exactly matched development Library names after case and punctuation normalization. That was an overlap floor, not a required-new-master count; the completed identity review produced the approved 177-master catalog.

The source wording is user-owned training content. Preserve its meaning and do not medically reinterpret or expand it. The reviewed manifest corrects only recorded editorial defects such as `Rehan` to `Rehab`, with each correction kept beside the untouched raw source.

## One Library, no duplicate identities

Every independently selectable exercise has one stable master ID in the global Library. Programs and routines reference those IDs; they do not own duplicate exercise records.

Create a distinct master when setup materially changes what the owner selects, classifies, watches, or programs. Use an alias when two labels mean the same exercise. Do not create a second master for capitalization, punctuation, pluralization, or a common alternate name.

Examples that require review rather than automatic merging:

- Machine shoulder press versus machine overhead press.
- Generic, lat-biased, and mid-back-biased rows.
- Upright versus lean-forward hip abduction.
- Cable versus side-lying external rotation.
- Barbell versus Smith machine hip thrust.

The reviewed global catalog is the deduplicated union of exercise identities found in the current Library and the supplied program. Every current master is reviewed as retained, cleanly renamed, merged, split, or retired; an obsolete compound, alias record, or generic placeholder does not survive merely because it existed. A valid unused exercise remains available. Seed the catalog independently of routine membership so an unassigned master remains available.

`currentMasters` in the review manifest is lineage only: it proves how each development-era record was handled. Only the approved canonical `masters` catalog and later program mapping feed seed data. There is no second Library and no old-data migration.

The Library is not limited to exercises used by the seed program. Slice 10E-D added eight independently useful masters that fill named relationship gaps. They live in the same `masters` list, never in an external or program-specific catalog.

## Canonical names and aliases

Canonical display names are reviewed text, not strings automatically rewritten at runtime.

- Use sentence case: capitalize the first word and preserve proper names and acronyms.
- Use meaningful compound hyphens: `single-leg`, `chest-supported`, `rear-delt`, `high-to-low`, `hip-flexor`, `push-up`, `Y-raise`, and `lift-off`.
- Preserve forms such as `90/90`, `45°`, `McGill`, `EZ-bar`, and `CARs`.
- Do not use all-caps `OR` or a spaced slash to join different exercises in a master name.
- Do not put a true alias into a compound master name. Store it in the optional aliases list so search can find it.
- Include the body region where a name would otherwise be ambiguous, such as shoulder versus hip internal rotation.
- Search should ignore harmless punctuation differences, so `low incline` finds `Low-incline` and `y raise` finds `Y-raise`.

Reviewed prescriptions use:

- `×` between sets and repetitions.
- An en dash in ranges: `3 × 6–10`.
- Compact suffixes such as `/side` and `/leg`.
- Consistent spacing and sentence punctuation in notes.

Do not silently auto-title-case names during ordinary editing. Automatic casing would damage names such as `90/90`, `EZ-bar`, and `Y-raise`.

Editorial cleanup happens once in the reviewed manifest, not whenever the app renders or saves. It may normalize obvious casing, spelling, dash, slash, multiplication-sign, range, and duplicate-heading defects without rewriting the training instruction.

## Programmed choices versus Library relationships

A routine slot may deliberately allow several ordered master exercises:

```text
preferred exercise
or alternative 1
or alternative 2
```

The entry stores one ordered `choices` list. Each choice contains an `exerciseId` and its routine prescription; the first choice is preferred. Repeating the same prescription is acceptable and keeps every option self-contained. This is necessary for source lines where the options use different forms, such as a timed Sorensen hold versus rep-based prone back extensions.

The visible title is derived from the current canonical Library names joined by lowercase `or`; it never stores a second display-name truth. When all choices share a prescription, the row shows it once. When prescriptions differ, the compact row preserves their source order and the choice sheet pairs each exercise with its own prescription.

This answers: “What may I perform for this exact routine slot?”

Master relationships answer a different question: “How does this exercise generally compare with another exercise?”

| Stored relation | Visible label | Meaning from the current exercise |
| --- | --- | --- |
| `easier` | Easier | The linked exercise is the easier option |
| `similar` | Alternative | The linked exercise is a comparable substitute |
| `harder` | Harder | The linked exercise is the harder progression |

Easier and Harder are directional inverses. Alternative is reciprocal. `Progression` is not a fourth relation.

Do not infer relationships merely because the source contains `or`. A reviewed programmed choice may also receive an Alternative relationship, but the two facts remain independent. Text such as `covered by`, `same function`, or `overlap` is not automatically an alternative or progression.

## Curated external Library expansion

The approved expansion stops at eight additional masters:

- Dynamic squat: Bodyweight squat, Goblet squat, and Barbell back squat.
- Horizontal press: Push-up and Barbell bench press.
- Shoulder equipment options: Dumbbell overhead press and Dumbbell lateral raise.
- Hinge equipment option: Dumbbell Romanian deadlift.

Each fills a concrete gap and has a direct relationship into the existing catalog. Dumbbell Romanian deadlift is retained because the existing Romanian-deadlift master explicitly means the barbell setup; equipment is a real selection and programming distinction in this Library. No row, arm, rehab, grip, stance, tempo, or partial-range variant is added merely for completeness.

The eight additions create eight links: Bodyweight squat → Goblet squat → Barbell back squat as a conventional Harder navigation path; Barbell back squat ↔ Smith squat; Push-up ↔ Barbell bench press ↔ Flat dumbbell press; Dumbbell overhead press ↔ Machine overhead press; Dumbbell lateral raise ↔ Cable lateral raise; and Dumbbell Romanian deadlift ↔ Romanian deadlift. The squat direction is a useful default path, not a claim that difficulty is universal at every load.

Five exact-family links improve the existing catalog without new masters: Short-lever side plank → Side plank, Serratus wall slide → Serratus wall slide with band, Supported split squat → Split squat, Band Pallof press ↔ Pallof press, and Band wood chop ↔ Cable wood chop. Standing and seated calf raises are deliberately not global alternatives because bent- versus straight-knee setup changes the training emphasis.

Evidence remains narrow:

- The NSCA [Foundations of Fitness Programming](https://www.nsca.com/contentassets/8323553f698a466a98220b21d9eb9a65/foundationsoffitnessprogramming_201508.pdf) and ACE exercise references support the compact squat family and its equipment identities.
- A peer-reviewed [push-up and bench-press comparison](https://pubmed.ncbi.nlm.nih.gov/31508485/) supports Alternative rather than a universal Easier/Harder direction.
- Peer-reviewed studies cover [dumbbell shoulder-press loading and position](https://pubmed.ncbi.nlm.nih.gov/23096062/) and [dumbbell versus cable lateral raises](https://pubmed.ncbi.nlm.nih.gov/40692697/).
- ACE explicitly documents the [dumbbell setup for Romanian deadlifts](https://www.acefitness.org/resources/pros/expert-articles/7963/what-is-the-difference-between-romanian-deadlift-vs-deadlift/).

Default prescriptions are editable editorial starting points, not research claims. Stable notes and video IDs remain blank until the owner supplies them.

## Note ownership

Keep four scopes separate:

| Scope | Owns |
| --- | --- |
| Program note | Weekly layout and Home Morning rules shared across routines |
| Routine note | Context for one routine, including the Home Base choice-menu explanation |
| Routine-entry note | Rotation, placement, warm-up, optional-addition, choice, and reviewed program-overlap wording |
| Master exercise notes | Stable setup, execution, and coaching cues for the exercise itself |

Preserve note text as safe plain text with line breaks. Do not add Markdown or rich-text storage.

Bracketed source instructions belong in entry notes unless they clearly apply to the whole routine. The interface may add a short semantic prefix such as `Rotate` or `Warm-up`, but the full source meaning must remain visible.

`New 6` is source-draft shorthand and must not appear in the reviewed app content. Normalize those Home Base notes with two plain-language forms:

- `Also programmed in: <Routine> — <exercise>.` for the same exercise or a deliberately equivalent programmed version.
- `Related work elsewhere: <Routine> — <exercise>; …` for partial movement/function overlap that is not a substitute.

Use routine names rather than day numbers so the note remains understandable if routine order changes. Preserve any important distinction as a second sentence, for example `This version is mobility rather than loaded rotation` or `This does not replace the passive stretch`.

Example:

> Related work elsewhere: Home Base — Dead bug; Pull A — Pallof press; Legs B — 45° glute-biased back extension.

These are reviewed plain-text notes, not generated coverage claims. Do not infer them from classification or turn them into a coverage engine.

## Routine blocks, order, and completion

Visible named groups such as `Glute block`, `Upper-body accessories`, and `Hip rotation and circumduction` are routine blocks. They are not Library targets, purposes, or derived categories.

- A routine owns ordered stable blocks.
- Every entry belongs to one block.
- Entry order is preserved within its block.
- Block order preserves the source program order.
- Main or Optional remains entry completion metadata; it does not silently reorder the written program.
- Optional blocks or rows receive a clear text cue. Role is not conveyed by color alone.
- Drag and Earlier/Later reorder only within the current block.
- Moving an entry to another block or changing its role is deliberate in the entry editor.
- Empty blocks do not appear in Workout. A non-empty block cannot be deleted until its entries are reassigned.

Main completion still depends on every Main entry, regardless of its block. Optional entries may appear where the source places them and never block completion.

## Home Base and morning routines

Home Base is one Home, Optional routine that references the same global Library masters. Its 52 entries are Optional and organized into the seven source blocks.

Its routine note must remain plainly visible:

> Choice menu: choose only what you need; this is not one 52-exercise session.

The normalized `Also programmed in` and `Related work elsewhere` statements remain entry notes. Home Base never auto-completes.

The three Home Morning routines are reusable alongside the six gym routines. Multiple routines can already be checked on one date, so no weekday scheduler, automatic pairing, duplicated routine, or Rest placeholder is required.

The owner will confirm Required or Optional status for the three morning routines during the reviewed content-manifest slice.

## Minimal vocabulary review

The complete catalog audit exposes six practical gaps in the current controlled vocabulary:

- Target: Neck.
- Target: Feet/toes.
- Movement: Neck movement.
- Movement: Foot/toe control.
- Movement: Hip extension, for cable kickback.
- Movement: Shrug, for loaded dumbbell and machine shrugs.

Keep these broad. Without the final two movements, cable kickback would be mislabeled as Hip thrust/bridge and loaded shrugs as Scapular control. Exercise names still carry direction and setup detail. Existing Mobility classification can represent CARs and stretches. Do not add a cervical anatomy hierarchy, foot-muscle database, coverage category, Home category, or Optional purpose.

## Reviewed manifest contract

The tracked manifest must represent:

- Canonical masters and aliases.
- Controlled classification.
- Easier, Alternative, and Harder relationships.
- Program and routine notes.
- Ordered routine blocks.
- Routine entries with role, note, and ordered `{ exercise, prescription }` choices whose first item is preferred.
- A verbatim raw-source sheet so editorial normalization remains auditable.

Every one of the 155 numbered source occurrences and all three embedded directives must resolve to a reviewed master, programmed choice, or deliberate separate Optional slot. Every candidate compound label must be marked as one identity, alias, real variant, or programmed choice.

The owner review of identities, choice order, relationship direction, routine status, capitalization, punctuation, prescriptions, and notes is complete.

`references/data/pplppl7-manifest.json` is the tracked durable manifest consumed by later implementation. The old ignored Excel workbook is unused. A new workbook may be generated from the manifest for owner review only if requested; it never becomes an implementation input.

## Evidence boundary

- The owner source controls programmed choices, prescriptions, notes, and intended routine meaning.
- Use external research only for a genuinely ambiguous exercise identity, primary/secondary target, movement classification, or Easier/Harder claim.
- Prefer peer-reviewed or authoritative primary material and record a short review note only for the disputed decision.
- Evidence may inform a proposal but never rewrite rehabilitation or pain instructions, create medical advice, or generate a bulk alternative catalog.
- Keep only decision-useful targets. Do not add activation percentages, tertiary stabilizers, anatomy trees, or speculative coverage.
- Add Alternative only for a reviewed general substitute. Add Easier/Harder only when the direction is stable for the intended setup; otherwise leave the relationship absent.
- Research notes and citations remain review material, not production exercise fields.

## Deliberately excluded

- Exercise recommendations or automatic alternative generation.
- A coverage engine inferred from New 6 notes.
- A calendar scheduler or automatic Push/Pull/Leg pairing.
- Tracking which programmed alternative was performed on a date.
- Rich text, medical rewriting, biomechanics percentages, or stabilizer databases.
