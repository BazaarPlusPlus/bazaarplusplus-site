# BazaarPlusPlus Site Architecture

Last updated: 2026-07-18

## Purpose

This site renders the BazaarPlusPlus public website, including support, stable installer downloads, tutorials, and Hero Analysis. It is a Vite + React + TypeScript single-page app deployed as static assets through Cloudflare Workers.

## Runtime flow

1. `src/main.tsx` mounts the React app inside `Providers`.
2. The deep SPA location module in `src/app/router.ts` resolves the browser location through the production browser adapter. It owns the route catalog, aliases, locale and Analysis Scope parsing, localized hrefs, query defaults, click eligibility, and push/replace/popstate behavior.
3. `src/app/App.tsx` renders from the resolved location model and keeps the document title and language synchronized. The `/heroes` route remains lazily loaded.
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

Unknown paths render the localized not-found screen. Valid trailing slashes resolve client-side. Cloudflare continues to provide SPA fallback.

Query defaults are unchanged:

- Chinese is the default and omits `lang`; English uses `lang=en`.
- The `1d` metric window omits `w`; `3d` and `7d` serialize explicitly.
- The `all` rating tier omits `t`; other tiers serialize explicitly.

Analysis Scope changes replace the current history entry. Normal internal navigation, including language links, pushes. Locale links preserve the current path, query scope, and hash.

## Hero Metrics Dataset

The production HTTP adapter reads from `VITE_METRICS_BASE` or `https://bpp-metrics.bazaarplusplus.com`:

- `analyzer-v4/manifest.json`
- each manifest-owned `analyzer-v4/web/<day>.json` path

The adapter returns unknown JSON or a structured transport failure. Decoding occurs only inside ingestion. Unknown additive fields, supported optional fields, sparse battle-day maps, and non-canonical heroes remain compatible. Missing or invalid required counters invalidate the entire date; they are never dropped or zero-filled. An invalid manifest fails the page, while an invalid daily payload degrades Dataset Coverage and leaves other valid dates usable.

Daily HTTP 404 responses are not transport-retried. Ingestion performs exactly one explicit daily refetch for publication lag. Retryable transport statuses remain 408, 429, and 5xx.

## Module seams

- The production HTTP adapter and in-memory test adapter are the two implementations of the Hero Metrics Dataset transport interface.
- The production browser adapter and in-memory location adapter are the two implementations of the SPA location interface.
- Semantic loading progress crosses the ingestion seam; localized strings are produced only by `LoadingScreen` from `src/content/site-copy.ts`.
- React Query owns runtime request caching. Hero Analysis is deterministic, React-free, and tested through its external interface.

These deep modules keep policy changes local: transport and compatibility policy stay in ingestion, analysis policy stays in Hero Analysis, URL/history policy stays in the SPA location module, and interaction details stay in presentation.

## Performance invariants

- React Query uses five-minute `staleTime`, 30-minute `gcTime`, one retry, and no refetch on window focus (`src/shared/lib/query-client.ts`).
- Ingestion fetches one manifest plus at most seven daily payloads.
- Daily payload concurrency defaults to six.
- A failed date does not increase requests for other dates; only a structured daily 404 receives one explicit refetch.

## i18n

Supported locales are `zh` and `en`; `zh` is the default. All user-facing site text lives in `src/content/site-copy.ts`. Components consume localized copy and the resolved location model rather than constructing language URLs or parsing presentation strings.

## Verification

Run before shipping:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```
