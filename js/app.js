// Entry point: loads every screen, wires navigation and global events, starts offline support.

import "./views/workout.js";
import "./views/reference.js";
import "./views/program.js";
import "./views/entry-editor.js";
import "./views/library.js";
import "./views/exercise-editor.js";
import "./views/log.js";
import "./views/settings.js";
import { afterRender, applyTheme, mainElement, navigate, render, runAction, start, store } from "./context.js";
import { initDialogs, toast } from "./dom.js";
import { STORAGE_KEY } from "./store.js";

initDialogs();
start();

document.querySelector(".bottom-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) navigate(button.dataset.view);
});

mainElement().addEventListener("click", (event) => {
  const link = event.target.closest("[data-view-link]");
  if (link) {
    navigate(link.dataset.viewLink);
    return;
  }
  const button = event.target.closest("[data-action]");
  if (button) runAction(button.dataset.action, button, event);
});

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

// Coming back to the app: "today" may have changed overnight, and iOS keeps
// home-screen apps alive in the background, so also look for a new version.
let renderedDay = new Date().toDateString();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  checkForUpdate();
  const today = new Date().toDateString();
  if (today !== renderedDay) {
    renderedDay = today;
    render();
  }
});

applyTheme(store.getState().settings.theme);
render();
if (store.getLastError()) toast(store.getLastError(), { long: true });
