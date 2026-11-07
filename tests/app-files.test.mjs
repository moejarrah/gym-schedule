// The installed app runs from the service worker's cache, so every file the
// page can load must exist and be listed in sw.js FILES (stamped by tools/check.mjs).

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(join(root, file), "utf8");
const exists = (file) => existsSync(join(root, file));
const resolve = (from, ref) => normalize(join(dirname(from), ref.split(/[?#]/)[0])).replaceAll("\\", "/");
const isLocal = (ref) => !/^(?:[a-z]+:|#|\/\/)/i.test(ref);

const sw = read("sw.js");
const cached = new Set(JSON.parse(/const FILES = (\[[\s\S]*?\]); \/\/ stamped/.exec(sw)[1]).map((file) => normalize(file)));

// Static `import … from "x"`, `import "x"` and `export … from "x"` at the start of a line.
const IMPORT = /^\s*(?:import|export)\s(?:[^;"'`]*?\sfrom\s*)?["']([^"']+)["']/gm;

function reachableModules(entry) {
  const found = new Set();
  const visit = (file) => {
    if (found.has(file)) return;
    found.add(file);
    if (!exists(file)) return;
    for (const [, specifier] of read(file).matchAll(IMPORT)) visit(resolve(file, specifier));
  };
  visit(entry);
  return [...found];
}

function pageFiles() {
  const html = [...read("index.html").matchAll(/\s(?:href|src)="([^"]+)"/g)].map(([, ref]) => ref).filter(isLocal).map((ref) => resolve("index.html", ref));
  const icons = JSON.parse(read("manifest.json")).icons.map((icon) => resolve("manifest.json", icon.src));
  const fonts = html.filter((file) => file.endsWith(".css") && exists(file)).flatMap((css) => (
    [...read(css).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map(([, ref]) => ref).filter(isLocal).map((ref) => resolve(css, ref))
  ));
  return ["index.html", ...html, ...icons, ...fonts];
}

function assertShipped(files) {
  assert.deepEqual(files.filter((file) => !exists(file)), [], "missing files");
  assert.deepEqual(files.filter((file) => !cached.has(file)), [], "not in sw.js FILES");
}

test("every module reachable from js/app.js exists and is cached for offline use", () => {
  const modules = reachableModules("js/app.js");
  assert.ok(modules.includes("js/store.js"));
  assertShipped(modules);
});

test("every stylesheet, script, icon and font the page and manifest use exists and is cached", () => {
  const files = pageFiles();
  assert.ok(files.includes("js/app.js") && files.some((file) => file.endsWith(".woff2")));
  assertShipped(files);
});

test("every cached file exists, so installing the offline app can't fail", () => {
  assert.deepEqual([...cached].filter((file) => !exists(file)), []);
});

test("sw.js has a stamped version", () => {
  const version = /const VERSION = "([^"]*)"; \/\/ stamped/.exec(sw)?.[1];
  assert.ok(version && version !== "dev", `VERSION is ${JSON.stringify(version)}`);
});
