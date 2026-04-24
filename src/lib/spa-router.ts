import { isHeroName, type HeroName } from './heroes';

export type SpaRoute =
  | { page: 'heroes' }
  | { page: 'cards' }
  | { page: 'builds' }
  | { page: 'hero-detail'; hero: HeroName }
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

  const heroMatch = normalized.match(/^\/heroes\/([^/]+)$/);
  if (heroMatch) {
    const hero = decodeURIComponent(heroMatch[1] ?? '');
    return isHeroName(hero) ? { page: 'hero-detail', hero } : { page: 'not-found' };
  }

  return { page: 'not-found' };
}

export function isSpaRoutePath(pathname: string): boolean {
  return resolveSpaRoute(pathname).page !== 'not-found';
}
