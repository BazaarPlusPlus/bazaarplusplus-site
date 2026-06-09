import { describe, expect, test, vi } from 'vitest';

import {
  loadHeroOverviewPageData,
  type PageLoadProgress,
} from '../src/app/page-data';
import type {
  AnalyzerV4Manifest,
  WebHeroDailyPayload,
  WebHeroDailyRow,
} from '../src/shared/lib/metrics';
import type { RuntimeMetricsClient } from '../src/shared/lib/metrics-client';

function makeManifest(days: string[]): AnalyzerV4Manifest {
  return {
    schema_version: '2',
    namespace: 'analyzer-v4',
    generated_at: '2026-06-07T09:04:17Z',
    latest_complete_day: days.at(-1) ?? '2026-06-06',
    web: {
      schema_version: '2',
      days: days.map((day) => ({ day, path: `analyzer-v4/web/${day}.json`, row_count: 1 })),
    },
  };
}

function makeRow(hero: string, tier: WebHeroDailyRow['rating_tier']): WebHeroDailyRow {
  return {
    hero: hero as WebHeroDailyRow['hero'],
    rating_tier: tier,
    runs: { completed: 8, scored: 8, ten_win: 2 },
    outcomes: { perfect: 1, gold: 1, silver: 2, bronze: 2 },
    ten_win_days: { known_count: 2, sum_days: 22 },
    battle_days: {},
    matchups: [],
  };
}

function makePayload(day: string, rows: WebHeroDailyRow[]): WebHeroDailyPayload {
  return {
    schema_version: '2',
    kind: 'hero_web_daily',
    day,
    generated_at: '2026-06-07T09:04:17Z',
    rows,
  };
}

function makeClient(overrides: Partial<RuntimeMetricsClient>): RuntimeMetricsClient {
  return {
    getSource: () => 'remote',
    getManifest: vi.fn(async () => makeManifest(['2026-06-05', '2026-06-06'])),
    getWebDaily: vi.fn(async (path: string) => {
      const day = path.match(/(\d{4}-\d{2}-\d{2})\.json$/)![1]!;
      return makePayload(day, [makeRow('Vanessa', 'all'), makeRow('Vanessa', 'mid')]);
    }),
    ...overrides,
  } as RuntimeMetricsClient;
}

describe('loadHeroOverviewPageData', () => {
  test('loads the manifest plus each selected day with progress labels', async () => {
    const client = makeClient({});
    const progress: PageLoadProgress[] = [];

    const data = await loadHeroOverviewPageData(client, {
      onProgress: (event) => progress.push(event),
    });

    expect(progress[0]).toMatchObject({ completed: 0, total: 1, label: 'Loading manifest' });
    expect(progress[1]).toMatchObject({ completed: 1, total: 3 });
    expect(progress.at(-1)).toMatchObject({ completed: 3, total: 3 });
    expect(progress.map((event) => event.label)).toContain('Loading web_daily/2026-06-05');
    expect(progress.map((event) => event.label)).toContain('Loaded web_daily/2026-06-06');

    expect(data.days.map((payload) => payload.day)).toEqual(['2026-06-05', '2026-06-06']);
    expect(data.latestCompleteDay).toBe('2026-06-06');
    expect(data.availableWindows).toEqual(['1d', '3d', '7d']);
    expect(data.availableTiers).toEqual(['all', 'mid']);
    expect(data.coverage).toEqual({
      requested: ['2026-06-05', '2026-06-06'],
      loaded: ['2026-06-05', '2026-06-06'],
      failedDays: [],
    });
  });

  test('requests at most the latest seven days at or before latest_complete_day', async () => {
    const days = [
      '2026-05-29',
      '2026-05-30',
      '2026-05-31',
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
    ];
    const client = makeClient({
      getManifest: vi.fn(async () => makeManifest(days)),
    });

    const data = await loadHeroOverviewPageData(client);

    expect(data.coverage.requested).toEqual(days.slice(-7));
    expect(client.getWebDaily).toHaveBeenCalledTimes(7);
  });

  test('rejects a manifest that fails the schema guard', async () => {
    const client = makeClient({
      getManifest: vi.fn(async () => ({ namespace: 'legacy' }) as unknown as AnalyzerV4Manifest),
    });

    await expect(loadHeroOverviewPageData(client)).rejects.toThrow(
      /Unexpected metrics manifest format/
    );
  });

  test('one failed day degrades coverage instead of failing the page', async () => {
    const failure = new Error(
      'Failed to fetch https://example.com/analyzer-v4/web/2026-06-05.json: 404'
    );
    const client = makeClient({
      getWebDaily: vi.fn(async (path: string) => {
        if (path.includes('2026-06-05')) {
          throw failure;
        }

        return makePayload('2026-06-06', [makeRow('Vanessa', 'all')]);
      }),
    });

    const data = await loadHeroOverviewPageData(client);

    // 404 days get exactly one explicit refetch before degrading.
    expect(client.getWebDaily).toHaveBeenCalledTimes(3);
    expect(data.days.map((payload) => payload.day)).toEqual(['2026-06-06']);
    expect(data.availableWindows).toEqual(['1d', '3d', '7d']);
    expect(data.coverage).toEqual({
      requested: ['2026-06-05', '2026-06-06'],
      loaded: ['2026-06-06'],
      failedDays: ['2026-06-05'],
    });
  });

  test('a transient 404 recovers on the one-shot refetch', async () => {
    let attempts = 0;
    const client = makeClient({
      getWebDaily: vi.fn(async (path: string) => {
        const day = path.match(/(\d{4}-\d{2}-\d{2})\.json$/)![1]!;
        if (day === '2026-06-06' && attempts++ === 0) {
          throw new Error(`Failed to fetch ${path}: 404`);
        }

        return makePayload(day, [makeRow('Vanessa', 'all')]);
      }),
    });

    const data = await loadHeroOverviewPageData(client);

    expect(data.coverage.failedDays).toEqual([]);
    expect(data.days.map((payload) => payload.day)).toEqual(['2026-06-05', '2026-06-06']);
  });

  test('a payload failing the day guard counts as a failed day', async () => {
    const client = makeClient({
      getWebDaily: vi.fn(async (path: string) => {
        const day = path.match(/(\d{4}-\d{2}-\d{2})\.json$/)![1]!;
        // Wrong day inside the payload for 06-05.
        return makePayload(day === '2026-06-05' ? '2026-06-04' : day, [makeRow('Vanessa', 'all')]);
      }),
    });

    const data = await loadHeroOverviewPageData(client);

    expect(data.coverage.failedDays).toEqual(['2026-06-05']);
    expect(data.days.map((payload) => payload.day)).toEqual(['2026-06-06']);
  });

  test('reports empty windows when no web days exist', async () => {
    const client = makeClient({
      getManifest: vi.fn(async () => makeManifest([])),
      getWebDaily: vi.fn(async () => {
        throw new Error('should not be called');
      }),
    });

    const data = await loadHeroOverviewPageData(client);

    expect(data.availableWindows).toEqual([]);
    expect(data.availableTiers).toEqual([]);
    expect(data.days).toEqual([]);
    expect(client.getWebDaily).not.toHaveBeenCalled();
  });

  test('passes the caller abort signal to manifest and daily requests', async () => {
    const abortController = new AbortController();
    const client = makeClient({
      getManifest: vi.fn(async (options?: { signal?: AbortSignal }) => {
        expect(options?.signal).toBe(abortController.signal);
        return makeManifest(['2026-06-06']);
      }),
      getWebDaily: vi.fn(async (path: string, options?: { signal?: AbortSignal }) => {
        expect(options?.signal).toBe(abortController.signal);
        return makePayload('2026-06-06', [makeRow('Vanessa', 'all')]);
      }),
    });

    await loadHeroOverviewPageData(client, { signal: abortController.signal });
  });

  test('rejects with the abort error when aborted mid-load', async () => {
    const abortController = new AbortController();
    const client = makeClient({
      getWebDaily: vi.fn(async () => {
        abortController.abort();
        throw new DOMException('aborted', 'AbortError');
      }),
    });

    await expect(
      loadHeroOverviewPageData(client, { signal: abortController.signal })
    ).rejects.toThrow(/abort/i);
  });
});
