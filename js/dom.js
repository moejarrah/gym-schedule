// Small DOM helpers shared by every screen: queries, escaping, icons, toasts,
// redrawing, dialogs, confirmations, and hold-to-drag reordering.

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

export function playIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5Z"/></svg>`;
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

// ---------- redrawing ----------

// Replaces an element's markup. Scroll areas marked data-keep-scroll="name" stay
// where they were when the new markup has an area of the same name.
export function redraw(root, html) {
  root = element(root);
  const positions = new Map($$("[data-keep-scroll]", root).map((area) => [area.dataset.keepScroll, [area.scrollTop, area.scrollLeft]]));
  root.innerHTML = html;
  for (const area of $$("[data-keep-scroll]", root)) {
    const [top, left] = positions.get(area.dataset.keepScroll) || [0, 0];
    area.scrollTop = top;
    area.scrollLeft = left;
  }
}

// ---------- dialogs ----------
//
// The browser does the focus work: showModal() focuses the dialog's first control
// and closing puts focus back where it was. onClose(returnValue) runs once when
// the dialog next closes.

const closeHandlers = new WeakMap();

const closing = new WeakMap();

export function openDialog(dialog, { onClose } = {}) {
  dialog = element(dialog);
  if (onClose) closeHandlers.set(dialog, onClose);
  // Reopened while sliding out: it stays.
  clearTimeout(closing.get(dialog));
  delete dialog.dataset.closing;
  if (dialog.open) return;
  dialog.returnValue = "";
  dialog.showModal();
}

// Closes after the sheet has slid out (see [data-closing] in components.css).
export function closeDialog(dialog, returnValue) {
  dialog = element(dialog);
  if (!dialog?.open || "closing" in dialog.dataset) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    dialog.close(returnValue);
    return;
  }
  dialog.dataset.closing = "";
  closing.set(dialog, setTimeout(() => {
    delete dialog.dataset.closing;
    dialog.close(returnValue);
  }, 160));
}

export function initDialogs() {
  for (const dialog of $$("dialog")) {
    dialog.addEventListener("close", () => {
      // "close" arrives a moment later; if the dialog was reopened meanwhile, it's stale.
      if (dialog.open) return;
      const onClose = closeHandlers.get(dialog);
      closeHandlers.delete(dialog);
      onClose?.(dialog.returnValue);
    });
    if (dialog.classList.contains("sheet")) enablePullDown(dialog);
    // Only read-only sheets close when the dimmed backdrop is tapped; editors keep their drafts.
    if (dialog.hasAttribute("data-dismissable")) {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog, "cancel");
      });
    }
  }
}

// A sheet can be pulled down to close it, like the × in its corner. The pull
// starts on the sheet's top (handle and title), or anywhere once its content is
// scrolled to the top; a short or slow pull springs back.
function enablePullDown(dialog) {
  let pull = null;
  const release = () => {
    dialog.style.transition = "transform 160ms ease";
    dialog.style.transform = "";
    setTimeout(() => { dialog.style.transition = ""; }, 170);
  };
  dialog.addEventListener("touchstart", (event) => {
    pull = null;
    const { target } = event;
    if (event.touches.length !== 1 || "closing" in dialog.dataset || target.closest("input, textarea, select, .drag-row")) return;
    const scroller = target.closest(".sheet-body, .scroll-x") || dialog;
    if (target.closest(".scroll-x") || scroller.scrollTop > 0 || dialog.scrollTop > 0) return;
    pull = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: event.timeStamp, distance: 0, active: false };
  }, { passive: true });
  dialog.addEventListener("touchmove", (event) => {
    if (!pull) return;
    const dx = event.touches[0].clientX - pull.x;
    const dy = event.touches[0].clientY - pull.y;
    if (!pull.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      // Sideways or upwards: it's a scroll or a swipe on something else.
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || document.body.classList.contains("drag-active")) {
        pull = null;
        return;
      }
      pull.active = true;
      dialog.style.transition = "none";
    }
    event.preventDefault();
    pull.distance = Math.max(0, dy);
    dialog.style.transform = `translateY(${pull.distance}px)`;
  }, { passive: false });
  const end = (event) => {
    if (!pull?.active) {
      pull = null;
      return;
    }
    const fast = pull.distance / Math.max(1, event.timeStamp - pull.time) > 0.6;
    const far = pull.distance > Math.min(160, dialog.offsetHeight / 3);
    pull = null;
    if (event.type === "touchend" && (far || fast)) {
      dialog.style.transition = "";
      closeDialog(dialog, "cancel");
    } else {
      release();
    }
  };
  dialog.addEventListener("touchend", end);
  dialog.addEventListener("touchcancel", end);
  dialog.addEventListener("close", () => {
    dialog.style.transform = "";
    dialog.style.transition = "";
  });
}

// ---------- segmented controls ----------
// A data-segment group of buttons with data-value; the chosen value is kept on
// the group. Tapping a button selects it (see the click handling in app.js).

function element(target) {
  return typeof target === "string" ? $(target) : target;
}

export function setSegment(group, value) {
  group = element(group);
  group.dataset.value = value;
  for (const button of $$("button[data-value]", group)) button.setAttribute("aria-pressed", String(button.dataset.value === value));
}

export const segmentValue = (group) => element(group).dataset.value;

// ---------- confirmation ----------

export function confirmAction({ title, message, confirmLabel, cancelLabel = "Keep it", variant = "", danger = true }) {
  const dialog = $("#confirmDialog");
  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  $("#confirmAction").textContent = confirmLabel;
  $("#confirmCancel").textContent = cancelLabel;
  $("#confirmAction").classList.toggle("danger", danger);
  $("#confirmAction").classList.toggle("primary", !danger);
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
//   acrossLists     rows may also be dropped into another list of the container
//   onDrop(row, toIndex, list) called with the new 0-based index in its (new) list when the position changed
// Returns { cancel() }. The click that ends a drag is swallowed so it doesn't open the row.

const HOLD_DELAY = 240;
const HOLD_TOLERANCE = 10;

export function enableHoldDrag(container, { rowSelector, listSelector, placeholderClass, activeBodyClass, scroller, canStart = () => true, acrossLists = false, onDrop }) {
  let drag = null;
  let swallowNextClick = false;
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
      row.style.transition = "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)";
      row.style.transform = "translateY(0)";
    }
  }

  function placeAt(y) {
    if (acrossLists) {
      // The list the finger is over, or the nearest one above or below it.
      const distance = (list) => {
        const rect = list.getBoundingClientRect();
        return y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
      };
      drag.list = $$(listSelector, container).reduce((nearest, list) => (distance(list) < distance(nearest) ? list : nearest), drag.list);
    }
    const rows = $$(rowSelector, drag.list).filter((row) => row !== drag.row);
    // Where each row will rest, not where it is while it slides, or the gap
    // would flicker back and forth around a row in motion.
    const next = rows.find((row) => {
      const rect = row.getBoundingClientRect();
      const sliding = new DOMMatrixReadOnly(getComputedStyle(row).transform).m42;
      return y < rect.top - sliding + rect.height / 2;
    });
    // Nothing to do while the finger stays over the same gap.
    if (drag.placedList === drag.list && drag.placedBefore === (next || null)) return;
    drag.placedList = drag.list;
    drag.placedBefore = next || null;
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
      if (amount) element.scrollTop += amount;
    }
    placeAt(drag.y);
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
    drag.placedList = drag.list;
    drag.placedBefore = $$(rowSelector, drag.list).filter((item) => item !== row)[drag.originIndex] || null;
    drag.active = true;
    window.getSelection()?.removeAllRanges();
    // A focused field would make the browser scroll it back into view as the finger moves.
    if (document.activeElement?.matches?.("input, textarea, select")) document.activeElement.blur();
    // Lifted out of its list it would lose the list's padding and change size.
    const { paddingLeft, paddingRight } = getComputedStyle(row);
    row.classList.add("is-dragging");
    Object.assign(row.style, { paddingLeft, paddingRight });
    Object.assign(row.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
    // Inside an open dialog the row must stay in the dialog, or the backdrop hides it.
    (drag.list.closest("dialog") || document.body).append(row);
    document.body.classList.add(activeBodyClass);
    row.style.transition = "transform 140ms ease, box-shadow 140ms ease";
    row.style.transform = "translate3d(0, 0, 0) scale(1.015)";
    drag.frame = requestAnimationFrame(autoScroll);
  }

  function start(row, x, y, pointerId) {
    swallowNextClick = false;
    if (drag || !row || !canStart(row)) return;
    const list = row.closest(listSelector);
    if (!list) return;
    drag = { row, list, originList: list, pointerId, startX: x, startY: y, y, active: false, settling: false };
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
    swallowNextClick = true;
    if (!save) {
      current.list = current.originList;
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
      if (save && (toIndex !== current.originIndex || current.list !== current.originList)) onDrop(current.row, toIndex, current.list);
    };
    if (reducedMotion()) {
      done();
      return;
    }
    const target = current.placeholder.getBoundingClientRect();
    current.row.style.transition = "left 180ms cubic-bezier(0.2, 0.8, 0.2, 1), top 180ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)";
    Object.assign(current.row.style, { left: `${target.left}px`, top: `${target.top}px`, transform: "translate3d(0, 0, 0) scale(1)" });
    setTimeout(done, 190);
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
  // The release that ends a drag can produce a click on the row; it shouldn't open it.
  container.addEventListener("click", (event) => {
    if (!swallowNextClick) return;
    swallowNextClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
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
