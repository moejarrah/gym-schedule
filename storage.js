import { SCHEMA_VERSION, createDefaultState } from "./data.js?v=17";

export const STORAGE_KEY = "gymAppStateV1";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function validateState(value) {
  if (!isRecord(value) || value.version !== SCHEMA_VERSION) return false;
  if (!Array.isArray(value.exercises) || !Array.isArray(value.routines)) return false;
  if (!isRecord(value.sessions) || !isRecord(value.settings)) return false;

  const exerciseIds = new Set();
  for (const exercise of value.exercises) {
    if (!isRecord(exercise) || typeof exercise.id !== "string" || !exercise.id) return false;
    if (typeof exercise.name !== "string" || !exercise.name.trim()) return false;
    if (!Array.isArray(exercise.primaryMuscles) || !exercise.primaryMuscles.every((muscle) => typeof muscle === "string")) return false;
    if (!Array.isArray(exercise.secondaryMuscles) || !exercise.secondaryMuscles.every((muscle) => typeof muscle === "string")) return false;
    if (new Set(exercise.primaryMuscles).size !== exercise.primaryMuscles.length) return false;
    if (new Set(exercise.secondaryMuscles).size !== exercise.secondaryMuscles.length) return false;
    if (exercise.primaryMuscles.some((muscle) => exercise.secondaryMuscles.includes(muscle))) return false;
    if (typeof exercise.defaultPrescription !== "string") return false;
    if (typeof exercise.instructions !== "string" || typeof exercise.videoId !== "string") return false;
    if (!Array.isArray(exercise.alternativeExerciseIds)) return false;
    if (exerciseIds.has(exercise.id)) return false;
    exerciseIds.add(exercise.id);
  }

  for (const exercise of value.exercises) {
    const alternatives = exercise.alternativeExerciseIds;
    if (!alternatives.every((id) => typeof id === "string" && exerciseIds.has(id) && id !== exercise.id)) return false;
    if (new Set(alternatives).size !== alternatives.length) return false;
  }

  const routineIds = new Set();
  const entryIds = new Set();
  for (const routine of value.routines) {
    if (!isRecord(routine) || typeof routine.id !== "string" || !routine.id) return false;
    if (typeof routine.name !== "string" || !routine.name.trim()) return false;
    if (!Array.isArray(routine.entries) || routineIds.has(routine.id)) return false;
    if (!["gym", "home"].includes(routine.group)) return false;
    if (!["required", "optional"].includes(routine.status)) return false;
    routineIds.add(routine.id);
    for (const entry of routine.entries) {
      if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id || entryIds.has(entry.id)) return false;
      if (typeof entry.exerciseId !== "string" || typeof entry.prescription !== "string") return false;
      if (!exerciseIds.has(entry.exerciseId)) return false;
      entryIds.add(entry.id);
    }
  }

  if (typeof value.settings.activeRoutineId !== "string") return false;
  if (value.settings.activeRoutineId && !routineIds.has(value.settings.activeRoutineId)) return false;
  if (!["light", "dark"].includes(value.settings.theme)) return false;

  for (const [dateKey, session] of Object.entries(value.sessions)) {
    if (!isDateKey(dateKey)) return false;
    if (!isRecord(session) || !Array.isArray(session.routineIds) || typeof session.note !== "string") return false;
    if (!session.routineIds.every((id) => typeof id === "string" && routineIds.has(id))) return false;
    if (new Set(session.routineIds).size !== session.routineIds.length) return false;
    if (!session.routineIds.length && !session.note) return false;
  }
  return true;
}

export function migrateState(value) {
  if (!isRecord(value)) throw new Error("invalid state");
  const next = clone(value);
  if (next.version === 1) {
    if (!Array.isArray(next.exercises)) throw new Error("invalid state");
    next.exercises = next.exercises.map((exercise) => ({
      ...exercise,
      alternativeExerciseIds: [],
    }));
    next.version = 2;
  }
  if (next.version === 2) {
    if (!Array.isArray(next.exercises) || !Array.isArray(next.routines) || !isRecord(next.sessions) || !isRecord(next.settings)) {
      throw new Error("invalid state");
    }
    next.exercises = next.exercises.map((exercise) => {
      const muscles = Array.isArray(exercise.muscles) ? exercise.muscles.filter((muscle) => typeof muscle === "string") : [];
      const { muscles: _legacyMuscles, ...rest } = exercise;
      return {
        ...rest,
        primaryMuscles: muscles.length ? [muscles[0]] : [],
        secondaryMuscles: muscles.slice(1),
      };
    });
    next.routines = next.routines
      .filter((routine) => !(routine.id === "rest" && routine.name === "Rest" && routine.status === "rest" && Array.isArray(routine.entries) && routine.entries.length === 0))
      .map((routine) => ({ ...routine, status: routine.status === "rest" ? "optional" : routine.status }));
    const routineIds = new Set(next.routines.map((routine) => routine.id));
    next.sessions = Object.fromEntries(Object.entries(next.sessions).flatMap(([dateKey, session]) => {
      if (!isRecord(session)) return [];
      const keptRoutineIds = Array.isArray(session.routineIds) ? session.routineIds.filter((id) => routineIds.has(id)) : [];
      const note = typeof session.note === "string" ? session.note : "";
      return keptRoutineIds.length || note ? [[dateKey, { routineIds: keptRoutineIds, note }]] : [];
    }));
    if (!routineIds.has(next.settings.activeRoutineId)) next.settings.activeRoutineId = next.routines[0]?.id || "";
    next.version = 3;
  }
  if (next.version !== SCHEMA_VERSION) throw new Error("unsupported state version");
  return next;
}

export function makeId(prefix = "item") {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toggleRoutineForDate(state, routineId, dateKey = localDateKey()) {
  const next = clone(state);
  const current = next.sessions[dateKey] || { routineIds: [], note: "" };
  const routineIds = Array.isArray(current.routineIds) ? [...current.routineIds] : [];
  const index = routineIds.indexOf(routineId);
  if (index >= 0) routineIds.splice(index, 1);
  else routineIds.push(routineId);

  if (!routineIds.length && !current.note) delete next.sessions[dateKey];
  else next.sessions[dateKey] = { ...current, routineIds };
  return next;
}

export function removeExerciseFromState(state, exerciseId) {
  const next = clone(state);
  next.exercises = next.exercises
    .filter((exercise) => exercise.id !== exerciseId)
    .map((exercise) => ({
      ...exercise,
      alternativeExerciseIds: exercise.alternativeExerciseIds.filter((id) => id !== exerciseId),
    }));
  next.routines = next.routines.map((routine) => ({
    ...routine,
    entries: routine.entries.filter((entry) => entry.exerciseId !== exerciseId),
  }));
  return next;
}

export function removeRoutineFromState(state, routineId) {
  const next = clone(state);
  next.routines = next.routines.filter((routine) => routine.id !== routineId);
  for (const [dateKey, session] of Object.entries(next.sessions)) {
    const routineIds = (session.routineIds || []).filter((id) => id !== routineId);
    if (!routineIds.length && !session.note) delete next.sessions[dateKey];
    else next.sessions[dateKey] = { ...session, routineIds };
  }
  if (next.settings.activeRoutineId === routineId) {
    next.settings.activeRoutineId = next.routines[0]?.id || "";
  }
  return next;
}

export function moveItem(items, index, direction) {
  const target = index + direction;
  if (index < 0 || target < 0 || index >= items.length || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function parseImportedState(text) {
  try {
    const parsed = JSON.parse(text);
    const candidate = migrateState(parsed?.data || parsed);
    if (!validateState(candidate)) throw new Error("invalid state");
    return clone(candidate);
  } catch (_) {
    throw new Error("This backup is not compatible with this version of the app.");
  }
}

export function createStore(storage) {
  let state;
  let lastError = "";
  const listeners = new Set();

  if (!storage) {
    try {
      storage = globalThis.localStorage;
    } catch (_) {
      storage = null;
    }
  }

  function write(next) {
    if (!validateState(next)) {
      lastError = "The app blocked an invalid data update.";
      return { ok: false, error: lastError };
    }
    try {
      if (!storage) throw new Error("storage unavailable");
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
      state = clone(next);
      lastError = "";
      listeners.forEach((listener) => listener(getState()));
      return { ok: true };
    } catch (error) {
      lastError = "Changes could not be saved on this device.";
      return { ok: false, error: lastError, cause: error };
    }
  }

  function load() {
    let raw;
    try {
      if (!storage) throw new Error("storage unavailable");
      raw = storage.getItem(STORAGE_KEY);
    } catch (_) {
      state = createDefaultState();
      lastError = "Saved data could not be read on this device. Starting data is open, but changes may not persist.";
      return getState();
    }
    if (!raw) {
      const defaults = createDefaultState();
      const result = write(defaults);
      if (!result.ok) state = defaults;
      return getState();
    }
    try {
      const parsed = JSON.parse(raw);
      const migrated = migrateState(parsed);
      if (!validateState(migrated)) throw new Error("invalid state");
      state = clone(migrated);
      if (parsed.version !== migrated.version) {
        try {
          storage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } catch (_) {
          lastError = "Your data was upgraded for this session, but the upgrade could not be saved on this device.";
        }
      }
      return getState();
    } catch (error) {
      try {
        storage?.setItem(`${STORAGE_KEY}:recovery:${Date.now()}`, raw);
      } catch (_) {
        // The original value remains untouched if recovery storage also fails.
      }
      state = createDefaultState();
      lastError = "Saved data could not be read. Defaults are open, and the original data was left in storage for recovery.";
      return getState();
    }
  }

  function getState() {
    if (!state) load();
    return clone(state);
  }

  function update(mutator) {
    const next = getState();
    const returned = mutator(next);
    return write(returned || next);
  }

  function replace(next) {
    return write(clone(next));
  }

  function reset() {
    return write(createDefaultState());
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  load();
  return { getState, update, replace, reset, subscribe, getLastError: () => lastError };
}

export function createBackup(state) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: clone(state),
  };
}
