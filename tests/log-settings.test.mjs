import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultState } from "../data.js";
import { createStore, localDateKey, setDayInState, validateState } from "../storage.js";
import { calendarMarkup, dayEditorMarkup } from "../ui/log-settings.js";

const formatDate = (date, options) => new Intl.DateTimeFormat("en-US", options).format(date);
const emptySession = () => ({ routineIds: [], checkedEntryIdsByRoutine: {}, note: "" });
const routineProgram = (state, routineId) => state.programs.find((program) => program.routineIds.includes(routineId)) || null;

function moveLastRoutineToInactiveProgram(state) {
  const activeProgram = state.programs[0];
  const inactiveRoutineId = activeProgram.routineIds.at(-1);
  activeProgram.routineIds = activeProgram.routineIds.slice(0, -1);
  state.programs.push({ id: "travel-program", name: "Travel / Home", note: "", routineIds: [inactiveRoutineId] });
  return inactiveRoutineId;
}

test("Slice 12A calendar uses local in-month dates, leap days, and accessible marker states", () => {
  const state = createDefaultState();
  const routineId = state.programs[0].routineIds[0];
  state.sessions = {
    "2026-07-02": { routineIds: [routineId], checkedEntryIdsByRoutine: {}, note: "" },
    "2026-07-07": { routineIds: [], checkedEntryIdsByRoutine: {}, note: "A note" },
    "2026-07-15": { routineIds: [routineId], checkedEntryIdsByRoutine: {}, note: "Both" },
  };

  const july = calendarMarkup(state, new Date(2026, 6, 1), formatDate);
  assert.equal((july.match(/class="log-calendar-day/g) || []).length, 31);
  assert.equal((july.match(/class="log-calendar-blank/g) || []).length, 4);
  assert.match(july, /class="log-calendar-day has-completion\s+"[^>]+data-date="2026-07-02"[^>]+1 completed routine/);
  assert.match(july, /class="log-calendar-day\s+has-note\s+"[^>]+data-date="2026-07-07"[^>]+note recorded/);
  assert.match(july, /class="log-calendar-day has-completion has-note\s+"[^>]+data-date="2026-07-15"[^>]+1 completed routine, note recorded/);
  assert.doesNotMatch(july, /data-date="2026-06-|data-date="2026-08-/);

  const leapFebruary = calendarMarkup({ ...state, sessions: {} }, new Date(2028, 1, 1), formatDate);
  assert.equal((leapFebruary.match(/class="log-calendar-day/g) || []).length, 29);
  assert.match(leapFebruary, /data-date="2028-02-29"/);

  const today = new Date();
  const current = calendarMarkup({ ...state, sessions: {} }, new Date(today.getFullYear(), today.getMonth(), 1), formatDate);
  assert.match(current, new RegExp(`data-date="${localDateKey(today)}"[^>]+aria-label="[^"]*today[^"]*" aria-current="date"`));
});

test("Slice 12A Recent is descending, limited to eight, and names inactive program context", () => {
  const state = createDefaultState();
  const inactiveRoutineId = moveLastRoutineToInactiveProgram(state);
  const activeRoutineId = state.programs[0].routineIds[0];
  state.sessions = {};
  for (let day = 1; day <= 10; day += 1) {
    const key = `2026-07-${String(day).padStart(2, "0")}`;
    state.sessions[key] = { routineIds: [], checkedEntryIdsByRoutine: {}, note: `Note ${day}` };
  }
  state.sessions["2026-07-10"] = {
    routineIds: [activeRoutineId, inactiveRoutineId],
    checkedEntryIdsByRoutine: {},
    note: "Mixed programs",
  };

  const markup = calendarMarkup(state, new Date(2026, 6, 1), formatDate);
  const recent = markup.slice(markup.indexOf("log-section-label"));
  assert.equal((recent.match(/class="log-recent-row"/g) || []).length, 8);
  assert.ok(recent.indexOf('data-date="2026-07-10"') < recent.indexOf('data-date="2026-07-09"'));
  assert.doesNotMatch(recent, /data-date="2026-07-02"|data-date="2026-07-01"/);
  assert.match(recent, /Travel \/ Home/);
  assert.match(recent, /Inactive program/);
  assert.match(recent, /Note added/);

  const empty = calendarMarkup({ ...state, sessions: {} }, new Date(2026, 6, 1), formatDate);
  assert.match(empty, /No history yet/);
});

test("Slice 12A day editor separates active choices from recorded inactive routines", () => {
  const state = createDefaultState();
  const inactiveRoutineId = moveLastRoutineToInactiveProgram(state);
  const activeRoutineIds = state.programs[0].routineIds;
  const session = {
    routineIds: [activeRoutineIds[1], inactiveRoutineId],
    checkedEntryIdsByRoutine: {},
    note: "Shoulder felt good.",
  };
  const markup = dayEditorMarkup({
    state,
    session,
    dateKey: "2026-07-15",
    date: new Date(2026, 6, 15),
    formatDate,
    getRoutineProgram: routineProgram,
  });

  assert.match(markup, /Wednesday, July 15/);
  assert.match(markup, /Workout history/);
  assert.match(markup, /Completed routines/);
  assert.match(markup, /Already recorded from another program/);
  assert.ok(markup.indexOf(state.routines.find((routine) => routine.id === activeRoutineIds[0]).name) < markup.indexOf(state.routines.find((routine) => routine.id === activeRoutineIds[1]).name));
  assert.ok(markup.indexOf("Already recorded from another program") < markup.indexOf(state.routines.find((routine) => routine.id === inactiveRoutineId).name));
  assert.match(markup, /Travel \/ Home · Home · Inactive/);
  assert.match(markup, /Shoulder felt good\./);
  assert.match(markup, /maxlength="500"/);
  assert.equal((markup.match(/name="routine"/g) || []).length, activeRoutineIds.length + 1);

  const noActive = structuredClone(state);
  noActive.settings.activeProgramId = "";
  const recordedOnly = dayEditorMarkup({
    state: noActive,
    session: { ...emptySession(), routineIds: [inactiveRoutineId] },
    dateKey: "2026-07-15",
    date: new Date(2026, 6, 15),
    formatDate,
    getRoutineProgram: routineProgram,
  });
  assert.match(recordedOnly, /Recorded routines/);
  assert.equal((recordedOnly.match(/name="routine"/g) || []).length, 1);
});

test("Slice 12A day writes preserve existing checks, remove unmarked checks, and delete blank days", () => {
  const dateKey = "2026-07-15";
  const state = createDefaultState();
  const [firstId, secondId] = state.programs[0].routineIds;
  const firstRoutine = state.routines.find((routine) => routine.id === firstId);
  const optionalId = firstRoutine.entries.find((entry) => entry.role === "optional")?.id || firstRoutine.entries.at(-1).id;
  state.sessions[dateKey] = {
    routineIds: [firstId],
    checkedEntryIdsByRoutine: { [firstId]: [optionalId] },
    note: "Existing",
  };

  const unchanged = setDayInState(state, dateKey, [firstId], "Existing");
  assert.deepEqual(unchanged.sessions[dateKey].checkedEntryIdsByRoutine[firstId], [optionalId]);

  const withSecond = setDayInState(unchanged, dateKey, [firstId, secondId], "Existing");
  assert.ok(withSecond.sessions[dateKey].checkedEntryIdsByRoutine[secondId].length > 0);
  const unmarked = setDayInState(withSecond, dateKey, [secondId], "");
  assert.equal(unmarked.sessions[dateKey].checkedEntryIdsByRoutine[firstId], undefined);
  const blank = setDayInState(unmarked, dateKey, [], "");
  assert.equal(blank.sessions[dateKey], undefined);
  assert.equal(validateState(blank), true);
});

test("Slice 12A failed day writes preserve stored and in-memory history", () => {
  const dateKey = "2026-07-15";
  const starting = createDefaultState();
  let stored = JSON.stringify(starting);
  let failWrites = false;
  const storage = {
    getItem: () => stored,
    setItem: (_key, value) => {
      if (failWrites) throw new Error("device write failed");
      stored = value;
    },
  };
  const store = createStore(storage);
  const before = store.getState();
  const routineId = before.programs[0].routineIds[0];
  const draft = setDayInState(before, dateKey, [routineId], "Unsaved draft");

  failWrites = true;
  const result = store.replace(draft);

  assert.equal(result.ok, false);
  assert.match(result.error, /could not be saved/i);
  assert.deepEqual(store.getState(), before);
  assert.deepEqual(JSON.parse(stored), before);
  assert.equal(draft.sessions[dateKey].note, "Unsaved draft");
});
