// Saved data: schema, validation, migrations, loading, saving and backups.
//
// Rules for changing the saved shape:
// - Bump SCHEMA_VERSION and add a MIGRATIONS entry that upgrades the previous
//   version in place. Saved data and backups from older versions must keep loading.
// - Add a test in tests/store.test.mjs that loads a saved state of the old version.

import { SEED } from "./seed.js";
import { CHALLENGES, EMPHASES, EQUIPMENT, LATERALITIES, MOVEMENTS, PURPOSES, RELATIONS, STYLES, SUPPORTS, TARGETS } from "./vocab.js";

export const SCHEMA_VERSION = 11;
export const STORAGE_KEY = "gymAppStateV1";
export const RECOVERY_KEY = `${STORAGE_KEY}:unreadable`;

const DEFAULT_TRAINING_RULES = SEED.settings.trainingRules;

// Each entry upgrades a state of version N to N + 1, in place.
const MIGRATIONS = {
  9(state) {
    state.settings.trainingRules = DEFAULT_TRAINING_RULES;
  },
  // Sets, weights and reps logged per exercise.
  10(state) {
    for (const session of Object.values(state.sessions)) session.logs = {};
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultState() {
  return clone(SEED);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// Lowercased letters and digits only, so "Ab-wheel" and "ab wheel" are the same identity.
export function normalizedName(value) {
  if (typeof value !== "string") return "";
  return (value.normalize("NFKD").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join("");
}

const ids = (list) => new Set(list.map((option) => option.id));
const allowed = {
  targets: ids(TARGETS),
  movements: ids(MOVEMENTS),
  equipment: ids(EQUIPMENT),
  purposes: ids(PURPOSES),
  styles: ids(STYLES),
  lateralities: ids(LATERALITIES),
  supports: ids(SUPPORTS),
  emphases: ids(EMPHASES),
  challenges: ids(CHALLENGES),
  relations: ids(RELATIONS),
};
export const INVERSE_RELATION = { easier: "harder", similar: "similar", harder: "easier" };

const isText = (value) => typeof value === "string";
const isName = (value) => typeof value === "string" && value.trim() !== "";
const isId = (value) => typeof value === "string" && value !== "";

function uniqueAllowed(values, set, min = 0, max = Infinity) {
  return Array.isArray(values)
    && values.length >= min
    && values.length <= max
    && values.every((value) => set.has(value))
    && new Set(values).size === values.length;
}

const optionalAllowed = (value, set) => value === "" || set.has(value);

// One logged lift: weight in kg (null when no weight is used) and whole reps (or seconds).
const isLift = (lift) => isRecord(lift)
  && (lift.kg === null || (Number.isFinite(lift.kg) && lift.kg >= 0 && lift.kg <= 1000))
  && Number.isInteger(lift.reps) && lift.reps >= 0 && lift.reps <= 1000;
const isLoggedSet = (set) => isLift(set) && Array.isArray(set.drops) && set.drops.every(isLift);

// Returns a short description of the first problem found, or "" when the state is valid.
export function stateProblem(state) {
  if (!isRecord(state)) return "not an object";
  if (state.version !== SCHEMA_VERSION) return `version ${state.version} is not ${SCHEMA_VERSION}`;
  const { exercises, routines, programs, sessions, settings } = state;
  if (!Array.isArray(exercises) || !Array.isArray(routines) || !Array.isArray(programs)) return "missing lists";
  if (!isRecord(sessions) || !isRecord(settings)) return "missing sessions or settings";

  const exerciseById = new Map();
  const identities = new Set();
  for (const exercise of exercises) {
    if (!isRecord(exercise) || !isId(exercise.id) || exerciseById.has(exercise.id)) return "bad exercise id";
    const where = `exercise ${exercise.id}`;
    if (!isName(exercise.name) || !Array.isArray(exercise.aliases)) return `${where}: name or aliases`;
    for (const identity of [exercise.name, ...exercise.aliases]) {
      const key = normalizedName(identity);
      if (!key || identities.has(key)) return `${where}: duplicate name or alias "${identity}"`;
      identities.add(key);
    }
    if (!uniqueAllowed(exercise.primaryTargets, allowed.targets, 1, 2)) return `${where}: primary targets`;
    if (!uniqueAllowed(exercise.secondaryTargets, allowed.targets)) return `${where}: secondary targets`;
    if (exercise.primaryTargets.some((target) => exercise.secondaryTargets.includes(target))) return `${where}: target is both primary and secondary`;
    if (!allowed.movements.has(exercise.movementPattern)) return `${where}: movement`;
    if (!uniqueAllowed(exercise.equipment, allowed.equipment, 1)) return `${where}: equipment`;
    if (!allowed.purposes.has(exercise.purpose)) return `${where}: purpose`;
    if (!optionalAllowed(exercise.style, allowed.styles)) return `${where}: style`;
    if (!optionalAllowed(exercise.laterality, allowed.lateralities)) return `${where}: laterality`;
    if (!optionalAllowed(exercise.support, allowed.supports)) return `${where}: support`;
    if (!uniqueAllowed(exercise.emphases, allowed.emphases)) return `${where}: emphases`;
    if (!optionalAllowed(exercise.typicalChallenge, allowed.challenges)) return `${where}: challenge`;
    if (!isText(exercise.defaultPrescription) || !isText(exercise.instructions) || !isText(exercise.videoId)) return `${where}: text fields`;
    if (!Array.isArray(exercise.relatedExercises)) return `${where}: related list`;
    exerciseById.set(exercise.id, exercise);
  }

  for (const exercise of exercises) {
    const seen = new Set();
    for (const related of exercise.relatedExercises) {
      const where = `exercise ${exercise.id} related`;
      if (!isRecord(related) || !allowed.relations.has(related.relation)) return `${where}: relation`;
      const other = exerciseById.get(related.exerciseId);
      if (!other || other === exercise || seen.has(related.exerciseId)) return `${where}: target`;
      seen.add(related.exerciseId);
      const inverse = INVERSE_RELATION[related.relation];
      if (!other.relatedExercises.some((item) => item.exerciseId === exercise.id && item.relation === inverse)) return `${where}: missing reverse link`;
    }
  }

  const entryIdsByRoutine = new Map();
  const blockIds = new Set();
  const entryIds = new Set();
  for (const routine of routines) {
    if (!isRecord(routine) || !isId(routine.id) || entryIdsByRoutine.has(routine.id)) return "bad routine id";
    const where = `routine ${routine.id}`;
    if (!isName(routine.name) || !isText(routine.note)) return `${where}: name or note`;
    if (!["gym", "home"].includes(routine.group) || !["required", "optional"].includes(routine.status)) return `${where}: group or status`;
    if (!Array.isArray(routine.blocks) || !routine.blocks.length || !Array.isArray(routine.entries)) return `${where}: blocks or entries`;
    const routineBlocks = new Set();
    for (const block of routine.blocks) {
      if (!isRecord(block) || !isId(block.id) || blockIds.has(block.id) || !isText(block.name)) return `${where}: block`;
      blockIds.add(block.id);
      routineBlocks.add(block.id);
    }
    const routineEntries = new Set();
    for (const entry of routine.entries) {
      if (!isRecord(entry) || !isId(entry.id) || entryIds.has(entry.id)) return `${where}: entry id`;
      if (!routineBlocks.has(entry.blockId) || !isText(entry.note) || !["main", "optional"].includes(entry.role)) return `${where}: entry ${entry.id}`;
      if (!Array.isArray(entry.choices) || !entry.choices.length) return `${where}: entry ${entry.id} has no choices`;
      const choiceIds = new Set();
      for (const choice of entry.choices) {
        if (!isRecord(choice) || !exerciseById.has(choice.exerciseId) || choiceIds.has(choice.exerciseId) || !isName(choice.prescription)) {
          return `${where}: entry ${entry.id} choice`;
        }
        choiceIds.add(choice.exerciseId);
      }
      entryIds.add(entry.id);
      routineEntries.add(entry.id);
    }
    entryIdsByRoutine.set(routine.id, routineEntries);
  }

  const programIds = new Set();
  const ownedRoutines = new Set();
  for (const program of programs) {
    if (!isRecord(program) || !isId(program.id) || programIds.has(program.id)) return "bad program id";
    if (!isName(program.name) || !isText(program.note) || !Array.isArray(program.routineIds)) return `program ${program.id}: fields`;
    for (const routineId of program.routineIds) {
      if (!entryIdsByRoutine.has(routineId) || ownedRoutines.has(routineId)) return `program ${program.id}: routine ${routineId}`;
      ownedRoutines.add(routineId);
    }
    programIds.add(program.id);
  }
  if (ownedRoutines.size !== routines.length) return "a routine belongs to no program";

  const { activeProgramId, activeRoutineId, theme, trainingRules } = settings;
  if (!isText(activeProgramId) || !isText(activeRoutineId)) return "active selection";
  if (!programs.length) {
    if (activeProgramId || activeRoutineId) return "active selection without programs";
  } else {
    const active = programs.find((program) => program.id === activeProgramId);
    if (!active) return "active program missing";
    if (active.routineIds.length ? !active.routineIds.includes(activeRoutineId) : activeRoutineId) return "active routine";
  }
  if (!["light", "dark"].includes(theme)) return "theme";
  if (!isText(trainingRules)) return "training rules";

  for (const [dateKey, session] of Object.entries(sessions)) {
    const where = `session ${dateKey}`;
    if (!isDateKey(dateKey) || !isRecord(session) || !isText(session.note)) return where;
    // Completed routine IDs stay in history after a routine is deleted.
    if (!Array.isArray(session.routineIds) || !session.routineIds.every(isId) || new Set(session.routineIds).size !== session.routineIds.length) return `${where}: routines`;
    if (!isRecord(session.checkedEntryIdsByRoutine)) return `${where}: checks`;
    let checks = 0;
    for (const [routineId, checked] of Object.entries(session.checkedEntryIdsByRoutine)) {
      const valid = entryIdsByRoutine.get(routineId);
      if (!valid || !Array.isArray(checked) || !checked.length || !checked.every((id) => valid.has(id)) || new Set(checked).size !== checked.length) {
        return `${where}: checks for ${routineId}`;
      }
      checks += checked.length;
    }
    // Logs are history: they stay after their routine, slot or exercise is deleted,
    // so they carry the exercise's name and the unit they were logged in.
    if (!isRecord(session.logs)) return `${where}: logs`;
    for (const [key, log] of Object.entries(session.logs)) {
      if (!isId(key) || !isRecord(log) || !isId(log.routineId) || !isId(log.exerciseId) || !isName(log.exerciseName) || !["reps", "sec"].includes(log.unit)) return `${where}: log ${key}`;
      if (!Array.isArray(log.sets) || !log.sets.length || !log.sets.every(isLoggedSet)) return `${where}: sets for ${key}`;
    }
    if (!session.routineIds.length && !checks && !session.note && !Object.keys(session.logs).length) return `${where}: empty`;
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
  return { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: clone(state) };
}

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    throw new Error("This file isn't a Gym Schedule backup.");
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) throw new Error("This file isn't a Gym Schedule backup.");
  try {
    return migrate(parsed.data);
  } catch (_) {
    throw new Error("This backup couldn't be read by this version of the app.");
  }
}

// One store per page. `update(fn)` hands fn a copy of the state to change in place
// (its return value is ignored); fn may throw an Error with a message for the user. Nothing is saved unless the
// whole new state is valid and the write succeeds.
export function createStore(storage = safeLocalStorage()) {
  let state;
  let lastError = "";
  let unreadable = "";
  // Set when unreadable data couldn't be copied aside: ordinary saves would overwrite
  // it, so only an explicit import or restore (replace) may write.
  let protectUnreadable = false;

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
    state = clone(next);
    lastError = "";
    return { ok: true };
  }

  function load() {
    let raw = null;
    try {
      if (!storage) throw new Error("no storage");
      raw = storage.getItem(STORAGE_KEY);
    } catch (_) {
      state = createDefaultState();
      lastError = "Saved data couldn't be read on this device. Changes may not be kept.";
      return;
    }
    if (!raw) {
      state = createDefaultState();
      write(state);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      state = migrate(parsed);
      if (parsed.version !== SCHEMA_VERSION) write(state);
    } catch (error) {
      console.error("Saved data couldn't be read:", error.message);
      unreadable = raw;
      state = createDefaultState();
      try {
        storage.setItem(RECOVERY_KEY, raw);
        write(state);
      } catch (_) {
        protectUnreadable = true;
      }
      lastError = "Saved data couldn't be read, so the starting program is open. The old data can be downloaded from Settings.";
    }
  }

  load();

  return {
    getState: () => clone(state),
    update(fn) {
      if (protectUnreadable) return { ok: false, error: "Download the unreadable data in Settings first; saving now would overwrite it." };
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
      if (result.ok) protectUnreadable = false;
      return result;
    },
    getLastError: () => lastError,
    recoveryData() {
      if (unreadable) return unreadable;
      try {
        return storage?.getItem(RECOVERY_KEY) || "";
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
