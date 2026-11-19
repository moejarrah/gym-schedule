// Logging sheet: today's sets for one routine slot, opened from its number on
// Workout. It shows the exercise's last three sessions from any routine, one row
// per set (last time, weight, reps, tick) with drop chains under a set (each drop
// can be removed), and Done, which marks the slot done. Ticking a set saves it
// straight away; empty fields take the grey suggestion from last time.

import { registerActions, render, store } from "../context.js";
import { $, closeDialog, confirmAction, escapeHtml, openDialog, redraw, report, showError } from "../dom.js";
import {
  entryLog,
  exerciseHistory,
  findSlot,
  isEntryChecked,
  isTimedPrescription,
  localDateKey,
  plannedSetCount,
  removeExtra,
  routineById,
  saveEntrySets,
  workoutName,
  setEntryChecked,
} from "../model.js";
import { exerciseMode, isNewBest, targetHint } from "../progress.js";
import { openExerciseHistory } from "./history.js";
import { entryPresentation, formatKg, liftText, setChipsMarkup, shortDate } from "./shared.js";

// The slot being logged and the rows on screen. Row values are the text in the
// fields; `edited` marks rows typed in since they were last saved or unticked. A
// ticked set is saved with its ticked drops; unticking a set keeps its drops'
// ticks so ticking it again brings them back.
// A set row can be a warm-up (`warmup`), which progress leaves out. `note` is the
// exercise's note for the day; it is saved with the sets.
const sheet = { routineId: "", entryId: "", dateKey: "", choiceIndex: 0, rows: [], lastTicked: -1, note: "" };

const checkIcon = `<svg class="tickbox" aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
const plusIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;
const removeIcon = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>`;

// ---------- data ----------

function current(state) {
  const routine = routineById(state, sheet.routineId);
  const entry = findSlot(state, sheet.routineId, sheet.entryId, sheet.dateKey);
  if (!routine || !entry) return null;
  const choice = entry.choices[Math.min(sheet.choiceIndex, entry.choices.length - 1)];
  return { routine, entry, choice, timed: isTimedPrescription(choice.prescription) };
}

const rowFromLift = (lift) => ({ kg: formatKg(lift.kg), reps: String(lift.reps), done: true });

function loadRows(state) {
  const { choice } = current(state);
  const log = entryLog(state, sheet.dateKey, sheet.entryId);
  const rows = (log?.sets || []).map((set) => ({ ...rowFromLift(set), warmup: Boolean(set.warmup), drops: set.drops.map(rowFromLift) }));
  sheet.lastTicked = rows.length - 1;
  // Rows not logged yet are warm-ups where last time's were.
  const last = lastSession(state);
  while (rows.length < plannedSetCount(choice.prescription)) rows.push({ kg: "", reps: "", done: false, warmup: Boolean(last?.sets[rows.length]?.warmup), drops: [] });
  sheet.rows = rows;
  sheet.note = log?.note || "";
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
    warmup: row.warmup,
  }));
  const result = store.update((draft) => saveEntrySets(draft, {
    routineId: sheet.routineId, entryId: sheet.entryId, exerciseId: choice.exerciseId, sets, note: sheet.note, dateKey: sheet.dateKey,
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

function historyMarkup(state, history, hint) {
  const rows = history.map((item) => {
    return `<div class="log-history-row">
      <span class="row-main log-history-date"><strong class="row-title truncate">${escapeHtml(shortDate(item.dateKey))}</strong><small class="row-meta truncate">${escapeHtml(workoutName(state, item.dateKey, item.routineId))}</small></span>
      <span class="row-main"><span class="set-chips">${setChipsMarkup(item.sets, { timed: item.unit === "sec" })}</span>${item.note ? `<span class="row-meta">${escapeHtml(item.note)}</span>` : ""}</span>
    </div>`;
  }).join("");
  return `<section class="card log-history" aria-labelledby="logHistoryTitle">
    <div class="label label-row">
      <h3 id="logHistoryTitle">Last 3 times</h3>
      <button class="link-button" type="button" data-action="log-history">All history</button>
    </div>
    ${rows || `<p class="hint">No sets logged for this exercise yet.</p>`}
    ${hint ? `<p class="log-target">${escapeHtml(hint)}</p>` : ""}
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
  const lastValue = lastLift
    ? `<button class="log-last" type="button" data-action="log-use-last" ${data} aria-label="${escapeHtml(shown)}, copy last time to ${name}">${escapeHtml(shown)}</button>`
    : `<span class="log-last is-empty" aria-hidden="true">—</span>`;
  const best = !isDrop && isSaved(setIndex, -1) && !row.warmup && isNewBest(store.getState(), current(store.getState()).choice.exerciseId, { kg: row.kg === "" ? null : Number(row.kg), reps: Number(row.reps), drops: [] }, sheet.dateKey);
  const lastCell = isDrop ? `<span class="log-last-cell"><span class="label accent">Drop</span>${lastValue}</span>`
    : best ? `<span class="log-last-cell is-best">${lastValue}<span class="label accent">Best</span></span>` : lastValue;
  // A drop row's first cell removes it; a set row's shows its number.
  const firstCell = isDrop
    ? `<button class="icon-button sm" type="button" data-action="log-remove-drop" ${data} aria-label="Remove ${name}">${removeIcon}</button>`
    : `<button class="log-set-label" type="button" data-action="log-warmup" data-set="${setIndex}" aria-pressed="${Boolean(row.warmup)}" aria-label="Set ${setIndex + 1} is a warm-up">${row.warmup ? "W" : setIndex + 1}</button>`;
  const saved = isSaved(setIndex, dropIndex);
  const label = `${name[0].toUpperCase()}${name.slice(1)} done`;
  return `<div class="log-row ${saved ? "is-done" : ""} ${isDrop ? "is-drop" : ""}">
    ${firstCell}
    ${lastCell}
    <label class="log-field"><input type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-field="kg" ${data} value="${escapeHtml(row.kg)}" placeholder="${escapeHtml(hint.kg)}" aria-label="Weight for ${name}, kg"><span aria-hidden="true">kg</span></label>
    <label class="log-field"><input type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" data-field="reps" ${data} value="${escapeHtml(row.reps)}" placeholder="${escapeHtml(hint.reps)}" aria-label="${timed ? "Seconds" : "Reps"} for ${name}"></label>
    <button class="icon-button" type="button" data-action="log-tick" ${data} aria-pressed="${saved}" aria-label="${label}">${checkIcon}</button>
  </div>`;
}

function tableMarkup(last, timed) {
  const groups = sheet.rows.map((row, setIndex) => {
    const drops = row.drops.map((drop, dropIndex) => rowMarkup({ setIndex, dropIndex, row: drop, last, timed })).join("");
    const lastRow = row.drops.at(-1) || row;
    const dropLink = setIndex === sheet.lastTicked && row.done && lastRow.done
      ? `<button class="link-button" type="button" data-action="log-add-drop" data-set="${setIndex}">${plusIcon}${row.drops.length ? "Another drop" : "Drop set"}</button>`
      : "";
    return `<div class="log-set ${row.drops.length ? "has-drops" : ""}">${rowMarkup({ setIndex, dropIndex: -1, row, last, timed })}${drops}${dropLink}</div>`;
  }).join("");
  return `<div class="log-table">
    <div class="log-row label" aria-hidden="true"><span>Set</span><span>Last time</span><span>Weight</span><span>${timed ? "Sec" : "Reps"}</span><span></span></div>
    ${groups}
    <div class="log-tools">
      <button class="link-button" type="button" data-action="log-add-set">${plusIcon}Set</button>
      ${timed ? "" : `<span class="log-steps" role="group" aria-label="Change the weight of the sets not ticked yet">
        <button class="pill" type="button" data-action="log-step" data-by="-2.5">− 2.5 kg</button>
        <button class="pill" type="button" data-action="log-step" data-by="2.5">+ 2.5 kg</button>
      </span>`}
    </div>
    <p class="hint">Tap a set's number to mark it as a warm-up.</p>
  </div>`;
}

function choicesMarkup(entry, state) {
  if (entry.choices.length < 2) return "";
  const { choices } = entryPresentation(entry, state);
  return `<div class="chips scroll-x" role="group" aria-label="Exercise you're doing">
    ${choices.map((item, index) => `<button class="pill" type="button" data-action="log-choose" data-index="${index}" aria-pressed="${index === sheet.choiceIndex}">${escapeHtml(item.name)}</button>`).join("")}
  </div>`;
}

function sheetMarkup(state) {
  const { routine, entry, choice, timed } = current(state);
  const name = entryPresentation({ ...entry, choices: [choice] }, state).title;
  const history = exerciseHistory(state, choice.exerciseId, { beforeDateKey: sheet.dateKey, limit: 3 });
  const done = isEntryChecked(state, sheet.dateKey, routine.id, entry.id);
  return `<div class="sheet-panel">
    <header class="sheet-head">
      <div><h2 id="logTitle">${escapeHtml(name)}</h2><p>${escapeHtml([choice.prescription, entry.extra ? "Added for this day" : "", sheet.dateKey === localDateKey() ? "" : shortDate(sheet.dateKey)].filter(Boolean).join(" · "))}</p></div>
      <button class="icon-button" type="button" data-close-dialog="logDialog" aria-label="Close">×</button>
    </header>
    <div class="sheet-body stack tight" data-keep-scroll="log-${escapeHtml(entry.id)}">
      ${choicesMarkup(entry, state)}
      ${historyMarkup(state, history, history[0] ? targetHint(history[0].sets, choice.prescription, exerciseMode(history), timed ? "sec" : "reps") : "")}
      ${tableMarkup(history[0], timed)}
      ${sheet.rows.some((row) => row.done) ? `<label class="field"><span>Note for this exercise today</span><input class="control" type="text" data-log-note value="${escapeHtml(sheet.note)}" maxlength="140" autocomplete="off" enterkeyhint="done" placeholder="Shown next time, e.g. seat at 4"></label>` : ""}
      <p class="form-error" role="alert" aria-live="polite" data-dialog-error></p>
    </div>
    <footer class="actions">
      ${done ? `<button class="button text" type="button" data-action="log-undo-done">Not done</button>`
    : entry.extra ? `<button class="button text" type="button" data-action="log-remove-extra">Remove</button>` : ""}
      <button class="button primary" type="button" data-action="log-done">${done ? "Close" : "Done"}</button>
    </footer>
  </div>`;
}

// Redraws the sheet from the rows.
function refresh() {
  redraw("#logContent", sheetMarkup(store.getState()));
}

// ---------- actions ----------

function tick(setIndex, dropIndex) {
  const row = rowAt(setIndex, dropIndex);
  if (dropIndex >= 0 && !sheet.rows[setIndex].done) {
    showError("Tick the set before its drops.");
    return;
  }
  if (row.done && row.edited) {
    if (saveRows()) refresh();
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
  refresh();
  // Ready to type the drop's weight.
  $(`#logContent [data-field="kg"][data-set="${setIndex}"][data-drop="${dropIndex}"]`).focus();
}

// Removing a drop that was saved saves the set without it.
function removeDrop(setIndex, dropIndex) {
  const set = sheet.rows[setIndex];
  const [removed] = set.drops.splice(dropIndex, 1);
  if (removed.done && set.done && !saveRows()) {
    set.drops.splice(dropIndex, 0, removed);
    return;
  }
  refresh();
}

// A warm-up doesn't count towards progress. Marking a ticked set saves straight away.
function toggleWarmup(setIndex) {
  const row = sheet.rows[setIndex];
  row.warmup = !row.warmup;
  if (row.done && !saveRows()) row.warmup = !row.warmup;
  refresh();
}

// Moves the weight of every set not ticked yet up or down, starting from the grey
// suggestion when nothing is typed. The rows still need their tick.
function stepWeights(by) {
  const last = lastSession(store.getState());
  sheet.rows.forEach((row, setIndex) => {
    if (row.done) return;
    const shown = row.kg || suggestion(last, setIndex).kg;
    const base = Number(String(shown).replace(",", "."));
    if (shown && Number.isFinite(base)) row.kg = formatKg(Math.max(0, Math.round((base + by) * 100) / 100));
  });
  refresh();
}

function addSet() {
  sheet.rows.push({ kg: "", reps: "", done: false, drops: [] });
  refresh();
}

function useLast(setIndex, dropIndex) {
  const last = lastSession(store.getState());
  const lift = dropIndex < 0 ? last?.sets[setIndex] : last?.sets[setIndex]?.drops[dropIndex];
  if (!lift) return;
  Object.assign(rowAt(setIndex, dropIndex), { kg: formatKg(lift.kg), reps: String(lift.reps) });
  if (rowAt(setIndex, dropIndex).done && !saveRows()) return;
  refresh();
}

// Switching to another choice moves today's sets to that exercise. With nothing
// ticked yet, the rows follow the new choice's prescription.
async function choose(index) {
  if (index === sheet.choiceIndex) return;
  const previous = sheet.choiceIndex;
  if (sheet.rows.some((row) => row.done)) {
    const { entry } = current(store.getState());
    const name = entryPresentation({ choices: [entry.choices[index]] }, store.getState()).title;
    const move = await confirmAction({
      title: `Switch to ${name}?`,
      message: "The sets ticked here move to it: they were logged as the other exercise.",
      confirmLabel: "Move the sets",
      cancelLabel: "Keep as it is",
      danger: false,
    });
    if (!move) return;
  }
  sheet.choiceIndex = index;
  const planned = plannedSetCount(current(store.getState()).choice.prescription);
  // Untouched extra rows go; typed rows stay.
  while (sheet.rows.length > planned && !sheet.rows.at(-1).done && !sheet.rows.at(-1).kg && !sheet.rows.at(-1).reps) sheet.rows.pop();
  while (sheet.rows.length < planned) sheet.rows.push({ kg: "", reps: "", done: false, drops: [] });
  if (sheet.rows.some((row) => row.done) && !saveRows()) {
    sheet.choiceIndex = previous;
    return;
  }
  refresh();
}

// Done (or Close once the slot is done) also saves rows that were typed in but not
// ticked, then marks the slot done. Done with no sets at all asks first.
async function finish() {
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
    if (!sheet.rows.some((row) => row.done)) {
      const name = entryPresentation({ choices: [current(store.getState()).choice] }, store.getState()).title;
      const anyway = await confirmAction({
        title: "No sets logged",
        message: `Mark ${name} done anyway? It won't appear in its history.`,
        confirmLabel: "Mark done anyway",
        cancelLabel: "Log sets",
        danger: false,
      });
      if (!anyway) return;
    }
    const result = store.update((draft) => setEntryChecked(draft, sheet.routineId, sheet.entryId, true, sheet.dateKey));
    if (!report(result)) return;
  }
  closeDialog("#logDialog");
  render();
}

function undoDone() {
  const result = store.update((draft) => setEntryChecked(draft, sheet.routineId, sheet.entryId, false, sheet.dateKey));
  if (!report(result)) return;
  closeDialog("#logDialog");
  render();
}

// ---------- opening ----------

// Opens the sheet for a slot (or an exercise added that day) on a date: the day of
// the workout in progress, or a past day opened from Log to fix its sets.
export function openLogger(routineId, entryId, dateKey) {
  const state = store.getState();
  Object.assign(sheet, { routineId, entryId, dateKey, choiceIndex: 0 });
  const found = current(state);
  if (!found) return;
  const log = entryLog(state, sheet.dateKey, entryId);
  sheet.choiceIndex = Math.max(0, found.entry.choices.findIndex((choice) => choice.exerciseId === log?.exerciseId));
  loadRows(state);
  refresh();
  openDialog("#logDialog");
}

// The row a button or field belongs to: [setIndex, dropIndex], with -1 for the set itself.
const position = (element) => [Number(element.dataset.set), Number(element.dataset.drop ?? -1)];

registerActions({
  "log-tick": (button) => tick(...position(button)),
  "log-add-drop": (button) => addDrop(Number(button.dataset.set)),
  "log-remove-drop": (button) => removeDrop(...position(button)),
  "log-add-set": addSet,
  "log-warmup": (button) => toggleWarmup(Number(button.dataset.set)),
  "log-step": (button) => stepWeights(Number(button.dataset.by)),
  "log-use-last": (button) => useLast(...position(button)),
  "log-choose": (button) => choose(Number(button.dataset.index)),
  "log-history": () => openExerciseHistory(current(store.getState()).choice.exerciseId),
  "log-done": finish,
  "log-undo-done": undoDone,
  "log-remove-extra": async () => {
    if (sheet.rows.some((row) => row.done) && !await confirmAction({
      title: "Remove this exercise?",
      message: "The sets ticked here are deleted with it. This can't be undone.",
      confirmLabel: "Remove",
      cancelLabel: "Keep it",
    })) return;
    const result = store.update((draft) => removeExtra(draft, sheet.routineId, sheet.entryId, sheet.dateKey));
    if (!report(result)) return;
    closeDialog("#logDialog");
    render();
  },
});

{
  const content = $("#logContent");
  // Typing updates the row; editing a ticked row saves it when the field is left.
  content.addEventListener("input", (event) => {
    if ("logNote" in event.target.dataset) sheet.note = event.target.value;
    const field = event.target.dataset.field;
    if (!field) return;
    const row = rowAt(Number(event.target.dataset.set), Number(event.target.dataset.drop));
    row[field] = event.target.value;
    row.edited = true;
  });
  content.addEventListener("change", (event) => {
    // The note is saved with the sets, so it needs at least one ticked set.
    if ("logNote" in event.target.dataset && sheet.rows.some((row) => row.done)) saveRows();
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
}
