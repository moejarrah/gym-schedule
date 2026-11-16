// The phone preview (tools/iphone-preview.html, served by `npm run preview`): it shows the
// app in a phone frame and refreshes it after an app file is saved, even once the app's
// offline cache is installed. Runs against a temporary copy of the app so it can edit files.

import assert from "node:assert/strict";
import { appendFile, cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { APP_ROOT, expect, launchBrowser, startServer } from "./helpers.mjs";

test("the phone preview shows the app and refreshes it after a saved change", { timeout: 60_000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gym-preview-"));
  for (const entry of ["index.html", "manifest.json", "sw.js", "styles", "js", "fonts", "icons", "tools/iphone-preview.html"]) {
    await cp(path.join(APP_ROOT, entry), path.join(root, entry), { recursive: true });
  }
  const [server, browser] = await Promise.all([startServer({ root }), launchBrowser()]);
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 950 } });
    page.on("pageerror", (error) => errors.push(error.message));
    const phone = page.frameLocator("iframe");
    const navigation = phone.getByRole("navigation", { name: "Main navigation" });
    // The preview compares each fingerprint of the app files with the one before it.
    const fingerprintRead = () => page.waitForResponse((response) => response.url().endsWith("/__changes"));

    await page.goto(`${server.url}tools/iphone-preview.html`);
    await expect(navigation).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Live preview connected");

    // Once the app's offline copy is installed, the preview page itself must still load (not the app).
    await phone.locator("html").evaluate(() => new Promise((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
    }));
    await page.reload();
    const read = fingerprintRead(); // by the reloaded page
    await expect(page.getByRole("heading", { name: "iPhone 15 Pro preview" })).toBeVisible();
    await expect(navigation).toBeVisible();

    // On another screen, save a change: the frame reloads with the new file and stays on that screen.
    await navigation.getByRole("button", { name: "Library" }).click();
    await expect(phone.getByRole("searchbox", { name: "Search exercises" })).toBeVisible();
    await read;
    await appendFile(path.join(root, "styles", "base.css"), "\nbody { outline: 3px solid rgb(1, 2, 3); }\n");
    await expect(phone.locator("body")).toHaveCSS("outline-color", "rgb(1, 2, 3)", { timeout: 10_000 });
    await expect(phone.getByRole("searchbox", { name: "Search exercises" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Live preview connected");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});
