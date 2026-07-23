// Contract fixtures spanning the approved Program, classification, and entry-role model.
// They are test-only and are not loaded as production state.

const press = {
  id: "low-incline-dumbbell-press",
  name: "Low incline dumbbell press",
  defaultPrescription: "3 × 8–12",
  primaryTargets: ["chest"],
  secondaryTargets: ["triceps", "front-delts"],
  movementPattern: "horizontal-press",
  equipment: ["dumbbells", "bench"],
  purpose: "strength",
  style: "compound",
  laterality: "bilateral",
  support: "supported",
  emphases: ["upper-chest"],
  typicalChallenge: "lengthened-bottom",
  instructions: "Keep the shoulder blades controlled.",
  videoId: "",
  relatedExercises: [{ exerciseId: "machine-chest-press", relation: "similar" }],
};

const machinePress = {
  ...press,
  id: "machine-chest-press",
  name: "Machine chest press",
  equipment: ["machine"],
  emphases: [],
  instructions: "Use a stable seat position and controlled range.",
  relatedExercises: [{ exerciseId: press.id, relation: "similar" }],
};

const hinge = {
  id: "romanian-deadlift",
  name: "Romanian deadlift",
  defaultPrescription: "3 × 6–10",
  primaryTargets: ["hamstrings", "glute-max"],
  secondaryTargets: ["adductors", "spinal-erectors"],
  movementPattern: "hip-hinge",
  equipment: ["barbell"],
  purpose: "strength",
  style: "compound",
  laterality: "bilateral",
  support: "",
  emphases: [],
  typicalChallenge: "lengthened-bottom",
  instructions: "Hinge with a controlled range.",
  videoId: "",
  relatedExercises: [],
};

function entry(id, exerciseId, prescription, role = "main") {
  return { id, exerciseId, prescription, role };
}

function routine(id, name, entries = [], overrides = {}) {
  return { id, name, group: "gym", status: "required", entries, ...overrides };
}

function state({ programs = [], routines = [], exercises = [press, machinePress, hinge], sessions = {}, activeProgramId = "", activeRoutineId = "" }) {
  return structuredClone({
    programs,
    routines,
    exercises,
    sessions,
    settings: { activeProgramId, activeRoutineId, theme: "dark" },
  });
}

export function createProgramStateFixtures() {
  const pushA = routine("push-a", "Push A", [
    entry("push-a-press", press.id, "3 × 8–12"),
  ]);
  const hotel = routine("hotel-full-body", "Hotel full body", [
    entry("hotel-hinge", hinge.id, "3 × 10"),
  ], { group: "home", status: "optional" });

  return {
    noProgram: state({}),

    severalPrograms: state({
      programs: [
        { id: "ppl-rehab", name: "PPL + Rehab", routineIds: [pushA.id] },
        { id: "travel-home", name: "Travel / Home", routineIds: [hotel.id] },
      ],
      routines: [pushA, hotel],
      activeProgramId: "ppl-rehab",
      activeRoutineId: pushA.id,
    }),

    emptyRoutine: state({
      programs: [{ id: "new-block", name: "New block", routineIds: ["new-day"] }],
      routines: [routine("new-day", "New workout day")],
      activeProgramId: "new-block",
      activeRoutineId: "new-day",
    }),

    longNames: state({
      programs: [{
        id: "long-program",
        name: "Long-term gym and home strength block with shoulder rehabilitation",
        routineIds: ["long-routine"],
      }],
      routines: [routine(
        "long-routine",
        "Upper-body push session with optional shoulder-control accessories",
        [entry("long-entry", "long-exercise", "3 × 8–12 with a controlled pause")],
      )],
      exercises: [{
        ...press,
        id: "long-exercise",
        name: "Supported low-incline neutral-grip dumbbell press with controlled pause",
        relatedExercises: [],
      }],
      activeProgramId: "long-program",
      activeRoutineId: "long-routine",
    }),

    crossProgramHistory: state({
      programs: [
        { id: "ppl-rehab", name: "PPL + Rehab", routineIds: [pushA.id] },
        { id: "travel-home", name: "Travel / Home", routineIds: [hotel.id] },
      ],
      routines: [pushA, hotel],
      sessions: {
        "2026-07-11": {
          routineIds: [hotel.id],
          checkedEntryIdsByRoutine: { [hotel.id]: ["hotel-hinge"] },
          note: "Completed while travelling.",
        },
      },
      activeProgramId: "ppl-rehab",
      activeRoutineId: pushA.id,
    }),
  };
}
