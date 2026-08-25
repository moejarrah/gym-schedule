import {
  EXERCISE_CHALLENGES,
  EXERCISE_EQUIPMENT,
  EXERCISE_EMPHASES,
  EXERCISE_LATERALITIES,
  EXERCISE_PURPOSES,
  EXERCISE_STYLES,
  EXERCISE_SUPPORTS,
  EXERCISE_TARGETS,
  MOVEMENT_PATTERNS,
  RELATED_EXERCISE_RELATIONS,
  SCHEMA_VERSION,
  createDefaultState,
} from "./data.js?v=50";

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

const supportedTargets = new Set(EXERCISE_TARGETS.map((option) => option.id));
const supportedMovements = new Set(MOVEMENT_PATTERNS.map((option) => option.id));
const supportedEquipment = new Set(EXERCISE_EQUIPMENT.map((option) => option.id));
const supportedPurposes = new Set(EXERCISE_PURPOSES.map((option) => option.id));
const supportedStyles = new Set(EXERCISE_STYLES.map((option) => option.id));
const supportedLateralities = new Set(EXERCISE_LATERALITIES.map((option) => option.id));
const supportedSupports = new Set(EXERCISE_SUPPORTS.map((option) => option.id));
const supportedEmphases = new Set(EXERCISE_EMPHASES.map((option) => option.id));
const supportedChallenges = new Set(EXERCISE_CHALLENGES.map((option) => option.id));
const supportedRelations = new Set(RELATED_EXERCISE_RELATIONS.map((option) => option.id));
const inverseRelation = { easier: "harder", similar: "similar", harder: "easier" };

function normalizedExerciseIdentity(value) {
  if (typeof value !== "string") return "";
  return (value.normalize("NFKD").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join("");
}

function hasUniqueAllowedStrings(values, allowed, minimum = 0, maximum = Infinity) {
  return Array.isArray(values)
    && values.length >= minimum
    && values.length <= maximum
    && values.every((value) => typeof value === "string" && allowed.has(value))
    && new Set(values).size === values.length;
}

function isOptionalControlledValue(value, allowed) {
  return typeof value === "string" && (!value || allowed.has(value));
}

function hasValidExerciseClassification(exercise) {
  if (!hasUniqueAllowedStrings(exercise.primaryTargets, supportedTargets, 1, 2)) return false;
  if (!hasUniqueAllowedStrings(exercise.secondaryTargets, supportedTargets)) return false;
  if (exercise.primaryTargets.some((target) => exercise.secondaryTargets.includes(target))) return false;
  if (typeof exercise.movementPattern !== "string" || !supportedMovements.has(exercise.movementPattern)) return false;
  if (!hasUniqueAllowedStrings(exercise.equipment, supportedEquipment, 1)) return false;
  if (typeof exercise.purpose !== "string" || !supportedPurposes.has(exercise.purpose)) return false;
  if (!isOptionalControlledValue(exercise.style, supportedStyles)) return false;
  if (!isOptionalControlledValue(exercise.laterality, supportedLateralities)) return false;
  if (!isOptionalControlledValue(exercise.support, supportedSupports)) return false;
  if (!hasUniqueAllowedStrings(exercise.emphases, supportedEmphases)) return false;
  if (!isOptionalControlledValue(exercise.typicalChallenge, supportedChallenges)) return false;
  if (!Array.isArray(exercise.relatedExercises)) return false;
  return true;
}

export function validateState(value) {
  if (!isRecord(value) || value.version !== SCHEMA_VERSION) return false;
  if (!Array.isArray(value.exercises) || !Array.isArray(value.routines) || !Array.isArray(value.programs)) return false;
  if (!isRecord(value.sessions) || !isRecord(value.settings)) return false;

  const exerciseIds = new Set();
  const exerciseIdentities = new Set();
  for (const exercise of value.exercises) {
    if (!isRecord(exercise) || typeof exercise.id !== "string" || !exercise.id) return false;
    if (typeof exercise.name !== "string" || !exercise.name.trim()) return false;
    if (!Array.isArray(exercise.aliases)) return false;
    const identities = [exercise.name, ...exercise.aliases];
    if (identities.some((identity) => typeof identity !== "string" || !identity.trim())) return false;
    for (const identity of identities) {
      const normalized = normalizedExerciseIdentity(identity);
      if (!normalized || exerciseIdentities.has(normalized)) return false;
      exerciseIdentities.add(normalized);
    }
    if (["primaryMuscles", "secondaryMuscles", "categories", "alternativeExerciseIds"].some((key) => Object.hasOwn(exercise, key))) return false;
    if (!hasValidExerciseClassification(exercise)) return false;
    if (typeof exercise.defaultPrescription !== "string") return false;
    if (typeof exercise.instructions !== "string" || typeof exercise.videoId !== "string") return false;
    if (exerciseIds.has(exercise.id)) return false;
    exerciseIds.add(exercise.id);
  }

  const exerciseById = new Map(value.exercises.map((exercise) => [exercise.id, exercise]));
  for (const exercise of value.exercises) {
    const relatedIds = new Set();
    for (const related of exercise.relatedExercises) {
      if (!isRecord(related) || typeof related.exerciseId !== "string" || !supportedRelations.has(related.relation)) return false;
      if (!exerciseIds.has(related.exerciseId) || related.exerciseId === exercise.id || relatedIds.has(related.exerciseId)) return false;
      relatedIds.add(related.exerciseId);
      const counterpart = exerciseById.get(related.exerciseId);
      if (!counterpart.relatedExercises.some((item) => item.exerciseId === exercise.id && item.relation === inverseRelation[related.relation])) return false;
    }
  }

  const routineIds = new Set();
  const entryIds = new Set();
  const blockIds = new Set();
  const entryIdsByRoutine = new Map();
  for (const routine of value.routines) {
    if (!isRecord(routine) || typeof routine.id !== "string" || !routine.id) return false;
    if (typeof routine.name !== "string" || !routine.name.trim()) return false;
    if (!Array.isArray(routine.entries) || !Array.isArray(routine.blocks) || !routine.blocks.length || routineIds.has(routine.id)) return false;
    if (!["gym", "home"].includes(routine.group)) return false;
    if (!["required", "optional"].includes(routine.status)) return false;
    if (typeof routine.note !== "string") return false;
    routineIds.add(routine.id);
    const routineBlockIds = new Set();
    for (const block of routine.blocks) {
      if (!isRecord(block) || typeof block.id !== "string" || !block.id || typeof block.name !== "string") return false;
      if (Object.hasOwn(block, "entryIds")) return false;
      if (blockIds.has(block.id) || routineBlockIds.has(block.id)) return false;
      blockIds.add(block.id);
      routineBlockIds.add(block.id);
    }
    const routineEntryIds = new Set();
    for (const entry of routine.entries) {
      if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id || entryIds.has(entry.id)) return false;
      if (Object.hasOwn(entry, "exerciseId") || Object.hasOwn(entry, "prescription")) return false;
      if (!Array.isArray(entry.choices) || !entry.choices.length) return false;
      if (!routineBlockIds.has(entry.blockId) || typeof entry.note !== "string") return false;
      if (!["main", "optional"].includes(entry.role)) return false;
      const choiceExerciseIds = new Set();
      for (const choice of entry.choices) {
        if (!isRecord(choice) || typeof choice.exerciseId !== "string" || typeof choice.prescription !== "string" || !choice.prescription.trim()) return false;
        if (!exerciseIds.has(choice.exerciseId) || choiceExerciseIds.has(choice.exerciseId)) return false;
        choiceExerciseIds.add(choice.exerciseId);
      }
      entryIds.add(entry.id);
      routineEntryIds.add(entry.id);
    }
    entryIdsByRoutine.set(routine.id, routineEntryIds);
  }

  const programIds = new Set();
  const routineMembership = new Map([...routineIds].map((id) => [id, 0]));
  for (const program of value.programs) {
    if (!isRecord(program) || typeof program.id !== "string" || !program.id || programIds.has(program.id)) return false;
    if (typeof program.name !== "string" || !program.name.trim()) return false;
    if (typeof program.note !== "string") return false;
    if (!Array.isArray(program.routineIds) || !program.routineIds.every((id) => typeof id === "string" && routineIds.has(id))) return false;
    if (new Set(program.routineIds).size !== program.routineIds.length) return false;
    programIds.add(program.id);
    for (const routineId of program.routineIds) {
      const count = routineMembership.get(routineId) + 1;
      if (count > 1) return false;
      routineMembership.set(routineId, count);
    }
  }
  if ([...routineMembership.values()].some((count) => count !== 1)) return false;

  if (typeof value.settings.activeProgramId !== "string" || typeof value.settings.activeRoutineId !== "string") return false;
  if (!value.programs.length) {
    if (value.settings.activeProgramId || value.settings.activeRoutineId) return false;
  } else {
    const activeProgram = value.programs.find((program) => program.id === value.settings.activeProgramId);
    if (!activeProgram) return false;
    if (activeProgram.routineIds.length) {
      if (!activeProgram.routineIds.includes(value.settings.activeRoutineId)) return false;
    } else if (value.settings.activeRoutineId) {
      return false;
    }
  }
  if (!["light", "dark"].includes(value.settings.theme)) return false;

  for (const [dateKey, session] of Object.entries(value.sessions)) {
    if (!isDateKey(dateKey)) return false;
    if (!isRecord(session) || !Array.isArray(session.routineIds) || typeof session.note !== "string") return false;
    if (!session.routineIds.every((id) => typeof id === "string" && routineIds.has(id))) return false;
    if (new Set(session.routineIds).size !== session.routineIds.length) return false;
    if (!isRecord(session.checkedEntryIdsByRoutine)) return false;
    let checkedCount = 0;
    for (const [routineId, checkedEntryIds] of Object.entries(session.checkedEntryIdsByRoutine)) {
      const validEntryIds = entryIdsByRoutine.get(routineId);
      if (!validEntryIds || !Array.isArray(checkedEntryIds) || !checkedEntryIds.length) return false;
      if (!checkedEntryIds.every((id) => typeof id === "string" && validEntryIds.has(id))) return false;
      if (new Set(checkedEntryIds).size !== checkedEntryIds.length) return false;
      checkedCount += checkedEntryIds.length;
    }
    if (!session.routineIds.length && !checkedCount && !session.note) return false;
  }
  return true;
}

function currentStateClone(value) {
  const next = clone(value);
  if (!validateState(next)) throw new Error("unsupported state version");
  return next;
}

export function makeId(prefix = "item") {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function freshId(prefix, usedIds) {
  let id = makeId(prefix);
  while (usedIds.has(id)) id = makeId(prefix);
  usedIds.add(id);
  return id;
}

function repairActiveSelection(state) {
  if (!state.programs.length) {
    state.settings.activeProgramId = "";
    state.settings.activeRoutineId = "";
    return state;
  }
  const activeProgram = state.programs.find((program) => program.id === state.settings.activeProgramId) || state.programs[0];
  state.settings.activeProgramId = activeProgram.id;
  if (!activeProgram.routineIds.includes(state.settings.activeRoutineId)) {
    state.settings.activeRoutineId = activeProgram.routineIds[0] || "";
  }
  return state;
}

function syncRoutineOrder(state) {
  const routineById = new Map(state.routines.map((routine) => [routine.id, routine]));
  state.routines = state.programs.flatMap((program) => program.routineIds.map((id) => routineById.get(id)).filter(Boolean));
  return state;
}

export function createProgramInState(state, name) {
  const next = clone(state);
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) return next;
  const id = freshId("program", new Set(next.programs.map((program) => program.id)));
  next.programs.push({ id, name: trimmedName, note: "", routineIds: [] });
  next.settings.activeProgramId = id;
  next.settings.activeRoutineId = "";
  return next;
}

export function renameProgramInState(state, programId, name) {
  return updateProgramInState(state, programId, { name });
}

export function updateProgramInState(state, programId, updates) {
  const next = clone(state);
  const program = next.programs.find((item) => item.id === programId);
  if (!program || !isRecord(updates)) return next;
  const trimmedName = typeof updates.name === "string" ? updates.name.trim() : "";
  if (program && trimmedName) program.name = trimmedName;
  if (typeof updates.note === "string") program.note = updates.note;
  return next;
}

export function setActiveProgramInState(state, programId) {
  const next = clone(state);
  if (!next.programs.some((program) => program.id === programId)) return next;
  next.settings.activeProgramId = programId;
  return repairActiveSelection(next);
}

export function setActiveRoutineInState(state, routineId) {
  const owner = state.programs.find((program) => program.routineIds.includes(routineId));
  if (!owner) return clone(state);
  const next = setActiveProgramInState(state, owner.id);
  next.settings.activeRoutineId = routineId;
  return next;
}

export function addRoutineToProgram(state, programId, routine) {
  const next = clone(state);
  const program = next.programs.find((item) => item.id === programId);
  if (!program || !isRecord(routine) || typeof routine.id !== "string" || !routine.id) return next;
  if (next.routines.some((item) => item.id === routine.id)) return next;
  next.routines.push(clone(routine));
  program.routineIds.push(routine.id);
  if (next.settings.activeProgramId === programId && !next.settings.activeRoutineId) {
    next.settings.activeRoutineId = routine.id;
  }
  syncRoutineOrder(next);
  return validateState(next) ? next : clone(state);
}

export function updateRoutineInState(state, routineId, updates) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  if (!routine || !isRecord(updates)) return next;
  const name = typeof updates.name === "string" ? updates.name.trim() : "";
  if (name) routine.name = name;
  if (["gym", "home"].includes(updates.group)) routine.group = updates.group;
  if (["required", "optional"].includes(updates.status)) routine.status = updates.status;
  if (typeof updates.note === "string") routine.note = updates.note;
  if (Object.hasOwn(updates, "blocks")) {
    if (!Array.isArray(updates.blocks) || !updates.blocks.length) return clone(state);
    const otherBlockIds = new Set(next.routines
      .filter((item) => item.id !== routineId)
      .flatMap((item) => item.blocks.map((block) => block.id)));
    const blockIds = new Set();
    for (const block of updates.blocks) {
      if (!isRecord(block) || typeof block.id !== "string" || !block.id || typeof block.name !== "string") return clone(state);
      if (Object.hasOwn(block, "entryIds") || otherBlockIds.has(block.id) || blockIds.has(block.id)) return clone(state);
      blockIds.add(block.id);
    }
    if (routine.entries.some((entry) => !blockIds.has(entry.blockId))) return clone(state);
    routine.blocks = clone(updates.blocks);
  }
  return validateState(next) ? next : clone(state);
}

export function addRoutineBlockInState(state, routineId, name = "") {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  if (!routine || typeof name !== "string") return next;
  const usedIds = new Set(next.routines.flatMap((item) => item.blocks.map((block) => block.id)));
  routine.blocks.push({ id: freshId("block", usedIds), name });
  return next;
}

export function updateRoutineBlockInState(state, routineId, blockId, name) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  const block = routine?.blocks.find((item) => item.id === blockId);
  if (block && typeof name === "string") block.name = name;
  return next;
}

export function reorderRoutineBlockInState(state, routineId, blockId, targetIndex) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  const sourceIndex = routine?.blocks.findIndex((block) => block.id === blockId) ?? -1;
  if (!routine || sourceIndex < 0 || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= routine.blocks.length) return next;
  const [block] = routine.blocks.splice(sourceIndex, 1);
  routine.blocks.splice(targetIndex, 0, block);
  return next;
}

export function removeRoutineBlockInState(state, routineId, blockId) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  if (!routine || routine.blocks.length <= 1) return next;
  if (routine.entries.some((entry) => entry.blockId === blockId)) return next;
  routine.blocks = routine.blocks.filter((block) => block.id !== blockId);
  return next;
}

export function reorderRoutineInProgram(state, programId, routineId, targetIndex) {
  const next = clone(state);
  const program = next.programs.find((item) => item.id === programId);
  const sourceIndex = program?.routineIds.indexOf(routineId) ?? -1;
  if (!program || sourceIndex < 0 || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= program.routineIds.length) return next;
  const [id] = program.routineIds.splice(sourceIndex, 1);
  program.routineIds.splice(targetIndex, 0, id);
  return syncRoutineOrder(next);
}

export function duplicateProgramInState(state, programId, name) {
  const next = clone(state);
  const source = next.programs.find((program) => program.id === programId);
  if (!source) return next;
  const sourceRoutines = source.routineIds.map((id) => next.routines.find((routine) => routine.id === id));
  if (sourceRoutines.some((routine) => !routine)) return next;

  const programIds = new Set(next.programs.map((program) => program.id));
  const routineIds = new Set(next.routines.map((routine) => routine.id));
  const blockIds = new Set(next.routines.flatMap((routine) => routine.blocks.map((block) => block.id)));
  const entryIds = new Set(next.routines.flatMap((routine) => routine.entries.map((entry) => entry.id)));
  const copiedRoutineIds = [];
  for (const routine of sourceRoutines) {
    const routineId = freshId("routine", routineIds);
    const blockIdMap = new Map(routine.blocks.map((block) => [block.id, freshId("block", blockIds)]));
    const blocks = routine.blocks.map((block) => ({ ...block, id: blockIdMap.get(block.id) }));
    const entries = routine.entries.map((entry) => ({
      ...entry,
      id: freshId("entry", entryIds),
      blockId: blockIdMap.get(entry.blockId),
      choices: entry.choices.map((choice) => ({ ...choice })),
    }));
    next.routines.push({ ...routine, id: routineId, blocks, entries });
    copiedRoutineIds.push(routineId);
  }

  const newProgram = {
    id: freshId("program", programIds),
    name: typeof name === "string" && name.trim() ? name.trim() : `${source.name} copy`,
    note: source.note,
    routineIds: copiedRoutineIds,
  };
  next.programs.push(newProgram);
  next.settings.activeProgramId = newProgram.id;
  next.settings.activeRoutineId = copiedRoutineIds[0] || "";
  return syncRoutineOrder(next);
}

export function removeProgramFromState(state, programId) {
  const next = clone(state);
  const program = next.programs.find((item) => item.id === programId);
  if (!program) return next;
  const removedRoutineIds = new Set(program.routineIds);
  next.programs = next.programs.filter((item) => item.id !== programId);
  next.routines = next.routines.filter((routine) => !removedRoutineIds.has(routine.id));
  cleanRoutineSessions(next, removedRoutineIds);
  return repairActiveSelection(syncRoutineOrder(next));
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sessionWithDefaults(session) {
  return {
    routineIds: Array.isArray(session?.routineIds) ? [...session.routineIds] : [],
    checkedEntryIdsByRoutine: isRecord(session?.checkedEntryIdsByRoutine)
      ? clone(session.checkedEntryIdsByRoutine)
      : {},
    note: typeof session?.note === "string" ? session.note : "",
  };
}

function writeSession(state, dateKey, session) {
  const checkedEntryIdsByRoutine = Object.fromEntries(
    Object.entries(session.checkedEntryIdsByRoutine)
      .filter(([, entryIds]) => Array.isArray(entryIds) && entryIds.length)
      .map(([routineId, entryIds]) => [routineId, [...new Set(entryIds)]]),
  );
  if (!session.routineIds.length && !Object.keys(checkedEntryIdsByRoutine).length && !session.note) {
    delete state.sessions[dateKey];
  } else {
    state.sessions[dateKey] = {
      routineIds: [...new Set(session.routineIds)],
      checkedEntryIdsByRoutine,
      note: session.note,
    };
  }
  return state;
}

function cleanRoutineSessions(state, removedRoutineIds) {
  for (const [dateKey, value] of Object.entries(state.sessions)) {
    const session = sessionWithDefaults(value);
    session.routineIds = session.routineIds.filter((id) => !removedRoutineIds.has(id));
    for (const routineId of removedRoutineIds) delete session.checkedEntryIdsByRoutine[routineId];
    writeSession(state, dateKey, session);
  }
  return state;
}

function cleanEntrySessions(state, removedEntryIdsByRoutine) {
  for (const [dateKey, value] of Object.entries(state.sessions)) {
    const session = sessionWithDefaults(value);
    for (const [routineId, removedEntryIds] of removedEntryIdsByRoutine) {
      const checked = session.checkedEntryIdsByRoutine[routineId] || [];
      session.checkedEntryIdsByRoutine[routineId] = checked.filter((id) => !removedEntryIds.has(id));
    }
    writeSession(state, dateKey, session);
  }
  return state;
}

export function toggleEntryCheckForDate(state, routineId, entryId, dateKey = localDateKey()) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  const entry = routine?.entries.find((item) => item.id === entryId);
  if (!routine || !entry || !isDateKey(dateKey)) return next;
  const session = sessionWithDefaults(next.sessions[dateKey]);
  const checked = new Set(session.checkedEntryIdsByRoutine[routineId] || []);
  if (checked.has(entryId)) checked.delete(entryId);
  else checked.add(entryId);
  session.checkedEntryIdsByRoutine[routineId] = [...checked];

  if (entry.role === "main") {
    const mainEntryIds = routine.entries.filter((item) => item.role === "main").map((item) => item.id);
    const completed = mainEntryIds.length > 0 && mainEntryIds.every((id) => checked.has(id));
    session.routineIds = completed
      ? [...new Set([...session.routineIds, routineId])]
      : session.routineIds.filter((id) => id !== routineId);
  }
  return writeSession(next, dateKey, session);
}

export function setDayInState(state, dateKey, routineIds, note) {
  const next = clone(state);
  if (!isDateKey(dateKey) || !Array.isArray(routineIds) || typeof note !== "string") return next;
  const selectedIds = new Set(routineIds);
  if (selectedIds.size !== routineIds.length || routineIds.some((id) => !next.routines.some((routine) => routine.id === id))) return next;
  const session = sessionWithDefaults(next.sessions[dateKey]);
  const previousIds = new Set(session.routineIds);

  for (const routineId of previousIds) {
    if (!selectedIds.has(routineId)) delete session.checkedEntryIdsByRoutine[routineId];
  }
  for (const routineId of selectedIds) {
    if (previousIds.has(routineId)) continue;
    const routine = next.routines.find((item) => item.id === routineId);
    const checked = new Set(session.checkedEntryIdsByRoutine[routineId] || []);
    for (const entry of routine.entries) {
      if (entry.role === "main") checked.add(entry.id);
    }
    session.checkedEntryIdsByRoutine[routineId] = [...checked];
  }

  session.routineIds = [...routineIds];
  session.note = note;
  return writeSession(next, dateKey, session);
}

export function toggleRoutineForDate(state, routineId, dateKey = localDateKey()) {
  const session = sessionWithDefaults(state.sessions?.[dateKey]);
  const completed = session.routineIds.includes(routineId);
  const routineIds = completed
    ? session.routineIds.filter((id) => id !== routineId)
    : [...session.routineIds, routineId];
  return setDayInState(state, dateKey, routineIds, session.note);
}

export function updateRoutineEntryInState(state, routineId, entryId, updates) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  const index = routine?.entries.findIndex((item) => item.id === entryId) ?? -1;
  if (!routine || index < 0 || !isRecord(updates)) return next;
  const entry = routine.entries[index];
  if (Object.hasOwn(updates, "choices")) {
    if (!Array.isArray(updates.choices) || !updates.choices.length) return clone(state);
    const choiceIds = new Set();
    for (const choice of updates.choices) {
      if (!isRecord(choice) || typeof choice.exerciseId !== "string" || typeof choice.prescription !== "string" || !choice.prescription.trim()) return clone(state);
      if (!next.exercises.some((exercise) => exercise.id === choice.exerciseId) || choiceIds.has(choice.exerciseId)) return clone(state);
      choiceIds.add(choice.exerciseId);
    }
    entry.choices = clone(updates.choices);
  }
  if (Object.hasOwn(updates, "blockId")) {
    if (typeof updates.blockId !== "string" || !routine.blocks.some((block) => block.id === updates.blockId)) return clone(state);
    entry.blockId = updates.blockId;
  }
  if (Object.hasOwn(updates, "note")) {
    if (typeof updates.note !== "string") return clone(state);
    entry.note = updates.note;
  }
  if (["main", "optional"].includes(updates.role)) entry.role = updates.role;
  return next;
}

export function addRoutineEntryInState(state, routineId, entry) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  if (!routine || !isRecord(entry) || typeof entry.id !== "string" || !entry.id) return next;
  if (next.routines.some((item) => item.entries.some((candidate) => candidate.id === entry.id))) return next;
  if (!Array.isArray(entry.choices) || !entry.choices.length) return next;
  if (!routine.blocks.some((block) => block.id === entry.blockId)) return next;
  if (typeof entry.note !== "string" || !["main", "optional"].includes(entry.role)) return next;
  const choiceIds = new Set();
  for (const choice of entry.choices) {
    if (!isRecord(choice) || typeof choice.exerciseId !== "string" || typeof choice.prescription !== "string" || !choice.prescription.trim()) return next;
    if (!next.exercises.some((exercise) => exercise.id === choice.exerciseId) || choiceIds.has(choice.exerciseId)) return next;
    choiceIds.add(choice.exerciseId);
  }
  routine.entries.push(clone(entry));
  return next;
}

export function removeRoutineEntryFromState(state, routineId, entryId) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  if (!routine || !routine.entries.some((entry) => entry.id === entryId)) return next;
  routine.entries = routine.entries.filter((entry) => entry.id !== entryId);
  return cleanEntrySessions(next, new Map([[routineId, new Set([entryId])]]));
}

export function setRelatedExercisesInState(state, exerciseId, relatedExercises) {
  const next = clone(state);
  const source = next.exercises.find((exercise) => exercise.id === exerciseId);
  if (!source || !Array.isArray(relatedExercises)) return next;
  const targetIds = new Set();
  for (const related of relatedExercises) {
    if (!isRecord(related) || typeof related.exerciseId !== "string" || !supportedRelations.has(related.relation)) return clone(state);
    if (related.exerciseId === exerciseId || targetIds.has(related.exerciseId)) return clone(state);
    if (!next.exercises.some((exercise) => exercise.id === related.exerciseId)) return clone(state);
    targetIds.add(related.exerciseId);
  }

  for (const exercise of next.exercises) {
    exercise.relatedExercises = exercise.relatedExercises.filter((related) => related.exerciseId !== exerciseId);
  }
  source.relatedExercises = relatedExercises.map((related) => ({ ...related }));
  for (const related of source.relatedExercises) {
    const target = next.exercises.find((exercise) => exercise.id === related.exerciseId);
    target.relatedExercises.push({ exerciseId, relation: inverseRelation[related.relation] });
  }
  return next;
}

export function upsertExerciseInState(state, exercise, relatedExercises = []) {
  if (!isRecord(exercise) || typeof exercise.id !== "string" || !exercise.id) return state;
  if (typeof exercise.name !== "string" || !exercise.name.trim() || !Array.isArray(exercise.aliases)) return state;
  if (typeof exercise.defaultPrescription !== "string" || typeof exercise.instructions !== "string" || typeof exercise.videoId !== "string") return state;
  if (!hasValidExerciseClassification(exercise)) return state;
  if (!exercise.primaryTargets.length || !exercise.movementPattern || !exercise.equipment.length || !exercise.purpose) return state;
  if (!Array.isArray(relatedExercises)) return state;

  const identities = [exercise.name, ...exercise.aliases];
  if (identities.some((identity) => typeof identity !== "string" || !identity.trim())) return state;
  const normalizedIdentities = identities.map(normalizedExerciseIdentity);
  if (normalizedIdentities.some((identity) => !identity) || new Set(normalizedIdentities).size !== normalizedIdentities.length) return state;

  const targetIds = new Set();
  for (const related of relatedExercises) {
    if (!isRecord(related) || typeof related.exerciseId !== "string" || !supportedRelations.has(related.relation)) return state;
    if (related.exerciseId === exercise.id || targetIds.has(related.exerciseId)) return state;
    if (!state.exercises.some((candidate) => candidate.id === related.exerciseId)) return state;
    targetIds.add(related.exerciseId);
  }

  const next = clone(state);
  const index = next.exercises.findIndex((candidate) => candidate.id === exercise.id);
  const candidate = {
    ...clone(exercise),
    relatedExercises: index >= 0 ? next.exercises[index].relatedExercises.map((related) => ({ ...related })) : [],
  };
  if (index >= 0) next.exercises[index] = candidate;
  else next.exercises.push(candidate);

  const reconciled = setRelatedExercisesInState(next, exercise.id, relatedExercises);
  return validateState(reconciled) ? reconciled : state;
}

export function exerciseDeletionImpact(state, exerciseId) {
  const exercise = state?.exercises?.find((item) => item.id === exerciseId);
  if (!exercise) return null;
  const impact = {
    programmedUses: 0,
    alternativeChoicesRemoved: 0,
    preferredChoicesPromoted: 0,
    slotsDeleted: 0,
    relatedLinksRemoved: exercise.relatedExercises.length,
  };
  for (const routine of state.routines) {
    for (const entry of routine.entries) {
      const choiceIndex = entry.choices.findIndex((choice) => choice.exerciseId === exerciseId);
      if (choiceIndex < 0) continue;
      impact.programmedUses += 1;
      if (entry.choices.length === 1) impact.slotsDeleted += 1;
      else if (choiceIndex === 0) impact.preferredChoicesPromoted += 1;
      else impact.alternativeChoicesRemoved += 1;
    }
  }
  return impact;
}

export function removeExerciseFromState(state, exerciseId) {
  const next = clone(state);
  const removedEntryIdsByRoutine = new Map();
  for (const routine of next.routines) {
    const removedEntryIds = routine.entries
      .filter((entry) => entry.choices.length === 1 && entry.choices[0].exerciseId === exerciseId)
      .map((entry) => entry.id);
    if (removedEntryIds.length) removedEntryIdsByRoutine.set(routine.id, new Set(removedEntryIds));
  }
  next.exercises = next.exercises
    .filter((exercise) => exercise.id !== exerciseId)
    .map((exercise) => ({
      ...exercise,
      relatedExercises: exercise.relatedExercises.filter((related) => related.exerciseId !== exerciseId),
    }));
  next.routines = next.routines.map((routine) => ({
    ...routine,
    entries: routine.entries.flatMap((entry) => {
      const choices = entry.choices.filter((choice) => choice.exerciseId !== exerciseId);
      return choices.length ? [{ ...entry, choices }] : [];
    }),
  }));
  return cleanEntrySessions(next, removedEntryIdsByRoutine);
}

export function removeRoutineFromState(state, routineId) {
  const next = clone(state);
  next.routines = next.routines.filter((routine) => routine.id !== routineId);
  next.programs = next.programs.map((program) => ({
    ...program,
    routineIds: program.routineIds.filter((id) => id !== routineId),
  }));
  cleanRoutineSessions(next, new Set([routineId]));
  return repairActiveSelection(syncRoutineOrder(next));
}

export function moveItem(items, index, direction) {
  const target = index + direction;
  if (index < 0 || target < 0 || index >= items.length || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function reorderEntryWithinBlock(routine, entryId, targetBlockIndex) {
  const entry = routine.entries.find((item) => item.id === entryId);
  if (!entry || !Number.isInteger(targetBlockIndex)) return false;
  const blockEntries = routine.entries.filter((item) => item.blockId === entry.blockId);
  const sourceBlockIndex = blockEntries.findIndex((item) => item.id === entryId);
  if (sourceBlockIndex < 0 || targetBlockIndex < 0 || targetBlockIndex >= blockEntries.length) return false;
  const [moved] = blockEntries.splice(sourceBlockIndex, 1);
  blockEntries.splice(targetBlockIndex, 0, moved);
  let blockIndex = 0;
  routine.entries = routine.entries.map((item) => (
    item.blockId === entry.blockId ? blockEntries[blockIndex++] : item
  ));
  return true;
}

export function moveRoutineEntry(state, routineId, entryId, direction, updates = {}) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  const index = routine?.entries.findIndex((entry) => entry.id === entryId) ?? -1;
  if (!routine || index < 0 || !isRecord(updates)) return next;
  const entry = routine.entries[index];
  if (Object.hasOwn(updates, "choices")) {
    if (!Array.isArray(updates.choices) || !updates.choices.length) return clone(state);
    const choiceIds = new Set();
    for (const choice of updates.choices) {
      if (!isRecord(choice) || typeof choice.exerciseId !== "string" || typeof choice.prescription !== "string" || !choice.prescription.trim()) return clone(state);
      if (!next.exercises.some((exercise) => exercise.id === choice.exerciseId) || choiceIds.has(choice.exerciseId)) return clone(state);
      choiceIds.add(choice.exerciseId);
    }
    entry.choices = clone(updates.choices);
  }
  if (["main", "optional"].includes(updates.role)) entry.role = updates.role;
  if (typeof updates.note === "string") entry.note = updates.note;
  if (Object.hasOwn(updates, "blockId")) {
    if (typeof updates.blockId !== "string" || !routine.blocks.some((block) => block.id === updates.blockId)) return clone(state);
    entry.blockId = updates.blockId;
  }
  const blockEntries = routine.entries.filter((item) => item.blockId === entry.blockId);
  const sourceBlockIndex = blockEntries.findIndex((item) => item.id === entryId);
  reorderEntryWithinBlock(routine, entryId, sourceBlockIndex + direction);
  return validateState(next) ? next : clone(state);
}

export function reorderRoutineEntryWithinBlock(state, routineId, entryId, targetBlockIndex) {
  const next = clone(state);
  const routine = next.routines.find((item) => item.id === routineId);
  if (!routine) return next;
  reorderEntryWithinBlock(routine, entryId, targetBlockIndex);
  return next;
}

export function parseImportedState(text) {
  try {
    const parsed = JSON.parse(text);
    if (!isRecord(parsed) || parsed.schemaVersion !== SCHEMA_VERSION || !isRecord(parsed.data)) {
      throw new Error("invalid backup envelope");
    }
    const candidate = currentStateClone(parsed.data);
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
      const current = currentStateClone(parsed);
      state = clone(current);
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
