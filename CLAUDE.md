# CLAUDE.md

Operating rules for AI agents working in this repository (`AGENTS.md` is a symlink to this file). Process rules live here; structure and data flow in `docs/ARCHITECTURE.md`; domain vocabulary in `CONTEXT.md`.

## Build & Test

A Vite + React 19 + TypeScript SPA deployed as Cloudflare Workers static assets. `package.json` lists the scripts; these are the parts it cannot tell you:

- Verify proportional to the change: code changes run `npm test` + `npm run typecheck`. Run `npm run build` only when the change can affect bundling or code-splitting. Deploy only when asked.
- `npm run dev` and `npm run preview` are pinned to port 3000 with `--strictPort` — keep the port.
- Both serve `/metrics/*` from the production metrics origin via the `bpp-remote-metrics` plugin in `vite.config.ts`, so the Hero Analysis dashboard works locally without credentials.

## Project Rules

- All user-facing copy goes through `src/content/site-copy.ts` — labels, aria text, loading text, and header/footer strings are never hardcoded in components. Add new copy there first, then pass it through existing locale props.
- Locales are `zh` (default, omits `lang`) and `en` (`?lang=en`). `App.tsx` sets `<html lang>` and the page title from localized copy. The full URL contract is `docs/ARCHITECTURE.md` §Routes and URL contract.
- Missing or invalid metrics dates surface explicitly as Dataset Coverage — never zero-filled, never silently dropped (see `CONTEXT.md`).
- Route resolution stays fully client-side in `src/app/router.ts`, with Cloudflare providing SPA fallback. Preserve the SPA model unless the deployment strategy changes.
- React Query owns runtime fetching and caching; components use it rather than their own fetch or cache layers.
- Keep the module seams where they are — `docs/ARCHITECTURE.md` §Module seams defines who owns transport, analysis, URL/history, and presentation. Payload schema and history handling stay out of components.
- Name domain concepts as `CONTEXT.md` defines them. A concept missing from the glossary is a signal: either the language is invented, or the glossary has a real gap worth filling.
- Write a README only when an outside consumer needs one.

## Decisions and issues

- Architectural decisions go in `docs/adr/NNNN-slug.md`, numbered from 0001 and never reused. The directory appears with the first ADR. When your output contradicts an existing ADR, say so explicitly instead of silently overriding it.
- Task plans, feature requests, and bugs are GitHub issues in `BazaarPlusPlus/bazaarplusplus-site`, operated with the `gh` CLI — see `docs/agents/issue-tracker.md`. They are not repo docs; historical working documents live only in git history.

## Rules Hygiene

These rules are read by every agent session, so they stay high-signal: traps to avoid, not maps to follow. Rules scoped to one module or feature area belong in that area's own rules file.

When you find a non-obvious pattern worth keeping, propose it under a **"Suggested rule additions"** heading in your wrap-up summary and leave these files unedited — the user decides what gets added. A new rule earns its place only when it is non-obvious to someone who already knows the codebase, has come up more than once, and is specific enough to act on. Editing or clarifying an existing rule is always welcome.
