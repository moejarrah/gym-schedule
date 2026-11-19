// Reading and changing app data. Selectors read a state; mutators change the
// state they're given in place (inside store.update) and throw an Error with a
// user-facing message when a change isn't allowed. The store validates the
// result's shape before saving (stateProblem), so mutators only check what the UI
// could get wrong.

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

export function isDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// Lowercased letters and digits only, so "Ab-wheel" and "ab wheel" are the same name.
export function normalizedName(value) {
  if (typeof value !== "string") return "";
  return (value.normalize("NFKD").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join("");
}

const INVERSE_RELATION = { easier: "harder", similar: "similar", harder: "easier" };

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

export function sessionFor(state, dateKey) {
  const session = state.sessions[dateKey];
  return {
    routineIds: [...(session?.routineIds || [])],
    checkedEntryIdsByRoutine: structuredClone(session?.checkedEntryIdsByRoutine || {}),
    note: session?.note || "",
    logs: structuredClone(session?.logs || {}),
    extras: structuredClone(session?.extras || {}),
    workouts: structuredClone(session?.workouts || {}),
  };
}

// The name a routine had when its workout was finished on a day, so history
// reads right after the routine is renamed or deleted.
export function workoutName(state, dateKey, routineId) {
  return state.sessions[dateKey]?.workouts?.[routineId]?.name || routineById(state, routineId)?.name || "Deleted routine";
}

// The workout in progress, { routineId, dateKey, startedAt }, or null. It belongs
// to the day it was started on, even when it runs past midnight.
export const activeWorkout = (state) => state.settings.activeWorkout;

// Exercises added to a routine for one day only: [{ id, exerciseId, prescription }].
export function dayExtras(state, dateKey, routineId) {
  return state.sessions[dateKey]?.extras?.[routineId] || [];
}

// What can be logged on a date: a slot of the routine, or an exercise added for
// that day, shaped like a slot (with `extra: true`). Null when there's no such slot.
export function findSlot(state, routineId, slotId, dateKey) {
  const entry = routineById(state, routineId)?.entries.find((item) => item.id === slotId);
  if (entry) return entry;
  const extra = dayExtras(state, dateKey, routineId).find((item) => item.id === slotId);
  return extra ? { id: extra.id, choices: [{ exerciseId: extra.exerciseId, prescription: extra.prescription }], note: "", role: "optional", extra: true } : null;
}

// Exercises the owner added to this routine in the four weeks before dateKey and
// hasn't added on dateKey itself, most often first: [{ exercise, count }].
export function usualExtras(state, routineId, dateKey) {
  const from = new Date(dateFromKey(dateKey));
  from.setDate(from.getDate() - 28);
  const fromKey = localDateKey(from);
  const today = new Set(dayExtras(state, dateKey, routineId).map((extra) => extra.exerciseId));
  const counts = new Map();
  for (const [key, session] of Object.entries(state.sessions)) {
    if (key < fromKey || key >= dateKey) continue;
    for (const extra of session.extras?.[routineId] || []) counts.set(extra.exerciseId, (counts.get(extra.exerciseId) || 0) + 1);
  }
  return [...counts]
    .map(([exerciseId, count]) => ({ exercise: exerciseById(state, exerciseId), count }))
    .filter((item) => item.exercise && !today.has(item.exercise.id))
    .sort((a, b) => b.count - a.count || a.exercise.name.localeCompare(b.exercise.name));
}

// The last day before dateKey on which the routine was finished, or "".
export function lastFinished(state, routineId, dateKey) {
  return Object.keys(state.sessions).filter((key) => key < dateKey && state.sessions[key].routineIds.includes(routineId)).sort().at(-1) || "";
}

export function isEntryChecked(state, dateKey, routineId, entryId) {
  return Boolean(state.sessions[dateKey]?.checkedEntryIdsByRoutine?.[routineId]?.includes(entryId));
}

// The sets logged today-or-any-date for a routine slot, as long as they belong to
// one of the slot's current choices: { routineId, exerciseId, exerciseName, unit, sets } or null.
export function entryLog(state, dateKey, entryId) {
  const log = state.sessions[dateKey]?.logs?.[entryId];
  const slot = log && findSlot(state, log.routineId, entryId, dateKey);
  return slot?.choices.some((choice) => choice.exerciseId === log.exerciseId) ? log : null;
}

// Logged sessions of a master exercise from any routine, newest first:
// [{ dateKey, routineId, unit, sets, note }]. `beforeDateKey` leaves out that day and later.
export function exerciseHistory(state, exerciseId, { beforeDateKey = "", limit = Infinity } = {}) {
  const items = [];
  for (const dateKey of Object.keys(state.sessions).sort().reverse()) {
    if (items.length >= limit) break;
    if (beforeDateKey && dateKey >= beforeDateKey) continue;
    for (const log of Object.values(state.sessions[dateKey].logs)) {
      if (log.exerciseId === exerciseId) items.push({ dateKey, routineId: log.routineId, unit: log.unit, sets: log.sets, note: log.note || "" });
    }
  }
  return items.slice(0, limit);
}

// How many set rows a prescription plans: "3 × 8–12" → 3, "1–2 × 15–25/side" → 2. Otherwise 1.
export function plannedSetCount(prescription) {
  const match = /^\s*(\d+)\s*(?:[–-]\s*(\d+))?\s*(?:[×x]|sets?\b)/i.exec(prescription);
  return match ? Math.min(10, Math.max(1, Number(match[2] || match[1]))) : 1;
}

// Timed work is logged in seconds instead of reps: the amount after "×" is in
// seconds ("2 × 15–30 sec/side", "5 × 8–10-sec holds", not "2 × 8–12 with 3-sec
// holds" or "3 × 8 (2s pause)"), or, without "×", any amount is ("2 rounds · 30–60 sec").
export function isTimedPrescription(prescription) {
  const seconds = /^\d+(?:\s*[–-]\s*\d+)?[\s-]*(?:s|secs?|seconds?)\b/i;
  const amount = /\d\s*[×x]\s*(.+)$/i.exec(prescription);
  return amount ? seconds.test(amount[1]) : /\d[\s-]*(?:s|secs?|seconds?)\b/i.test(prescription);
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
  const nonEmpty = (lists) => Object.fromEntries(Object.entries(lists).filter(([, items]) => items.length));
  const checked = nonEmpty(session.checkedEntryIdsByRoutine);
  for (const routineId of Object.keys(checked)) checked[routineId] = [...new Set(checked[routineId])];
  const extras = nonEmpty(session.extras);
  const finished = new Set(session.routineIds);
  const workouts = Object.fromEntries(Object.entries(session.workouts).filter(([routineId]) => finished.has(routineId)));
  if (!session.routineIds.length && !Object.keys(checked).length && !session.note && !Object.keys(session.logs).length && !Object.keys(extras).length) {
    delete state.sessions[dateKey];
  } else {
    state.sessions[dateKey] = { routineIds: [...new Set(session.routineIds)], checkedEntryIdsByRoutine: checked, note: session.note, logs: session.logs, extras, workouts };
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
    state.settings.activeWorkout = null;
    state.settings.activeProgramId = "";
    state.settings.activeRoutineId = "";
    return;
  }
  if (state.settings.activeWorkout && !routineById(state, state.settings.activeWorkout.routineId)) state.settings.activeWorkout = null;
  const program = activeProgram(state) || state.programs[0];
  state.settings.activeProgramId = program.id;
  if (!program.routineIds.includes(state.settings.activeRoutineId)) state.settings.activeRoutineId = program.routineIds[0] || "";
}

// ---------- workout and log ----------

// A workout runs from "Start workout" to "Finish workout". Finishing is what puts
// the routine in that day's Log; slots that weren't done simply stay not done.

export function startWorkout(state, routineId, dateKey = localDateKey(), now = Date.now()) {
  if (!routineById(state, routineId)) fail("That routine no longer exists.");
  if (state.settings.activeWorkout) fail("Finish the workout in progress first.");
  // Starting again on a day it was already finished reopens that day's workout.
  const session = sessionFor(state, dateKey);
  session.routineIds = session.routineIds.filter((id) => id !== routineId);
  writeSession(state, dateKey, session);
  state.settings.activeWorkout = { routineId, dateKey, startedAt: now };
}

// What a day keeps about a finished routine. `minutes` is null when it wasn't timed.
function workoutRecord(state, routineId, minutes = null) {
  return { name: routineById(state, routineId).name, program: routineProgram(state, routineId)?.name || "", minutes };
}

// `timed: false` for a workout logged for a past day or left open overnight.
export function finishWorkout(state, { now = Date.now(), timed = true } = {}) {
  const workout = state.settings.activeWorkout;
  if (!workout) return;
  const session = sessionFor(state, workout.dateKey);
  session.routineIds.push(workout.routineId);
  const minutes = timed && !workout.backdated ? Math.max(1, Math.round((now - workout.startedAt) / 60000)) : null;
  session.workouts[workout.routineId] = workoutRecord(state, workout.routineId, minutes);
  writeSession(state, workout.dateKey, session);
  state.settings.activeWorkout = null;
}

// Cancel: the workout never happened. Its sets, done marks and added exercises go.
export function cancelWorkout(state) {
  const workout = state.settings.activeWorkout;
  if (!workout) return;
  const { routineId, dateKey } = workout;
  const session = sessionFor(state, dateKey);
  delete session.checkedEntryIdsByRoutine[routineId];
  delete session.extras[routineId];
  for (const [slotId, log] of Object.entries(session.logs)) if (log.routineId === routineId) delete session.logs[slotId];
  writeSession(state, dateKey, session);
  state.settings.activeWorkout = null;
}

// A workout left open from an earlier day (and started over 12 hours ago, so a
// session running past midnight isn't cut off) is finished as it stands.
// Returns the routine's name when it did that.
export function finishStaleWorkout(state, todayKey = localDateKey(), now = Date.now()) {
  const workout = state.settings.activeWorkout;
  if (!workout || workout.dateKey === todayKey || now - workout.startedAt < 12 * 60 * 60 * 1000) return "";
  const name = routineById(state, workout.routineId)?.name || "";
  finishWorkout(state, { timed: false });
  return name;
}

// Adds a Library exercise to the workout in progress, for that day only.
export function addExtra(state, exerciseId) {
  const workout = state.settings.activeWorkout || fail("Start the workout first.");
  const exercise = exerciseById(state, exerciseId) || fail("That exercise no longer exists.");
  const session = sessionFor(state, workout.dateKey);
  const extras = session.extras[workout.routineId] || [];
  if (extras.some((extra) => extra.exerciseId === exerciseId)) fail("That exercise is already added today.");
  const id = makeId("extra");
  session.extras[workout.routineId] = [...extras, { id, exerciseId, prescription: exercise.defaultPrescription }];
  writeSession(state, workout.dateKey, session);
  return id;
}

// Takes an added exercise off a day again, with its sets and done mark.
export function removeExtra(state, routineId, slotId, dateKey) {
  const session = sessionFor(state, dateKey);
  session.extras[routineId] = (session.extras[routineId] || []).filter((extra) => extra.id !== slotId);
  session.checkedEntryIdsByRoutine[routineId] = (session.checkedEntryIdsByRoutine[routineId] || []).filter((id) => id !== slotId);
  delete session.logs[slotId];
  writeSession(state, dateKey, session);
}

// Log: deletes one exercise's sets from a day, with its done mark (and the day's
// record of it as an added exercise).
export function removeDayLog(state, dateKey, slotId) {
  const session = sessionFor(state, dateKey);
  delete session.logs[slotId];
  for (const routineId of Object.keys(session.checkedEntryIdsByRoutine)) {
    session.checkedEntryIdsByRoutine[routineId] = session.checkedEntryIdsByRoutine[routineId].filter((id) => id !== slotId);
  }
  for (const routineId of Object.keys(session.extras)) session.extras[routineId] = session.extras[routineId].filter((extra) => extra.id !== slotId);
  writeSession(state, dateKey, session);
}

// Marks a slot done (Done in the logging sheet) or not done for a date.
export function setEntryChecked(state, routineId, entryId, done, dateKey = localDateKey()) {
  if (!isDateKey(dateKey) || !findSlot(state, routineId, entryId, dateKey)) fail("That exercise is no longer in this routine.");
  const session = sessionFor(state, dateKey);
  const checked = new Set(session.checkedEntryIdsByRoutine[routineId] || []);
  if (done) checked.add(entryId);
  else checked.delete(entryId);
  session.checkedEntryIdsByRoutine[routineId] = [...checked];
  writeSession(state, dateKey, session);
}

function cleanKg(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const kg = Number(String(value).replace(",", "."));
  if (!Number.isFinite(kg) || kg < -500 || kg > 1000) fail("Enter the weight in kg as a number.");
  return Math.round(kg * 100) / 100;
}

function cleanReps(value) {
  const reps = Number(String(value ?? "").trim());
  if (String(value ?? "").trim() === "" || !Number.isInteger(reps) || reps < 0 || reps > 1000) fail("Enter whole reps for each set.");
  return reps;
}

// Saves the ticked sets for a routine slot on a date: [{ kg, reps, drops: [{ kg, reps }] }].
// kg may be blank (no weight used). An empty list removes the log.
// The unit is fixed when the sets are saved, so later prescription edits don't
// change what old sets meant.
// A set may be a warm-up (`warmup: true`), which progress leaves out. `note` is the
// exercise's note for that day; left out, the note already saved stays.
export function saveEntrySets(state, { routineId, entryId, exerciseId, sets, note, dateKey = localDateKey() }) {
  if (!isDateKey(dateKey)) fail("That date isn't valid.");
  const entry = findSlot(state, routineId, entryId, dateKey) || fail("That exercise is no longer in this routine.");
  const choice = entry.choices.find((item) => item.exerciseId === exerciseId) || fail("That exercise isn't a choice in this slot any more.");
  const clean = sets.map((set) => ({
    kg: cleanKg(set.kg),
    reps: cleanReps(set.reps),
    drops: (set.drops || []).map((drop) => ({ kg: cleanKg(drop.kg), reps: cleanReps(drop.reps) })),
    ...(set.warmup ? { warmup: true } : {}),
  }));
  const session = sessionFor(state, dateKey);
  // Sets logged earlier today for an exercise that has since left the slot stay in history.
  const earlier = session.logs[entryId];
  if (earlier && !entry.choices.some((item) => item.exerciseId === earlier.exerciseId)) {
    let key = `${entryId}:${earlier.exerciseId}`;
    for (let n = 2; session.logs[key]; n += 1) key = `${entryId}:${earlier.exerciseId}:${n}`;
    session.logs[key] = earlier;
    delete session.logs[entryId];
  }
  if (clean.length) {
    const exerciseName = exerciseById(state, exerciseId).name;
    const kept = (note ?? session.logs[entryId]?.note ?? "").trim();
    session.logs[entryId] = { routineId, exerciseId, exerciseName, unit: isTimedPrescription(choice.prescription) ? "sec" : "reps", sets: clean, ...(kept ? { note: kept } : {}) };
  } else {
    delete session.logs[entryId];
  }
  writeSession(state, dateKey, session);
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
    session.workouts[routineId] = workoutRecord(state, routineId);
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
  if (identities.some((identity) => !identity)) fail("Names and aliases need at least one letter or number.");
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
// Logged sets of it stay in history.
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
  // Its logged sets stay in Log under the name it had; days it was added to forget it.
  for (const dateKey of Object.keys(state.sessions)) {
    const session = sessionFor(state, dateKey);
    for (const routineId of Object.keys(session.extras)) session.extras[routineId] = session.extras[routineId].filter((extra) => extra.exerciseId !== exerciseId);
    writeSession(state, dateKey, session);
  }
  dropChecks(state, (_, entryId) => deletedEntries.has(entryId));
}

// ---------- settings ----------

export function setTheme(state, theme) {
  state.settings.theme = theme === "dark" ? "dark" : "light";
}

// Whole days since the last exported backup, or null when there has never been one.
export function backupAge(state, now = Date.now()) {
  return state.settings.lastBackupAt ? Math.max(0, Math.floor((now - state.settings.lastBackupAt) / 86400000)) : null;
}

export function setBackupDone(state, now = Date.now()) {
  state.settings.lastBackupAt = now;
}

export function setTrainingRules(state, text) {
  state.settings.trainingRules = text;
}
