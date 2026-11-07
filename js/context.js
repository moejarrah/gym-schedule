// The running app: the one store, the registered screens, and their actions.
// Screens register themselves when their module is imported (see app.js).

import { createStore } from "./store.js";

export const store = createStore();

const views = new Map();
const actions = new Map();
const afterRenderHooks = [];
let current = "workout";

// registerView("workout", { render(state, main), header?(state) → [title, meta] })
// A view without a header hides the top bar (see base.css).
export function registerView(id, view) {
  views.set(id, view);
}

// registerActions({ "open-logger": (button, event) => … })
// Any element inside the main area with data-action="name" runs that handler on click.
export function registerActions(map) {
  for (const [name, handler] of Object.entries(map)) {
    if (actions.has(name)) throw new Error(`Duplicate action ${name}`);
    actions.set(name, handler);
  }
}

// Runs once at startup, after the DOM and dialogs are ready: bind listeners here,
// never at module top level (modules are also imported by Node tests).
const startHooks = [];
export function onStart(hook) {
  startHooks.push(hook);
}
export function start() {
  for (const hook of startHooks) hook();
}

// Runs after every render, e.g. to refresh an open sheet that shows saved data.
export function afterRender(hook) {
  afterRenderHooks.push(hook);
}

export function runAction(name, button, event) {
  const handler = actions.get(name);
  if (!handler) return false;
  handler(button, event);
  return true;
}

export const mainElement = () => document.querySelector("#appMain");

export function render() {
  const state = store.getState();
  const view = views.get(current) || views.get("workout");
  document.body.dataset.currentView = current;
  for (const button of document.querySelectorAll(".bottom-nav [data-view]")) {
    if (button.dataset.view === current) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  view.render(state, mainElement());
  const [title = "", meta = ""] = view.header?.(state) || [];
  document.querySelector("#viewTitle").textContent = title;
  document.querySelector("#viewMetaLine").textContent = meta;
  for (const hook of afterRenderHooks) hook(state);
}

export function navigate(id) {
  if (!views.has(id)) return;
  current = id;
  render();
  const main = mainElement();
  main.scrollTop = 0;
  main.focus({ preventScroll: true });
}

export function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#0f1114" : "#f3f4f5";
}
