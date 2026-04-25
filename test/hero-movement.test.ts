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
        delta: 0.01899999999999996,
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
