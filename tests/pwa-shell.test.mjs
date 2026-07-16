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
  assert.match(html, /<script type="module" src="app\.js"><\/script>/);
  assert.match(html, /rel="apple-touch-icon"[^>]+app-icon-180\.png/);
  assert.doesNotMatch(html, /\sonclick=/);
});

test("offline shell lists every production module and icon", () => {
  const worker = read("sw.js");
  for (const asset of ["index.html", "styles.css", "data.js", "storage.js", "app.js", "manifest.json", "icons/app-icon.svg", "icons/app-icon-180.png", "icons/app-icon-192.png", "icons/app-icon-512.png"]) {
    assert.match(worker, new RegExp(asset.replaceAll(".", "\\.")));
  }
  assert.match(worker, /event\.request\.mode === "navigate"/);
});
