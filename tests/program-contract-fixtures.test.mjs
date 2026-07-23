import test from "node:test";
import assert from "node:assert/strict";

import { createProgramStateFixtures } from "./fixtures/program-states.mjs";

function unique(values) {
  return new Set(values).size === values.length;
}

test("Program contract fixtures cover the approved edge states and resolve every reference", () => {
  const fixtures = createProgramStateFixtures();
  assert.deepEqual(Object.keys(fixtures), [
    "noProgram",
    "severalPrograms",
    "emptyRoutine",
    "longNames",
    "crossProgramHistory",
  ]);

  for (const [name, state] of Object.entries(fixtures)) {
    const programIds = state.programs.map((program) => program.id);
    const routineIds = state.routines.map((routine) => routine.id);
    const exerciseIds = state.exercises.map((exercise) => exercise.id);
    const entryIds = state.routines.flatMap((routine) => routine.entries.map((entry) => entry.id));
    assert.equal(unique(programIds), true, `${name}: program IDs`);
    assert.equal(unique(routineIds), true, `${name}: routine IDs`);
    assert.equal(unique(exerciseIds), true, `${name}: exercise IDs`);
    assert.equal(unique(entryIds), true, `${name}: entry IDs`);

    const membership = new Map(routineIds.map((id) => [id, 0]));
    for (const program of state.programs) {
      assert.equal(unique(program.routineIds), true, `${name}: routine order`);
      for (const routineId of program.routineIds) {
        assert.equal(membership.has(routineId), true, `${name}: missing routine ${routineId}`);
        membership.set(routineId, membership.get(routineId) + 1);
      }
    }
    for (const [routineId, count] of membership) {
      assert.equal(count, 1, `${name}: ${routineId} must belong to one program`);
    }

    for (const routine of state.routines) {
      for (const item of routine.entries) {
        assert.equal(exerciseIds.includes(item.exerciseId), true, `${name}: missing exercise ${item.exerciseId}`);
        assert.equal(["main", "optional"].includes(item.role), true, `${name}: entry role`);
      }
    }
    for (const exercise of state.exercises) {
      assert.equal(exercise.primaryTargets.length >= 1 && exercise.primaryTargets.length <= 2, true, `${name}: primary targets`);
      assert.equal(exercise.primaryTargets.some((target) => exercise.secondaryTargets.includes(target)), false, `${name}: target overlap`);
      const relatedIds = exercise.relatedExercises.map((related) => related.exerciseId);
      assert.equal(unique(relatedIds), true, `${name}: duplicate related exercises`);
      for (const related of exercise.relatedExercises) {
        assert.notEqual(related.exerciseId, exercise.id, `${name}: self-related exercise`);
        assert.equal(exerciseIds.includes(related.exerciseId), true, `${name}: missing related exercise`);
        assert.equal(["easier", "similar", "harder"].includes(related.relation), true, `${name}: related exercise type`);
        const inverse = related.relation === "easier" ? "harder" : related.relation === "harder" ? "easier" : "similar";
        const counterpart = state.exercises.find((item) => item.id === related.exerciseId);
        assert.equal(
          counterpart.relatedExercises.some((item) => item.exerciseId === exercise.id && item.relation === inverse),
          true,
          `${name}: inverse related exercise`,
        );
      }
    }

    if (state.programs.length) {
      assert.notEqual(state.settings.activeProgramId, "", `${name}: active program required`);
      const activeProgram = state.programs.find((program) => program.id === state.settings.activeProgramId);
      assert.ok(activeProgram, `${name}: active program`);
      if (activeProgram.routineIds.length) {
        assert.equal(activeProgram.routineIds.includes(state.settings.activeRoutineId), true, `${name}: active routine`);
      } else {
        assert.equal(state.settings.activeRoutineId, "", `${name}: empty program selection`);
      }
    } else {
      assert.equal(state.settings.activeProgramId, "", `${name}: empty active program`);
      assert.equal(state.settings.activeRoutineId, "", `${name}: empty active selection`);
    }

    for (const session of Object.values(state.sessions)) {
      for (const routineId of session.routineIds) assert.equal(routineIds.includes(routineId), true, `${name}: history routine`);
      for (const [routineId, checkedIds] of Object.entries(session.checkedEntryIdsByRoutine)) {
        const routine = state.routines.find((item) => item.id === routineId);
        assert.ok(routine, `${name}: checked routine`);
        const validIds = routine.entries.map((item) => item.id);
        assert.equal(checkedIds.every((id) => validIds.includes(id)), true, `${name}: checked entries`);
      }
    }
  }

  assert.equal(fixtures.noProgram.programs.length, 0);
  assert.equal(fixtures.severalPrograms.programs.length > 1, true);
  assert.equal(fixtures.emptyRoutine.routines.some((routine) => routine.entries.length === 0), true);
  assert.equal(fixtures.longNames.programs[0].name.length > 60, true);
  assert.equal(fixtures.longNames.routines[0].name.length > 60, true);
  assert.equal(fixtures.longNames.exercises[0].name.length > 60, true);

  const historicalRoutine = fixtures.crossProgramHistory.sessions["2026-07-11"].routineIds[0];
  const activeProgram = fixtures.crossProgramHistory.programs.find(
    (program) => program.id === fixtures.crossProgramHistory.settings.activeProgramId,
  );
  assert.equal(activeProgram.routineIds.includes(historicalRoutine), false);
});
