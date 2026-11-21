// Exercise progress sheet (#historyDialog): how a master exercise has gone over
// time, from any routine. A chart of one measure (estimated 1-rep max, best set or
// volume, picked with the switch), the exercise's bests, and every session newest
// first with its change from the one before. Read-only.

import { registerActions, store } from "../context.js";
import { $, escapeHtml, fresh, openDialog, plural, segmentValue } from "../dom.js";
import { exerciseById, fullName } from "../model.js";
import { compareSets, exerciseProgress } from "../progress.js";
import { exerciseMarkup, formatKg, liftText, setChipsMarkup, shortDate } from "./shared.js";

const CHART_SESSIONS = 20;
const MEASURES = {
  strength: { tab: "Strength", title: "Estimated 1-rep max" },
  best: { tab: "Best set", title: "Best set" },
  volume: { tab: "Volume", title: "Volume" },
};

// The exercise the sheet shows and the measure its chart is on.
const sheet = { exerciseId: "", measure: "" };

const round1 = (value) => Math.round(value * 10) / 10;
const scored = (progress) => progress.sessions.filter((session) => session.best);

// Without weight there is no 1-rep max to estimate, and often no volume either.
function measuresFor(progress) {
  return [
    progress.mode === "weight" ? "strength" : "",
    "best",
    progress.sessions.some((session) => session.volume > 0) ? "volume" : "",
  ].filter(Boolean);
}

// What the best-set chart follows: the weight; or, when the load never changed
// (bodyweight, timed), the reps or seconds.
function bestUnit(progress) {
  const loads = new Set(scored(progress).map((session) => session.best.kg ?? 0));
  return progress.mode === "weight" || loads.size > 1 ? "kg" : progress.unit;
}

function measureValue(session, measure, progress) {
  if (measure === "strength") return round1(session.score);
  if (measure === "volume") return session.volume;
  return bestUnit(progress) === "kg" ? session.best.kg ?? 0 : session.best.reps;
}

function valueText(value, unit) {
  if (unit === "kg") return `${Math.abs(value) >= 1000 ? Math.round(value).toLocaleString("en-US") : formatKg(value)} kg`;
  return unit === "sec" ? `${value} s` : plural(value, "rep");
}

const changeMarkup = (change) => `<em class="history-change ${change.kind}">${escapeHtml(change.text)}</em>`;

// The latest session's number for the measure and how it compares with the first session's.
function headlineMarkup(progress, measure) {
  const sessions = scored(progress);
  const first = sessions[0];
  const last = sessions.at(-1);
  const unit = measure === "best" ? bestUnit(progress) : "kg";
  const value = measure === "best" ? liftText(last.best, progress.unit === "sec") : valueText(measureValue(last, measure, progress), unit);
  let change = null;
  if (sessions.length > 1 && measure === "best") {
    change = compareSets(last.sets, first.sets, progress.mode, progress.unit);
  } else if (sessions.length > 1) {
    const difference = round1(measureValue(last, measure, progress) - measureValue(first, measure, progress));
    change = difference ? { kind: difference > 0 ? "up" : "down", text: `${difference > 0 ? "▲" : "▼"} ${valueText(Math.abs(difference), "kg")}` } : { kind: "same", text: "Same" };
  }
  return `<figcaption>
    <span class="label">${MEASURES[measure].title}</span>
    <span class="history-headline"><strong>${escapeHtml(value)}</strong>${change ? changeMarkup(change) : ""}</span>
    <span class="row-meta">${change ? `${change.kind === "same" ? "as" : "since"} the first session` : "&nbsp;"}</span>
    ${measure === "strength" && last.best.reps > 12 ? `<span class="hint">Rough above 12 reps.</span>` : ""}
  </figcaption>`;
}

// A line through the last sessions, with a dot on each one that set a new best.
function lineMarkup(progress, measure) {
  const sessions = scored(progress).slice(-CHART_SESSIONS);
  if (sessions.length < 2) return "";
  const unit = measure === "best" ? bestUnit(progress) : "kg";
  const values = sessions.map((session) => measureValue(session, measure, progress));
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  const width = 300;
  const height = 96;
  const pad = 8;
  const xy = values.map((value, index) => [
    Math.round(pad + (index * (width - 2 * pad)) / (values.length - 1)),
    Math.round(span ? height - pad - ((value - min) / span) * (height - 2 * pad) : height / 2),
  ]);
  const end = (index) => `${valueText(values.at(index), unit)} on ${shortDate(sessions.at(index).dateKey)}`;
  const bests = xy.filter((_, index) => sessions[index].isBest);
  return `<svg role="img" aria-label="${escapeHtml(`${MEASURES[measure].title} from ${end(0)} to ${end(-1)}`)}" viewBox="0 0 ${width} ${height}">
      ${[pad, height / 2, height - pad].map((y) => `<line x1="0" x2="${width}" y1="${y}" y2="${y}"/>`).join("")}
      <polyline points="${xy.map((pair) => pair.join(",")).join(" ")}"/>
      ${bests.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join("")}
    </svg>
    <div class="history-chart-ends">
      <span>${escapeHtml(shortDate(sessions[0].dateKey))}</span>
      ${bests.length ? `<span>● New best</span>` : ""}
      <span>${escapeHtml(shortDate(sessions.at(-1).dateKey))}</span>
    </div>`;
}

function chartMarkup(progress, measure) {
  if (!scored(progress).length) return "";
  return `<figure class="card history-chart" id="historyChart">${headlineMarkup(progress, measure)}${lineMarkup(progress, measure)}</figure>`;
}

function switchMarkup(measures, chosen) {
  if (measures.length < 2) return "";
  return `<div class="segment" data-segment data-value="${chosen}" data-action="history-measure" role="group" aria-label="Chart shows">
    ${measures.map((measure) => `<button type="button" data-value="${measure}" aria-pressed="${measure === chosen}">${MEASURES[measure].tab}</button>`).join("")}
  </div>`;
}

function bestsMarkup(progress) {
  const { top, repsAtWeight } = progress.bests;
  if (!top) return "";
  const row = (name, value, dateKey) => `<div><span>${escapeHtml(name)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(shortDate(dateKey))}</small></div>`;
  return `<section class="card history-bests" aria-labelledby="historyBestsTitle">
    <h3 class="label" id="historyBestsTitle">Bests</h3>
    ${row("Best set", liftText(top.set, progress.unit === "sec"), top.dateKey)}
    ${repsAtWeight.length ? `<p class="label">Most ${progress.unit === "sec" ? "seconds" : "reps"} at each weight</p>
      ${repsAtWeight.map((best) => row(`${formatKg(best.kg)} kg`, valueText(best.reps, progress.unit), best.dateKey)).join("")}` : ""}
  </section>`;
}

function sessionMarkup(progress, item, older) {
  const change = older?.best && item.best ? compareSets(item.sets, older.sets, progress.mode, item.unit) : null;
  return `<article class="card history-session">
    <header>
      <strong class="row-title">${escapeHtml(shortDate(item.dateKey))}</strong>
      <span class="row-meta truncate">${escapeHtml(item.routineName)}</span>
      ${item.isBest ? `<span class="label tag accent">Best</span>` : ""}
      ${change ? changeMarkup(change) : ""}
    </header>
    <div class="set-chips">${setChipsMarkup(item.sets, { timed: item.unit === "sec" })}</div>
    ${item.note ? `<p class="hint">${escapeHtml(item.note)}</p>` : ""}
  </article>`;
}

function historyMarkup(state, exerciseId, measure) {
  const exercise = exerciseById(state, exerciseId);
  const progress = exerciseProgress(state, exerciseId);
  const { sessions } = progress;
  const newestFirst = sessions.map((item, index) => sessionMarkup(progress, item, sessions[index - 1])).reverse();
  return `<div class="sheet-panel">
    <header class="sheet-head">
      <div><h2 id="historyTitle" aria-label="${escapeHtml(exercise ? fullName(exercise) : "Exercise")}">${exerciseMarkup(exercise, "Exercise")}</h2><p>${sessions.length ? `${plural(sessions.length, "session")} since ${escapeHtml(shortDate(sessions[0].dateKey))}` : "History"}</p></div>
      <button class="icon-button" type="button" data-close-dialog="historyDialog" aria-label="Close history">×</button>
    </header>
    <div class="sheet-body stack tight">
      ${sessions.length ? `${switchMarkup(measuresFor(progress), measure)}${chartMarkup(progress, measure)}${bestsMarkup(progress)}
        <section aria-labelledby="historySessionsTitle" class="stack snug"><h3 class="label" id="historySessionsTitle">Sessions</h3>${newestFirst.join("")}</section>`
        : `<p class="hint">No sets logged for this exercise yet. Tap an exercise's number on Workout to log one.</p>`}
    </div>
  </div>`;
}

export function openExerciseHistory(exerciseId) {
  const state = store.getState();
  sheet.exerciseId = exerciseId;
  sheet.measure = measuresFor(exerciseProgress(state, exerciseId))[0];
  $("#historyContent").innerHTML = historyMarkup(state, exerciseId, sheet.measure);
  openDialog("#historyDialog");
}

registerActions({
  // The switch changes the chart only; the rest of the sheet stays where it is.
  "history-measure": (group) => {
    if (sheet.measure === segmentValue(group)) return;
    sheet.measure = segmentValue(group);
    $("#historyChart").outerHTML = chartMarkup(exerciseProgress(store.getState(), sheet.exerciseId), sheet.measure);
    fresh("#historyChart");
  },
});
