# Card Thumbnail Display Design

## Goal

Add lightweight image presentation to the existing stats tables without changing the current data model or route structure.

Scope:

- `/cards`: add a dedicated single-card thumbnail column
- `/archetypes`: replace the current defining-card text emphasis with a fixed three-card thumbnail group

Out of scope:

- modal or hover zoom
- gallery layouts
- mobile-specific redesign
- new API calls or new analyzer outputs

## Existing context

The site already has:

- shared page shell and filter bar
- localized card name resolution from `card_url.json`
- card image URLs available in the dictionary under `image_url`
- table-based metric pages for cards and archetypes

This feature should preserve the current table structure and only enrich the visual presentation.

## User requirements

- `/cards` should show a thumbnail column
- `/archetypes` should show card-group thumbnails instead of only text
- no enlarged preview interaction
- archetype defining-card group should show at most three cards

## Approach

Use two reusable presentational components:

1. `CardThumb`
   - renders one card image at a fixed size
   - uses `image_url` from the card dictionary when available
   - falls back to a styled placeholder block when the image URL is missing
   - includes accessible `alt` text using the localized card name

2. `CardThumbGroup`
   - renders up to three `CardThumb` items in a compact horizontal group
   - used only for the archetype table
   - does not try to paginate, expand, or collapse

## Page changes

### `/cards`

- Add a new first column named `Card`
- Render one `CardThumb` for the row's `template_id`
- Keep the existing name + `template_id` cell unchanged
- Keep all existing metric columns unchanged

Result: a user can visually scan the table by image while still seeing the localized name and raw ID.

### `/archetypes`

- Keep the existing archetype metric columns
- Replace the current defining-card emphasis with:
  - one compact `CardThumbGroup` containing up to three defining cards
  - one text line below the thumbnails with the localized defining-card names
  - the archetype id as secondary mono text below

Result: a user can recognize the archetype by images first, then confirm by names and archetype id.

## Visual rules

- Reuse the current dark-gold theme
- Thumbnail size should be small and table-friendly, roughly 44px to 56px high
- Group spacing should be tight so three cards fit without blowing up the row width
- Fallback placeholders should preserve exact dimensions to avoid layout shift
- Do not add hover animation beyond subtle existing table styling

## Data flow

No new data fetches are required.

- `CardThumb` receives a localized display name and optional `image_url`
- `CardThumbGroup` receives up to three card descriptors derived from existing `cardDictionary` lookups
- `/cards` continues to use `card_winrate`
- `/archetypes` continues to join `archetype_winrate` with `archetypes`

## Accessibility

- Every rendered image gets meaningful `alt` text
- Placeholder blocks should still expose the card name as text content or aria label
- Table semantics remain unchanged

## Error handling

- Missing `image_url`: render placeholder
- Missing card dictionary entry: render placeholder and fall back to the current ID/name resolution
- Partial group data in `/archetypes`: render available cards only, capped at three

## Testing

Add or update tests for:

- `CardThumb` renders `<img>` when `image_url` exists
- `CardThumb` renders placeholder when `image_url` is missing
- `/cards` table renders the new thumbnail column
- `/archetypes` table renders a three-card thumbnail group for defining cards

## Implementation notes

- Keep the feature additive and local to the current page components
- Avoid introducing client-side state for this feature
- Do not change metrics parsing or repository interfaces unless a shared card-image helper is useful
