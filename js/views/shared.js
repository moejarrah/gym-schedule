// Markup pieces used by more than one screen.

import { escapeHtml } from "../dom.js";
import { exerciseById } from "../model.js";

// Display data for a routine entry: its choices with names, the derived title,
// and one prescription line ("3 × 8" or "3 × 8 or 2 × 12").
export function entryPresentation(entry, state) {
  const choices = entry.choices.map((choice) => {
    const exercise = exerciseById(state, choice.exerciseId);
    return { choice, exercise, name: exercise?.name || "Missing exercise", prescription: choice.prescription || "No prescription" };
  });
  const prescriptions = choices.map((item) => item.prescription);
  const shared = prescriptions.length > 0 && prescriptions.every((prescription) => prescription === prescriptions[0]);
  return {
    choices,
    preferred: choices[0] || null,
    title: choices.map((item) => item.name).join(" or ") || "No exercise choices",
    prescription: shared ? prescriptions[0] : prescriptions.join(" or "),
  };
}

export function routineTabsMarkup(routines, selectedId) {
  if (!routines.length) return "";
  return `<div class="routine-tabs" aria-label="Choose a routine">
    ${routines.map((routine) => `
      <button class="routine-tab ${routine.group === "home" ? "home" : ""}" type="button"
        aria-label="${escapeHtml(routine.name)}, ${routine.group === "home" ? "Home" : "Gym"}" aria-pressed="${routine.id === selectedId}" data-action="select-routine" data-id="${escapeHtml(routine.id)}">
        <span class="routine-dot" aria-hidden="true"></span>${escapeHtml(routine.name)}
      </button>`).join("")}
  </div>`;
}

// Keeps the selected routine tab visible after the tab strip is re-rendered.
export function revealSelectedTab(root) {
  const tab = root.querySelector(".routine-tab[aria-pressed='true']");
  const strip = tab?.closest(".routine-tabs");
  if (!tab || !strip) return;
  const stripBox = strip.getBoundingClientRect();
  const tabBox = tab.getBoundingClientRect();
  const margin = 32; // room for the strip's fade-out edge
  if (tabBox.left < stripBox.left) strip.scrollLeft -= stripBox.left - tabBox.left + margin;
  else if (tabBox.right > stripBox.right) strip.scrollLeft += tabBox.right - stripBox.right + margin;
}
