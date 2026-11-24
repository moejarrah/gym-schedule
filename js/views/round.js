// Round tab, the app's home: where the open round stands (header and bar), the one
// card that says what to do next, the round's workouts and the "More" rows. Two pages
// open inside the tab, each with a back link: All rounds, and one round. One sheet
// (#roundSheet) is behind three of the More rows: a workout from another program,
// following a different program (also opened from Program with "follow-program"), and
// changing the round number. What a round is: js/model.js, "rounds and calendar weeks".

import { mainElement, navigate, registerActions, registerView, render, store, withMotion } from "../context.js";
import { $, chevronIcon, clearError, closeDialog, confirmAction, escapeHtml, formatDate, fresh, openDialog, plural, redraw, report, toast } from "../dom.js";
import {
  activeWorkout,
  allBlocks,
  answerBreak,
  calendarWeek,
  dateFromKey,
  dayExtras,
  endRound,
  followProgram,
  isEntryChecked,
  lastFinished,
  localDateKey,
  longBreak,
  openRound,
  orderedEntries,
  programRoutines,
  roundProgram,
  roundRecord,
  roundSummary,
  routineById,
  routineProgram,
  setActiveRoutine,
  setRoundNumber,
  startGuestWorkout,
  startNewBlock,
  startWorkout,
  workoutName,
} from "../model.js";
import { exerciseProgress } from "../progress.js";
import { roundName, shortDate, weeksText } from "./shared.js";

// Which page of the tab shows: "home", "all" (Rounds and blocks), "block" (the block
// `block`) or "one" (the round `number` of `block`; `from` "block" when it was opened from
// its block's page, which is where it goes back to). `scroll` remembers where a page was
// left, for coming back to it.
const page = { name: "home", number: 0, block: 0, from: "", scroll: {} };
const DEPTH = { home: 0, all: 1, block: 2, one: 3 };
// The round number being picked with − and +: on the first-time card, and in the sheet.
// `picking`: the owner changed it on the first-time card, so it isn't put back to 1.
const chooser = { number: 1, picking: false };
const chooserDone = () => Object.assign(chooser, { number: 1, picking: false });
// What the sheet shows: "guest", "programs", "follow" (for programId) or "number".
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
function headMarkup({ top, round, week, segments, left, right, live = false }) {
  const { title, suffix } = roundTitle(round);
  return `<header class="round-head">
    ${top}
    <div class="round-title">
      <h1><span${live ? " data-round-title" : ""}>${escapeHtml(title)}</span>${suffix ? `<small>${escapeHtml(suffix)}</small>` : ""}</h1>
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

// ---------- the card ----------

const cardMarkup = (kicker, title, body, actions) => `<section class="card round-card round-lines" id="roundCard" aria-labelledby="roundCardTitle">
    <p class="label">${escapeHtml(kicker)}</p>
    <h2 id="roundCardTitle">${escapeHtml(title)}</h2>
    ${body}
    ${actions ? `<div class="actions stacked">${actions}</div>` : ""}
  </section>`;

// No Start for a workout already finished today: starting it again would reopen that one.
const startButton = (state, routine, primary = true) => (state.sessions[localDateKey()]?.routineIds.includes(routine.id) ? "" : `<button class="button ${primary ? "primary" : ""}" type="button" data-action="round-start" data-id="${escapeHtml(routine.id)}">Start ${escapeHtml(routine.name)}</button>`);

// Today's finished workouts can be reopened from the card (a mistake, a forgotten set).
const reopenLinks = (state) => (state.sessions[localDateKey()]?.routineIds || []).filter((routineId) => routineById(state, routineId))
  .map((routineId) => `<button class="link-button" type="button" data-action="round-reopen" data-id="${escapeHtml(routineId)}">Reopen ${escapeHtml(routineById(state, routineId).name)}</button>`).join("");

const lastDone = (state, routine) => {
  const dateKey = lastFinished(state, routine.id, LATER);
  return dateKey ? escapeHtml(shortDate(dateKey)) : "Never";
};

function runningCard(state, running) {
  const routine = routineById(state, running.routineId);
  const todayKey = localDateKey();
  const slots = [...orderedEntries(routine), ...dayExtras(state, running.dateKey, routine.id)];
  const done = slots.filter((slot) => isEntryChecked(state, running.dateKey, routine.id, slot.id)).length;
  const timed = !running.reopened && !running.backdated && running.dateKey === todayKey;
  return cardMarkup("In progress", routine.name, `
    ${running.guest ? line("From", escapeHtml(routineProgram(state, routine.id)?.name || "")) : ""}
    ${timed ? line("Started", `<span data-round-elapsed>${agoText(running.startedAt)}</span>`) : line("Day", escapeHtml(shortDate(running.dateKey)))}
    ${line("Exercises", `${done} of ${slots.length} done`)}`,
  `<button class="button primary" type="button" data-action="round-go-workout">Go to workout</button>`);
}

function firstTimeCard(summary) {
  return cardMarkup("Rounds", "Count your rounds", `
    <p>A round is one pass through ${escapeHtml(listText(summary.required.map((routine) => routine.name)))}, in any order, over as many days as it takes.</p>
    ${line("You are on round", chooserMarkup(), "round-number-line")}`,
  `<button class="button primary" type="button" data-action="round-count-start">Start counting</button>`);
}

function breakCard(state, found) {
  const round = openRound(state);
  const summary = roundSummary(state);
  const next = found.open ? found.lastRound + 1 : round.number;
  return cardMarkup(`${plural(found.weeks, "week")} away`, "Welcome back", `
    ${line("Last workout", escapeHtml(shortDate(found.lastDay)))}
    ${found.open ? line(`Round ${found.lastRound}`, escapeHtml(workoutsDone(summary.required.length - summary.remaining.length, summary.required.length))) : ""}
    ${line("Carry on", found.open ? `Round ${found.lastRound} ends at the break` : `Round ${next}`)}
    ${line("Start again", escapeHtml(roundName({ number: 1, block: round.block + 1 })))}`,
  `<button class="button primary" type="button" data-action="round-answer-break">Carry on with round ${next}</button>
    <button class="button" type="button" data-action="round-answer-break" data-restart="yes">Start again at round 1</button>`);
}

function completeCard(state, record, next) {
  const extras = record.workouts.filter((item) => item.guest || item.optional).length;
  const bests = newBests(state, record.workouts);
  return cardMarkup("Round complete", roundName(record), `
    ${record.from ? line("Took", plural(daysBetween(record.from, record.to) + 1, "day")) : ""}
    ${record.from ? line("Calendar weeks", escapeHtml(weeksText(record.from, record.to))) : ""}
    ${line("Training time", record.minutes ? durationText(record.minutes) : "")}
    ${line("New bests", bests ? String(bests) : "")}
    ${line("Extras", extras ? plural(extras, "workout") : "")}
    ${next ? line("Next", escapeHtml(next.name)) : ""}`,
  `${next ? startButton(state, next) : ""}${reopenLinks(state)}`);
}

function doneTodayCard(state, doneToday, next) {
  const todayKey = localDateKey();
  const minutes = doneToday.reduce((sum, routineId) => sum + (state.sessions[todayKey].workouts[routineId]?.minutes || 0), 0);
  return cardMarkup("Done today", listText(doneToday.map((routineId) => workoutName(state, todayKey, routineId))), `
    ${line("Training time", minutes ? durationText(minutes) : "")}
    ${next ? line("Next", escapeHtml(next.name)) : ""}`,
  // Today's work is done: starting the next one is there, but it isn't the thing to do.
  `${next ? startButton(state, next, false) : ""}${reopenLinks(state)}`);
}

function roundCard(state, summary) {
  const running = activeWorkout(state);
  if (running) return runningCard(state, running);
  if (!summary.required.length) return "";
  if (!summary.counting) return firstTimeCard(summary);
  const found = longBreak(state);
  if (found) return breakCard(state, found);
  const next = summary.remaining[0];
  const completed = justCompleted(state, summary);
  if (completed) return completeCard(state, completed, next);
  const doneToday = state.sessions[localDateKey()]?.routineIds || [];
  if (doneToday.length) return doneTodayCard(state, doneToday, next);
  return next ? cardMarkup("Next workout", next.name, line("Last done", lastDone(state, next)), startButton(state, next)) : "";
}

// ---------- the Round tab ----------

// A workout that was done: ticked, muted, its date at the end; it opens its day.
const doneRow = (name, dateKey, tag = "") => `<button class="row compact round-row is-done" type="button" data-action="open-day" data-date="${dateKey}" aria-label="${escapeHtml(name)}${tag ? `, ${escapeHtml(tag)}` : ""}, done ${escapeHtml(shortDate(dateKey))}. Open that day.">
    <span class="tickbox is-ticked" aria-hidden="true">${tickIcon}</span>
    <span class="row-main"><span class="row-title">${escapeHtml(name)}</span></span>
    ${tag ? `<span class="label tag">${escapeHtml(tag)}</span>` : ""}
    <span class="row-meta">${escapeHtml(shortDate(dateKey))}</span>
  </button>`;

// What a workout that didn't count is tagged with: its program's name, or "Optional".
const workoutTag = (item) => (item.guest ? item.program || "Another program" : item.optional ? "Optional" : "");

function workoutsMarkup(state, summary) {
  const running = activeWorkout(state);
  const doneOn = new Map();
  for (const item of summary.workouts) if (!item.guest && !doneOn.has(item.routineId)) doneOn.set(item.routineId, item.dateKey);
  const requiredIds = new Set(summary.required.map((routine) => routine.id));
  const nextId = running || longBreak(state) ? "" : summary.remaining[0]?.id;
  // A workout not done yet: its number (none for an Optional one), its name, a tag.
  const openRow = (routine, number, tag) => {
    const box = `<span class="tickbox" aria-hidden="true">${number}</span>`;
    const name = `<span class="row-main"><span class="row-title truncate">${escapeHtml(routine.name)}</span></span>`;
    const label = tag ? `<span class="label tag">${tag}</span>` : "";
    // While a workout runs nothing else can be started: the other rows are quiet.
    if (running) return `<div class="row compact round-row ${running.routineId === routine.id ? "" : "is-quiet"}">${box}${name}${running.routineId === routine.id ? `<span class="label accent">In progress</span>` : label}</div>`;
    return `<button class="row compact round-row" type="button" data-action="round-open-workout" data-id="${escapeHtml(routine.id)}" aria-label="${escapeHtml(routine.name)}, not done${tag ? `, ${tag.toLowerCase()}` : ""}. Open it on Workout.">
      ${box}${name}${label}
      <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
    </button>`;
  };
  const rows = summary.required.map((routine, index) => (doneOn.has(routine.id) ? doneRow(routine.name, doneOn.get(routine.id)) : openRow(routine, index + 1, routine.id === nextId ? "Next" : "")));
  // Optional workouts are never asked for, but they can be done: they follow the required ones.
  const optional = programRoutines(state, summary.program).filter((routine) => !requiredIds.has(routine.id) && !summary.workouts.some((item) => item.routineId === routine.id && !item.guest));
  return `<section>
    <div class="label section-label"><span>Workouts in this round</span></div>
    ${rows.join("")}
    ${optional.map((routine) => openRow(routine, "", "Optional")).join("")}
    ${summary.workouts.filter((item) => item.guest || !requiredIds.has(item.routineId)).map((item) => doneRow(item.name, item.dateKey, workoutTag(item))).join("")}
    ${running ? `<p class="hint round-note">Finish or cancel ${escapeHtml(routineById(state, running.routineId).name)} before starting another workout.</p>` : ""}
  </section>`;
}

const moreRow = (name, action, end = "") => `<button class="row compact" type="button" ${action}>
    <span class="row-main"><span class="row-title">${escapeHtml(name)}</span></span>
    ${end ? `<span class="row-meta">${escapeHtml(end)}</span>` : ""}
    <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
  </button>`;

function moreMarkup(state, summary) {
  const rows = [];
  const earlier = (state.settings.roundLog || []).length;
  if (summary.counting) rows.push(moreRow("All rounds", `data-action="round-page" data-page="all"`, earlier ? `${earlier} earlier` : ""));
  if (!activeWorkout(state)) {
    // Only what can be used now is listed: the two about other programs need another
    // program, and a round with nothing done in it has nothing to end.
    const others = otherPrograms(state);
    if (others.some((program) => program.routineIds.length)) rows.push(moreRow("A workout from another program", `data-action="round-guest-open"`));
    if (others.length) rows.push(moreRow("Follow a different program", `data-action="follow-program"`));
    if (summary.counting && summary.workouts.length) rows.push(moreRow(`End round ${summary.number} now`, `data-action="round-end"`));
    if (summary.counting) rows.push(moreRow("Change round number", `data-action="round-number-open"`));
  }
  return rows.length ? `<section><div class="label section-label"><span>More</span></div>${rows.join("")}</section>` : "";
}

function homeMarkup(state) {
  const program = roundProgram(state);
  const summary = roundSummary(state);
  if (!program || !summary.required.length) {
    const running = activeWorkout(state);
    return `<section class="page round-page">
      <header class="round-head">${followingMarkup(program)}</header>
      ${running ? runningCard(state, running) : ""}
      <div class="empty">
        <h2>${program ? "No Required workouts" : "No program yet"}</h2>
        <p>${program ? `A round is one pass through a program's Required workouts, and ${escapeHtml(program.name)} has none. Add a workout, or make one Required, on the Program tab.` : "Add a program on the Program tab. Its Required workouts make up a round."}</p>
        <button class="button ${running ? "" : "primary"}" type="button" data-view="routines">Go to Program</button>
      </div>
    </section>`;
  }
  const done = summary.required.length - summary.remaining.length;
  // The first-time card starts at round 1 unless the owner has changed it there.
  if (!summary.counting && !chooser.picking) chooser.number = 1;
  return `<section class="page round-page">
    ${headMarkup({
    top: followingMarkup(program),
    round: summary.counting ? summary : { number: chooser.number, block: 1 },
    live: !summary.counting,
    week: weekTitle(localDateKey()),
    segments: summary.required.map((routine) => summary.done.has(routine.id)),
    left: workoutsDone(done, summary.required.length),
    right: summary.started ? `started ${shortDate(summary.started)}` : summary.counting ? "not started yet" : "not counting yet",
  })}
    ${roundCard(state, summary)}
    ${workoutsMarkup(state, summary)}
    ${moreMarkup(state, summary)}
  </section>`;
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
    // Back to where it was opened from: its block's page, or Rounds and blocks.
    top: `<div class="round-top">${page.from === "block"
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

// What was just tapped has been replaced by something else in the same place, so the
// second tap of a double tap would land on a control the owner never saw: the screen
// ignores taps for a moment (it still scrolls).
let quietUntil = 0;
const pauseTaps = () => { quietUntil = performance.now() + 400; };
mainElement().addEventListener("click", (event) => {
  if (performance.now() >= quietUntil) return;
  event.preventDefault();
  event.stopPropagation();
}, true);

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

// The card changed in place (counting started, the break was answered): it fades in.
function redrawCard() {
  render();
  fresh("#roundCard");
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

function programsMarkup(state) {
  const home = roundProgram(state);
  return `<div class="sheet-panel">
    ${sheetHead("Follow a different program", `You follow ${home.name}.`)}
    <div class="sheet-body" data-keep-scroll="round-sheet">
      ${otherPrograms(state).map((program) => `<button class="row" type="button" data-action="follow-program" data-id="${escapeHtml(program.id)}">
        <span class="row-main"><span class="row-title truncate">${escapeHtml(program.name)}</span><span class="row-meta">${plural(programRoutines(state, program).filter((routine) => routine.status !== "optional").length, "Required workout")}</span></span>
        <span class="chev" aria-hidden="true">${chevronIcon("right")}</span>
      </button>`).join("")}
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

function numberMarkup(state) {
  const summary = roundSummary(state);
  return `<div class="sheet-panel">
    ${sheetHead("Change round number", `You are on ${roundName(summary).toLowerCase()} of ${summary.program.name}.`)}
    <div class="sheet-body round-lines">
      ${line("Round", chooserMarkup(), "round-number-line")}
      <p class="hint">${summary.workouts.length ? "The workouts already done in this round move with it." : "Nothing is done in this round yet."}</p>
      ${errorLine}
    </div>
    <footer class="actions stacked">
      <button class="button primary" type="button" data-action="round-number-save">Save round number</button>
      <button class="link-button" type="button" data-action="round-new-block">Start a new block at round 1</button>
    </footer>
  </div>`;
}

const SHEETS = { guest: guestMarkup, programs: programsMarkup, follow: followMarkup, number: numberMarkup };

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

// Counting starts by itself with the first workout, at the number shown (1 unless changed).
const startCounting = (draft) => {
  if (!openRound(draft)) setRoundNumber(draft, chooser.number);
};

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

registerView("round", {
  markup,
  // Going back (a drag from the left edge): one round returns to where it was opened from
  // (its block or Rounds and blocks), a block to Rounds and blocks, that to the tab's first
  // page, each to where it was left.
  back() {
    if (page.name === "home") return null;
    const from = { name: page.name, number: page.number, block: page.block, from: page.from };
    const to = page.name === "one" ? (page.from === "block" ? "block" : "all") : page.name === "block" ? "all" : "home";
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
  // − and +: only the number, the title that repeats it and the buttons' state change.
  "round-number-step": (button) => {
    chooser.number = Math.min(999, Math.max(1, chooser.number + Number(button.dataset.step)));
    chooser.picking = !openRound(store.getState());
    clearError(); // a refused number no longer stands
    const box = button.closest("[data-round-chooser]");
    $("[data-round-number]", box).textContent = chooser.number;
    $("[data-step='-1']", box).disabled = chooser.number <= 1;
    $("[data-step='1']", box).disabled = chooser.number >= 999;
    const title = $("[data-round-title]");
    if (title) title.textContent = roundName({ number: chooser.number, block: 1 });
  },
  "round-count-start": () => {
    if (!report(store.update(startCounting))) return;
    chooserDone();
    redrawCard();
  },
  "round-start": (button) => {
    const { id } = button.dataset;
    const result = store.update((draft) => {
      startCounting(draft);
      setActiveRoutine(draft, id);
      startWorkout(draft, id);
    });
    if (!report(result)) return;
    chooserDone();
    navigate("workout", { motion: "push" });
    pauseTaps();
  },
  // Today's finished workout, open again: it stays in the round it was filed in.
  "round-reopen": (button) => {
    if (!report(store.update((draft) => startWorkout(draft, button.dataset.id)))) return;
    navigate("workout", { motion: "push" });
    pauseTaps();
  },
  // The Workout tab shows the workout in progress, whatever is selected.
  "round-go-workout": () => navigate("workout", { motion: "push" }),
  // A workout not done yet opens on Workout, ready to start.
  "round-open-workout": (button) => {
    if (report(store.update((draft) => setActiveRoutine(draft, button.dataset.id)))) navigate("workout", { motion: "push" });
  },
  "round-answer-break": (button) => {
    if (report(store.update((draft) => answerBreak(draft, Boolean(button.dataset.restart))))) redrawCard();
  },
  "round-guest-open": () => {
    if (nothingRunning()) showSheet("guest");
  },
  "round-guest-start": (button) => {
    const result = store.update((draft) => {
      startCounting(draft);
      startGuestWorkout(draft, button.dataset.id);
    });
    if (!report(result)) return;
    chooserDone();
    closeDialog("#roundSheet");
    navigate("workout");
    pauseTaps();
  },
  // With data-id (the Program tab's "Follow <name>", or a row of the list here): what
  // following that program will do, to confirm. Without: the other programs to pick from.
  "follow-program": (button) => {
    if (!nothingRunning()) return;
    const state = store.getState();
    const program = state.programs.find((item) => item.id === button.dataset.id);
    if (program && program === roundProgram(state)) toast(`You already follow ${program.name}.`);
    else if (program) showSheet("follow", { programId: program.id });
    else if (otherPrograms(state).length) showSheet("programs");
    else toast("Add another program first.");
  },
  "round-follow": (button) => {
    if (!report(store.update((draft) => followProgram(draft, sheet.programId, { newBlock: Boolean(button.dataset.newBlock) })))) return;
    closeDialog("#roundSheet");
    render();
    pauseTaps();
    // On the Round tab the header, card and list all changed in place; Program draws its own.
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
    chooserDone();
    if (!changed) return;
    render();
    fresh(...mainElement().children);
  },
  "round-new-block": newBlock,
});

// The "In progress" card says how long ago the workout started; it keeps up.
setInterval(() => {
  const running = activeWorkout(store.getState());
  const label = $("[data-round-elapsed]");
  if (running && label) label.textContent = agoText(running.startedAt);
}, 20000);
