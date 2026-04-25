// @vitest-environment jsdom

import { describe, expect, test, vi } from 'vitest';

import { createRuntimeMetricsClient } from '../src/lib/metrics-client';

describe('createRuntimeMetricsClient', () => {
  test('uses the remote metrics base URL by default', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        generatedAt: '2026-04-25T14:06:00Z',
        current_patch_id: null,
        windows: {},
        files: [],
      }),
    })) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({ fetchImpl });

    await client.getManifest();

    expect(client.getSource()).toBe('remote');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://bpp-metrics.bazaarplusplus.com/manifest.json'
    );
  });

  test('loads metric JSON from the configured metrics base URL', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        generatedAt: '2026-04-24T18:34:36Z',
        current_patch_id: null,
        windows: {},
        files: [],
      }),
    })) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({
      metricsBaseUrl: 'https://metrics.example.com/root/',
      fetchImpl,
    });

    await expect(client.getManifest()).resolves.toMatchObject({
      generatedAt: '2026-04-24T18:34:36Z',
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://metrics.example.com/root/manifest.json');
  });

  test('loads the card dictionary from the configured static URL', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      json: async () =>
        String(input).includes('card_dict_with_url.json')
          ? {
              card_a: {
                image_url: 'https://bpp-static.bazaarplusplus.com/webp/card_a.webp',
                name: {
                  'en-US': 'Eagle Talisman',
                  'zh-CN': '鹰之护符',
                },
              },
            }
          : {},
    })) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({
      metricsBaseUrl: 'https://metrics.example.com/root/',
      cardDictionaryUrl: 'https://static.example.com/card_dict_with_url.json',
      fetchImpl,
    });

    await expect(client.getCardDictionary()).resolves.toEqual({
      card_a: {
        image_url: 'https://bpp-static.bazaarplusplus.com/webp/card_a.webp',
        name: {
          'en-US': 'Eagle Talisman',
          'zh-CN': '鹰之护符',
        },
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://static.example.com/card_dict_with_url.json');
  });
});
