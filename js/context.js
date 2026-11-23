// The running app: the one store, the registered screens, and the actions that
// taps run. Screens and sheets register themselves when their module is
// imported (see app.js).
//
// How a tap becomes a change:
//   markup has data-action="name"  →  registerActions({ name(button, event) { … } })
//   the handler changes data with store.update(...), then calls render()
//   render() redraws the current screen from the saved state
// A <form data-submit="name"> runs the action the same way when it's submitted.

import { redraw } from "./dom.js";
import { createStore } from "./store.js";

export const store = createStore();

const views = new Map();
const actions = new Map();
const afterRenderHooks = [];
let current = "round"; // the app opens on the Round tab
let enteringTimer;

// registerView("calendar", { markup(state), title?, afterDraw?(main), tab?, reselect?() })
// Views without a title draw their own bar; the stylesheet hides the shared top bar for them.
// `tab`: the bottom tab that stays marked while a view without one of its own shows
// (Settings belongs to "round"). `reselect`: called when the view's tab is tapped while
// it is showing; it returns true when it did something (went back to its first page),
// otherwise the screen scrolls to its top.
export function registerView(id, view) {
  views.set(id, view);
}

export function registerActions(map) {
  for (const [name, handler] of Object.entries(map)) {
    if (actions.has(name)) throw new Error(`Duplicate action ${name}`);
    actions.set(name, handler);
  }
}

export function runAction(name, element, event) {
  actions.get(name)?.(element, event);
}

// Runs after every render, e.g. to refresh an open sheet that shows saved data.
export function afterRender(hook) {
  afterRenderHooks.push(hook);
}

export const mainElement = () => document.querySelector("#appMain");

// `entering: "routine"`: another routine was picked, so what's under the routine
// tabs fades in (the tabs stay still under the finger).
export function render({ entering = "" } = {}) {
  const state = store.getState();
  const view = views.get(current);
  document.body.dataset.currentView = current;
  const tab = view.tab || current;
  for (const button of document.querySelectorAll(".bottom-nav [data-view]")) {
    if (button.dataset.view === tab) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  const main = mainElement();
  main.classList.remove("is-switching");
  redraw(main, view.markup(state));
  if (entering) {
    void main.offsetWidth; // restarts the animation
    main.classList.add("is-switching");
    clearTimeout(enteringTimer);
    enteringTimer = setTimeout(() => main.classList.remove("is-switching"), 220);
  }
  view.afterDraw?.(mainElement());
  document.querySelector("#viewTitle").textContent = view.title || "";
  for (const hook of afterRenderHooks) hook(state);
}

// Scrolls what's on screen back to its top, as tapping the tab you're on does on iPhone.
export function scrollToTop() {
  for (const area of [mainElement(), ...mainElement().querySelectorAll(".scroll")]) area.scrollTo({ top: 0, behavior: "smooth" });
}

// Another screen appears at once, as iPhone tab bars do. The tab already showing
// isn't redrawn: tapping it goes back to the top.
export function navigate(id) {
  if (!views.has(id)) return;
  if (id === current) {
    if (!views.get(id).reselect?.()) scrollToTop();
    return;
  }
  current = id;
  render();
  mainElement().scrollTop = 0;
}

export function applyTheme(theme) {
  const dark = theme === "dark";
  // No colour eases during the switch, or the page and its cards change at two speeds.
  const root = document.documentElement;
  root.classList.add("is-switching-theme");
  setTimeout(() => root.classList.remove("is-switching-theme"), 60);
  root.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#0d0f12" : "#f3f4f6";
}
