// Shared by the unit tests: an in-memory localStorage and store helpers that
// prove every change goes through createStore's validation and write.

import assert from "node:assert/strict";
import { createStore, STORAGE_KEY } from "../js/store.js";

export function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    failWrites: false,
    writes: 0,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem(key, value) {
      if (this.failWrites) throw new Error("QuotaExceededError");
      this.writes += 1;
      values.set(key, String(value));
    },
    saved: () => JSON.parse(values.get(STORAGE_KEY)),
  };
}

// A store on fake storage, optionally starting from a saved state.
export function freshStore(state) {
  const storage = fakeStorage(state ? { [STORAGE_KEY]: JSON.stringify(state) } : {});
  return { store: createStore(storage), storage };
}

// Applies fn in one update, asserts it was saved, and returns fn's result.
export function save(store, fn) {
  let returned;
  const result = store.update((draft) => {
    returned = fn(draft);
  });
  assert.deepEqual(result, { ok: true });
  return returned;
}

// Asserts the update is refused with this message and changes nothing.
export function refuse(store, fn, error) {
  const before = store.getState();
  assert.deepEqual(store.update(fn), { ok: false, error });
  assert.deepEqual(store.getState(), before);
}

// Runs fn on the starting data in one saved update; returns what was written.
export function withStore(fn) {
  const { store, storage } = freshStore();
  const returned = save(store, fn);
  return { state: storage.saved(), returned };
}
