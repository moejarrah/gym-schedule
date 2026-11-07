// Logging sheet: today's sets for one routine slot, opened from its number on
// Workout. It shows the exercise's last three sessions from any routine, one row
// per set (last time, weight, reps, tick) with drop chains under a set, and Done,
// which marks the slot done. Ticking a set saves it straight away; empty fields
// take the grey suggestion from last time.

import { mainElement, onStart, render, store } from "../context.js";
import { $, closeDialog, escapeHtml, openDialog, report, showError } from "../dom.js";
import {
  entryLog,
  exerciseHistory,
  isEntryChecked,
  isTimedPrescription,
  localDateKey,
  plannedSetCount,
  routineById,
  saveEntrySets,
  setEntryChecked,
} from "../model.js";
import { openExerciseHistory } from "./history.js";
import { entryPresentation, formatKg, liftText, setChipsMarkup, shortDate } from "./shared.js";

// The slot being logged and the rows on screen. Row values are the text in the
// fields; `edited` marks rows typed in since they were last saved or unticked. A
// ticked set is saved with its ticked drops; unticking a set keeps its drops'
// ticks so ticking it again brings them back.
const sheet = { routineId: "", entryId: "", dateKey: "", choiceIndex: 0, rows: [], lastTicked: -1 };

const checkIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
const plusIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;

// ---------- data ----------

function current(state) {
  const routine = routineById(state, sheet.routineId);
  const entry = routine?.entries.find((item) => item.id === sheet.entryId);
  if (!entry) return null;
  const choice = entry.choices[Math.min(sheet.choiceIndex, entry.choices.length - 1)];
  return { routine, entry, choice, timed: isTimedPrescription(choice.prescription) };
}

const rowFromLift = (lift) => ({ kg: formatKg(lift.kg), reps: String(lift.reps), done: true });

function loadRows(state) {
  const { choice } = current(state);
  const log = entryLog(state, sheet.dateKey, sheet.entryId);
  const rows = (log?.sets || []).map((set) => ({ ...rowFromLift(set), drops: set.drops.map(rowFromLift) }));
  sheet.lastTicked = rows.length - 1;
  while (rows.length < plannedSetCount(choice.prescription)) rows.push({ kg: "", reps: "", done: false, drops: [] });
  sheet.rows = rows;
}

// The grey values an empty row would be saved with: the same set last time, or
// else the row above. A drop falls back to about 80% of the weight before it.
function suggestion(last, setIndex, dropIndex = -1) {
  const set = last?.sets[setIndex];
  if (dropIndex < 0) {
    if (set) return { kg: formatKg(set.kg), reps: String(set.reps) };
    const above = sheet.rows[setIndex - 1];
    return above ? { kg: above.kg || suggestion(last, setIndex - 1).kg, reps: above.reps || suggestion(last, setIndex - 1).reps } : { kg: "", reps: "" };
  }
  const drop = set?.drops[dropIndex];
  if (drop) return { kg: formatKg(drop.kg), reps: String(drop.reps) };
  const parentRow = dropIndex ? sheet.rows[setIndex].drops[dropIndex - 1] : sheet.rows[setIndex];
  const kg = Number(String(parentRow.kg).replace(",", "."));
  return { kg: parentRow.kg && Number.isFinite(kg) ? formatKg(Math.max(0, Math.round((kg * 0.8) / 2.5) * 2.5)) : "", reps: parentRow.reps };
}

function rowAt(setIndex, dropIndex) {
  const set = sheet.rows[setIndex];
  return dropIndex < 0 ? set : set?.drops[dropIndex];
}

const lastSession = (state) => exerciseHistory(state, current(state).choice.exerciseId, { beforeDateKey: sheet.dateKey, limit: 1 })[0];

// Empty fields of a row take the grey suggestion shown in them.
function fillRow(setIndex, dropIndex) {
  const row = rowAt(setIndex, dropIndex);
  for (const field of ["kg", "reps"]) {
    const input = $(`[data-field="${field}"][data-set="${setIndex}"][data-drop="${dropIndex}"]`, $("#logContent"));
    row[field] = row[field].trim() || input?.placeholder || "";
  }
}

const isSaved = (setIndex, dropIndex) => rowAt(setIndex, dropIndex).done && sheet.rows[setIndex].done;

// Saves every ticked row. Returns false (and shows why) when the store refused it.
function saveRows() {
  const { choice } = current(store.getState());
  const sets = sheet.rows.filter((row) => row.done).map((row) => ({
    kg: row.kg,
    reps: row.reps,
    drops: row.drops.filter((drop) => drop.done).map((drop) => ({ kg: drop.kg, reps: drop.reps })),
  }));
  const result = store.update((draft) => saveEntrySets(draft, {
    routineId: sheet.routineId, entryId: sheet.entryId, exerciseId: choice.exerciseId, sets, dateKey: sheet.dateKey,
  }));
  if (!report(result)) return false;
  for (const row of sheet.rows) {
    if (row.done) row.edited = false;
    for (const drop of row.drops) if (row.done && drop.done) drop.edited = false;
  }
  // Show the values as saved ("47,5" becomes "47.5").
  const saved = store.getState().sessions[sheet.dateKey]?.logs[sheet.entryId]?.sets || [];
  sheet.rows.filter((row) => row.done).forEach((row, index) => {
    Object.assign(row, rowFromLift(saved[index]));
    row.drops.filter((drop) => drop.done).forEach((drop, dropIndex) => Object.assign(drop, rowFromLift(saved[index].drops[dropIndex])));
  });
  render();
  return true;
}

// ---------- markup ----------

function historyMarkup(state, history) {
  const rows = history.map((item) => {
    const routine = routineById(state, item.routineId);
    return `<div class="log-history-row">
      <span class="log-history-date"><strong>${escapeHtml(shortDate(item.dateKey))}</strong><small>${escapeHtml(routine?.name || "Deleted routine")}</small></span>
      <span class="set-chips">${setChipsMarkup(item.sets, { timed: item.unit === "sec" })}</span>
    </div>`;
  }).join("");
  return `<section class="log-history" aria-labelledby="logHistoryTitle">
    <div class="log-history-head">
      <h3 id="logHistoryTitle">Last 3 times</h3>
      <button class="text-button" type="button" data-log-action="history">All history</button>
    </div>
    ${rows || `<p class="log-history-empty">No sets logged for this exercise yet.</p>`}
  </section>`;
}

function rowMarkup({ setIndex, dropIndex, row, last, timed }) {
  const isDrop = dropIndex >= 0;
  const name = isDrop ? `drop ${dropIndex + 1} after set ${setIndex + 1}` : `set ${setIndex + 1}`;
  const lastLift = isDrop ? last?.sets[setIndex]?.drops[dropIndex] : last?.sets[setIndex];
  const hint = suggestion(last, setIndex, dropIndex);
  const data = `data-set="${setIndex}" data-drop="${dropIndex}"`;
  const lastTimed = last?.unit === "sec";
  const shown = lastLift ? liftText(lastLift, lastTimed).replace(" kg", "") : "";
  const lastCell = lastLift
    ? `<button class="log-last" type="button" data-log-action="use-last" ${data} aria-label="${escapeHtml(shown)}, copy last time to ${name}">${escapeHtml(shown)}</button>`
    : `<span class="log-last is-empty" aria-hidden="true">—</span>`;
  const saved = isSaved(setIndex, dropIndex);
  const label = `${name[0].toUpperCase()}${name.slice(1)} done`;
  return `<div class="log-row ${saved ? "is-done" : ""} ${isDrop ? "is-drop" : ""}">
    <span class="log-set-label" aria-hidden="true">${isDrop ? "Drop" : setIndex + 1}</span>
    ${lastCell}
    <label class="log-field"><input type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-field="kg" ${data} value="${escapeHtml(row.kg)}" placeholder="${escapeHtml(hint.kg)}" aria-label="Weight for ${name}, kg"><span aria-hidden="true">kg</span></label>
    <label class="log-field"><input type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" data-field="reps" ${data} value="${escapeHtml(row.reps)}" placeholder="${escapeHtml(hint.reps)}" aria-label="${timed ? "Seconds" : "Reps"} for ${name}"></label>
    <button class="log-tick" type="button" data-log-action="tick" ${data} aria-pressed="${saved}" aria-label="${label}">${checkIcon}</button>
  </div>`;
}

function tableMarkup(last, timed) {
  const groups = sheet.rows.map((row, setIndex) => {
    const drops = row.drops.map((drop, dropIndex) => rowMarkup({ setIndex, dropIndex, row: drop, last, timed })).join("");
    const lastRow = row.drops.at(-1) || row;
    const dropLink = setIndex === sheet.lastTicked && row.done && lastRow.done
      ? `<button class="log-add" type="button" data-log-action="add-drop" data-set="${setIndex}">${plusIcon}${row.drops.length ? "Another drop" : "Drop set"}</button>`
      : "";
    return `<div class="log-set ${row.drops.length ? "has-drops" : ""}">${rowMarkup({ setIndex, dropIndex: -1, row, last, timed })}${drops}${dropLink}</div>`;
  }).join("");
  return `<div class="log-table">
    <div class="log-row log-row-head" aria-hidden="true"><span>Set</span><span>Last time</span><span>Weight</span><span>${timed ? "Sec" : "Reps"}</span><span></span></div>
    ${groups}
    <button class="log-add" type="button" data-log-action="add-set">${plusIcon}Set</button>
  </div>`;
}

function choicesMarkup(entry, state) {
  if (entry.choices.length < 2) return "";
  const { choices } = entryPresentation(entry, state);
  return `<div class="log-choices" role="group" aria-label="Exercise you're doing">
    ${choices.map((item, index) => `<button type="button" data-log-action="choose" data-index="${index}" aria-pressed="${index === sheet.choiceIndex}">${escapeHtml(item.name)}</button>`).join("")}
  </div>`;
}

function sheetMarkup(state) {
  const { routine, entry, choice, timed } = current(state);
  const name = entryPresentation({ ...entry, choices: [choice] }, state).title;
  const history = exerciseHistory(state, choice.exerciseId, { beforeDateKey: sheet.dateKey, limit: 3 });
  const done = isEntryChecked(state, sheet.dateKey, routine.id, entry.id);
  return `<div class="log-sheet">
    <header class="dialog-header log-head">
      <div><h2 id="logTitle">${escapeHtml(name)}</h2><p>${escapeHtml(choice.prescription)}</p></div>
      <button class="icon-button" type="button" data-close-dialog="logDialog" aria-label="Close">×</button>
    </header>
    <div class="log-scroll">
      ${choicesMarkup(entry, state)}
      ${historyMarkup(state, history)}
      ${tableMarkup(history[0], timed)}
      <p class="form-error" role="alert" aria-live="polite" data-dialog-error></p>
    </div>
    <footer class="dialog-actions log-actions">
      ${done ? `<button class="button text" type="button" data-log-action="undo-done">Not done</button>` : ""}
      <button class="button primary" type="button" data-log-action="done">${done ? "Close" : "Done"}</button>
    </footer>
  </div>`;
}

// Re-renders the sheet and puts focus back on the same control (a field's own
// row tick when Enter ticked it).
function refresh(focusSelector) {
  const content = $("#logContent");
  const focused = content.contains(document.activeElement) ? document.activeElement : null;
  const action = focused?.dataset.logAction || (focused?.dataset.field ? "tick" : "");
  const selector = focusSelector || (action ? `[data-log-action="${action}"][data-set="${focused.dataset.set}"][data-drop="${focused.dataset.drop}"]` : "");
  const scroll = $(".log-scroll", content)?.scrollTop || 0;
  content.innerHTML = sheetMarkup(store.getState());
  $(".log-scroll", content).scrollTop = scroll;
  const target = selector && $(selector, content);
  (target || $(".log-actions .button.primary", content)).focus({ preventScroll: true });
}

// ---------- actions ----------

function tick(setIndex, dropIndex) {
  const row = rowAt(setIndex, dropIndex);
  if (dropIndex >= 0 && !sheet.rows[setIndex].done) {
    showError("Tick the set before its drops.");
    return;
  }
  const before = structuredClone(row);
  if (!row.done) fillRow(setIndex, dropIndex);
  row.done = !row.done;
  // An unticked row isn't "typed in": Done and Close leave it out.
  if (!row.done) {
    row.edited = false;
    row.drops?.forEach((drop) => { drop.edited = false; });
  }
  if (!saveRows()) {
    Object.assign(row, before);
    return;
  }
  if (row.done) sheet.lastTicked = setIndex;
  refresh();
}

function addDrop(setIndex) {
  sheet.rows[setIndex].drops.push({ kg: "", reps: "", done: false });
  const dropIndex = sheet.rows[setIndex].drops.length - 1;
  refresh(`[data-field="kg"][data-set="${setIndex}"][data-drop="${dropIndex}"]`);
}

function addSet() {
  sheet.rows.push({ kg: "", reps: "", done: false, drops: [] });
  refresh(`[data-log-action="add-set"]`);
}

function useLast(setIndex, dropIndex) {
  const last = lastSession(store.getState());
  const lift = dropIndex < 0 ? last?.sets[setIndex] : last?.sets[setIndex]?.drops[dropIndex];
  if (!lift) return;
  Object.assign(rowAt(setIndex, dropIndex), { kg: formatKg(lift.kg), reps: String(lift.reps) });
  if (rowAt(setIndex, dropIndex).done && !saveRows()) return;
  refresh(`[data-log-action="tick"][data-set="${setIndex}"][data-drop="${dropIndex}"]`);
}

// Switching to another choice moves today's sets to that exercise. With nothing
// ticked yet, the rows follow the new choice's prescription.
function choose(index) {
  if (index === sheet.choiceIndex) return;
  const previous = sheet.choiceIndex;
  sheet.choiceIndex = index;
  const planned = plannedSetCount(current(store.getState()).choice.prescription);
  // Untouched extra rows go; typed rows stay.
  while (sheet.rows.length > planned && !sheet.rows.at(-1).done && !sheet.rows.at(-1).kg && !sheet.rows.at(-1).reps) sheet.rows.pop();
  while (sheet.rows.length < planned) sheet.rows.push({ kg: "", reps: "", done: false, drops: [] });
  if (sheet.rows.some((row) => row.done) && !saveRows()) {
    sheet.choiceIndex = previous;
    return;
  }
  refresh(`[data-log-action="choose"][data-index="${index}"]`);
}

// Done (or Close once the slot is done) also saves rows that were typed in but not
// ticked, then marks the slot done.
function finish() {
  const typedIn = (row) => row.edited && (row.kg.trim() || row.reps.trim());
  const typed = [];
  sheet.rows.forEach((row, setIndex) => {
    if (!row.done && typedIn(row)) typed.push([setIndex, -1]);
    if (row.done || typed.some(([index]) => index === setIndex)) {
      row.drops.forEach((drop, dropIndex) => { if (!drop.done && typedIn(drop)) typed.push([setIndex, dropIndex]); });
    }
  });
  if (typed.length) {
    const before = structuredClone(sheet.rows);
    typed.forEach(([setIndex, dropIndex]) => {
      fillRow(setIndex, dropIndex);
      rowAt(setIndex, dropIndex).done = true;
    });
    if (!saveRows()) {
      sheet.rows = before;
      return;
    }
  }
  if (!isEntryChecked(store.getState(), sheet.dateKey, sheet.routineId, sheet.entryId)) {
    const result = store.update((draft) => setEntryChecked(draft, sheet.routineId, sheet.entryId, true, sheet.dateKey));
    if (!report(result)) return;
  }
  closeDialog("#logDialog");
  render();
}

function undoDone() {
  const result = store.update((draft) => setEntryChecked(draft, sheet.routineId, sheet.entryId, false, sheet.dateKey));
  if (!report(result)) return;
  render();
  refresh(`[data-log-action="done"]`);
}

// ---------- opening ----------

export function openLogger(routineId, entryId, opener) {
  const state = store.getState();
  Object.assign(sheet, { routineId, entryId, dateKey: localDateKey(), choiceIndex: 0 });
  const found = current(state);
  if (!found) return;
  const log = entryLog(state, sheet.dateKey, entryId);
  sheet.choiceIndex = Math.max(0, found.entry.choices.findIndex((choice) => choice.exerciseId === log?.exerciseId));
  loadRows(state);
  $("#logContent").innerHTML = sheetMarkup(state);
  openDialog("#logDialog", {
    returnFocus: opener,
    fallbackFocus: () => $(`[data-action="open-logger"][data-id="${CSS.escape(entryId)}"]`, mainElement()) || mainElement(),
    focus: '[data-close-dialog="logDialog"]',
  });
}

onStart(() => {
  const content = $("#logContent");
  content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-log-action]");
    if (!button) return;
    const setIndex = Number(button.dataset.set);
    const dropIndex = Number(button.dataset.drop ?? -1);
    const actions = {
      tick: () => tick(setIndex, dropIndex),
      "add-drop": () => addDrop(setIndex),
      "add-set": addSet,
      "use-last": () => useLast(setIndex, dropIndex),
      choose: () => choose(Number(button.dataset.index)),
      history: () => openExerciseHistory(current(store.getState()).choice.exerciseId, button),
      done: finish,
      "undo-done": undoDone,
    };
    actions[button.dataset.logAction]?.();
  });
  // Typing updates the row; editing a ticked row saves it when the field is left.
  content.addEventListener("input", (event) => {
    const field = event.target.dataset.field;
    if (!field) return;
    const row = rowAt(Number(event.target.dataset.set), Number(event.target.dataset.drop));
    row[field] = event.target.value;
    row.edited = true;
  });
  content.addEventListener("change", (event) => {
    const { field, set, drop } = event.target.dataset;
    if (field && rowAt(Number(set), Number(drop))?.done && !saveRows()) event.target.focus();
  });
  // Enter in a field ticks its row.
  content.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !event.target.dataset.field) return;
    event.preventDefault();
    const setIndex = Number(event.target.dataset.set);
    const dropIndex = Number(event.target.dataset.drop);
    if (rowAt(setIndex, dropIndex).done) {
      event.target.blur();
      return;
    }
    tick(setIndex, dropIndex);
  });
});
