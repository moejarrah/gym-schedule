// Reading and changing app data. Selectors read a state; mutators change the
// state they're given in place (inside store.update) and throw an Error with a
// user-facing message when a change isn't allowed. The store validates the
// whole result before saving, so mutators only check what the UI could get wrong.

import { INVERSE_RELATION, isDateKey, normalizedName } from "./store.js";

// ---------- small helpers ----------

export function makeId(prefix = "item") {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function fail(message) {
  throw new Error(message);
}

function moveInArray(items, fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return false;
  const [item] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, item);
  return true;
}

// ---------- selectors ----------

export function exerciseById(state, id) {
  return state.exercises.find((exercise) => exercise.id === id) || null;
}

export function routineById(state, id) {
  return state.routines.find((routine) => routine.id === id) || null;
}

export function activeProgram(state) {
  return state.programs.find((program) => program.id === state.settings.activeProgramId) || null;
}

export function programRoutines(state, program = activeProgram(state)) {
  if (!program) return [];
  return program.routineIds.map((id) => routineById(state, id)).filter(Boolean);
}

export function activeRoutine(state) {
  const program = activeProgram(state);
  if (!program?.routineIds.includes(state.settings.activeRoutineId)) return null;
  return routineById(state, state.settings.activeRoutineId);
}

export function routineProgram(state, routineId) {
  return state.programs.find((program) => program.routineIds.includes(routineId)) || null;
}

// Entries in display order: grouped by block order, original order inside a block.
export function orderedEntries(routine) {
  return routine.blocks.flatMap((block) => routine.entries.filter((entry) => entry.blockId === block.id));
}

// 1-based slot number as shown in Workout and Program.
export function entryNumber(routine, entryId) {
  return orderedEntries(routine).findIndex((entry) => entry.id === entryId) + 1;
}

// "Squat or Leg press" — derived from the current master names.
export function entryTitle(state, entry) {
  const names = entry.choices.map((choice) => exerciseById(state, choice.exerciseId)?.name).filter(Boolean);
  return names.join(" or ") || "Missing exercise";
}

export function sessionFor(state, dateKey) {
  const session = state.sessions[dateKey];
  return {
    routineIds: [...(session?.routineIds || [])],
    checkedEntryIdsByRoutine: structuredClone(session?.checkedEntryIdsByRoutine || {}),
    note: session?.note || "",
  };
}

export function isEntryChecked(state, dateKey, routineId, entryId) {
  return Boolean(state.sessions[dateKey]?.checkedEntryIdsByRoutine?.[routineId]?.includes(entryId));
}

export function exerciseDeletionImpact(state, exerciseId) {
  const exercise = exerciseById(state, exerciseId);
  if (!exercise) return null;
  const impact = { programmedUses: 0, alternativeChoicesRemoved: 0, preferredChoicesPromoted: 0, slotsDeleted: 0, relatedLinksRemoved: exercise.relatedExercises.length };
  for (const routine of state.routines) {
    for (const entry of routine.entries) {
      const index = entry.choices.findIndex((choice) => choice.exerciseId === exerciseId);
      if (index < 0) continue;
      impact.programmedUses += 1;
      if (entry.choices.length === 1) impact.slotsDeleted += 1;
      else if (index === 0) impact.preferredChoicesPromoted += 1;
      else impact.alternativeChoicesRemoved += 1;
    }
  }
  return impact;
}

// ---------- sessions (internal) ----------

function writeSession(state, dateKey, session) {
  const checked = Object.fromEntries(
    Object.entries(session.checkedEntryIdsByRoutine)
      .filter(([, entryIds]) => entryIds.length)
      .map(([routineId, entryIds]) => [routineId, [...new Set(entryIds)]]),
  );
  if (!session.routineIds.length && !Object.keys(checked).length && !session.note) {
    delete state.sessions[dateKey];
  } else {
    state.sessions[dateKey] = { routineIds: [...new Set(session.routineIds)], checkedEntryIdsByRoutine: checked, note: session.note };
  }
}

// Removes saved checks for entries that no longer exist. Completed routines stay in history.
function dropChecks(state, shouldDrop) {
  for (const dateKey of Object.keys(state.sessions)) {
    const session = sessionFor(state, dateKey);
    for (const [routineId, entryIds] of Object.entries(session.checkedEntryIdsByRoutine)) {
      session.checkedEntryIdsByRoutine[routineId] = entryIds.filter((entryId) => !shouldDrop(routineId, entryId));
    }
    writeSession(state, dateKey, session);
  }
}

function repairActiveSelection(state) {
  if (!state.programs.length) {
    state.settings.activeProgramId = "";
    state.settings.activeRoutineId = "";
    return;
  }
  const program = activeProgram(state) || state.programs[0];
  state.settings.activeProgramId = program.id;
  if (!program.routineIds.includes(state.settings.activeRoutineId)) state.settings.activeRoutineId = program.routineIds[0] || "";
}

// ---------- workout and log ----------

// Checks or unchecks an entry for a date. A routine is complete when it has at
// least one Main entry and every Main entry is checked; Optional entries never block.
export function toggleEntryCheck(state, routineId, entryId, dateKey = localDateKey()) {
  const routine = routineById(state, routineId);
  const entry = routine?.entries.find((item) => item.id === entryId);
  if (!entry || !isDateKey(dateKey)) fail("That exercise is no longer in this routine.");
  const session = sessionFor(state, dateKey);
  const checked = new Set(session.checkedEntryIdsByRoutine[routineId] || []);
  if (checked.has(entryId)) checked.delete(entryId);
  else checked.add(entryId);
  session.checkedEntryIdsByRoutine[routineId] = [...checked];
  if (entry.role === "main") {
    const mainIds = routine.entries.filter((item) => item.role === "main").map((item) => item.id);
    const complete = mainIds.length > 0 && mainIds.every((id) => checked.has(id));
    session.routineIds = complete
      ? [...new Set([...session.routineIds, routineId])]
      : session.routineIds.filter((id) => id !== routineId);
  }
  writeSession(state, dateKey, session);
  return checked.has(entryId);
}

// Log editor: sets the completed routines and note for a date. Newly marked
// routines get their Main entries checked; unmarked ones lose their checks.
export function setDay(state, dateKey, routineIds, note) {
  if (!isDateKey(dateKey)) fail("That date isn't valid.");
  const session = sessionFor(state, dateKey);
  const selected = new Set(routineIds);
  for (const routineId of session.routineIds) {
    if (!selected.has(routineId)) delete session.checkedEntryIdsByRoutine[routineId];
  }
  for (const routineId of selected) {
    if (session.routineIds.includes(routineId)) continue;
    const routine = routineById(state, routineId);
    if (!routine) continue;
    const checked = new Set(session.checkedEntryIdsByRoutine[routineId] || []);
    routine.entries.filter((entry) => entry.role === "main").forEach((entry) => checked.add(entry.id));
    session.checkedEntryIdsByRoutine[routineId] = [...checked];
  }
  session.routineIds = [...selected];
  session.note = note;
  writeSession(state, dateKey, session);
}

// ---------- programs ----------

export function createProgram(state, { name, note = "" }) {
  const id = makeId("program");
  state.programs.push({ id, name: name.trim(), note, routineIds: [] });
  state.settings.activeProgramId = id;
  state.settings.activeRoutineId = "";
  return id;
}

export function duplicateProgram(state, sourceId, { name, note }) {
  const source = state.programs.find((program) => program.id === sourceId) || fail("Choose a program to duplicate.");
  const routineIds = programRoutines(state, source).map((routine) => {
    const blockIds = new Map(routine.blocks.map((block) => [block.id, makeId("block")]));
    const copy = structuredClone(routine);
    copy.id = makeId("routine");
    copy.blocks.forEach((block) => { block.id = blockIds.get(block.id); });
    copy.entries.forEach((entry) => {
      entry.id = makeId("entry");
      entry.blockId = blockIds.get(entry.blockId);
    });
    state.routines.push(copy);
    return copy.id;
  });
  const id = makeId("program");
  state.programs.push({ id, name: name.trim(), note: note ?? source.note, routineIds });
  state.settings.activeProgramId = id;
  state.settings.activeRoutineId = routineIds[0] || "";
  return id;
}

export function updateProgram(state, programId, { name, note }) {
  const program = state.programs.find((item) => item.id === programId) || fail("That program no longer exists.");
  if (typeof name === "string" && name.trim()) program.name = name.trim();
  if (typeof note === "string") program.note = note;
}

export function removeProgram(state, programId) {
  const program = state.programs.find((item) => item.id === programId) || fail("That program no longer exists.");
  const removed = new Set(program.routineIds);
  state.programs = state.programs.filter((item) => item !== program);
  state.routines = state.routines.filter((routine) => !removed.has(routine.id));
  dropChecks(state, (routineId) => removed.has(routineId));
  repairActiveSelection(state);
}

export function setActiveProgram(state, programId) {
  if (!state.programs.some((program) => program.id === programId)) fail("That program no longer exists.");
  state.settings.activeProgramId = programId;
  repairActiveSelection(state);
}

// ---------- routines ----------

export function setActiveRoutine(state, routineId) {
  const owner = routineProgram(state, routineId) || fail("That routine no longer exists.");
  state.settings.activeProgramId = owner.id;
  state.settings.activeRoutineId = routineId;
}

export function addRoutine(state, programId, { name, group, status, note, blocks }) {
  const program = state.programs.find((item) => item.id === programId) || fail("Choose a program first.");
  const routine = { id: makeId("routine"), name: name.trim(), group, status, note, blocks: structuredClone(blocks), entries: [] };
  state.routines.push(routine);
  program.routineIds.push(routine.id);
  state.settings.activeProgramId = program.id;
  state.settings.activeRoutineId = routine.id;
  return routine.id;
}

export function updateRoutine(state, routineId, { name, group, status, note, blocks }) {
  const routine = routineById(state, routineId) || fail("That routine no longer exists.");
  if (typeof name === "string" && name.trim()) routine.name = name.trim();
  if (group) routine.group = group;
  if (status) routine.status = status;
  if (typeof note === "string") routine.note = note;
  if (blocks) {
    const kept = new Set(blocks.map((block) => block.id));
    if (!blocks.length) fail("A routine needs at least one block.");
    if (routine.entries.some((entry) => !kept.has(entry.blockId))) fail("Move a block's exercises before deleting it.");
    routine.blocks = structuredClone(blocks);
  }
}

export function moveRoutine(state, routineId, toIndex) {
  const program = routineProgram(state, routineId) || fail("That routine no longer exists.");
  moveInArray(program.routineIds, program.routineIds.indexOf(routineId), toIndex);
}

export function removeRoutine(state, routineId) {
  const program = routineProgram(state, routineId) || fail("That routine no longer exists.");
  program.routineIds = program.routineIds.filter((id) => id !== routineId);
  state.routines = state.routines.filter((routine) => routine.id !== routineId);
  dropChecks(state, (checkedRoutineId) => checkedRoutineId === routineId);
  repairActiveSelection(state);
}

// ---------- routine entries ----------

function findEntry(state, routineId, entryId) {
  const routine = routineById(state, routineId);
  const entry = routine?.entries.find((item) => item.id === entryId);
  if (!entry) fail("That exercise is no longer in this routine.");
  return { routine, entry };
}

function checkChoices(state, choices) {
  if (!choices.length) fail("Add at least one exercise choice.");
  if (choices.some((choice) => !choice.prescription.trim())) fail("Add a prescription to every exercise choice.");
  if (new Set(choices.map((choice) => choice.exerciseId)).size !== choices.length) fail("Each exercise can be a choice only once.");
  if (choices.some((choice) => !exerciseById(state, choice.exerciseId))) fail("One of the exercises no longer exists.");
}

export function addEntry(state, routineId, { exerciseId, blockId, prescription }) {
  const routine = routineById(state, routineId) || fail("That routine no longer exists.");
  const choices = [{ exerciseId, prescription: prescription.trim() }];
  checkChoices(state, choices);
  if (!routine.blocks.some((block) => block.id === blockId)) fail("That block no longer exists.");
  const entry = { id: makeId("entry"), choices, blockId, note: "", role: "main" };
  routine.entries.push(entry);
  return entry.id;
}

export function updateEntry(state, routineId, entryId, { choices, role, blockId, note }) {
  const { routine, entry } = findEntry(state, routineId, entryId);
  if (choices) {
    const trimmed = choices.map((choice) => ({ exerciseId: choice.exerciseId, prescription: choice.prescription.trim() }));
    checkChoices(state, trimmed);
    entry.choices = trimmed;
  }
  if (role) entry.role = role;
  if (typeof note === "string") entry.note = note;
  if (blockId && blockId !== entry.blockId) {
    if (!routine.blocks.some((block) => block.id === blockId)) fail("That block no longer exists.");
    // Moving to another block puts the entry at the end of that block.
    routine.entries = routine.entries.filter((item) => item !== entry);
    entry.blockId = blockId;
    routine.entries.push(entry);
  }
}

// Moves an entry to a position (0-based) among the entries of its own block.
export function moveEntryInBlock(state, routineId, entryId, toIndex) {
  const { routine, entry } = findEntry(state, routineId, entryId);
  const blockEntries = routine.entries.filter((item) => item.blockId === entry.blockId);
  if (!moveInArray(blockEntries, blockEntries.indexOf(entry), toIndex)) return;
  let next = 0;
  routine.entries = routine.entries.map((item) => (item.blockId === entry.blockId ? blockEntries[next++] : item));
}

export function removeEntry(state, routineId, entryId) {
  const { routine } = findEntry(state, routineId, entryId);
  routine.entries = routine.entries.filter((item) => item.id !== entryId);
  dropChecks(state, (checkedRoutineId, checkedEntryId) => checkedRoutineId === routineId && checkedEntryId === entryId);
}

// ---------- library ----------

// Adds or replaces a master exercise and sets its related exercises, keeping
// the reverse links on the other exercises in sync.
export function saveExercise(state, exercise, relatedExercises) {
  const others = state.exercises.filter((item) => item.id !== exercise.id);
  const taken = new Set(others.flatMap((item) => [item.name, ...item.aliases]).map(normalizedName));
  const identities = [exercise.name, ...exercise.aliases].map(normalizedName);
  if (new Set(identities).size !== identities.length) fail("The name and aliases must each be unique.");
  if (taken.has(identities[0])) fail("An exercise with this name already exists.");
  if (identities.some((identity) => taken.has(identity))) fail("An alias is already used by another exercise.");

  const index = state.exercises.findIndex((item) => item.id === exercise.id);
  const saved = { ...structuredClone(exercise), relatedExercises: [] };
  if (index >= 0) state.exercises[index] = saved;
  else state.exercises.push(saved);

  for (const other of others) other.relatedExercises = other.relatedExercises.filter((related) => related.exerciseId !== exercise.id);
  for (const related of relatedExercises) {
    const other = exerciseById(state, related.exerciseId);
    if (!other || other === saved || saved.relatedExercises.some((item) => item.exerciseId === other.id)) continue;
    saved.relatedExercises.push({ exerciseId: other.id, relation: related.relation });
    other.relatedExercises.push({ exerciseId: saved.id, relation: INVERSE_RELATION[related.relation] });
  }
}

// Deletes a master exercise: removes it from every choice list (promoting the
// next choice), deletes slots left with no choice, and removes related links.
export function removeExercise(state, exerciseId) {
  if (!exerciseById(state, exerciseId)) fail("That exercise no longer exists.");
  const deletedEntries = new Set();
  state.exercises = state.exercises.filter((exercise) => exercise.id !== exerciseId);
  for (const exercise of state.exercises) {
    exercise.relatedExercises = exercise.relatedExercises.filter((related) => related.exerciseId !== exerciseId);
  }
  for (const routine of state.routines) {
    routine.entries = routine.entries.filter((entry) => {
      entry.choices = entry.choices.filter((choice) => choice.exerciseId !== exerciseId);
      if (entry.choices.length) return true;
      deletedEntries.add(entry.id);
      return false;
    });
  }
  dropChecks(state, (_, entryId) => deletedEntries.has(entryId));
}

// ---------- settings ----------

export function setTheme(state, theme) {
  state.settings.theme = theme === "dark" ? "dark" : "light";
}

export function setTrainingRules(state, text) {
  state.settings.trainingRules = text;
}
