// Rounds and blocks: the history grouped by block, a block's own page, and a round
// opened from it that goes back to it.

import { answerBreak, finishWorkout, setRoundNumber, startWorkout } from "../../js/model.js";
import { PAST_DAY, sampleState } from "../sample.mjs";
import { freshStore, save } from "../support.mjs";
import { expect, main, suite, tapOnRound } from "./helpers.mjs";

// Block 1: rounds 1 and 2 complete, round 3 cut by a seven-week break. Block 2 started
// after it: round 1 complete, round 2 open with one workout done.
function twoBlocks() {
  const state = sampleState();
  delete state.sessions[PAST_DAY];
  const { store } = freshStore(state);
  const train = (routineId, dateKey) => save(store, (draft) => {
    startWorkout(draft, routineId, dateKey, 0);
    finishWorkout(draft, { now: 30 * 60000 });
  });
  save(store, (draft) => setRoundNumber(draft, 1));
  for (const [routineId, dateKey] of [["day-a", "2026-08-17"], ["day-b", "2026-08-19"], ["day-a", "2026-08-24"], ["day-b", "2026-08-26"], ["day-a", "2026-08-31"]]) train(routineId, dateKey);
  save(store, (draft) => answerBreak(draft, true, "2026-10-19"));
  for (const [routineId, dateKey] of [["day-a", "2026-10-19"], ["day-b", "2026-10-21"], ["day-a", "2026-10-26"]]) train(routineId, dateKey);
  return store.getState();
}

const { appTest } = suite({ saved: twoBlocks() });

const heading = (page, name) => main(page).getByRole("heading", { level: 1, name, exact: true });
const value = (page, text) => main(page).getByText(text, { exact: true });

appTest("Rounds and blocks groups the rounds by block; a block's page sums it up and its rounds come back to it", async ({ page }) => {
  // The tab's first page links to the history (its row's wording is the tab's own).
  await tapOnRound(page, main(page).getByRole("button", { name: /^(All rounds|Rounds and blocks)/ }));
  await expect(heading(page, "Rounds and blocks")).toBeVisible();
  await expect(main(page).getByRole("button", { name: "End round 2 now", exact: true })).toBeVisible();
  await expect(main(page).getByRole("button", { name: "Change round number", exact: true })).toBeVisible();
  const block2 = main(page).getByRole("button", { name: /^Block 2, since .+, 2 rounds\. Open the block\.$/ });
  await expect(block2).toBeVisible();
  await expect(main(page).getByRole("button", { name: /^Block 1, .+, 3 rounds\. Open the block\.$/ })).toBeVisible();
  await expect(value(page, "7 weeks off")).toBeVisible();
  await expect(main(page).getByRole("button", { name: /^Round 3, Sample program, .*\. 1 of 2 workouts, ended by the break\. Open the round\.$/ })).toBeVisible();

  // Block 2's page: its rounds in a bar and its facts as labelled lines.
  await tapOnRound(page, block2);
  await expect(heading(page, "Block 2")).toBeVisible();
  await expect(main(page)).toContainText("Weeks 43–45");
  await expect(main(page)).toContainText("2 rounds · round 2 open");
  await expect(value(page, "1 complete,")).toBeVisible();
  await expect(value(page, "3 done")).toBeVisible();
  await expect(value(page, "17 days so far, 3rd week")).toBeVisible();
  await expect(value(page, "2026 · weeks 43–45")).toBeVisible();
  await expect(value(page, "1 h 30 min")).toBeVisible();
  await expect(value(page, "after 7 weeks off")).toBeVisible();

  // A round opened from the block goes back to the block, and the block to the list.
  await tapOnRound(page, main(page).getByRole("button", { name: /^Round 1 · block 2, Sample program, .*\. 2 of 2 workouts, complete\. Open the round\.$/ }));
  await expect(main(page).getByRole("heading", { level: 1, name: "Round 1 · block 2" })).toBeVisible();
  await tapOnRound(page, main(page).getByRole("button", { name: "Back to Block 2", exact: true }));
  await expect(heading(page, "Block 2")).toBeVisible();
  await tapOnRound(page, main(page).getByRole("button", { name: "Back to Rounds and blocks", exact: true }));
  await expect(heading(page, "Rounds and blocks")).toBeVisible();

  // Tapping the tab (the first in the bottom navigation) returns to its first page.
  await tapOnRound(page, page.getByRole("navigation", { name: "Main navigation" }).getByRole("button").first());
  await expect(heading(page, "Rounds and blocks")).toBeHidden();
});
