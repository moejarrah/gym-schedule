// Settings screen, opened from the gear on the Round tab (its back link returns
// there): theme, backup export and import, restoring the starting data,
// downloading saved data that couldn't be read, the owner's training rules
// (shown formatted, edited inline as plain text), and the installed version.

import { applyTheme, mainElement, registerActions, registerView, render, store } from "../context.js";
import { $, chevronIcon, confirmAction, escapeHtml, report, toast } from "../dom.js";
import { backupAge, exerciseLabels, localDateKey, setBackupDone, setExerciseLabels, setTheme, setTrainingRules } from "../model.js";
import { createBackup, createDefaultState, parseBackup } from "../store.js";

const CACHE_PREFIX = "gym-schedule-"; // sw.js names its offline cache with this prefix

// `draft` is null while the rules are shown, and the unsaved text while they're edited,
// so a re-render (theme switch, coming back to the screen) keeps what was typed.
const rulesEditor = { draft: null };
// The last version line found, so re-renders don't flash the placeholder.
const about = { version: "Checking offline copy…" };

const themeLabel = (theme) => (theme === "dark" ? "Dark" : "Light");
const labelsLabel = (state) => (exerciseLabels(state) === "letter" ? "Equipment as a coloured letter" : "Equipment as a word");

// ---------- markup ----------

// The owner's rules as typed: blank lines separate sections, a section's first
// line is its heading, "- " lines are list items and other lines are paragraphs.
function ruleSections(text) {
  const sections = [[]];
  for (const line of text.split(/\r?\n/).map((item) => item.trim())) {
    if (line) sections.at(-1).push(line);
    else if (sections.at(-1).length) sections.push([]);
  }
  return sections.filter((lines) => lines.length);
}

function ruleBodyMarkup(lines) {
  let markup = "";
  let inList = false;
  for (const line of lines) {
    const isItem = line.startsWith("- ");
    if (isItem !== inList) markup += isItem ? "<ul>" : "</ul>";
    inList = isItem;
    markup += isItem ? `<li>${escapeHtml(line.slice(2))}</li>` : `<p>${escapeHtml(line)}</p>`;
  }
  return inList ? `${markup}</ul>` : markup;
}

function rulesMarkup(text) {
  const sections = ruleSections(text);
  if (!sections.length) return `<p>No training rules yet.</p>`;
  return sections.map(([heading, ...lines]) => `<section class="card rule"><h3>${escapeHtml(heading)}</h3>${ruleBodyMarkup(lines)}</section>`).join("");
}

function rulesSectionMarkup(rules) {
  if (rulesEditor.draft === null) {
    return `<section class="stack tight" aria-labelledby="settingsRulesTitle">
      <div class="label label-row">
        <h2 id="settingsRulesTitle">Training rules</h2>
        <button class="link-button" id="editRulesButton" type="button" data-action="edit-training-rules" aria-label="Edit training rules">Edit</button>
      </div>
      <div id="rulesContent" class="stack tight">${rulesMarkup(rules)}</div>
    </section>`;
  }
  return `<section class="stack tight" aria-labelledby="settingsRulesTitle">
    <div class="label label-row"><h2 id="settingsRulesTitle">Training rules</h2></div>
    <div class="field"><textarea class="control" id="trainingRulesInput" rows="14" aria-labelledby="settingsRulesTitle" aria-describedby="trainingRulesHint">${escapeHtml(rulesEditor.draft)}</textarea></div>
    <div class="hint" id="trainingRulesHint">Leave a blank line between sections. A section's first line is its heading; start a line with “- ” to make a list item.</div>
    <div class="form-error" id="trainingRulesError" role="alert" aria-live="polite"></div>
    <div class="actions">
      <button class="button" type="button" data-action="cancel-training-rules">Cancel</button>
      <button class="button primary" type="button" data-action="save-training-rules">Save rules</button>
    </div>
  </section>`;
}

function recoveryMarkup() {
  if (!store.recoveryData()) return "";
  return `<div class="card stack tight settings-recovery">
    <p><strong>Saved data couldn't be read</strong> ${store.getLastError()
    ? "The starting program is open and nothing is saved. Download the unreadable data to keep a copy, then import a backup or restore the starting data."
    : "It is still on this device; download it to keep a copy."}</p>
    <button class="button" type="button" data-action="download-unreadable-data">Download unreadable data</button>
  </div>`;
}

function backupLine(state) {
  const days = backupAge(state);
  if (days === null) return "<strong>No backup yet.</strong>";
  return `<strong>Last backup: ${days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`}.</strong>`;
}

function settingsMarkup(state) {
  return `<header class="page-back">
      <button class="link-button" type="button" data-view="round" aria-label="Back to Round">${chevronIcon("left")}Round</button>
      <h1 class="title">Settings</h1>
    </header>
    <section class="page stack settings-page" aria-label="Settings">
    <section class="stack tight" aria-labelledby="settingsAppearanceTitle">
      <h2 class="label" id="settingsAppearanceTitle">Appearance</h2>
      <button class="row card" id="settingsThemeButton" type="button" data-action="toggle-theme"><span class="row-main"><strong class="row-title">Theme</strong><small class="row-meta" id="settingsThemeValue">${themeLabel(state.settings.theme)}</small></span><span class="chev" aria-hidden="true">›</span></button>
      <button class="row card" type="button" data-action="toggle-exercise-labels"><span class="row-main"><strong class="row-title">Exercise version</strong><small class="row-meta" id="settingsLabelsValue">${labelsLabel(state)}</small></span><span class="chev" aria-hidden="true">›</span></button>
    </section>
    <section class="stack tight" aria-labelledby="settingsDataTitle">
      <h2 class="label" id="settingsDataTitle">Data</h2>
      ${recoveryMarkup()}
      <p>${backupLine(state)} Your workouts live only on this phone: export a copy now and then, and keep it in Files or iCloud.</p>
      <div class="stack snug">
        <button class="button" id="exportButton" type="button" data-action="export-data">Export app data</button>
        <button class="button" id="importButton" type="button" data-action="import-data">Import app data</button>
        <button class="button danger-text" id="resetButton" type="button" data-action="restore-data">Restore starting data</button>
      </div>
      <div class="form-error" id="settingsFormError" role="alert" aria-live="polite"></div>
    </section>
    ${rulesSectionMarkup(state.settings.trainingRules)}
    <section class="stack tight" aria-labelledby="settingsAboutTitle">
      <h2 class="label" id="settingsAboutTitle">About</h2>
      <p id="settingsVersion">${escapeHtml(about.version)}</p>
      <p>Works offline. Your data stays on this device.</p>
    </section>
  </section>`;
}

// ---------- helpers ----------

function showDataError(message) {
  $("#settingsFormError").textContent = message;
}

function clearDataError() {
  $("#settingsFormError").textContent = "";
}

// The share sheet's "Save to Files" is the dependable way to get a file out of the
// installed iPhone app; elsewhere a download link does it. Cancelling isn't an
// error: it resolves to false, and to true once the file was handed over.
async function saveFile(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if (error.name !== "AbortError") throw error;
      return false;
    }
    return true;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

const jsonFile = (text, name) => new File([text], name, { type: "application/json" });

// The newest offline cache that actually holds the app (a failed download leaves an
// empty one). Caches don't exist outside a secure context, e.g. the LAN preview.
async function installedVersion() {
  const keys = (await globalThis.caches?.keys().catch(() => null)) || [];
  for (const key of keys.filter((name) => name.startsWith(CACHE_PREFIX)).reverse()) {
    if (await (await caches.open(key)).match("./index.html")) return `Version ${key.slice(CACHE_PREFIX.length)}`;
  }
  return "Offline copy not installed yet";
}

async function refreshVersion() {
  about.version = await installedVersion();
  const line = $("#settingsVersion");
  if (line) line.textContent = about.version;
}

// ---------- actions ----------

function toggleTheme() {
  const theme = store.getState().settings.theme === "dark" ? "light" : "dark";
  if (!report(store.update((draft) => setTheme(draft, theme)))) return;
  applyTheme(theme);
  $("#settingsThemeValue").textContent = themeLabel(theme);
}

// Only this row's text changes here; the other screens draw names when they open.
function toggleExerciseLabels() {
  const mode = exerciseLabels(store.getState()) === "letter" ? "line" : "letter";
  if (!report(store.update((draft) => setExerciseLabels(draft, mode)))) return;
  $("#settingsLabelsValue").textContent = labelsLabel(store.getState());
}

function exportData() {
  clearDataError();
  const backup = JSON.stringify(createBackup(store.getState()), null, 2);
  saveFile(jsonFile(backup, `gym-schedule-${localDateKey()}.json`))
    .then((saved) => {
      if (saved && store.update((draft) => setBackupDone(draft)).ok) render();
    })
    .catch(() => showDataError("App data couldn't be exported."));
}

function downloadUnreadableData() {
  clearDataError();
  saveFile(jsonFile(store.recoveryData(), `gym-schedule-unreadable-${localDateKey()}.json`))
    .catch(() => showDataError("The unreadable data couldn't be saved."));
}

async function importData(file) {
  clearDataError();
  const text = await file.text().catch(() => null);
  if (text === null) {
    showDataError("This file couldn't be read. Nothing changed.");
    return;
  }
  let next;
  try {
    next = parseBackup(text);
  } catch (error) {
    showDataError(error.message);
    return;
  }
  const confirmed = await confirmAction({
    title: "Import app data",
    message: "Replace the programs, exercises and history currently stored on this device?",
    confirmLabel: "Import data",
  });
  if (!confirmed) return;
  const result = store.replace(next);
  if (!result.ok) {
    showDataError(result.error);
    return;
  }
  rulesEditor.draft = null;
  applyTheme(next.settings.theme);
  render();
  toast("App data imported.");
}

async function restoreStartingData() {
  clearDataError();
  const confirmed = await confirmAction({
    title: "Restore starting data",
    message: "Replace all current programs, exercises and history with the starting program? Your theme and training rules stay.",
    confirmLabel: "Restore data",
  });
  if (!confirmed) return;
  const { theme, trainingRules, exerciseLabels: labels } = store.getState().settings;
  const next = createDefaultState();
  Object.assign(next.settings, { theme, trainingRules, ...(labels ? { exerciseLabels: labels } : {}) });
  const result = store.replace(next);
  if (!result.ok) {
    showDataError(result.error);
    return;
  }
  rulesEditor.draft = null;
  render();
  toast("Starting data restored.");
}

function editTrainingRules() {
  rulesEditor.draft = store.getState().settings.trainingRules;
  render();
  $("#trainingRulesInput").focus({ preventScroll: true }); // ready to type
}

function cancelTrainingRules() {
  rulesEditor.draft = null;
  render();
}

function saveTrainingRules() {
  const result = store.update((draft) => setTrainingRules(draft, rulesEditor.draft));
  if (!result.ok) {
    $("#trainingRulesError").textContent = result.error;
    return;
  }
  rulesEditor.draft = null;
  render();
  toast("Training rules saved.");
}

registerView("settings", { markup: settingsMarkup, afterDraw: refreshVersion, tab: "round" });

registerActions({
  "toggle-theme": toggleTheme,
  "toggle-exercise-labels": toggleExerciseLabels,
  "export-data": exportData,
  "import-data": () => {
    clearDataError();
    $("#importFile").click();
  },
  "restore-data": restoreStartingData,
  "download-unreadable-data": downloadUnreadableData,
  "edit-training-rules": editTrainingRules,
  "cancel-training-rules": cancelTrainingRules,
  "save-training-rules": saveTrainingRules,
});

$("#importFile").addEventListener("change", (event) => {
  const input = event.target;
  const [file] = input.files;
  // Cleared so choosing the same file again still fires "change".
  input.value = "";
  if (file) importData(file);
});
mainElement().addEventListener("input", (event) => {
  if (event.target.id === "trainingRulesInput") rulesEditor.draft = event.target.value;
});
