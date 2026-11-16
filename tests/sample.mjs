// A small made-up program for tests, so changing the owner's real program
// (js/seed.js) never breaks them. Change it freely; nothing here is shown to the owner.
//
// Sample program
// ├── Day A   Warm-up: a1 Plank (Optional, timed)
// │           Main work: a2 Bench press · a3 Incline dumbbell press or Cable fly (with a note) · a4 Push-up
// └── Day B   b1 Squat · b2 Pull-up
// History: Day A was completed on PAST_DAY with bench press and push-up sets logged.

import { SCHEMA_VERSION } from "../js/store.js";

export const PAST_DAY = "2026-11-02";

const exercise = (id, name, primaryTargets, movementPattern, equipment, defaultPrescription, extra = {}) => ({
  id,
  name,
  aliases: [],
  primaryTargets,
  secondaryTargets: [],
  movementPattern,
  equipment,
  purpose: "strength",
  style: "",
  laterality: "",
  support: "",
  emphases: [],
  typicalChallenge: "",
  relatedExercises: [],
  defaultPrescription,
  instructions: "",
  videoId: "",
  ...extra,
});

const entry = (id, blockId, choices, extra = {}) => ({
  id,
  blockId,
  choices: choices.map(([exerciseId, prescription]) => ({ exerciseId, prescription })),
  note: "",
  role: "main",
  ...extra,
});

export function sampleState() {
  return {
    version: SCHEMA_VERSION,
    exercises: [
      exercise("bench-press", "Bench press", ["chest"], "horizontal-press", ["barbell", "bench"], "3 × 8–12", {
        aliases: ["Flat bench"],
        secondaryTargets: ["triceps"],
        relatedExercises: [{ exerciseId: "push-up", relation: "easier" }],
        instructions: "Feet planted.",
      }),
      exercise("incline-press", "Incline dumbbell press", ["chest", "front-delts"], "horizontal-press", ["dumbbells", "bench"], "3 × 10", { emphases: ["upper-chest"] }),
      exercise("cable-fly", "Cable fly", ["chest"], "fly", ["cable"], "2 × 12–15"),
      exercise("push-up", "Push-up", ["chest"], "horizontal-press", ["bodyweight"], "2 × 15", {
        relatedExercises: [{ exerciseId: "bench-press", relation: "harder" }],
      }),
      exercise("plank", "Plank", ["abs"], "anti-extension", ["none"], "2 × 30 sec"),
      exercise("ab-wheel", "Ab-wheel rollout", ["abs"], "anti-extension", ["other"], "3 × 8"),
      exercise("squat", "Squat", ["quads", "glute-max"], "squat", ["barbell"], "3 × 5"),
      exercise("pull-up", "Pull-up", ["lats"], "vertical-pull", ["pull-up-bar"], "3 × 6–10", { secondaryTargets: ["biceps"] }),
      exercise("hip-flow", "Hip mobility flow", ["hip-flexors"], "mobility", ["none"], "", { purpose: "mobility" }),
    ],
    routines: [
      {
        id: "day-a",
        name: "Day A",
        group: "gym",
        status: "required",
        note: "Start light.",
        blocks: [{ id: "a-warm", name: "Warm-up" }, { id: "a-main", name: "Main work" }],
        entries: [
          entry("a1", "a-warm", [["plank", "2 × 30 sec"]], { role: "optional" }),
          entry("a2", "a-main", [["bench-press", "3 × 8–12"]]),
          entry("a3", "a-main", [["incline-press", "3 × 10"], ["cable-fly", "2 × 12–15"]], { note: "Pick by how the shoulder feels." }),
          entry("a4", "a-main", [["push-up", "2 × 15"]]),
        ],
      },
      {
        id: "day-b",
        name: "Day B",
        group: "gym",
        status: "required",
        note: "",
        blocks: [{ id: "b-main", name: "" }],
        entries: [
          entry("b1", "b-main", [["squat", "3 × 5"]]),
          entry("b2", "b-main", [["pull-up", "3 × 6–10"]]),
        ],
      },
    ],
    programs: [{ id: "sample", name: "Sample program", note: "Two days a week.", routineIds: ["day-a", "day-b"] }],
    sessions: {
      [PAST_DAY]: {
        routineIds: ["day-a"],
        checkedEntryIdsByRoutine: { "day-a": ["a2", "a3", "a4"] },
        note: "Good session.",
        logs: {
          a2: {
            routineId: "day-a",
            exerciseId: "bench-press",
            exerciseName: "Bench press",
            unit: "reps",
            sets: [{ kg: 60, reps: 10, drops: [] }, { kg: 60, reps: 9, drops: [] }, { kg: 57.5, reps: 8, drops: [{ kg: 45, reps: 6 }] }],
          },
          a4: { routineId: "day-a", exerciseId: "push-up", exerciseName: "Push-up", unit: "reps", sets: [{ kg: null, reps: 15, drops: [] }] },
        },
      },
    },
    settings: { activeProgramId: "sample", activeRoutineId: "day-a", theme: "dark", trainingRules: "Progression\n- Add weight slowly.\n\nPain rule\nStop if it's sharp." },
  };
}
