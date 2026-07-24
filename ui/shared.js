export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function editIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 20 4.2-1 10.6-10.6a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z"/><path d="m14.5 7.1 2.8 2.8"/></svg>`;
}

export function upIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 14 5-5 5 5"/></svg>`;
}

export function downIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg>`;
}

export function chevronIcon(direction) {
  const paths = {
    left: "m14 7-5 5 5 5",
    right: "m10 7 5 5-5 5",
    up: "m7 14 5-5 5 5",
    down: "m7 10 5 5 5-5",
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[direction] || paths.right}"/></svg>`;
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
