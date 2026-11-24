// The round page, the first page of the Workout tab and the app's home: where the open
// round stands (header and bar), then the round's workouts as one list with one row open
// and the bottom button acting on it (Start, Do it again, Reopen), what is news today
// (back after a break, a round completed), and the rows under it. Two pages open inside
// the tab, each with a back link: Rounds and blocks (All rounds), and one round. One
// sheet (#roundSheet): a workout from another program, following a different program
// (opened from Program with "follow-program"), and changing the round number. What a
// round is: js/model.js, "rounds and calendar weeks".

import { dockElement, mainElement, navigate, registerActions, registerView, render, store, withMotion } from "../context.js";
import { $, chevronIcon, clearError, closeDialog, confirmAction, escapeHtml, formatDate, fresh, openDialog, plural, redraw, report, toast } from "../dom.js";
import {
  activeWorkout,
  allRounds,
  calendarWeek,
  dateFromKey,
  endRound,
  followProgram,
  lastFinished,
  localDateKey,
  longBreak,
  nextWorkout,
  openRound,
  programRoutines,
  roundProgram,
  roundRecord,
  roundSummary,
  routineById,
  routineProgram,
  setRoundNumber,
  slotCounts,
  startNewBlock,
  startTodaysWorkout,
  startWorkout,
  usualMinutes,
  workoutProgress,
} from "../model.js";
import { exerciseProgress } from "../progress.js";
import { roundName, shortDate, slotLinkLine, slotMotion, weeksText } from "./shared.js";

// Which page of the tab shows: "home", "all" (All rounds) or "one" (the round `number`
// of `block`). `scroll` remembers where a page was left, for coming back to it.
const page = { name: "home", number: 0, block: 0, scroll: {} };
const DEPTH = { home: 0, all: 1, one: 2 };
// The round number being picked with − and + in the sheet.
const chooser = { number: 1 };
// What the sheet shows: "guest", "follow" (for programId) or "number".
const sheet = { mode: "", programId: "" };

const tickIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
const gearIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>`;

// ---------- words ----------

// How a round ended, as All rounds and the round's own page say it.
const ENDED = { "": "in progress", complete: "complete", early: "ended early", break: "ended by the break", switch: "ended by a change of program" };
// The same in the narrow last column of All rounds.
const ENDED_SHORT = { ...ENDED, break: "ended by break", switch: "program changed" };
const LATER = "9999-12-31"; // "before this day" that leaves no day out

// Always with its unit: a bare "3 of 6" is never shown.
const workoutsDone = (done, required) => `${done} of ${required} ${required === 1 ? "workout" : "workouts"} done`;
const durationText = (minutes) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`);
const listText = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
const daysBetween = (fromKey, toKey) => Math.round((dateFromKey(toKey) - dateFromKey(fromKey)) / 86400000);
const sameWeek = (fromKey, toKey) => calendarWeek(fromKey).year === calendarWeek(toKey).year && calendarWeek(fromKey).week === calendarWeek(toKey).week;
// "Week 47", or "Weeks 47–48" for a stretch of days.
const weekTitle = (fromKey, toKey = fromKey) => (sameWeek(fromKey, toKey) ? `Week ${calendarWeek(fromKey).week}` : `Weeks ${calendarWeek(fromKey).week}–${calendarWeek(toKey).week}`);
// In a list of rounds the year is said only when it isn't this one: "weeks 47–48".
const weeksShort = (fromKey, toKey) => weeksText(fromKey, toKey).replace(new RegExp(`^${calendarWeek(localDateKey()).year} · `), "");
const dayMonth = (dateKey) => formatDate(dateFromKey(dateKey), { day: "numeric", month: "short", ...(dateKey.startsWith(`${new Date().getFullYear()}-`) ? {} : { year: "numeric" }) });
const datesShort = (fromKey, toKey) => (fromKey === toKey ? dayMonth(fromKey) : `${dayMonth(fromKey)} – ${dayMonth(toKey)}`);

function agoText(startedAt) {
  const minutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
  return minutes < 1 ? "Just now" : `${durationText(minutes)} ago`;
}

// "Round 6" and, from block 2 on, what follows it (" · block 2"), drawn smaller.
function roundTitle(round) {
  const title = roundName({ number: round.number, block: 1 });
  return { title, suffix: roundName(round).slice(title.length) };
}

// ---------- reading the round ----------

const otherPrograms = (state) => state.programs.filter((program) => program !== roundProgram(state));

// The last round, when it was completed and nothing of the next one is done yet.
function justCompleted(state, summary) {
  const last = (state.settings.roundLog || []).at(-1);
  return summary.counting && !summary.workouts.length && last?.ended === "complete" && last.block === summary.block ? roundRecord(state, last) : null;
}

// How many exercises set a new best in these workouts.
function newBests(state, workouts) {
  const filed = new Set(workouts.map((item) => `${item.dateKey} ${item.routineId}`));
  const progress = new Map();
  const bests = new Set();
  for (const dateKey of new Set(workouts.map((item) => item.dateKey))) {
    for (const log of Object.values(state.sessions[dateKey]?.logs || {})) {
      if (!filed.has(`${dateKey} ${log.routineId}`)) continue;
      if (!progress.has(log.exerciseId)) progress.set(log.exerciseId, exerciseProgress(state, log.exerciseId).sessions);
      if (progress.get(log.exerciseId).some((session) => session.dateKey === dateKey && session.routineId === log.routineId && session.isBest)) bests.add(log.exerciseId);
    }
  }
  return bests.size;
}

// What a round left undone: the names when they can still be told (a closed round only
// kept how many it asked for; its program may have changed since), and how many.
function notDone(state, record) {
  if (record.open) {
    const names = roundSummary(state).remaining.map((routine) => routine.name);
    return { names, count: names.length };
  }
  const count = Math.max(0, record.required - record.done);
  const entry = (state.settings.roundLog || []).find((item) => item.number === record.number && item.block === record.block);
  const program = state.programs.find((item) => item.id === entry?.programId);
  const done = new Set(record.workouts.filter((item) => !item.guest && !item.optional).map((item) => item.routineId));
  const left = programRoutines(state, program).filter((routine) => routine.status !== "optional" && !done.has(routine.id)).map((routine) => routine.name);
  return { names: left.length === count ? left : [], count };
}

// ---------- pieces ----------

// One labelled line: a muted label, then the value. A line with nothing to say is left out.
const line = (name, value, extra = "") => (value ? `<div class="slot-line ${extra}"><span>${name}</span><span>${value}</span></div>` : "");

// The round number between − and +.
const chooserMarkup = () => `<span class="round-chooser" data-round-chooser>
    <button class="icon-button filled" type="button" data-action="round-number-step" data-step="-1" aria-label="One round fewer" ${chooser.number <= 1 ? "disabled" : ""}>−</button>
    <strong aria-live="polite"><span class="visually-hidden">Round </span><span data-round-number>${chooser.number}</span></strong>
    <button class="icon-button filled" type="button" data-action="round-number-step" data-step="1" aria-label="One round more" ${chooser.number >= 999 ? "disabled" : ""}>+</button>
  </span>`;

// The top of the tab and of one round's page: what is above the title, "Round N" and
// the week on one baseline, a bar with a segment per Required workout, two facts.
function headMarkup({ top, round, week, segments, left, right }) {
  const { title, suffix } = roundTitle(round);
  return `<header class="round-head">
    ${top}
    <div class="round-title">
      <h1><span>${escapeHtml(title)}</span>${suffix ? `<small>${escapeHtml(suffix)}</small>` : ""}</h1>
      <span>${escapeHtml(week)}</span>
    </div>
    <div class="round-bar" aria-hidden="true">${segments.map((done) => `<i${done ? ` class="is-done"` : ""}></i>`).join("")}</div>
    <p class="round-facts"><span>${escapeHtml(left)}</span><span>${escapeHtml(right)}</span></p>
  </header>`;
}

const followingMarkup = (program) => `<div class="round-top">
    <p class="truncate">${program ? `Following <strong>${escapeHtml(program.name)}</strong>` : "No program"}</p>
    <button class="icon-button" type="button" data-view="settings" aria-label="Settings">${gearIcon}</button>
  </div>`;

const backMarkup = (to, name) => `<button class="link-button" type="button" data-action="round-page" data-page="${to}" aria-label="Back to ${name}">${chevronIcon("left")}${name}</button>`;

// ---------- the round page ----------
//
// The round as one list: its workouts as quiet rows with exactly one open, the open one
// showing its labelled lines; the bottom button acts on the open row. A row opens by
// itself: the workout in progress, otherwise the one finished today, otherwise the next.

// The page's own memory: the row the owner opened ("" = the one that opens by itself),
// the answer picked after a long break (true: start again as a new block), and how many
// times the page arrived on screen (a row that is open on arrival doesn't unfold).
const home = { openId: "", restart: false, arrivals: 0 };

// A workout that was done: ticked, muted, its date at the end; it opens its day.
const doneRow = (name, dateKey, tag = "") => `<button class="row compact round-row is-done" type="button" data-action="open-day" data-date="${dateKey}" aria-label="${escapeHtml(name)}${tag ? `, ${escapeHtml(tag)}` : ""}, done ${escapeHtml(shortDate(dateKey))}. Open that day.">
    <span class="tickbox is-ticked" aria-hidden="true">${tickIcon}</span>
    <span class="row-main"><span class="row-title">${escapeHtml(name)}</span></span>
    ${tag ? `<span class="label tag">${escapeHtml(tag)}</span>` : ""}
    <span class="row-meta">${escapeHtml(shortDate(dateKey))}</span>
  </button>`;

// What a workout that didn't count is tagged with: its program's name, or "Optional".
const workoutTag = (item) => (item.guest ? item.program || "Another program" : item.optional ? "Optional" : "");

const NUMBER_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const clockTime = (time) => formatDate(new Date(time), { hour: "numeric", minute: "2-digit" });

// The number a round carried on after a break takes: the first one its block hasn't used.
function nextNumber(state, round) {
  let number = round.number + 1;
  while ((state.settings.roundLog || []).some((item) => item.number === number && item.block === round.block)) number += 1;
  return number;
}

// Everything the page and its bottom button show, worked out from the saved state.
function roundView(state) {
  const program = roundProgram(state);
  const summary = roundSummary(state);
  const todayKey = localDateKey();
  const running = activeWorkout(state);
  // Back after a long break: the round shown is the one Start will open (nothing done in it).
  const found = summary.counting && !running ? longBreak(state) : null;
  const choices = found ? { carry: { number: found.open ? nextNumber(state, summary) : summary.number, block: summary.block }, restart: { number: 1, block: summary.block + 1 } } : null;
  const round = found ? choices[home.restart ? "restart" : "carry"] : summary;
  const workouts = found ? [] : summary.workouts;
  const done = found ? new Set() : summary.done;
  const doneOn = new Map();
  for (const item of workouts) if (!item.guest && !doneOn.has(item.routineId)) doneOn.set(item.routineId, item);
  const today = state.sessions[todayKey];
  const todayIds = today?.routineIds || [];
  const next = running ? null : nextWorkout(state, todayKey);
  const ordered = [...summary.required, ...programRoutines(state, program).filter((routine) => routine.status === "optional")];
  const inList = (workout) => !workout.guest && !workout.backdated && workout.dateKey === todayKey && ordered.some((routine) => routine.id === workout.routineId);
  const rows = ordered.map((routine, index) => {
    const optional = routine.status === "optional";
    const kind = running && inList(running) && running.routineId === routine.id ? "running"
      : todayIds.includes(routine.id) ? "today"
        : doneOn.has(routine.id) ? "done" : "todo";
    return { id: routine.id, routine, number: optional ? "" : index + 1, optional, kind, item: doneOn.get(routine.id), record: today?.workouts?.[routine.id] };
  });
  // A workout running that has no row of its own: an extra, or one logged for a past day.
  const runningExtra = running && !inList(running) ? routineById(state, running.routineId) : null;
  // The row open by itself, unless the owner opened another.
  const lastToday = [...todayIds].reverse().find((id) => rows.some((row) => row.id === id));
  const fallback = running ? (runningExtra ? "" : running.routineId) : lastToday || next?.id || rows[0]?.id || "";
  const openId = !running && rows.some((row) => row.id === home.openId) ? home.openId : fallback;
  return { program, summary, found, choices, round, workouts, done, rows, next, running, runningExtra, openId, todayKey };
}

// ---------- pieces of the page ----------

// The lines of the open row, by what the row is.
function rowLines(state, view, row) {
  const { routine, kind, item, record } = row;
  const id = escapeHtml(routine.id);
  if (kind === "running") return runningLines(state, view.running);
  if (kind === "today") {
    const logs = Object.values(state.sessions[view.todayKey].logs || {}).filter((log) => log.routineId === routine.id);
    const sets = logs.reduce((count, log) => count + log.sets.filter((set) => !set.warmup).length, 0);
    const bests = newBests(state, [{ dateKey: view.todayKey, routineId: routine.id }]);
    // Filed in a round that has closed since (it completed that round).
    const filed = record?.round && !(record.round === view.summary.number && (record.block || 1) === view.summary.block) ? roundName({ number: record.round, block: record.block || 1 }) : "";
    return `${line("Counted in", escapeHtml(filed))}
      ${line("Time", record?.minutes ? durationText(record.minutes) : "")}
      ${line("Logged", logs.length ? `${plural(sets, "set")}, ${plural(logs.length, "exercise")}` : "No sets")}
      ${line("New bests", bests ? String(bests) : "")}
      ${slotLinkLine("How it went", "Against last time", `data-action="open-result" data-id="${id}" data-date="${view.todayKey}" aria-label="How ${escapeHtml(routine.name)} went: against last time"`)}`;
  }
  if (kind === "done") {
    return `${slotLinkLine("Done", escapeHtml([shortDate(item.dateKey), item.minutes ? durationText(item.minutes) : ""].filter(Boolean).join(" · ")), `data-action="open-day" data-date="${item.dateKey}" aria-label="Done ${escapeHtml(shortDate(item.dateKey))}. Open that day."`)}
      ${line(`In round ${view.round.number}`, row.optional ? "counts toward nothing" : "counts once")}`;
  }
  const counts = slotCounts(routine);
  const exercises = `${counts.main}${counts.optional ? `, plus ${counts.optional} optional` : ""}`;
  const usual = usualMinutes(state, routine.id);
  const last = lastFinished(state, routine.id, LATER);
  return `${slotLinkLine("Exercises", exercises, `data-action="program-show-routine" data-id="${id}" aria-label="Exercises of ${escapeHtml(routine.name)}: ${exercises}. Open it on Program."`)}
    ${line("Usually", usual ? `about ${usual} min` : "")}
    ${line("Last done", last ? escapeHtml(shortDate(last)) : "Never")}
    ${row.optional ? line("In the round", "counts toward nothing") : ""}`;
}

function runningLines(state, running) {
  const progress = workoutProgress(state, running);
  const past = running.backdated || running.dateKey !== localDateKey();
  return `${running.guest ? line("Program", escapeHtml(routineProgram(state, running.routineId)?.name || "")) : ""}
    ${past ? line("For", escapeHtml(shortDate(running.dateKey))) : ""}
    ${running.reopened ? line("Reopened", escapeHtml(clockTime(running.startedAt))) : past ? "" : line("Started", `${escapeHtml(clockTime(running.startedAt))}, <span data-round-elapsed>${agoText(running.startedAt).toLowerCase()}</span>`)}
    ${progress ? line("Exercises", `${progress.done} of ${progress.counted.length} done`) : ""}`;
}

// One workout of the round. Rows open in place; while a workout runs the others are quiet.
function rowMarkup(state, view, row) {
  const { routine, kind } = row;
  const open = row.id === view.openId;
  const ticked = kind === "done" || (kind === "today" && view.done.has(routine.id));
  const box = `<span class="tickbox ${ticked ? "is-ticked" : ""}" aria-hidden="true">${ticked ? tickIcon : row.number}</span>`;
  const tag = kind === "running" ? "In progress" : routine.id === view.next?.id ? "Next" : kind === "today" ? "Today" : row.optional ? "Optional" : "";
  const end = kind === "done" ? `<span class="row-meta">${escapeHtml(shortDate(row.item.dateKey))}</span>` : "";
  const label = tag ? `<span class="label tag ${kind === "running" || tag === "Next" ? "accent" : ""}">${tag}</span>` : "";
  const status = kind === "running" ? "in progress" : kind === "today" ? "done today" : kind === "done" ? `done ${shortDate(row.item.dateKey)}` : `not done${tag === "Next" ? ", next" : row.optional ? ", optional" : ""}`;
  const content = `${box}<span class="row-main"><span class="row-title truncate">${escapeHtml(routine.name)}</span></span>${label}${end}`;
  const classes = `row compact round-row ${ticked ? "is-done" : ""} ${open ? "is-open" : ""}`;
  // While a workout runs nothing else can be started: the other rows are quiet.
  const head = view.running
    ? `<div class="${classes} ${open || ticked ? "" : "is-quiet"}">${content}</div>`
    : `<button class="${classes}" type="button" data-action="round-open-row" data-id="${escapeHtml(routine.id)}" aria-expanded="${open}" aria-label="${escapeHtml(routine.name)}, ${escapeHtml(status)}">${content}</button>`;
  if (!open) return head;
  return `<div class="round-item" data-open-slot>
    ${head}
    <div class="slot-detail round-detail" data-slot="${escapeHtml(routine.id)}">${rowLines(state, view, row)}</div>
  </div>`;
}

// A workout running without a row of its own (an extra, or one for a past day): its own
// open row under the others.
function runningExtraMarkup(state, view) {
  return `<div class="round-item" data-open-slot>
    <div class="row compact round-row is-open">
      <span class="tickbox" aria-hidden="true"></span>
      <span class="row-main"><span class="row-title truncate">${escapeHtml(view.runningExtra.name)}</span></span>
      <span class="label tag accent">In progress</span>
    </div>
    <div class="slot-detail round-detail" data-slot="running">${runningLines(state, view.running)}</div>
  </div>`;
}

const moreRow = (name, action, end = "") => `<button class="row compact" type="button" ${action}>
    <span class="row-main"><span class="row-title">${escapeHtml(name)}</span></span>
    ${end ? `<span class="row-meta">${escapeHtml(end)}</span>` : ""}
    <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
  </button>`;

// Under the list: a workout of another program, the earlier rounds, and before anything
// has been counted the way to say which round this is.
function footMarkup(state, view) {
  const { summary, running } = view;
  const rows = [];
  const earlier = (state.settings.roundLog || []).length;
  if (!running && otherPrograms(state).some((program) => program.routineIds.length)) rows.push(moreRow("A workout from another program", `data-action="round-guest-open"`));
  if (summary.counting) rows.push(moreRow("Rounds and blocks", `data-action="round-page" data-page="all"`, earlier ? `${earlier} earlier` : ""));
  if (!running && !earlier && !summary.workouts.length) rows.push(moreRow("Already on a later round?", `data-action="round-number-open" aria-label="Already on a later round? Set it"`, "Set it"));
  return rows.length ? `<section class="round-foot">${rows.join("")}</section>` : "";
}

// Above the list, when there is news: back after a long break, the round completed today,
// or (before anything was counted) what a round is.
function newsMarkup(state, view) {
  const { summary, found, choices } = view;
  if (found) {
    const last = (state.settings.roundLog || []).at(-1);
    const done = summary.required.length - summary.remaining.length;
    const then = found.open ? ` Round ${found.lastRound} ended there, with ${workoutsDone(done, summary.required.length)}.`
      : last ? ` Round ${last.number} ${last.ended === "complete" ? "was complete by then" : "had ended by then"}.` : "";
    const option = (value, round) => `<button type="button" data-action="round-break-choice" data-value="${value}" aria-pressed="${home.restart === (value === "restart")}">${escapeHtml(roundName(round))}</button>`;
    return `<section class="round-news" aria-labelledby="roundNewsTitle">
      <p class="label" id="roundNewsTitle">Welcome back</p>
      <p>${plural(found.weeks, "week")} since ${escapeHtml(shortDate(found.lastDay))}.${escapeHtml(then)}</p>
      <div class="round-switch"><span id="roundSwitchLabel">This is</span><div class="segment" role="group" aria-labelledby="roundSwitchLabel">${option("carry", choices.carry)}${option("restart", choices.restart)}</div></div>
    </section>`;
  }
  const completed = justCompleted(state, summary);
  if (completed?.to === view.todayKey) {
    const days = daysBetween(completed.from, completed.to) + 1;
    return `<button class="row round-row round-complete is-done" type="button" data-action="round-page" data-page="one" data-number="${completed.number}" data-block="${completed.block}" aria-label="${escapeHtml(roundName(completed))} complete, ${completed.done} of ${completed.required} in ${plural(days, "day")}. Open the round.">
      <span class="tickbox is-ticked" aria-hidden="true">${tickIcon}</span>
      <span class="row-main"><span class="row-title">${escapeHtml(roundName(completed))} complete</span><span class="row-meta">${workoutsDone(completed.done, completed.required)} · ${plural(days, "day")}</span></span>
      <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`;
  }
  if (!summary.workouts.length && !(state.settings.roundLog || []).length) {
    const count = summary.required.length;
    const these = count === 1 ? "this workout" : `these ${NUMBER_WORDS[count] || count} workouts, in any order,`;
    return `<p class="hint round-intro">A round is one pass through ${these} over as many days as it takes.</p>`;
  }
  return "";
}

// No program, or nothing in it a round can ask for: say so, and the ways to fix it.
function emptyMarkup(program) {
  return `<section class="page round-page">
    <header class="round-head">${followingMarkup(program)}</header>
    <div class="empty">
      <h2>${program ? "No Required workouts" : "No program yet"}</h2>
      <p>${program ? `A round is one pass through a program's Required workouts, and ${escapeHtml(program.name)} has none. Add a workout, or make one Required, on the Program tab.` : "A program is your set of workouts. Make one on Program, or bring one in."}</p>
    </div>
    <section class="round-foot">
      ${moreRow("Import a backup", `data-action="import-data"`)}
      ${moreRow("Restore the starting program", `data-action="restore-data"`)}
    </section>
  </section>`;
}

function homeMarkup(state) {
  const view = roundView(state);
  const { program, summary, found } = view;
  if (!program || !summary.required.length) return emptyMarkup(program);
  return `<section class="page round-page">
    ${headMarkup({
    top: followingMarkup(program),
    round: view.round,
    week: weekTitle(view.todayKey),
    segments: summary.required.map((routine) => view.done.has(routine.id)),
    left: workoutsDone(summary.required.filter((routine) => view.done.has(routine.id)).length, summary.required.length),
    right: summary.started && !found ? `started ${shortDate(summary.started)}` : "not started yet",
  })}
    ${newsMarkup(state, view)}
    <section class="round-list" aria-label="Workouts in this round">
      ${view.rows.map((row) => rowMarkup(state, view, row)).join("")}
      ${view.runningExtra ? runningExtraMarkup(state, view) : ""}
      ${view.workouts.filter((item) => item.guest || !view.rows.some((row) => row.id === item.routineId)).map((item) => doneRow(item.name, item.dateKey, workoutTag(item))).join("")}
    </section>
    ${footMarkup(state, view)}
  </section>`;
}

// The bottom button acts on the open row: Start (filled) a workout not done yet; Do it
// again today, or Reopen today's (quiet). With nothing to start: the way to Program.
function dockMarkup(state) {
  if (page.name !== "home") return "";
  const view = roundView(state);
  if (!view.program || !view.summary.required.length) return `<button class="button primary" type="button" data-view="routines"><span>Go to Program</span></button>`;
  const row = view.rows.find((item) => item.id === view.openId);
  if (!row) return "";
  const name = escapeHtml(row.routine.name);
  const id = escapeHtml(row.routine.id);
  if (row.kind === "today") return `<button class="button" type="button" data-action="round-reopen" data-id="${id}"><span>Reopen ${name}</span></button>`;
  if (row.kind === "done") return `<button class="button" type="button" data-action="round-start" data-id="${id}"><span>Do ${name} again today</span></button>`;
  return `<button class="button primary" type="button" data-action="round-start" data-id="${id}"><span>Start ${name}</span></button>`;
}

// ---------- All rounds ----------

// Between two rounds, newer above older: a break of three weeks or more, and where a
// new block starts.
function gapMarkup(newer, older) {
  const days = newer.from && older.to ? daysBetween(older.to, newer.from) : 0;
  const parts = [];
  if (days >= 21) parts.push(`${Math.floor(days / 7)} weeks off`);
  if (newer.block > older.block) parts.push(newer.from ? `block ${newer.block} started ${shortDate(newer.from)}` : `block ${newer.block} starts here`);
  if (!parts.length) return "";
  const text = parts.join(" · ");
  return `<p class="hint round-gap">${escapeHtml(text.charAt(0).toUpperCase() + text.slice(1))}</p>`;
}

function allMarkup(state) {
  const rounds = allRounds(state);
  const todayKey = localDateKey();
  const rows = rounds.map((record, index) => {
    const to = record.open ? todayKey : record.to;
    const dates = !record.workouts.length ? (record.open ? "Not started yet" : "No workouts left") : record.open ? `from ${dayMonth(record.from)}` : datesShort(record.from, record.to);
    const weeks = record.workouts.length ? weeksShort(record.from, to) : "";
    const count = `${record.done} of ${record.required}`;
    return `${index ? gapMarkup(rounds[index - 1], record) : ""}
    <button class="row round-cols" type="button" data-action="round-page" data-page="one" data-number="${record.number}" data-block="${record.block}"
      aria-label="${escapeHtml(roundName(record))}, ${escapeHtml(record.program)}, ${escapeHtml([dates, weeks].filter(Boolean).join(", "))}. ${count} workouts, ${ENDED[record.ended]}. Open the round.">
      <span class="tickbox ${record.open ? "is-open" : ""}" aria-hidden="true">${record.number}</span>
      <span class="row-main">
        <span class="row-title truncate">${escapeHtml(record.program || "Deleted program")}</span>
        <span class="row-meta">${escapeHtml(dates)}</span>
        ${weeks ? `<span class="row-meta">${escapeHtml(weeks)}</span>` : ""}
      </span>
      <span class="row-main">
        <span class="row-title">${count}</span>
        <span class="row-meta">${ENDED_SHORT[record.ended]}</span>
      </span>
      <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`;
  });
  return `<section class="page round-page">
    <header class="page-back">${backMarkup("home", "Round")}<h1 class="title">All rounds</h1></header>
    ${rounds.length ? `<div class="label round-cols" aria-hidden="true"><span>Round</span><span>Program</span><span>Workouts</span></div>
    ${rows.join("")}` : `<p class="hint round-note">No rounds yet.</p>`}
  </section>`;
}

// ---------- one round ----------

function oneMarkup(state, record) {
  const todayKey = localDateKey();
  const summary = record.open ? roundSummary(state) : null;
  const to = record.open ? todayKey : record.to;
  const started = record.workouts.length > 0; // an open round with nothing done has no dates yet
  const days = started ? daysBetween(record.from, to) + 1 : 0;
  const left = notDone(state, record);
  const bests = newBests(state, record.workouts);
  return `<section class="page round-page">
    ${headMarkup({
    top: `<div class="round-top">${backMarkup("all", "All rounds")}</div>`,
    round: record,
    week: started ? weekTitle(record.from, to) : weekTitle(todayKey),
    segments: summary ? summary.required.map((routine) => summary.done.has(routine.id)) : Array.from({ length: record.required }, (_, index) => index < record.done),
    left: workoutsDone(record.done, record.required),
    right: record.open ? (started ? `started ${shortDate(record.from)}` : "not started yet") : ENDED[record.ended],
  })}
    <div class="round-lines round-about">
      ${line("Program", escapeHtml(record.program))}
      ${line("Workouts", `${record.done} of ${record.required} done`)}
      ${started ? line("Dates", escapeHtml(record.open ? `from ${shortDate(record.from)}` : record.from === record.to ? shortDate(record.from) : `${shortDate(record.from)} – ${shortDate(record.to)}`)) : ""}
      ${started ? line("Took", `${plural(days, "day")}${record.open ? " so far" : ""}`) : ""}
      ${started ? line("Calendar weeks", escapeHtml(weeksText(record.from, to))) : ""}
      ${line("Training time", record.minutes ? durationText(record.minutes) : "")}
      ${line("New bests", bests ? String(bests) : "")}
    </div>
    ${record.workouts.length ? `<section>
      <div class="label section-label"><span>Workouts</span></div>
      ${record.workouts.map((item) => doneRow(item.name, item.dateKey, workoutTag(item))).join("")}
    </section>` : ""}
    ${left.count ? `<section>
      <div class="label section-label"><span>Not done</span></div>
      ${left.names.length
    ? left.names.map((name) => `<div class="row compact round-row is-quiet"><span class="tickbox" aria-hidden="true"></span><span class="row-main"><span class="row-title truncate">${escapeHtml(name)}</span></span></div>`).join("")
    : `<p class="hint round-note">${plural(left.count, "workout")} ${left.count === 1 ? "was" : "were"} not done.</p>`}
    </section>` : ""}
  </section>`;
}

function markup(state) {
  if (page.name === "one") {
    const record = roundRecord(state, page);
    if (record) return oneMarkup(state, record);
    page.name = "all"; // the round is gone (another backup was imported)
  }
  return page.name === "all" ? allMarkup(state) : homeMarkup(state);
}

// What was just tapped has been replaced by something else in the same place, so the
// second tap of a double tap would land on a control the owner never saw: the screen
// ignores taps for a moment (it still scrolls).
let quietUntil = 0;
const pauseTaps = () => { quietUntil = performance.now() + 400; };
for (const area of [mainElement(), dockElement()]) {
  area.addEventListener("click", (event) => {
    if (performance.now() >= quietUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

// Another page of the tab. Going deeper starts at the top; coming back returns to
// where the page was left. What is swapped in fades in.
function showPage(name, { number = 0, block = 0 } = {}) {
  if (name === page.name && number === page.number && block === page.block) return;
  const main = mainElement();
  page.scroll[page.name] = main.scrollTop;
  const back = DEPTH[name] < DEPTH[page.name];
  Object.assign(page, { name, number, block });
  // A deeper page comes in from the right; going back, the page returns from the left.
  withMotion(back ? "pop" : "push", () => {
    render();
    main.scrollTop = back ? page.scroll[name] || 0 : 0;
  });
  pauseTaps();
}

// The row opened on the round page unfolds (once, not when the page arrives on screen).
const motion = slotMotion();

// ---------- the sheet ----------

const sheetHead = (title, under = "") => `<header class="sheet-head">
    <div><h2 id="roundSheetTitle">${escapeHtml(title)}</h2>${under ? `<p>${escapeHtml(under)}</p>` : ""}</div>
    <button class="icon-button" type="button" data-close-dialog="roundSheet" aria-label="Close">×</button>
  </header>`;
const errorLine = `<p class="form-error" role="alert" aria-live="polite" data-dialog-error></p>`;

// Every other program's workouts, under the program's name. Tapping one starts it.
function guestMarkup(state) {
  const home = roundProgram(state);
  const doneToday = state.sessions[localDateKey()]?.routineIds || [];
  const groups = otherPrograms(state).filter((program) => program.routineIds.length).map((program) => `<p class="label label-row">${escapeHtml(program.name)}</p>
    ${programRoutines(state, program).map((routine) => (doneToday.includes(routine.id) ? `<div class="row compact">
      <span class="row-main"><span class="row-title truncate">${escapeHtml(routine.name)}</span></span>
      <span class="row-meta">Done today</span>
    </div>` : `<button class="row compact" type="button" data-action="round-guest-start" data-id="${escapeHtml(routine.id)}" aria-label="Start ${escapeHtml(routine.name)} from ${escapeHtml(program.name)}">
      <span class="row-main"><span class="row-title truncate">${escapeHtml(routine.name)}</span></span>
      <span class="row-action">Start</span>
    </button>`)).join("")}`);
  return `<div class="sheet-panel">
    ${sheetHead("A workout from another program", `For today only. You keep following ${home.name}.`)}
    <div class="sheet-body" data-keep-scroll="round-sheet">
      ${groups.join("")}
      <p class="hint">It is listed in your round with its program's name and counts toward nothing.</p>
      ${errorLine}
    </div>
  </div>`;
}


// What following the chosen program does to the open round and to the next one, as
// labelled lines, then the choices: carry the count on, start a new block, or back out.
function followMarkup(state) {
  const target = state.programs.find((program) => program.id === sheet.programId);
  const home = roundProgram(state);
  const summary = roundSummary(state);
  const name = escapeHtml(target.name);
  const started = summary.counting && summary.workouts.length > 0;
  const round = `Round ${summary.number}`;
  const lines = [line("Following now", escapeHtml(home.name)), line("Will follow", name)];
  if (!summary.counting) lines.push(line("Round count", "Not started yet"));
  else if (started) lines.push(line(round, `Ends here, with ${escapeHtml(workoutsDone(summary.required.length - summary.remaining.length, summary.required.length))}`), line("Next round", escapeHtml(roundName({ number: summary.number + 1, block: summary.block }))));
  else lines.push(line(round, `Nothing done yet: it follows ${name} instead`));
  if (summary.counting) lines.push(line("As a new block", escapeHtml(roundName({ number: 1, block: summary.block + 1 }))));
  return `<div class="sheet-panel">
    ${sheetHead(`Follow ${target.name}?`)}
    <div class="sheet-body round-lines">
      ${lines.join("")}
      <p class="hint">Past rounds and workouts stay as they are.</p>
      ${errorLine}
    </div>
    <footer class="actions stacked">
      <button class="button primary" type="button" data-action="round-follow">${started ? `End round ${summary.number} and follow ${name}` : `Follow ${name}`}</button>
      ${summary.counting ? `<button class="button" type="button" data-action="round-follow" data-new-block="yes">Start a new block with ${name}</button>` : ""}
      <button class="button text" type="button" data-close-dialog="roundSheet">${started ? `Finish round ${summary.number} first` : "Cancel"}</button>
    </footer>
  </div>`;
}

// Also before counting has started ("Already on a later round?"): saving starts it there.
function numberMarkup(state) {
  const summary = roundSummary(state);
  return `<div class="sheet-panel">
    ${sheetHead("Change round number", summary.counting ? `You are on ${roundName(summary).toLowerCase()} of ${summary.program.name}.` : `Counting starts at this round of ${summary.program.name}.`)}
    <div class="sheet-body round-lines">
      ${line("Round", chooserMarkup(), "round-number-line")}
      <p class="hint">${summary.workouts.length ? "The workouts already done in this round move with it." : "Nothing is done in this round yet."}</p>
      ${errorLine}
    </div>
    <footer class="actions stacked">
      <button class="button primary" type="button" data-action="round-number-save">Save round number</button>
      ${summary.counting ? `<button class="link-button" type="button" data-action="round-new-block">Start a new block at round 1</button>` : ""}
    </footer>
  </div>`;
}

const SHEETS = { guest: guestMarkup, follow: followMarkup, number: numberMarkup };

// Opens the sheet, or swaps what an open one shows (the swapped part fades in).
function showSheet(mode, changes = {}) {
  const dialog = $("#roundSheet");
  const swapped = dialog.open && !("closing" in dialog.dataset);
  Object.assign(sheet, { mode }, changes);
  redraw("#roundSheetContent", SHEETS[mode](store.getState()));
  openDialog(dialog);
  if (swapped) fresh(...$("#roundSheetContent").firstElementChild.children);
}

// ---------- actions ----------

// A workout can't be started, a program followed or the count changed while one runs.
function nothingRunning() {
  if (!activeWorkout(store.getState())) return true;
  toast("Finish or cancel the workout in progress first.");
  return false;
}


async function endRoundNow() {
  const summary = roundSummary(store.getState());
  const left = summary.remaining.map((routine) => routine.name);
  const confirmed = await confirmAction({
    title: `End round ${summary.number} now?`,
    message: `${listText(left)} ${left.length === 1 ? "is" : "are"} left undone. The next round opens, and this can't be undone.`,
    confirmLabel: "End round",
    cancelLabel: "Keep going",
    danger: false,
  });
  if (!confirmed || !report(store.update((draft) => endRound(draft)), `Round ${summary.number} ended.`)) return;
  render();
  fresh(...mainElement().children);
}

async function newBlock() {
  const summary = roundSummary(store.getState());
  const done = summary.required.length - summary.remaining.length;
  const confirmed = await confirmAction({
    title: `Start block ${summary.block + 1}?`,
    message: `${summary.workouts.length ? `Round ${summary.number} ends here, with ${workoutsDone(done, summary.required.length)}. ` : ""}The count starts again at round 1 of block ${summary.block + 1}. Your history stays, and this can't be undone.`,
    confirmLabel: "Start block",
    cancelLabel: "Keep going",
    danger: false,
  });
  if (!confirmed || !report(store.update((draft) => startNewBlock(draft)))) return;
  closeDialog("#roundSheet");
  render();
  fresh(...mainElement().children);
}

// Leaves the page as it was on screen: the row opened by the owner closes, and a row open
// on arrival doesn't unfold.
function forgetOpenRow() {
  Object.assign(home, { openId: "", restart: false, arrivals: home.arrivals + 1 });
}

registerView("round", {
  markup,
  dock: dockMarkup,
  // The Workout tab opens the workout in progress, when there is one.
  landing: (state) => (activeWorkout(state) ? "workout" : ""),
  // Back from the workout (or after finishing it): the round page, at its first page.
  arrive(from) {
    if (from !== "workout") return;
    Object.assign(page, { name: "home", number: 0, block: 0 });
    forgetOpenRow();
  },
  afterDraw() {
    if (page.name === "home") motion.unfold(`home ${home.arrivals}`);
  },
  // Going back (a drag from the left edge): one round returns to All rounds, All rounds
  // to the tab's first page, each to where it was left.
  back() {
    if (page.name === "home") return null;
    const from = { name: page.name, number: page.number, block: page.block };
    const to = page.name === "one" ? "all" : "home";
    return {
      apply() {
        Object.assign(page, { name: to, number: 0, block: 0 });
        return page.scroll[to] || 0;
      },
      revert() {
        Object.assign(page, from);
      },
    };
  },
  // Tapping the Round tab while one of its pages shows goes back to the tab's first page.
  reselect() {
    if (page.name === "home") return false;
    showPage("home");
    return true;
  },
});

registerActions({
  "round-page": (button) => showPage(button.dataset.page, { number: Number(button.dataset.number) || 0, block: Number(button.dataset.block) || 0 }),
  // − and +: only the number and the buttons' state change.
  "round-number-step": (button) => {
    chooser.number = Math.min(999, Math.max(1, chooser.number + Number(button.dataset.step)));
    clearError(); // a refused number no longer stands
    const box = button.closest("[data-round-chooser]");
    $("[data-round-number]", box).textContent = chooser.number;
    $("[data-step='-1']", box).disabled = chooser.number <= 1;
    $("[data-step='1']", box).disabled = chooser.number >= 999;
  },
  // Another row opens in place (the one open folds); the open one stays open.
  "round-open-row": (button) => {
    if (button.getAttribute("aria-expanded") === "true") return;
    home.openId = button.dataset.id;
    pauseTaps();
    motion.fold(() => render());
  },
  // After a long break: which round this is. Only the title and the switch change.
  "round-break-choice": (button) => {
    const restart = button.dataset.value === "restart";
    if (restart === home.restart) return;
    home.restart = restart;
    render();
  },
  // Start: counting begins at round 1 if it hasn't, and a long break is answered as the
  // switch says, in the same save as the start.
  "round-start": (button) => {
    const result = store.update((draft) => startTodaysWorkout(draft, button.dataset.id, { restart: home.restart }));
    if (!report(result)) return;
    navigate("workout", { motion: "push" });
    pauseTaps();
  },
  // Today's finished workout, open again: it stays in the round it was filed in.
  "round-reopen": (button) => {
    if (!report(store.update((draft) => startWorkout(draft, button.dataset.id)))) return;
    navigate("workout", { motion: "push" });
    pauseTaps();
  },

  "round-guest-open": () => {
    if (nothingRunning()) showSheet("guest");
  },
  // An extra carries on after a long break (the default answer).
  "round-guest-start": (button) => {
    const result = store.update((draft) => startTodaysWorkout(draft, button.dataset.id, { guest: true }));
    if (!report(result)) return;
    closeDialog("#roundSheet");
    navigate("workout");
    pauseTaps();
  },
  // The Program tab's "Follow <name>": what following that program will do, to confirm.
  "follow-program": (button) => {
    if (!nothingRunning()) return;
    const state = store.getState();
    const program = state.programs.find((item) => item.id === button.dataset.id);
    if (program === roundProgram(state)) toast(`You already follow ${program.name}.`);
    else if (program) showSheet("follow", { programId: program.id });
  },
  "round-follow": (button) => {
    if (!report(store.update((draft) => followProgram(draft, sheet.programId, { newBlock: Boolean(button.dataset.newBlock) })))) return;
    closeDialog("#roundSheet");
    render();
    pauseTaps();
    // On the round page the header and the list changed in place; Program draws its own.
    if (document.body.dataset.currentView === "round") fresh(...mainElement().children);
  },
  "round-end": () => {
    if (nothingRunning()) endRoundNow();
  },
  "round-number-open": () => {
    if (!nothingRunning()) return;
    chooser.number = roundSummary(store.getState()).number;
    showSheet("number");
  },
  "round-number-save": () => {
    const changed = chooser.number !== openRound(store.getState())?.number;
    if (!report(store.update((draft) => setRoundNumber(draft, chooser.number)))) return;
    closeDialog("#roundSheet");
    if (!changed) return;
    render();
    fresh(...mainElement().children);
  },
  "round-new-block": newBlock,
});

// The row in progress says how long ago the workout started; it keeps up.
setInterval(() => {
  const running = activeWorkout(store.getState());
  const label = $("[data-round-elapsed]");
  if (running && label) label.textContent = agoText(running.startedAt).toLowerCase();
}, 20000);
