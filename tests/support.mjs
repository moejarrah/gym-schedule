// Shared by the unit tests: an in-memory localStorage and a store on the sample program.

import assert from "node:assert/strict";
import { createStore, STORAGE_KEY } from "../js/store.js";
import { sampleState } from "./sample.mjs";

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
    raw: () => values.get(STORAGE_KEY),
    saved: () => JSON.parse(values.get(STORAGE_KEY)),
  };
}

// A store that starts from a saved state (the sample program unless given another).
export function freshStore(state = sampleState()) {
  const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify(state) });
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

// Asserts the update is refused with this message and nothing was written.
export function refuse({ store, storage }, fn, error) {
  const before = storage.raw();
  assert.deepEqual(store.update(fn), { ok: false, error });
  assert.equal(storage.raw(), before);
  assert.deepEqual(store.getState(), JSON.parse(before));
}
