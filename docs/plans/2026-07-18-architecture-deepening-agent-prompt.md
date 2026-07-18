# Handoff Prompt — Execute the Architecture Deepening Plan

Copy everything below into a new Agent task whose working directory is the repository root.

---

You are the sole implementation Agent for `bazaarplusplus-site`. Execute the complete plan in:

`docs/plans/2026-07-18-architecture-deepening-plan.md`

Your objective is to finish every phase from Phase 0 through Phase 5 in order. Do not delegate work or split it across Agents. Do not stop after analysis, partial scaffolding, or one candidate; continue until the full definition of done is satisfied or a genuine user decision is required.

Before editing:

1. Read `AGENTS.md` completely.
2. Read `CONTEXT.md` completely and use its canonical terms.
3. Read the architecture deepening plan completely.
4. Inspect `git status --short`; preserve all existing changes. The glossary and plan files may already be uncommitted intentional work.
5. Inspect the current code at every cited `file:line`. Code is the source of truth; docs and this plan are guidance when they agree with code.

Non-negotiable constraints:

- This is a behavior-preserving architecture refactor.
- Preserve page visuals and copy, public SPA routes, query defaults, client-side routing, React Query behavior, remote payload contracts, request count, and bounded concurrency.
- Keep all user-facing text in `src/content/site-copy.ts`.
- Keep the SPA route model in `src/app/router.ts`.
- Use no new runtime dependency.
- Use the architecture vocabulary: module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality.
- Hero Analysis must be pure, deterministic, React-free, and tested through one external interface.
- Hero Metrics Dataset ingestion centrally owns transport classification, decoding, compatibility, retry, concurrency, degradation, Dataset Coverage, and semantic progress.
- Unknown additive fields, optional fields, sparse buckets, and non-canonical heroes must not cause unnecessary failure.
- Missing or invalid required counters must fail the entire date; never silently drop a bad row or invent zero values.
- An invalid manifest fails the page; an invalid date degrades Dataset Coverage while other valid dates remain usable.
- Never classify 404 by parsing error text.
- Loading progress crosses the seam as semantics, never presentation strings.
- Only the SPA location implementation may touch browser location/history globals.
- Do not preserve a shallow interface solely to keep an old test passing. Replace old tests after the deep interface covers the behavior.
- Do not fix unrelated bugs. Record them as deferred unless they block the agreed work or violate data truth.
- Do not commit, stage, push, deploy, or create a pull request unless the user separately asks.

Execution discipline:

- Follow Phase 0 → 1 → 2 → 3 → 4 → 5 exactly.
- Work test-first at each new deep interface: add or move observable behavior coverage, implement, then delete superseded tests and modules.
- Apply the deletion test before retaining an adapter, helper module, compatibility export, or old test.
- Keep private helpers inside the deep implementation unless there are two real callers.
- Mark plan checkboxes complete only after the corresponding code and verification genuinely pass.
- At the end of every phase run:

  ```bash
  npm test
  npm run typecheck
  npm run build
  ```

- Do not advance while a phase gate is red.
- Run the plan's `rg` deletion checks; investigate every unexpected match.
- Use port 3000 for the final local smoke test.
- Keep the user updated during long-running work and report concrete evidence instead of generic status.

If the plan conflicts with current code:

- Trust current code and tests over prose.
- Resolve small implementation-detail differences using the destination and locked decisions.
- Update the plan when the code reveals stale file names or line numbers but the intended architecture is unchanged.
- Stop and ask the user only if proceeding would change a public route, URL behavior, visible behavior, remote contract, data-truth policy, or another locked decision.

Expected final response:

- Lead with whether the entire plan is complete.
- Summarize the final deep modules and the shallow modules/tests removed.
- Cite important changed files with absolute clickable paths and line numbers.
- Report `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`, and the manual smoke result.
- List any unrelated defects deliberately deferred.
- State that no commit/deploy occurred unless separately authorized.

Planning baseline: 22 test files and 113 passing tests on 2026-07-18. Treat the actual Phase 0 result as authoritative.

---
