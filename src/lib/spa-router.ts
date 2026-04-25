export type SpaRoute =
  | { page: 'heroes' }
  | { page: 'cards' }
  | { page: 'builds' }
  | { page: 'not-found' };

export function resolveSpaRoute(pathname: string): SpaRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === '/') {
    return { page: 'heroes' };
  }

  if (normalized === '/cards') {
    return { page: 'cards' };
  }

  if (normalized === '/builds') {
    return { page: 'builds' };
  }

  return { page: 'not-found' };
}

export function isSpaRoutePath(pathname: string): boolean {
  return resolveSpaRoute(pathname).page !== 'not-found';
}
