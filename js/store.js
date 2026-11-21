// Saved data: the schema version, upgrades from older versions, a check that the
// data has the shape the screens rely on, loading, saving and backups.
//
// Changing the saved shape: bump SCHEMA_VERSION and add a MIGRATIONS entry that
// upgrades the previous version in place, with a test in tests/store.test.mjs.
// Saved data and backups from older versions must keep loading.

import { applyCoachEdits, applyLibraryUpdate, applyMachineKinds, applySetupFields, LIBRARY_UPDATE_2 } from "./library-update.js";
import { isDateKey } from "./model.js";
import { SEED } from "./seed.js";

export const SCHEMA_VERSION = 19;
export const STORAGE_KEY = "gymAppStateV1";
// Earlier versions copied unreadable data here before starting fresh. It's still offered for download.
const OLD_RECOVERY_KEY = `${STORAGE_KEY}:unreadable`;

// Each entry upgrades a state of version N to N + 1, in place.
const MIGRATIONS = {
  9(state) {
    state.settings.trainingRules = SEED.settings.trainingRules;
  },
  // Sets, weights and reps logged per exercise.
  10(state) {
    for (const session of Object.values(state.sessions)) session.logs = {};
  },
  // PPL 9 replaced the PPLPPL 7 program before anything was logged (November 2026):
  // the library and programs become the starting data's, with PPL 9 active. Days
  // keep their notes, logs and completed routines; their done marks pointed at the
  // old routines, so they go. (This reads js/seed.js: if the starting data's shape
  // ever changes, freeze a copy of the version-12 library and program here.)
  11(state) {
    const { exercises, routines, programs, settings } = clone(SEED);
    Object.assign(state, { exercises, routines, programs });
    state.settings.activeProgramId = settings.activeProgramId;
    state.settings.activeRoutineId = settings.activeRoutineId;
    for (const [dateKey, session] of Object.entries(state.sessions)) {
      session.checkedEntryIdsByRoutine = {};
      if (!session.routineIds.length && !session.note && !Object.keys(session.logs).length) delete state.sessions[dateKey];
    }
  },
  // Workouts start and finish, and a day can have exercises added to a routine.
  12(state) {
    state.settings.activeWorkout = null;
    for (const session of Object.values(state.sessions)) session.extras = {};
  },
  // A finished workout keeps the routine's name, its program and how long it took;
  // the time of the last backup is remembered.
  13(state) {
    state.settings.lastBackupAt = 0;
    for (const session of Object.values(state.sessions)) {
      session.workouts = {};
      for (const routineId of session.routineIds) {
        const routine = state.routines.find((item) => item.id === routineId);
        const program = state.programs.find((item) => item.routineIds.includes(routineId));
        if (routine) session.workouts[routineId] = { name: routine.name, program: program?.name || "", minutes: null };
      }
    }
  },
  // The Library tidy-up: consistent names, links, missing exercises (js/library-update.js).
  14(state) {
    applyLibraryUpdate(state);
  },
  // Its second pass: movement first, the version in brackets.
  15(state) {
    applyLibraryUpdate(state, LIBRARY_UPDATE_2);
  },
  // Plate-loaded and Smith machines become their own equipment.
  16(state) {
    applyMachineKinds(state);
  },
  // The version leaves the name and gets its own fields (attachment, grip, width, detail, weightMode).
  17(state) {
    applySetupFields(state);
  },
  // The coach's edits to PPL 9.
  18(state) {
    applyCoachEdits(state);
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultState() {
  return clone(SEED);
}

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string";
const isName = (value) => isText(value) && value.trim() !== "";
const isId = (value) => isText(value) && value !== "";
const allText = (object, keys) => keys.every((key) => isText(object[key]));
const allLists = (object, keys) => keys.every((key) => Array.isArray(object[key]));

// One logged lift: weight in kg (null when no weight is used, negative for
// assistance) and whole reps (or seconds). A set may be marked as a warm-up.
const isLift = (lift) => isRecord(lift)
  && (lift.kg === null || Number.isFinite(lift.kg))
  && Number.isInteger(lift.reps) && lift.reps >= 0;
const isLoggedSet = (set) => isLift(set) && Array.isArray(set.drops) && set.drops.every(isLift) && [undefined, true].includes(set.warmup);

// Checks what the screens rely on: every part has the right shape and every
// reference points at something. It doesn't police content (vocabulary IDs,
// duplicate names, tidy history); the editors and js/model.js do that.
// Returns a short description of the first problem, or "" when the state is fine.
export function stateProblem(state) {
  if (!isRecord(state)) return "not an object";
  if (state.version !== SCHEMA_VERSION) return `version ${state.version} is not ${SCHEMA_VERSION}`;
  const { exercises, routines, programs, sessions, settings } = state;
  if (![exercises, routines, programs].every(Array.isArray) || !isRecord(sessions) || !isRecord(settings)) return "missing parts";

  const exerciseIds = new Set();
  for (const exercise of exercises) {
    if (!isRecord(exercise) || !isId(exercise.id) || exerciseIds.has(exercise.id)) return "exercise id";
    if (!isName(exercise.name)
      || !allText(exercise, ["movementPattern", "purpose", "style", "laterality", "support", "typicalChallenge", "defaultPrescription", "instructions", "videoId"])
      || !allLists(exercise, ["aliases", "primaryTargets", "secondaryTargets", "equipment", "emphases", "relatedExercises"])) return `exercise ${exercise.id}`;
    exerciseIds.add(exercise.id);
  }
  for (const exercise of exercises) {
    if (!exercise.relatedExercises.every((related) => isRecord(related) && isText(related.relation) && exerciseIds.has(related.exerciseId))) return `exercise ${exercise.id}: related`;
  }

  const routineIds = new Set();
  const entryIds = new Set();
  for (const routine of routines) {
    if (!isRecord(routine) || !isId(routine.id) || routineIds.has(routine.id)) return "routine id";
    const where = `routine ${routine.id}`;
    if (!isName(routine.name) || !allText(routine, ["note", "group", "status"]) || !allLists(routine, ["blocks", "entries"]) || !routine.blocks.length) return where;
    const blockIds = new Set();
    for (const block of routine.blocks) {
      if (!isRecord(block) || !isId(block.id) || blockIds.has(block.id) || !isText(block.name)) return `${where}: block`;
      blockIds.add(block.id);
    }
    for (const entry of routine.entries) {
      if (!isRecord(entry) || !isId(entry.id) || entryIds.has(entry.id)) return `${where}: entry id`;
      if (!blockIds.has(entry.blockId) || !isText(entry.note) || !["main", "optional"].includes(entry.role)) return `${where}: entry ${entry.id}`;
      if (!Array.isArray(entry.choices) || !entry.choices.length
        || !entry.choices.every((choice) => isRecord(choice) && exerciseIds.has(choice.exerciseId) && isName(choice.prescription))) return `${where}: entry ${entry.id} choices`;
      entryIds.add(entry.id);
    }
    routineIds.add(routine.id);
  }

  const programIds = new Set();
  const owned = new Set();
  for (const program of programs) {
    if (!isRecord(program) || !isId(program.id) || programIds.has(program.id)) return "program id";
    if (!isName(program.name) || !isText(program.note) || !Array.isArray(program.routineIds)) return `program ${program.id}`;
    for (const routineId of program.routineIds) {
      if (!routineIds.has(routineId) || owned.has(routineId)) return `program ${program.id}: routine ${routineId}`;
      owned.add(routineId);
    }
    programIds.add(program.id);
  }
  if (owned.size !== routines.length) return "a routine belongs to no program";

  const { activeProgramId, activeRoutineId, theme, trainingRules } = settings;
  if (!programs.length) {
    if (activeProgramId !== "" || activeRoutineId !== "") return "active selection without programs";
  } else {
    const active = programs.find((program) => program.id === activeProgramId);
    if (!active) return "active program";
    if (active.routineIds.length ? !active.routineIds.includes(activeRoutineId) : activeRoutineId !== "") return "active routine";
  }
  if (!["light", "dark"].includes(theme) || !isText(trainingRules)) return "settings";
  const workout = settings.activeWorkout;
  if (workout !== null && !(isRecord(workout) && routineIds.has(workout.routineId) && isDateKey(workout.dateKey) && Number.isFinite(workout.startedAt))) return "workout in progress";
  if (!Number.isFinite(settings.lastBackupAt)) return "last backup time";
  if (![undefined, "line", "letter"].includes(settings.exerciseLabels)) return "exercise labels";

  // History outlives what it points at: the routine, slot and exercise IDs in a
  // day may belong to things deleted since.
  for (const [dateKey, session] of Object.entries(sessions)) {
    const where = `session ${dateKey}`;
    if (!isDateKey(dateKey) || !isRecord(session) || !isText(session.note)) return where;
    if (!Array.isArray(session.routineIds) || !session.routineIds.every(isId)) return `${where}: routines`;
    if (!isRecord(session.checkedEntryIdsByRoutine)
      || !Object.values(session.checkedEntryIdsByRoutine).every((ids) => Array.isArray(ids) && ids.every(isId))) return `${where}: checks`;
    if (!isRecord(session.extras) || !Object.values(session.extras).every((extras) => Array.isArray(extras)
      && extras.every((extra) => isRecord(extra) && isId(extra.id) && isId(extra.exerciseId) && isText(extra.prescription)))) return `${where}: extras`;
    if (!isRecord(session.logs)) return `${where}: logs`;
    for (const [key, log] of Object.entries(session.logs)) {
      if (!isRecord(log) || !isId(log.routineId) || !isId(log.exerciseId) || !isName(log.exerciseName) || !["reps", "sec"].includes(log.unit)
        || !Array.isArray(log.sets) || !log.sets.length || !log.sets.every(isLoggedSet) || ![undefined, "string"].includes(typeof log.note === "undefined" ? undefined : typeof log.note)) return `${where}: log ${key}`;
    }
    if (!isRecord(session.workouts) || !Object.values(session.workouts).every((workout) => isRecord(workout) && isText(workout.name)
      && isText(workout.program) && (workout.minutes === null || Number.isFinite(workout.minutes)))) return `${where}: workouts`;
  }
  return "";
}

// Upgrades a parsed state to the current version. Throws if it can't be read.
function migrate(raw) {
  if (!isRecord(raw) || !Number.isInteger(raw.version)) throw new Error("not app data");
  const state = clone(raw);
  while (state.version < SCHEMA_VERSION) {
    const step = MIGRATIONS[state.version];
    if (!step) throw new Error(`no migration from version ${state.version}`);
    step(state);
    state.version += 1;
  }
  const problem = stateProblem(state);
  if (problem) throw new Error(problem);
  return state;
}

export function createBackup(state) {
  return { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: state };
}

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    throw new Error("This file isn't a Gym Schedule backup.");
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) throw new Error("This file isn't a Gym Schedule backup.");
  if (parsed.data.version > SCHEMA_VERSION) throw new Error("This backup was made by a newer version of the app. Update the app, then import it.");
  try {
    return migrate(parsed.data);
  } catch (_) {
    throw new Error("This backup couldn't be read by this version of the app.");
  }
}

// One store per page.
// - getState() is the saved state itself: read it, never change it.
// - update(fn) hands fn a copy to change in place (its return value is ignored);
//   fn may throw an Error with a message for the user. Nothing changes unless the
//   result passes stateProblem and the write succeeds.
// - replace(state) swaps in a whole state (backup import, restore starting data).
//
// Saved data that can't be read is never overwritten automatically: the starting
// program opens, nothing is saved, and Settings offers the unreadable data as a
// download. Only an import or a restore (replace) writes over it.
export function createStore(storage = safeLocalStorage()) {
  let state;
  let lastError = "";
  let unreadable = "";
  let locked = false;

  function write(next) {
    const problem = stateProblem(next);
    if (problem) {
      console.error("Blocked invalid update:", problem);
      return { ok: false, error: "That change couldn't be saved." };
    }
    try {
      if (!storage) throw new Error("no storage");
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {
      return { ok: false, error: "Changes couldn't be saved on this device. Nothing changed." };
    }
    state = next;
    return { ok: true };
  }

  function load() {
    let raw = null;
    try {
      if (!storage) throw new Error("no storage");
      raw = storage.getItem(STORAGE_KEY);
    } catch (_) {
      state = createDefaultState();
      locked = true;
      lastError = "Saved data couldn't be read on this device, so nothing will be saved. Close the app and open it again.";
      return;
    }
    if (!raw) {
      state = createDefaultState();
      write(state);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.version > SCHEMA_VERSION) {
        lastError = "Your data was saved by a newer version of the app, so nothing will be saved. Close the app and open it again to update.";
      }
      const upgraded = migrate(parsed);
      state = upgraded;
      if (parsed.version !== SCHEMA_VERSION) write(upgraded);
    } catch (error) {
      console.error("Saved data couldn't be read:", error.message);
      unreadable = raw;
      state = createDefaultState();
      locked = true;
      lastError ||= "Saved data couldn't be read, so the starting program is open and nothing will be saved. See Settings.";
    }
  }

  load();

  return {
    getState: () => state,
    update(fn) {
      if (locked) return { ok: false, error: lastError };
      const draft = clone(state);
      try {
        fn(draft);
        return write(draft);
      } catch (error) {
        return { ok: false, error: error?.message || "That change couldn't be saved." };
      }
    },
    replace(next) {
      const result = write(clone(next));
      if (result.ok) {
        locked = false;
        unreadable = "";
        lastError = "";
      }
      return result;
    },
    getLastError: () => lastError,
    // Saved data the app couldn't read, as text, or "".
    recoveryData() {
      if (unreadable) return unreadable;
      try {
        return storage?.getItem(OLD_RECOVERY_KEY) || "";
      } catch (_) {
        return "";
      }
    },
  };
}

function safeLocalStorage() {
  try {
    return globalThis.localStorage || null;
  } catch (_) {
    return null;
  }
}
