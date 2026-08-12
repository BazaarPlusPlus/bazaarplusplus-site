# BazaarPlusPlus Site Architecture

The code is the structural source of truth. This document records intended ownership and cross-module contracts that are costly to infer from individual files.

## Ownership

| Concern | Owner | Boundary |
| --- | --- | --- |
| URL and browser history | `src/app/router.ts` | Owns routes, aliases, locale and Analysis Scope parsing, canonical hrefs, click eligibility, and push/replace/popstate behavior. |
| Page composition | `src/app/App.tsx` and `src/app/route-pages.tsx` | Render the resolved location; `/heroes` stays lazy. Runtime data enters through React Query. |
| Hero Metrics Dataset ingestion | `src/features/heroes/hero-metrics-dataset.ts` | Owns transport, retries, decoding, compatibility, Dataset Coverage, and semantic loading progress. |
| Hero Analysis | `src/features/heroes/hero-analysis.ts` | Pure, React-free policy for scope selection, merging, ranking, trends, matchups, focus fallback, and selected-window coverage. |
| Hero Analysis presentation | `src/features/heroes/HeroOverviewDashboard.tsx` | Owns sorting, focus and hover state, and SVG geometry; consumes validated analysis only. |

The metrics transport and SPA location seams each have production and in-memory test adapters. Components consume their resolved models; payload decoding stays in ingestion and browser-history handling stays in the router.

## URL Contract

- `src/app/router.ts` is the route catalog for App routing, navigation, and page-title keys. Cloudflare supplies SPA fallback; unknown paths still resolve to the localized not-found page.
- Default values—Chinese, `1d`, and `all`—omit `lang`, `w`, and `s`; non-default values serialize explicitly.
- Analysis Scope changes and alias canonicalization replace history. Internal navigation pushes. Locale links preserve the current path, scope, and hash.

## Hero Metrics Dataset

- The HTTP adapter returns unknown JSON or a structured transport failure; ingestion is the only decoder.
- One snapshot contains 1–7 contiguous daily entries. Its inclusive `window.end`, rather than the wall clock, governs window selection and freshness.
- Additive fields and non-canonical heroes are compatible. An invalid envelope fails the page; an invalid daily entry degrades Dataset Coverage under `CONTEXT.md` semantics.
- Snapshots store `legend` and `non_legend`; analysis derives `all` by additive merge.
