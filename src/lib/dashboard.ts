import type { CardMetric, CardPhaseMetric, Locale, MetricWindow, RatingTier } from './metrics';

export const WINDOW_LABELS: Record<MetricWindow, string> = {
  '1d': '1D',
  '3d': '3D',
  '7d': '7D',
};

export const TIER_LABELS: Record<RatingTier, string> = {
  all: 'All players',
  low: 'Low rank',
  mid: 'Mid rank',
  high: 'High rank',
};

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function buildLocalizedHref(
  pathname: string,
  params: {
    w?: MetricWindow;
    t?: RatingTier;
    m?: CardMetric;
    pm?: CardPhaseMetric;
    lang?: Locale;
  }
): string {
  const search = new URLSearchParams();

  if (params.w && params.w !== '1d') {
    search.set('w', params.w);
  }

  if (params.t && params.t !== 'all') {
    search.set('t', params.t);
  }

  if (params.m && params.m !== 'winrate') {
    search.set('m', params.m);
  }

  if (params.pm && params.pm !== 'value') {
    search.set('pm', params.pm);
  }

  if (params.lang && params.lang !== 'en') {
    search.set('lang', params.lang);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
