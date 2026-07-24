export const SCHEMA_VERSION = 8;
export const DEFAULT_PROGRAM_ID = "ppl-rehab";
export const DEFAULT_PROGRAM_NAME = "PPL + Rehab";

function vocabularyId(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createVocabulary(labels) {
  return labels.map((label) => ({ id: vocabularyId(label), label }));
}

export const EXERCISE_TARGETS = createVocabulary([
  "Chest",
  "Lats",
  "Upper/mid back",
  "Traps",
  "Spinal erectors",
  "Front delts",
  "Side delts",
  "Rear delts",
  "Rotator cuff",
  "Serratus",
  "Biceps",
  "Brachialis",
  "Brachioradialis",
  "Triceps",
  "Forearm flexors",
  "Forearm extensors",
  "Forearms",
  "Abs",
  "Obliques",
  "Quads",
  "Hamstrings",
  "Glute max",
  "Glute med/min",
  "Adductors",
  "Hip flexors",
  "Calves",
  "Tibialis anterior",
  "Ankles",
]);

export const MOVEMENT_PATTERNS = createVocabulary([
  "Horizontal press", "Vertical press", "Fly", "Horizontal pull", "Vertical pull", "Pullover",
  "Shoulder raise", "Shoulder rotation", "Scapular control", "Squat", "Split squat/lunge",
  "Step-up", "Hip hinge", "Hip thrust/bridge", "Knee extension", "Knee flexion",
  "Hip abduction", "Hip adduction", "Hip flexion", "Hip rotation", "Calf raise",
  "Ankle dorsiflexion", "Ankle inversion", "Ankle eversion", "Elbow flexion",
  "Elbow extension", "Wrist flexion", "Wrist extension", "Forearm rotation", "Wrist deviation",
  "Trunk flexion", "Trunk extension", "Anti-extension", "Anti-rotation", "Anti-lateral flexion",
  "Rotation", "Lateral flexion", "Carry", "Balance/control", "Mobility",
]);

export const EXERCISE_EQUIPMENT = createVocabulary([
  "None", "Bodyweight", "Dumbbells", "Barbell", "Kettlebell", "Cable", "Machine", "Band",
  "Bench", "Box/step", "Pull-up bar", "Suspension trainer", "Foam roller", "Other",
]);

export const EXERCISE_PURPOSES = createVocabulary(["Strength", "Mobility", "Rehab"]);
export const EXERCISE_STYLES = createVocabulary(["Compound", "Isolation", "Isometric", "Carry", "Mobility/control"]);
export const EXERCISE_LATERALITIES = createVocabulary(["Bilateral", "Unilateral", "Alternating"]);
export const EXERCISE_SUPPORTS = createVocabulary(["Supported", "Unsupported"]);
export const EXERCISE_EMPHASES = createVocabulary(["Upper chest", "Scapular plane", "Glute bias", "Lateral"]);
export const EXERCISE_CHALLENGES = createVocabulary(["Lengthened/bottom", "Middle", "Shortened/top", "Even", "Variable"]);
export const RELATED_EXERCISE_RELATIONS = createVocabulary(["Easier", "Similar", "Harder"]);

const classificationLabels = new Map([
  EXERCISE_TARGETS,
  MOVEMENT_PATTERNS,
  EXERCISE_EQUIPMENT,
  EXERCISE_PURPOSES,
  EXERCISE_STYLES,
  EXERCISE_LATERALITIES,
  EXERCISE_SUPPORTS,
  EXERCISE_EMPHASES,
  EXERCISE_CHALLENGES,
  RELATED_EXERCISE_RELATIONS,
].flat().map((option) => [option.id, option.label]));

export function classificationLabel(id) {
  return classificationLabels.get(id) || id;
}

// ID, ordered primary targets, secondary targets, movement, equipment, purpose,
// style, laterality, support, emphases, typical challenge.
const exerciseClassificationSeeds = [
  ["low-incline-dumbbell-press",["Chest"],["Triceps","Front delts"],"Horizontal press",["Dumbbells","Bench"],"Strength","Compound","Bilateral","Supported",["Upper chest"],"Lengthened/bottom"],
  ["machine-chest-press",["Chest"],["Triceps","Front delts"],"Horizontal press",["Machine"],"Strength","Compound","Bilateral","Supported",[],"Variable"],
  ["scaption-raise",["Side delts"],["Serratus","Rotator cuff"],"Shoulder raise",["Dumbbells"],"Rehab","Isolation","Bilateral","Unsupported",["Scapular plane"],"Variable"],
  ["rope-pushdown",["Triceps"],[],"Elbow extension",["Cable"],"Strength","Isolation","Bilateral","Unsupported",[],"Shortened/top"],
  ["cable-external-rotation",["Rotator cuff"],["Rear delts"],"Shoulder rotation",["Cable"],"Rehab","Isolation","Unilateral","Unsupported",[],"Variable"],
  ["cable-serratus-punch",["Serratus"],["Front delts"],"Scapular control",["Cable"],"Rehab","Isolation","Unilateral","Unsupported",[],"Shortened/top"],
  ["chest-supported-row",["Upper/mid back","Lats"],["Biceps","Rear delts"],"Horizontal pull",["Dumbbells","Bench"],"Strength","Compound","Bilateral","Supported",[],"Middle"],
  ["neutral-grip-lat-pulldown",["Lats"],["Upper/mid back","Biceps","Brachialis"],"Vertical pull",["Machine"],"Strength","Compound","Bilateral","Supported",[],"Lengthened/bottom"],
  ["chest-supported-rear-delt-raise",["Rear delts"],["Upper/mid back"],"Shoulder raise",["Dumbbells","Bench"],"Strength","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["incline-y-raise",["Traps"],["Serratus","Rotator cuff"],"Scapular control",["Dumbbells","Bench"],"Rehab","Isolation","Bilateral","Supported",[],"Variable"],
  ["preacher-curl",["Biceps"],["Brachialis"],"Elbow flexion",["Machine"],"Strength","Isolation","Bilateral","Supported",[],"Lengthened/bottom"],
  ["wrist-curl",["Forearm flexors"],[],"Wrist flexion",["Dumbbells"],"Strength","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["reverse-wrist-curl",["Forearm extensors"],[],"Wrist extension",["Dumbbells"],"Strength","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["pallof-press",["Obliques"],["Abs"],"Anti-rotation",["Cable"],"Strength","Isometric","Unilateral","Unsupported",[],"Even"],
  ["hack-squat",["Quads","Glute max"],["Adductors"],"Squat",["Machine"],"Strength","Compound","Bilateral","Supported",[],"Lengthened/bottom"],
  ["supported-bulgarian-split-squat-or-supported-split-squat",["Quads","Glute max"],["Adductors"],"Split squat/lunge",["Bodyweight","Other"],"Strength","Compound","Unilateral","Supported",[],"Lengthened/bottom"],
  ["seated-leg-curl",["Hamstrings"],[],"Knee flexion",["Machine"],"Strength","Isolation","Bilateral","Supported",[],"Lengthened/bottom"],
  ["leg-extension",["Quads"],[],"Knee extension",["Machine"],"Strength","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["standing-calf-raise",["Calves"],[],"Calf raise",["Machine"],"Strength","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["tibialis-raise",["Tibialis anterior"],[],"Ankle dorsiflexion",["Bodyweight"],"Rehab","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["adductor-machine",["Adductors"],[],"Hip adduction",["Machine"],"Strength","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["ankle-inversion",["Ankles"],[],"Ankle inversion",["Band"],"Rehab","Isolation","Unilateral","",[],"Variable"],
  ["ankle-eversion",["Ankles"],[],"Ankle eversion",["Band"],"Rehab","Isolation","Unilateral","",[],"Variable"],
  ["single-leg-balance",["Ankles"],["Glute med/min","Obliques"],"Balance/control",["None"],"Rehab","Mobility/control","Unilateral","Unsupported",[],"Variable"],
  ["machine-overhead-press",["Front delts","Side delts"],["Triceps"],"Vertical press",["Machine"],"Strength","Compound","Bilateral","Supported",[],"Middle"],
  ["flat-dumbbell-press-or-machine-chest-press",["Chest"],["Triceps","Front delts"],"Horizontal press",["Dumbbells","Bench","Machine"],"Strength","Compound","Bilateral","Supported",[],"Variable"],
  ["regular-chest-pec-deck-or-short-range-cable-fly",["Chest"],[],"Fly",["Machine","Cable"],"Strength","Isolation","Bilateral","",[],"Shortened/top"],
  ["scaption-raise-or-very-light-cable-lateral-raise",["Side delts"],["Serratus","Rotator cuff"],"Shoulder raise",["Dumbbells","Cable"],"Rehab","Isolation","Bilateral","Unsupported",["Scapular plane"],"Variable"],
  ["assisted-neutral-grip-pull-up-or-neutral-pulldown",["Lats"],["Upper/mid back","Biceps","Brachialis"],"Vertical pull",["Pull-up bar","Machine"],"Strength","Compound","Bilateral","Supported",[],"Lengthened/bottom"],
  ["one-arm-cable-row",["Upper/mid back","Lats"],["Biceps","Rear delts"],"Horizontal pull",["Cable"],"Strength","Compound","Unilateral","Unsupported",[],"Middle"],
  ["cable-y-raise",["Traps"],["Serratus","Rotator cuff"],"Scapular control",["Cable"],"Rehab","Isolation","Bilateral","Unsupported",[],"Variable"],
  ["chest-supported-rear-delt-raise-or-prone-w-raise",["Rear delts"],["Upper/mid back","Rotator cuff"],"Scapular control",["Dumbbells","Bench"],"Strength","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["bayesian-curl",["Biceps"],["Brachialis"],"Elbow flexion",["Cable"],"Strength","Isolation","Unilateral","Unsupported",[],"Lengthened/bottom"],
  ["hammer-curl",["Brachialis","Biceps"],["Brachioradialis"],"Elbow flexion",["Dumbbells"],"Strength","Isolation","Bilateral","Unsupported",[],"Variable"],
  ["reverse-curl",["Brachioradialis","Brachialis"],["Biceps","Forearm extensors"],"Elbow flexion",["Barbell"],"Strength","Isolation","Bilateral","Unsupported",[],"Variable"],
  ["suitcase-carry",["Obliques"],["Forearms","Traps","Glute med/min"],"Carry",["Dumbbells","Kettlebell"],"Strength","Carry","Unilateral","Unsupported",[],"Even"],
  ["cable-pronation",["Forearms"],[],"Forearm rotation",["Cable"],"Rehab","Isolation","Unilateral","Supported",[],"Variable"],
  ["cable-supination",["Forearms"],["Biceps"],"Forearm rotation",["Cable"],"Rehab","Isolation","Unilateral","Supported",[],"Variable"],
  ["radial-deviation",["Forearms"],[],"Wrist deviation",["Dumbbells"],"Rehab","Isolation","Unilateral","Supported",[],"Variable"],
  ["ulnar-deviation",["Forearms"],[],"Wrist deviation",["Dumbbells"],"Rehab","Isolation","Unilateral","Supported",[],"Variable"],
  ["romanian-deadlift",["Hamstrings","Glute max"],["Adductors","Spinal erectors"],"Hip hinge",["Barbell"],"Strength","Compound","Bilateral","Unsupported",[],"Lengthened/bottom"],
  ["hip-thrust",["Glute max"],["Hamstrings"],"Hip thrust/bridge",["Barbell","Bench"],"Strength","Compound","Bilateral","Supported",[],"Shortened/top"],
  ["glute-biased-step-up",["Glute max","Quads"],["Glute med/min"],"Step-up",["Box/step","Dumbbells"],"Strength","Compound","Unilateral","Unsupported",["Glute bias"],"Lengthened/bottom"],
  ["lying-leg-curl",["Hamstrings"],[],"Knee flexion",["Machine"],"Strength","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["back-extension-machine",["Spinal erectors","Glute max"],["Hamstrings"],"Trunk extension",["Machine"],"Strength","Compound","Bilateral","Supported",[],"Lengthened/bottom"],
  ["hip-abduction-machine",["Glute med/min"],[],"Hip abduction",["Machine"],"Strength","Isolation","Bilateral","Supported",[],"Shortened/top"],
  ["seated-calf-raise",["Calves"],[],"Calf raise",["Machine"],"Strength","Isolation","Bilateral","Supported",[],"Lengthened/bottom"],
  ["standing-cable-hip-flexion-cable-psoas-march",["Hip flexors"],["Abs","Quads"],"Hip flexion",["Cable"],"Rehab","Isolation","Unilateral","Unsupported",[],"Shortened/top"],
  ["hip-internal-rotation",["Glute med/min"],["Adductors"],"Hip rotation",["Band"],"Rehab","Isolation","Unilateral","",[],"Variable"],
  ["hip-external-rotation",["Glute med/min"],[],"Hip rotation",["Band"],"Rehab","Isolation","Unilateral","",[],"Variable"],
  ["dead-bug",["Abs"],["Hip flexors"],"Anti-extension",["None"],"Strength","Mobility/control","Alternating","Unsupported",[],"Even"],
  ["side-plank-with-hip-abduction",["Obliques","Glute med/min"],["Abs"],"Anti-lateral flexion",["Bodyweight"],"Strength","Isometric","Unilateral","Unsupported",[],"Even"],
  ["bird-dog",["Abs","Glute max"],["Spinal erectors"],"Anti-rotation",["Bodyweight"],"Strength","Mobility/control","Alternating","Unsupported",[],"Even"],
  ["modified-curl-up",["Abs"],[],"Trunk flexion",["Bodyweight"],"Strength","Isometric","Bilateral","Unsupported",[],"Even"],
  ["back-to-wall-y-raise-wall-angel",["Traps"],["Serratus","Rotator cuff","Rear delts"],"Scapular control",["None"],"Mobility","Mobility/control","Bilateral","Supported",[],"Variable"],
  ["serratus-wall-slide",["Serratus"],["Traps","Rotator cuff"],"Scapular control",["None"],"Rehab","Mobility/control","Bilateral","Supported",[],"Variable"],
  ["push-up-plus",["Chest","Serratus"],["Triceps","Front delts"],"Horizontal press",["Bodyweight"],"Strength","Compound","Bilateral","Unsupported",[],"Shortened/top"],
  ["prone-w-raise",["Rear delts","Rotator cuff"],["Upper/mid back"],"Scapular control",["None"],"Rehab","Mobility/control","Bilateral","Supported",[],"Shortened/top"],
  ["clamshell-side-lying-hip-abduction",["Glute med/min"],[],"Hip abduction",["Bodyweight","Band"],"Rehab","Isolation","Unilateral","Supported",[],"Shortened/top"],
  ["cat-cow",["Spinal erectors"],["Abs"],"Mobility",["None"],"Mobility","Mobility/control","Bilateral","Supported",[],"Variable"],
  ["knee-to-wall-ankle-rocks",["Ankles"],["Calves"],"Mobility",["None"],"Mobility","Mobility/control","Unilateral","Supported",[],"Variable"],
  ["half-kneeling-hip-flexor-stretch",["Hip flexors"],["Quads"],"Mobility",["None"],"Mobility","Mobility/control","Unilateral","Supported",[],"Lengthened/bottom"],
  ["active-straight-leg-raise",["Hamstrings"],["Hip flexors"],"Mobility",["None"],"Mobility","Mobility/control","Unilateral","Unsupported",[],"Lengthened/bottom"],
  ["90-90-hip-switches",["Glute med/min","Adductors"],["Hip flexors"],"Hip rotation",["None"],"Mobility","Mobility/control","Alternating","Supported",[],"Variable"],
  ["hip-hinge",["Hamstrings","Glute max"],["Spinal erectors"],"Hip hinge",["None"],"Mobility","Mobility/control","Bilateral","Unsupported",[],"Variable"],
  ["supported-deep-squat-hold",["Quads","Glute max"],["Adductors","Ankles"],"Squat",["None"],"Mobility","Isometric","Bilateral","Supported",[],"Lengthened/bottom"],
  ["glute-bridge",["Glute max","Hamstrings"],[],"Hip thrust/bridge",["Bodyweight"],"Strength","Compound","Bilateral","Supported",[],"Shortened/top"],
  ["sitting-in-squat",["Quads","Glute max"],["Adductors","Ankles"],"Squat",["None"],"Mobility","Isometric","Bilateral","Unsupported",[],"Lengthened/bottom"],
  ["quadruped-back-rotations",["Upper/mid back"],["Obliques"],"Rotation",["None"],"Mobility","Mobility/control","Unilateral","Supported",[],"Variable"],
  ["towel-shoulder-stretch",["Rotator cuff"],[],"Mobility",["Other"],"Mobility","Mobility/control","Unilateral","",[],"Lengthened/bottom"],
  ["foam-roller-chest-stretch-with-weights",["Chest"],["Front delts"],"Mobility",["Foam roller","Dumbbells"],"Mobility","Mobility/control","Bilateral","Supported",[],"Lengthened/bottom"],
  ["goblet-squat-hold",["Quads","Glute max"],["Adductors","Ankles"],"Squat",["Dumbbells","Kettlebell"],"Mobility","Isometric","Bilateral","Unsupported",[],"Lengthened/bottom"],
  ["supported-cossack-squat",["Adductors","Quads"],["Glute med/min","Hamstrings"],"Squat",["None"],"Mobility","Compound","Unilateral","Supported",["Lateral"],"Lengthened/bottom"],
  ["slow-romanian-deadlift-3-sec-down",["Hamstrings","Glute max"],["Adductors","Spinal erectors"],"Hip hinge",["Barbell","Dumbbells"],"Mobility","Compound","Bilateral","Unsupported",[],"Lengthened/bottom"],
  ["supported-deep-split-squat",["Quads","Glute max"],["Adductors"],"Split squat/lunge",["None"],"Mobility","Compound","Unilateral","Supported",[],"Lengthened/bottom"],
  ["90-90-lean-or-loaded-90-90-hold",["Glute med/min","Adductors"],["Hip flexors"],"Hip rotation",["None"],"Mobility","Isometric","Unilateral","Supported",[],"Lengthened/bottom"],
  ["short-lever-copenhagen-plank-adductor-side-plank",["Adductors","Obliques"],["Abs"],"Hip adduction",["Bodyweight","Bench"],"Strength","Isometric","Unilateral","Supported",[],"Even"],
];

const relatedExerciseSeedPairs = [
  ["low-incline-dumbbell-press","machine-chest-press","similar"],
  ["machine-chest-press","flat-dumbbell-press-or-machine-chest-press","similar"],
  ["scaption-raise","scaption-raise-or-very-light-cable-lateral-raise","similar"],
  ["chest-supported-row","one-arm-cable-row","similar"],
  ["neutral-grip-lat-pulldown","assisted-neutral-grip-pull-up-or-neutral-pulldown","similar"],
  ["chest-supported-rear-delt-raise","chest-supported-rear-delt-raise-or-prone-w-raise","similar"],
  ["incline-y-raise","cable-y-raise","similar"],
  ["preacher-curl","bayesian-curl","similar"],
  ["supported-bulgarian-split-squat-or-supported-split-squat","supported-deep-split-squat","similar"],
  ["seated-leg-curl","lying-leg-curl","similar"],
  ["standing-calf-raise","seated-calf-raise","similar"],
  ["chest-supported-rear-delt-raise-or-prone-w-raise","prone-w-raise","similar"],
  ["romanian-deadlift","slow-romanian-deadlift-3-sec-down","similar"],
  ["hip-hinge","romanian-deadlift","harder"],
  ["glute-bridge","hip-thrust","harder"],
  ["hip-abduction-machine","clamshell-side-lying-hip-abduction","similar"],
  ["90-90-hip-switches","90-90-lean-or-loaded-90-90-hold","harder"],
  ["supported-deep-squat-hold","goblet-squat-hold","harder"],
  ["supported-deep-squat-hold","sitting-in-squat","similar"],
];

const routineSeeds = [
  {
    id: "push-a",
    name: "Push A",
    group: "gym",
    status: "required",
    exercises: [
      ["push-a-1", "low-incline-dumbbell-press", "Low incline dumbbell press", "3 × 8-12"],
      ["push-a-2", "machine-chest-press", "Machine chest press", "2 × 8-12"],
      ["push-a-3", "scaption-raise", "Scaption raise", "2 × 12-20"],
      ["push-a-4", "rope-pushdown", "Rope pushdown", "2-3 × 10-15"],
      ["push-a-5", "cable-external-rotation", "Cable external rotation", "2 × 15-20/side"],
      ["push-a-6", "cable-serratus-punch", "Cable serratus punch", "2 × 12-15/side"],
    ],
  },
  {
    id: "pull-a",
    name: "Pull A",
    group: "gym",
    status: "required",
    exercises: [
      ["pull-a-1", "chest-supported-row", "Chest-supported row", "3 × 8-12"],
      ["pull-a-2", "neutral-grip-lat-pulldown", "Neutral-grip lat pulldown", "3 × 8-12"],
      ["pull-a-3", "chest-supported-rear-delt-raise", "Chest-supported rear-delt raise", "2 × 12-20"],
      ["pull-a-4", "incline-y-raise", "Incline Y raise", "2 × 10-15"],
      ["pull-a-5", "preacher-curl", "Preacher curl", "2-3 × 8-12"],
      ["pull-a-6", "wrist-curl", "Wrist curl", "2 × 12-20"],
      ["pull-a-7", "reverse-wrist-curl", "Reverse wrist curl", "2 × 12-20"],
      ["pull-a-8", "pallof-press", "Pallof press", "2 × 10-15/side"],
    ],
  },
  {
    id: "legs-a",
    name: "Legs A",
    group: "gym",
    status: "required",
    exercises: [
      ["legs-a-1", "hack-squat", "Hack squat", "3 × 6-10"],
      ["legs-a-2", "supported-bulgarian-split-squat-or-supported-split-squat", "Supported Bulgarian split squat OR supported split squat", "2-3 × 8-10/leg"],
      ["legs-a-3", "seated-leg-curl", "Seated leg curl", "2-3 × 10-15"],
      ["legs-a-4", "leg-extension", "Leg extension", "2-3 × 10-15"],
      ["legs-a-5", "standing-calf-raise", "Standing calf raise", "3-4 × 8-15"],
      ["legs-a-6", "tibialis-raise", "Tibialis raise", "2-3 × 12-20"],
      ["legs-a-7", "adductor-machine", "Adductor machine", "2-3 × 12-20"],
      ["legs-a-8", "ankle-inversion", "Ankle inversion", "2 × 12-20/side"],
      ["legs-a-9", "ankle-eversion", "Ankle eversion", "2 × 12-20/side"],
      ["legs-a-10", "single-leg-balance", "Single-leg balance", "1-2 × 30-60 sec/side"],
    ],
  },
  {
    id: "push-b",
    name: "Push B",
    group: "gym",
    status: "required",
    exercises: [
      ["push-b-1", "machine-overhead-press", "Machine overhead press", "3 × 8-12"],
      ["push-b-2", "flat-dumbbell-press-or-machine-chest-press", "Flat dumbbell press OR machine chest press", "2-3 × 8-12"],
      ["push-b-3", "regular-chest-pec-deck-or-short-range-cable-fly", "Regular chest pec deck OR short-range cable fly", "1-2 × 12-15"],
      ["push-b-4", "scaption-raise-or-very-light-cable-lateral-raise", "Scaption raise OR very light cable lateral raise", "2 × 12-20"],
      ["push-b-5", "rope-pushdown", "Rope pushdown", "2-3 × 10-15"],
      ["push-b-6", "cable-external-rotation", "Cable external rotation", "2 × 15-20/side"],
    ],
  },
  {
    id: "pull-b",
    name: "Pull B",
    group: "gym",
    status: "required",
    exercises: [
      ["pull-b-1", "assisted-neutral-grip-pull-up-or-neutral-pulldown", "Assisted neutral-grip pull-up OR neutral pulldown", "3 × 6-10"],
      ["pull-b-2", "one-arm-cable-row", "One-arm cable row", "3 × 8-12/side"],
      ["pull-b-3", "cable-y-raise", "Cable Y raise", "2 × 12-15"],
      ["pull-b-4", "chest-supported-rear-delt-raise-or-prone-w-raise", "Chest-supported rear-delt raise OR prone W raise", "2 × 12-20"],
      ["pull-b-5", "bayesian-curl", "Bayesian curl", "2-3 × 10-15/side"],
      ["pull-b-6", "hammer-curl", "Hammer curl", "2 × 10-15"],
      ["pull-b-7", "reverse-curl", "Reverse curl", "1-2 × 10-15"],
      ["pull-b-8", "suitcase-carry", "Suitcase carry", "2-3 rounds/side"],
      ["pull-b-9", "cable-pronation", "Cable pronation", "1-2 × 12-20/side"],
      ["pull-b-10", "cable-supination", "Cable supination", "1-2 × 12-20/side"],
      ["pull-b-11", "radial-deviation", "Radial deviation", "1-2 × 12-20/side"],
      ["pull-b-12", "ulnar-deviation", "Ulnar deviation", "1-2 × 12-20/side"],
    ],
  },
  {
    id: "legs-b",
    name: "Legs B",
    group: "gym",
    status: "optional",
    exercises: [
      ["legs-b-1", "romanian-deadlift", "Romanian deadlift", "3 × 6-10"],
      ["legs-b-2", "hip-thrust", "Hip thrust", "3 × 8-12"],
      ["legs-b-3", "glute-biased-step-up", "Glute-biased step-up", "2-3 × 8-12/leg"],
      ["legs-b-4", "lying-leg-curl", "Lying leg curl", "2-3 × 10-15"],
      ["legs-b-5", "back-extension-machine", "Back extension machine", "2-3 × 8-15"],
      ["legs-b-6", "hip-abduction-machine", "Hip abduction machine", "2-3 × 12-20"],
      ["legs-b-7", "seated-calf-raise", "Seated calf raise", "3-4 × 10-20"],
      ["legs-b-8", "standing-cable-hip-flexion-cable-psoas-march", "Standing cable hip flexion / cable psoas march", "2 × 12-20/side"],
      ["legs-b-9", "hip-internal-rotation", "Hip internal rotation", "2 × 12-20/side"],
      ["legs-b-10", "hip-external-rotation", "Hip external rotation", "2 × 12-20/side"],
    ],
  },
  {
    id: "home-daily",
    name: "Home Daily",
    group: "home",
    status: "required",
    exercises: [
      ["home-daily-1", "dead-bug", "Dead bug", "2 × 5-8"],
      ["home-daily-2", "side-plank-with-hip-abduction", "Side plank (with hip abduction)", "2 × 15-30 sec/side"],
      ["home-daily-3", "bird-dog", "Bird dog", "1-2 × 5-8/side"],
      ["home-daily-4", "modified-curl-up", "Modified curl-up", "2 × 8-12"],
      ["home-daily-5", "back-to-wall-y-raise-wall-angel", "Back-to-wall Y raise / wall angel", "2 × 8-12"],
      ["home-daily-6", "serratus-wall-slide", "Serratus wall slide", "2 × 8-12"],
      ["home-daily-7", "push-up-plus", "Push-up plus", "2 × 10-15"],
      ["home-daily-8", "prone-w-raise", "Prone W raise", "2 × 10-15"],
      ["home-daily-9", "clamshell-side-lying-hip-abduction", "Clamshell / Side-lying hip abduction", "2 × 10-15/side"],
      ["home-daily-10", "cat-cow", "Cat-cow", "1 × 6-8"],
      ["home-daily-11", "knee-to-wall-ankle-rocks", "Knee-to-wall ankle rocks", "2 × 8-12/side"],
      ["home-daily-12", "half-kneeling-hip-flexor-stretch", "Half-kneeling hip flexor stretch", "1-2 × 20-30 sec/side"],
      ["home-daily-13", "active-straight-leg-raise", "Active straight-leg raise", "2 × 5-8/leg"],
      ["home-daily-14", "90-90-hip-switches", "90/90 hip switches", "1-2 × 8-10 total"],
      ["home-daily-15", "hip-hinge", "Hip hinge", "2 × 8-12"],
      ["home-daily-16", "supported-deep-squat-hold", "Supported deep squat hold", "1-2 × 20-30 sec"],
      ["home-daily-17", "glute-bridge", "Glute bridge", "2 × 8-12"],
      ["home-daily-18", "sitting-in-squat", "Sitting in squat", "1-2 × 20-30 sec"],
      ["home-daily-19", "quadruped-back-rotations", "Quadruped back rotations", "1-2 × 5-8/side"],
      ["home-daily-20", "towel-shoulder-stretch", "Towel shoulder stretch", "2 × 20-30 sec/side"],
      ["home-daily-21", "foam-roller-chest-stretch-with-weights", "Foam roller chest stretch with weights", "1-2 × 20-30 sec"],
    ],
  },
  {
    id: "home-rehab",
    name: "Home Rehab",
    group: "home",
    status: "optional",
    exercises: [
      ["home-rehab-1", "ankle-inversion", "Ankle inversion", "2 × 12-20/side"],
      ["home-rehab-2", "ankle-eversion", "Ankle eversion", "2 × 12-20/side"],
      ["home-rehab-3", "single-leg-balance", "Single-leg balance", "1-2 × 30-60 sec/side"],
      ["home-rehab-4", "hip-internal-rotation", "Hip internal rotation", "2 × 12-20/side"],
      ["home-rehab-5", "hip-external-rotation", "Hip external rotation", "2 × 12-20/side"],
    ],
  },
  {
    id: "loaded-mobility",
    name: "Loaded Mobility",
    group: "home",
    status: "optional",
    exercises: [
      ["loaded-mobility-1", "goblet-squat-hold", "Goblet squat hold", "2 × 20-30 sec"],
      ["loaded-mobility-2", "supported-cossack-squat", "Supported Cossack squat", "2 × 5-8/side"],
      ["loaded-mobility-3", "slow-romanian-deadlift-3-sec-down", "Slow Romanian deadlift (3 sec down)", "2 × 6-8"],
      ["loaded-mobility-4", "supported-deep-split-squat", "Supported deep split squat", "2 × 6-8/side"],
      ["loaded-mobility-5", "90-90-lean-or-loaded-90-90-hold", "90/90 lean or loaded 90/90 hold", "2 × 20-30 sec/side"],
      ["loaded-mobility-6", "short-lever-copenhagen-plank-adductor-side-plank", "Short-lever Copenhagen plank / adductor side plank", "2 × 10-20 sec/side"],
    ],
  },
];

function idFromLabel(label, vocabulary) {
  if (!label) return "";
  const option = vocabulary.find((item) => item.label === label);
  if (!option) throw new Error(`Unknown reviewed classification value: ${label}`);
  return option.id;
}

function idsFromLabels(labels, vocabulary) {
  return labels.map((label) => idFromLabel(label, vocabulary));
}

const inverseRelation = { easier: "harder", similar: "similar", harder: "easier" };
const reviewedClassificationById = new Map(exerciseClassificationSeeds.map(([
  id,
  primaryTargets,
  secondaryTargets,
  movementPattern,
  equipment,
  purpose,
  style,
  laterality,
  support,
  emphases,
  typicalChallenge,
]) => [id, {
  primaryTargets: idsFromLabels(primaryTargets, EXERCISE_TARGETS),
  secondaryTargets: idsFromLabels(secondaryTargets, EXERCISE_TARGETS),
  movementPattern: idFromLabel(movementPattern, MOVEMENT_PATTERNS),
  equipment: idsFromLabels(equipment, EXERCISE_EQUIPMENT),
  purpose: idFromLabel(purpose, EXERCISE_PURPOSES),
  style: idFromLabel(style, EXERCISE_STYLES),
  laterality: idFromLabel(laterality, EXERCISE_LATERALITIES),
  support: idFromLabel(support, EXERCISE_SUPPORTS),
  emphases: idsFromLabels(emphases, EXERCISE_EMPHASES),
  typicalChallenge: idFromLabel(typicalChallenge, EXERCISE_CHALLENGES),
  relatedExercises: [],
}]));

for (const [sourceId, targetId, relation] of relatedExerciseSeedPairs) {
  const source = reviewedClassificationById.get(sourceId);
  const target = reviewedClassificationById.get(targetId);
  if (!source || !target) throw new Error(`Unknown reviewed exercise relationship: ${sourceId} / ${targetId}`);
  source.relatedExercises.push({ exerciseId: targetId, relation });
  target.relatedExercises.push({ exerciseId: sourceId, relation: inverseRelation[relation] });
}

export const REVIEWED_EXERCISE_IDS = [...reviewedClassificationById.keys()];

export function getReviewedExerciseClassification(exerciseId) {
  const classification = reviewedClassificationById.get(exerciseId);
  return classification ? JSON.parse(JSON.stringify(classification)) : null;
}

function buildDefaults() {
  const exerciseMap = new Map();
  const routines = routineSeeds.map((routine) => {
    const entries = routine.exercises.map(([entryId, exerciseId, name, prescription]) => {
      if (!exerciseMap.has(exerciseId)) {
        const classification = getReviewedExerciseClassification(exerciseId);
        if (!classification) throw new Error(`Missing reviewed exercise classification: ${exerciseId}`);
        exerciseMap.set(exerciseId, {
          id: exerciseId,
          name,
          ...classification,
          defaultPrescription: prescription,
          instructions: "",
          videoId: "",
        });
      }
      return {
        id: entryId,
        exerciseId,
        prescription,
        role: "main",
      };
    });
    return {
      id: routine.id,
      name: routine.name,
      group: routine.group,
      status: routine.status,
      entries,
    };
  });

  return {
    version: SCHEMA_VERSION,
    exercises: [...exerciseMap.values()],
    routines,
    programs: [{
      id: DEFAULT_PROGRAM_ID,
      name: DEFAULT_PROGRAM_NAME,
      routineIds: routines.map((routine) => routine.id),
    }],
    sessions: {},
    settings: {
      activeProgramId: DEFAULT_PROGRAM_ID,
      activeRoutineId: "push-a",
      theme: "light",
    },
  };
}

export function createDefaultState() {
  return JSON.parse(JSON.stringify(buildDefaults()));
}

export const RULES = [
  ["Progression", ["Weeks 1-2: light weights, lower end of sets, 3-4 RIR", "Weeks 3-6: add weight slowly, 2-3 RIR", "Weeks 7-12: train normally but clean, 1-3 RIR", "Add weight only if there is no irritation during the set, later that day, or the next morning, and form stays controlled."]],
  ["Pain rule", ["0-2/10: okay", "3/10: reduce weight or range", "Sharp or pinchy pain: stop the exercise", "Worse the next day: the session was too much"]],
  ["Unilateral rule", ["Start with the weaker side. Match those reps with the stronger side."]],
  ["Duplication rule", ["If ankle or hip rehab is done at the gym, skip the home version or do one easy set. Keep wrist work light and controlled."]],
];
