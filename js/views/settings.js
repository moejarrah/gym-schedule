// Settings screen: theme, backup export and import, restoring the starting data,
// downloading saved data that couldn't be read, the owner's training rules
// (shown formatted, edited inline as plain text), and the installed version.

import { applyTheme, mainElement, onStart, registerActions, registerView, render, store } from "../context.js";
import { $, confirmAction, escapeHtml, report, toast } from "../dom.js";
import { localDateKey, setTheme, setTrainingRules } from "../model.js";
import { createBackup, createDefaultState, parseBackup } from "../store.js";

const CACHE_PREFIX = "gym-schedule-"; // sw.js names its offline cache with this prefix

// `draft` is null while the rules are shown, and the unsaved text while they're edited,
// so a re-render (theme switch, coming back to the screen) keeps what was typed.
const rulesEditor = { draft: null };
// The last version line found, so re-renders don't flash the placeholder.
const about = { version: "Checking offline copy…" };

const themeLabel = (theme) => (theme === "dark" ? "Dark" : "Light");

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
  return sections.map(([heading, ...lines]) => `<section class="rule-section"><h3>${escapeHtml(heading)}</h3>${ruleBodyMarkup(lines)}</section>`).join("");
}

function rulesSectionMarkup(rules) {
  if (rulesEditor.draft === null) {
    return `<section class="settings-section settings-rules" aria-labelledby="settingsRulesTitle">
      <div class="settings-heading">
        <h2 id="settingsRulesTitle">Training rules</h2>
        <button class="text-button" id="editRulesButton" type="button" data-action="edit-training-rules" aria-label="Edit training rules">Edit</button>
      </div>
      <div id="rulesContent" class="rules-list">${rulesMarkup(rules)}</div>
    </section>`;
  }
  return `<section class="settings-section settings-rules" aria-labelledby="settingsRulesTitle">
    <div class="settings-heading"><h2 id="settingsRulesTitle">Training rules</h2></div>
    <div class="field"><textarea id="trainingRulesInput" rows="14" aria-labelledby="settingsRulesTitle" aria-describedby="trainingRulesHint">${escapeHtml(rulesEditor.draft)}</textarea></div>
    <div class="form-note" id="trainingRulesHint">Leave a blank line between sections. A section's first line is its heading; start a line with “- ” to make a list item.</div>
    <div class="form-error" id="trainingRulesError" role="alert" aria-live="polite"></div>
    <div class="dialog-actions">
      <button class="button secondary" type="button" data-action="cancel-training-rules">Cancel</button>
      <button class="button primary" type="button" data-action="save-training-rules">Save rules</button>
    </div>
  </section>`;
}

function recoveryMarkup() {
  if (!store.recoveryData()) return "";
  return `<div class="settings-recovery">
    <p><strong>Earlier saved data couldn't be read</strong> The app opened the starting program instead. The unreadable data is still on this device; download it to keep a copy.</p>
    <button class="button secondary" type="button" data-action="download-unreadable-data">Download unreadable data</button>
  </div>`;
}

function settingsMarkup(state) {
  return `<section class="page settings-page" aria-label="Settings">
    <section class="settings-section" aria-labelledby="settingsAppearanceTitle">
      <h2 id="settingsAppearanceTitle">Appearance</h2>
      <button class="selection-row" id="settingsThemeButton" type="button" data-action="toggle-theme"><span><strong>Theme</strong><small id="settingsThemeValue">${themeLabel(state.settings.theme)}</small></span><span aria-hidden="true">›</span></button>
    </section>
    <section class="settings-section" aria-labelledby="settingsDataTitle">
      <h2 id="settingsDataTitle">Data</h2>
      ${recoveryMarkup()}
      <p>Export a copy, import a compatible file, or restore the starting program.</p>
      <div class="stacked-actions">
        <button class="button secondary" id="exportButton" type="button" data-action="export-data">Export app data</button>
        <button class="button secondary" id="importButton" type="button" data-action="import-data">Import app data</button>
        <button class="button secondary danger-text" id="resetButton" type="button" data-action="restore-data">Restore starting data</button>
      </div>
      <div class="form-error" id="settingsFormError" role="alert" aria-live="polite"></div>
    </section>
    ${rulesSectionMarkup(state.settings.trainingRules)}
    <section class="settings-section" aria-labelledby="settingsAboutTitle">
      <h2 id="settingsAboutTitle">About</h2>
      <p id="settingsVersion">${escapeHtml(about.version)}</p>
      <p>Works offline. Your data stays on this device.</p>
    </section>
  </section>`;
}

// ---------- helpers ----------

// Re-rendering replaces the screen's buttons; put focus back on the one that was used.
function rerender(selector) {
  render();
  $(selector, mainElement()).focus({ preventScroll: true });
}

function showDataError(message) {
  $("#settingsFormError").textContent = message;
}

function clearDataError() {
  $("#settingsFormError").textContent = "";
}

// The share sheet's "Save to Files" is the dependable way to get a file out of the
// installed iPhone app; elsewhere a download link does it. Cancelling isn't an error.
async function saveFile(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if (error.name !== "AbortError") throw error;
    }
    return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const jsonFile = (text, name) => new File([text], name, { type: "application/json" });

// Caches are unavailable outside a secure context (e.g. the LAN preview).
async function installedVersion() {
  const keys = (await globalThis.caches?.keys().catch(() => null)) || [];
  const key = keys.findLast((name) => name.startsWith(CACHE_PREFIX));
  return key ? `Version ${key.slice(CACHE_PREFIX.length)}` : "Offline copy not installed yet";
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

function exportData() {
  clearDataError();
  const backup = JSON.stringify(createBackup(store.getState()), null, 2);
  saveFile(jsonFile(backup, `gym-schedule-${localDateKey()}.json`)).catch(() => showDataError("App data couldn't be exported."));
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
    message: "Replace the routines, exercises, and history currently stored on this device?",
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
  rerender("#importButton");
  toast("App data imported.");
}

async function restoreStartingData() {
  clearDataError();
  const confirmed = await confirmAction({
    title: "Restore starting data",
    message: "Replace all current routines, exercises, and history with the starting program? Your theme and training rules stay.",
    confirmLabel: "Restore data",
  });
  if (!confirmed) return;
  const { theme, trainingRules } = store.getState().settings;
  const next = createDefaultState();
  Object.assign(next.settings, { theme, trainingRules });
  const result = store.replace(next);
  if (!result.ok) {
    showDataError(result.error);
    return;
  }
  rulesEditor.draft = null;
  rerender("#resetButton");
  toast("Starting data restored.");
}

function editTrainingRules() {
  rulesEditor.draft = store.getState().settings.trainingRules;
  rerender("#trainingRulesInput");
}

function cancelTrainingRules() {
  rulesEditor.draft = null;
  rerender("#editRulesButton");
}

function saveTrainingRules() {
  const result = store.update((draft) => setTrainingRules(draft, rulesEditor.draft));
  if (!result.ok) {
    $("#trainingRulesError").textContent = result.error;
    return;
  }
  rulesEditor.draft = null;
  rerender("#editRulesButton");
  toast("Training rules saved.");
}

registerView("settings", {
  render(state, main) {
    main.innerHTML = settingsMarkup(state);
    refreshVersion();
  },
  header: () => ["Settings", "Appearance, data and training rules"],
});

registerActions({
  "toggle-theme": toggleTheme,
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

onStart(() => {
  const input = $("#importFile");
  input.addEventListener("change", () => {
    const [file] = input.files;
    // Cleared so choosing the same file again still fires "change".
    input.value = "";
    if (file) importData(file);
  });
  mainElement().addEventListener("input", (event) => {
    if (event.target.id === "trainingRulesInput") rulesEditor.draft = event.target.value;
  });
});
