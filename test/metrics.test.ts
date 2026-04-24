// @vitest-environment node

import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createMetricsRepository } from '../src/lib/metrics-node';
import { type HeroOverviewPayload, type ManifestPayload } from '../src/lib/metrics';
import type { CardWinratePayload } from '../src/lib/metrics';
import type {
  CardDictionary,
  EnchantUpliftPayload,
  FinalBuildsPayload,
  HeroWinrateDailyPayload,
  ItemInclusionPayload,
  ItemUpliftPayload,
  PhaseInclusionPayload,
  PhaseValuePayload,
} from '../src/lib/metrics';
import {
  buildEnchantUpliftViewRows,
  buildFinalBuildViewRows,
  buildItemInclusionViewRows,
  buildItemUpliftViewRows,
  buildPhaseInclusionViewRows,
  buildPhaseValueViewRows,
  getCardDisplayName,
  parseCardMetric,
  parseCardPhaseMetric,
  parseLocale,
} from '../src/lib/metrics';

const cleanupDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupDirs.splice(0).map(async (dir) => {
      await import('node:fs/promises').then(({ rm }) =>
        rm(dir, { recursive: true, force: true })
      );
    })
  );
});

async function makeTempMetricsDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'bpp-metrics-'));
  cleanupDirs.push(dir);
  return dir;
}

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
    expect(parseLocale('ja')).toBe('en');
    expect(parseCardMetric('uplift')).toBe('uplift');
    expect(parseCardMetric('inclusion')).toBe('inclusion');
    expect(parseCardMetric('phase')).toBe('phase');
    expect(parseCardMetric('enchants')).toBe('enchants');
    expect(parseCardPhaseMetric('inclusion')).toBe('inclusion');
    expect(parseCardMetric('weird')).toBe('winrate');
    expect(parseCardPhaseMetric('weird')).toBe('value');
    expect(getCardDisplayName(dictionary, 'abc', 'zh')).toBe('琥珀核心');
    expect(getCardDisplayName(dictionary, 'localized', 'zh')).toBe('鹰之护符');
    expect(getCardDisplayName(dictionary, 'localized', 'en')).toBe('Eagle Talisman');
    expect(getCardDisplayName(dictionary, 'def', 'zh')).toBe('Stove');
  });

  test('reads manifest and hero overview from local metrics directory when available', async () => {
    const dir = await makeTempMetricsDir();
    const manifest: ManifestPayload = {
      generatedAt: '2026-04-18T18:57:46Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-17T18:57:46Z',
          end: '2026-04-18T18:57:46Z',
          patch_transition: false,
        },
      },
      files: [],
    };
    const heroOverview: HeroOverviewPayload = {
      metric: 'hero_overview',
      generatedAt: '2026-04-18T18:57:46Z',
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

    await mkdir(join(dir, 'hero_overview', '1d'), { recursive: true });
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest));
    await writeFile(
      join(dir, 'hero_overview', '1d', 'all.json'),
      JSON.stringify(heroOverview)
    );

    const fetchImpl = vi.fn();
    const repo = await createMetricsRepository({
      localMetricsDir: dir,
      remoteBaseUrl: 'https://metrics.example.com',
      fetchImpl,
    });

    await expect(repo.getManifest()).resolves.toEqual(manifest);
    await expect(repo.getHeroOverview('1d', 'all')).resolves.toEqual(heroOverview);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('reads card winrate payloads from local metrics directory', async () => {
    const dir = await makeTempMetricsDir();
    const payload: CardWinratePayload = {
      metric: 'item_winrate',
      generatedAt: '2026-04-18T18:57:46Z',
      rowCount: 2,
      rows: [
        {
          hero: 'Karnok',
          template_id: 'card-1',
          appearances: 33540,
          wins: 20745,
          win_rate: 0.6185,
          win_rate_wilson_lower: 0.6133,
        },
        {
          hero: 'Jules',
          template_id: 'card-2',
          appearances: 25352,
          wins: 15932,
          win_rate: 0.6284,
          win_rate_wilson_lower: 0.6224,
        },
      ],
    };

    await mkdir(join(dir, 'item_winrate', '3d'), { recursive: true });
    await writeFile(
      join(dir, 'item_winrate', '3d', 'high.json'),
      JSON.stringify(payload)
    );

    const repo = await createMetricsRepository({
      localMetricsDir: dir,
      remoteBaseUrl: 'https://metrics.example.com',
      fetchImpl: vi.fn(),
    });

    await expect(repo.getCardWinrate('3d', 'high')).resolves.toEqual(payload);
  });

  test('reads final builds payloads and resolves card strips from the signature', async () => {
    const dir = await makeTempMetricsDir();
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

    await mkdir(join(dir, 'final_builds', '1d'), { recursive: true });
    await writeFile(join(dir, 'final_builds', '1d', 'all.json'), JSON.stringify(payload));

    const dictionaryDir = await makeTempMetricsDir();
    await writeFile(join(dictionaryDir, 'card_url.json'), JSON.stringify(cardDictionary));

    const repo = await createMetricsRepository({
      localMetricsDir: dir,
      localCardDictionaryPath: join(dictionaryDir, 'card_url.json'),
      remoteBaseUrl: 'https://metrics.example.com',
      fetchImpl: vi.fn(),
    });

    await expect(repo.getFinalBuilds('1d', 'all')).resolves.toEqual(payload);

    const rows = buildFinalBuildViewRows(payload, cardDictionary, 'en');
    expect(rows[0]?.build_cards).toHaveLength(5);
    expect(rows[0]?.build_cards[0]?.name).toBe('Amber Core');
    expect(rows[0]?.build_cards[4]?.imageUrl).toBe('https://img.example/e.png');
  });

  test('reads daily hero winrate payloads without a window segment', async () => {
    const dir = await makeTempMetricsDir();
    const payload: HeroWinrateDailyPayload = {
      metric: 'hero_winrate_daily',
      generatedAt: '2026-04-18T18:57:46Z',
      rowCount: 2,
      rows: [
        {
          hero: 'Dooley',
          day: '2026-04-16T16:00:00Z',
          completed_runs: 1823,
          wins_10w: 680,
          win_rate: 0.3730,
          win_rate_wilson_lower: 0.3511,
        },
        {
          hero: 'Mak',
          day: '2026-04-16T16:00:00Z',
          completed_runs: 1929,
          wins_10w: 721,
          win_rate: 0.3737,
          win_rate_wilson_lower: 0.3524,
        },
      ],
    };

    await mkdir(join(dir, 'hero_winrate_daily'), { recursive: true });
    await writeFile(join(dir, 'hero_winrate_daily', 'all.json'), JSON.stringify(payload));

    const repo = await createMetricsRepository({
      localMetricsDir: dir,
      remoteBaseUrl: 'https://metrics.example.com',
      fetchImpl: vi.fn(),
    });

    await expect(repo.getHeroWinrateDaily('all')).resolves.toEqual(payload);
  });

  test('reads item uplift payloads and resolves card metadata', async () => {
    const dir = await makeTempMetricsDir();
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

    await mkdir(join(dir, 'item_uplift', '3d'), { recursive: true });
    await writeFile(join(dir, 'item_uplift', '3d', 'high.json'), JSON.stringify(payload));

    const dictionaryDir = await makeTempMetricsDir();
    await writeFile(join(dictionaryDir, 'card_url.json'), JSON.stringify(cardDictionary));

    const repo = await createMetricsRepository({
      localMetricsDir: dir,
      localCardDictionaryPath: join(dictionaryDir, 'card_url.json'),
      remoteBaseUrl: 'https://metrics.example.com',
      fetchImpl: vi.fn(),
    });

    await expect(repo.getItemUplift('3d', 'high')).resolves.toEqual(payload);

    const rows = buildItemUpliftViewRows(payload, cardDictionary, 'en');
    expect(rows[0]?.display_name).toBe('Amber Core');
    expect(rows[0]?.image_url).toBe('https://img.example/a.png');
  });

  test('reads inclusion, phase, and enchant payloads and resolves card metadata', async () => {
    const dir = await makeTempMetricsDir();
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
    const phaseValue: PhaseValuePayload = {
      metric: 'item_phase_value',
      generatedAt: '2026-04-18T18:57:46Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Mak',
          template_id: 'card-a',
          phase: 'early',
          appearances: 63,
          wins: 32,
          win_rate: 0.5079365079,
          win_rate_wilson_lower: 0.3876267711,
        },
      ],
    };
    const phaseInclusion: PhaseInclusionPayload = {
      metric: 'item_phase_inclusion',
      generatedAt: '2026-04-18T18:57:46Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Mak',
          template_id: 'card-a',
          phase: 'early',
          hero_battles_in_phase: 44512,
          battles_with_card: 11203,
          inclusion_rate: 0.2516831416,
        },
      ],
    };
    const enchant: EnchantUpliftPayload = {
      metric: 'enchant_uplift',
      generatedAt: '2026-04-18T18:57:46Z',
      rowCount: 1,
      rows: [
        {
          hero: 'Mak',
          template_id: 'card-a',
          enchant: 'Toxic',
          appearances: 53,
          wins: 47,
          win_rate: 0.8867924528,
          win_rate_wilson_lower: 0.774232297,
          uplift_vs_unenchanted: 0.1132,
        },
      ],
    };

    await mkdir(join(dir, 'item_inclusion', '3d'), { recursive: true });
    await mkdir(join(dir, 'item_phase_value', '3d'), { recursive: true });
    await mkdir(join(dir, 'item_phase_inclusion', '3d'), { recursive: true });
    await mkdir(join(dir, 'enchant_uplift', '3d'), { recursive: true });
    await writeFile(join(dir, 'item_inclusion', '3d', 'high.json'), JSON.stringify(inclusion));
    await writeFile(join(dir, 'item_phase_value', '3d', 'high.json'), JSON.stringify(phaseValue));
    await writeFile(
      join(dir, 'item_phase_inclusion', '3d', 'high.json'),
      JSON.stringify(phaseInclusion)
    );
    await writeFile(join(dir, 'enchant_uplift', '3d', 'high.json'), JSON.stringify(enchant));

    const dictionaryDir = await makeTempMetricsDir();
    await writeFile(join(dictionaryDir, 'card_url.json'), JSON.stringify(cardDictionary));

    const repo = await createMetricsRepository({
      localMetricsDir: dir,
      localCardDictionaryPath: join(dictionaryDir, 'card_url.json'),
      remoteBaseUrl: 'https://metrics.example.com',
      fetchImpl: vi.fn(),
    });

    await expect(repo.getItemInclusion('3d', 'high')).resolves.toEqual(inclusion);
    await expect(repo.getPhaseValue('3d', 'high')).resolves.toEqual(phaseValue);
    await expect(repo.getPhaseInclusion('3d', 'high')).resolves.toEqual(phaseInclusion);
    await expect(repo.getEnchantUplift('3d', 'high')).resolves.toEqual(enchant);

    expect(buildItemInclusionViewRows(inclusion, cardDictionary, 'en')[0]?.display_name).toBe(
      'Amber Core'
    );
    expect(buildPhaseValueViewRows(phaseValue, cardDictionary, 'en')[0]?.card_size).toBe('large');
    expect(buildPhaseInclusionViewRows(phaseInclusion, cardDictionary, 'en')[0]?.display_name).toBe(
      'Amber Core'
    );
    expect(buildEnchantUpliftViewRows(enchant, cardDictionary, 'en')[0]?.display_name).toBe(
      'Amber Core'
    );
  });

  test('falls back to remote metrics when local metrics directory is unavailable', async () => {
    const manifest: ManifestPayload = {
      generatedAt: '2026-04-18T18:57:46Z',
      current_patch_id: null,
      windows: {
        '3d': {
          start: '2026-04-15T18:57:46Z',
          end: '2026-04-18T18:57:46Z',
          patch_transition: false,
        },
      },
      files: [],
    };

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      return new Response(JSON.stringify(manifest), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const repo = await createMetricsRepository({
      localMetricsDir: join(tmpdir(), 'definitely-missing-dir'),
      remoteBaseUrl: 'https://metrics.example.com/root/',
      fetchImpl,
    });

    await expect(repo.getManifest()).resolves.toEqual(manifest);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://metrics.example.com/root/manifest.json'
    );
  });

  test('falls back to remote metrics when the local directory exists but the requested file is missing', async () => {
    const dir = await makeTempMetricsDir();
    const manifest: ManifestPayload = {
      generatedAt: '2026-04-18T18:57:46Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-17T18:57:46Z',
          end: '2026-04-18T18:57:46Z',
          patch_transition: false,
        },
      },
      files: [],
    };

    await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest));

    const remotePayload: CardWinratePayload = {
      metric: 'item_winrate',
      generatedAt: '2026-04-18T18:57:46Z',
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

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/item_winrate/1d/all.json')) {
        return new Response(JSON.stringify(remotePayload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(manifest), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const repo = await createMetricsRepository({
      localMetricsDir: dir,
      remoteBaseUrl: 'https://metrics.example.com/root/',
      fetchImpl,
    });

    await expect(repo.getCardWinrate('1d', 'all')).resolves.toEqual(remotePayload);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://metrics.example.com/root/item_winrate/1d/all.json'
    );
  });
});
