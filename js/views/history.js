// Exercise history sheet: every logged session of a master exercise from any
// routine, newest first, with its best set, heaviest weight, the change since the
// first session and a small trend of the top set's weight. Read-only.

import { store } from "../context.js";
import { $, escapeHtml, openDialog, plural } from "../dom.js";
import { exerciseById, exerciseHistory, routineById } from "../model.js";
import { formatKg, liftText, setChipsMarkup, shortDate } from "./shared.js";

// The heaviest set of a session (most reps breaks a tie); sets without weight count as 0 kg.
function topSet(sets) {
  return sets.reduce((best, set) => {
    const kg = set.kg ?? 0;
    const bestKg = best.kg ?? 0;
    return kg > bestKg || (kg === bestKg && set.reps > best.reps) ? set : best;
  });
}

function round(value) {
  return Math.round(value * 100) / 100;
}

// "▲ 2.5 kg", "▼ 1 rep" or "Same", comparing two sessions' top sets.
function change(newer, older) {
  const a = topSet(newer);
  const b = topSet(older);
  const kg = round((a.kg ?? 0) - (b.kg ?? 0));
  if (kg) return { kind: kg > 0 ? "up" : "down", text: `${kg > 0 ? "▲" : "▼"} ${formatKg(Math.abs(kg))} kg` };
  const reps = a.reps - b.reps;
  if (reps) return { kind: reps > 0 ? "up" : "down", text: `${reps > 0 ? "▲" : "▼"} ${plural(Math.abs(reps), "rep")}` };
  return { kind: "same", text: "Same" };
}

function trendMarkup(sessions) {
  const points = sessions.slice(0, 12).reverse().map((item) => ({ dateKey: item.dateKey, kg: topSet(item.sets).kg }))
    .filter((point) => point.kg !== null);
  if (points.length < 2) return "";
  const values = points.map((point) => point.kg);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const width = 300;
  const height = 72;
  const xy = points.map((point, index) => [
    Math.round(8 + (index * (width - 16)) / (points.length - 1)),
    Math.round(height - 8 - ((point.kg - min) / span) * (height - 16)),
  ]);
  const first = points[0];
  const last = points.at(-1);
  return `<figure class="history-trend">
    <figcaption>Top set weight</figcaption>
    <svg role="img" aria-label="Top set weight from ${formatKg(first.kg)} kg on ${escapeHtml(shortDate(first.dateKey))} to ${formatKg(last.kg)} kg on ${escapeHtml(shortDate(last.dateKey))}" viewBox="0 0 ${width} ${height}">
      <polyline points="${xy.map((pair) => pair.join(",")).join(" ")}"/>
      <circle cx="${xy.at(-1)[0]}" cy="${xy.at(-1)[1]}" r="4"/>
    </svg>
    <div class="history-trend-ends"><span>${formatKg(first.kg)} kg · ${escapeHtml(shortDate(first.dateKey))}</span><span>${formatKg(last.kg)} kg · ${escapeHtml(shortDate(last.dateKey))}</span></div>
  </figure>`;
}

function statsMarkup(sessions) {
  const best = topSet(sessions.flatMap((item) => item.sets));
  const timed = sessions.find((item) => item.sets.includes(best)).unit === "sec";
  const weights = sessions.flatMap((item) => item.sets.map((set) => set.kg)).filter((kg) => kg !== null);
  const since = sessions.length > 1 ? change(sessions[0].sets, sessions.at(-1).sets) : null;
  const tile = (label, value, kind = "") => `<div class="history-stat ${kind}"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`;
  return `<div class="history-stats">
    ${tile("Best set", liftText(best, timed))}
    ${tile("Heaviest", weights.length ? `${formatKg(Math.max(...weights))} kg` : "—")}
    ${tile("Since first", since ? since.text : "—", since?.kind || "")}
  </div>`;
}

function sessionMarkup(state, item, older) {
  const routine = routineById(state, item.routineId);
  const delta = older ? change(item.sets, older.sets) : null;
  return `<article class="history-session">
    <header>
      <strong>${escapeHtml(shortDate(item.dateKey))}</strong>
      <span>${escapeHtml(routine?.name || "Deleted routine")}</span>
      ${delta ? `<em class="history-change ${delta.kind}">${escapeHtml(delta.text)}</em>` : ""}
    </header>
    <div class="set-chips">${setChipsMarkup(item.sets, { timed: item.unit === "sec" })}</div>
  </article>`;
}

function historyMarkup(state, exerciseId) {
  const exercise = exerciseById(state, exerciseId);
  const sessions = exerciseHistory(state, exerciseId);
  return `<div class="history-sheet">
    <header class="dialog-header">
      <div><h2 id="historyTitle">${escapeHtml(exercise?.name || "Exercise")}</h2><p>${sessions.length ? plural(sessions.length, "session") : "History"}</p></div>
      <button class="icon-button" type="button" data-close-dialog="historyDialog" aria-label="Close history">×</button>
    </header>
    <div class="history-scroll">
      ${sessions.length ? `${statsMarkup(sessions)}${trendMarkup(sessions)}
        <section aria-label="Sessions" class="history-sessions">${sessions.map((item, index) => sessionMarkup(state, item, sessions[index + 1])).join("")}</section>`
        : `<p class="history-empty">No sets logged for this exercise yet. Tap an exercise's number on Workout to log one.</p>`}
    </div>
  </div>`;
}

export function openExerciseHistory(exerciseId, opener) {
  $("#historyContent").innerHTML = historyMarkup(store.getState(), exerciseId);
  openDialog("#historyDialog", { returnFocus: opener, focus: '[data-close-dialog="historyDialog"]' });
}
