export const INSTALLER_BASE = 'https://bppinstaller.bazaarplusplus.com';
export const GITHUB_RELEASE_URL = 'https://github.com/cauyxy/BazaarPlusPlus/releases/latest';

export type DownloadPlatform = 'windows' | 'mac';

type VersionManifest = {
  version: string;
};

async function fetchVersionManifest(path: string, signal?: AbortSignal): Promise<VersionManifest> {
  const response = await fetch(`${INSTALLER_BASE}/${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`${path} responded with ${response.status}`);
  }

  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as { version?: unknown }).version !== 'string' ||
    !(payload as { version: string }).version
  ) {
    throw new Error(`${path} missing string \`version\``);
  }

  return { version: (payload as { version: string }).version };
}

export async function fetchLatestVersion(signal?: AbortSignal): Promise<VersionManifest> {
  return fetchVersionManifest('latest.json', signal);
}

export async function fetchPreviewVersion(signal?: AbortSignal): Promise<VersionManifest> {
  return fetchVersionManifest('preview.json', signal);
}

export function buildDownloadUrl(platform: DownloadPlatform, version: string): string {
  if (platform === 'windows') {
    return `${INSTALLER_BASE}/${version}/windows-x86_64/installer/BazaarPlusPlus_${version}_x64-setup.exe`;
  }

  return `${INSTALLER_BASE}/${version}/darwin-aarch64/installer/BazaarPlusPlus_${version}_aarch64.dmg`;
}

export function buildPreviewDownloadUrl(platform: DownloadPlatform, version: string): string {
  if (platform === 'windows') {
    return `${INSTALLER_BASE}/preview/${version}/windows-x86_64/BazaarPlusPlus_${version}_x64-setup.exe`;
  }

  return `${INSTALLER_BASE}/preview/${version}/darwin-aarch64/BazaarPlusPlus_${version}_aarch64.dmg`;
}
