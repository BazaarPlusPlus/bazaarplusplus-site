import { describe, expect, test, vi } from 'vitest';

import {
  loadHeroOverviewPageData,
  type PageLoadProgress,
} from '../src/app/page-data';
import type {
  HeroOverviewPayload,
  HeroWinrateDailyPayload,
  ManifestPayload,
  RatingTier,
} from '../src/shared/lib/metrics';
import type { RuntimeMetricsClient } from '../src/shared/lib/metrics-client';

describe('SPA data loading progress', () => {
  test('reports progress while loading hero overview payloads', async () => {
    const manifest: ManifestPayload = {
      generatedAt: '2026-04-25T14:46:33Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-24T00:00:00Z',
          end: '2026-04-25T00:00:00Z',
          patch_transition: false,
        },
      },
      files: [
        {
          path: 'hero_winrate_daily/all.json',
          metric: 'hero_winrate_daily',
          rating_tier: 'all',
          rowCount: 1,
        },
        {
          path: 'hero_winrate_daily/high.json',
          metric: 'hero_winrate_daily',
          rating_tier: 'high',
          rowCount: 1,
        },
        {
          path: 'hero_overview/1d/all.json',
          metric: 'hero_overview',
          window: '1d',
          rating_tier: 'all',
          rowCount: 1,
        },
      ],
    };
    const daily: HeroWinrateDailyPayload = {
      metric: 'hero_winrate_daily',
      generatedAt: manifest.generatedAt,
      rowCount: 0,
      rows: [],
    };
    const overview: HeroOverviewPayload = {
      metric: 'hero_overview',
      generatedAt: manifest.generatedAt,
      rowCount: 0,
      rows: [],
    };
    const client = {
      getSource: () => 'remote',
      getManifest: vi.fn(async () => manifest),
      getHeroWinrateDaily: vi.fn(async () => daily),
      getHeroOverview: vi.fn(async () => overview),
    } satisfies RuntimeMetricsClient;
    const progress: PageLoadProgress[] = [];

    await loadHeroOverviewPageData(client, {
      onProgress: (event) => progress.push(event),
    });

    expect(progress[0]).toMatchObject({ completed: 0, total: 1 });
    expect(progress[1]).toMatchObject({ completed: 1, total: 4 });
    expect(progress.at(-1)).toMatchObject({ completed: 4, total: 4 });
    expect(progress.map((event) => event.completed)).toContain(4);
    expect(progress.map((event) => event.label)).toContain('Loading hero_winrate_daily/all');
    expect(progress.map((event) => event.label)).toContain('Loaded hero_overview/1d/all');
  });

  test('passes the caller abort signal to manifest and payload requests', async () => {
    const abortController = new AbortController();
    const manifest: ManifestPayload = {
      generatedAt: '2026-04-25T14:46:33Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-24T00:00:00Z',
          end: '2026-04-25T00:00:00Z',
          patch_transition: false,
        },
      },
      files: [
        {
          path: 'hero_winrate_daily/all.json',
          metric: 'hero_winrate_daily',
          rating_tier: 'all',
          rowCount: 1,
        },
        {
          path: 'hero_overview/1d/all.json',
          metric: 'hero_overview',
          window: '1d',
          rating_tier: 'all',
          rowCount: 1,
        },
      ],
    };
    const daily: HeroWinrateDailyPayload = {
      metric: 'hero_winrate_daily',
      generatedAt: manifest.generatedAt,
      rowCount: 0,
      rows: [],
    };
    const overview: HeroOverviewPayload = {
      metric: 'hero_overview',
      generatedAt: manifest.generatedAt,
      rowCount: 0,
      rows: [],
    };
    const client = {
      getSource: () => 'remote',
      getManifest: vi.fn(async (options?: { signal?: AbortSignal }) => {
        expect(options?.signal).toBe(abortController.signal);
        return manifest;
      }),
      getHeroWinrateDaily: vi.fn(async (_tier: RatingTier, options?: { signal?: AbortSignal }) => {
        expect(options?.signal).toBe(abortController.signal);
        return daily;
      }),
      getHeroOverview: vi.fn(
        async (_window: string, _tier: RatingTier, options?: { signal?: AbortSignal }) => {
          expect(options?.signal).toBe(abortController.signal);
          return overview;
        }
      ),
    } satisfies RuntimeMetricsClient;

    await loadHeroOverviewPageData(client, { signal: abortController.signal });
  });

});
