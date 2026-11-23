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

// Changes what the page area shows, with motion. The page as it was stays on screen as
// a copy (the "ghost") while the page as it is now comes in; the stylesheet moves the two
// (see "Changing page" in styles/base.css). `kind`: "push" (a deeper page comes in from
// the right, over the one that leaves), "pop" (back: the page leaves to the right),
// "right" or "left" (a neighbouring tab: a short slide from its side).
// Without motion (Reduce Motion, or a sheet still on screen) the change is immediate.
const MOTION_MS = 260;
let motionTimer;
function endMotion() {
  clearTimeout(motionTimer);
  document.querySelector("[data-page-ghost]")?.remove();
  delete mainElement().dataset.motion;
}

export function withMotion(kind, change) {
  endMotion();
  const main = mainElement();
  if (!kind || document.querySelector("dialog[open]") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    change();
    return;
  }
  // The copy keeps the id so every style of the page applies to it; it comes after the
  // page in the document, so anything looked up by id or selector still finds the real one.
  const scrolled = (area) => [area, ...area.querySelectorAll(".scroll, .scroll-x")];
  const places = scrolled(main).map((area) => [area.scrollTop, area.scrollLeft]);
  const box = main.getBoundingClientRect();
  const ghost = main.cloneNode(true);
  ghost.dataset.pageGhost = kind;
  ghost.inert = true;
  ghost.setAttribute("aria-hidden", "true");
  ghost.removeAttribute("tabindex");
  Object.assign(ghost.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
  change();
  main.after(ghost);
  scrolled(ghost).forEach((area, index) => area.scrollTo(places[index]?.[1] || 0, places[index]?.[0] || 0));
  main.dataset.motion = kind;
  motionTimer = setTimeout(endMotion, MOTION_MS);
}

// The bottom tabs, left to right.
const tabOrder = () => [...document.querySelectorAll(".bottom-nav [data-view]")].map((button) => button.dataset.view);

// Another screen. A neighbouring tab slides in from its side; a page that belongs to a
// tab (Settings) comes in over it and goes back the way it came. `motion` says it for
// the ways that aren't a tab tap ("push": Round's Start opens the workout; "pop": back
// to Round after it). The tab already showing isn't redrawn: tapping it goes back to the top.
export function navigate(id, { motion = "" } = {}) {
  if (!views.has(id)) return;
  if (id === current) {
    if (!views.get(id).reselect?.()) scrollToTop();
    return;
  }
  const fromTab = views.get(current).tab || current;
  const toTab = views.get(id).tab || id;
  const order = tabOrder();
  const kind = motion || (fromTab === toTab ? (views.get(id).tab ? "push" : "pop") : order.indexOf(toTab) > order.indexOf(fromTab) ? "right" : "left");
  current = id;
  withMotion(kind, () => {
    render();
    mainElement().scrollTop = 0;
  });
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
