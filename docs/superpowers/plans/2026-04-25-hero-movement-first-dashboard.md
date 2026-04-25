# Hero Movement First Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage first screen answer what changed in the hero meta by adding hero movement lists and a compact current snapshot beside the existing 7D hero trend chart.

**Architecture:** Keep the existing `DailyHeroDashboard` as the homepage owner. Add one pure movement helper for deterministic, unit-tested delta calculations, then render a compact movement/snapshot companion panel inside the current trend section without changing Cards, Builds, or metrics loading.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, existing dashboard and hero helpers.

---

### File Structure

- Create: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/lib/hero-movement.ts`
  - Owns pure daily hero movement calculations.
  - No React dependency.
  - Exports `HeroMovementRow` and `buildHeroMovementRows`.
- Create: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/hero-movement.test.ts`
  - Verifies first-visible-day to latest-visible-day deltas, sorting, and neutral-state inputs.
- Modify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/components/DailyHeroDashboard.tsx`
  - Imports movement helper.
  - Computes `Risers`, `Fallers`, and compact latest snapshot rows from existing payloads.
  - Renders movement and snapshot panels next to or below the chart.
- Modify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/daily-hero-dashboard.test.tsx`
  - Adds UI coverage for `Risers`, `Fallers`, neutral state, and hero detail links.

No data-loading files need to change. Do not add `tier_curve`, card, build, or enchant modules to the homepage first screen.

---

### Task 1: Add Pure Hero Movement Calculation

**Files:**
- Create: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/lib/hero-movement.ts`
- Create: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/hero-movement.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/hero-movement.test.ts`:

```ts
import { describe, expect, test } from 'vitest';

import { buildHeroMovementRows } from '../src/lib/hero-movement';
import type { HeroWinrateDailyRow } from '../src/lib/metrics';

const rows: HeroWinrateDailyRow[] = [
  {
    hero: 'Pygmalien',
    day: '2026-04-18',
    completed_runs: 100,
    wins_10w: 30,
    win_rate: 0.3,
    win_rate_wilson_lower: 0.25,
  },
  {
    hero: 'Pygmalien',
    day: '2026-04-24',
    completed_runs: 130,
    wins_10w: 45,
    win_rate: 0.346,
    win_rate_wilson_lower: 0.29,
  },
  {
    hero: 'Stelle',
    day: '2026-04-18',
    completed_runs: 100,
    wins_10w: 48,
    win_rate: 0.48,
    win_rate_wilson_lower: 0.42,
  },
  {
    hero: 'Stelle',
    day: '2026-04-24',
    completed_runs: 120,
    wins_10w: 46,
    win_rate: 0.383,
    win_rate_wilson_lower: 0.32,
  },
  {
    hero: 'Mak',
    day: '2026-04-18',
    completed_runs: 200,
    wins_10w: 78,
    win_rate: 0.39,
    win_rate_wilson_lower: 0.35,
  },
  {
    hero: 'Mak',
    day: '2026-04-24',
    completed_runs: 220,
    wins_10w: 90,
    win_rate: 0.409,
    win_rate_wilson_lower: 0.37,
  },
];

describe('buildHeroMovementRows', () => {
  test('calculates movement from first visible day to latest visible day', () => {
    const movement = buildHeroMovementRows(rows, ['2026-04-18', '2026-04-24']);

    expect(movement).toEqual([
      {
        hero: 'Pygmalien',
        firstDay: '2026-04-18',
        latestDay: '2026-04-24',
        firstWinRate: 0.3,
        latestWinRate: 0.346,
        delta: 0.045999999999999985,
      },
      {
        hero: 'Mak',
        firstDay: '2026-04-18',
        latestDay: '2026-04-24',
        firstWinRate: 0.39,
        latestWinRate: 0.409,
        delta: 0.019000000000000017,
      },
      {
        hero: 'Stelle',
        firstDay: '2026-04-18',
        latestDay: '2026-04-24',
        firstWinRate: 0.48,
        latestWinRate: 0.383,
        delta: -0.09699999999999998,
      },
    ]);
  });

  test('uses the earliest and latest available row per hero inside the visible days', () => {
    const movement = buildHeroMovementRows(rows, [
      '2026-04-17',
      '2026-04-18',
      '2026-04-20',
      '2026-04-24',
    ]);

    expect(movement.find((row) => row.hero === 'Pygmalien')).toMatchObject({
      firstDay: '2026-04-18',
      latestDay: '2026-04-24',
      delta: 0.045999999999999985,
    });
  });

  test('returns no movement when fewer than two visible days are available', () => {
    expect(buildHeroMovementRows(rows, ['2026-04-24'])).toEqual([]);
    expect(buildHeroMovementRows(rows, [])).toEqual([]);
  });

  test('omits heroes with only one point inside the visible days', () => {
    const movement = buildHeroMovementRows(
      [
        ...rows,
        {
          hero: 'Dooley',
          day: '2026-04-24',
          completed_runs: 90,
          wins_10w: 32,
          win_rate: 0.356,
          win_rate_wilson_lower: 0.29,
        },
      ],
      ['2026-04-18', '2026-04-24']
    );

    expect(movement.map((row) => row.hero)).not.toContain('Dooley');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- test/hero-movement.test.ts
```

Expected: fail with a module resolution error for `../src/lib/hero-movement`.

- [ ] **Step 3: Implement the pure movement helper**

Create `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/lib/hero-movement.ts`:

```ts
import type { HeroWinrateDailyRow } from './metrics';

export type HeroMovementRow = {
  hero: string;
  firstDay: string;
  latestDay: string;
  firstWinRate: number;
  latestWinRate: number;
  delta: number;
};

export function buildHeroMovementRows(
  rows: HeroWinrateDailyRow[],
  visibleDays: string[]
): HeroMovementRow[] {
  if (visibleDays.length < 2) {
    return [];
  }

  const visibleDaySet = new Set(visibleDays);
  const grouped = new Map<string, HeroWinrateDailyRow[]>();

  for (const row of rows) {
    if (!visibleDaySet.has(row.day)) {
      continue;
    }

    const heroRows = grouped.get(row.hero) ?? [];
    heroRows.push(row);
    grouped.set(row.hero, heroRows);
  }

  return Array.from(grouped.entries())
    .flatMap(([hero, heroRows]) => {
      const sortedRows = [...heroRows].sort(
        (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()
      );
      const first = sortedRows[0];
      const latest = sortedRows.at(-1);

      if (!first || !latest || first.day === latest.day) {
        return [];
      }

      return [
        {
          hero,
          firstDay: first.day,
          latestDay: latest.day,
          firstWinRate: first.win_rate,
          latestWinRate: latest.win_rate,
          delta: latest.win_rate - first.win_rate,
        },
      ];
    })
    .sort((a, b) => b.delta - a.delta || b.latestWinRate - a.latestWinRate || a.hero.localeCompare(b.hero));
}
```

- [ ] **Step 4: Run helper test to verify it passes**

Run:

```bash
npm test -- test/hero-movement.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit helper and tests**

Run:

```bash
git add src/lib/hero-movement.ts test/hero-movement.test.ts
git commit -m "feat: add hero movement calculation"
```

Expected: commit succeeds with only these two files staged.

---

### Task 2: Render Risers, Fallers, and Compact Snapshot in the Homepage First Screen

**Files:**
- Modify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/components/DailyHeroDashboard.tsx`
- Modify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/daily-hero-dashboard.test.tsx`

- [ ] **Step 1: Add failing UI assertions for movement and snapshot panels**

In `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/daily-hero-dashboard.test.tsx`, inside the existing main dashboard test after the current assertions for `Trend view`, add:

```ts
expect(within(trendSection!).getByText('Risers')).toBeInTheDocument();
expect(within(trendSection!).getByText('Fallers')).toBeInTheDocument();
expect(within(trendSection!).getByText('Current snapshot')).toBeInTheDocument();
expect(within(trendSection!).getByText('+4.5pp')).toBeInTheDocument();
expect(within(trendSection!).getByText('-0.5pp')).toBeInTheDocument();
expect(within(trendSection!).getByText('Latest 42.0%')).toBeInTheDocument();
expect(within(trendSection!).getByText('Latest 42.6%')).toBeInTheDocument();
expect(within(trendSection!).getByRole('link', { name: /Stelle movement/i })).toHaveAttribute(
  'href',
  '/heroes/Stelle?w=7d'
);
expect(within(trendSection!).getByRole('link', { name: /Jules movement/i })).toHaveAttribute(
  'href',
  '/heroes/Jules?w=7d'
);
expect(within(trendSection!).getByText('Stelle')).toBeInTheDocument();
expect(within(trendSection!).getByText('Jules')).toBeInTheDocument();
```

Add a second test after the existing test:

```ts
test('shows a neutral movement state when there is not enough trend history', () => {
  window.history.replaceState({}, '', '/');
  const generatedAt = '2026-04-18T18:57:46Z';
  const dailyByTier: Partial<Record<RatingTier, HeroWinrateDailyPayload>> = {
    all: createDailyPayload(generatedAt, [
      {
        hero: 'Stelle',
        day: '2026-04-12T16:00:00Z',
        completed_runs: 450,
        wins_10w: 189,
        win_rate: 0.42,
        win_rate_wilson_lower: 0.38,
      },
    ]),
  };
  const overviewByWindow = {
    '1d': {
      all: createOverviewPayload(generatedAt, 'Stelle', 100, {
        perfect: 10,
        gold: 40,
        silver: 20,
        bronze: 15,
        none: 15,
      }, 0.42),
    },
    '3d': {},
    '7d': {},
  } satisfies Record<'1d' | '3d' | '7d', Partial<Record<RatingTier, HeroOverviewPayload>>>;

  render(
    <DailyHeroDashboard
      locale="en"
      source="local"
      availableWindows={['1d', '3d', '7d']}
      availableTiers={['all']}
      initialSelectedWindow="1d"
      initialSelectedTier="all"
      dailyByTier={dailyByTier}
      overviewByWindow={overviewByWindow}
    />
  );

  expect(screen.getByText('Not enough trend history')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run UI test to verify it fails**

Run:

```bash
npm test -- test/daily-hero-dashboard.test.tsx
```

Expected: fail because `Risers`, `Fallers`, `Current snapshot`, movement links, and neutral text are not rendered.

- [ ] **Step 3: Import movement helper and add display helpers**

In `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/components/DailyHeroDashboard.tsx`, update imports:

```ts
import { buildHeroMovementRows, type HeroMovementRow } from '../lib/hero-movement';
```

Add these constants and helper functions near existing constants:

```ts
const MOVEMENT_ROW_LIMIT = 3;
const SNAPSHOT_SUMMARY_LIMIT = 4;

function formatSignedPercentagePoints(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}pp`;
}

function getMovementLink(
  row: HeroMovementRow,
  selectedTier: RatingTier,
  locale: Locale
): string {
  return buildHeroHref(row.hero, {
    w: TREND_WINDOW,
    t: selectedTier,
    lang: locale,
  });
}
```

- [ ] **Step 4: Compute movement and compact snapshot state**

In `DailyHeroDashboard`, after `trendSeries` and `detailRows` are built, add:

```ts
  const movementRows = useMemo(
    () => buildHeroMovementRows(trendDailyPayload?.rows ?? [], trendVisibleDays),
    [trendDailyPayload?.rows, trendVisibleDays]
  );
  const risingRows = useMemo(
    () => movementRows.filter((row) => row.delta > 0).slice(0, MOVEMENT_ROW_LIMIT),
    [movementRows]
  );
  const fallingRows = useMemo(
    () =>
      [...movementRows]
        .filter((row) => row.delta < 0)
        .sort((a, b) => a.delta - b.delta || a.hero.localeCompare(b.hero))
        .slice(0, MOVEMENT_ROW_LIMIT),
    [movementRows]
  );
  const hasEnoughTrendHistory = trendVisibleDays.length >= 2;
  const hasHeroMovement = movementRows.some((row) => row.delta !== 0);
  const snapshotSummaryRows = useMemo(
    () => sortedDetailRows.slice(0, SNAPSHOT_SUMMARY_LIMIT),
    [sortedDetailRows]
  );
```

If `sortedDetailRows` is declared below this point, move the existing `sortedDetailRows` `useMemo` above these calculations.

- [ ] **Step 5: Render movement and snapshot panels in the trend section**

In the trend section, replace the single chart block plus separate legend flow with this structure. Keep the existing `<svg>` internals unchanged inside the chart container:

```tsx
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3">
              <div
                data-testid="daily-winrate-chart"
                className="rounded-[20px] border border-[color:rgba(58,47,31,0.7)] bg-[linear-gradient(180deg,rgba(212,162,76,0.05),rgba(13,11,8,0.94))] p-3 sm:p-4"
              >
                {/* Keep the existing SVG chart exactly here. */}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {/* Keep the existing hero chip links here. */}
              </div>
            </div>

            <aside className="grid content-start gap-3">
              <section className="rounded-[18px] border border-[color:rgba(58,47,31,0.74)] bg-[color:rgba(15,13,10,0.58)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[color:var(--color-text-base)]">Risers</h3>
                  <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
                    {WINDOW_LABELS[TREND_WINDOW]}
                  </span>
                </div>
                {hasEnoughTrendHistory && hasHeroMovement && risingRows.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {risingRows.map((row) => (
                      <a
                        key={`riser-${row.hero}`}
                        href={getMovementLink(row, activeTrendTier, locale)}
                        aria-label={`${row.hero} movement ${formatSignedPercentagePoints(row.delta)}`}
                        onMouseEnter={() => setSelectedTrendHero(row.hero)}
                        onFocus={() => setSelectedTrendHero(row.hero)}
                        className="flex items-center justify-between gap-3 rounded-[12px] border border-[color:rgba(58,47,31,0.7)] bg-[color:rgba(19,15,8,0.64)] px-3 py-2 transition hover:border-[color:var(--color-accent)]"
                      >
                        <HeroBadge hero={row.hero} size="sm" selected={row.hero === focusedTrendHero?.hero} />
                        <span className="grid text-right">
                          <span className="tnum text-sm font-semibold text-[color:var(--color-pos)]">
                            {formatSignedPercentagePoints(row.delta)}
                          </span>
                          <span className="tnum text-xs text-[color:var(--color-text-muted)]">
                            Latest {formatPercent(row.latestWinRate)}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">
                    {hasEnoughTrendHistory ? 'No hero movement in this window' : 'Not enough trend history'}
                  </p>
                )}
              </section>

              <section className="rounded-[18px] border border-[color:rgba(58,47,31,0.74)] bg-[color:rgba(15,13,10,0.58)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[color:var(--color-text-base)]">Fallers</h3>
                  <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
                    {WINDOW_LABELS[TREND_WINDOW]}
                  </span>
                </div>
                {hasEnoughTrendHistory && hasHeroMovement && fallingRows.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {fallingRows.map((row) => (
                      <a
                        key={`faller-${row.hero}`}
                        href={getMovementLink(row, activeTrendTier, locale)}
                        aria-label={`${row.hero} movement ${formatSignedPercentagePoints(row.delta)}`}
                        onMouseEnter={() => setSelectedTrendHero(row.hero)}
                        onFocus={() => setSelectedTrendHero(row.hero)}
                        className="flex items-center justify-between gap-3 rounded-[12px] border border-[color:rgba(58,47,31,0.7)] bg-[color:rgba(19,15,8,0.64)] px-3 py-2 transition hover:border-[color:var(--color-accent)]"
                      >
                        <HeroBadge hero={row.hero} size="sm" selected={row.hero === focusedTrendHero?.hero} />
                        <span className="grid text-right">
                          <span className="tnum text-sm font-semibold text-[color:var(--color-neg)]">
                            {formatSignedPercentagePoints(row.delta)}
                          </span>
                          <span className="tnum text-xs text-[color:var(--color-text-muted)]">
                            Latest {formatPercent(row.latestWinRate)}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">
                    {hasEnoughTrendHistory ? 'No hero movement in this window' : 'Not enough trend history'}
                  </p>
                )}
              </section>

              <section className="rounded-[18px] border border-[color:rgba(58,47,31,0.74)] bg-[color:rgba(15,13,10,0.58)] p-4">
                <h3 className="text-sm font-semibold text-[color:var(--color-text-base)]">
                  Current snapshot
                </h3>
                <div className="mt-3 grid gap-2">
                  {snapshotSummaryRows.map((row) => (
                    <a
                      key={`snapshot-${row.hero}`}
                      href={buildHeroHref(row.hero, {
                        w: selectedWindow,
                        t: selectedTier,
                        lang: locale,
                      })}
                      onMouseEnter={() => setSelectedSnapshotHero(row.hero)}
                      onFocus={() => setSelectedSnapshotHero(row.hero)}
                      className="flex items-center justify-between gap-3 rounded-[12px] px-1 py-1 transition hover:text-[color:var(--color-accent-bright)]"
                    >
                      <HeroBadge hero={row.hero} size="sm" selected={row.hero === selectedSnapshotHero} />
                      <span className="tnum text-sm text-[color:var(--color-accent-bright)]">
                        {formatPercent(row.winRate)}
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            </aside>
          </div>
```

Preserve the existing SVG body and hero chip body when moving them into the new grid.

- [ ] **Step 6: Run UI test to verify it passes**

Run:

```bash
npm test -- test/daily-hero-dashboard.test.tsx
```

Expected: pass.

- [ ] **Step 7: Commit homepage movement UI**

Run:

```bash
git add src/components/DailyHeroDashboard.tsx test/daily-hero-dashboard.test.tsx
git commit -m "feat: show hero movement on homepage"
```

Expected: commit succeeds with only the homepage component and its test staged.

---

### Task 3: Verify Integration, Type Safety, and Production Build

**Files:**
- Verify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/lib/hero-movement.ts`
- Verify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/components/DailyHeroDashboard.tsx`
- Verify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/hero-movement.test.ts`
- Verify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/daily-hero-dashboard.test.tsx`

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test -- test/hero-movement.test.ts test/daily-hero-dashboard.test.tsx
```

Expected: pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: pass with no TypeScript errors.

- [ ] **Step 3: Run full test suite**

Run:

```bash
npm test
```

Expected: pass.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: pass.

- [ ] **Step 5: Review scope discipline**

Run:

```bash
git diff --stat HEAD
git diff -- src/components/CardWinrateDashboard.tsx src/components/FinalBuildDashboard.tsx src/components/HeroDetailDashboard.tsx
```

Expected:

- homepage movement changes are limited to `DailyHeroDashboard`, `hero-movement`, and tests
- Cards, Builds, and Hero Detail are not changed by this implementation
- no `tier_curve` first-screen module is added

- [ ] **Step 6: Commit final verification adjustments if needed**

If Step 1-5 required small fixes, commit only those fixes:

```bash
git add src/lib/hero-movement.ts src/components/DailyHeroDashboard.tsx test/hero-movement.test.ts test/daily-hero-dashboard.test.tsx
git commit -m "fix: polish hero movement dashboard"
```

Expected: commit only runs if there were verification fixes. If no files changed, skip this commit.

---

### Self-Review

Spec coverage:

- `7d` hero winrate line chart remains the first-screen anchor in Task 2.
- `Risers` and `Fallers` are added in Task 2 and calculated by the tested helper from Task 1.
- Compact current snapshot appears in the first trend section in Task 2.
- Existing `window`, `tier`, and `lang` URL behavior is preserved because Task 2 keeps the existing URL-sync effects and uses existing `buildHeroHref`.
- Cards, Builds, and `tier_curve` are explicitly out of scope and checked in Task 3.

Red-flag scan:

- No incomplete markers or unclear follow-up steps are required to execute this plan.

Type consistency:

- `HeroMovementRow`, `buildHeroMovementRows`, `HeroWinrateDailyRow`, `RatingTier`, and `Locale` are named consistently across helper, component, and tests.
