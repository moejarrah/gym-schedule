// Progress: what the logged sets say about one exercise over time, and about the
// training week. Pure functions on the saved state: nothing here changes data or
// touches the page.
//
// Warm-up sets and drops never count towards a best. An exercise is compared in
// one of two ways ("mode"): "weight" by estimated 1-rep max when it has ever been
// loaded, otherwise "reps" (bodyweight, assisted or timed) by load first, then reps.

import { activeProgram, dateFromKey, exerciseById, localDateKey, programRoutines, workoutName } from "./model.js";

const RECENT_DAYS = 42; // how far back "getting stronger" and "stalled" look
const STALL_SESSIONS = 4;

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function addDays(dateKey, days) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

// ---------- sets ----------

export function workingSets(sets) {
  return sets.filter((set) => !set.warmup);
}

// `sessions` are an exercise's logs: [{ unit, sets }]. Timed work is never "weight".
export function exerciseMode(sessions) {
  return sessions.some((session) => session.unit !== "sec" && workingSets(session.sets).some((set) => set.kg > 0)) ? "weight" : "reps";
}

// A number to compare sets by. "weight": estimated 1-rep max (Epley). "reps": less
// assistance or more added load wins first, then reps (or seconds).
export function setScore(set, mode) {
  if (mode === "weight") return set.kg > 0 ? set.kg * (1 + set.reps / 30) : 0;
  return (set.kg ?? 0) * 1e6 + set.reps;
}

// The working set with the highest score (the earliest on a tie), or null.
export function bestSet(sets, mode) {
  let best = null;
  for (const set of workingSets(sets)) {
    if (!best || setScore(set, mode) > setScore(best, mode)) best = set;
  }
  return best;
}

// kg × reps over working sets and their drops; 0 for work without weight or timed work.
function volumeOf(log) {
  if (log.unit === "sec") return 0;
  const lifts = workingSets(log.sets).flatMap((set) => [set, ...set.drops]);
  return round(lifts.reduce((sum, lift) => sum + (lift.kg > 0 ? lift.kg * lift.reps : 0), 0));
}

// ---------- one exercise ----------

// Every log in the history grouped by exercise, oldest first.
function logsByExercise(state) {
  const byExercise = new Map();
  for (const dateKey of Object.keys(state.sessions).sort()) {
    for (const log of Object.values(state.sessions[dateKey].logs)) {
      if (!byExercise.has(log.exerciseId)) byExercise.set(log.exerciseId, []);
      byExercise.get(log.exerciseId).push({ dateKey, routineId: log.routineId, unit: log.unit, sets: log.sets, note: log.note || "" });
    }
  }
  return byExercise;
}

function bestsOf(sessions) {
  let top = null;
  let topScore = null;
  const atWeight = new Map();
  for (const session of sessions) {
    if (session.best && (topScore === null || session.score > topScore)) {
      top = { set: session.best, dateKey: session.dateKey };
      topScore = session.score;
    }
    for (const set of workingSets(session.sets)) {
      if (set.kg > 0 && set.reps > (atWeight.get(set.kg)?.reps ?? -1)) atWeight.set(set.kg, { kg: set.kg, reps: set.reps, dateKey: session.dateKey });
    }
  }
  return { top, repsAtWeight: [...atWeight.values()].sort((a, b) => b.kg - a.kg).slice(0, 5) };
}

function progressOf(state, logs) {
  const mode = exerciseMode(logs);
  let record = null; // the highest score of the sessions so far
  const sessions = logs.map((log) => {
    const best = bestSet(log.sets, mode);
    const score = best ? setScore(best, mode) : null;
    const isBest = best !== null && record !== null && score > record;
    if (best && (record === null || score > record)) record = score;
    return { ...log, routineName: workoutName(state, log.dateKey, log.routineId), best, score, volume: volumeOf(log), isBest };
  });
  return { mode, unit: logs.at(-1)?.unit || "reps", sessions, bests: bestsOf(sessions) };
}

// An exercise's logged sessions, OLDEST FIRST, from any routine:
// { mode, unit, sessions: [{ dateKey, routineId, routineName, unit, sets, note, best,
// score, volume, isBest }], bests: { top: { set, dateKey } | null, repsAtWeight:
// [{ kg, reps, dateKey }] } }. `best` and `score` are null for a session of warm-ups
// only. `isBest`: the session beat every earlier one (the first never does).
// `repsAtWeight`: the most reps at each weight, heaviest first, five at most.
export function exerciseProgress(state, exerciseId) {
  return progressOf(state, logsByExercise(state).get(exerciseId) || []);
}

function amount(count, unit) {
  if (unit === "kg") return `${round(count)} kg`;
  if (unit === "sec") return `${count} sec`;
  return `${count} ${count === 1 ? "rep" : "reps"}`;
}

// How one session's best set compares with another's: { kind: "up" | "down" | "same",
// text: "▲ 2.5 kg" | "▼ 1 rep" | "▲ 5 sec" | "Same" }. The score decides the
// direction; the text names the weight when it moved that way, otherwise the reps.
export function compareSets(newerSets, olderSets, mode, unit) {
  const newer = bestSet(newerSets, mode);
  const older = bestSet(olderSets, mode);
  const difference = newer && older ? setScore(newer, mode) - setScore(older, mode) : 0;
  if (!difference) return { kind: "same", text: "Same" };
  const up = difference > 0;
  const kg = (newer.kg ?? 0) - (older.kg ?? 0);
  const text = kg && kg > 0 === up ? amount(Math.abs(kg), "kg") : amount(Math.abs(newer.reps - older.reps), unit === "sec" ? "sec" : "reps");
  return { kind: up ? "up" : "down", text: `${up ? "▲" : "▼"} ${text}` };
}

// One short sentence on what beats last time, or "" when there is no last time.
// With weight, a prescription's reps ("3 × 6–10" → 10, "3 × 5" → 5) say when to add weight.
export function targetHint(lastSets, prescription, mode, unit) {
  const sets = workingSets(lastSets || []);
  if (!sets.length) return "";
  if (unit === "sec") return "To beat it: a few more seconds on any set.";
  const reps = /[×x]\s*(\d+)(?:\s*[–-]\s*(\d+))?/i.exec(prescription || "");
  const top = reps ? Number(reps[2] || reps[1]) : 0;
  if (mode === "weight" && top && sets.every((set) => set.reps >= top)) return `All sets hit ${top}. Add weight.`;
  return "To beat it: one more rep on any set.";
}

// Whether a set just logged beats every session of the exercise before `beforeDateKey`.
// Never true for a warm-up, or when there is no earlier session to beat.
export function isNewBest(state, exerciseId, set, beforeDateKey) {
  if (set.warmup) return false;
  const earlier = (logsByExercise(state).get(exerciseId) || []).filter((log) => log.dateKey < beforeDateKey);
  const mode = exerciseMode([...earlier, { unit: earlier.at(-1)?.unit, sets: [set] }]);
  const scores = earlier.map((log) => bestSet(log.sets, mode)).filter(Boolean).map((best) => setScore(best, mode));
  return scores.length > 0 && setScore(set, mode) > Math.max(...scores);
}

// ---------- the whole picture ----------

// What a session's best set amounts to, for a percentage: the estimated 1-rep max,
// or the reps when no weight is involved.
function strength(session, mode) {
  return mode === "weight" ? session.score : session.best.reps;
}

// The Log's Progress view. Weeks start on Monday.
// thisWeek: workouts finished in todayKey's week. perWeek: the average over the four
// weeks before it. bestsThisMonth: sessions that set a new best in todayKey's month.
// improving: [{ exercise, percent }], up to five exercises with three or more
// sessions in the last 42 days whose best set rose from the first of them to the last.
// stalled: [{ exercise, since }], exercises of the active program trained in the last
// 42 days whose last four sessions set no new best, longest wait first.
// muscles: [{ target, sets }], working sets this week per muscle, most first: a set
// counts 1 for each primary target of its exercise and 0.5 for each secondary one.
// Exercises that have left the Library are skipped.
export function overview(state, todayKey = localDateKey()) {
  const weekStart = addDays(todayKey, -((dateFromKey(todayKey).getDay() + 6) % 7));
  const nextWeek = addDays(weekStart, 7);
  const fourWeeksBack = addDays(weekStart, -28);
  const recentFrom = addDays(todayKey, -RECENT_DAYS);
  const month = todayKey.slice(0, 7);

  let thisWeek = 0;
  let before = 0;
  for (const [dateKey, session] of Object.entries(state.sessions)) {
    if (dateKey >= weekStart && dateKey < nextWeek) thisWeek += session.routineIds.length;
    else if (dateKey >= fourWeeksBack && dateKey < weekStart) before += session.routineIds.length;
  }

  const inProgram = new Set(programRoutines(state, activeProgram(state))
    .flatMap((routine) => routine.entries.flatMap((entry) => entry.choices.map((choice) => choice.exerciseId))));
  let bestsThisMonth = 0;
  const improving = [];
  const stalled = [];
  const setsByTarget = new Map();

  for (const [exerciseId, logs] of logsByExercise(state)) {
    const exercise = exerciseById(state, exerciseId);
    if (!exercise) continue;
    const { mode, sessions } = progressOf(state, logs);
    bestsThisMonth += sessions.filter((session) => session.isBest && session.dateKey.startsWith(month)).length;

    for (const session of sessions) {
      if (session.dateKey < weekStart || session.dateKey >= nextWeek) continue;
      const count = workingSets(session.sets).length;
      for (const target of exercise.primaryTargets) setsByTarget.set(target, (setsByTarget.get(target) || 0) + count);
      for (const target of exercise.secondaryTargets) setsByTarget.set(target, (setsByTarget.get(target) || 0) + count / 2);
    }

    const scored = sessions.filter((session) => session.best && session.dateKey <= todayKey);
    const recent = scored.filter((session) => session.dateKey >= recentFrom);
    const first = recent[0];
    const last = recent.at(-1);
    const comparable = recent.length >= 3 && (mode === "weight" || (first.best.kg ?? 0) === (last.best.kg ?? 0));
    const percent = comparable && strength(first, mode) > 0 ? Math.round((strength(last, mode) / strength(first, mode) - 1) * 100) : 0;
    if (percent > 0) {
      improving.push({ exercise, percent });
    } else if (inProgram.has(exerciseId) && recent.length && scored.length >= STALL_SESSIONS && !scored.slice(-STALL_SESSIONS).some((session) => session.isBest)) {
      stalled.push({ exercise, since: (scored.findLast((session) => session.isBest) || scored[0]).dateKey });
    }
  }

  return {
    thisWeek,
    perWeek: round(before / 4, 1),
    bestsThisMonth,
    improving: improving.sort((a, b) => b.percent - a.percent || a.exercise.name.localeCompare(b.exercise.name)).slice(0, 5),
    stalled: stalled.sort((a, b) => a.since.localeCompare(b.since) || a.exercise.name.localeCompare(b.exercise.name)),
    muscles: [...setsByTarget].map(([target, sets]) => ({ target, sets: round(sets, 1) })).filter((item) => item.sets).sort((a, b) => b.sets - a.sets),
  };
}
