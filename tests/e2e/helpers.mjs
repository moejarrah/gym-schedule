// Shared browser-test helpers for the Gym Schedule PWA.
//
// - startServer(): dependency-free static server for the repo root on a random free port.
// - launchBrowser(): headless Chromium through the preinstalled Playwright package.
// - openApp(): fresh context (clean localStorage), iPhone-ish viewport, fixed clock,
//   console/page error collection.
// - suite(): registers one server + browser per test file and returns an `appTest`
//   wrapper that opens a fresh app per test and fails the test on any console or page error.
//
// Nothing here imports app code; tests drive the app only through the browser.

import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";

// Playwright is preinstalled globally. ESM resolution ignores NODE_PATH, so fall back to CJS require.
// `expect` comes from the same package ("playwright/test") and works without the Playwright runner;
// it gives auto-retrying web-first assertions (toBeVisible, toHaveText, ...).
const requireFromHere = createRequire(import.meta.url);
let playwright;
let playwrightTest;
try {
  playwright = await import("playwright");
  playwrightTest = await import("playwright/test");
} catch {
  playwright = requireFromHere("playwright");
  playwrightTest = requireFromHere("playwright/test");
}
export const { chromium, devices } = playwright;
export const expect = playwrightTest.expect.configure({ timeout: 7_000 });

/** Escape a string for use inside a RegExp. */
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

export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
// The served app root. Set APP_ROOT (absolute path) to test another checkout, e.g. a baseline worktree.
export const APP_ROOT = process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : REPO_ROOT;

export const PHONE = Object.freeze({
  viewport: { width: 393, height: 852 },
  screen: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

// Default deterministic "now" for tests: Wednesday 2026-11-04 10:00 in the context time zone.
export const DEFAULT_NOW = Object.freeze({ year: 2026, month: 11, day: 4, hour: 10, minute: 0 });
export const DEFAULT_TIMEZONE = "UTC";
export const STORAGE_KEY = "gymAppStateV1";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

export function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

/**
 * Serve `root` over HTTP on 127.0.0.1 with a random free port.
 * Query strings (e.g. `?v=50`) are ignored when mapping to files.
 */
export async function startServer({ root = APP_ROOT } = {}) {
  const resolvedRoot = path.resolve(root);
  const server = http.createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      const { pathname } = new URL(request.url, "http://localhost");
      let filePath = path.resolve(resolvedRoot, `.${decodeURIComponent(pathname)}`);
      if (filePath !== resolvedRoot && !filePath.startsWith(resolvedRoot + path.sep)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      let info = await stat(filePath).catch(() => null);
      if (info?.isDirectory()) {
        filePath = path.join(filePath, "index.html");
        info = await stat(filePath).catch(() => null);
      }
      if (!info?.isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentTypeFor(filePath),
        "Content-Length": info.size,
        "Cache-Control": "no-cache",
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return {
    port,
    origin: `http://127.0.0.1:${port}`,
    url: `http://127.0.0.1:${port}/`,
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

export function launchBrowser(options = {}) {
  return chromium.launch(options);
}

function zoneOffsetMs(epoch, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(epoch)).map(({ type, value }) => [type, value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(epoch / 1000) * 1000;
}

/** Epoch milliseconds for a wall-clock time (month is 1-based) in an IANA time zone. */
export function zonedEpoch({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone = DEFAULT_TIMEZONE) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  let epoch = wall - zoneOffsetMs(wall, timeZone);
  epoch = wall - zoneOffsetMs(epoch, timeZone);
  return epoch;
}

/** YYYY-MM-DD for a wall-clock date object ({ year, month, day }). */
export function dateKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Open the app in a fresh browser context.
 *
 * options:
 *   browser, server       required
 *   now                   wall-clock object (DEFAULT_NOW), epoch number, or false for the real clock
 *   timezoneId, locale    context options (default UTC / en-US)
 *   colorScheme           context colorScheme (default "light")
 *   contextOptions        extra newContext options (merged last)
 *   allowConsole          RegExp[] of console-error texts that are expected
 *   initScripts           functions/strings passed to context.addInitScript before navigation
 *   path                  path to open (default "/")
 *   navigate              false to skip the initial goto
 */
export async function openApp({
  browser,
  server,
  now = DEFAULT_NOW,
  timezoneId = DEFAULT_TIMEZONE,
  locale = "en-US",
  colorScheme = "light",
  contextOptions = {},
  allowConsole = [],
  initScripts = [],
  path: appPath = "/",
  navigate = true,
} = {}) {
  assert.ok(browser, "openApp requires a browser");
  assert.ok(server, "openApp requires a server");
  const context = await browser.newContext({
    ...PHONE,
    locale,
    timezoneId,
    colorScheme,
    reducedMotion: "reduce",
    acceptDownloads: true,
    ...contextOptions,
  });
  context.setDefaultTimeout(10_000);
  for (const script of initScripts) await context.addInitScript(script);
  const page = await context.newPage();
  const errors = [];
  const allowed = (text) => allowConsole.some((pattern) => pattern.test(text));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (!allowed(text)) errors.push(`console.error: ${text}`);
  });
  page.on("pageerror", (error) => {
    const text = error?.stack || String(error);
    if (!allowed(text)) errors.push(`pageerror: ${text}`);
  });
  page.on("dialog", (dialog) => {
    errors.push(`unexpected native dialog: ${dialog.type()} ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  if (now !== false) {
    const time = typeof now === "number" ? now : zonedEpoch(now, timezoneId);
    await page.clock.install({ time });
  }
  const app = {
    context,
    page,
    errors,
    server,
    url: (relative = "/") => new URL(relative, server.url).href,
    async goto(relative = appPath) {
      await page.goto(app.url(relative));
      await waitForApp(page);
    },
    async reload() {
      await page.reload();
      await waitForApp(page);
    },
    assertNoErrors() {
      assert.deepEqual(errors, [], `Browser reported errors:\n${errors.join("\n")}`);
    },
    async close() {
      await context.close().catch(() => {});
    },
  };
  if (navigate) await app.goto(appPath);
  return app;
}

/** Wait until the app has rendered its first view into #appMain. */
export async function waitForApp(page) {
  await page.waitForFunction(() => {
    const main = document.querySelector("#appMain");
    const meta = document.querySelector("#viewMetaLine");
    return Boolean(main?.children.length) && (!meta || meta.textContent !== "Loading saved data");
  });
}

/**
 * Register one static server + one Chromium per test file (root-level before/after hooks)
 * and return helpers bound to them.
 */
export function suite({ serverRoot } = {}) {
  const env = { server: null, browser: null };
  test.before(async () => {
    env.server = await startServer(serverRoot ? { root: serverRoot } : {});
    env.browser = await launchBrowser();
  });
  test.after(async () => {
    await env.browser?.close();
    await env.server?.close();
  });

  /**
   * appTest(title, [options], fn) — fresh app per test; fails on any browser console/page error.
   * fn receives the app object from openApp plus `t` (the node:test context).
   */
  function appTest(title, optionsOrFn, maybeFn) {
    const [options, fn] = typeof optionsOrFn === "function" ? [{}, optionsOrFn] : [optionsOrFn, maybeFn];
    const { timeout = 60_000, ...appOptions } = options;
    return test(title, { timeout }, async (t) => {
      const app = await openApp({ browser: env.browser, server: env.server, ...appOptions });
      try {
        await fn(Object.assign(app, { t }));
        app.assertNoErrors();
      } finally {
        await app.close();
      }
    });
  }

  return { env, appTest, open: (options = {}) => openApp({ browser: env.browser, server: env.server, ...options }) };
}

// ---------------------------------------------------------------------------
// Small UI helpers shared by flow tests, regressions, and the screenshot tool.
// They use visible hooks (roles, accessible names, labels) wherever possible.
// ---------------------------------------------------------------------------

/** Bottom navigation button by its visible label (Workout, Program, Library, Log, Settings). */
export function navButton(page, label) {
  return page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: label });
}

export async function goToView(page, label) {
  await navButton(page, label).click();
}

// --- Settings ------------------------------------------------------------------
// Settings is the fifth screen (bottom-nav "Settings"); its content is the region named "Settings".

/** Locator scoping all Settings content. */
export function settingsScope(page) {
  return page.getByRole("region", { name: "Settings" });
}

/** Open Settings from the bottom navigation and return the Settings scope once visible. */
export async function openSettings(page) {
  await navButton(page, "Settings").click();
  const scope = settingsScope(page);
  await expect(scope).toBeVisible();
  return scope;
}

/** Leave Settings by going back to the Workout screen. */
export async function closeSettings(page) {
  await navButton(page, "Workout").click();
  await expect(settingsScope(page)).toBeHidden();
}

/** The open <dialog> whose accessible name matches `name` (string or RegExp). */
export function openDialog(page, name) {
  return page.getByRole("dialog", { name });
}

/** Read the persisted app state from localStorage. */
export async function readState(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), STORAGE_KEY);
}

/** Text of the most recent toast message (toast is a role=status live region). */
export function toast(page) {
  return page.getByRole("status");
}

/** Tap on the ::backdrop of the topmost open dialog, if any backdrop area is visible. Returns false if none. */
export async function tapDialogBackdrop(page, dialog) {
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  if (!box) return false;
  const candidates = [
    { x: viewport.width / 2, y: Math.max(2, box.y / 2) },
    { x: viewport.width / 2, y: Math.min(viewport.height - 2, box.y + box.height + (viewport.height - box.y - box.height) / 2) },
  ].filter(({ x, y }) => y < box.y - 1 || y > box.y + box.height + 1 || x < box.x - 1 || x > box.x + box.width + 1);
  if (!candidates.length) return false;
  const { x, y } = candidates[0];
  await page.mouse.click(x, y);
  return true;
}
