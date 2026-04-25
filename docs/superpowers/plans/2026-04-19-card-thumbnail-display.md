# Card Thumbnail Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lightweight card images to `/cards` and `/archetypes` without changing the current data sources or route structure.

**Architecture:** Introduce two reusable presentational components: a single-card thumbnail and a capped thumbnail group. Keep all data loading in the existing metric pages and pass localized card metadata into the new components from the existing card dictionary lookups.

**Tech Stack:** Astro, React, TypeScript, Vitest, Testing Library, Tailwind utility classes.

---

### Task 1: Add Thumbnail Component Tests

**Files:**
- Create: `test/card-thumb.test.tsx`
- Modify: `test/card-winrate-dashboard.test.tsx`
- Modify: `test/archetype-dashboard.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import CardThumb from '../src/components/CardThumb';

describe('CardThumb', () => {
  test('renders an image when image_url exists', () => {
    render(<CardThumb name="Stove" imageUrl="https://img.example/stove.png" />);
    expect(screen.getByRole('img', { name: 'Stove' })).toHaveAttribute(
      'src',
      'https://img.example/stove.png'
    );
  });

  test('renders a placeholder when image_url is missing', () => {
    render(<CardThumb name="Stove" />);
    expect(screen.getByLabelText('Stove placeholder')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL because `CardThumb` does not exist and dashboard tests still expect text-only output.

- [ ] **Step 3: Update page tests to assert thumbnail rendering**

Add assertions:

```tsx
expect(screen.getAllByRole('img')).not.toHaveLength(0);
expect(screen.getByRole('img', { name: 'Eagle Talisman' })).toBeInTheDocument();
```

- [ ] **Step 4: Run tests again**

Run: `npm test`
Expected: FAIL with missing component / missing image elements.

### Task 2: Implement Reusable Thumbnail Components

**Files:**
- Create: `src/components/CardThumb.tsx`
- Create: `src/components/CardThumbGroup.tsx`
- Test: `test/card-thumb.test.tsx`

- [ ] **Step 1: Write minimal `CardThumb`**

```tsx
type CardThumbProps = {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md';
};
```

Behavior:
- render `<img>` when `imageUrl` exists
- otherwise render fixed-size placeholder with `aria-label="${name} placeholder"`

- [ ] **Step 2: Write minimal `CardThumbGroup`**

```tsx
type CardThumbGroupItem = {
  id: string;
  name: string;
  imageUrl?: string;
};
```

Behavior:
- render up to three `CardThumb` items
- keep compact horizontal spacing

- [ ] **Step 3: Run focused tests**

Run: `npm test`
Expected: thumbnail component tests pass, dashboard tests still fail.

### Task 3: Wire Thumbnail Column into `/cards`

**Files:**
- Modify: `src/components/CardWinrateDashboard.tsx`
- Test: `test/card-winrate-dashboard.test.tsx`

- [ ] **Step 1: Add the new table column**

Add a `Card` header before `Hero`.

- [ ] **Step 2: Render a `CardThumb` per row**

Derive props from:

```tsx
const name = getCardDisplayName(cardDictionary, row.template_id, locale);
const imageUrl = cardDictionary[row.template_id]?.image_url;
```

- [ ] **Step 3: Keep existing name + ID cell unchanged**

Do not remove the localized name or raw `template_id`.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: `/cards` test passes; `/archetypes` test still fails if it expects thumbnail groups.

### Task 4: Wire Thumbnail Group into `/archetypes`

**Files:**
- Modify: `src/components/ArchetypeDashboard.tsx`
- Test: `test/archetype-dashboard.test.tsx`

- [ ] **Step 1: Replace the defining-card text-only emphasis with `CardThumbGroup`**

For each defining card:

```tsx
{
  id,
  name: getCardDisplayName(cardDictionary, id, locale),
  imageUrl: cardDictionary[id]?.image_url,
}
```

- [ ] **Step 2: Preserve textual confirmation below the images**

Keep the joined localized names and archetype ID below the image row.

- [ ] **Step 3: Cap the group at three cards**

Use `.slice(0, 3)` before rendering.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests pass.

### Task 5: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Build the site**

Run: `npm run build`
Expected: PASS with `/index`, `/cards`, and `/archetypes`

- [ ] **Step 3: Spot-check dev output**

Run: `npm run dev -- --host 127.0.0.1 --port 4326`
Expected: `/cards` shows single-card thumbnails and `/archetypes` shows grouped defining-card thumbnails.
