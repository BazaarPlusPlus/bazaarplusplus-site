import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  GITHUB_RELEASE_URL,
  buildDownloadUrl,
  fetchLatestVersion,
  INSTALLER_BASE,
} from '../src/features/download/installer';

describe('buildDownloadUrl', () => {
  test('builds the windows installer url', () => {
    expect(buildDownloadUrl('windows', '3.1.1')).toBe(
      'https://bppinstaller.bazaarplusplus.com/3.1.1/windows-x86_64/installer/BazaarPlusPlus_3.1.1_x64-setup.exe'
    );
  });

  test('builds the mac installer url', () => {
    expect(buildDownloadUrl('mac', '3.1.1')).toBe(
      'https://bppinstaller.bazaarplusplus.com/3.1.1/darwin-aarch64/installer/BazaarPlusPlus_3.1.1_aarch64.dmg'
    );
  });

  test('uses the documented installer base', () => {
    expect(INSTALLER_BASE).toBe('https://bppinstaller.bazaarplusplus.com');
    expect(GITHUB_RELEASE_URL).toBe('https://github.com/cauyxy/BazaarPlusPlus/releases/latest');
  });
});

describe('fetchLatestVersion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns the version from a valid response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: '3.1.1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLatestVersion()).resolves.toEqual({ version: '3.1.1' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://bppinstaller.bazaarplusplus.com/latest.json',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      })
    );
  });

  test('throws when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('boom', { status: 503 }))
    );

    await expect(fetchLatestVersion()).rejects.toThrow(/503/);
  });

  test('throws when the response is missing a version string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ver: '3.1.1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    await expect(fetchLatestVersion()).rejects.toThrow(/version/i);
  });

  test('throws when the version is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ version: '' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    await expect(fetchLatestVersion()).rejects.toThrow(/version/i);
  });
});
