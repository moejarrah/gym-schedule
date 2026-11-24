// Shared by the browser tests (tests/e2e/*.e2e.mjs) and by tools/screenshots.mjs and
// tools/visual-diff.mjs.
//
// The tests drive the app the way its owner does: they find things by role, accessible
// name or visible text (never by CSS class, id or data-* attribute, and never by where
// focus is), and check saved data by reading localStorage. Saved data goes in through
// suite({ saved }) rather than by clicking, and "now" is Wednesday 2026-11-04 10:00 UTC.
// The app opens on Home, the first tab (or on the workout in progress); goToView() taps
// the bottom navigation.

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as playwright from "playwright";
import { expect as playwrightExpect } from "playwright/test";
import { startServer as serve } from "../../tools/serve.mjs";

export const STORAGE_KEY = "gymAppStateV1";
export const TODAY = "2026-11-04";
export const TOMORROW = "2026-11-05"; // after nextDay()
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

// Chromium unless E2E_BROWSER=webkit asks for Safari's engine, the one the iPhone
// uses (one-time setup: npx playwright install webkit).
export function launchBrowser(options = {}) {
  return playwright[process.env.E2E_BROWSER || "chromium"].launch(options);
}

/** Waits until the app has drawn its first screen. */
export async function waitForApp(page) {
  await page.waitForFunction(() => Boolean(document.querySelector("main")?.children.length));
}

// ---------- finding things on screen ----------

export const main = (page) => page.getByRole("main");

/** The open dialog or sheet with this title. */
export const dialog = (page, name) => page.getByRole("dialog", { name, exact: true });

/** A routine tab on Program (Workout has none: it is about one workout). */
export const routineTab = (page, name) => main(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}, (Gym|Home)$`) });

/** Program's header button: it names the program on screen and opens the Programs sheet. */
export const programPicker = (page, name) => main(page).getByRole("button", { name: new RegExp(`^Look at another program, showing ${escapeRegExp(name)}(, the one you're following)?$`) });

/**
 * The bottom button above the tab bar (it isn't in the page itself): "Start Day A", "Log sets
 * for …", "Finish workout", … It ignores taps for a moment after it changed what it does, so
 * tap it with tapOnRound when it has just changed.
 */
export const bottomButton = (page, name) => page.getByRole("region", { name: "Next step" }).getByRole("button", { name, exact: typeof name === "string" });

/** Home's bottom button that starts this workout. */
export const startButton = (page, routine) => bottomButton(page, `Start ${routine}`);

/** A workout's tile on Home, left to do in the round: tapping it picks it. */
export const homeTile = (page, routine) => main(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(routine)}, (optional, )?(usually|never timed)`) });

/** Home's "Begin round N", when the round is laid out and not begun: taps it. */
export async function beginRound(page) {
  const begin = bottomButton(page, /^Begin round \d+$/);
  if (!(await begin.isVisible())) return;
  await roundSettles(page);
  await tapOnRound(page, begin);
}

/** The bar of the workout in progress, above the tab bar on every page but the workout. */
export const runningBar = (page) => page.getByRole("button", { name: /^.+ in progress, \d+ of \d+ done\. Back to the workout$/ });

const settingsScope = (page) => page.getByRole("region", { name: "Settings" });

const tab = (page, label) => page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: label, exact: true });

/**
 * Bottom navigation: Home, Program, Library or Log. The Home tab opens the round page,
 * or the workout in progress when there is one.
 */
export async function goToView(page, label) {
  await tab(page, label).click();
}

/** Waits until this is the tab showing (the app moves between tabs by itself, e.g. to the workout from Log). */
export async function expectView(page, label) {
  await expect(tab(page, label)).toHaveAttribute("aria-current", "page");
}

/** The running workout's back link to the round page ("‹ Round 3"). */
export const backToRound = (page) => main(page).getByRole("button", { name: /^Back to Round \d+$/ });

/** Settings opens from the gear at the top of the round page. */
export async function openSettings(page) {
  if (await settingsScope(page).isVisible()) return settingsScope(page);
  await goToView(page, "Home");
  // The gear is on the tab's first page. From a workout in progress, its back link goes
  // there; from All rounds or one round, tapping the tab again does.
  const gear = main(page).getByRole("button", { name: "Settings", exact: true });
  if (await backToRound(page).isVisible()) await tapOnRound(page, backToRound(page));
  else if (!(await gear.isVisible())) await tapOnRound(page, tab(page, "Home"));
  await gear.click();
  await expect(settingsScope(page)).toBeVisible();
  return settingsScope(page);
}

/** Leaves Settings by its back link, which returns to the round page. */
export async function closeSettings(page) {
  await main(page).getByRole("button", { name: "Back to Home", exact: true }).click();
  await expect(settingsScope(page)).toBeHidden();
}

/**
 * A tap that changes what the bottom button does, or swaps what Home shows: a tile picked,
 * "Begin round N", "Start <workout>", All rounds and back, a choice in its sheet,
 * an exercise marked done, any answer to a confirmation. The app then ignores taps on the screen (and on the bottom
 * button) for 400 ms, so that a double tap can't land on a button the owner never saw.
 * This taps and waits that out.
 */
export async function tapOnRound(page, button) {
  await button.click();
  await roundSettles(page);
}

/** The wait of tapOnRound on its own (tools/screenshots.mjs uses it). */
export const roundSettles = (page) => page.waitForTimeout(450);

/** The next morning: the app is opened again a day later. */
export async function nextDay(page) {
  await page.clock.setSystemTime(NOW + 24 * 60 * 60 * 1000);
  await page.reload();
  await waitForApp(page);
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
 *   skip           a reason to skip the test (shown as skipped), e.g. it needs Chromium
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
    const { ownServer = false, skip = false, ...appOptions } = { ...defaults, ...options };
    test(title, { timeout: 30_000, skip }, async () => {
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
