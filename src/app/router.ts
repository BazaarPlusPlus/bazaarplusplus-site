import type { AnalysisScope, MetricWindow } from '../features/heroes/hero-analysis';
import type { RatingTier } from '../features/heroes/hero-metrics-dataset';

export type Locale = 'en' | 'zh';

const DEFAULT_LOCALE: Locale = 'zh';

export type SpaPage = 'heroes' | 'tutorial' | 'download' | 'support' | 'not-found';

type NavigationGroup = 'primary' | 'secondary';

type RouteDefinition = {
  page: Exclude<SpaPage, 'not-found'>;
  path: string;
  group: NavigationGroup;
};

const ROUTES = [
  { page: 'heroes', path: '/heroes', group: 'primary' },
  { page: 'tutorial', path: '/tutorial', group: 'secondary' },
  { page: 'download', path: '/download', group: 'secondary' },
  { page: 'support', path: '/support', group: 'secondary' },
] as const satisfies readonly RouteDefinition[];

export type PrimaryNavigationPage = Extract<
  (typeof ROUTES)[number],
  { group: 'primary' }
>['page'];
export type SecondaryNavigationPage = Extract<
  (typeof ROUTES)[number],
  { group: 'secondary' }
>['page'];

export type ResolvedSpaLocation = {
  pathname: string;
  search: string;
  hash: string;
  route:
    | RouteDefinition
    | { page: 'not-found'; path: string; group: null };
  locale: Locale;
  scope: AnalysisScope;
  canonicalHref: string | null;
  navigation: {
    homeHref: string;
    heroesHref: string;
    items: Array<{
      page: RouteDefinition['page'];
      group: NavigationGroup;
      href: string;
    }>;
    localeHrefs: Record<Locale, string>;
  };
};

export type SpaLinkClick = {
  href: string;
  button: number;
  defaultPrevented?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  target?: string;
  download?: boolean;
};

type RawSpaLocation = {
  pathname: string;
  search: string;
  hash: string;
  origin: string;
};

export type SpaLocationAdapter = {
  read(): RawSpaLocation;
  push(href: string): void;
  replace(href: string): void;
  subscribePop(listener: () => void): () => void;
};

export type SpaLocation = {
  current(): ResolvedSpaLocation;
  subscribe(listener: (location: ResolvedSpaLocation) => void): () => void;
  canonicalize(): void;
  replaceScope(scope: AnalysisScope): void;
  handleLinkClick(click: SpaLinkClick): boolean;
};

const ALIASES: Record<string, string> = {
  '/supporters': '/support',
};

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function parseLocale(value: string | null): Locale {
  return value === 'en' || value === 'zh' ? value : DEFAULT_LOCALE;
}

function parseMetricWindow(value: string | null): MetricWindow {
  return value === '3d' || value === '7d' ? value : '1d';
}

function parseRatingTier(value: string | null): RatingTier {
  return value === 'low' || value === 'mid' || value === 'high' ? value : 'all';
}

function resolveRoute(pathname: string): ResolvedSpaLocation['route'] {
  const normalized = normalizePathname(pathname);
  const resolvedPath = ALIASES[normalized] ?? normalized;
  if (resolvedPath === '/') {
    return ROUTES.find((route) => route.page === 'support')!;
  }
  return (
    ROUTES.find((route) => route.path === resolvedPath) ?? {
      page: 'not-found',
      path: resolvedPath,
      group: null,
    }
  );
}

function buildRouteHref(pathname: string, locale: Locale): string {
  const search = new URLSearchParams();
  if (locale !== DEFAULT_LOCALE) {
    search.set('lang', locale);
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function buildLocaleHref(raw: RawSpaLocation, locale: Locale): string {
  const search = new URLSearchParams(raw.search);
  if (locale === DEFAULT_LOCALE) {
    search.delete('lang');
  } else {
    search.set('lang', locale);
  }
  const query = search.toString();
  return `${raw.pathname}${query ? `?${query}` : ''}${raw.hash}`;
}

function resolveLocation(raw: RawSpaLocation): ResolvedSpaLocation {
  const search = new URLSearchParams(raw.search);
  const locale = parseLocale(search.get('lang'));
  const normalized = normalizePathname(raw.pathname);
  const canonicalPath = ALIASES[normalized] ?? null;
  const items = ROUTES.map((route) => ({
    page: route.page,
    group: route.group,
    href: buildRouteHref(route.path, locale),
  }));

  return {
    pathname: raw.pathname,
    search: raw.search,
    hash: raw.hash,
    route: resolveRoute(raw.pathname),
    locale,
    scope: {
      window: parseMetricWindow(search.get('w')),
      tier: parseRatingTier(search.get('t')),
    },
    canonicalHref: canonicalPath ? `${canonicalPath}${raw.search}` : null,
    navigation: {
      homeHref: buildRouteHref('/', locale),
      heroesHref: buildRouteHref('/heroes', locale),
      items,
      localeHrefs: {
        zh: buildLocaleHref(raw, 'zh'),
        en: buildLocaleHref(raw, 'en'),
      },
    },
  };
}

function toRelativeHref(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`;
}

function buildScopeHref(location: ResolvedSpaLocation, scope: AnalysisScope): string {
  const search = new URLSearchParams(location.search);
  if (scope.window === '1d') {
    search.delete('w');
  } else {
    search.set('w', scope.window);
  }
  if (scope.tier === 'all') {
    search.delete('t');
  } else {
    search.set('t', scope.tier);
  }
  if (location.locale === DEFAULT_LOCALE) {
    search.delete('lang');
  } else {
    search.set('lang', location.locale);
  }
  const query = search.toString();
  return `${location.pathname}${query ? `?${query}` : ''}`;
}

export function createSpaLocation(adapter: SpaLocationAdapter): SpaLocation {
  const listeners = new Set<(location: ResolvedSpaLocation) => void>();
  let unsubscribePop: (() => void) | undefined;

  function current() {
    return resolveLocation(adapter.read());
  }

  function notify() {
    const location = current();
    for (const listener of listeners) {
      listener(location);
    }
  }

  function ensurePopSubscription() {
    if (!unsubscribePop) {
      unsubscribePop = adapter.subscribePop(notify);
    }
  }

  return {
    current,
    subscribe(listener) {
      listeners.add(listener);
      ensurePopSubscription();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          unsubscribePop?.();
          unsubscribePop = undefined;
        }
      };
    },
    canonicalize() {
      const canonicalHref = current().canonicalHref;
      if (canonicalHref) {
        adapter.replace(canonicalHref);
        notify();
      }
    },
    replaceScope(scope) {
      const location = current();
      const href = buildScopeHref(location, scope);
      if (`${location.pathname}${location.search}` !== href) {
        adapter.replace(href);
        notify();
      }
    },
    handleLinkClick(click) {
      if (
        click.defaultPrevented ||
        click.button !== 0 ||
        click.metaKey ||
        click.ctrlKey ||
        click.shiftKey ||
        click.altKey ||
        click.target ||
        click.download
      ) {
        return false;
      }

      const raw = adapter.read();
      const next = new URL(click.href, `${raw.origin}${raw.pathname}${raw.search}${raw.hash}`);
      if (next.origin !== raw.origin || resolveRoute(next.pathname).page === 'not-found') {
        return false;
      }
      if (
        next.pathname === raw.pathname &&
        next.search === raw.search &&
        next.hash.length > 0
      ) {
        return false;
      }

      adapter.push(toRelativeHref(next));
      notify();
      return true;
    },
  };
}

export function createBrowserSpaLocationAdapter(): SpaLocationAdapter {
  return {
    read: () => ({
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      origin: window.location.origin,
    }),
    push: (href) => window.history.pushState({}, '', href),
    replace: (href) => window.history.replaceState({}, '', href),
    subscribePop: (listener) => {
      window.addEventListener('popstate', listener);
      return () => window.removeEventListener('popstate', listener);
    },
  };
}

export function createMemorySpaLocationAdapter(initialHref: string) {
  const initial = new URL(initialHref, 'https://example.test');
  const entries = [initial.href];
  const actions: Array<{ mode: 'push' | 'replace'; href: string }> = [];
  const popListeners = new Set<() => void>();
  let index = 0;

  function currentUrl() {
    return new URL(entries[index]!);
  }

  const adapter: SpaLocationAdapter = {
    read: () => {
      const url = currentUrl();
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        origin: url.origin,
      };
    },
    push: (href) => {
      const next = new URL(href, currentUrl());
      entries.splice(index + 1, entries.length, next.href);
      index += 1;
      actions.push({ mode: 'push', href });
    },
    replace: (href) => {
      entries[index] = new URL(href, currentUrl()).href;
      actions.push({ mode: 'replace', href });
    },
    subscribePop: (listener) => {
      popListeners.add(listener);
      return () => popListeners.delete(listener);
    },
  };

  return {
    adapter,
    entries,
    actions,
    back() {
      if (index > 0) {
        index -= 1;
        for (const listener of popListeners) {
          listener();
        }
      }
    },
    forward() {
      if (index < entries.length - 1) {
        index += 1;
        for (const listener of popListeners) {
          listener();
        }
      }
    },
  };
}
