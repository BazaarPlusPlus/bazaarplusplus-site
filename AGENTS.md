# Agent Notes

## Project Rules

- Never generate a README unless it is genuinely needed.
- For Python work, prefer the `uv` toolchain and do not use `from __future__ import`.
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
- React Query owns runtime data fetching and caching.
- Metrics payloads come from `VITE_METRICS_BASE` or `https://bpp-metrics.bazaarplusplus.com`.
- Card dictionary data comes from `VITE_CARD_DICTIONARY_URL` or `/card_dict_with_url.json`.
- Build/preview can proxy `/metrics/*` and emit `card_dict_with_url.json` through Vite plugins in `vite.config.ts`.

## i18n Contract

- Supported locales are `zh` and `en`; default locale is `zh`.
- Locale is selected from the `lang` query parameter. Default `zh` omits `lang`; English uses `?lang=en`.
- `App.tsx` sets `document.documentElement.lang` and page title from localized copy.
- Add new copy to `src/content/site-copy.ts` first, then pass it into components through existing locale props.
- Card names are localized from the card dictionary in `src/shared/lib/metrics.ts`.

