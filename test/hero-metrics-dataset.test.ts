// @vitest-environment node

import { describe, expect, test, vi } from 'vitest';

import {
  HeroMetricsTransportError,
  loadHeroMetricsDataset,
  type HeroMetricsLoadProgress,
  type HeroMetricsTransport,
} from '../src/features/heroes/hero-metrics-dataset';

const DATES = [
  '2026-06-01',
  '2026-06-02',
  '2026-06-03',
  '2026-06-04',
  '2026-06-05',
  '2026-06-06',
  '2026-06-07',
  '2026-06-08',
];

function makeManifest(days = DATES) {
  return {
    schema_version: '2',
    namespace: 'analyzer-v4',
    generated_at: '2026-06-09T09:00:00Z',
    latest_complete_day: '2026-06-07',
    web: {
      schema_version: '2',
      days: days.map((day) => ({
        day,
        path: `analyzer-v4/web/${day}.json`,
        row_count: 1,
        additive_day_field: true,
      })),
      additive_web_field: true,
    },
    dq: { days: 7, additive_dq_field: true },
    additive_manifest_field: true,
  };
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    hero: 'Vanessa',
    rating_tier: 'all',
    runs: { completed: 8, scored: 8, ten_win: 2 },
    outcomes: { perfect: 1, gold: 1, silver: 2, bronze: 2 },
    ten_win_days: { known_count: 2, sum_days: 22 },
    battle_days: {
      day_1: { decided: 10, wins: 6, losses: 4 },
    },
    matchups: [{ opponent_hero: 'Mak', decided: 10, wins: 6, losses: 4 }],
    ...overrides,
  };
}

function makePayload(day: string, rows = [makeRow()]) {
  return {
    schema_version: '2',
    kind: 'hero_web_daily',
    day,
    generated_at: `${day}T09:00:00Z`,
    rows,
    additive_payload_field: true,
  };
}

function dayFromPath(path: string): string {
  return path.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1] ?? '';
}

function makeTransport(
  handler: (path: string, signal?: AbortSignal) => Promise<unknown> = async (path) =>
    path === 'analyzer-v4/manifest.json' ? makeManifest() : makePayload(dayFromPath(path))
): HeroMetricsTransport {
  return {
    load: vi.fn((path: string, options?: { signal?: AbortSignal }) =>
      handler(path, options?.signal)
    ),
  };
}

describe('loadHeroMetricsDataset', () => {
  test('loads only the latest seven published dates, sorts usable dates, and emits semantic progress', async () => {
    const progress: HeroMetricsLoadProgress[] = [];
    const transport = makeTransport();

    const dataset = await loadHeroMetricsDataset(transport, {
      onProgress: (event) => progress.push(event),
    });

    expect(dataset.generatedAt).toBe('2026-06-09T09:00:00Z');
    expect(dataset.coverage).toEqual({
      requestedDates: DATES.slice(0, 7),
      usableDates: DATES.slice(0, 7),
      failedDates: [],
    });
    expect(dataset.days.map((day) => day.day)).toEqual(DATES.slice(0, 7));
    expect(transport.load).toHaveBeenCalledTimes(8);
    expect(progress[0]).toEqual({
      completed: 0,
      total: 1,
      status: 'loading',
      resource: { kind: 'manifest' },
    });
    expect(progress).toContainEqual({
      completed: 1,
      total: 8,
      status: 'loaded',
      resource: { kind: 'manifest' },
    });
    expect(progress.at(-1)).toMatchObject({ completed: 8, total: 8, status: 'loaded' });
  });

  test('accepts unknown additive fields, sparse buckets, and non-canonical heroes', async () => {
    const transport = makeTransport(async (path) => {
      if (path === 'analyzer-v4/manifest.json') {
        return makeManifest(['2026-06-07']);
      }
      return makePayload('2026-06-07', [
        makeRow({
          hero: 'Common',
          battle_days: {
            day_13_plus: { decided: 4, wins: 1, losses: 3, additive_count: 99 },
            unknown_future_bucket: { anything: true },
          },
          matchups: [
            { opponent_hero: 'FutureHero', decided: 3, wins: 2, losses: 1, additive: true },
          ],
          additive_row_field: true,
        }),
      ]);
    });

    const dataset = await loadHeroMetricsDataset(transport);

    expect(dataset.coverage.failedDates).toEqual([]);
    expect(dataset.days[0]?.rows[0]).toMatchObject({
      hero: 'Common',
      battle_days: { day_13_plus: { decided: 4, wins: 1, losses: 3 } },
      matchups: [{ opponent_hero: 'FutureHero', decided: 3, wins: 2, losses: 1 }],
    });
  });

  test.each([
    ['schema_version', { schema_version: '1' }],
    ['namespace', { namespace: 'legacy' }],
    ['generated_at', { generated_at: undefined }],
    ['latest_complete_day', { latest_complete_day: undefined }],
    ['web schema', { web: { schema_version: '1', days: [] } }],
    ['day entry', { web: { schema_version: '2', days: [{ day: '2026-06-07' }] } }],
    ['row count', { web: { schema_version: '2', days: [{ day: '2026-06-07', path: 'x', row_count: -1 }] } }],
  ])('fails the page for an invalid manifest %s', async (_label, override) => {
    const transport = makeTransport(async (path) =>
      path === 'analyzer-v4/manifest.json' ? { ...makeManifest(), ...override } : makePayload(dayFromPath(path))
    );

    await expect(loadHeroMetricsDataset(transport)).rejects.toThrow(
      'Unexpected metrics manifest format'
    );
  });

  test.each([
    ['missing', undefined],
    ['NaN', Number.NaN],
    ['negative', -1],
    ['non-integer', 1.5],
  ])('%s required counters fail the entire date without dropping only the bad row', async (_label, value) => {
    const transport = makeTransport(async (path) => {
      if (path === 'analyzer-v4/manifest.json') {
        return makeManifest(['2026-06-06', '2026-06-07']);
      }
      const day = dayFromPath(path);
      return day === '2026-06-06'
        ? makePayload(day, [makeRow(), makeRow({ runs: { completed: value, scored: 8, ten_win: 2 } })])
        : makePayload(day);
    });

    const dataset = await loadHeroMetricsDataset(transport);

    expect(dataset.coverage).toEqual({
      requestedDates: ['2026-06-06', '2026-06-07'],
      usableDates: ['2026-06-07'],
      failedDates: ['2026-06-06'],
    });
    expect(dataset.days.map((day) => day.day)).toEqual(['2026-06-07']);
  });

  test.each([
    ['payload tag', { kind: 'wrong' }],
    ['payload day', { day: '2026-06-05' }],
    ['rating tier', { rows: [makeRow({ rating_tier: 'platinum' })] }],
    ['battle counter', { rows: [makeRow({ battle_days: { day_1: { decided: 1, wins: -1, losses: 2 } } })] }],
    ['matchup counter', { rows: [makeRow({ matchups: [{ opponent_hero: 'Mak', decided: 2, wins: 1 }] })] }],
  ])('degrades Dataset Coverage for an invalid daily %s', async (_label, override) => {
    const transport = makeTransport(async (path) =>
      path === 'analyzer-v4/manifest.json'
        ? makeManifest(['2026-06-07'])
        : { ...makePayload('2026-06-07'), ...override }
    );

    const dataset = await loadHeroMetricsDataset(transport);

    expect(dataset.days).toEqual([]);
    expect(dataset.coverage.failedDates).toEqual(['2026-06-07']);
  });

  test('recovers a transient 404 with exactly one ingestion-owned refetch', async () => {
    let dailyAttempts = 0;
    const transport = makeTransport(async (path) => {
      if (path === 'analyzer-v4/manifest.json') {
        return makeManifest(['2026-06-07']);
      }
      dailyAttempts += 1;
      if (dailyAttempts === 1) {
        throw new HeroMetricsTransportError(`Failed to fetch ${path}: 404`, { status: 404 });
      }
      return makePayload('2026-06-07');
    });

    const dataset = await loadHeroMetricsDataset(transport);

    expect(dailyAttempts).toBe(2);
    expect(dataset.coverage.failedDates).toEqual([]);
  });

  test('degrades a permanent 404 after one refetch without parsing the error message', async () => {
    let dailyAttempts = 0;
    const transport = makeTransport(async (path) => {
      if (path === 'analyzer-v4/manifest.json') {
        return makeManifest(['2026-06-07']);
      }
      dailyAttempts += 1;
      throw new HeroMetricsTransportError('opaque missing resource', { status: 404 });
    });

    const dataset = await loadHeroMetricsDataset(transport);

    expect(dailyAttempts).toBe(2);
    expect(dataset.coverage.failedDates).toEqual(['2026-06-07']);
  });

  test('does not retry an ordinary error whose text happens to contain 404', async () => {
    let dailyAttempts = 0;
    const transport = makeTransport(async (path) => {
      if (path === 'analyzer-v4/manifest.json') {
        return makeManifest(['2026-06-07']);
      }
      dailyAttempts += 1;
      throw new Error('this is not structured: 404');
    });

    const dataset = await loadHeroMetricsDataset(transport);

    expect(dailyAttempts).toBe(1);
    expect(dataset.coverage.failedDates).toEqual(['2026-06-07']);
  });

  test('keeps default daily request concurrency bounded at six', async () => {
    let active = 0;
    let maximumActive = 0;
    const releases: Array<() => void> = [];
    const transport = makeTransport(async (path) => {
      if (path === 'analyzer-v4/manifest.json') {
        return makeManifest();
      }
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return makePayload(dayFromPath(path));
    });

    const request = loadHeroMetricsDataset(transport);
    await vi.waitFor(() => expect(maximumActive).toBe(6));
    while (releases.length > 0) {
      releases.shift()?.();
      await Promise.resolve();
    }
    await request;

    expect(maximumActive).toBe(6);
  });

  test('passes caller abort to transport and rejects when aborted mid-load', async () => {
    const controller = new AbortController();
    const transport = makeTransport(async (path, signal) => {
      expect(signal).toBe(controller.signal);
      if (path === 'analyzer-v4/manifest.json') {
        return makeManifest(['2026-06-07']);
      }
      controller.abort(new DOMException('caller aborted', 'AbortError'));
      throw controller.signal.reason;
    });

    await expect(
      loadHeroMetricsDataset(transport, { signal: controller.signal })
    ).rejects.toThrow(/caller aborted/i);
  });
});
