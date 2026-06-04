type SpaRoute =
  | { page: 'heroes' }
  | { page: 'cards' }
  | { page: 'builds' }
  | { page: 'tutorial' }
  | { page: 'download' }
  | { page: 'download-preview' }
  | { page: 'preview-release' }
  | { page: 'support' }
  | { page: 'not-found' };

const CANONICAL_PATHS: Record<string, string> = {
  '/supporters': '/support',
};

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function getCanonicalPath(pathname: string): string | null {
  const normalized = normalizePathname(pathname);
  return CANONICAL_PATHS[normalized] ?? null;
}

export function resolveSpaRoute(pathname: string): SpaRoute {
  const normalized = normalizePathname(pathname);
  const resolved = CANONICAL_PATHS[normalized] ?? normalized;

  if (resolved === '/') {
    return { page: 'support' };
  }

  if (resolved === '/heroes') {
    return { page: 'heroes' };
  }

  if (resolved === '/cards') {
    return { page: 'cards' };
  }

  if (resolved === '/builds') {
    return { page: 'builds' };
  }

  if (resolved === '/tutorial') {
    return { page: 'tutorial' };
  }

  if (resolved === '/download') {
    return { page: 'download' };
  }

  if (resolved === '/download/preview') {
    return { page: 'download-preview' };
  }

  if (resolved === '/release/preview') {
    return { page: 'preview-release' };
  }

  if (resolved === '/support') {
    return { page: 'support' };
  }

  return { page: 'not-found' };
}

export function isSpaRoutePath(pathname: string): boolean {
  return resolveSpaRoute(pathname).page !== 'not-found';
}
