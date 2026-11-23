// Entry point: loads every screen, routes taps to actions, starts offline support.

import "./views/round.js";
import "./views/workout.js";
import "./views/reference.js";
import "./views/program.js";
import "./views/entry-editor.js";
import "./views/library.js";
import "./views/exercise-editor.js";
import "./views/log.js";
import "./views/settings.js";
import { afterRender, applyTheme, navigate, render, runAction, store } from "./context.js";
import { closeDialog, initDialogs, setSegment, toast } from "./dom.js";
import { finishStaleWorkout, localDateKey } from "./model.js";
import { enableRoutineSwipe } from "./views/shared.js";
import { STORAGE_KEY } from "./store.js";

initDialogs();
enableRoutineSwipe(document.querySelector("#appMain"));

// Every tap goes through here.
document.addEventListener("click", (event) => {
  const target = (selector) => event.target.closest?.(selector);
  const closer = target("[data-close-dialog]");
  if (closer) closeDialog(`#${closer.dataset.closeDialog}`);
  const option = target("[data-segment] > button[data-value]");
  if (option) setSegment(option.parentElement, option.dataset.value);
  const action = target("[data-action]");
  if (action) runAction(action.dataset.action, action, event);
  const link = target("[data-view]");
  if (link) navigate(link.dataset.view);
});

// Saving a form (its button, or Enter in a field) runs the form's action.
document.addEventListener("submit", (event) => {
  const { submit } = event.target.dataset;
  if (!submit) return;
  event.preventDefault();
  runAction(submit, event.target, event);
});

// Focus rings are for keyboard use. Opening a sheet focuses its first control,
// and on iPhone that drew a ring around it after a tap. So a tap turns rings off
// for buttons and links, and a key press outside a text field turns them back
// on. Text fields always show theirs.
const root = document.documentElement;
document.addEventListener("pointerdown", () => {
  root.dataset.input = "touch";
}, true);
document.addEventListener("keydown", (event) => {
  if (!event.target.matches?.('textarea, select, input:not([type="checkbox"], [type="radio"])')) delete root.dataset.input;
}, true);

// Another tab saved data: reload so both don't overwrite each other.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) location.reload();
});

// Offline support and updates. A new version takes over in the background; the
// page then reloads once so every file comes from the same version — but only
// when nothing is being edited, so a half-typed note isn't thrown away.
let updateReady = false;
function reloadIfIdle() {
  if (!updateReady || document.querySelector("dialog[open], #trainingRulesInput")) return;
  updateReady = false;
  location.reload();
}

function checkForUpdate() {
  navigator.serviceWorker?.getRegistration().then((registration) => registration?.update()).catch(() => {});
}

if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    updateReady = hadController;
    reloadIfIdle();
  });
  document.addEventListener("close", reloadIfIdle, true); // a sheet was closed
  afterRender(reloadIfIdle); // e.g. the training-rules editor was saved or cancelled
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .then(checkForUpdate)
    .catch(() => {
      if (!navigator.serviceWorker.controller) toast("Offline mode couldn't be started.");
    });
}

// Ask the phone to keep this app's data even when it's short of space.
navigator.storage?.persist?.().catch(() => {});

// A workout left open from an earlier day is filed in that day's Log as it stands.
function fileStaleWorkout() {
  const workout = store.getState().settings.activeWorkout;
  if (!workout || workout.dateKey === localDateKey()) return;
  let name = "";
  if (!store.update((draft) => { name = finishStaleWorkout(draft); }).ok || !name) return;
  toast(`${name} from last time was saved to the Log.`, { long: true });
  render();
}

// Coming back to the app: "today" may have changed overnight, and iOS keeps
// home-screen apps alive in the background, so also look for a new version.
let renderedDay = new Date().toDateString();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  checkForUpdate();
  fileStaleWorkout();
  const today = new Date().toDateString();
  if (today !== renderedDay) {
    renderedDay = today;
    render();
  }
});

applyTheme(store.getState().settings.theme);
if (store.getLastError()) toast(store.getLastError(), { long: true });
else fileStaleWorkout();
render();
