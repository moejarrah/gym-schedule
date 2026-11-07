// Small DOM helpers shared by every screen: queries, escaping, icons, toasts,
// dialogs with focus return, confirmations, and hold-to-drag reordering.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export function formatDate(date, options) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

// ---------- icons ----------

export function editIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 20 4.2-1 10.6-10.6a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z"/><path d="m14.5 7.1 2.8 2.8"/></svg>`;
}

export function downIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg>`;
}

export function chevronIcon(direction) {
  const paths = {
    left: "m14 7-5 5 5 5",
    right: "m10 7 5 5-5 5",
    up: "m7 14 5-5 5 5",
    down: "m7 10 5 5 5-5",
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[direction] || paths.right}"/></svg>`;
}

// ---------- feedback ----------

let toastTimer;

export function toast(message, { long = false } = {}) {
  const element = $("#toast");
  if (!element || !message) return;
  clearTimeout(toastTimer);
  element.textContent = message;
  element.classList.add("show");
  toastTimer = setTimeout(() => element.classList.remove("show"), long ? 6000 : 2600);
}

// The error line of the top-most open dialog, if it has one.
function openDialogError() {
  const open = $$("dialog[open]");
  for (let index = open.length - 1; index >= 0; index -= 1) {
    const error = $("[data-dialog-error]", open[index]);
    if (error) return error;
  }
  return null;
}

// Shows an error inside the open dialog, or as a toast when no dialog is open.
export function showError(message) {
  const error = openDialogError();
  if (!error) {
    toast(message, { long: true });
    return;
  }
  error.textContent = message;
  error.scrollIntoView({ block: "nearest" });
}

export function clearError() {
  const error = openDialogError();
  if (error) error.textContent = "";
}

// Reports a store result. Returns true when the change was saved.
export function report(result, successMessage = "") {
  if (!result.ok) {
    showError(result.error || "That change couldn't be saved.");
    return false;
  }
  clearError();
  if (successMessage) toast(successMessage);
  return true;
}

// ---------- dialogs ----------
//
// openDialog(dialog, { returnFocus, fallbackFocus, onClose }) shows a modal and,
// when it closes, puts focus back on the element that opened it (or on
// fallbackFocus() when that element was re-rendered away). Use
// closeDialog(dialog, { restoreFocus: false }) when another dialog takes over.

const dialogState = new WeakMap();

function focusWithoutScroll(element) {
  element?.focus?.({ preventScroll: true });
}

function handleDialogClose(event) {
  const dialog = event.currentTarget;
  // "close" is dispatched later; if the dialog was reopened meanwhile, this event is stale.
  if (dialog.open) return;
  const entry = dialogState.get(dialog);
  dialogState.delete(dialog);
  if (!entry) return;
  entry.onClose?.(dialog.returnValue);
  if (!entry.restoreFocus) return;
  requestAnimationFrame(() => {
    const opener = entry.returnFocus;
    const openerDialog = opener?.closest?.("dialog");
    const usable = opener?.isConnected && (!openerDialog || openerDialog.open);
    focusWithoutScroll(usable ? opener : entry.fallbackFocus?.());
  });
}

export function openDialog(dialog, { returnFocus = document.activeElement, fallbackFocus, onClose, focus } = {}) {
  if (typeof dialog === "string") dialog = $(dialog);
  if (!dialog) return;
  if (dialog.open) {
    // Re-opening an open dialog keeps its original focus target.
    const entry = dialogState.get(dialog);
    if (entry && onClose) entry.onClose = onClose;
  } else {
    dialogState.set(dialog, { returnFocus, fallbackFocus, onClose, restoreFocus: true });
    dialog.returnValue = "";
    dialog.showModal();
  }
  if (focus) requestAnimationFrame(() => focusWithoutScroll(typeof focus === "string" ? $(focus, dialog) : focus()));
}

export function closeDialog(dialog, { restoreFocus = true } = {}) {
  if (typeof dialog === "string") dialog = $(dialog);
  if (!dialog?.open) return;
  const entry = dialogState.get(dialog);
  if (entry) entry.restoreFocus = restoreFocus;
  dialog.close();
}

export function initDialogs() {
  for (const dialog of $$("dialog")) {
    dialog.addEventListener("close", handleDialogClose);
    // Only read-only sheets close when the dimmed backdrop is tapped; editors keep their drafts.
    if (dialog.hasAttribute("data-dismissable")) {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close("cancel");
      });
    }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-close-dialog]");
    if (button) closeDialog(`#${button.dataset.closeDialog}`);
  });
}

// ---------- confirmation ----------

export function confirmAction({ title, message, confirmLabel, cancelLabel = "Keep it", variant = "" }) {
  const dialog = $("#confirmDialog");
  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  $("#confirmAction").textContent = confirmLabel;
  $("#confirmCancel").textContent = cancelLabel;
  dialog.dataset.variant = variant;
  return new Promise((resolve) => {
    openDialog(dialog, {
      onClose: (value) => {
        delete dialog.dataset.variant;
        resolve(value === "confirm");
      },
    });
  });
}

// ---------- hold-to-drag reordering ----------
//
// enableHoldDrag(container, options) lets the user press and hold a row, drag it
// within its list, and drop it. Rows animate out of the way. Options:
//   rowSelector     rows that can be dragged (inside container)
//   listSelector    the row's list (rows reorder only inside it)
//   placeholderClass, activeBodyClass
//   scroller()      element to auto-scroll near its edges
//   canStart(row)   optional guard
//   onDrop(row, toIndex) called with the new 0-based index when the position changed
// Returns { cancel() }. A click right after a drag is swallowed so it doesn't open the row.

const HOLD_DELAY = 340;
const HOLD_TOLERANCE = 10;

export function enableHoldDrag(container, { rowSelector, listSelector, placeholderClass, activeBodyClass, scroller, canStart = () => true, onDrop }) {
  let drag = null;
  let suppressClickUntil = 0;
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function point(event) {
    if (!event.type.startsWith("touch")) return { x: event.clientX, y: event.clientY };
    const touch = [...event.touches, ...event.changedTouches].find((item) => item.identifier === drag?.pointerId);
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function slide(rows, mutate) {
    const before = new Map(rows.map((row) => [row, row.getBoundingClientRect().top]));
    mutate();
    if (reducedMotion()) return;
    const moved = [];
    for (const row of rows) {
      row.style.transition = "none";
      const delta = before.get(row) - row.getBoundingClientRect().top;
      row.style.transform = delta ? `translateY(${delta}px)` : "";
      if (delta) moved.push(row);
    }
    if (!moved.length) return;
    void moved[0].offsetHeight;
    for (const row of moved) {
      row.style.transition = "transform 160ms ease";
      row.style.transform = "translateY(0)";
    }
  }

  function placeAt(y) {
    const rows = $$(rowSelector, drag.list).filter((row) => row !== drag.row);
    const next = rows.find((row) => {
      const rect = row.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
    slide(rows, () => {
      if (next) drag.list.insertBefore(drag.placeholder, next);
      else drag.list.append(drag.placeholder);
    });
  }

  function autoScroll() {
    if (!drag?.active) return;
    const element = scroller?.();
    if (element) {
      const bounds = element.getBoundingClientRect();
      const edge = 56;
      const top = drag.y - bounds.top;
      const bottom = bounds.bottom - drag.y;
      let amount = 0;
      if (top < edge) amount = -Math.ceil((edge - Math.max(0, top)) / 5);
      else if (bottom < edge) amount = Math.ceil((edge - Math.max(0, bottom)) / 5);
      if (amount) {
        element.scrollTop += amount;
        placeAt(drag.y);
      }
    }
    drag.frame = requestAnimationFrame(autoScroll);
  }

  function activate() {
    if (!drag?.row.isConnected) {
      drag = null;
      return;
    }
    const { row } = drag;
    const bounds = row.getBoundingClientRect();
    drag.placeholder = document.createElement("div");
    drag.placeholder.className = placeholderClass;
    drag.placeholder.style.height = `${bounds.height}px`;
    drag.originIndex = $$(rowSelector, drag.list).indexOf(row);
    row.before(drag.placeholder);
    drag.active = true;
    window.getSelection()?.removeAllRanges();
    row.classList.add("is-dragging");
    Object.assign(row.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
    // Inside an open dialog the row must stay in the dialog, or the backdrop hides it.
    (drag.list.closest("dialog") || document.body).append(row);
    document.body.classList.add(activeBodyClass);
    row.style.transition = "transform 140ms ease, box-shadow 140ms ease";
    row.style.transform = "translate3d(0, 0, 0) scale(1.015)";
    drag.frame = requestAnimationFrame(autoScroll);
  }

  function start(row, x, y, pointerId) {
    if (drag || !row || !canStart(row)) return;
    const list = row.closest(listSelector);
    if (!list) return;
    drag = { row, list, pointerId, startX: x, startY: y, y, active: false, settling: false };
    drag.timer = setTimeout(activate, HOLD_DELAY);
  }

  function move(event) {
    if (!drag || drag.settling) return;
    const p = point(event);
    if (!p) return;
    if (!drag.active) {
      if (Math.hypot(p.x - drag.startX, p.y - drag.startY) > HOLD_TOLERANCE) {
        clearTimeout(drag.timer);
        drag = null;
      }
      return;
    }
    event.preventDefault();
    drag.y = p.y;
    drag.row.style.transition = "";
    drag.row.style.transform = `translate3d(0, ${p.y - drag.startY}px, 0) scale(1.015)`;
    placeAt(p.y);
  }

  function finish(save) {
    if (!drag || drag.settling) return;
    clearTimeout(drag.timer);
    const current = drag;
    if (!current.active) {
      drag = null;
      return;
    }
    current.settling = true;
    cancelAnimationFrame(current.frame);
    suppressClickUntil = performance.now() + 600;
    if (!save) {
      const rows = $$(rowSelector, current.list).filter((row) => row !== current.row);
      const reference = rows[current.originIndex] || null;
      if (reference) current.list.insertBefore(current.placeholder, reference);
      else current.list.append(current.placeholder);
    }
    const done = () => {
      drag = null;
      const toIndex = [...current.list.children].filter((child) => child === current.placeholder || child.matches(rowSelector)).indexOf(current.placeholder);
      current.placeholder.replaceWith(current.row);
      current.row.classList.remove("is-dragging");
      current.row.removeAttribute("style");
      document.body.classList.remove(activeBodyClass);
      if (save && toIndex !== current.originIndex) onDrop(current.row, toIndex);
    };
    if (reducedMotion()) {
      done();
      return;
    }
    const target = current.placeholder.getBoundingClientRect();
    current.row.style.transition = "left 140ms ease, top 140ms ease, transform 140ms ease";
    Object.assign(current.row.style, { left: `${target.left}px`, top: `${target.top}px`, transform: "translate3d(0, 0, 0) scale(1)" });
    setTimeout(done, 150);
  }

  container.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    start(event.target.closest(rowSelector), touch.clientX, touch.clientY, touch.identifier);
  }, { passive: true });
  container.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button === 0) start(event.target.closest(rowSelector), event.clientX, event.clientY, event.pointerId);
  });
  container.addEventListener("selectstart", (event) => {
    if (event.target.closest?.(rowSelector)) event.preventDefault();
  });
  container.addEventListener("click", (event) => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", (event) => {
    if (!drag || ![...event.changedTouches].some((touch) => touch.identifier === drag.pointerId)) return;
    if (drag.active) event.preventDefault();
    finish(true);
  }, { passive: false });
  window.addEventListener("touchcancel", () => finish(false));
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse" && event.pointerId === drag?.pointerId) move(event);
  });
  window.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse" && event.pointerId === drag?.pointerId) finish(true);
  });
  window.addEventListener("pointercancel", (event) => {
    if (event.pointerId === drag?.pointerId) finish(false);
  });
  document.addEventListener("contextmenu", (event) => {
    if (drag?.active) event.preventDefault();
  });

  return { cancel: () => finish(false) };
}
