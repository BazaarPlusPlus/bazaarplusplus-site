# BazaarPlusPlus Site Architecture

Structure and data flow of the current code. Process rules live in `CLAUDE.md`, vocabulary in `CONTEXT.md`. The code is the source of truth; this document indexes it and records what the code cannot state about itself.

## Purpose

This site renders the BazaarPlusPlus public website, including support, stable installer downloads, tutorials, and Hero Analysis. It is a Vite + React + TypeScript single-page app deployed as static assets through Cloudflare Workers.

## Runtime flow

1. `src/main.tsx` mounts the React app inside `Providers`.
2. The deep SPA location module in `src/app/router.ts` resolves the browser location through the production browser adapter. It owns the route catalog, aliases, locale and Analysis Scope parsing, localized hrefs, query defaults, click eligibility, and push/replace/popstate behavior.
3. `src/app/App.tsx` renders from the resolved location model and keeps the document title and language synchronized. The `/heroes` route stays lazily loaded, enforced by `test/app-code-splitting.test.tsx`.
4. `src/app/route-pages.tsx` uses React Query for runtime fetching and caching. It calls the Hero Metrics Dataset ingestion interface directly and forwards semantic progress to presentation.
5. The deep ingestion implementation in `src/features/heroes/hero-metrics-dataset.ts` loads and decodes the manifest plus at most seven daily payloads. Its depth includes structured transport failures, timeout/retry behavior, bounded concurrency, compatibility, per-date degradation, Dataset Coverage, and semantic progress.
6. The pure Hero Analysis interface in `src/features/heroes/hero-analysis.ts` accepts a validated Hero Metrics Dataset, requested Analysis Scope, and focused hero. It owns window/tier selection and fallback, canonical-hero filtering, additive merging, ranking, trends and gap segments, stages, matchups, focus fallback, and selected-window Dataset Coverage.
7. `HeroOverviewDashboard` crosses that one analysis seam and owns presentation state such as table sorting, focus interaction, hover state, and SVG geometry. It does not know remote payload transport, decoding, merge sequencing, or browser history.

## Routes and URL contract

The route catalog in `src/app/router.ts` is the source of truth for App routing, Header navigation, and page-title keys.

- `/` → support page
- `/support` → support page
- `/supporters` → canonicalized with replace semantics to `/support`
- `/tutorial` → mod tutorial, install guide, and hotkeys
- `/download` → installer downloads
- `/heroes` → Hero Analysis dashboard

Unknown paths render the localized not-found screen. Valid trailing slashes resolve client-side. Cloudflare provides SPA fallback.

Query defaults omit the default value and serialize everything else explicitly:

- Chinese is the default locale and omits `lang`; English uses `lang=en`.
- The `1d` metric window omits `w`; `3d` and `7d` serialize explicitly.
- The `all` rating tier omits `t`; other tiers serialize explicitly.

Analysis Scope changes replace the current history entry. Normal internal navigation, including language links, pushes. Locale links preserve the current path, query scope, and hash.

## Hero Metrics Dataset

The production HTTP adapter reads from `VITE_METRICS_BASE` or `https://bpp-metrics.bazaarplusplus.com`:

- `analyzer-v4/manifest.json`
- each manifest-owned `analyzer-v4/web/<day>.json` path

The adapter returns unknown JSON or a structured transport failure. Decoding occurs only inside ingestion. Unknown additive fields, supported optional fields, sparse battle-day maps, and non-canonical heroes remain compatible. Missing or invalid required counters invalidate the entire date; they are never dropped or zero-filled. An invalid manifest fails the page, while an invalid daily payload degrades Dataset Coverage and leaves other valid dates usable.

Daily HTTP 404 responses are not transport-retried. Ingestion performs exactly one explicit daily refetch for publication lag. Retryable transport statuses are 408, 429, and 5xx.

## Module seams

- The production HTTP adapter and in-memory test adapter are the two implementations of the Hero Metrics Dataset transport interface.
- The production browser adapter and in-memory location adapter are the two implementations of the SPA location interface.
- Semantic loading progress crosses the ingestion seam; localized strings are produced only by `LoadingScreen` from `src/content/site-copy.ts`. Components consume localized copy and the resolved location model rather than constructing language URLs or parsing presentation strings.
- React Query owns runtime request caching. Hero Analysis is deterministic, React-free, and tested through its external interface.

These deep modules keep policy changes local: transport and compatibility policy stay in ingestion, analysis policy stays in Hero Analysis, URL/history policy stays in the SPA location module, and interaction details stay in presentation.

## Performance invariants

- React Query uses five-minute `staleTime`, 30-minute `gcTime`, one retry, and no refetch on window focus (`src/shared/lib/query-client.ts`).
- Ingestion fetches one manifest plus at most seven daily payloads.
- Daily payload concurrency defaults to six.
- A failed date does not increase requests for other dates; only a structured daily 404 receives one explicit refetch.

## Deployment

Cloudflare Workers serves `dist/` as static assets with `single-page-application` not-found handling. Production is bound to the custom domains `bazaarplusplus.com` and `www.bazaarplusplus.com`; the `preview` environment deploys to `workers_dev` with no routes (`wrangler.jsonc`).

## Tests

Vitest files live flat under `test/`, not in `src/**/__tests__`. The two seam test adapters are the in-memory metrics transport and the in-memory location adapter.

## Gotchas

- Only `VITE_`-prefixed variables reach client code. `.env.example` also lists `PUBLIC_METRICS_BASE` and `PUBLIC_SITE_URL`; the bundle never reads them.
- This repo has no card dictionary and no card/build browser. The workspace-level description of `VITE_CARD_DICTIONARY_URL` predates the current code — verify against `src/` before referencing it.
