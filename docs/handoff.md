# Handoff

Last updated: 2026-05-01

## Current State

- The app is a Vite + React SPA with localized `zh` and `en` UI copy.
- Top-level navigation, loading/error/not-found screens, dashboard headers, filter labels, table headers, support modal labels, and footer copy are centralized in `src/content/site-copy.ts`.
- Existing behavior is preserved: routes, query params, metrics loading, card dictionary localization, and dashboard interactions are unchanged.
- Verification passed on 2026-05-01:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`

## Important Files

- `src/app/router.ts`: SPA route definitions and canonical path handling.
- `src/app/route-pages.tsx`: route-level data loading and dashboard entry points.
- `src/content/site-copy.ts`: localized UI copy.
- `src/shared/lib/metrics.ts`: metrics payload types, parsers, card display-name localization, and view-row builders.
- `src/shared/lib/metrics-client.ts`: browser metrics client with retries, timeout, and abort support.
- `src/shared/lib/dashboard.ts`: formatting and localized href helpers.
- `vite.config.ts`: React/Tailwind setup, metrics proxy, and card dictionary build asset emission.

## Follow-Up Risks

- Hero overview still loads a broad set of hero overview/daily payloads up front. If payload sizes grow, revisit incremental loading or query-level caching by selected tier/window.
- Cards and builds share duplicated manifest/dictionary query structure in `src/app/route-pages.tsx`; a small shared loader hook would reduce drift.
- There is no human-facing README by project rule. If onboarding needs expand beyond these notes, create a concise README only when it has a concrete reader and purpose.

