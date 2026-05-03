# Codebase Refactor Review

Last updated: 2026-05-02

## Architecture Summary

BazaarPlusPlus Site is a Vite + React + TypeScript SPA deployed as Cloudflare Workers static assets. `src/app/App.tsx` owns browser location state, locale parsing, title/lang side effects, SPA navigation interception, and route selection. `src/app/router.ts` keeps route resolution centralized.

Runtime metrics flow through `src/shared/lib/metrics-client.ts`, with React Query providing request caching. Route pages in `src/app/route-pages.tsx` load the frame data needed by each dashboard, then feature dashboards transform payload rows into view rows and render shared shells, filters, and virtualized tables. UI copy remains centralized in `src/content/site-copy.ts`.

## Problem Areas

- Route-level data loading for cards and final builds had duplicated manifest/card dictionary queries, loading progress calculation, and loading/error branching. This increased drift risk between two pages with the same data frame.
- Card metric identity was mapped in more than one place: the card route needed manifest metric keys, while the dashboard needed payload metric keys. Those mappings were the same concept but lived apart.
- Card view-row builders repeated dictionary display-name, image URL, and card size enrichment for winrate, uplift, and inclusion payloads.
- `src/features/heroes/HeroOverviewDashboard.tsx` is still the largest file in the app. It mixes chart preparation, table rendering, layout, and interaction state, so future hero-dashboard changes carry higher review risk.
- Hero overview still preloads a broad window/tier payload set up front. Bounded concurrency protects the browser, but payload growth could make incremental query loading more attractive.
- `src/shared/components/MetricFilterBar.tsx` appears unused by production code and is only covered by tests. Keep or remove it intentionally in a separate cleanup.

## Refactoring Strategies

- Preserve the SPA route contract and deployment assumptions; centralize shared route loading without moving route ownership out of `src/app/route-pages.tsx`.
- Treat metric key mapping and card row enrichment as domain logic in `src/shared/lib/metrics.ts`, then consume those APIs from route and dashboard code.
- Use narrow characterization tests before extraction so the refactor remains behavior-preserving.
- Keep remaining large-file work incremental: extract pure hero-dashboard data derivation first, then rendering subcomponents only where tests already cover behavior.

## Improved Code

- Added `getManifestDictionaryProgress` and `useManifestDictionaryPageData` in `src/app/route-pages.tsx`, removing duplicated cards/builds route query orchestration.
- Added `getCardMetricPayloadMetric`, `CardMetricPayload`, `CardMetricViewRow`, and `buildCardMetricViewRows` in `src/shared/lib/metrics.ts`.
- Consolidated card view-row metadata enrichment through one internal helper.
- Reused shared metric ordering constants for windows and rating tiers.
- Updated `CardAnalysisDashboard` and route initialization to consume shared metric helpers.
- Added tests for shared route loading progress, card metric key mapping, and shared card metadata enrichment.
