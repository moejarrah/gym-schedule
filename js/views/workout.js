// Workout screen: the active-program bar, the routine tabs (whose "select-routine"
// action also serves the Program screen's identical strip), today's checklist for
// the selected routine, and the exercise-choices sheet of multi-choice slots.

import { afterRender, mainElement, onStart, registerActions, registerView, render, store } from "../context.js";
import { $, chevronIcon, closeDialog, escapeHtml, openDialog, playIcon, report } from "../dom.js";
import {
  activeProgram,
  activeRoutine,
  entryNumber,
  isEntryChecked,
  localDateKey,
  programRoutines,
  routineById,
  setActiveRoutine,
  toggleEntryCheck,
} from "../model.js";
import { openExerciseReference, openExerciseVideo } from "./reference.js";
import { entryPresentation, revealSelectedTab, routineTabsMarkup, videoUrl } from "./shared.js";

// The exercise list is one element reused across renders, so checking an entry
// keeps the list where the user scrolled it.
const list = { rows: null };

// The routine slot shown in the open choices sheet.
const choicesSheet = { routineId: "", entryId: "" };

// ---------- markup ----------

function programBarMarkup(program) {
  if (!program) {
    return `<div class="workout-programbar">
      <div class="workout-program-empty"><span>Active</span><strong>No program</strong></div>
    </div>`;
  }
  return `<div class="workout-programbar">
    <button class="workout-program-pick" type="button" data-action="open-programs" aria-label="Choose active program, currently ${escapeHtml(program.name)}">
      <span>Active</span>
      <strong>${escapeHtml(program.name)}</strong>
      ${chevronIcon("down")}
    </button>
    <button class="workout-manage-program" type="button" data-view-link="routines" aria-label="Manage ${escapeHtml(program.name)}">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>`;
}

function routineNoteMarkup(note) {
  if (!note.trim()) return "";
  return `<details class="routine-note-disclosure">
    <summary><span>${escapeHtml(note.trim())}</span>${chevronIcon("down")}</summary>
    <p>${escapeHtml(note)}</p>
  </details>`;
}

function emptyStateMarkup(program, routine) {
  if (!program) {
    return `<div class="empty-state"><h3>No programs yet</h3><p>Add a program to organize your workout days.</p><button class="button primary" type="button" data-action="new-program">Add program</button></div>`;
  }
  if (!routine) {
    return `<div class="empty-state"><h3>No routines yet</h3><p>Add the first workout day to ${escapeHtml(program.name)} in Program.</p><button class="button primary" type="button" data-view-link="routines">Manage program</button></div>`;
  }
  if (!routine.entries.length) {
    return `<div class="empty-state compact-empty"><h3>No exercises yet</h3><p>Open Program to add exercises.</p><button class="button secondary" type="button" data-view-link="routines">Manage program</button></div>`;
  }
  return "";
}

function pageMarkup(state, program, routine) {
  return `<section class="page workout-page">
    ${programBarMarkup(program)}
    ${routineTabsMarkup(programRoutines(state, program), routine?.id)}
    ${routine ? routineNoteMarkup(routine.note) : ""}
    ${emptyStateMarkup(program, routine)}
  </section>`;
}

function entryMarkup(state, routine, entry, { checked, showOptionalRole }) {
  const { preferred, title: name, prescription } = entryPresentation(entry, state);
  const exerciseId = preferred.exercise.id;
  const note = entry.note.trim();
  const multiChoice = entry.choices.length > 1;
  const videoControl = preferred.exercise.videoId
    ? `<a class="workout-video is-linked" href="${videoUrl(preferred.exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for preferred choice ${escapeHtml(preferred.name)}"><span class="workout-video-mark">${playIcon()}</span></a>`
    : `<button class="workout-video" type="button" data-action="open-workout-video" data-id="${escapeHtml(exerciseId)}" aria-label="Find a video for preferred choice ${escapeHtml(preferred.name)}"><span class="workout-video-mark">${playIcon()}</span></button>`;

  return `<article class="workout-item ${checked ? "is-done" : ""}">
    <button class="workout-check" type="button" data-action="toggle-entry-check" data-routine-id="${escapeHtml(routine.id)}" data-id="${escapeHtml(entry.id)}" aria-label="${checked ? "Uncheck" : "Check"} ${escapeHtml(name)} for today" aria-pressed="${checked}">
      <span class="workout-check-mark" aria-hidden="true">
        <span class="workout-check-number">${entryNumber(routine, entry.id)}</span>
        <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
      </span>
    </button>
    <button class="workout-row" type="button" data-action="${multiChoice ? "open-entry-choices" : "open-workout-exercise"}" data-id="${escapeHtml(exerciseId)}" data-entry-id="${escapeHtml(entry.id)}" data-routine-id="${escapeHtml(routine.id)}" data-prescription="${escapeHtml(prescription)}" aria-label="${multiChoice ? `Open exercise choices for ${escapeHtml(name)}` : `View ${escapeHtml(name)} details`}">
      <span class="row-main">
        <span class="row-title">${escapeHtml(name)}</span>
        <span class="row-meta">${escapeHtml(prescription)}${showOptionalRole ? `<span class="entry-role-tag">Optional</span>` : ""}</span>
        ${note ? `<span class="entry-note-preview">${escapeHtml(note)}</span>` : ""}
      </span>
    </button>
    ${videoControl}
  </article>`;
}

// A block whose entries are all Optional says so once in its label; in a mixed
// block each Optional entry carries its own tag.
function blockMarkup(state, routine, block, todayKey) {
  const name = block.name.trim();
  const entries = routine.entries.filter((entry) => entry.blockId === block.id);
  if (!entries.length && !name) return "";
  const optionalOnly = entries.length > 0 && entries.every((entry) => entry.role === "optional");
  const mixedRoles = !optionalOnly && entries.some((entry) => entry.role === "optional");
  return `<section class="workout-section" data-block-id="${escapeHtml(block.id)}">
    ${(name || optionalOnly) ? `<div class="workout-section-label"><span>${escapeHtml(name)}</span>${optionalOnly ? `<span class="workout-block-role">Optional</span>` : ""}</div>` : ""}
    ${entries.map((entry) => entryMarkup(state, routine, entry, {
      checked: isEntryChecked(state, todayKey, routine.id, entry.id),
      showOptionalRole: mixedRoles && entry.role === "optional",
    })).join("")}
  </section>`;
}

function entryChoicesMarkup(state, routine, entry) {
  const rows = entryPresentation(entry, state).choices.map((item, index) => {
    const video = item.exercise.videoId
      ? `<a class="entry-choice-video is-linked" href="${videoUrl(item.exercise.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch video for ${escapeHtml(item.name)}"><span>${playIcon()}</span></a>`
      : `<button class="entry-choice-video" type="button" data-action="open-choice-video" data-index="${index}" aria-label="Find a video for ${escapeHtml(item.name)}"><span>${playIcon()}</span></button>`;
    return `<div class="entry-choice-view-row">
      <button class="entry-choice-reference" type="button" data-action="open-choice-reference" data-index="${index}" aria-label="Open reference for ${escapeHtml(item.name)}">
        <span class="row-main"><span class="row-title">${escapeHtml(item.name)}</span><span class="row-meta">${escapeHtml(item.prescription)}</span></span>
        ${index === 0 ? `<span class="choice-preferred-tag">Preferred</span>` : ""}
        ${chevronIcon("right")}
      </button>
      ${video}
    </div>`;
  }).join("");
  const blockName = routine.blocks.find((block) => block.id === entry.blockId).name.trim();
  const context = [`Slot ${entryNumber(routine, entry.id)}`, blockName, "first choice is preferred"].filter(Boolean).join(" · ");
  return `<div class="entry-choices-sheet">
    <header class="dialog-header">
      <div><h2 id="entryChoicesTitle">Exercise choices</h2><p>${escapeHtml(context)}</p></div>
      <button class="icon-button" type="button" data-close-dialog="entryChoicesDialog" aria-label="Close exercise choices">×</button>
    </header>
    <div class="entry-choices-scroll">
      ${rows}
      <p class="entry-choices-context">${entry.note.trim() ? `${escapeHtml(entry.note)}\n\n` : ""}Checking the row completes this routine slot, not an individual choice.</p>
    </div>
  </div>`;
}

// ---------- screen ----------

registerView("workout", {
  render(state, main) {
    const scrollTop = list.rows.scrollTop; // 0 when the list wasn't on screen
    const program = activeProgram(state);
    const routine = activeRoutine(state);
    main.innerHTML = pageMarkup(state, program, routine);
    if (routine?.entries.length) {
      const todayKey = localDateKey();
      list.rows.innerHTML = routine.blocks.map((block) => blockMarkup(state, routine, block, todayKey)).join("");
      $(".workout-page", main).append(list.rows);
      list.rows.scrollTop = scrollTop;
    }
    revealSelectedTab(main);
  },
});

// A one-choice row opens its exercise's reference in the context of this slot.
function openRowReference(button) {
  const { id, routineId, entryId, prescription } = button.dataset;
  const routine = routineById(store.getState(), routineId);
  const entry = routine.entries.find((item) => item.id === entryId);
  openExerciseReference(id, { prescription, routineName: routine.name, routineNote: entry.note });
}

registerActions({
  "select-routine": (button) => {
    const result = store.update((draft) => setActiveRoutine(draft, button.dataset.id));
    if (!report(result)) return;
    list.rows.scrollTop = 0; // a different routine starts at its first exercise
    render();
  },
  "toggle-entry-check": (button) => {
    const { routineId, id } = button.dataset;
    const todayKey = localDateKey();
    const wasChecked = isEntryChecked(store.getState(), todayKey, routineId, id);
    const result = store.update((draft) => toggleEntryCheck(draft, routineId, id, todayKey));
    if (report(result, wasChecked ? "Exercise unchecked." : "Exercise checked.")) render();
  },
  "open-entry-choices": openEntryChoices,
  "open-workout-exercise": openRowReference,
  "open-workout-video": (button) => openExerciseVideo(button.dataset.id),
});

// ---------- exercise choices sheet ----------

function sheetEntry(state) {
  const routine = routineById(state, choicesSheet.routineId);
  const entry = routine?.entries.find((item) => item.id === choicesSheet.entryId);
  return entry ? { routine, entry } : null;
}

function openEntryChoices(button) {
  const { routineId, entryId } = button.dataset;
  Object.assign(choicesSheet, { routineId, entryId });
  const state = store.getState();
  const { routine, entry } = sheetEntry(state);
  $("#entryChoicesContent").innerHTML = entryChoicesMarkup(state, routine, entry);
  openDialog("#entryChoicesDialog", {
    returnFocus: button,
    fallbackFocus: () => $(`.workout-row[data-entry-id="${CSS.escape(entryId)}"]`, mainElement()) || mainElement(),
  });
}

// Data can change under the open sheet (an exercise edited or deleted from one of
// its references): show the new names, or close it when there's nothing left to choose.
function refreshEntryChoices(state) {
  const dialog = $("#entryChoicesDialog");
  if (!dialog.open) return;
  const current = sheetEntry(state);
  if (!current || current.entry.choices.length < 2) {
    closeDialog(dialog);
    return;
  }
  const focused = document.activeElement?.closest?.("#entryChoicesContent [data-action][data-index]");
  const focusSelector = focused ? `[data-action="${focused.dataset.action}"][data-index="${focused.dataset.index}"]` : "";
  $("#entryChoicesContent").innerHTML = entryChoicesMarkup(state, current.routine, current.entry);
  requestAnimationFrame(() => {
    const target = (focusSelector && $(focusSelector, dialog)) || $('[data-close-dialog="entryChoicesDialog"]', dialog);
    target.focus();
  });
}

afterRender(refreshEntryChoices);

onStart(() => {
  list.rows = document.createElement("div");
  list.rows.className = "workout-rows";

  $("#entryChoicesContent").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action][data-index]");
    if (!button) return;
    const { routine, entry } = sheetEntry(store.getState());
    const choice = entry.choices[Number(button.dataset.index)];
    if (button.dataset.action === "open-choice-reference") {
      openExerciseReference(choice.exerciseId, { prescription: choice.prescription, routineName: routine.name, routineNote: entry.note });
    } else if (button.dataset.action === "open-choice-video") {
      openExerciseVideo(choice.exerciseId);
    }
  });
});
