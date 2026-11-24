// Rounds and Blocks from Home: every round in one list, the blocks in their own list, a
// block's page, and a round opened from it that goes back to it.

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

appTest("Home → Blocks → a block → a round, and back the same way; Rounds lists every round with its block", async ({ page }) => {
  // Rounds: every round, newest first, each naming its block; the rare actions in More.
  await tapOnRound(page, main(page).getByRole("button", { name: /^All rounds/ }));
  await expect(heading(page, "Rounds")).toBeVisible();
  await expect(main(page).getByRole("button", { name: "End round 2 now", exact: true })).toBeVisible();
  await expect(main(page).getByRole("button", { name: "Change round number", exact: true })).toBeVisible();
  await expect(main(page).getByRole("button", { name: /^Round 3, Sample program, .*\. 1 of 2 workouts, ended by the break\. Open the round\.$/ })).toContainText("block 1");
  await expect(value(page, "7 weeks off")).toBeVisible();
  await tapOnRound(page, main(page).getByRole("button", { name: "Back to Home", exact: true }));

  // Blocks: a row per block, newest first.
  await tapOnRound(page, main(page).getByRole("button", { name: /^Blocks/ }));
  await expect(heading(page, "Blocks")).toBeVisible();
  const block2 = main(page).getByRole("button", { name: /^Block 2, open, since .+\. 2 rounds, 3 workouts\. Open the block\.$/ });
  await expect(main(page).getByRole("button", { name: /^Block 1, .+\. 3 rounds, 5 workouts\. Open the block\.$/ })).toBeVisible();

  // Block 2's page: its summary and its rounds.
  await tapOnRound(page, block2);
  await expect(heading(page, "Block 2")).toBeVisible();
  const summary = main(page).getByRole("region", { name: "Summary", exact: true });
  await expect(summary).toContainText("2rounds");
  await expect(summary).toContainText("3workouts");
  await expect(summary).toContainText("43–45weeks");
  await expect(summary).toContainText("1 h 30trained");

  // A round opened from the block goes back to the block, the block to Blocks, Blocks to Home.
  await tapOnRound(page, main(page).getByRole("button", { name: /^Round 1 · block 2, Sample program, .*\. 2 of 2 workouts, complete\. Open the round\.$/ }));
  await expect(main(page).getByRole("heading", { level: 1, name: "Round 1 · block 2" })).toBeVisible();
  await tapOnRound(page, main(page).getByRole("button", { name: "Back to Block 2", exact: true }));
  await expect(heading(page, "Block 2")).toBeVisible();
  await tapOnRound(page, main(page).getByRole("button", { name: "Back to Blocks", exact: true }));
  await expect(heading(page, "Blocks")).toBeVisible();
  await tapOnRound(page, main(page).getByRole("button", { name: "Back to Home", exact: true }));
  await expect(main(page).getByRole("button", { name: "Settings", exact: true })).toBeVisible();

  // The open round's own page can end it early.
  await tapOnRound(page, main(page).getByRole("button", { name: /^All rounds/ }));
  await tapOnRound(page, main(page).getByRole("button", { name: /^Round 2 · block 2, / }));
  await expect(main(page).getByRole("button", { name: "End Round 2 · block 2 now", exact: true })).toBeVisible();
  await expect(main(page).getByRole("button", { name: "Delete Round 2 · block 2", exact: true })).toBeVisible();
});
