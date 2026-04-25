import { describe, expect, test, vi } from 'vitest';

import {
  loadCardsPageData,
  loadHeroOverviewPageData,
  type PageLoadProgress,
} from '../src/app/page-data';
import type {
  CardDictionary,
  CardWinratePayload,
  HeroOverviewPayload,
  HeroWinrateDailyPayload,
  ItemInclusionPayload,
  ItemUpliftPayload,
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
      getCardDictionary: vi.fn(),
      getCardWinrate: vi.fn(),
      getItemUplift: vi.fn(),
      getItemInclusion: vi.fn(),
      getFinalBuilds: vi.fn(),
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
      getCardDictionary: vi.fn(),
      getCardWinrate: vi.fn(),
      getItemUplift: vi.fn(),
      getItemInclusion: vi.fn(),
      getFinalBuilds: vi.fn(),
    } satisfies RuntimeMetricsClient;

    await loadHeroOverviewPageData(client, { signal: abortController.signal });
  });

  test('limits concurrent card payload downloads', async () => {
    const tiers: RatingTier[] = ['all', 'low', 'mid', 'high'];
    const manifest: ManifestPayload = {
      generatedAt: '2026-04-25T14:46:33Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-24T00:00:00Z',
          end: '2026-04-25T00:00:00Z',
          patch_transition: false,
        },
        '3d': {
          start: '2026-04-22T00:00:00Z',
          end: '2026-04-25T00:00:00Z',
          patch_transition: false,
        },
        '7d': {
          start: '2026-04-18T00:00:00Z',
          end: '2026-04-25T00:00:00Z',
          patch_transition: false,
        },
      },
      files: ['item_winrate', 'item_uplift', 'item_inclusion'].flatMap((metric) =>
        (['1d', '3d', '7d'] as const).flatMap((window) =>
          tiers.map((tier) => ({
            path: `${metric}/${window}/${tier}.json`,
            metric,
            window,
            rating_tier: tier,
            rowCount: 1,
          }))
        )
      ),
    };
    const cardDictionary: CardDictionary = {};
    const winrate: CardWinratePayload = {
      metric: 'item_winrate',
      generatedAt: manifest.generatedAt,
      rowCount: 0,
      rows: [],
    };
    const uplift: ItemUpliftPayload = {
      metric: 'item_uplift',
      generatedAt: manifest.generatedAt,
      rowCount: 0,
      rows: [],
    };
    const inclusion: ItemInclusionPayload = {
      metric: 'item_inclusion',
      generatedAt: manifest.generatedAt,
      rowCount: 0,
      rows: [],
    };
    let active = 0;
    let maxActive = 0;

    async function trackPayload<T>(payload: T): Promise<T> {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return payload;
    }

    const client = {
      getSource: () => 'remote',
      getManifest: vi.fn(async () => manifest),
      getCardDictionary: vi.fn(async () => cardDictionary),
      getCardWinrate: vi.fn(async () => trackPayload(winrate)),
      getItemUplift: vi.fn(async () => trackPayload(uplift)),
      getItemInclusion: vi.fn(async () => trackPayload(inclusion)),
      getHeroWinrateDaily: vi.fn(),
      getHeroOverview: vi.fn(),
      getFinalBuilds: vi.fn(),
    } satisfies RuntimeMetricsClient;

    await loadCardsPageData(client, 'en', { concurrency: 2 });

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(client.getCardWinrate).toHaveBeenCalledTimes(12);
    expect(client.getItemUplift).toHaveBeenCalledTimes(12);
    expect(client.getItemInclusion).toHaveBeenCalledTimes(12);
  });
});
