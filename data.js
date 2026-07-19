export const SCHEMA_VERSION = 5;

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Core",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Adductors",
  "Ankles",
];

export const EXERCISE_CATEGORIES = ["Mobility", "Rehab", "Full Body"];

const routineSeeds = [
  {
    id: "push-a",
    name: "Push A",
    group: "gym",
    status: "required",
    exercises: [
      ["Low incline dumbbell press", "3 × 8-12", ["Chest", "Triceps", "Shoulders"]],
      ["Machine chest press", "2 × 8-12", ["Chest", "Triceps"]],
      ["Scaption raise", "2 × 12-20", ["Shoulders"], ["Rehab"]],
      ["Rope pushdown", "2-3 × 10-15", ["Triceps"]],
      ["Cable external rotation", "2 × 15-20/side", ["Shoulders"], ["Rehab"]],
      ["Cable serratus punch", "2 × 12-15/side", ["Shoulders"], ["Rehab"]],
    ],
  },
  {
    id: "pull-a",
    name: "Pull A",
    group: "gym",
    status: "required",
    exercises: [
      ["Chest-supported row", "3 × 8-12", ["Back", "Biceps"]],
      ["Neutral-grip lat pulldown", "3 × 8-12", ["Back", "Biceps"]],
      ["Chest-supported rear-delt raise", "2 × 12-20", ["Shoulders", "Back"]],
      ["Incline Y raise", "2 × 10-15", ["Shoulders"], ["Rehab"]],
      ["Preacher curl", "2-3 × 8-12", ["Biceps"]],
      ["Wrist curl", "2 × 12-20", ["Forearms"]],
      ["Reverse wrist curl", "2 × 12-20", ["Forearms"]],
      ["Pallof press", "2 × 10-15/side", ["Core"]],
    ],
  },
  {
    id: "legs-a",
    name: "Legs A",
    group: "gym",
    status: "required",
    exercises: [
      ["Hack squat", "3 × 6-10", ["Quads", "Glutes"]],
      ["Supported Bulgarian split squat OR supported split squat", "2-3 × 8-10/leg", ["Quads", "Glutes"]],
      ["Seated leg curl", "2-3 × 10-15", ["Hamstrings"]],
      ["Leg extension", "2-3 × 10-15", ["Quads"]],
      ["Standing calf raise", "3-4 × 8-15", ["Calves"]],
      ["Tibialis raise", "2-3 × 12-20", ["Ankles"], ["Rehab"]],
      ["Adductor machine", "2-3 × 12-20", ["Adductors"]],
      ["Ankle inversion", "2 × 12-20/side", ["Ankles"], ["Rehab"]],
      ["Ankle eversion", "2 × 12-20/side", ["Ankles"], ["Rehab"]],
      ["Single-leg balance", "1-2 × 30-60 sec/side", ["Ankles", "Core"], ["Rehab"]],
    ],
  },
  {
    id: "push-b",
    name: "Push B",
    group: "gym",
    status: "required",
    exercises: [
      ["Machine overhead press", "3 × 8-12", ["Shoulders", "Triceps"]],
      ["Flat dumbbell press OR machine chest press", "2-3 × 8-12", ["Chest", "Triceps"]],
      ["Regular chest pec deck OR short-range cable fly", "1-2 × 12-15", ["Chest"]],
      ["Scaption raise OR very light cable lateral raise", "2 × 12-20", ["Shoulders"], ["Rehab"]],
      ["Rope pushdown", "2-3 × 10-15", ["Triceps"]],
      ["Cable external rotation", "2 × 15-20/side", ["Shoulders"], ["Rehab"]],
    ],
  },
  {
    id: "pull-b",
    name: "Pull B",
    group: "gym",
    status: "required",
    exercises: [
      ["Assisted neutral-grip pull-up OR neutral pulldown", "3 × 6-10", ["Back", "Biceps"]],
      ["One-arm cable row", "3 × 8-12/side", ["Back", "Biceps"]],
      ["Cable Y raise", "2 × 12-15", ["Shoulders"], ["Rehab"]],
      ["Chest-supported rear-delt raise OR prone W raise", "2 × 12-20", ["Shoulders", "Back"]],
      ["Bayesian curl", "2-3 × 10-15/side", ["Biceps"]],
      ["Hammer curl", "2 × 10-15", ["Biceps", "Forearms"]],
      ["Reverse curl", "1-2 × 10-15", ["Biceps", "Forearms"]],
      ["Suitcase carry", "2-3 rounds/side", ["Core"], ["Full Body"]],
      ["Cable pronation", "1-2 × 12-20/side", ["Forearms"], ["Rehab"]],
      ["Cable supination", "1-2 × 12-20/side", ["Forearms"], ["Rehab"]],
      ["Radial deviation", "1-2 × 12-20/side", ["Forearms"], ["Rehab"]],
      ["Ulnar deviation", "1-2 × 12-20/side", ["Forearms"], ["Rehab"]],
    ],
  },
  {
    id: "legs-b",
    name: "Legs B",
    group: "gym",
    status: "optional",
    exercises: [
      ["Romanian deadlift", "3 × 6-10", ["Hamstrings", "Glutes", "Back"]],
      ["Hip thrust", "3 × 8-12", ["Glutes", "Hamstrings"]],
      ["Glute-biased step-up", "2-3 × 8-12/leg", ["Glutes", "Quads"]],
      ["Lying leg curl", "2-3 × 10-15", ["Hamstrings"]],
      ["Back extension machine", "2-3 × 8-15", ["Back", "Glutes", "Hamstrings"]],
      ["Hip abduction machine", "2-3 × 12-20", ["Glutes"]],
      ["Seated calf raise", "3-4 × 10-20", ["Calves"]],
      ["Standing cable hip flexion / cable psoas march", "2 × 12-20/side", ["Quads", "Core"], ["Rehab"]],
      ["Hip internal rotation", "2 × 12-20/side", ["Glutes"], ["Rehab"]],
      ["Hip external rotation", "2 × 12-20/side", ["Glutes"], ["Rehab"]],
    ],
  },
  {
    id: "home-daily",
    name: "Home Daily",
    group: "home",
    status: "required",
    exercises: [
      ["Dead bug", "2 × 5-8", ["Core"]],
      ["Side plank (with hip abduction)", "2 × 15-30 sec/side", ["Core", "Glutes"]],
      ["Bird dog", "1-2 × 5-8/side", ["Core", "Back"]],
      ["Modified curl-up", "2 × 8-12", ["Core"]],
      ["Back-to-wall Y raise / wall angel", "2 × 8-12", ["Shoulders"], ["Mobility"]],
      ["Serratus wall slide", "2 × 8-12", ["Shoulders"], ["Rehab"]],
      ["Push-up plus", "2 × 10-15", ["Chest", "Shoulders", "Triceps"]],
      ["Prone W raise", "2 × 10-15", ["Shoulders", "Back"], ["Rehab"]],
      ["Clamshell / Side-lying hip abduction", "2 × 10-15/side", ["Glutes"], ["Rehab"]],
      ["Cat-cow", "1 × 6-8", ["Back"], ["Mobility"]],
      ["Knee-to-wall ankle rocks", "2 × 8-12/side", ["Ankles"], ["Mobility"]],
      ["Half-kneeling hip flexor stretch", "1-2 × 20-30 sec/side", ["Quads"], ["Mobility"]],
      ["Active straight-leg raise", "2 × 5-8/leg", ["Hamstrings"], ["Mobility"]],
      ["90/90 hip switches", "1-2 × 8-10 total", ["Glutes"], ["Mobility"]],
      ["Hip hinge", "2 × 8-12", ["Hamstrings", "Glutes"], ["Mobility"]],
      ["Supported deep squat hold", "1-2 × 20-30 sec", ["Quads", "Glutes"], ["Mobility"]],
      ["Glute bridge", "2 × 8-12", ["Glutes", "Hamstrings"]],
      ["Sitting in squat", "1-2 × 20-30 sec", ["Quads", "Glutes"], ["Mobility"]],
      ["Quadruped back rotations", "1-2 × 5-8/side", ["Back"], ["Mobility"]],
      ["Towel shoulder stretch", "2 × 20-30 sec/side", ["Shoulders"], ["Mobility"]],
      ["Foam roller chest stretch with weights", "1-2 × 20-30 sec", ["Chest", "Shoulders"], ["Mobility"]],
    ],
  },
  {
    id: "home-rehab",
    name: "Home Rehab",
    group: "home",
    status: "optional",
    exercises: [
      ["Ankle inversion", "2 × 12-20/side", ["Ankles"], ["Rehab"]],
      ["Ankle eversion", "2 × 12-20/side", ["Ankles"], ["Rehab"]],
      ["Single-leg balance", "1-2 × 30-60 sec/side", ["Ankles", "Core"], ["Rehab"]],
      ["Hip internal rotation", "2 × 12-20/side", ["Glutes"], ["Rehab"]],
      ["Hip external rotation", "2 × 12-20/side", ["Glutes"], ["Rehab"]],
    ],
  },
  {
    id: "loaded-mobility",
    name: "Loaded Mobility",
    group: "home",
    status: "optional",
    exercises: [
      ["Goblet squat hold", "2 × 20-30 sec", ["Quads", "Glutes"], ["Mobility"]],
      ["Supported Cossack squat", "2 × 5-8/side", ["Quads", "Adductors"], ["Mobility"]],
      ["Slow Romanian deadlift (3 sec down)", "2 × 6-8", ["Hamstrings", "Glutes"], ["Mobility"]],
      ["Supported deep split squat", "2 × 6-8/side", ["Quads", "Glutes"], ["Mobility"]],
      ["90/90 lean or loaded 90/90 hold", "2 × 20-30 sec/side", ["Glutes"], ["Mobility"]],
      ["Short-lever Copenhagen plank / adductor side plank", "2 × 10-20 sec/side", ["Adductors", "Core"]],
    ],
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function buildDefaults() {
  const exerciseMap = new Map();
  const routines = routineSeeds.map((routine) => {
    const entries = routine.exercises.map(([name, prescription, muscles, categories = []], index) => {
      const exerciseId = slugify(name);
      if (!exerciseMap.has(exerciseId)) {
        const [primaryMuscle, ...secondaryMuscles] = muscles;
        exerciseMap.set(exerciseId, {
          id: exerciseId,
          name,
          primaryMuscles: primaryMuscle ? [primaryMuscle] : [],
          secondaryMuscles,
          categories,
          defaultPrescription: prescription,
          instructions: "",
          videoId: "",
          alternativeExerciseIds: [],
        });
      }
      return {
        id: `${routine.id}-${index + 1}`,
        exerciseId,
        prescription,
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
    sessions: {},
    settings: {
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
