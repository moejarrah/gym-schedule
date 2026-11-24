// Reading and changing app data. Selectors read a state; mutators change the
// state they're given in place (inside store.update) and throw an Error with a
// user-facing message when a change isn't allowed. The store validates the
// result's shape before saving (stateProblem), so mutators only check what the UI
// could get wrong.

import { label } from "./vocab.js";

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
  return state.sessions[dateKey]?.workouts?.[routineId]?.name || routineById(state, routineId)?.name || "Deleted workout";
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
    .sort((a, b) => b.count - a.count || byFullName(a.exercise, b.exercise));
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
  if (!session.routineIds.length && !Object.keys(checked).length && !session.note && !Object.keys(session.logs).length && !(Object.keys(extras).length && state.settings.activeWorkout?.dateKey === dateKey)) {
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

// `backdated`: a workout logged afterwards for a past day; it isn't timed.
export function startWorkout(state, routineId, dateKey = localDateKey(), now = Date.now(), backdated = false) {
  if (!routineById(state, routineId)) fail("That workout no longer exists.");
  if (state.settings.activeWorkout) fail("Finish the workout in progress first.");
  // Starting again on a day it was already finished reopens that day's workout.
  const session = sessionFor(state, dateKey);
  const before = session.workouts[routineId];
  // Reopening keeps what the day already knew: its duration and the round it was filed in.
  const reopened = session.routineIds.includes(routineId) ? { minutes: before?.minutes ?? null, ...roundTag(before) } : null;
  session.routineIds = session.routineIds.filter((id) => id !== routineId);
  state.settings.activeWorkout = { routineId, dateKey, startedAt: now, ...(reopened ? { reopened } : {}), ...(backdated ? { backdated: true } : {}) };
  writeSession(state, dateKey, session);
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
  // A reopened workout keeps its first duration; one left running for hours isn't a duration.
  const elapsed = Math.max(1, Math.round((now - workout.startedAt) / 60000));
  const minutes = workout.reopened ? workout.reopened.minutes : timed && !workout.backdated && elapsed <= 300 ? elapsed : null;
  // A reopened workout stays in the round it was first filed in; one logged for a past
  // day joins the round that was open then; any other joins the round that is open now.
  const reopenedTag = roundTag(workout.reopened);
  const tag = reopenedTag.round ? reopenedTag : tagFor(state, workout.routineId, workout.backdated ? roundAt(state, workout.dateKey) : openRound(state));
  session.workouts[workout.routineId] = { ...workoutRecord(state, workout.routineId, minutes), ...tag };
  writeSession(state, workout.dateKey, session);
  state.settings.activeWorkout = null;
  if (!reopenedTag.round) closeRoundIfComplete(state, workout.backdated ? localDateKey() : workout.dateKey);
  // The selected routine (settings.activeRoutineId) moves on to the round's next workout.
  const next = openRound(state) && !workout.backdated ? roundSummary(state).remaining[0] : null;
  if (next) state.settings.activeRoutineId = next.id;
}

// Cancel: the workout never happened. Its sets, done marks and added exercises go, and
// a break its start answered is unanswered again (the round page asks once more).
// Cancelling a reopened workout only closes it again, as finished.
export function cancelWorkout(state) {
  const workout = state.settings.activeWorkout;
  if (!workout) return;
  if (workout.reopened) {
    finishWorkout(state);
    return;
  }
  const { routineId, dateKey } = workout;
  const session = sessionFor(state, dateKey);
  delete session.checkedEntryIdsByRoutine[routineId];
  delete session.extras[routineId];
  for (const [slotId, log] of Object.entries(session.logs)) if (log.routineId === routineId) delete session.logs[slotId];
  writeSession(state, dateKey, session);
  state.settings.activeWorkout = null;
  const undo = workout.breakUndo;
  if (undo && state.programs.some((program) => program.id === undo.round.programId)) {
    state.settings.round = undo.round;
    state.settings.roundLog?.splice(undo.logged);
    if (state.settings.roundLog?.length === 0) delete state.settings.roundLog;
  }
}

// Deletes a finished workout from its day, as if it had never been done: the routine
// leaves the day's finished list with its record, its logged sets, its done marks and the
// exercises added to it for that day (a day left with nothing goes). It leaves the round
// it was filed in; a closed round keeps its recorded numbers, except the one case
// `roundReopenedBy` describes, where that round opens again. Refused while that workout
// is the one in progress, and while the workout in progress is one whose start answered a
// long break (cancelling it puts the rounds back as they were; see cancelWorkout).
export function deleteWorkout(state, dateKey, routineId) {
  const running = state.settings.activeWorkout;
  if ((running?.dateKey === dateKey && running.routineId === routineId) || running?.breakUndo) fail("Finish or cancel the workout in progress first.");
  const session = sessionFor(state, dateKey);
  if (!session.routineIds.includes(routineId)) fail("That workout is no longer in the Log.");
  const reopen = roundReopenedBy(state, dateKey, routineId);
  session.routineIds = session.routineIds.filter((id) => id !== routineId);
  delete session.workouts[routineId];
  delete session.checkedEntryIdsByRoutine[routineId];
  delete session.extras[routineId];
  for (const [slotId, log] of Object.entries(session.logs)) if (log.routineId === routineId) delete session.logs[slotId];
  writeSession(state, dateKey, session);
  if (!reopen) return;
  state.settings.roundLog.pop();
  if (!state.settings.roundLog.length) delete state.settings.roundLog;
  Object.assign(state.settings.round, { number: reopen.number, block: reopen.block, programId: reopen.programId, since: reopen.since });
}

// The round that deleting this finished workout opens again, or null: the most recently
// closed round, when it was complete, this workout counted in it and nothing else there
// does the same job (so without it the round isn't complete any more), and nothing has
// been done in the round opened after it (same block, same program) and no reopened
// workout is running (it has left its day's finished list but still belongs to a round).
// Then a workout finished by mistake and deleted leaves no completed round behind.
// { number, block, programId, since (the earlier of the day of its first workout left
// and the deleted workout's day) }.
export function roundReopenedBy(state, dateKey, routineId) {
  const record = state.sessions[dateKey]?.workouts?.[routineId];
  const round = openRound(state);
  const last = state.settings.roundLog?.at(-1);
  if (!record?.round || record.guest || record.optional || !round || last?.ended !== "complete" || !sameRound(record, last)) return null;
  if (round.block !== last.block || round.programId !== last.programId || roundWorkouts(state, round).length || state.settings.activeWorkout?.breakUndo || state.settings.activeWorkout?.reopened) return null;
  const program = state.programs.find((item) => item.id === last.programId);
  if (!requiredRoutines(state, program).some((routine) => routine.id === routineId)) return null;
  const others = roundWorkouts(state, last).filter((item) => item.dateKey !== dateKey || item.routineId !== routineId);
  if (others.some((item) => item.routineId === routineId && !item.guest && !item.optional)) return null;
  const since = others[0] && others[0].dateKey < dateKey ? others[0].dateKey : dateKey;
  return { number: last.number, block: last.block, programId: last.programId, since };
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

// Starts a workout for today from the round page (or today's Log): counting begins at
// round 1 if it hasn't yet, and a break of three weeks or more is answered in the same
// save (`restart`: as a new block; otherwise the round left open ends at the break).
// Starting is the only thing that answers a break; opening the app never does. The
// running workout keeps what the answer changed (`breakUndo`: the open round as it was
// and how many rounds were closed), so that cancelling it undoes the answer too.
// `guest`: a routine of another program, done for the day.
export function startTodaysWorkout(state, routineId, { restart = false, guest = false } = {}) {
  if (!openRound(state)) setRoundNumber(state, 1);
  const breakUndo = longBreak(state) ? { round: { ...state.settings.round }, logged: (state.settings.roundLog || []).length } : null;
  answerBreak(state, restart);
  if (guest) startGuestWorkout(state, routineId);
  else {
    if (routineProgram(state, routineId)?.id === state.settings.activeProgramId) state.settings.activeRoutineId = routineId;
    startWorkout(state, routineId);
  }
  if (breakUndo) state.settings.activeWorkout.breakUndo = breakUndo;
}

// A routine's Main and Optional slots, counted.
export function slotCounts(routine) {
  const main = routine.entries.filter((entry) => entry.role !== "optional").length;
  return { main, optional: routine.entries.length - main };
}

// How long the routine usually takes: the middle of its last five timed workouts,
// rounded to 5 minutes; null when it was never timed.
export function usualMinutes(state, routineId) {
  const timed = Object.keys(state.sessions).sort().reverse()
    .map((dateKey) => state.sessions[dateKey].routineIds.includes(routineId) ? state.sessions[dateKey].workouts?.[routineId]?.minutes : null)
    .filter((minutes) => typeof minutes === "number")
    .slice(0, 5)
    .sort((a, b) => a - b);
  if (!timed.length) return null;
  const middle = timed.length % 2 ? timed[(timed.length - 1) / 2] : (timed[timed.length / 2 - 1] + timed[timed.length / 2]) / 2;
  return Math.max(5, Math.round(middle / 5) * 5);
}

// How far the workout in progress is: its slots (the routine's, then the ones added for
// the day), the ones that count (the Main slots; every slot when it has none), how many
// of those are done, and the slot to do next (the first not done, while any that count
// are left; null once they are all done).
export function workoutProgress(state, workout = state.settings.activeWorkout) {
  const routine = workout && routineById(state, workout.routineId);
  if (!routine) return null;
  const slots = [...orderedEntries(routine), ...dayExtras(state, workout.dateKey, routine.id).map((extra) => findSlot(state, routine.id, extra.id, workout.dateKey))];
  const isDone = (slot) => isEntryChecked(state, workout.dateKey, routine.id, slot.id);
  const main = slots.filter((slot) => slot.role === "main");
  const counted = main.length ? main : slots;
  const done = counted.filter(isDone).length;
  return { routine, slots, counted, done, optional: slots.length - main.length, next: done < counted.length ? slots.find((slot) => !isDone(slot)) || null : null, isDone };
}

// Where a workout of a day stands, as the Finish question and the result tell it: its
// slots (the routine's, then the day's extras), the ones that count (Main; every slot
// when it has none), which are done (marked done, or with sets logged), how many sets were
// logged (warm-ups left out) and for how many exercises.
export function workoutStanding(state, routineId, dateKey) {
  const routine = routineById(state, routineId);
  const session = state.sessions[dateKey];
  const slots = routine ? [...orderedEntries(routine), ...dayExtras(state, dateKey, routineId).map((extra) => findSlot(state, routineId, extra.id, dateKey))] : [];
  const isDone = (slot) => isEntryChecked(state, dateKey, routineId, slot.id) || session?.logs?.[slot.id]?.routineId === routineId;
  const main = slots.filter((slot) => slot.role === "main");
  const counted = main.length ? main : slots;
  const logs = Object.values(session?.logs || {}).filter((log) => log.routineId === routineId);
  return {
    slots,
    counted,
    done: counted.filter(isDone).length,
    isDone,
    sets: logs.reduce((count, log) => count + log.sets.filter((set) => !set.warmup).length, 0),
    exercises: logs.length,
  };
}

// Whether anything was logged or marked done in the workout in progress.
export function workoutHasWork(state, workout = state.settings.activeWorkout) {
  const session = workout && state.sessions[workout.dateKey];
  if (!session) return false;
  return Boolean(session.checkedEntryIdsByRoutine?.[workout.routineId]?.length) || Object.values(session.logs || {}).some((log) => log.routineId === workout.routineId);
}

// The workout the round page proposes: the first Required workout of the followed
// program not done in the open round, leaving out one finished today (so it can always
// be started). After a long break the round shown is a new one, so it is the first one
// not finished today. Null when there is none.
export function nextWorkout(state, todayKey = localDateKey()) {
  const summary = roundSummary(state);
  const today = state.sessions[todayKey]?.routineIds || [];
  const pool = longBreak(state, todayKey) ? summary.required : summary.remaining;
  return pool.find((routine) => !today.includes(routine.id)) || null;
}

// ---------- rounds and calendar weeks ----------

// Two counts run side by side. The calendar week is fixed by the date. A round is one
// pass through the Required workouts of the program being followed, in any order and
// over however many days it takes. There is ONE round count for the owner's training,
// not one per program:
// - settings.round = { number, block, programId, since } is the open round: the program
//   it follows and the day it opened. Absent until the owner starts counting.
// - settings.roundLog lists the closed rounds, oldest first: { number, block, program
//   (its name then), programId, required (how many workouts it asked for), done (how
//   many of them were done), ended: "complete" | "early" | "switch" | "break" }. Those
//   numbers never change again, whatever happens to its program or its workouts.
// - every finished workout keeps { round, block } and, when it doesn't count toward the
//   round, guest: true (a routine of another program) or optional: true.
// A block is a fresh start of the count: after a long break, or with a new program.

// The ISO calendar week of a date: Monday first, week 1 is the one with January 4.
// `year` is the week's own year (January 1–3 can belong to the year before).
export function calendarWeek(dateKey) {
  const date = dateFromKey(dateKey);
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7) + 3);
  const january4 = new Date(thursday.getFullYear(), 0, 4);
  const firstThursday = new Date(january4.getFullYear(), 0, 4 - ((january4.getDay() + 6) % 7) + 3);
  return { year: thursday.getFullYear(), week: 1 + Math.round((thursday - firstThursday) / (7 * 86400000)) };
}

// The program being followed: the one the rounds count through. A workout from another
// program (a guest, marked `activeWorkout.guest`) never changes it.
export const roundProgram = (state) => activeProgram(state);

export const openRound = (state) => state.settings.round || null;

const requiredRoutines = (state, program) => (program ? programRoutines(state, program).filter((routine) => routine.status !== "optional") : []);
const sameRound = (record, { number, block }) => record.round === number && (record.block || 1) === block;
const roundTag = (record) => (record?.round ? { round: record.round, block: record.block || 1, ...(record.guest ? { guest: true } : {}), ...(record.optional ? { optional: true } : {}) } : {});

// The workouts filed in one round, oldest first.
function roundWorkouts(state, { number, block }) {
  const found = [];
  for (const dateKey of Object.keys(state.sessions).sort()) {
    for (const [routineId, record] of Object.entries(state.sessions[dateKey].workouts || {})) {
      if (sameRound(record, { number, block }) && state.sessions[dateKey].routineIds.includes(routineId)) {
        found.push({ dateKey, routineId, name: record.name, program: record.program, minutes: record.minutes, guest: Boolean(record.guest), optional: Boolean(record.optional) });
      }
    }
  }
  return found;
}

// Where the open round stands: its number and block (1 and 1 before counting has
// started), the program followed, the workouts done in it and the required ones left.
export function roundSummary(state) {
  const program = roundProgram(state) || null;
  const round = openRound(state);
  const { number, block } = round || { number: 1, block: 1 };
  const workouts = round ? roundWorkouts(state, { number, block }) : [];
  const done = new Set(workouts.filter((item) => !item.guest).map((item) => item.routineId));
  const required = requiredRoutines(state, program);
  return { counting: Boolean(round), number, block, program, workouts, done, required, remaining: required.filter((routine) => !done.has(routine.id)), started: workouts[0]?.dateKey || "", since: round?.since || "" };
}

// One round as history shows it, open or closed: { number, block, open, program (name),
// ended, required, done (workouts that counted), workouts, from, to, minutes }.
export function roundRecord(state, { number, block }) {
  const round = openRound(state);
  const open = Boolean(round) && round.number === number && round.block === block;
  const entry = (state.settings.roundLog || []).find((item) => item.number === number && item.block === block);
  if (!open && !entry) return null;
  const workouts = roundWorkouts(state, { number, block });
  const summary = open ? roundSummary(state) : null;
  return {
    number,
    block,
    open,
    program: open ? summary.program?.name || "" : entry.program,
    ended: open ? "" : entry.ended,
    required: open ? summary.required.length : entry.required,
    done: open ? summary.required.length - summary.remaining.length : entry.done ?? new Set(workouts.filter((item) => !item.guest && !item.optional).map((item) => item.routineId)).size,
    workouts,
    from: workouts[0]?.dateKey || (open ? round.since : ""),
    to: workouts.at(-1)?.dateKey || "",
    minutes: workouts.reduce((sum, item) => sum + (item.minutes || 0), 0),
  };
}

// Every round, newest first: the open one, then the closed ones.
export function allRounds(state) {
  const round = openRound(state);
  const closed = [...(state.settings.roundLog || [])].reverse();
  return [...(round ? [round] : []), ...closed].map((item) => roundRecord(state, item)).filter(Boolean);
}

// Every block, newest first. Nothing is saved about a block itself: it is the rounds that
// share a block number, and everything below is worked out from them. One block as history
// shows it: { block, open (it holds the open round), rounds (newest first, as roundRecord
// gives them), programs (names in the order followed, none repeated in a row), workouts
// (every workout filed in it, oldest first), from, to (first and last workout; an open
// block with none yet starts on the day its round opened), minutes, endings (how many of
// its closed rounds ended each way), gapBefore (days from the block before's last workout
// to this one's first; 0 when either has none) }.
export function allBlocks(state) {
  const groups = [];
  for (const record of allRounds(state)) {
    if (groups.at(-1)?.block !== record.block) groups.push({ block: record.block, rounds: [] });
    groups.at(-1).rounds.push(record);
  }
  const blocks = groups.map(({ block, rounds }) => {
    const oldest = [...rounds].reverse();
    const workouts = oldest.flatMap((record) => record.workouts);
    const endings = {};
    for (const record of rounds) if (!record.open) endings[record.ended] = (endings[record.ended] || 0) + 1;
    return {
      block,
      open: rounds.some((record) => record.open),
      rounds,
      programs: oldest.map((record) => record.program).filter((name, index, names) => name && name !== names[index - 1]),
      workouts,
      from: workouts[0]?.dateKey || oldest[0].from,
      to: workouts.at(-1)?.dateKey || "",
      minutes: workouts.reduce((sum, item) => sum + (item.minutes || 0), 0),
      endings,
      gapBefore: 0,
    };
  });
  blocks.forEach((item, index) => {
    const before = blocks[index + 1];
    if (before?.to && item.workouts.length) item.gapBefore = Math.round((dateFromKey(item.from) - dateFromKey(before.to)) / 86400000);
  });
  return blocks;
}

// The program a round follows or followed (its id), for deciding what counts in it.
const programOfRound = (state, tag) => (sameRound({ round: tag.round, block: tag.block }, openRound(state) || {}) ? openRound(state).programId : (state.settings.roundLog || []).find((item) => item.number === tag.round && item.block === tag.block)?.programId) || "";

// What a workout's record says about its round: nothing when there is no round for it,
// otherwise the round and whether it counts (a routine of another program is a guest;
// an Optional routine is listed but never asked for).
function tagFor(state, routineId, found) {
  if (!found) return {};
  const tag = "round" in found ? { round: found.round, block: found.block } : { round: found.number, block: found.block };
  const routine = routineById(state, routineId);
  if (routineProgram(state, routineId)?.id !== programOfRound(state, tag)) return { ...tag, guest: true };
  return routine?.status === "optional" ? { ...tag, optional: true } : tag;
}

// The round that was open on a day: the open one if the day is after every closed
// round's last workout and not before the open round opened; otherwise the round of the
// latest closed workout on or before that day. The day the open round opened is also the
// day the round before it closed: it belongs to that closed round, unless the open round
// already has a workout on or before it. Null when there is none.
function roundAt(state, dateKey) {
  const round = openRound(state);
  if (!round) return null;
  let found = null;
  let closedAfter = false;
  for (const key of Object.keys(state.sessions).sort()) {
    for (const record of Object.values(state.sessions[key].workouts || {})) {
      if (!record.round || sameRound(record, round)) continue;
      if (key <= dateKey) found = { round: record.round, block: record.block || 1 };
      else closedAfter = true;
    }
  }
  const since = round.since || "";
  const closedThatDay = dateKey === since && found && !roundWorkouts(state, round).some((item) => item.dateKey <= dateKey);
  return closedAfter || dateKey < since || closedThatDay ? found : { round: round.number, block: round.block };
}

// Closes the open round as it stands and opens the next one, following the same program.
// The next number is the first one this block hasn't used (the owner may have renumbered
// the round to below earlier ones).
function closeRound(state, ended, dateKey = localDateKey()) {
  const round = openRound(state);
  const summary = roundSummary(state);
  const log = state.settings.roundLog ||= [];
  log.push({ number: round.number, block: round.block, program: summary.program?.name || "", programId: round.programId, required: summary.required.length, done: summary.required.length - summary.remaining.length, ended });
  let number = round.number + 1;
  while (log.some((item) => item.number === number && item.block === round.block)) number += 1;
  Object.assign(round, { number, since: dateKey });
}

// The open round is complete once every required workout of its program has been done
// in it. Called wherever that can become true: a workout finished or marked for a day,
// a routine removed or made optional.
function closeRoundIfComplete(state, dateKey = localDateKey()) {
  const summary = roundSummary(state);
  if (summary.counting && !state.settings.activeWorkout?.guest && summary.required.length && summary.workouts.length && !summary.remaining.length) closeRound(state, "complete", dateKey);
}

// Starts the count, or changes the open round's number; workouts already filed in it
// move with it. A number another round of this block already has is refused: the two
// would merge.
export function setRoundNumber(state, number) {
  const next = Math.min(999, Math.max(1, Math.round(Number(number)) || 1));
  const program = roundProgram(state) || fail("Add a program first.");
  const round = state.settings.round ||= { number: next, block: 1, programId: program.id, since: localDateKey() };
  if (next === round.number) return;
  if ((state.settings.roundLog || []).some((item) => item.number === next && item.block === round.block)) fail(`Round ${next} is already in your history. Pick another number.`);
  for (const session of Object.values(state.sessions)) {
    for (const record of Object.values(session.workouts || {})) if (sameRound(record, round)) record.round = next;
  }
  round.number = next;
}

// Ends the open round where it stands; what wasn't done in it stays not done.
export function endRound(state) {
  const round = openRound(state) || fail("There is no round yet.");
  if (state.settings.activeWorkout) fail("Finish or cancel the workout in progress first.");
  if (!roundWorkouts(state, round).length) fail("Nothing is done in this round yet.");
  closeRound(state, "early");
}

// A fresh start of the count: round 1 of the next block. The open round, if anything
// was done in it, ends here.
export function startNewBlock(state, dateKey = localDateKey(), ended = "early") {
  const round = openRound(state) || fail("There is no round yet.");
  if (state.settings.activeWorkout) fail("Finish or cancel the workout in progress first.");
  if (roundWorkouts(state, round).length) closeRound(state, ended, dateKey);
  Object.assign(round, { number: 1, block: round.block + 1, since: dateKey });
}

// Follows a different program from here on (see setActiveProgram), optionally as a new block.
export function followProgram(state, programId, { newBlock = false } = {}) {
  setActiveProgram(state, programId);
  if (newBlock && openRound(state)) startNewBlock(state, localDateKey(), "switch");
}

// The last day any workout was finished, or "".
const lastWorkoutDay = (state) => Object.keys(state.sessions).filter((key) => state.sessions[key].routineIds.length).sort().at(-1) || "";

// A break worth asking about: counting has started and the last workout was three weeks
// ago or more. { lastDay, weeks, lastRound, open } or null. Asked once per break: not
// again while the last workout is from before the day it was answered.
export function longBreak(state, todayKey = localDateKey()) {
  const round = openRound(state);
  const lastDay = lastWorkoutDay(state);
  if (!round || !lastDay || (round.breakAnswered && lastDay < round.breakAnswered)) return null;
  const days = Math.round((dateFromKey(todayKey) - dateFromKey(lastDay)) / 86400000);
  if (days < 21) return null;
  const open = roundWorkouts(state, round).length > 0;
  return { lastDay, weeks: Math.floor(days / 7), lastRound: open ? round.number : round.number - 1, open };
}

// The owner answered the break question: carry on (an unfinished round ends at the
// break) or start again as a new block.
export function answerBreak(state, restart, todayKey = localDateKey()) {
  const found = longBreak(state, todayKey);
  if (!found) return;
  if (restart) startNewBlock(state, todayKey, "break");
  else if (found.open) closeRound(state, "break", todayKey);
  openRound(state).breakAnswered = todayKey;
}

// Starts a routine of another program for today without following that program: the
// Workout tab shows it while it runs, and it is filed in the open round as a guest. The
// followed program and the selected routine stay as they are.
export function startGuestWorkout(state, routineId, dateKey = localDateKey(), now = Date.now()) {
  const owner = routineProgram(state, routineId) || fail("That workout no longer exists.");
  startWorkout(state, routineId, dateKey, now);
  if (owner.id !== state.settings.activeProgramId) state.settings.activeWorkout.guest = true;
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
  if (!isDateKey(dateKey) || !findSlot(state, routineId, entryId, dateKey)) fail("That exercise is no longer in this workout.");
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
  const entry = findSlot(state, routineId, entryId, dateKey) || fail("That exercise is no longer in this workout.");
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
    const exerciseName = fullName(exerciseById(state, exerciseId));
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
  if (dateKey > localDateKey()) fail("That day hasn't happened yet.");
  const session = sessionFor(state, dateKey);
  const selected = new Set(routineIds);
  const running = state.settings.activeWorkout;
  if (running?.dateKey === dateKey) selected.delete(running.routineId);
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
    session.workouts[routineId] = { ...workoutRecord(state, routineId), ...tagFor(state, routineId, roundAt(state, dateKey)) };
  }
  session.routineIds = [...selected];
  session.note = note;
  writeSession(state, dateKey, session);
  closeRoundIfComplete(state);
}

// ---------- programs ----------

export function createProgram(state, { name, note = "" }) {
  const id = makeId("program");
  state.programs.push({ id, name: name.trim(), note, routineIds: [] });
  // Making a program isn't following it, unless there was none to follow.
  if (!activeProgram(state)) Object.assign(state.settings, { activeProgramId: id, activeRoutineId: "" });
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
  if (!activeProgram(state)) Object.assign(state.settings, { activeProgramId: id, activeRoutineId: routineIds[0] || "" });
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
  const round = openRound(state);
  const followed = round?.programId === programId;
  if (state.settings.activeWorkout && (followed || removed.has(state.settings.activeWorkout.routineId))) fail("Finish or cancel the workout in progress first.");
  // Like any change of program, this ends an open round that has workouts in it.
  if (followed && roundWorkouts(state, round).length) closeRound(state, "switch");
  state.programs = state.programs.filter((item) => item !== program);
  state.routines = state.routines.filter((routine) => !removed.has(routine.id));
  dropChecks(state, (routineId) => removed.has(routineId));
  repairActiveSelection(state);
  // The round follows the program that is followed now; with none left there is no round.
  if (followed && state.settings.activeProgramId) round.programId = state.settings.activeProgramId;
  else if (followed) delete state.settings.round;
}

// Makes a program the one being followed. The open round follows one program, so if it
// already has workouts it ends here and the next round follows the new program.
export function setActiveProgram(state, programId) {
  if (!state.programs.some((program) => program.id === programId)) fail("That program no longer exists.");
  if (state.settings.activeWorkout && programId !== state.settings.activeProgramId) fail("Finish or cancel the workout in progress first.");
  const round = openRound(state);
  if (round && round.programId !== programId) {
    if (roundWorkouts(state, round).length) closeRound(state, "switch");
    round.programId = programId;
  }
  state.settings.activeProgramId = programId;
  repairActiveSelection(state);
}

// ---------- routines ----------

export function addRoutine(state, programId, { name, group, status, note, blocks }) {
  const program = state.programs.find((item) => item.id === programId) || fail("Choose a program first.");
  const routine = { id: makeId("routine"), name: name.trim(), group, status, note, blocks: structuredClone(blocks), entries: [] };
  state.routines.push(routine);
  program.routineIds.push(routine.id);
  // The followed program's first routine becomes the selected one; nothing else changes.
  if (program.id === state.settings.activeProgramId && !state.settings.activeRoutineId) state.settings.activeRoutineId = routine.id;
  return routine.id;
}

export function updateRoutine(state, routineId, { name, group, status, note, blocks }) {
  const routine = routineById(state, routineId) || fail("That workout no longer exists.");
  if (typeof name === "string" && name.trim()) routine.name = name.trim();
  if (group) routine.group = group;
  if (status) routine.status = status;
  if (typeof note === "string") routine.note = note;
  if (blocks) {
    const kept = new Set(blocks.map((block) => block.id));
    if (!blocks.length) fail("A workout needs at least one block.");
    if (routine.entries.some((entry) => !kept.has(entry.blockId))) fail("Move a block's exercises before deleting it.");
    routine.blocks = structuredClone(blocks);
  }
  closeRoundIfComplete(state);
}

export function moveRoutine(state, routineId, toIndex) {
  const program = routineProgram(state, routineId) || fail("That workout no longer exists.");
  moveInArray(program.routineIds, program.routineIds.indexOf(routineId), toIndex);
}

export function removeRoutine(state, routineId) {
  const program = routineProgram(state, routineId) || fail("That workout no longer exists.");
  if (state.settings.activeWorkout?.routineId === routineId) fail("Finish or cancel the workout in progress first.");
  program.routineIds = program.routineIds.filter((id) => id !== routineId);
  state.routines = state.routines.filter((routine) => routine.id !== routineId);
  dropChecks(state, (checkedRoutineId) => checkedRoutineId === routineId);
  repairActiveSelection(state);
  closeRoundIfComplete(state);
}

// ---------- routine entries ----------

function findEntry(state, routineId, entryId) {
  const routine = routineById(state, routineId);
  const entry = routine?.entries.find((item) => item.id === entryId);
  if (!entry) fail("That exercise is no longer in this workout.");
  return { routine, entry };
}

function checkChoices(state, choices) {
  if (!choices.length) fail("Add at least one exercise choice.");
  if (choices.some((choice) => !choice.prescription.trim())) fail("Add a prescription to every exercise choice.");
  if (new Set(choices.map((choice) => choice.exerciseId)).size !== choices.length) fail("Each exercise can be a choice only once.");
  if (choices.some((choice) => !exerciseById(state, choice.exerciseId))) fail("One of the exercises no longer exists.");
}

export function addEntry(state, routineId, { exerciseId, blockId, prescription }) {
  const routine = routineById(state, routineId) || fail("That workout no longer exists.");
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
    // A slot whose exercises changed starts not done.
    const before = new Set(entry.choices.map((choice) => choice.exerciseId));
    if (trimmed.some((choice) => !before.has(choice.exerciseId))) dropChecks(state, (_, checkedEntryId) => checkedEntryId === entryId);
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

// Moves a slot to a position (0-based) among the slots of a block: its own, or
// another one. In another block it takes that block's role: Optional among
// Optional slots (or in an empty block named optional), Main among Main ones.
export function moveEntry(state, routineId, entryId, blockId, toIndex) {
  const { routine, entry } = findEntry(state, routineId, entryId);
  const block = routine.blocks.find((item) => item.id === blockId) || fail("That block no longer exists.");
  const rest = routine.entries.filter((item) => item !== entry);
  const inBlock = rest.filter((item) => item.blockId === blockId);
  if (entry.blockId !== blockId) {
    if (inBlock.length ? inBlock.every((item) => item.role === "optional") : /\boptional\b/i.test(block.name)) entry.role = "optional";
    else if (inBlock.length && inBlock.every((item) => item.role === "main")) entry.role = "main";
    entry.blockId = blockId;
  }
  const before = inBlock[toIndex];
  rest.splice(before ? rest.indexOf(before) : inBlock.length ? rest.indexOf(inBlock.at(-1)) + 1 : rest.length, 0, entry);
  routine.entries = rest;
}

export function removeEntry(state, routineId, entryId) {
  const { routine } = findEntry(state, routineId, entryId);
  routine.entries = routine.entries.filter((item) => item.id !== entryId);
  dropChecks(state, (checkedRoutineId, checkedEntryId) => checkedRoutineId === routineId && checkedEntryId === entryId);
}

// ---------- library ----------

// An exercise is a movement (its name) plus a setup: the equipment that loads it,
// then attachment, grip, width and a free detail. Two exercises may share a name
// as long as their setups differ.

const LOADS = ["smith-machine", "plate-loaded", "machine", "ez-bar", "barbell", "dumbbells", "kettlebell", "cable", "band"];

// The one piece of equipment that loads the exercise ("" when nothing does).
export const mainEquipment = (exercise) => LOADS.find((id) => exercise?.equipment?.includes(id)) || "";

// The setup after the equipment, as words in a fixed order.
export function setupWords(exercise) {
  return [exercise?.attachment, exercise?.grip, exercise?.width].filter(Boolean).map(label).concat(exercise?.detail ? [exercise.detail] : []);
}

const EQUIPMENT_WORD = { "smith-machine": "Smith machine", "plate-loaded": "plate-loaded", machine: "machine", "ez-bar": "EZ bar", barbell: "barbell", dumbbells: "dumbbell", kettlebell: "kettlebell", cable: "cable", band: "band" };
const lowerWord = (word) => (/^(EZ|V-|Smith)/.test(word) ? word : word.charAt(0).toLowerCase() + word.slice(1));

// The name that tells one exercise from every other: "Lat pulldown (machine, overhand)".
// Used where there is one line and no room for tags: saved logs, messages, labels read aloud.
export function fullName(exercise) {
  if (!exercise) return "Missing exercise";
  const words = [EQUIPMENT_WORD[mainEquipment(exercise)], ...setupWords(exercise).map(lowerWord)].filter(Boolean);
  return words.length ? `${exercise.name} (${words.join(", ")})` : exercise.name;
}

// Sorted by movement, then by setup, so versions of one movement sit together.
// The plainest setup comes first ("cable" before "cable, high to low").
const plain = (exercise) => fullName(exercise).toLowerCase();
export const byFullName = (a, b) => a.name.localeCompare(b.name) || (plain(a) < plain(b) ? -1 : plain(a) > plain(b) ? 1 : 0);

// The same order for a whole list, each name worked out once (the Library sorts hundreds).
const collator = new Intl.Collator();
export function sortByFullName(exercises) {
  return exercises.map((exercise) => [exercise, exercise.name, plain(exercise)])
    .sort((a, b) => collator.compare(a[1], b[1]) || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0))
    .map(([exercise]) => exercise);
}

// What stops an exercise being saved because another one already answers to its name
// and setup, or to one of its aliases, naming that other exercise and the ways forward;
// "" when nothing does.
export function exerciseClash(state, exercise) {
  const owners = new Map();
  for (const other of state.exercises) {
    if (other.id === exercise.id) continue;
    for (const identity of [fullName(other), ...other.aliases]) owners.set(normalizedName(identity), other);
  }
  const same = owners.get(normalizedName(fullName(exercise)));
  if (same) return `${fullName(same)} already exists. Add a detail, or use that one.`;
  const alias = exercise.aliases.find((item) => owners.has(normalizedName(item)));
  return alias ? `${fullName(owners.get(normalizedName(alias)))} already goes by "${alias}". Remove that alias here.` : "";
}

// Adds or replaces a master exercise and sets its related exercises, keeping
// the reverse links on the other exercises in sync.
export function saveExercise(state, exercise, relatedExercises) {
  const others = state.exercises.filter((item) => item.id !== exercise.id);
  const identities = [fullName(exercise), ...exercise.aliases].map(normalizedName);
  if (identities.some((identity) => !identity)) fail("Names and aliases need at least one letter or number.");
  if (new Set(identities).size !== identities.length) fail("The name and aliases must each be unique.");
  const clash = exerciseClash(state, exercise);
  if (clash) fail(clash);

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

// How an exercise's version (equipment, attachment, grip) shows next to its name:
// "line" writes the equipment as a word after the name, "letter" puts a coloured letter in front.
export const exerciseLabels = (state) => (state.settings.exerciseLabels === "letter" ? "letter" : "line");

export function setExerciseLabels(state, mode) {
  state.settings.exerciseLabels = mode === "letter" ? "letter" : "line";
}

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
