// @vitest-environment node

import { describe, expect, test, vi } from 'vitest';

import { createMetricsRepository } from '../src/shared/lib/metrics-node';
import {
  buildFinalBuildViewRows,
  buildItemInclusionViewRows,
  buildItemUpliftViewRows,
  getCardDisplayName,
  parseCardMetric,
  parseLocale,
  type CardDictionary,
  type CardWinratePayload,
  type FinalBuildsPayload,
  type HeroOverviewPayload,
  type HeroWinrateDailyPayload,
  type ItemInclusionPayload,
  type ItemUpliftPayload,
  type ManifestPayload,
} from '../src/shared/lib/metrics';

describe('createMetricsRepository', () => {
  test('parses locale and resolves localized card display names', () => {
    const dictionary: CardDictionary = {
      abc: {
        name: {
          en: 'Amber Core',
          zh: '琥珀核心',
        },
      },
      localized: {
        name: {
          'en-US': 'Eagle Talisman',
          'zh-CN': '鹰之护符',
        },
      },
      def: {
        name: {
          en: 'Stove',
        },
      },
    };

    expect(parseLocale('zh')).toBe('zh');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale(null)).toBe('zh');
    expect(parseLocale('ja')).toBe('zh');
    expect(parseCardMetric('uplift')).toBe('uplift');
    expect(parseCardMetric('inclusion')).toBe('inclusion');
    expect(parseCardMetric('phase')).toBe('winrate');
    expect(parseCardMetric('enchants')).toBe('winrate');
    expect(parseCardMetric('weird')).toBe('winrate');
    expect(getCardDisplayName(dictionary, 'abc', 'zh')).toBe('琥珀核心');
    expect(getCardDisplayName(dictionary, 'localized', 'zh')).toBe('鹰之护符');
    expect(getCardDisplayName(dictionary, 'localized', 'en')).toBe('Eagle Talisman');
    expect(getCardDisplayName(dictionary, 'def', 'zh')).toBe('Stove');
  });

  test('reads metric payloads from the remote repository', async () => {
    const manifest: ManifestPayload = {
      generatedAt: '2026-04-25T14:37:44Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-24T00:00:00Z',
          end: '2026-04-25T00:00:00Z',
          patch_transition: false,
        },
      },
      files: [],
    };
    const heroOverview: HeroOverviewPayload = {
      metric: 'hero_overview',
      generatedAt: '2026-04-25T14:37:44Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Mak',
          runs_total: 2588,
          runs_completed: 1037,
          runs_10w: 910,
          win_rate: 0.8775,
          win_rate_wilson_lower: 0.8561,
          avg_run_days_for_10w: 12.88,
          p75_run_days_for_10w: 14,
          victory_tier_counts: {
            perfect: 40,
            gold: 870,
            silver: 40,
            bronze: 42,
            none: 45,
          },
          top_archetypes: [],
          top_final_builds: [],
        },
      ],
    };
    const cardWinrate: CardWinratePayload = {
      metric: 'item_winrate',
      generatedAt: '2026-04-25T14:37:44Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Dooley',
          template_id: 'card-a',
          appearances: 55,
          wins: 34,
          win_rate: 0.6181,
          win_rate_wilson_lower: 0.49,
        },
      ],
    };
    const daily: HeroWinrateDailyPayload = {
      metric: 'hero_winrate_daily',
      generatedAt: '2026-04-25T14:37:44Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Dooley',
          day: '2026-04-24T00:00:00Z',
          completed_runs: 1823,
          wins_10w: 680,
          win_rate: 0.373,
          win_rate_wilson_lower: 0.3511,
        },
      ],
    };

    const payloads = new Map<string, unknown>([
      ['https://metrics.example.com/root/manifest.json', manifest],
      ['https://metrics.example.com/root/hero_overview/1d/all.json', heroOverview],
      ['https://metrics.example.com/root/item_winrate/1d/all.json', cardWinrate],
      ['https://metrics.example.com/root/hero_winrate_daily/all.json', daily],
    ]);
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const payload = payloads.get(String(input));
      return new Response(JSON.stringify(payload), {
        status: payload ? 200 : 404,
        headers: { 'content-type': 'application/json' },
      });
    });

    const repo = await createMetricsRepository({
      remoteBaseUrl: 'https://metrics.example.com/root/',
      fetchImpl,
    });

    await expect(repo.getManifest()).resolves.toEqual(manifest);
    await expect(repo.getHeroOverview('1d', 'all')).resolves.toEqual(heroOverview);
    await expect(repo.getCardWinrate('1d', 'all')).resolves.toEqual(cardWinrate);
    await expect(repo.getHeroWinrateDaily('all')).resolves.toEqual(daily);
    await expect(repo.getSource()).resolves.toBe('remote');
    expect(fetchImpl).toHaveBeenCalledWith('https://metrics.example.com/root/manifest.json');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://metrics.example.com/root/hero_overview/1d/all.json'
    );
  });

  test('reads the card dictionary from the remote static URL', async () => {
    const cardDictionary: CardDictionary = {
      'card-a': { name: { en: 'Amber Core' }, image_url: 'https://img.example/a.png' },
    };
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify(cardDictionary), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const repo = await createMetricsRepository({ fetchImpl });

    await expect(repo.getCardDictionary()).resolves.toEqual(cardDictionary);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://bpp-static.bazaarplusplus.com/card_dict_with_url.json'
    );
  });

  test('throws when a remote metric request fails', async () => {
    const repo = await createMetricsRepository({
      remoteBaseUrl: 'https://metrics.example.com/root/',
      fetchImpl: vi.fn(async () => new Response('', { status: 503 })),
    });

    await expect(repo.getManifest()).rejects.toThrow(/manifest\.json: 503/);
  });

  test('resolves final build card strips from the signature', () => {
    const payload: FinalBuildsPayload = {
      metric: 'final_builds',
      generatedAt: '2026-04-18T18:57:46Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Dooley',
          sig: 'card-a|card-b|card-c|card-d|card-e',
          run_count: 11,
          p75_run_days: 14.5,
          gold_score: 0.1713728724,
          rank: 1,
        },
      ],
    };
    const cardDictionary: CardDictionary = {
      'card-a': { name: { en: 'Amber Core' }, image_url: 'https://img.example/a.png' },
      'card-b': { name: { en: 'Eagle Talisman' }, image_url: 'https://img.example/b.png' },
      'card-c': { name: { en: 'Chronobarrier' }, image_url: 'https://img.example/c.png' },
      'card-d': { name: { en: 'Stove' }, image_url: 'https://img.example/d.png' },
      'card-e': { name: { en: 'Miss Isles' }, image_url: 'https://img.example/e.png' },
    };

    const rows = buildFinalBuildViewRows(payload, cardDictionary, 'en');

    expect(rows[0]?.buildCards).toHaveLength(5);
    expect(rows[0]?.buildCards[0]?.name).toBe('Amber Core');
    expect(rows[0]?.buildCards[4]?.imageUrl).toBe('https://img.example/e.png');
  });

  test('uses final build item layout and representative user fields from the raw payload', () => {
    const payload: FinalBuildsPayload = {
      metric: 'final_builds',
      generatedAt: '2026-04-25T08:54:02Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Dooley',
          sig: 'card-a|card-b|card-c',
          run_count: 4,
          p75_run_days: 12,
          gold_score: 0.14,
          rank: 1,
          representative_battle_id: 'battle-1',
          item_count: 3,
          slot_count: 10,
          is_complete_build: true,
          representative_user_account_id: 'acct-1',
          representative_user_display_name: 'Socket Master',
          representative_user_run_count: 3,
          items: [
            {
              slot_index: 2,
              socket: 6,
              size: 4,
              template_id: 'card-c',
              tier: 'Diamond',
              name: 'Caltrops',
            },
            {
              slot_index: 0,
              socket: 0,
              size: 3,
              template_id: 'card-a',
              tier: 'Gold',
              name: 'Amber Core',
            },
            {
              slot_index: 1,
              socket: 3,
              size: 3,
              template_id: 'card-b',
              tier: 'Silver',
              name: 'Eagle Talisman',
            },
          ],
        },
      ],
    };
    const cardDictionary: CardDictionary = {
      'card-a': { name: { en: 'Amber Core' }, image_url: 'https://img.example/a.png' },
      'card-b': { name: { en: 'Eagle Talisman' }, image_url: 'https://img.example/b.png' },
      'card-c': { name: { en: 'Caltrops' }, image_url: 'https://img.example/c.png' },
    };

    const rows = buildFinalBuildViewRows(payload, cardDictionary, 'en');

    expect(rows[0]?.representative_user_display_name).toBe('Socket Master');
    expect(rows[0]?.representative_user_run_count).toBe(3);
    expect(rows[0]?.buildCards.map((card) => card.id)).toEqual(['card-a', 'card-b', 'card-c']);
    expect(rows[0]?.buildCards[0]).toMatchObject({
      socket: 0,
      slotSize: 3,
      tier: 'Gold',
    });
    expect(rows[0]?.buildCards[1]).toMatchObject({
      socket: 3,
      slotSize: 3,
      tier: 'Silver',
    });
  });

  test('resolves item uplift metadata', () => {
    const payload: ItemUpliftPayload = {
      metric: 'item_uplift',
      generatedAt: '2026-04-18T18:57:46Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Mak',
          template_id: 'card-a',
          runs_with: 130,
          runs_without: 162,
          win_rate_with: 0.8153,
          win_rate_without: 0.5308,
          uplift: 0.2845,
          uplift_ci_95_lower: 0.1827,
          uplift_ci_95_upper: 0.3862,
        },
      ],
    };
    const cardDictionary: CardDictionary = {
      'card-a': { name: { en: 'Amber Core' }, image_url: 'https://img.example/a.png' },
    };

    const rows = buildItemUpliftViewRows(payload, cardDictionary, 'en');

    expect(rows[0]?.displayName).toBe('Amber Core');
    expect(rows[0]?.imageUrl).toBe('https://img.example/a.png');
  });

  test('resolves item inclusion metadata', () => {
    const cardDictionary: CardDictionary = {
      'card-a': {
        name: { en: 'Amber Core' },
        image_url: 'https://img.example/a.png',
        size: 'large',
      },
    };
    const inclusion: ItemInclusionPayload = {
      metric: 'item_inclusion',
      generatedAt: '2026-04-18T18:57:46Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Mak',
          template_id: 'card-a',
          runs_total_10w: 4609,
          runs_with_card: 3007,
          inclusion_rate: 0.6524191799,
        },
      ],
    };

    expect(buildItemInclusionViewRows(inclusion, cardDictionary, 'en')[0]?.displayName).toBe(
      'Amber Core'
    );
  });
});
