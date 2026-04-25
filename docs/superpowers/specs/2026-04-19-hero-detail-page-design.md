# Hero Detail Page Design

## Goal

Add a focused hero detail page that turns the merged Heroes homepage into a drill-down flow.

This first version should answer two questions clearly:

- how this hero has been trending recently
- which cards matter most for this hero right now

## Scope

In scope:

- add a new route at `/heroes/[hero]`
- allow entry from the homepage hero chart legend
- allow entry from the homepage hero snapshot table
- show a single-hero trend panel
- show a compact current-summary area
- show a `Top cards` section with `Win rate / Uplift` switching

Out of scope:

- archetype section
- final build section
- hero-vs-hero comparison
- hero search page
- multilingual copy overhaul

## Existing context

The site already has:

- a merged homepage hero overview using `hero_winrate_daily` plus `hero_overview`
- shared `window / tier` filtering with client-side URL sync
- card image rendering and card dictionary lookup
- a cards page that already supports `winrate / uplift` switching

The hero detail page should reuse those patterns instead of introducing a second filtering system.

## User-facing behavior

### Entry points

Users can open a hero detail page from:

- the hero name in the homepage summary table
- the hero chip / legend item below the homepage trend chart

Both should link to the same canonical route:

- `/heroes/Vanessa`
- `/heroes/Mak`
- etc.

The page should preserve the current `window`, `tier`, and `lang` query parameters when navigating in.

### Page structure

The first version should have three stacked areas:

1. Hero header
2. Trend + current summary
3. Top cards

### Hero header

Show:

- hero name
- hero accent color matching the homepage / MOD-derived palette
- a small back link to `Heroes`
- current filter context (`1d / 3d / 7d`, `all / low / mid / high`)

The header should feel like a focused drill-down, not a new unrelated section.

### Trend + current summary

Show a single-hero line chart for the selected hero using the already published `hero_winrate_daily` data.

The chart should:

- only render the selected hero
- keep the same time-window semantics as the homepage
- use the same hero color mapping
- continue to respond instantly to `window / tier` switching

Below or beside it, show a compact summary row with:

- `10W rate`
- `Runs`
- `Perfect`
- `Gold`

The summary values should come from the selected hero row in `hero_overview/<window>/<tier>.json`.

If a hero has no row for the active filter combination, show a clear empty state rather than fake zeros.

### Top cards

This section should reuse the existing card-analysis logic, but filtered to the selected hero only.

Behavior:

- default tab is `Win rate`
- secondary tab is `Uplift`
- both tabs share the same card thumbnail treatment already used elsewhere

Columns for `Win rate`:

- card
- card name
- appearances
- wins
- win rate
- wilson lower

Columns for `Uplift`:

- card
- card name
- runs with
- runs without
- uplift
- ci lower
- ci upper

Sorting:

- `Win rate` tab defaults to descending `win_rate`
- `Uplift` tab defaults to descending `uplift`

Because hero pages are naturally smaller slices than the global cards page, this first version does not need extra hero filtering controls inside the table.

## Routing and URL model

### Route shape

Use an Astro dynamic route:

- `src/pages/heroes/[hero].astro`

Accepted hero names should match the published metric hero values exactly:

- `Vanessa`
- `Pygmalien`
- `Dooley`
- `Mak`
- `Jules`
- `Karnok`
- `Stelle`

### Query parameters

The detail page should keep the same filter parameters already used across the site:

- `w`
- `t`
- `lang`

Additionally, the card section should use its own metric toggle parameter:

- `m=winrate|uplift`

Defaults:

- `w=1d`
- `t=all`
- `lang=en`
- `m=winrate`

Default values should continue to be omitted from the URL when possible, consistent with current behavior.

## Data model and loading

The page can be built from already available metrics:

- `hero_winrate_daily/<tier>.json`
- `hero_overview/<window>/<tier>.json`
- `item_winrate/<window>/<tier>.json`
- `item_uplift/<window>/<tier>.json`
- card dictionary

### Server preload strategy

Follow the same pattern already used by the merged homepage and cards page:

- preload relevant window / tier combinations into payload maps on the Astro side
- hydrate a React dashboard island
- switch views client-side from in-memory payloads

For the hero detail page:

- preload all available `hero_overview` windows for the valid tiers
- preload all available `item_winrate` windows for the valid tiers
- preload all available `item_uplift` windows for the valid tiers
- preload all available `hero_winrate_daily` tiers

Then filter each payload down to the selected hero in the React component.

This avoids introducing new backend endpoints or query-time fetch churn.

## Components

### `HeroDetailDashboard`

New main page component responsible for:

- reading initial state from URL
- syncing `window / tier / metric / lang` back to URL
- selecting the current hero-scoped payloads
- rendering the page sections

### `HeroDetailTrendCard`

A focused single-hero chart block.

This can either be:

- a small extracted component from the current homepage hero chart logic, or
- a helper inside the detail dashboard if extraction stays clean

The important constraint is to avoid duplicating chart math in two divergent copies.

### `HeroCardTable`

A hero-scoped variant of the current cards table.

This can either:

- reuse the existing cards page table renderer with prefiltered rows, or
- use a new thin wrapper if the current cards page component is too page-specific

The preferred direction is reuse of existing row formatting and card thumbnail rendering.

## Empty states and errors

### Invalid hero slug

If the route hero is not one of the supported heroes:

- render Astro `404`

### Valid hero but no data for current filter

If the hero exists but the chosen `window / tier` has no row:

- keep the page chrome and filters visible
- show an empty-state message in the summary area
- show empty-state messaging in the cards section

This is preferable to bouncing the user to another hero or silently changing filters.

## Testing

Add tests for:

- homepage hero links preserve `window / tier / lang`
- hero detail page initializes from route hero plus query params
- single-hero trend panel renders the correct hero color / series
- summary cards show hero-specific values from `hero_overview`
- `Top cards` switches between `Win rate` and `Uplift`
- invalid hero route handling

## Implementation notes

- reuse current hero color mapping from the homepage trend chart
- preserve the existing visual language instead of inventing a new hero-detail aesthetic
- avoid introducing a second filtering API or a second card dictionary path
- keep this first version intentionally narrow; archetypes and builds can be a later extension
