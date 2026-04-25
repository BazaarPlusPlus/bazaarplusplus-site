export const INSTALLER_BASE = 'https://bppinstaller.bazaarplusplus.com';
export const GITHUB_RELEASE_URL = 'https://github.com/cauyxy/BazaarPlusPlus/releases/latest';

export type DownloadPlatform = 'windows' | 'mac';

export type LatestVersion = {
  version: string;
};

export async function fetchLatestVersion(signal?: AbortSignal): Promise<LatestVersion> {
  const response = await fetch(`${INSTALLER_BASE}/latest.json`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`latest.json responded with ${response.status}`);
  }

  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as { version?: unknown }).version !== 'string' ||
    !(payload as { version: string }).version
  ) {
    throw new Error('latest.json missing string `version`');
  }

  return { version: (payload as { version: string }).version };
}

export function buildDownloadUrl(platform: DownloadPlatform, version: string): string {
  if (platform === 'windows') {
    return `${INSTALLER_BASE}/${version}/windows-x86_64/installer/BazaarPlusPlus_${version}_x64-setup.exe`;
  }

  return `${INSTALLER_BASE}/${version}/darwin-aarch64/installer/BazaarPlusPlus_${version}_aarch64.dmg`;
}
