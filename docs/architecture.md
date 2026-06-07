# BazaarPlusPlus Site Architecture

Last updated: 2026-06-07

## Purpose

This site renders the BazaarPlusPlus public website, including support, downloads (with a preview build variant), tutorials, a preview release-notes page, and the hero stats dashboard. It is a Vite + React + TypeScript single-page app deployed as static assets through Cloudflare Workers.

## Runtime Flow

1. `src/main.tsx` mounts the React app inside `Providers`.
2. `src/app/App.tsx` creates the runtime metrics client, reads the browser path and query string, resolves the SPA route, parses locale, and sets document title/lang.
3. `src/app/route-pages.tsx` uses React Query to load route data. Hero overview uses a bounded-concurrency page-data loader in `src/app/page-data.ts`.
4. Feature dashboards transform raw payloads into view rows and render shared shells, filters, and tables.
5. `src/content/site-copy.ts` provides localized UI copy for shared chrome, the hero stats dashboard, tutorial, download, preview release notes, support, loading, error, and not-found states.

## Routes

- `/` -> support page
- `/support` -> support page
- `/supporters` -> canonicalized to `/support`
- `/tutorial` -> mod tutorial, install guide, and hotkeys
- `/download` -> installer downloads
- `/download/preview` -> installer downloads, preview build variant (deep-link only)
- `/heroes` -> hero overview dashboard
- `/release/preview` -> preview release-notes page (deep-link only, no inbound nav link)

Unknown paths render the localized not-found screen.

## Data Sources

Runtime metrics are fetched through `src/shared/lib/metrics-client.ts` from the analyzer-v4
namespace.

- `analyzer-v4/manifest.json` — manifest with `latest_complete_day`, `web.days[]` (day + path +
  rowCount), and data-quality counters
- `analyzer-v4/web/<day>.json` — per-day `web_hero_daily` payloads with raw additive counts at
  grain day + rating tier + hero; the day paths come verbatim from `web.days[].path`

The analyzer emits raw counts only; rates, Wilson bounds, windowing, and matchup sorting are
derived client-side in `src/shared/lib/web-daily.ts`. The default remote metrics base is
`https://bpp-metrics.bazaarplusplus.com`.

## Environment Variables

- `VITE_METRICS_BASE`: browser runtime metrics base URL (`src/shared/lib/metrics-client.ts`).
- `BPP_REMOTE_METRICS_BASE`: Vite dev/preview proxy upstream for `/metrics/*`.
- `PUBLIC_METRICS_BASE`: fallback upstream used by the Vite proxy.

`PUBLIC_SITE_URL` exists in `.env.example`, but the current app code does not read it.

## i18n

Supported locales are `zh` and `en`; `zh` is the default. Locale selection uses the `lang` query parameter:

- default Chinese: no `lang` parameter
- English: `?lang=en`

All UI copy should live in `src/content/site-copy.ts`. Components should receive `locale` and look up copy from that module rather than hardcoding display text. Shared labels for navigation, loading, errors, filters, footers, tutorial, stats headers, and table headers are localized there.

Date and integer formatting live in `src/shared/lib/dashboard.ts`. Percent formatting intentionally stays fixed as `12.3%` to keep metric tables compact and stable across locales.

## Performance Notes

- React Query marks queries stale after five minutes (`staleTime`) and retains cached data for 30 minutes (`gcTime`), with refetch-on-focus disabled and retry capped at 1 (`src/shared/lib/query-client.ts`).
- Hero overview uses `loadHeroOverviewPageData` and fetches one manifest plus at most seven daily payloads with bounded concurrency; failed daily files degrade coverage per-file instead of failing the page.

## Verification

Use these commands before shipping changes:

```bash
npm test
npm run typecheck
npm run build
```
