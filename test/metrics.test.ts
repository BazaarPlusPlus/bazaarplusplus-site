// @vitest-environment node

import { describe, expect, test } from 'vitest';

import {
  getAvailableTiers,
  getAvailableTiersForWindowlessMetric,
  getAvailableWindows,
  parseLocale,
  parseMetricWindow,
  parseRatingTier,
  type ManifestPayload,
} from '../src/shared/lib/metrics';

describe('metrics query-string parsers', () => {
  test('parseLocale falls back to the default locale', () => {
    expect(parseLocale('zh')).toBe('zh');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale(null)).toBe('zh');
    expect(parseLocale('ja')).toBe('zh');
  });

  test('parseMetricWindow falls back to 1d for unknown values', () => {
    expect(parseMetricWindow('3d')).toBe('3d');
    expect(parseMetricWindow('7d')).toBe('7d');
    expect(parseMetricWindow(null)).toBe('1d');
    expect(parseMetricWindow('30d')).toBe('1d');
  });

  test('parseRatingTier falls back to all for unknown values', () => {
    expect(parseRatingTier('high')).toBe('high');
    expect(parseRatingTier('mid')).toBe('mid');
    expect(parseRatingTier(null)).toBe('all');
    expect(parseRatingTier('platinum')).toBe('all');
  });
});

describe('manifest availability helpers', () => {
  const manifest: ManifestPayload = {
    generatedAt: '2026-04-25T14:37:44Z',
    current_patch_id: null,
    windows: {
      '1d': { start: '2026-04-24T00:00:00Z', end: '2026-04-25T00:00:00Z', patch_transition: false },
      '7d': { start: '2026-04-18T00:00:00Z', end: '2026-04-25T00:00:00Z', patch_transition: false },
    },
    files: [
      { path: 'hero_overview/1d/all.json', metric: 'hero_overview', window: '1d', rating_tier: 'all', rowCount: 1 },
      { path: 'hero_overview/1d/high.json', metric: 'hero_overview', window: '1d', rating_tier: 'high', rowCount: 1 },
      { path: 'hero_winrate_daily/all.json', metric: 'hero_winrate_daily', rating_tier: 'all', rowCount: 1 },
      { path: 'hero_winrate_daily/low.json', metric: 'hero_winrate_daily', rating_tier: 'low', rowCount: 1 },
    ],
  };

  test('getAvailableWindows reads the declared windows', () => {
    expect(getAvailableWindows(manifest)).toEqual(['1d', '7d']);
  });

  test('getAvailableWindows falls back to the full window set when none declared', () => {
    expect(getAvailableWindows({ ...manifest, windows: {} })).toEqual(['1d', '3d', '7d']);
  });

  test('getAvailableTiers filters by metric and window in canonical order', () => {
    expect(getAvailableTiers(manifest, '1d', 'hero_overview')).toEqual(['all', 'high']);
    expect(getAvailableTiers(manifest, '7d', 'hero_overview')).toEqual([]);
  });

  test('getAvailableTiersForWindowlessMetric collects tiers across files', () => {
    expect(getAvailableTiersForWindowlessMetric(manifest, 'hero_winrate_daily')).toEqual(['all', 'low']);
  });
});
