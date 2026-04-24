import { buildLocalizedHref } from './dashboard';
import {
  getAvailableWindows,
  parseCardMetric,
  parseCardPhaseMetric,
  parseMetricWindow,
  parseRatingTier,
  type CardMetric,
  type CardPhaseMetric,
  type Locale,
  type ManifestPayload,
  type MetricWindow,
  type RatingTier,
} from './metrics';

export function getWindowOptionsFromManifest(manifest: ManifestPayload): MetricWindow[] {
  return getAvailableWindows(manifest);
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
  fallbackMetric: CardMetric,
  fallbackPhaseMetric: CardPhaseMetric = 'value'
) {
  if (typeof window === 'undefined') {
    return {
      window: fallbackWindow,
      tier: fallbackTier,
      metric: fallbackMetric,
      phaseMetric: fallbackPhaseMetric,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const requestedWindow = parseMetricWindow(params.get('w'));
  const requestedTier = parseRatingTier(params.get('t'));
  const requestedMetric = parseCardMetric(params.get('m'));
  const requestedPhaseMetric = parseCardPhaseMetric(params.get('pm'));

  return {
    window: availableWindows.includes(requestedWindow) ? requestedWindow : fallbackWindow,
    tier: availableTiers.includes(requestedTier) ? requestedTier : fallbackTier,
    metric: requestedMetric,
    phaseMetric: requestedPhaseMetric,
  };
}

export function syncFilterStateToUrl(
  pathname: string,
  params: {
    w?: MetricWindow;
    t?: RatingTier;
    m?: CardMetric;
    pm?: CardPhaseMetric;
    lang?: Locale;
  }
) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextUrl = buildLocalizedHref(pathname, params);
  window.history.replaceState({}, '', nextUrl);
}
