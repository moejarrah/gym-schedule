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
let current = "workout";
let enteringTimer;

// registerView("calendar", { markup(state), title? })
// Views without a title draw their own bar; the stylesheet hides the shared top bar for them.
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

// `entering`: the content is new to the eye (another screen or routine), so it eases in.
export function render({ entering = false } = {}) {
  const state = store.getState();
  const view = views.get(current);
  document.body.dataset.currentView = current;
  for (const button of document.querySelectorAll(".bottom-nav [data-view]")) {
    if (button.dataset.view === current) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  const main = mainElement();
  main.classList.remove("is-entering");
  redraw(main, view.markup(state));
  if (entering) {
    void main.offsetWidth; // restarts the animation
    main.classList.add("is-entering");
    clearTimeout(enteringTimer);
    enteringTimer = setTimeout(() => main.classList.remove("is-entering"), 260);
  }
  view.afterDraw?.(mainElement());
  document.querySelector("#viewTitle").textContent = view.title || "";
  for (const hook of afterRenderHooks) hook(state);
}

export function navigate(id) {
  if (!views.has(id)) return;
  current = id;
  render({ entering: true });
  mainElement().scrollTop = 0;
}

export function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#0d0f12" : "#f3f4f6";
}
