<!-- Curated by consolidation runs only. Do not hand-edit; write new knowledge to docs/drafts/. -->
<!-- Budget: <=200 lines / <=10KB. Merge, don't append. Boundaries: CLAUDE.md=process, this=knowledge, docs/ARCHITECTURE.md=structure. -->

# BazaarPlusPlus Site — Durable Memory

Dense agent-facing index. Structure (`docs/ARCHITECTURE.md`) and rationale (`docs/adr/`) are linked, not restated. Code is the source of truth.

## Rules

Domain constraints that must stay true in the system. Process/workflow rules live in `CLAUDE.md` (AGENTS.md symlink).

- All user-facing text lives in `src/content/site-copy.ts`; components never hardcode labels, aria text, loading text, or header/footer strings. [CLAUDE.md project rules]
- Locale contract: `zh` is default and omits `lang`; English serializes `?lang=en`. `App.tsx` owns `document.title` and `<html lang>` (`zh-CN` / `en`). [`src/app/App.tsx:30-31`]
- Analysis Scope query defaults omit default values: window `1d` omits `w`, tier `all` omits `t`; non-defaults serialize explicitly. Scope changes replace the history entry; normal navigation pushes. [`docs/ARCHITECTURE.md` §Routes]
- Dataset Coverage: a date with missing/invalid required counters invalidates that entire date and is surfaced as missing — never zero-filled, never silently dropped. An invalid manifest fails the page; an invalid daily payload only degrades coverage. [`CONTEXT.md` | `docs/ARCHITECTURE.md` §Hero Metrics Dataset]
- Hero Analysis (`hero-analysis.ts`) stays deterministic and React-free, tested through its external interface only. [`docs/ARCHITECTURE.md` §Module seams]

## Durable knowledge

Verified facts about how the system works.

- Runtime flow: `main.tsx` → `Providers` → `router.ts` location model → `App.tsx` → `route-pages.tsx` (React Query) → ingestion → analysis → dashboard. Full walk-through in `docs/ARCHITECTURE.md` §Runtime flow.
- Route catalog: `/heroes` (primary), `/tutorial`, `/download`, `/support` (secondary), `/` → support; `/supporters` canonicalizes to `/support` with replace semantics. Unknown paths render the localized not-found screen. [`src/app/router.ts:19-22,91`]
- Metrics origin: `VITE_METRICS_BASE` with production fallback `https://bpp-metrics.bazaarplusplus.com`; ingestion reads `analyzer-v4/manifest.json` plus manifest-owned `analyzer-v4/web/<day>.json` files. [`src/features/heroes/hero-metrics-dataset.ts:134,139`]
- Ingestion policy: at most the last 7 daily payloads, default payload concurrency 6, retryable transport statuses are 408/429/5xx, and a daily 404 gets exactly one explicit refetch (publication lag) — no transport retry. [`src/features/heroes/hero-metrics-dataset.ts:138,151,445,474`]
- React Query defaults: `staleTime` 5 min, `gcTime` 30 min, `retry: 1`, no refetch on window focus. [`src/shared/lib/query-client.ts:7-10`]
- Dev/preview servers are pinned to port 3000 with `--strictPort`; both serve `/metrics/*` from the production metrics origin via the `bpp-remote-metrics` Vite plugin. [`package.json:9,15` | `vite.config.ts:29-64`]
- Deployment: Cloudflare Workers static assets from `dist/` with `single-page-application` not-found handling; custom domains `bazaarplusplus.com` + `www`; the `preview` env deploys to `workers_dev` with no routes. [`wrangler.jsonc:8-27`]
- `/heroes` is lazily loaded (code-splitting is test-enforced). [`docs/ARCHITECTURE.md` §Runtime flow | `test/app-code-splitting.test.tsx`]
- Tests are flat vitest files under `test/` (no `src/**/__tests__`); the two seam test adapters are the in-memory metrics transport and the in-memory location adapter. [`vitest.config.ts` | `docs/ARCHITECTURE.md` §Module seams]

## Gotchas

- Only the `VITE_`-prefixed env var reaches client code; `PUBLIC_METRICS_BASE` / `PUBLIC_SITE_URL` in `.env.example` are not read by the bundle. [`src/features/heroes/hero-metrics-dataset.ts:134` | `.env.example`]
- This repo has no card dictionary or card/build browser; the workspace-level description of `VITE_CARD_DICTIONARY_URL` predates the current code. Verify against `src/` before referencing it.
