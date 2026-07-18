# CLAUDE.md

Operating rules for AI agents working in this repository (`AGENTS.md` is a symlink to this file). Process rules live here; durable knowledge in `docs/MEMORY.md`, structure in `docs/ARCHITECTURE.md`.

## Build & Test Commands

This is a Vite + React 19 + TypeScript SPA deployed as Cloudflare Workers static assets.

```bash
npm install              # install dependencies
npm run dev              # dev server on port 3000, strictPort — do not change the port
npm test                 # vitest (all tests live flat under test/)
npm run typecheck        # tsc --noEmit
npm run build            # production build to dist/
npm run preview          # production build + local preview with /metrics/ proxied
npm run deploy           # wrangler deploy (production)
npm run deploy:preview   # wrangler deploy to the preview env (workers_dev)
```

Verification proportional to the change: code changes run `npm test` + `npm run typecheck`; run `npm run build` only when the change can affect bundling or code-splitting. Deploy only when asked.

Dev and preview servers serve `/metrics/*` from the production metrics origin via the `bpp-remote-metrics` plugin in `vite.config.ts`, so the Hero Analysis dashboard works locally without credentials.

## Architecture

Structure lives in `docs/ARCHITECTURE.md`; durable knowledge in `docs/MEMORY.md` (load first); vocabulary in `CONTEXT.md`; rationale in `docs/adr/`. This section keeps only the boundary rules — traps, not maps:

- Route resolution is fully client-side in `src/app/router.ts` (route catalog, aliases, locale + Analysis Scope parsing, push/replace policy); Cloudflare provides SPA fallback. Preserve the SPA model unless the deployment strategy changes.
- Keep the seams where they are: transport, decoding, and compatibility policy in ingestion (`src/features/heroes/hero-metrics-dataset.ts`); analysis policy in the pure, React-free `src/features/heroes/hero-analysis.ts`; URL/history policy in the SPA location module; presentation state in components. Do not leak payload schema or history handling into components.
- React Query owns runtime fetching and caching — do not add ad-hoc fetch or caching layers in components.

# Project Rules

- All user-facing copy goes through `src/content/site-copy.ts` — no hardcoded labels, aria text, loading text, or header/footer strings in components. Components consume localized copy and the resolved location model.
- Locales are `zh` (default, omits `lang`) and `en` (`?lang=en`). `App.tsx` sets `<html lang>` and the page title from localized copy. Add new copy to `site-copy.ts` first, then pass it through existing locale props.
- Missing or invalid metrics dates must surface explicitly as Dataset Coverage — never zero-fill and never silently drop a date (see `CONTEXT.md`).
- Never generate a README unless it is genuinely needed.
- For Python tooling, prefer `uv`; do not use `from __future__ import`.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`cauyxy/bazaarplusplus-site`), operated via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels are used as-is: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: vocabulary in `CONTEXT.md` at the root, decisions in `docs/adr/`. See `docs/agents/domain.md`. The full documentation map is `docs/README.md`.

Durable project knowledge lives in `docs/MEMORY.md` (load first) with detail in `docs/ARCHITECTURE.md` (the structure/overview layer); historical working documents live only in git history. Task plans, feature requests, and bugs are GitHub issues (see Issue tracker above) — not repo docs; `docs/drafts/` is the temporary write buffer for knowledge documents only (design records, root-cause analyses, decision analyses). Consolidation promotes durable outcomes into MEMORY/ADR/ARCHITECTURE, moves actionable work to issues, and deletes the spent draft. Day-to-day edit policy: `docs/ARCHITECTURE.md` and `docs/adr/` may be corrected anytime; `MEMORY.md` and `docs/README.md` are curated ONLY by consolidation runs — new knowledge goes to `drafts/`, not into them directly. Keep `MEMORY.md` under 200 lines: merge, don't append. Boundaries: AGENTS.md/CLAUDE.md = process, MEMORY.md = knowledge, ARCHITECTURE.md = structure, issues = work.

# Rules Hygiene

These rules are read by every agent session. Keep them high-signal.

## After any agentic session

If you discover a non-obvious pattern that would help future sessions, include a **"Suggested rule additions"** heading in your wrap-up summary (or the commit message) with the proposed text. Do **not** edit these rules inline during normal feature or fix work. The user decides what gets added.

## High bar for new rules

Editing or clarifying existing rules is always welcome. New rules must meet all three criteria:

1. Non-obvious — someone familiar with the codebase would still get it wrong without the rule
2. Repeatedly encountered — it came up more than once (multiple hits in one session counts)
3. Specific enough to act on — a concrete instruction, not a vague principle

Rules that apply to a single module or feature area belong in that area's own rules file, not the repo root.

## What not to put in these rules

Avoid architectural descriptions of a module or feature area. Rules should be traps to avoid, not maps to follow.

## No drive-by additions

Rules emerge from validated patterns, not one-off observations. The workflow is:

1. Agent notes a pattern during a session
2. Team validates the pattern in code review
3. A dedicated commit adds the rule with context on why it exists
