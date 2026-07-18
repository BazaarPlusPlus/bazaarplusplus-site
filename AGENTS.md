# Agent Notes

## Project Rules

- Never generate a README unless it is genuinely needed.
- For Python work, prefer the `uv` toolchain and do not use `from __future__ import`.
- Start the local dev server on port 3000.
- Keep user-facing text in `src/content/site-copy.ts`; do not add hardcoded dashboard labels, aria labels, loading text, or footer/header text in components.
- Preserve the SPA route model in `src/app/router.ts` unless the deployment strategy changes.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Tests: `npm test`
- Typecheck: `npm run typecheck`
- Production build: `npm run build`
- Deploy: `npm run deploy`
- Preview deploy: `npm run deploy:preview`

## Current Architecture

- This is a Vite + React + TypeScript SPA deployed as Cloudflare Workers static assets.
- Routes are resolved client-side in `src/app/router.ts`; Cloudflare uses SPA fallback.
- Public SPA routes are `/`, `/support`, `/tutorial`, `/download`, and `/heroes`; `/supporters` canonicalizes to `/support`.
- React Query owns runtime data fetching and caching.
- Metrics payloads come from `VITE_METRICS_BASE` or `https://bpp-metrics.bazaarplusplus.com`.
- Build/preview can proxy `/metrics/*` through the Vite plugin in `vite.config.ts`.

## i18n Contract

- Supported locales are `zh` and `en`; default locale is `zh`.
- Locale is selected from the `lang` query parameter. Default `zh` omits `lang`; English uses `?lang=en`.
- `App.tsx` sets `document.documentElement.lang` and page title from localized copy.
- Add new copy to `src/content/site-copy.ts` first, then pass it into components through existing locale props.
