// Known-bug regressions. Each test asserts the CORRECT behaviour, so on the pre-rewrite app
// (baseline commit 40bae52) every test here is expected to FAIL; they should pass once fixed.
// Run:  node --test 'tests/e2e/*.e2e.mjs'        (APP_ROOT=/abs/path to serve another checkout)
//
// ---------------------------------------------------------------------------------------------
// NON-VISIBLE SELECTORS / HOOKS THESE TESTS DEPEND ON (keep stable through the rewrite)
// ---------------------------------------------------------------------------------------------
//  - `<main>` landmark (#appMain) wraps the current screen.
//  - #toast: the role=status toast element is observed (MutationObserver) to record every toast
//    text during an offline launch (c).
//  - `document.documentElement.dataset.theme` must be "dark" on first paint (j); the probe treats
//    "#viewMetaLine still reads 'Loading saved data'" OR "#appMain still empty" as "app module has
//    not rendered yet" to prove it sampled before the module ran.
//  - (d) inspects every `dialog input/select/textarea` (excluding hidden/checkbox/radio/file types).
//  - (e) the routine-tab strip is the selected tab button's parent element (structural, no class).
//  - Settings is reached through helpers.openSettings()/settingsScope() (adaptation point).
// No CSS layout classes are used as selectors.
// ---------------------------------------------------------------------------------------------

import assert from "node:assert/strict";
import test from "node:test";

import {
  dateKey,
  escapeRegExp,
  exactly,
  expect,
  goToView,
  openApp,
  openSettings,
  startServer,
  startsWith,
  suite,
  tapDialogBackdrop,
  waitForApp,
  zonedEpoch,
} from "./helpers.mjs";

const { env, appTest } = suite();

const PROGRAM = "PPLPPL 7 — Glute Specialization";
const PUSH_A = "Push A + Glutes";

const mainArea = (page) => page.getByRole("main");
// Dialog names are matched exactly so e.g. "Push-up plus" never also matches "Cable serratus punch or Push-up plus".
const dialog = (page, name) => page.getByRole("dialog", { name, exact: typeof name === "string" });
const routineTab = (page, name) => mainArea(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}, (Gym|Home)$`) });
const checkButton = (page, title) => mainArea(page).getByRole("button", { name: new RegExp(`^(Check|Uncheck) ${escapeRegExp(title)} for today$`) });
const activeProgramButton = (page) => mainArea(page).getByRole("button", { name: /^Choose active program/ });
const calendarDay = (page, fullDate) => mainArea(page).getByRole("button", { name: startsWith(fullDate) });
const entryEditor = (page) => page.getByRole("dialog").filter({ has: page.getByRole("region", { name: "Choices — first is preferred" }) });

async function openRoutineEditor(page, routineName) {
  await goToView(page, "Program");
  await routineTab(page, routineName).click();
  await mainArea(page).getByRole("button", { name: exactly(`Edit ${routineName}`) }).click();
  const editor = dialog(page, `Edit ${routineName}`);
  await expect(editor).toBeVisible();
  return editor;
}

async function openProgramEditor(page) {
  await goToView(page, "Program");
  await mainArea(page).getByRole("button", { name: "Manage programs" }).click();
  await dialog(page, "Programs").getByRole("button", { name: `Edit ${PROGRAM}` }).click();
  const editor = dialog(page, "Edit program");
  await expect(editor).toBeVisible();
  return editor;
}

// ---------------------------------------------------------------------------------------------
// (a) Pressing Enter in an editor's name field must save, not hit the × (cancel) submit button.
appTest("regression a: Enter in the routine/program editor name field saves the new name", async ({ page, t }) => {
  await t.test("routine editor", async () => {
    const editor = await openRoutineEditor(page, PUSH_A);
    await editor.getByRole("textbox", { name: "Name" }).fill("Push A renamed");
    await editor.getByRole("textbox", { name: "Name" }).press("Enter");
    await expect(routineTab(page, "Push A renamed"), "routine renamed by pressing Enter").toBeVisible();
  });
  await t.test("program editor", async () => {
    await page.keyboard.press("Escape").catch(() => {});
    const editor = await openProgramEditor(page);
    await editor.getByRole("textbox", { name: "Name" }).fill("Renamed program");
    await editor.getByRole("textbox", { name: "Name" }).press("Enter");
    await expect(activeProgramButton(page), "program renamed by pressing Enter")
      .toHaveAccessibleName("Choose active program, currently Renamed program");
  });
});

// ---------------------------------------------------------------------------------------------
// (b) Tapping an editor sheet's backdrop must not silently discard edits: either the sheet stays
// open with the draft intact, or the edit is kept. (Read-only sheets may still close.)
test("regression b: tapping an editor sheet's backdrop never discards edits", { timeout: 120_000 }, async (t) => {
  // Each sheet gets a fresh app so an edit kept by one case cannot affect the next.
  let page;
  async function backdropKeeps({ open, edit, draftIntact, saved }, subtest) {
    const app = await openApp({ browser: env.browser, server: env.server });
    page = app.page;
    try {
      const sheet = await open();
      await edit(sheet);
      if (!(await tapDialogBackdrop(page, sheet))) {
        subtest.diagnostic("sheet covers the whole viewport; no backdrop to tap");
      } else {
        await page.waitForTimeout(150);
        if (await sheet.isVisible()) await draftIntact(sheet);
        else await saved();
      }
      app.assertNoErrors();
    } finally {
      await app.close();
    }
  }

  await t.test("routine editor", (st) => backdropKeeps({
    open: () => openRoutineEditor(page, PUSH_A),
    edit: (sheet) => sheet.getByRole("textbox", { name: "Name" }).fill("Push A draft"),
    draftIntact: (sheet) => expect(sheet.getByRole("textbox", { name: "Name" })).toHaveValue("Push A draft"),
    saved: () => expect(routineTab(page, "Push A draft"), "routine edit kept after backdrop tap").toBeVisible(),
  }, st));

  await t.test("program editor", (st) => backdropKeeps({
    open: () => openProgramEditor(page),
    edit: (sheet) => sheet.getByRole("textbox", { name: "Name" }).fill("Program draft"),
    draftIntact: (sheet) => expect(sheet.getByRole("textbox", { name: "Name" })).toHaveValue("Program draft"),
    saved: () => expect(activeProgramButton(page), "program edit kept after backdrop tap").toHaveAccessibleName(/currently Program draft$/),
  }, st));

  await t.test("entry editor", (st) => backdropKeeps({
    open: async () => {
      await goToView(page, "Program");
      await mainArea(page).getByRole("button", { name: startsWith("Machine chest press. Tap to edit.") }).click();
      const sheet = entryEditor(page);
      await expect(sheet).toBeVisible();
      return sheet;
    },
    edit: (sheet) => sheet.getByRole("textbox", { name: "Programming note — for this routine only" }).fill("Seat height 4"),
    draftIntact: (sheet) => expect(sheet.getByRole("textbox", { name: "Programming note — for this routine only" })).toHaveValue("Seat height 4"),
    saved: () => expect(mainArea(page).getByRole("button", { name: startsWith("Machine chest press. Tap to edit.") }), "entry note kept after backdrop tap").toContainText("Seat height 4"),
  }, st));

  await t.test("block editor (over the routine editor)", (st) => backdropKeeps({
    open: async () => {
      const routine = await openRoutineEditor(page, PUSH_A);
      await routine.getByRole("button", { name: startsWith("Edit Glute block.") }).click();
      const sheet = dialog(page, "Edit block");
      await expect(sheet).toBeVisible();
      return sheet;
    },
    edit: (sheet) => sheet.getByRole("textbox", { name: "Name" }).fill("Glute draft"),
    draftIntact: (sheet) => expect(sheet.getByRole("textbox", { name: "Name" })).toHaveValue("Glute draft"),
    saved: () => expect(dialog(page, `Edit ${PUSH_A}`).getByRole("button", { name: startsWith("Edit Glute draft.") }), "block rename kept after backdrop tap").toBeVisible(),
  }, st));

  await t.test("choice editor (over the entry editor)", (st) => backdropKeeps({
    open: async () => {
      await goToView(page, "Program");
      await mainArea(page).getByRole("button", { name: startsWith("Cable serratus punch or Push-up plus. Tap to edit.") }).click();
      await entryEditor(page).getByRole("button", { name: "Edit Push-up plus choice" }).click();
      const sheet = dialog(page, "Push-up plus");
      await expect(sheet).toBeVisible();
      return sheet;
    },
    edit: (sheet) => sheet.getByRole("textbox", { name: "Prescription for this choice" }).fill("4 × 8"),
    draftIntact: (sheet) => expect(sheet.getByRole("textbox", { name: "Prescription for this choice" })).toHaveValue("4 × 8"),
    saved: () => expect(entryEditor(page), "choice prescription kept after backdrop tap").toContainText("4 × 8"),
  }, st));

  await t.test("day editor", (st) => backdropKeeps({
    open: async () => {
      await goToView(page, "Log");
      await calendarDay(page, "Monday, November 2, 2026").click();
      const sheet = dialog(page, "Monday, November 2");
      await expect(sheet).toBeVisible();
      return sheet;
    },
    edit: (sheet) => sheet.getByRole("textbox", { name: "Note" }).fill("Draft note"),
    draftIntact: (sheet) => expect(sheet.getByRole("textbox", { name: "Note" })).toHaveValue("Draft note"),
    saved: () => expect(calendarDay(page, "Monday, November 2, 2026"), "day note kept after backdrop tap").toHaveAccessibleName(/note recorded/),
  }, st));

  await t.test("master exercise editor", (st) => backdropKeeps({
    open: async () => {
      await goToView(page, "Library");
      await mainArea(page).getByRole("button", { name: "Add exercise" }).click();
      const sheet = dialog(page, "Add exercise");
      await expect(sheet).toBeVisible();
      return sheet;
    },
    edit: (sheet) => sheet.getByRole("textbox", { name: /^Name/ }).fill("Draft exercise"),
    draftIntact: (sheet) => expect(sheet.getByRole("textbox", { name: /^Name/ })).toHaveValue("Draft exercise"),
    saved: async () => assert.fail("the master editor closed on backdrop and its unsaved new exercise draft was lost"),
  }, st));
});

// ---------------------------------------------------------------------------------------------
// (c) Launching offline after the service worker is installed must not report that offline mode
// failed. Playwright's context.setOffline does not cover the browser's SW update check, so the
// test also stops the server (a real network loss).
test("regression c: an offline launch with an installed service worker shows no 'Offline mode could not be started.' toast", { timeout: 60_000 }, async () => {
  const server = await startServer();
  const app = await openApp({
    browser: env.browser,
    server,
    allowConsole: [/ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED|Failed to fetch|Failed to load resource|fetching the script/i],
    initScripts: [() => {
      window.__toasts = [];
      document.addEventListener("DOMContentLoaded", () => {
        const node = document.querySelector("#toast");
        if (!node) return;
        new MutationObserver(() => window.__toasts.push(node.textContent)).observe(node, { childList: true, characterData: true, subtree: true });
      });
    }],
  });
  try {
    const { page, context } = app;
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 15_000 });
    await context.setOffline(true);
    await server.close();
    await page.reload();
    await waitForApp(page);
    await expect(mainArea(page).getByRole("button", { name: /^Check .* for today$/ }).first(), "offline shell still renders Workout").toBeVisible();
    await page.waitForTimeout(2_000);
    const toasts = await page.evaluate(() => window.__toasts);
    assert.ok(!toasts.includes("Offline mode could not be started."), `offline launch showed toasts: ${JSON.stringify(toasts)}`);
    app.assertNoErrors();
  } finally {
    await app.close();
    await server.close().catch(() => {});
  }
});

// ---------------------------------------------------------------------------------------------
// (d) iOS zooms into focused fields under 16px: every dialog text input/select/textarea must be >= 16px.
appTest("regression d: every text input, select and textarea in dialogs has a computed font-size of at least 16px", async ({ page }) => {
  // Render the dynamic dialog controls: the day-note textarea and a relationship select.
  await goToView(page, "Log");
  await calendarDay(page, "Monday, November 2, 2026").click();
  await expect(dialog(page, "Monday, November 2").getByRole("textbox", { name: "Note" })).toBeVisible();
  await dialog(page, "Monday, November 2").getByRole("button", { name: "Close day editor" }).click();
  await goToView(page, "Library");
  await mainArea(page).getByRole("button", { name: "View Ab-wheel rollout details" }).click();
  await dialog(page, "Ab-wheel rollout").getByRole("button", { name: "Edit exercise" }).click();
  await dialog(page, "Edit exercise").getByRole("button", { name: /^Related exercises/ }).click();
  const related = dialog(page, "Related exercises");
  await related.getByRole("searchbox", { name: "Search exercises" }).fill("long-lever");
  await related.getByRole("button", { name: startsWith("Long-lever plank") }).click();
  await expect(related.getByRole("combobox", { name: "Relationship to Long-lever plank" })).toBeVisible();

  const offenders = await page.evaluate(() => {
    const skipped = new Set(["hidden", "checkbox", "radio", "file", "button", "submit", "reset", "range", "color", "image"]);
    return [...document.querySelectorAll("dialog input, dialog select, dialog textarea")]
      .filter((control) => !skipped.has(control.type))
      .map((control) => ({
        dialog: control.closest("dialog").id,
        control: control.id || control.getAttribute("aria-label") || control.name || control.tagName.toLowerCase(),
        size: parseFloat(getComputedStyle(control).fontSize),
      }))
      .filter(({ size }) => size < 16);
  });
  assert.deepEqual(offenders, [], `controls under 16px:\n${offenders.map((o) => `  ${o.dialog} › ${o.control}: ${o.size}px`).join("\n")}`);
});

// ---------------------------------------------------------------------------------------------
// (e) After choosing the last routine tab, it must be scrolled into the strip's visible bounds.
appTest("regression e: the selected last routine tab is visible inside the scrolled tab strip", async ({ page, t }) => {
  async function lastTabVisible(viewLabel) {
    await goToView(page, viewLabel);
    const tab = routineTab(page, "Legs morning");
    await tab.click();
    await expect(routineTab(page, "Legs morning")).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(400);
    const geometry = await routineTab(page, "Legs morning").evaluate((element) => {
      const strip = element.parentElement.getBoundingClientRect();
      const own = element.getBoundingClientRect();
      return { stripLeft: strip.left, stripRight: strip.right, tabLeft: own.left, tabRight: own.right, scrollLeft: element.parentElement.scrollLeft };
    });
    assert.ok(
      geometry.tabLeft >= geometry.stripLeft - 1 && geometry.tabRight <= geometry.stripRight + 1,
      `selected tab outside the strip in ${viewLabel}: ${JSON.stringify(geometry)}`,
    );
  }
  await t.test("Workout", () => lastTabVisible("Workout"));
  await t.test("Program", () => lastTabVisible("Program"));
});

// ---------------------------------------------------------------------------------------------
// (f) The Program add-exercise picker must use the Library's punctuation-tolerant matching.
appTest("regression f: the Program picker finds 'Ab-wheel rollout' for 'ab wheel' (and other punctuation variants)", async ({ page }) => {
  await goToView(page, "Library");
  await mainArea(page).getByRole("searchbox", { name: "Search exercises" }).fill("ab wheel");
  await expect(mainArea(page).getByRole("button", { name: "View Ab-wheel rollout details" }), "Library control: matches").toBeVisible();

  await goToView(page, "Program");
  await mainArea(page).getByRole("button", { name: "+ Add exercise" }).first().click();
  const picker = dialog(page, "Add exercise");
  for (const [query, name] of [["ab wheel", "Ab-wheel rollout"], ["captains chair", "Captain’s-chair knee raise"]]) {
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill(query);
    await expect(picker.getByRole("button", { name: `Add ${name} to this routine` }), `picker finds ${name} for "${query}"`).toBeVisible();
  }
});

// ---------------------------------------------------------------------------------------------
// (g) With the page left open past midnight, returning to it must show the new day unchecked.
appTest("regression g: after midnight, returning to the page shows the new day's entries unchecked", {
  now: { year: 2026, month: 11, day: 4, hour: 23, minute: 58 },
}, async ({ page }) => {
  await checkButton(page, "Low-incline dumbbell press").click();
  await expect(checkButton(page, "Low-incline dumbbell press")).toHaveAttribute("aria-pressed", "true");
  await page.clock.fastForward("03:00");
  assert.equal(await page.evaluate(() => new Date().getDate()), 5, "the page clock moved to the next day");
  await page.evaluate(() => {
    const setVisibility = (state) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
      Object.defineProperty(document, "hidden", { configurable: true, get: () => state === "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    };
    setVisibility("hidden");
    setVisibility("visible");
  });
  await expect(checkButton(page, "Low-incline dumbbell press"), "Nov 5 starts unchecked").toHaveAttribute("aria-pressed", "false");
});

// ---------------------------------------------------------------------------------------------
// (h) The export file name must carry the local date, not the UTC date.
test("regression h: the export file name uses the local date", { timeout: 60_000 }, async (t) => {
  const cases = [
    { timezoneId: "Pacific/Kiritimati", local: { year: 2026, month: 11, day: 4, hour: 9, minute: 0 } }, // 2026-11-03 19:00 UTC
    { timezoneId: "America/Los_Angeles", local: { year: 2026, month: 11, day: 4, hour: 20, minute: 0 } }, // 2026-11-05 04:00 UTC
  ];
  for (const { timezoneId, local } of cases) {
    await t.test(timezoneId, async () => {
      const app = await openApp({ browser: env.browser, server: env.server, timezoneId, now: zonedEpoch(local, timezoneId) });
      try {
        const settings = await openSettings(app.page);
        const [download] = await Promise.all([
          app.page.waitForEvent("download"),
          settings.getByRole("button", { name: "Export app data" }).click(),
        ]);
        assert.equal(download.suggestedFilename(), `gym-schedule-${dateKey(local)}.json`);
        app.assertNoErrors();
      } finally {
        await app.close();
      }
    });
  }
});

// ---------------------------------------------------------------------------------------------
// (i) Deleting a routine must not erase its past completions from Log.
appTest("regression i: deleting a routine keeps its past completions in Log", async ({ page }) => {
  await goToView(page, "Log");
  await calendarDay(page, "Monday, November 2, 2026").click();
  const day = dialog(page, "Monday, November 2");
  await day.getByRole("checkbox", { name: startsWith("Pull A ") }).setChecked(true, { force: true });
  await day.getByRole("button", { name: "Save day" }).click();
  await expect(calendarDay(page, "Monday, November 2, 2026")).toHaveAccessibleName(/1 completed routine/);

  const editor = await openRoutineEditor(page, "Pull A");
  await editor.getByRole("button", { name: "Delete routine" }).click();
  await dialog(page, "Delete Pull A?").getByRole("button", { name: "Delete routine", exact: true }).click();
  await expect(routineTab(page, "Pull A")).toHaveCount(0);

  await goToView(page, "Log");
  await expect(calendarDay(page, "Monday, November 2, 2026"), "Nov 2 still shows as a completed day").toHaveAccessibleName(/completed routine/);
});

// ---------------------------------------------------------------------------------------------
// (j) With dark theme saved, the very first paint must already be dark (no light flash).
// DOMContentLoaded is too late to tell: deferred module scripts run before it fires, so the probe
// samples when the parser first inserts <body>, before the app module has executed.
appTest("regression j: with dark theme saved, the theme is dark before the app module runs", {
  initScripts: [() => {
    window.__themeProbe = null;
    const observer = new MutationObserver(() => {
      if (!document.body || window.__themeProbe) return;
      const main = document.querySelector("#appMain");
      window.__themeProbe = {
        theme: document.documentElement.dataset.theme ?? null,
        appRendered: Boolean(main?.children.length),
      };
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  }],
}, async ({ page, reload }) => {
  const settings = await openSettings(page);
  await settings.getByRole("button", { name: /^Theme/ }).click();
  await expect(settings.getByRole("button", { name: /^Theme/ })).toHaveAccessibleName("Theme Dark");
  await reload();
  const probe = await page.evaluate(() => window.__themeProbe);
  assert.ok(probe, "probe sampled the document");
  assert.equal(probe.appRendered, false, "probe ran before the app rendered (test validity)");
  assert.equal(probe.theme, "dark", "documentElement.dataset.theme at first <body> parse");
});
