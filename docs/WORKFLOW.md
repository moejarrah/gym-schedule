# Work Method

Use this workflow for non-trivial work. Small, obvious fixes may go directly from inspection to implementation and verification.

## 1. Recover current truth

After a freeze, interruption, compaction, or handoff:

1. Read `HANDOFF_STATUS.md`, then the relevant `AUDIT.md` and `PRODUCT.md` sections.
2. Inspect `git status`, the latest commits, changed files, and any running preview/server.
3. Distinguish committed work, uncommitted work, repo-verified work, and owner/device-verified work.
4. Treat the newest user request as the active direction. Do not reconstruct scope from chat memory alone.

## 2. Define one slice

Before editing, state:

- **Goal:** one observable outcome.
- **Acceptance:** behavior the user or a check can verify.
- **Out of scope:** adjacent ideas deliberately excluded.
- **Risks:** data, offline cache, navigation, or phone-layout behavior that could regress.

If the change cannot be summarized tightly, split it. Do not combine cleanup, redesign, feature work, and data migration into one patch without necessity.

## 3. Inspect before changing

- Trace the current behavior and data ownership in code.
- For UI work, map every affected action in `PRODUCT.md` from old path to intended new path.
- For storage work, inspect schema validation, migrations, import/export, deletion cleanup, and failure handling.
- Reuse an existing pattern when it fits. Add no abstraction, file, dependency, configuration, or fallback unless the acceptance criteria require it.

## 4. Implement narrowly

- Make the smallest complete change.
- Run focused checks early.
- Do not fix unrelated findings. Record worthwhile ones in `AUDIT.md` with evidence.
- Keep production and reference artifacts separate.

## 5. Verify with observable evidence

1. Run the most focused relevant check.
2. Run the repository-required full checks when applicable.
3. Exercise the changed flow in the local interactive preview at 320 × 700 and 393 × 852.
4. Check long-list scrolling, changed dialogs, both themes, focus, safe areas, and every affected product action.
5. Review the final diff for accidental scope, stale versions, data-shape changes, and missing actions.
6. For meaningful multi-file, storage, redesign, or release work, use a fresh bounded verifier focused on stated requirements and regressions.

A passing static assertion is not evidence that a phone interaction works. Record untested behavior plainly.

## 6. Status and release gate

Use: `Planned → In progress → Repo verified → Device verified → Released`.

- **Repo verified:** applicable checks and local runtime flows passed.
- **Device verified:** owner confirmed affected Safari and/or standalone behavior on the target iPhone.
- **Released:** the intended commit is published and the installed app receives the expected cache version.

Do not call phone UI complete before device verification. Do not publish a non-trivial UI redesign before the owner accepts the local preview unless the owner explicitly asks to publish first.

## 7. Handoff

Update only the truth that changed:

- `HANDOFF_STATUS.md`: current commit/cache/schema, active slice, WIP, evidence, device status, and next safest action.
- `AUDIT.md`: device-pending issues and explicit not-planned boundaries; repo-verified slices remain until device acceptance.
- `PRODUCT.md`: only durable product behavior or action changes.
- `AGENTS.md`: only recurring mistakes or repository-wide constraints.

The final response lists changed files, validation evidence, device-only gaps, and the next decision. Replace stale status; do not append a diary.
