# Handoff

Last updated: 2026-05-04

## Current State

- The app is a Vite + React SPA with localized `zh` and `en` UI copy.
- Top-level navigation, loading/error/not-found screens, dashboard headers, filter labels, table headers, support modal labels, and footer copy are centralized in `src/content/site-copy.ts`.
- Header brand text is also sourced from `src/content/site-copy.ts`; do not add new visible header text directly in components.
- Info pages include support, download, and `/tutorial`; the tutorial page covers mod features, installation, and common hotkeys using localized copy.
- Cards and builds now share route-frame manifest/card dictionary loading in `src/app/route-pages.tsx`.
- Card metric key mapping and shared card metadata enrichment now live in `src/shared/lib/metrics.ts`.
- Runtime behavior remains centralized: routes in `src/app/router.ts`, query params for locale/window/tier/metric state, metrics loading, card dictionary localization, and dashboard interactions.
- Verification passed on 2026-05-04:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`

## Important Files

- `src/app/router.ts`: SPA route definitions and canonical path handling.
- `src/app/route-pages.tsx`: route-level data loading, shared cards/builds route frame, and dashboard entry points.
- `src/content/site-copy.ts`: localized UI copy.
- `src/features/tutorial/TutorialPage.tsx`: localized tutorial, install guide, and hotkey reference page.
- `src/shared/lib/metrics.ts`: metrics payload types, parsers, card display-name localization, and view-row builders.
- `src/shared/lib/metrics-client.ts`: browser metrics client with retries, timeout, and abort support.
- `src/shared/lib/dashboard.ts`: formatting and localized href helpers.
- `vite.config.ts`: React/Tailwind setup, metrics proxy, and card dictionary build asset emission.

## Follow-Up Risks

- Hero overview still loads a broad set of hero overview/daily payloads up front. If payload sizes grow, revisit incremental loading or query-level caching by selected tier/window.
- `src/features/heroes/HeroOverviewDashboard.tsx` remains large and should be split cautiously around pure data derivation before rendering structure.
- `src/shared/components/MetricFilterBar.tsx` appears unused by production code; decide whether to keep it as a fallback UI or remove it in a separate cleanup.
- There is no human-facing README by project rule. If onboarding needs expand beyond these notes, create a concise README only when it has a concrete reader and purpose.
