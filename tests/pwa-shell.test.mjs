import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("manifest describes an installable portrait app with a real icon asset", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.id, "./");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait");
  assert.ok(manifest.icons.length);
  for (const icon of manifest.icons) {
    assert.equal(icon.type, "image/png");
    assert.equal(existsSync(new URL(`../${icon.src}`, import.meta.url)), true);
  }
});

test("HTML keeps zoom enabled and uses external production assets", () => {
  const html = read("index.html");
  const viewport = html.match(/<meta name="viewport" content="([^"]+)">/)?.[1] || "";
  assert.match(viewport, /viewport-fit=cover/);
  assert.doesNotMatch(viewport, /user-scalable=no|maximum-scale=1/);
  assert.match(html, /<script type="module" src="app\.js\?v=16"><\/script>/);
  assert.match(html, /rel="apple-touch-icon"[^>]+app-icon-180\.png/);
  assert.doesNotMatch(html, /\sonclick=/);
});

test("offline shell lists every production module and icon", () => {
  const worker = read("sw.js");
  for (const asset of ["index.html", "styles.css", "data.js", "storage.js", "app.js", "manifest.json", "icons/app-icon.svg", "icons/app-icon-180.png", "icons/app-icon-192.png", "icons/app-icon-512.png"]) {
    assert.match(worker, new RegExp(asset.replaceAll(".", "\\.")));
  }
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /gym-schedule-v16/);
  assert.match(worker, /styles\.css\?v=16/);
  assert.match(worker, /app\.js\?v=16/);
});

test("versioned browser assets stay in sync across the PWA shell", () => {
  const html = read("index.html");
  const app = read("app.js");
  const storage = read("storage.js");
  const worker = read("sw.js");
  const version = worker.match(/gym-schedule-v(\d+)/)?.[1];
  assert.ok(version);
  for (const asset of ["styles.css", "app.js", "manifest.json"]) {
    assert.match(html, new RegExp(`${asset.replaceAll(".", "\\.")}\\?v=${version}`));
  }
  assert.match(app, new RegExp(`data\\.js\\?v=${version}`));
  assert.match(app, new RegExp(`storage\\.js\\?v=${version}`));
  assert.match(storage, new RegExp(`data\\.js\\?v=${version}`));
  for (const asset of ["styles.css", "data.js", "storage.js", "app.js", "manifest.json"]) {
    assert.match(worker, new RegExp(`${asset.replaceAll(".", "\\.")}\\?v=${version}`));
  }
});

test("compact phone rows keep their explicit one-dimensional layout", () => {
  const css = read("styles.css");
  for (const selector of ["workout-row", "program-row", "library-row"]) {
    assert.match(css, new RegExp(`\\.${selector}\\s*\\{[^}]*display:\\s*flex;`));
  }
  assert.match(css, /\.row-main\s*\{[^}]*display:\s*grid;/);
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important;/);
});

test("the iPhone shell constrains the app and leaves the main view scrollable", () => {
  const css = read("styles.css");
  assert.match(css, /\.app-shell\s*\{[^}]*height:\s*100dvh;/);
  assert.match(css, /#appMain\s*\{[^}]*overflow-y:\s*auto;/);
  assert.match(css, /#appMain\s*\{[^}]*-webkit-overflow-scrolling:\s*touch;/);
});

test("core exercise references and program controls remain reachable", () => {
  const html = read("index.html");
  const app = read("app.js");
  for (const id of ["detailVideo", "detailAlternatives", "detailEditExercise", "exercisePrimaryMuscle", "secondaryMuscleOptions"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /data-action="open-workout-exercise"/);
  assert.match(app, /data-action="move-routine-up"/);
  assert.match(app, /data-action="open-picker"/);
  assert.match(app, /data-action="edit-entry"/);
  assert.doesNotMatch(app, /toggle-program-edit/);
});
