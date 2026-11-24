// The round page, the first page of the Workout tab and the app's home: where the open
// round stands (header and bar), then the round's workouts as one list with one row open
// and the bottom button acting on it (Start, Do it again, Reopen), what is news today
// (back after a break, a round completed), and the rows under it. Three pages open inside
// the tab, each with a back link: Rounds and blocks, one block, and one round. One
// sheet (#roundSheet): a workout from another program, following a different program
// (opened from Program with "follow-program"), and changing the round number. What a
// round is: js/model.js, "rounds and calendar weeks".

import { mainElement, navigate, pauseTaps, registerActions, registerView, render, store, withMotion } from "../context.js";
import { $, chevronIcon, clearError, closeDialog, confirmAction, escapeHtml, formatDate, fresh, openDialog, plural, redraw, report, toast } from "../dom.js";
import {
  activeWorkout,
  allBlocks,
  calendarWeek,
  dateFromKey,
  endRound,
  exerciseById,
  exerciseHistory,
  followProgram,
  fullName,
  lastFinished,
  localDateKey,
  longBreak,
  nextWorkout,
  openRound,
  orderedEntries,
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
  workoutStanding,
} from "../model.js";
import { exerciseMode, exerciseProgress, repsToAddWeight } from "../progress.js";
import { setLines, workoutTally } from "./result.js";
import { daysBetween, durationText, movementMarkup, roundName, setupText, shortDate, weeksText, workoutsDone } from "./shared.js";

// Which page of the tab shows: "home", "all" (Rounds and blocks), "block" (the block
// `block`) or "one" (the round `number` of `block`; `from` "block" or "home" when it was opened
// from its block's page or the round page, which is where it goes back to). `scroll`
// remembers where a page was left, for coming back to it.
const page = { name: "home", number: 0, block: 0, from: "", scroll: {} };
const DEPTH = { home: 0, all: 1, block: 2, one: 3 };
// The round number being picked with − and + in the sheet.
const chooser = { number: 1 };
// What the sheet shows: "guest", "follow" (for programId) or "number".
const sheet = { mode: "", programId: "" };

const tickIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
const gearIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>`;

// ---------- words ----------

// How a round ended, as Rounds and blocks and the round's own page say it.
const ENDED = { "": "in progress", complete: "complete", early: "ended early", break: "ended by the break", switch: "ended by a change of program" };
// The same in the narrow last column of Rounds and blocks.
const ENDED_SHORT = { ...ENDED, break: "ended by break", switch: "program changed" };
const LATER = "9999-12-31"; // "before this day" that leaves no day out

const listText = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
const sameWeek = (fromKey, toKey) => calendarWeek(fromKey).year === calendarWeek(toKey).year && calendarWeek(fromKey).week === calendarWeek(toKey).week;
// "Week 47", or "Weeks 47–48" for a stretch of days.
const weekTitle = (fromKey, toKey = fromKey) => (sameWeek(fromKey, toKey) ? `Week ${calendarWeek(fromKey).week}` : `Weeks ${calendarWeek(fromKey).week}–${calendarWeek(toKey).week}`);
// In a list of rounds the year is said only when it isn't this one: "weeks 47–48".
const weeksShort = (fromKey, toKey) => weeksText(fromKey, toKey).replace(new RegExp(`^${calendarWeek(localDateKey()).year} · `), "");
const dayMonth = (dateKey) => formatDate(dateFromKey(dateKey), { day: "numeric", month: "short", ...(dateKey.startsWith(`${new Date().getFullYear()}-`) ? {} : { year: "numeric" }) });
const datesShort = (fromKey, toKey) => (fromKey === toKey ? dayMonth(fromKey) : `${dayMonth(fromKey)} – ${dayMonth(toKey)}`);

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

// ---------- Home: the round page ----------
//
// The tab's first page. Under the header, the round on the calendar (a row per calendar
// week it touches, each finished workout a filled square that opens its result) with four
// facts; then what is left to do in it as tiles to pick from, and for the picked workout
// the lifts to beat; the bottom button starts it. While a workout runs, a card about that
// session takes the place of the tiles; once one is finished today, a card about it. A
// round that has nothing done in it yet is laid out first and begun with "Begin round N"
// (a step of this phone only: see `begun` below). The round complete today shows whole,
// with the next one laid out under it.

// The page's own memory: the tile the owner picked ("" = the one picked by itself, the
// next), the answer picked after a long break (true: start again as a new block).
const home = { pickId: "", restart: false };

// "Begin round N" is remembered on this phone only, under its own key, for the round it
// was tapped for (number, block and the day it opened); anything else there is ignored.
// A round with a workout in it, or one running, is begun whatever is remembered.
const BEGUN_KEY = "gymAppHomeV1";
const roundKey = (summary) => `${summary.number}-${summary.block}-${summary.since}`;
function begunHere(summary) {
  try {
    return JSON.parse(localStorage.getItem(BEGUN_KEY))?.begun === roundKey(summary);
  } catch (_) {
    return false;
  }
}
function rememberBegun(summary) {
  try {
    localStorage.setItem(BEGUN_KEY, JSON.stringify({ begun: roundKey(summary) }));
  } catch (_) { /* storage blocked: the round shows begun until the app is reopened */ }
}
const begunNow = new Set(); // in case storage is blocked

// A workout that was done: ticked, muted, its date at the end; it opens its day (a round's page).
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
const daysText = (days) => plural(days, "day");
// "6 h 28", "45 min"; "–" when nothing is known.
const hoursText = (minutes) => (!minutes ? "–" : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`);

// The number a round carried on after a break takes: the first one its block hasn't used.
function nextNumber(state, round) {
  let number = round.number + 1;
  while ((state.settings.roundLog || []).some((item) => item.number === number && item.block === round.block)) number += 1;
  return number;
}

// The last closed round as history shows it, or null.
const lastClosed = (state) => {
  const last = (state.settings.roundLog || []).at(-1);
  return last ? roundRecord(state, last) : null;
};
// How many days a round's workouts spanned, or 0.
const roundDays = (record) => (record?.workouts.length ? daysBetween(record.from, record.to) + 1 : 0);

// Everything the page and its bottom button show, worked out from the saved state.
// `kind`: "complete" (a round completed today, the next not begun), "laid" (the round has
// nothing in it and isn't begun), "running", "after" (one finished today and no other
// picked since), "day" (a training day: pick and start).
function homeView(state) {
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
  const finishedToday = state.sessions[todayKey]?.routineIds || [];
  const left = (found ? summary.required : summary.remaining).filter((routine) => !finishedToday.includes(routine.id) || !found);
  const optional = programRoutines(state, program).filter((routine) => routine.status === "optional" && !done.has(routine.id));
  const next = running ? null : nextWorkout(state, todayKey);
  const pickable = left.filter((routine) => !finishedToday.includes(routine.id));
  const picked = [...pickable, ...optional].find((routine) => routine.id === home.pickId) || next || pickable[0] || null;
  const justDone = justCompleted(state, summary);
  const completed = justDone?.to === todayKey ? justDone : null;
  const begun = Boolean(found) || workouts.length > 0 || Boolean(running) || begunNow.has(roundKey(summary)) || begunHere(summary);
  // The workout of this round finished today last.
  const lastToday = [...finishedToday].reverse().find((id) => workouts.some((item) => item.dateKey === todayKey && item.routineId === id)) || "";
  const kind = !begun && completed ? "complete" : !begun ? "laid" : running ? "running" : lastToday && !home.pickId ? "after" : "day";
  return { program, summary, found, choices, round, workouts, done, left, optional, next, picked, completed, running, todayKey, kind, lastToday };
}

// ---------- the round on the calendar ----------

// The Monday of a date's calendar week.
function mondayOf(dateKey) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDateKey(date);
}
const addDays = (dateKey, days) => {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
};
// "Push A" → "Push<br>A": a square holds a short name on two lines.
const squareName = (name) => {
  const words = name.trim().split(/\s+/);
  return words.length < 2 ? escapeHtml(name) : `${escapeHtml(words.slice(0, -1).join(" "))}<br>${escapeHtml(words.at(-1))}`;
};

// A square: the day's date, and the workout finished on it. Filled: a workout of the
// round shown; dashed: one of them that doesn't count (an extra, an Optional one); pale:
// a workout of another round; empty: a day of the round without one; a thin outline: a
// day to come; no box: a day before the round. Today is outlined, with the picked
// workout's name while nothing is done today. A square with a workout opens its result.
function dayMarkup(state, view, dateKey, { from, round, todayName }) {
  const day = dateFromKey(dateKey).getDate();
  const session = state.sessions[dateKey];
  const finished = (session?.routineIds || []).map((routineId) => ({ routineId, record: session.workouts?.[routineId] || {} }));
  const inRound = finished.filter(({ record }) => record.round === round.number && (record.block || 1) === round.block);
  const shown = inRound.at(-1) || finished.at(-1);
  const isToday = dateKey === view.todayKey;
  const running = isToday && view.running && view.running.dateKey === dateKey ? routineById(state, view.running.routineId) : null;
  const classes = ["home-day"];
  if (isToday) classes.push("is-today");
  let name = "";
  if (shown) {
    const counts = inRound.includes(shown) && !shown.record.guest && !shown.record.optional;
    classes.push(counts ? "is-done" : inRound.includes(shown) ? "is-other" : "is-before");
    name = squareName(shown.record.name || routineById(state, shown.routineId)?.name || "Workout");
  } else if (running) {
    classes.push("is-running");
    name = squareName(running.name);
  } else if (dateKey > view.todayKey) {
    classes.push("is-future");
  } else if (dateKey < from) {
    classes.push("is-out");
  } else if (isToday && todayName) {
    name = squareName(todayName);
  }
  const more = finished.length > 1 ? `<i>+${finished.length - 1}</i>` : "";
  const inner = `<small>${day}</small><b>${name}</b>${more}`;
  if (!shown) return `<div class="${classes.join(" ")}"${isToday ? ` aria-label="Today${name ? `, ${escapeHtml(running ? `${running.name} in progress` : todayName)}` : ""}"` : ` aria-hidden="true"`}>${inner}</div>`;
  const label = `${shortDate(dateKey)}: ${finished.map(({ record, routineId }) => record.name || routineById(state, routineId)?.name || "Workout").join(" and ")}. Open how it went`;
  return `<button class="${classes.join(" ")}" type="button" data-action="open-result" data-id="${escapeHtml(shown.routineId)}" data-date="${dateKey}" aria-label="${escapeHtml(label)}">${inner}</button>`;
}

// The calendar weeks from `from` to `to`, a row each: the week number, then Monday to Sunday.
function calendarMarkup(state, view, { from, to, round, todayName = "" }) {
  const head = `<span class="label">Wk</span>${["M", "T", "W", "T", "F", "S", "S"].map((letter, index) => `<span class="label${index === (dateFromKey(view.todayKey).getDay() + 6) % 7 && to >= view.todayKey ? " is-today" : ""}">${letter}</span>`).join("")}`;
  const rows = [];
  for (let monday = mondayOf(from); monday <= to; monday = addDays(monday, 7)) {
    rows.push(`<span class="label">${calendarWeek(monday).week}</span>${Array.from({ length: 7 }, (_, index) => dayMarkup(state, view, addDays(monday, index), { from, round, todayName })).join("")}`);
  }
  return `<div class="home-cal">${head}${rows.join("")}</div>`;
}

// Small cells under a picture: [value, label] each.
const cellsMarkup = (cells, extra = "") => `<div class="result-cells home-cells ${extra}">${cells.map(([value, name]) => `<p><strong>${value}</strong><small>${name}</small></p>`).join("")}</div>`;

const card = (label, right, body, extra = "") => `<section class="result-card ${extra}" aria-label="${escapeHtml(label.replace(/<[^>]+>/g, ""))}">
    <h2 class="label result-card-label"><span>${label}</span>${right ? `<span>${right}</span>` : ""}</h2>
    ${body}
  </section>`;

// The round open now on the calendar, from its first day (or this week, before anything
// is done) to today, with four facts.
function roundCardMarkup(state, view) {
  const { summary, round, kind, workouts } = view;
  const name = roundName({ number: round.number, block: 1 });
  const begunOn = workouts[0]?.dateKey || (view.found ? view.todayKey : summary.since || view.todayKey);
  const from = kind === "laid" ? mondayOf(view.todayKey) : begunOn;
  const todayName = kind === "day" && view.picked && !(state.sessions[view.todayKey]?.routineIds || []).length ? view.picked.name : "";
  const calendar = calendarMarkup(state, view, { from: kind === "laid" ? view.todayKey : from, to: view.todayKey, round, todayName });
  const last = lastClosed(state);
  const { required } = summary;
  if (kind === "laid") return card("This week", `${escapeHtml(name)} not begun`, calendar);
  const doneCount = view.found ? 0 : required.length - summary.remaining.length;
  const left = view.left.map((routine) => usualMinutes(state, routine.id));
  // Only the cells that have something to say.
  const cells = [
    [`Day ${daysBetween(begunOn, view.todayKey) + 1}`, `of ${name.toLowerCase()}`],
    [`${doneCount} of ${required.length}`, "done"],
    left.length && left.every((minutes) => minutes) ? [hoursText(left.reduce((sum, minutes) => sum + minutes, 0)), "still to do"] : null,
    roundDays(last) ? [daysText(roundDays(last)), `round ${last.number}`] : null,
  ].filter(Boolean);
  return card(escapeHtml(name), workouts.length ? `since ${escapeHtml(shortDate(begunOn))}` : "", `${calendar}${cellsMarkup(cells)}`);
}

// The round completed today, whole: its weeks, four facts, and today's workout.
function completedCardMarkup(state, view) {
  const record = view.completed;
  const name = roundName({ number: record.number, block: 1 });
  const calendar = calendarMarkup(state, view, { from: record.from, to: record.to, round: record });
  const before = (state.settings.roundLog || []).at(-2);
  const previous = before ? roundRecord(state, before) : null;
  const cells = [
    [`${record.done} of ${record.required}`, "done"],
    [daysText(roundDays(record)), "took"],
    [previous ? daysText(roundDays(previous)) : "–", previous ? `round ${previous.number}` : "round before"],
    [hoursText(record.minutes), "trained"],
  ];
  const today = record.workouts.filter((item) => item.dateKey === view.todayKey).at(-1);
  const sets = today ? Object.values(state.sessions[today.dateKey].logs || {}).filter((log) => log.routineId === today.routineId).reduce((count, log) => count + log.sets.filter((set) => !set.warmup).length, 0) : 0;
  const todayLine = today ? `<button class="result-line" type="button" data-action="open-result" data-id="${escapeHtml(today.routineId)}" data-date="${today.dateKey}" aria-label="${escapeHtml(today.name)}, today. How it went"><span class="result-name"><span class="result-label is-link">${escapeHtml(today.name)}, today</span><small>${escapeHtml([today.minutes ? `${today.minutes} min` : "", plural(sets, "set")].filter(Boolean).join(" · "))}</small></span>${chevron()}</button>` : "";
  return card(`${escapeHtml(name)} complete`, escapeHtml(datesShort(record.from, record.to)), `${calendar}${cellsMarkup(cells)}${todayLine}`);
}

const chevron = (direction = "right") => `<span class="chev" aria-hidden="true">${chevronIcon(direction)}</span>`;

// ---------- what is left, and the picked workout ----------

// "10 days ago", "yesterday", "today", "never".
function agoDays(state, routineId, todayKey) {
  const last = lastFinished(state, routineId, LATER);
  if (!last) return "never";
  const days = daysBetween(last, todayKey);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

// A workout as a tile: its name, how long it usually takes, when it was last done. A tile
// to pick is a button (the picked one filled); `quiet`: only shown.
function tileMarkup(state, view, routine, { pickable = true, optional = false } = {}) {
  const usual = usualMinutes(state, routine.id);
  const ago = agoDays(state, routine.id, view.todayKey);
  // Never timed: how many exercises it has instead; never done: no line for it.
  const size = optional ? "optional" : usual ? `${usual} min` : plural(slotCounts(routine).main, "exercise");
  const lines = `<strong>${escapeHtml(routine.name)}</strong><small>${size}</small>${ago === "never" ? "" : `<small>${escapeHtml(ago)}</small>`}`;
  if (!pickable) return `<div class="home-tile${optional ? " is-optional" : ""}">${lines}</div>`;
  const on = view.picked?.id === routine.id && (view.kind === "day" || view.kind === "after");
  return `<button class="home-tile${optional ? " is-optional" : ""}" type="button" data-action="home-pick" data-id="${escapeHtml(routine.id)}" aria-pressed="${on}" aria-label="${escapeHtml(`${routine.name}${optional ? ", optional" : ""}, ${usual ? `usually ${usual} min` : "never timed"}, last done ${agoDays(state, routine.id, view.todayKey)}`)}">${lines}</button>`;
}

function tilesMarkup(state, view, { title, right, pickable = true }) {
  const finishedToday = state.sessions[view.todayKey]?.routineIds || [];
  const tiles = [
    ...view.left.map((routine) => tileMarkup(state, view, routine, { pickable: pickable && !finishedToday.includes(routine.id) })),
    ...view.optional.map((routine) => tileMarkup(state, view, routine, { pickable: pickable && !finishedToday.includes(routine.id), optional: true })),
  ];
  return tiles.length ? card(title, right, `<div class="home-tiles">${tiles.join("")}</div>`) : "";
}

// The lifts to beat in the picked workout: the main exercises first, each with last
// time's weight over its reps and what beats it ("+1 rep"; "+2.5 kg" once every set
// reached the top of the rep range); then the way to all of it on Program.
function toBeatMarkup(state, view) {
  const routine = view.picked;
  if (!routine) return "";
  const last = lastFinished(state, routine.id, LATER);
  const entries = [...orderedEntries(routine).filter((entry) => entry.role === "main"), ...orderedEntries(routine).filter((entry) => entry.role !== "main")];
  const rows = [];
  for (const entry of entries) {
    if (rows.length === 3) break;
    const choice = entry.choices[0];
    const exercise = exerciseById(state, choice?.exerciseId);
    const history = exercise ? exerciseHistory(state, exercise.id, { limit: 3 }) : [];
    const previous = history[0];
    if (!previous || !previous.sets.some((set) => !set.warmup)) continue;
    const mode = exerciseMode(history);
    const lines = setLines(previous);
    const top = repsToAddWeight(previous.sets, choice.prescription, mode, previous.unit);
    const target = previous.unit === "sec" ? "+5 sec" : top ? "+2.5 kg" : "+1 rep";
    const weight = lines.at(-1);
    rows.push(`<button class="result-line result-exercise" type="button" data-action="view-history" data-id="${escapeHtml(exercise.id)}" aria-label="${escapeHtml(`${fullName(exercise)}: last time ${lines.map(([kg, reps]) => (kg ? `${kg} × ${reps}` : reps)).join(", ")}; to beat it ${target}. Open its history`)}">
      <span class="result-name"><span class="result-title"><span class="truncate">${movementMarkup(exercise)}</span></span><small class="truncate">${escapeHtml(setupText(exercise)) || "&nbsp;"}</small></span>
      <span class="result-sets"><strong>${weight[0] || weight[1]}</strong><small>${weight[0] ? weight[1] : previous.unit === "sec" ? "sec" : "reps"}</small></span>
      <span class="result-change up">${target}</span>${chevron()}
    </button>`);
  }
  const counts = slotCounts(routine);
  const all = `<button class="result-line" type="button" data-action="program-show-routine" data-id="${escapeHtml(routine.id)}" aria-label="All of ${escapeHtml(routine.name)}: ${counts.main} exercises${counts.optional ? `, plus ${counts.optional} optional` : ""}. Open it on Program"><span class="result-label is-link">All of ${escapeHtml(routine.name)}</span><span class="result-value is-quiet"><strong>${counts.main}${counts.optional ? ` + ${counts.optional} optional` : ""}</strong></span>${chevron()}</button>`;
  const body = rows.length ? rows.join("") : `<p class="hint home-first">${last ? "Nothing logged in it to beat yet." : `The first time for ${escapeHtml(routine.name)}: nothing to beat yet.`}</p>`;
  return card(`${escapeHtml(routine.name)} · to beat`, last ? escapeHtml(shortDate(last)) : "", `${body}${all}`);
}

// While a workout runs: one card about the session, its bar, four facts and what is next.
function runningMarkup(state, view) {
  const workout = view.running;
  const progress = workoutProgress(state, workout);
  if (!progress) return "";
  const standing = workoutStanding(state, workout.routineId, workout.dateKey);
  const tally = workoutTally(state, workout.routineId, workout.dateKey);
  const minutes = Math.max(0, Math.floor((Date.now() - workout.startedAt) / 60000));
  const clock = workout.reopened ? ["–", "reopened"] : workout.backdated ? [shortDate(workout.dateKey), "for"] : [`<span data-round-elapsed>${minutes} min</span>`, "so far"];
  const next = progress.next ? exerciseById(state, progress.next.choices[0]?.exerciseId) : null;
  const nextLine = `<button class="result-line" type="button" data-action="workout-resume" aria-label="${escapeHtml(next ? `Next: ${fullName(next)}. Back to the workout` : "Back to the workout")}"><span class="result-name"><span class="result-title"><span class="truncate">${next ? movementMarkup(next) : "Every exercise done"}</span></span><small class="truncate">${next ? `Next${setupText(next) ? ` · ${escapeHtml(setupText(next))}` : ""}` : "Finish it from the workout"}</small></span>${chevron()}</button>`;
  const label = `${escapeHtml(progress.routine.name)} · in progress${workout.guest ? ` · ${escapeHtml(routineProgram(state, workout.routineId)?.name || "")}` : ""}`;
  return card(label, workout.reopened || workout.backdated ? "" : `started ${escapeHtml(clockTime(workout.startedAt))}`, `<div class="round-bar home-bar" aria-hidden="true">${progress.counted.map((slot) => `<i${progress.isDone(slot) ? ` class="is-done"` : ""}></i>`).join("")}</div>
    ${cellsMarkup([clock, [String(standing.sets), standing.sets === 1 ? "set" : "sets"], [`${progress.done} of ${progress.counted.length}`, "exercises"], [tally ? tallyMarkup(tally) : "–", "vs last"]], "is-flat")}
    ${nextLine}`);
}

// "▲ 3 ▼ 1" in the up and down colours.
const tallyMarkup = (tally) => escapeHtml(tally).replace(/▲ \d+/, (match) => `<span class="up">${match}</span>`).replace(/▼ \d+/, (match) => `<span class="down">${match}</span>`);

// Once a workout of the round is finished today: a card about it, and its full result.
function todayMarkup(state, view) {
  const routineId = view.lastToday;
  const record = state.sessions[view.todayKey].workouts?.[routineId] || {};
  const standing = workoutStanding(state, routineId, view.todayKey);
  const tally = workoutTally(state, routineId, view.todayKey);
  const cells = [
    [record.minutes ? `${record.minutes} min` : "–", "time"],
    [String(standing.sets), standing.sets === 1 ? "set" : "sets"],
    [standing.counted.length ? `${standing.counted.filter(standing.isDone).length} of ${standing.counted.length}` : String(standing.exercises), "exercises"],
    [tally ? tallyMarkup(tally) : "–", "vs last"],
  ];
  return card(`Today · ${escapeHtml(record.name || "Workout")} done`, escapeHtml(shortDate(view.todayKey)), `${cellsMarkup(cells, "is-flat")}
    <button class="result-line" type="button" data-action="open-result" data-id="${escapeHtml(routineId)}" data-date="${view.todayKey}" aria-label="Full result of ${escapeHtml(record.name || "the workout")}"><span class="result-label is-link">Full result</span>${chevron()}</button>`);
}

// The round with nothing in it yet, laid out: all its workouts, what it usually takes.
function laidOutMarkup(state, view, round) {
  const required = view.summary.required;
  const usual = required.map((routine) => usualMinutes(state, routine.id));
  const last = view.completed || lastClosed(state);
  const name = roundName({ number: round.number, block: 1 });
  const tiles = required.map((routine) => tileMarkup(state, view, routine, { pickable: false }));
  // Only the cells that have something to say.
  const cells = [
    [String(required.length), required.length === 1 ? "workout" : "workouts"],
    usual.every(Boolean) ? [hoursText(usual.reduce((sum, minutes) => sum + minutes, 0)), "usually"] : null,
    roundDays(last) ? [daysText(roundDays(last)), `round ${last.number} took`] : null,
    required[0] ? [escapeHtml(required[0].name), "first"] : null,
  ].filter(Boolean);
  return card(`In ${escapeHtml(name.toLowerCase())}`, "any order", `<div class="home-tiles">${tiles.join("")}</div>${view.kind === "laid" ? cellsMarkup(cells) : ""}`);
}

// ---------- the parts under the cards ----------

const moreRow = (name, action, end = "") => `<button class="row compact" type="button" ${action}>
    <span class="row-main"><span class="row-title">${escapeHtml(name)}</span></span>
    ${end ? `<span class="row-meta">${escapeHtml(end)}</span>` : ""}
    <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
  </button>`;

// A workout of another program, the earlier rounds, and before anything has been counted
// the way to say which round this is.
function footMarkup(state, view) {
  const { summary, running } = view;
  const rows = [];
  const earlier = (state.settings.roundLog || []).length;
  if (!running && otherPrograms(state).some((program) => program.routineIds.length)) rows.push(moreRow("A workout from another program", `data-action="round-guest-open"`));
  if (summary.counting) rows.push(moreRow("Rounds and blocks", `data-action="round-page" data-page="all"`, earlier ? `${earlier} earlier` : ""));
  if (!running && !earlier && !summary.workouts.length) rows.push(moreRow("Already on a later round?", `data-action="round-number-open" aria-label="Already on a later round? Set it"`, "Set it"));
  return rows.length ? `<section class="round-foot">${rows.join("")}</section>` : "";
}

// Back after a long break: how long it has been, how the last round was left, and which
// round this is (a two-way switch the next Start applies).
function welcomeMarkup(state, view) {
  const { summary, found, choices } = view;
  const last = (state.settings.roundLog || []).at(-1);
  const done = summary.required.length - summary.remaining.length;
  const then = found.open ? ` Round ${found.lastRound} ended there, with ${workoutsDone(done, summary.required.length)}.`
    : last ? ` Round ${last.number} ${last.ended === "complete" ? "was complete by then" : "had ended by then"}.` : "";
  const option = (value, round) => `<button type="button" data-action="round-break-choice" data-value="${value}" aria-pressed="${home.restart === (value === "restart")}">${escapeHtml(roundName(round))}</button>`;
  return `<section class="result-card round-news" aria-labelledby="roundNewsTitle">
    <h2 class="label result-card-label" id="roundNewsTitle"><span>Welcome back</span></h2>
    <p>${plural(found.weeks, "week")} since ${escapeHtml(shortDate(found.lastDay))}.${escapeHtml(then)}</p>
    <div class="round-switch"><span id="roundSwitchLabel">This is</span><div class="segment" role="group" aria-labelledby="roundSwitchLabel">${option("carry", choices.carry)}${option("restart", choices.restart)}</div></div>
  </section>`;
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
  const view = homeView(state);
  const { program, summary, kind, round } = view;
  if (!program || !summary.required.length) return emptyMarkup(program);
  const { title, suffix } = roundTitle(round);
  const head = `<header class="round-head home-head">
    ${followingMarkup(program)}
    <div class="round-title">
      <h1><span>${escapeHtml(title)}</span>${suffix ? `<small>${escapeHtml(suffix)}</small>` : ""}</h1>
      <span>${escapeHtml(weekTitle(view.todayKey))}</span>
    </div>
  </header>`;
  const name = roundName({ number: round.number, block: 1 }).toLowerCase();
  // Before anything was counted: what a round is, in one sentence.
  const intro = !summary.counting && !(state.settings.roundLog || []).length
    ? `<p class="hint home-intro">A round is one pass through ${summary.required.length === 1 ? "this workout" : `these ${NUMBER_WORDS[summary.required.length] || summary.required.length} workouts, in any order,`} over as many days as it takes.</p>` : "";
  const parts = {
    complete: () => [completedCardMarkup(state, view), laidOutMarkup(state, view, round)],
    laid: () => [roundCardMarkup(state, view), intro, laidOutMarkup(state, view, round)],
    running: () => [roundCardMarkup(state, view), runningMarkup(state, view), tilesMarkup(state, view, { title: "After this", right: `left in ${name}`, pickable: false })],
    after: () => [roundCardMarkup(state, view), todayMarkup(state, view), tilesMarkup(state, view, { title: `Left in ${name}`, right: "pick one" })],
    day: () => [roundCardMarkup(state, view), view.found ? welcomeMarkup(state, view) : "", tilesMarkup(state, view, { title: `Left in ${name}`, right: "pick one" }), toBeatMarkup(state, view)],
  }[kind]();
  return `<section class="page round-page home-page">
    ${head}
    <div class="result-cards">${parts.join("")}</div>
    ${footMarkup(state, view)}
  </section>`;
}

// The bottom button: Begin round N, Start the picked workout, or (once one is finished
// today and nothing else is picked) Reopen it, quiet. With nothing to start: Program.
function dockMarkup(state) {
  if (page.name !== "home") return "";
  const view = homeView(state);
  if (!view.program || !view.summary.required.length) return `<button class="button primary" type="button" data-view="routines"><span>Go to Program</span></button>`;
  if (view.kind === "complete" || view.kind === "laid") return `<button class="button primary" type="button" data-action="home-begin"><span>Begin ${escapeHtml(roundName({ number: view.round.number, block: 1 }).toLowerCase())}</span></button>`;
  if (view.kind === "after") {
    const routine = routineById(state, view.lastToday);
    return routine ? `<button class="button" type="button" data-action="round-reopen" data-id="${escapeHtml(routine.id)}"><span>Reopen ${escapeHtml(routine.name)}</span></button>` : "";
  }
  if (view.kind !== "day" || !view.picked) return "";
  return `<button class="button primary" type="button" data-action="round-start" data-id="${escapeHtml(view.picked.id)}"><span>Start ${escapeHtml(view.picked.name)}</span></button>`;
}

// ---------- Rounds and blocks ----------

// A break of three weeks or more, between two rounds or two blocks: one quiet line.
const gapMarkup = (days) => (days >= 21 ? `<p class="hint round-gap">${Math.floor(days / 7)} weeks off</p>` : "");

// "17 Aug – 30 Sep", with the year once at the end when it isn't this one.
function blockDates(fromKey, toKey) {
  const year = fromKey.slice(0, 4);
  if (year !== toKey.slice(0, 4) || year === String(new Date().getFullYear())) return datesShort(fromKey, toKey);
  const plain = (dateKey) => formatDate(dateFromKey(dateKey), { day: "numeric", month: "short" });
  return fromKey === toKey ? dayMonth(fromKey) : `${plain(fromKey)} – ${plain(toKey)} ${year}`;
}

// One round in a list: its number (outlined while open), the program with its dates and
// weeks, "X of Y" with how it ended. `from` says which page it was opened from.
function roundRow(record, from) {
  const to = record.open ? localDateKey() : record.to;
  const dates = !record.workouts.length ? (record.open ? "Not started yet" : "No workouts left") : record.open ? `from ${dayMonth(record.from)}` : datesShort(record.from, record.to);
  const weeks = record.workouts.length ? weeksShort(record.from, to) : "";
  const count = `${record.done} of ${record.required}`;
  return `<button class="row round-cols" type="button" data-action="round-page" data-page="one" data-number="${record.number}" data-block="${record.block}" data-from="${from}"
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
}

// A block's rounds, newest first, with a line where a break of three weeks or more falls.
const roundRows = (block, from) => block.rounds.map((record, index) => {
  const newer = block.rounds[index - 1];
  return `${newer?.workouts.length && record.to ? gapMarkup(daysBetween(record.to, newer.from)) : ""}${roundRow(record, from)}`;
}).join("");

// When a block ran: "since Mon 2 Nov" while open, its dates once closed.
const blockWhen = (block) => (!block.workouts.length ? (block.open ? "not started yet" : "no workouts left") : block.open ? `since ${shortDate(block.from)}` : blockDates(block.from, block.to));

function allMarkup(state) {
  const blocks = allBlocks(state);
  const summary = roundSummary(state);
  // The two rare round actions, while nothing runs; "End round" once something is done in it.
  const actions = summary.counting && !activeWorkout(state) ? `<p class="round-actions">
      ${summary.workouts.length ? `<button class="link-button" type="button" data-action="round-end">End round ${summary.number} now</button>` : ""}
      <button class="link-button" type="button" data-action="round-number-open">Change round number</button>
    </p>` : "";
  const groups = blocks.map((block, index) => {
    const when = blockWhen(block);
    return `${index ? gapMarkup(blocks[index - 1].gapBefore) : ""}
    <section>
      <button class="row compact round-block" type="button" data-action="round-page" data-page="block" data-block="${block.block}" aria-label="Block ${block.block}, ${escapeHtml(when)}, ${plural(block.rounds.length, "round")}. Open the block.">
        <span class="row-title">Block ${block.block}</span>
        <span class="row-meta">${escapeHtml(when)} · ${plural(block.rounds.length, "round")}</span>
        <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
      </button>
      ${roundRows(block, "all")}
    </section>`;
  });
  return `<section class="page round-page">
    <header class="page-back">${backMarkup("home", "Round")}<h1 class="title">Rounds and blocks</h1>${actions}</header>
    ${blocks.length ? groups.join("") : `<p class="hint round-note">No rounds yet.</p>`}
  </section>`;
}

// ---------- one block ----------

const ordinal = (number) => `${number}${[11, 12, 13].includes(number % 100) ? "th" : ["th", "st", "nd", "rd"][number % 10] || "th"}`;
const ENDING_ORDER = ["complete", "early", "break", "switch"];

// `before`: the block before it, if any.
function blockMarkup(state, block, before) {
  const todayKey = localDateKey();
  const started = block.workouts.length > 0;
  const to = block.open ? todayKey : block.to;
  const days = started ? daysBetween(block.from, to) + 1 : 0;
  const open = block.rounds.find((record) => record.open);
  const counted = block.workouts.filter((item) => !item.guest && !item.optional).length;
  const extras = block.workouts.length - counted;
  const bests = newBests(state, block.workouts);
  // A value of several parts wraps only between them.
  const parts = (items, joint) => items.filter(Boolean).map((item, index, all) => `<span class="nowrap">${escapeHtml(item)}${index < all.length - 1 ? joint : ""}</span>`).join(" ");
  // How its rounds ended: "3 · 1 complete, 1 ended early, 1 open".
  const endings = ENDING_ORDER.filter((ended) => block.endings[ended]).map((ended) => `${block.endings[ended]} ${ENDED_SHORT[ended]}`);
  if (open) endings.push("1 open");
  const roundsText = block.rounds.length === 1 ? `1, ${open ? "open" : ENDED_SHORT[block.rounds[0].ended]}` : `${block.rounds.length} · ${parts(endings, ",")}`;
  // How it started, when that can be told: after a break, with another program.
  const startedHow = parts([
    block.gapBefore >= 21 ? `after ${Math.floor(block.gapBefore / 7)} weeks off` : "",
    before && before.programs.at(-1) !== block.programs[0] ? "with a new program" : "",
  ], ",");
  const dates = !started ? "" : block.from === to ? (block.open ? "today" : shortDate(block.from)) : parts([shortDate(block.from), block.open ? "today" : shortDate(block.to)], " –");
  const segments = [...block.rounds].reverse().map((record) => (record.open ? "" : record.ended === "complete" ? "is-done" : "is-short"));
  return `<section class="page round-page">
    <header class="round-head">
      <div class="round-top">${backMarkup("all", "Rounds and blocks")}</div>
      <div class="round-title">
        <h1>Block ${block.block}</h1>
        <span>${escapeHtml(weekTitle(started ? block.from : todayKey, started ? to : todayKey))}</span>
      </div>
      <div class="round-bar" aria-hidden="true">${segments.map((name) => `<i${name ? ` class="${name}"` : ""}></i>`).join("")}</div>
      <p class="round-facts"><span>${plural(block.rounds.length, "round")}${open ? ` · round ${open.number} open` : ""}</span><span>${escapeHtml(block.open || !started ? blockWhen(block) : `ended ${shortDate(block.to)}`)}</span></p>
    </header>
    <div class="round-lines round-about">
      ${line("Programs", escapeHtml(block.programs.join(", then ")))}
      ${line("Rounds", roundsText)}
      ${line("Workouts", started ? `${counted} done${extras ? `, plus ${plural(extras, "extra")}` : ""}` : "")}
      ${line("Dates", dates)}
      ${started ? line("Lasted", `${plural(days, "day")}${block.open ? ` so far, ${ordinal(Math.floor((days - 1) / 7) + 1)} week` : ""}`) : ""}
      ${started ? line("Calendar weeks", escapeHtml(weeksText(block.from, to))) : ""}
      ${line("Training time", block.minutes ? durationText(block.minutes) : "")}
      ${line("New bests", bests ? String(bests) : "")}
      ${line("Started", startedHow)}
    </div>
    <section>
      <div class="label section-label"><span>Rounds</span></div>
      ${roundRows(block, "block")}
    </section>
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
    // Back to where it was opened from: its block's page, the round page, or Rounds and blocks.
    top: `<div class="round-top">${page.from === "home" ? backMarkup("home", "Round") : page.from === "block"
      ? `<button class="link-button" type="button" data-action="round-page" data-page="block" data-block="${record.block}" aria-label="Back to Block ${record.block}">${chevronIcon("left")}Block ${record.block}</button>`
      : backMarkup("all", "Rounds and blocks")}</div>`,
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
  if (page.name === "block") {
    const blocks = allBlocks(state);
    const index = blocks.findIndex((item) => item.block === page.block);
    if (index >= 0) return blockMarkup(state, blocks[index], blocks[index + 1]);
    page.name = "all"; // the block is gone (another backup was imported)
  }
  return page.name === "all" ? allMarkup(state) : homeMarkup(state);
}

// Another page of the tab. Going deeper starts at the top; coming back returns to
// where the page was left. What is swapped in fades in.
function showPage(name, { number = 0, block = 0, from = "" } = {}) {
  if (name === page.name && number === page.number && block === page.block) return;
  const main = mainElement();
  page.scroll[page.name] = main.scrollTop;
  const back = DEPTH[name] < DEPTH[page.name];
  Object.assign(page, { name, number, block, from });
  // A deeper page comes in from the right; going back, the page returns from the left.
  withMotion(back ? "pop" : "push", () => {
    render();
    main.scrollTop = back ? page.scroll[name] || 0 : 0;
  });
  pauseTaps();
}

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

// Leaves Home as it was: the tile picked by the owner and the answer to a break are forgotten.
function forgetPick() {
  Object.assign(home, { pickId: "", restart: false });
}

registerView("round", {
  markup,
  dock: dockMarkup,
  // The Workout tab opens the workout in progress, when there is one.
  landing: (state) => (activeWorkout(state) ? "workout" : ""),
  // Back from the workout or from a result: the round page, at its first page.
  arrive(from) {
    if (from !== "workout" && from !== "result") return;
    Object.assign(page, { name: "home", number: 0, block: 0, from: "" });
    forgetPick();
  },
  // Going back (a drag from the left edge): one round returns to where it was opened from
  // (its block, the round page or Rounds and blocks), a block to Rounds and blocks, that to
  // the tab's first page, each to where it was left.
  back() {
    if (page.name === "home") return null;
    const from = { name: page.name, number: page.number, block: page.block, from: page.from };
    const to = page.name === "one" ? (page.from === "block" ? "block" : page.from === "home" ? "home" : "all") : page.name === "block" ? "all" : "home";
    return {
      apply() {
        Object.assign(page, { name: to, number: 0, block: to === "block" ? page.block : 0, from: "" });
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
  "round-page": (button) => showPage(button.dataset.page, { number: Number(button.dataset.number) || 0, block: Number(button.dataset.block) || 0, from: button.dataset.from || "" }),
  // − and +: only the number and the buttons' state change.
  "round-number-step": (button) => {
    chooser.number = Math.min(999, Math.max(1, chooser.number + Number(button.dataset.step)));
    clearError(); // a refused number no longer stands
    const box = button.closest("[data-round-chooser]");
    $("[data-round-number]", box).textContent = chooser.number;
    $("[data-step='-1']", box).disabled = chooser.number <= 1;
    $("[data-step='1']", box).disabled = chooser.number >= 999;
  },
  // Another workout picked: the lifts to beat, today's square and the bottom button follow.
  "home-pick": (button) => {
    if (button.getAttribute("aria-pressed") === "true" && home.pickId) return;
    home.pickId = button.dataset.id;
    render();
  },
  // The round laid out is begun: the training day comes (nothing is saved).
  "home-begin": () => {
    const summary = roundSummary(store.getState());
    begunNow.add(roundKey(summary));
    rememberBegun(summary);
    render();
    pauseTaps();
    fresh(...mainElement().children);
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
  // After a long break an extra answers it as the switch says, as Start does.
  "round-guest-start": (button) => {
    const result = store.update((draft) => startTodaysWorkout(draft, button.dataset.id, { guest: true, restart: home.restart }));
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

// The card of the workout in progress says how long it has run; it keeps up.
setInterval(() => {
  const running = activeWorkout(store.getState());
  const label = $("[data-round-elapsed]");
  if (running && label) label.textContent = `${Math.max(0, Math.floor((Date.now() - running.startedAt) / 60000))} min`;
}, 20000);
