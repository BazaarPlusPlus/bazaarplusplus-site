// @vitest-environment node

import { describe, expect, test } from 'vitest';

import {
  isAnalyzerV4Manifest,
  parseLocale,
  parseMetricWindow,
  parseRatingTier,
  validateWebDailyPayload,
  type AnalyzerV4Manifest,
  type WebHeroDailyPayload,
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

describe('analyzer-v4 schema guards', () => {
  const manifest: AnalyzerV4Manifest = {
    schema_version: '1',
    namespace: 'analyzer-v4',
    generatedAt: '2026-06-07T09:04:17Z',
    latest_complete_day: '2026-06-06',
    web: {
      schema_version: '1',
      days: [{ day: '2026-06-06', path: 'analyzer-v4/web/2026-06-06.json', rowCount: 27 }],
    },
    dq: {
      days: 2,
      bundle_download_fail_rate: 0.126,
      decode_fail_rate: 0,
    },
    sli_path: 'analyzer-v4/_sli.json',
  };

  test('isAnalyzerV4Manifest accepts the live manifest shape', () => {
    expect(isAnalyzerV4Manifest(manifest)).toBe(true);
  });

  test('isAnalyzerV4Manifest rejects namespace and web schema mismatches', () => {
    expect(isAnalyzerV4Manifest(null)).toBe(false);
    expect(isAnalyzerV4Manifest({})).toBe(false);
    expect(isAnalyzerV4Manifest({ ...manifest, namespace: 'analyzer-v3' })).toBe(false);
    expect(
      isAnalyzerV4Manifest({ ...manifest, web: { ...manifest.web, schema_version: '2' } })
    ).toBe(false);
    expect(isAnalyzerV4Manifest({ ...manifest, web: undefined })).toBe(false);
    expect(
      isAnalyzerV4Manifest({ ...manifest, web: { schema_version: '1', days: 'nope' } })
    ).toBe(false);
  });

  const payload: WebHeroDailyPayload = {
    schema_version: '1',
    kind: 'web_hero_daily',
    day: '2026-06-06',
    generatedAt: '2026-06-07T09:04:17Z',
    rows: [],
  };

  test('validateWebDailyPayload accepts a payload matching the expected day', () => {
    expect(validateWebDailyPayload(payload, '2026-06-06')).toBe(true);
  });

  test('validateWebDailyPayload rejects schema/kind/day mismatches', () => {
    expect(validateWebDailyPayload(null, '2026-06-06')).toBe(false);
    expect(validateWebDailyPayload({ ...payload, schema_version: '2' }, '2026-06-06')).toBe(false);
    expect(validateWebDailyPayload({ ...payload, kind: 'web_hero_weekly' }, '2026-06-06')).toBe(
      false
    );
    expect(validateWebDailyPayload(payload, '2026-06-05')).toBe(false);
    expect(validateWebDailyPayload({ ...payload, rows: undefined }, '2026-06-06')).toBe(false);
  });
});
