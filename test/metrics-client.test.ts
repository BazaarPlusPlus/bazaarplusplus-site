// @vitest-environment jsdom

import { describe, expect, test, vi } from 'vitest';

import { createRuntimeMetricsClient } from '../src/shared/lib/metrics-client';

describe('createRuntimeMetricsClient', () => {
  test('loads the analyzer-v4 manifest from the remote metrics base URL by default', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        schema_version: '1',
        namespace: 'analyzer-v4',
        generatedAt: '2026-06-07T09:04:17Z',
        latest_complete_day: '2026-06-06',
        web: { schema_version: '1', days: [] },
      }),
    })) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({ fetchImpl });

    await client.getManifest();

    expect(client.getSource()).toBe('remote');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://bpp-metrics.bazaarplusplus.com/analyzer-v4/manifest.json',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  test('loads manifest JSON from the configured metrics base URL', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        schema_version: '1',
        namespace: 'analyzer-v4',
        generatedAt: '2026-06-07T09:04:17Z',
        latest_complete_day: '2026-06-06',
        web: { schema_version: '1', days: [] },
      }),
    })) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({
      metricsBaseUrl: 'https://metrics.example.com/root/',
      fetchImpl,
    });

    await expect(client.getManifest()).resolves.toMatchObject({
      generatedAt: '2026-06-07T09:04:17Z',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://metrics.example.com/root/analyzer-v4/manifest.json',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  test('getWebDaily passes the manifest day path verbatim onto the base URL', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        schema_version: '1',
        kind: 'web_hero_daily',
        day: '2026-06-06',
        generatedAt: '2026-06-07T09:04:17Z',
        rows: [],
      }),
    })) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({ fetchImpl });

    await client.getWebDaily('analyzer-v4/web/2026-06-06.json');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://bpp-metrics.bazaarplusplus.com/analyzer-v4/web/2026-06-06.json',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  test('aborts a hung metric request after the configured timeout', async () => {
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.signal) {
        throw new Error('missing signal');
      }

      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({
      fetchImpl,
      requestTimeoutMs: 1,
      requestRetries: 0,
    });

    await expect(client.getManifest()).rejects.toThrow(
      /Timed out fetching https:\/\/bpp-metrics\.bazaarplusplus\.com\/analyzer-v4\/manifest\.json/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('retries transient metric request failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network dropped'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schema_version: '1',
          namespace: 'analyzer-v4',
          generatedAt: '2026-06-07T09:04:17Z',
          latest_complete_day: '2026-06-06',
          web: { schema_version: '1', days: [] },
        }),
      }) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({
      fetchImpl,
      requestRetryDelayMs: 0,
      requestRetries: 1,
    });

    await expect(client.getManifest()).resolves.toMatchObject({
      generatedAt: '2026-06-07T09:04:17Z',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('does not retry a 404 daily file', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 404,
    })) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({
      fetchImpl,
      requestRetryDelayMs: 0,
      requestRetries: 2,
    });

    await expect(client.getWebDaily('analyzer-v4/web/2026-06-06.json')).rejects.toThrow(
      /Failed to fetch .*2026-06-06\.json: 404/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('propagates caller aborts without retrying', async () => {
    const abortController = new AbortController();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.signal) {
        throw new Error('missing signal');
      }

      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({
      fetchImpl,
      requestRetryDelayMs: 0,
      requestRetries: 2,
    });
    const request = client.getManifest({ signal: abortController.signal });

    abortController.abort();

    await expect(request).rejects.toThrow(/aborted/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
