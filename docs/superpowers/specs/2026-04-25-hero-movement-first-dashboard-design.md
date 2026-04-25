# Hero Movement First Dashboard Design

## Goal

Refocus the homepage on answering one question immediately:

- what changed in the hero meta recently?

The first screen should make hero movement clear before the user reaches detailed card, build, or tier-curve analysis.

## Current Metrics Snapshot

Latest local metrics observed during design:

- generated at `2026-04-25T08:54:02Z`
- windows: `1d`, `3d`, `7d`
- primary homepage inputs: `hero_winrate_daily` and `hero_overview`
- supporting metrics available below the fold or on existing detail pages: `item_winrate`, `item_uplift`, `item_inclusion`, `item_phase_value`, `item_phase_inclusion`, `final_builds`, `tier_curve`

Relevant `1d/all` and daily movement signals from the latest data:

- `Mak`: current `1d/all` 10W rate `40.9%`, leading the daily snapshot by Wilson lower bound
- `Jules`: current `1d/all` 10W rate `39.1%`
- `Dooley`: current `1d/all` 10W rate `37.0%`
- `Karnok`: current `1d/all` 10W rate `37.2%`
- `Pygmalien`: daily movement from `2026-04-18` to `2026-04-24` is `+3.4pp`
- `Karnok`: daily movement from `2026-04-18` to `2026-04-24` is `+2.9pp`
- `Mak`: daily movement from `2026-04-18` to `2026-04-24` is `+1.8pp`
- `Stelle`: daily movement from `2026-04-18` to `2026-04-24` is `-9.7pp`
- `Vanessa`: daily movement from `2026-04-18` to `2026-04-24` is `-0.9pp`

These figures make the homepage more useful as a hero-movement dashboard than as a broad all-metric workspace.

## Scope

In scope:

- keep the homepage centered on heroes
- make the `7d` hero winrate line chart the first-screen anchor
- add or strengthen compact `Risers` and `Fallers` movement lists
- keep a concise current hero snapshot visible near the first screen
- preserve existing `window`, `tier`, and `lang` URL behavior
- preserve links from heroes into hero detail pages

Out of scope for the first screen:

- card recommendations
- build recommendations
- `tier_curve` visualization
- broad insight feed combining every metric type
- AI-generated explanations

Those deeper metrics should remain available through Cards, Builds, and hero detail flows, but they should not compete with the first-screen hero story.

## Information Architecture

### First Screen

The first screen should have four areas:

1. Page shell with data freshness and navigation.
2. Main `7D hero winrate lines` chart.
3. Compact `Risers` and `Fallers` lists beside or immediately under the chart.
4. Current hero snapshot summary showing the latest selected window and tier.

The first screen should not introduce a separate card/build/tier module.

### Below First Screen

Below the first screen, keep the existing detailed hero snapshot table. It remains the validation layer for users who want exact values.

If later work adds `tier_curve`, it should be added to Cards or a dedicated card detail experience, not the hero homepage first screen.

## User-Facing Behavior

### Trend Chart

The chart should:

- default to a `7d` trend view
- show all available heroes for the selected trend tier
- keep the current hero color system
- highlight the focused hero on hover, focus, or legend interaction
- use compact date labels
- avoid visual overcrowding by keeping the legend as short hero chips

The chart remains the main visual answer to "what changed?"

### Risers and Fallers

Add two concise movement lists derived from `hero_winrate_daily`:

- `Risers`: heroes with the largest positive change across the visible trend window
- `Fallers`: heroes with the largest negative change across the visible trend window

For each row show:

- hero badge or short label
- signed percentage-point delta
- latest 10W rate

Sorting:

- `Risers`: descending delta
- `Fallers`: ascending delta

Empty or flat data:

- if fewer than two daily points exist, show a neutral `Not enough trend history` state in place of both lists
- if all deltas are zero, show a neutral `No hero movement in this window` state in place of both lists

### Current Hero Snapshot

Keep the snapshot table as the exact-data companion to the chart.

It should continue showing:

- hero
- 10W rate
- runs
- 10 wins
- perfect rate
- gold rate
- silver rate
- bronze rate

Default sort should remain by current 10W rate descending.

## Data Flow

Use existing data already loaded by `loadHeroOverviewPageData`:

- `hero_winrate_daily/<tier>.json`
- `hero_overview/<window>/<tier>.json`
- manifest windows and tiers

No new endpoint is needed.

Movement calculations should happen in the React dashboard layer from the active daily payload:

1. Sort rows by day.
2. Select the visible trend window.
3. Group rows by hero.
4. Compare first visible point to latest visible point.
5. Rank positive and negative deltas.

The calculation should be deterministic and independent of rendering.

## Components

### `DailyHeroDashboard`

Continue as the homepage dashboard owner. It should coordinate:

- active snapshot window and tier
- trend tier
- chart state
- movement-list state
- snapshot table state

### Movement Helper

Introduce a small helper if the calculation starts to crowd `DailyHeroDashboard`.

Suggested shape:

- input: grouped hero series or daily payload plus visible days
- output: array of `{ hero, delta, latestWinRate, firstWinRate }`

This helper should be easy to unit test without rendering React.

### Movement Panel

Create a presentational movement panel only if JSX becomes bulky.

Responsibilities:

- render `Risers`
- render `Fallers`
- expose links to hero detail pages using existing `buildHeroHref`
- avoid owning data calculations

## Visual Direction

Keep the current dark analytics theme, but make the first screen more editorially clear:

- chart gets the most space
- movement lists are compact, not card-heavy
- labels should be short: `Risers`, `Fallers`, `Latest`
- values use tabular numerals
- signed deltas use positive and negative colors consistently

The first screen should feel like a focused operational dashboard, not a marketing page and not a dense spreadsheet.

## URL and Navigation

Keep existing homepage query behavior:

- `w` controls the snapshot table window
- `t` controls the snapshot table tier
- `lang` controls localization

Trend tier should remain local UI state for the first version. Do not add a new trend-tier URL parameter.

Hero chips and movement rows should link to hero detail pages with:

- selected snapshot window
- relevant tier
- current locale

## Error Handling

- Missing daily payload: show the existing metrics unavailable or empty chart state.
- Single-day daily payload: render current points but hide movement deltas.
- Missing overview payload: chart and movement can still render; snapshot table should fall back to daily rows where possible.
- Unknown hero in movement list should still render text and link only if `buildHeroHref` can produce a valid route.

## Testing

Add or update focused tests for:

- movement deltas are computed from first visible day to latest visible day
- positive and negative movement lists sort correctly
- movement lists show the neutral state when only one day is available
- movement rows link to the expected hero detail URL
- existing snapshot sorting and filters still work

Existing table and chart tests should continue to pass.

## Implementation Notes

- Do not redesign Cards or Builds as part of this change.
- Do not add `tier_curve` to the first screen.
- Keep edits scoped to homepage data presentation. Add a shared formatter or helper only when the same logic is used in more than one local component.
- Avoid adding new dependencies.
