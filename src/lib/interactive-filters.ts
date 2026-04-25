import { buildLocalizedHref } from './dashboard';
import {
  getAvailableWindows,
  parseCardMetric,
  parseMetricWindow,
  parseRatingTier,
  type CardMetric,
  type Locale,
  type ManifestPayload,
  type MetricWindow,
  type RatingTier,
} from './metrics';

export const ALL_HEROES = 'all';

export function getWindowOptionsFromManifest(manifest: ManifestPayload): MetricWindow[] {
  return getAvailableWindows(manifest);
}

export function readHeroSelection(): string {
  if (typeof window === 'undefined') {
    return ALL_HEROES;
  }

  return new URLSearchParams(window.location.search).get('hero') ?? ALL_HEROES;
}

export function getHeroFilterOptions(rows: Array<{ hero: string }>): string[] {
  return [
    ALL_HEROES,
    ...Array.from(new Set(rows.map((row) => row.hero))).sort((a, b) => a.localeCompare(b)),
  ];
}

export function getActiveHeroFilter(heroOptions: string[], selectedHero: string): string {
  return heroOptions.includes(selectedHero) ? selectedHero : ALL_HEROES;
}

export function readWindowTierSelection(
  availableWindows: MetricWindow[],
  availableTiers: RatingTier[],
  fallbackWindow: MetricWindow,
  fallbackTier: RatingTier
) {
  if (typeof window === 'undefined') {
    return { window: fallbackWindow, tier: fallbackTier };
  }

  const params = new URLSearchParams(window.location.search);
  const requestedWindow = parseMetricWindow(params.get('w'));
  const requestedTier = parseRatingTier(params.get('t'));

  return {
    window: availableWindows.includes(requestedWindow) ? requestedWindow : fallbackWindow,
    tier: availableTiers.includes(requestedTier) ? requestedTier : fallbackTier,
  };
}

export function readCardSelection(
  availableWindows: MetricWindow[],
  availableTiers: RatingTier[],
  fallbackWindow: MetricWindow,
  fallbackTier: RatingTier,
  fallbackMetric: CardMetric
) {
  if (typeof window === 'undefined') {
    return {
      window: fallbackWindow,
      tier: fallbackTier,
      metric: fallbackMetric,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const requestedWindow = parseMetricWindow(params.get('w'));
  const requestedTier = parseRatingTier(params.get('t'));
  const requestedMetric = parseCardMetric(params.get('m'));

  return {
    window: availableWindows.includes(requestedWindow) ? requestedWindow : fallbackWindow,
    tier: availableTiers.includes(requestedTier) ? requestedTier : fallbackTier,
    metric: requestedMetric,
  };
}

export function syncFilterStateToUrl(
  pathname: string,
  params: {
    w?: MetricWindow;
    t?: RatingTier;
    m?: CardMetric;
    hero?: string;
    lang?: Locale;
  }
) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextUrl = buildLocalizedHref(pathname, params);
  window.history.replaceState({}, '', nextUrl);
}
