// The installed app runs from the service worker's cache, so every file the
// page can load must exist and be listed in sw.js FILES (stamped by tools/check.mjs).

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const exists = (file) => existsSync(new URL(`../${file}`, import.meta.url));
const resolve = (from, ref) => posix.join(posix.dirname(from), ref.split(/[?#]/)[0]);
const isLocal = (ref) => !/^(?:[a-z]+:|#|\/\/)/i.test(ref);

const cached = new Set(JSON.parse(/const FILES = (\[[\s\S]*?\]); \/\/ stamped/.exec(read("sw.js"))[1]).map((file) => file.replace(/^\.\//, "")));

// Static `import … from "x"`, `import "x"` and `export … from "x"` at the start of a line.
const IMPORT = /^\s*(?:import|export)\s(?:[^;"'`]*?\sfrom\s*)?["']([^"']+)["']/gm;

function modulesFrom(entry, found = new Set()) {
  if (found.has(entry)) return found;
  found.add(entry);
  if (exists(entry)) for (const [, specifier] of read(entry).matchAll(IMPORT)) modulesFrom(resolve(entry, specifier), found);
  return found;
}

test("every file the app loads exists and is cached for offline use", () => {
  const page = [...read("index.html").matchAll(/\s(?:href|src)="([^"]+)"/g)].map(([, ref]) => ref).filter(isLocal).map((ref) => resolve("index.html", ref));
  const icons = JSON.parse(read("manifest.json")).icons.map((icon) => resolve("manifest.json", icon.src));
  const fonts = page.filter((file) => file.endsWith(".css") && exists(file)).flatMap((css) => (
    [...read(css).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map(([, ref]) => ref).filter(isLocal).map((ref) => resolve(css, ref))
  ));
  const files = ["index.html", ...page, ...icons, ...fonts, ...modulesFrom("js/app.js")];
  assert.ok(files.includes("js/store.js") && files.some((file) => file.endsWith(".woff2")), "the scan found modules and fonts");
  assert.deepEqual(files.filter((file) => !exists(file)), [], "missing files");
  assert.deepEqual(files.filter((file) => !cached.has(file)), [], "not in sw.js FILES");
  assert.deepEqual([...cached].filter((file) => !exists(file)), [], "sw.js lists files that don't exist");
});
