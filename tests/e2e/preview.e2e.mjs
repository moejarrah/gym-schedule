// The phone preview (tools/iphone-preview.html, served by `npm run preview`): it shows the
// app in a phone frame and refreshes it after an app file is saved, even once the app's
// offline cache is installed. Runs against a temporary copy of the app so it can edit files.

import assert from "node:assert/strict";
import { cp, mkdtemp, appendFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { startServer } from "../../tools/serve.mjs";
import { APP_ROOT, expect, launchBrowser } from "./helpers.mjs";

test("the phone preview shows the app and refreshes it after a saved change", { timeout: 90_000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gym-preview-"));
  for (const entry of ["index.html", "manifest.json", "sw.js", "styles", "js", "fonts", "icons", "tools"]) {
    await cp(path.join(APP_ROOT, entry), path.join(root, entry), { recursive: true });
  }
  const server = await startServer({ root });
  const browser = await launchBrowser();
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 950 } });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${server.url}tools/iphone-preview.html`);
    const phone = page.frameLocator("#appPreview");
    await expect(phone.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Live preview connected");

    // Once offline mode is installed, the preview page itself must still load (not the app).
    const frame = page.frame({ url: (url) => !url.pathname.includes("/tools/") });
    await frame.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 15_000 });
    await page.reload();
    await expect(page.getByRole("heading", { name: "iPhone 15 Pro preview" })).toBeVisible();
    await expect(phone.getByRole("navigation", { name: "Main navigation" })).toBeVisible();

    // Go to another screen, then save a change: the frame reloads with the new file and stays there.
    await phone.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Library" }).click();
    await expect(phone.locator("body")).toHaveAttribute("data-current-view", "exercises");
    await page.waitForTimeout(1_000); // let the preview record the current fingerprint
    await appendFile(path.join(root, "styles", "base.css"), "\nbody { outline: 3px solid rgb(1, 2, 3); }\n");
    await expect(phone.locator("body")).toHaveCSS("outline-color", "rgb(1, 2, 3)", { timeout: 10_000 });
    await expect(phone.locator("body")).toHaveAttribute("data-current-view", "exercises");
    await expect(page.getByRole("status")).toHaveText("Live preview connected");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});
