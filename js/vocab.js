// Controlled vocabularies. IDs are stored in saved data: never change an ID
// without a migration in store.js. Labels can change freely.

// Muscles and body regions an exercise trains.
export const TARGETS = [
  { id: "chest", label: "Chest" },
  { id: "lats", label: "Lats" },
  { id: "upper-mid-back", label: "Upper/mid back" },
  { id: "traps", label: "Traps" },
  { id: "spinal-erectors", label: "Spinal erectors" },
  { id: "front-delts", label: "Front delts" },
  { id: "side-delts", label: "Side delts" },
  { id: "rear-delts", label: "Rear delts" },
  { id: "rotator-cuff", label: "Rotator cuff" },
  { id: "serratus", label: "Serratus" },
  { id: "biceps", label: "Biceps" },
  { id: "brachialis", label: "Brachialis" },
  { id: "brachioradialis", label: "Brachioradialis" },
  { id: "triceps", label: "Triceps" },
  { id: "forearm-flexors", label: "Forearm flexors" },
  { id: "forearm-extensors", label: "Forearm extensors" },
  { id: "forearms", label: "Forearms" },
  { id: "abs", label: "Abs" },
  { id: "obliques", label: "Obliques" },
  { id: "quads", label: "Quads" },
  { id: "hamstrings", label: "Hamstrings" },
  { id: "glute-max", label: "Glute max" },
  { id: "glute-med-min", label: "Glute med/min" },
  { id: "adductors", label: "Adductors" },
  { id: "hip-flexors", label: "Hip flexors" },
  { id: "calves", label: "Calves" },
  { id: "tibialis-anterior", label: "Tibialis anterior" },
  { id: "ankles", label: "Ankles" },
  { id: "neck", label: "Neck" },
  { id: "feet-toes", label: "Feet/toes" },
];

// One movement pattern per exercise.
export const MOVEMENTS = [
  { id: "horizontal-press", label: "Horizontal press" },
  { id: "vertical-press", label: "Vertical press" },
  { id: "fly", label: "Fly" },
  { id: "horizontal-pull", label: "Horizontal pull" },
  { id: "vertical-pull", label: "Vertical pull" },
  { id: "pullover", label: "Pullover" },
  { id: "shoulder-raise", label: "Shoulder raise" },
  { id: "shoulder-rotation", label: "Shoulder rotation" },
  { id: "scapular-control", label: "Scapular control" },
  { id: "squat", label: "Squat" },
  { id: "split-squat-lunge", label: "Split squat/lunge" },
  { id: "step-up", label: "Step-up" },
  { id: "hip-hinge", label: "Hip hinge" },
  { id: "hip-thrust-bridge", label: "Hip thrust/bridge" },
  { id: "knee-extension", label: "Knee extension" },
  { id: "knee-flexion", label: "Knee flexion" },
  { id: "hip-abduction", label: "Hip abduction" },
  { id: "hip-adduction", label: "Hip adduction" },
  { id: "hip-flexion", label: "Hip flexion" },
  { id: "hip-rotation", label: "Hip rotation" },
  { id: "calf-raise", label: "Calf raise" },
  { id: "ankle-dorsiflexion", label: "Ankle dorsiflexion" },
  { id: "ankle-inversion", label: "Ankle inversion" },
  { id: "ankle-eversion", label: "Ankle eversion" },
  { id: "elbow-flexion", label: "Elbow flexion" },
  { id: "elbow-extension", label: "Elbow extension" },
  { id: "wrist-flexion", label: "Wrist flexion" },
  { id: "wrist-extension", label: "Wrist extension" },
  { id: "forearm-rotation", label: "Forearm rotation" },
  { id: "wrist-deviation", label: "Wrist deviation" },
  { id: "trunk-flexion", label: "Trunk flexion" },
  { id: "trunk-extension", label: "Trunk extension" },
  { id: "anti-extension", label: "Anti-extension" },
  { id: "anti-rotation", label: "Anti-rotation" },
  { id: "anti-lateral-flexion", label: "Anti-lateral flexion" },
  { id: "rotation", label: "Rotation" },
  { id: "lateral-flexion", label: "Lateral flexion" },
  { id: "carry", label: "Carry" },
  { id: "balance-control", label: "Balance/control" },
  { id: "mobility", label: "Mobility" },
  { id: "neck-movement", label: "Neck movement" },
  { id: "foot-toe-control", label: "Foot/toe control" },
  { id: "hip-extension", label: "Hip extension" },
  { id: "shrug", label: "Shrug" },
];

// One or more per exercise.
export const EQUIPMENT = [
  { id: "none", label: "None" },
  { id: "bodyweight", label: "Bodyweight" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "barbell", label: "Barbell" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "cable", label: "Cable" },
  { id: "machine", label: "Machine" },
  { id: "band", label: "Band" },
  { id: "bench", label: "Bench" },
  { id: "box-step", label: "Box/step" },
  { id: "pull-up-bar", label: "Pull-up bar" },
  { id: "suspension-trainer", label: "Suspension trainer" },
  { id: "foam-roller", label: "Foam roller" },
  { id: "other", label: "Other" },
];

// Why the exercise exists.
export const PURPOSES = [
  { id: "strength", label: "Strength" },
  { id: "mobility", label: "Mobility" },
  { id: "rehab", label: "Rehab" },
];

// Optional.
export const STYLES = [
  { id: "compound", label: "Compound" },
  { id: "isolation", label: "Isolation" },
  { id: "isometric", label: "Isometric" },
  { id: "carry", label: "Carry" },
  { id: "mobility-control", label: "Mobility/control" },
];

// Optional.
export const LATERALITIES = [
  { id: "bilateral", label: "Bilateral" },
  { id: "unilateral", label: "Unilateral" },
  { id: "alternating", label: "Alternating" },
];

// Optional.
export const SUPPORTS = [
  { id: "supported", label: "Supported" },
  { id: "unsupported", label: "Unsupported" },
];

// Optional, several allowed.
export const EMPHASES = [
  { id: "upper-chest", label: "Upper chest" },
  { id: "scapular-plane", label: "Scapular plane" },
  { id: "glute-bias", label: "Glute bias" },
  { id: "lateral", label: "Lateral" },
];

// Optional: where the exercise is hardest.
export const CHALLENGES = [
  { id: "lengthened-bottom", label: "Lengthened/bottom" },
  { id: "middle", label: "Middle" },
  { id: "shortened-top", label: "Shortened/top" },
  { id: "even", label: "Even" },
  { id: "variable", label: "Variable" },
];

// How a related exercise compares. Stored IDs: easier, similar (shown as Alternative), harder.
export const RELATIONS = [
  { id: "easier", label: "Easier" },
  { id: "similar", label: "Alternative" },
  { id: "harder", label: "Harder" },
];

// Derived Library browse groups (not stored on exercises).
export const BROWSE_GROUPS = [
  { id: "chest", label: "Chest", targetIds: ["chest"], movementIds: [] },
  { id: "back", label: "Back", targetIds: ["lats", "upper-mid-back", "traps", "spinal-erectors"], movementIds: [] },
  { id: "shoulders", label: "Shoulders", targetIds: ["front-delts", "side-delts", "rear-delts", "rotator-cuff", "serratus"], movementIds: [] },
  { id: "glutes", label: "Glutes", targetIds: ["glute-max", "glute-med-min"], movementIds: [] },
  { id: "legs", label: "Legs", targetIds: ["quads", "hamstrings", "glute-max", "glute-med-min", "adductors", "hip-flexors", "calves", "tibialis-anterior", "ankles", "feet-toes"], movementIds: [] },
  { id: "core", label: "Core", targetIds: ["abs", "obliques"], movementIds: [] },
  { id: "arms", label: "Arms", targetIds: ["biceps", "brachialis", "brachioradialis", "triceps"], movementIds: [] },
  { id: "forearms", label: "Forearms", targetIds: ["forearm-flexors", "forearm-extensors", "forearms"], movementIds: [] },
  { id: "push", label: "Push", targetIds: [], movementIds: ["horizontal-press", "vertical-press", "fly", "elbow-extension"] },
  { id: "pull", label: "Pull", targetIds: [], movementIds: ["horizontal-pull", "vertical-pull", "pullover", "elbow-flexion"] },
  { id: "neck", label: "Neck", targetIds: ["neck"], movementIds: ["neck-movement"] },
  { id: "full-body", label: "Full body", targetIds: [], movementIds: ["carry"] },
];

const labels = new Map([TARGETS, MOVEMENTS, EQUIPMENT, PURPOSES, STYLES, LATERALITIES, SUPPORTS, EMPHASES, CHALLENGES, RELATIONS].flat().map((option) => [option.id, option.label]));

export function label(id) {
  return labels.get(id) || id;
}
