// Entry point: loads every screen, wires navigation and global events, starts offline support.

import "./views/workout.js";
import "./views/reference.js";
import "./views/program.js";
import "./views/entry-editor.js";
import "./views/library.js";
import "./views/exercise-editor.js";
import "./views/log.js";
import "./views/settings.js";
import { applyTheme, mainElement, navigate, render, runAction, start, store } from "./context.js";
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

// "Today" can change while the app sits in the background overnight.
let renderedDay = new Date().toDateString();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const today = new Date().toDateString();
  if (today !== renderedDay) {
    renderedDay = today;
    render();
  }
});

// Another tab saved data: reload so both don't overwrite each other.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) location.reload();
});

if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  // A new version took over: reload once so every file comes from the same version.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloading) {
      reloading = true;
      location.reload();
    }
  });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .then((registration) => registration.update().catch(() => {}))
    .catch(() => {
      if (!navigator.serviceWorker.controller) toast("Offline mode couldn't be started.");
    });
}

applyTheme(store.getState().settings.theme);
render();
if (store.getLastError()) toast(store.getLastError(), { long: true });
