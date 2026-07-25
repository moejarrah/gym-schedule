# Exercise Classification Study

Status: approved reference. The vocabulary entered production in schema 7 and remains current in schema 9.

The approved replacement catalog adds six narrowly scoped controlled values: targets `Neck` and `Feet/toes`, plus movements `Neck movement`, `Foot/toe control`, `Hip extension`, and `Shrug`. They are included in the schema 9 production contract.

## Decision

Use a small faceted classification model. Do not create a category tree and do not require every possible biomechanics detail.

The model has four layers:

1. **Identity:** the reusable master exercise and its stable classification.
2. **Relationships:** alternatives and an optional progression family.
3. **Routine execution:** prescription and execution choices that may differ by routine.
4. **Derived browsing:** labels such as Push, Pull, Legs, and Full body calculated from the stable facts.

This avoids contradictory data. For example, `Chest` is a target, `upper` is an emphasis within that target, `horizontal press` is a movement, and `Push` is a derived browsing shortcut. They are not four competing categories.

## Master-exercise fields

### Required

| Field | Meaning | Rule |
| --- | --- | --- |
| `id` | Persistent identity | Stable and never derived from the editable name |
| `name` | Visible exercise name | Required, editable |
| `primaryTargets` | Intended targets, ordered | One or two; item 1 is dominant |
| `movementPattern` | Main movement family | One controlled value |
| `equipment` | Equipment needed | One or more values; `Bodyweight` and `None` are valid |
| `purpose` | Strength, Mobility, or Rehab | One controlled value; separate from body targets |
| `defaultPrescription` | Starting prescription | Existing behavior remains |

### Optional and useful

| Field | Meaning | Notes |
| --- | --- | --- |
| `secondaryTargets` | Meaningful involvement | Do not list every stabilizer |
| `style` | Compound, Isolation, Isometric, Carry, or Mobility/control | Broader than a compound/isolation switch |
| `laterality` | Bilateral, Unilateral, or Alternating | Useful for filtering and routine setup |
| `support` | Supported or Unsupported | Leave empty when the distinction is unclear |
| `emphases` | Region or practical bias | Controlled values: Upper chest, Scapular plane, Glute bias, or Lateral |
| `typicalChallenge` | Typical hardest range | Lengthened/bottom, middle, shortened/top, even, or variable |
| `instructions` | Stable setup and cues | Existing notes/cues |
| `videoId` | Exercise reference video | Existing behavior |
| `relatedExercises` | Substitutions and progressions | Each link may be Easier, Similar, or Harder |

Absence is preferred over `Unknown` in the interface. The editor can represent an unclassified optional field as blank.

Production stores controlled values as stable slug IDs and renders the friendly labels listed here. The workbook remains friendly-label based so it is easy to edit manually.

## Fields that do not belong on the master exercise

These can change each time the exercise is programmed:

- Full or partial range of motion
- Pause position
- Tempo or slow eccentric
- Explosive intent
- Routine-specific setup changes
- Sets, reps, duration, or per-side wording

The existing routine-entry prescription remains the owner of most of this information. If structured execution settings are added later, they belong to the routine entry, not the master exercise.

## Controlled vocabulary

### Targets

Keep visible language understandable and use optional detail instead of mixing broad groups and muscle regions at the same level.

- Chest, with optional upper/clavicular or sternocostal emphasis
- Back: Lats, Upper/mid back, Traps, Spinal erectors
- Shoulders: Front delts, Side delts, Rear delts, Rotator cuff, Serratus
- Arms: Biceps, Brachialis, Brachioradialis, Triceps
- Forearms: Flexors, Extensors, or broad Forearms for rotation/deviation work
- Core: Abs, Obliques
- Lower body: Quads, Hamstrings, Glute max, Glute med/min, Adductors, Hip flexors
- Lower leg: Calves, Tibialis anterior, Ankles

The visible browser may still group these under friendly headings such as Back, Shoulders, Arms, Core, and Legs.

### Movement patterns

Use a flat controlled list. Angle, grip, stance, and elbow path remain part of the exercise name or instructions, not separate pattern levels.

- Horizontal press, Vertical press, Fly, Horizontal pull, Vertical pull, Pullover, Shoulder raise
- Shoulder rotation, Scapular control
- Squat, Split squat/lunge, Step-up, Hip hinge, Hip thrust/bridge
- Knee extension, Knee flexion, Hip abduction, Hip adduction, Hip flexion, Hip rotation
- Calf raise, Ankle dorsiflexion, Ankle inversion, Ankle eversion
- Elbow flexion, Elbow extension, Wrist flexion, Wrist extension, Forearm rotation, Wrist deviation
- Trunk flexion, Trunk extension, Anti-extension, Anti-rotation, Anti-lateral flexion, Rotation, Lateral flexion
- Carry, Balance/control, Mobility

One main pattern is enough for the first implementation. A second pattern can be added later only if real exercises cannot be represented cleanly.

### Equipment

None, Bodyweight, Dumbbells, Barbell, Kettlebell, Cable, Machine, Band, Bench, Box/step, Pull-up bar, Suspension trainer, Foam roller, and Other.

Multiple equipment values are allowed because a dumbbell press can also require a bench.

## Derived browse groups

Do not store these as manually editable truth:

- Push
- Pull
- Legs
- Glutes
- Core
- Arms
- Forearms
- Neck
- Full body

They are shortcuts generated from targets and movement pattern. `Mobility` and `Rehab` remain explicit purpose values because they describe why the exercise exists, not which body part it uses.

## Filtering behavior

The default Library exposes only:

1. Search
2. Target
3. Primary only / Primary + secondary
4. A Filter button showing the number of active filters

The filter sheet adds Movement, Equipment, and Purpose. Style, laterality, emphasis, and typical challenge sit under `More filters`.

- OR within one group: Dumbbell **or** Cable
- AND across groups: Glutes **and** Hip hinge **and** Dumbbell
- Primary-only is the default muscle interpretation
- Primary + secondary broadens target results without changing stored classification

Cards show only the name, default prescription, dominant target, and one useful context label. Full classification belongs in the reference sheet.

## Example records

### Low incline dumbbell press

- Primary 1: Chest
- Secondary: Triceps, Front delts
- Emphasis: Upper chest
- Pattern: Horizontal press
- Equipment: Dumbbells, Bench
- Purpose: Strength
- Style: Compound
- Laterality: Bilateral
- Support: Supported
- Typical challenge: Lengthened/bottom
- Related exercise: Machine chest press (Similar)

### Romanian deadlift

- Primary 1: Hamstrings
- Primary 2: Glute max
- Secondary: Adductors, Spinal erectors
- Pattern: Hip hinge
- Equipment: Barbell
- Purpose: Strength
- Style: Compound
- Laterality: Bilateral
- Typical challenge: Lengthened/bottom

### Pallof press

- Primary 1: Obliques
- Secondary: Abs
- Pattern: Anti-rotation
- Equipment: Cable
- Purpose: Strength
- Style: Isometric
- Laterality: Unilateral

### Cable external rotation

- Primary 1: Rotator cuff
- Secondary: Rear delts
- Purpose: Rehab
- Pattern: Shoulder rotation
- Equipment: Cable
- Style: Isolation
- Laterality: Unilateral

### 90/90 hip switches

- Primary 1: Glute med/min
- Secondary: Adductors
- Purpose: Mobility
- Pattern: Hip rotation
- Equipment: None
- Style: Mobility/control
- Laterality: Alternating

## Handling the existing 77 exercises

Do not classify a large catalog ad hoc inside production code.

Historical Slice 5 used `artifacts/exports/Gym App Data.xlsx` to:

1. Preserved all 77 IDs, names, prescriptions, notes/cues, and video IDs.
2. Added the approved classification columns and exact lookup lists.
3. Classified every exercise, including press, pull, squat, hinge, isolation, carry, core, mobility, and rehab examples.
4. Added only clear alternative/progression relationships, with reciprocal rows.
5. Mechanically validated required values, target exclusion, controlled vocabularies, stable links, and blank optional uncertainty.

Historical Slice 6 converted that workbook’s reviewed labels to stable IDs and completed the then-required migration without replacing user-owned names, prescriptions, notes/cues, or videos. The old workbook is now an unused local artifact; the tracked PPLPPL 7 manifest is authoritative for the replacement catalog. This history is not current policy: later pre-release schemas may deliberately reset development data and must not add backward-compatibility work unless the owner asks.

## UI mapping

- **Workout rows:** name, routine prescription, and completion stay fast.
- **Exercise reference:** ordered targets, emphasis, compact classification facts, one related-exercise list, notes, two web-search actions, and a deliberate Edit exercise action.
- **Library:** compact rows plus progressive filters.
- **Exercise editor:** essential fields first; optional classification under one disclosure.
- **Program entry editor:** prescription and execution only; it must not edit master classification accidentally.

## Deliberately excluded

- Stabilizer lists
- Muscle contribution percentages
- Joint-by-joint anatomy
- Automatic scientific claims
- A generic free-form variant object
- A duplicate exercise for every minor grip or stance change
- A database or backend

If a setup difference materially changes what the user selects or programs, create a distinct master exercise linked to the same progression family. Minor coaching variations remain instructions.
