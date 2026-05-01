# BazaarPlusPlus Stats Architecture

Last updated: 2026-05-02

## Purpose

This site renders BazaarPlusPlus stats dashboards for heroes, cards, final builds, downloads, and support. It is a Vite + React + TypeScript single-page app deployed as static assets through Cloudflare Workers.

## Runtime Flow

1. `src/main.tsx` mounts the React app inside `Providers`.
2. `src/app/App.tsx` creates the runtime metrics client, reads the browser path and query string, resolves the SPA route, parses locale, and sets document title/lang.
3. `src/app/route-pages.tsx` uses React Query to load route data. Cards and builds share a manifest/card dictionary route frame, while hero overview uses a bounded-concurrency page-data loader.
4. Feature dashboards transform raw payloads into view rows and render shared shells, filters, and tables.
5. `src/content/site-copy.ts` provides localized UI copy for shared chrome, stats dashboards, download, support, loading, error, and not-found states.

## Routes

- `/` -> support page
- `/support` -> support page
- `/supporters` -> canonicalized to `/support`
- `/download` -> installer downloads
- `/heroes` -> hero overview dashboard
- `/cards` -> card analysis dashboard
- `/builds` -> final builds dashboard

Unknown paths render the localized not-found screen.

## Data Sources

Runtime metrics are fetched through `src/shared/lib/metrics-client.ts`.

- `manifest.json`
- `hero_overview/<window>/<tier>.json`
- `hero_winrate_daily/<tier>.json`
- `item_winrate/<window>/<tier>.json`
- `item_uplift/<window>/<tier>.json`
- `item_inclusion/<window>/<tier>.json`
- `final_builds/<window>/<tier>.json`
- card dictionary JSON

The default remote metrics base is `https://bpp-metrics.bazaarplusplus.com`. The default card dictionary URL is `/card_dict_with_url.json`.

## Environment Variables

- `VITE_METRICS_BASE`: browser runtime metrics base URL.
- `VITE_CARD_DICTIONARY_URL`: browser runtime card dictionary URL.
- `BPP_REMOTE_METRICS_BASE`: Vite dev/preview proxy upstream for `/metrics/*`.
- `PUBLIC_METRICS_BASE`: fallback upstream used by the Vite proxy and node-side repository helper.
- `BPP_REMOTE_CARD_DICTIONARY_URL`: Vite dev/preview/build upstream for the card dictionary asset.
- `PUBLIC_CARD_DICTIONARY_URL`: node-side repository helper fallback for the card dictionary.

`PUBLIC_SITE_URL` exists in `.env.example`, but the current app code does not read it.

## i18n

Supported locales are `zh` and `en`; `zh` is the default. Locale selection uses the `lang` query parameter:

- default Chinese: no `lang` parameter
- English: `?lang=en`

All UI copy should live in `src/content/site-copy.ts`. Components should receive `locale` and look up copy from that module rather than hardcoding display text. Shared labels for navigation, loading, errors, filters, footers, stats headers, and table headers are localized there.

Date and integer formatting live in `src/shared/lib/dashboard.ts`. Percent formatting intentionally stays fixed as `12.3%` to keep metric tables compact and stable across locales.

## Performance Notes

- React Query caches queries for five minutes and avoids refetch-on-focus.
- Cards and builds pages share manifest/card dictionary queries, then lazily load only the selected metrics payload.
- Hero overview uses `loadHeroOverviewPageData` and fetches multiple hero overview/daily payloads with bounded concurrency.
- `VirtualizedMetricTable` is used for large card/build tables.

## Verification

Use these commands before shipping changes:

```bash
npm test
npm run typecheck
npm run build
```
