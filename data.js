export const SCHEMA_VERSION = 9;
export const DEFAULT_PROGRAM_ID = "pplppl7-glute-specialization";
export const DEFAULT_PROGRAM_NAME = "PPLPPL 7 — Glute Specialization";

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
  "Neck",
  "Feet/toes",
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
  "Neck movement", "Foot/toe control", "Hip extension", "Shrug",
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

export const EXERCISE_BROWSE_GROUPS = [
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

const startingState = {
  "version": 9,
  "exercises": [
    {
      "id": "45-degree-glute-biased-back-extension",
      "name": "45° glute-biased back extension",
      "aliases": [],
      "primaryTargets": [
        "glute-max",
        "hamstrings"
      ],
      "secondaryTargets": [
        "spinal-erectors"
      ],
      "movementPattern": "hip-hinge",
      "equipment": [
        "other"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [
        "glute-bias"
      ],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "90-90-front-leg-lift-off",
      "name": "90/90 front-leg lift-off",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 5–8/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "90-90-hip-switches",
      "name": "90/90 hip transitions",
      "aliases": [
        "90/90 hip switches"
      ],
      "primaryTargets": [
        "glute-med-min",
        "adductors"
      ],
      "secondaryTargets": [
        "hip-flexors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "alternating",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 6–10 total",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "90-90-lean",
      "name": "90/90 lean",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min",
        "adductors"
      ],
      "secondaryTargets": [
        "hip-flexors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "isometric",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 20–30 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "90-90-rear-leg-lift-off",
      "name": "90/90 rear-leg lift-off",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 5–8/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "ab-wheel-rollout",
      "name": "Ab-wheel rollout",
      "aliases": [],
      "primaryTargets": [
        "abs"
      ],
      "secondaryTargets": [
        "obliques"
      ],
      "movementPattern": "anti-extension",
      "equipment": [
        "other"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 6–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "active-straight-leg-raise",
      "name": "Active straight-leg raise",
      "aliases": [],
      "primaryTargets": [
        "hamstrings"
      ],
      "secondaryTargets": [
        "hip-flexors"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 5–10/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "adductor-machine",
      "name": "Adductor machine",
      "aliases": [],
      "primaryTargets": [
        "adductors"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-adduction",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "adductor-rock-back",
      "name": "Adductor rock-back",
      "aliases": [],
      "primaryTargets": [
        "adductors"
      ],
      "secondaryTargets": [
        "hamstrings"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 8–12/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "ankle-cars",
      "name": "Ankle CARs",
      "aliases": [],
      "primaryTargets": [
        "ankles"
      ],
      "secondaryTargets": [],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 slow circles/direction",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "ankle-eversion",
      "name": "Band ankle eversion",
      "aliases": [
        "Ankle eversion"
      ],
      "primaryTargets": [
        "ankles"
      ],
      "secondaryTargets": [],
      "movementPattern": "ankle-eversion",
      "equipment": [
        "band"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "cable-ankle-eversion",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "ankle-inversion",
      "name": "Band ankle inversion",
      "aliases": [
        "Ankle inversion"
      ],
      "primaryTargets": [
        "ankles"
      ],
      "secondaryTargets": [],
      "movementPattern": "ankle-inversion",
      "equipment": [
        "band"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "cable-ankle-inversion",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "assisted-neutral-grip-pull-up",
      "name": "Assisted neutral-grip pull-up",
      "aliases": [],
      "primaryTargets": [
        "lats"
      ],
      "secondaryTargets": [
        "upper-mid-back",
        "biceps",
        "brachialis"
      ],
      "movementPattern": "vertical-pull",
      "equipment": [
        "pull-up-bar",
        "machine"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "neutral-grip-pull-up",
          "relation": "harder"
        }
      ],
      "defaultPrescription": "3 × 6–10",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "back-extension-machine",
      "name": "Back extension machine",
      "aliases": [],
      "primaryTargets": [
        "spinal-erectors",
        "glute-max"
      ],
      "secondaryTargets": [
        "hamstrings"
      ],
      "movementPattern": "trunk-extension",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2–3 × 8–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "back-to-wall-y-raise",
      "name": "Back-to-wall Y-raise",
      "aliases": [],
      "primaryTargets": [
        "traps"
      ],
      "secondaryTargets": [
        "serratus",
        "rotator-cuff",
        "rear-delts"
      ],
      "movementPattern": "scapular-control",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "wall-angel",
      "name": "Wall angel",
      "aliases": [
        "Wall Angels"
      ],
      "primaryTargets": [
        "traps"
      ],
      "secondaryTargets": [
        "serratus",
        "rotator-cuff",
        "rear-delts"
      ],
      "movementPattern": "scapular-control",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "band-external-rotation-at-45-90-abduction",
      "name": "Band external rotation at 45–90° abduction",
      "aliases": [],
      "primaryTargets": [
        "rotator-cuff"
      ],
      "secondaryTargets": [
        "rear-delts"
      ],
      "movementPattern": "shoulder-rotation",
      "equipment": [
        "band"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "band-hip-abduction",
      "name": "Band hip abduction",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-abduction",
      "equipment": [
        "band"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "band-lift",
      "name": "Band lift",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "rotation",
      "equipment": [
        "band"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 8–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "band-pallof-press",
      "name": "Band Pallof press",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "anti-rotation",
      "equipment": [
        "band"
      ],
      "purpose": "strength",
      "style": "isometric",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [
        {
          "exerciseId": "pallof-press",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "1–2 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "band-side-bend",
      "name": "Band side bend",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [],
      "movementPattern": "lateral-flexion",
      "equipment": [
        "band"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "band-wood-chop",
      "name": "Band wood chop",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "rotation",
      "equipment": [
        "band"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "cable-wood-chop",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "1–2 × 8–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "bayesian-curl",
      "name": "Bayesian curl",
      "aliases": [],
      "primaryTargets": [
        "biceps"
      ],
      "secondaryTargets": [
        "brachialis"
      ],
      "movementPattern": "elbow-flexion",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "preacher-curl",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2–3 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "bent-knee-calf-stretch",
      "name": "Bent-knee calf stretch",
      "aliases": [],
      "primaryTargets": [
        "calves"
      ],
      "secondaryTargets": [
        "ankles"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–40 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "bird-dog",
      "name": "Bird dog",
      "aliases": [],
      "primaryTargets": [
        "abs",
        "glute-max"
      ],
      "secondaryTargets": [
        "spinal-erectors"
      ],
      "movementPattern": "anti-rotation",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "mobility-control",
      "laterality": "alternating",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 5–10/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-ankle-eversion",
      "name": "Cable ankle eversion",
      "aliases": [],
      "primaryTargets": [
        "ankles"
      ],
      "secondaryTargets": [],
      "movementPattern": "ankle-eversion",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "ankle-eversion",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-ankle-inversion",
      "name": "Cable ankle inversion",
      "aliases": [],
      "primaryTargets": [
        "ankles"
      ],
      "secondaryTargets": [],
      "movementPattern": "ankle-inversion",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "ankle-inversion",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-crunch",
      "name": "Cable crunch",
      "aliases": [],
      "primaryTargets": [
        "abs"
      ],
      "secondaryTargets": [],
      "movementPattern": "trunk-flexion",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-external-rotation",
      "name": "Cable shoulder external rotation",
      "aliases": [
        "Cable external rotation"
      ],
      "primaryTargets": [
        "rotator-cuff"
      ],
      "secondaryTargets": [
        "rear-delts"
      ],
      "movementPattern": "shoulder-rotation",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-fly",
      "name": "Cable fly",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [],
      "movementPattern": "fly",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "pec-deck",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-hip-external-rotation",
      "name": "Cable hip external rotation",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-rotation",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-hip-internal-rotation",
      "name": "Cable hip internal rotation",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-shoulder-internal-rotation",
      "name": "Cable shoulder internal rotation",
      "aliases": [],
      "primaryTargets": [
        "rotator-cuff"
      ],
      "secondaryTargets": [],
      "movementPattern": "shoulder-rotation",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-kickback",
      "name": "Cable kickback",
      "aliases": [],
      "primaryTargets": [
        "glute-max"
      ],
      "secondaryTargets": [
        "hamstrings"
      ],
      "movementPattern": "hip-extension",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20/leg",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-lateral-raise",
      "name": "Cable lateral raise",
      "aliases": [],
      "primaryTargets": [
        "side-delts"
      ],
      "secondaryTargets": [],
      "movementPattern": "shoulder-raise",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "machine-lateral-raise",
          "relation": "similar"
        },
        {
          "exerciseId": "dumbbell-lateral-raise",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-pronation",
      "name": "Cable forearm pronation",
      "aliases": [
        "Cable pronation"
      ],
      "primaryTargets": [
        "forearms"
      ],
      "secondaryTargets": [],
      "movementPattern": "forearm-rotation",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "lever-forearm-pronation",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "1–2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-reverse-curl",
      "name": "Cable reverse curl",
      "aliases": [],
      "primaryTargets": [
        "brachioradialis",
        "brachialis"
      ],
      "secondaryTargets": [
        "biceps",
        "forearm-extensors"
      ],
      "movementPattern": "elbow-flexion",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "reverse-curl",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-serratus-punch",
      "name": "Cable serratus punch",
      "aliases": [],
      "primaryTargets": [
        "serratus"
      ],
      "secondaryTargets": [
        "front-delts"
      ],
      "movementPattern": "scapular-control",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-side-bend",
      "name": "Cable side bend",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [],
      "movementPattern": "lateral-flexion",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-supination",
      "name": "Cable forearm supination",
      "aliases": [
        "Cable supination"
      ],
      "primaryTargets": [
        "forearms"
      ],
      "secondaryTargets": [
        "biceps"
      ],
      "movementPattern": "forearm-rotation",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "lever-forearm-supination",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "1–2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-wood-chop",
      "name": "Cable wood chop",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "rotation",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "band-wood-chop",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-y-raise",
      "name": "Cable Y-raise",
      "aliases": [],
      "primaryTargets": [
        "traps"
      ],
      "secondaryTargets": [
        "serratus",
        "rotator-cuff"
      ],
      "movementPattern": "scapular-control",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "incline-y-raise",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "captains-chair-knee-raise",
      "name": "Captain’s-chair knee raise",
      "aliases": [],
      "primaryTargets": [
        "abs"
      ],
      "secondaryTargets": [
        "hip-flexors"
      ],
      "movementPattern": "trunk-flexion",
      "equipment": [
        "other"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "hanging-knee-raise",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cat-cow",
      "name": "Cat-cow",
      "aliases": [],
      "primaryTargets": [
        "spinal-erectors"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "1 × 6–10",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "chest-supported-rear-delt-raise",
      "name": "Chest-supported dumbbell rear-delt raise",
      "aliases": [
        "Chest-supported rear-delt raise"
      ],
      "primaryTargets": [
        "rear-delts"
      ],
      "secondaryTargets": [
        "upper-mid-back"
      ],
      "movementPattern": "shoulder-raise",
      "equipment": [
        "dumbbells",
        "bench"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "chest-supported-row",
      "name": "Chest-supported row",
      "aliases": [],
      "primaryTargets": [
        "upper-mid-back",
        "lats"
      ],
      "secondaryTargets": [
        "biceps",
        "rear-delts"
      ],
      "movementPattern": "horizontal-pull",
      "equipment": [
        "dumbbells",
        "bench"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "middle",
      "relatedExercises": [
        {
          "exerciseId": "one-arm-cable-row",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "chest-supported-row-mid-back-bias",
      "name": "Chest-supported row, mid-back bias",
      "aliases": [],
      "primaryTargets": [
        "upper-mid-back",
        "lats"
      ],
      "secondaryTargets": [
        "biceps",
        "rear-delts"
      ],
      "movementPattern": "horizontal-pull",
      "equipment": [
        "other"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "3 × 6–10",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "chin-tuck",
      "name": "Chin tuck",
      "aliases": [],
      "primaryTargets": [
        "neck"
      ],
      "secondaryTargets": [],
      "movementPattern": "neck-movement",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "isometric",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 8–12 with 3-sec holds",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "clamshell",
      "name": "Clamshell",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-rotation",
      "equipment": [
        "bodyweight",
        "band"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "controlled-toe-extension",
      "name": "Controlled toe extension",
      "aliases": [],
      "primaryTargets": [
        "feet-toes"
      ],
      "secondaryTargets": [],
      "movementPattern": "foot-toe-control",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 15–25",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "controlled-towel-toe-curl",
      "name": "Controlled towel toe curl",
      "aliases": [],
      "primaryTargets": [
        "feet-toes"
      ],
      "secondaryTargets": [],
      "movementPattern": "foot-toe-control",
      "equipment": [
        "other"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "counterbalanced-deep-squat-hold",
      "name": "Counterbalanced deep-squat hold",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors",
        "ankles"
      ],
      "movementPattern": "squat",
      "equipment": [
        "other"
      ],
      "purpose": "mobility",
      "style": "isometric",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 20–40 sec",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "dead-bug",
      "name": "Dead bug",
      "aliases": [],
      "primaryTargets": [
        "abs"
      ],
      "secondaryTargets": [
        "hip-flexors"
      ],
      "movementPattern": "anti-extension",
      "equipment": [
        "none"
      ],
      "purpose": "strength",
      "style": "mobility-control",
      "laterality": "alternating",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [],
      "defaultPrescription": "2 × 5–10/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "decline-chest-press-machine",
      "name": "Decline chest press machine",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [
        "triceps",
        "front-delts"
      ],
      "movementPattern": "horizontal-press",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "deficit-reverse-lunge",
      "name": "Deficit reverse lunge",
      "aliases": [],
      "primaryTargets": [
        "glute-max",
        "quads"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "split-squat-lunge",
      "equipment": [
        "bodyweight",
        "box-step"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 8–12/leg",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "doorway-pec-stretch",
      "name": "Doorway pec stretch",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [
        "front-delts"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "other"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 20–40 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "dumbbell-shrug",
      "name": "Dumbbell shrug",
      "aliases": [],
      "primaryTargets": [
        "traps"
      ],
      "secondaryTargets": [],
      "movementPattern": "shrug",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [
        {
          "exerciseId": "machine-shrug",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "flat-dumbbell-press",
      "name": "Flat dumbbell press",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [
        "triceps",
        "front-delts"
      ],
      "movementPattern": "horizontal-press",
      "equipment": [
        "dumbbells",
        "bench"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "barbell-bench-press",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "foam-roller-chest-stretch-with-weights",
      "name": "Foam roller chest stretch with weights",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [
        "front-delts"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "foam-roller",
        "dumbbells"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–30 sec",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "foam-roller-thoracic-extension",
      "name": "Foam-roller thoracic extension",
      "aliases": [],
      "primaryTargets": [
        "upper-mid-back"
      ],
      "secondaryTargets": [
        "spinal-erectors"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "foam-roller"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "6–10 slow reps",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "gentle-passive-internal-rotation-stretch",
      "name": "Gentle passive hip internal-rotation stretch",
      "aliases": [
        "Gentle passive internal-rotation stretch"
      ],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–40 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "glute-biased-step-up",
      "name": "Glute-biased step-up",
      "aliases": [],
      "primaryTargets": [
        "glute-max",
        "quads"
      ],
      "secondaryTargets": [
        "glute-med-min"
      ],
      "movementPattern": "step-up",
      "equipment": [
        "box-step",
        "dumbbells"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [
        "glute-bias"
      ],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 8–12/leg",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "glute-bridge",
      "name": "Glute bridge",
      "aliases": [],
      "primaryTargets": [
        "glute-max",
        "hamstrings"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-thrust-bridge",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [
        {
          "exerciseId": "hip-thrust",
          "relation": "harder"
        }
      ],
      "defaultPrescription": "1–2 × 10–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "goblet-squat-hold",
      "name": "Goblet squat hold",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors",
        "ankles"
      ],
      "movementPattern": "squat",
      "equipment": [
        "dumbbells",
        "kettlebell"
      ],
      "purpose": "mobility",
      "style": "isometric",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "supported-deep-squat-hold",
          "relation": "easier"
        }
      ],
      "defaultPrescription": "1–2 × 20–40 sec",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "hack-squat",
      "name": "Hack squat",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "squat",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "3 × 6–10",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "half-kneeling-hip-flexor-stretch",
      "name": "Half-kneeling hip flexor stretch",
      "aliases": [],
      "primaryTargets": [
        "hip-flexors"
      ],
      "secondaryTargets": [
        "quads"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–40 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "hammer-curl",
      "name": "Dumbbell hammer curl",
      "aliases": [
        "Hammer curl"
      ],
      "primaryTargets": [
        "brachialis",
        "biceps"
      ],
      "secondaryTargets": [
        "brachioradialis"
      ],
      "movementPattern": "elbow-flexion",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "hanging-knee-raise",
      "name": "Hanging knee raise",
      "aliases": [],
      "primaryTargets": [
        "abs"
      ],
      "secondaryTargets": [
        "hip-flexors"
      ],
      "movementPattern": "trunk-flexion",
      "equipment": [
        "pull-up-bar"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "captains-chair-knee-raise",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "high-to-low-cable-fly",
      "name": "High-to-low cable fly",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [],
      "movementPattern": "fly",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "upright-hip-abduction-machine",
      "name": "Upright hip-abduction machine",
      "aliases": [
        "Hip-abduction machine"
      ],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-abduction",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 15–25",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "hip-cars",
      "name": "Hip CARs",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [
        "adductors",
        "hip-flexors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 slow circles/direction/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "hip-external-rotation",
      "name": "Band hip external rotation",
      "aliases": [
        "Hip external rotation"
      ],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-rotation",
      "equipment": [
        "band"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "hip-hinge",
      "name": "Hip hinge",
      "aliases": [],
      "primaryTargets": [
        "hamstrings",
        "glute-max"
      ],
      "secondaryTargets": [
        "spinal-erectors"
      ],
      "movementPattern": "hip-hinge",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "romanian-deadlift",
          "relation": "harder"
        }
      ],
      "defaultPrescription": "2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "hip-internal-rotation",
      "name": "Band hip internal rotation",
      "aliases": [
        "Hip internal rotation"
      ],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "band"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "hip-thrust",
      "name": "Barbell hip thrust",
      "aliases": [
        "Hip thrust"
      ],
      "primaryTargets": [
        "glute-max"
      ],
      "secondaryTargets": [
        "hamstrings"
      ],
      "movementPattern": "hip-thrust-bridge",
      "equipment": [
        "barbell",
        "bench"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [
        {
          "exerciseId": "glute-bridge",
          "relation": "easier"
        },
        {
          "exerciseId": "smith-hip-thrust",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 6–10",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "incline-dumbbell-curl",
      "name": "Incline dumbbell curl",
      "aliases": [],
      "primaryTargets": [
        "biceps"
      ],
      "secondaryTargets": [
        "brachialis"
      ],
      "movementPattern": "elbow-flexion",
      "equipment": [
        "dumbbells",
        "bench"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "incline-y-raise",
      "name": "Incline-bench Y-raise",
      "aliases": [
        "Incline Y raise"
      ],
      "primaryTargets": [
        "traps"
      ],
      "secondaryTargets": [
        "serratus",
        "rotator-cuff"
      ],
      "movementPattern": "scapular-control",
      "equipment": [
        "dumbbells",
        "bench"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "cable-y-raise",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "knee-to-wall-ankle-rocks",
      "name": "Knee-to-wall ankle rock",
      "aliases": [
        "Knee-to-wall ankle rocks"
      ],
      "primaryTargets": [
        "ankles"
      ],
      "secondaryTargets": [
        "calves"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 8–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "lateral-step-down",
      "name": "Lateral step-down",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-med-min"
      ],
      "secondaryTargets": [
        "glute-max"
      ],
      "movementPattern": "step-up",
      "equipment": [
        "bodyweight",
        "box-step"
      ],
      "purpose": "rehab",
      "style": "compound",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 6–12/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "lean-forward-hip-abduction-machine",
      "name": "Lean-forward hip-abduction machine",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [
        "glute-max"
      ],
      "movementPattern": "hip-abduction",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [
        "glute-bias"
      ],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 15–25",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "leg-extension",
      "name": "Leg extension",
      "aliases": [],
      "primaryTargets": [
        "quads"
      ],
      "secondaryTargets": [],
      "movementPattern": "knee-extension",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "leg-press",
      "name": "Leg press",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "squat",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "lever-forearm-pronation",
      "name": "Lever forearm pronation",
      "aliases": [],
      "primaryTargets": [
        "forearms"
      ],
      "secondaryTargets": [],
      "movementPattern": "forearm-rotation",
      "equipment": [
        "other"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "cable-pronation",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "1–2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "lever-forearm-supination",
      "name": "Lever forearm supination",
      "aliases": [],
      "primaryTargets": [
        "forearms"
      ],
      "secondaryTargets": [
        "biceps"
      ],
      "movementPattern": "forearm-rotation",
      "equipment": [
        "other"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "cable-supination",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "1–2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "loaded-90-90-hold",
      "name": "Loaded 90/90 hold",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min",
        "adductors"
      ],
      "secondaryTargets": [
        "hip-flexors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "dumbbells",
        "kettlebell"
      ],
      "purpose": "mobility",
      "style": "isometric",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 20–30 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "long-lever-plank",
      "name": "Long-lever plank",
      "aliases": [],
      "primaryTargets": [
        "abs"
      ],
      "secondaryTargets": [
        "obliques"
      ],
      "movementPattern": "anti-extension",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "isometric",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [],
      "defaultPrescription": "2 × 6–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "low-incline-dumbbell-press",
      "name": "Low-incline dumbbell press",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [
        "triceps",
        "front-delts"
      ],
      "movementPattern": "horizontal-press",
      "equipment": [
        "dumbbells",
        "bench"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [
        "upper-chest"
      ],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "machine-chest-press",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 6–10",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "lying-leg-curl",
      "name": "Lying leg curl",
      "aliases": [],
      "primaryTargets": [
        "hamstrings"
      ],
      "secondaryTargets": [],
      "movementPattern": "knee-flexion",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [
        {
          "exerciseId": "seated-leg-curl",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "machine-chest-press",
      "name": "Machine chest press",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [
        "triceps",
        "front-delts"
      ],
      "movementPattern": "horizontal-press",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "low-incline-dumbbell-press",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "machine-lateral-raise",
      "name": "Machine lateral raise",
      "aliases": [],
      "primaryTargets": [
        "side-delts"
      ],
      "secondaryTargets": [],
      "movementPattern": "shoulder-raise",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [
        {
          "exerciseId": "cable-lateral-raise",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "machine-overhead-press",
      "name": "Machine overhead press",
      "aliases": [
        "Machine shoulder press"
      ],
      "primaryTargets": [
        "front-delts",
        "side-delts"
      ],
      "secondaryTargets": [
        "triceps"
      ],
      "movementPattern": "vertical-press",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "middle",
      "relatedExercises": [
        {
          "exerciseId": "dumbbell-overhead-press",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "machine-shrug",
      "name": "Machine shrug",
      "aliases": [],
      "primaryTargets": [
        "traps"
      ],
      "secondaryTargets": [],
      "movementPattern": "shrug",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [
        {
          "exerciseId": "dumbbell-shrug",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "modified-curl-up",
      "name": "Modified McGill curl-up",
      "aliases": [
        "Modified curl-up"
      ],
      "primaryTargets": [
        "abs"
      ],
      "secondaryTargets": [],
      "movementPattern": "trunk-flexion",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "isometric",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [],
      "defaultPrescription": "5 × 8–10-sec holds",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "neck-cars",
      "name": "Neck CARs",
      "aliases": [],
      "primaryTargets": [
        "neck"
      ],
      "secondaryTargets": [],
      "movementPattern": "neck-movement",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 slow circles/direction",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "neck-extension",
      "name": "Neck extension",
      "aliases": [],
      "primaryTargets": [
        "neck"
      ],
      "secondaryTargets": [],
      "movementPattern": "neck-movement",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 15–25",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "neck-flexion",
      "name": "Neck flexion",
      "aliases": [],
      "primaryTargets": [
        "neck"
      ],
      "secondaryTargets": [],
      "movementPattern": "neck-movement",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 15–25",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "neck-lateral-flexion",
      "name": "Neck lateral flexion",
      "aliases": [],
      "primaryTargets": [
        "neck"
      ],
      "secondaryTargets": [],
      "movementPattern": "neck-movement",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "neutral-grip-lat-pulldown",
      "name": "Neutral-grip lat pulldown",
      "aliases": [],
      "primaryTargets": [
        "lats"
      ],
      "secondaryTargets": [
        "upper-mid-back",
        "biceps",
        "brachialis"
      ],
      "movementPattern": "vertical-pull",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "3 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "neutral-grip-pull-up",
      "name": "Neutral-grip pull-up",
      "aliases": [],
      "primaryTargets": [
        "lats"
      ],
      "secondaryTargets": [
        "upper-mid-back",
        "biceps",
        "brachialis"
      ],
      "movementPattern": "vertical-pull",
      "equipment": [
        "pull-up-bar"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "assisted-neutral-grip-pull-up",
          "relation": "easier"
        }
      ],
      "defaultPrescription": "3 × 6–10",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "one-arm-cable-row",
      "name": "One-arm cable row",
      "aliases": [],
      "primaryTargets": [
        "upper-mid-back",
        "lats"
      ],
      "secondaryTargets": [
        "biceps",
        "rear-delts"
      ],
      "movementPattern": "horizontal-pull",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "middle",
      "relatedExercises": [
        {
          "exerciseId": "chest-supported-row",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 8–12/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "one-arm-cable-row-lat-bias",
      "name": "One-arm cable row, lat bias",
      "aliases": [],
      "primaryTargets": [
        "lats",
        "upper-mid-back"
      ],
      "secondaryTargets": [
        "biceps",
        "rear-delts"
      ],
      "movementPattern": "horizontal-pull",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "3 × 8–12/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "open-book-thoracic-rotation",
      "name": "Open-book thoracic rotation",
      "aliases": [],
      "primaryTargets": [
        "upper-mid-back"
      ],
      "secondaryTargets": [
        "obliques"
      ],
      "movementPattern": "rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 6–10/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "overhead-cable-triceps-extension",
      "name": "Overhead cable triceps extension",
      "aliases": [],
      "primaryTargets": [
        "triceps"
      ],
      "secondaryTargets": [],
      "movementPattern": "elbow-extension",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "pallof-press",
      "name": "Pallof press",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "anti-rotation",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isometric",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [
        {
          "exerciseId": "band-pallof-press",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "passive-adductor-stretch",
      "name": "Passive adductor stretch",
      "aliases": [],
      "primaryTargets": [
        "adductors"
      ],
      "secondaryTargets": [],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "",
      "support": "",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–40 sec",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "preacher-curl",
      "name": "Preacher curl",
      "aliases": [],
      "primaryTargets": [
        "biceps"
      ],
      "secondaryTargets": [
        "brachialis"
      ],
      "movementPattern": "elbow-flexion",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "bayesian-curl",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "prone-back-extension",
      "name": "Prone back extension",
      "aliases": [],
      "primaryTargets": [
        "spinal-erectors",
        "glute-max"
      ],
      "secondaryTargets": [
        "hamstrings"
      ],
      "movementPattern": "trunk-extension",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 8–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "prone-hip-external-rotation",
      "name": "Prone hip external rotation",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "prone-hip-internal-rotation",
      "name": "Prone hip internal rotation",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "prone-w-raise",
      "name": "Prone W raise",
      "aliases": [],
      "primaryTargets": [
        "rear-delts",
        "rotator-cuff"
      ],
      "secondaryTargets": [
        "upper-mid-back"
      ],
      "movementPattern": "scapular-control",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "prone-y-raise",
      "name": "Prone Y-raise",
      "aliases": [],
      "primaryTargets": [
        "traps"
      ],
      "secondaryTargets": [
        "serratus",
        "rotator-cuff"
      ],
      "movementPattern": "scapular-control",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "push-up-plus",
      "name": "Push-up plus",
      "aliases": [],
      "primaryTargets": [
        "chest",
        "serratus"
      ],
      "secondaryTargets": [
        "triceps",
        "front-delts"
      ],
      "movementPattern": "horizontal-press",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "quadruped-back-rotations",
      "name": "Quadruped back rotations",
      "aliases": [],
      "primaryTargets": [
        "upper-mid-back"
      ],
      "secondaryTargets": [
        "obliques"
      ],
      "movementPattern": "rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 5–8/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "radial-deviation",
      "name": "Radial deviation",
      "aliases": [],
      "primaryTargets": [
        "forearms"
      ],
      "secondaryTargets": [],
      "movementPattern": "wrist-deviation",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "pec-deck",
      "name": "Pec deck",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [],
      "movementPattern": "fly",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "cable-fly",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "relaxed-90-90-external-rotation-stretch",
      "name": "Relaxed 90/90 external-rotation stretch",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–40 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "reverse-crunch",
      "name": "Reverse crunch",
      "aliases": [],
      "primaryTargets": [
        "abs"
      ],
      "secondaryTargets": [
        "hip-flexors"
      ],
      "movementPattern": "trunk-flexion",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 8–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "reverse-curl",
      "name": "EZ-bar reverse curl",
      "aliases": [
        "Reverse curl"
      ],
      "primaryTargets": [
        "brachioradialis",
        "brachialis"
      ],
      "secondaryTargets": [
        "biceps",
        "forearm-extensors"
      ],
      "movementPattern": "elbow-flexion",
      "equipment": [
        "barbell"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "cable-reverse-curl",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "reverse-lunge",
      "name": "Reverse lunge",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "split-squat-lunge",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 6–12/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "reverse-wrist-curl",
      "name": "Reverse wrist curl",
      "aliases": [],
      "primaryTargets": [
        "forearm-extensors"
      ],
      "secondaryTargets": [],
      "movementPattern": "wrist-extension",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "romanian-deadlift",
      "name": "Romanian deadlift",
      "aliases": [],
      "primaryTargets": [
        "hamstrings",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors",
        "spinal-erectors"
      ],
      "movementPattern": "hip-hinge",
      "equipment": [
        "barbell"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "hip-hinge",
          "relation": "easier"
        },
        {
          "exerciseId": "dumbbell-romanian-deadlift",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 6–10",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "rope-face-pull",
      "name": "Rope face pull",
      "aliases": [],
      "primaryTargets": [
        "rear-delts",
        "rotator-cuff"
      ],
      "secondaryTargets": [
        "upper-mid-back"
      ],
      "movementPattern": "horizontal-pull",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "rope-pushdown",
      "name": "Rope triceps pushdown",
      "aliases": [
        "Rope pushdown"
      ],
      "primaryTargets": [
        "triceps"
      ],
      "secondaryTargets": [],
      "movementPattern": "elbow-extension",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "3 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "scaption-raise",
      "name": "Dumbbell scaption raise",
      "aliases": [
        "Scaption raise"
      ],
      "primaryTargets": [
        "side-delts"
      ],
      "secondaryTargets": [
        "serratus",
        "rotator-cuff"
      ],
      "movementPattern": "shoulder-raise",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [
        "scapular-plane"
      ],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "3 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "seated-calf-raise",
      "name": "Seated calf raise",
      "aliases": [],
      "primaryTargets": [
        "calves"
      ],
      "secondaryTargets": [],
      "movementPattern": "calf-raise",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "3 × 10–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "seated-hip-external-rotation",
      "name": "Seated hip external rotation",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "seated-hip-internal-rotation",
      "name": "Seated hip internal rotation",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "hip-rotation",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "seated-leg-curl",
      "name": "Seated leg curl",
      "aliases": [],
      "primaryTargets": [
        "hamstrings"
      ],
      "secondaryTargets": [],
      "movementPattern": "knee-flexion",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "lying-leg-curl",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 8–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "seated-straight-leg-lift",
      "name": "Seated straight-leg lift",
      "aliases": [],
      "primaryTargets": [
        "hip-flexors"
      ],
      "secondaryTargets": [
        "quads",
        "abs"
      ],
      "movementPattern": "hip-flexion",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 6–12/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "serratus-wall-slide",
      "name": "Serratus wall slide",
      "aliases": [
        "Serratus wall slides"
      ],
      "primaryTargets": [
        "serratus"
      ],
      "secondaryTargets": [
        "traps",
        "rotator-cuff"
      ],
      "movementPattern": "scapular-control",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [
        {
          "exerciseId": "serratus-wall-slide-with-band",
          "relation": "harder"
        }
      ],
      "defaultPrescription": "1–2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "serratus-wall-slide-with-band",
      "name": "Serratus wall slide with band",
      "aliases": [],
      "primaryTargets": [
        "serratus"
      ],
      "secondaryTargets": [
        "traps",
        "rotator-cuff"
      ],
      "movementPattern": "scapular-control",
      "equipment": [
        "band"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "serratus-wall-slide",
          "relation": "easier"
        }
      ],
      "defaultPrescription": "2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "short-foot-exercise",
      "name": "Short-foot exercise",
      "aliases": [],
      "primaryTargets": [
        "feet-toes"
      ],
      "secondaryTargets": [],
      "movementPattern": "foot-toe-control",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "short-lever-copenhagen-plank",
      "name": "Short-lever Copenhagen plank",
      "aliases": [
        "Adductor side plank"
      ],
      "primaryTargets": [
        "adductors",
        "obliques"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "hip-adduction",
      "equipment": [
        "bodyweight",
        "bench"
      ],
      "purpose": "strength",
      "style": "isometric",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 10–30 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "short-lever-side-plank",
      "name": "Short-lever side plank",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "anti-lateral-flexion",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "isometric",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [
        {
          "exerciseId": "side-plank",
          "relation": "harder"
        }
      ],
      "defaultPrescription": "2 × 15–30 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "shoulder-cars",
      "name": "Shoulder CARs",
      "aliases": [],
      "primaryTargets": [
        "rotator-cuff"
      ],
      "secondaryTargets": [
        "front-delts",
        "side-delts",
        "rear-delts"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 slow circles/direction",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "side-lying-external-rotation",
      "name": "Side-lying dumbbell shoulder external rotation",
      "aliases": [
        "Side-lying external rotation",
        "Side-lying dumbbell external rotation"
      ],
      "primaryTargets": [
        "rotator-cuff"
      ],
      "secondaryTargets": [
        "rear-delts"
      ],
      "movementPattern": "shoulder-rotation",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "side-lying-hip-abduction",
      "name": "Side-lying hip abduction",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-abduction",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "side-lying-hip-adduction",
      "name": "Side-lying hip adduction",
      "aliases": [],
      "primaryTargets": [
        "adductors"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-adduction",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "side-plank",
      "name": "Side plank",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "anti-lateral-flexion",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "isometric",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [
        {
          "exerciseId": "short-lever-side-plank",
          "relation": "easier"
        }
      ],
      "defaultPrescription": "1–2 × 15–40 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "side-plank-with-hip-abduction",
      "name": "Side plank (with hip abduction)",
      "aliases": [],
      "primaryTargets": [
        "obliques",
        "glute-med-min"
      ],
      "secondaryTargets": [
        "abs"
      ],
      "movementPattern": "anti-lateral-flexion",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "isometric",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [],
      "defaultPrescription": "2 × 15–30 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "single-leg-balance",
      "name": "Single-leg balance",
      "aliases": [],
      "primaryTargets": [
        "ankles"
      ],
      "secondaryTargets": [
        "glute-med-min",
        "obliques"
      ],
      "movementPattern": "balance-control",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 30–60 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "single-leg-hip-thrust",
      "name": "Single-leg hip thrust",
      "aliases": [],
      "primaryTargets": [
        "glute-max"
      ],
      "secondaryTargets": [
        "hamstrings"
      ],
      "movementPattern": "hip-thrust-bridge",
      "equipment": [
        "bodyweight",
        "bench"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 10–15/leg",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "single-leg-romanian-deadlift",
      "name": "Single-leg Romanian deadlift",
      "aliases": [],
      "primaryTargets": [
        "hamstrings",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors",
        "spinal-erectors",
        "glute-med-min"
      ],
      "movementPattern": "hip-hinge",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 6–10/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "sitting-in-squat",
      "name": "Sitting in squat",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors",
        "ankles"
      ],
      "movementPattern": "squat",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "isometric",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "supported-deep-squat-hold",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "1–2 × 20–30 sec",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "smith-hip-thrust",
      "name": "Smith hip thrust",
      "aliases": [],
      "primaryTargets": [
        "glute-max"
      ],
      "secondaryTargets": [
        "hamstrings"
      ],
      "movementPattern": "hip-thrust-bridge",
      "equipment": [
        "machine",
        "bench"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [
        {
          "exerciseId": "hip-thrust",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "smith-squat",
      "name": "Smith squat",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "squat",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "barbell-back-squat",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2 × 10–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "sorensen-hold",
      "name": "Sorensen hold",
      "aliases": [],
      "primaryTargets": [
        "spinal-erectors"
      ],
      "secondaryTargets": [
        "glute-max",
        "hamstrings"
      ],
      "movementPattern": "trunk-extension",
      "equipment": [
        "bench"
      ],
      "purpose": "strength",
      "style": "isometric",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–45 sec",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "split-squat",
      "name": "Split squat",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "split-squat-lunge",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "supported-split-squat",
          "relation": "easier"
        }
      ],
      "defaultPrescription": "1–2 × 6–12/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "standing-band-knee-drive",
      "name": "Standing band knee drive",
      "aliases": [],
      "primaryTargets": [
        "hip-flexors"
      ],
      "secondaryTargets": [
        "quads",
        "abs"
      ],
      "movementPattern": "hip-flexion",
      "equipment": [
        "band"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 10–15/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "standing-cable-hip-abduction",
      "name": "Standing cable hip abduction",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [],
      "movementPattern": "hip-abduction",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "standing-cable-hip-flexion",
      "name": "Standing cable hip flexion",
      "aliases": [
        "Psoas march",
        "Cable psoas march"
      ],
      "primaryTargets": [
        "hip-flexors"
      ],
      "secondaryTargets": [
        "abs",
        "quads"
      ],
      "movementPattern": "hip-flexion",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "standing-calf-raise",
      "name": "Standing calf raise",
      "aliases": [],
      "primaryTargets": [
        "calves"
      ],
      "secondaryTargets": [],
      "movementPattern": "calf-raise",
      "equipment": [
        "machine"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "3 × 8–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "straight-arm-cable-pulldown",
      "name": "Straight-arm cable pulldown",
      "aliases": [],
      "primaryTargets": [
        "lats"
      ],
      "secondaryTargets": [
        "serratus"
      ],
      "movementPattern": "pullover",
      "equipment": [
        "cable"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "straight-knee-calf-stretch",
      "name": "Straight-knee calf stretch",
      "aliases": [],
      "primaryTargets": [
        "calves"
      ],
      "secondaryTargets": [
        "ankles"
      ],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–40 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "suitcase-carry",
      "name": "Suitcase carry",
      "aliases": [],
      "primaryTargets": [
        "obliques"
      ],
      "secondaryTargets": [
        "forearms",
        "traps",
        "glute-med-min"
      ],
      "movementPattern": "carry",
      "equipment": [
        "dumbbells",
        "kettlebell"
      ],
      "purpose": "strength",
      "style": "carry",
      "laterality": "unilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "even",
      "relatedExercises": [],
      "defaultPrescription": "2 rounds/side · 30–60 sec",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "supine-hamstring-stretch",
      "name": "Supine hamstring stretch",
      "aliases": [],
      "primaryTargets": [
        "hamstrings"
      ],
      "secondaryTargets": [],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–40 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "supported-bulgarian-split-squat",
      "name": "Supported Bulgarian split squat",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "split-squat-lunge",
      "equipment": [
        "bodyweight",
        "bench",
        "other"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 8–12/leg",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "supported-cossack-squat",
      "name": "Supported Cossack squat",
      "aliases": [],
      "primaryTargets": [
        "adductors",
        "quads"
      ],
      "secondaryTargets": [
        "glute-med-min",
        "hamstrings"
      ],
      "movementPattern": "squat",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "compound",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [
        "lateral"
      ],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 5–8/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "supported-deep-split-squat-hold",
      "name": "Supported deep split-squat hold",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "split-squat-lunge",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "isometric",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–40 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "supported-deep-squat-hold",
      "name": "Supported deep squat hold",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors",
        "ankles"
      ],
      "movementPattern": "squat",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "isometric",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "goblet-squat-hold",
          "relation": "harder"
        },
        {
          "exerciseId": "sitting-in-squat",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "1–2 × 20–30 sec",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "supported-frog-stretch",
      "name": "Supported frog stretch",
      "aliases": [],
      "primaryTargets": [
        "adductors"
      ],
      "secondaryTargets": [],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 20–40 sec",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "supported-hip-airplane",
      "name": "Supported hip airplane",
      "aliases": [],
      "primaryTargets": [
        "glute-med-min"
      ],
      "secondaryTargets": [
        "glute-max",
        "hamstrings",
        "obliques"
      ],
      "movementPattern": "balance-control",
      "equipment": [
        "none"
      ],
      "purpose": "rehab",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 4–8/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "supported-split-squat",
      "name": "Supported split squat",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "split-squat-lunge",
      "equipment": [
        "bodyweight",
        "other"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "split-squat",
          "relation": "harder"
        }
      ],
      "defaultPrescription": "2–3 × 8–10/leg",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "tibialis-raise",
      "name": "Tibialis raise",
      "aliases": [],
      "primaryTargets": [
        "tibialis-anterior"
      ],
      "secondaryTargets": [],
      "movementPattern": "ankle-dorsiflexion",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "towel-shoulder-stretch",
      "name": "Towel shoulder stretch",
      "aliases": [],
      "primaryTargets": [
        "rotator-cuff"
      ],
      "secondaryTargets": [],
      "movementPattern": "mobility",
      "equipment": [
        "other"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [],
      "defaultPrescription": "2 × 20–30 sec/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "ulnar-deviation",
      "name": "Ulnar deviation",
      "aliases": [],
      "primaryTargets": [
        "forearms"
      ],
      "secondaryTargets": [],
      "movementPattern": "wrist-deviation",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "variable",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "cable-neck-rotation",
      "name": "Cable neck rotation",
      "aliases": [],
      "primaryTargets": [
        "neck"
      ],
      "secondaryTargets": [],
      "movementPattern": "neck-movement",
      "equipment": [
        "cable"
      ],
      "purpose": "rehab",
      "style": "isolation",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 × 15–25/side",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "wrist-cars",
      "name": "Wrist CARs",
      "aliases": [],
      "primaryTargets": [
        "forearms"
      ],
      "secondaryTargets": [],
      "movementPattern": "mobility",
      "equipment": [
        "none"
      ],
      "purpose": "mobility",
      "style": "mobility-control",
      "laterality": "unilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [],
      "defaultPrescription": "1–2 slow circles/direction",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "wrist-curl",
      "name": "Wrist curl",
      "aliases": [],
      "primaryTargets": [
        "forearm-flexors"
      ],
      "secondaryTargets": [],
      "movementPattern": "wrist-flexion",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [],
      "defaultPrescription": "2 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "bodyweight-squat",
      "name": "Bodyweight squat",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "squat",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "goblet-squat",
          "relation": "harder"
        }
      ],
      "defaultPrescription": "2–3 × 8–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "goblet-squat",
      "name": "Goblet squat",
      "aliases": [],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors"
      ],
      "movementPattern": "squat",
      "equipment": [
        "dumbbells",
        "kettlebell"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "bodyweight-squat",
          "relation": "easier"
        },
        {
          "exerciseId": "barbell-back-squat",
          "relation": "harder"
        }
      ],
      "defaultPrescription": "3 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "barbell-back-squat",
      "name": "Barbell back squat",
      "aliases": [
        "Back squat"
      ],
      "primaryTargets": [
        "quads",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors",
        "spinal-erectors"
      ],
      "movementPattern": "squat",
      "equipment": [
        "barbell"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "goblet-squat",
          "relation": "easier"
        },
        {
          "exerciseId": "smith-squat",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 5–8",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "push-up",
      "name": "Push-up",
      "aliases": [],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [
        "triceps",
        "front-delts",
        "serratus"
      ],
      "movementPattern": "horizontal-press",
      "equipment": [
        "bodyweight"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "",
      "relatedExercises": [
        {
          "exerciseId": "barbell-bench-press",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2–3 × 8–15",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "barbell-bench-press",
      "name": "Barbell bench press",
      "aliases": [
        "Bench press"
      ],
      "primaryTargets": [
        "chest"
      ],
      "secondaryTargets": [
        "triceps",
        "front-delts"
      ],
      "movementPattern": "horizontal-press",
      "equipment": [
        "barbell",
        "bench"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "supported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "push-up",
          "relation": "similar"
        },
        {
          "exerciseId": "flat-dumbbell-press",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 6–10",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "dumbbell-overhead-press",
      "name": "Dumbbell overhead press",
      "aliases": [
        "Dumbbell shoulder press"
      ],
      "primaryTargets": [
        "front-delts",
        "side-delts"
      ],
      "secondaryTargets": [
        "triceps"
      ],
      "movementPattern": "vertical-press",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "",
      "emphases": [],
      "typicalChallenge": "middle",
      "relatedExercises": [
        {
          "exerciseId": "machine-overhead-press",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "2–3 × 8–12",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "dumbbell-lateral-raise",
      "name": "Dumbbell lateral raise",
      "aliases": [],
      "primaryTargets": [
        "side-delts"
      ],
      "secondaryTargets": [],
      "movementPattern": "shoulder-raise",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "strength",
      "style": "isolation",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "shortened-top",
      "relatedExercises": [
        {
          "exerciseId": "cable-lateral-raise",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 12–20",
      "instructions": "",
      "videoId": ""
    },
    {
      "id": "dumbbell-romanian-deadlift",
      "name": "Dumbbell Romanian deadlift",
      "aliases": [
        "Dumbbell RDL"
      ],
      "primaryTargets": [
        "hamstrings",
        "glute-max"
      ],
      "secondaryTargets": [
        "adductors",
        "spinal-erectors"
      ],
      "movementPattern": "hip-hinge",
      "equipment": [
        "dumbbells"
      ],
      "purpose": "strength",
      "style": "compound",
      "laterality": "bilateral",
      "support": "unsupported",
      "emphases": [],
      "typicalChallenge": "lengthened-bottom",
      "relatedExercises": [
        {
          "exerciseId": "romanian-deadlift",
          "relation": "similar"
        }
      ],
      "defaultPrescription": "3 × 8–12",
      "instructions": "",
      "videoId": ""
    }
  ],
  "routines": [
    {
      "id": "push-a-glutes",
      "name": "Push A + Glutes",
      "group": "gym",
      "status": "required",
      "note": "",
      "blocks": [
        {
          "id": "push-a-upper-body-work",
          "name": "Upper-body work"
        },
        {
          "id": "push-a-glute-block",
          "name": "Glute block"
        },
        {
          "id": "push-a-upper-body-accessories",
          "name": "Upper-body accessories"
        },
        {
          "id": "push-a-optional-coverage-rehab",
          "name": "Optional coverage · Rehab"
        }
      ],
      "entries": [
        {
          "id": "push-a-glutes-entry-001",
          "choices": [
            {
              "exerciseId": "low-incline-dumbbell-press",
              "prescription": "3 × 6–10"
            }
          ],
          "blockId": "push-a-upper-body-work",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-002",
          "choices": [
            {
              "exerciseId": "machine-overhead-press",
              "prescription": "2 × 8–12"
            }
          ],
          "blockId": "push-a-upper-body-work",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-003",
          "choices": [
            {
              "exerciseId": "machine-chest-press",
              "prescription": "2 × 8–12"
            }
          ],
          "blockId": "push-a-upper-body-work",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-004",
          "choices": [
            {
              "exerciseId": "single-leg-hip-thrust",
              "prescription": "2 × 10–15/leg"
            }
          ],
          "blockId": "push-a-glute-block",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-005",
          "choices": [
            {
              "exerciseId": "standing-cable-hip-abduction",
              "prescription": "2 × 15–25/side"
            }
          ],
          "blockId": "push-a-glute-block",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-006",
          "choices": [
            {
              "exerciseId": "cable-kickback",
              "prescription": "2 × 12–20/leg"
            }
          ],
          "blockId": "push-a-glute-block",
          "note": "Alternate straight-back and high/kneeling variations between training blocks.",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-007",
          "choices": [
            {
              "exerciseId": "scaption-raise",
              "prescription": "3 × 12–20"
            }
          ],
          "blockId": "push-a-upper-body-accessories",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-008",
          "choices": [
            {
              "exerciseId": "rope-pushdown",
              "prescription": "3 × 10–15"
            }
          ],
          "blockId": "push-a-upper-body-accessories",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-009",
          "choices": [
            {
              "exerciseId": "cable-crunch",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "push-a-upper-body-accessories",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-010",
          "choices": [
            {
              "exerciseId": "neck-flexion",
              "prescription": "2 × 15–25"
            }
          ],
          "blockId": "push-a-upper-body-accessories",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-a-glutes-entry-011",
          "choices": [
            {
              "exerciseId": "cable-serratus-punch",
              "prescription": "2 × 12–20"
            },
            {
              "exerciseId": "push-up-plus",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "push-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "push-a-glutes-entry-012",
          "choices": [
            {
              "exerciseId": "cable-external-rotation",
              "prescription": "2 × 15–25/side"
            },
            {
              "exerciseId": "side-lying-external-rotation",
              "prescription": "2 × 15–25/side"
            }
          ],
          "blockId": "push-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "push-a-glutes-entry-013",
          "choices": [
            {
              "exerciseId": "cable-shoulder-internal-rotation",
              "prescription": "1–2 × 15–25/side"
            }
          ],
          "blockId": "push-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        }
      ]
    },
    {
      "id": "pull-a",
      "name": "Pull A",
      "group": "gym",
      "status": "required",
      "note": "",
      "blocks": [
        {
          "id": "pull-a-main",
          "name": ""
        },
        {
          "id": "pull-a-optional-coverage-rehab",
          "name": "Optional coverage · Rehab"
        }
      ],
      "entries": [
        {
          "id": "pull-a-entry-001",
          "choices": [
            {
              "exerciseId": "neutral-grip-pull-up",
              "prescription": "3 × 6–10"
            },
            {
              "exerciseId": "assisted-neutral-grip-pull-up",
              "prescription": "3 × 6–10"
            }
          ],
          "blockId": "pull-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-a-entry-002",
          "choices": [
            {
              "exerciseId": "one-arm-cable-row-lat-bias",
              "prescription": "3 × 8–12/side"
            }
          ],
          "blockId": "pull-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-a-entry-003",
          "choices": [
            {
              "exerciseId": "straight-arm-cable-pulldown",
              "prescription": "2 × 12–15"
            }
          ],
          "blockId": "pull-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-a-entry-004",
          "choices": [
            {
              "exerciseId": "chest-supported-rear-delt-raise",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "pull-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-a-entry-005",
          "choices": [
            {
              "exerciseId": "preacher-curl",
              "prescription": "2 × 8–12"
            }
          ],
          "blockId": "pull-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-a-entry-006",
          "choices": [
            {
              "exerciseId": "hammer-curl",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "pull-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-a-entry-007",
          "choices": [
            {
              "exerciseId": "wrist-curl",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "pull-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-a-entry-008",
          "choices": [
            {
              "exerciseId": "pallof-press",
              "prescription": "2 × 10–15/side"
            }
          ],
          "blockId": "pull-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-a-entry-009",
          "choices": [
            {
              "exerciseId": "cable-pronation",
              "prescription": "1–2 × 12–20/side"
            },
            {
              "exerciseId": "lever-forearm-pronation",
              "prescription": "1–2 × 12–20/side"
            }
          ],
          "blockId": "pull-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "pull-a-entry-010",
          "choices": [
            {
              "exerciseId": "cable-supination",
              "prescription": "1–2 × 12–20/side"
            },
            {
              "exerciseId": "lever-forearm-supination",
              "prescription": "1–2 × 12–20/side"
            }
          ],
          "blockId": "pull-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "pull-a-entry-011",
          "choices": [
            {
              "exerciseId": "radial-deviation",
              "prescription": "1–2 × 15–25/side"
            }
          ],
          "blockId": "pull-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "pull-a-entry-012",
          "choices": [
            {
              "exerciseId": "ulnar-deviation",
              "prescription": "1–2 × 15–25/side"
            }
          ],
          "blockId": "pull-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        }
      ]
    },
    {
      "id": "legs-a",
      "name": "Legs A",
      "group": "gym",
      "status": "required",
      "note": "",
      "blocks": [
        {
          "id": "legs-a-main",
          "name": "Glutes and quads"
        },
        {
          "id": "legs-a-optional-coverage-rehab",
          "name": "Optional coverage · Rehab"
        }
      ],
      "entries": [
        {
          "id": "legs-a-entry-001",
          "choices": [
            {
              "exerciseId": "hip-thrust",
              "prescription": "3 × 6–10"
            }
          ],
          "blockId": "legs-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-a-entry-002",
          "choices": [
            {
              "exerciseId": "hack-squat",
              "prescription": "3 × 6–10"
            }
          ],
          "blockId": "legs-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-a-entry-003",
          "choices": [
            {
              "exerciseId": "supported-bulgarian-split-squat",
              "prescription": "2 × 8–12/leg"
            },
            {
              "exerciseId": "deficit-reverse-lunge",
              "prescription": "2 × 8–12/leg"
            }
          ],
          "blockId": "legs-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-a-entry-004",
          "choices": [
            {
              "exerciseId": "seated-leg-curl",
              "prescription": "2 × 8–15"
            }
          ],
          "blockId": "legs-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-a-entry-005",
          "choices": [
            {
              "exerciseId": "leg-extension",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "legs-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-a-entry-006",
          "choices": [
            {
              "exerciseId": "upright-hip-abduction-machine",
              "prescription": "2 × 15–25"
            }
          ],
          "blockId": "legs-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-a-entry-007",
          "choices": [
            {
              "exerciseId": "standing-calf-raise",
              "prescription": "3 × 8–15"
            }
          ],
          "blockId": "legs-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-a-entry-008",
          "choices": [
            {
              "exerciseId": "tibialis-raise",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "legs-a-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-a-entry-009",
          "choices": [
            {
              "exerciseId": "cable-ankle-inversion",
              "prescription": "2 × 15–25/side"
            },
            {
              "exerciseId": "ankle-inversion",
              "prescription": "2 × 15–25/side"
            }
          ],
          "blockId": "legs-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "legs-a-entry-010",
          "choices": [
            {
              "exerciseId": "cable-ankle-eversion",
              "prescription": "2 × 15–25/side"
            },
            {
              "exerciseId": "ankle-eversion",
              "prescription": "2 × 15–25/side"
            }
          ],
          "blockId": "legs-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "legs-a-entry-011",
          "choices": [
            {
              "exerciseId": "short-foot-exercise",
              "prescription": "2 × 12–20"
            },
            {
              "exerciseId": "controlled-towel-toe-curl",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "legs-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "legs-a-entry-012",
          "choices": [
            {
              "exerciseId": "controlled-toe-extension",
              "prescription": "1–2 × 15–25"
            }
          ],
          "blockId": "legs-a-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "legs-a-entry-013",
          "choices": [
            {
              "exerciseId": "single-leg-balance",
              "prescription": "1–2 × 30–60 sec/side"
            }
          ],
          "blockId": "legs-a-optional-coverage-rehab",
          "note": "Perform during the warm-up.",
          "role": "optional"
        }
      ]
    },
    {
      "id": "push-b",
      "name": "Push B",
      "group": "gym",
      "status": "required",
      "note": "",
      "blocks": [
        {
          "id": "push-b-main",
          "name": ""
        },
        {
          "id": "push-b-optional-coverage-rehab",
          "name": "Optional coverage · Rehab"
        }
      ],
      "entries": [
        {
          "id": "push-b-entry-001",
          "choices": [
            {
              "exerciseId": "machine-overhead-press",
              "prescription": "3 × 6–10"
            }
          ],
          "blockId": "push-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-b-entry-002",
          "choices": [
            {
              "exerciseId": "flat-dumbbell-press",
              "prescription": "3 × 8–12"
            }
          ],
          "blockId": "push-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-b-entry-003",
          "choices": [
            {
              "exerciseId": "high-to-low-cable-fly",
              "prescription": "2 × 10–15"
            },
            {
              "exerciseId": "decline-chest-press-machine",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "push-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-b-entry-004",
          "choices": [
            {
              "exerciseId": "pec-deck",
              "prescription": "2 × 10–15"
            },
            {
              "exerciseId": "cable-fly",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "push-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-b-entry-005",
          "choices": [
            {
              "exerciseId": "machine-lateral-raise",
              "prescription": "3 × 12–20"
            },
            {
              "exerciseId": "cable-lateral-raise",
              "prescription": "3 × 12–20"
            }
          ],
          "blockId": "push-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-b-entry-006",
          "choices": [
            {
              "exerciseId": "overhead-cable-triceps-extension",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "push-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-b-entry-007",
          "choices": [
            {
              "exerciseId": "hanging-knee-raise",
              "prescription": "2 × 10–15"
            },
            {
              "exerciseId": "captains-chair-knee-raise",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "push-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-b-entry-008",
          "choices": [
            {
              "exerciseId": "ab-wheel-rollout",
              "prescription": "2 × 6–12"
            },
            {
              "exerciseId": "long-lever-plank",
              "prescription": "2 × 6–12"
            }
          ],
          "blockId": "push-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-b-entry-009",
          "choices": [
            {
              "exerciseId": "cable-wood-chop",
              "prescription": "2 × 10–15/side"
            }
          ],
          "blockId": "push-b-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "push-b-entry-010",
          "choices": [
            {
              "exerciseId": "neck-lateral-flexion",
              "prescription": "2 × 15–25/side"
            }
          ],
          "blockId": "push-b-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        }
      ]
    },
    {
      "id": "pull-b",
      "name": "Pull B",
      "group": "gym",
      "status": "required",
      "note": "",
      "blocks": [
        {
          "id": "pull-b-main",
          "name": ""
        },
        {
          "id": "pull-b-optional-coverage-rehab",
          "name": "Optional coverage · Rehab"
        }
      ],
      "entries": [
        {
          "id": "pull-b-entry-001",
          "choices": [
            {
              "exerciseId": "chest-supported-row-mid-back-bias",
              "prescription": "3 × 6–10"
            }
          ],
          "blockId": "pull-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-b-entry-002",
          "choices": [
            {
              "exerciseId": "neutral-grip-lat-pulldown",
              "prescription": "3 × 8–12"
            }
          ],
          "blockId": "pull-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-b-entry-003",
          "choices": [
            {
              "exerciseId": "dumbbell-shrug",
              "prescription": "2 × 10–15"
            },
            {
              "exerciseId": "machine-shrug",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "pull-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-b-entry-004",
          "choices": [
            {
              "exerciseId": "rope-face-pull",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "pull-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-b-entry-005",
          "choices": [
            {
              "exerciseId": "incline-y-raise",
              "prescription": "2 × 12–20"
            },
            {
              "exerciseId": "cable-y-raise",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "pull-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-b-entry-006",
          "choices": [
            {
              "exerciseId": "incline-dumbbell-curl",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "pull-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-b-entry-007",
          "choices": [
            {
              "exerciseId": "cable-reverse-curl",
              "prescription": "2 × 10–15"
            },
            {
              "exerciseId": "reverse-curl",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "pull-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-b-entry-008",
          "choices": [
            {
              "exerciseId": "suitcase-carry",
              "prescription": "2 rounds/side · 30–60 sec"
            }
          ],
          "blockId": "pull-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-b-entry-009",
          "choices": [
            {
              "exerciseId": "reverse-wrist-curl",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "pull-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-b-entry-010",
          "choices": [
            {
              "exerciseId": "cable-neck-rotation",
              "prescription": "1–2 × 15–25/side"
            }
          ],
          "blockId": "pull-b-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        }
      ]
    },
    {
      "id": "legs-b",
      "name": "Legs B",
      "group": "gym",
      "status": "required",
      "note": "",
      "blocks": [
        {
          "id": "legs-b-main",
          "name": "Glutes and posterior chain"
        },
        {
          "id": "legs-b-optional-coverage-rehab",
          "name": "Optional coverage · Rehab"
        }
      ],
      "entries": [
        {
          "id": "legs-b-entry-001",
          "choices": [
            {
              "exerciseId": "romanian-deadlift",
              "prescription": "3 × 6–10"
            }
          ],
          "blockId": "legs-b-main",
          "note": "Rotate with a 45° glute-biased back extension when needed. Do not perform both automatically.",
          "role": "main"
        },
        {
          "id": "legs-b-entry-002",
          "choices": [
            {
              "exerciseId": "hip-thrust",
              "prescription": "2 × 8–12"
            },
            {
              "exerciseId": "smith-hip-thrust",
              "prescription": "2 × 8–12"
            }
          ],
          "blockId": "legs-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-b-entry-003",
          "choices": [
            {
              "exerciseId": "glute-biased-step-up",
              "prescription": "2 × 8–12/leg"
            }
          ],
          "blockId": "legs-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-b-entry-optional-quad",
          "choices": [
            {
              "exerciseId": "leg-press",
              "prescription": "2 × 10–15"
            },
            {
              "exerciseId": "smith-squat",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "legs-b-main",
          "note": "Optional quad addition — perform after step-ups.",
          "role": "optional"
        },
        {
          "id": "legs-b-entry-004",
          "choices": [
            {
              "exerciseId": "lying-leg-curl",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "legs-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-b-entry-005",
          "choices": [
            {
              "exerciseId": "lean-forward-hip-abduction-machine",
              "prescription": "2 × 15–25"
            }
          ],
          "blockId": "legs-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-b-entry-006",
          "choices": [
            {
              "exerciseId": "adductor-machine",
              "prescription": "2 × 12–20"
            }
          ],
          "blockId": "legs-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-b-entry-007",
          "choices": [
            {
              "exerciseId": "seated-calf-raise",
              "prescription": "3 × 10–20"
            }
          ],
          "blockId": "legs-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-b-entry-008",
          "choices": [
            {
              "exerciseId": "standing-cable-hip-flexion",
              "prescription": "2 × 12–20/side"
            }
          ],
          "blockId": "legs-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-b-entry-009",
          "choices": [
            {
              "exerciseId": "neck-extension",
              "prescription": "2 × 15–25"
            }
          ],
          "blockId": "legs-b-main",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-b-entry-010",
          "choices": [
            {
              "exerciseId": "seated-hip-internal-rotation",
              "prescription": "2 × 12–20/side"
            },
            {
              "exerciseId": "cable-hip-internal-rotation",
              "prescription": "2 × 12–20/side"
            }
          ],
          "blockId": "legs-b-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "legs-b-entry-011",
          "choices": [
            {
              "exerciseId": "seated-hip-external-rotation",
              "prescription": "2 × 12–20/side"
            },
            {
              "exerciseId": "cable-hip-external-rotation",
              "prescription": "2 × 12–20/side"
            }
          ],
          "blockId": "legs-b-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        },
        {
          "id": "legs-b-entry-012",
          "choices": [
            {
              "exerciseId": "cable-side-bend",
              "prescription": "2 × 10–15/side"
            }
          ],
          "blockId": "legs-b-optional-coverage-rehab",
          "note": "",
          "role": "optional"
        }
      ]
    },
    {
      "id": "home-base",
      "name": "Home Base",
      "group": "home",
      "status": "optional",
      "note": "Choice menu: choose only what you need; this is not one 52-exercise session.",
      "blocks": [
        {
          "id": "home-base-core",
          "name": "Core"
        },
        {
          "id": "home-base-shoulder-scapula-spine",
          "name": "Shoulder, scapula, and spine"
        },
        {
          "id": "home-base-hip-flexion-extension",
          "name": "Hip flexion and extension"
        },
        {
          "id": "home-base-hip-rotation-circumduction",
          "name": "Hip rotation and circumduction"
        },
        {
          "id": "home-base-hip-frontal-plane",
          "name": "Hip abduction, adduction, and frontal plane"
        },
        {
          "id": "home-base-single-leg-pelvic-control",
          "name": "Single-leg and pelvic control"
        },
        {
          "id": "home-base-ankle-lower-leg",
          "name": "Ankle and lower leg"
        }
      ],
      "entries": [
        {
          "id": "home-base-entry-001",
          "choices": [
            {
              "exerciseId": "dead-bug",
              "prescription": "2 × 5–10/side"
            }
          ],
          "blockId": "home-base-core",
          "note": "",
          "role": "optional"
        },
        {
          "id": "home-base-entry-002",
          "choices": [
            {
              "exerciseId": "bird-dog",
              "prescription": "1–2 × 5–10/side"
            }
          ],
          "blockId": "home-base-core",
          "note": "Related work elsewhere: Home Base — Dead bug; Pull A — Pallof press; Legs B — 45° glute-biased back extension.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-003",
          "choices": [
            {
              "exerciseId": "side-plank",
              "prescription": "1–2 × 15–40 sec/side"
            }
          ],
          "blockId": "home-base-core",
          "note": "Related work elsewhere: Pull B — Suitcase carry for anti-lateral flexion.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-004",
          "choices": [
            {
              "exerciseId": "band-pallof-press",
              "prescription": "1–2 × 10–15/side"
            }
          ],
          "blockId": "home-base-core",
          "note": "Also programmed in: Pull A — Pallof press.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-005",
          "choices": [
            {
              "exerciseId": "band-wood-chop",
              "prescription": "1–2 × 8–15/side"
            },
            {
              "exerciseId": "band-lift",
              "prescription": "1–2 × 8–15/side"
            }
          ],
          "blockId": "home-base-core",
          "note": "Related work elsewhere: Push B — Cable wood chop. This is the same function.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-006",
          "choices": [
            {
              "exerciseId": "reverse-crunch",
              "prescription": "1–2 × 8–15"
            }
          ],
          "blockId": "home-base-core",
          "note": "Related work elsewhere: Push A + Glutes — Cable crunch; Push B — Hanging knee raise or captain’s-chair knee raise.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-007",
          "choices": [
            {
              "exerciseId": "band-side-bend",
              "prescription": "1–2 × 10–15/side"
            }
          ],
          "blockId": "home-base-core",
          "note": "Related work elsewhere: Legs B — Cable side bend. This is the same function.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-008",
          "choices": [
            {
              "exerciseId": "sorensen-hold",
              "prescription": "1–2 × 20–45 sec"
            },
            {
              "exerciseId": "prone-back-extension",
              "prescription": "1–2 × 8–15"
            }
          ],
          "blockId": "home-base-core",
          "note": "Related work elsewhere: Legs B — 45° glute-biased back extension or Romanian deadlift.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-009",
          "choices": [
            {
              "exerciseId": "neck-cars",
              "prescription": "1–2 slow circles/direction"
            }
          ],
          "blockId": "home-base-shoulder-scapula-spine",
          "note": "Related work elsewhere: Push A + Glutes — Neck flexion; Push B — Neck lateral flexion; Pull B — Cable neck rotation; Legs B — Neck extension.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-010",
          "choices": [
            {
              "exerciseId": "shoulder-cars",
              "prescription": "1–2 slow circles/direction"
            }
          ],
          "blockId": "home-base-shoulder-scapula-spine",
          "note": "Related work elsewhere: Push A + Glutes — Machine overhead press, dumbbell scaption raise, and shoulder rotations; Push B — Machine overhead press; Pull B — Incline-bench or cable Y-raise.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-011",
          "choices": [
            {
              "exerciseId": "wall-angel",
              "prescription": "1–2 × 8–12"
            }
          ],
          "blockId": "home-base-shoulder-scapula-spine",
          "note": "Related work elsewhere: Push A + Glutes — Machine overhead press and dumbbell scaption raise; Push B — Machine overhead press; Pull B — Incline-bench or cable Y-raise.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-012",
          "choices": [
            {
              "exerciseId": "serratus-wall-slide",
              "prescription": "1–2 × 8–12"
            }
          ],
          "blockId": "home-base-shoulder-scapula-spine",
          "note": "Related work elsewhere: Push A + Glutes — Cable serratus punch or push-up plus and machine overhead press; Push B — Machine overhead press.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-013",
          "choices": [
            {
              "exerciseId": "push-up-plus",
              "prescription": "1–2 × 10–15"
            }
          ],
          "blockId": "home-base-shoulder-scapula-spine",
          "note": "Also programmed in: Push A + Glutes — Push-up plus.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-014",
          "choices": [
            {
              "exerciseId": "prone-w-raise",
              "prescription": "1–2 × 10–15"
            }
          ],
          "blockId": "home-base-shoulder-scapula-spine",
          "note": "Related work elsewhere: Pull B — Rope face pull; Push A + Glutes — shoulder external rotation; Pull A — Chest-supported dumbbell rear-delt raise.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-015",
          "choices": [
            {
              "exerciseId": "cat-cow",
              "prescription": "1 × 6–10"
            }
          ],
          "blockId": "home-base-shoulder-scapula-spine",
          "note": "",
          "role": "optional"
        },
        {
          "id": "home-base-entry-016",
          "choices": [
            {
              "exerciseId": "open-book-thoracic-rotation",
              "prescription": "1–2 × 6–10/side"
            }
          ],
          "blockId": "home-base-shoulder-scapula-spine",
          "note": "Related work elsewhere: Push B — Cable wood chop. This exercise is mobility rather than loaded rotation.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-017",
          "choices": [
            {
              "exerciseId": "wrist-cars",
              "prescription": "1–2 slow circles/direction"
            }
          ],
          "blockId": "home-base-shoulder-scapula-spine",
          "note": "Related work elsewhere: Pull A — Wrist curl, forearm pronation, forearm supination, radial deviation, and ulnar deviation; Pull B — Reverse wrist curl.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-018",
          "choices": [
            {
              "exerciseId": "standing-band-knee-drive",
              "prescription": "1–2 × 10–15/side"
            }
          ],
          "blockId": "home-base-hip-flexion-extension",
          "note": "Related work elsewhere: Legs B — Standing cable hip flexion. This is the same function.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-019",
          "choices": [
            {
              "exerciseId": "seated-straight-leg-lift",
              "prescription": "2 × 6–12/side"
            }
          ],
          "blockId": "home-base-hip-flexion-extension",
          "note": "Related work elsewhere: Legs B — Standing cable hip flexion; Push B — Hanging knee raise or captain’s-chair knee raise. This exercise uses a straight knee.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-020",
          "choices": [
            {
              "exerciseId": "active-straight-leg-raise",
              "prescription": "1–2 × 5–10/side"
            }
          ],
          "blockId": "home-base-hip-flexion-extension",
          "note": "Related work elsewhere: Legs B — Standing cable hip flexion and Romanian deadlift. This exercise emphasizes active range.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-021",
          "choices": [
            {
              "exerciseId": "glute-bridge",
              "prescription": "1–2 × 10–20"
            }
          ],
          "blockId": "home-base-hip-flexion-extension",
          "note": "Related work elsewhere: Push A + Glutes — Single-leg hip thrust; Legs A — Barbell hip thrust; Legs B — Barbell or Smith hip thrust. These share the hip-thrust movement pattern.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-022",
          "choices": [
            {
              "exerciseId": "half-kneeling-hip-flexor-stretch",
              "prescription": "1–2 × 20–40 sec/side"
            }
          ],
          "blockId": "home-base-hip-flexion-extension",
          "note": "Related work elsewhere: Legs B — Standing cable hip flexion; Push B — Hanging knee raise or captain’s-chair knee raise. Those exercises do not replace this passive stretch.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-023",
          "choices": [
            {
              "exerciseId": "supine-hamstring-stretch",
              "prescription": "1–2 × 20–40 sec/side"
            }
          ],
          "blockId": "home-base-hip-flexion-extension",
          "note": "Related work elsewhere: Legs B — Romanian deadlift; Legs A — Seated leg curl. Those exercises load the hamstrings, but this is passive flexibility.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-024",
          "choices": [
            {
              "exerciseId": "90-90-hip-switches",
              "prescription": "1–2 × 6–10 total"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "Related work elsewhere: Legs B — hip internal rotation and hip external rotation.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-025",
          "choices": [
            {
              "exerciseId": "90-90-front-leg-lift-off",
              "prescription": "2 × 5–8/side"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "Related work elsewhere: Legs B — hip external rotation. This exercise trains active end range.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-026",
          "choices": [
            {
              "exerciseId": "90-90-rear-leg-lift-off",
              "prescription": "2 × 5–8/side"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "Related work elsewhere: Legs B — hip internal rotation. This exercise trains active end range.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-027",
          "choices": [
            {
              "exerciseId": "hip-cars",
              "prescription": "1–2 slow circles/direction/side"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "Related work elsewhere: Push A + Glutes, Legs A, and Legs B contain separate hip-extension, flexion, abduction, adduction, and rotation exercises. Those do not replace continuous circumduction.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-028",
          "choices": [
            {
              "exerciseId": "seated-hip-internal-rotation",
              "prescription": "2 × 12–20/side"
            },
            {
              "exerciseId": "hip-internal-rotation",
              "prescription": "2 × 12–20/side"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "Also programmed in: Legs B — Seated hip internal rotation.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-029",
          "choices": [
            {
              "exerciseId": "seated-hip-external-rotation",
              "prescription": "2 × 12–20/side"
            },
            {
              "exerciseId": "hip-external-rotation",
              "prescription": "2 × 12–20/side"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "Also programmed in: Legs B — Seated hip external rotation.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-030",
          "choices": [
            {
              "exerciseId": "prone-hip-internal-rotation",
              "prescription": "1–2 × 10–15/side"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "Related work elsewhere: Legs B — Seated or cable hip internal rotation. This exercise uses a different hip position.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-031",
          "choices": [
            {
              "exerciseId": "prone-hip-external-rotation",
              "prescription": "1–2 × 10–15/side"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "Related work elsewhere: Legs B — Seated or cable hip external rotation. This exercise uses a different hip position.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-032",
          "choices": [
            {
              "exerciseId": "relaxed-90-90-external-rotation-stretch",
              "prescription": "1–2 × 20–40 sec/side"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "",
          "role": "optional"
        },
        {
          "id": "home-base-entry-033",
          "choices": [
            {
              "exerciseId": "gentle-passive-internal-rotation-stretch",
              "prescription": "1–2 × 20–40 sec/side"
            }
          ],
          "blockId": "home-base-hip-rotation-circumduction",
          "note": "",
          "role": "optional"
        },
        {
          "id": "home-base-entry-034",
          "choices": [
            {
              "exerciseId": "side-lying-hip-abduction",
              "prescription": "1–2 × 12–20/side"
            },
            {
              "exerciseId": "band-hip-abduction",
              "prescription": "1–2 × 12–20/side"
            }
          ],
          "blockId": "home-base-hip-frontal-plane",
          "note": "Related work elsewhere: Push A + Glutes — Standing cable hip abduction; Legs A — Upright hip-abduction machine; Legs B — Lean-forward hip-abduction machine. These share the same function.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-035",
          "choices": [
            {
              "exerciseId": "side-lying-hip-adduction",
              "prescription": "1–2 × 12–20/side"
            }
          ],
          "blockId": "home-base-hip-frontal-plane",
          "note": "Related work elsewhere: Legs B — Adductor machine. This is the same function.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-036",
          "choices": [
            {
              "exerciseId": "adductor-rock-back",
              "prescription": "1–2 × 8–12/side"
            }
          ],
          "blockId": "home-base-hip-frontal-plane",
          "note": "Related work elsewhere: Legs B — Adductor machine; Legs A — Supported Bulgarian split squat.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-037",
          "choices": [
            {
              "exerciseId": "supported-cossack-squat",
              "prescription": "1–2 × 5–8/side"
            }
          ],
          "blockId": "home-base-hip-frontal-plane",
          "note": "Related work elsewhere: Legs B — Adductor machine; Legs A — Hack squat and supported Bulgarian split squat.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-038",
          "choices": [
            {
              "exerciseId": "short-lever-copenhagen-plank",
              "prescription": "1–2 × 10–30 sec/side"
            }
          ],
          "blockId": "home-base-hip-frontal-plane",
          "note": "Also programmed in: Legs morning — Short-lever Copenhagen plank.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-039",
          "choices": [
            {
              "exerciseId": "supported-frog-stretch",
              "prescription": "1–2 × 20–40 sec"
            },
            {
              "exerciseId": "passive-adductor-stretch",
              "prescription": "1–2 × 20–40 sec"
            }
          ],
          "blockId": "home-base-hip-frontal-plane",
          "note": "",
          "role": "optional"
        },
        {
          "id": "home-base-entry-040",
          "choices": [
            {
              "exerciseId": "supported-hip-airplane",
              "prescription": "1–2 × 4–8/side"
            }
          ],
          "blockId": "home-base-single-leg-pelvic-control",
          "note": "Related work elsewhere: Legs B — Glute-biased step-up and hip rotations; Legs A — Supported Bulgarian split squat.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-041",
          "choices": [
            {
              "exerciseId": "lateral-step-down",
              "prescription": "1–2 × 6–12/side"
            }
          ],
          "blockId": "home-base-single-leg-pelvic-control",
          "note": "Related work elsewhere: Legs B — Glute-biased step-up; Legs A — Supported Bulgarian split squat.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-042",
          "choices": [
            {
              "exerciseId": "single-leg-balance",
              "prescription": "1–2 × 30–60 sec/side"
            }
          ],
          "blockId": "home-base-single-leg-pelvic-control",
          "note": "Also programmed in: Legs A — Single-leg balance.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-043",
          "choices": [
            {
              "exerciseId": "single-leg-romanian-deadlift",
              "prescription": "1–2 × 6–10/side"
            }
          ],
          "blockId": "home-base-single-leg-pelvic-control",
          "note": "Related work elsewhere: Legs B — Romanian deadlift and glute-biased step-up.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-044",
          "choices": [
            {
              "exerciseId": "reverse-lunge",
              "prescription": "1–2 × 6–12/side"
            },
            {
              "exerciseId": "split-squat",
              "prescription": "1–2 × 6–12/side"
            }
          ],
          "blockId": "home-base-single-leg-pelvic-control",
          "note": "Related work elsewhere: Legs A — Supported Bulgarian split squat or deficit reverse lunge; Legs B — Glute-biased step-up.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-045",
          "choices": [
            {
              "exerciseId": "goblet-squat-hold",
              "prescription": "1–2 × 20–40 sec"
            }
          ],
          "blockId": "home-base-single-leg-pelvic-control",
          "note": "Related work elsewhere: Legs A — Hack squat through a deep loaded squat position.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-046",
          "choices": [
            {
              "exerciseId": "supported-deep-split-squat-hold",
              "prescription": "1–2 × 20–40 sec/side"
            }
          ],
          "blockId": "home-base-single-leg-pelvic-control",
          "note": "Related work elsewhere: Legs A — Supported Bulgarian split squat. This is the same position performed dynamically.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-047",
          "choices": [
            {
              "exerciseId": "ankle-cars",
              "prescription": "1–2 slow circles/direction"
            }
          ],
          "blockId": "home-base-ankle-lower-leg",
          "note": "Related work elsewhere: Legs A — Standing calf raise, tibialis raise, ankle inversion, and ankle eversion; Legs B — Seated calf raise.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-048",
          "choices": [
            {
              "exerciseId": "knee-to-wall-ankle-rocks",
              "prescription": "1–2 × 8–15/side"
            }
          ],
          "blockId": "home-base-ankle-lower-leg",
          "note": "Related work elsewhere: Legs A — Hack squat and supported Bulgarian split squat provide loaded ankle dorsiflexion.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-049",
          "choices": [
            {
              "exerciseId": "straight-knee-calf-stretch",
              "prescription": "1–2 × 20–40 sec/side"
            }
          ],
          "blockId": "home-base-ankle-lower-leg",
          "note": "Related work elsewhere: Legs A — Standing calf raise loads the gastrocnemius at length.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-050",
          "choices": [
            {
              "exerciseId": "bent-knee-calf-stretch",
              "prescription": "1–2 × 20–40 sec/side"
            }
          ],
          "blockId": "home-base-ankle-lower-leg",
          "note": "Related work elsewhere: Legs B — Seated calf raise loads the soleus.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-051",
          "choices": [
            {
              "exerciseId": "ankle-inversion",
              "prescription": "2 × 12–20/side"
            }
          ],
          "blockId": "home-base-ankle-lower-leg",
          "note": "Also programmed in: Legs A — Band ankle inversion.",
          "role": "optional"
        },
        {
          "id": "home-base-entry-052",
          "choices": [
            {
              "exerciseId": "ankle-eversion",
              "prescription": "2 × 12–20/side"
            }
          ],
          "blockId": "home-base-ankle-lower-leg",
          "note": "Also programmed in: Legs A — Band ankle eversion.",
          "role": "optional"
        }
      ]
    },
    {
      "id": "push-morning",
      "name": "Push morning",
      "group": "home",
      "status": "required",
      "note": "",
      "blocks": [
        {
          "id": "push-morning-focus",
          "name": "Shoulders, serratus, and posture"
        }
      ],
      "entries": [
        {
          "id": "push-morning-entry-001",
          "choices": [
            {
              "exerciseId": "modified-curl-up",
              "prescription": "5 × 8–10-sec holds"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-morning-entry-002",
          "choices": [
            {
              "exerciseId": "short-lever-side-plank",
              "prescription": "2 × 15–30 sec/side"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-morning-entry-003",
          "choices": [
            {
              "exerciseId": "bird-dog",
              "prescription": "5 × 5–10-sec holds/side"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-morning-entry-004",
          "choices": [
            {
              "exerciseId": "foam-roller-thoracic-extension",
              "prescription": "6–10 slow reps"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-morning-entry-005",
          "choices": [
            {
              "exerciseId": "shoulder-cars",
              "prescription": "2 slow circles/direction/side"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-morning-entry-006",
          "choices": [
            {
              "exerciseId": "serratus-wall-slide-with-band",
              "prescription": "2 × 8–12"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-morning-entry-007",
          "choices": [
            {
              "exerciseId": "push-up-plus",
              "prescription": "2 × 8–15"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-morning-entry-008",
          "choices": [
            {
              "exerciseId": "side-lying-external-rotation",
              "prescription": "2 × 12–20/side"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-morning-entry-009",
          "choices": [
            {
              "exerciseId": "doorway-pec-stretch",
              "prescription": "2 × 20–40 sec/side"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "push-morning-entry-010",
          "choices": [
            {
              "exerciseId": "knee-to-wall-ankle-rocks",
              "prescription": "2 × 8–15/side"
            }
          ],
          "blockId": "push-morning-focus",
          "note": "",
          "role": "main"
        }
      ]
    },
    {
      "id": "pull-morning",
      "name": "Pull morning",
      "group": "home",
      "status": "required",
      "note": "",
      "blocks": [
        {
          "id": "pull-morning-focus",
          "name": "Lower traps, rotator cuff, and posture"
        }
      ],
      "entries": [
        {
          "id": "pull-morning-entry-001",
          "choices": [
            {
              "exerciseId": "modified-curl-up",
              "prescription": "5 × 8–10-sec holds"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-morning-entry-002",
          "choices": [
            {
              "exerciseId": "short-lever-side-plank",
              "prescription": "2 × 15–30 sec/side"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-morning-entry-003",
          "choices": [
            {
              "exerciseId": "bird-dog",
              "prescription": "5 × 5–10-sec holds/side"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-morning-entry-004",
          "choices": [
            {
              "exerciseId": "open-book-thoracic-rotation",
              "prescription": "1–2 × 6–10/side"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-morning-entry-005",
          "choices": [
            {
              "exerciseId": "chin-tuck",
              "prescription": "2 × 8–12 with 3-sec holds"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-morning-entry-006",
          "choices": [
            {
              "exerciseId": "prone-w-raise",
              "prescription": "2 × 10–15"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-morning-entry-007",
          "choices": [
            {
              "exerciseId": "prone-y-raise",
              "prescription": "2 × 8–12"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-morning-entry-008",
          "choices": [
            {
              "exerciseId": "band-external-rotation-at-45-90-abduction",
              "prescription": "2 × 12–20/side"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-morning-entry-009",
          "choices": [
            {
              "exerciseId": "90-90-hip-switches",
              "prescription": "1–2 × 6–10 total"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "pull-morning-entry-010",
          "choices": [
            {
              "exerciseId": "half-kneeling-hip-flexor-stretch",
              "prescription": "2 × 20–40 sec/side"
            }
          ],
          "blockId": "pull-morning-focus",
          "note": "",
          "role": "main"
        }
      ]
    },
    {
      "id": "legs-morning",
      "name": "Legs morning",
      "group": "home",
      "status": "required",
      "note": "",
      "blocks": [
        {
          "id": "legs-morning-focus",
          "name": "Hips, ankles, and squat control"
        }
      ],
      "entries": [
        {
          "id": "legs-morning-entry-001",
          "choices": [
            {
              "exerciseId": "modified-curl-up",
              "prescription": "5 × 8–10-sec holds"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-002",
          "choices": [
            {
              "exerciseId": "short-lever-side-plank",
              "prescription": "2 × 15–30 sec/side"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-003",
          "choices": [
            {
              "exerciseId": "bird-dog",
              "prescription": "5 × 5–10-sec holds/side"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-004",
          "choices": [
            {
              "exerciseId": "knee-to-wall-ankle-rocks",
              "prescription": "2 × 8–15/side"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-005",
          "choices": [
            {
              "exerciseId": "90-90-hip-switches",
              "prescription": "1 × 6–10 total"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-006",
          "choices": [
            {
              "exerciseId": "90-90-front-leg-lift-off",
              "prescription": "1 × 5–8/side with 2–3-sec holds"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-007",
          "choices": [
            {
              "exerciseId": "90-90-rear-leg-lift-off",
              "prescription": "1 × 5–8/side with 2–3-sec holds"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-008",
          "choices": [
            {
              "exerciseId": "hip-cars",
              "prescription": "1–2 slow circles/direction/side"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-009",
          "choices": [
            {
              "exerciseId": "adductor-rock-back",
              "prescription": "1 × 8–12/side"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-010",
          "choices": [
            {
              "exerciseId": "supported-cossack-squat",
              "prescription": "2 × 5–8/side"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-011",
          "choices": [
            {
              "exerciseId": "short-lever-copenhagen-plank",
              "prescription": "1–2 × 10–25 sec/side"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-012",
          "choices": [
            {
              "exerciseId": "supported-hip-airplane",
              "prescription": "2 × 4–6/side"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        },
        {
          "id": "legs-morning-entry-013",
          "choices": [
            {
              "exerciseId": "counterbalanced-deep-squat-hold",
              "prescription": "2 × 20–40 sec"
            }
          ],
          "blockId": "legs-morning-focus",
          "note": "",
          "role": "main"
        }
      ]
    }
  ],
  "programs": [
    {
      "id": "pplppl7-glute-specialization",
      "name": "PPLPPL 7 — Glute Specialization",
      "note": "Weekly layout\nDay 1 — Push A + Glutes\nDay 2 — Pull A\nDay 3 — Legs A\nDay 4 — Push B\nDay 5 — Pull B\nDay 6 — Legs B\nDay 7 — Rest: no gym resistance training.\n\nHome morning routines are organized for Push, Pull, and Legs gym days.\n\nRules\nKeep all movements controlled and away from failure.\nUse hand support and heel elevation as needed.\nDo not force through pinching, sharp pain, or a hard joint block.\nProgress by improving control, range, pauses, or reducing assistance before adding resistance.\nWhen fatigued, perform one set of each instead of skipping everything.",
      "routineIds": [
        "push-a-glutes",
        "pull-a",
        "legs-a",
        "push-b",
        "pull-b",
        "legs-b",
        "home-base",
        "push-morning",
        "pull-morning",
        "legs-morning"
      ]
    }
  ],
  "sessions": {},
  "settings": {
    "activeProgramId": "pplppl7-glute-specialization",
    "activeRoutineId": "push-a-glutes",
    "theme": "light"
  }
};

export const REVIEWED_EXERCISE_IDS = startingState.exercises.map((exercise) => exercise.id);

export function getReviewedExerciseClassification(exerciseId) {
  const exercise = startingState.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return null;
  const {
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
    relatedExercises,
  } = exercise;
  return JSON.parse(JSON.stringify({
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
    relatedExercises,
  }));
}

export function createDefaultState() {
  return JSON.parse(JSON.stringify(startingState));
}

export const RULES = [
  ["Progression", ["Weeks 1-2: light weights, lower end of sets, 3-4 RIR", "Weeks 3-6: add weight slowly, 2-3 RIR", "Weeks 7-12: train normally but clean, 1-3 RIR", "Add weight only if there is no irritation during the set, later that day, or the next morning, and form stays controlled."]],
  ["Pain rule", ["0-2/10: okay", "3/10: reduce weight or range", "Sharp or pinchy pain: stop the exercise", "Worse the next day: the session was too much"]],
  ["Unilateral rule", ["Start with the weaker side. Match those reps with the stronger side."]],
  ["Duplication rule", ["If ankle or hip rehab is done at the gym, skip the home version or do one easy set. Keep wrist work light and controlled."]],
];
