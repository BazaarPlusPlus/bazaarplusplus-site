# BazaarPlusPlus Site Architecture

Structure and data flow of the current code. Process rules live in `CLAUDE.md`, vocabulary in `CONTEXT.md`. The code is the source of truth; this document indexes it and records what the code cannot state about itself.

## Purpose

This site renders the BazaarPlusPlus public website, including support, stable installer downloads, tutorials, and Hero Analysis. It is a Vite + React + TypeScript single-page app deployed as static assets through Cloudflare Workers.

## Runtime flow

1. `src/main.tsx` mounts the React app inside `Providers`.
2. The deep SPA location module in `src/app/router.ts` resolves the browser location through the production browser adapter. It owns the route catalog, aliases, locale and Analysis Scope parsing, localized hrefs, query defaults, click eligibility, and push/replace/popstate behavior.
3. `src/app/App.tsx` renders from the resolved location model and keeps the document title and language synchronized. The `/heroes` route stays lazily loaded, enforced by `test/app-code-splitting.test.tsx`.
4. `src/app/route-pages.tsx` uses React Query for runtime fetching and caching. It calls the Hero Metrics Dataset ingestion interface directly and forwards semantic progress to presentation.
5. The deep ingestion implementation in `src/features/heroes/hero-metrics-dataset.ts` loads and decodes one mutable hero snapshot. Its depth includes structured transport failures, timeout/retry behavior, contract validation, per-date degradation inside the snapshot, Dataset Coverage, and semantic progress.
6. The pure Hero Analysis interface in `src/features/heroes/hero-analysis.ts` accepts a validated Hero Metrics Dataset, requested Analysis Scope, and focused hero. It owns window/segment selection, derivation of the `all` segment, canonical-hero filtering, additive merging, ranking, trends and gap segments, matchups, focus fallback, and selected-window Dataset Coverage.
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
- The `all` hero segment omits `s`; `legend` and `non_legend` serialize explicitly.

Analysis Scope changes replace the current history entry. Normal internal navigation, including language links, pushes. Locale links preserve the current path, query scope, and hash.

## Hero Metrics Dataset

The production HTTP adapter reads `analyzer-v5/heroes/latest.json` from `VITE_METRICS_BASE` or `https://bpp-metrics.bazaarplusplus.com`.

The adapter returns unknown JSON or a structured transport failure. Decoding occurs only inside ingestion. A snapshot contains 1–7 contiguous daily entries in newest-first order, exactly matching its inclusive window. Unknown additive fields and non-canonical heroes remain compatible. The payload stores only `legend` and `non_legend`; analysis derives `all` by adding the two segments field by field. Dates with invalid required counters remain visible in Dataset Coverage and are never zero-filled. An invalid snapshot envelope fails the page.

The snapshot's inclusive `window.end` is authoritative for window selection and freshness; consumers do not infer completeness from the wall clock.

Retryable transport statuses are 408, 429, and 5xx.

## Module seams

- The production HTTP adapter and in-memory test adapter are the two implementations of the Hero Metrics Dataset transport interface.
- The production browser adapter and in-memory location adapter are the two implementations of the SPA location interface.
- Semantic loading progress crosses the ingestion seam; localized strings are produced only by `LoadingScreen` from `src/content/site-copy.ts`. Components consume localized copy and the resolved location model rather than constructing language URLs or parsing presentation strings.
- React Query owns runtime request caching. Hero Analysis is deterministic, React-free, and tested through its external interface.

These deep modules keep policy changes local: transport and compatibility policy stay in ingestion, analysis policy stays in Hero Analysis, URL/history policy stays in the SPA location module, and interaction details stay in presentation.

## Performance invariants

- React Query uses five-minute `staleTime`, 30-minute `gcTime`, one retry, and no refetch on window focus (`src/shared/lib/query-client.ts`).
- Ingestion fetches exactly one mutable snapshot object.
- The snapshot contains 1–7 daily entries. Each analysis window uses at most its requested 1, 3, or 7 latest entries, so a growing snapshot never invents earlier missing dates.

## Deployment

Cloudflare Workers serves `dist/` as static assets with `single-page-application` not-found handling. Production is bound to the custom domains `bazaarplusplus.com` and `www.bazaarplusplus.com`; the `preview` environment deploys to `workers_dev` with no routes (`wrangler.jsonc`).

## Tests

Vitest files live flat under `test/`, not in `src/**/__tests__`. The two seam test adapters are the in-memory metrics transport and the in-memory location adapter.

## Gotchas

- Only `VITE_`-prefixed variables reach client code. `.env.example` also lists `PUBLIC_METRICS_BASE` and `PUBLIC_SITE_URL`; the bundle never reads them.
- This repo has no card dictionary and no card/build browser. The workspace-level description of `VITE_CARD_DICTIONARY_URL` predates the current code — verify against `src/` before referencing it.
