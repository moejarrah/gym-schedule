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
let current = "round"; // the app opens on the round page (app.js: or on the workout in progress)
let enteringTimer;

// registerView("calendar", { markup(state), afterDraw?(main), tab?, reselect?(), back?(),
//   backTo?(), dock?(state), banner?(state), landing?(state), arrive?(from), unavailable?(state) })
// Every view draws its own top. `back`: see backStep below. `backTo`: the view going back
// from a page of a tab leads to, when it isn't the tab's own (a past day's result: Log).
// `tab`: the bottom tab that stays marked while a view without one of its own shows
// (Settings and the workout belong to "round", the Workout tab). `reselect`: called when
// the view's tab is tapped while it is showing; it returns true when it did something
// (went back to its first page), otherwise the screen scrolls to its top.
// `dock`: the markup of the bottom button above the tab bar ("" for none). `banner`: what
// the dock shows on every OTHER page while there is something to say (the workout in
// progress); it takes the place of their own bottom button.
// `landing`: the view a tap on this view's tab really opens ("" for itself).
// `arrive(from)`: called when the view comes on screen from another one.
// `unavailable`: true when the view has nothing to show; its tab's view shows instead.
export function registerView(id, view) {
  views.set(id, view);
}

// Starts the app on another view than the round page (the workout in progress).
export function openOn(id) {
  if (views.has(id)) current = id;
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
export const dockElement = () => document.querySelector("#appDock");

// The dock: one bottom button (or the bar of the workout in progress) above the tab bar.
// It is redrawn only when what it says changes, and when it now does something else
// where the finger just was, it ignores taps for a moment.
let dockMarkup = "";
function drawDock(state, view) {
  let markup = "";
  for (const [id, other] of views) {
    if (id !== current && other.banner) markup ||= other.banner(state) || "";
  }
  markup ||= view.dock?.(state) || "";
  const dock = dockElement();
  if (markup === dockMarkup) return;
  if (dockMarkup && markup) pauseTaps(["dock"]);
  dockMarkup = markup;
  dock.innerHTML = markup;
  dock.hidden = !markup;
}

// `entering: "routine"`: another routine was picked, so what's under the routine
// tabs fades in (the tabs stay still under the finger).
export function render({ entering = "" } = {}) {
  const state = store.getState();
  let view = views.get(current);
  if (view.unavailable?.(state)) {
    const from = current;
    current = view.tab;
    view = views.get(current);
    view.arrive?.(from);
  }
  document.body.dataset.currentView = current;
  const tab = view.tab || current;
  for (const button of document.querySelectorAll(".bottom-nav [data-view]")) {
    if (button.dataset.view === tab) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  const main = mainElement();
  main.classList.remove("is-switching");
  const old = redraw(main, view.markup(state));
  if (leaving && !leaving.nodes) leaving.nodes = old;
  if (entering) {
    void main.offsetWidth; // restarts the animation
    main.classList.add("is-switching");
    clearTimeout(enteringTimer);
    enteringTimer = setTimeout(() => main.classList.remove("is-switching"), 220);
  }
  drawDock(state, view);
  view.afterDraw?.(mainElement());
  for (const hook of afterRenderHooks) hook(state);
}

// What was just tapped has been replaced by something else in the same place, so the
// second tap of a double tap would land on a control the owner never saw: the page and
// the dock (or only the dock, when only it changed) ignore taps for a moment. Scrolling
// still works. Called after a change of page or of what the round page shows.
const quietUntil = { main: 0, dock: 0 };
export function pauseTaps(areas = ["main", "dock"]) {
  for (const area of areas) quietUntil[area] = performance.now() + 400;
}
// An answer to a confirmation (confirmAction in js/dom.js) pauses taps the moment it is
// tapped: the question eases out over the page, and a second tap would land on it.
document.addEventListener("submit", (event) => {
  if (event.target.closest("#confirmDialog")) pauseTaps();
}, true);
for (const [area, element] of [["main", mainElement()], ["dock", dockElement()]]) {
  element.addEventListener("click", (event) => {
    if (performance.now() >= quietUntil[area]) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

// Scrolls what's on screen back to its top, as tapping the tab you're on does on iPhone.
export function scrollToTop() {
  for (const area of [mainElement(), ...mainElement().querySelectorAll(".scroll")]) area.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- changing page ----------
//
// The page as it was stays on screen as a copy (the "ghost") while the page as it is now
// comes in; the stylesheet moves the two (see "Changing page" in styles/base.css).
// `kind`: "push" (a deeper page comes in from the right, over the one that leaves),
// "pop" (back: the page leaves to the right), "right" or "left" (another tab: the pages
// slide past like pages of a book, toward the side the tab is on).
// Without motion (Reduce Motion, or a sheet still on screen) the change is immediate.
const MOTION_MS = 340;
let motionTimer;
let motionFrame;
function endMotion() {
  clearTimeout(motionTimer);
  cancelAnimationFrame(motionFrame);
  document.querySelector("[data-page-ghost]")?.remove();
  const main = mainElement();
  delete main.dataset.motion;
  delete main.dataset.run;
  Object.assign(main.style, { transform: "", opacity: "", transition: "" });
}

const scrollAreas = (area) => [area, ...area.querySelectorAll(".scroll, .scroll-x")];
const scrollPlaces = (main) => scrollAreas(main).map((area) => [area.scrollLeft, area.scrollTop]);
const restorePlaces = (main, places) => scrollAreas(main).forEach((area, index) => area.scrollTo(...(places[index] || [0, 0])));

// The page as it is now, kept for the slide. Call the result once the page has changed:
// it puts the old page on screen, where it was and scrolled as it was, and returns it. The
// old page isn't copied (a long page took a moment to copy): the redraw hands its own
// nodes over (`leaving`, filled by render()), and they go into an empty copy of #appMain.
// That keeps the id so every style of the page applies to it; it comes after the page in
// the document, so anything looked up by id or selector still finds the real one.
let leaving = null;
function ghostOf(main, kind) {
  const places = scrollPlaces(main);
  const box = main.getBoundingClientRect();
  const ghost = main.cloneNode(false);
  ghost.dataset.pageGhost = kind;
  ghost.inert = true;
  ghost.setAttribute("aria-hidden", "true");
  ghost.removeAttribute("tabindex");
  Object.assign(ghost.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
  const taken = { nodes: null };
  leaving = taken;
  return () => {
    if (leaving === taken) leaving = null;
    // Nothing was redrawn: the page is still the one that leaves, so it is copied.
    ghost.append(...(taken.nodes || [...main.cloneNode(true).childNodes]));
    main.after(ghost);
    restorePlaces(ghost, places);
    return ghost;
  };
}

export function withMotion(kind, change) {
  endMotion();
  const main = mainElement();
  if (!kind || document.querySelector("dialog[open]") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    change();
    return;
  }
  const show = ghostOf(main, kind);
  change();
  const ghost = show();
  main.dataset.motion = kind; // both wait at their first step (the animation is paused)
  // They start moving two frames later, once the new page has been laid out and drawn.
  // Started in the same frame, the first steps were lost to that work and it stuttered.
  motionTimer = setTimeout(endMotion, 1500); // in case no frame ever comes
  motionFrame = requestAnimationFrame(() => {
    motionFrame = requestAnimationFrame(() => {
      main.dataset.run = "";
      ghost.dataset.run = "";
      clearTimeout(motionTimer);
      motionTimer = setTimeout(endMotion, MOTION_MS + 40);
    });
  });
}

// What going back from the page on screen does, or null when there is nowhere to go
// back to: a view's own answer (`back()` in registerView: Round's pages; the running
// workout answers null, since its number boxes sit where the drag starts), or, for a
// page that belongs to a tab (Settings), that tab. { apply(): the scroll position to
// return to, revert() }: both only change what is shown next; drawing it is done here.
function backStep() {
  const view = views.get(current);
  if (view.back) return view.back();
  if (!view.tab) return null;
  const from = current;
  const to = view.backTo?.() || view.tab;
  return { apply() { current = to; views.get(to).arrive?.(from); return 0; }, revert() { current = from; } };
}

// Going back by dragging from the left edge of the screen, as on iPhone: the page
// follows the finger and uncovers the one before it; let go past a third of the way (or
// with a flick) and it leaves, otherwise it comes back.
//
// It always settles. The drag redraws the page under the finger, which takes the touched
// element out of the document: the browser keeps sending that touch's moves and its end to
// the removed element, where they no longer reach the document, so they are listened for
// on the element too. And whatever happens to the touch (cancelled, taken over by the
// browser for scrolling, a second finger, the app hidden, no more events at all), the drag
// settles to the nearer side by the same rule and the ghost goes.
export function enableBackSwipe() {
  const EDGE = 28;
  const SETTLE_MS = 240;
  const QUIET_MS = 600; // no move or end for this long while a drag is under way: it settles
  let drag = null;
  const handled = new WeakSet();
  const listen = (on) => {
    for (const target of [document, drag.target]) {
      if (!target) continue;
      target[on ? "addEventListener" : "removeEventListener"]("touchmove", onMove, { passive: false });
      target[on ? "addEventListener" : "removeEventListener"]("touchend", onEnd);
      target[on ? "addEventListener" : "removeEventListener"]("touchcancel", onEnd);
    }
  };
  const stop = () => {
    if (!drag) return;
    clearTimeout(drag.quiet);
    listen(false);
    drag = null;
  };
  const watch = () => {
    clearTimeout(drag.quiet);
    drag.quiet = setTimeout(() => settle(), QUIET_MS);
  };
  const place = (dx) => {
    const progress = Math.min(1, Math.max(0, dx / drag.width));
    drag.progress = progress;
    drag.ghost.style.transform = `translateX(${Math.max(0, dx)}px)`;
    Object.assign(drag.main.style, { transform: `translateX(${-25 * (1 - progress)}%)`, opacity: String(0.4 + 0.6 * progress) });
  };
  function begin() {
    endMotion();
    const main = mainElement();
    drag.main = main;
    drag.places = scrollPlaces(main);
    const show = ghostOf(main, "drag");
    const top = drag.step.apply();
    render();
    main.scrollTop = top;
    drag.ghost = show();
    main.dataset.motion = "under";
    drag.started = true;
  }
  // The finger that started the drag, among an event's touches.
  const own = (list) => [...list].find((item) => item.identifier === drag.id);
  function onMove(event) {
    if (handled.has(event) || !drag || drag.settling) return;
    handled.add(event);
    const touch = own(event.touches);
    if (!touch || event.touches.length > 1) return settle(); // a second finger: it settles
    const dx = touch.clientX - drag.x;
    const dy = touch.clientY - drag.y;
    if (!drag.started) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > dx) return stop(); // scrolling, not going back
      if (dx > Math.abs(dy) && event.cancelable) event.preventDefault(); // sideways: claimed before the page can scroll
      if (dx < 10) return watch();
      if (!event.cancelable) return stop(); // the browser is already scrolling with it
      begin();
    }
    // The browser took the touch over (it scrolls now): settle where it is.
    if (!event.cancelable) return settle();
    event.preventDefault();
    const now = performance.now();
    if (now > drag.at) drag.speed = (touch.clientX - drag.lastX) / (now - drag.at);
    Object.assign(drag, { lastX: touch.clientX, at: now });
    // The page under the drag was changed by something else (another page came in): give up cleanly.
    if (!drag.ghost.isConnected) return settle();
    place(dx);
    watch();
  }
  function onEnd(event) {
    if (handled.has(event) || !drag) return;
    handled.add(event);
    // Another finger lifting while the dragging one stays: carry on.
    if (event.type === "touchend" && own(event.touches) && !own(event.changedTouches)) return;
    settle();
  }
  // Leaves or comes back, by the nearer side (past a third, or a flick, leaves); a drag
  // that hadn't started just stops. Every way ends with the ghost gone and the page clean.
  function settle() {
    if (!drag || drag.settling) return;
    if (!drag.started) return stop();
    clearTimeout(drag.quiet);
    listen(false);
    const { main, ghost, step, places } = drag;
    const leave = drag.progress > 0.35 || drag.speed > 0.45;
    drag.settling = true;
    const finish = () => {
      // Not far enough: the page that was being left is the page again, where it was.
      if (!leave && ghost.isConnected) {
        step.revert();
        render();
        restorePlaces(main, places);
      }
      endMotion();
      drag = null;
    };
    if (!ghost.isConnected || document.visibilityState === "hidden" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    for (const item of [ghost, main]) item.style.transition = `transform ${SETTLE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${SETTLE_MS}ms linear`;
    ghost.style.transform = leave ? "translateX(100%)" : "translateX(0)";
    Object.assign(main.style, { transform: leave ? "translateX(0)" : "translateX(-25%)", opacity: leave ? "1" : "0.4" });
    setTimeout(finish, SETTLE_MS + 20);
  }
  for (const [target, type] of [[document, "visibilitychange"], [window, "pagehide"], [window, "blur"]]) target.addEventListener(type, () => settle());
  document.addEventListener("touchstart", (event) => {
    if (drag) {
      // One left over (no end ever came): it settles now; a new one starts next time.
      settle();
      return;
    }
    if (event.touches.length !== 1 || event.touches[0].clientX > EDGE || document.querySelector("dialog[open]")) return;
    const step = backStep();
    if (!step) return;
    const { clientX, clientY, identifier } = event.touches[0];
    drag = { step, id: identifier, target: event.target, x: clientX, y: clientY, lastX: clientX, at: performance.now(), speed: 0, progress: 0, width: window.innerWidth, started: false, settling: false, quiet: 0 };
    listen(true);
    watch();
  }, { passive: true });
}

// The bottom tabs, left to right.
const tabOrder = () => [...document.querySelectorAll(".bottom-nav [data-view]")].map((button) => button.dataset.view);

// Another screen. A neighbouring tab slides in from its side; a page that belongs to a
// tab (Settings, the workout) comes in over it and goes back the way it came. `motion`
// says it for the ways that aren't a tab tap ("push": the running bar opens the workout
// from another tab; "pop"). The view already showing isn't redrawn: tapping its tab goes
// back to the top.
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
  const from = current;
  current = id;
  views.get(id).arrive?.(from);
  withMotion(kind, () => {
    render();
    mainElement().scrollTop = 0;
  });
}

// A tap on a bottom tab: the tab's view, or where its `landing` says it really opens (the
// Workout tab, while a workout runs, opens that workout).
export function openTab(id) {
  if (!views.has(id)) return;
  navigate(views.get(id).landing?.(store.getState()) || id);
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
