// Shared by the browser tests (tests/e2e/*.e2e.mjs) and by tools/screenshots.mjs and
// tools/visual-diff.mjs.
//
// The tests drive the app the way its owner does: they find things by role, accessible
// name or visible text (never by CSS class, id or data-* attribute, and never by where
// focus is), and check saved data by reading localStorage. Saved data goes in through
// suite({ saved }) rather than by clicking, and "now" is Wednesday 2026-11-04 10:00 UTC.

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { expect as playwrightExpect } from "playwright/test";
import { startServer as serve } from "../../tools/serve.mjs";

export const STORAGE_KEY = "gymAppStateV1";
export const TODAY = "2026-11-04";
const NOW = Date.UTC(2026, 10, 4, 10, 0);

// Auto-retrying assertions (toBeVisible, toHaveText, …); they work without the Playwright runner.
export const expect = playwrightExpect.configure({ timeout: 7_000 });

// The served app. Set APP_ROOT (absolute path) to use another checkout, e.g. for a visual comparison.
export const APP_ROOT = process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : fileURLToPath(new URL("../../", import.meta.url));

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** RegExp matching an accessible name exactly (case-sensitive). */
export function exactly(value) {
  return new RegExp(`^${escapeRegExp(value)}$`);
}

/** RegExp matching an accessible name that starts with `value`. */
export function startsWith(value) {
  return new RegExp(`^${escapeRegExp(value)}`);
}

/** The preview server (tools/serve.mjs) on a free port; close() also drops open connections. */
export async function startServer({ root = APP_ROOT } = {}) {
  const served = await serve({ root });
  return {
    ...served,
    close() {
      served.server.closeAllConnections();
      return served.close();
    },
  };
}

export function launchBrowser(options = {}) {
  return chromium.launch(options);
}

/** Waits until the app has drawn its first screen. */
export async function waitForApp(page) {
  await page.waitForFunction(() => Boolean(document.querySelector("main")?.children.length));
}

// ---------- finding things on screen ----------

export const main = (page) => page.getByRole("main");

/** The open dialog or sheet with this title. */
export const dialog = (page, name) => page.getByRole("dialog", { name, exact: true });

/** A routine tab on Workout or Program. */
export const routineTab = (page, name) => main(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}, (Gym|Home)$`) });

/** The button that shows the active program and opens the programs sheet. */
export const programPicker = (page, name) => main(page).getByRole("button", { name: `Choose active program, currently ${name}`, exact: true });

const settingsScope = (page) => page.getByRole("region", { name: "Settings" });

/** Bottom navigation: Workout, Program, Library, Log or Settings. */
export async function goToView(page, label) {
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: label }).click();
}

export async function openSettings(page) {
  await goToView(page, "Settings");
  await expect(settingsScope(page)).toBeVisible();
  return settingsScope(page);
}

export async function closeSettings(page) {
  await goToView(page, "Workout");
  await expect(settingsScope(page)).toBeHidden();
}

/** What is saved on the device: the parsed state, or the stored text itself. */
export const readState = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
export const readStoredText = (page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

// ---------- one browser and server per test file, a fresh phone per test ----------

async function openApp(browser, server, { saved, serviceWorker = false, allowConsole = [] }) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    screen: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
    acceptDownloads: true,
    serviceWorkers: serviceWorker ? "allow" : "block",
  });
  context.setDefaultTimeout(10_000);
  if (saved != null) {
    // Only when nothing is stored yet, so a reload keeps what the test changed.
    await context.addInitScript(([key, text]) => {
      try {
        if (!localStorage.getItem(key)) localStorage.setItem(key, text);
      } catch (_) { /* a blank page has no storage */ }
    }, [STORAGE_KEY, typeof saved === "string" ? saved : JSON.stringify(saved)]);
  }
  const page = await context.newPage();
  const errors = [];
  const note = (text) => {
    if (!allowConsole.some((pattern) => pattern.test(text))) errors.push(text);
  };
  page.on("console", (message) => {
    if (message.type() === "error") note(`console.error: ${message.text()}`);
  });
  page.on("pageerror", (error) => note(`pageerror: ${error?.stack || error}`));
  page.on("dialog", (nativeDialog) => {
    errors.push(`unexpected native dialog: ${nativeDialog.message()}`);
    nativeDialog.dismiss().catch(() => {});
  });
  await page.clock.install({ time: NOW });
  await page.goto(server.url);
  await waitForApp(page);
  return { page, context, server, errors };
}

/**
 * const { appTest } = suite({ saved: sampleState() });
 * appTest(title, [options], async ({ page, context, server }) => { … });
 *
 * Every test gets a fresh phone-sized browser context on the app, and fails if the page
 * logged an error. Options (suite-wide or per test):
 *   saved          what is in localStorage before the app starts: a state object, the stored
 *                  text itself, or null for a first launch
 *   serviceWorker  true to let the offline cache install (off by default: faster)
 *   ownServer      true for a server of the test's own, which it may stop
 *   allowConsole   RegExp[] of console errors the test expects
 */
export function suite(defaults = {}) {
  let server;
  let browser;
  test.before(async () => {
    [server, browser] = await Promise.all([startServer(), launchBrowser()]);
  });
  test.after(async () => {
    await browser?.close();
    await server?.close();
  });

  function appTest(title, optionsOrFn, maybeFn) {
    const [options, fn] = typeof optionsOrFn === "function" ? [{}, optionsOrFn] : [optionsOrFn, maybeFn];
    const { ownServer = false, ...appOptions } = { ...defaults, ...options };
    test(title, { timeout: 30_000 }, async () => {
      const testServer = ownServer ? await startServer() : server;
      let context;
      try {
        const app = await openApp(browser, testServer, appOptions);
        context = app.context;
        await fn(app);
        assert.deepEqual(app.errors, [], "the page logged errors");
      } finally {
        await context?.close();
        if (ownServer) await testServer.close();
      }
    });
  }

  return { appTest };
}
