// @vitest-environment jsdom

import { describe, expect, test, vi } from 'vitest';

import { createRuntimeMetricsClient } from '../src/shared/lib/metrics-client';

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
      'https://bpp-metrics.bazaarplusplus.com/manifest.json',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
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

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://metrics.example.com/root/manifest.json',
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
      /Timed out fetching https:\/\/bpp-metrics\.bazaarplusplus\.com\/manifest\.json/
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
          generatedAt: '2026-04-25T14:06:00Z',
          current_patch_id: null,
          windows: {},
          files: [],
        }),
      }) as unknown as typeof fetch;
    const client = createRuntimeMetricsClient({
      fetchImpl,
      requestRetryDelayMs: 0,
      requestRetries: 1,
    });

    await expect(client.getManifest()).resolves.toMatchObject({
      generatedAt: '2026-04-25T14:06:00Z',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
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
